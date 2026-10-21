<?php
declare(strict_types=1);

require dirname(__DIR__).'/vendor/autoload.php';
use AiSiteCms\Storage\FoundationSnapshot;
use AiSiteCms\Storage\SchemaManager;

// The main CI DB must be isolated; the target is a separately provisioned,
// empty, explicitly allowlisted second MySQL database in the same CI container.
$dsn=getenv('CMS_TEST_MYSQL_DSN') ?: '';
$user=getenv('CMS_TEST_MYSQL_USER') ?: '';
if (getenv('CI')!=='true' || getenv('CMS_ALLOW_DESTRUCTIVE_MYSQL_CI')!=='1'
    || $user!=='cms_ci' || !str_contains($dsn,'dbname=ai_site_cms_ci;')) {
    throw new RuntimeException('Refusing non-ephemeral MySQL restore rehearsal');
}
$source=new PDO($dsn,$user,getenv('CMS_TEST_MYSQL_PASSWORD') ?: null);
$target=new PDO(
    'mysql:host=127.0.0.1;port=3306;dbname=ai_site_cms_restore_ci;charset=utf8mb4',
    $user,getenv('CMS_TEST_MYSQL_PASSWORD') ?: null
);
if ($source->query('SELECT DATABASE()')->fetchColumn()!=='ai_site_cms_ci'
    || $target->query('SELECT DATABASE()')->fetchColumn()!=='ai_site_cms_restore_ci') {
    throw new RuntimeException('Bad source/target DB, refuse rehearsal');
}
$sourceSchema=new SchemaManager($source);
$targetSchema=new SchemaManager($target);
$checks=0;
function mysqlCheck(bool $value,string $why):void {
    global $checks;
    $checks++;
    if(!$value)throw new RuntimeException('MySQL restore rehearsal FAILED: '.$why);
}
function mysqlReject(callable $fn,string $why):void{
    try{$fn();}catch(Throwable $e){mysqlCheck(true,$why);return;}
    mysqlCheck(false,$why);
}
mysqlCheck($sourceSchema->inspectSite('backup-demo')['state']==='uninitialized',
    'Source MySQL fixture empty after fault suite');
mysqlCheck($targetSchema->inspectSite('backup-demo')['state']==='uninitialized',
    'Different target MySQL fixture empty');
$sourceSchema->installSite('backup-demo');
$source->exec('UPDATE cms_installation SET storage_generation=6789');
$sourceSnapshot=(new FoundationSnapshot($source))->export('backup-demo');
mysqlCheck(FoundationSnapshot::verify($sourceSnapshot,'backup-demo')['storage_generation']==='6789',
    'Source snapshot verifies metadata before restore');
$payload=json_decode($sourceSnapshot,true,16,JSON_THROW_ON_ERROR);
$spoofedSnapshots=[
    'duplicate_owner' => str_replace('"site_id":',
        '"site_id":"foreign-site","site_id":', $sourceSnapshot),
    'duplicate_checksum' => str_replace('"sha256":',
        '"sha256":"'.str_repeat('0',64).'","sha256":', $sourceSnapshot),
    'reordered_fields' => json_encode([
        'sha256'=>$payload['sha256'],'site_id'=>$payload['site_id'],
        'schema_version'=>$payload['schema_version'],
        'storage_generation'=>$payload['storage_generation'],
        'format'=>$payload['format']
    ],JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES),
    'trailing_space' => $sourceSnapshot.' ',
    'escaped_field_name' => str_replace('"format":', '"\\u0066ormat":', $sourceSnapshot)
];
foreach($spoofedSnapshots as $why=>$attack){
    mysqlCheck($attack!==$sourceSnapshot,'Hostile signed-state fixture distinct: '.$why);
    mysqlReject(static fn()=> FoundationSnapshot::verify($attack,'backup-demo'),
        'Malformed canonical MySQL foundation input refused: '.$why);
    mysqlReject(static fn()=> (new FoundationSnapshot($target))->restoreToFreshCiDatabase(
        $attack,'backup-demo'), 'No DDL or mutation for hostile restore input: '.$why);
    mysqlCheck($targetSchema->inspectSite('backup-demo')['state']==='uninitialized',
        'MySQL destination stays physically empty: '.$why);
}

$restore=new FoundationSnapshot($target);
$restore->restoreToFreshCiDatabase($sourceSnapshot,'backup-demo');
mysqlCheck($restore->export('backup-demo')===$sourceSnapshot,
    'Fresh MySQL database restored foundation metadata exactly');
mysqlCheck((new FoundationSnapshot($source))->export('backup-demo')===$sourceSnapshot,
    'Source MySQL database remained unchanged');
mysqlCheck($sourceSchema->inspectSite('backup-demo')['state']==='ready','Source ready');
mysqlCheck($targetSchema->inspectSite('backup-demo')['state']==='ready','Independent target ready');
mysqlReject(fn()=> $restore->restoreToFreshCiDatabase($sourceSnapshot,'backup-demo'),
    'Restore never overwrites existing MySQL installation');
mysqlReject(fn()=> $restore->restoreToFreshCiDatabase($sourceSnapshot,'other-demo'),
    'Snapshot cannot be restored for a different site');
mysqlReject(fn()=> FoundationSnapshot::verify(
    substr($sourceSnapshot,0,-3).'XXX','backup-demo'),
    'Corrupt JSON checksum/content refused');
mysqlCheck($restore->export('backup-demo')===$sourceSnapshot,
    'Rejected restore left existing MySQL state unchanged');
mysqlCheck((string)$target->query('SELECT storage_generation FROM cms_installation')->fetchColumn()==='6789',
    'DB carries exact generation, not default 0');
mysqlCheck((int)$target->query('SELECT COUNT(*) FROM cms_schema_migrations')->fetchColumn()===2,
    'Both versioned migration checksums restored by fresh SchemaManager');
echo "Stage2 independent real MySQL 8.4 foundation restore rehearsal PASS: {$checks} assertions; two isolated disposable schemas, no live host\n";
