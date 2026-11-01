<?php
declare(strict_types=1);
$stage3ServerRoot = dirname(__DIR__);
if (!is_file($stage3ServerRoot . DIRECTORY_SEPARATOR . 'EngineRuntime.php')
    || !is_file($stage3ServerRoot . DIRECTORY_SEPARATOR . 'bootstrap.php')) {
    $stage3ServerRoot = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'stage3' . DIRECTORY_SEPARATOR . 'server';
}
$stage3ServerRootReal = realpath($stage3ServerRoot);
if (!is_string($stage3ServerRootReal) || $stage3ServerRootReal !== $stage3ServerRoot
    || !is_dir($stage3ServerRootReal) || is_link($stage3ServerRoot)) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo '{"error":"Stage3 runtime unavailable"}';
    exit;
}
require_once $stage3ServerRootReal . '/EngineRuntime.php';

use Manufact\Stage3\Api;

// Stable public entrypoint resolves a private immutable CMS engine slot.
// The configured document root and published visitor-site release do not move.
try {
    $stage3EngineRoot = \Manufact\Stage3\EngineRuntime::boot($stage3ServerRootReal);
    require $stage3EngineRoot . '/server/bootstrap.php';
    (new Api(stage3_repository()))->handle();
} catch (Throwable $e) {
    error_log('Stage3 bootstrap error: ' . get_class($e));
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo '{"error":"Stage3 unavailable"}';
}
