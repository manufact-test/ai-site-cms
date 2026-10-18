<?php
declare(strict_types=1);

namespace AiSiteCms\Storage;

use InvalidArgumentException;
use PDO;
use RuntimeException;
use Throwable;

/**
 * Stage 2 CLI-only per-site schema manager. No HTTP routes call this class.
 * DB account must be restricted to exactly one CMS installation database.
 *
 * MySQL DDL is NOT transactional, so an interrupted migration must fail
 * closed on the next attempt; do not silently repair or drop existing data.
 */
final class SchemaManager
{
    public const LATEST = 2;

    private string $driver;

    public function __construct(private PDO $pdo, bool $allowSqliteTestOnly = false)
    {
        $this->driver = (string) $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($this->driver !== 'mysql' && !($this->driver === 'sqlite' && $allowSqliteTestOnly)) {
            throw new RuntimeException('Unsupported database driver or SQLite not explicitly enabled for tests');
        }
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    }

    public function migrate(int $target = self::LATEST): int
    {
        if ($target < 1 || $target > self::LATEST) {
            throw new InvalidArgumentException('Unsupported schema target');
        }
        return $this->withMigrationLock(function () use ($target): int {
            $this->pdo->exec($this->driver === 'mysql'
                ? 'CREATE TABLE IF NOT EXISTS cms_schema_migrations (version INT UNSIGNED NOT NULL PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at VARCHAR(35) NOT NULL) ENGINE=InnoDB'
                : 'CREATE TABLE IF NOT EXISTS cms_schema_migrations (version INTEGER PRIMARY KEY, checksum VARCHAR(64) NOT NULL, applied_at VARCHAR(35) NOT NULL)');
            $found = $this->pdo->query('SELECT version, checksum FROM cms_schema_migrations ORDER BY version')->fetchAll(PDO::FETCH_ASSOC);
            $installed = [];
            foreach ($found as $row) {
                $version = (int) $row['version'];
                if ($version < 1 || $version > self::LATEST || isset($installed[$version])) {
                    throw new RuntimeException('Unknown/duplicate schema migration: fail closed');
                }
                if ((string) $row['checksum'] !== $this->checksum($version)) {
                    throw new RuntimeException('Schema migration checksum mismatch: fail closed');
                }
                $installed[$version] = true;
            }
            // An interrupted MySQL DDL that is not journaled is NOT safe to retry.
            for ($v = 1; $v <= max(0, count($installed)); $v++) {
                if (!isset($installed[$v])) {
                    throw new RuntimeException('Gap in database migration history');
                }
            }
            if (count($installed) > $target) {
                throw new RuntimeException('Schema downgrade is forbidden');
            }
            if ($installed) {
                $this->verifyStructure(count($installed));
            } elseif ($this->tableExists('cms_installation')) {
                throw new RuntimeException('Unjournaled partial migration: manual recovery needed');
            }
            for ($version = count($installed) + 1; $version <= $target; $version++) {
                foreach ($this->statements($version) as $statement) {
                    $this->pdo->exec($statement);
                }
                $insert = $this->pdo->prepare('INSERT INTO cms_schema_migrations (version, checksum, applied_at) VALUES (?, ?, ?)');
                $insert->execute([$version, $this->checksum($version), gmdate('Y-m-d\TH:i:s\Z')]);
                $this->verifyStructure($version);
            }
            return $target;
        });
    }

    public function installSite(string $siteId): void
    {
        $this->assertValidSiteId($siteId);
        // Do not migrate a database belonging to a different site.
        if ($this->tableExists('cms_installation')) {
            $old = $this->pdo->query('SELECT site_id FROM cms_installation')->fetchAll(PDO::FETCH_COLUMN);
            if (count($old) > 1 || (count($old) === 1 && $old[0] !== $siteId)) {
                throw new RuntimeException('Existing installation belongs to another site');
            }
        }
        $this->migrate();
        $this->pdo->beginTransaction();
        try {
            $rows = $this->pdo->query('SELECT site_id FROM cms_installation')->fetchAll(PDO::FETCH_COLUMN);
            if (!$rows) {
                $stmt = $this->pdo->prepare('INSERT INTO cms_installation (singleton_id, site_id, initialized_at) VALUES (1, ?, ?)');
                $stmt->execute([$siteId, gmdate('Y-m-d\TH:i:s\Z')]);
            } elseif (count($rows) !== 1 || $rows[0] !== $siteId) {
                throw new RuntimeException('Existing installation belongs to another site');
            }
            $this->pdo->commit();
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
        $this->assertSite($siteId);
    }

    public function assertSite(string $siteId): void
    {
        $this->assertValidSiteId($siteId);
        if (!$this->tableExists('cms_installation')) {
            throw new RuntimeException('Site not installed');
        }
        $rows = $this->pdo->query('SELECT site_id FROM cms_installation')->fetchAll(PDO::FETCH_COLUMN);
        if (count($rows) !== 1 || $rows[0] !== $siteId) {
            throw new RuntimeException('Missing or mismatched per-site installation');
        }
        $journal = $this->pdo->query('SELECT version, checksum FROM cms_schema_migrations ORDER BY version')->fetchAll(PDO::FETCH_ASSOC);
        if (count($journal) !== self::LATEST) {
            throw new RuntimeException('Unexpected installed schema version');
        }
        foreach ($journal as $index => $row) {
            $version = $index + 1;
            if ((int) $row['version'] !== $version || (string) $row['checksum'] !== $this->checksum($version)) {
                throw new RuntimeException('Schema checksum mismatch');
            }
        }
        $this->verifyStructure(self::LATEST);
    }

    private function assertValidSiteId(string $siteId): void
    {
        if (!preg_match('/\A[a-z][a-z0-9-]{2,63}\z/D', $siteId)) {
            throw new InvalidArgumentException('Invalid site identifier');
        }
    }

    /** @return list<string> */
    private function statements(int $version): array
    {
        return match ($version) {
            1 => [$this->driver === 'mysql'
                ? 'CREATE TABLE cms_installation (singleton_id TINYINT UNSIGNED NOT NULL PRIMARY KEY, site_id VARCHAR(80) NOT NULL UNIQUE, initialized_at VARCHAR(35) NOT NULL) ENGINE=InnoDB'
                : 'CREATE TABLE cms_installation (singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1), site_id VARCHAR(80) NOT NULL UNIQUE, initialized_at VARCHAR(35) NOT NULL)'],
            2 => ['ALTER TABLE cms_installation ADD COLUMN storage_generation BIGINT NOT NULL DEFAULT 0'],
            default => throw new InvalidArgumentException('Unknown migration'),
        };
    }

    private function checksum(int $version): string
    {
        return hash('sha256', implode("\n", $this->statements($version)));
    }

    private function verifyStructure(int $version): void
    {
        if (!$this->tableExists('cms_installation')) {
            throw new RuntimeException('Missing installation table despite applied migration');
        }
        $fields = $this->driver === 'mysql'
            ? $this->pdo->query('SHOW COLUMNS FROM cms_installation')->fetchAll(PDO::FETCH_ASSOC)
            : $this->pdo->query('PRAGMA table_info(cms_installation)')->fetchAll(PDO::FETCH_ASSOC);
        $columnNames = array_map(static fn (array $field): string => (string) ($field['Field'] ?? $field['name']), $fields);
        foreach (['singleton_id', 'site_id', 'initialized_at'] as $field) {
            if (!in_array($field, $columnNames, true)) {
                throw new RuntimeException('Installation schema drift detected');
            }
        }
        if (($version >= 2) !== in_array('storage_generation', $columnNames, true)) {
            throw new RuntimeException('Unexpected installation generation column');
        }
    }

    private function tableExists(string $table): bool
    {
        if ($this->driver === 'mysql') {
            $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?');
            $stmt->execute([$table]);
            return (int) $stmt->fetchColumn() > 0;
        }
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?");
        $stmt->execute([$table]);
        return (int) $stmt->fetchColumn() > 0;
    }

    private function withMigrationLock(callable $callback): int
    {
        if ($this->driver === 'sqlite') {
            $this->pdo->exec('BEGIN IMMEDIATE');
            try {
                $result = $callback();
                $this->pdo->commit();
                return $result;
            } catch (Throwable $e) {
                if ($this->pdo->inTransaction()) {
                    $this->pdo->rollBack();
                }
                throw $e;
            }
        }
        $dbname = (string) $this->pdo->query('SELECT DATABASE()')->fetchColumn();
        if ($dbname === '') {
            throw new RuntimeException('Select dedicated MySQL database before migration');
        }
        $lockName = 'ai-cms-'.substr(hash('sha256', $dbname), 0, 40);
        $lock = $this->pdo->prepare('SELECT GET_LOCK(?, 5)');
        $lock->execute([$lockName]);
        if ((int) $lock->fetchColumn() !== 1) {
            throw new RuntimeException('Cannot acquire schema migration lock');
        }
        try {
            return $callback();
        } finally {
            $release = $this->pdo->prepare('SELECT RELEASE_LOCK(?)');
            $release->execute([$lockName]);
        }
    }
}
