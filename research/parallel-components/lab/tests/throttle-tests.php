<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/SharedThrottle.php';
$n=0;
function must(bool $ok, string $text): void {global $n;$n++;if(!$ok)throw new RuntimeException($text);}
$secret = str_repeat('S',48);
if (($argv[1] ?? '') === '--worker') {
    $gate = new SharedThrottle($argv[2],$secret,__DIR__.'/../public');
    echo $gate->allow('203.0.113.50',1700000000,4,60) ? '1':'0'; exit;
}
$dir=sys_get_temp_dir().'/cms-lab-rate-'.bin2hex(random_bytes(10));
mkdir($dir,0700,true);chmod($dir,0700);
try {
    $gate = new SharedThrottle($dir,$secret,__DIR__.'/../public');
    must($gate->allow('203.0.113.10',1000,3,60),'first');
    must($gate->allow('203.0.113.10',1000,3,60),'second');
    must($gate->allow('203.0.113.10',1000,3,60),'third');
    must(!$gate->allow('203.0.113.10',1000,3,60),'cross-session fourth rejected');
    $other = new SharedThrottle($dir,$secret,__DIR__.'/../public');
    must(!$other->allow('203.0.113.10',1001,3,60),'new instance sees prior attempts');
    must($other->allow('2001:db8::1',1001,3,60),'IPV6 separate bucket');
    must(!$other->allow('made-up-address',1001),'reject untrusted IP');
    must($other->allow('203.0.113.10',1061,3,60),'old timestamps expire');
    $files=glob($dir.'/*.rate');
    must(count($files)===2,'HMAC key count; no raw IP file paths');
    foreach($files as $file) {must(!str_contains(file_get_contents($file),'203.0.113'),'no IP in data');}
    try {new SharedThrottle($dir,'weak',__DIR__.'/../public'); throw new Exception('weak allowed');}
    catch(RuntimeException $e){must($e->getMessage()==='ANTI_SPAM_CONFIGURATION_REQUIRED','weak key refused');}
    try {new SharedThrottle(__DIR__.'/../public',$secret,__DIR__.'/../public');throw new Exception('web root allowed');}
    catch(RuntimeException $e){must($e->getMessage()==='ANTI_SPAM_CONFIGURATION_REQUIRED','public dir refused');}
    // Real OS process concurrency. A file lock must allow exactly four, not 5+.
    if (!function_exists('proc_open')) throw new RuntimeException('proc_open required for actual concurrency test');
    $commands=[];
    for($i=0;$i<12;$i++) {
        $cmd=escapeshellarg(PHP_BINARY).' '.escapeshellarg(__FILE__).' --worker '.escapeshellarg($dir);
        $descriptors=[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']];
        $proc=proc_open($cmd,$descriptors,$pipes);
        if(!is_resource($proc))throw new RuntimeException('No child process');
        fclose($pipes[0]);$commands[]=[$proc,$pipes];
    }
    $allowed=0;
    foreach($commands as [$proc,$pipes]) {
        $stdout=stream_get_contents($pipes[1]);$stderr=stream_get_contents($pipes[2]);
        fclose($pipes[1]);fclose($pipes[2]);$rc=proc_close($proc);
        must($rc===0 && ($stdout==='0'||$stdout==='1'),'subprocess healthy '.$stderr);
        $allowed += ($stdout==='1');
    }
    must($allowed===4,'12 racing workers, exactly four grants');
    $key=hash_hmac('sha256','form-v1|203.0.113.50',$secret);$target=$dir.'/'.$key.'.rate';
    unlink($target);symlink($dir.'/nonexistent',$target);
    must(!$gate->allow('203.0.113.50',1700000100,4,60),'symlink file refused');
} finally {
    foreach(glob($dir.'/*') ?: [] as $file)unlink($file);
    rmdir($dir);
}
echo "Shared throttle PASS: $n assertions including 12 real concurrent processes\n";
