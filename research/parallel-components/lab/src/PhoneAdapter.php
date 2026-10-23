<?php
declare(strict_types=1);

/** Candidate adapter: only trusted upstream libphonenumber metadata decides validity. */
final class PhoneAdapter
{
    /** UI country choice is typed even when the optional phone is empty. */
    public static function regionShape(string $region): bool
    {
        return $region === 'ZZ' || preg_match('/^[A-Z]{2}$/D', $region) === 1;
    }

    public static function available(): bool
    {
        return class_exists('libphonenumber\\PhoneNumberUtil')
            && class_exists('libphonenumber\\PhoneNumberFormat');
    }

    /**
     * Returns normalized E.164 or null if invalid. No regex approximation of real numbering plans.
     * The $util/$format arguments allow an isolated protocol-double test, NOT a phone-validation claim.
     */
    public static function normalize(string $raw, string $region, ?object $util = null, ?int $format = null): ?string
    {
        if ($raw === '' || strlen($raw) > 40 || preg_match('//u', $raw) !== 1
            || preg_match('/[\x00-\x1f\x7f]/', $raw)) return null;
        // A lexical boundary only, NEVER a substitute for numbering-plan metadata.
        // libphonenumber intentionally understands vanity/embedded text; a contact form should not.
        if (preg_match('/^[0-9+ ().-]+$/D', $raw) !== 1 || substr_count($raw, '+') > 1
            || (str_contains($raw, '+') && !str_starts_with($raw, '+'))) return null;
        if ($region !== 'ZZ' && preg_match('/^[A-Z]{2}$/D', $region) !== 1) return null;
        if ($region === 'ZZ' && !str_starts_with($raw, '+')) return null;
        if ($util === null) {
            if (!self::available()) throw new RuntimeException('PHONE_VALIDATOR_REQUIRED');
            $util = \libphonenumber\PhoneNumberUtil::getInstance();
            $format = \libphonenumber\PhoneNumberFormat::E164;
        }
        if ($format === null) throw new InvalidArgumentException('A test double requires an explicit format');
        try {
            $parsed = $util->parse($raw, $region === 'ZZ' ? null : $region);
            if (!$util->isValidNumber($parsed)) return null;
            if ($region !== 'ZZ' && !$util->isValidNumberForRegion($parsed, $region)) return null;
            if (method_exists($parsed, 'hasExtension') && $parsed->hasExtension()) return null;
            $canonical = $util->format($parsed, $format);
        } catch (Throwable) {
            return null; // upstream parse errors fail closed
        }
        return is_string($canonical) && preg_match('/^\+[1-9][0-9]{1,14}$/D', $canonical) === 1
            ? $canonical : null;
    }
}
