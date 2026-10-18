<?php
declare(strict_types=1);

namespace AiSiteCms;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\App;
use Slim\Factory\AppFactory;

/**
 * Stage 2 empty CMS bootstrap. This is NOT an authenticated editor or public release.
 * No mutable routes exist until the authentication and authorization boundary is built.
 */
final class HttpKernel
{
    public static function create(): App
    {
        $app = AppFactory::create();

        // Intentionally static, non-sensitive and read-only. No versions, filesystem paths,
        // database diagnostics, API tokens or environment configuration in responses.
        $app->get('/api/health', static function (
            ServerRequestInterface $request,
            ResponseInterface $response
        ): ResponseInterface {
            $response->getBody()->write('{"status":"ok"}');

            return $response
                ->withHeader('Content-Type', 'application/json; charset=utf-8')
                ->withHeader('Cache-Control', 'no-store')
                ->withHeader('X-Content-Type-Options', 'nosniff');
        });

        $app->addRoutingMiddleware();
        $app->addErrorMiddleware(false, true, false);

        return $app;
    }
}
