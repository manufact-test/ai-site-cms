<?php
declare(strict_types=1);

require dirname(__DIR__).'/vendor/autoload.php';
use AiSiteCms\Hosting\Stage2MysqlBoundReadiness;

$checks=0;
function fails(array $env,string $label):void {
    global $checks;
    $result=Stage2MysqlBoundReadiness::inspect('/nonexistent-stage2-root',$env);
    if($result['ready']!==false||$result['ciOnly']!==true
        ||$result['readOnly']!==true||$result['productionReady']!==false){
        throw new RuntimeException('Stage2 MySQL guard unexpectedly allowed: '.$label);
    }
    $checks++;
}
$valid=[
    'CI'=>'true','GITHUB_ACTIONS'=>'true','CMS_ENV'=>'test',
    'CMS_STAGE2_RUNTIME_GATE'=>'mysql-ci-bound',
    'CMS_ALLOW_STAGE2_MYSQL_HTTP_CI'=>'1',
    'CMS_SITE_ID'=>'stage2-packaged-a',
    'CMS_DB_DSN'=>'mysql:host=127.0.0.1;port=3306;dbname=ai_stage2_pkg_a_ci;charset=utf8mb4',
    'CMS_DB_USER'=>'stage2pkg_ro_a_ci',
    'CMS_DB_PASSWORD'=>'disposable_stage2_ro_a_ci',
    'CMS_STAGE2_MYSQL_BINDING_FILE'=>'/nonexistent-mysql-ci-binding'
];
fails($valid,'nonexistent root / binding');
foreach([
    'CI'=>'false','GITHUB_ACTIONS'=>'false','CMS_ENV'=>'production',
    'CMS_STAGE2_RUNTIME_GATE'=>'ci-bound',
    'CMS_ALLOW_STAGE2_MYSQL_HTTP_CI'=>'0','CMS_SITE_ID'=>'unknown-site',
    'CMS_DB_DSN'=>'mysql:host=hostinger.com;dbname=real_client',
    'CMS_DB_USER'=>'root','CMS_DB_PASSWORD'=>'x'
] as $key=>$invalid){
    $candidate=$valid;$candidate[$key]=$invalid;
    fails($candidate,'reject '.$key);
    unset($candidate[$key]);
    fails($candidate,'missing '.$key);
}
foreach([
    'mysql:host=127.0.0.1;port=3307;dbname=ai_stage2_pkg_a_ci;charset=utf8mb4',
    'mysql:host=localhost;port=3306;dbname=ai_stage2_pkg_a_ci;charset=utf8mb4',
    'mysql:host=10.0.0.2;port=3306;dbname=ai_stage2_pkg_a_ci;charset=utf8mb4',
    'mysql:host=127.0.0.1;port=3306;dbname=other_db;charset=utf8mb4',
    'sqlite::memory:'
] as $dsn){$candidate=$valid;$candidate['CMS_DB_DSN']=$dsn;
    fails($candidate,'deny unapproved MySQL address or database');}
foreach([
    'stage2-packaged-b','STAGE2-packaged-a','stage2-packaged-a/../../bad',
    'stage2-packaged-c',''
] as $site){$candidate=$valid;$candidate['CMS_SITE_ID']=$site;
    fails($candidate,'deny wrong deployment identity');}
echo "Stage2 MySQL CI-only HTTP startup: {$checks} fail-closed PHP contracts PASS; no DB/hosting calls\n";
