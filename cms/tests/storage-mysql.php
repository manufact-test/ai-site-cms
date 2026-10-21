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
// The general CLI must prove it can ONLY perform idempotent work on this
// exact 127.0.0.1 disposable CI database, not an arbitrary Hostinger DSN.
$cliEnv=[
    'CI'=>'true','GITHUB_ACTIONS'=>'true','CMS_ENV'=>'test',
    'CMS_STAGE2_MYSQL_CLI_INSTALL'=>'isolated-ci-only',
    'CMS_DB_DSN'=>'mysql:host=127.0.0.1;port=3306;dbname=ai_site_cms_ci;charset=utf8mb4',
    'CMS_DB_USER'=>'cms_ci','CMS_DB_PASSWORD'=>'ephemeral_ci_only',
    'CMS_SITE_ID'=>'mysql-demo'
];
$command=[PHP_BINARY,dirname(__DIR__).'/bin/install.php','--apply'];
$spec=[['pipe','r'],['pipe','w'],['pipe','w']];
$process=proc_open($command,$spec,$pipes,dirname(__DIR__), $cliEnv);
if(!is_resource($process))throw new RuntimeException('Cannot launch test MySQL bootstrap subprocess');
fclose($pipes[0]);
$stdout=stream_get_contents($pipes[1]);fclose($pipes[1]);
$stderr=stream_get_contents($pipes[2]);fclose($pipes[2]);
if(proc_close($process)!==0 || $stderr!=='' ||
    !str_contains($stdout,'schema initialized')) {
    throw new RuntimeException('Exact ephemeral MySQL CLI bootstrap must remain idempotent');
}
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
