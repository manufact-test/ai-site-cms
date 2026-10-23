<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use AiSiteCms\Hosting\LabWebSapiGate as Gate;
use AiSiteCms\Hosting\SharedHostPreflight;
use AiSiteCms\Hosting\Stage2LiteSpeedBoundary as LsapiBoundary;

$count=0;
$check=static function(bool $truth,string $why) use(&$count):void{
    if (!$truth) throw new RuntimeException('Stage2 FPM mapping: '.$why);
    ++$count;
};
$home=sys_get_temp_dir().'/cms-stage2-fpm-map-'.bin2hex(random_bytes(5));
mkdir($home,0700);
mkdir($home.'/public',0700);
mkdir($home.'/src',0700);
mkdir($home.'/vendor',0700);
file_put_contents($home.'/public/index.php',"<?php // synthetic only\n");
$env=['CMS_STAGE2_REQUIRE_FPM_MAPPING'=>'1',
    'CMS_ENV'=>'test','CMS_STAGE2_RUNTIME_GATE'=>'ci-bound',
    'CMS_ALLOW_SQLITE_TEST_ONLY'=>'1'];
$server=['DOCUMENT_ROOT'=>$home.'/public',
    'SCRIPT_FILENAME'=>$home.'/public/index.php',
    'HTTPS'=>'off',
    'HTTP_X_FORWARDED_PROTO'=>'https',
    'HTTP_DOCUMENT_ROOT'=>'/wrong',
    'HTTP_SCRIPT_FILENAME'=>'/wrong',
    'HTTP_CMS_STAGE2_REQUIRE_FPM_MAPPING'=>'1'];
try {
    $check(Gate::allows($home,$server,'fpm-fcgi',$env),
        'actual expected document/script mapping permits dedicated lab FPM');
    foreach (['cli','cli-server','apache2handler','cgi-fcgi','litespeed'] as $sapi){
        $check(!Gate::allows($home,$server,$sapi,$env),
            'no other SAPI can imitate the real requested FPM gate');
    }
    foreach (['CMS_ENV'=>'production','CMS_STAGE2_RUNTIME_GATE'=>'ci-only',
        'CMS_ALLOW_SQLITE_TEST_ONLY'=>'0',
        'CMS_STAGE2_REQUIRE_FPM_MAPPING'=>'','CMS_STAGE2_REQUIRE_FPM_MAPPING'=>'true'] as $key=>$value){
        $bad=$env;$bad[$key]=$value;
        $check(!Gate::allows($home,$server,'fpm-fcgi',$bad),
            'invalid gate environment refused: '.$key);
    }
    foreach (['DOCUMENT_ROOT'=>'/wrong',
        'SCRIPT_FILENAME'=>$home.'/public/other.php',
        'SCRIPT_NAME'=>'/index.php'] as $key=>$value){
        $bad=$server;$bad[$key]=$value;
        if ($key==='SCRIPT_NAME') {
            // SCRIPT_NAME alone is not evidence of filesystem mapping.
            $check(Gate::allows($home,$bad,'fpm-fcgi',$env),
                'untrusted script label cannot override correct mapped executable');
        } else {
            $check(!Gate::allows($home,$bad,'fpm-fcgi',$env),
                'wrong FastCGI filename/root refused: '.$key);
        }
    }
    $bad=$server;$bad['DOCUMENT_ROOT']=$home.'/public/../public';
    $check(!Gate::allows($home,$bad,'fpm-fcgi',$env),
        'noncanonical public root spelling rejected even when inode is the same');
    $bad=$server;unset($bad['DOCUMENT_ROOT']);
    $check(!Gate::allows($home,$bad,'fpm-fcgi',$env),'missing mapped root refused');
    $bad=$server;unset($bad['SCRIPT_FILENAME']);
    $check(!Gate::allows($home,$bad,'fpm-fcgi',$env),'missing script filename refused');
    symlink($home.'/public',$home.'/public-symlink');
    $bad=$server;$bad['DOCUMENT_ROOT']=$home.'/public-symlink';
    $check(!Gate::allows($home,$bad,'fpm-fcgi',$env),'symlink public webroot refused');
    $bad=$server;$bad['SCRIPT_FILENAME']=$home.'/public-symlink/index.php';
    $check(!Gate::allows($home,$bad,'fpm-fcgi',$env),'script filename via alternate path refused');
    $bad=$server;$bad['HTTP_DOCUMENT_ROOT']=$home.'/public';
    $bad['DOCUMENT_ROOT']='/other';
    $check(!Gate::allows($home,$bad,'fpm-fcgi',$env),
        'spoofed HTTP_DOCUMENT_ROOT never counts as actual webserver DOCUMENT_ROOT');
    // A genuinely separate MySQL-backed CI-FPM mode must enforce the SAME
    // actual SCRIPT_FILENAME/DOCUMENT_ROOT gate, never a mere environment flag.
    $mysql=$env;
    $mysql['CMS_STAGE2_RUNTIME_GATE']='mysql-ci-bound';
    unset($mysql['CMS_ALLOW_SQLITE_TEST_ONLY']);
    $mysql['CMS_ALLOW_STAGE2_MYSQL_HTTP_CI']='1';
    $mysql['CI']='true';
    $mysql['GITHUB_ACTIONS']='true';
    $check(Gate::allows($home,$server,'fpm-fcgi',$mysql),
        'explicit disposable MySQL 8.4 FastCGI mapping enforces same real PHP executable');
    foreach (['CI'=>'false','GITHUB_ACTIONS'=>'false','CMS_ENV'=>'production',
        'CMS_ALLOW_STAGE2_MYSQL_HTTP_CI'=>'0',
        'CMS_STAGE2_RUNTIME_GATE'=>'ci-only'] as $key=>$value) {
        $bad=$mysql;$bad[$key]=$value;
        $check(!Gate::allows($home,$server,'fpm-fcgi',$bad),
            'MySQL cannot evade separate CI authorization: '.$key);
        unset($bad[$key]);$check(!Gate::allows($home,$server,'fpm-fcgi',$bad),
            'missing independent MySQL CI guard denied: '.$key);
    }
    foreach (['DOCUMENT_ROOT'=>'/wrong','SCRIPT_FILENAME'=>'/tmp/forged.php'] as $key=>$value) {
        $bad=$server;$bad[$key]=$value;
        $check(!Gate::allows($home,$bad,'fpm-fcgi',$mysql),
            'MySQL mapping must reject wrong real FastCGI filesystem root: '.$key);
    }
    $check(!Gate::allows($home,$server,'cgi-fcgi',$mysql),
        'MySQL test cannot substitute a CLI or ordinary CGI request for real FPM');
    $report=SharedHostPreflight::inspectWebMapping($server,$home.'/public','fpm-fcgi');
    $check(($report['checks']['document_root_maps_only_public']??false)
        && !$report['actual_request_executed']
        && !$report['real_host_compatibility_verified'],
        'synthetic inspector refuses to claim a true target web request');
    // Separate LiteSpeed assessment recognizes the real LSAPI name
    // and checks canonical root and public file tree, but does NOT authorize
    // release signatures, HTTP privileges or host acceptance.
    $lsapi=LsapiBoundary::inspect($home,$server,'litespeed');
    $check($lsapi['result']==='local_lsapi_mapping_candidate'
        &&$lsapi['checks']['public_only_document_root']
        &&$lsapi['checks']['front_controller_exact']
        &&$lsapi['checks']['private_code_outside_public']
        &&!$lsapi['workerIsolationVerified']&&!$lsapi['productionReady']
        &&!$lsapi['stage2Accepted'],
        'LSAPI physical layout is eligible only for future target observation');
    $check(LsapiBoundary::inspect($home,$server,'fpm-fcgi')['result']==='blocked',
        'PHP-FPM cannot masquerade as LiteSpeed LSAPI');
    $bad=$server;$bad['DOCUMENT_ROOT']=$home.'/public/../public';
    $check(LsapiBoundary::inspect($home,$bad,'litespeed')['result']==='blocked',
        'LSAPI alias document root rejected, even when realpath is identical');
    $bad=$server;$bad['DOCUMENT_ROOT']='/wrong';
    $bad['HTTP_DOCUMENT_ROOT']=$home.'/public';
    $check(LsapiBoundary::inspect($home,$bad,'litespeed')['result']==='blocked',
        'client-supplied HTTP document root cannot establish webroot trust');
    file_put_contents($home.'/public/extra.php','<?php // extra entrypoint');
    $check(LsapiBoundary::inspect($home,$server,'litespeed')['result']==='blocked',
        'unexpected public executable invalidates LSAPI boundary');
    unlink($home.'/public/extra.php');
    $check(LsapiBoundary::inspect($home,$server,'litespeed')['result']
        ==='local_lsapi_mapping_candidate',
        'LSAPI boundary recovers after stray executable is absent');
    $check(!Gate::allows($home,$server,'litespeed',$env),
        'dedicated FPM gate cannot be bypassed by recognized LSAPI profile');
    echo "Stage2 opt-in actual FPM mapping gate PHP contract PASS: {$count} checks; CI-only\n";
} finally {
    @unlink($home.'/public-symlink');
    @unlink($home.'/public/index.php');
    @rmdir($home.'/public');
    @rmdir($home.'/src');
    @rmdir($home.'/vendor');
    @rmdir($home);
}
