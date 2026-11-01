<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/EngineRuntime.php';

use Manufact\Stage3\Api;

// Stable public entrypoint resolves a private immutable CMS engine slot.
// The configured document root and published visitor-site release do not move.
try {
    $stage3EngineRoot = \Manufact\Stage3\EngineRuntime::boot(dirname(__DIR__));
    require $stage3EngineRoot . '/server/bootstrap.php';
    (new Api(stage3_repository()))->handle();
} catch (Throwable $e) {
    error_log('Stage3 bootstrap error: ' . get_class($e));
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo '{"error":"Stage3 unavailable"}';
}
