<?php
declare(strict_types=1);

/** Deterministic opt-in native HTML response negotiation, not arbitrary mime fallback. */
final class ResponseNegotiation
{
    public static function wantsHtml(mixed $accept): bool
    {
        if (!is_string($accept) || $accept === '' || strlen($accept) > 512
            || preg_match('/[\x00-\x1f\x7f]/', $accept)) return false;
        $parts = explode(',', $accept);
        if (count($parts) > 16) return false;
        $html = -1.0;
        $json = -1.0;
        foreach ($parts as $entry) {
            $tokens = explode(';', $entry);
            $type = strtolower(trim(array_shift($tokens)));
            if ($type !== 'text/html' && $type !== 'application/json') continue;
            $q = 1.0;
            $seenQ = false;
            foreach ($tokens as $param) {
                $param = trim($param);
                if (preg_match('/^q\s*=/i', $param) !== 1) continue;
                if ($seenQ) { $q = 0.0; break; }
                $seenQ = true;
                $value = trim(substr($param, strpos($param, '=') + 1));
                if (preg_match('/^(?:0(?:\.[0-9]{0,3})?|1(?:\.0{0,3})?)$/D', $value) !== 1) {
                    $q = 0.0;
                    break;
                }
                $q = (float) $value;
            }
            if ($type === 'text/html') $html = max($html, $q);
            else $json = max($json, $q);
        }
        // Explicit HTML must be strictly preferred; wildcard/default stays JSON.
        return $html > 0 && ($json < 0 || $html > $json);
    }
}
