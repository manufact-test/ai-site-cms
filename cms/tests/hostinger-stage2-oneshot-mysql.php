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
    'package_manifest_sha256'=>hash_file('sha256',$package.'/private/package-manifest.json'),
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
$runCron=static function(string $script='hostinger-stage2-once.php')use($package):array{
    $pipes=[];
    $process=proc_open([PHP_BINARY,$package.'/bin/'.$script],
        [['pipe','r'],['pipe','w'],['pipe','w']],$pipes);
    if (!is_resource($process))throw new RuntimeException('CLI process failed to start');
    fclose($pipes[0]);
    $out=stream_get_contents($pipes[1]);fclose($pipes[1]);
    $err=stream_get_contents($pipes[2]);fclose($pipes[2]);
    return [proc_close($process),$out,$err];
};
try {
    [$preflightCode,$preflightOut,$preflightErr]=$runCron('hostinger-stage2-preflight.php');
    $preflight=json_decode($preflightOut,true,8,JSON_THROW_ON_ERROR);
    $check($preflightCode===0 && $preflightErr==='' && $preflight['pdoMysqlAvailable']
        && $preflight['privateLocalState']==='private_directory_ready'
        && $preflight['unsignedInventoryFilesVerified']>=470,
        'credential-free packaged CLI preflight and full unsigned inventory');
    $check($preflight['packageManifestSha256']===$task['package_manifest_sha256']
        && $preflight['credentialsRead']===false
        && $preflight['databaseConnectionAttempted']===false
        && $preflight['stage2Accepted']===false,
        'CLI preflight reports pin without password or MySQL connection');
    $check(!is_file($local.'/receipt.json') && !is_file($local.'/once.json'),
        'credential-free preflight is strictly read-only');
    $reject(fn()=>Job::run($package,$local)); // Missing operator task.
    $store($task);
    chmod($local.'/once.json',0644);
    $reject(fn()=>Job::run($package,$local)); // World-readable credential refused.
    chmod($local.'/once.json',0600);
    $wrongPinTask=$task;
    $wrongPinTask['package_manifest_sha256']=str_repeat('a',64);
    $store($wrongPinTask);
    $reject(fn()=>Job::run($package,$local));
    [$badPinCode,$badPinOut,$badPinErr]=$runCron();
    $check($badPinCode===3 && $badPinOut==='' &&
        str_contains($badPinErr,'STAGE2_PACKAGE_REFUSED'),
        'wrong out-of-band manifest pin blocked before Composer and MySQL');
    $check(!file_exists($local.'/receipt.json') && is_file($local.'/once.json'),
        'bad pin cannot consume a database authorization');
    $store($task);
    $report=Job::run($package,$local);
    $check(!file_exists($local.'/once.json'),
        'successful cron attempt destroys secret-bearing task file');
    $check($report['packageManifestSha256']===hash_file('sha256',
        $package.'/private/package-manifest.json')
        && preg_match('/\\A\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\dZ\\z/D',
            $report['startedAtUtc']) === 1
        && preg_match('/\\A\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\dZ\\z/D',
            $report['finishedAtUtc']) === 1,
        'nonsecret package hash and UTC receipt timestamps');
    $check($report['dedicatedDbGrantsVerified']===true,'strict scoped DB grant');
    $check($report['operation']==='probe' && $report['status']==='observed'
        && $report['schemaState']==='uninitialized','read-only empty DB probe');
    $check((int)$pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")
        ->fetchColumn()===0,'probe must not mutate schema');
    $reject(fn()=>Job::run($package,$local)); // Atomic one-time lock.
    unlink($local.'/receipt.json');

    // A correct DB password is insufficient if its user also owns other schemas.
    $root->exec("GRANT SELECT ON ai_site_cms_ci.* TO 'cms_stage2_once_ci'@'%'");
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='refused'
        && $report['dedicatedDbGrantsVerified']===false
        && $report['failureCategory']==='database_scope_refused',
        'cross-database grants refused before DDL');
    $check(!file_exists($local.'/once.json'),
        'rejected DB privilege scope also consumes secret-bearing task');
    unlink($local.'/receipt.json');
    $root->exec("REVOKE SELECT ON ai_site_cms_ci.* FROM 'cms_stage2_once_ci'@'%'");

    // Exercise the actual packaged PHP cron entrypoint as a separate process.
    // No credentials on argv, in process environment, or printed logs.
    $store($task);
    [$cronExit,$cronOut,$cronErr]=$runCron();
    $check($cronExit===0 && str_contains($cronOut,'STAGE2_ONCE_RECORDED')
        && $cronErr==='','real packaged Cron entrypoint probes dedicated MySQL');
    $check(!is_file($local.'/once.json') && is_file($local.'/receipt.json'),
        'Cron process consumes local task and keeps nonsecret receipt');
    $check(!str_contains($cronOut,'ephemeral_local_ci_only')
        && !str_contains($cronErr,'ephemeral_local_ci_only'),
        'Cron output never prints database secret');
    unlink($local.'/receipt.json');

    $task['operation']='install';
    $store($task);
    $reject(fn()=>Job::run($package,$local)); // Wrong approval string.
    $task['confirm']='INSTALL_EMPTY_STAGE2_TEST_DB_ONCE';
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='installed_empty_foundation'
        && $report['schemaState']==='ready','write install after exact approval');
    $check(!file_exists($local.'/once.json'),
        'write install consumes its explicit one-shot authorization');
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
    $check((lstat($local.'/foundation-snapshot.json')['mode'] & 0077)===0,
        'snapshot private permissions 0600');
    $snapshot=file_get_contents($local.'/foundation-snapshot.json');
    $check(FoundationSnapshot::verify(trim($snapshot),Job::SITE)['storage_generation']==='0',
        'checksum and site of snapshot');
    $check(!is_file($tmp.'/public_html/foundation-snapshot.json'),
        'foundation snapshot stays offweb');
    unlink($local.'/receipt.json');

    $task['operation']='snapshot-verify';
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='foundation_snapshot_verified'
        && $report['failureCategory']==='none',
        'read-only comparison of saved private snapshot to live MySQL');
    unlink($local.'/receipt.json');

    // Corrupt snapshot must refuse WITHOUT attempting to restore over live data.
    $originalSnapshot=file_get_contents($local.'/foundation-snapshot.json');
    file_put_contents($local.'/foundation-snapshot.json', '{"forged":true}');
    chmod($local.'/foundation-snapshot.json',0600);
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='refused'
        && $report['failureCategory']==='snapshot_refused',
        'tampered saved snapshot rejected read-only');
    $check((int)$pdo->query('SELECT COUNT(*) FROM cms_schema_migrations')->fetchColumn()===2,
        'snapshot verification failure cannot touch source schema');
    unlink($local.'/receipt.json');
    file_put_contents($local.'/foundation-snapshot.json',$originalSnapshot);
    chmod($local.'/foundation-snapshot.json',0600);

    // Simulate live DB generation drift: verify must never "recover" it by
    // mutating a real host's schema or counter without operator permission.
    $pdo->exec('UPDATE cms_installation SET storage_generation=6789');
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='refused'
        && $report['failureCategory']==='snapshot_refused',
        'saved snapshot refuses mismatched live MySQL generation');
    $check((string)$pdo->query('SELECT storage_generation FROM cms_installation')
        ->fetchColumn()==='6789',
        'verification does NOT silently restore or rewrite target MySQL');
    unlink($local.'/receipt.json');
    // Recovery of disposable TEST metadata is deliberate and independent
    // of the read-only Stage2 Hostinger operator.
    $pdo->exec('UPDATE cms_installation SET storage_generation=0');
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='foundation_snapshot_verified',
        'manual CI fixture recovery verified against original snapshot');
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
    $check($report['status']==='refused'
        && $report['failureCategory']==='database_connection_refused',
        'bad credential does not retry');
    $check(!str_contains(file_get_contents($local.'/receipt.json'),'bad-password'),
        'bad secret excluded from report');
    unlink($local.'/receipt.json');

    $task['db_password']='ephemeral_local_ci_only';
    $store($task);
    file_put_contents($package.'/unexpected.txt','tamper');
    $reject(fn()=>Job::run($package,$local)); // Verify BEFORE DB.
    [$tamperedExit,$tamperedOut,$tamperedErr]=$runCron();
    $check($tamperedExit===3 && $tamperedOut===''
        && str_contains($tamperedErr,'STAGE2_PACKAGE_REFUSED'),
        'packaged Cron bootstrap detects tampering BEFORE Composer autoload');
    $check(is_file($local.'/once.json'),
        'package tamper cannot consume credential task');
    $check(!is_file($local.'/receipt.json'),'tamper cannot consume DB authorization');
    unlink($package.'/unexpected.txt');

    // A self-consistent but republished/rewritten UNSIGNED manifest still
    // passes the internal inventory. The independently chosen pin must refuse.
    $manifestFile=$package.'/private/package-manifest.json';
    $originalManifest=file_get_contents($manifestFile);
    file_put_contents($manifestFile,$originalManifest."\n");
    $check(\AiSiteCms\Hosting\PackageArtifactVerifier::verify($package)
        ['filesVerified']>=470,
        'unsigned self-consistent manifest rewrite still hashes all files');
    $store($task); // Original, independently pinned CI package fingerprint.
    [$modifiedCode,$modifiedOut,$modifiedErr]=$runCron();
    $check($modifiedCode===3 && $modifiedOut===''
        && str_contains($modifiedErr,'STAGE2_PACKAGE_REFUSED')
        && is_file($local.'/once.json') && !is_file($local.'/receipt.json'),
        'out-of-band pin blocks republished unsigned manifest before vendor code');
    file_put_contents($manifestFile,$originalManifest);

    // Never LOAD an unverified PHP verifier: a harmless marker side effect
    // stands in for malicious code, and must not run in the CLI bootstrap.
    $verifierFile=$package.'/src/Hosting/PackageArtifactVerifier.php';
    $originalVerifier=file_get_contents($verifierFile);
    $marker=$tmp.'/verifier-should-never-run.txt';
    file_put_contents($verifierFile,$originalVerifier."\nfile_put_contents("
        .var_export($marker,true).", 'UNTRUSTED_EXECUTION');\n");
    $store($task);
    [$verifierExit,$verifierOut,$verifierErr]=$runCron();
    $check($verifierExit===3 && $verifierOut===''
        && str_contains($verifierErr,'STAGE2_PACKAGE_REFUSED'),
        'tampered package verifier itself is rejected before PHP include');
    $check(!is_file($marker) && is_file($local.'/once.json')
        && !is_file($local.'/receipt.json'),
        'corrupted verifier side effect never ran and DB task remains unconsumed');
    file_put_contents($verifierFile,$originalVerifier);

    $task['target']='other.hostinger.site';
    $store($task);
    $reject(fn()=>Job::run($package,$local));
    $check(!is_file($local.'/receipt.json'),'foreign host config refused');
    $check(hash_file('sha256',$tmp.'/public_html/index.html')===$siteHash,
        'independent public visitor unaffected by all negative cases');

    echo "Stage2 hPanel CLI-only MySQL8.4 probe/install/verify/snapshot/compare and secret disposal PASS: {$checks} checks; no real host\n";
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
