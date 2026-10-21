<?php
declare(strict_types=1);

/**
 * Emergency Stage2 PRIVATE-CREDENTIAL REVOCATION, never a DB rollback.
 *
 * hPanel: first DISABLE both the installation Cron and this cleanup Cron.
 * Create ../cms-stage2-local/revoke-request.json (0600) deliberately.
 * Invoke this PHP file ONCE via CLI (hPanel Cron), then disable this Cron.
 *
 * Refuses to read once.json/password, include Composer/vendor, connect to
 * MySQL, delete CMS tables, clear the receipt, or touch public_html.
 * Revocation cannot cancel a PHP process already executing with credentials.
 * Leave receipt.json and revocation.json intact for operator investigation.
 */
if (PHP_SAPI !== 'cli' || $argc !== 1 || PHP_VERSION_ID < 80100) {
    if (PHP_SAPI === 'cli') fwrite(STDERR, "STAGE2_REVOKE_CLI_ONLY\n");
    exit(3);
}
try {
    $root = realpath(dirname(__DIR__));
    if ($root === false || basename($root) !== 'cms-stage2-offweb-runtime'
        || is_link($root) || !is_dir($root)) {
        throw new RuntimeException('ROOT_REFUSED');
    }
    $parent = dirname($root);
    $public = $parent.'/public_html';
    if (!is_dir($public) || is_link($public) || realpath($public) !== $public) {
        throw new RuntimeException('PUBLIC_BOUNDARY_REFUSED');
    }
    $local = $parent.'/cms-stage2-local';
    $localStat = @lstat($local);
    if ($localStat === false || is_link($local) || !is_dir($local)
        || realpath($local) !== $local || ($localStat['mode'] & 0077) !== 0) {
        throw new RuntimeException('PRIVATE_ROOT_REQUIRED');
    }
    $safeFile = static function (string $file, int $min, int $max): bool {
        $s = @lstat($file);
        return $s !== false && !is_link($file) && is_file($file)
            && realpath($file) === $file && ($s['mode'] & 0077) === 0
            && ($s['nlink'] ?? 0) === 1
            && $s['size'] >= $min && $s['size'] <= $max;
    };
    // Do not load any package PHP. This is a PIN of an unsigned manifest only;
    // it does not prove the publisher's identity or signed release origin.
    $manifestFile = $root.'/private/package-manifest.json';
    if (!$safeFile($manifestFile, 100, 250000)) {
        // Manifest is deliberately 0644 in GitHub offweb packages.
        $st = @lstat($manifestFile);
        if ($st === false || is_link($manifestFile) || !is_file($manifestFile)
            || realpath($manifestFile) !== $manifestFile
            || ($st['nlink'] ?? 0) !== 1 || $st['size'] < 100
            || $st['size'] > 250000) {
            throw new RuntimeException('MANIFEST_REFUSED');
        }
    }
    $digest = @hash_file('sha256', $manifestFile);
    if (!is_string($digest)) throw new RuntimeException('MANIFEST_HASH_FAILED');
    $requestFile = $local.'/revoke-request.json';
    if (!$safeFile($requestFile, 75, 2048)) throw new RuntimeException('REVOKE_REQUEST_REFUSED');
    // The checked filename may be replaced after lstat(). Read the SAME
    // inode through a held descriptor and re-check after reading. The
    // emergency path must remain Composer-free and DB-free.
    $requestBefore=@lstat($requestFile);
    $fd=@fopen($requestFile,'rb');
    if ($fd === false) throw new RuntimeException('REVOKE_REQUEST_UNREADABLE');
    try {
        $opened=@fstat($fd);
        if ($opened === false || $requestBefore === false
            || $opened['dev'] !== $requestBefore['dev']
            || $opened['ino'] !== $requestBefore['ino']
            || $opened['size'] !== $requestBefore['size']
            || ($opened['mode'] & 0077) !== 0 || ($opened['nlink'] ?? 0) !== 1) {
            throw new RuntimeException('REVOKE_REQUEST_INODE_CHANGED');
        }
        $raw=@stream_get_contents($fd,2049);
        $after=@fstat($fd);
        $pathAfter=@lstat($requestFile);
        if (!is_string($raw) || strlen($raw) !== $opened['size']
            || $after === false || $pathAfter === false
            || $after['dev'] !== $opened['dev']
            || $after['ino'] !== $opened['ino']
            || $after['mtime'] !== $opened['mtime']
            || $after['ctime'] !== $opened['ctime']
            || $after['size'] !== $opened['size']
            || $pathAfter['dev'] !== $opened['dev']
            || $pathAfter['ino'] !== $opened['ino']
            || ($pathAfter['mode'] & 0077) !== 0
            || $pathAfter['nlink'] !== 1) {
            throw new RuntimeException('REVOKE_REQUEST_CHANGED_DURING_READ');
        }
    } finally {
        fclose($fd);
    }
    if (str_contains($raw,"\0")) throw new RuntimeException('REVOKE_REQUEST_NUL');
    $request = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
    if (!is_array($request)
        || json_encode($request, JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES) !== $raw) {
        throw new RuntimeException('REVOKE_REQUEST_NONCANONICAL');
    }
    $keys = array_keys($request);
    sort($keys);
    if (!is_array($request) || array_is_list($request)
        || $keys !== ['acknowledge_running_process_may_continue','confirm',
            'format','package_manifest_sha256','site','target']
        || ($request['format'] ?? null) !== 'ai-site-cms-stage2-revoke-v1'
        || ($request['target'] ?? null) !== 'lightseagreen-woodpecker-264491.hostingersite.com'
        || ($request['site'] ?? null) !== 'hostinger-stage2-test'
        || ($request['confirm'] ?? null) !== 'REVOKE_PRIVATE_TASK_ONLY_NO_DATABASE_ROLLBACK'
        || ($request['acknowledge_running_process_may_continue'] ?? null) !== true
        || ($request['package_manifest_sha256'] ?? null) !== $digest) {
        throw new RuntimeException('REVOKE_SCOPE_REFUSED');
    }

    $taskFile = $local.'/once.json';
    if (!$safeFile($taskFile, 50, 4096)) {
        throw new RuntimeException('TASK_UNSAFE_OR_ALREADY_CONSUMED');
    }
    $recordFile = $local.'/revocation.json';
    // Exclusive record is a one-time lock, and permanently blocks *future*
    // Stage2 installer processes. Existing in-flight PHP cannot be cancelled.
    if (file_exists($recordFile) || is_link($recordFile)) {
        throw new RuntimeException('REVOCATION_ALREADY_RECORDED');
    }
    $umask = umask(0077);
    try {
        $stream = @fopen($recordFile, 'x+b');
    } finally {
        umask($umask);
    }
    if ($stream === false) throw new RuntimeException('REVOCATION_LOCK_REFUSED');

    $record = [
        'format'=>'ai-site-cms-stage2-revocation-v1',
        'packageManifestSha256'=>$digest,
        'status'=>'revocation_started',
        'taskFilePresent'=>true,
        'databaseResult'=>'unknown',
        'credentialRead'=>false,
        'databaseConnected'=>false,
        'inFlightProcessMayContinue'=>true
    ];
    $write = static function ($file, array $value): void {
        $json = json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES)."\n";
        if (!rewind($file) || !ftruncate($file, 0)
            || fwrite($file, $json) !== strlen($json)
            || !fflush($file) || !fsync($file)) {
            throw new RuntimeException('REVOCATION_RECORD_WRITE_REFUSED');
        }
    };
    try {
        $write($stream, $record);
        if (!@unlink($taskFile)) {
            throw new RuntimeException('PRIVATE_TASK_UNLINK_FAILED');
        }
        $record['taskFilePresent'] = false;
        $record['status'] = 'private_task_revoked_no_db_claim';
        $write($stream, $record);
        // No receipt reset, no re-authorization, no package/client changes.
        echo "STAGE2_PRIVATE_TASK_REVOKED_DB_STATUS_UNKNOWN\n";
        exit(0);
    } finally {
        fclose($stream);
    }
} catch (Throwable $ignored) {
    // No exception messages: they might contain untrusted local file content.
    fwrite(STDERR, "STAGE2_REVOKE_REFUSED_MANUAL_REVIEW\n");
    exit(3);
}
