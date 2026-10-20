<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/SubmissionHttp.php';
require_once __DIR__ . '/../src/NoJsResult.php';
$n = 0;
function expectHttp(bool $condition, string $why): void {
    global $n; $n++; if (!$condition) throw new RuntimeException($why);
}
$now=2000;
$config=['LAB_PUBLIC_ORIGIN'=>'http://127.0.0.1:8765'];
$server=['REQUEST_METHOD'=>'POST','CONTENT_TYPE'=>'application/x-www-form-urlencoded',
    'HTTP_ORIGIN'=>$config['LAB_PUBLIC_ORIGIN'],'HTTP_HOST'=>'127.0.0.1:8765','REMOTE_ADDR'=>'127.0.0.1'];
$session=[];
$token=FormLab::issueToken($session,$now-5);
$fields=['csrf'=>$token,'company_site'=>'','name'=>'Alice','email'=>'alice@example.test',
    'phone'=>'','phone_region'=>'ZZ','message'=>'At least ten characters in the form message.'];
$raw=http_build_query($fields);
function postHttp(array $server, string $raw, array &$session, array $env, int $now): array {
    return SubmissionHttp::process($server,$raw,$session,$now,$env);
}
$good=postHttp($server,$raw,$session,$config,$now);
expectHttp($good['code']==='CONFIGURATION_REQUIRED' && $good['http']===503,'no fake delivery');
expectHttp($good['submitted']['email']==='alice@example.test','valid decoded form');
expectHttp(array_keys(SubmissionHttp::jsonFields($good))===['code','message','errors'],'JSON output keys closed');
expectHttp(!str_contains(json_encode(SubmissionHttp::jsonFields($good)), $token),'no CSRF exposed');
expectHttp(postHttp($server+['extra'=>'x'],$raw,$session,$config,$now)['code']==='CONFIGURATION_REQUIRED','irrelevant SERVER metadata');
expectHttp(postHttp(array_replace($server,['REQUEST_METHOD'=>'GET']),$raw,$session,$config,$now)['http']===405,'POST only');
expectHttp(postHttp(array_replace($server,['HTTP_ORIGIN'=>'https://evil.test']),$raw,$session,$config,$now)['code']==='ORIGIN_INVALID','origin denied');
expectHttp(postHttp(array_replace($server,['HTTP_HOST'=>'evil.test']),$raw,$session,$config,$now)['code']==='HOST_INVALID','host denied');
expectHttp(postHttp(array_replace($server,['CONTENT_TYPE'=>'application/json']),$raw,$session,$config,$now)['http']===415,'type denied');
expectHttp(postHttp(array_replace($server,['CONTENT_LENGTH'=>'1']),$raw,$session,$config,$now)['http']===415,'partial body denied');
expectHttp(postHttp(array_replace($server,['CONTENT_LENGTH'=>(string)strlen($raw)]),$raw,$session,$config,$now)['code']==='CONFIGURATION_REQUIRED','matching length');
expectHttp(postHttp($server,$raw.'&name=Intruder',$session,$config,$now)['code']==='MALFORMED_FORM','duplicate decoded key denied');
expectHttp(postHttp($server,$raw.'&wizard_complete=1',$session,$config,$now)['code']==='MALFORMED_FORM','forged wizard state denied');
$badRegion=postHttp($server,http_build_query(array_replace($fields,['phone_region'=>'de'])),$session,$config,$now);
expectHttp($badRegion['code']==='VALIDATION_ERROR' && isset($badRegion['errors']['phone']),'lowercase region rejected even with blank phone');
$badRegion=postHttp($server,http_build_query(array_replace($fields,['phone_region'=>'DE@'])),$session,$config,$now);
expectHttp($badRegion['code']==='VALIDATION_ERROR','forged country code rejected');
$badRegion=postHttp($server,http_build_query(array_replace($fields,['phone_region'=>'AA'])),$session,$config,$now);
expectHttp($badRegion['code']==='VALIDATION_ERROR','syntactically ISO-shaped but undeclared region rejected');
$badRegion=postHttp($server,http_build_query(array_replace($fields,['phone_region'=>'XK'])),$session,$config,$now);
expectHttp($badRegion['code']==='VALIDATION_ERROR','out-of-list locale rejected even with blank phone');
expectHttp(postHttp($server,http_build_query(array_replace($fields,['phone_region'=>'PL'])),$session,$config,$now)['code']==='CONFIGURATION_REQUIRED','valid other UI region accepted without phone');
expectHttp(postHttp($server,str_replace('name=Alice','name=%FF',$raw),$session,$config,$now)['code']==='MALFORMED_FORM','invalid encoding');
$invalid=http_build_query(array_replace($fields,['name'=>'<script>x</script>','message'=>'short']));
$out=postHttp($server,$invalid,$session,$config,$now);
expectHttp($out['http']===422 && $out['code']==='VALIDATION_ERROR','full server validation');
$html=NoJsResult::page($out,$out['submitted']);
expectHttp(str_contains($html,'&lt;script&gt;') && !str_contains($html,'<script>'),'escaped HTML retry');
expectHttp(str_contains($html,'name="csrf" value="'.$token.'"'),'safe retry CSRF');
expectHttp(str_contains($html,'id="field-message"') && str_contains($html,'aria-invalid="true"'),'HTML error focus');
// Isolate the honeypot case: the previous scenarios deliberately spent 5 per-session attempts.
$spamSession=[];
$spamToken=FormLab::issueToken($spamSession,$now-5);
$spam=postHttp($server,http_build_query(array_replace($fields,['csrf'=>$spamToken,'company_site'=>'spam'])),$spamSession,$config,$now);
expectHttp($spam['code']==='SPAM_REJECTED','honeypot maintained');
$fastSession=[];$fastToken=FormLab::issueToken($fastSession,$now);
$tooFast=postHttp($server,http_build_query(array_replace($fields,['csrf'=>$fastToken])),$fastSession,$config,$now);
expectHttp($tooFast['code']==='TOO_FAST','time trap maintained');
$badSession=[];
expectHttp(postHttp($server,$raw,$badSession,$config,$now)['code']==='CSRF_INVALID','CSRF required');
$session2=[];$token2=FormLab::issueToken($session2,$now-5);
$phone=http_build_query(array_replace($fields,['csrf'=>$token2,'phone'=>'+1 202 555 0123','phone_region'=>'US']));
expectHttp(postHttp($server,$phone,$session2,$config,$now)['code']==='PHONE_VALIDATOR_REQUIRED','genuine phone required');
$cfg2=array_replace($config,['LAB_FORM_RECIPIENT_EMAIL'=>'to@example.test']);
expectHttp(postHttp($server,$raw,$session,$cfg2,$now)['code']==='ANTI_SPAM_CONFIGURATION_REQUIRED','shared anti-spam required');
expectHttp(NoJsResult::page(['code'=>'MALFORMED_FORM','message'=>'bad','errors'=>[]],[])!=='' ,'HTML result for malformed');
echo "SubmissionHttp PASS: $n assertions (one decision engine, strict POST, HTML/JSON, fail closed)\n";
