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
// Owner-scoped LiteSpeed/Apache routing proof. This exact non-file URL
// succeeds only if the web server dispatched it to THIS public front controller.
// It does not attest filesystem isolation, DB credentials, CMS install or safety.
// Owner-approved non-secret marker lookup in the CMS test site's designated
// sibling folder. No recursive scans, directory listings or cross-site paths.
// This proves only that PHP can read one known file outside THIS public_html,
// NOT isolation from other hosting users, actual private CMS install or DB.
// Exact non-webroot package location; NO package PHP is loaded or executed.
// SHA-256 is installation-completeness evidence, not authenticated publisher trust.
/**
 * Read-only bounded integrity check. NOT a signed release/production attestation.
 * Deliberately shares the complete package inventory between its evidence
 * endpoint and the separate health-only real-kernel exercise.
 * @return array{state:string,count:int,root:string}
 */
function stage2InspectUnsignedOffwebPackage(): array {
    $state='absent'; $count=0;
    $parent=realpath(dirname(__DIR__)); $web=realpath(__DIR__);
    $root=$parent===false?'':$parent.'/cms-stage2-offweb-runtime';
    $actual=$root===''?false:realpath($root);
    if ($parent!==false && $actual!==false) {
        $state='incomplete';
        $manifestFile=$root.'/private/package-manifest.json';
        if ($actual===$root && !is_link($root) && is_dir($root)
            && $web!==false && realpath((string)($_SERVER['DOCUMENT_ROOT']??''))===$web
            && realpath((string)($_SERVER['SCRIPT_FILENAME']??''))===realpath(__FILE__)
            && $actual!==$web && !str_starts_with($actual,$web.'/')
            && !str_starts_with($web,$actual.'/')
            && !is_link($manifestFile) && realpath($manifestFile)===$manifestFile
            && is_file($manifestFile) && @filesize($manifestFile)<=250000
            && @filesize($manifestFile)>=100) {
            $data=json_decode((string)@file_get_contents($manifestFile),true,16);
            if (is_array($data)
                && ($data['format']??null)==='ai-site-cms-internal-stage2-v2'
                && ($data['documentRoot']??null)==='public'
                && ($data['stage']??null)===2
                && ($data['productionReady']??null)===false
                && ($data['isSigned']??null)===false
                && ($data['writeEndpointsAvailable']??null)===false
                && is_array($data['files']??null)
                && count($data['files'])>=20 && count($data['files'])<=1200) {
                $ok=true; $total=0; $seen=[];
                foreach ($data['files'] as $record) {
                    if (!is_array($record)||!is_string($record['path']??null)
                        ||!is_int($record['bytes']??null)
                        ||!is_string($record['sha256']??null)) {$ok=false;break;}
                    $rel=$record['path'];
                    if (strlen($rel)>512||!preg_match('~\A[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*\z~D',$rel)
                        ||in_array('..',explode('/',$rel),true)
                        ||in_array('.',explode('/',$rel),true)
                        ||isset($seen[$rel])||$record['bytes']<0
                        ||$record['bytes']>8388608
                        ||!preg_match('/\A[a-f0-9]{64}\z/D',$record['sha256'])) {$ok=false;break;}
                    $seen[$rel]=true; $total+=$record['bytes'];
                    if ($total>180000000) {$ok=false;break;}
                    $f=$root.'/'.$rel; $stat=@lstat($f);
                    if ($stat===false||!is_file($f)||is_link($f)
                        ||realpath($f)!==$f||$stat['size']!==$record['bytes']
                        ||($stat['nlink']??0)!==1
                        ||!hash_equals($record['sha256'],(string)@hash_file('sha256',$f))) {
                        $ok=false;break;
                    }
                    $count++;
                }
                foreach (['public/index.php','public/.htaccess','vendor/autoload.php',
                    'private/editor/editor.js'] as $required) {
                    if (!isset($seen[$required]))$ok=false;
                }
                if ($ok)$state='verified_unsigned_package';
            }
        }
    }
    return ['state'=>$state,'count'=>$count,'root'=>$root];
}
if ($path === '/__stage2/offweb-package') {
    $offweb=stage2InspectUnsignedOffwebPackage();
    $found=$offweb['state']==='verified_unsigned_package';
    http_response_code($found?200:503);
    echo json_encode([
        'format'=>'ai-site-cms-stage2-offweb-package-observation-v1',
        'probeRevision'=>'stage2-target-host-check-20261020-r6',
        'state'=>$offweb['state'],'offwebPackageIntegrityVerified'=>$found,
        'verifiedFiles'=>$found?$offweb['count']:0,
        'signatureVerified'=>false,'phpFromPackageExecuted'=>false,
        'databaseConnected'=>false,'cmsInstalled'=>false,
        'peerAccountIsolationVerified'=>false,'productionReady'=>false,
        'stage2Accepted'=>false
    ],JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES);
    exit;
}
// This is NOT the site's CMS front controller and must never become one.
// Only the fixed synthetic GET /api/health route is invoked in memory.
// The package must be fully checked before ANY vendor PHP is loaded.
// No request data, proxy headers, DB secrets or client site settings passed in.
if ($path === '/__stage2/kernel/smoke') {
    $offweb=stage2InspectUnsignedOffwebPackage();
    $ready=$offweb['state']==='verified_unsigned_package';
    $kernelExecuted=false;
    if ($ready) {
        try {
            $root=$offweb['root'];
            require_once $root.'/vendor/autoload.php';
            $app=\AiSiteCms\HttpKernel::create();
            $factory=new \Slim\Psr7\Factory\ServerRequestFactory();
            $request=$factory->createServerRequest('GET','/api/health');
            $response=$app->handle($request);
            $body=(string)$response->getBody();
            $kernelExecuted=$response->getStatusCode()===200
                && $body==='{"status":"ok"}'
                && str_contains(strtolower($response->getHeaderLine('content-type')),'application/json');
        } catch (\Throwable $ignored) {
            $kernelExecuted=false;
        }
    }
    $ok=$ready && $kernelExecuted;
    http_response_code($ok?200:503);
    if (!$ok) header('Retry-After: 60');
    echo json_encode([
        'format'=>'ai-site-cms-stage2-live-kernel-smoke-v1',
        'probeRevision'=>'stage2-target-host-check-20261020-r6',
        'result'=>$ok?'health_only_pass':'not_ready',
        'fullyHashedUnsignedPackage'=>$ready,
        'realSlimKernelHealthPassed'=>$ok,
        'testOnly'=>true,'signedRelease'=>false,
        'schemaInitialized'=>false,'publicCmsActivated'=>false,
        'stage2Accepted'=>false
    ], JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES);
    exit;
}
if ($path === '/__stage2/private-boundary') {
    $siteParent = realpath(dirname(__DIR__));
    $privatePath = $siteParent === false ? '' : $siteParent . '/cms-stage2-private-boundary';
    $actualPrivate = $privatePath === '' ? false : realpath($privatePath);
    $markerFile = $privatePath . '/probe.json';
    $expected = '{"format":"ai-site-cms-stage2-private-boundary-marker-v1","purpose":"test-only-no-code-no-secrets","deploymentFolder":"cms-stage2-private-boundary"}' . chr(10);
    $found = $siteParent !== false
        && $actualPrivate === $privatePath
        && !is_link($privatePath)
        && is_file($markerFile) && !is_link($markerFile)
        && @filesize($markerFile) === strlen($expected)
        && @file_get_contents($markerFile) === $expected;
    http_response_code($found ? 200 : 503);
    echo json_encode([
        'format' => 'ai-site-cms-stage2-private-boundary-observation-v1',
        'probeRevision' => 'stage2-target-host-check-20261020-r6',
        'outsideThisPublicRootMarkerObserved' => $found,
        'cmsInstalled' => false,
        'privateCmsCodeInstalled' => false,
        'peerAccountIsolationVerified' => false,
        'databaseConnected' => false,
        'stage2Accepted' => false
    ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
    exit;
}
if ($path === '/__stage2/rewrite/proof') {
    $actualScript = realpath((string) ($_SERVER['SCRIPT_FILENAME'] ?? ''));
    $publicRoot = realpath(__DIR__);
    $documentRoot = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''));
    $mapped = $actualScript !== false && $actualScript === realpath(__FILE__)
        && $publicRoot !== false && $documentRoot === $publicRoot;
    http_response_code($mapped ? 200 : 503);
    echo json_encode([
        'format' => 'ai-site-cms-stage2-routing-observation-v1',
        'probeRevision' => 'stage2-target-host-check-20261020-r6',
        'exactNonFileRoute' => true,
        'frontControllerMapped' => $mapped,
        'installationReady' => false,
        'privateStorageVerified' => false,
        'databaseConnected' => false,
        'stage2Accepted' => false
    ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
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
    'probeRevision' => 'stage2-target-host-check-20261020-r6',
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
