<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use InvalidArgumentException;
use JsonException;
use Throwable;

final class Api
{
    private ?array $auditContext = null;
    private string $auditDetail = '';
    public function __construct(private SiteRepository $sites) {}

    private function response(int $status, array $body): never
    {
        if ($this->auditContext !== null) {
            [$actor,$action,$siteId] = $this->auditContext;
            $this->auditContext = null; // no recursive logging if storage itself fails
            if ($siteId === null && isset($body['site']['siteId'])) $siteId = $body['site']['siteId'];
            $readOnlyPreview=$status<400 && str_ends_with($action,'/preview');
            if (!$readOnlyPreview && ($status >= 400 || !str_starts_with($action,'GET ') || str_ends_with($action,'/backup'))) {
                $this->sites->audit($actor,$action,$siteId,$status < 400 ? 'success' : 'denied', $this->auditDetail);
            }
        }
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($body, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        exit;
    }

    private function request(int $limit = 750000): array
    {
        if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
            $this->response(415, ['error' => 'JSON required']);
        }
        $stream = fopen('php://input', 'rb');
        $json = stream_get_contents($stream, $limit + 1);
        fclose($stream);
        if ($json === false || strlen($json) > $limit) {
            $this->response(413, ['error' => 'Request too large']);
        }
        $body = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($body) || preg_match('/^\\s*\\{/', $json) !== 1) {
            $this->response(400, ['error' => 'Expected JSON object']);
        }
        return $body;
    }

    private function requireOrigin(): void
    {
        // JSON requests plus strict same-origin / CSRF validation. No CORS.
        $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
        $host = $_SERVER['HTTP_HOST'] ?? '';
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        if ($origin !== null && $origin !== $scheme . '://' . $host) {
            $this->response(403, ['error' => 'Cross-origin request forbidden']);
        }
        if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
            $this->response(403, ['error' => 'Cross-site request forbidden']);
        }
    }

    private function authorize(array $principal, string $path, string $method): void
    {
        if ($principal['role'] === 'owner') return;
        if (in_array($path, ['/api/logout','/api/password'], true) && $method === 'POST') return;
        if ($path === '/api/sites' && $method === 'GET') return;
        if (!preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})(?:/(.*))?$~D', $path, $m)
            || !in_array($m[1], $principal['sites'], true)) {
            $this->response(403, ['error' => 'No permission for this operation or site']);
        }
        $action = $m[2] ?? '';
        if ($method === 'GET' && (in_array($action, ['', 'revisions','releases','templates','published-site'], true)
            || preg_match('~^media/[a-z][a-z0-9-]{2,79}$~D', $action))) return;
        if ($method === 'POST' && $action === 'preview') return;
        $edit = in_array($principal['role'], ['editor','publisher'], true);
        if ($edit && $method === 'GET' && (in_array($action, ['notifications','submissions','submissions/export'], true) || preg_match('~^submissions/lead-[0-9a-f]{24}/history$~D',$action))) return;
        if ($edit && $method === 'POST' &&
            preg_match('~^video-uploads/(?:start|video-[a-f0-9]{20}/(?:chunk|finish|cancel))$~D',$action)) return;
        if ($edit && $method === 'POST' && (in_array($action, ['save','restore','restore-release','media','video','templates','notifications/seen'], true)
            || preg_match('~^templates/template-[0-9a-f]{18}/delete$~D', $action)
            || preg_match('~^submissions/lead-[0-9a-f]{24}/review$~D', $action)
            || $action==='submissions/bulk-review'
            || $action==='submissions/bulk-workflow'
            || preg_match('~^submissions/lead-[0-9a-f]{24}/workflow$~D',$action))) return;
        if ($principal['role'] === 'publisher' && $method === 'POST' && $action === 'publish') return;
        $this->response(403, ['error' => 'Role does not allow this operation']);
    }

    private function csrf(): void
    {
        $client = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($client) || !isset($_SESSION['stage3_csrf'])
            || !hash_equals($_SESSION['stage3_csrf'], $client)) {
            $this->response(403, ['error' => 'Invalid CSRF token']);
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
                $this->response(503, ['error' => 'Studio unavailable']);
            }
            $html = str_replace('<html lang="ru">',
                '<html lang="ru" data-stage3-mode="server">', $html);
            // Offline index is connect-src none. Relax only SAME-ORIGIN in hosted mode.
            $html = str_replace("connect-src 'none'", "connect-src 'self'", $html);
            $html = str_replace('</head>',
                '<link rel="stylesheet" href="/hosted.css">' .
                '<script src="/media-motion-contract.js" defer></script>' .
                '<script src="/media-motion-sha256.js" defer></script>' .
                '<script src="/media-motion-engine.js" defer></script>' .
                '<script src="/hosted.js" defer></script><script src="/access.js" defer></script>' .
                '<script src="/media-processing.js" defer></script></head>', $html);
            header("Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
            header('Content-Type: text/html; charset=utf-8');
            echo $html;
            exit;
        }
        $assets = [
            '/studio.css' => ['studio.css', 'text/css; charset=utf-8'],
            '/bundle.js' => ['bundle.js', 'text/javascript; charset=utf-8'],
            '/hosted.js' => ['hosted.js', 'text/javascript; charset=utf-8'],
            '/access.js' => ['access.js', 'text/javascript; charset=utf-8'],
            '/hosted.css' => ['hosted.css', 'text/css; charset=utf-8'],
            '/media-processing.js' => ['media-processing.js', 'text/javascript; charset=utf-8']
        ];
        // Exact first-party Workbench files are exposed ONLY to the hosted
        // editor page as JavaScript resources, never as arbitrary file paths.
        $mediaScripts=[
            '/media-motion-contract.js'=>'lib/contract.cjs',
            '/media-motion-sha256.js'=>'lib/sha256.cjs',
            '/media-motion-engine.js'=>'workbench/engine.js'
        ];
        if ($method==='GET' && isset($mediaScripts[$path])) {
            $bytes=file_get_contents(__DIR__.'/../media-motion/'.$mediaScripts[$path]);
            if($bytes===false)$this->response(503,['error'=>'Media engine unavailable']);
            header('Content-Type: text/javascript; charset=utf-8');
            header("Content-Security-Policy: default-src 'none'");
            echo $bytes;exit;
        }
        if ($method === 'GET' && isset($assets[$path])) {
            [$file, $type] = $assets[$path];
            $data = file_get_contents(__DIR__ . '/../studio/' . $file);
            if ($data === false) {
                $this->response(503, ['error' => 'Studio asset unavailable']);
            }
            header('Content-Type: ' . $type);
            header("Content-Security-Policy: default-src 'none'");
            echo $data;
            exit;
        }
        if ($method === 'GET' && preg_match('~^/published/([a-z][a-z0-9-]{2,79})/assets/([a-z][a-z0-9-]{2,79})\.(png|jpg|webp|mp4)$~D', $path, $assetMatch)) {
            try {
                $image = $this->sites->publishedImage($assetMatch[1], $assetMatch[2], $assetMatch[3]);
                $etag='"'.$image['sha256'].'"';
                header('Content-Type: ' . $image['mime']);
                header('X-Content-Type-Options: nosniff');
                header('ETag: ' . $etag);
                // Media IDs point to immutable bytes across draft revisions and releases.
                header('Cache-Control: public, max-age=31536000, immutable');
                header('Vary: Accept-Encoding');
                header("Content-Security-Policy: default-src 'none'; sandbox");
                if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
                    http_response_code(304);exit;
                }
                if($image['mime']==='video/mp4'){
                    $size=strlen($image['bytes']);
                    header('Accept-Ranges: bytes');
                    $range=trim($_SERVER['HTTP_RANGE']??'');
                    if($range!==''){
                        if(!preg_match('/^bytes=(\d*)-(\d*)$/D',$range,$m)
                            ||($m[1]===''&&$m[2]==='')){
                            header('Content-Range: bytes */'.$size);http_response_code(416);exit;
                        }
                        if($m[1]===''){
                            $count=(int)$m[2];$start=max(0,$size-$count);$end=$size-1;
                        }else{
                            $start=(int)$m[1];$end=$m[2]===''?$size-1:min((int)$m[2],$size-1);
                        }
                        if($start>=$size||$end<$start){
                            header('Content-Range: bytes */'.$size);http_response_code(416);exit;
                        }
                        $piece=substr($image['bytes'],$start,$end-$start+1);
                        http_response_code(206);
                        header('Content-Range: bytes '.$start.'-'.$end.'/'.$size);
                        header('Content-Length: '.strlen($piece));echo $piece;exit;
                    }
                    header('Content-Length: '.$size);
                }
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
                $mount='/published/'.$match[1];
                $origin=PublicRenderer::origin(getenv('STAGE3_PUBLIC_ORIGIN')?:null);
                if (in_array($match[2],['/sitemap.xml','/robots.txt'],true)) {
                    if ($origin===null) {
                        $this->response(503,['error'=>'STAGE3_PUBLIC_ORIGIN required for public sitemap and robots']);
                    }
                    header('Content-Type: '.($match[2]==='/sitemap.xml'?'application/xml':'text/plain').'; charset=utf-8');
                    echo $match[2]==='/sitemap.xml'
                        ?PublicRenderer::sitemap($published['site'],$mount,$origin)
                        :PublicRenderer::robots($mount,$origin);
                    exit;
                }
                $redirect=PublicRenderer::redirectTarget($published['site'],$match[2]);
                if ($redirect!==null) {
                    header('Location: '.$mount.$redirect,true,301);
                    header('Content-Type: text/plain; charset=utf-8');
                    echo 'Page moved permanently';
                    exit;
                }
                $html = PublicRenderer::html($published['site'], $match[2], null, null, $published['version'], $origin);
                if ($html === null) {
                    http_response_code(404);
                    echo 'Not found';
                    exit;
                }
                header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; media-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
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
            $this->response(404, ['error' => 'Unknown endpoint']);
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
            $principal = $this->sites->sessionPrincipal(
                is_string($_SESSION['stage3_username'] ?? null) ? $_SESSION['stage3_username'] : '',
                (int)($_SESSION['stage3_auth_version'] ?? 0));
            if ($path === '/api/session' && $method === 'GET') {
                $this->response(200, ['authenticated' => $principal !== null,
                    'csrfToken' => $principal !== null ? ($_SESSION['stage3_csrf'] ?? null) : null,
                    'principal' => $principal]);
            }
            if ($method !== 'GET') {
                $this->requireOrigin();
            }
            if ($path === '/api/login' && $method === 'POST') {
                $body = $this->request();
                $user = $body['username'] ?? null;
                $pass = $body['password'] ?? null;
                $this->auditContext = [is_string($user) ? substr($user,0,40) : 'unknown', 'login', null];
                $fails = (int)($_SESSION['stage3_login_fails'] ?? 0);
                if ($fails >= 5) {
                    $this->response(429, ['error' => 'Too many attempts this session']);
                }
                if (!is_string($user) || !is_string($pass) || !$this->sites->authenticate($user, $pass)) {
                    $_SESSION['stage3_login_fails'] = $fails + 1;
                    $this->response(401, ['error' => 'Invalid credentials']);
                }
                session_regenerate_id(true);
                $principal = $this->sites->principal($user);
                $_SESSION['stage3_username'] = $principal['username'];
                $_SESSION['stage3_auth_version'] = $principal['authVersion'];
                $_SESSION['stage3_csrf'] = bin2hex(random_bytes(32));
                unset($_SESSION['stage3_login_fails']);
                $this->response(200, ['authenticated' => true, 'csrfToken' => $_SESSION['stage3_csrf'], 'principal' => $principal]);
            }
            if ($principal === null) $this->response(401, ['error' => 'Sign in required; account/session may have changed']);
            $siteScope = null;
            if (preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})(?:/|$)~', $path, $scope)) $siteScope = $scope[1];
            $this->auditContext = [$principal['username'], $method . ' ' . $path, $siteScope];
            $this->authorize($principal, $path, $method);
            if ($method === 'GET' && preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})/media/([a-z][a-z0-9-]{2,79})$~D', $path, $mediaMatch)) {
                $draft = $this->sites->getDraft($mediaMatch[1]);
                $ids = [];
                foreach ($draft['site']['assets'] as $asset) {
                    $ids[] = $asset['id'];
                    foreach ($asset['variants'] ?? [] as $v) $ids[] = $v['id'];
                }
                if (!in_array($mediaMatch[2], $ids, true)) {
                    throw new NotFound('Image is not in current draft');
                }
                $image = $this->sites->image($mediaMatch[1], $mediaMatch[2]);
                header('Content-Type: ' . $image['mime']);
                header("Content-Security-Policy: default-src 'none'; sandbox");
                echo $image['bytes'];
                exit;
            }
            if ($path === '/api/sites' && $method === 'GET') {
                $listed = $this->sites->listSites();
                if ($principal['role'] !== 'owner') $listed = array_values(array_filter($listed, static fn (array $r): bool => in_array($r['site_id'], $principal['sites'], true)));
                $this->response(200, ['sites' => $listed]);
            }
            if ($method === 'POST') {
                $this->csrf();
                $body = $this->request(in_array($path, ['/api/backups/plan','/api/backups/restore'], true)
                    ? SiteRepository::ARCHIVE_LIMIT
                    : (preg_match('~^/api/sites/[a-z][a-z0-9-]{2,79}/preview$~D',$path) ? 900000 : (preg_match('~^/api/sites/[a-z][a-z0-9-]{2,79}/media$~D', $path) ? 2600000 : (preg_match('~^/api/sites/[a-z][a-z0-9-]{2,79}/video$~D',$path)?2100000:750000))));
                if ($siteScope !== null && preg_match('~^/api/sites/[a-z][a-z0-9-]{2,79}/(?:save|restore|restore-release|publish|media|video|video-uploads(?:/.*)?|templates(?:/.*)?)$~D',$path)) {
                    $this->sites->assertLicenseWritable($siteScope);
                }
                if ($path === '/api/logout') {
                    $_SESSION = [];
                    session_regenerate_id(true);
                    $this->response(200, ['authenticated' => false]);
                }
                if ($path === '/api/sites') {
                    $this->response(201, $this->sites->createSite($body['site'] ?? []));
                }
                if (preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})/preview$~D',$path,$previewMatch)) {
                    $siteId=$previewMatch[1];
                    $candidate=$body['site']??null;
                    $pagePath=$body['path']??null;
                    if (!is_array($candidate)) throw new InvalidArgumentException('Preview site object required');
                    if (!is_string($pagePath)||$pagePath===''||strlen($pagePath)>240
                        ||$pagePath[0]!=='/'||str_starts_with($pagePath,'//')
                        ||str_contains($pagePath,'?')||str_contains($pagePath,'#')
                        ||str_contains($pagePath,'\\')||preg_match('/[\x00-\x20]/',$pagePath)) {
                        throw new InvalidArgumentException('Invalid preview page path');
                    }
                    $expectedRevision=self::revision($body['expectedRevision']??null);
                    $site=$this->sites->previewDraft($siteId,$candidate,$expectedRevision);
                    $mount='/published/'.rawurlencode($siteId);
                    $assetBase='/api/sites/'.rawurlencode($siteId).'/media';
                    $html=PublicRenderer::html($site,$pagePath,$mount,null,0,null,$assetBase,true);
                    if ($html===null) $this->response(404,['error'=>'Unknown preview page']);
                    $this->response(200,['html'=>$html,'path'=>$pagePath,
                        'revision'=>$expectedRevision,'published'=>false]);
                }
            }
            if ($path === '/api/password' && $method === 'POST') {
                if (!is_string($body['currentPassword'] ?? null) || !is_string($body['newPassword'] ?? null)) throw new InvalidArgumentException('Current and new passwords required');
                $this->sites->changePassword($principal['username'], $body['currentPassword'], $body['newPassword']);
                $_SESSION = []; session_regenerate_id(true);
                $this->response(200, ['authenticated' => false]);
            }
            if ($path === '/api/users' && $method === 'GET') {
                $this->response(200, ['users' => $this->sites->accounts()]);
            }
            if ($path === '/api/licenses' && $method === 'GET') {
                $this->response(200, ['licenses'=>$this->sites->allLicenses()]);
            }
            if ($path === '/api/audit' && $method === 'GET') {
                $filter = $_GET['siteId'] ?? null;
                if ($filter !== null && !is_string($filter)) throw new InvalidArgumentException('Invalid site filter');
                $this->response(200, ['events' => $this->sites->auditLog($filter)]);
            }
            if ($method === 'POST' && ($path === '/api/users' || preg_match('~^/api/users/([a-z][a-z0-9_-]{2,39})$~D', $path, $userMatch))) {
                $username = $path === '/api/users' ? ($body['username'] ?? null) : $userMatch[1];
                if (!is_string($username) || !is_string($body['role'] ?? null) || !is_array($body['sites'] ?? null)
                    || !is_string($body['reason'] ?? null) || trim($body['reason']) === '' || strlen($body['reason']) > 240
                    || preg_match('/[\x00-\x1f]/', $body['reason'])) throw new InvalidArgumentException('Username, role, sites and reason required');
                $this->auditDetail = 'Account ' . substr($username,0,40) . ': ' . $body['reason'];
                if ($path === '/api/users') {
                    if (!is_string($body['password'] ?? null)) throw new InvalidArgumentException('Password required');
                    $this->sites->createAccount($username,$body['password'],$body['role'],$body['sites']);
                    $this->response(201, ['created' => true]);
                }
                if (!is_bool($body['disabled'] ?? null)) throw new InvalidArgumentException('Disabled flag required');
                $this->sites->updateAccount($username,$body['role'],$body['disabled'],$body['sites'],self::revision($body['expectedVersion'] ?? null));
                $this->response(200, ['updated' => true]);
            }
            if ($method === 'POST' && preg_match('~^/api/licenses/([a-z][a-z0-9-]{2,79})(?:/(pause|resume))?$~D',$path,$lm)) {
                $reason=$body['reason']??null; $version=$body['expectedVersion']??null;
                if (!is_string($reason) || !is_int($version)) throw new InvalidArgumentException('Reason and licence version required');
                $op=$lm[2]??'details';
                if ($op==='details' && (!is_string($body['type']??null)
                    || !array_key_exists('reminderDate',$body)
                    || ($body['reminderDate']!==null && !is_string($body['reminderDate']))
                    || !is_string($body['domain']??null))) throw new InvalidArgumentException('Licence type, reminder and domain required');
                $this->auditDetail='Manual licence '.$op.': '.substr(trim($reason),0,240);
                $updated=$this->sites->changeLicense($lm[1],$principal['username'],$op,$version,$reason,
                    $body['type']??null,$body['reminderDate']??null,$body['domain']??null);
                $this->response(200,['license'=>$updated]);
            }
            if ($method === 'POST' && in_array($path, ['/api/backups/plan','/api/backups/restore'], true)) {
                $archive = $body['archive'] ?? null;
                $target = $body['targetSiteId'] ?? null;
                if (!is_array($archive) || !is_string($target)) throw new InvalidArgumentException('Archive and target site ID required');
                $digest = hash('sha256', json_encode([$target, $archive], JSON_THROW_ON_ERROR));
                if ($path === '/api/backups/plan') {
                    $plan = $this->sites->planArchive($archive, $target);
                    $token = bin2hex(random_bytes(32));
                    $_SESSION['stage3_archive_plan'] = ['digest' => $digest, 'token' => $token, 'expires' => time() + 900];
                    $this->response(200, ['plan' => $plan, 'confirmationToken' => $token]);
                }
                $pending = $_SESSION['stage3_archive_plan'] ?? [];
                if (($pending['expires'] ?? 0) < time() || !is_string($body['confirmationToken'] ?? null)
                    || !hash_equals($pending['token'] ?? '', $body['confirmationToken'])
                    || !hash_equals($pending['digest'] ?? '', $digest)) {
                    throw new Conflict('Check this exact archive and target before restoring; plan expired or changed');
                }
                $restored = $this->sites->importArchive($archive, $target);
                unset($_SESSION['stage3_archive_plan']);
                $this->response(201, $restored);
            }
            if (preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})/(backup|releases|restore-release)$~D', $path, $backupMatch)) {
                $id = $backupMatch[1]; $action = $backupMatch[2];
                if ($method === 'GET' && $action === 'backup') {
                    header('Content-Disposition: attachment; filename="' . $id . '-backup.json"');
                    $this->response(200, $this->sites->exportArchive($id));
                }
                if ($method === 'GET' && $action === 'releases') {
                    $this->response(200, ['releases' => $this->sites->publicationHistory($id)]);
                }
                if ($method === 'POST' && $action === 'restore-release') {
                    $this->response(200, $this->sites->save($id,
                        $this->sites->publishedVersion($id, self::revision($body['version'] ?? null)),
                        self::revision($body['expectedRevision'] ?? null)));
                }
            }
            if (preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})/templates(?:/(template-[0-9a-f]{18})/delete)?$~D', $path, $templateMatch)) {
                $siteId = $templateMatch[1];
                if ($method === 'GET' && !isset($templateMatch[2])) {
                    $this->response(200, ['templates' => $this->sites->sectionTemplates($siteId)]);
                }
                if ($method === 'POST' && isset($templateMatch[2])) {
                    $this->sites->removeSectionTemplate($siteId, $templateMatch[2]);
                    $this->response(200, ['deleted' => true]);
                }
                if ($method === 'POST' && !isset($templateMatch[2])) {
                    $name = $body['name'] ?? null;
                    $pageId = $body['pageId'] ?? null;
                    $sectionId = $body['sectionId'] ?? null;
                    if (!is_string($name) || !is_string($pageId) || !is_string($sectionId)) {
                        throw new InvalidArgumentException('Template name, page and section required');
                    }
                    $this->response(201, ['template' => $this->sites->storeSectionTemplate(
                        $siteId, $pageId, $sectionId, $name,
                        self::revision($body['expectedRevision'] ?? null)
                    )]);
                }
            }
            if (preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})/delivery(?:/(retry))?$~D',$path,$deliveryMatch)) {
                $siteId=$deliveryMatch[1];$operation=$deliveryMatch[2]??null;
                if($method==='GET'&&$operation===null)
                    $this->response(200,$this->sites->deliveryStatus($siteId));
                if($method==='POST'&&$operation===null){
                    if(!is_bool($body['emailEnabled']??null)||!is_string($body['emailRecipient']??null)
                        ||!is_bool($body['telegramEnabled']??null)||!is_string($body['telegramChatId']??null)
                        ||!is_int($body['expectedVersion']??null)||!is_string($body['reason']??null))
                        throw new InvalidArgumentException('Delivery channels, recipients, version and reason required');
                    $this->auditDetail='Notification delivery settings updated: '.substr(trim($body['reason']),0,180);
                    $result=$this->sites->saveDeliverySettings($siteId,$principal['username'],$body['expectedVersion'],
                        $body['emailEnabled'],$body['emailRecipient'],$body['telegramEnabled'],$body['telegramChatId'],$body['reason']);
                    $this->response(200,$result);
                }
                if($method==='POST'&&$operation==='retry'){
                    if(!is_string($body['reason']??null)||!is_bool($body['includeUncertain']??null))
                        throw new InvalidArgumentException('Retry reason and explicit uncertain-send choice required');
                    $this->auditDetail='Notification delivery retry: '.substr(trim($body['reason']),0,180);
                    $this->response(200,$this->sites->retryLeadDeliveries($siteId,$body['includeUncertain'],$body['reason']));
                }
            }
            if (preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})/notifications(?:/(seen))?$~D', $path, $alertMatch)) {
                if ($method === 'GET' && !isset($alertMatch[2])) {
                    $this->response(200, $this->sites->notificationSummary($alertMatch[1]));
                }
                if ($method === 'POST' && isset($alertMatch[2])) {
                    $this->response(200, $this->sites->markNotificationsSeen($alertMatch[1]));
                }
            }
            if (preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})/submissions(?:/(export|bulk-review|bulk-workflow|lead-[0-9a-f]{24}/(?:review|workflow|history)))?$~D', $path, $inboxMatch)) {
                $siteId=$inboxMatch[1];$operation=$inboxMatch[2]??'';
                if($method==='GET'&&in_array($operation,['','export'],true)){
                    $status=$_GET['status']??'all';$query=$_GET['q']??'';$priority=$_GET['priority']??'all';
                    if(!is_string($status)||!is_string($query)||!is_string($priority))
                        throw new InvalidArgumentException('Invalid inbox filters');
                    if($operation==='export'){
                        $csv=$this->sites->inboxCsv($siteId,$status,$query,$priority);
                        $this->sites->audit($principal['username'],'GET submissions/export',$siteId,'success','Private filtered CSV export');
                        $this->auditContext=null;
                        header('Content-Type: text/csv; charset=utf-8');
                        header('Content-Disposition: attachment; filename="'.$siteId.'-submissions.csv"');
                        header('Cache-Control: private, no-store, max-age=0');
                        header('X-Content-Type-Options: nosniff');
                        header("Content-Security-Policy: default-src 'none'; sandbox");
                        echo $csv;exit;
                    }
                    $rawPage=$_GET['page']??'1';
                    if(!is_string($rawPage)||preg_match('/^[1-9][0-9]{0,3}$/D',$rawPage)!==1)
                        throw new InvalidArgumentException('Invalid inbox page');
                    $this->response(200,$this->sites->inboxPage($siteId,$status,$query,(int)$rawPage,25,$priority));
                }
                if($method==='GET'&&preg_match('/^(lead-[0-9a-f]{24})\/history$/D',$operation,$leadMatch)){
                    $this->response(200,$this->sites->leadWorkflowHistory($siteId,$leadMatch[1]));
                }
                if($method==='POST'&&preg_match('/^(lead-[0-9a-f]{24})\/workflow$/D',$operation,$leadMatch)){
                    if(!is_string($body['status']??null)||!is_string($body['priority']??null)
                        ||!is_string($body['note']??null)||!is_int($body['expectedWorkflowRevision']??null))
                        throw new InvalidArgumentException('Typed lead workflow fields required');
                    $result=$this->sites->updateLeadWorkflow($siteId,$leadMatch[1],$principal['username'],
                        $body['status'],$body['priority'],$body['note'],$body['expectedWorkflowRevision']);
                    $this->auditDetail='Lead workflow changed '.($result['changed']?'yes':'no');
                    $this->response(200,$result);
                }
                if($method==='POST'&&$operation==='bulk-workflow'){
                    if(!is_array($body['items']??null)
                        ||!array_key_exists('status',$body)||!array_key_exists('priority',$body)
                        ||($body['status']!==null&&!is_string($body['status']))
                        ||($body['priority']!==null&&!is_string($body['priority'])))
                        throw new InvalidArgumentException('Typed bulk lead workflow fields required');
                    $result=$this->sites->bulkLeadWorkflow($siteId,$principal['username'],
                        $body['items'],$body['status'],$body['priority']);
                    $this->auditDetail='Lead workflow triage '.$result['changed'].'/'.$result['selected'];
                    $this->response(200,$result);
                }
                if($method==='POST'&&$operation==='bulk-review'){
                    $ids=$body['ids']??null;
                    if(!is_array($ids))throw new InvalidArgumentException('Lead IDs array required');
                    $result=$this->sites->bulkReviewSubmissions($siteId,$ids,$principal['username']);
                    $this->auditDetail='Bulk reviewed '.$result['reviewed'].' leads';
                    $this->response(200,$result);
                }
                if($method==='POST'&&preg_match('/^lead-[0-9a-f]{24}\/review$/D',$operation)){
                    $this->sites->reviewSubmission($siteId,substr($operation,0,29),$principal['username']);
                    $this->response(200,['status'=>'reviewed']);
                }
            }
            if($method==='POST' &&
                preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})/video-uploads/(start|video-[a-f0-9]{20}/(?:chunk|finish|cancel))$~D',$path,$vid)) {
                $siteId=$vid[1];$action=$vid[2];$actor=$principal['username'];
                if($action==='start'){
                    foreach(['alt','sha256'] as $key)
                        if(!is_string($body[$key]??null))
                            throw new InvalidArgumentException('Missing video upload label or digest');
                    foreach(['bytes','chunks'] as $key)
                        if(!is_int($body[$key]??null))
                            throw new InvalidArgumentException('Missing video upload byte/chunk count');
                    $this->response(201,$this->sites->beginVideoUpload($siteId,$actor,
                        self::revision($body['expectedRevision']??null),$body['alt'],
                        $body['bytes'],$body['sha256'],$body['chunks']));
                }
                [$uploadId,$operation]=explode('/',$action,2);
                if($operation==='chunk'){
                    if(!is_int($body['index']??null)||!is_string($body['base64']??null)
                        ||!is_string($body['sha256']??null))
                        throw new InvalidArgumentException('Invalid video chunk body');
                    $this->response(200,$this->sites->appendVideoChunk($siteId,$actor,$uploadId,
                        $body['index'],$body['base64'],$body['sha256']));
                }
                if($operation==='finish')
                    $this->response(201,$this->sites->finishVideoUpload($siteId,$actor,$uploadId));
                if($operation==='cancel')
                    $this->response(200,$this->sites->cancelVideoUpload($siteId,$actor,$uploadId));
            }
            if (preg_match('~^/api/sites/([a-z][a-z0-9-]{2,79})(?:/(revisions|restore|save|publish|media|video|published-site))?$~D', $path, $matches)) {
                $id = $matches[1];
                $action = $matches[2] ?? '';
                if ($method === 'GET' && $action === '') {
                    $this->response(200, $this->sites->getDraft($id));
                }
                // Authenticated read-only comparison source: immutable live release,
                // never a draft write, rollback or implicit publication.
                if ($method === 'GET' && $action === 'published-site') {
                    $this->response(200, $this->sites->published($id));
                }
                if ($method === 'GET' && $action === 'revisions') {
                    $this->response(200, ['revisions' => $this->sites->history($id)]);
                }
                if ($method === 'POST') {
                    if($action==='video'){
                        $base64=$body['base64']??null;$label=$body['alt']??null;$sha=$body['sha256']??null;
                        if(!is_string($base64)||!is_string($label)||
                            ($sha!==null&&!is_string($sha)))
                            throw new InvalidArgumentException('MP4 bytes, description and SHA256 required');
                        $this->response(201,$this->sites->uploadVideo($id,$base64,$label,
                            self::revision($body['expectedRevision']??null),$sha));
                    }
                    if ($action === 'media') {
                        $base64 = $body['base64'] ?? null;
                        $alt = $body['alt'] ?? null;
                        if (!is_string($base64) || !is_string($alt)) {
                            throw new InvalidArgumentException('Image content and description required');
                        }
                        if (isset($body['variants']) && !is_array($body['variants']))
                            throw new InvalidArgumentException('Invalid responsive variants');
                        $sha = $body['sha256'] ?? null;
                        if ($sha !== null && !is_string($sha)) throw new InvalidArgumentException('Invalid SHA256');
                        $this->response(201, $this->sites->uploadImage($id, $base64, $alt,
                            self::revision($body['expectedRevision'] ?? null), $body['variants'] ?? [], $sha));
                    }
                    if ($action === 'save') {
                        $this->response(200, $this->sites->save($id, $body['site'] ?? [],
                            self::revision($body['expectedRevision'] ?? null)));
                    }
                    if ($action === 'restore') {
                        $this->response(200, $this->sites->restore($id,
                            self::revision($body['targetRevision'] ?? null),
                            self::revision($body['expectedRevision'] ?? null)));
                    }
                    if ($action === 'publish') {
                        $this->response(200, $this->sites->publish($id,
                            self::revision($body['expectedRevision'] ?? null)));
                    }
                }
            }
            $this->response(404, ['error' => 'Unknown endpoint']);
        } catch (Conflict $e) {
            $this->response(409, ['error' => $e->getMessage()]);
        } catch (NotFound $e) {
            $this->response(404, ['error' => $e->getMessage()]);
        } catch (InvalidArgumentException $e) {
            $this->response(422, ['error' => $e->getMessage()]);
        } catch (JsonException $e) {
            $this->response(400, ['error' => 'Invalid JSON']);
        } catch (Throwable $e) {
            error_log('Stage3 API internal error: ' . get_class($e));
            $this->response(500, ['error' => 'Internal error']);
        }
    }
}
