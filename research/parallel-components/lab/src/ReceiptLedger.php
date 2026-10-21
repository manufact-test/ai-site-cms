<?php
declare(strict_types=1);
require_once __DIR__ . '/PrivateStateMaintenance.php';

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
        $dir = PrivateStateMaintenance::validDir($dir, $publicRoot);
        if ($dir === null || strlen($secret) < 32) {
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
            if (!is_string($value) || strlen($value) > 8192 || preg_match('//u', $value) !== 1) {
                return 'RECEIPT_STORE_UNAVAILABLE';
            }
        }
        // HMAC prevents dictionary recovery of low-entropy email/message values from filenames.
        try {
            $fingerprintPayload = json_encode([$recipient, $fields],
                JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        } catch (Throwable) {
            // Direct laboratory callers deserve the same fail-closed contract
            // as FormLab's catch around its configured claim callback.
            return 'RECEIPT_STORE_UNAVAILABLE';
        }
        $key = hash_hmac('sha256', 'receipt-v1|' . $fingerprintPayload, $this->secret);
        $lease = PrivateStateMaintenance::openLocked($this->dir, PrivateStateMaintenance::LOCK_NAME, LOCK_SH);
        if ($lease === null) return 'RECEIPT_STORE_UNAVAILABLE';
        [$maintenance] = $lease;
        try {
            $entry = PrivateStateMaintenance::openLocked($this->dir, $key . '.claim', LOCK_EX);
            if ($entry === null) return 'RECEIPT_STORE_UNAVAILABLE';
            [$handle, $created] = $entry;
            try {
                $size = fstat($handle)['size'];
                if ($size > 128) return 'RECEIPT_STORE_UNAVAILABLE';
                rewind($handle);
                $data = stream_get_contents($handle, 129);
                if ($data === false || strlen($data) !== $size) return 'RECEIPT_STORE_UNAVAILABLE';
                if (!$created) {
                    $previous = json_decode($data, true);
                    if (!is_array($previous) || array_keys($previous) !== ['v', 'at']
                        || $previous['v'] !== 1 || !is_int($previous['at'])
                        || $previous['at'] < 0 || $previous['at'] > $now) {
                        return 'RECEIPT_STORE_UNAVAILABLE';
                    }
                    if ($previous['at'] > $now - $ttl) return 'DUPLICATE_REQUEST';
                }
                // Claim BEFORE attempting transport. A partial/empty crash record
                // remains non-retryable until trusted operator intervention.
                $json = json_encode(['v' => 1, 'at' => $now], JSON_THROW_ON_ERROR);
                return PrivateStateMaintenance::write($handle, $json)
                    ? 'CLAIMED' : 'RECEIPT_STORE_UNAVAILABLE';
            } finally {
                PrivateStateMaintenance::close($handle);
            }
        } catch (Throwable) {
            return 'RECEIPT_STORE_UNAVAILABLE';
        } finally {
            PrivateStateMaintenance::close($maintenance);
        }
    }
}
