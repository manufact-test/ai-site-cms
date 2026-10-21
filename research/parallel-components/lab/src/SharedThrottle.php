<?php
declare(strict_types=1);
require_once __DIR__ . '/PrivateStateMaintenance.php';

/** Disposable research rate gate. File lock is cross-session on a single POSIX filesystem. */
final class SharedThrottle
{
    private string $dir;
    private string $secret;
    public function __construct(string $dir, string $secret, string $publicRoot)
    {
        $resolved = PrivateStateMaintenance::validDir($dir, $publicRoot);
        if ($resolved === null || strlen($secret) < 32) {
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
        // One network address must map to one bucket, regardless of the
        // spelling that the web server supplies for the same IPv6 address.
        // IPv4-mapped IPv6 addresses are the same identity as ordinary IPv4.
        $packed = @inet_pton($remoteIp);
        if ($packed === false) return false;
        if (strlen($packed) === 16 &&
            substr($packed, 0, 12) === str_repeat("\0", 10) . "\xff\xff") {
            $packed = substr($packed, 12);
        }
        $canonicalIp = inet_ntop($packed);
        if ($canonicalIp === false) return false;
        $key = hash_hmac('sha256', 'form-v1|' . $canonicalIp, $this->secret);
        $lease = PrivateStateMaintenance::openLocked($this->dir, PrivateStateMaintenance::LOCK_NAME, LOCK_SH);
        if ($lease === null) return false;
        [$maintenance] = $lease;
        try {
            $entry = PrivateStateMaintenance::openLocked($this->dir, $key . '.rate', LOCK_EX);
            if ($entry === null) return false;
            [$handle, $created] = $entry;
            try {
                $size = fstat($handle)['size'];
                if ($size > 8192) return false;
                rewind($handle);
                $raw = stream_get_contents($handle, 8193);
                if ($raw === false || strlen($raw) !== $size) return false;
                $times = $created ? [] : PrivateStateMaintenance::decodeCanonical($raw);
                // A successful grant always writes a nonempty history. An existing
                // [] file is corrupt/reset state, NOT a new empty IP bucket.
                if (!is_array($times) || !array_is_list($times) || count($times) > 100 ||
                    (!$created && $times === [])) return false;
                $prior = -1;
                foreach ($times as $at) {
                    // Corruption and a clock moving backward must not erase valid attempts.
                    if (!is_int($at) || $at < 0 || $at > $now || $at < $prior) return false;
                    $prior = $at;
                }
                $times = array_values(array_filter($times,
                    static fn(int $at): bool => $at > $now - $window));
                if (count($times) >= $limit) return false;
                $times[] = $now;
                return PrivateStateMaintenance::write($handle, json_encode($times, JSON_THROW_ON_ERROR));
            } finally {
                PrivateStateMaintenance::close($handle);
            }
        } catch (Throwable) {
            return false;
        } finally {
            PrivateStateMaintenance::close($maintenance);
        }
    }
}
