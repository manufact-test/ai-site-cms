<?php
declare(strict_types=1);

// End-to-end *CLI* installation into ephemeral SQLite test DB; no hosted site.
if (!function_exists('proc_open') || !in_array('sqlite', PDO::getAvailableDrivers(), true)) {
    throw new RuntimeException('CI must provide proc_open and PDO SQLite');
}
$dir = sys_get_temp_dir().'/ai-site-cms-cli-'.bin2hex(random_bytes(8));
if (!mkdir($dir, 0700) || !is_dir($dir)) throw new RuntimeException('Temporary directory failed');
$file = $dir.'/site.sqlite';
$install = dirname(__DIR__).'/bin/install.php';
$baseEnv = [
    'CMS_DB_DSN' => 'sqlite:'.$file,
    'CMS_SITE_ID' => 'site-first',
    'CMS_ENV' => 'test',
    'CMS_ALLOW_SQLITE_TEST_ONLY' => '1',
];
$checks = 0;
$run = static function (array $env) use ($install): array {
    $spec = [['pipe','r'], ['pipe','w'], ['pipe','w']];
    $p = proc_open([PHP_BINARY, $install, '--apply'], $spec, $pipes, dirname(__DIR__), $env);
    if (!is_resource($p)) throw new RuntimeException('Cannot launch isolated CLI');
    fclose($pipes[0]);
    $out = stream_get_contents($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    return [proc_close($p), $out, $err];
};
try {
    [$exit] = $run($baseEnv); if ($exit !== 0) throw new RuntimeException('Expected explicit first install PASS');
    $checks++;
    [$exit] = $run($baseEnv); if ($exit !== 0) throw new RuntimeException('Idempotent same-site install should pass');
    $checks++;
    [$exit] = $run(array_merge($baseEnv, ['CMS_SITE_ID'=>'other-site']));
    if ($exit === 0) throw new RuntimeException('Must refuse wrong site re-use');
    $checks++;
    [$exit] = $run(array_merge($baseEnv, ['CMS_SITE_ID'=>'../other']));
    if ($exit === 0) throw new RuntimeException('Must refuse unsafe site identifier');
    $checks++;
    [$exit] = $run(array_merge($baseEnv, ['CMS_ALLOW_SQLITE_TEST_ONLY'=>'0']));
    if ($exit === 0) throw new RuntimeException('Must refuse SQLite outside explicit test grant');
    $checks++;
    // Generic MySQL CLI must refuse before autoload, DNS and any SQL when
    // pointed at a customer/Hostinger database. The only allowed generic
    // mode is the exact disposable 127.0.0.1 CI database.
    $hostileMysql=[
        'CMS_DB_DSN'=>'mysql:host=customer-db.invalid;dbname=customer_live;charset=utf8mb4',
        'CMS_DB_USER'=>'customer',
        'CMS_DB_PASSWORD'=>'must_never_appear_in_stderr',
        'CMS_SITE_ID'=>'customer-live',
        'CMS_ENV'=>'production'
    ];
    foreach ([
        $hostileMysql,
        array_merge($hostileMysql,['CMS_ENV'=>'test','CI'=>'true',
            'GITHUB_ACTIONS'=>'true',
            'CMS_STAGE2_MYSQL_CLI_INSTALL'=>'isolated-ci-only']),
        array_merge($hostileMysql,[
            'CMS_DB_DSN'=>'mysql:host=127.0.0.1;port=3306;dbname=ai_site_cms_ci;charset=utf8mb4',
            'CMS_DB_USER'=>'cms_ci',
            'CMS_DB_PASSWORD'=>'ephemeral_ci_only',
            'CMS_ENV'=>'test','CI'=>'true','GITHUB_ACTIONS'=>'true',
            'CMS_STAGE2_MYSQL_CLI_INSTALL'=>'absent'
        ])
    ] as $unsafeEnvironment) {
        [$exit,$stdout,$stderr]=$run($unsafeEnvironment);
        if ($exit!==3 || $stdout!=='' ||
            !str_contains($stderr,'Generic Stage2 MySQL installation refused') ||
            str_contains($stderr,'must_never_appear_in_stderr')) {
            throw new RuntimeException('Generic MySQL bootstrap bypassed explicit CI-only fence');
        }
        $checks++;
    }
    $db = new PDO('sqlite:'.$file);
    $rows = $db->query('SELECT site_id, storage_generation FROM cms_installation')->fetchAll(PDO::FETCH_ASSOC);
    if (count($rows) !== 1 || $rows[0]['site_id'] !== 'site-first' || (int) $rows[0]['storage_generation'] !== 0) {
        throw new RuntimeException('Site identity or generation was changed by rejected install');
    }
    $checks++;
    $count = (int) $db->query('SELECT COUNT(*) FROM cms_schema_migrations')->fetchColumn();
    if ($count !== 2) throw new RuntimeException('Expected two journaled migrations');
    $checks++;
    // Run a separate read-only preflight process. This must not alter the DB.
    $preflightScript = dirname(__DIR__).'/bin/schema-preflight.php';
    $command = [PHP_BINARY, $preflightScript, '--inspect'];
    $pipesSpec = [['pipe','r'],['pipe','w'],['pipe','w']];
    $p = proc_open($command, $pipesSpec, $pipes, dirname(__DIR__), $baseEnv);
    if (!is_resource($p)) throw new RuntimeException('Cannot launch preflight PHP process');
    fclose($pipes[0]);
    $json=stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    if(proc_close($p)!==0 || json_decode($json,true)['state']!=='ready') {
        throw new RuntimeException('CLI read-only schema preflight must succeed after installation');
    }
    $checks++;
    echo "Stage2 cross-process CLI installer PASS: {$checks} assertions\n";
} finally {
    if (is_file($file)) unlink($file);
    rmdir($dir);
}
