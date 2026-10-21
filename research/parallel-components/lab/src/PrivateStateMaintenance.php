<?php
declare(strict_types=1);

/**
 * One-filesystem research helper, NOT an outbox or production data store.
 * The directory-wide read/write lock prevents sweeping a path while another
 * process has opened/locked its inode. All filenames contain HMACs, no PII.
 * A pre-existing empty/corrupt entry is NEVER treated as a new grant/claim.
 */
final class PrivateStateMaintenance
{
    public const LOCK_NAME = '.research-state-maintenance.lock';

    public static function validDir(string $dir, string $publicRoot): ?string
    {
        $resolved = realpath($dir);
        $root = realpath($publicRoot);
        if ($resolved === false || $root === false || !is_dir($resolved)
            || !is_writable($resolved) || $resolved === $root
            || str_starts_with($resolved, $root . DIRECTORY_SEPARATOR)
            || (fileperms($resolved) & 0077) !== 0) return null;
        return $resolved;
    }

    /** @return array{0:resource,1:bool}|null */
    public static function openLocked(string $dir, string $leaf, int $mode): ?array
    {
        if ($leaf !== self::LOCK_NAME &&
            preg_match('/^[a-f0-9]{64}\.(?:rate|claim)$/D', $leaf) !== 1) return null;
        if ($mode !== LOCK_EX && $mode !== LOCK_SH) return null;
        $path = $dir . DIRECTORY_SEPARATOR . $leaf;
        if (is_link($path)) return null;
        // x+b identifies first creation. r+b never silently creates an empty
        // existing record after a crash; its emptiness must be treated as damage.
        $previousUmask = umask(0077);
        try {
            $stream = @fopen($path, 'x+b');
            $created = $stream !== false;
            if (!$created) $stream = @fopen($path, 'r+b');
        } finally {
            umask($previousUmask);
        }
        if ($stream === false) return null;
        $locked = false;
        try {
            if (!flock($stream, $mode)) return null;
            $locked = true;
            $stat = fstat($stream);
            $pathStat = @lstat($path);
            if ($stat === false || $pathStat === false ||
                ($stat['mode'] & 0170000) !== 0100000 ||
                ($pathStat['mode'] & 0170000) !== 0100000 ||
                $stat['nlink'] !== 1 || $pathStat['nlink'] !== 1 ||
                $stat['ino'] !== $pathStat['ino'] ||
                $stat['dev'] !== $pathStat['dev'] ||
                ($stat['mode'] & 0077) !== 0 || is_link($path)) return null;
            // The maintenance lock may legitimately be empty; data entries may
            // only be empty if this call was their exclusive creator.
            if ($leaf !== self::LOCK_NAME && !$created && $stat['size'] === 0) return null;
            $out = [$stream, $created];
            $stream = false; // Transfer stream ownership to caller.
            return $out;
        } finally {
            if ($stream !== false) {
                if ($locked) flock($stream, LOCK_UN);
                fclose($stream);
            }
        }
    }

    /** @param resource $stream */
    public static function close($stream): void
    {
        flock($stream, LOCK_UN);
        fclose($stream);
    }

    /** @param resource $stream; fail closed on truncated/short/unsynced writes. */
    public static function write($stream, string $data): bool
    {
        if ($data === '' || strlen($data) > 8192 || !rewind($stream) ||
            !ftruncate($stream, 0)) return false;
        $length = strlen($data);
        $written = 0;
        while ($written < $length) {
            $n = fwrite($stream, substr($data, $written));
            if ($n === false || $n === 0) return false;
            $written += $n;
        }
        if (!fflush($stream)) return false;
        if (function_exists('fsync') && !fsync($stream)) return false;
        return true;
    }

    /**
     * Explicit bounded maintenance operation, never runs during a submit.
     * Unknown/corrupt/unsafe files are retained for manual investigation;
     * only well-formed data outside the maximum 3600-second window is erased.
     *
     * @return array{code:string,examined:int,deleted:int}
     */
    public static function prune(string $dir, string $publicRoot, int $now,
        int $maxScan = 128, int $maxDelete = 32): array
    {
        $unavailable = ['code'=>'PRUNE_UNAVAILABLE','examined'=>0,'deleted'=>0];
        $resolved = self::validDir($dir, $publicRoot);
        if ($resolved === null || $now < 0 || $maxScan < 1 || $maxScan > 1024
            || $maxDelete < 1 || $maxDelete > 128) return $unavailable;
        $lock = self::openLocked($resolved, self::LOCK_NAME, LOCK_EX);
        if ($lock === null) return $unavailable;
        [$maintenance] = $lock;
        $examined = 0;
        $deleted = 0;
        try {
            foreach (new DirectoryIterator($resolved) as $item) {
                $name = $item->getFilename();
                if (!preg_match('/^[a-f0-9]{64}\.(rate|claim)$/D', $name, $match)) continue;
                if ($examined >= $maxScan || $deleted >= $maxDelete) break;
                $examined++;
                // Never resolve symlinks or remove unreadable/corrupt records.
                $entry = self::openLocked($resolved, $name, LOCK_EX);
                if ($entry === null) continue;
                [$stream] = $entry;
                try {
                    $size = fstat($stream)['size'];
                    if ($size < 1 || $size > ($match[1] === 'rate' ? 8192 : 128)) continue;
                    rewind($stream);
                    $raw = stream_get_contents($stream, $size + 1);
                    if (!is_string($raw) || strlen($raw) !== $size) continue;
                    $record = json_decode($raw, true);
                    $obsolete = $match[1] === 'claim'
                        ? self::oldClaim($record, $now)
                        : self::oldRate($record, $now);
                    if ($obsolete && @unlink($resolved . DIRECTORY_SEPARATOR . $name)) $deleted++;
                } finally {
                    self::close($stream);
                }
            }
            return ['code'=>'PRUNED','examined'=>$examined,'deleted'=>$deleted];
        } catch (Throwable) {
            return ['code'=>'PRUNE_UNAVAILABLE','examined'=>$examined,'deleted'=>$deleted];
        } finally {
            self::close($maintenance);
        }
    }

    private static function oldClaim(mixed $record, int $now): bool
    {
        return is_array($record) && array_keys($record) === ['v','at'] &&
            $record['v'] === 1 && is_int($record['at']) &&
            $record['at'] >= 0 && $record['at'] <= $now - 3600;
    }

    private static function oldRate(mixed $record, int $now): bool
    {
        if (!is_array($record) || !array_is_list($record) ||
            $record === [] || count($record) > 100) return false;
        $prior = -1;
        foreach ($record as $at) {
            if (!is_int($at) || $at < 0 || $at > $now || $at < $prior) return false;
            $prior = $at;
        }
        return $prior <= $now - 3600;
    }
}
