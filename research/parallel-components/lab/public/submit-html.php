<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/NoJsResult.php';

// A native browser form accepts HTML, while lab JS explicitly requests JSON.
// Both paths run the identical strict submit.php security/validation/receipt/transport chain.
$accept = $_SERVER['HTTP_ACCEPT'] ?? '';
$wantHtml = is_string($accept) && preg_match('~(?:^|,)\s*text/html\s*(?:;|,|$)~i', $accept) === 1;
if ($wantHtml) {
    ob_start();
    register_shutdown_function(static function (): void {
        $json = ob_get_clean();
        $data = is_string($json) ? json_decode($json, true) : null;
        if (!is_array($data)) $data = ['code'=>'UNKNOWN_RESPONSE', 'message'=>'Статус запроса неизвестен.'];
        $fields = isset($GLOBALS['submitted']) && is_array($GLOBALS['submitted']) ? $GLOBALS['submitted'] : [];
        header('Content-Type: text/html; charset=utf-8');
        header("Content-Security-Policy: default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store');
        echo NoJsResult::page($data, $fields);
    });
}
require __DIR__ . '/submit.php';
