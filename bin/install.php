<?php
declare(strict_types=1);

/**
 * Explicit manual/CI CLI bootstrap ONLY; never an HTTP installer.
 * This command performs CREATE/ALTER in the explicitly selected dedicated DB.
 */
if (PHP_SAPI !== 'cli' || ($argv[1] ?? '') !== '--apply') {
    fwrite(STDERR, "Refusing implicit install. Use: php bin/install.php --apply\n");
    exit(2);
}
require dirname(__DIR__) . '/vendor/autoload.php';

use AiSiteCms\Storage\SchemaManager;

$dsn = getenv('CMS_DB_DSN') ?: '';
$siteId = getenv('CMS_SITE_ID') ?: '';
if ($dsn === '' || $siteId === '' || !preg_match('/\A(?:mysql|sqlite):/', $dsn)) {
    fwrite(STDERR, "Missing explicit dedicated DB DSN or valid site ID\n");
    exit(2);
}
$driver = str_starts_with($dsn, 'sqlite:') ? 'sqlite' : 'mysql';
$allowSqlite = $driver === 'sqlite'
    && getenv('CMS_ENV') === 'test'
    && getenv('CMS_ALLOW_SQLITE_TEST_ONLY') === '1';
if ($driver === 'sqlite' && !$allowSqlite) {
    fwrite(STDERR, "SQLite bootstrap permitted only in explicit test mode\n");
    exit(2);
}
if ($allowSqlite) {
    $file = substr($dsn, 7);
    if (str_starts_with($file, '/') && (file_exists($file) || is_link($file))) {
        $stat = @lstat($file);
        if ($stat === false || is_link($file) || !is_file($file)
            || ($stat['nlink'] ?? 0) !== 1 || ($stat['mode'] & 0077) !== 0) {
            fwrite(STDERR, "Unsafe dedicated SQLite test database\n");
            exit(1);
        }
    }
    umask(0077);
}
try {
    $pdo = new PDO($dsn, getenv('CMS_DB_USER') ?: null, getenv('CMS_DB_PASSWORD') ?: null);
    (new SchemaManager($pdo, $allowSqlite))->installSite($siteId);
    fwrite(STDOUT, "CMS schema initialized for approved site identifier; no public endpoints enabled\n");
} catch (Throwable $e) {
    // Log non-sensitive error category only: never dump DSNs or credentials.
    fwrite(STDERR, "Install refused; validate dedicated DB, credentials and migration history\n");
    exit(1);
}
