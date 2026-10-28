<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use InvalidArgumentException;
use RuntimeException;

/**
 * Owner-operated, CLI-only, bounded multi-file transport for a COMPLETE v2 archive.
 * No selective omission, no executable payload, no public HTTP endpoint.
 * This format is a transport envelope, not a replacement for the v2 data contract.
 */
final class ArchiveBundle
{
    public const FORMAT = 'manufact-site-backup-bundle-v1';
    public const PART_BYTES = 8000000;
    private const LIMIT = SiteRepository::ARCHIVE_BUNDLE_LIMIT;

    private static function check(bool $ok, string $message): void
    {
        if (!$ok) throw new InvalidArgumentException('Backup bundle: ' . $message);
    }

    private static function json(array $value): string
    {
        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private static function keys(mixed $value, array $fields): void
    {
        self::check(is_array($value) && array_keys($value) === $fields, 'unexpected or missing manifest fields');
    }

    private static function digest(mixed $value): bool
    {
        return is_string($value) && preg_match('/^[a-f0-9]{64}$/D', $value) === 1;
    }

    private static function partName(int $i): string
    {
        return sprintf('part-%03d.bin', $i + 1);
    }

    private static function absoluteDir(string $path, bool $exists): string
    {
        self::check(str_starts_with($path, '/') && $path !== '/' && !str_ends_with($path, '/'),
            'absolute directory path without trailing slash required');
        self::check(!is_link($path), 'symlink directory forbidden');
        if ($exists) {
            self::check(is_dir($path), 'bundle directory missing');
            $real = realpath($path);
            self::check($real !== false && $real === $path, 'bundle directory must be canonical');
        } else {
            self::check(!file_exists($path), 'destination already exists; refusing overwrite');
            $parent = realpath(dirname($path));
            self::check(is_string($parent) && is_dir($parent) && is_writable($parent)
                && $parent === dirname($path), 'canonical writable parent required');
            self::check(!in_array(basename($path), ['.', '..', ''], true), 'invalid directory name');
        }
        return $path;
    }

    private static function writePrivate(string $path, string $contents): void
    {
        $handle = @fopen($path, 'x+b');
        if ($handle === false) throw new RuntimeException('Cannot create private backup file');
        try {
            if (!chmod($path, 0600)) throw new RuntimeException('Cannot protect backup file');
            $length = strlen($contents);
            $offset = 0;
            while ($offset < $length) {
                $written = fwrite($handle, substr($contents, $offset, min(1048576, $length - $offset)));
                if ($written === false || $written === 0) throw new RuntimeException('Incomplete backup write');
                $offset += $written;
            }
            if (!fflush($handle)) throw new RuntimeException('Backup flush failed');
        } finally {
            fclose($handle);
        }
    }

    private static function clearTemp(string $directory): void
    {
        if (!is_dir($directory) || is_link($directory)) return;
        foreach (scandir($directory) ?: [] as $item) {
            if ($item !== '.' && $item !== '..' && is_file($directory . '/' . $item)) {
                unlink($directory . '/' . $item);
            }
        }
        rmdir($directory);
    }

    public static function export(SiteRepository $repository, string $siteId, string $destination): array
    {
        self::absoluteDir($destination, false);
        // ExportArchive takes one consistent database snapshot; v2 content validation is reused.
        $archive = $repository->exportArchive($siteId, self::LIMIT);
        $json = self::json($archive);
        $length = strlen($json);
        self::check($length >= 1 && $length <= self::LIMIT - 1024, 'archive exceeds extended size limit');
        $parts = [];
        $temp = dirname($destination) . '/.stage3-backup-' . bin2hex(random_bytes(12));
        if (!mkdir($temp, 0700)) throw new RuntimeException('Cannot create private staging directory');
        try {
            for ($offset = 0, $i = 0; $offset < $length; $offset += self::PART_BYTES, $i++) {
                $bytes = substr($json, $offset, self::PART_BYTES);
                $name = self::partName($i);
                self::writePrivate($temp . '/' . $name, $bytes);
                $parts[] = ['file' => $name, 'bytes' => strlen($bytes), 'sha256' => hash('sha256', $bytes)];
            }
            $manifest = [
                'format' => self::FORMAT, 'archiveFormat' => 'manufact-site-backup-v2',
                'sourceSiteId' => $archive['payload']['siteId'],
                'archiveBytes' => $length, 'archiveSha256' => hash('sha256', $json),
                'partBytes' => self::PART_BYTES, 'parts' => $parts
            ];
            self::writePrivate($temp . '/manifest.json', self::json($manifest) . "\n");
            self::check(!file_exists($destination) && !is_link($destination),
                'destination appeared during export');
            if (!rename($temp, $destination)) throw new RuntimeException('Cannot finish backup bundle');
            return ['directory' => $destination, 'sourceSiteId' => $siteId,
                'archiveBytes' => $length, 'parts' => count($parts),
                'archiveSha256' => $manifest['archiveSha256']];
        } catch (\Throwable $e) {
            self::clearTemp($temp);
            throw $e;
        }
    }

    /** Read and verify every byte before any database writes. */
    public static function read(string $directory): array
    {
        self::absoluteDir($directory, true);
        $file = $directory . '/manifest.json';
        self::check(is_file($file) && !is_link($file) && filesize($file) <= 100000, 'invalid manifest file');
        $manifest = json_decode((string)file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
        self::keys($manifest, ['format','archiveFormat','sourceSiteId','archiveBytes','archiveSha256','partBytes','parts']);
        self::check($manifest['format'] === self::FORMAT
            && $manifest['archiveFormat'] === 'manufact-site-backup-v2'
            && is_string($manifest['sourceSiteId'])
            && preg_match('/^[a-z][a-z0-9-]{2,79}$/D', $manifest['sourceSiteId']) === 1
            && is_int($manifest['archiveBytes']) && $manifest['archiveBytes'] >= 1
            && $manifest['archiveBytes'] <= self::LIMIT - 1024
            && self::digest($manifest['archiveSha256'])
            && $manifest['partBytes'] === self::PART_BYTES
            && is_array($manifest['parts']) && array_is_list($manifest['parts'])
            && count($manifest['parts']) === (int)ceil($manifest['archiveBytes'] / self::PART_BYTES),
            'invalid bundle header');
        $expectedFiles = ['manifest.json'];
        $json = '';
        foreach ($manifest['parts'] as $i => $part) {
            self::keys($part, ['file','bytes','sha256']);
            $name = self::partName($i);
            $expectedBytes = min(self::PART_BYTES, $manifest['archiveBytes'] - $i * self::PART_BYTES);
            self::check($part['file'] === $name && is_int($part['bytes'])
                && $part['bytes'] === $expectedBytes && self::digest($part['sha256']), 'invalid part descriptor');
            $path = $directory . '/' . $name;
            self::check(is_file($path) && !is_link($path) && filesize($path) === $expectedBytes,
                'missing, linked or truncated part');
            $bytes = file_get_contents($path);
            self::check(is_string($bytes) && strlen($bytes) === $expectedBytes
                && hash_equals($part['sha256'], hash('sha256', $bytes)), 'part SHA256 mismatch');
            $json .= $bytes;
            $expectedFiles[] = $name;
        }
        $actualFiles = array_diff(scandir($directory) ?: [], ['.', '..']);
        sort($expectedFiles);
        sort($actualFiles);
        self::check($actualFiles === $expectedFiles, 'unexpected files in bundle directory');
        self::check(strlen($json) === $manifest['archiveBytes']
            && hash_equals($manifest['archiveSha256'], hash('sha256', $json)), 'archive SHA256 mismatch');
        $archive = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        self::check(is_array($archive) && ($archive['format'] ?? null) === $manifest['archiveFormat']
            && ($archive['payload']['siteId'] ?? null) === $manifest['sourceSiteId'],
            'archive identity mismatch');
        return $archive;
    }

    public static function plan(SiteRepository $repository, string $directory, string $target): array
    {
        $archive = self::read($directory);
        return $repository->planArchive($archive, $target, self::LIMIT);
    }

    public static function restore(SiteRepository $repository, string $directory, string $target): array
    {
        $archive = self::read($directory);
        $plan = $repository->planArchive($archive, $target, self::LIMIT);
        $repository->importArchive($archive, $target, self::LIMIT);
        return $plan;
    }
}
