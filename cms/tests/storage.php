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
