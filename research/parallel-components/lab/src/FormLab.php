<?php
declare(strict_types=1);

/** Standalone research fixture, NOT a deployable production form service. */
final class FormLab
{
    public static function issueToken(array &$session, int $now): string
    {
        $token = bin2hex(random_bytes(32));
        $session['form_lab_token_hash'] = hash('sha256', $token);
        $session['form_lab_issued_at'] = $now;
        return $token;
    }

    private static function result(int $http, string $code, string $message, array $errors = []): array
    {
        return ['http' => $http, 'code' => $code, 'message' => $message, 'errors' => $errors];
    }

    private static function textLength(string $s): int
    {
        if (preg_match('//u', $s) !== 1) {
            return -1;
        }
        return preg_match_all('/./us', $s) ?: 0;
    }

    /**
     * Delivery callable: function(string $recipient, array $safeFields): bool.
     * A true return means ACCEPTED BY TRANSPORT, never final inbox delivery.
     * Phone validator returns canonical E.164 string or null; must use a region-aware implementation (not regex).
     * Session throttling is a demo layer only; production requires shared-IP/account throttles.
     */
    public static function submit(array $post, array &$session, int $now, ?string $recipient,
        callable $deliver, ?callable $phoneValidator = null, ?callable $claim = null): array
    {
        $attempts = array_values(array_filter($session['form_lab_attempts'] ?? [],
            static fn($at): bool => is_int($at) && $at > $now - 60));
        if (count($attempts) >= 5) {
            return self::result(429, 'RATE_LIMITED', 'Слишком много попыток. Повторите позже.');
        }
        $attempts[] = $now;
        $session['form_lab_attempts'] = $attempts;

        $supplied = is_string($post['csrf'] ?? null) ? $post['csrf'] : '';
        $expected = $session['form_lab_token_hash'] ?? null;
        $issued = $session['form_lab_issued_at'] ?? null;
        if (!is_string($expected) || !is_int($issued) || $issued > $now || $now - $issued > 1800
            || !preg_match('/^[0-9a-f]{64}$/D', $supplied)
            || !hash_equals($expected, hash('sha256', $supplied))) {
            return self::result(403, 'CSRF_INVALID', 'Сессия формы устарела. Обновите страницу.');
        }
        if (!is_string($post['company_site'] ?? null) || $post['company_site'] !== '') {
            return self::result(422, 'SPAM_REJECTED', 'Не удалось обработать запрос.');
        }
        if ($now - $issued < 2) {
            return self::result(422, 'TOO_FAST', 'Проверьте данные и повторите через несколько секунд.');
        }

        $fields = [];
        foreach (['name', 'email', 'phone', 'message'] as $key) {
            if (!is_string($post[$key] ?? null)) {
                return self::result(422, 'VALIDATION_ERROR', 'Проверьте поля формы.', [$key => 'Неверный тип поля.']);
            }
            $fields[$key] = trim($post[$key]);
        }
        $errors = [];
        $nameLen = self::textLength($fields['name']);
        if ($nameLen < 2 || $nameLen > 100) $errors['name'] = 'Имя: от 2 до 100 символов.';
        if (strlen($fields['email']) > 254 || !filter_var($fields['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Введите корректный адрес email.';
        }
        $messageLen = self::textLength($fields['message']);
        if ($messageLen < 10 || $messageLen > 2000) $errors['message'] = 'Сообщение: от 10 до 2000 символов.';
        if (strlen($fields['phone']) > 40 || self::textLength($fields['phone']) < 0) {
            $errors['phone'] = 'Некорректный формат телефона.';
        }
        if ($errors !== []) return self::result(422, 'VALIDATION_ERROR', 'Проверьте поля формы.', $errors);

        if ($fields['phone'] !== '' && $phoneValidator === null) {
            return self::result(503, 'PHONE_VALIDATOR_REQUIRED',
                'Проверка международного телефона не настроена. Можно отправить форму без телефона.');
        }
        if ($fields['phone'] !== '') {
            try {
                $canonicalPhone = $phoneValidator($fields['phone']);
            } catch (Throwable) {
                return self::result(503, 'PHONE_VALIDATOR_REQUIRED',
                    'Серверная проверка телефонного номера временно недоступна. Заявка не отправлена.');
            }
            if (!is_string($canonicalPhone) || preg_match('/^\+[1-9][0-9]{1,14}$/D', $canonicalPhone) !== 1) {
                return self::result(422, 'VALIDATION_ERROR', 'Проверьте поля формы.',
                    ['phone' => 'Номер телефона не прошёл международную проверку.']);
            }
            $fields['phone'] = $canonicalPhone;
        }
        if ($recipient === null || filter_var($recipient, FILTER_VALIDATE_EMAIL) === false
            || preg_match('/[\r\n]/', $recipient)) {
            return self::result(503, 'CONFIGURATION_REQUIRED',
                'Отправка не настроена: получатель отсутствует. Заявка не отправлена.');
        }

        // Caller supplies a private, persistent duplicate-claim fence in configured HTTP deployments.
        // It does not assert external delivery. Plain unit tests may omit the fence explicitly.
        if ($claim !== null) {
            try {
                $decision = $claim($recipient, $fields);
            } catch (Throwable) {
                $decision = 'RECEIPT_STORE_UNAVAILABLE';
            }
            if ($decision !== 'CLAIMED') {
                if ($decision === 'DUPLICATE_REQUEST') {
                    unset($session['form_lab_token_hash'], $session['form_lab_issued_at']);
                    return self::result(409, 'DUPLICATE_REQUEST',
                        'Похожая заявка уже обрабатывалась. Новая отправка не выполнена.');
                }
                return self::result(503, 'RECEIPT_STORE_UNAVAILABLE',
                    'Защита от повторной отправки недоступна. Заявка не отправлена.');
            }
        }
        // Single-use token before transport call, including transport failure; prevents duplicate sends.
        unset($session['form_lab_token_hash'], $session['form_lab_issued_at']);
        try {
            $accepted = $deliver($recipient, $fields);
        } catch (Throwable $exception) {
            // A transport exception might occur AFTER the external service accepted the request.
            // Never claim rejection, never retry automatically and never leak the exception.
            return self::result(502, 'DELIVERY_UNCONFIRMED',
                'Не удалось установить результат доставки. Не отправляйте повторно автоматически. Обновите форму после проверки статуса.');
        }
        if ($accepted !== true) {
            return self::result(502, 'DELIVERY_FAILED',
                'Сервис приёма не подтвердил запрос. Отправка не подтверждена. Обновите форму перед повтором.');
        }
        return self::result(202, 'QUEUED_UNCONFIRMED',
            'Почтовый транспорт принял запрос. Фактическая доставка в ящик ещё не подтверждена.');
    }
}
