<?php
declare(strict_types=1);

/*
 * PUBLIC, CREDENTIAL-FREE HOST PREFLIGHT ONLY.
 * This is not an installed CMS or an authentication / database health check.
 * Deploy ONLY to the two owner-authorized Stage2 test sites.
 * Never put the private CMS vendor, passwords or release package in public_html.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Referrer-Policy: no-referrer');
header('Content-Security-Policy: default-src \'none\'; base-uri \'none\'; frame-ancestors \'none\'');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo '{"error":"method_not_allowed"}';
    exit;
}

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH);
if (!is_string($path) || strlen($path) > 200) {
    http_response_code(404);
    echo '{"error":"not_found"}';
    exit;
}
if ($path === '/api/health') {
    http_response_code(503);
    header('Retry-After: 60');
    echo '{"status":"not_installed","stage2Accepted":false}';
    exit;
}
if ($path !== '/' && $path !== '/__stage2/host') {
    http_response_code(404);
    echo '{"error":"not_found"}';
    exit;
}
if ($path === '/') {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>AI Site CMS — Host preflight only</title><main><h1>AI Site CMS</h1><p>Stage 2 Hostinger PHP preflight, NOT an installed CMS.</p><p>Use <code>/__stage2/host</code> to inspect non-sensitive runtime capabilities.</p></main></html>';
    exit;
}
$documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
$canonicalRoot = is_string($documentRoot) ? realpath($documentRoot) : false;
$scriptDir = realpath(__DIR__);
$webSapi = in_array(PHP_SAPI, ['fpm-fcgi', 'cgi-fcgi', 'apache2handler'], true);

$privateParent = realpath(dirname(__DIR__));
$privateParentUsable = is_string($privateParent) && $privateParent !== $scriptDir
    && is_dir($privateParent) && is_readable($privateParent);

$report = [
    'probeRevision' => 'stage2-target-host-check-20261020-r1',
    'observationOnly' => true,
    'phpVersionMajorMinor' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION,
    'phpSapi' => PHP_SAPI,
    'format' => 'ai-site-cms-stage2-target-php-preflight-v1',
    'purpose' => 'readonly_public_php_environment_observation_only',
    'stage2Accepted' => false,
    'stage3Authorized' => false,
    'productionReady' => false,
    'cmsInstalled' => false,
    'databaseConnectionAttempted' => false,
    'privateFilesystemVerified' => false,
    'cmsVisitorOutageTested' => false,
    'requirements' => [
        'php81OrLater' => version_compare(PHP_VERSION, '8.1.0', '>='),
        'json' => extension_loaded('json'),
        'pdo' => extension_loaded('pdo'),
        'pdoMysql' => extension_loaded('pdo_mysql')
            && in_array('mysql', PDO::getAvailableDrivers(), true),
        'openssl' => extension_loaded('openssl'),
        'sodium' => extension_loaded('sodium'),
        'webSapi' => $webSapi,
        'documentRootMatchesPublicEntrypoint' => $canonicalRoot !== false
            && $scriptDir !== false
            && $canonicalRoot === $scriptDir,
        'privateParentExistsAndReadable' => $privateParentUsable,
        'privateParentAppearsWritable' => $privateParentUsable && is_writable($privateParent),
        'httpsVisibleToPhp' => ($_SERVER['HTTPS'] ?? '') === 'on'
            || ($_SERVER['SERVER_PORT'] ?? '') === '443'
    ]
];
echo json_encode($report, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
