<?php
declare(strict_types=1);
// Separate collector-only document root, never serves administrative routes.
require dirname(__DIR__) . '/bootstrap.php';

use Manufact\Stage3\FormGateway;

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if ($method !== 'POST' || !is_string($path)
    || preg_match('~^/forms/([a-z][a-z0-9-]{2,79})/([a-z][a-z0-9-]{2,79})$~D', $path, $parts) !== 1) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not found';
    exit;
}
try {
    FormGateway::respond(stage3_repository(), $parts[1], $parts[2]);
} catch (Throwable $e) {
    error_log('Stage3 collector unavailable: ' . get_class($e));
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Collector unavailable';
}
