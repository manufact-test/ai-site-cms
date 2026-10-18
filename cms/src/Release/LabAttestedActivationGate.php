<?php
declare(strict_types=1);

namespace AiSiteCms\Release;

use PDO;
use RuntimeException;

/**
 * Stage2 CI-only: independent OPERATOR-SIGNED post-activation evidence chain.
 *
 * This class NEVER signs anything and cannot install or switch code. The
 * external operator owns the Ed25519 private key and publishes the signed,
 * immutable receipt sequence outside the writable PHP generation directory.
 * The reader MUST obtain its trusted public-key fingerprint AND latest chain
 * head hash from independent storage. Without those pins a copy/replay of the
 * entire local directory cannot be detected.
 *
 * This is a guarded laboratory read API, NOT a production HTTP entrypoint.
 * Original direct research switcher methods remain intentionally available.
 */
final class LabAttestedActivationGate
{
    private const FORMAT = 'ai-site-cms-stage2-operator-activation-receipt-v1';
    private const DOMAIN = "AI-SITE-CMS-STAGE2-OPERATOR-RECEIPT-V1\0";
    private const DER_PREFIX = "\x30\x2a\x30\x05\x06\x03\x2b\x65\x70\x03\x21\x00";

    private static function lab(): void
    {
        if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
            || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
            throw new RuntimeException('Signed receipt chain is only a disposable CLI lab');
        }
    }

    private static function sha(string $value): void
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $value)) {
            throw new RuntimeException('Invalid independently pinned digest');
        }
    }

    private static function version(string $value): array
    {
        if (!preg_match('/^0\.([0-9]{1,9})\.([0-9]{1,9})-stage2\.([0-9]{1,9})$/D', $value, $m)) {
            throw new RuntimeException('Unapproved code version in signed receipt');
        }
        return [(int)$m[1],(int)$m[2],(int)$m[3]];
    }

    private static function bytes(string $file, int $max): string
    {
        $stat = @lstat($file);
        if ($stat === false || is_link($file) || !is_file($file)
            || ($stat['nlink'] ?? 0) !== 1
            || $stat['size'] < 1 || $stat['size'] > $max) {
            throw new RuntimeException('Missing/unsafe externally retained receipt or key');
        }
        $content = @file_get_contents($file);
        if ($content === false || strlen($content) !== $stat['size']) {
            throw new RuntimeException('Operator evidence changed while being read');
        }
        return $content;
    }

    private static function operatorKey(string $pemFile, string $fingerprint, string $chainDir): string
    {
        self::sha($fingerprint);
        $real = realpath($pemFile);
        if ($real === false || $real === $chainDir
            || str_starts_with($real, $chainDir . DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('Operator trust anchor must be outside receipt directory');
        }
        $pem = self::bytes($pemFile, 512);
        if (!preg_match('/\A-----BEGIN PUBLIC KEY-----\r?\n([A-Za-z0-9+\/=\r\n]+)-----END PUBLIC KEY-----\r?\n?\z/D', $pem, $m)) {
            throw new RuntimeException('Invalid operator Ed25519 public PEM');
        }
        $der = base64_decode(str_replace(["\r","\n"], '', $m[1]), true);
        if ($der === false || strlen($der) !== 44
            || !hash_equals(self::DER_PREFIX, substr($der, 0, 12))
            || !hash_equals($fingerprint, hash('sha256', $der))) {
            throw new RuntimeException('Operator key substitution or malformed DER');
        }
        return substr($der, 12);
    }

    /**
     * Verify every sequential external receipt, all Ed25519 signatures,
     * prior-hash links, monotonically increasing versions/floors, and caller's
     * independently retained head. No mutable local "latest.json" is trusted.
     *
     * @return array<string,mixed>
     */
    public static function verifyChain(
        string $directory, string $operatorPem, string $operatorPin,
        string $expectedHead, string $siteId, string $publisherPin
    ): array {
        self::lab();
        self::sha($expectedHead);
        self::sha($publisherPin);
        $real = realpath($directory);
        if ($real === false || is_link($directory) || !is_dir($real)
            || strlen($siteId) < 1 || strlen($siteId) > 80
            || !preg_match('/^[a-zA-Z0-9_-]+$/D', $siteId)) {
            throw new RuntimeException('Invalid separate operator receipt store');
        }
        $public = self::operatorKey($operatorPem, $operatorPin, $real);
        $entries = array_values(array_diff(scandir($real) ?: [], ['.','..']));
        if (count($entries) < 2 || count($entries) > 32 || count($entries) % 2 !== 0) {
            throw new RuntimeException('Empty, excessive or incomplete signed receipt chain');
        }
        $count = intdiv(count($entries), 2);
        $expectedFiles = [];
        for ($i = 1; $i <= $count; $i++) {
            $name = sprintf('receipt-%06d', $i);
            $expectedFiles[] = $name . '.json';
            $expectedFiles[] = $name . '.sig';
        }
        sort($entries, SORT_STRING);
        sort($expectedFiles, SORT_STRING);
        if ($entries !== $expectedFiles) {
            throw new RuntimeException('Receipt chain gap, foreign file or partial write');
        }

        $lastHash = null;
        $lastVersion = null;
        $lastFloor = null;
        $last = null;
        for ($i = 1; $i <= $count; $i++) {
            $file = $real . '/' . sprintf('receipt-%06d', $i);
            $raw = self::bytes($file . '.json', 8192);
            $sig = self::bytes($file . '.sig', 64);
            if (strlen($sig) !== 64
                || !sodium_crypto_sign_verify_detached($sig, self::DOMAIN . $raw, $public)) {
                throw new RuntimeException('Untrusted operator receipt signature');
            }
            try { $record = json_decode($raw, true, 20, JSON_THROW_ON_ERROR); }
            catch (\JsonException $e) { throw new RuntimeException('Broken receipt JSON', 0, $e); }
            if (!is_array($record) || array_keys($record) !== [
                'format','siteId','sequence','fromVersion','version','minimumVersion',
                'publisherFingerprint','manifestSha256','archiveSha256','dbCheckpoint',
                'previousReceiptSha256','productionReady'
            ] || $record['format'] !== self::FORMAT || $record['siteId'] !== $siteId
                || $record['sequence'] !== $i || $record['productionReady'] !== false
                || !is_string($record['version']) || !is_string($record['minimumVersion'])
                || !is_string($record['publisherFingerprint'])
                || !is_string($record['manifestSha256']) || !is_string($record['archiveSha256'])
                || !is_array($record['dbCheckpoint'])
                || $raw !== json_encode($record, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n") {
                throw new RuntimeException('Noncanonical or unsupported operator receipt');
            }
            self::sha($record['publisherFingerprint']);
            if (!hash_equals($publisherPin, $record['publisherFingerprint'])) {
                throw new RuntimeException('Receipt publisher not independently authorized');
            }
            self::sha($record['manifestSha256']);
            self::sha($record['archiveSha256']);
            if ($record['previousReceiptSha256'] !== $lastHash
                || $record['fromVersion'] !== $lastVersion
                || ($i > 1 && self::version($record['version']) <= self::version($lastVersion))
                || ($i > 1 && self::version($record['minimumVersion']) < self::version($lastFloor))
                || self::version($record['version']) < self::version($record['minimumVersion'])) {
                throw new RuntimeException('Out-of-order, rollback or replayed signed receipt');
            }
            // Fingerprint must be bound to this exact release version.
            if (($record['dbCheckpoint']['codeVersion'] ?? null) !== $record['version']) {
                throw new RuntimeException('Signed receipt DB/code mismatch');
            }
            $lastHash = hash('sha256', self::DOMAIN . $raw . $sig);
            $lastVersion = $record['version'];
            $lastFloor = $record['minimumVersion'];
            $last = $record;
        }
        if (!hash_equals($expectedHead, $lastHash)) {
            throw new RuntimeException('Independent signed-receipt anti-replay head mismatch');
        }
        return ['receipt'=>$last,'headSha256'=>$lastHash,'count'=>$count];
    }

    /**
     * The only Stage2 signed-chain-gated read surface. A raw lab switch,
     * missing receipt, DB drift, modified code or a replayed old chain fails.
     * Rereads operator evidence while holding the code request lease / DB
     * fence; this is not a proof against privileged local concurrent writers.
     *
     * @template T
     * @param callable(array<string,mixed>):T $handler
     * @return T
     */
    public static function withVerifiedRequest(
        PDO $pdo, string $siteId, LabPhpGenerationSwitcher $switcher,
        string $directory, string $operatorPem, string $operatorPin,
        string $expectedHead, string $publisherPin, callable $handler
    ): mixed {
        self::lab();
        require_once __DIR__ . '/LabSchemaVersionGate.php';
        $chain = self::verifyChain($directory, $operatorPem, $operatorPin, $expectedHead, $siteId, $publisherPin);
        $record = $chain['receipt'];
        return $switcher->withRequestLeaseAndCheckpoint(
            $pdo, $siteId, $record['version'], $record['minimumVersion'],
            $record['dbCheckpoint'],
            static function (array $generation) use (
                $switcher,$directory,$operatorPem,$operatorPin,$expectedHead,
                $siteId,$record,$publisherPin,$handler
            ): mixed {
                $again = self::verifyChain(
                    $directory, $operatorPem, $operatorPin, $expectedHead, $siteId, $publisherPin
                );
                $view = $switcher->inspect($record['minimumVersion']);
                if ($view['status'] !== 'clean' || $view['current'] !== $record['version']
                    || $view['sequence'] !== $record['sequence']
                    || $view['previous'] !== $record['fromVersion']
                    || $generation['sequence'] !== $record['sequence']
                    || !hash_equals($record['manifestSha256'], $generation['digest'])
                    || $again['headSha256'] !== $expectedHead) {
                    throw new RuntimeException('Signed receipt differs from actual activated generation');
                }
                return $handler($generation);
            }
        );
    }
}
