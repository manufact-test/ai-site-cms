<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use JsonException;
use RuntimeException;

/**
 * Read a local Stage2 operator record through one verified descriptor.
 * No network, database connection, key loading, install or approval.
 * Records remain untrusted input even after the filesystem checks.
 */
final class Stage2PrivateOperatorRecord
{
    public static function readBytes(string $file, int $maxBytes = 4096, int $minBytes = 1): string
    {
        if ($file === '' || strlen($file) > 4096 || $file[0] !== '/'
            || str_contains($file, "\0") || str_contains($file, '\\')
            || $file === '/' || $maxBytes < 1 || $maxBytes > 262144
            || $minBytes < 1 || $minBytes > $maxBytes) {
            throw new RuntimeException('PRIVATE_OPERATOR_PATH_OR_BOUND_REFUSED');
        }
        $parent = dirname($file);
        clearstatcache(true, $parent);
        clearstatcache(true, $file);
        $directory = @lstat($parent);
        $before = @lstat($file);
        if ($directory === false || $before === false || $parent === '/'
            || !is_dir($parent) || is_link($parent)
            || realpath($parent) !== $parent
            || ($directory['mode'] & 0077) !== 0
            || !is_file($file) || is_link($file) || realpath($file) !== $file
            || ($before['mode'] & 0170000) !== 0100000
            || ($before['mode'] & 0077) !== 0 || $before['nlink'] !== 1
            || $before['size'] < $minBytes || $before['size'] > $maxBytes) {
            throw new RuntimeException('PRIVATE_OPERATOR_FILE_REFUSED');
        }
        // Opening may follow a last-millisecond changed symlink. Never read
        // before fstat has proved the opened inode equals the vetted lstat.
        $stream = @fopen($file, 'rb');
        if ($stream === false) {
            throw new RuntimeException('PRIVATE_OPERATOR_OPEN_REFUSED');
        }
        try {
            $opened = @fstat($stream);
            if ($opened === false || $opened['dev'] !== $before['dev']
                || $opened['ino'] !== $before['ino']
                || ($opened['mode'] & 0170000) !== 0100000
                || ($opened['mode'] & 0077) !== 0 || $opened['nlink'] !== 1
                || $opened['size'] !== $before['size']) {
                throw new RuntimeException('PRIVATE_OPERATOR_INODE_CHANGED');
            }
            $bytes = @stream_get_contents($stream, $maxBytes + 1);
            $after = @fstat($stream);
            clearstatcache(true, $file);
            $pathAfter = @lstat($file);
            if (!is_string($bytes) || $after === false || $pathAfter === false
                || strlen($bytes) !== $opened['size']
                || $after['dev'] !== $opened['dev']
                || $after['ino'] !== $opened['ino']
                || $after['size'] !== $opened['size']
                || $after['mtime'] !== $opened['mtime']
                || $after['ctime'] !== $opened['ctime']
                || $pathAfter['dev'] !== $opened['dev']
                || $pathAfter['ino'] !== $opened['ino']
                || $pathAfter['size'] !== $opened['size']
                || $pathAfter['nlink'] !== 1
                || ($pathAfter['mode'] & 0077) !== 0
                || realpath($parent) !== $parent) {
                throw new RuntimeException('PRIVATE_OPERATOR_RECORD_CHANGED');
            }
            if (str_contains($bytes, "\0")) {
                throw new RuntimeException('PRIVATE_OPERATOR_NUL_REFUSED');
            }
            return $bytes;
        } finally {
            fclose($stream);
        }
    }

    /** @return array<string,mixed> */
    public static function readJsonObject(string $file, int $maxBytes = 4096): array
    {
        $bytes = self::readBytes($file, $maxBytes, 2);
        try {
            $decoded = json_decode($bytes, true, 16, JSON_THROW_ON_ERROR);
            if (!is_array($decoded) || array_is_list($decoded)
                || json_encode($decoded, JSON_THROW_ON_ERROR) !== $bytes) {
                throw new RuntimeException('PRIVATE_OPERATOR_JSON_NOT_CANONICAL');
            }
            return $decoded;
        } catch (JsonException $e) {
            throw new RuntimeException('PRIVATE_OPERATOR_JSON_INVALID', 0, $e);
        }
    }
}
