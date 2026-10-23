<?php
declare(strict_types=1);
// Dedicated Stage3 databases only. No network or host deployment.
require_once __DIR__ . '/../bootstrap.php';
try {
    stage3_repository()->upgradeAccessSchema();
    echo "Stage3 access schema ready. Existing content preserved; old sessions require login.\n";
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
