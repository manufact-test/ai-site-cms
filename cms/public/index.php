<?php
declare(strict_types=1);

// Deploy the whole application outside the webroot; point the document root at
// this public/ directory. This bootstrap NEVER includes a client site's code.
$autoload = dirname(__DIR__) . '/vendor/autoload.php';
if (!is_file($autoload)) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo '{"error":"service_unavailable"}';
    exit;
}

require $autoload;

// Explicit Stage2 CI-only mode, not a production policy. When requested,
// reject incomplete or cross-site installations BEFORE returning HTTP health.
// Unknown mode values fail closed; legacy lab smoke without the opt-in is unchanged.
$gateMode = getenv('CMS_STAGE2_RUNTIME_GATE');
if ($gateMode !== false && $gateMode !== '') {
    $readiness = $gateMode === 'ci-bound'
        ? \AiSiteCms\Hosting\LabInstanceBinding::fromProcess(dirname(__DIR__))
        : \AiSiteCms\Hosting\EmptyCmsStartupReadiness::fromProcess(dirname(__DIR__));
    if (!$readiness['ready']) {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        echo '{"error":"service_unavailable"}';
        exit;
    }
}

\AiSiteCms\HttpKernel::create()->run();
