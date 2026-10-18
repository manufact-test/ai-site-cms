<?php
declare(strict_types=1);

namespace AiSiteCms\Release;

use PDO;
use RuntimeException;

/**
 * Stage2 CI ONLY: signed OPERATOR APPROVAL BEFORE any authenticated activation.
 *
 * The operator signs outside PHP. The permit remains in a separately controlled
 * "pending" directory until an independently signed post-activation receipt
 * is published. Guarded reads fail closed while ANY pending file exists.
 *
 * This is NOT a production non-bypassable mechanism: raw research APIs and
 * non-guarded readers remain callable. The head hashes/key pins must be held
 * out of band. No user data migration, real host or power-cut validation.
 */
final class LabPreauthorizedUpgradeGate
{
    private const FORMAT = 'ai-site-cms-stage2-preactivation-approval-v1';
    private const DOMAIN = "AI-SITE-CMS-STAGE2-PREACTIVATION-V1\0";
    private const DER_PREFIX = "\x30\x2a\x30\x05\x06\x03\x2b\x65\x70\x03\x21\x00";

    private static function lab(): void
    {
        if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
            || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
            throw new RuntimeException('Preauthorized upgrade is CI-only');
        }
    }

    private static function hash(string $hash): void
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $hash)) {
            throw new RuntimeException('Expected independent SHA-256 pin');
        }
    }

    private static function version(string $version): array
    {
        if (!preg_match('/^0\.([0-9]{1,9})\.([0-9]{1,9})-stage2\.([0-9]{1,9})$/D', $version, $m)) {
            throw new RuntimeException('Invalid authorized Stage2 version');
        }
        return [(int)$m[1], (int)$m[2], (int)$m[3]];
    }

    private static function bytes(string $path, int $max): string
    {
        $s = @lstat($path);
        if ($s === false || is_link($path) || !is_file($path)
            || ($s['nlink'] ?? 0) !== 1 || $s['size'] < 1 || $s['size'] > $max) {
            throw new RuntimeException('Unsafe or missing approval evidence');
        }
        $data = @file_get_contents($path);
        if ($data === false || strlen($data) !== $s['size']) {
            throw new RuntimeException('Approval evidence changed while reading');
        }
        return $data;
    }

    private static function directory(string $pending): string
    {
        $real = realpath($pending);
        $tmp = realpath(sys_get_temp_dir());
        $parent = $real === false ? '' : dirname($real);
        $grandparent = dirname($parent);
        $direct = $grandparent === $tmp
            && preg_match('/^ai-site-cms-trusted-upgrade-fixture-[a-f0-9]{16}$/D', basename($parent));
        $archived = dirname($grandparent) === $tmp
            && preg_match('/^ai-site-cms-trusted-upgrade-fixture-[a-f0-9]{16}$/D', basename($grandparent))
            && preg_match('/^permit-[0-9]{6}$/D', basename($real))
            && basename($parent) === 'approved-permit-proofs'
            && !is_link($parent);
        if ($tmp === false || $real === false || is_link($pending)
            || !is_dir($real) || (!$direct && !$archived)) {
            throw new RuntimeException('Approval must be in disposable CI test sandbox');
        }
        return $real;
    }

    private static function publicKey(string $file, string $pin, string $pending): string
    {
        self::hash($pin);
        $path = realpath($file);
        if ($path === false || $path === $pending
            || str_starts_with($path, $pending . DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('Independent operator PEM required');
        }
        $pem = self::bytes($file, 512);
        if (!preg_match('/\A-----BEGIN PUBLIC KEY-----\r?\n([A-Za-z0-9+\/=\r\n]+)-----END PUBLIC KEY-----\r?\n?\z/D', $pem, $matches)) {
            throw new RuntimeException('Invalid operator PEM encoding');
        }
        $der = base64_decode(str_replace(["\r","\n"], '', $matches[1]), true);
        if ($der === false || strlen($der) !== 44
            || !hash_equals(self::DER_PREFIX, substr($der, 0, 12))
            || !hash_equals($pin, hash('sha256', $der))) {
            throw new RuntimeException('Wrong pinned operator signing key');
        }
        return substr($der, 12);
    }

    /** Refuses any leftover file, including interrupted writes and symlinks. */
    public static function assertNoPending(string $pending): void
    {
        self::lab();
        $dir = self::directory($pending);
        $entries = @scandir($dir);
        if ($entries === false || array_values(array_diff($entries, ['.','..'])) !== []) {
            throw new RuntimeException('Unreadable/outstanding upgrade approval: maintenance required');
        }
    }

    /**
     * @return array<string,mixed>
     */
    public static function verifyPermit(
        string $pending, string $operatorPem, string $operatorPin,
        string $independentPermitHead, ?string $independentPreviousReceiptHead,
        string $siteId, string $publisherPin
    ): array {
        self::lab();
        self::hash($independentPermitHead);
        self::hash($publisherPin);
        if ($independentPreviousReceiptHead !== null) self::hash($independentPreviousReceiptHead);
        $dir = self::directory($pending);
        $entries = array_values(array_diff(scandir($dir) ?: [], ['.','..']));
        sort($entries, SORT_STRING);
        if ($entries !== ['permit.json','permit.sig']) {
            throw new RuntimeException('Incomplete, foreign or replayed preactivation permit');
        }
        $raw = self::bytes($dir . '/permit.json', 8192);
        $sig = self::bytes($dir . '/permit.sig', 64);
        $key = self::publicKey($operatorPem, $operatorPin, $dir);
        if (strlen($sig) !== 64
            || !sodium_crypto_sign_verify_detached($sig, self::DOMAIN . $raw, $key)
            || !hash_equals($independentPermitHead, hash('sha256', self::DOMAIN . $raw . $sig))) {
            throw new RuntimeException('Signed permit or independent nonce/head invalid');
        }
        try { $r = json_decode($raw, true, 20, JSON_THROW_ON_ERROR); }
        catch (\JsonException $e) { throw new RuntimeException('Malformed approval JSON', 0, $e); }
        if (!is_array($r) || array_keys($r) !== [
            'format','siteId','nonce','switchRootSha256','sequence','fromVersion','version','minimumVersion',
            'previousReceiptSha256','publisherFingerprint','manifestSha256',
            'archiveSha256','dbCheckpoint','productionReady'
        ] || $r['format'] !== self::FORMAT || $r['siteId'] !== $siteId
            || !preg_match('/^[a-zA-Z0-9_-]{1,80}$/D', $siteId)
            || !is_string($r['nonce']) || !preg_match('/^[a-f0-9]{32}$/D', $r['nonce'])
            || !is_string($r['switchRootSha256'])
            || !is_int($r['sequence']) || $r['sequence'] < 1 || $r['sequence'] > 16
            || !is_string($r['version']) || !is_string($r['minimumVersion'])
            || !is_string($r['publisherFingerprint'])
            || !hash_equals($publisherPin, $r['publisherFingerprint'])
            || !is_string($r['manifestSha256']) || !is_string($r['archiveSha256'])
            || !is_array($r['dbCheckpoint']) || $r['productionReady'] !== false
            || $raw !== json_encode($r, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n") {
            throw new RuntimeException('Unsupported/noncanonical signed operator approval');
        }
        self::hash($r['switchRootSha256']);
        self::hash($r['manifestSha256']);
        self::hash($r['archiveSha256']);
        if ($r['sequence'] === 1) {
            if ($r['fromVersion'] !== null || $r['previousReceiptSha256'] !== null
                || $independentPreviousReceiptHead !== null) {
                throw new RuntimeException('Genesis approval must have no predecessor');
            }
        } elseif (!is_string($r['fromVersion'])
            || !is_string($r['previousReceiptSha256'])
            || $independentPreviousReceiptHead === null
            || !hash_equals($independentPreviousReceiptHead, $r['previousReceiptSha256'])
            || self::version($r['version']) <= self::version($r['fromVersion'])) {
            throw new RuntimeException('Approval lineage does not extend independent receipt head');
        }
        if (self::version($r['version']) < self::version($r['minimumVersion'])
            || ($r['dbCheckpoint']['codeVersion'] ?? null) !== $r['version']) {
            throw new RuntimeException('Approval version floor / foundation checkpoint mismatch');
        }
        return $r;
    }

    /**
     * A crash after the old signed gate is no longer current MUST leave the
     * pending permit present. No implicit resume, cleanup or rollback.
     *
     * @return array<string,mixed>
     */
    public static function activate(
        PDO $pdo, string $siteId, LabPhpGenerationSwitcher $switcher,
        string $receiptDir, string $pending, string $operatorPem, string $operatorPin,
        string $permitHead, ?string $previousReceiptHead,
        string $bundle, string $extracted, string $publisherPem, string $publisherPin,
        ?string $expectedCurrent, int $expectedSequence, ?string $failAt = null
    ): array {
        self::lab();
        require_once __DIR__ . '/LabTrustedUpgradeCoordinator.php';
        require_once __DIR__ . '/LabAttestedActivationGate.php';
        $r = self::verifyPermit(
            $pending, $operatorPem, $operatorPin, $permitHead,
            $previousReceiptHead, $siteId, $publisherPin
        );
        if (!hash_equals($r['switchRootSha256'], hash('sha256', $switcher->root()))
            || $r['fromVersion'] !== $expectedCurrent
            || $r['sequence'] !== $expectedSequence + 1
            || $expectedSequence < 0) {
            throw new RuntimeException('Preapproval does not authorize supplied generation CAS');
        }
        $observed = $switcher->inspect($r['minimumVersion']);
        if ($observed['status'] !== 'clean'
            || $observed['current'] !== $expectedCurrent
            || $observed['sequence'] !== $expectedSequence) {
            throw new RuntimeException('Preapproved CAS stale before activation');
        }
        if ($expectedSequence !== 0) {
            $chain = LabAttestedActivationGate::verifyChain(
                $receiptDir, $operatorPem, $operatorPin,
                $previousReceiptHead, $siteId, $publisherPin
            );
            if ($chain['count'] !== $expectedSequence
                || $chain['receipt']['version'] !== $expectedCurrent
                || self::version($r['minimumVersion']) < self::version($chain['receipt']['minimumVersion'])) {
                throw new RuntimeException('Cannot approve upgrade from untrusted old code/receipt');
            }
        } else {
            $listing = @scandir($receiptDir);
            if ($listing === false) throw new RuntimeException('Missing independent receipt directory');
            $entries = array_values(array_diff($listing, ['.','..']));
            if ($entries !== []) throw new RuntimeException('Genesis must not have older receipts');
        }
        $verified = LabTrustedUpgradeCoordinator::preflight(
            $pdo, $siteId, $bundle, $extracted, $publisherPem, $publisherPin,
            $r['version'], $r['minimumVersion'], $r['dbCheckpoint']
        );
        if (!hash_equals($r['manifestSha256'], $verified['manifestSha256'])
            || !hash_equals($r['archiveSha256'], $verified['archiveSha256'])) {
            throw new RuntimeException('Operator approval does not bind actual signed ZIP');
        }
        // Freeze approval semantics before/after entering the underlying DB fence.
        // This is cooperative only; privileged concurrent writes remain a risk.
        return $switcher->withSignedPermitMutation(
            $pending, $operatorPem, $operatorPin, $permitHead,
            $previousReceiptHead, $siteId, $publisherPin,
            static function (array $granted) use (
                $pdo,$siteId,$switcher,$bundle,$extracted,$publisherPem,$publisherPin,
                $expectedCurrent,$expectedSequence,$failAt,$pending,$operatorPem,
                $operatorPin,$permitHead,$previousReceiptHead
            ): array {
                // The low-level sealed switcher independently restricts register
                // and switch CAS to this exact signed permit, not caller claims.
                $result = LabTrustedUpgradeCoordinator::stageAndActivate(
                    $pdo, $siteId, $switcher, $bundle, $extracted, $publisherPem,
                    $publisherPin, $granted['version'], $granted['minimumVersion'],
                    $granted['dbCheckpoint'], $expectedCurrent, $expectedSequence,
                    in_array($failAt, ['pause-after-intent', 'pause-after-pointer',
                        'pause-after-receipt'], true) ? $failAt : null
                );
                if ($failAt === 'after-activation') {
                    throw new RuntimeException('Injected interrupted postactivation acknowledgment');
                }
                self::verifyPermit(
                    $pending, $operatorPem, $operatorPin, $permitHead,
                    $previousReceiptHead, $siteId, $publisherPin
                );
                return $result + [
                    'preactivationPermitHead'=>$permitHead,
                    'operatorReceiptPending'=>true,'signedOnlySwitch'=>true
                ];
            }
        );
    }

    /**
     * Read-only crash review. Does not publish a receipt; private operator
     * must inspect these facts and sign externally before clearing pending.
     */
    public static function reviewInterrupted(
        PDO $pdo, string $siteId, LabPhpGenerationSwitcher $switcher,
        string $receiptDir, string $pending, string $operatorPem, string $operatorPin,
        string $permitHead, ?string $previousReceiptHead,
        string $bundle, string $publisherPem, string $publisherPin
    ): array {
        self::lab();
        require_once __DIR__ . '/LabSchemaVersionGate.php';
        $r = self::verifyPermit(
            $pending, $operatorPem, $operatorPin, $permitHead,
            $previousReceiptHead, $siteId, $publisherPin
        );
        if (!hash_equals($r['switchRootSha256'], hash('sha256', $switcher->root()))) {
            throw new RuntimeException('Crash-review evidence refers to another switcher root');
        }
        require_once __DIR__ . '/OfflineReleaseVerifier.php';
        require_once __DIR__ . '/LabAttestedActivationGate.php';
        $signed = OfflineReleaseVerifier::verify(
            $bundle, $publisherPem, $r['version'], $publisherPin, $r['minimumVersion']
        );
        if (!hash_equals($signed['archive_sha256'], $r['archiveSha256'])
            || !hash_equals($signed['manifest_sha256'], $r['manifestSha256'])) {
            throw new RuntimeException('Interrupted release archive no longer matches operator approval');
        }
        if ($r['sequence'] > 1) {
            $chain = LabAttestedActivationGate::verifyChain(
                $receiptDir, $operatorPem, $operatorPin,
                $previousReceiptHead, $siteId, $publisherPin
            );
            if ($chain['count'] !== $r['sequence'] - 1
                || $chain['receipt']['version'] !== $r['fromVersion']) {
                throw new RuntimeException('Crash review previous signed generation invalid');
            }
        } else {
            $listing = @scandir($receiptDir);
            if ($listing === false) throw new RuntimeException('Missing independent receipt directory');
            $entries = array_values(array_diff($listing, ['.','..']));
            if ($entries !== []) {
                throw new RuntimeException('Crash review genesis cannot skip retained receipts');
            }
        }
        LabSchemaVersionGate::assertCheckpoint($pdo,$siteId,$r['version'],$r['dbCheckpoint']);
        $view = $switcher->inspect($r['minimumVersion']);
        $actual = $switcher->resolve($r['minimumVersion']);
        if (!$view['ready'] || $view['sequence'] !== $r['sequence']
            || $view['current'] !== $r['version']
            || $view['previous'] !== $r['fromVersion']
            || !hash_equals($actual['digest'], $r['manifestSha256'])) {
            throw new RuntimeException('Crash review cannot attest an incomplete activation');
        }
        return [
            'version'=>$r['version'],'sequence'=>$r['sequence'],
            'manifestSha256'=>$actual['digest'],'archiveSha256'=>$r['archiveSha256'],
            'preactivationPermitHead'=>$permitHead,'operatorReceiptPending'=>true,
            'productionReady'=>false
        ];
    }

    /** Guard pending authorization on both sides of the signed read lease. */
    public static function withVerifiedRequest(
        PDO $pdo, string $siteId, LabPhpGenerationSwitcher $switcher,
        string $receiptDir, string $pending, string $operatorPem, string $operatorPin,
        string $independentHead, string $publisherPin, callable $handler
    ): mixed {
        self::lab();
        require_once __DIR__ . '/LabAttestedActivationGate.php';
        self::assertNoPending($pending);
        return LabAttestedActivationGate::withVerifiedRequest(
            $pdo,$siteId,$switcher,$receiptDir,$operatorPem,$operatorPin,
            $independentHead,$publisherPin,
            static function (array $generation) use ($pending,$handler): mixed {
                self::assertNoPending($pending);
                return $handler($generation);
            }
        );
    }
}
