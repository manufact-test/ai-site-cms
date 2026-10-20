<?php
declare(strict_types=1);

/**
 * NON-PRODUCTION: bounded single-filesystem duplicate-claim research.
 * Records only keyed hashes and timestamps; NEVER stores form values or secrets.
 * A claim is an outbound *attempt* fence, not proof of inbox receipt.
 */
final class ReceiptLedger
{
    private string $dir;
    private string $secret;

    public function __construct(string $dir, string $secret, string $publicRoot)
    {
        $dir = realpath($dir);
        $publicRoot = realpath($publicRoot);
        if ($dir === false || $publicRoot === false || !is_dir($dir) || !is_writable($dir)
            || $dir === $publicRoot || str_starts_with($dir, $publicRoot . DIRECTORY_SEPARATOR)
            || (fileperms($dir) & 0007) !== 0 || strlen($secret) < 32) {
            throw new RuntimeException('RECEIPT_STORE_CONFIGURATION_REQUIRED');
        }
        $this->dir = $dir;
        $this->secret = $secret;
    }

    /** @return 'CLAIMED'|'DUPLICATE_REQUEST'|'RECEIPT_STORE_UNAVAILABLE' */
    public function claim(string $recipient, array $fields, int $now, int $ttl = 600): string
    {
        if ($now < 0 || $ttl < 30 || $ttl > 3600 || !filter_var($recipient, FILTER_VALIDATE_EMAIL)
            || array_keys($fields) !== ['name', 'email', 'phone', 'message']) {
            return 'RECEIPT_STORE_UNAVAILABLE';
        }
        foreach ($fields as $value) {
            if (!is_string($value) || strlen($value) > 8192) return 'RECEIPT_STORE_UNAVAILABLE';
        }
        // HMAC prevents dictionary recovery of low-entropy email/message values from filenames.
        $key = hash_hmac('sha256', 'receipt-v1|' . json_encode([$recipient, $fields],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), $this->secret);
        $path = $this->dir . DIRECTORY_SEPARATOR . $key . '.claim';
        if (is_link($path)) return 'RECEIPT_STORE_UNAVAILABLE';
        $handle = @fopen($path, 'c+b');
        if ($handle === false) return 'RECEIPT_STORE_UNAVAILABLE';
        try {
            if (!flock($handle, LOCK_EX)) return 'RECEIPT_STORE_UNAVAILABLE';
            $stat = fstat($handle);
            if ($stat === false || ($stat['mode'] & 0170000) !== 0100000 || $stat['size'] > 128
                || is_link($path)) return 'RECEIPT_STORE_UNAVAILABLE';
            rewind($handle);
            $data = stream_get_contents($handle, 129);
            if ($data === false || strlen($data) > 128) return 'RECEIPT_STORE_UNAVAILABLE';
            if ($data !== '') {
                $previous = json_decode($data, true);
                if (!is_array($previous) || array_keys($previous) !== ['v', 'at']
                    || $previous['v'] !== 1 || !is_int($previous['at']) || $previous['at'] > $now) {
                    return 'RECEIPT_STORE_UNAVAILABLE';
                }
                if ($previous['at'] > $now - $ttl) return 'DUPLICATE_REQUEST';
            }
            // Claim BEFORE calling any transport. Even ambiguous network failure stays claimed.
            $json = json_encode(['v' => 1, 'at' => $now], JSON_THROW_ON_ERROR);
            rewind($handle);
            if (!ftruncate($handle, 0) || fwrite($handle, $json) !== strlen($json) || !fflush($handle)) {
                return 'RECEIPT_STORE_UNAVAILABLE';
            }
            @chmod($path, 0600);
            return 'CLAIMED';
        } catch (Throwable) {
            return 'RECEIPT_STORE_UNAVAILABLE';
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }
}
