<?php
declare(strict_types=1);

/** Small no-script HTML fallback view. All POST decisions stay in submit.php. */
final class NoJsResult
{
    private const FIELDS = ['name', 'email', 'phone', 'message'];
    private const ERROR_FIELDS = ['name', 'email', 'phone', 'message', 'phone_region'];
    private static function esc(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /** @param array<string,mixed> $out validated JSON endpoint response
     *  @param array<string,mixed> $submitted decoded raw parameters, NEVER PHP's normalized $_POST
     */
    public static function page(array $out, array $submitted = []): string
    {
        $code = is_string($out['code'] ?? null) && preg_match('/^[A-Z_]{1,48}$/D', $out['code'])
            ? $out['code'] : 'UNKNOWN_RESPONSE';
        $message = is_string($out['message'] ?? null) ? $out['message'] : 'Статус запроса неизвестен.';
        $message = self::esc($message);
        $retry = in_array($code, ['VALIDATION_ERROR', 'TOO_FAST'], true);
        $errors = $retry && is_array($out['errors'] ?? null) ? $out['errors'] : [];
        $verifiedErrors = [];
        foreach (self::ERROR_FIELDS as $field) {
            if (is_string($errors[$field] ?? null)) $verifiedErrors[$field] = self::esc($errors[$field]);
        }
        $html = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ответ формы — исследовательская лаборатория</title></head><body>'
            . '<main><h1>Результат отправки</h1><p role="status"><strong>' . self::esc($code) . '</strong>: ' . $message . '</p>';
        if ($verifiedErrors !== []) {
            $html .= '<div role="alert" aria-labelledby="errors-heading"><h2 id="errors-heading">Исправьте ошибки</h2><ul>';
            foreach ($verifiedErrors as $field => $text) {
                $html .= '<li><a href="#field-' . $field . '">' . $text . '</a></li>';
            }
            $html .= '</ul></div>';
        }
        if ($retry && is_string($submitted['csrf'] ?? null)
            && preg_match('/^[a-f0-9]{64}$/D', $submitted['csrf'])) {
            $html .= '<form action="/submit-html.php" method="post" accept-charset="UTF-8">'
                . '<input type="hidden" name="csrf" value="' . self::esc($submitted['csrf']) . '">'
                . '<div hidden aria-hidden="true"><label>Сайт компании<input name="company_site" tabindex="-1" autocomplete="off" value=""></label></div>';
            $labels = ['name'=>'Имя','email'=>'Email','phone'=>'Телефон (необязательно)','message'=>'Сообщение'];
            $firstError = array_key_first($verifiedErrors);
            foreach (self::FIELDS as $field) {
                $value = is_string($submitted[$field] ?? null) ? self::esc($submitted[$field]) : '';
                $error = $verifiedErrors[$field] ?? '';
                $attrs = $error !== '' ? ' aria-invalid="true" aria-describedby="error-' . $field . '"' : '';
                $attrs .= $field === $firstError ? ' autofocus' : '';
                $html .= '<p><label for="field-' . $field . '">' . $labels[$field] . '</label>';
                if ($field === 'message') {
                    $html .= '<textarea id="field-message" name="message" required minlength="10"' . $attrs . '>' . $value . '</textarea>';
                } else {
                    $type = $field === 'email' ? 'email' : ($field === 'phone' ? 'tel' : 'text');
                    $required = in_array($field, ['name','email'], true) ? ' required' : '';
                    // Native maxlength counts UTF-16 units, but PHP enforces Unicode code points for name.
                    $max = $field === 'email' ? ' maxlength="254"' : ($field === 'phone' ? ' maxlength="40"' : '');
                    $html .= '<input id="field-' . $field . '" name="' . $field . '" type="' . $type
                        . '"' . $max . $required . $attrs . ' value="' . $value . '">';
                }
                if ($error !== '') $html .= '<small id="error-' . $field . '">' . $error . '</small>';
                $html .= '</p>';
            }
            $region = $submitted['phone_region'] ?? 'ZZ';
            $regionError = $verifiedErrors['phone_region'] ?? '';
            $regionAttrs = $regionError !== '' ? ' aria-invalid="true" aria-describedby="error-phone_region"' : '';
            $regionAttrs .= $firstError === 'phone_region' ? ' autofocus' : '';
            $html .= '<p><label for="field-phone_region">Страна номера</label><select id="field-phone_region" name="phone_region"' . $regionAttrs . '>';
            foreach (['ZZ'=>'Международный +…','DE'=>'Германия','PL'=>'Польша','GB'=>'Великобритания','US'=>'США','FR'=>'Франция'] as $key=>$label) {
                $html .= '<option value="' . $key . '"' . ($region === $key ? ' selected' : '') . '>' . $label . '</option>';
            }
            $html .= '</select>';
            if ($regionError !== '') $html .= '<small id="error-phone_region">' . $regionError . '</small>';
            $html .= '</p><button type="submit">Повторить после исправления</button></form>';
        } else {
            $html .= '<p>Автоматическая повторная отправка недоступна. Перед новой попыткой проверьте статус заявки.</p>';
        }
        return $html . '<p><a href="/">Открыть новую форму</a></p></main></body></html>';
    }
}
