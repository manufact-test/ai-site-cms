<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/ReceiptLedger.php';
require_once __DIR__ . '/../src/FormLab.php';
$n=0;
function confirm(bool $condition, string $case): void {global $n;$n++;if (!$condition)throw new RuntimeException("Receipt #$n: $case");}
$secret=str_repeat('R',48);
$fields=['name'=>'Anna', 'email'=>'a@example.test', 'phone'=>'', 'message'=>'Long enough laboratory content'];
if (($argv[1] ?? null)==='--worker') {
    $gate=new ReceiptLedger($argv[2],$secret,__DIR__.'/../public');
    echo $gate->claim('team@example.test',$fields,1700001000) === 'CLAIMED' ? '1':'0';exit;
}
$dir=sys_get_temp_dir().'/cms-receipt-'.bin2hex(random_bytes(10));
mkdir($dir,0700);chmod($dir,0700);
try {
    $gate=new ReceiptLedger($dir,$secret,__DIR__.'/../public');
    confirm($gate->claim('team@example.test',$fields,1000)==='CLAIMED','initial claim');
    confirm($gate->claim('team@example.test',$fields,1000)==='DUPLICATE_REQUEST','duplicate denied');
    confirm((new ReceiptLedger($dir,$secret,__DIR__.'/../public'))->claim('team@example.test',$fields,1001)==='DUPLICATE_REQUEST','another instance denied');
    confirm($gate->claim('sales@example.test',$fields,1001)==='CLAIMED','new recipient separate');
    $different=$fields;$different['message'].=' extra';
    confirm($gate->claim('team@example.test',$different,1001)==='CLAIMED','different payload separate');
    confirm($gate->claim('team@example.test',$fields,1599)==='DUPLICATE_REQUEST','within ttl refused');
    confirm($gate->claim('team@example.test',$fields,1600)==='CLAIMED','expiration boundary');
    confirm($gate->claim('team@example.test',$fields,1500)==='RECEIPT_STORE_UNAVAILABLE','reversed clock fail closed');
    confirm($gate->claim('invalid target',$fields,2000)==='RECEIPT_STORE_UNAVAILABLE','invalid target');
    confirm($gate->claim('team@example.test', ['wrong'=>'value'],2000)==='RECEIPT_STORE_UNAVAILABLE','closed fields');
    confirm($gate->claim('team@example.test',$fields,2000,1)==='RECEIPT_STORE_UNAVAILABLE','bad ttl');
    confirm($gate->claim('team@example.test',$fields,-1)==='RECEIPT_STORE_UNAVAILABLE','bad timestamp');
    $invalidUtf8=$fields;
    $invalidUtf8['message']="Bad\xff invalid UTF8";
    confirm($gate->claim('team@example.test',$invalidUtf8,2000)==='RECEIPT_STORE_UNAVAILABLE',
        'invalid UTF8 data never throws or writes a claim');
    $oversize=$fields;
    $oversize['message']=str_repeat('x',8193);
    confirm($gate->claim('team@example.test',$oversize,2000)==='RECEIPT_STORE_UNAVAILABLE',
        'oversized direct-call value rejected before HMAC');
    $before=glob($dir.'/*.claim');confirm(count($before)===3,'only keyed hash files');
    foreach ($before as $path) {
        confirm((bool)preg_match('/^[a-f0-9]{64}\.claim$/D',basename($path)), 'filename hmac');
        confirm(!str_contains(file_get_contents($path),'a@example.test'),'no pii stored');
    }
    try {new ReceiptLedger($dir,'short',__DIR__.'/../public'); throw new LogicException('weak secret accepted');}
    catch (RuntimeException $e) {confirm($e->getMessage()==='RECEIPT_STORE_CONFIGURATION_REQUIRED','weak secret refused');}
    try {new ReceiptLedger(__DIR__.'/../public',$secret,__DIR__.'/../public');throw new LogicException('public storage accepted');}
    catch (RuntimeException $e) {confirm($e->getMessage()==='RECEIPT_STORE_CONFIGURATION_REQUIRED','public storage refused');}
    $key=hash_hmac('sha256','receipt-v1|' . json_encode(['team@example.test',$fields],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),$secret);
    $path=$dir.'/'.$key.'.claim';
    file_put_contents($path, '{broken-json');
    confirm($gate->claim('team@example.test',$fields,2600)==='RECEIPT_STORE_UNAVAILABLE','corruption never permits replay');
    file_put_contents($path,'');
    confirm($gate->claim('team@example.test',$fields,2600)==='RECEIPT_STORE_UNAVAILABLE','zero-length preexisting interrupted claim cannot resend');
    file_put_contents($path,'{"v":1,"at":-1}');
    confirm($gate->claim('team@example.test',$fields,2600)==='RECEIPT_STORE_UNAVAILABLE','negative saved timestamp denied');
    unlink($path);symlink('/tmp/not-a-real-lab-secret',$path);
    confirm($gate->claim('team@example.test',$fields,2600)==='RECEIPT_STORE_UNAVAILABLE','symlink never followed');
    unlink($path);
    $session=[];$token=FormLab::issueToken($session,4000);
    $post=$fields+['company_site'=>'','csrf'=>$token];$sent=0;
    $deliver=static function()use(&$sent):bool {$sent++;return false;};
    $claim=static fn(string $recipient,array $payload) => $gate->claim($recipient,$payload,4000);
    $result=FormLab::submit($post,$session,4005,'team@example.test',$deliver,null,$claim);
    confirm($result['code']==='DELIVERY_FAILED' && $sent===1,'configured first outbound transport attempted');
    $session=[];$post['csrf']=FormLab::issueToken($session,4000);
    $result=FormLab::submit($post,$session,4005,'team@example.test',$deliver,null,$claim);
    confirm($result['code']==='DUPLICATE_REQUEST' && $result['http']===409 && $sent===1,'new csrf cannot duplicate request');
    confirm(!isset($session['form_lab_token_hash']),'duplicate consumes current csrf');
    $session=[];$post['csrf']=FormLab::issueToken($session,4000);
    $result=FormLab::submit($post,$session,4005,'team@example.test',$deliver,null,static fn()=> 'RECEIPT_STORE_UNAVAILABLE');
    confirm($result['code']==='RECEIPT_STORE_UNAVAILABLE' && $sent===1,'storage fault never sends');
    confirm(isset($session['form_lab_token_hash']),'storage unavailable does not consume token');
    $session=[];$post['csrf']=FormLab::issueToken($session,4000);
    $result=FormLab::submit($post,$session,4005,'team@example.test',$deliver,null,static function() {throw new RuntimeException('private');});
    confirm($result['code']==='RECEIPT_STORE_UNAVAILABLE' && $sent===1,'claim exception redacted');
    if (!function_exists('proc_open'))throw new RuntimeException('Concurrency requires proc_open');
    $children=[];
    for($i=0;$i<12;$i++) {
        $cmd=escapeshellarg(PHP_BINARY).' '.escapeshellarg(__FILE__).' --worker '.escapeshellarg($dir);
        $proc=proc_open($cmd,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
        if(!is_resource($proc))throw new RuntimeException('Could not create worker');
        fclose($pipes[0]);$children[]=[$proc,$pipes];
    }
    $accepted=0;
    foreach($children as [$proc,$pipes]) {
        $out=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);
        fclose($pipes[1]);fclose($pipes[2]);$rc=proc_close($proc);
        confirm($rc===0 && ($out==='0'||$out==='1'),'healthy worker '.$err);
        $accepted += $out==='1' ? 1 : 0;
    }
    confirm($accepted===1,'12 process race yields precisely one attempt');
} finally {foreach(array_diff(scandir($dir)?:[],['.','..']) as $file)unlink($dir.'/'.$file);rmdir($dir);}
echo "ReceiptLedger PASS: $n assertions including 12 concurrent workers\n";
