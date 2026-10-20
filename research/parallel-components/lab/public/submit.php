<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/FormLab.php';
ini_set('session.use_strict_mode', '1');
session_set_cookie_params(['httponly' => true, 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'samesite' => 'Lax', 'path' => '/']);
session_start();
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Content-Security-Policy: default-src \'none\'; base-uri \'none\'');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST'); http_response_code(405);
    echo json_encode(['code' => 'METHOD_NOT_ALLOWED', 'message' => 'Use POST'], JSON_UNESCAPED_UNICODE); exit;
}
$length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
$type = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
if ($length > 8192 || $type !== 'application/x-www-form-urlencoded') {
    http_response_code(415);
    echo json_encode(['code' => 'UNSUPPORTED_REQUEST', 'message' => 'Неподдерживаемый формат или размер запроса.'], JSON_UNESCAPED_UNICODE); exit;
}
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
if (is_string($origin) && $origin !== '') {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $expectedOrigin = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '');
    if (!hash_equals($expectedOrigin, $origin)) {
        http_response_code(403);
        echo json_encode(['code' => 'ORIGIN_INVALID', 'message' => 'Недопустимый источник запроса.'], JSON_UNESCAPED_UNICODE); exit;
    }
}
$recipient = getenv('LAB_FORM_RECIPIENT_EMAIL');
$sender = getenv('LAB_FORM_SENDER_EMAIL');
$result = FormLab::submit($_POST, $_SESSION, time(), $recipient !== false ? $recipient : null,
    static function (string $recipient, array $fields) use ($sender): bool {
        if (!is_string($sender) || !filter_var($sender, FILTER_VALIDATE_EMAIL)
            || preg_match('/[\r\n]/', $sender)) return false;
        $body = "Name: {$fields['name']}\nEmail: {$fields['email']}\nPhone: {$fields['phone']}\n\n{$fields['message']}";
        return mail($recipient, 'AI Site CMS component lab request', $body,
            ['From' => $sender, 'Content-Type' => 'text/plain; charset=UTF-8']);
    }
);
http_response_code($result['http']);
echo json_encode(['code' => $result['code'], 'message' => $result['message'], 'errors' => $result['errors']],
    JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
