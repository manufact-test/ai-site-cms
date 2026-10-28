<?php
declare(strict_types=1);
/**
 * Independent visitor router: the whole CMS, credentials and database are absent.
 * Set web document root to this public/ directory. This is NOT a CMS admin endpoint.
 */
$release = dirname(__DIR__) . '/data';
$manifest = json_decode((string)file_get_contents($release.'/release-manifest.json'), true, 512, JSON_THROW_ON_ERROR);
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Cache-Control: public, max-age=60');
if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET','HEAD'], true)) {
    http_response_code(405);
    header('Allow: GET, HEAD');
    exit;
}
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH);
if (!is_string($path) || preg_match('/%(?:2e|2f|5c|00)/i', $path)
    || str_contains($path, '\\') || str_contains($path, "\0")) {
    http_response_code(400);
    exit;
}
// Diagnostic-only release identity for offline/remote manual verification.
// This does not imply that an external deployment is connected or healthy.
if ($path === '/_cms-connect.json') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
    if (($_SERVER['REQUEST_METHOD']??'GET') !== 'HEAD') {
        echo json_encode(['format'=>'manufact-ai-site-connection-v1',
            'siteId'=>$manifest['siteId'],'publishedVersion'=>$manifest['publishedVersion'],
            'sourceRevision'=>$manifest['sourceRevision'],
            'releaseManifestSha256'=>hash_file('sha256',$release.'/release-manifest.json')],
            JSON_THROW_ON_ERROR);
    }
    exit;
}
if ($path === '/robots.txt' || $path === '/sitemap.xml') {
    $name = ltrim($path, '/');
    if (!isset($manifest['searchFiles'][$name])) { http_response_code(404); exit; }
    header('Content-Type: '.($name === 'robots.txt' ? 'text/plain' : 'application/xml').'; charset=utf-8');
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') readfile($release.'/'.$name);
    exit;
}
if (preg_match('~^/assets/([a-z][a-z0-9-]{2,79}\.(png|jpg|webp|mp4))$~D', $path, $match)) {
    $allowed = false;
    foreach ($manifest['assets'] as $asset) {
        if ($asset['file'] === 'assets/'.$match[1]) { $allowed = true; break; }
    }
    if (!$allowed) { http_response_code(404); exit; }
    $mime = ['png'=>'image/png','jpg'=>'image/jpeg','webp'=>'image/webp','mp4'=>'video/mp4'][$match[2]];
    header('Content-Type: '.$mime);
    header('Cache-Control: public, max-age=31536000, immutable');
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') readfile($release.'/assets/'.$match[1]);
    exit;
}
if ($path !== '/' && !preg_match('~^/(?:[a-z0-9-]+/)+$~D', $path)) {
    http_response_code(404);
    exit;
}
foreach ($manifest['redirects'] as $redirect) {
    if ($path === $redirect['from']) {
        // Targets were restricted to same-site paths by the bundle verifier.
        header('Location: '.$redirect['to'], true, 301);
        exit;
    }
}
foreach ($manifest['pages'] as $page) {
    if ($path === $page['path']) {
        header('Content-Type: text/html; charset=utf-8');
        if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') readfile($release.'/'.$page['file']);
        exit;
    }
}
http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') echo "Page not found\n";
