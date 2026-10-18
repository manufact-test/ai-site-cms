<?php
declare(strict_types=1);

// PRIVATE CI FIXTURE, never packaged, never an application HTTP route.
// Actual PHP CLI built-in HTTP workers exercise shared-code generation lease
// using separately installed, verified lab code. No public network listener.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

if (PHP_SAPI !== 'cli-server' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1'
    || getenv('CMS_PHP_LAB_HTTP_ONLY') !== '1'
    || ($_SERVER['REMOTE_ADDR'] ?? null) !== '127.0.0.1'
    || ($_SERVER['REQUEST_METHOD'] ?? null) !== 'GET') {
    http_response_code(503);
    echo '{"error":"lab_unavailable"}';
    return;
}

$path = parse_url((string)($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
if (!in_array($path, ['/api/health', '/api/hold'], true)) {
    http_response_code(404);
    echo '{"error":"not_found"}';
    return;
}

$sync = getenv('CMS_PHP_HTTP_SYNC_DIR');
$lab = getenv('CMS_PHP_HTTP_SWITCH_ROOT');
$floor = getenv('CMS_PHP_HTTP_FLOOR');
$tmp = realpath(sys_get_temp_dir());
if (!is_string($sync) || !is_string($lab) || !is_string($floor) || $tmp === false
    || dirname($sync) !== $tmp
    || !preg_match('/^ai-site-cms-php-http-sync-[a-f0-9]{24}$/D', basename($sync))
    || is_link($sync) || !is_dir($sync) || realpath($sync) !== $sync) {
    http_response_code(503);
    echo '{"error":"lab_unavailable"}';
    return;
}
if ($path === '/api/health' && ($_SERVER['QUERY_STRING'] ?? '') !== '') {
    http_response_code(404);
    echo '{"error":"not_found"}';
    return;
}
$token = null;
if ($path === '/api/hold') {
    $query = (string)($_SERVER['QUERY_STRING'] ?? '');
    if (!preg_match('/^token=([a-f0-9]{12})$/D', $query, $match)) {
        http_response_code(404);
        echo '{"error":"not_found"}';
        return;
    }
    $token = $match[1];
}
require_once dirname(__DIR__, 2).'/src/Release/LabPackageStager.php';
require_once dirname(__DIR__, 2).'/src/Release/LabPhpGenerationSwitcher.php';
try {
    $switcher = \AiSiteCms\Release\LabPhpGenerationSwitcher::reopen($lab);
    $payload = $switcher->withRequestLease($floor, static function (array $generation) use ($sync, $token): array {
        if ($token !== null) {
            $ready = $sync.'/ready-'.$token;
            $release = $sync.'/release-'.$token;
            $fh = @fopen($ready, 'x');
            if ($fh === false) throw new \RuntimeException('Duplicate hold marker');
            try {
                fwrite($fh, $generation['version']."\n");
                fflush($fh);
            } finally {
                fclose($fh);
            }
            $unblocked = false;
            for ($i = 0; $i < 450; $i++) {
                if (is_file($release) && !is_link($release)) {
                    $unblocked = true;
                    break;
                }
                usleep(20000);
            }
            if (!$unblocked) throw new \RuntimeException('Timed out holding request lease');
        }
        return [
            'status'=>'ok', 'lab'=>true, 'version'=>$generation['version'],
            'generation'=>$generation['sequence'],
            'productionReady'=>false, 'opcacheResetPerformed'=>false
        ];
    });
    http_response_code(200);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
} catch (\Throwable $error) {
    http_response_code(503);
    echo '{"error":"lab_release_unavailable"}';
}
