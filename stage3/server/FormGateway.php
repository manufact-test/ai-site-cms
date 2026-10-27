<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use InvalidArgumentException;

/**
 * Independent public HTML POST collector. No owner login, JSON API, CORS,
 * external mail provider or executable user markup. Can run at a separate
 * origin if the published site origin is explicitly allowlisted.
 */
final class FormGateway
{
    public static function secret(): string
    {
        $key = getenv('STAGE3_FORM_SECRET');
        if (!is_string($key) || strlen($key) < 32) {
            throw new \RuntimeException('Explicit STAGE3_FORM_SECRET (32+ chars) required for public forms');
        }
        return $key;
    }

    public static function token(string $siteId, string $sectionId, int $version): string
    {
        return hash_hmac('sha256', $siteId . '|' . $sectionId . '|' . $version, self::secret());
    }

    public static function endpoint(string $base, string $siteId, string $sectionId): string
    {
        if ($base !== '' && !preg_match('~^https://[a-z0-9.-]+(?::443)?$|^http://(?:localhost|127\.0\.0\.1)(?::[0-9]{2,5})?$~iD', $base)) {
            throw new InvalidArgumentException('Collector origin must be HTTPS (or loopback for tests)');
        }
        return $base . '/forms/' . $siteId . '/' . $sectionId;
    }

    public static function respond(SiteRepository $sites, string $siteId, string $sectionId): never
    {
        header('Content-Type: text/html; charset=utf-8');
        header('Content-Security-Policy: default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'; frame-ancestors \'none\'');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        $message = 'Запрос не принят. Проверьте поля формы.';
        $status = 422;
        try {
            $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            $ours = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '');
            $allow = array_filter(array_map('trim', explode(',', (string)(getenv('STAGE3_FORM_ORIGINS') ?: ''))));
            // Modern browsers can omit Origin for top-level form navigation.
            // Fetch Metadata's same-origin signal is browser-controlled and
            // distinguishes those navigations from foreign-origin posts.
            $sameOriginNavigation = ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'same-origin';
            if (!$sameOriginNavigation
                && (!is_string($origin) || ($origin !== $ours && !in_array($origin, $allow, true)))) {
                throw new InvalidArgumentException('Origin not allowed');
            }
            if (!str_starts_with(strtolower((string)($_SERVER['CONTENT_TYPE'] ?? '')), 'application/x-www-form-urlencoded')) {
                throw new InvalidArgumentException('Expected form-encoded body');
            }
            $size = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
            if ($size < 1 || $size > 12000) {
                throw new InvalidArgumentException('Invalid form size');
            }
            $fields = $_POST;
            foreach ($fields as $value) {
                if (!is_string($value)) {
                    throw new InvalidArgumentException('Invalid form field');
                }
            }
            $release = filter_var($fields['_release'] ?? '', FILTER_VALIDATE_INT);
            if ($release === false || $release < 1) {
                throw new InvalidArgumentException('Invalid form release');
            }
            if ($sites->operationsState($siteId)['enabled']) {
                $message='Сайт временно на обслуживании. Попробуйте отправить заявку позже.';
                $status=503;
            } else {
                $submissionId=$sites->collectSubmission($siteId, $sectionId, $release, $fields,
                    (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), self::secret());
                $sites->dispatchSubmissionDeliveries($siteId,$submissionId);
                $message = 'Спасибо! Ваша заявка сохранена.';
                $status = 201;
            }
        } catch (Conflict $e) {
            $message = 'Слишком много обращений. Попробуйте позднее.';
            $status = 429;
        } catch (\Throwable $e) {
            // Unknown forms, disallowed origin and bad tokens never reveal internals.
            error_log('Stage3 form declined: ' . get_class($e));
            if (!($e instanceof InvalidArgumentException) && !($e instanceof NotFound)) {
                try { $sites->recordIncident($siteId,'collector_failure'); } catch (\Throwable $ignored) {}
                $message='Сервис обращений временно недоступен.';
                $status=503;
            }
        }
        http_response_code($status);
        echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Обращение</title><style>body{font:18px/1.5 system-ui,sans-serif;max-width:660px;margin:12vh auto;padding:24px;color:#17324d}main{border:1px solid #dde5ef;padding:30px;border-radius:12px}</style></head><body><main><h1>Обращение</h1><p>'
            . htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8')
            . '</p></main></body></html>';
        exit;
    }
}
