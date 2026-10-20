<?php
declare(strict_types=1);

/** Disposable research rate gate. File lock is cross-session on a single POSIX filesystem. */
final class SharedThrottle
{
    private string $dir;
    private string $secret;
    public function __construct(string $dir, string $secret, string $publicRoot)
    {
        $resolved = realpath($dir);
        $root = realpath($publicRoot);
        if ($resolved === false || $root === false || !is_dir($resolved) || !is_writable($resolved)
            || ($resolved === $root || str_starts_with($resolved, $root . DIRECTORY_SEPARATOR))
            || (fileperms($resolved) & 0007) !== 0 || strlen($secret) < 32) {
            throw new RuntimeException('ANTI_SPAM_CONFIGURATION_REQUIRED');
        }
        $this->dir = $resolved;
        $this->secret = $secret;
    }

    /** One atomic decision; on errors reject, never bypass. Do not pass forwarded client IP headers. */
    public function allow(string $remoteIp, int $now, int $limit = 5, int $window = 60): bool
    {
        if (!filter_var($remoteIp, FILTER_VALIDATE_IP) || $limit < 1 || $limit > 100
            || $window < 1 || $window > 3600 || $now < 0) return false;
        $key = hash_hmac('sha256', 'form-v1|' . $remoteIp, $this->secret);
        $filename = $this->dir . DIRECTORY_SEPARATOR . $key . '.rate';
        if (is_link($filename)) return false;
        $handle = @fopen($filename, 'c+b');
        if ($handle === false) return false;
        try {
            if (!flock($handle, LOCK_EX)) return false;
            if (fstat($handle)['size'] > 8192) return false;
            rewind($handle);
            $raw = stream_get_contents($handle, 8193);
            if ($raw === false || strlen($raw) > 8192) return false;
            $times = $raw === '' ? [] : json_decode($raw, true);
            if (!is_array($times) || !array_is_list($times)) return false;
            $times = array_values(array_filter($times, static fn($time) => is_int($time) && $time > $now - $window && $time <= $now));
            if (count($times) >= $limit) return false;
            $times[] = $now;
            $encoded = json_encode($times, JSON_THROW_ON_ERROR);
            rewind($handle);
            if (!ftruncate($handle, 0) || fwrite($handle, $encoded) !== strlen($encoded) || !fflush($handle)) return false;
            @chmod($filename, 0600);
            return true;
        } catch (Throwable) {
            return false;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }
}
