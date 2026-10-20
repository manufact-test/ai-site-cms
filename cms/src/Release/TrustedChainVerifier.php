<?php
declare(strict_types=1);

namespace AiSiteCms\Release;

use RuntimeException;

/**
 * Stage2 READ-ONLY verification of the Node lab trust succession chain.
 * Public trust root and retained minimum epoch are independent operator inputs.
 * No writes, key enrollment, DB connections or live-host deployment.
 */
final class TrustedChainVerifier
{
    private const FORMAT = 'ai-site-cms-stage2-trust-chain-lab-v1';
    private const DOMAIN = "AI-SITE-CMS-STAGE2-TRUST-ROTATION-V1\0";
    private const DER_PREFIX = "\x30\x2a\x30\x05\x06\x03\x2b\x65\x70\x03\x21\x00";

    /** @return array<string,mixed> */
    public static function inspect(
        string $chainPath, string $rootPublicPem, string $rootFingerprint, int $externalMinEpoch
    ): array {
        if (!Ed25519Backend::available()
            || !preg_match('/^[a-f0-9]{64}$/D', $rootFingerprint)
            || $externalMinEpoch < 0 || $externalMinEpoch > 16) {
            throw new RuntimeException('Explicit trusted root and valid epoch required');
        }
        $root = dirname($chainPath);
        $actualRoot = realpath($root);
        if ($actualRoot === false || $root !== $actualRoot
            || dirname($root) !== realpath(sys_get_temp_dir())
            || !str_starts_with(basename($root), 'ai-site-cms-trust-lab-')
            || is_link($root) || basename($chainPath) !== 'trust-chain.json') {
            throw new RuntimeException('Only disposable trust laboratory state permitted');
        }
        $rootKeyPath = realpath($rootPublicPem);
        if ($rootKeyPath === false || $rootKeyPath === $root
            || str_starts_with($rootKeyPath, $root . DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('Original root public key must be out-of-band');
        }
        $key = self::readEd25519Pem($rootPublicPem);
        if (!hash_equals(hash('sha256', self::DER_PREFIX . $key), $rootFingerprint)) {
            throw new RuntimeException('Original root pin mismatch');
        }
        $chain = self::json(self::readRegular($chainPath, 32768));
        self::exact($chain, ['format','root','events']);
        if ($chain['format'] !== self::FORMAT || $chain['root'] !== $rootFingerprint
            || !is_array($chain['events']) || !array_is_list($chain['events'])
            || count($chain['events']) > 16) {
            throw new RuntimeException('Untrusted or malformed trust chain');
        }
        $fp = $rootFingerprint;
        $floor = null;
        $used = [$fp => true];
        foreach ($chain['events'] as $epoch => $event) {
            self::exact($event, ['proposal','oldSignature','newSignature']);
            $p = $event['proposal'];
            self::exact($p, ['format','root','from','to','epochFrom','epochTo',
                'floorVersion','newPublicDer','purpose']);
            if ($p['format'] !== self::FORMAT || $p['purpose'] !== 'scheduled-rotation'
                || $p['root'] !== $rootFingerprint || $p['from'] !== $fp
                || $p['epochFrom'] !== $epoch || $p['epochTo'] !== $epoch + 1
                || $p['epochTo'] > 16 || !is_string($p['floorVersion'])) {
                throw new RuntimeException('Untrusted trust epoch/root/signer');
            }
            self::version($p['floorVersion']);
            if ($floor !== null && self::compare($p['floorVersion'], $floor) < 0) {
                throw new RuntimeException('Trust release floor regressed');
            }
            if (!is_string($p['newPublicDer'])
                || !preg_match('/^[A-Za-z0-9+\/]+={0,2}$/D', $p['newPublicDer'])) {
                throw new RuntimeException('Invalid successor key bytes');
            }
            $der = base64_decode($p['newPublicDer'], true);
            if ($der === false || strlen($der) !== 44
                || base64_encode($der) !== $p['newPublicDer']
                || !hash_equals(self::DER_PREFIX, substr($der, 0, 12))) {
                throw new RuntimeException('Malformed Ed25519 successor key encoding');
            }
            $newFp = hash('sha256', $der);
            if ($p['to'] !== $newFp || isset($used[$newFp])) {
                throw new RuntimeException('Untrusted or previously retired successor');
            }
            if (!is_string($event['oldSignature']) || !is_string($event['newSignature'])
                || !preg_match('/^[a-f0-9]{128}$/D', $event['oldSignature'])
                || !preg_match('/^[a-f0-9]{128}$/D', $event['newSignature'])) {
                throw new RuntimeException('Missing dual key authorization');
            }
            $signed = self::DOMAIN . self::canonical($p);
            $oldSig = hex2bin($event['oldSignature']);
            $newSig = hex2bin($event['newSignature']);
            $newKey = substr($der, 12);
            if ($oldSig === false || $newSig === false
                || !Ed25519Backend::verifyDetached($oldSig, $signed, $key)
                || !Ed25519Backend::verifyDetached($newSig, $signed, $newKey)) {
                throw new RuntimeException('Both incumbent and successor Ed25519 signatures required');
            }
            $key = $newKey;
            $fp = $newFp;
            $floor = $p['floorVersion'];
            $used[$fp] = true;
        }
        $epoch = count($chain['events']);
        if ($epoch < $externalMinEpoch) {
            throw new RuntimeException('Local trust history below out-of-band epoch checkpoint');
        }
        foreach (['trust-chain.json.new', 'trust-intent.json.new', 'trust-exclusive.lock'] as $name) {
            if (file_exists($root . '/' . $name) || is_link($root . '/' . $name)) {
                throw new RuntimeException('Incomplete or locked operator trust state');
            }
        }
        $status = 'clean';
        $pendingPath = $root . '/trust-intent.json';
        if (file_exists($pendingPath) || is_link($pendingPath)) {
            $intent = self::json(self::readRegular($pendingPath, 1024));
            self::exact($intent, ['format','fromEpoch','eventSha256']);
            if ($intent['format'] !== self::FORMAT
                || !is_int($intent['fromEpoch']) || $intent['fromEpoch'] < 0
                || !is_string($intent['eventSha256'])
                || !preg_match('/^[a-f0-9]{64}$/D', $intent['eventSha256'])) {
                throw new RuntimeException('Invalid trust intent');
            }
            if ($epoch === $intent['fromEpoch']) {
                $status = 'pending-before-commit';
            } elseif ($epoch === $intent['fromEpoch'] + 1
                && hash_equals(hash('sha256', self::canonical($chain['events'][$epoch - 1])),
                    $intent['eventSha256'])) {
                $status = 'committed-needs-cleanup';
            } else {
                throw new RuntimeException('Unreconcilable trust journal');
            }
        }
        return [
            'format' => 'ai-site-cms-stage2-php-trust-chain-v1',
            'status' => $status,
            'epoch' => $epoch,
            'active_key_fingerprint' => $fp,
            'minimum_release_version' => $floor,
            'all_transition_signatures_verified' => true,
            'out_of_band_epoch_required' => true,
            'production_ready' => false,
            'publisher_identity_proven' => false,
            'host_tested' => false,
            'safe_to_deploy' => false,
        ];
    }

    /** @return array<string,mixed> */
    public static function verifyRelease(
        string $chainPath, string $rootPublicPem, string $rootFingerprint,
        int $externalMinEpoch, string $signerPublicPem,
        string $signedReleaseFolder, string $expectedVersion
    ): array {
        $state = self::inspect($chainPath, $rootPublicPem, $rootFingerprint, $externalMinEpoch);
        if ($state['status'] !== 'clean' || $state['minimum_release_version'] === null) {
            throw new RuntimeException('Unresolved trust state / missing release floor');
        }
        require_once __DIR__ . '/OfflineReleaseVerifier.php';
        $release = OfflineReleaseVerifier::verify(
            $signedReleaseFolder, $signerPublicPem, $expectedVersion,
            $state['active_key_fingerprint'], $state['minimum_release_version']
        );
        return [
            'verification' => 'current_epoch_and_signed_release_metadata_verified',
            'epoch' => $state['epoch'],
            'signer' => $state['active_key_fingerprint'],
            'version' => $release['version'],
            'archive_extracted' => false,
            'inventory_files_verified' => false,
            'production_ready' => false,
            'safe_to_deploy' => false,
        ];
    }

    private static function canonical(array $object): string
    {
        return json_encode($object, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
    }

    /** @return array<string,mixed> */
    private static function json(string $bytes): array
    {
        try { $value = json_decode($bytes, true, 32, JSON_THROW_ON_ERROR); }
        catch (\JsonException $e) { throw new RuntimeException('Malformed trust JSON', 0, $e); }
        if (!is_array($value)) throw new RuntimeException('Trust JSON must be object');
        return $value;
    }

    /** @param list<string> $keys */
    private static function exact(mixed $object, array $keys): void
    {
        if (!is_array($object) || array_keys($object) !== $keys) {
            throw new RuntimeException('Noncanonical trust JSON shape or field order');
        }
    }

    private static function readRegular(string $file, int $max): string
    {
        $s = @lstat($file);
        if ($s === false || is_link($file) || !is_file($file)
            || ($s['nlink'] ?? 0) !== 1 || $s['size'] < 2 || $s['size'] > $max) {
            throw new RuntimeException('Unsafe trust evidence node');
        }
        $bytes = @file_get_contents($file);
        if ($bytes === false || strlen($bytes) > $max) {
            throw new RuntimeException('Cannot read trust evidence');
        }
        return $bytes;
    }

    private static function readEd25519Pem(string $file): string
    {
        $pem = self::readRegular($file, 512);
        if (!preg_match('/\A-----BEGIN PUBLIC KEY-----\r?\n([A-Za-z0-9+\/=\r\n]+)-----END PUBLIC KEY-----\r?\n?\z/D', $pem, $m)) {
            throw new RuntimeException('Single Ed25519 SPKI public key required');
        }
        $der = base64_decode(str_replace(["\r","\n"], '', $m[1]), true);
        if ($der === false || strlen($der) !== 44
            || !hash_equals(self::DER_PREFIX, substr($der, 0, 12))) {
            throw new RuntimeException('Wrong root Ed25519 public key');
        }
        return substr($der, 12);
    }

    private static function version(string $v): void
    {
        if (!preg_match('/^0\.[0-9]{1,9}\.[0-9]{1,9}-stage2\.[0-9]{1,9}$/D', $v)) {
            throw new RuntimeException('Invalid laboratory release floor');
        }
    }

    private static function compare(string $a, string $b): int
    {
        self::version($a); self::version($b);
        $parts = static function (string $s): array {
            preg_match('/^0\.([0-9]+)\.([0-9]+)-stage2\.([0-9]+)$/D', $s, $m);
            return [(int)$m[1], (int)$m[2], (int)$m[3]];
        };
        return $parts($a) <=> $parts($b);
    }
}
