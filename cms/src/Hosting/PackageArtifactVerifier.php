<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use RuntimeException;

/**
 * Read-only, PHP-only integrity verification for a staged EMPTY Stage2 CMS.
 * SHA256 checks accidental modification, NOT authenticity of an unsigned release.
 * Never executes package code, connects to a DB, or approves a production install.
 */
final class PackageArtifactVerifier
{
    private const MAX_MANIFEST = 250000;
    private const MAX_FILES = 1200;
    private const MAX_FILE_BYTES = 8388608;
    private const MAX_TOTAL_BYTES = 180000000;

    private static function refuse(string $why): never
    {
        throw new RuntimeException($why);
    }

    private static function canonicalRoot(string $root): string
    {
        if ($root === '' || str_contains($root, "\0") || is_link($root)
            || realpath($root) !== $root || !is_dir($root)) {
            self::refuse('Explicit canonical package root required');
        }
        return $root;
    }

    private static function file(string $path, int $max): array
    {
        $stat = @lstat($path);
        if ($stat === false || is_link($path) || !is_file($path)
            || ($stat['nlink'] ?? 0) !== 1 || $stat['size'] < 0
            || $stat['size'] > $max || realpath($path) !== $path) {
            self::refuse('Unsafe package regular file');
        }
        return $stat;
    }

    private static function relative(string $path): void
    {
        if ($path === '' || str_contains($path, '\\') || str_contains($path, "\0")
            || str_starts_with($path, '/') || strlen($path) > 512
            || preg_match('/(?:^|\/)(?:\.|\.\.|\.git|\.github|\.env(?:\..*)?|\.ssh|\.npmrc|secrets?|node_modules|\.build|storage)(?:\/|$)/iD', $path)
            || preg_match('/\.(?:pem|key|sqlite|sqlite3|db|p12|pfx)$/iD', $path)) {
            self::refuse('Unsafe package inventory member');
        }
        foreach (explode('/', $path) as $part) {
            if ($part === '' || $part === '.' || $part === '..') {
                self::refuse('Noncanonical inventory member');
            }
        }
    }

    /** @return array{format:string,filesVerified:int,bytesVerified:int,readOnly:bool,signatureVerified:bool,productionReady:bool} */
    public static function verify(string $root): array
    {
        $root = self::canonicalRoot($root);
        $manifestPath = $root.'/private/package-manifest.json';
        $stat = self::file($manifestPath, self::MAX_MANIFEST);
        if ($stat['size'] < 2) self::refuse('Empty manifest');
        $json = @file_get_contents($manifestPath);
        if (!is_string($json) || strlen($json) !== $stat['size']) {
            self::refuse('Cannot read bounded manifest');
        }
        try {
            $meta = json_decode($json, true, 16, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            self::refuse('Invalid manifest JSON');
        }
        if (!is_array($meta)
            || ($meta['format'] ?? null) !== 'ai-site-cms-internal-stage2-v2'
            || ($meta['stage'] ?? null) !== 2
            || ($meta['productionReady'] ?? null) !== false
            || ($meta['isSigned'] ?? null) !== false
            || ($meta['documentRoot'] ?? null) !== 'public'
            || ($meta['adminEditorAssets'] ?? null) !== 'private/editor'
            || ($meta['writeEndpointsAvailable'] ?? null) !== false
            || ($meta['hostingComposerOrNodeRequired'] ?? null) !== false
            || !is_string($meta['releaseVersion'] ?? null)
            || !preg_match('/^0\.\d+\.\d+-stage2\.\d+$/D', $meta['releaseVersion'])
            || !is_array($meta['files'] ?? null)
            || array_keys($meta['files']) !== range(0, count($meta['files']) - 1)
            || count($meta['files']) < 20 || count($meta['files']) > self::MAX_FILES) {
            self::refuse('Unsupported internal Stage2 package declaration');
        }
        $listed = [];
        $size = 0;
        foreach ($meta['files'] as $record) {
            if (!is_array($record) || count($record) !== 3
                || !isset($record['path'], $record['bytes'], $record['sha256'])
                || !is_string($record['path']) || !is_int($record['bytes'])
                || $record['bytes'] < 0 || $record['bytes'] > self::MAX_FILE_BYTES
                || !is_string($record['sha256'])
                || !preg_match('/^[a-f0-9]{64}$/D', $record['sha256'])) {
                self::refuse('Malformed package inventory record');
            }
            self::relative($record['path']);
            if (isset($listed[$record['path']])) {
                self::refuse('Duplicate file in package inventory');
            }
            $listed[$record['path']] = true;
            $absolute = $root.'/'.$record['path'];
            $fileStat = self::file($absolute, self::MAX_FILE_BYTES);
            if ($fileStat['size'] !== $record['bytes']) {
                self::refuse('Package file length changed');
            }
            $digest = @hash_file('sha256', $absolute);
            if (!is_string($digest) || !hash_equals($record['sha256'], $digest)) {
                self::refuse('Package file digest changed');
            }
            $size += $record['bytes'];
            if ($size > self::MAX_TOTAL_BYTES) {
                self::refuse('Package byte budget exceeded');
            }
        }
        foreach (['public/index.php','vendor/autoload.php','private/editor/editor.js',
            'bin/install.php','bin/schema-preflight.php','bin/site-runtime-topology.php',
            'bin/package-preflight.php'] as $essential) {
            if (!isset($listed[$essential])) {
                self::refuse('Missing isolated empty-CMS package essential');
            }
        }
        if (isset($listed['public/editor.js']) || isset($listed['public/bin/install.php'])) {
            self::refuse('Administrative code exposed inside package public root');
        }
        $stack = [[$root, '']];
        $found = [];
        $nodes = 0;
        while ($stack !== []) {
            [$dir, $prefix] = array_pop($stack);
            $names = @scandir($dir);
            if ($names === false) self::refuse('Unreadable staged package directory');
            foreach ($names as $name) {
                if ($name === '.' || $name === '..') continue;
                if (++$nodes > self::MAX_FILES * 3) self::refuse('Package inventory node budget exceeded');
                $relative = $prefix.$name;
                self::relative($relative);
                $path = $dir.'/'.$name;
                $item = @lstat($path);
                if ($item === false || is_link($path)) self::refuse('Unsafe package node');
                if (is_dir($path)) {
                    $stack[] = [$path, $relative.'/'];
                } elseif (is_file($path)) {
                    self::file($path, self::MAX_FILE_BYTES);
                    if ($relative !== 'private/package-manifest.json'
                        && !isset($listed[$relative])) self::refuse('Unlisted package file');
                    $found[$relative] = true;
                } else {
                    self::refuse('Unexpected package filesystem node');
                }
            }
        }
        if (count($found) !== count($listed) + 1 || !isset($found['private/package-manifest.json'])) {
            self::refuse('Missing or duplicated package inventory file');
        }
        return [
            'format'=>'ai-site-cms-stage2-empty-package-preflight-v1',
            'filesVerified'=>count($listed),
            'bytesVerified'=>$size,
            'readOnly'=>true,
            'signatureVerified'=>false,
            'productionReady'=>false
        ];
    }
}
