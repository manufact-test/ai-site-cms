<?php
declare(strict_types=1);

/** Lab-only explicit origin policy; never derive an authority from HTTP_HOST or proxy headers. */
final class OriginPolicy
{
    private static function canonical(string $origin): bool
    {
        if ($origin === '' || strlen($origin) > 253 || preg_match('/[\x00-\x20\x7f\\\\%]/', $origin)) return false;
        $parts = parse_url($origin);
        if (!is_array($parts) || !isset($parts['scheme'], $parts['host']) || isset($parts['user'])
            || isset($parts['pass']) || isset($parts['path']) || isset($parts['query']) || isset($parts['fragment'])) return false;
        $scheme = $parts['scheme']; $host = $parts['host'];
        if ($scheme !== 'http' && $scheme !== 'https') return false;
        if ($host !== strtolower($host) || str_ends_with($host, '.')) return false;
        $loopback = in_array($host, ['localhost', '127.0.0.1', '[::1]'], true);
        if ($scheme === 'http' && !$loopback) return false;
        if (!$loopback && !preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/D', $host)) return false;
        $port = $parts['port'] ?? null;
        if ($port !== null && ($port < 1 || $port > 65535)) return false;
        if ($port === 80 && $scheme === 'http' || $port === 443 && $scheme === 'https') return false; // require canonical no-default-port spelling
        $authority = ($host[0] === '[' ? $host : $host) . ($port !== null ? ':'.$port : '');
        return $origin === $scheme.'://'.$authority;
    }

    /** Throws no exceptions; requires an explicitly configured canonical origin + exact host authority. */
    public static function evaluate(?string $origin, ?string $configured, ?string $hostHeader, ?string $fetchSite): string
    {
        if (!is_string($configured) || !self::canonical($configured)) return 'ORIGIN_CONFIGURATION_REQUIRED';
        if (!is_string($origin) || !hash_equals($configured, $origin)) return 'ORIGIN_INVALID';
        if (is_string($fetchSite) && $fetchSite !== '' && !in_array($fetchSite, ['same-origin','none'], true)) return 'ORIGIN_INVALID';
        $expectedHost = substr($configured, strpos($configured, '://') + 3);
        if (!is_string($hostHeader) || !hash_equals(strtolower($expectedHost), strtolower($hostHeader))) return 'HOST_INVALID';
        return 'ALLOW';
    }
}
