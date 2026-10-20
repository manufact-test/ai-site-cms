<?php
declare(strict_types=1);

/** Strict research-only x-www-form-urlencoded boundary, before PHP's permissive post parser. */
final class SubmissionBoundary
{
    private const KEYS = ['csrf', 'company_site', 'name', 'email', 'phone', 'phone_region', 'message'];

    /** @return array{code:string,fields?:array} */
    public static function decode(string $raw): array
    {
        if ($raw === '' || strlen($raw) > 8192 || preg_match('/%(?![0-9a-fA-F]{2})/', $raw)) {
            return ['code' => 'MALFORMED_FORM'];
        }
        $fields = [];
        foreach (explode('&', $raw) as $entry) {
            if ($entry === '' || !str_contains($entry, '=')) return ['code' => 'MALFORMED_FORM'];
            [$key, $value] = explode('=', $entry, 2);
            // No encoded keys, PHP bracket arrays, repeated fields, key normalization or unknown parameters.
            if (!in_array($key, self::KEYS, true) || array_key_exists($key, $fields)) {
                return ['code' => 'MALFORMED_FORM'];
            }
            $decoded = urldecode($value);
            if (str_contains($decoded, "\0") || preg_match('//u', $decoded) !== 1) {
                return ['code' => 'MALFORMED_FORM'];
            }
            $fields[$key] = $decoded;
        }
        // No client-controlled wizard step accepted; ALL required data is checked in final POST.
        foreach (['csrf','company_site','name','email','phone','message'] as $key) {
            if (!array_key_exists($key, $fields)) return ['code' => 'MALFORMED_FORM'];
        }
        $fields['phone_region'] ??= 'ZZ'; // backwards-compatible optional region, validated by PhoneAdapter if phone is used.
        return ['code' => 'OK', 'fields' => $fields];
    }
}
