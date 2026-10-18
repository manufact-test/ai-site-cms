<?php
declare(strict_types=1);

/**
 * DESTRUCTIVE ONLY ON A PROVEN ISOLATED EPHEMERAL CI DATABASE.
 * The script refuses any other DB/account/CI mode and is NEVER for Hostinger.
 * This simulates crashes by producing specific partial DDL states; it does
 * not kill the MySQL daemon or establish power-loss durability.
 */
require dirname(__DIR__) . '/vendor/autoload.php';

use AiSiteCms\Storage\SchemaManager;

$dsn = getenv('CMS_TEST_MYSQL_DSN') ?: '';
$user = getenv('CMS_TEST_MYSQL_USER') ?: '';
if (getenv('CI') !== 'true' || getenv('CMS_ALLOW_DESTRUCTIVE_MYSQL_CI') !== '1'
    || $user !== 'cms_ci'
    || !str_starts_with($dsn, 'mysql:')
    || !str_contains($dsn, 'dbname=ai_site_cms_ci;')
    || !in_array('mysql', PDO::getAvailableDrivers(), true)) {
    throw new RuntimeException('Refuse non-ephemeral MySQL fault injection; no DB touched');
}
$db = new PDO($dsn, $user, getenv('CMS_TEST_MYSQL_PASSWORD') ?: null);
if ($db->query('SELECT DATABASE()')->fetchColumn() !== 'ai_site_cms_ci'
    || $db->query('SELECT SUBSTRING_INDEX(CURRENT_USER(),\'@\',1)')->fetchColumn() !== 'cms_ci') {
    throw new RuntimeException('Refuse MySQL fault testing outside dedicated ephemeral database');
}
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$checks = 0;
function checkFault(bool $ok, string $why): void {
    global $checks;
    $checks++;
    if (!$ok) throw new RuntimeException('FAILED MySQL fault case: '.$why);
}
function refuseFault(callable $cb, string $why): void {
    try { $cb(); } catch (Throwable $e) { checkFault(true, $why); return; }
    checkFault(false, $why);
}
function freshFixture(PDO $db): void {
    // Safe only AFTER all strict CI+schema+account checks above.
    $db->exec('DROP TABLE IF EXISTS cms_installation');
    $db->exec('DROP TABLE IF EXISTS cms_schema_migrations');
}
freshFixture($db);
$store = new SchemaManager($db);

// 1: A shared WordPress-style DB must be rejected BEFORE any schema journal is created.
$db->exec('CREATE TABLE wp_posts (id INT NOT NULL PRIMARY KEY, note VARCHAR(32)) ENGINE=InnoDB');
$db->exec("INSERT INTO wp_posts(id,note) VALUES(1,'preserve')");
$wrong = $store->inspectSite('fault-demo');
checkFault($wrong['state'] === 'blocked', 'Foreign MySQL application schema recognized');
refuseFault(fn () => $store->migrate(2), 'Refuse to modify foreign MySQL database');
checkFault((int)$db->query("SELECT COUNT(*) FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cms_schema_migrations'")->fetchColumn() === 0,
    'No CMS journal created in foreign DB');
checkFault((string)$db->query('SELECT note FROM wp_posts WHERE id=1')->fetchColumn() === 'preserve',
    'Existing non-CMS data remains intact');
$db->exec('DROP TABLE wp_posts');

// 2: MySQL DDL was applied, but migration v1 journal lost before commit.
$store->migrate(1);
$db->exec('DROP TABLE cms_schema_migrations');
checkFault($store->inspectSite('fault-demo')['state'] === 'blocked',
    'Missing v1 migration journal recognized');
refuseFault(fn () => $store->migrate(2), 'Migration must not rebuild unknown v1 schema');
checkFault((int)$db->query("SELECT COUNT(*) FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cms_installation'")->fetchColumn() === 1,
    'Incomplete schema retained for manual recovery rather than deleted');

// 3: Journal says v1, but ALTER to v2 completed before checksum was recorded.
freshFixture($db);
$store->migrate(1);
$db->exec('ALTER TABLE cms_installation ADD COLUMN storage_generation BIGINT NOT NULL DEFAULT 0');
checkFault($store->inspectSite('fault-demo')['state'] === 'blocked',
    'Unjournaled v2 DDL recognized before retry');
refuseFault(fn () => $store->migrate(2), 'Refuse replay of already applied v2 ALTER');
checkFault((int)$db->query('SELECT COUNT(*) FROM cms_schema_migrations')->fetchColumn() === 1,
    'v1 journal preserved; operator must assess partial v2 DDL');

// 4: Normal install, wrong-site read-only preflight and gap/tamper refusal.
freshFixture($db);
checkFault($store->inspectSite('fault-demo')['state'] === 'uninitialized', 'Fresh state explicit');
$store->installSite('fault-demo');
$store->assertSite('fault-demo');
checkFault($store->inspectSite('fault-demo')['state'] === 'ready', 'Valid installation ready');
checkFault($store->inspectSite('another-demo')['reason'] === 'site_identity_mismatch',
    'Read-only mismatch does not expose site ID');
$db->exec('DELETE FROM cms_schema_migrations WHERE version=1');
checkFault($store->inspectSite('fault-demo')['state'] === 'blocked', 'Journal gap recognized');
refuseFault(fn () => $store->migrate(2), 'Journal gap cannot be silently fixed');
checkFault((string)$db->query('SELECT site_id FROM cms_installation')->fetchColumn() === 'fault-demo',
    'Journal tamper leaves owner site row unchanged');

// 5: Unknown future migrations similarly refuse.
freshFixture($db);
$store->installSite('future-demo');
$db->exec("INSERT INTO cms_schema_migrations(version,checksum,applied_at) VALUES(99,'bogus','2026-10-18')");
checkFault($store->inspectSite('future-demo')['state'] === 'blocked', 'Unknown future journal blocked');
refuseFault(fn () => $store->migrate(2), 'Future journal rejected without destructive downgrade');

// Return CI service DB to empty state; no real data or customer's DB was ever involved.
freshFixture($db);
checkFault($store->inspectSite('fault-demo')['state'] === 'uninitialized', 'Ephemeral fixture cleaned');
echo "Stage2 real MySQL 8.4 interrupted-DDL/foreign-schema fault test PASS: {$checks} checks; NO auto-repair, no real host touched\n";
