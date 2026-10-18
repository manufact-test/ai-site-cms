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
    $db = new PDO('sqlite:'.$file);
    $rows = $db->query('SELECT site_id, storage_generation FROM cms_installation')->fetchAll(PDO::FETCH_ASSOC);
    if (count($rows) !== 1 || $rows[0]['site_id'] !== 'site-first' || (int) $rows[0]['storage_generation'] !== 0) {
        throw new RuntimeException('Site identity or generation was changed by rejected install');
    }
    $checks++;
    $count = (int) $db->query('SELECT COUNT(*) FROM cms_schema_migrations')->fetchColumn();
    if ($count !== 2) throw new RuntimeException('Expected two journaled migrations');
    $checks++;
    echo "Stage2 cross-process CLI installer PASS: {$checks} assertions\n";
} finally {
    if (is_file($file)) unlink($file);
    rmdir($dir);
}
