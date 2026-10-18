<?php
declare(strict_types=1);

// Read-only diagnostic; no migrations/DDL/DML and no DB identities printed.
// Existing database must be explicitly provided. Never schedule against Hostinger.
if (PHP_SAPI !== 'cli' || $argc !== 2 || $argv[1] !== '--inspect') {
    fwrite(STDERR, "Usage: php bin/schema-preflight.php --inspect (explicit CMS_DB_DSN, CMS_SITE_ID)\n");
    exit(2);
}
require dirname(__DIR__) . '/vendor/autoload.php';

use AiSiteCms\Storage\SchemaManager;

$dsn = getenv('CMS_DB_DSN') ?: '';
$siteId = getenv('CMS_SITE_ID') ?: '';
if (!preg_match('/\A(?:mysql|sqlite):/', $dsn) || $siteId === '') {
    fwrite(STDERR, "Preflight requires an explicit dedicated database and site identifier\n");
    exit(2);
}
$isSqlite = str_starts_with($dsn, 'sqlite:');
if ($isSqlite && (getenv('CMS_ENV') !== 'test' || getenv('CMS_ALLOW_SQLITE_TEST_ONLY') !== '1')) {
    fwrite(STDERR, "SQLite preflight is restricted to explicit test mode\n");
    exit(2);
}
try {
    $pdo = new PDO($dsn, getenv('CMS_DB_USER') ?: null, getenv('CMS_DB_PASSWORD') ?: null);
    $snapshot = (new SchemaManager($pdo, $isSqlite))->inspectSite($siteId);
    echo json_encode($snapshot, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), "\n";
    exit(match ($snapshot['state']) {
        'ready' => 0,
        'blocked' => 4,
        default => 3
    });
} catch (Throwable $e) {
    fwrite(STDERR, "Read-only schema preflight refused: invalid site id or database access\n");
    exit(2);
}
