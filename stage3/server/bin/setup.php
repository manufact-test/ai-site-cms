<?php
declare(strict_types=1);
// CLI-only setup. Refuses any existing DB schema. Do not expose through HTTP.
if (PHP_SAPI !== 'cli') {
    exit(1);
}
require dirname(__DIR__) . '/bootstrap.php';
$user = getenv('STAGE3_OWNER_USER');
$password = getenv('STAGE3_OWNER_PASSWORD');
if (!is_string($user) || !is_string($password)) {
    fwrite(STDERR, "Set STAGE3_OWNER_USER and STAGE3_OWNER_PASSWORD as private environment variables.\n");
    exit(1);
}
try {
    $repository = stage3_repository();
    $repository->initializeEmptyDatabase();
    $repository->createOwner($user, $password);
    echo "Isolated Stage3 schema and owner created. No credentials printed.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Stage3 setup refused: " . $e->getMessage() . "\n");
    exit(1);
}
