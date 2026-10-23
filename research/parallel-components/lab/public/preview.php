<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/PreviewLab.php';

// Read-only fixed research scenario. Never parse request parameters as patches.
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    exit;
}
if (($_SERVER['QUERY_STRING'] ?? '') !== '') {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'PREVIEW_PARAMETERS_NOT_ACCEPTED';
    exit;
}
$fixture = json_decode(file_get_contents(__DIR__ . '/../../fixtures/visual-revision-candidates.research.json'),
    true, 512, JSON_THROW_ON_ERROR);
$result = PreviewLab::render($fixture, [
    'blockId' => 'hero-primary',
    'expectedRevision' => 7,
    'changes' => ['content.heading' => 'Безопасный предпросмотр промышленного сайта'],
], 'example.test');
if ($result['code'] !== 'PREVIEW_ONLY') {
    http_response_code(503);
    header('Cache-Control: no-store');
    header('Content-Type: text/plain; charset=utf-8');
    echo 'PREVIEW_UNAVAILABLE';
    exit;
}
$html = $result['html'];
// Exact CSP style hash: only the typed, server-rendered CSS is admitted. No unsafe-inline.
if (preg_match('~<style>([^<]*)</style>~D', $html, $match) !== 1) {
    http_response_code(503);
    header('Cache-Control: no-store');
    exit;
}
$styleHash = base64_encode(hash('sha256', $match[1], true));
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; style-src 'sha256-$styleHash'; img-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
header('Content-Type: text/html; charset=utf-8');
?><!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Typed hero preview — isolated research</title></head>
<body><main><h1>Предпросмотр существующего блока — лаборатория</h1><p>Без редакторских записей, без загрузки внешних ресурсов и без JavaScript.</p>
<?= $html ?>
<p>Этот результат нельзя публиковать на реальном сайте как готовый редактор.</p><p><a href="/">Вернуться к лаборатории</a></p>
</main></body></html>
