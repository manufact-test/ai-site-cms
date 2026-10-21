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
    private const SQLITE_JOURNAL_DDL =
        'CREATE TABLE cms_schema_migrations (version INTEGER PRIMARY KEY, checksum VARCHAR(64) NOT NULL, applied_at VARCHAR(35) NOT NULL)';

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
            // Never run even CREATE TABLE IF NOT EXISTS against a foreign application's DB.
            $this->assertDedicatedSchema();
            // A pre-existing journal with the correct NAME but wrong primary
            // key, column types or engine must never be mistaken for our
            // journal. Validate BEFORE first CREATE/ALTER/INSERT.
            if ($this->tableExists('cms_schema_migrations')) {
                if ($this->driver === 'mysql') {
                    $this->verifyMysqlTable('cms_schema_migrations', [
                        'version'=>['int unsigned','PRI',null],
                        'checksum'=>['char(64)','',null],
                        'applied_at'=>['varchar(35)','',null]
                    ]);
                } else {
                    // SQLite's IF NOT EXISTS ignores a foreign journal with
                    // the same name. Reject its DDL BEFORE creating any CMS
                    // table or consuming an untrusted migration history.
                    $this->verifySqliteTable('cms_schema_migrations',
                        self::SQLITE_JOURNAL_DDL);
                }
            }
            $this->pdo->exec($this->driver === 'mysql'
                ? 'CREATE TABLE IF NOT EXISTS cms_schema_migrations (version INT UNSIGNED NOT NULL PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at VARCHAR(35) NOT NULL) ENGINE=InnoDB'
                : 'CREATE TABLE IF NOT EXISTS '.substr(self::SQLITE_JOURNAL_DDL, strlen('CREATE TABLE ')));
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
        // A once-valid CMS can later share its DB with another application.
        // Identity and journal checks do not authorize foreign routines,
        // events, views or triggers. Refuse use without changing anything.
        $this->assertDedicatedSchema();
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

    /**
     * Diagnostic only; no migrations, repairs, inserts or lock acquisition.
     * Never returns schema row values, DB names, SQL messages or credentials.
     * Results are only advisory snapshots, not a concurrency-safe authorization.
     *
     * @return array{state:string,reason:string,version:int|null}
     */
    public function inspectSite(string $siteId): array
    {
        $this->assertValidSiteId($siteId);
        $report = static fn (string $state, string $reason, ?int $version): array
            => ['state' => $state, 'reason' => $reason, 'version' => $version];
        try {
            $this->assertDedicatedSchema();
            $journalExists = $this->tableExists('cms_schema_migrations');
            $siteExists = $this->tableExists('cms_installation');
            if (!$journalExists && !$siteExists) {
                return $report('uninitialized', 'no_cms_tables', null);
            }
            if (!$journalExists || !$siteExists) {
                return $report('blocked', 'incomplete_schema', null);
            }
            $rows = $this->pdo->query(
                'SELECT version, checksum FROM cms_schema_migrations ORDER BY version'
            )->fetchAll(PDO::FETCH_ASSOC);
            if (!$rows) {
                return $report('blocked', 'empty_migration_history', null);
            }
            if (count($rows) > self::LATEST) {
                return $report('blocked', 'future_or_invalid_migration', null);
            }
            foreach ($rows as $index => $row) {
                $version = $index + 1;
                if ((int) $row['version'] !== $version || $row['checksum'] !== $this->checksum($version)) {
                    return $report('blocked', 'migration_history_mismatch', null);
                }
            }
            $version = count($rows);
            $this->verifyStructure($version);
            $siteRows = $this->pdo->query('SELECT site_id FROM cms_installation')->fetchAll(PDO::FETCH_COLUMN);
            if (!$siteRows) {
                return $report($version === self::LATEST ? 'schema_ready_unbound' : 'upgrade_required',
                    'site_identity_missing', $version);
            }
            if (count($siteRows) !== 1 || $siteRows[0] !== $siteId) {
                return $report('blocked', 'site_identity_mismatch', null);
            }
            if ($version < self::LATEST) {
                return $report('upgrade_required', 'schema_version_behind', $version);
            }
            return $report('ready', 'matched', $version);
        } catch (Throwable $e) {
            return $report('blocked', 'schema_inconsistent_or_foreign', null);
        }
    }

    /**
     * Refuses databases belonging to another application even before creating a
     * CMS migration journal. The tiny Stage2 schema whitelist must be extended
     * deliberately whenever CMS adds a new owned table in future migrations.
     */
    private function assertDedicatedSchema(): void
    {
        if ($this->driver === 'mysql') {
            $tables = $this->pdo->query(
                'SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE()'
            )->fetchAll(PDO::FETCH_COLUMN);
        } else {
            // Tables alone are insufficient: triggers can execute untrusted
            // SQL on our writes, and foreign indexes alter uniqueness and
            // recovery behavior. A legitimate v1/v2 schema has EXACTLY
            // two tables and one SQLite-generated UNIQUE site index.
            $objects = $this->pdo->query(
                "SELECT name, type, tbl_name, sql FROM sqlite_master"
            )->fetchAll(PDO::FETCH_ASSOC);
            foreach ($objects as $item) {
                $name = (string) $item['name'];
                $type = (string) $item['type'];
                $ownsTable = $type === 'table'
                    && in_array($name,
                        ['cms_schema_migrations', 'cms_installation'], true);
                $siteAutoindex = $type === 'index'
                    && $name === 'sqlite_autoindex_cms_installation_1'
                    && $item['tbl_name'] === 'cms_installation'
                    && $item['sql'] === null;
                if (!$ownsTable && !$siteAutoindex) {
                    throw new RuntimeException(
                        'Foreign SQLite schema object: dedicated CMS database required'
                    );
                }
            }
            return;
        }
        foreach ($tables as $name) {
            if (!in_array($name, ['cms_schema_migrations', 'cms_installation'], true)) {
                throw new RuntimeException('Foreign/unknown schema objects: dedicated CMS database required');
            }
        }
        if ($this->driver === 'mysql') {
            // INFORMATION_SCHEMA.TABLES includes ordinary tables and views,
            // but not routines, events, or triggers. A DB with one of those
            // objects is NOT an empty dedicated CMS database. Probe/migrate/
            // assertSite share this fail-closed read-only ownership boundary.
            // These three fixed queries contain no user-controlled SQL tokens.
            foreach ([
                'SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() LIMIT 1',
                'SELECT EVENT_NAME FROM information_schema.EVENTS WHERE EVENT_SCHEMA = DATABASE() LIMIT 1',
                'SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() LIMIT 1',
            ] as $sql) {
                if ($this->pdo->query($sql)->fetchColumn() !== false) {
                    throw new RuntimeException('Foreign MySQL procedure, event or trigger: dedicated CMS database required');
                }
            }
        }
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
        if ($this->driver === 'mysql') {
            $expected = [
                'singleton_id'=>['tinyint unsigned','PRI',null],
                'site_id'=>['varchar(80)','UNI',null],
                'initialized_at'=>['varchar(35)','',null]
            ];
            if ($version >= 2) {
                $expected['storage_generation']=['bigint','', '0'];
            }
            $this->verifyMysqlTable('cms_schema_migrations', [
                'version'=>['int unsigned','PRI',null],
                'checksum'=>['char(64)','',null],
                'applied_at'=>['varchar(35)','',null]
            ]);
            $this->verifyMysqlTable('cms_installation', $expected);
        } else {
            $this->verifySqliteTable('cms_schema_migrations',
                self::SQLITE_JOURNAL_DDL);
            $sql=$this->statements(1)[0];
            if ($version >= 2) {
                // SQLite's own ALTER TABLE extends the literal schema SQL.
                // It cannot silently substitute a lookalike WITHOUT CHECK,
                // UNIQUE, PRIMARY KEY, NOT NULL, correct types or defaults.
                $sql=substr($sql, 0, -1)
                    .', storage_generation BIGINT NOT NULL DEFAULT 0)';
            }
            $this->verifySqliteTable('cms_installation', $sql);
            $indexes = $this->pdo->query(
                "PRAGMA index_list('cms_installation')"
            )->fetchAll(PDO::FETCH_ASSOC);
            $parts = $this->pdo->query(
                "PRAGMA index_info('sqlite_autoindex_cms_installation_1')"
            )->fetchAll(PDO::FETCH_ASSOC);
            if (count($indexes) !== 1
                || $indexes[0]['name'] !== 'sqlite_autoindex_cms_installation_1'
                || (int) $indexes[0]['unique'] !== 1
                || $indexes[0]['origin'] !== 'u'
                || (int) $indexes[0]['partial'] !== 0
                || count($parts) !== 1
                || $parts[0]['name'] !== 'site_id') {
                throw new RuntimeException('SQLite site isolation index drift');
            }
        }
        foreach (['singleton_id', 'site_id', 'initialized_at'] as $field) {
            if (!in_array($field, $columnNames, true)) {
                throw new RuntimeException('Installation schema drift detected');
            }
        }
        if (($version >= 2) !== in_array('storage_generation', $columnNames, true)) {
            throw new RuntimeException('Unexpected installation generation column');
        }
    }

    /**
     * Verify *physical* Stage2 tables, not only column names. A foreign
     * database may contain lookalike CMS tables with nullable IDs, missing
     * primary/unique keys or non-transactional storage engines.
     * Only these two literal owned names are accepted; no user SQL.
     *
     * @param array<string,array{0:string,1:string,2:string|null}> $expected
     */
    private function verifyMysqlTable(string $table, array $expected): void
    {
        if ($this->driver !== 'mysql'
            || !in_array($table, ['cms_schema_migrations','cms_installation'], true)) {
            throw new RuntimeException('Invalid Stage2 physical table verification');
        }
        $meta=$this->pdo->prepare(
            'SELECT TABLE_TYPE, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?'
        );
        $meta->execute([$table]);
        $items=$meta->fetchAll(PDO::FETCH_ASSOC);
        if (count($items)!==1 || $items[0]['TABLE_TYPE']!=='BASE TABLE'
            || $items[0]['ENGINE']!=='InnoDB') {
            throw new RuntimeException('Non-InnoDB, missing, or disguised CMS table');
        }
        // Static trusted table name, not derived from a task, schema or input.
        $fields=$this->pdo->query('SHOW COLUMNS FROM `'.$table.'`')
            ->fetchAll(PDO::FETCH_ASSOC);
        if (count($fields)!==count($expected)) {
            throw new RuntimeException('Unexpected CMS columns');
        }
        foreach ($fields as $field) {
            $key=(string)$field['Field'];
            if (!array_key_exists($key,$expected)) {
                throw new RuntimeException('Unrecognized CMS column');
            }
            [$type,$index,$default]=$expected[$key];
            if (strtolower((string)$field['Type'])!==$type
                || $field['Null']!=='NO'
                || $field['Key']!==$index
                || ($field['Default']===null?null:(string)$field['Default'])!==$default
                || $field['Extra']!=='') {
                throw new RuntimeException('CMS table type/constraint drift');
            }
        }
    }

    /**
     * SQLite has no SHOW COLUMNS equivalent with enough details to prove
     * CHECK (singleton_id=1), UNIQUE, PK, NOT NULL and exact constraints.
     * Pin the exact SQL authored by this version's migrations instead of
     * trusting column NAMES or a forged migration journal.
     */
    private function verifySqliteTable(string $table, string $expectedSql): void
    {
        if ($this->driver !== 'sqlite'
            || !in_array($table, ['cms_schema_migrations','cms_installation'], true)) {
            throw new RuntimeException('Invalid SQLite table verification');
        }
        $stmt=$this->pdo->prepare(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name=?"
        );
        $stmt->execute([$table]);
        $rows=$stmt->fetchAll(PDO::FETCH_COLUMN);
        if (count($rows)!==1 || !is_string($rows[0])
            || !hash_equals($expectedSql,$rows[0])) {
            throw new RuntimeException('SQLite physical schema drift');
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
            // BEGIN IMMEDIATE is raw SQLite SQL; PDO::commit() may not know that
            // this transaction was started outside PDO::beginTransaction().
            // Use SQL COMMIT/ROLLBACK symmetrically to maintain the write lock.
            $this->pdo->exec('BEGIN IMMEDIATE');
            try {
                $result = $callback();
                $this->pdo->exec('COMMIT');
                return $result;
            } catch (Throwable $e) {
                $this->pdo->exec('ROLLBACK');
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
