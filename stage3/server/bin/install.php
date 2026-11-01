<?php
declare(strict_types=1);

// Production installation is CLI-only. The plan is read-only; apply requires its exact token.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit(1);
}

require dirname(__DIR__) . '/bootstrap.php';
require __DIR__ . '/Stage3Installer.php';

$action = $argv[1] ?? '';
$dsn = getenv('STAGE3_DSN');
if (!is_string($dsn) || $dsn === '') {
    fwrite(STDERR, "Set STAGE3_DSN and the private database credentials before running the installer.\n");
    exit(1);
}

try {
    if (str_starts_with($dsn, 'sqlite:')) {
        $sqlitePath = substr($dsn, 7);
        if ($sqlitePath === '' || $sqlitePath === ':memory:' || !is_file($sqlitePath)
            || is_link($sqlitePath) || realpath($sqlitePath) !== $sqlitePath) {
            throw new RuntimeException('SQLite lab database must be an existing canonical file; hosted installations must use MySQL');
        }
    }
    $dbUser = getenv('STAGE3_DB_USER');
    $dbPassword = getenv('STAGE3_DB_PASSWORD');
    $db = new PDO(
        $dsn,
        is_string($dbUser) && $dbUser !== '' ? $dbUser : null,
        is_string($dbPassword) && $dbPassword !== '' ? $dbPassword : null,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    if ((string)$db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
        $db->exec('PRAGMA query_only = ON');
    }
    $env = [
        'STAGE3_DSN' => $dsn,
        'STAGE3_DB_USER' => is_string($dbUser) ? $dbUser : '',
        'STAGE3_DB_PASSWORD' => is_string($dbPassword) ? $dbPassword : '',
        'STAGE3_OWNER_USER' => getenv('STAGE3_OWNER_USER') ?: '',
        'STAGE3_OWNER_PASSWORD' => getenv('STAGE3_OWNER_PASSWORD') ?: '',
        'STAGE3_FORM_SECRET' => getenv('STAGE3_FORM_SECRET') ?: '',
        'STAGE3_FORM_ORIGINS' => getenv('STAGE3_FORM_ORIGINS') ?: '',
        'STAGE3_FORM_ENDPOINT' => getenv('STAGE3_FORM_ENDPOINT') ?: '',
        'STAGE3_PRIVATE_DIR' => getenv('STAGE3_PRIVATE_DIR') ?: '',
        'STAGE3_PUBLIC_ROOT' => getenv('STAGE3_PUBLIC_ROOT') ?: '',
        'STAGE3_ALLOW_SQLITE_INSTALL' => getenv('STAGE3_ALLOW_SQLITE_INSTALL') ?: '',
        'CI' => getenv('CI') ?: ''
    ];

    if ($action === '--plan') {
        $result = \Manufact\Stage3\Stage3Installer::plan($db, $env);
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . PHP_EOL;
        exit(($result['applyAllowed'] ?? false) || ($result['state'] ?? '') === 'already_installed' ? 0 : 1);
    }
    if (preg_match('/^--apply=([a-f0-9]{64})$/D', $action, $match) === 1) {
        $repository = stage3_repository();
        $result = \Manufact\Stage3\Stage3Installer::apply($db, $repository, $env, $match[1]);
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . PHP_EOL;
        exit(0);
    }
    fwrite(STDERR, "Usage: php stage3/server/bin/install.php --plan\n");
    fwrite(STDERR, "   or: php stage3/server/bin/install.php --apply=<64-character-plan-token>\n");
    exit(1);
} catch (Throwable $error) {
    fwrite(STDERR, "Stage3 installation refused: " . $error->getMessage() . PHP_EOL);
    exit(1);
}
