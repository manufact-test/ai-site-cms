<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/Hosting/SharedHostPreflight.php';
use AiSiteCms\Hosting\SharedHostPreflight as Preflight;

$n = 0;
function verifyPreflight(bool $result, string $label): void {
    global $n;
    $n++;
    if (!$result) throw new RuntimeException("Shared-host preflight failed: " . $label);
}
$fixture = sys_get_temp_dir() . '/ai-site-cms-shared-host-' . bin2hex(random_bytes(8));
mkdir($fixture, 0700);
mkdir($fixture . '/public', 0700);
mkdir($fixture . '/src', 0700);
mkdir($fixture . '/vendor', 0700);
file_put_contents($fixture . '/public/index.php', '<?php echo "fixture";');
function inspectFixture(string $root): array {
    return Preflight::inspect($root, $root . '/public');
}
try {
    $pass = inspectFixture($fixture);
    verifyPreflight($pass['result'] === 'offline_structure_pass', 'isolated structure');
    verifyPreflight($pass['safe_to_deploy'] === false && !$pass['real_host_compatibility_verified'],
        'never promotes an offline check to deployment approval');
    verifyPreflight($pass['php_fpm_permissions'] === 'not_tested' && $pass['apache_rewrite'] === 'not_tested',
        'no implicit FPM or Apache claims');
    verifyPreflight(!$pass['network_attempted'] && !$pass['database_connection_attempted']
        && !$pass['filesystem_modified'], 'zero claimed external side effects');
    verifyPreflight(Preflight::inspect($fixture, null)['result'] === 'blocked',
        'unspecified docroot cannot pass');
    verifyPreflight(Preflight::inspect($fixture, $fixture)['document_root'] === 'invalid',
        'application root cannot be web root');
    verifyPreflight(Preflight::inspect($fixture, $fixture . '/vendor')['result'] === 'blocked',
        'vendor cannot be web root');

    mkdir($fixture . '/public/assets');
    file_put_contents($fixture . '/public/assets/site.css', 'body{}');
    verifyPreflight(inspectFixture($fixture)['result'] === 'offline_structure_pass', 'ordinary assets allowed');
    file_put_contents($fixture . '/public/assets/shell.php', '<?php echo 1;');
    verifyPreflight(inspectFixture($fixture)['result'] === 'blocked', 'extra nested PHP forbidden');
    unlink($fixture . '/public/assets/shell.php');
    file_put_contents($fixture . '/public/.env', 'not-a-real-secret');
    verifyPreflight(inspectFixture($fixture)['result'] === 'blocked', 'public secrets forbidden');
    unlink($fixture . '/public/.env');
    symlink($fixture . '/src', $fixture . '/public/assets/source');
    verifyPreflight(inspectFixture($fixture)['result'] === 'blocked', 'public symlink denied');
    unlink($fixture . '/public/assets/source');

    rename($fixture . '/vendor', $fixture . '/vendor.old');
    symlink($fixture . '/vendor.old', $fixture . '/vendor');
    verifyPreflight(inspectFixture($fixture)['result'] === 'blocked', 'symlinked private vendor denied');
    unlink($fixture . '/vendor');
    rename($fixture . '/vendor.old', $fixture . '/vendor');
    unlink($fixture . '/public/index.php');
    verifyPreflight(inspectFixture($fixture)['result'] === 'blocked', 'missing index fails');
    file_put_contents($fixture . '/public/index.php', '<?php echo "fixture";');

    $server = [
        'DOCUMENT_ROOT' => $fixture . '/public',
        'SCRIPT_FILENAME' => $fixture . '/public/index.php',
        'HTTP_X_FORWARDED_PROTO' => 'https'
    ];
    $web = Preflight::inspectWebMapping($server, $fixture . '/public', 'fpm-fcgi');
    verifyPreflight($web['result'] === 'mapping_plausible', 'synthetic PHP-FPM mapping');
    verifyPreflight(!$web['https_server_variable_observed'] && !$web['proxy_headers_trusted'],
        'untrusted proxy HTTPS spoof ignored');
    verifyPreflight(!$web['actual_request_executed'] && !$web['rewrite_proven'],
        'synthetic request does not establish HTTP/rewrite behavior');
    verifyPreflight(Preflight::inspectWebMapping($server, $fixture . '/public', 'apache2handler')['result']
        === 'mapping_plausible', 'synthetic Apache SAPI mapping');
    verifyPreflight(Preflight::inspectWebMapping($server, $fixture . '/public', 'cli')['result']
        === 'blocked', 'CLI is not actual PHP-FPM');
    $server['DOCUMENT_ROOT'] = $fixture;
    verifyPreflight(Preflight::inspectWebMapping($server, $fixture . '/public', 'fpm-fcgi')['result']
        === 'blocked', 'unsafe mapped document root');
    $server['DOCUMENT_ROOT'] = $fixture . '/public';
    $server['SCRIPT_FILENAME'] = $fixture . '/public/assets/site.css';
    verifyPreflight(Preflight::inspectWebMapping($server, $fixture . '/public', 'fpm-fcgi')['result']
        === 'blocked', 'script mismatch denied');
    $server['SCRIPT_FILENAME'] = $fixture . '/public/index.php';
    $server['HTTPS'] = 'on';
    verifyPreflight(Preflight::inspectWebMapping($server, $fixture . '/public', 'fpm-fcgi')
        ['https_server_variable_observed'] === true, 'HTTPS only an observation not proof');

    $real = dirname(__DIR__);
    $actual = Preflight::inspect($real, $real . '/public');
    verifyPreflight($actual['result'] === 'offline_structure_pass',
        'real source checkout boundary after Composer install');
    $command = escapeshellarg(PHP_BINARY) . ' '
        . escapeshellarg($real . '/bin/shared-host-preflight.php');
    exec($command . ' --check --document-root=' . escapeshellarg($real . '/public') . ' 2>&1', $output, $exit);
    $json = implode("\n", $output);
    verifyPreflight($exit === 0 && str_contains($json, '"offline_structure_pass"'), 'CLI explicit check');
    verifyPreflight(!str_contains($json, $real) && !str_contains($json, $fixture),
        'CLI JSON output does not leak source or fixture paths');
    exec($command . ' --check --document-root=' . escapeshellarg($real) . ' 2>&1', $wrong, $wrongExit);
    verifyPreflight($wrongExit === 3, 'CLI wrong document root fails closed');
    exec($command . ' 2>&1', $usage, $usageExit);
    verifyPreflight($usageExit === 2, 'CLI no implicit invocation');
    echo "Stage2 shared-host OFFLINE preflight PASS: $n assertions; no target host contacted\n";
} finally {
    // Only remove our unique random fixture tree; never user/site directories.
    foreach (['public/assets/source', 'public/assets/shell.php', 'public/assets/site.css',
        'public/.env', 'public/index.php'] as $relative) {
        $p = $fixture . '/' . $relative;
        if (is_file($p) || is_link($p)) unlink($p);
    }
    if (is_dir($fixture . '/public/assets')) rmdir($fixture . '/public/assets');
    foreach (['public', 'src', 'vendor', 'vendor.old'] as $dir) {
        if (is_dir($fixture . '/' . $dir) && !is_link($fixture . '/' . $dir)) rmdir($fixture . '/' . $dir);
    }
    if (is_dir($fixture)) rmdir($fixture);
}
