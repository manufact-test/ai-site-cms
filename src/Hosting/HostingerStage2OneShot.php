<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use AiSiteCms\Storage\FoundationSnapshot;
use AiSiteCms\Storage\SchemaManager;
use PDO;
use RuntimeException;
use Throwable;

/**
 * Stage2 single-run Hostinger hPanel PHP cron task. NO HTTP entry point.
 * Locally authored configuration stays outside both the webroot and the
 * unsigned distributable. Only the dedicated CMS test DB is ever selected.
 * NOT production installation, activation, or a signed-release verifier.
 */
final class HostingerStage2OneShot
{
    public const TARGET = 'lightseagreen-woodpecker-264491.hostingersite.com';
    public const SITE = 'hostinger-stage2-test';

    /** @return array<string,mixed> Nonsecret local receipt. */
    public static function run(string $packageRoot, string $localRoot): array
    {
        if (PHP_SAPI !== 'cli' || PHP_VERSION_ID < 80100) {
            throw new RuntimeException('CLI_PHP81_REQUIRED');
        }
        self::assertRoots($packageRoot, $localRoot);
        // Complete unsigned inventory check BEFORE any DB connection.
        PackageArtifactVerifier::verify($packageRoot);
        // Nonsecret exact package fingerprint; NOT a signed-release proof.
        $manifestDigest = hash_file('sha256', $packageRoot.'/private/package-manifest.json');
        if (!is_string($manifestDigest)) {
            throw new RuntimeException('PACKAGE_DIGEST_UNAVAILABLE');
        }
        $taskFile = $localRoot.'/once.json';
        self::assertPrivateRegular($taskFile, 4096);
        $raw = file_get_contents($taskFile);
        if (!is_string($raw)) throw new RuntimeException('TASK_UNREADABLE');
        $task = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
        self::validateTask($task);
        if (!hash_equals($manifestDigest, $task['package_manifest_sha256'])) {
            throw new RuntimeException('PACKAGE_MANIFEST_PIN_MISMATCH');
        }
        $operation = $task['operation'];
        $receiptPath = $localRoot.'/receipt.json';
        if (file_exists($receiptPath) || is_link($receiptPath)) {
            throw new RuntimeException('ONE_SHOT_ALREADY_CONSUMED');
        }
        // Atomic exclusive create is the authorization consumption/cron lock.
        $previousUmask = umask(0077);
        try {
            $receiptFile = @fopen($receiptPath, 'x+b');
        } finally {
            umask($previousUmask);
        }
        if ($receiptFile === false) throw new RuntimeException('ONE_SHOT_LOCK_FAILED');
        $receipt = [
            'format' => 'ai-site-cms-stage2-hostinger-local-receipt-v1',
            'operation' => $operation,
            'packageManifestSha256' => $manifestDigest,
            'startedAtUtc' => gmdate('Y-m-d\\TH:i:s\\Z'),
            'status' => 'refused',
            'failureCategory' => 'not_started',
            'schemaState' => 'not_verified',
            'dedicatedDbGrantsVerified' => false,
            'cmsPublicActivated' => false,
            'stage2Accepted' => false,
            'productionReady' => false
        ];
        $phase = 'local_task';
        try {
            // Even a failed attempt consumes the secret-bearing file. Operators
            // must explicitly create a NEW task after reading the private
            // non-secret receipt; cron logs never show DB credentials.
            if (!@unlink($taskFile)) {
                throw new RuntimeException('TASK_NOT_CONSUMED');
            }
            $phase = 'database_connection';
            $pdo = self::connection($task);
            $phase = 'database_scope';
            self::assertDedicatedUserGrants($pdo, $task['db_name']);
            $receipt['dedicatedDbGrantsVerified'] = true;
            $schema = new SchemaManager($pdo);
            $phase = 'schema_read';
            $before = $schema->inspectSite(self::SITE);
            if ($operation === 'probe') {
                $receipt['schemaState'] = $before['state'];
                if ($before['state'] === 'blocked') {
                    throw new RuntimeException('SCHEMA_BLOCKED');
                }
                $receipt['status'] = 'observed';
            } elseif ($operation === 'install') {
                if ($before['state'] !== 'uninitialized') {
                    throw new RuntimeException('TARGET_NOT_EMPTY');
                }
                $phase = 'schema_install';
                $schema->installSite(self::SITE);
                $after = $schema->inspectSite(self::SITE);
                if ($after['state'] !== 'ready') {
                    throw new RuntimeException('INSTALL_POSTCHECK_FAILED');
                }
                $receipt['schemaState'] = 'ready';
                $receipt['status'] = 'installed_empty_foundation';
            } elseif (in_array($operation, ['verify','snapshot','snapshot-verify'], true)) {
                if ($before['state'] !== 'ready') {
                    throw new RuntimeException('TARGET_NOT_READY');
                }
                $receipt['schemaState'] = 'ready';
                if ($operation === 'snapshot' || $operation === 'snapshot-verify') {
                    // Foundation metadata ONLY; no content/media backup and
                    // no destructive restore on a real host.
                    $phase = 'snapshot';
                    $data = (new FoundationSnapshot($pdo))->export(self::SITE);
                    FoundationSnapshot::verify($data, self::SITE);
                    $destination = $localRoot.'/foundation-snapshot.json';
                    if ($operation === 'snapshot-verify') {
                        self::assertPrivateRegular($destination, 2048);
                        $saved = file_get_contents($destination);
                        if (!is_string($saved) || !hash_equals($data, trim($saved))) {
                            throw new RuntimeException('SNAPSHOT_DIVERGED');
                        }
                        FoundationSnapshot::verify(trim($saved), self::SITE);
                        $receipt['status'] = 'foundation_snapshot_verified';
                    } else {
                    $oldUmask = umask(0077);
                    try {
                        $handle = @fopen($destination, 'xb');
                    } finally {
                        umask($oldUmask);
                    }
                    if ($handle === false) throw new RuntimeException('SNAPSHOT_EXISTS');
                    try {
                        if (fwrite($handle, $data."\n") !== strlen($data)+1) {
                            throw new RuntimeException('SNAPSHOT_WRITE_FAILED');
                        }
                        fflush($handle);
                    } finally {
                        fclose($handle);
                    }
                    $receipt['status'] = 'foundation_snapshot_saved';
                    }
                } else {
                    $receipt['status'] = 'verified';
                }
            }
            $receipt['failureCategory'] = 'none';
        } catch (Throwable $ignored) {
            // Safe phase names only; never exception text, DSN or credentials.
            // A rejected MySQL DDL is NOT automatically retried or repaired.
            $receipt['status'] = 'refused';
            $receipt['failureCategory'] = $phase.'_refused';
        } finally {
            $receipt['finishedAtUtc'] = gmdate('Y-m-d\\TH:i:s\\Z');
            $json = json_encode($receipt, JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES)."\n";
            rewind($receiptFile);
            ftruncate($receiptFile, 0);
            fwrite($receiptFile, $json);
            fflush($receiptFile);
            fclose($receiptFile);
        }
        return $receipt;
    }

    /** @param mixed $task */
    private static function validateTask(mixed $task): void
    {
        if (!is_array($task) || array_is_list($task)
            || array_diff(array_keys($task), [
                'format','target','site','operation','confirm',
                'db_host','db_name','db_user','db_password',
                'package_manifest_sha256'
            ]) !== [] || count($task) !== 10
            || ($task['format'] ?? null) !== 'ai-site-cms-stage2-hostinger-task-v1'
            || ($task['target'] ?? null) !== self::TARGET
            || ($task['site'] ?? null) !== self::SITE
            || !is_string($task['package_manifest_sha256'] ?? null)
            || !preg_match('/\A[a-f0-9]{64}\z/D', $task['package_manifest_sha256'])
            || !in_array($task['operation'] ?? null,
                ['probe','install','verify','snapshot','snapshot-verify'], true)
            || !in_array($task['db_host'] ?? null, ['localhost', '127.0.0.1'], true)
            || !is_string($task['db_name'] ?? null)
            || !preg_match('/\A[A-Za-z0-9_]{3,64}\z/D', $task['db_name'])
            || !is_string($task['db_user'] ?? null)
            || !preg_match('/\A[A-Za-z0-9_]{3,64}\z/D', $task['db_user'])
            || !is_string($task['db_password'] ?? null)
            || $task['db_password'] === ''
            || strlen($task['db_password']) > 256
            || ($task['confirm'] ?? null) !== (
                $task['operation'] === 'install'
                    ? 'INSTALL_EMPTY_STAGE2_TEST_DB_ONCE'
                    : 'READ_ONLY_OR_FOUNDATION_BACKUP_ONCE'
            )) {
            throw new RuntimeException('INVALID_SCOPED_TASK');
        }
    }

    /** @param array<string,mixed> $task */
    private static function connection(array $task): PDO
    {
        $dsn = 'mysql:host='.$task['db_host'].';dbname='.$task['db_name'].';charset=utf8mb4';
        $pdo = new PDO($dsn, $task['db_user'], $task['db_password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5
        ]);
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql'
            || $pdo->query('SELECT DATABASE()')->fetchColumn() !== $task['db_name']) {
            throw new RuntimeException('DB_IDENTITY_MISMATCH');
        }
        return $pdo;
    }

    /**
     * Hostinger account must have permissions scoped to this ONE selected
     * database. Global USAGE is harmless, global DDL/DML or grants on other
     * schemas are not. Unknown grant syntax fails closed.
     */
    private static function assertDedicatedUserGrants(PDO $pdo, string $database): void
    {
        $grants = $pdo->query('SHOW GRANTS')->fetchAll(PDO::FETCH_COLUMN);
        if (!$grants) throw new RuntimeException('DB_GRANTS_NOT_AVAILABLE');
        $databaseScoped = false;
        foreach ($grants as $grant) {
            if (!is_string($grant) || str_contains(strtoupper($grant), 'WITH GRANT OPTION')) {
                throw new RuntimeException('DB_GRANTS_TOO_BROAD');
            }
            if (preg_match('/\\AGRANT USAGE ON \\*\\.\\* TO /i', $grant)) {
                continue;
            }
            if (!preg_match('/\\AGRANT [A-Z_, ]+ ON \\x60([^\\x60]+)\\x60\\.\\* TO /i', $grant, $m)) {
                throw new RuntimeException('DB_GRANT_SCOPE_UNKNOWN');
            }
            // MySQL SHOW GRANTS escapes wildcard characters in database names.
            $grantedDb = str_replace(['\\\\_', '\\\\%'], ['_', '%'], $m[1]);
            if (!hash_equals($database, $grantedDb)) {
                throw new RuntimeException('DB_GRANTS_FOREIGN_SCHEMA');
            }
            $databaseScoped = true;
        }
        if (!$databaseScoped) throw new RuntimeException('DB_GRANTS_MISSING');
    }

    private static function assertRoots(string $packageRoot, string $localRoot): void
    {
        if (basename($packageRoot) !== 'cms-stage2-offweb-runtime'
            || basename($localRoot) !== 'cms-stage2-local'
            || dirname($packageRoot) !== dirname($localRoot)
            || is_link($packageRoot) || is_link($localRoot)
            || realpath($packageRoot) !== $packageRoot
            || realpath($localRoot) !== $localRoot
            || !is_dir($packageRoot) || !is_dir($localRoot)) {
            throw new RuntimeException('OFFWEB_ROOT_REQUIRED');
        }
        $public = dirname($packageRoot).'/public_html';
        if (is_link($public) || realpath($public) !== $public || !is_dir($public)
            || is_file($public.'/once.json')
            || is_file($public.'/foundation-snapshot.json')) {
            throw new RuntimeException('PUBLIC_BOUNDARY_UNVERIFIED');
        }
        $stat = lstat($localRoot);
        if ($stat === false || ($stat['mode'] & 0077) !== 0) {
            throw new RuntimeException('LOCAL_DIR_NOT_PRIVATE');
        }
    }

    private static function assertPrivateRegular(string $path, int $max): void
    {
        $stat = @lstat($path);
        if ($stat === false || !is_file($path) || is_link($path)
            || ($stat['mode'] & 0077) !== 0
            || ($stat['nlink'] ?? 0) !== 1
            || $stat['size'] < 50 || $stat['size'] > $max
            || realpath($path) !== $path) {
            throw new RuntimeException('PRIVATE_TASK_FILE_REQUIRED');
        }
    }
}
