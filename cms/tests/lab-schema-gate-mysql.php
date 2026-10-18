<?php
declare(strict_types=1);
// Actual MySQL 8.4 named lock compatibility with the existing SchemaManager.
// Dedicated freshly created CI database only, never a live host or client DB.
require dirname(__DIR__).'/src/Storage/SchemaManager.php';
require dirname(__DIR__).'/src/Release/LabSchemaVersionGate.php';

use AiSiteCms\Storage\SchemaManager;
use AiSiteCms\Release\LabSchemaVersionGate as Gate;

if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1'
    || getenv('CMS_ALLOW_DESTRUCTIVE_MYSQL_CI') !== '1'
    || getenv('CMS_TEST_MYSQL_ROOT_PASSWORD') !== 'ephemeral_root_ci_only') {
    throw new RuntimeException('Refusing any non-ephemeral MySQL schema test');
}
$host='127.0.0.1';
$database='ai_site_cms_ci_schema_gate';
$baseDsn='mysql:host='.$host.';port=3306;charset=utf8mb4';
$root=new PDO($baseDsn,'root',getenv('CMS_TEST_MYSQL_ROOT_PASSWORD'),
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
     PDO::ATTR_EMULATE_PREPARES=>false]);
$root->setAttribute(PDO::ATTR_TIMEOUT,3);
$exists=$root->query("SELECT COUNT(*) FROM information_schema.schemata
    WHERE schema_name='ai_site_cms_ci_schema_gate'")->fetchColumn();
if ((int)$exists !== 0) throw new RuntimeException('Refusing pre-existing MySQL schema');
$checks=0;
function mysqlGateOk(bool $value, string $title): void {
    global $checks; ++$checks;
    if (!$value) throw new RuntimeException('MySQL lab schema gate: '.$title);
}
function mysqlGateReject(callable $callback, string $title): void {
    global $checks; ++$checks;
    try { $callback(); } catch (Throwable $error) { return; }
    throw new RuntimeException('MySQL gate incorrectly permitted: '.$title);
}
$created=false;
try {
    $root->exec('CREATE DATABASE ai_site_cms_ci_schema_gate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $created=true;
    $pdo=new PDO('mysql:host=127.0.0.1;port=3306;dbname='.$database.';charset=utf8mb4',
        'root',getenv('CMS_TEST_MYSQL_ROOT_PASSWORD'),
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    $store=new SchemaManager($pdo);
    $site='labsite';
    $code='0.2.0-stage2.1';
    mysqlGateOk(Gate::inspect($pdo,$site,$code)['status']==='blocked',
        'empty dedicated MySQL schema is not ready');
    mysqlGateReject(static fn()=>Gate::withMigrationFence($pdo,$site,$code,static fn()=>null),
        'cannot execute activation on uninitialized MySQL DB');
    $store->migrate(1);
    $pdo->exec("INSERT INTO cms_installation (singleton_id,site_id,initialized_at)
        VALUES(1,'labsite','2026-10-18')");
    mysqlGateOk(Gate::inspect($pdo,$site,$code)['status']==='blocked',
        'v1 schema history cannot activate stage2 code');
    $store->migrate(2);
    mysqlGateOk(Gate::inspect($pdo,$site,$code)['status']==='compatible',
        'MySQL journal v2 and correct site are compatible');
    mysqlGateReject(static fn()=>Gate::withMigrationFence($pdo,'other-site',$code,static fn()=>null),
        'foreign installation identity refused');

    $other=new PDO('mysql:host=127.0.0.1;port=3306;dbname='.$database.';charset=utf8mb4',
        'root',getenv('CMS_TEST_MYSQL_ROOT_PASSWORD'),
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    $lock='ai-cms-'.substr(hash('sha256',$database),0,40);
    $callbackCalls=0;
    $return=Gate::withMigrationFence($pdo,$site,$code,function () use (
        $other,$lock,&$callbackCalls): string {
        $callbackCalls++;
        $stmt=$other->prepare('SELECT GET_LOCK(?, 0)');
        $stmt->execute([$lock]);
        mysqlGateOk((int)$stmt->fetchColumn()===0,
            'separate MySQL connection cannot start schema migration during guarded activation');
        return 'checked';
    });
    mysqlGateOk($return==='checked'&&$callbackCalls===1,
        'cooperative migration lock held through caller callback');
    $stmt=$other->prepare('SELECT GET_LOCK(?, 0)');
    $stmt->execute([$lock]);
    mysqlGateOk((int)$stmt->fetchColumn()===1,
        'schema named lock correctly released after activation');
    $stmt=$other->prepare('SELECT RELEASE_LOCK(?)');$stmt->execute([$lock]);
    mysqlGateOk((int)$stmt->fetchColumn()===1,'control probe releases its MySQL named lock');

    $checkpoint=Gate::checkpoint($pdo,$site,$code);
    mysqlGateOk($checkpoint['schemaVersion']===2
        && $checkpoint['storageGeneration']==='0'
        && strlen($checkpoint['fingerprint'])===64,
        'real MySQL 8.4 foundation checkpoint includes retained storage generation');
    mysqlGateOk(Gate::checkpoint($other,$site,$code)['fingerprint']===$checkpoint['fingerprint'],
        'independent PDO MySQL connection agrees on fingerprint');
    mysqlGateOk(Gate::withCheckpointFence($pdo,$site,$code,$checkpoint,
        static fn():string=>'checked')==='checked',
        'approved MySQL checkpoint survives a no-write guarded operation');
    mysqlGateReject(static fn()=> Gate::assertCheckpoint(
        $pdo,$site,'0.2.0-stage2.2',$checkpoint),
        'checkpoint cannot approve a different target code version');
    $pdo->exec('UPDATE cms_installation SET storage_generation=1 WHERE singleton_id=1');
    mysqlGateReject(static fn()=>Gate::assertCheckpoint($pdo,$site,$code,$checkpoint),
        'valid schema with wrong MySQL storage generation is stale');
    mysqlGateReject(static fn()=>Gate::withCheckpointFence(
        $pdo,$site,$code,$checkpoint,static fn()=>null),
        'checkpoint mismatch refuses activation before running callback');
    mysqlGateOk((string)$pdo->query('SELECT storage_generation FROM cms_installation')
        ->fetchColumn()==='1','rejected activation does not repair or overwrite foundation');
    $pdo->exec('UPDATE cms_installation SET storage_generation=0 WHERE singleton_id=1');
    mysqlGateOk(Gate::assertCheckpoint($pdo,$site,$code,$checkpoint)['fingerprint']
        ===$checkpoint['fingerprint'],
        'explicit test fixture restore matches externally retained checkpoint');
    // MySQL GET_LOCK protects cooperative migrations, not arbitrary writers.
    // Demonstrate detection without falsely claiming transactional DML rollback.
    mysqlGateReject(static fn()=>Gate::withCheckpointFence(
        $pdo,$site,$code,$checkpoint,static function () use ($pdo):string {
            $pdo->exec('UPDATE cms_installation SET storage_generation=7 WHERE singleton_id=1');
            return 'changed';
        }), 'post-callback DB drift is detected, not silently accepted');
    mysqlGateOk((string)$pdo->query('SELECT storage_generation FROM cms_installation')
        ->fetchColumn()==='7',
        'MySQL checkpoint gate does not undo unexpected external DML');
    $pdo->exec('UPDATE cms_installation SET storage_generation=0 WHERE singleton_id=1');
    mysqlGateOk(Gate::assertCheckpoint($pdo,$site,$code,$checkpoint)['storageGeneration']==='0',
        'only independently approved state satisfies final MySQL gate');

    mysqlGateReject(static fn()=>Gate::inspect($pdo,$site,'0.2.0-stage2.999'),
        'unreviewed future code version rejected');
    $pdo->exec("UPDATE cms_schema_migrations SET checksum='tampered' WHERE version=1");
    mysqlGateOk(Gate::inspect($pdo,$site,$code)['status']==='blocked',
        'invalid MySQL migration checksum blocks new code');
    mysqlGateReject(static fn()=>Gate::withMigrationFence($pdo,$site,$code,static fn()=>null),
        'tampered MySQL journal refuses code activation');
    mysqlGateOk((string)$pdo->query('SELECT site_id FROM cms_installation')->fetchColumn()===$site,
        'failed schema gate does not alter site installation');
    echo "Stage2 real MySQL code/schema gate and migration named-lock PASS: $checks checks; separate CI-only DB\n";
    $other=null;
    $pdo=null;
} finally {
    if ($created) $root->exec('DROP DATABASE ai_site_cms_ci_schema_gate');
}
