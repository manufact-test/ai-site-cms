<?php
declare(strict_types=1);

// Real SQLite-only, CI-only foundation checkpoint and damaged-inflight activation.
// No real site, host, credentials, user data, migrations by the release coordinator.
require dirname(__DIR__).'/src/Storage/SchemaManager.php';
require dirname(__DIR__).'/src/Release/LabSchemaVersionGate.php';
require dirname(__DIR__).'/src/Release/LabPackageStager.php';
require dirname(__DIR__).'/src/Release/LabPhpGenerationSwitcher.php';

use AiSiteCms\Storage\SchemaManager;
use AiSiteCms\Release\LabSchemaVersionGate as Gate;
use AiSiteCms\Release\LabPackageStager as Stager;
use AiSiteCms\Release\LabPhpGenerationSwitcher as Switcher;

if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
    throw new RuntimeException('Foundation checkpoint requires disposable CI lab');
}
$count=0;
function dbOk(bool $ok,string $reason):void {
    global $count; ++$count;
    if (!$ok) throw new RuntimeException('DB foundation checkpoint: '.$reason);
}
function dbDenied(callable $work,string $reason):void {
    global $count; ++$count;
    try { $work(); } catch (Throwable $e) { return; }
    throw new RuntimeException('DB drift unexpectedly allowed: '.$reason);
}
function dbCleanup(string $dir):void {
    if (is_link($dir) || is_file($dir)) { unlink($dir); return; }
    foreach (scandir($dir) as $n) {
        if ($n!=='.'&&$n!=='..') dbCleanup($dir.'/'.$n);
    }
    rmdir($dir);
}
// Exact Node package-manifest encoding: two-space pretty JSON, one newline.
function labReleaseJson(array $manifest): string {
    $encoded=json_encode($manifest,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|
        JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    return preg_replace_callback('/^( +)/m',
        static fn(array $m):string => str_repeat(' ',intdiv(strlen($m[1]),2)),
        $encoded)."\n";
}
function dbSyntheticPackage(string $dir,string $version):string {
    mkdir($dir,0700);
    foreach (['public','vendor','private','private/editor'] as $d) mkdir($dir.'/'.$d,0700,true);
    $files=[
        'public/index.php'=>'<?php echo "tested";',
        'vendor/autoload.php'=>'<?php // synthetic',
        'private/editor/editor.js'=>'window.lab='.json_encode($version).';',
        'composer.json'=>'{"require":{}}'
    ];
    $list=[];
    foreach ($files as $p=>$data) {
        file_put_contents($dir.'/'.$p,$data);
        $list[]=['path'=>$p,'bytes'=>strlen($data),'sha256'=>hash('sha256',$data)];
    }
    $manifest=['format'=>'ai-site-cms-internal-stage2-v2','stage'=>2,
        'releaseVersion'=>$version,'productionReady'=>false,'documentRoot'=>'public',
        'adminEditorAssets'=>'private/editor','hostingComposerOrNodeRequired'=>false,
        'writeEndpointsAvailable'=>false,'isSigned'=>false,'files'=>$list];
    $payload=labReleaseJson($manifest);
    file_put_contents($dir.'/private/package-manifest.json',$payload);
    return hash('sha256',$payload);
}
$fixture=sys_get_temp_dir().'/ai-site-cms-db-checkpoint-test-'.bin2hex(random_bytes(8));
mkdir($fixture,0700);
$labs=[];
try {
    $dbFile=$fixture.'/isolated.sqlite';
    $pdo=new PDO('sqlite:'.$dbFile);
    $pdo->setAttribute(PDO::ATTR_TIMEOUT,0);
    $store=new SchemaManager($pdo,true);
    $site='labsite';
    $v1='0.2.0-stage2.1';$v2='0.2.0-stage2.2';
    dbDenied(static fn()=>Gate::checkpoint($pdo,$site,$v1),'no DB checkpoint without installed site');
    $store->installSite($site);
    $check1=Gate::checkpoint($pdo,$site,$v1);
    dbOk($check1['format']==='ai-site-cms-stage2-db-foundation-checkpoint-v1'
        && $check1['schemaVersion']===2 && $check1['storageGeneration']==='0'
        && strlen($check1['fingerprint'])===64,'v2 foundation checkpoint generated with no credentials');
    dbOk(Gate::checkpoint($pdo,$site,$v1)['fingerprint']===$check1['fingerprint'],
        'same site snapshot yields deterministic stable fingerprint');
    $second=new PDO('sqlite:'.$dbFile);
    dbOk(Gate::checkpoint($second,$site,$v1)['fingerprint']===$check1['fingerprint'],
        'independent process connection computes identical schema/site fingerprint');
    dbDenied(static fn()=>Gate::assertCheckpoint($pdo,'foreign-site',$v1,$check1),
        'cannot use checkpoint on another site');
    dbDenied(static fn()=>Gate::assertCheckpoint($pdo,$site,$v2,$check1),
        'checkpoint cannot be reused for another release version');
    $fake=$check1;$fake['fingerprint']=str_repeat('0',64);
    dbDenied(static fn()=>Gate::assertCheckpoint($pdo,$site,$v1,$fake),'fabricated expected hash rejected');
    $fake=$check1;$fake['extra']='untrusted';
    dbDenied(static fn()=>Gate::assertCheckpoint($pdo,$site,$v1,$fake),'extra checkpoint fields fail closed');

    $switcher=Switcher::create();$labs[]=$switcher->root();
    foreach ([$v1,$v2] as $v) {
        $dir=$fixture.'/source-'.$v;
        $real=dirname(__DIR__).'/.build/internal-stage2-package';
        if ($v===$v1 && is_dir($real)) {
            // Editor CI: exercise the FULL actual compiled distribution, not
            // only the 4-file standalone synthetic compatibility fixture.
            $dir=$real;
            $digest=hash_file('sha256',$dir.'/private/package-manifest.json');
            if ($digest === false) throw new RuntimeException('Compiled package manifest unreadable');
            $realInfo=Stager::verifyPackage($dir,$digest);
            dbOk($realInfo['version']===$v1 && $realInfo['files']>=400,
                'actual bundled CMS participates in DB-checkpoint version recovery');
        } else {
            $digest=dbSyntheticPackage($dir,$v);
        }
        $installed=Stager::create();$labs[]=$installed->root();
        dbOk($installed->stage($dir,$digest)['ready'],'verified generation installed '.$v);
        dbOk($switcher->register($installed->root(),$digest,$v)['registered']>=1,
            'generation registered '.$v);
    }
    dbOk($switcher->switchToWithCheckpoint(
        $pdo,$site,$v1,null,0,$v1,$check1)['sequence']===1,
        'first verified activation bound to existing database checkpoint');
    dbOk($switcher->withRequestLeaseAndCheckpoint(
        $pdo,$site,$v1,$v1,$check1,static fn(array $g)=>$g['version'])===$v1,
        'CLI simulated request pins both foundation fingerprint and code generation');
    $check2=Gate::checkpoint($pdo,$site,$v2);
    dbDenied(static fn()=> $switcher->withRequestLeaseAndCheckpoint(
        $pdo,$site,$v2,$v1,$check2,static fn(array $g)=>$g['version']),
        'code V1 cannot serve with independently approved V2 checkpoint');

    $pdo->exec('UPDATE cms_installation SET storage_generation=1 WHERE singleton_id=1');
    dbDenied(static fn()=>Gate::assertCheckpoint($pdo,$site,$v1,$check1),
        'same valid schema with altered storage generation invalidates fingerprint');
    dbDenied(static fn()=> $switcher->switchToWithCheckpoint(
        $pdo,$site,$v2,$v1,1,$v1,$check2),
        'stale DB checkpoint prevents release switch BEFORE writing intent');
    dbOk($switcher->inspect()['sequence']===1
        && $switcher->inspect()['status']==='clean',
        'database drift cannot mutate pointer or create incomplete journal');
    $newSnapshot=Gate::checkpoint($pdo,$site,$v2);
    dbOk($newSnapshot['storageGeneration']==='1'
        && $newSnapshot['fingerprint']!==$check2['fingerprint'],
        'new snapshot differs from old independently trusted checkpoint');
    dbDenied(static fn()=>Gate::assertCheckpoint($pdo,$site,$v2,$check2),
        'silently regenerated DB checkpoint must not be mistaken for external one');
    // Explicit operator decision to resume tests from approved v2 baseline.
    $pdo->exec('UPDATE cms_installation SET storage_generation=0 WHERE singleton_id=1');
    dbOk(Gate::assertCheckpoint($pdo,$site,$v2,$check2)['fingerprint']===$check2['fingerprint'],
        'restored synthetic DB matches previously retained checkpoint');

    dbDenied(static fn()=> $switcher->switchToWithCheckpoint(
        $pdo,$site,$v2,$v1,1,$v1,$check2,'after-intent'),
        'test interruption before activation pointer');
    dbOk($switcher->inspect()['status']==='pending-before-switch'
        && $switcher->inspect()['current']===$v1,'old code retained at precommit crash');
    $pdo->exec('UPDATE cms_installation SET storage_generation=2 WHERE singleton_id=1');
    dbDenied(static fn()=> $switcher->recoverWithCheckpoint(
        $pdo,$site,$v2,'abort',$v1,$check2),
        'after crash changed database blocks even abort without explicit review');
    dbOk($switcher->inspect()['status']==='pending-before-switch',
        'failed DB checkpoint recovery retains journal for operator');
    $pdo->exec('UPDATE cms_installation SET storage_generation=0 WHERE singleton_id=1');
    dbOk($switcher->recoverWithCheckpoint($pdo,$site,$v2,'abort',$v1,$check2)['status']==='clean',
        'recovered precommit crash only against approved checkpoint');

    dbDenied(static fn()=> $switcher->switchToWithCheckpoint(
        $pdo,$site,$v2,$v1,1,$v1,$check2,'after-pointer'),
        'test committed pointer with missing receipt');
    dbOk($switcher->inspect()['status']==='pending-after-switch'
        && $switcher->inspect()['current']===$v2,'commit side of switch unambiguous');
    $pdo->exec('UPDATE cms_installation SET storage_generation=3 WHERE singleton_id=1');
    dbDenied(static fn()=> $switcher->recoverWithCheckpoint(
        $pdo,$site,$v2,'finalize',$v1,$check2),
        'post-pointer crash cannot finalize against altered DB');
    dbOk($switcher->inspect()['status']==='pending-after-switch',
        'mismatched database preserves uncommitted receipt state');
    $pdo->exec('UPDATE cms_installation SET storage_generation=0 WHERE singleton_id=1');
    dbOk($switcher->recoverWithCheckpoint($pdo,$site,$v2,'finalize',$v1,$check2)['sequence']===2,
        'operator finalizes committed release only with unchanged foundation');
    dbOk($switcher->withRequestLeaseAndCheckpoint(
        $pdo,$site,$v2,$v1,$check2,static fn(array $g)=>$g['version'])===$v2,
        'restarted request sees consistent code and DB fingerprint');
    dbDenied(static fn()=> $switcher->withRequestLeaseAndCheckpoint(
        $pdo,$site,$v1,$v1,$check1,static fn(array $g)=>$g['version']),
        'stale old-code snapshot cannot claim active new release');

    // A REAL second PHP process starts a SQLite write transaction, changes
    // foundation generation and is SIGKILLed BEFORE COMMIT. SQLite must roll
    // back the uncommitted change. The active code pointer must remain stable.
    $child=proc_open([PHP_BINARY,
        dirname(__DIR__).'/tests/fixtures/foundation-sqlite-uncommitted-worker.php',
        $dbFile], [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$childPipes);
    if (!is_resource($child)) throw new RuntimeException('Cannot spawn DB crash worker');
    try {
        stream_set_timeout($childPipes[1],8);
        $line=fgets($childPipes[1]);
        dbOk($line==="UNCOMMITTED\n",'actual separate PHP process holds uncommitted DB change');
        dbOk((string)$pdo->query('SELECT storage_generation FROM cms_installation')->fetchColumn()==='0',
            'concurrent reader cannot see uncommitted storage generation');
        dbOk(proc_terminate($child,9),'supervisor sends real SIGKILL to SQLite writer');
    } finally {
        foreach ($childPipes as $pipe) fclose($pipe);
        proc_close($child);
    }
    dbOk(Gate::assertCheckpoint($pdo,$site,$v2,$check2)['fingerprint']===$check2['fingerprint'],
        'SQLite automatically undoes killed uncommitted foundation transaction');
    dbOk($switcher->inspect()['current']===$v2
        && $switcher->inspect()['sequence']===2,'killed DB writer did not alter release pointer');
    dbOk($switcher->withRequestLeaseAndCheckpoint(
        $pdo,$site,$v2,$v1,$check2,static fn(array $g)=>$g['version'])===$v2,
        'verified release remains healthy after real SIGKILL of uncommitted DB process');

    // Fail closed on altered installation lineage, even without a generation bump.
    $initialized=(string)$pdo->query('SELECT initialized_at FROM cms_installation')->fetchColumn();
    $pdo->exec("UPDATE cms_installation SET initialized_at='unexpected' WHERE singleton_id=1");
    dbDenied(static fn()=>Gate::assertCheckpoint($pdo,$site,$v2,$check2),
        'unexpected installation metadata changed without generation bump');
    $restore=$pdo->prepare('UPDATE cms_installation SET initialized_at=? WHERE singleton_id=1');
    $restore->execute([$initialized]);
    dbOk(Gate::assertCheckpoint($pdo,$site,$v2,$check2)['storageGeneration']==='0',
        'original approved lineage fingerprint is restored in disposable fixture');

    // An interrupted destructive/unexpected migration must not be hidden.
    $pdo->exec("UPDATE cms_schema_migrations SET checksum='tampered' WHERE version=1");
    dbDenied(static fn()=>Gate::checkpoint($pdo,$site,$v2),
        'tampered migration history blocks baseline generation checkpoint');
    dbDenied(static fn()=> $switcher->withRequestLeaseAndCheckpoint(
        $pdo,$site,$v2,$v1,$check2,static fn(array $g)=>$g),
        'version-specific request refused after journal corruption');
    $pdo->exec("UPDATE cms_schema_migrations SET checksum='".(string)$pdo->query(
        'SELECT checksum FROM cms_schema_migrations WHERE version=2')->fetchColumn().
        "' WHERE version=1"); // Deliberately *wrong* checksum; stays blocked.
    dbDenied(static fn()=>Gate::checkpoint($pdo,$site,$v2),
        'a syntactically valid but wrong migration digest must fail closed');

    dbOk($count >= 32,'adversarial foundation+generation DB checkpoint coverage executed');
    echo "Stage2 SQLite foundation checkpoint + interrupted code activation PASS: $count checks; no DB migration or data restore\n";
} finally {
    $pdo=null;$second=null;
    foreach ($labs as $dir) {
        if (dirname($dir)===realpath(sys_get_temp_dir())
            && preg_match('/^ai-site-cms-php-(?:switch|install)-lab-[a-f0-9]{32}$/D',
                basename($dir))) dbCleanup($dir);
    }
    dbCleanup($fixture);
}
