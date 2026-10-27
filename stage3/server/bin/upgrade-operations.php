<?php
declare(strict_types=1);
// Explicit CLI-only schema upgrade, NEVER automatic on HTTP request.
if (PHP_SAPI!=='cli') exit(1);
require dirname(__DIR__).'/bootstrap.php';
try {
    stage3_repository()->upgradeOperationsSchema();
    echo "Stage3 site operations schema ready; no site status changed.\n";
} catch (Throwable $error) {
    fwrite(STDERR,"Operations schema upgrade refused: ".get_class($error)."\n");
    exit(1);
}
