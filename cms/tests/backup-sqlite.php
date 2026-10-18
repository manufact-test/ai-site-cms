<?php
declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use AiSiteCms\Storage\FoundationSnapshot;
use AiSiteCms\Storage\SchemaManager;

putenv('CMS_ENV=test');
putenv('CMS_ALLOW_SQLITE_TEST_ONLY=1');
$checks=0;
function assertBackup(bool $ok,string $why): void {
    global $checks;
    ++$checks;
    if (!$ok) throw new RuntimeException('Stage2 foundation snapshot test failed: '.$why);
}
function refusesBackup(callable $fn,string $why): void {
    try { $fn(); } catch (Throwable $e) {assertBackup(true,$why);return;}
    assertBackup(false, $why);
}
function dbBackup(): PDO {return new PDO('sqlite::memory:');}
$source = dbBackup();
$srcSchema = new SchemaManager($source,true);
$srcSchema->installSite('isolated-site');
$source->exec('UPDATE cms_installation SET storage_generation=42');
$srcSnapshot=new FoundationSnapshot($source,true);
$encoded=$srcSnapshot->export('isolated-site');
assertBackup(strlen($encoded)<500,'Snapshot is bounded');
assertBackup(FoundationSnapshot::verify($encoded,'isolated-site')['storage_generation']==='42','Verify generation');
assertBackup($srcSnapshot->export('isolated-site')===$encoded,'Read-only export deterministic');
$target=dbBackup();
$targetRestorer = new FoundationSnapshot($target,true);
$targetRestorer->restoreToFreshCiDatabase($encoded,'isolated-site');
assertBackup($targetRestorer->export('isolated-site')===$encoded,'Independent database restores identical foundation metadata');
assertBackup((string)$source->query('SELECT storage_generation FROM cms_installation')->fetchColumn()==='42','Source unchanged');
assertBackup((new SchemaManager($target,true))->inspectSite('isolated-site')['state']==='ready','Restored DB ready');
refusesBackup(fn()=> $targetRestorer->restoreToFreshCiDatabase($encoded,'isolated-site'),'Cannot overwrite existing target');

$payload=json_decode($encoded,true,16,JSON_THROW_ON_ERROR);
$variants = [
    ['extra_field', [...$payload,'unexpected'=>'x']],
    ['wrong_format', array_replace($payload,['format'=>'future-schema'])],
    ['future_schema', array_replace($payload,['schema_version'=>99])],
    ['negative_generation',array_replace($payload,['storage_generation'=>'-2'])],
    ['huge_generation',array_replace($payload,['storage_generation'=>str_repeat('9',19)])],
    ['bad_hash',array_replace($payload,['sha256'=>str_repeat('0',64)])],
    ['nonstring_generation',array_replace($payload,['storage_generation'=>2])],
    ['wrong_site',array_replace($payload,['site_id'=>'other-site'])],
    ['missing_hash', array_diff_key($payload,['sha256'=>true])],
    ['nonstring_hash',array_replace($payload,['sha256'=>false])]
];
foreach($variants as [$why,$values]){
    $dirty=json_encode($values,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    refusesBackup(fn()=> FoundationSnapshot::verify($dirty,'isolated-site'), 'Invalid snapshot: '.$why);
    $blank=dbBackup();
    refusesBackup(
        fn()=> (new FoundationSnapshot($blank,true))->restoreToFreshCiDatabase($dirty,'isolated-site'),
        'Invalid snapshot never restored: '.$why
    );
    assertBackup((new SchemaManager($blank,true))->inspectSite('isolated-site')['state']==='uninitialized',
        'No DDL performed on rejected snapshot: '.$why);
}
refusesBackup(fn()=> FoundationSnapshot::verify($encoded,'different-site'),'Expected site ID must match');
refusesBackup(fn()=> FoundationSnapshot::verify('[]','isolated-site'),'Snapshot requires an object');
refusesBackup(fn()=> FoundationSnapshot::verify(str_repeat('X',2050),'isolated-site'),'Reject oversized snapshot');

$foreign=dbBackup();
$foreign->exec('CREATE TABLE wp_posts(id INTEGER PRIMARY KEY)');
$foreignRestorer=new FoundationSnapshot($foreign,true);
refusesBackup(fn()=> $foreignRestorer->restoreToFreshCiDatabase($encoded,'isolated-site'),
    'Existing foreign application database must not be overwritten');
assertBackup((int)$foreign->query("SELECT COUNT(*) FROM sqlite_master WHERE name='wp_posts'")->fetchColumn()===1,
    'Foreign table preserved');
assertBackup((int)$foreign->query("SELECT COUNT(*) FROM sqlite_master WHERE name='cms_schema_migrations'")->fetchColumn()===0,
    'No CMS journal created on foreign database');
putenv('CMS_ALLOW_SQLITE_TEST_ONLY=0');
$unpermitted=dbBackup();
refusesBackup(fn()=> (new FoundationSnapshot($unpermitted,true))->restoreToFreshCiDatabase($encoded,'isolated-site'),
    'Refuse restore when explicit test grant absent');
assertBackup((new SchemaManager($unpermitted,true))->inspectSite('isolated-site')['state']==='uninitialized',
    'Denied restore had zero DDL');
putenv('CMS_ALLOW_SQLITE_TEST_ONLY=1');

// Real separate file DBs: verify source/target survive fresh PDO connections.
$dir=sys_get_temp_dir().'/ai-cms-restore-'.bin2hex(random_bytes(8));
mkdir($dir,0700);
try{
  $from=new PDO('sqlite:'.$dir.'/source.sqlite');
  (new SchemaManager($from,true))->installSite('file-demo');
  $from->exec('UPDATE cms_installation SET storage_generation=912');
  $fromSnapshot=(new FoundationSnapshot($from,true))->export('file-demo');
  file_put_contents($dir.'/snapshot.json',$fromSnapshot);
  unset($from);
  $freshSource=new PDO('sqlite:'.$dir.'/source.sqlite');
  $freshTarget=new PDO('sqlite:'.$dir.'/target.sqlite');
  (new FoundationSnapshot($freshTarget,true))->restoreToFreshCiDatabase(
      (string)file_get_contents($dir.'/snapshot.json'),'file-demo'
  );
  assertBackup((new FoundationSnapshot($freshTarget,true))->export('file-demo')===$fromSnapshot,
      'Fresh file-based SQLite target restored');
  assertBackup((new FoundationSnapshot($freshSource,true))->export('file-demo')===$fromSnapshot,
      'Fresh SQLite source DB preserved');
  unset($freshSource,$freshTarget);
} finally{
  foreach(glob($dir.'/*') as $file)unlink($file);
  rmdir($dir);
}
echo "Stage2 independent SQLite foundation snapshot/restore PASS: {$checks} assertions; test-only, no real user data\n";
