<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use RuntimeException;
use Throwable;

/**
 * Verifies an offline, signed Stage3 PHP-host engine directory.
 * SHA-256 inventories are integrity data; RSA signature + pinned key authenticate the publisher.
 */
final class EngineReleaseVerifier
{
    public const FORMAT = 'manufact-cms-engine-release-v2';
    public const DOMAIN = "MANUFACT-CMS-ENGINE-RELEASE-V2\0";
    private const MAX_MANIFEST = 524288;
    private const MAX_SIGNATURE = 8192;
    private const MAX_FILES = 2000;
    private const MAX_BYTES = 60000000;
    private const STUDIO_FILES = [
        'index.html','bundle.js','studio.css','hosted.js','hosted.css','access.js','media-processing.js',
        'celikom-original-studio.js','celikom-original-studio.css'
    ];
    private const MEDIA_FILES = [
        'lib/contract.cjs','lib/sha256.cjs','workbench/engine.js'
    ];

    public static function verify(string $releaseDirectory, string $trustedPublicKeyPath, bool $verifyFiles = true): array
    {
        $root = self::canonicalDirectory($releaseDirectory);
        $manifestPath = $root . DIRECTORY_SEPARATOR . 'cms-release.json';
        $signaturePath = $root . DIRECTORY_SEPARATOR . 'cms-release.sig';
        $manifestRaw = self::readRegular($manifestPath, self::MAX_MANIFEST, false);
        $signature = self::readRegular($signaturePath, self::MAX_SIGNATURE, false);
        $publicPem = self::readRegular($trustedPublicKeyPath, 32768, true);
        if (!str_contains($publicPem, '-----BEGIN PUBLIC KEY-----') || str_contains($publicPem, 'PRIVATE KEY')) {
            throw new RuntimeException('Publisher trust anchor must contain only a public SubjectPublicKeyInfo PEM');
        }
        $publicKey = @openssl_pkey_get_public($publicPem);
        if ($publicKey === false) {
            throw new RuntimeException('Publisher trust anchor is not a valid public key');
        }
        $details = openssl_pkey_get_details($publicKey);
        if (!is_array($details) || ($details['type'] ?? null) !== OPENSSL_KEYTYPE_RSA
            || (int)($details['bits'] ?? 0) < 3072) {
            throw new RuntimeException('Publisher key must be RSA with at least 3072 bits');
        }

        try {
            $manifest = json_decode($manifestRaw, true, 64, JSON_THROW_ON_ERROR);
        } catch (Throwable $error) {
            throw new RuntimeException('CMS engine release manifest is malformed', 0, $error);
        }
        if (!is_array($manifest) || array_is_list($manifest)
            || !hash_equals(self::canonicalJson($manifest), $manifestRaw)) {
            throw new RuntimeException('CMS engine release manifest is not canonical JSON');
        }
        $expectedKeys = [
            'bytes','channel','deployed','engine','files','fingerprint','format','loaderAbi',
            'minimumPhpVersion','migrations','ownerApprovalRequired','profile','publisherKeySha256',
            'releaseVersion','requiredExtensions','schema','signatureAlgorithm'
        ];
        sort($expectedKeys, SORT_STRING);
        if (array_keys($manifest) !== $expectedKeys) {
            throw new RuntimeException('CMS engine release manifest fields are incomplete or unknown');
        }
        if ($manifest['format'] !== self::FORMAT || $manifest['engine'] !== 'manufact-ai-site-cms'
            || $manifest['profile'] !== 'php-host' || $manifest['channel'] !== 'stable'
            || $manifest['signatureAlgorithm'] !== 'rsa-3072-sha256'
            || $manifest['ownerApprovalRequired'] !== true || $manifest['deployed'] !== false
            || $manifest['loaderAbi'] !== 1
            || !is_string($manifest['releaseVersion'])
            || !preg_match('/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?$/D', $manifest['releaseVersion'])
            || !is_string($manifest['minimumPhpVersion'])
            || !preg_match('/^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)$/D', $manifest['minimumPhpVersion'])
            || version_compare($manifest['minimumPhpVersion'], '8.1.0', '<')
            || version_compare(PHP_VERSION, $manifest['minimumPhpVersion'], '<')) {
            throw new RuntimeException('CMS engine release identity or runtime compatibility is unsupported');
        }
        $requiredExtensions = ['json','mbstring','openssl','pdo','pdo_mysql'];
        if ($manifest['requiredExtensions'] !== $requiredExtensions) {
            throw new RuntimeException('CMS engine release extension contract is unsupported');
        }
        foreach ($requiredExtensions as $extension) {
            if (!extension_loaded($extension)) {
                throw new RuntimeException('CMS engine requires a missing PHP extension: ' . $extension);
            }
        }
        $schema = $manifest['schema'] ?? null;
        if (!is_array($schema) || array_keys($schema) !== ['maximum','minimum','target']
            || $schema['minimum'] !== 1 || $schema['maximum'] !== 1 || $schema['target'] !== 1
            || $manifest['migrations'] !== []) {
            throw new RuntimeException('Only schema-preserving Stage3 engine releases are currently supported');
        }
        $publisherFingerprint = hash('sha256', $publicPem);
        if (!is_string($manifest['publisherKeySha256'])
            || !hash_equals($publisherFingerprint, $manifest['publisherKeySha256'])) {
            throw new RuntimeException('CMS engine release was signed by a different publisher key');
        }
        $signatureResult = @openssl_verify(self::DOMAIN . $manifestRaw, $signature, $publicKey, OPENSSL_ALGO_SHA256);
        if ($signatureResult !== 1) {
            throw new RuntimeException('CMS engine release signature is invalid or could not be verified');
        }

        $files = $manifest['files'] ?? null;
        if (!is_array($files) || !array_is_list($files) || count($files) < 1 || count($files) > self::MAX_FILES) {
            throw new RuntimeException('CMS engine release file inventory is invalid');
        }
        $seen = [];
        $previous = '';
        $bytes = 0;
        foreach ($files as $file) {
            if (!is_array($file) || array_keys($file) !== ['path','sha256','size']
                || !is_string($file['path']) || !self::allowedPath($file['path'])
                || !is_string($file['sha256']) || !preg_match('/^[a-f0-9]{64}$/D', $file['sha256'])
                || !is_int($file['size']) || $file['size'] < 0 || $file['size'] > self::MAX_BYTES) {
                throw new RuntimeException('CMS engine release contains an invalid file entry');
            }
            $path = $file['path'];
            $lower = strtolower($path);
            if (isset($seen[$lower]) || ($previous !== '' && strcmp($previous, $path) >= 0)) {
                throw new RuntimeException('CMS engine release paths are duplicated or not sorted');
            }
            $seen[$lower] = true;
            $previous = $path;
            $bytes += $file['size'];
            if ($bytes > self::MAX_BYTES) {
                throw new RuntimeException('CMS engine release exceeds the byte limit');
            }
        }
        $requiredFiles = ['stage3/server/bootstrap.php','stage3/server/public/index.php',
            'stage3/server/EngineReleaseVerifier.php','stage3/server/EngineLifecycle.php',
            'stage3/server/DatabaseSnapshot.php','stage3/server/DatabaseServerCompatibility.php','stage3/server/EngineRuntime.php',
            'stage3/studio/bundle.js','stage3/studio/hosted.js','stage3/components/custom-section.json'];
        foreach ($requiredFiles as $required) {
            if (!isset($seen[strtolower($required)])) throw new RuntimeException('CMS engine release is missing a required runtime file: ' . $required);
        }
        if ($manifest['bytes'] !== $bytes
            || !is_string($manifest['fingerprint'])
            || !hash_equals(hash('sha256', self::canonicalJson($files)), $manifest['fingerprint'])) {
            throw new RuntimeException('CMS engine release inventory fingerprint does not match');
        }
        if ($verifyFiles) {
            self::verifyInventory($root, $files);
        }
        return [
            'root' => $root,
            'manifest' => $manifest,
            'fingerprint' => $manifest['fingerprint'],
            'releaseVersion' => $manifest['releaseVersion'],
            'profile' => $manifest['profile'],
            'schemaVersion' => 1
        ];
    }

    public static function fingerprintStage3Root(string $stage3Root): string
    {
        $root = self::canonicalDirectory($stage3Root);
        $files = self::inventoryStage3Root($root);
        return hash('sha256', self::canonicalJson($files));
    }

    public static function inventoryStage3Root(string $stage3Root): array
    {
        $root = self::canonicalDirectory($stage3Root);
        $files = [];
        $bytes = 0;
        foreach (['components','media-motion','server','studio'] as $directory) {
            $base = $root . DIRECTORY_SEPARATOR . $directory;
            if (!is_dir($base) || is_link($base)) {
                throw new RuntimeException('Installed CMS engine directory is incomplete');
            }
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($base, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $item) {
                $path = $item->getPathname();
                if ($item->isLink() || $item->isDir()) {
                    if ($item->isLink()) {
                        throw new RuntimeException('Installed CMS engine contains a symbolic link');
                    }
                    continue;
                }
                if (!$item->isFile()) {
                    throw new RuntimeException('Installed CMS engine contains a special file');
                }
                $relative = str_replace(DIRECTORY_SEPARATOR, '/', substr($path, strlen($root) + 1));
                if (!self::allowedPath('stage3/' . $relative)) {
                    continue;
                }
                $stat = @lstat($path);
                if ($stat === false || ($stat['nlink'] ?? 0) !== 1 || realpath($path) !== $path) {
                    throw new RuntimeException('Installed CMS engine contains an unsafe file');
                }
                $size = (int)$stat['size'];
                $hash = hash_file('sha256', $path);
                if (!is_string($hash)) {
                    throw new RuntimeException('Unable to inventory installed CMS engine');
                }
                $files[] = ['path' => 'stage3/' . $relative, 'sha256' => $hash, 'size' => $size];
                $bytes += $size;
            }
        }
        usort($files, static fn(array $a, array $b): int => strcmp($a['path'], $b['path']));
        if ($files === [] || count($files) > self::MAX_FILES || $bytes > self::MAX_BYTES) {
            throw new RuntimeException('Installed CMS engine inventory is outside supported limits');
        }
        return $files;
    }

    private static function verifyInventory(string $root, array $files): void
    {
        $expected = [];
        foreach ($files as $file) {
            $expected[$file['path']] = $file;
            $path = $root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $file['path']);
            $stat = @lstat($path);
            if ($stat === false || !is_file($path) || is_link($path) || realpath($path) !== $path
                || ($stat['nlink'] ?? 0) !== 1 || (int)$stat['size'] !== $file['size']) {
                throw new RuntimeException('CMS engine release file is missing or unsafe');
            }
            $hash = hash_file('sha256', $path);
            if (!is_string($hash) || !hash_equals($file['sha256'], $hash)) {
                throw new RuntimeException('CMS engine release file hash does not match');
            }
        }
        $stage3 = $root . DIRECTORY_SEPARATOR . 'stage3';
        $rootEntries = array_values(array_diff(scandir($root) ?: [], ['.','..','cms-release.json','cms-release.sig','stage3']));
        if ($rootEntries !== [] || !is_dir($stage3) || is_link($stage3)) {
            throw new RuntimeException('CMS engine release has unexpected root entries');
        }
        $allowedRoots = ['components','media-motion','server','studio'];
        $stageEntries = array_values(array_diff(scandir($stage3) ?: [], ['.','..',...$allowedRoots]));
        if ($stageEntries !== []) {
            throw new RuntimeException('CMS engine release has unexpected runtime directories');
        }
        $actual = [];
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($stage3, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($iterator as $item) {
            if ($item->isLink()) {
                throw new RuntimeException('CMS engine release contains a symbolic link');
            }
            if ($item->isDir()) {
                continue;
            }
            if (!$item->isFile()) {
                throw new RuntimeException('CMS engine release contains a special file');
            }
            $relative = 'stage3/' . str_replace(DIRECTORY_SEPARATOR, '/', substr($item->getPathname(), strlen($stage3) + 1));
            if (!isset($expected[$relative])) {
                throw new RuntimeException('CMS engine release contains an unlisted file: ' . $relative);
            }
            $actual[$relative] = true;
        }
        if (count($actual) !== count($expected)) {
            throw new RuntimeException('CMS engine release inventory is incomplete');
        }
    }

    private static function allowedPath(string $path): bool
    {
        if (str_contains($path, '\\') || str_contains($path, "\0") || str_contains($path, '//')
            || preg_match('~(^|/)\.{1,2}(/|$)~', $path)
            || preg_match('~^[a-zA-Z0-9._\[\]-]+(?:/[a-zA-Z0-9._\[\]-]+)+$~D', $path) !== 1) {
            return false;
        }
        if (str_starts_with($path, 'stage3/server/')) {
            return str_ends_with(strtolower($path), '.php') || $path === 'stage3/server/public/.htaccess';
        }
        if (str_starts_with($path, 'stage3/components/')) {
            return str_ends_with(strtolower($path), '.json');
        }
        if (str_starts_with($path, 'stage3/studio/')) {
            return in_array(substr($path, strlen('stage3/studio/')), self::STUDIO_FILES, true);
        }
        if (str_starts_with($path, 'stage3/media-motion/')) {
            return in_array(substr($path, strlen('stage3/media-motion/')), self::MEDIA_FILES, true);
        }
        return false;
    }

    private static function canonicalDirectory(string $path): string
    {
        $real = realpath($path);
        if (!is_string($real) || !is_dir($real) || is_link($path) || $real !== $path) {
            throw new RuntimeException('CMS engine release directory is not canonical');
        }
        return $real;
    }

    private static function readRegular(string $path, int $limit, bool $private): string
    {
        $stat = @lstat($path);
        $mode = is_file($path) ? @fileperms($path) : false;
        if ($stat === false || !is_file($path) || is_link($path) || realpath($path) !== $path
            || ($stat['nlink'] ?? 0) !== 1 || $stat['size'] < 1 || $stat['size'] > $limit
            || $mode === false || ($private && (($mode & 0077) !== 0))) {
            throw new RuntimeException('CMS engine release contains an unsafe metadata file');
        }
        $raw = @file_get_contents($path);
        if (!is_string($raw) || strlen($raw) !== (int)$stat['size']) {
            throw new RuntimeException('Unable to read CMS engine release metadata');
        }
        return $raw;
    }

    private static function canonicalJson(mixed $value): string
    {
        $normalize = static function (mixed $item) use (&$normalize): mixed {
            if (!is_array($item)) {
                return $item;
            }
            if (array_is_list($item)) {
                return array_map($normalize, $item);
            }
            ksort($item, SORT_STRING);
            foreach ($item as $key => $child) {
                $item[$key] = $normalize($child);
            }
            return $item;
        };
        return json_encode($normalize($value), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }
}
