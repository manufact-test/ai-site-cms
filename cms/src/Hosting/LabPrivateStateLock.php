<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use RuntimeException;
use Throwable;

/**
 * Shared lock identity for lab-only SQLite per-database operations.
 * Crucial: the lock derives from the canonical DB file, NOT site ID or
 * CMS/code root. Two competing operators claiming one DB cannot bypass it
 * by choosing different installation identities.
 *
 * No production, distributed or remote-FS locking guarantee.
 */
final class LabPrivateStateLock
{
    /** @param list<string> $databases */
    public static function withLocks(array $databases, callable $callback): mixed
    {
        if (PHP_SAPI !== 'cli' || $databases === []) {
            throw new RuntimeException('Explicit local operator database lock required');
        }
        $names = [];
        foreach ($databases as $db) {
            if (!is_string($db) || $db === '' || !str_starts_with($db, '/')
                || str_contains($db, "\0") || str_contains($db, '\\')
                || str_contains($db, '?') || str_contains($db, '#')
                || $db !== dirname($db).'/'.basename($db)
                || is_link($db)) {
                throw new RuntimeException('Unsafe lock resource');
            }
            $parent = dirname($db);
            if (realpath($parent) !== $parent || $parent === '/' || is_link($parent)
                || !is_dir($parent) || ((@fileperms($parent) & 0077) !== 0)) {
                throw new RuntimeException('Lock requires canonical private DB parent');
            }
            $lock = $parent.'/.stage2-db-'.substr(hash('sha256', $db), 0, 32).'.lock';
            if (is_link($lock) || (file_exists($lock) && !is_file($lock))) {
                throw new RuntimeException('Unsafe existing lock file');
            }
            $names[$lock] = true;
        }
        $paths = array_keys($names);
        sort($paths, SORT_STRING); // deterministic order avoids deadlock
        $handles = [];
        try {
            foreach ($paths as $file) {
                $old = umask(0077);
                try { $handle = @fopen($file, 'c+'); }
                finally { umask($old); }
                if ($handle === false) throw new RuntimeException('Unable to open private state lock');
                $handles[] = $handle;
                $stat = @lstat($file);
                $opened = @fstat($handle);
                if ($stat === false || $opened === false || is_link($file)
                    || !is_file($file) || ($stat['nlink'] ?? 0) !== 1
                    || ($stat['mode'] & 0077) !== 0
                    || $stat['dev'] !== $opened['dev'] || $stat['ino'] !== $opened['ino']
                    || !flock($handle, LOCK_EX)) {
                    throw new RuntimeException('Untrusted lock or exclusive lock failed');
                }
                // Refuse replacement between the lstat and flock.
                $now = @lstat($file);
                if ($now === false || $now['dev'] !== $opened['dev']
                    || $now['ino'] !== $opened['ino'] || is_link($file)) {
                    throw new RuntimeException('Private lock raced with filesystem replacement');
                }
            }
            return $callback();
        } finally {
            foreach (array_reverse($handles) as $handle) {
                @flock($handle, LOCK_UN);
                fclose($handle);
            }
        }
    }
}
