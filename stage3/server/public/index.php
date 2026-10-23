<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';

use Manufact\Stage3\Api;

// Front controller for an isolated test origin. No deployment or Hostinger coupling.
try {
    (new Api(stage3_repository()))->handle();
} catch (Throwable $e) {
    error_log('Stage3 bootstrap error: ' . get_class($e));
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo '{"error":"Stage3 unavailable"}';
}
