<?php
declare(strict_types=1);
// Stage2 real SQLite migration mutex and code/schema compatibility. CI-only.
// The gate must not execute DDL, repair journals, or change installation rows.
require dirname(__DIR__).'/src/Storage/SchemaManager.php';
require dirname(__DIR__).'/src/Release/LabSchemaVersionGate.php';

use AiSiteCms\Storage\SchemaManager;
use AiSiteCms\Release\LabSchemaVersionGate as Gate;

if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
    throw new RuntimeException('Explicit migration-coordination CI lab only');
}
$assertions=0;
function gateOk(bool $ok, string $label): void {
    global $assertions; ++$assertions;
    if (!$ok) throw new RuntimeException('Schema gate test: '.$label);
}
function gateRefuse(callable $run, string $label): void {
    global $assertions; ++$assertions;
    try { $run(); } catch (Throwable $e) { return; }
    throw new RuntimeException('Schema compatibility incorrectly allowed: '.$label);
}
$temp = sys_get_temp_dir().'/ai-site-cms-schema-gate-'.bin2hex(random_bytes(8)).'.sqlite';
$pdo=new PDO('sqlite:'.$temp);
$pdo->setAttribute(PDO::ATTR_TIMEOUT,0);
$manager=new SchemaManager($pdo,true);
$site='testsite';
$v1='0.2.0-stage2.1';
try {
    gateOk(Gate::inspect($pdo,$site,$v1)['status']==='blocked',
        'empty DB does not authorize activation');
    gateRefuse(static fn()=>Gate::withMigrationFence($pdo,$site,$v1,
        static fn()=>null),'uninstalled schema cannot switch');
    gateRefuse(static fn()=>Gate::inspect($pdo,$site,'0.2.0-stage2.99'),
        'unreviewed future code policy denied');
    gateRefuse(static fn()=>Gate::inspect($pdo,$site,'../../../user'),
        'malformed target version denied');
    gateOk((int)$pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE name='cms_schema_migrations'")
        ->fetchColumn()===0,'failed readiness fence did not create tables');
    $manager->migrate(1);
    $pdo->exec("INSERT INTO cms_installation(singleton_id,site_id,initialized_at)
        VALUES(1,'testsite','2026-10-18')");
    gateOk(Gate::inspect($pdo,$site,$v1)['status']==='blocked',
        'v1 journal not compatible with hardcoded stage2 v2 contract');
    gateRefuse(static fn()=>Gate::withMigrationFence($pdo,$site,$v1,
        static fn()=>null),'no flip during incomplete migration history');
    $manager->migrate(2);
    gateOk(Gate::inspect($pdo,$site,$v1)['status']==='compatible',
        'fully installed schema v2 accepted');
    gateOk(Gate::inspect($pdo,'other-site',$v1)['status']==='blocked',
        'other site identity fails closed');
    gateRefuse(static fn()=>Gate::withMigrationFence($pdo,'other-site',$v1,
        static fn()=>null),'wrong site cannot obtain activation');
    $before=(string)$pdo->query('SELECT site_id FROM cms_installation')->fetchColumn();
    $wasRun=false;
    $answer=Gate::withMigrationFence($pdo,$site,$v1,function () use (&$wasRun,$temp): string {
        $wasRun=true;
        $p=proc_open([PHP_BINARY,'-r',
            '$db=new PDO("sqlite:".$argv[1]);$db->setAttribute(PDO::ATTR_TIMEOUT,0);'
            .'try{$db->exec("BEGIN IMMEDIATE");echo "UNEXPECTED_LOCK\n";exit(11);}'
            .'catch(Throwable $e){echo "LOCKED\n";exit(0);}', $temp],
            [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']], $pipes);
        if (!is_resource($p)) throw new RuntimeException('Cannot launch competing writer');
        fclose($pipes[0]);
        $output=stream_get_contents($pipes[1]);
        fclose($pipes[1]);fclose($pipes[2]);
        $exit=proc_close($p);
        gateOk($exit===0 && trim($output)==='LOCKED',
            'a separate SQLite process cannot migrate while generation fence held');
        return 'gated';
    });
    gateOk($answer==='gated' && $wasRun,'guarded activation callback runs under fence');
    gateOk((string)$pdo->query('SELECT site_id FROM cms_installation')->fetchColumn()===$before,
        'guarded read did not alter site data');
    gateOk(!$pdo->inTransaction(),'SQLite migration fence did not leak DB transaction');

    $pdo->exec("UPDATE cms_schema_migrations SET checksum='bad' WHERE version=1");
    gateOk(Gate::inspect($pdo,$site,$v1)['status']==='blocked',
        'checksum manipulation blocks current generation');
    gateRefuse(static fn()=>Gate::withMigrationFence($pdo,$site,$v1,
        static fn()=>null),'tampered migration history denied');
    $pdo->exec('DELETE FROM cms_schema_migrations WHERE version=1');
    gateOk(Gate::inspect($pdo,$site,$v1)['status']==='blocked',
        'gap in migration history refuses serving');
    gateRefuse(static fn()=>Gate::withMigrationFence($pdo,$site,$v1,
        static fn()=>null),'schema gap fails closed');
    gateOk($assertions>=18,'tested concurrent SQLite lock, sites and tampered journals');
    echo "Stage2 PHP read-only code/schema compatibility and SQLite migration fence PASS: $assertions checks; no migrations by gate\n";
} finally {
    $pdo=null;
    if (is_file($temp)) unlink($temp);
}
