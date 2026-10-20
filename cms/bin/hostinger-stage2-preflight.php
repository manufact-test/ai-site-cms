<?php
declare(strict_types=1);

/**
 * CREDENTIAL-FREE and CODE-FREE Hostinger Stage2 CLI preflight.
 * Does not include, autoload or execute ANY PHP from the package.
 * No HTTP entry point, DB connection, task reads, writes or restoration.
 * Unsigned self-consistent inventory is NOT publisher authentication.
 * An operator must compare reported manifest SHA-256 out-of-band.
 */
if (PHP_SAPI !== 'cli' || $argc !== 1 || PHP_VERSION_ID < 80100) {
    if (PHP_SAPI === 'cli') fwrite(STDERR, "STAGE2_PREFLIGHT_CLI_ONLY\n");
    exit(3);
}
try {
    $root = realpath(dirname(__DIR__));
    if ($root === false || basename($root) !== 'cms-stage2-offweb-runtime'
        || is_link($root) || !is_dir($root)) {
        throw new RuntimeException('OFFWEB_ROOT_REFUSED');
    }
    $parent = dirname($root);
    $public = $parent.'/public_html';
    if (!is_dir($public) || is_link($public) || realpath($public) !== $public
        || str_starts_with($root, $public.'/')) {
        throw new RuntimeException('PUBLIC_BOUNDARY_REFUSED');
    }

    $manifestPath = $root.'/private/package-manifest.json';
    $manifestStat = @lstat($manifestPath);
    if ($manifestStat === false || !is_file($manifestPath) || is_link($manifestPath)
        || ($manifestStat['nlink'] ?? 0) !== 1
        || $manifestStat['size'] < 100 || $manifestStat['size'] > 250000
        || realpath($manifestPath) !== $manifestPath) {
        throw new RuntimeException('MANIFEST_REFUSED');
    }
    $manifestBytes = @file_get_contents($manifestPath);
    if (!is_string($manifestBytes) || strlen($manifestBytes) !== $manifestStat['size']) {
        throw new RuntimeException('MANIFEST_READ_REFUSED');
    }
    $manifestDigest = hash('sha256', $manifestBytes);
    $manifest = json_decode($manifestBytes, true, 16, JSON_THROW_ON_ERROR);
    if (!is_array($manifest)
        || ($manifest['format'] ?? null) !== 'ai-site-cms-internal-stage2-v2'
        || ($manifest['stage'] ?? null) !== 2
        || ($manifest['productionReady'] ?? null) !== false
        || ($manifest['isSigned'] ?? null) !== false
        || ($manifest['writeEndpointsAvailable'] ?? null) !== false
        || ($manifest['documentRoot'] ?? null) !== 'public'
        || ($manifest['adminEditorAssets'] ?? null) !== 'private/editor'
        || ($manifest['hostingComposerOrNodeRequired'] ?? null) !== false
        || !is_array($manifest['files'] ?? null)
        || count($manifest['files']) < 20 || count($manifest['files']) > 1200
        || array_keys($manifest['files']) !== range(0, count($manifest['files'])-1)) {
        throw new RuntimeException('MANIFEST_CONTRACT_REFUSED');
    }

    // Inventory the filesystem BEFORE hashing referenced files; symlinked
    // directories must not allow a manifest path to escape the offweb root.
    $found = [];
    $nodes = 0;
    $validPath = static function (string $relative): bool {
        if ($relative === '' || strlen($relative) > 512
            || preg_match('~\A[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*\z~D', $relative) !== 1
            || preg_match('~(?:^|/)(?:\.|\.\.|\.git|\.github|\.env(?:\..*)?|\.ssh|\.npmrc|secrets?|node_modules|\.build)(?:/|$)~iD', $relative)
            || preg_match('~\Astorage(?:/|$)~iD', $relative)
            || preg_match('~\.(?:pem|key|sqlite|sqlite3|db|p12|pfx)\z~iD', $relative)) {
            return false;
        }
        return true;
    };
    $stack = [[$root, '']];
    while ($stack !== []) {
        [$folder, $prefix] = array_pop($stack);
        $names = @scandir($folder);
        if ($names === false) throw new RuntimeException('PACKAGE_DIRECTORY_UNREADABLE');
        foreach ($names as $name) {
            if ($name === '.' || $name === '..') continue;
            if (++$nodes > 3600) throw new RuntimeException('PACKAGE_NODE_BUDGET');
            $relative = $prefix.$name;
            if (!$validPath($relative)) throw new RuntimeException('PACKAGE_PATH_REFUSED');
            $path = $folder.'/'.$name;
            $stat = @lstat($path);
            if ($stat === false || is_link($path) || realpath($path) !== $path) {
                throw new RuntimeException('PACKAGE_SYMLINK_REFUSED');
            }
            if (is_dir($path)) {
                $stack[] = [$path, $relative.'/'];
            } elseif (is_file($path)) {
                if (($stat['nlink'] ?? 0) !== 1 || $stat['size'] < 0 || $stat['size'] > 8388608) {
                    throw new RuntimeException('PACKAGE_FILE_REFUSED');
                }
                $found[$relative] = $stat['size'];
            } else {
                throw new RuntimeException('PACKAGE_NODE_REFUSED');
            }
        }
    }
    if (!isset($found['private/package-manifest.json'])
        || count($found) !== count($manifest['files'])+1) {
        throw new RuntimeException('PACKAGE_FILE_COUNT_REFUSED');
    }
    $listed = [];
    $totalBytes = 0;
    foreach ($manifest['files'] as $record) {
        if (!is_array($record) || count($record) !== 3
            || !is_string($record['path'] ?? null)
            || !$validPath($record['path'])
            || isset($listed[$record['path']])
            || !is_int($record['bytes'] ?? null)
            || $record['bytes'] < 0 || $record['bytes'] > 8388608
            || !is_string($record['sha256'] ?? null)
            || preg_match('/\A[a-f0-9]{64}\z/D', $record['sha256']) !== 1
            || !array_key_exists($record['path'], $found)
            || $found[$record['path']] !== $record['bytes']) {
            throw new RuntimeException('PACKAGE_INVENTORY_REFUSED');
        }
        $listed[$record['path']] = true;
        $hash = @hash_file('sha256', $root.'/'.$record['path']);
        if (!is_string($hash) || !hash_equals($record['sha256'], $hash)) {
            throw new RuntimeException('PACKAGE_DIGEST_REFUSED');
        }
        $totalBytes += $record['bytes'];
        if ($totalBytes > 180000000) throw new RuntimeException('PACKAGE_SIZE_BUDGET');
    }
    foreach ($found as $relative => $size) {
        if ($relative !== 'private/package-manifest.json' && !isset($listed[$relative])) {
            throw new RuntimeException('PACKAGE_UNLISTED_FILE');
        }
    }
    foreach (['public/index.php', 'public/.htaccess', 'vendor/autoload.php',
        'private/editor/editor.js', 'bin/hostinger-stage2-once.php',
        'bin/hostinger-stage2-preflight.php', 'src/Hosting/PackageArtifactVerifier.php'] as $essential) {
        if (!isset($listed[$essential])) throw new RuntimeException('PACKAGE_ESSENTIAL_MISSING');
    }

    $local = $parent.'/cms-stage2-local';
    $privateState = 'absent';
    if (file_exists($local) || is_link($local)) {
        $d = @lstat($local);
        $privateState = $d !== false && is_dir($local) && !is_link($local)
            && realpath($local) === $local && ($d['mode'] & 0077) === 0
            ? 'private_directory_ready' : 'private_directory_refused';
    }

    // Only inspect restricted metadata of known local files. NEVER read
    // once.json: it contains a password. Do not print paths, DB names or
    // receipt contents (even a malformed receipt could contain secrets).
    $taskState = 'absent';
    $receiptState = 'absent';
    if ($privateState === 'private_directory_ready') {
        $privateFile = static function (string $file, int $max): bool {
            $s = @lstat($file);
            return $s !== false && is_file($file) && !is_link($file)
                && realpath($file) === $file && ($s['mode'] & 0077) === 0
                && ($s['nlink'] ?? 0) === 1
                && $s['size'] >= 50 && $s['size'] <= $max;
        };
        $task = $local.'/once.json';
        if (file_exists($task) || is_link($task)) {
            $taskState = $privateFile($task, 4096) ? 'private_task_present' : 'unsafe_task_refused';
        }
        $receipt = $local.'/receipt.json';
        if (file_exists($receipt) || is_link($receipt)) {
            $receiptState = 'manual_review_required';
            if ($privateFile($receipt, 4096)) {
                try {
                    $data = json_decode((string)file_get_contents($receipt), true, 8, JSON_THROW_ON_ERROR);
                    if (is_array($data)
                        && ($data['format'] ?? null) === 'ai-site-cms-stage2-hostinger-local-receipt-v1'
                        && ($data['packageManifestSha256'] ?? null) === $manifestDigest
                        && ($data['cmsPublicActivated'] ?? null) === false
                        && ($data['stage2Accepted'] ?? null) === false
                        && ($data['productionReady'] ?? null) === false
                        && in_array($data['operation'] ?? null,
                            ['probe','install','verify','snapshot','snapshot-verify'], true)
                        && in_array($data['status'] ?? null,
                            ['observed','installed_empty_foundation','verified',
                             'foundation_snapshot_saved','foundation_snapshot_verified','refused'], true)
                        && ($data['failureCategory'] ?? null) !== 'not_started'
                        && is_string($data['startedAtUtc'] ?? null)
                        && is_string($data['finishedAtUtc'] ?? null)) {
                        $receiptState = $data['status'] === 'refused'
                            ? 'completed_refused' : 'completed_observed';
                    }
                } catch (Throwable $ignored) {
                    $receiptState = 'manual_review_required';
                }
            }
        }
    }
    $mysqlDriver = class_exists(PDO::class)
        && in_array('mysql', PDO::getAvailableDrivers(), true);
    $report = [
        'format' => 'ai-site-cms-stage2-hostinger-cli-preflight-v2',
        'targetSite' => 'hostinger-stage2-test',
        'sapi' => 'cli',
        'phpVersionMajorMinor' => PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION,
        'pdoMysqlAvailable' => $mysqlDriver,
        'privateLocalState' => $privateState,
        'taskState' => $taskState,
        'receiptState' => $receiptState,
        'oneShotAvailable' => $mysqlDriver
            && $privateState === 'private_directory_ready'
            && $taskState === 'private_task_present'
            && $receiptState === 'absent',
        'packageManifestSha256' => $manifestDigest,
        'unsignedInventoryFilesVerified' => count($listed),
        'unsignedInventoryPassed' => true,
        'packagePhpLoaded' => false,
        'databaseConnectionAttempted' => false,
        'credentialsRead' => false,
        'filesWritten' => false,
        'cmsPublicActivated' => false,
        'stage2Accepted' => false,
        'productionReady' => false,
        'publisherSignatureVerified' => false
    ];
    echo json_encode($report, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES)."\n";
    exit(0);
} catch (Throwable $ignored) {
    fwrite(STDERR, "STAGE2_PREFLIGHT_REFUSED\n");
    exit(3);
}
