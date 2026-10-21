<?php
declare(strict_types=1);

namespace AiSiteCms\Release;

use PDO;
use RuntimeException;

// All Stage2 Ed25519 verifiers must share one fail-closed backend, including
// truly Sodium-free PHP: no implicit dependency on polyfill global wrappers.
require_once __DIR__ . '/Ed25519Backend.php';

/**
 * Stage2 disposable settlement gate. Unlike the older pending-directory-only
 * laboratory read, requires independent evidence for EVERY transition:
 *
 *   pre-signed permit -> signed receipt -> operator-signed settlement
 *
 * An empty pending directory is NOT authorization. Callers must pin the latest
 * settlement SHA-256, receipt SHA-256, the operator/publisher public keys and
 * the exact site ID out of band. The private signing key NEVER enters PHP.
 *
 * No production entrypoint is wired. Raw lab APIs intentionally still exist.
 */
final class LabSettledUpgradeGate
{
    private const FORMAT = 'ai-site-cms-stage2-settlement-v1';
    private const DOMAIN = "AI-SITE-CMS-STAGE2-SETTLEMENT-V1\0";
    private const RECEIPT_DOMAIN = "AI-SITE-CMS-STAGE2-OPERATOR-RECEIPT-V1\0";
    private const DER = "\x30\x2a\x30\x05\x06\x03\x2b\x65\x70\x03\x21\x00";

    private static function lab(): void
    {
        if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
            || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
            throw new RuntimeException('Settlement verification limited to disposable CLI CI');
        }
    }

    private static function digest(string $value): void
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $value)) {
            throw new RuntimeException('Missing independently pinned SHA-256 evidence');
        }
    }

    private static function node(string $path, int $max): string
    {
        $stat = @lstat($path);
        if ($stat === false || is_link($path) || !is_file($path)
            || ($stat['nlink'] ?? 0) !== 1 || $stat['size'] < 1 || $stat['size'] > $max) {
            throw new RuntimeException('Missing, linked or changed operator evidence file');
        }
        $bytes = @file_get_contents($path);
        if ($bytes === false || strlen($bytes) !== $stat['size']) {
            throw new RuntimeException('Operator evidence truncated while verifying');
        }
        return $bytes;
    }

    private static function dir(string $directory): string
    {
        $dir = realpath($directory);
        if ($dir === false || is_link($directory) || !is_dir($dir)
            || !preg_match('/^ai-site-cms-trusted-upgrade-fixture-[a-f0-9]{16}$/D', basename(dirname($dir)))
            || dirname(dirname($dir)) !== realpath(sys_get_temp_dir())) {
            throw new RuntimeException('Refusing non-ephemeral independent settlement directory');
        }
        return $dir;
    }

    private static function key(string $pemFile, string $fingerprint, string $settlementsDir): string
    {
        self::digest($fingerprint);
        $pemReal = realpath($pemFile);
        if ($pemReal === false || $pemReal === $settlementsDir
            || str_starts_with($pemReal, $settlementsDir . DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('Independent operator key required');
        }
        $pem = self::node($pemFile, 512);
        if (!preg_match('/\A-----BEGIN PUBLIC KEY-----\r?\n([A-Za-z0-9+\/=\r\n]+)-----END PUBLIC KEY-----\r?\n?\z/D', $pem, $match)) {
            throw new RuntimeException('Malformed independent public key');
        }
        $der = base64_decode(str_replace(["\r","\n"], '', $match[1]), true);
        if ($der === false || strlen($der) !== 44
            || !hash_equals(self::DER, substr($der, 0, 12))
            || !hash_equals($fingerprint, hash('sha256', $der))) {
            throw new RuntimeException('Unpinned operator settlement public key');
        }
        return substr($der, 12);
    }

    /**
     * Full chain validation, not just latest. Each signed settlement must bind
     * an independently signed operator permit AND the matching post-activation
     * receipt, preventing premature "just delete pending/" authorization.
     *
     * @return array{count:int,headSha256:string,receipt:array<string,mixed>,settlement:array<string,mixed>}
     */
    public static function verify(
        string $settlementDir, string $receiptDir, string $permitArchiveDir,
        string $operatorPem, string $operatorPin, string $publisherPin,
        string $receiptHead, string $settlementHead, string $siteId
    ): array {
        self::lab();
        require_once __DIR__ . '/LabAttestedActivationGate.php';
        require_once __DIR__ . '/LabPreauthorizedUpgradeGate.php';
        self::digest($receiptHead);
        self::digest($settlementHead);
        self::digest($publisherPin);
        $dir = self::dir($settlementDir);
        $receipts = self::dir($receiptDir);
        $permits = self::dir($permitArchiveDir);
        if ($dir === $receipts || $dir === $permits || $receipts === $permits) {
            throw new RuntimeException('Settlement, permit and receipt evidence must have separate roots');
        }
        $chain = LabAttestedActivationGate::verifyChain(
            $receipts, $operatorPem, $operatorPin, $receiptHead, $siteId, $publisherPin
        );
        $entries = @scandir($dir);
        if ($entries === false) throw new RuntimeException('Unreadable settlement journal');
        $entries = array_values(array_diff($entries, ['.','..']));
        sort($entries, SORT_STRING);
        $count = $chain['count'];
        $wanted = [];
        for ($i = 1; $i <= $count; ++$i) {
            $stem = sprintf('settlement-%06d', $i);
            $wanted[] = $stem . '.json';
            $wanted[] = $stem . '.sig';
        }
        sort($wanted, SORT_STRING);
        if ($entries !== $wanted) {
            throw new RuntimeException('Settlement chain incomplete, foreign, or replayed');
        }
        $proofEntries = @scandir($permits);
        if ($proofEntries === false) {
            throw new RuntimeException('Operator permit archive is unreadable');
        }
        $proofEntries = array_values(array_diff($proofEntries, ['.','..']));
        $expectedProofDirs = [];
        for ($i = 1; $i <= $count; ++$i) {
            $expectedProofDirs[] = sprintf('permit-%06d', $i);
        }
        sort($proofEntries, SORT_STRING);
        if ($proofEntries !== $expectedProofDirs) {
            throw new RuntimeException('Missing, extra or replayed archived operator permits');
        }
        $public = self::key($operatorPem, $operatorPin, $dir);
        $seenNonces = [];
        $lastSettlement = null;
        $lastReceipt = null;
        $lastVersion = null;
        $lastPermit = null;
        $last = null;
        $lastReceiptRecord = null;
        for ($i = 1; $i <= $count; ++$i) {
            $stem = sprintf('%06d', $i);
            $raw = self::node($dir . '/settlement-' . $stem . '.json', 8192);
            $sig = self::node($dir . '/settlement-' . $stem . '.sig', 64);
            if (strlen($sig) !== 64
                || !Ed25519Backend::verifyDetached($sig, self::DOMAIN . $raw, $public)) {
                throw new RuntimeException('Invalid operator settlement signature');
            }
            try {
                $r = json_decode($raw, true, 20, JSON_THROW_ON_ERROR);
            } catch (\JsonException $e) {
                throw new RuntimeException('Corrupt settlement JSON', 0, $e);
            }
            if (!is_array($r) || array_keys($r) !== [
                'format','siteId','sequence','version','permitSha256','receiptSha256',
                'previousSettlementSha256','productionReady'
            ] || $r['format'] !== self::FORMAT || $r['siteId'] !== $siteId
                || $r['sequence'] !== $i || $r['productionReady'] !== false
                || !is_string($r['version']) || !is_string($r['permitSha256'])
                || !is_string($r['receiptSha256'])
                || $r['previousSettlementSha256'] !== $lastSettlement
                || $raw !== json_encode($r, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n") {
                throw new RuntimeException('Noncanonical or out-of-order settlement');
            }
            self::digest($r['permitSha256']);
            self::digest($r['receiptSha256']);
            $permitFolder = $permits . '/permit-' . $stem;
            $p = LabPreauthorizedUpgradeGate::verifyPermit(
                $permitFolder,$operatorPem,$operatorPin,$r['permitSha256'],
                $lastReceipt,$siteId,$publisherPin
            );
            if (isset($seenNonces[$p['nonce']])) {
                throw new RuntimeException('Operator preactivation nonce reused across generations');
            }
            $seenNonces[$p['nonce']] = true;
            $receiptRaw = self::node($receipts . '/receipt-' . $stem . '.json', 8192);
            $receiptSig = self::node($receipts . '/receipt-' . $stem . '.sig', 64);
            if (strlen($receiptSig) !== 64) throw new RuntimeException('Truncated activated receipt signature');
            $receiptHash = hash('sha256', self::RECEIPT_DOMAIN . $receiptRaw . $receiptSig);
            try {
                $post = json_decode($receiptRaw, true, 20, JSON_THROW_ON_ERROR);
            } catch (\JsonException $e) {
                throw new RuntimeException('Corrupt activation receipt while settling',0,$e);
            }
            if (!hash_equals($r['receiptSha256'], $receiptHash)
                || $p['sequence'] !== $i || $post['sequence'] !== $i
                || $p['nonce'] === '' || $p['fromVersion'] !== $lastVersion
                || $post['fromVersion'] !== $lastVersion
                || $p['version'] !== $r['version'] || $post['version'] !== $r['version']
                || $p['manifestSha256'] !== $post['manifestSha256']
                || $p['archiveSha256'] !== $post['archiveSha256']
                || $p['publisherFingerprint'] !== $post['publisherFingerprint']
                || $p['minimumVersion'] !== $post['minimumVersion']
                || $p['dbCheckpoint'] !== $post['dbCheckpoint']
                || $post['previousReceiptSha256'] !== $lastReceipt) {
                throw new RuntimeException('Permit, activated code, DB or settlement evidence diverged');
            }
            $lastSettlement = hash('sha256', self::DOMAIN . $raw . $sig);
            $lastReceipt = $receiptHash;
            $lastVersion = $r['version'];
            $lastPermit = $p;
            $last = $r;
            $lastReceiptRecord = $post;
        }
        if (!hash_equals($settlementHead, $lastSettlement)
            || !hash_equals($receiptHead, $lastReceipt)) {
            throw new RuntimeException('Independent settlement or receipt highwater mismatch');
        }
        return ['count'=>$count,'headSha256'=>$lastSettlement,
            'permitRootSha256'=>$lastPermit['switchRootSha256'],
            'receipt'=>$lastReceiptRecord,'settlement'=>$last];
    }

    /**
     * Fail-closed on pending approval, missing settlement, drift or direct
     * switcher bypass. Revalidate while PHP code request lease remains held.
     */
    public static function withVerifiedRequest(
        PDO $pdo, string $siteId, LabPhpGenerationSwitcher $switcher,
        string $settlements, string $receipts, string $permits, string $pending,
        string $operatorPem, string $operatorPin, string $publisherPin,
        string $receiptHead, string $settlementHead, callable $handler
    ): mixed {
        self::lab();
        require_once __DIR__ . '/LabPreauthorizedUpgradeGate.php';
        LabPreauthorizedUpgradeGate::assertNoPending($pending);
        $verified = self::verify($settlements,$receipts,$permits,$operatorPem,
            $operatorPin,$publisherPin,$receiptHead,$settlementHead,$siteId);
        if (!hash_equals($verified['permitRootSha256'], hash('sha256',$switcher->root()))) {
            throw new RuntimeException('Settled operator grant targets another switcher root');
        }
        return LabAttestedActivationGate::withVerifiedRequest(
            $pdo,$siteId,$switcher,$receipts,$operatorPem,$operatorPin,
            $receiptHead,$publisherPin,
            static function (array $generation) use (
                $settlements,$receipts,$permits,$pending,$operatorPem,$operatorPin,
                $publisherPin,$receiptHead,$settlementHead,$siteId,$verified,$handler
            ): mixed {
                LabPreauthorizedUpgradeGate::assertNoPending($pending);
                $again = self::verify($settlements,$receipts,$permits,$operatorPem,
                    $operatorPin,$publisherPin,$receiptHead,$settlementHead,$siteId);
                if ($verified['headSha256'] !== $again['headSha256']
                    || $verified['permitRootSha256'] !== $again['permitRootSha256']
                    || $verified['count'] !== $generation['sequence']) {
                    throw new RuntimeException('Settlement changed while serving protected request');
                }
                $response = $handler($generation);
                // A new pending grant may appear while the read-only handler
                // executes; never emit a successful response if so.
                LabPreauthorizedUpgradeGate::assertNoPending($pending);
                return $response;
            }
        );
    }
}
