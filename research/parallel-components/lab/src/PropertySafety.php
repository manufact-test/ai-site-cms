<?php
declare(strict_types=1);

/** Research-only semantic guards, not a schema or published renderer. */
final class PropertySafety
{
    /** Narrow URL policy. Production Stage3 must define target origin and URL normalization centrally. */
    public static function safeHref(string $href, string $siteHost): bool
    {
        if ($href === '' || strlen($href) > 2048 || str_contains($href, '\\') || preg_match('/[\x00-\x20\x7f]/', $href)) return false;
        if (str_starts_with($href, '//')) return false;
        if (str_starts_with($href, '/')) return true; // local absolute URL path
        if (str_starts_with($href, '#')) return preg_match('/^#[A-Za-z][A-Za-z0-9_-]*$/D', $href) === 1;
        $parts = parse_url($href);
        if (!is_array($parts) || strtolower($parts['scheme'] ?? '') !== 'https'
            || empty($parts['host']) || isset($parts['user']) || isset($parts['pass'])) return false;
        return strtolower($parts['host']) === strtolower($siteHost);
    }

    public static function safeAction(array $action, string $siteHost): bool
    {
        $kind = $action['kind'] ?? null;
        $href = $action['href'] ?? null;
        if (!in_array($kind, ['none','link','submit'], true)) return false;
        // Submit is bound to the server's declared form handler, never to arbitrary href.
        return match($kind) {
            'link' => is_string($href) && self::safeHref($href, $siteHost),
            default => $href === null
        };
    }
}
