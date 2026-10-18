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

\AiSiteCms\HttpKernel::create()->run();
