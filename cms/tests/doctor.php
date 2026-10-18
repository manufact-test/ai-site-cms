<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/Hosting/RuntimeDoctor.php';
use AiSiteCms\Hosting\RuntimeDoctor;

$checks = 0;
function check(bool $ok, string $name): void {
    global $checks;
    $checks++;
    if (!$ok) throw new RuntimeException("Runtime doctor test failed: $name");
}
$ext = ['json'=>true,'pdo'=>true,'pdo_mysql'=>true,'openssl'=>true];
$base = RuntimeDoctor::assess(80100, $ext, null);
check($base['php_runtime_baseline']==='pass','Minimum PHP 8.1 compatible');
check($base['document_root']==='not_checked','Unknown document root never passes by assumption');
check($base['real_host_compatibility_verified']===false,'Never claims real host tested');
check($base['safe_to_deploy']===false,'Never claims deploy safe');
foreach (['filesystem_modified','database_connection_attempted','network_attempted'] as $claim) {
    check($base[$claim]===false, "No side effects: $claim");
}
check(RuntimeDoctor::assess(80099,$ext,true)['php_runtime_baseline']==='fail','Reject PHP 8.0');
check(RuntimeDoctor::assess(80300,$ext,true)['php_runtime_baseline']==='pass','Accept later PHP with extensions');
foreach (array_keys($ext) as $missing) {
    $set=$ext;$set[$missing]=false;
    $result=RuntimeDoctor::assess(80300,$set,true);
    check($result['php_runtime_baseline']==='fail' && in_array('ext_'.$missing,$result['missing'],true),
        "Reject missing $missing");
}
check(RuntimeDoctor::assess(80300,[] ,true)['php_runtime_baseline']==='fail','Reject absent extension metadata');
check(RuntimeDoctor::assess(80300,$ext,false)['document_root']==='invalid','Wrong docroot invalid');
check(RuntimeDoctor::assess(80300,$ext,true)['document_root']==='verified_public_only','Exact docroot accepted');
check(RuntimeDoctor::checkExplicitDocumentRoot(null,__DIR__.'/../public')===null,'No implicit document root');
check(RuntimeDoctor::checkExplicitDocumentRoot(__DIR__,__DIR__.'/../public')===false,'Reject application tests directory as docroot');
check(RuntimeDoctor::checkExplicitDocumentRoot(__DIR__.'/../public',__DIR__.'/../public')===true,'Verify public root');
check(RuntimeDoctor::checkExplicitDocumentRoot(__DIR__.'/../does-not-exist',__DIR__.'/../public')===false,'Reject missing document root');

$cmd=escapeshellarg(PHP_BINARY).' '.escapeshellarg(__DIR__.'/../bin/doctor.php');
exec($cmd.' --check 2>&1',$out,$exit);
check($exit===0 && str_contains(implode("\n",$out),'ai-site-cms-stage2-readonly-doctor-v1'),
    'CLI report is standalone and JSON-safe for current CI runtime');
$raw=implode("\n",$out);
check(!str_contains($raw,'CMS_DB_PASSWORD') && !str_contains($raw,realpath(__DIR__)),
    'Report does not reveal env secrets or source paths');
exec($cmd.' --check --document-root='.escapeshellarg(__DIR__).' 2>&1',$bad,$badExit);
check($badExit===1 && str_contains(implode("\n",$bad),'"invalid"'),'CLI rejects incorrect document root');
exec($cmd.' 2>&1',$usage,$usageExit);
check($usageExit===2,'Doctor refuses implicit execution');
echo "Stage2 read-only hosting doctor PASS: $checks assertions; no live host contact\n";
