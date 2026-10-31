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

    /**
     * Confirm the optional return destination against the exact PUBLISHED
     * form's page, and the browser's allowed site origin. A form value is
     * never sufficient authority for an arbitrary outbound link/redirect.
     * Without an explicitly authored success page the visitor chooses to go back.
     */
    private static function returnPage(
        SiteRepository $sites,string $siteId,string $sectionId,int $release,
        string $requested,string $ours,?string $origin,array $allowed
    ): string {
        if($requested===''||strlen($requested)>260||strpbrk($requested,"\r\n\t")!==false)return '';
        $published=$sites->publishedVersion($siteId,$release);
        $routes=[];
        foreach($published['pages'] as $page) {
            foreach($page['sections'] as $section) {
                if($section['id']===$sectionId&&
                    in_array($section['component'],['lead-form','lead-form-flex'],true)
                    && (!isset($section['designGraph']) || DesignGraph::formSlotIds($section['designGraph'])!==[]))
                    $routes[]=$page['path'];
            }
        }
        if($routes===[])return '';
        if(str_starts_with($requested,'/')) {
            if(str_starts_with($requested,'//')||($origin!==null&&$origin!==$ours))return '';
            foreach($routes as $path)
                if($requested==='/published/'.$siteId.$path)return $requested;
            return '';
        }
        $parts=parse_url($requested);
        if(!is_array($parts)||!isset($parts['scheme'],$parts['host'],$parts['path'])
            ||isset($parts['user'])||isset($parts['pass'])||isset($parts['query'])
            ||isset($parts['fragment'])||!in_array($parts['scheme'],['https','http'],true))
            return '';
        $target=$parts['scheme'].'://'.$parts['host'].
            (isset($parts['port'])?':'.$parts['port']:'');
        if($parts['scheme']==='http'&&$target!==$ours)return '';
        if($target!==$ours&&!in_array($target,$allowed,true))return '';
        foreach($routes as $path)
            if($parts['path']===$path||
                $parts['path']==='/published/'.$siteId.$path)return $requested;
        return '';
    }

    /** Optional POST/Redirect/GET to a real authored page, never a caller URL.
     * The validated _return identifies the exact published form origin/mount;
     * it cannot choose the destination, which comes only from the immutable
     * published section's successPageId. If anything drifts, keep the proven
     * collector receipt instead of redirecting to a guessed site.
     */
    private static function successTarget(array $site,string $sectionId,string $returnTarget,
        ?string $origin,string $ours): string
    {
        if($returnTarget==='')return '';
        $targetId=null;
        foreach($site['pages'] as $page)foreach($page['sections'] as $section)
            if($section['id']===$sectionId){$targetId=$section['successPageId']??null;break 2;}
        if(!is_string($targetId))return '';
        $successPath=null;
        foreach($site['pages'] as $page)
            if($page['id']===$targetId){$successPath=$page['path'];break;}
        if($successPath===null)return '';
        if(str_starts_with($returnTarget,'/')) {
            if($origin!==null&&$origin!==$ours)return '';
            $requestedPath=$returnTarget;
            $base='';
        }else{
            $parts=parse_url($returnTarget);
            if(!is_array($parts)||!isset($parts['scheme'],$parts['host'],$parts['path']))return '';
            $base=$parts['scheme'].'://'.$parts['host'].
                (isset($parts['port'])?':'.$parts['port']:'');
            if(($origin??$ours)!==$base)return '';
            $requestedPath=$parts['path'];
        }
        $siteId=$site['siteId'];
        $prefix='/published/'.$siteId;
        $mount=str_starts_with($requestedPath,$prefix.'/')?$prefix:'';
        return $base.$mount.$successPath;
    }

    /** Immutable published site's language controls the no-script response. */
    private static function copy(string $language,string $key): string
    {
        $messages=[
            'ru'=>['invalid'=>'Запрос не принят. Проверьте поля формы.','maintenance'=>'Сайт временно на обслуживании. Попробуйте отправить заявку позже.','success'=>'Спасибо! Ваша заявка сохранена.','limit'=>'Слишком много обращений. Попробуйте позднее.','error'=>'Сервис обращений временно недоступен.','title'=>'Обращение','back'=>'Вернуться на сайт'],
            'en'=>['invalid'=>'Your request was not accepted. Check the form fields.','maintenance'=>'The website is temporarily under maintenance. Please try again later.','success'=>'Thank you! Your request has been saved.','limit'=>'Too many requests. Please try again later.','error'=>'The contact service is temporarily unavailable.','title'=>'Your request','back'=>'Return to website'],
            'pl'=>['invalid'=>'Nie przyjęto zgłoszenia. Sprawdź pola formularza.','maintenance'=>'Strona jest chwilowo niedostępna. Spróbuj ponownie później.','success'=>'Dziękujemy! Twoje zgłoszenie zostało zapisane.','limit'=>'Zbyt wiele zgłoszeń. Spróbuj ponownie później.','error'=>'Formularz kontaktowy jest chwilowo niedostępny.','title'=>'Zgłoszenie','back'=>'Wróć do strony'],
            'de'=>['invalid'=>'Die Anfrage wurde nicht angenommen. Bitte prüfen Sie die Formularfelder.','maintenance'=>'Die Website wird vorübergehend gewartet. Bitte versuchen Sie es später erneut.','success'=>'Vielen Dank! Ihre Anfrage wurde gespeichert.','limit'=>'Zu viele Anfragen. Bitte versuchen Sie es später erneut.','error'=>'Der Kontaktservice ist vorübergehend nicht verfügbar.','title'=>'Ihre Anfrage','back'=>'Zurück zur Website'],
            'be'=>['invalid'=>'Запыт не прыняты. Праверце палі формы.','maintenance'=>'Сайт часова на абслугоўванні. Паспрабуйце пазней.','success'=>'Дзякуй! Ваша заяўка захавана.','limit'=>'Занадта шмат зваротаў. Паспрабуйце пазней.','error'=>'Сэрвіс зваротаў часова недаступны.','title'=>'Зварот','back'=>'Вярнуцца на сайт'],
            'uk'=>['invalid'=>'Запит не прийнято. Перевірте поля форми.','maintenance'=>'Сайт тимчасово на обслуговуванні. Спробуйте пізніше.','success'=>'Дякуємо! Вашу заявку збережено.','limit'=>'Забагато звернень. Спробуйте пізніше.','error'=>'Сервіс звернень тимчасово недоступний.','title'=>'Звернення','back'=>'Повернутися на сайт']
        ];
        return $messages[$language][$key]??$messages['ru'][$key];
    }

    public static function respond(SiteRepository $sites, string $siteId, string $sectionId): never
    {
        header('Content-Type: text/html; charset=utf-8');
        header('Content-Security-Policy: default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'; frame-ancestors \'none\'');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        $language='ru';
        $messageKey='invalid';
        $status = 422;
        $returnTarget='';
        $successTarget='';
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
            $returnRequest=(string)($fields['_return']??'');
            unset($fields['_return']); // never saved into private lead records
            $release = filter_var($fields['_release'] ?? '', FILTER_VALIDATE_INT);
            if ($release === false || $release < 1) {
                throw new InvalidArgumentException('Invalid form release');
            }
            $published=$sites->publishedVersion($siteId,(int)$release);
            if(in_array($published['language']??'ru',['ru','en','pl','de','be','uk'],true))
                $language=$published['language']??'ru';
            if ($sites->operationsState($siteId)['enabled']) {
                $messageKey='maintenance';
                $status=503;
            } else {
                $submissionId=$sites->collectSubmission($siteId, $sectionId, $release, $fields,
                    (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), self::secret());
                $sites->dispatchSubmissionDeliveries($siteId,$submissionId);
                try {
                    $returnTarget=self::returnPage($sites,$siteId,$sectionId,(int)$release,
                        $returnRequest,$ours,$origin,$allow);
                    $successTarget=self::successTarget($published,$sectionId,$returnTarget,$origin,$ours);
                    if($successTarget!==''){
                        // An old open form may still save a legitimate lead after a
                        // newer publication. Never send it to an obsolete page
                        // whose deployment/revision can no longer be assumed.
                        $current=$sites->published($siteId);
                        if($current['version']!==(int)$release)$successTarget='';
                    }
                }catch(\Throwable $ignored){$returnTarget='';$successTarget='';}
                $messageKey='success';
                $status = 201;
            }
        } catch (Conflict $e) {
            $messageKey='limit';
            $status = 429;
        } catch (\Throwable $e) {
            // Unknown forms, disallowed origin and bad tokens never reveal internals.
            error_log('Stage3 form declined: ' . get_class($e));
            if (!($e instanceof InvalidArgumentException) && !($e instanceof NotFound)) {
                try { $sites->recordIncident($siteId,'collector_failure'); } catch (\Throwable $ignored) {}
                $messageKey='error';
                $status=503;
            }
        }
        http_response_code($status);
        if($status===201&&$successTarget!==''){
            header('Location: '.$successTarget,true,303);
            header('Referrer-Policy: no-referrer');
            exit;
        }
        $title=self::copy($language,'title');
        $message=self::copy($language,$messageKey);
        echo '<!doctype html><html lang="'.$language.'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.$title.'</title><style>body{font:18px/1.5 system-ui,sans-serif;max-width:660px;margin:12vh auto;padding:24px;color:#17324d}main{border:1px solid #dde5ef;padding:30px;border-radius:12px}</style></head><body><main><h1>'.$title.'</h1><p>'
            . htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8')
            . '</p>'
            . ($status===201&&$returnTarget!==''?
                '<p><a href="'.htmlspecialchars($returnTarget,ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5,'UTF-8').
                '" rel="noopener noreferrer">'.self::copy($language,'back').'</a></p>':'')
            . '</main></body></html>';
        exit;
    }
}
