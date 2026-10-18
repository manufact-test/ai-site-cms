<?php
declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use AiSiteCms\HttpKernel;
use Slim\Psr7\Factory\ServerRequestFactory;

$app = HttpKernel::create();
$factory = new ServerRequestFactory();
$checks = 0;

function ensure(bool $ok, string $why): void
{
    global $checks;
    $checks++;
    if (!$ok) {
        fwrite(STDERR, "FAILED: " . $why . PHP_EOL);
        exit(1);
    }
}

$health = $app->handle($factory->createServerRequest('GET', '/api/health'));
ensure($health->getStatusCode() === 200, 'read-only health status');
ensure(($health->getHeaderLine('Content-Type')) === 'application/json; charset=utf-8', 'health JSON type');
ensure(json_decode((string) $health->getBody(), true) === ['status' => 'ok'], 'minimal health payload');
ensure($health->getHeaderLine('Cache-Control') === 'no-store', 'no caching');
ensure($health->getHeaderLine('X-Content-Type-Options') === 'nosniff', 'content-type protection');

foreach ([
    ['POST', '/api/publish'],
    ['PUT', '/api/draft'],
    ['DELETE', '/api/revisions/1'],
    ['GET', '/api/admin'],
    ['GET', '/admin'],
] as [$method, $path]) {
    $response = $app->handle($factory->createServerRequest($method, $path));
    ensure($response->getStatusCode() === 404, $method . ' ' . $path . ' must remain unregistered');
}

echo "Stage2 empty-kernel smoke PASS: {$checks} checks" . PHP_EOL;
