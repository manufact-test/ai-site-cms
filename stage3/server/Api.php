<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use InvalidArgumentException;
use JsonException;
use Throwable;

final class Api
{
    public function __construct(private SiteRepository $sites) {}

    private static function response(int $status, array $body): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        exit;
    }

    private static function request(): array
    {
        if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
            self::response(415, ['error' => 'JSON required']);
        }
        $stream = fopen('php://input', 'rb');
        $json = stream_get_contents($stream, 750001);
        fclose($stream);
        if ($json === false || strlen($json) > 750000) {
            self::response(413, ['error' => 'Request too large']);
        }
        $body = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($body) || preg_match('/^\\s*\\{/', $json) !== 1) {
            self::response(400, ['error' => 'Expected JSON object']);
        }
        return $body;
    }

    private static function requireOrigin(): void
    {
        // JSON requests plus strict same-origin / CSRF validation. No CORS.
        $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
        $host = $_SERVER['HTTP_HOST'] ?? '';
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        if ($origin !== null && $origin !== $scheme . '://' . $host) {
            self::response(403, ['error' => 'Cross-origin request forbidden']);
        }
        if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
            self::response(403, ['error' => 'Cross-site request forbidden']);
        }
    }

    private static function authenticated(): void
    {
        if (($_SESSION['stage3_owner'] ?? false) !== true) {
            self::response(401, ['error' => 'Sign in required']);
        }
    }

    private static function csrf(): void
    {
        $client = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($client) || !isset($_SESSION['stage3_csrf'])
            || !hash_equals($_SESSION['stage3_csrf'], $client)) {
            self::response(403, ['error' => 'Invalid CSRF token']);
        }
    }

    private static function revision(mixed $n): int
    {
        if (!is_int($n) || $n < 1 || $n > 1000000000) {
            throw new InvalidArgumentException('Expected positive revision');
        }
        return $n;
    }

    private static function siteId(string $id): void
    {
        if (preg_match('/^[a-z][a-z0-9-]{2,79}$/D', $id) !== 1) {
            throw new InvalidArgumentException('Invalid site ID');
        }
    }

    public function handle(): never
    {
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: no-referrer');
        header('X-Frame-Options: DENY');
        header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
        $path = is_string($uri) ? $uri : '/';

        // Authorised, isolated server-backed Studio shares the verified offline
        // first-party editor bundle. Never exposes PHP sources or local DB files.
        if ($method === 'GET' && $path === '/studio') {
            $html = file_get_contents(__DIR__ . '/../studio/index.html');
            if ($html === false) {
                self::response(503, ['error' => 'Studio unavailable']);
            }
            $html = str_replace('<html lang="ru">',
                '<html lang="ru" data-stage3-mode="server">', $html);
            // Offline index is connect-src none. Relax only SAME-ORIGIN in hosted mode.
            $html = str_replace("connect-src 'none'", "connect-src 'self'", $html);
            $html = str_replace('</head>',
                '<link rel="stylesheet" href="/hosted.css">' .
                '<script src="/hosted.js" defer></script></head>', $html);
            header("Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
            header('Content-Type: text/html; charset=utf-8');
            echo $html;
            exit;
        }
        $assets = [
            '/studio.css' => ['studio.css', 'text/css; charset=utf-8'],
            '/bundle.js' => ['bundle.js', 'text/javascript; charset=utf-8'],
            '/hosted.js' => ['hosted.js', 'text/javascript; charset=utf-8'],
            '/hosted.css' => ['hosted.css', 'text/css; charset=utf-8']
        ];
        if ($method === 'GET' && isset($assets[$path])) {
            [$file, $type] = $assets[$path];
            $data = file_get_contents(__DIR__ . '/../studio/' . $file);
            if ($data === false) {
                self::response(503, ['error' => 'Studio asset unavailable']);
            }
            header('Content-Type: ' . $type);
            header("Content-Security-Policy: default-src 'none'");
            echo $data;
            exit;
        }
        if ($method === 'GET' && preg_match('~^/published/([a-z][a-z0-9-]{2,79})/assets/([a-z][a-z0-9-]{2,79})\.(png|jpg|webp)$~D', $path, $assetMatch)) {
            try {
                $image = $this->sites->publishedImage($assetMatch[1], $assetMatch[2], $assetMatch[3]);
                header('Content-Type: ' . $image['mime']);
                header('ETag: "' . $image['sha256'] . '"');
                header("Content-Security-Policy: default-src 'none'; sandbox");
                echo $image['bytes'];
                exit;
            } catch (NotFound $e) {
                http_response_code(404);
                echo 'Not found';
                exit;
            }
        }
        if (preg_match('~^/published/([a-z][a-z0-9-]{2,79})(/.*)$~D', $path, $match) && $method === 'GET') {
            try {
                $published = $this->sites->published($match[1]);
                $html = PublicRenderer::html($published['site'], $match[2], null, null, $published['version']);
                if ($html === null) {
                    http_response_code(404);
                    echo 'Not found';
                    exit;
                }
                header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
                header('Content-Type: text/html; charset=utf-8');
                echo $html;
                exit;
            } catch (NotFound $e) {
                http_response_code(404);
                echo 'Not found';
                exit;
            }
        }
        if ($method === 'POST' && preg_match('~^/forms/([a-z][a-z0-9-]{2,79})/([a-z][a-z0-9-]{2,79})$~D', $path, $formMatch)) {
            FormGateway::respond($this->sites, $formMatch[1], $formMatch[2]);
        }
        if (!str_starts_with($path, '/api/')) {
            self::response(404, ['error' => 'Unknown endpoint']);
        }
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.cookie_samesite', 'Strict');
        if ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')) {
            ini_set('session.cookie_secure', '1');
        }
        session_start();
        try {
            if ($path === '/api/session' && $method === 'GET') {
                self::response(200, ['authenticated' => ($_SESSION['stage3_owner'] ?? false) === true,
                    'csrfToken' => ($_SESSION['stage3_owner'] ?? false) === true ? $_SESSION['stage3_csrf'] : null]);
            }
            if ($method !== 'GET') {
                self::requireOrigin();
            }
            if ($path === '/api/login' && $method === 'POST') {
                $body = self::request();
                $user = $body['username'] ?? null;
                $pass = $body['password'] ?? null;
                $fails = (int)($_SESSION['stage3_login_fails'] ?? 0);
                if ($fails >= 5) {
                    self::response(429, ['error' => 'Too many attempts this session']);
                }
                if (!is_string($user) || !is_string($pass) || !$this->sites->authenticate($user, $pass)) {
                    $_SESSION['stage3_login_fails'] = $fails + 1;
                    self::response(401, ['error' => 'Invalid credentials']);
                }
                session_regenerate_id(true);
                $_SESSION['stage3_owner'] = true;
                $_SESSION['stage3_csrf'] = bin2hex(random_bytes(32));
                unset($_SESSION['stage3_login_fails']);
                self::response(200, ['authenticated' => true, 'csrfToken' => $_SESSION['stage3_csrf']]);
            }
            self::authenticated();
            if ($method === 'GET' && preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})/media/([a-z][a-z0-9-]{2,79})$~D', $path, $mediaMatch)) {
                $draft = $this->sites->getDraft($mediaMatch[1]);
                if (!in_array($mediaMatch[2], array_column($draft['site']['assets'], 'id'), true)) {
                    throw new NotFound('Image is not in current draft');
                }
                $image = $this->sites->image($mediaMatch[1], $mediaMatch[2]);
                header('Content-Type: ' . $image['mime']);
                header("Content-Security-Policy: default-src 'none'; sandbox");
                echo $image['bytes'];
                exit;
            }
            if ($path === '/api/sites' && $method === 'GET') {
                self::response(200, ['sites' => $this->sites->listSites()]);
            }
            if ($method === 'POST') {
                self::csrf();
                $body = self::request();
                if ($path === '/api/logout') {
                    $_SESSION = [];
                    session_regenerate_id(true);
                    self::response(200, ['authenticated' => false]);
                }
                if ($path === '/api/sites') {
                    self::response(201, $this->sites->createSite($body['site'] ?? []));
                }
            }
            if (preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})/notifications(?:/(seen))?$~D', $path, $alertMatch)) {
                if ($method === 'GET' && !isset($alertMatch[2])) {
                    self::response(200, $this->sites->notificationSummary($alertMatch[1]));
                }
                if ($method === 'POST' && isset($alertMatch[2])) {
                    self::response(200, $this->sites->markNotificationsSeen($alertMatch[1]));
                }
            }
            if (preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})/submissions(?:/(lead-[0-9a-f]{24})/review)?$~D', $path, $inboxMatch)) {
                if ($method === 'GET' && !isset($inboxMatch[2])) {
                    self::response(200, ['submissions' => $this->sites->submissions($inboxMatch[1])]);
                }
                if ($method === 'POST' && isset($inboxMatch[2])) {
                    $this->sites->reviewSubmission($inboxMatch[1], $inboxMatch[2]);
                    self::response(200, ['status' => 'reviewed']);
                }
            }
            if (preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})(?:/(revisions|restore|save|publish|media))?$~D', $path, $matches)) {
                $id = $matches[1];
                $action = $matches[2] ?? '';
                if ($method === 'GET' && $action === '') {
                    self::response(200, $this->sites->getDraft($id));
                }
                if ($method === 'GET' && $action === 'revisions') {
                    self::response(200, ['revisions' => $this->sites->history($id)]);
                }
                if ($method === 'POST') {
                    if ($action === 'media') {
                        $base64 = $body['base64'] ?? null;
                        $alt = $body['alt'] ?? null;
                        if (!is_string($base64) || !is_string($alt)) {
                            throw new InvalidArgumentException('Image content and description required');
                        }
                        self::response(201, $this->sites->uploadImage($id, $base64, $alt,
                            self::revision($body['expectedRevision'] ?? null)));
                    }
                    if ($action === 'save') {
                        self::response(200, $this->sites->save($id, $body['site'] ?? [],
                            self::revision($body['expectedRevision'] ?? null)));
                    }
                    if ($action === 'restore') {
                        self::response(200, $this->sites->restore($id,
                            self::revision($body['targetRevision'] ?? null),
                            self::revision($body['expectedRevision'] ?? null)));
                    }
                    if ($action === 'publish') {
                        self::response(200, $this->sites->publish($id,
                            self::revision($body['expectedRevision'] ?? null)));
                    }
                }
            }
            self::response(404, ['error' => 'Unknown endpoint']);
        } catch (Conflict $e) {
            self::response(409, ['error' => $e->getMessage()]);
        } catch (NotFound $e) {
            self::response(404, ['error' => $e->getMessage()]);
        } catch (InvalidArgumentException $e) {
            self::response(422, ['error' => $e->getMessage()]);
        } catch (JsonException $e) {
            self::response(400, ['error' => 'Invalid JSON']);
        } catch (Throwable $e) {
            error_log('Stage3 API internal error: ' . get_class($e));
            self::response(500, ['error' => 'Internal error']);
        }
    }
}
