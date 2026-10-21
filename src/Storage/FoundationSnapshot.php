<?php
declare(strict_types=1);

namespace AiSiteCms\Storage;

use InvalidArgumentException;
use PDO;
use RuntimeException;
use Throwable;

/**
 * Stage 2 only: a portable snapshot of the EMPTY CMS foundation schema.
 * This is NOT a CMS data/media backup, not cryptographically authenticated,
 * and NEVER accessible over HTTP. Restore is restricted to disposable CI DBs.
 */
final class FoundationSnapshot
{
    private SchemaManager $schema;

    public function __construct(private PDO $pdo, bool $sqliteTestOnly = false)
    {
        $this->schema = new SchemaManager($pdo, $sqliteTestOnly);
    }

    public function export(string $siteId): string
    {
        // No DB writes; original schema journal and site identity must validate.
        $this->schema->assertSite($siteId);
        $rows = $this->pdo->query(
            'SELECT site_id, storage_generation FROM cms_installation'
        )->fetchAll(PDO::FETCH_ASSOC);
        if (count($rows) !== 1 || $rows[0]['site_id'] !== $siteId) {
            throw new RuntimeException('Foundation snapshot source site mismatch');
        }
        $counter = (string) $rows[0]['storage_generation'];
        self::validateGeneration($counter);
        $data = [
            'format' => 'ai-site-cms-foundation-v1',
            'site_id' => $siteId,
            'schema_version' => SchemaManager::LATEST,
            'storage_generation' => $counter,
        ];
        // SHA256 is accidental-corruption detection, NOT signature/MAC.
        return json_encode(
            [...$data, 'sha256' => self::digest($data)],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES
        );
    }

    /**
     * Validate content WITHOUT modifying any DB or consulting untrusted paths.
     *
     * @return array{format:string,site_id:string,schema_version:int,storage_generation:string}
     */
    public static function verify(string $snapshot, string $expectedSiteId): array
    {
        if (strlen($snapshot) < 60 || strlen($snapshot) > 2048) {
            throw new InvalidArgumentException('Unsupported foundation snapshot size');
        }
        $value = json_decode($snapshot, true, 16, JSON_THROW_ON_ERROR);
        if (!is_array($value) || array_is_list($value)) {
            throw new InvalidArgumentException('Snapshot is not an object');
        }
        $required = ['format', 'schema_version', 'sha256', 'site_id', 'storage_generation'];
        $keys = array_keys($value);
        sort($keys);
        if ($keys !== $required
            || $value['format'] !== 'ai-site-cms-foundation-v1'
            || $value['site_id'] !== $expectedSiteId
            || !preg_match('/\A[a-z][a-z0-9-]{2,63}\z/D', $expectedSiteId)
            || $value['schema_version'] !== SchemaManager::LATEST
            || !is_string($value['sha256'])
            || !preg_match('/\A[a-f0-9]{64}\z/D', $value['sha256'])
            || !is_string($value['storage_generation'])) {
            throw new InvalidArgumentException('Invalid foundation snapshot identity or schema');
        }
        self::validateGeneration($value['storage_generation']);
        $data = [
            'format' => $value['format'],
            'site_id' => $value['site_id'],
            'schema_version' => $value['schema_version'],
            'storage_generation' => $value['storage_generation'],
        ];
        if (!hash_equals($value['sha256'], self::digest($data))) {
            throw new InvalidArgumentException('Foundation snapshot checksum mismatch');
        }
        // Reconstruct from the FIXED writer field order, not from decoded
        // input order: json_decode preserves attacker-supplied ordering. Exact
        // bytes and ordering must match export() before DDL is considered.
        $canonical = json_encode([...$data, 'sha256'=>$value['sha256']],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        if (!hash_equals($canonical, $snapshot)) {
            throw new InvalidArgumentException('Noncanonical foundation snapshot bytes');
        }
        return $data;
    }

    /**
     * Restore foundation-only metadata into an explicitly EMPTY, disposable DB.
     * Source and target DBs must be separate. A second invocation refuses.
     * No automatic repair/downgrade, and NO production restore API.
     */
    public function restoreToFreshCiDatabase(string $snapshot, string $expectedSiteId): void
    {
        // Full content verification must precede any possible target DDL.
        $data = self::verify($snapshot, $expectedSiteId);
        $driver = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'sqlite') {
            if (getenv('CMS_ENV') !== 'test' || getenv('CMS_ALLOW_SQLITE_TEST_ONLY') !== '1') {
                throw new RuntimeException('SQLite restore rehearsal permitted only in explicit test mode');
            }
        } elseif ($driver === 'mysql') {
            if (getenv('CI') !== 'true' || getenv('CMS_ALLOW_DESTRUCTIVE_MYSQL_CI') !== '1'
                || $this->pdo->query('SELECT DATABASE()')->fetchColumn() !== 'ai_site_cms_restore_ci'
                || $this->pdo->query("SELECT SUBSTRING_INDEX(CURRENT_USER(),'@',1)")->fetchColumn() !== 'cms_ci') {
                throw new RuntimeException('MySQL restore rehearsal forbidden outside ephemeral restore database');
            }
        } else {
            throw new RuntimeException('Unsupported restore test DB driver');
        }
        $preflight = $this->schema->inspectSite($expectedSiteId);
        if ($preflight['state'] !== 'uninitialized') {
            throw new RuntimeException('Restore destination must be a fresh empty database');
        }
        // SchemaManager.migrate holds the relevant dedicated-DB DDL lock and
        // checks again against foreign tables. MySQL DDL is NOT atomic; failure
        // may leave an incomplete target requiring disposal, never auto-overwrite.
        $this->schema->installSite($expectedSiteId);
        $this->pdo->beginTransaction();
        try {
            $update = $this->pdo->prepare(
                'UPDATE cms_installation SET storage_generation=? WHERE singleton_id=1 AND site_id=?'
            );
            $update->execute([$data['storage_generation'], $expectedSiteId]);
            if ($update->rowCount() !== 1) {
                // MySQL may report 0 affected rows if generation already 0;
                // source test intentionally uses nonzero generation to verify change.
                $actual = (string) $this->pdo->query(
                    'SELECT storage_generation FROM cms_installation WHERE singleton_id=1'
                )->fetchColumn();
                if ($actual !== $data['storage_generation']) {
                    throw new RuntimeException('Could not restore foundation generation');
                }
            }
            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
        $this->schema->assertSite($expectedSiteId);
        if ($this->export($expectedSiteId) !== $snapshot) {
            throw new RuntimeException('Post-restore snapshot mismatch: quarantine destination');
        }
    }

    private static function validateGeneration(string $counter): void
    {
        // Numeric range deliberately narrower than signed BIGINT for safe,
        // portable values on both MySQL and SQLite PHP 8.1+ environments.
        if (!preg_match('/\A(?:0|[1-9][0-9]{0,17})\z/D', $counter)) {
            throw new InvalidArgumentException('Invalid foundation generation');
        }
    }

    /** @param array<string,mixed> $data */
    private static function digest(array $data): string
    {
        return hash('sha256', json_encode(
            $data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES
        ));
    }
}
