<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/SubmissionHttp.php';
require_once __DIR__ . '/../src/NoJsResult.php';
ini_set('session.use_strict_mode', '1');
session_set_cookie_params(['httponly' => true, 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'samesite' => 'Lax', 'path' => '/']);
session_start();
$raw = file_get_contents('php://input', false, null, 0, 8193);
$decision = SubmissionHttp::process($_SERVER, is_string($raw) ? $raw : '', $_SESSION, time());
http_response_code($decision['http']);
if ($decision['http'] === 405) header('Allow: POST');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$accept = $_SERVER['HTTP_ACCEPT'] ?? '';
$wantHtml = is_string($accept) && preg_match('~(?:^|,)\s*text/html\s*(?:;|,|$)~i', $accept) === 1;
if ($wantHtml) {
    header("Content-Security-Policy: default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    header('Content-Type: text/html; charset=utf-8');
    echo NoJsResult::page($decision, $decision['submitted']);
} else {
    header("Content-Security-Policy: default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(SubmissionHttp::jsonFields($decision), JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
}
