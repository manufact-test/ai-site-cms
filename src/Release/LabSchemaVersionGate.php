<?php
declare(strict_types=1);

namespace AiSiteCms\Release;

use AiSiteCms\Storage\SchemaManager;
use PDO;
use RuntimeException;
use Throwable;

/**
 * Stage2 lab ONLY: checks v2 schema matches a known code generation while
 * holding the SAME DB migration mutex used by SchemaManager::migrate().
 * Never runs migrations, restores data, contacts live hosting or configures FPM.
 * The MySQL named lock is COOPERATIVE, not protection against rogue SQL writers.
 */
final class LabSchemaVersionGate
{
    private const POLICY_FORMAT = 'ai-site-cms-stage2-code-schema-gate-v1';

    private static function lab(): void
    {
        if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
            || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
            throw new RuntimeException('Schema activation gate only inside explicit CI lab');
        }
    }

    private static function candidate(string $codeVersion): void
    {
        // Explicitly reviewed supported Stage2 code/schema pairs; default-deny all
        // unknown future code releases until this contract is updated and tested.
        if (!in_array($codeVersion, [
            '0.2.0-stage2.0','0.2.0-stage2.1','0.2.0-stage2.2'
        ], true) || SchemaManager::LATEST !== 2) {
            throw new RuntimeException('Unreviewed code/schema compatibility pair');
        }
    }

    /** @return array<string,mixed> */
    public static function inspect(PDO $pdo, string $siteId, string $codeVersion): array
    {
        self::lab();
        self::candidate($codeVersion);
        $driver = (string)$pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if (!in_array($driver, ['mysql','sqlite'], true)) {
            throw new RuntimeException('Unsupported schema compatibility DB driver');
        }
        $store = new SchemaManager($pdo, $driver === 'sqlite');
        $report = $store->inspectSite($siteId);
        $compatible = $report['state'] === 'ready' && $report['version'] === 2;
        return [
            'format'=>self::POLICY_FORMAT, 'status'=>$compatible?'compatible':'blocked',
            'codeVersion'=>$codeVersion, 'schemaVersion'=>$report['version'],
            'reason'=>$compatible?'matched':$report['reason'], 'requiredSchemaVersion'=>2,
            'schemaModified'=>false, 'migrationExecuted'=>false,
            'databaseLockHeld'=>false, 'safeToDeploy'=>false, 'productionReady'=>false
        ];
    }

    /**
     * Read-only fingerprint of the FOUNDATION ONLY: site identity, schema
     * migration checksums and v2 storage_generation. Never hashes all content,
     * user records or business tables. The caller must retain this checkpoint
     * independently of the switcher's writable lab directory.
     *
     * @return array{format:string,codeVersion:string,schemaVersion:int,storageGeneration:string,fingerprint:string,productionReady:bool}
     */
    public static function checkpoint(PDO $pdo, string $siteId, string $codeVersion): array
    {
        self::lab();
        $policy = self::inspect($pdo, $siteId, $codeVersion);
        if ($policy['status'] !== 'compatible') {
            throw new RuntimeException('Cannot checkpoint unready or foreign site');
        }
        $row = $pdo->query(
            'SELECT singleton_id, site_id, initialized_at, storage_generation FROM cms_installation'
        )->fetchAll(PDO::FETCH_ASSOC);
        if (count($row) !== 1 || (string)($row[0]['singleton_id'] ?? '') !== '1'
            || ($row[0]['site_id'] ?? null) !== $siteId
            || !is_string($row[0]['initialized_at'] ?? null)
            || $row[0]['initialized_at'] === '' || strlen($row[0]['initialized_at']) > 35) {
            throw new RuntimeException('Unexpected foundation singleton');
        }
        $generation = (string)$row[0]['storage_generation'];
        if (!preg_match('/^(?:0|[1-9][0-9]{0,15})$/D', $generation)
            || strlen($generation) > 16
            || (strlen($generation) === 16 && strcmp($generation, '9007199254740991') > 0)) {
            throw new RuntimeException('Invalid or unsupported foundation storage generation');
        }
        $history = $pdo->query(
            'SELECT version, checksum FROM cms_schema_migrations ORDER BY version'
        )->fetchAll(PDO::FETCH_ASSOC);
        if (count($history) !== 2 || (int)$history[0]['version'] !== 1
            || (int)$history[1]['version'] !== 2) {
            throw new RuntimeException('Inconsistent foundation migration journal');
        }
        foreach ($history as $entry) {
            if (!is_string($entry['checksum'] ?? null)
                || !preg_match('/^[0-9a-f]{64}$/D', $entry['checksum'])) {
                throw new RuntimeException('Invalid migration checkpoint checksum');
            }
        }
        $foundation = [
            'format'=>'ai-site-cms-stage2-db-foundation-checkpoint-v1',
            'siteId'=>$siteId,
            'initializedAt'=>$row[0]['initialized_at'],
            'schemaVersion'=>2,
            'storageGeneration'=>$generation,
            'migration1'=>$history[0]['checksum'],
            'migration2'=>$history[1]['checksum']
        ];
        $fingerprint = hash('sha256',
            "AI-SITE-CMS-STAGE2-DB-FOUNDATION-V1\0".
            json_encode($foundation, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n");
        return [
            'format'=>$foundation['format'], 'codeVersion'=>$codeVersion,
            'schemaVersion'=>2, 'storageGeneration'=>$generation,
            'fingerprint'=>$fingerprint, 'productionReady'=>false
        ];
    }

    /**
     * The fingerprint must have been independently stored or approved. Matching
     * a local writable checkpoint is not rollback protection and is NOT a backup.
     */
    public static function assertCheckpoint(
        PDO $pdo, string $siteId, string $codeVersion, array $expected
    ): array {
        self::lab();
        if (array_keys($expected) !== [
            'format','codeVersion','schemaVersion','storageGeneration','fingerprint','productionReady'
        ] || $expected['format'] !== 'ai-site-cms-stage2-db-foundation-checkpoint-v1'
            || $expected['codeVersion'] !== $codeVersion
            || $expected['schemaVersion'] !== 2 || $expected['productionReady'] !== false
            || !is_string($expected['storageGeneration'])
            || !preg_match('/^(?:0|[1-9][0-9]{0,15})$/D', $expected['storageGeneration'])
            || !is_string($expected['fingerprint'])
            || !preg_match('/^[0-9a-f]{64}$/D', $expected['fingerprint'])) {
            throw new RuntimeException('Malformed or unapproved DB checkpoint');
        }
        $actual = self::checkpoint($pdo, $siteId, $codeVersion);
        if (!hash_equals($expected['fingerprint'], $actual['fingerprint'])
            || $expected['storageGeneration'] !== $actual['storageGeneration']) {
            throw new RuntimeException('Foundation DB drift relative to trusted checkpoint');
        }
        return $actual;
    }

    /**
     * Enforce same DB checkpoint before AND after an operation. The caller owns
     * the expected checkpoint; this method does not save, repair, or mutate DB.
     * In SQLite lab it holds BEGIN IMMEDIATE through callback; for MySQL only
     * well-behaved SchemaManager migrations honor GET_LOCK, not arbitrary DML.
     */
    public static function withCheckpointFence(
        PDO $pdo, string $siteId, string $codeVersion, array $expected, callable $work
    ): mixed {
        return self::withMigrationFence($pdo, $siteId, $codeVersion,
            static function () use ($pdo,$siteId,$codeVersion,$expected,$work): mixed {
                self::assertCheckpoint($pdo, $siteId, $codeVersion, $expected);
                $result = $work();
                self::assertCheckpoint($pdo, $siteId, $codeVersion, $expected);
                return $result;
            });
    }

    /**
     * Execute $work only while the existing installation is ready and schema
     * migration coordination is held; rollback read-only SQLite fence on exit.
     *
     * @template T
     * @param callable():T $work
     * @return T
     */
    public static function withMigrationFence(
        PDO $pdo, string $siteId, string $codeVersion, callable $work
    ): mixed {
        self::lab();
        self::candidate($codeVersion);
        $driver = (string)$pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if (!in_array($driver, ['mysql','sqlite'], true)) {
            throw new RuntimeException('Unsupported migration-fence DB driver');
        }
        if ($pdo->inTransaction()) throw new RuntimeException('Unexpected caller DB transaction');
        $lockName = null;
        if ($driver === 'mysql') {
            $database = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
            if ($database === '') throw new RuntimeException('Dedicated MySQL database required');
            $lockName = 'ai-cms-'.substr(hash('sha256', $database), 0, 40);
            $stmt = $pdo->prepare('SELECT GET_LOCK(?, 0)');
            $stmt->execute([$lockName]);
            if ((int)$stmt->fetchColumn() !== 1) {
                throw new RuntimeException('Concurrent schema migration lock held');
            }
        } else {
            // The SQLite immediate transaction fences competing schema writers.
            // It is rolled back; no application data are changed by this gate.
            $pdo->exec('BEGIN IMMEDIATE');
        }
        try {
            $policy = self::inspect($pdo, $siteId, $codeVersion);
            if ($policy['status'] !== 'compatible') {
                throw new RuntimeException('Site/schema identity incompatible with code generation');
            }
            return $work();
        } finally {
            if ($driver === 'mysql') {
                $stmt = $pdo->prepare('SELECT RELEASE_LOCK(?)');
                $stmt->execute([$lockName]);
                if ((int)$stmt->fetchColumn() !== 1) {
                    throw new RuntimeException('MySQL migration fence lost during activation');
                }
            } else {
                $pdo->exec('ROLLBACK');
            }
        }
    }
}
