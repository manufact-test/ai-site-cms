<?php
declare(strict_types=1);

// Disposable GitHub Actions MySQL8.4 only; cannot contact Hostinger.
require dirname(__DIR__).'/vendor/autoload.php';
use AiSiteCms\Hosting\HostingerStage2OneShot as Job;
use AiSiteCms\Hosting\Stage2MySqlReadOnly as Guard;
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
// Disposable synthetic owner keys only. Never exported or trusted for real sites.
if (!extension_loaded('sodium'))throw new RuntimeException('CI requires native Sodium');
$ownerKeys=sodium_crypto_sign_keypair();
$ownerSecret=sodium_crypto_sign_secretkey($ownerKeys);
$der=hex2bin('302a300506032b6570032100').sodium_crypto_sign_publickey($ownerKeys);
$pem="-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($der),64,"\n").
    "-----END PUBLIC KEY-----\n";
$writePrivate=static function(string $n,string $v)use($local):void{
    file_put_contents($local.'/'.$n,$v);chmod($local.'/'.$n,0600);
};
$trust=['format'=>'ai-site-cms-stage2-owner-install-trust-v1',
    'target'=>Job::TARGET,'site'=>Job::SITE,'trustedOwnerSpkiSha256'=>hash('sha256',$der)];
$writePrivate('owner-install-trust.json',json_encode($trust,JSON_THROW_ON_ERROR));
$writePrivate('owner-install-public.pem',$pem);
$signInstall=static function(array $v,int $before=-60,int $after=600)
    use($ownerSecret,$writePrivate):void {
    $p=['format'=>'ai-site-cms-stage2-owner-write-payload-v1',
        'target'=>Job::TARGET,'site'=>Job::SITE,'operation'=>'install',
        'packageManifestSha256'=>$v['package_manifest_sha256'],
        'taskSha256'=>hash('sha256',json_encode($v,JSON_THROW_ON_ERROR)),
        'notBeforeUtc'=>gmdate('Y-m-d\TH:i:s\Z',time()+$before),
        'expiresAtUtc'=>gmdate('Y-m-d\TH:i:s\Z',time()+$after),
        'productionReady'=>false,'stage2Accepted'=>false];
    $sig=base64_encode(sodium_crypto_sign_detached(
        "AI-SITE-CMS-STAGE2-OWNER-WRITE-INSTALL-V1\0".
        json_encode($p,JSON_THROW_ON_ERROR),$ownerSecret));
    $writePrivate('owner-install-consent.json',json_encode([
        'format'=>'ai-site-cms-stage2-owner-write-consent-v1',
        'payload'=>$p,'signature'=>$sig],JSON_THROW_ON_ERROR));
};
$store=static function (array $value)use($local,$signInstall):void{
    file_put_contents($local.'/once.json',json_encode($value,JSON_THROW_ON_ERROR));
    chmod($local.'/once.json',0600);
    if (($value['operation']??null)==='install'
        &&($value['confirm']??null)==='INSTALL_EMPTY_STAGE2_TEST_DB_ONCE')$signInstall($value);
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
    // Same actual protected boundary used by the packaged hPanel Cron:
    // MySQL must reject real DDL inside an explicitly READ ONLY transaction,
    // regardless of the dedicated user's otherwise sufficient DDL privileges.
    $guardPdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname='.$name.';charset=utf8mb4',
        'cms_stage2_once_ci','ephemeral_local_ci_only',[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES=>false
        ]);
    $reject(fn()=>Guard::finish($guardPdo)); // Cannot pretend to close a missing transaction.
    Guard::begin($guardPdo);
    $check($guardPdo->inTransaction()
        && $guardPdo->query('SELECT DATABASE()')->fetchColumn()===$name,
        'actual DB connection reads normally in explicitly read-only transaction');
    $reject(fn()=>Guard::begin($guardPdo)); // Nested or reused transaction forbidden.
    $ddlRejected=false;
    try {
        $guardPdo->exec('CREATE TABLE stage2_guard_must_not_exist (id INT)');
    } catch (PDOException $ignored) {
        $ddlRejected=true;
    }
    $check($ddlRejected,'real MySQL server rejects CREATE TABLE under read-only session');
    // MySQL implicitly commits BEFORE a DDL statement, even when it then
    // refuses CREATE TABLE. PDO can still report a stale transaction flag.
    // The guard must reject that lost boundary, not claim a completed probe.
    $reject(fn()=>Guard::finish($guardPdo));
    $check((int)$guardPdo->query('SELECT @@SESSION.transaction_read_only')
        ->fetchColumn()===1,'implicit DDL commit did not relax session-level SQL protection');
    unset($guardPdo);
    $guardPdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname='.$name.';charset=utf8mb4',
        'cms_stage2_once_ci','ephemeral_local_ci_only',[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES=>false
        ]);
    Guard::begin($guardPdo);
    Guard::finish($guardPdo);
    $check(!$guardPdo->inTransaction()
        && (int)$guardPdo->query("SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema=DATABASE() AND table_name='stage2_guard_must_not_exist'")
            ->fetchColumn()===0,'clean read-only connection rolls back and DDL canary is absent');
    $reject(fn()=>Guard::finish($guardPdo)); // No false close success.
    $check(hash_file('sha256',$tmp.'/public_html/index.html')===$siteHash,
        'read-only transaction exercise cannot alter independent visitor');

    // The credential-free preflight must NEVER treat a local self-declared
    // owner key fingerprint as independent approval. Report only safe state.
    $anchorEnv='CMS_STAGE2_OWNER_INSTALL_TRUSTED_SPKI_SHA256';
    putenv($anchorEnv);
    [$preflightCode,$preflightOut,$preflightErr]=$runCron('hostinger-stage2-preflight.php');
    $preflight=json_decode($preflightOut,true,8,JSON_THROW_ON_ERROR);
    $check($preflightCode===0 && $preflightErr==='' && $preflight['pdoMysqlAvailable']
        && $preflight['privateLocalState']==='private_directory_ready'
        && $preflight['unsignedInventoryFilesVerified']>=470,
        'credential-free packaged CLI preflight and full unsigned inventory');
    $check($preflight['packageManifestSha256']===$task['package_manifest_sha256']
        && $preflight['packagePhpLoaded']===false
        && $preflight['receiptState']==='absent'
        && $preflight['taskState']==='absent'
        && $preflight['oneShotAvailable']===false
        && $preflight['credentialsRead']===false
        && $preflight['databaseConnectionAttempted']===false
        && $preflight['stage2Accepted']===false,
        'CLI preflight reports pin without password or MySQL connection');
    $check(!is_file($local.'/receipt.json') && !is_file($local.'/once.json'),
        'credential-free preflight is strictly read-only');
    $check($preflight['ownerWriteExternalTrustPinState']==='absent'
        && $preflight['ownerWriteApprovalVerified']===false,
        'private self-declared trust JSON is never counted as external owner approval');
    putenv($anchorEnv.'=NOT_HEX_PIN');
    [$badAnchorCode,$badAnchorText,$badAnchorErr]=$runCron('hostinger-stage2-preflight.php');
    $badAnchorReport=json_decode($badAnchorText,true,8,JSON_THROW_ON_ERROR);
    $check($badAnchorCode===0 && $badAnchorErr===''
        && $badAnchorReport['ownerWriteExternalTrustPinState']==='malformed'
        && $badAnchorReport['ownerWriteApprovalVerified']===false,
        'preflight flags malformed owner pin without revealing its contents');
    putenv($anchorEnv.'='.$trust['trustedOwnerSpkiSha256']);
    [$pinCode,$pinText,$pinErr]=$runCron('hostinger-stage2-preflight.php');
    $pinReport=json_decode($pinText,true,8,JSON_THROW_ON_ERROR);
    $check($pinCode===0 && $pinErr===''
        && $pinReport['ownerWriteExternalTrustPinState']==='configured_identity_unverified'
        && $pinReport['ownerWriteApprovalVerified']===false
        && !str_contains($pinText,$trust['trustedOwnerSpkiSha256']),
        'preflight reports external pin presence, never owner identity or pin bytes');
    putenv($anchorEnv);
    $reject(fn()=>Job::run($package,$local)); // Missing operator task.
    chmod($local,0755);
    [$looseCode,$looseText,$looseErr]=$runCron('hostinger-stage2-preflight.php');
    $loose=json_decode($looseText,true,8,JSON_THROW_ON_ERROR);
    $check($looseCode===0 && $looseErr==='' && !$loose['oneShotAvailable']
        && $loose['privateLocalState']==='private_directory_refused',
        'preflight refuses unsafe private directory without touching database');
    chmod($local,0700);
    $store($task);
    [$readyCode,$readyText,$readyErr]=$runCron('hostinger-stage2-preflight.php');
    $readyReport=json_decode($readyText,true,8,JSON_THROW_ON_ERROR);
    // A CI-only 8.3.6 runtime is useful for isolated fixture tests, but
    // must NEVER be advertised as eligible for a new target-host operation.
    $floor=['8.2'=>'8.2.35','8.3'=>'8.3.36','8.4'=>'8.4.27','8.5'=>'8.5.12'];
    $branch=PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;
    $minimum=$floor[$branch]??null;
    $expectedPatched=$minimum!==null&&version_compare(PHP_VERSION,$minimum,'>=');
    $check(($readyReport['oneShotAvailable']??null)===$expectedPatched
        && ($readyReport['phpCliOctober2026RequiredPatch']??null)===$minimum
        && ($readyReport['phpCliOctober2026SecurityPatchPresent']??null)===$expectedPatched
        && $readyReport['phpCliVersion']===PHP_VERSION
        && $readyReport['phpWebOctober2026SecurityPatchVerified']===false
        && $readyReport['hostingVendorBackportIndependentlyVerified']===false
        && $readyReport['newCmsInstallPhpSafetyAccepted']===false,
        'preflight blocks one-shot readiness for upstream-vulnerable CLI and never verifies web PHP');
    $check($readyCode===0 && $readyErr===''
        && $readyReport['taskState']==='private_task_present'
        && $readyReport['receiptState']==='absent',
        'preflight sees private one-shot task metadata, does not read its password');
    $check(!str_contains($readyText,'ephemeral_local_ci_only'),
        'preflight never exposes password from task file');
    chmod($local.'/once.json',0644);
    [$looseTaskCode,$looseTaskText,$looseTaskErr]
        =$runCron('hostinger-stage2-preflight.php');
    $looseTask=json_decode($looseTaskText,true,8,JSON_THROW_ON_ERROR);
    $check($looseTaskCode===0 && $looseTaskErr==='' && !$looseTask['oneShotAvailable']
        && $looseTask['taskState']==='unsafe_task_refused'
        && !str_contains($looseTaskText,'ephemeral_local_ci_only'),
        'preflight detects group-readable credential file without reading it');
    $reject(fn()=>Job::run($package,$local)); // World-readable credential refused.
    chmod($local.'/once.json',0600);
    $originalTask=json_encode($task,JSON_THROW_ON_ERROR);
    foreach ([
        $originalTask."\n",
        " ".$originalTask,
        str_replace('"format"', '"format":"injected","format"', $originalTask),
        "\xEF\xBB\xBF".$originalTask,
        $originalTask."\0"
    ] as $malformedTask) {
        file_put_contents($local.'/once.json',$malformedTask);
        chmod($local.'/once.json',0600);
        $reject(fn()=>Job::run($package,$local));
        $check(!file_exists($local.'/receipt.json')
            && (int)$pdo->query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()')
                ->fetchColumn()===0,
            'raced/noncanonical credential record refuses before receipt and real MySQL DDL');
    }
    $store($task);
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
    // REAL independent child-process crash experiments at a DURABLE
    // receipt boundary. The MySQL server is live, but no DDL may run until
    // a human deliberately investigates this irreversible failed attempt.
    $crashVar='CMS_STAGE2_CI_CRASH_POINT';
    $crashTests=[
        ['after_receipt_before_unlink',true],
        ['after_unlink_before_db',false]
    ];
    foreach($crashTests as [$checkpoint,$taskShouldRemain]){
        $store($task);
        putenv($crashVar.'='.$checkpoint);
        try {
            [$interruptedCode,$interruptedOut,$interruptedErr]=$runCron();
        } finally {
            putenv($crashVar);
        }
        $started=json_decode(file_get_contents($local.'/receipt.json'),
            true,8,JSON_THROW_ON_ERROR);
        $check($interruptedCode===78 && $interruptedOut==='' && $interruptedErr===''
            &&$started['status']==='refused'
            &&$started['failureCategory']==='not_started'
            &&$started['operation']==='probe'
            &&$started['packageManifestSha256']===$task['package_manifest_sha256']
            &&!array_key_exists('finishedAtUtc',$started)
            &&((bool)file_exists($local.'/once.json'))===$taskShouldRemain,
            'durable started receipt survives child-process crash '.$checkpoint);
        [$crashPreCode,$crashPreText,$crashPreErr]
            =$runCron('hostinger-stage2-preflight.php');
        $crashPre=json_decode($crashPreText,true,8,JSON_THROW_ON_ERROR);
        $check($crashPreCode===0 && $crashPreErr===''
            &&$crashPre['receiptState']==='manual_review_required'
            &&$crashPre['oneShotAvailable']===false
            &&!str_contains($crashPreText,'ephemeral_local_ci_only'),
            'read-only preflight requires operator review after '.$checkpoint);
        [$retryExit,$retryOut,$retryErr]=$runCron();
        $check($retryExit===3&&$retryOut===''
            &&is_file($local.'/receipt.json')
            &&(int)$pdo->query('SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema=DATABASE()')->fetchColumn()===0,
            'automatic retry fenced with zero MySQL tables after '.$checkpoint);
        // CI-only manual cleanup of the synthetic fixture AFTER inspection.
        // Production operators must never silently remove consumed receipts.
        unlink($local.'/receipt.json');
        if(file_exists($local.'/once.json'))unlink($local.'/once.json');
    }
    $store($task);
    $report=Job::run($package,$local);
    $check(!file_exists($local.'/once.json'),
        'successful cron attempt destroys secret-bearing task file');
    [$doneCode,$doneText,$doneErr]=$runCron('hostinger-stage2-preflight.php');
    $doneReport=json_decode($doneText,true,8,JSON_THROW_ON_ERROR);
    $check($doneCode===0 && $doneErr==='' && !$doneReport['oneShotAvailable']
        && $doneReport['taskState']==='absent'
        && $doneReport['receiptState']==='completed_observed'
        && $doneReport['packagePhpLoaded']===false,
        'preflight identifies completed one-shot without re-executing MySQL');
    $check(!str_contains($doneText,'ephemeral_local_ci_only'),
        'preflight never prints secret on successful receipt');
    $receiptBefore=file_get_contents($local.'/receipt.json');
    file_put_contents($local.'/receipt.json','');
    [$crashCode,$crashText,$crashErr]=$runCron('hostinger-stage2-preflight.php');
    $crashReport=json_decode($crashText,true,8,JSON_THROW_ON_ERROR);
    $check($crashCode===0 && $crashErr===''
        && $crashReport['receiptState']==='manual_review_required'
        && !$crashReport['oneShotAvailable'],
        'empty interrupted receipt is quarantined for operator review');
    file_put_contents($local.'/receipt.json',$receiptBefore);
    chmod($local.'/receipt.json',0600);
    $evilReceipt=json_decode($receiptBefore,true,8,JSON_THROW_ON_ERROR);
    $evilReceipt['db_password']='MUST_NEVER_BE_PRINTED';
    file_put_contents($local.'/receipt.json',json_encode($evilReceipt,JSON_THROW_ON_ERROR));
    [$evilCode,$evilText,$evilErr]=$runCron('hostinger-stage2-preflight.php');
    $evilReport=json_decode($evilText,true,8,JSON_THROW_ON_ERROR);
    $check($evilCode===0 && $evilErr===''
        && $evilReport['receiptState']==='manual_review_required'
        && !str_contains($evilText,'MUST_NEVER_BE_PRINTED'),
        'malformed secret-bearing receipt never disclosed or falsely accepted');
    file_put_contents($local.'/receipt.json',$receiptBefore);
    chmod($local.'/receipt.json',0600);
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

    // Race two genuine packed Cron PHP entrypoints against ONE private task.
    // Exactly one runner can create receipt.json (O_EXCL), and neither may
    // mutate a clean probe-only test database or touch the visitor.
    $store($task);
    $startParallel=static function()use($package):array{
        $pipes=[];
        $process=proc_open([PHP_BINARY,$package.'/bin/hostinger-stage2-once.php'],
            [['pipe','r'],['pipe','w'],['pipe','w']],$pipes);
        if (!is_resource($process))throw new RuntimeException('Parallel CI process failed');
        fclose($pipes[0]);
        return [$process,$pipes];
    };
    [$p1,$io1]=$startParallel();
    [$p2,$io2]=$startParallel();
    $finishParallel=static function($proc,array $io):array{
        $out=stream_get_contents($io[1]);fclose($io[1]);
        $err=stream_get_contents($io[2]);fclose($io[2]);
        return [proc_close($proc),$out,$err];
    };
    $first=$finishParallel($p1,$io1);
    $second=$finishParallel($p2,$io2);
    $successes=count(array_filter([$first,$second],
        static fn($r)=>$r[0]===0 && str_contains($r[1],'STAGE2_ONCE_RECORDED')));
    $refusals=count(array_filter([$first,$second],
        static fn($r)=>$r[0]===3 && str_contains($r[2],'STAGE2_')));
    $check($successes===1 && $refusals===1,
        'concurrent actual PHP cron processes consume exactly one authorization');
    $check(is_file($local.'/receipt.json') && !is_file($local.'/once.json')
        && (int)$pdo->query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()')
            ->fetchColumn()===0,
        'parallel read-only Cron probe cannot create tables or preserve secrets');
    $check(hash_file('sha256',$tmp.'/public_html/index.html')===$siteHash,
        'parallel Cron cannot mutate independent visitor public root');
    unlink($local.'/receipt.json');

    // A correct DB password is insufficient if its user also owns other schemas.
    $root->exec("GRANT SELECT ON ai_site_cms_ci.* TO 'cms_stage2_once_ci'@'%'");
    $store($task);
    $report=Job::run($package,$local);
    $check($report['status']==='refused'
        && $report['dedicatedDbGrantsVerified']===false
        && $report['failureCategory']==='database_scope_refused',
        'cross-database grants refused before DDL');
    [$refusedCode,$refusedText,$refusedErr]=$runCron('hostinger-stage2-preflight.php');
    $refusedMeta=json_decode($refusedText,true,8,JSON_THROW_ON_ERROR);
    $check($refusedCode===0 && $refusedErr==='' &&
        $refusedMeta['receiptState']==='completed_refused'
        && !$refusedMeta['oneShotAvailable'],
        'preflight reports failed MySQL attempt without exposing credential details');
    $check(!file_exists($local.'/once.json'),
        'rejected DB privilege scope also consumes secret-bearing task');
    unlink($local.'/receipt.json');
    $root->exec("REVOKE SELECT ON ai_site_cms_ci.* FROM 'cms_stage2_once_ci'@'%'");

    // A database can have correctly scoped grants and still belong to a
    // FOREIGN application. Probe must refuse a real existing visitor table,
    // consume its one-shot authorization, and NEVER drop or overwrite it.
    $root->exec('CREATE TABLE `'.$name.'`.`visitor_owned_data` (id INT PRIMARY KEY)');
    $root->exec('INSERT INTO `'.$name.'`.`visitor_owned_data` VALUES (17)');
    $store($task);
    $foreignProbe=Job::run($package,$local);
    $check($foreignProbe['status']==='refused'
        && $foreignProbe['failureCategory']==='schema_read_refused'
        && $foreignProbe['dedicatedDbGrantsVerified']===true,
        'existing foreign data blocks scoped read-only CMS probe');
    $check((int)$pdo->query('SELECT id FROM visitor_owned_data')->fetchColumn()===17
        && !is_file($local.'/once.json'),
        'refused probe preserves foreign table and consumes one-use secret');
    $check(hash_file('sha256',$tmp.'/public_html/index.html')===$siteHash,
        'foreign-schema refusal cannot mutate independent visitor files');
    unlink($local.'/receipt.json');
    // ONLY the explicitly disposable GitHub Actions test owner may clean up.
    $root->exec('DROP TABLE `'.$name.'`.`visitor_owned_data`');

    // A database with zero TABLES may still contain a foreign stored routine
    // or event. The real packaged one-shot PROBE must refuse those objects,
    // preserve them and consume the scoped local authorization.
    foreach (['procedure','event'] as $kind) {
        if ($kind === 'procedure') {
            $root->exec('CREATE PROCEDURE `'.$name.'`.`visitor_owned_proc`() SELECT 17');
            $metadataSql="SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = DATABASE() AND routine_name = 'visitor_owned_proc'";
        } else {
            $root->exec('CREATE EVENT `'.$name.'`.`visitor_owned_event` ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 1 YEAR DO SELECT 17');
            $metadataSql="SELECT COUNT(*) FROM information_schema.events WHERE event_schema = DATABASE() AND event_name = 'visitor_owned_event'";
        }
        $store($task);
        $foreignResult=Job::run($package,$local);
        $check($foreignResult['status']==='refused'
            && $foreignResult['failureCategory']==='schema_read_refused'
            && $foreignResult['dedicatedDbGrantsVerified']===true,
            'packaged probe refuses foreign MySQL '.$kind.' without DDL');
        $check((int)$pdo->query($metadataSql)->fetchColumn()===1
            && !is_file($local.'/once.json')
            && hash_file('sha256',$tmp.'/public_html/index.html')===$siteHash,
            'packaged probe preserves foreign '.$kind.' and visitor files');
        unlink($local.'/receipt.json');
        // CI root owns this dedicated one-use database, NOT any real host.
        $root->exec($kind==='procedure'
            ? 'DROP PROCEDURE `'.$name.'`.`visitor_owned_proc`'
            : 'DROP EVENT `'.$name.'`.`visitor_owned_event`');
    }
    $check((int)$pdo->query("SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema=DATABASE()")->fetchColumn()===0,
        'refused foreign non-table fixture leaves DB free of CMS tables');

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
    unlink($local.'/owner-install-consent.json');
    [$code,$out,$err]=$runCron();
    $check($code===3&&$out===''&&str_contains($err,'STAGE2_ONCE_REFUSED')
        &&is_file($local.'/once.json')&&!is_file($local.'/receipt.json'),
        'unsigned install task fails before DB/receipt');
    $store($task);
    // Even a REAL synthetic Ed25519 signed permit must NOT authorize install
    // if the independent (external to once.json/trust JSON) owner key pin is
    // absent or different. Neither rejection consumes task nor opens MySQL.
    $ownerEnv='CMS_STAGE2_OWNER_INSTALL_TRUSTED_SPKI_SHA256';
    putenv($ownerEnv);
    [$unPinnedCode,$unPinnedOut,$unPinnedErr]=$runCron();
    $check($unPinnedCode===3 && $unPinnedOut===''
        && str_contains($unPinnedErr,'STAGE2_ONCE_REFUSED')
        && is_file($local.'/once.json') && !is_file($local.'/receipt.json'),
        'fully signed install refused when independent owner trust anchor absent');
    $reject(fn()=>\AiSiteCms\Hosting\Stage2OwnerWriteConsent::verify(
        $local,$task,$task['package_manifest_sha256']));
    putenv($ownerEnv.'='.str_repeat('0',64));
    [$unPinnedCode,$unPinnedOut,$unPinnedErr]=$runCron();
    $check($unPinnedCode===3 && $unPinnedOut===''
        && is_file($local.'/once.json') && !is_file($local.'/receipt.json'),
        'wrong external owner pin refuses signed install before receipt/DB');
    putenv($ownerEnv.'='.$trust['trustedOwnerSpkiSha256']);
    $check(\AiSiteCms\Hosting\Stage2OwnerWriteConsent::verify(
        $local,$task,$task['package_manifest_sha256'])===null,
        'separate owner signature and external pinned owner key bind install task and package');

    // Adversary can REPLACE all files in operator-owned local root and can
    // generate its own Ed25519 signature. The separately administered
    // Cron environment trust anchor must still reject that valid forgery.
    $attackerPair=sodium_crypto_sign_keypair();
    $attackerSecret=sodium_crypto_sign_secretkey($attackerPair);
    $attackerDer=hex2bin('302a300506032b6570032100').
        sodium_crypto_sign_publickey($attackerPair);
    $attackerTrust=$trust;
    $attackerTrust['trustedOwnerSpkiSha256']=hash('sha256',$attackerDer);
    $attackerPem="-----BEGIN PUBLIC KEY-----\n".
        chunk_split(base64_encode($attackerDer),64,"\n").
        "-----END PUBLIC KEY-----\n";
    $attackerPermit=json_decode(file_get_contents($local.'/owner-install-consent.json'),
        true,16,JSON_THROW_ON_ERROR);
    $attackerPermit['signature']=base64_encode(sodium_crypto_sign_detached(
        "AI-SITE-CMS-STAGE2-OWNER-WRITE-INSTALL-V1\0".
        json_encode($attackerPermit['payload'],JSON_THROW_ON_ERROR),$attackerSecret));
    $writePrivate('owner-install-trust.json',json_encode($attackerTrust,JSON_THROW_ON_ERROR));
    $writePrivate('owner-install-public.pem',$attackerPem);
    $writePrivate('owner-install-consent.json',json_encode($attackerPermit,JSON_THROW_ON_ERROR));
    [$forgedCode,$forgedOut,$forgedErr]=$runCron();
    $check($forgedCode===3&&$forgedOut===''&&str_contains($forgedErr,'STAGE2_ONCE_REFUSED')
        &&is_file($local.'/once.json')&&!is_file($local.'/receipt.json'),
        'complete replacement of local owner key trust and signed consent cannot install');
    $writePrivate('owner-install-trust.json',json_encode($trust,JSON_THROW_ON_ERROR));
    $writePrivate('owner-install-public.pem',$pem);
    $signInstall($task);
    $check(\AiSiteCms\Hosting\Stage2OwnerWriteConsent::verify(
        $local,$task,$task['package_manifest_sha256'])===null,
        'restored real synthetic owner key passes independently pinned verifier');
    $bad=$task;$bad['db_password']='modified-credentials';
    $reject(fn()=>\AiSiteCms\Hosting\Stage2OwnerWriteConsent::verify(
        $local,$bad,$task['package_manifest_sha256']));
    $wrong=$trust;$wrong['trustedOwnerSpkiSha256']=str_repeat('0',64);
    $writePrivate('owner-install-trust.json',json_encode($wrong,JSON_THROW_ON_ERROR));
    $reject(fn()=>\AiSiteCms\Hosting\Stage2OwnerWriteConsent::verify(
        $local,$task,$task['package_manifest_sha256']));
    $writePrivate('owner-install-trust.json',json_encode($trust,JSON_THROW_ON_ERROR));
    $signInstall($task,-7200,-3600);
    $reject(fn()=>\AiSiteCms\Hosting\Stage2OwnerWriteConsent::verify(
        $local,$task,$task['package_manifest_sha256']));
    $signInstall($task,120,600);
    $reject(fn()=>\AiSiteCms\Hosting\Stage2OwnerWriteConsent::verify(
        $local,$task,$task['package_manifest_sha256']));
    $signInstall($task);
    $tampered=json_decode(file_get_contents($local.'/owner-install-consent.json'),
        true,8,JSON_THROW_ON_ERROR);
    $tampered['payload']['target']='attacker.invalid';
    $writePrivate('owner-install-consent.json',json_encode($tampered,JSON_THROW_ON_ERROR));
    $reject(fn()=>\AiSiteCms\Hosting\Stage2OwnerWriteConsent::verify(
        $local,$task,$task['package_manifest_sha256']));
    $signInstall($task);
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

    // The same packaged one-use hPanel operator must refuse a forged but
    // still-readable physical CMS schema. No migration, repair or visitor
    // modification is permitted in a read-only verify operation.
    foreach (['missing_unique','wrong_engine'] as $tamper) {
        if ($tamper==='missing_unique') {
            $pdo->exec('ALTER TABLE cms_installation DROP INDEX site_id');
        } else {
            $pdo->exec('ALTER TABLE cms_installation ENGINE=MyISAM');
        }
        $store($task);
        $badSchema=Job::run($package,$local);
        $check($badSchema['status']==='refused'
            && $badSchema['failureCategory']==='schema_read_refused'
            && $badSchema['dedicatedDbGrantsVerified']===true,
            'packaged read-only verify refuses physical schema '.$tamper);
        $check(!is_file($local.'/once.json')
            && $pdo->query('SELECT site_id FROM cms_installation')->fetchColumn()===Job::SITE
            && hash_file('sha256',$tmp.'/public_html/index.html')===$siteHash,
            'physical schema refusal preserves CMS identity and visitor site');
        unlink($local.'/receipt.json');
        // Restore only the disposable, CI-owned test database.
        if ($tamper==='missing_unique') {
            $pdo->exec('ALTER TABLE cms_installation ADD UNIQUE INDEX site_id (site_id)');
        } else {
            $pdo->exec('ALTER TABLE cms_installation ENGINE=InnoDB');
        }
    }
    $store($task);
    $afterRepair=Job::run($package,$local);
    $check($afterRepair['status']==='verified' && $afterRepair['schemaState']==='ready',
        'one-shot read-only verify resumes after isolated CI fixture restoration');
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

    // The host-side verifier now matches Node's exact canonical manifest
    // bytes, not just a set of self-consistent per-file SHA-256 checks.
    // Even a newline-only change is refused before any DB connection.
    $manifestFile=$package.'/private/package-manifest.json';
    $originalManifest=file_get_contents($manifestFile);
    file_put_contents($manifestFile,$originalManifest."\n");
    $reject(fn()=>\AiSiteCms\Hosting\PackageArtifactVerifier::verify($package));
    [$noncanonicalExit,$noncanonicalOut,$noncanonicalErr]
        =$runCron('hostinger-stage2-preflight.php');
    $check($noncanonicalExit===3 && $noncanonicalOut===''
        && str_contains($noncanonicalErr,'STAGE2_PREFLIGHT_REFUSED'),
        'separate credential-free preflight refuses noncanonical manifest bytes');
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
    [$preflightAttackCode,$preflightAttackOut,$preflightAttackErr]
        =$runCron('hostinger-stage2-preflight.php');
    $check($preflightAttackCode===3 && $preflightAttackOut===''
        && str_contains($preflightAttackErr,'STAGE2_PREFLIGHT_REFUSED'),
        'credential-free preflight rejects tampered package without including PHP');
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

    // CRASH-RECOVERY LAB: the server killed PHP after receipt lock, but
    // before unlink(once.json). Secret revocation must require an explicitly
    // scoped, private operator request, never a DB restore or auto-retry.
    $task['target']=Job::TARGET;
    $store($task);
    file_put_contents($local.'/receipt.json','');
    chmod($local.'/receipt.json',0600);
    $revokeRequest=[
        'format'=>'ai-site-cms-stage2-revoke-v1',
        'target'=>Job::TARGET,
        'site'=>Job::SITE,
        'package_manifest_sha256'=>$task['package_manifest_sha256'],
        'confirm'=>'REVOKE_PRIVATE_TASK_ONLY_NO_DATABASE_ROLLBACK',
        'acknowledge_running_process_may_continue'=>true
    ];
    $writeRequest=static function(array $value)use($local):void{
        file_put_contents($local.'/revoke-request.json',
            json_encode($value,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES));
        chmod($local.'/revoke-request.json',0600);
    };
    $badRequest=$revokeRequest;
    $badRequest['package_manifest_sha256']=str_repeat('a',64);
    $writeRequest($badRequest);
    [$revokeBadCode,$revokeBadOut,$revokeBadErr]=$runCron('hostinger-stage2-revoke.php');
    $check($revokeBadCode===3 && $revokeBadOut===''
        && str_contains($revokeBadErr,'STAGE2_REVOKE_REFUSED')
        && is_file($local.'/once.json') && !file_exists($local.'/revocation.json'),
        'wrong manifest pin forbids secret-file revocation');
    // The emergency revoker runs WITHOUT package autoload and must
    // independently reject noncanonical, duplicate-key or raced records.
    $canonicalRevoke=json_encode($revokeRequest,JSON_THROW_ON_ERROR
        |JSON_UNESCAPED_SLASHES);
    foreach([
        $canonicalRevoke."\n",
        ' '.$canonicalRevoke,
        str_replace('"format"', '"format":"forged","format"', $canonicalRevoke)
    ] as $malformedRevocation) {
        file_put_contents($local.'/revoke-request.json',$malformedRevocation);
        chmod($local.'/revoke-request.json',0600);
        [$badRevokeCode,$badRevokeOut,$badRevokeErr]
            =$runCron('hostinger-stage2-revoke.php');
        $check($badRevokeCode===3&&$badRevokeOut===''
            &&str_contains($badRevokeErr,'STAGE2_REVOKE_REFUSED')
            &&is_file($local.'/once.json')&&!file_exists($local.'/revocation.json'),
            'emergency revocation refuses noncanonical private request');
    }
    $writeRequest($revokeRequest);
    chmod($local.'/revoke-request.json',0644);
    [$revokeLooseCode,$revokeLooseOut,$revokeLooseErr]=$runCron('hostinger-stage2-revoke.php');
    $check($revokeLooseCode===3 && $revokeLooseOut===''
        && str_contains($revokeLooseErr,'STAGE2_REVOKE_REFUSED')
        && is_file($local.'/once.json'),
        'group-readable revoke authorization is refused');
    chmod($local.'/revoke-request.json',0600);
    [$fencedCode,$fencedOut,$fencedErr]=$runCron();
    $check($fencedCode===3 && $fencedOut===''
        && str_contains($fencedErr,'STAGE2_PACKAGE_REFUSED')
        && is_file($local.'/once.json'),
        'pending revocation fences new MySQL Cron BEFORE Composer code');
    $reject(fn()=>Job::run($package,$local));
    [$beforeRevokeCode,$beforeRevokeOut,$beforeRevokeErr]
        =$runCron('hostinger-stage2-preflight.php');
    $beforeRevoke=json_decode($beforeRevokeOut,true,8,JSON_THROW_ON_ERROR);
    $check($beforeRevokeCode===0 && $beforeRevokeErr===''
        && $beforeRevoke['revocationState']==='requested_manual_review'
        && !$beforeRevoke['oneShotAvailable'],
        'password-free preflight reports pending revoke without allowing DB work');
    [$revokeCode,$revokeOut,$revokeErr]=$runCron('hostinger-stage2-revoke.php');
    $check($revokeCode===0 && $revokeErr===''
        && str_contains($revokeOut,'STAGE2_PRIVATE_TASK_REVOKED_DB_STATUS_UNKNOWN')
        && !str_contains($revokeOut,'ephemeral_local_ci_only')
        && !is_file($local.'/once.json') && is_file($local.'/revocation.json'),
        'explicit private revocation removes leftover credentials and preserves audit');
    $revoked=json_decode(file_get_contents($local.'/revocation.json'),true,8,JSON_THROW_ON_ERROR);
    $check($revoked['status']==='private_task_revoked_no_db_claim'
        && $revoked['databaseResult']==='unknown'
        && $revoked['inFlightProcessMayContinue']===true
        && $revoked['credentialRead']===false
        && !str_contains(file_get_contents($local.'/revocation.json'),
            'ephemeral_local_ci_only'),
        'private revocation receipt never claims rollback, DB result or secret read');
    [$postCode,$postOut,$postErr]=$runCron('hostinger-stage2-preflight.php');
    $post=json_decode($postOut,true,8,JSON_THROW_ON_ERROR);
    $check($postCode===0 && $postErr===''
        && $post['revocationState']==='credential_file_revoked_db_unknown'
        && $post['receiptState']==='manual_review_required'
        && !$post['oneShotAvailable'] && $post['taskState']==='absent',
        'read-only preflight reports completed credential removal but unknown DB state');
    [$againCode,$againOut,$againErr]=$runCron('hostinger-stage2-revoke.php');
    $check($againCode===3 && $againOut===''
        && str_contains($againErr,'STAGE2_REVOKE_REFUSED'),
        'credential revocation is permanently one-shot, cannot silently repeat');
    $store($task); // Even an incorrectly re-created task cannot bypass fence.
    [$afterFenceCode,$afterFenceOut,$afterFenceErr]=$runCron();
    $check($afterFenceCode===3 && $afterFenceOut===''
        && str_contains($afterFenceErr,'STAGE2_PACKAGE_REFUSED'),
        'revocation marker irreversibly fences a newly created secret task');
    $reject(fn()=>Job::run($package,$local));
    unlink($local.'/once.json');
    $check((int)$pdo->query('SELECT COUNT(*) FROM cms_schema_migrations')->fetchColumn()===2
        && hash_file('sha256',$tmp.'/public_html/index.html')===$siteHash,
        'emergency revocation never modifies source MySQL or independent visitor');

    echo "Stage2 hPanel CLI-only MySQL8.4 probe/install/verify/snapshot/revoke and secret disposal PASS: {$checks} checks; no real host\n";
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
