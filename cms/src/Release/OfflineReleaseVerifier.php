<?php
declare(strict_types=1);

namespace AiSiteCms\Release;

use RuntimeException;

/**
 * Stage2 OFFLINE, read-only PHP verifier for Node-created Ed25519 lab envelopes.
 * Does NOT extract archives, install code, attest publisher identity, or authorize deployment.
 * The PEM and its pinned fingerprint MUST originate independently of the archive.
 */
final class OfflineReleaseVerifier
{
    private const ENVELOPE_FORMAT = 'ai-site-cms-stage2-signed-lab-envelope-v1';
    private const DOMAIN = "AI-SITE-CMS-STAGE2-LAB-ENVELOPE-V1\0";
    private const DER_PREFIX = "\x30\x2a\x30\x05\x06\x03\x2b\x65\x70\x03\x21\x00";
    private const MAX_ARCHIVE = 67108864;
    private const MAX_META = 4096;

    /**
     * @param list<string> $revokedFingerprints
     * @return array<string,mixed>
     */
    public static function verify(
        string $folder, string $trustedPublicPem, string $expectedVersion,
        string $pinnedFingerprint, ?string $minimumVersion = null,
        array $revokedFingerprints = []
    ): array {
        self::version($expectedVersion);
        if ($minimumVersion !== null && self::compare($expectedVersion, $minimumVersion) < 0) {
            throw new RuntimeException('Release below pinned minimum version');
        }
        if (!preg_match('/^[a-f0-9]{64}$/D', $pinnedFingerprint)) {
            throw new RuntimeException('Explicit trusted key fingerprint required');
        }
        if (!function_exists('sodium_crypto_sign_verify_detached')) {
            throw new RuntimeException('Ed25519 verifier unavailable in current PHP runtime');
        }
        $actualFolder = realpath($folder);
        if ($actualFolder === false || !is_dir($actualFolder) || is_link($folder)) {
            throw new RuntimeException('Invalid offline release folder');
        }
        $keyPath = realpath($trustedPublicPem);
        if ($keyPath === false || self::inside($keyPath, $actualFolder)) {
            throw new RuntimeException('Trust anchor must be out-of-band');
        }
        $pem = self::regularBytes($trustedPublicPem, 512);
        $publicRaw = self::parseEd25519Pem($pem);
        $fingerprint = hash('sha256', self::DER_PREFIX . $publicRaw);
        if (!hash_equals($fingerprint, $pinnedFingerprint)
            || in_array($fingerprint, $revokedFingerprints, true)) {
            throw new RuntimeException('Trusted key pin revoked or mismatched');
        }

        $metadata = self::regularBytes($actualFolder . '/envelope.json', self::MAX_META);
        $signature = self::regularBytes($actualFolder . '/envelope.sig', 64);
        $archiveFile = $actualFolder . '/package.zip';
        self::requireRegular($archiveFile, self::MAX_ARCHIVE);
        if (strlen($signature) !== 64
            || !sodium_crypto_sign_verify_detached($signature, self::DOMAIN . $metadata, $publicRaw)) {
            throw new RuntimeException('Invalid detached Ed25519 release signature');
        }

        try {
            $signed = json_decode($metadata, true, 16, JSON_THROW_ON_ERROR);
        } catch (\JsonException $error) {
            throw new RuntimeException('Invalid release envelope JSON', 0, $error);
        }
        if (!is_array($signed) || !preg_match('/^[a-f0-9]{64}$/D',
            is_string($signed['packageManifestSha256'] ?? null) ? $signed['packageManifestSha256'] : '')) {
            throw new RuntimeException('Missing signed package inventory digest');
        }
        $archiveBytes = filesize($archiveFile);
        $archiveHash = hash_file('sha256', $archiveFile);
        if ($archiveBytes === false || $archiveHash === false) {
            throw new RuntimeException('Cannot hash offline release archive');
        }
        $expected = [
            'format' => self::ENVELOPE_FORMAT,
            'version' => $expectedVersion,
            'channel' => 'internal-laboratory',
            'productionReady' => false,
            'signatureAlgorithm' => 'Ed25519',
            'trustedKeyFingerprint' => $fingerprint,
            'archiveName' => 'package.zip',
            'archiveBytes' => $archiveBytes,
            'archiveSha256' => $archiveHash,
            'packageManifestSha256' => $signed['packageManifestSha256'],
        ];
        $canonical = json_encode($expected, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
        if (!hash_equals($canonical, $metadata)) {
            throw new RuntimeException('Signed metadata does not match exact archive/version/policy');
        }
        return [
            'format' => 'ai-site-cms-stage2-php-offline-verifier-v1',
            'verification' => 'signed_archive_metadata_verified',
            'version' => $expectedVersion,
            'trusted_key_fingerprint' => $fingerprint,
            'archive_sha256' => $archiveHash,
            'manifest_sha256' => $signed['packageManifestSha256'],
            'archive_extracted' => false,
            'inventory_files_verified' => false,
            'publisher_identity_proven' => false,
            'real_host_compatibility_verified' => false,
            'safe_to_deploy' => false,
            'network_attempted' => false,
            'filesystem_modified' => false,
        ];
    }

    private static function parseEd25519Pem(string $pem): string
    {
        if (!preg_match('/\A-----BEGIN PUBLIC KEY-----\r?\n([A-Za-z0-9+\/=\r\n]+)-----END PUBLIC KEY-----\r?\n?\z/D', $pem, $match)) {
            throw new RuntimeException('Expected a single Ed25519 SPKI public PEM');
        }
        $body = str_replace(["\r", "\n"], '', $match[1]);
        $der = base64_decode($body, true);
        if ($der === false || strlen($der) !== 44
            || !hash_equals(self::DER_PREFIX, substr($der, 0, 12))) {
            throw new RuntimeException('Invalid Ed25519 public key encoding');
        }
        return substr($der, 12);
    }

    private static function requireRegular(string $filename, int $limit): void
    {
        $s = @lstat($filename);
        if ($s === false || !is_file($filename) || is_link($filename)
            || ($s['nlink'] ?? 0) !== 1 || $s['size'] < 1 || $s['size'] > $limit) {
            throw new RuntimeException('Unsafe offline release file');
        }
    }

    private static function regularBytes(string $filename, int $limit): string
    {
        self::requireRegular($filename, $limit);
        $bytes = @file_get_contents($filename);
        if ($bytes === false || strlen($bytes) > $limit) {
            throw new RuntimeException('Cannot read offline release evidence');
        }
        return $bytes;
    }

    private static function inside(string $candidate, string $directory): bool
    {
        return $candidate === $directory
            || str_starts_with($candidate, rtrim($directory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR);
    }

    private static function version(string $version): void
    {
        if (!preg_match('/^0\.[0-9]{1,9}\.[0-9]{1,9}-stage2\.[0-9]{1,9}$/D', $version)) {
            throw new RuntimeException('Invalid Stage2 laboratory release version');
        }
    }

    private static function compare(string $left, string $right): int
    {
        self::version($left);
        self::version($right);
        $extract = static function (string $v): array {
            preg_match('/^0\.([0-9]+)\.([0-9]+)-stage2\.([0-9]+)$/D', $v, $m);
            return [(int)$m[1], (int)$m[2], (int)$m[3]];
        };
        return $extract($left) <=> $extract($right);
    }
}
