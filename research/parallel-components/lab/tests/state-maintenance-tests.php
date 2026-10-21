<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/PrivateStateMaintenance.php';
require_once __DIR__ . '/../src/SharedThrottle.php';
require_once __DIR__ . '/../src/ReceiptLedger.php';
$count=0;
function checkState(bool $condition,string $why): void {
    global $count; $count++; if (!$condition) throw new RuntimeException("Private state #$count: $why");
}
if (($argv[1] ?? '') === '--sweep') {
    $childDir = $argv[2];
    file_put_contents($childDir.'/worker-started','1');
    $done=PrivateStateMaintenance::prune($childDir,__DIR__.'/../public',1700000000,128,32);
    echo $done['code']; exit($done['code']==='PRUNED' ? 0 : 4);
}
$dir = sys_get_temp_dir().'/cms-lab-state-'.bin2hex(random_bytes(10));
mkdir($dir,0700);chmod($dir,0700);
$secret = str_repeat('Z',48);
$fields=['name'=>'Person','email'=>'person@example.test','phone'=>'','message'=>'Private state test message'];
try {
    $root=__DIR__.'/../public';
    $rate=new SharedThrottle($dir,$secret,$root);
    $claims=new ReceiptLedger($dir,$secret,$root);
    $now=1700000000;
    checkState($rate->allow('203.0.113.11',$now-3600,5,3600),'create expired rate fixture');
    checkState($rate->allow('203.0.113.12',$now-3599,5,3600),'create active rate fixture');
    checkState($claims->claim('old@example.test',$fields,$now-3600)==='CLAIMED','old claim fixture');
    checkState($claims->claim('active@example.test',$fields,$now-599)==='CLAIMED','active claim inside default TTL');
    $name = static fn(string $text, string $extension): string =>
        hash_hmac('sha256',$text,$secret).'.'.$extension;
    $expiredRate = $dir.'/'.$name('form-v1|203.0.113.11','rate');
    $activeRate = $dir.'/'.$name('form-v1|203.0.113.12','rate');
    $claimId=static fn(string $recipient): string =>
        hash_hmac('sha256','receipt-v1|'.json_encode([$recipient,$fields],
            JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),$secret).'.claim';
    $expiredClaim=$dir.'/'.$claimId('old@example.test');
    $activeClaim=$dir.'/'.$claimId('active@example.test');
    checkState(is_file($expiredRate)&&is_file($activeRate)&&is_file($expiredClaim)&&is_file($activeClaim),'four hashed fixtures');
    $bad=$dir.'/'.str_repeat('a',64).'.rate';
    file_put_contents($bad,'["poisoned"]');chmod($bad,0600);
    $badClaim=$dir.'/'.str_repeat('b',64).'.claim';
    file_put_contents($badClaim,'{"v":1,"at":"0"}');chmod($badClaim,0600);
    $linked=$dir.'/'.str_repeat('c',64).'.claim';
    symlink($expiredClaim,$linked);
    $unknown=$dir.'/raw-information.txt';
    file_put_contents($unknown,'personal data should be untouched');
    $tooOld=$dir.'/'.str_repeat('d',64).'.rate';
    file_put_contents($tooOld,'');chmod($tooOld,0600);
    $result=PrivateStateMaintenance::prune($dir,$root,$now,1024,128);
    checkState($result['code']==='PRUNED'&&$result['deleted']===2,'only two expired valid entries removed');
    checkState(!file_exists($expiredRate)&&!file_exists($expiredClaim),'old records deleted');
    checkState(is_file($activeRate)&&is_file($activeClaim),'within maximum window retained');
    checkState(is_file($bad)&&is_file($badClaim)&&is_link($linked)&&is_file($tooOld),'corrupt, links and interrupted writes never purged');
    checkState(file_get_contents($unknown)==='personal data should be untouched','unrecognized file not opened/deleted');
    checkState(!$rate->allow('203.0.113.12',$now-3600,5,3600),'clock rollback cannot reset active bucket');
    checkState($claims->claim('active@example.test',$fields,$now)==='DUPLICATE_REQUEST','sweep retains live duplicate protection');
    // Reject hardlinks and never delete an inode shared with a second filename.
    $hardLink=$dir.'/'.str_repeat('e',64).'.claim';
    checkState(link($activeClaim,$hardLink),'hardlink test fixture created');
    checkState($claims->claim('active@example.test',$fields,$now)==='RECEIPT_STORE_UNAVAILABLE','duplicate fence fails closed on unexpected hardlink');
    $hardSweep=PrivateStateMaintenance::prune($dir,$root,$now,1024,128);
    checkState($hardSweep['code']==='PRUNED' && is_file($hardLink) && is_file($activeClaim),'sweep never removes linked record');
    unlink($hardLink);
    checkState($rate->allow('203.0.113.11',$now,5,3600),'truly expired rate can start a fresh bucket');
    checkState($claims->claim('old@example.test',$fields,$now)==='CLAIMED','truly expired claim allows new attempt');
    checkState((fileperms($activeClaim)&0077)===0 && (fileperms($activeRate)&0077)===0,'state never group/world-readable');
    checkState((fileperms($dir.'/'.PrivateStateMaintenance::LOCK_NAME)&0077)===0,'maintenance lock mode is private');
    checkState(PrivateStateMaintenance::prune($dir,$root,-1)['code']==='PRUNE_UNAVAILABLE','negative time denied');
    checkState(PrivateStateMaintenance::prune($dir,$root,$now,1025,128)['code']==='PRUNE_UNAVAILABLE','unbounded scan denied');
    // Count unrelated directory entries against the bounded scan budget too.
    // A maliciously large directory cannot force unbounded iteration.
    $junk=$dir.'/unrelated-audit-item';
    file_put_contents($junk,'ignored without deletion');
    $limited=PrivateStateMaintenance::prune($dir,$root,$now,1,1);
    checkState($limited['code']==='PRUNED' && $limited['examined']===1
        && $limited['deleted']<=1, 'maxScan bounds all directory entries, not just HMAC matches');
    checkState(file_get_contents($junk)==='ignored without deletion',
        'bounded cleanup never reads or deletes unrelated payload');
    checkState(PrivateStateMaintenance::prune($dir,$root,$now,128,129)['code']==='PRUNE_UNAVAILABLE','unbounded deletion denied');
    checkState(PrivateStateMaintenance::prune($root,$root,$now)['code']==='PRUNE_UNAVAILABLE','public tree refused');
    // Interprocess maintenance synchronization: a held shared lease blocks exclusive prune.
    if (!function_exists('proc_open')) throw new RuntimeException('proc_open required');
    $lease=PrivateStateMaintenance::openLocked($dir,PrivateStateMaintenance::LOCK_NAME,LOCK_SH);
    checkState($lease !== null,'shared maintenance lease obtained');
    [$held]=$lease;
    $worker=escapeshellarg(PHP_BINARY).' '.escapeshellarg(__FILE__).' --sweep '.escapeshellarg($dir);
    $proc=proc_open($worker,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
    checkState(is_resource($proc),'sweeper child spawned');
    fclose($pipes[0]);
    // Explicit synchronization handshake by a sentinel before worker takes the lock.
    $sentinel=$dir.'/worker-started';
    $ready=false;
    for($i=0;$i<100;$i++) {
        if (is_file($sentinel)) { $ready=true; break; }
        usleep(10000);
    }
    checkState($ready,'worker reached lock boundary');
    $status=proc_get_status($proc);
    checkState($status['running'],'exclusive prune cannot complete while lease held');
    PrivateStateMaintenance::close($held);
    $output=stream_get_contents($pipes[1]);$error=stream_get_contents($pipes[2]);
    fclose($pipes[1]);fclose($pipes[2]);
    $exit=proc_close($proc);
    checkState($exit===0 && $output==='PRUNED','sweeper resumes after shared lease, no deadlock: '.$error);
    checkState(is_file($bad)&&is_file($badClaim),'corrupt records still retained after concurrent sweep');
    // If the lock path is a symlink, both live operations and maintenance fail closed.
    $lockPath=$dir.'/'.PrivateStateMaintenance::LOCK_NAME;
    unlink($lockPath);symlink($activeClaim,$lockPath);
    checkState(!$rate->allow('203.0.113.13',$now,5,3600),'rate refuses untrusted global lock');
    checkState($claims->claim('new@example.test',$fields,$now)==='RECEIPT_STORE_UNAVAILABLE','claim refuses untrusted global lock');
    checkState(PrivateStateMaintenance::prune($dir,$root,$now)['code']==='PRUNE_UNAVAILABLE','prune refuses untrusted lock');
} finally {
    foreach(array_diff(scandir($dir)?:[],['.','..']) as $file) @unlink($dir.'/'.$file);
    @rmdir($dir);
}
echo "Private state maintenance PASS: $count assertions (bounded prune, corrupted retention, concurrent locks, private paths)\n";
