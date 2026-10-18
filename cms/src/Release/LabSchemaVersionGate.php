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
