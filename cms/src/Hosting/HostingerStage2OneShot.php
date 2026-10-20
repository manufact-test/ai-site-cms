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
        $taskFile = $localRoot.'/once.json';
        self::assertPrivateRegular($taskFile, 4096);
        $raw = file_get_contents($taskFile);
        if (!is_string($raw)) throw new RuntimeException('TASK_UNREADABLE');
        $task = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
        self::validateTask($task);
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
            'status' => 'refused',
            'schemaState' => 'not_verified',
            'cmsPublicActivated' => false,
            'stage2Accepted' => false,
            'productionReady' => false
        ];
        try {
            $pdo = self::connection($task);
            $schema = new SchemaManager($pdo);
            $before = $schema->inspectSite(self::SITE);
            if ($operation === 'probe') {
                $receipt['schemaState'] = $before['state'];
                $receipt['status'] = $before['state'] === 'blocked'
                    ? 'refused' : 'observed';
            } elseif ($operation === 'install') {
                if ($before['state'] !== 'uninitialized') {
                    throw new RuntimeException('TARGET_NOT_EMPTY');
                }
                $schema->installSite(self::SITE);
                $after = $schema->inspectSite(self::SITE);
                if ($after['state'] !== 'ready') {
                    throw new RuntimeException('INSTALL_POSTCHECK_FAILED');
                }
                $receipt['schemaState'] = 'ready';
                $receipt['status'] = 'installed_empty_foundation';
            } elseif ($operation === 'verify' || $operation === 'snapshot') {
                if ($before['state'] !== 'ready') {
                    throw new RuntimeException('TARGET_NOT_READY');
                }
                $receipt['schemaState'] = 'ready';
                if ($operation === 'snapshot') {
                    // Foundation metadata ONLY; no content/media backup and
                    // no destructive restore on a real host.
                    $data = (new FoundationSnapshot($pdo))->export(self::SITE);
                    FoundationSnapshot::verify($data, self::SITE);
                    $destination = $localRoot.'/foundation-snapshot.json';
                    $handle = @fopen($destination, 'xb');
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
                } else {
                    $receipt['status'] = 'verified';
                }
            }
        } catch (Throwable $ignored) {
            // Fail closed and consume the run even for partial MySQL DDL.
            // No exception details, SQL, DB identity or passwords in receipts.
            $receipt['status'] = 'refused';
        } finally {
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
                'db_host','db_name','db_user','db_password'
            ]) !== [] || count($task) !== 9
            || ($task['format'] ?? null) !== 'ai-site-cms-stage2-hostinger-task-v1'
            || ($task['target'] ?? null) !== self::TARGET
            || ($task['site'] ?? null) !== self::SITE
            || !in_array($task['operation'] ?? null,
                ['probe','install','verify','snapshot'], true)
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
