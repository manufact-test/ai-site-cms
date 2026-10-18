<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use AiSiteCms\Storage\SchemaManager;
use PDO;
use Throwable;

/**
 * Read-only, explicitly opt-in Stage2 EMPTY installation readiness check.
 * This lab gate is NOT a production health, authorization or deployment gate.
 * It never runs migrations, repairs files, or emits paths/credentials.
 */
final class EmptyCmsStartupReadiness
{
    /** @return array{ready:bool,state:string,readOnly:bool,ciOnly:bool,productionReady:bool} */
    private static function result(bool $ready, string $state): array
    {
        return [
            'ready' => $ready,
            'state' => $state,
            'readOnly' => true,
            'ciOnly' => true,
            'productionReady' => false,
        ];
    }

    /**
     * @param array<string,mixed> $env Exact values supplied by the runtime,
     * no web request/query or forwarded headers are trusted for readiness.
     * @return array{ready:bool,state:string,readOnly:bool,ciOnly:bool,productionReady:bool}
     */
    public static function inspect(string $cmsRoot, array $env): array
    {
        // This Stage2 experiment must NEVER silently enable live MySQL access.
        if (!in_array(($env['CMS_STAGE2_RUNTIME_GATE'] ?? null), ['ci-only','ci-bound'], true)
            || ($env['CMS_ENV'] ?? null) !== 'test'
            || ($env['CMS_ALLOW_SQLITE_TEST_ONLY'] ?? null) !== '1') {
            return self::result(false, 'test_gate_required');
        }
        $siteId = $env['CMS_SITE_ID'] ?? null;
        $dsn = $env['CMS_DB_DSN'] ?? null;
        if (!is_string($siteId) || !preg_match('/\A[a-z][a-z0-9-]{2,63}\z/D', $siteId)
            || !is_string($dsn) || strlen($dsn) > 4096
            || !str_starts_with($dsn, 'sqlite:')) {
            return self::result(false, 'configuration_invalid');
        }
        // Refuse MySQL and SQLite in-memory/URI query strings in this lab.
        $dbFile = substr($dsn, strlen('sqlite:'));
        $root = realpath($cmsRoot);
        $file = realpath($dbFile);
        if ($root === false || !is_dir($root) || is_link($cmsRoot)
            || $root !== $cmsRoot || !is_dir($root.'/public')
            || $file === false || !str_starts_with($dbFile, '/')
            || $file !== $dbFile || str_contains($dbFile, "\0")
            || str_contains($dbFile, '?') || str_contains($dbFile, '#')
            || str_contains($dbFile, '\\')
            || $file === $root || str_starts_with($file, $root.'/')
            || !is_file($dbFile) || is_link($dbFile)) {
            return self::result(false, 'database_boundary_invalid');
        }
        $stat = @lstat($dbFile);
        if ($stat === false || ($stat['nlink'] ?? 0) !== 1
            || ($stat['size'] ?? -1) < 1 || $stat['size'] > 16777216) {
            return self::result(false, 'database_boundary_invalid');
        }
        // Opening an already existing file only. SchemaManager.inspectSite()
        // issues SELECT/metadata only; PRAGMA query_only protects this PDO
        // connection, not the filesystem against concurrent writers.
        try {
            $pdo = new PDO($dsn, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 2,
            ]);
            $pdo->exec('PRAGMA query_only = ON');
            $report = (new SchemaManager($pdo, true))->inspectSite($siteId);
            if (($report['state'] ?? null) !== 'ready') {
                return self::result(false, 'schema_not_ready');
            }
            return self::result(true, 'ready');
        } catch (Throwable $e) {
            return self::result(false, 'database_unavailable');
        }
    }

    /** @return array{ready:bool,state:string,readOnly:bool,ciOnly:bool,productionReady:bool} */
    public static function fromProcess(string $cmsRoot): array
    {
        $env = [];
        foreach (['CMS_STAGE2_RUNTIME_GATE','CMS_ENV','CMS_ALLOW_SQLITE_TEST_ONLY',
            'CMS_DB_DSN','CMS_SITE_ID'] as $key) {
            $value = getenv($key);
            $env[$key] = $value === false ? null : $value;
        }
        return self::inspect($cmsRoot, $env);
    }
}
