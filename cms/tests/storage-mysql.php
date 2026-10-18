<?php
declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';
use AiSiteCms\Storage\SchemaManager;

$dsn = getenv('CMS_TEST_MYSQL_DSN') ?: '';
if (!str_starts_with($dsn, 'mysql:') || !in_array('mysql', PDO::getAvailableDrivers(), true)) {
    throw new RuntimeException('Dedicated ephemeral MySQL CI database must be configured');
}
$db = new PDO($dsn, getenv('CMS_TEST_MYSQL_USER') ?: null, getenv('CMS_TEST_MYSQL_PASSWORD') ?: null);
$store = new SchemaManager($db);
$store->migrate(1);
$store->migrate();
$store->installSite('mysql-demo');
$store->assertSite('mysql-demo');
$store->installSite('mysql-demo');
$rows = $db->query('SELECT COUNT(*) FROM cms_installation')->fetchColumn();
if ((int) $rows !== 1) throw new RuntimeException('Duplicate site setup');
$denials = 0;
try { $store->installSite('hijack-demo'); } catch (Throwable $e) { $denials++; }
try { $store->migrate(1); } catch (Throwable $e) { $denials++; }
$db->exec("UPDATE cms_schema_migrations SET checksum = 'bad' WHERE version = 2");
try { $store->migrate(2); } catch (Throwable $e) { $denials++; }
if ($denials !== 3) throw new RuntimeException('MySQL safety denials incomplete');
echo "Stage2 real MySQL 8.4 PDO schema tests PASS: installation, repeat, identity, downgrade, checksum (3 refusals)\n";
