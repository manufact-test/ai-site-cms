<?php
declare(strict_types=1);

/**
 * Explicit Stage2 CLI bootstrap ONLY; never HTTP. SQLite is disposable CI
 * only. This generic path MUST NOT install to target/production MySQL: owner
 * approval and scoped one-shot HostingerStage2OneShot are separate mechanisms.
 */
if (PHP_SAPI !== 'cli' || $argc !== 2 || ($argv[1] ?? '') !== '--apply') {
    fwrite(STDERR, "Refusing implicit install. Use: php bin/install.php --apply\n");
    exit(2);
}

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
// Safety fence BEFORE autoload or any network / SQL connection. Only the
// exact disposable GitHub service already used by real MySQL migration tests
// is a legitimate consumer of this *generic* entrypoint. Hostinger requires
// a separately authorized private one-shot task; CLI flags/env by themselves
// cannot authorize a target installation.
if ($driver === 'mysql') {
    // Exactly three disposable CI DB/account identities are reserved:
    // the schema smoke DB and TWO separately scoped packaged MySQL fixtures.
    // No arbitrary dbname, host, credentials or runtime account is accepted.
    $ciPairs = [
        'ai_site_cms_ci' => ['cms_ci', 'ephemeral_ci_only'],
        'ai_stage2_pkg_a_ci' => ['stage2pkg_a_ci', 'disposable_stage2_a_ci'],
        'ai_stage2_pkg_b_ci' => ['stage2pkg_b_ci', 'disposable_stage2_b_ci'],
    ];
    $ciIdentityMatches = false;
    foreach ($ciPairs as $dbName => [$user, $password]) {
        if ($dsn === 'mysql:host=127.0.0.1;port=3306;dbname='.$dbName.';charset=utf8mb4'
            && getenv('CMS_DB_USER') === $user
            && getenv('CMS_DB_PASSWORD') === $password) {
            $ciIdentityMatches = true;
            break;
        }
    }
    $allowed = getenv('CMS_ENV') === 'test'
        && getenv('CI') === 'true'
        && getenv('GITHUB_ACTIONS') === 'true'
        && getenv('CMS_STAGE2_MYSQL_CLI_INSTALL') === 'isolated-ci-only'
        && $ciIdentityMatches;
    if (!$allowed) {
        fwrite(STDERR, "Generic Stage2 MySQL installation refused; dedicated owner-authorized one-shot required\n");
        exit(3);
    }
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
// Untrusted target DSNs have been rejected; only now load CMS code or connect.
require dirname(__DIR__) . '/vendor/autoload.php';
try {
    $pdo = new PDO($dsn, getenv('CMS_DB_USER') ?: null, getenv('CMS_DB_PASSWORD') ?: null);
    (new SchemaManager($pdo, $allowSqlite))->installSite($siteId);
    fwrite(STDOUT, "CMS schema initialized for approved site identifier; no public endpoints enabled\n");
} catch (Throwable $e) {
    fwrite(STDERR, "Install refused; validate dedicated DB, credentials and migration history\n");
    exit(1);
}
