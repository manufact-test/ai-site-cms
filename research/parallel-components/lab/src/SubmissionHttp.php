<?php
declare(strict_types=1);
require_once __DIR__ . '/FormLab.php';
require_once __DIR__ . '/OriginPolicy.php';
require_once __DIR__ . '/PhoneAdapter.php';
require_once __DIR__ . '/SharedThrottle.php';
require_once __DIR__ . '/ReceiptLedger.php';
require_once __DIR__ . '/SubmissionBoundary.php';

/** Research-only shared POST decision engine. No header/output/exit or session bootstrap. */
final class SubmissionHttp
{
    private static function result(int $http, string $code, string $message, array $errors = [], array $submitted = []): array
    {
        return ['http' => $http, 'code' => $code, 'message' => $message,
            'errors' => $errors, 'submitted' => $submitted];
    }

    /** Only public fields may cross to JSON, never raw POST, CSRF or transport fields. */
    public static function jsonFields(array $decision): array
    {
        return ['code' => $decision['code'], 'message' => $decision['message'],
            'errors' => $decision['errors']];
    }

    /**
     * $config is trusted operator configuration, not request-controlled. $transport is test-only injection.
     * @return array{http:int,code:string,message:string,errors:array,submitted:array}
     */
    public static function process(array $server, string $raw, array &$session, int $now,
        ?array $config = null, ?callable $transport = null): array
    {
        if (($server['REQUEST_METHOD'] ?? '') !== 'POST') {
            return self::result(405, 'METHOD_NOT_ALLOWED', 'Use POST');
        }
        $type = strtolower(trim(explode(';', (string)($server['CONTENT_TYPE'] ?? ''))[0]));
        $declared = $server['CONTENT_LENGTH'] ?? null;
        if ($type !== 'application/x-www-form-urlencoded' || strlen($raw) > 8192
            || ($declared !== null && (!is_scalar($declared)
                || !preg_match('/^[0-9]{1,10}$/D', (string)$declared)
                || (int)$declared !== strlen($raw)))) {
            return self::result(415, 'UNSUPPORTED_REQUEST', 'Неподдерживаемый формат или размер запроса.');
        }
        $env = static fn(string $key): ?string => $config !== null
            ? (isset($config[$key]) && is_string($config[$key]) ? $config[$key] : null)
            : (($value = getenv($key)) !== false ? $value : null);
        $origin = OriginPolicy::evaluate($server['HTTP_ORIGIN'] ?? null,
            $env('LAB_PUBLIC_ORIGIN'), $server['HTTP_HOST'] ?? null, $server['HTTP_SEC_FETCH_SITE'] ?? null);
        if ($origin !== 'ALLOW') {
            return self::result($origin === 'ORIGIN_CONFIGURATION_REQUIRED' ? 503 : 403,
                $origin, 'Проверка источника запроса не пройдена. Заявка не отправлена.');
        }
        $boundary = SubmissionBoundary::decode($raw);
        if ($boundary['code'] !== 'OK') {
            return self::result(422, 'MALFORMED_FORM', 'Некорректные поля запроса. Заявка не отправлена.');
        }
        $submitted = $boundary['fields'];
        // An optional phone may be blank, but never silently accept a forged country field.
        $region = $submitted['phone_region'];
        // A form country selector is a closed enum. Do not trust only ISO syntax:
        // UNKNOWN two-letter regions must not become browser-editable state.
        if (!is_string($region) || !in_array($region, ['ZZ', 'DE', 'PL', 'GB', 'US', 'FR'], true)) {
            return self::result(422, 'VALIDATION_ERROR',
                'Проверьте поля формы.', ['phone_region' => 'Укажите корректную страну номера.'], $submitted);
        }
        // A trusted private autoloader is optional; callers cannot specify it in POST data.
        $autoload = $env('LAB_PHONE_AUTOLOAD');
        if (is_string($autoload) && $autoload !== '') {
            $path = realpath($autoload);
            $public = realpath(__DIR__ . '/../public');
            if ($path === false || !is_file($path) || $public === false
                || str_starts_with($path, $public . DIRECTORY_SEPARATOR)) {
                return self::result(503, 'PHONE_VALIDATOR_REQUIRED', 'Телефонный модуль не подключён.');
            }
            require_once $path;
        }
        $recipient = $env('LAB_FORM_RECIPIENT_EMAIL');
        $sender = $env('LAB_FORM_SENDER_EMAIL');
        if (is_string($recipient) && $recipient !== '') {
            try {
                $gate = new SharedThrottle($env('LAB_ABUSE_DIR') ?? '',
                    $env('LAB_ABUSE_SECRET') ?? '', __DIR__ . '/../public');
                $allowed = $gate->allow((string)($server['REMOTE_ADDR'] ?? ''), $now);
            } catch (Throwable) {
                $allowed = null;
            }
            if ($allowed !== true) {
                $code = $allowed === null ? 'ANTI_SPAM_CONFIGURATION_REQUIRED' : 'RATE_LIMITED';
                return self::result($allowed === null ? 503 : 429, $code,
                    'Защита формы не разрешила отправку. Заявка не отправлена.');
            }
        }
        $claim = null;
        if (is_string($recipient) && $recipient !== '') {
            try {
                $ledger = new ReceiptLedger($env('LAB_ABUSE_DIR') ?? '',
                    $env('LAB_ABUSE_SECRET') ?? '', __DIR__ . '/../public');
                $claim = static fn(string $to, array $fields): string => $ledger->claim($to, $fields, $now);
            } catch (Throwable) {
                return self::result(503, 'RECEIPT_STORE_CONFIGURATION_REQUIRED',
                    'Защита от повторной отправки не настроена. Заявка не отправлена.');
            }
        }
        $region = is_string($submitted['phone_region'] ?? null) ? $submitted['phone_region'] : 'ZZ';
        $validatePhone = PhoneAdapter::available()
            ? static fn(string $phone): ?string => PhoneAdapter::normalize($phone, $region)
            : null;
        $deliver = $transport ?? static function (string $to, array $fields) use ($sender): bool {
            if (!is_string($sender) || !filter_var($sender, FILTER_VALIDATE_EMAIL)
                || preg_match('/[\r\n]/', $sender)) return false;
            $body = "Name: {$fields['name']}\nEmail: {$fields['email']}\nPhone: {$fields['phone']}\n\n{$fields['message']}";
            return mail($to, 'AI Site CMS component lab request', $body,
                ['From' => $sender, 'Content-Type' => 'text/plain; charset=UTF-8']);
        };
        $decision = FormLab::submit($submitted, $session, $now, $recipient, $deliver,
            $validatePhone, $claim);
        return self::result($decision['http'], $decision['code'], $decision['message'],
            $decision['errors'], $submitted);
    }
}
