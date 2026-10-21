<?php
declare(strict_types=1);
// Actual *separate PHP process* leases against a disposable, separately verified code
// installation; no networking, web-SAPI, real database or production switch.
require dirname(__DIR__).'/src/Release/LabPackageStager.php';
require dirname(__DIR__).'/src/Release/LabPhpGenerationSwitcher.php';

use AiSiteCms\Release\LabPackageStager as Stager;
use AiSiteCms\Release\LabPhpGenerationSwitcher as Switcher;

if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1'
    || !function_exists('proc_open')) {
    throw new RuntimeException('Cross-process generation lease requires explicit CI');
}
$checks = 0;
function leaseOk(bool $condition, string $message): void
{
    global $checks;
    ++$checks;
    if (!$condition) throw new RuntimeException('PHP generation lease: '.$message);
}
function leaseReject(callable $fn, string $message): void
{
    global $checks;
    ++$checks;
    try { $fn(); } catch (Throwable $e) { return; }
    throw new RuntimeException('Expected refusal: '.$message);
}
function leaseClean(string $dir): void
{
    if (is_link($dir) || is_file($dir)) { unlink($dir); return; }
    foreach (scandir($dir) as $name) {
        if ($name !== '.' && $name !== '..') leaseClean($dir.'/'.$name);
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
function leaseFixture(string $dir, string $version): string
{
    mkdir($dir, 0700);
    foreach (['public','vendor','private','private/editor'] as $sub) mkdir($dir.'/'.$sub, 0700, true);
    $files = ['public/index.php'=>'<?php echo '.var_export($version, true).';',
        'vendor/autoload.php'=>'<?php // disposable only',
        'private/editor/editor.js'=>'window.stage2=true;',
        'composer.json'=>'{"require":{}}'];
    $entries=[];
    foreach ($files as $name=>$bytes) {
        file_put_contents($dir.'/'.$name,$bytes);
        $entries[]=['path'=>$name,'bytes'=>strlen($bytes),'sha256'=>hash('sha256',$bytes)];
    }
    $manifest = ['format'=>'ai-site-cms-internal-stage2-v2','stage'=>2,
        'releaseVersion'=>$version,'productionReady'=>false,'documentRoot'=>'public',
        'adminEditorAssets'=>'private/editor','hostingComposerOrNodeRequired'=>false,
        'writeEndpointsAvailable'=>false,'isSigned'=>false,'files'=>$entries];
    $raw=labReleaseJson($manifest);
    file_put_contents($dir.'/private/package-manifest.json',$raw);
    return hash('sha256',$raw);
}
/** @return array{process:resource,pipes:array<int,resource>,version:string} */
function startLeaseWorker(string $root, string $floor): array
{
    $command=[PHP_BINARY,dirname(__DIR__).'/tests/fixtures/generation-lease-worker.php',
        '--hold',$root,$floor];
    $process=proc_open($command,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],
        $pipes,null,null,['bypass_shell'=>true]);
    if (!is_resource($process)) throw new RuntimeException('Failed to start real PHP subprocess');
    stream_set_timeout($pipes[1],10);
    $ready=fgets($pipes[1]);
    $record=is_string($ready) ? json_decode($ready,true) : null;
    if (!is_array($record) || ($record['event'] ?? '')!=='ready') {
        $err=stream_get_contents($pipes[2]);
        foreach ($pipes as $pipe) fclose($pipe);
        proc_terminate($process); proc_close($process);
        throw new RuntimeException('Child could not lease verified generation: '.$err);
    }
    return ['process'=>$process,'pipes'=>$pipes,'version'=>$record['version']];
}
function finishLeaseWorker(array $worker): void
{
    fwrite($worker['pipes'][0],"release\n");
    fflush($worker['pipes'][0]);
    stream_set_timeout($worker['pipes'][1],10);
    $done=fgets($worker['pipes'][1]);
    leaseOk(str_contains((string)$done,'"event":"finished"'),
        'independent child completed same pinned generation');
    foreach ($worker['pipes'] as $pipe) fclose($pipe);
    leaseOk(proc_close($worker['process'])===0,'independent child exit successful');
}
$fixtureRoot=sys_get_temp_dir().'/ai-site-cms-php-lease-fixtures-'.bin2hex(random_bytes(8));
mkdir($fixtureRoot,0700);
$labs=[]; $activeWorkers=[];
try {
    $old='0.2.0-stage2.1'; $new='0.2.0-stage2.2';
    $switcher=Switcher::create();$labs[]=$switcher->root();
    foreach ([$old,$new] as $version) {
        $folder=$fixtureRoot.'/'.$version;
        $hash=leaseFixture($folder,$version);
        $installed=Stager::create();$labs[]=$installed->root();
        leaseOk($installed->stage($folder,$hash)['status']==='installed',
            'immutable lab installation ready for '.$version);
        leaseOk($switcher->register($installed->root(),$hash,$version)['status']==='clean',
            'lab generation registered '.$version);
    }
    leaseOk($switcher->switchTo($old,null,0,$old)['sequence']===1,
        'initial generation activated for real process');
    $w1=startLeaseWorker($switcher->root(),$old);$activeWorkers[]=$w1;
    leaseOk($w1['version']===$old,'first child holds initial generation');
    $w2=startLeaseWorker($switcher->root(),$old);$activeWorkers[]=$w2;
    leaseOk($w2['version']===$old,'second concurrent reader shares the generation');
    leaseReject(static fn()=> $switcher->switchTo($new,$old,1,$old),
        'no pointer switch while independent PHP handlers are active');
    leaseOk($switcher->inspect()['current']===$old
        && $switcher->inspect()['status']==='clean',
        'failed switch did not create a journal or mutate pointer');
    leaseReject(static fn()=> $switcher->register($fixtureRoot,str_repeat('0',64),
        '0.2.0-stage2.3'),'registration also cannot overlap active handlers');
    $w3=startLeaseWorker($switcher->root(),$old);$activeWorkers[]=$w3;
    leaseOk($w3['version']===$old,'late concurrent reader still gets original code');
    finishLeaseWorker($w1);array_shift($activeWorkers);
    leaseReject(static fn()=> $switcher->switchTo($new,$old,1,$old),
        'one reader leaving cannot release lock of other active readers');
    finishLeaseWorker($w2);array_shift($activeWorkers);
    leaseReject(static fn()=> $switcher->switchTo($new,$old,1,$old),
        'last shared holder still prevents activation');
    finishLeaseWorker($w3);array_shift($activeWorkers);

    leaseOk($switcher->switchTo($new,$old,1,$old)['current']===$new,
        'switch succeeds only after all request leases are released');
    $w4=startLeaseWorker($switcher->root(),$old);$activeWorkers[]=$w4;
    leaseOk($w4['version']===$new,'new child selects new code after committed pointer');
    finishLeaseWorker($w4);array_shift($activeWorkers);

    $anchor=$switcher->root().'/request-lease.lock';
    $fp=fopen($anchor,'rb');
    leaseOk(is_resource($fp) && flock($fp,LOCK_EX|LOCK_NB),
        'exclusive OS-level advisory lock can be exercised separately');
    leaseReject(static fn()=> $switcher->withRequestLease($old,static fn($data)=>$data),
        'shared PHP handler refuses an ongoing exclusive lease');
    leaseReject(static fn()=> $switcher->switchTo($old,$new,2,$old),
        'overlapping operator acquisition denied');
    flock($fp,LOCK_UN);fclose($fp);
    leaseOk($switcher->withRequestLease($old,static fn($data)=>$data['version'])===$new,
        'read route resumes only after exclusive lock release');

    leaseReject(static fn()=> $switcher->switchTo($old,$new,2,$old,'after-intent'),
        'journal fault after intent');
    leaseReject(static fn()=> $switcher->withRequestLease($old,static fn($d)=>$d),
        'no request can run on a pending pointer journal');
    leaseOk($switcher->recover('abort',$old)['status']==='clean',
        'manual abort after uncommitted switch');
    leaseReject(static fn()=> $switcher->switchTo($old,$new,2,$old,'after-pointer'),
        'journal fault after pointer');
    leaseReject(static fn()=> $switcher->withRequestLease($old,static fn($d)=>$d),
        'no request during committed but unreceipted pointer');
    leaseOk($switcher->recover('finalize',$old)['current']===$old,
        'manual finalize after already committed pointer');
    leaseOk($switcher->withRequestLease($old,static fn($d)=>$d['version'])===$old,
        'read traffic resumes on fully verified rollback');

    // Changed inode must be detected; never follow a symlink into a real website.
    $saved=file_get_contents($anchor);
    unlink($anchor);
    symlink($fixtureRoot,$anchor);
    leaseReject(static fn()=> $switcher->withRequestLease($old,static fn($d)=>$d),
        'symlink lock replacement is fail-closed');
    leaseReject(static fn()=> $switcher->switchTo($new,$old,3,$old),
        'operator also rejects substituted request lock');
    unlink($anchor);
    file_put_contents($anchor,$saved);
    leaseOk($switcher->withRequestLease($old,static fn($d)=>$d['version'])===$old,
        'safe local token permits controlled test recovery');
    leaseOk($checks>=31,'real subprocess negative coverage performed');
    echo "Stage2 PHP real multi-process shared/exclusive generation leases PASS: $checks assertions; no PHP-FPM/OPcache proof\n";
} finally {
    foreach ($activeWorkers as $w) {
        if (is_resource($w['process'])) proc_terminate($w['process']);
        foreach ($w['pipes'] as $pipe) if (is_resource($pipe)) fclose($pipe);
        if (is_resource($w['process'])) proc_close($w['process']);
    }
    foreach ($labs as $dir) if (dirname($dir)===realpath(sys_get_temp_dir())
        && (str_starts_with(basename($dir),'ai-site-cms-php-switch-lab-')
            ||str_starts_with(basename($dir),'ai-site-cms-php-install-lab-')))
        leaseClean($dir);
    leaseClean($fixtureRoot);
}
