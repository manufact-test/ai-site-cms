<?php
declare(strict_types=1);

// Version routing is a CLI-only simulation of stable-front-controller generation
// selection; no real Apache/FPM, OPcache reset, DNS or database access.
require dirname(__DIR__).'/src/Release/LabPackageStager.php';
require dirname(__DIR__).'/src/Release/LabPhpGenerationSwitcher.php';
require dirname(__DIR__).'/src/Storage/SchemaManager.php';

use AiSiteCms\Release\LabPackageStager as Stager;
use AiSiteCms\Release\LabPhpGenerationSwitcher as Switcher;

if (getenv('CI') !== 'true' || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
    throw new RuntimeException('Explicit disposable CI laboratory flags required');
}
$count = 0;
function swOk(bool $ok, string $message): void {
    global $count; ++$count;
    if (!$ok) throw new RuntimeException('Stage2 version switch: '.$message);
}
function swReject(callable $fn, string $message): void {
    global $count; ++$count;
    try { $fn(); } catch (\Throwable $e) { return; }
    throw new RuntimeException('Stage2 switch unexpectedly allowed: '.$message);
}
function swFixture(string $path, string $version): string {
    mkdir($path, 0700);
    foreach (['public','vendor','private','private/editor'] as $dir) mkdir($path.'/'.$dir,0700,true);
    $files=[
        'public/index.php'=>'<?php echo '.var_export($version,true).';',
        'vendor/autoload.php'=>'<?php // synthetic auto',
        'private/editor/editor.js'=>'window.cmsRelease='.json_encode($version).';',
        'composer.json'=>'{"require":{}}',
    ];
    $records=[];
    foreach ($files as $name=>$data) {
        file_put_contents($path.'/'.$name,$data);
        $records[]=['path'=>$name,'bytes'=>strlen($data),'sha256'=>hash('sha256',$data)];
    }
    $manifest=['format'=>'ai-site-cms-internal-stage2-v2','stage'=>2,
        'releaseVersion'=>$version,'productionReady'=>false,'documentRoot'=>'public',
        'isSigned'=>false,'writeEndpointsAvailable'=>false,'files'=>$records];
    $raw=json_encode($manifest,JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)."\n";
    file_put_contents($path.'/private/package-manifest.json',$raw);
    return hash('sha256',$raw);
}
function swClean(string $directory): void {
    if (is_link($directory) || is_file($directory)) { unlink($directory);return; }
    foreach (scandir($directory) as $name) {
        if ($name!=='.' && $name!=='..') swClean($directory.'/'.$name);
    }
    rmdir($directory);
}
$testRoot = sys_get_temp_dir().'/ai-site-cms-php-switch-fixtures-'.bin2hex(random_bytes(8));
mkdir($testRoot,0700);
$labRoots=[];
try {
    $v0='0.2.0-stage2.0';
    $v1='0.2.0-stage2.1';
    $v2='0.2.0-stage2.2';
    $sources=[];
    foreach ([$v0,$v1,$v2] as $v) {
        $src=$testRoot.'/source-'.$v;
        $sources[$v]=['path'=>$src,'digest'=>swFixture($src,$v)];
    }
    $installed=[];
    $realPackage=dirname(__DIR__).'/.build/internal-stage2-package';
    foreach ([$v0,$v1,$v2] as $v) {
        $entry=$sources[$v];
        if ($v===$v1 && is_dir($realPackage)) {
            $entry=['path'=>$realPackage,
                'digest'=>hash_file('sha256',$realPackage.'/private/package-manifest.json')];
            $info=Stager::verifyPackage($entry['path'],$entry['digest']);
            swOk($info['version']===$v1 && $info['files']>=400,
                'compiled static editor package tested as real second generation');
        }
        $lab=Stager::create(); $labRoots[]=$lab->root();
        swOk($lab->stage($entry['path'],$entry['digest'])['status']==='installed',
            'separate immutable-install rehearsal for '.$v);
        $installed[$v]=['root'=>$lab->root(),'digest'=>$entry['digest']];
    }
    $sw=Switcher::create();$labRoots[]=$sw->root();
    swOk($sw->inspect()['status']==='clean' && !$sw->inspect()['ready'],
        'fresh switcher has no implicit active release');
    swReject(static fn()=> $sw->resolve($v0),'cannot serve unactivated generation');
    swReject(static fn()=>Switcher::reopen($testRoot),'cannot reopen foreign root');
    swReject(static fn()=>Switcher::reopen(sys_get_temp_dir()),'cannot target OS temp parent');
    foreach ([$v0,$v1,$v2] as $v) {
        $registered=$sw->register($installed[$v]['root'],$installed[$v]['digest'],$v);
        swOk($registered['registered']>=1,'registered only verified generation '.$v);
    }
    swReject(static fn()=> $sw->register($installed[$v0]['root'],$installed[$v0]['digest'],$v0),
        'registered version is immutable, no overwrite');
    swReject(static fn()=> $sw->register($testRoot,$installed[$v0]['digest'],$v0),
        'reject foreign app root');
    swReject(static fn()=> $sw->register($installed[$v0]['root'],str_repeat('0',64),'0.2.0-stage2.3'),
        'reject unverified manifest digest');

    swReject(static fn()=> $sw->switchTo($v0,null,0,$v0,'after-intent'),'simulate journal-before-pointer failure');
    swOk($sw->inspect()['status']==='pending-before-switch','first install interrupted before activation');
    swReject(static fn()=> $sw->resolve($v0),'fail closed on unresolved switch intent');
    swReject(static fn()=> $sw->recover('finalize',$v0),'cannot finalize nonexistent generation pointer');
    swReject(static fn()=> $sw->switchTo($v1,null,0,$v0),'stale pending journal prevents concurrent switch');
    swOk(Switcher::reopen($sw->root())->inspect()['status']==='pending-before-switch',
        'crash journal persists for restarted operator');
    swOk($sw->recover('abort',$v0)['status']==='clean','explicit abort before pointer');

    swReject(static fn()=> $sw->switchTo($v0,null,0,$v0,'after-pointer'),'simulate pointer-committed failure');
    swOk($sw->inspect()['status']==='pending-after-switch','unreceipted generation after pointer');
    swReject(static fn()=> $sw->resolve($v0),'no serve during unreceipted pointer transition');
    swReject(static fn()=> $sw->recover('abort',$v0),'cannot abort an already switched pointer');
    swOk($sw->recover('finalize',$v0)['ready'],'explicit finalize retains initial generation');
    swOk($sw->resolve($v0)['version']===$v0,'initial verified code can be resolved');
    swOk($sw->resolve($v0)['entry']===$installed[$v0]['root'].'/code/public/index.php',
        'resolved front-controller path is version-specific, never a mutable symlink');
    swReject(static fn()=> $sw->switchTo($v1,null,0,$v0),'stale CAS cannot mutate active release');
    swReject(static fn()=> $sw->switchTo($v1,$v0,0,$v0),'ABA stale sequence cannot mutate active');
    swReject(static fn()=> $sw->switchTo($v0,$v0,1,$v0),'identical version replay forbidden');

    swReject(static fn()=> $sw->switchTo($v1,$v0,1,$v0,'after-intent'),
        'fault before upgrade pointer');
    swOk($sw->inspect()['status']==='pending-before-switch'
        && $sw->inspect()['current']===$v0,'old generation retained before upgrade commit');
    swOk($sw->recover('abort',$v0)['ready'],'upgrade aborted without disturbing v0');
    swReject(static fn()=> $sw->switchTo($v1,$v0,1,$v0,'after-pointer'),
        'fault after upgrade pointer');
    swOk($sw->inspect()['status']==='pending-after-switch','post-pointer upgrade crash recognized');
    swOk(Switcher::reopen($sw->root())->inspect()['status']==='pending-after-switch',
        'fresh PHP process recognizes crash boundary');
    swReject(static fn()=> $sw->resolve($v0),'requests gated while upgrade incomplete');
    swOk($sw->recover('finalize',$v0)['current']===$v1,'explicit recovery finalizes upgraded generation');
    swOk($sw->inspect()['sequence']===2,'activation sequence monotonic after recovery');
    swReject(static fn()=> $sw->resolve($v2),'external floor beyond active blocks serving');

    swReject(static fn()=> $sw->switchTo($v0,$v1,2,$v1),
        'operator external version floor prevents downgrade');
    swReject(static fn()=> $sw->switchTo($v0,$v1,2,$v0,'after-receipt'),
        'rollback committed and receipt written, but intent cleanup interrupted');
    swOk($sw->inspect()['status']==='committed-needs-cleanup',
        'receipt completed with cleanup pending');
    swOk($sw->recover('finalize',$v0)['current']===$v0,'receipt-bearing rollback completed');
    swOk($sw->inspect()['sequence']===3,'rollback increments generation and prevents ABA');
    swReject(static fn()=> $sw->switchTo($v1,$v0,2,$v0),'replay sequence after rollback denied');
    swReject(static fn()=> $sw->switchTo($v2,$v1,3,$v0),'wrong expected current denied');
    swOk($sw->switchTo($v1,$v0,3,$v0)['current']===$v1,
        'fresh forward upgrade allowed after explicit rollback');
    swReject(static fn()=> $sw->switchTo($v0,$v1,4,$v1),
        'rollback prevented if it would violate retained external floor');
    swOk($sw->switchTo($v2,$v1,4,$v1)['current']===$v2,'next verified generation activated');
    swOk($sw->resolve($v2)['sequence']===5,
        'external minimum version and monotonic generations coexist');
    $touched=$installed[$v2]['root'].'/code/private/editor/editor.js';
    $original=file_get_contents($touched);
    file_put_contents($touched, $original.'tampered');
    swReject(static fn()=> $sw->inspect(),'damaged live generation refused before request');
    swReject(static fn()=> $sw->resolve($v2),'damaged live generation never routed');
    file_put_contents($touched, $original);
    swOk($sw->resolve($v2)['version']===$v2,'unchanged signed manifest restores read-only gate');
    $receipt=$sw->root().'/active-receipt.json';
    $originalReceipt=file_get_contents($receipt);
    file_put_contents($receipt,'{"fake":true}');
    swReject(static fn()=> $sw->resolve($v2),'forged activation receipt blocked');
    file_put_contents($receipt,$originalReceipt);
    $tmpWrite=$sw->root().'/active.json.new';
    file_put_contents($tmpWrite,'interrupted');
    swReject(static fn()=> Switcher::reopen($sw->root()),
        'unresolved atomic rename residue blocks recovery');
    unlink($tmpWrite);
    $lock=$sw->root().'/switch-exclusive.lock';
    mkdir($lock);
    swReject(static fn()=> $sw->resolve($v2),'stale exclusion lock denies concurrent reads');
    swReject(static fn()=> $sw->switchTo($v1,$v2,5,$v1),
        'concurrent activation blocked by lock');
    rmdir($lock);
    swOk($sw->resolve($v2)['version']===$v2,'active code resumes only after lock cleared');
    $pointer=$sw->root().'/active.json';
    $oldPointer=file_get_contents($pointer);
    file_put_contents($pointer, str_replace('"sequence":5','"sequence":4',$oldPointer));
    swReject(static fn()=> $sw->inspect(),'pointer replay conflicts with receipt');
    file_put_contents($pointer,$oldPointer);
    swOk(Switcher::reopen($sw->root())->resolve($v2)['version']===$v2,
        'separate operator process sees verified generation');
    // Run a real SQLite readiness check inside the same migration lock used by
    // SchemaManager before committing the generation pointer.
    $schemaDb = new PDO('sqlite:'.$testRoot.'/generation-schema.sqlite');
    $siteManager = new \AiSiteCms\Storage\SchemaManager($schemaDb, true);
    swReject(static fn()=> $sw->switchToWithSchema(
        $schemaDb,'lab-site',$v1,$v2,5,$v1),
        'uninstalled DB cannot activate a code rollback');
    swOk($sw->inspect()['sequence']===5,'failed schema gate leaves pointer untouched');
    $siteManager->installSite('lab-site');
    swReject(static fn()=> $sw->switchToWithSchema(
        $schemaDb,'foreign-site',$v1,$v2,5,$v1),
        'foreign site binding cannot activate');
    swOk($sw->switchToWithSchema(
        $schemaDb,'lab-site',$v1,$v2,5,$v1)['sequence']===6,
        'verified DB v2 and correct site allow guarded generation switch');
    swOk(!$schemaDb->inTransaction(),'schema coordination releases SQLite migration fence');
    $schemaDb->exec("UPDATE cms_schema_migrations SET checksum='bad' WHERE version=1");
    swReject(static fn()=> $sw->switchToWithSchema(
        $schemaDb,'lab-site',$v2,$v1,6,$v1),
        'broken real migration journal blocks code change');
    swOk($sw->inspect()['current']===$v1,'failed migration policy cannot corrupt active pointer');
    $schemaDb=null;
    swOk($count >= 50,'coverage includes real CI package when present, pointer failures and tampering');
    echo "Stage2 PHP isolated generation switch/rollback PASS: $count checks, no FPM/DB/site writes\n";
} finally {
    foreach ($labRoots as $root) {
        if (dirname($root)===realpath(sys_get_temp_dir())
            && (str_starts_with(basename($root),'ai-site-cms-php-switch-lab-')
                ||str_starts_with(basename($root),'ai-site-cms-php-install-lab-'))) swClean($root);
    }
    swClean($testRoot);
}
