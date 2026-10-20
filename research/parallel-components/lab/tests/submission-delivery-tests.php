<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/SubmissionHttp.php';
$n=0;
function assertDelivery(bool $pass, string $why):void {global $n;$n++;if(!$pass)throw new RuntimeException($why);}
$tmp=sys_get_temp_dir().'/cms-research-form-'.bin2hex(random_bytes(8));
if (!mkdir($tmp,0700) || !is_dir($tmp))throw new RuntimeException('Temporary private store unavailable');
try {
    $now=2000;
    $cfg=['LAB_PUBLIC_ORIGIN'=>'http://127.0.0.1:8765',
        'LAB_FORM_RECIPIENT_EMAIL'=>'destination@example.test',
        'LAB_ABUSE_DIR'=>$tmp, 'LAB_ABUSE_SECRET'=>'research-only-secret-'.str_repeat('x',48)];
    $server=['REQUEST_METHOD'=>'POST','CONTENT_TYPE'=>'application/x-www-form-urlencoded',
        'HTTP_ORIGIN'=>'http://127.0.0.1:8765','HTTP_HOST'=>'127.0.0.1:8765','REMOTE_ADDR'=>'127.0.0.1'];
    $base=['company_site'=>'','name'=>'Alice','email'=>'alice@example.test','phone'=>'',
        'phone_region'=>'ZZ','message'=>'This is one complete test submission.'];
    $sent=0;
    $yes=static function(string $to,array $fields) use (&$sent):bool {
        $sent++;
        if($to!=='destination@example.test'||$fields['message']!=='This is one complete test submission.')
            throw new LogicException('Wrong canonical fields');
        return true; // Means transport ACCEPTED, not delivered to inbox.
    };
    $s=[];$token=FormLab::issueToken($s,$now-4);
    $request=http_build_query(['csrf'=>$token]+$base);
    $accepted=SubmissionHttp::process($server,$request,$s,$now,$cfg,$yes);
    assertDelivery($accepted['http']===202 && $accepted['code']==='QUEUED_UNCONFIRMED','transport acceptance must remain unconfirmed');
    assertDelivery($sent===1,'transport called once');
    assertDelivery(!isset($s['form_lab_token_hash']),'CSRF consumed before outbound response');
    assertDelivery(!array_key_exists('submitted',SubmissionHttp::jsonFields($accepted)),'no raw fields in JSON');
    $again=SubmissionHttp::process($server,$request,$s,$now,$cfg,$yes);
    assertDelivery($again['code']==='CSRF_INVALID' && $sent===1,'single-use token');
    $s2=[];$token2=FormLab::issueToken($s2,$now-4);
    $duplicate=SubmissionHttp::process($server,http_build_query(['csrf'=>$token2]+$base),$s2,$now,$cfg,$yes);
    assertDelivery($duplicate['code']==='DUPLICATE_REQUEST' && $duplicate['http']===409,'second session receipt fence');
    assertDelivery($sent===1 && !isset($s2['form_lab_token_hash']),'duplicate cannot be transported or retried with token');
    $s3=[];$token3=FormLab::issueToken($s3,$now-4);
    $changed=array_replace($base,['message'=>'A different valid message for uncertain transport.']);
    $throwing=static function():bool {throw new RuntimeException('Secret transport failure details');};
    $uncertain=SubmissionHttp::process($server,http_build_query(['csrf'=>$token3]+$changed),$s3,$now,$cfg,$throwing);
    assertDelivery($uncertain['code']==='DELIVERY_UNCONFIRMED' && $uncertain['http']===502,'exception is uncertain, not accepted/rejected');
    assertDelivery(!str_contains($uncertain['message'],'Secret transport failure'),'exception redacted');
    assertDelivery(!isset($s3['form_lab_token_hash']),'uncertain transport burns token');
    $s4=[];$token4=FormLab::issueToken($s4,$now-4);
    $changed2=array_replace($base,['message'=>'Another distinct message for failed transport.']);
    $no=static fn():bool=>false;
    $failed=SubmissionHttp::process($server,http_build_query(['csrf'=>$token4]+$changed2),$s4,$now,$cfg,$no);
    assertDelivery($failed['code']==='DELIVERY_FAILED' && $failed['http']===502,'false transport not fake 200');
    assertDelivery(!isset($s4['form_lab_token_hash']),'failed transport burns token');
    $s5=[];$token5=FormLab::issueToken($s5,$now-4);
    $blocked=SubmissionHttp::process($server,http_build_query(['csrf'=>$token5]+array_replace($base,['message'=>'Yet another message sent during a burst.'])),$s5,$now,$cfg,$yes);
    assertDelivery($blocked['code']==='RATE_LIMITED' && $blocked['http']===429,'shared IP limit applies across sessions');
    assertDelivery($sent===1,'throttled transport not called');
    $files=array_diff(scandir($tmp),['.','..']);
    assertDelivery(count($files)>=4,'private rate and dedupe files created');
    foreach($files as $file){
        $content=file_get_contents($tmp.DIRECTORY_SEPARATOR.$file);
        assertDelivery(!str_contains($file,'Alice')&&!str_contains((string)$content,'alice@example.test'),'private state never stores form PII');
    }
    echo "Submission delivery gates PASS: $n assertions (real private throttle/ledger, token, transport uncertainty; no mail)\n";
} finally {
    foreach(array_diff(scandir($tmp) ?: [],['.','..']) as $file)unlink($tmp.DIRECTORY_SEPARATOR.$file);
    rmdir($tmp);
}
