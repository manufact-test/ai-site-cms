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
        // A request to revoke credentials immediately fences NEW installation
        // attempts. It cannot terminate any already-running PHP process.
        self::assertNoRevocation($localRoot);
        $taskFile = $localRoot.'/once.json';
        // This credential-bearing task is untrusted local input. A checked
        // filename followed by file_get_contents() can be replaced in the
        // meantime; use one inode-bound descriptor and canonical JSON instead.
        $task = Stage2PrivateOperatorRecord::readJsonObject($taskFile, 4096);
        self::validateTask($task);
        if (!hash_equals($manifestDigest, $task['package_manifest_sha256'])) {
            throw new RuntimeException('PACKAGE_MANIFEST_PIN_MISMATCH');
        }
        // A locally edited "INSTALL" task is NOT proof that the owner approved
        // DB writes. Require a distinct short-lived Ed25519 owner permit bound
        // to this exact task (including its private credentials) and package.
        // Absence of native/audited Sodium means install is refused. The check
        // happens BEFORE receipt creation, task consumption or DB connection.
        if ($task['operation'] === 'install') {
            Stage2OwnerWriteConsent::verify($localRoot, $task, $manifestDigest);
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
        // Durable nonsecret crash marker BEFORE deleting any private task
        // or touching MySQL. A crash at any following step is an explicit
        // MANUAL-REVIEW outcome rather than an unexplained empty receipt.
        // A failed initial write leaves the exclusive lock intact and must
        // never proceed to database connection.
        try {
            self::persistReceipt($receiptFile, $receipt);
        } catch (Throwable $error) {
            fclose($receiptFile);
            throw new RuntimeException('STAGE2_RECEIPT_INITIAL_DURABILITY_FAILED', 0, $error);
        }
        // Disposable CI ONLY: stop an independent PHP child at the exact
        // post-fsync boundary. It must NEVER run against an actual customer
        // DB. The marker is recorded before the simulated process exit.
        self::ciOnlyCrash($task, 'after_receipt_before_unlink');
        $phase = 'local_task';
        $readOnlyTransactionStarted = false;
        $pdo = null;
        try {
            self::assertNoRevocation($localRoot);
            // Even a failed attempt consumes the secret-bearing file. Operators
            // must explicitly create a NEW task after reading the private
            // non-secret receipt; cron logs never show DB credentials.
            if (!@unlink($taskFile)) {
                throw new RuntimeException('TASK_NOT_CONSUMED');
            }
            $phase = 'database_connection';
            self::ciOnlyCrash($task, 'after_unlink_before_db');
            $pdo = self::connection($task);
            if ($operation !== 'install') {
                // Defense in depth: a PROBE/VERIFY must remain SQL-read-only
                // even when its dedicated test MySQL account has DDL grants.
                // SET TRANSACTION scopes the *next* transaction only; it
                // cannot be inherited by the explicit install operation.
                $phase = 'database_readonly';
                Stage2MySqlReadOnly::begin($pdo);
                $readOnlyTransactionStarted = true;
            }
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
                        $saved = Stage2PrivateOperatorRecord::readBytes($destination, 2048, 50);
                        if (!hash_equals($data, trim($saved))) {
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
                        if (!fflush($handle) || !fsync($handle)) {
                            throw new RuntimeException('SNAPSHOT_DURABILITY_FAILED');
                        }
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
            if ($readOnlyTransactionStarted && $pdo instanceof PDO) {
                try {
                    Stage2MySqlReadOnly::finish($pdo);
                } catch (Throwable $ignored) {
                    // A lost transaction boundary invalidates a previous
                    // apparent success. Never claim a read-only probe passed.
                    $receipt['status'] = 'refused';
                    $receipt['failureCategory'] = 'database_readonly_refused';
                }
            }
            $receipt['finishedAtUtc'] = gmdate('Y-m-d\\TH:i:s\\Z');
            try {
                self::persistReceipt($receiptFile, $receipt);
            } finally {
                fclose($receiptFile);
            }
        }
        return $receipt;
    }

    /** Persist an inode-bound, nonsecret private record or fail closed. */
    private static function persistReceipt(mixed $file, array $data): void
    {
        if (!is_resource($file)) {
            throw new RuntimeException('STAGE2_RECEIPT_FILE_REQUIRED');
        }
        $json = json_encode($data, JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES)."\n";
        if (strlen($json) > 4096 || !rewind($file) || !ftruncate($file, 0)) {
            throw new RuntimeException('STAGE2_RECEIPT_TRUNCATION_REFUSED');
        }
        $length = strlen($json);
        $written = 0;
        while ($written < $length) {
            $count = @fwrite($file, substr($json, $written));
            if (!is_int($count) || $count < 1) {
                throw new RuntimeException('STAGE2_RECEIPT_PARTIAL_WRITE');
            }
            $written += $count;
        }
        // PHP 8.1+ exposes fsync for regular files. Silent flush-only
        // success is insufficient for the one-use DB work authorization.
        if (!fflush($file) || !fsync($file)) {
            throw new RuntimeException('STAGE2_RECEIPT_SYNC_FAILED');
        }
    }

    /**
     * Real child-process abrupt-stop laboratory, with 4 independent CI
     * guards AND an exact ephemeral MySQL DB+user. At no point can this
     * code unlock an operation or send traffic to a target host.
     */
    private static function ciOnlyCrash(array $task, string $checkpoint): void
    {
        if (getenv('CI') === 'true'
            && getenv('GITHUB_ACTIONS') === 'true'
            && getenv('CMS_ALLOW_DESTRUCTIVE_MYSQL_CI') === '1'
            && getenv('CMS_TEST_MYSQL_DSN') ===
                'mysql:host=127.0.0.1;port=3306;dbname=ai_site_cms_ci;charset=utf8mb4'
            && getenv('CMS_TEST_MYSQL_ROOT_PASSWORD') === 'ephemeral_root_ci_only'
            && $task['db_host'] === '127.0.0.1'
            && $task['db_name'] === 'ai_site_cms_oneshot_ci'
            && $task['db_user'] === 'cms_stage2_once_ci'
            && getenv('CMS_STAGE2_CI_CRASH_POINT') === $checkpoint) {
            // exit() intentionally bypasses the normal receipt-finalizing
            // finally: model process disappearance, not a PHP exception.
            exit(78);
        }
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
        $effectiveUser = $pdo->query('SELECT CURRENT_USER()')->fetchColumn();
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql'
            || $pdo->query('SELECT DATABASE()')->fetchColumn() !== $task['db_name']
            || !is_string($effectiveUser)
            || !str_starts_with($effectiveUser, $task['db_user'].'@')) {
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

    private static function assertNoRevocation(string $localRoot): void
    {
        foreach (['revoke-request.json', 'revocation.json'] as $file) {
            $path = $localRoot.'/'.$file;
            if (file_exists($path) || is_link($path)) {
                throw new RuntimeException('STAGE2_CREDENTIAL_REVOCATION_FENCE');
            }
        }
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

}
