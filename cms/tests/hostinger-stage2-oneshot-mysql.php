<?php
declare(strict_types=1);

// Disposable GitHub Actions MySQL8.4 only; cannot contact Hostinger.
require dirname(__DIR__).'/vendor/autoload.php';
use AiSiteCms\Hosting\HostingerStage2OneShot as Job;
use AiSiteCms\Storage\FoundationSnapshot;

if (getenv('CI') !== 'true' || getenv('GITHUB_ACTIONS') !== 'true'
    || getenv('CMS_ALLOW_DESTRUCTIVE_MYSQL_CI') !== '1'
    || getenv('CMS_TEST_MYSQL_DSN')
        !== 'mysql:host=127.0.0.1;port=3306;dbname=ai_site_cms_ci;charset=utf8mb4'
    || getenv('CMS_TEST_MYSQL_USER') !== 'cms_ci'
    || getenv('CMS_TEST_MYSQL_PASSWORD') !== 'ephemeral_ci_only'
    || getenv('CMS_TEST_MYSQL_ROOT_PASSWORD') !== 'ephemeral_root_ci_only') {
    throw new RuntimeException('Ephemeral isolated Hostinger-operator test ONLY');
}
$source = dirname(__DIR__).'/.build/internal-stage2-package';
if (!is_file($source.'/private/package-manifest.json')) throw new RuntimeException('Build package first');
$tmp = sys_get_temp_dir().'/stage2-hpanel-fixture-'.bin2hex(random_bytes(6));
mkdir($tmp, 0700);
$package = $tmp.'/cms-stage2-offweb-runtime';
$local = $tmp.'/cms-stage2-local';
mkdir($package, 0700);
mkdir($local, 0700);
mkdir($tmp.'/public_html', 0700);
file_put_contents($tmp.'/public_html/index.html', 'INDEPENDENT TEST SITE');
$siteHash=hash_file('sha256',$tmp.'/public_html/index.html');
function packageCopy(string $source, string $target): void {
    foreach (new DirectoryIterator($source) as $item) {
        if ($item->isDot()) continue;
        if ($item->isLink()) throw new RuntimeException('Refuse fixture symlinks');
        $dst=$target.'/'.$item->getFilename();
        if ($item->isDir()) {
            mkdir($dst, 0700);
            packageCopy($item->getPathname(), $dst);
        } else {
            if (!copy($item->getPathname(), $dst)) throw new RuntimeException('Copy failed');
        }
    }
}
packageCopy($source,$package);
$root=new PDO('mysql:host=127.0.0.1;port=3306;charset=utf8mb4','root','ephemeral_root_ci_only');
$name='ai_site_cms_oneshot_ci';
$root->exec('CREATE DATABASE '.$name.' CHARACTER SET utf8mb4');
$root->exec("CREATE USER 'cms_stage2_once_ci'@'%' IDENTIFIED BY 'ephemeral_local_ci_only'");
$root->exec("GRANT ALL PRIVILEGES ON ".$name.".* TO 'cms_stage2_once_ci'@'%'");
$pdo=new PDO('mysql:host=127.0.0.1;port=3306;dbname='.$name.';charset=utf8mb4',
    'cms_stage2_once_ci','ephemeral_local_ci_only');
$task=[
    'format'=>'ai-site-cms-stage2-hostinger-task-v1',
    'target'=>Job::TARGET,
    'site'=>Job::SITE,
    'operation'=>'probe',
    'confirm'=>'READ_ONLY_OR_FOUNDATION_BACKUP_ONCE',
    'db_host'=>'127.0.0.1',
    'db_name'=>$name,
    'db_user'=>'cms_stage2_once_ci',
    'db_password'=>'ephemeral_local_ci_only'
];
$checks=0;
$check=static function (bool $ok,string $why) use (&$checks):void {
    $checks++;if(!$ok)throw new RuntimeException('One-shot CI fail: '.$why);
};
$store=static function (array $value)use($local):void{
    file_put_contents($local.'/once.json',json_encode($value,JSON_THROW_ON_ERROR));
    chmod($local.'/once.json',0600);
};
$reject=static function (callable $action)use($check):void{
    try{$action();}catch(Throwable $e){$check(true,'expected refusal');return;}
    $check(false,'expected refusal');
};
try {
    $reject(fn()=>Job::run($package,$local)); // Missing operator task.
    $store($task);
    chmod($local.'/once.json',0644);
    $reject(fn()=>Job::run($package,$local)); // World-readable credential refused.
    chmod($local.'/once.json',0600);
    $report=Job::run($package,$local);
    $check($report['dedicatedDbGrantsVerified']===true,'strict scoped DB grant');
    $check($report['operation']==='probe' && $report['status']==='observed'
        && $report['schemaState']==='uninitialized','read-only empty DB probe');
    $check((int)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")
        ->fetchColumn()===0,'probe must not mutate schema');
    $reject(fn()=>Job::run($package,$local)); // Atomic one-time lock.
    unlink($local.'/receipt.json');

    $task['operation']='install';
    $store($task);
    $reject(fn()=>Job::run($package,$local)); // Wrong approval string.
    $task['confirm']='INSTALL_EMPTY_STAGE2_TEST_DB_ONCE';
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='installed_empty_foundation'
        && $report['schemaState']==='ready','write install after exact approval');
    $check($pdo->query('SELECT site_id FROM cms_installation')->fetchColumn()===Job::SITE,
        'exact site identity');
    $check((int)$pdo->query('SELECT COUNT(*) FROM cms_schema_migrations')->fetchColumn()===2,
        'journal complete');
    $check(hash_file('sha256',$tmp.'/public_html/index.html')===$siteHash,
        'public visitor unchanged during install');
    $check(!is_file($tmp.'/public_html/receipt.json'),'no public receipt');
    $check(strpos(file_get_contents($local.'/receipt.json'),'ephemeral_local_ci_only')===false,
        'receipt must not disclose credentials');
    unlink($local.'/receipt.json');

    $task['operation']='verify';
    $task['confirm']='READ_ONLY_OR_FOUNDATION_BACKUP_ONCE';
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='verified' && $report['schemaState']==='ready',
        'read-only installed schema verification');
    unlink($local.'/receipt.json');

    $task['operation']='snapshot';
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='foundation_snapshot_saved','foundation snapshot export');
    $snapshot=file_get_contents($local.'/foundation-snapshot.json');
    $check(FoundationSnapshot::verify(trim($snapshot),Job::SITE)['storage_generation']==='0',
        'checksum and site of snapshot');
    $check(!is_file($tmp.'/public_html/foundation-snapshot.json'),
        'foundation snapshot stays offweb');
    unlink($local.'/receipt.json');

    $task['operation']='install';
    $task['confirm']='INSTALL_EMPTY_STAGE2_TEST_DB_ONCE';
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='refused','no overwrite of initialized DB');
    $check((int)$pdo->query('SELECT COUNT(*) FROM cms_schema_migrations')->fetchColumn()===2,
        'failed second install preserved schema');
    unlink($local.'/receipt.json');

    $task['operation']='verify';
    $task['confirm']='READ_ONLY_OR_FOUNDATION_BACKUP_ONCE';
    $task['db_password']='bad-password';
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='refused','bad credential does not retry');
    $check(!str_contains(file_get_contents($local.'/receipt.json'),'bad-password'),
        'bad secret excluded from report');
    unlink($local.'/receipt.json');

    $task['db_password']='ephemeral_local_ci_only';
    $store($task);
    file_put_contents($package.'/unexpected.txt','tamper');
    $reject(fn()=>Job::run($package,$local)); // Verify BEFORE DB.
    $check(!is_file($local.'/receipt.json'),'tamper cannot consume DB authorization');
    unlink($package.'/unexpected.txt');
    $task['target']='other.hostinger.site';
    $store($task);
    $reject(fn()=>Job::run($package,$local));
    $check(!is_file($local.'/receipt.json'),'foreign host config refused');
    $check(hash_file('sha256',$tmp.'/public_html/index.html')===$siteHash,
        'independent public visitor unaffected by all negative cases');

    echo "Stage2 hPanel CLI-only local-config MySQL8.4 install/probe/verify/snapshot PASS: {$checks} checks; no real host\n";
} finally {
    $root->exec('DROP DATABASE IF EXISTS '.$name);
    $root->exec("DROP USER IF EXISTS 'cms_stage2_once_ci'@'%'");
    $recursive=static function(string $dir)use(&$recursive):void{
        foreach(new DirectoryIterator($dir) as $item){
            if($item->isDot())continue;
            $p=$item->getPathname();
            if($item->isDir()&&!$item->isLink())$recursive($p);
            else unlink($p);
        }
        rmdir($dir);
    };
    $recursive($tmp);
}
