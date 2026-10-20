<?php
declare(strict_types=1);

/** Research-only semantic guards, not a schema or published renderer. */
final class PropertySafety
{
    /** Deliberately conservative: encoded URLs are refused until a central canonicalizer exists. */
    public static function safeHref(string $href, string $siteHost): bool
    {
        if ($href === '' || strlen($href) > 2048 || !preg_match('//u', $href)
            || preg_match('/[\x00-\x20\x7f\\\\%]/', $href)) return false;
        if (!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/Di', $siteHost)) return false;
        if (str_starts_with($href, '//')) return false;
        if (str_starts_with($href, '/')) {
            $path = explode('?', explode('#', $href, 2)[0], 2)[0];
            foreach (explode('/', $path) as $segment) if ($segment === '.' || $segment === '..') return false;
            return true;
        }
        if (str_starts_with($href, '#')) return preg_match('/^#[A-Za-z][A-Za-z0-9_-]*$/D', $href) === 1;
        $parts = parse_url($href);
        if (!is_array($parts) || strtolower($parts['scheme'] ?? '') !== 'https'
            || !isset($parts['host']) || isset($parts['user']) || isset($parts['pass'])
            || isset($parts['port']) && $parts['port'] !== 443) return false;
        if ($parts['host'] !== strtolower($parts['host']) || str_ends_with($parts['host'], '.')) return false;
        if (strcasecmp($parts['host'], $siteHost) !== 0) return false;
        if (isset($parts['path'])) {
            foreach (explode('/', $parts['path']) as $segment) if ($segment === '.' || $segment === '..') return false;
        }
        return true;
    }

    public static function safeAction(array $action, string $siteHost): bool
    {
        if (array_diff(array_keys($action), ['kind', 'href']) !== []) return false;
        $kind = $action['kind'] ?? null;
        $href = $action['href'] ?? null;
        if (!in_array($kind, ['none', 'link', 'submit'], true)) return false;
        return match($kind) {
            'link' => is_string($href) && self::safeHref($href, $siteHost),
            default => $href === null
        };
    }
}
