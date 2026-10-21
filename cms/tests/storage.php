<?php
declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';
use AiSiteCms\Storage\SchemaManager;

if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) {
    fwrite(STDERR, "SQLite PDO is required by CI smoke\n");
    exit(1);
}
$checks = 0;
function must(bool $value, string $message): void {
    global $checks;
    $checks++;
    if (!$value) { throw new RuntimeException("FAILED $message"); }
}
function denied(callable $operation, string $name): void {
    try { $operation(); } catch (Throwable $e) { must(true, $name); return; }
    must(false, $name.' should refuse');
}
function conn(): PDO { return new PDO('sqlite::memory:'); }
$db = conn();
$store = new SchemaManager($db, true);
must($store->inspectSite('alpha-demo')['state'] === 'uninitialized', 'Read-only preflight on blank SQLite DB');
denied(fn() => new SchemaManager($db), 'SQLite requires explicit test grant');
denied(fn() => $store->migrate(0), 'Invalid old version');
denied(fn() => $store->migrate(3), 'Invalid future target');
denied(fn() => $store->assertSite('alpha-demo'), 'Uninstalled database');
must($store->migrate(1) === 1, 'v1 installed');
must($store->inspectSite('alpha-demo')['state'] === 'upgrade_required', 'Preflight detects v1 migration needed');
must((int) $db->query('SELECT COUNT(*) FROM cms_schema_migrations')->fetchColumn() === 1, 'v1 journal');
must($store->migrate(2) === 2, 'v1->v2');
must($store->inspectSite('alpha-demo')['state'] === 'schema_ready_unbound', 'Preflight detects schema not yet bound');
must($store->migrate(2) === 2, 'idempotent upgrade');
denied(fn() => $store->migrate(1), 'No silent downgrade');
$store->installSite('alpha-demo');
$store->assertSite('alpha-demo');
must($store->inspectSite('alpha-demo')['state'] === 'ready', 'Preflight site is ready');
must($store->inspectSite('other-demo')['reason'] === 'site_identity_mismatch', 'Read-only preflight rejects another site');
must((string) $db->query('SELECT storage_generation FROM cms_installation')->fetchColumn() === '0', 'CAS generation starts at zero');
$store->installSite('alpha-demo');
must((int) $db->query('SELECT COUNT(*) FROM cms_installation')->fetchColumn() === 1, 'Same site repeat does not create new install');
denied(fn() => $store->installSite('other-demo'), 'No other site takeover');
denied(fn() => $store->assertSite('other-demo'), 'Wrong site connection');
$db->exec('CREATE VIEW foreign_reporting AS SELECT site_id FROM cms_installation');
must($store->inspectSite('alpha-demo')['state']==='blocked',
    'Foreign SQLite view blocks existing CMS');
denied(fn() => $store->assertSite('alpha-demo'),
    'Existing SQLite site identity must not bypass foreign view refusal');
$db->exec('DROP VIEW foreign_reporting');
must($store->inspectSite('alpha-demo')['state']==='ready',
    'Read-only site preflight recovers after test-only foreign view removal');
foreach (['','../etc/passwd','Two_CMS','a','a.b','demo\' OR 1=1 --'] as $bad) {
    denied(fn() => $store->installSite($bad), 'Invalid site identifier rejected');
}
$otherDb = conn();
$otherStore = new SchemaManager($otherDb, true);
$otherStore->installSite('other-demo');
$otherStore->assertSite('other-demo');
must((string) $otherDb->query('SELECT site_id FROM cms_installation')->fetchColumn() === 'other-demo', 'Separate DB remains isolated');
must((string) $db->query('SELECT site_id FROM cms_installation')->fetchColumn() === 'alpha-demo', 'Original site unchanged');
$db->exec("UPDATE cms_schema_migrations SET checksum = 'bad' WHERE version = 1");
denied(fn() => $store->migrate(2), 'Tampered checksum fail closed');
must($store->inspectSite('alpha-demo')['state'] === 'blocked', 'Preflight detects checksum manipulation');
denied(fn() => $store->assertSite('alpha-demo'), 'Tampered schema blocked for use');
$db->exec("DELETE FROM cms_schema_migrations WHERE version = 1");
denied(fn() => $store->migrate(2), 'Noncontiguous journal denied');

$future = conn();
$futureStore = new SchemaManager($future, true);
$futureStore->installSite('future-demo');
$future->exec("INSERT INTO cms_schema_migrations(version,checksum,applied_at) VALUES(99,'x','now')");
denied(fn() => $futureStore->migrate(2), 'Unknown future schema fail closed');

$drift = conn();
$driftStore = new SchemaManager($drift, true);
$driftStore->installSite('drift-demo');
$drift->exec('DROP TABLE cms_installation');
denied(fn() => $driftStore->migrate(2), 'Missing installation table rejected');

$partial = conn();
$partial->exec("CREATE TABLE cms_installation (site_id TEXT)");
$partialStore = new SchemaManager($partial, true);
denied(fn() => $partialStore->migrate(2), 'Interrupted unjournaled schema cannot be overwritten');

// Adversarial SQLite fixtures: real fake databases whose table names and
// columns look plausible but whose constraints and side-effect objects differ.
$fakeJournal=conn();
$fakeJournal->exec('CREATE TABLE cms_schema_migrations
    (version INTEGER, checksum VARCHAR(64), applied_at VARCHAR(35))');
$fakeStore=new SchemaManager($fakeJournal,true);
denied(fn()=>$fakeStore->migrate(2),
    'SQLite impostor journal without PRIMARY KEY/NOT NULL refused BEFORE writes');
must((int)$fakeJournal->query("SELECT COUNT(*) FROM sqlite_master
    WHERE type='table' AND name='cms_installation'")->fetchColumn()===0,
    'Fake SQLite migration journal cannot trigger a CMS installation table');

$lookalike=conn();
$lookalikeStore=new SchemaManager($lookalike,true);
$lookalikeStore->installSite('lookalike-demo');
// Foreign SQL attached after legitimate bootstrap is not safe to accept.
$lookalike->exec('CREATE INDEX visitor_extra_idx ON cms_installation (site_id)');
must($lookalikeStore->inspectSite('lookalike-demo')['state']==='blocked',
    'External SQLite index invalidates owned database');
denied(fn()=>$lookalikeStore->assertSite('lookalike-demo'),
    'Owned SQLite identity cannot hide extra index');
$lookalike->exec('DROP INDEX visitor_extra_idx');
must($lookalikeStore->inspectSite('lookalike-demo')['state']==='ready',
    'Removing disposable foreign index restores genuine schema');
$lookalike->exec('CREATE TRIGGER visitor_extra_trigger BEFORE UPDATE ON cms_installation
    BEGIN SELECT RAISE(FAIL,\'visitor_trigger\'); END');
denied(fn()=>$lookalikeStore->migrate(2),
    'Foreign SQLite trigger rejected before any migration');
must($lookalikeStore->inspectSite('lookalike-demo')['state']==='blocked',
    'SQLite preflight detects foreign side-effect trigger');
$lookalike->exec('DROP TRIGGER visitor_extra_trigger');
must($lookalikeStore->inspectSite('lookalike-demo')['state']==='ready',
    'Genuine SQLite schema recovers after isolated trigger removed');
// Rebuild with the SAME column names and UNIQUE index, but without the
// singleton CHECK constraint. Prior name-only verification accepted this.
$lookalike->exec('CREATE TABLE cms_installation_fake (
    singleton_id INTEGER PRIMARY KEY,
    site_id VARCHAR(80) NOT NULL UNIQUE,
    initialized_at VARCHAR(35) NOT NULL,
    storage_generation BIGINT NOT NULL DEFAULT 0)');
$lookalike->exec('INSERT INTO cms_installation_fake
    SELECT singleton_id, site_id, initialized_at, storage_generation
    FROM cms_installation');
$lookalike->exec('DROP TABLE cms_installation');
$lookalike->exec('ALTER TABLE cms_installation_fake RENAME TO cms_installation');
must($lookalikeStore->inspectSite('lookalike-demo')['state']==='blocked',
    'Lookalike SQLite table without CHECK blocked despite identical columns');
denied(fn()=>$lookalikeStore->assertSite('lookalike-demo'),
    'SQLite user schema substitution cannot pass site identity');
denied(fn()=>$lookalikeStore->installSite('lookalike-demo'),
    'Lookalike SQLite physical table cannot be silently reused');
must((string)$lookalike->query('SELECT site_id FROM cms_installation')->fetchColumn()
    ==='lookalike-demo',
    'Rejected SQLite table substitution does not delete original identity');

$foreignDb = conn();
$foreignDb->exec('CREATE TABLE wp_posts (id INTEGER PRIMARY KEY, content TEXT)');
$foreignStore = new SchemaManager($foreignDb, true);
must($foreignStore->inspectSite('alpha-demo')['state'] === 'blocked', 'Foreign SQLite schema blocked by read-only preflight');
denied(fn() => $foreignStore->migrate(2), 'Foreign SQLite database refuses schema migration before DDL');
must((int)$foreignDb->query("SELECT COUNT(*) FROM sqlite_master WHERE name = 'cms_schema_migrations'")->fetchColumn() === 0,
    'Foreign DB received no CMS journal side effect');
must((int)$foreignDb->query("SELECT COUNT(*) FROM sqlite_master WHERE name = 'wp_posts'")->fetchColumn() === 1,
    'Foreign application table survives denied installation');
echo "Stage2 SQLite schema/isolation checks PASS: {$checks}\n";
