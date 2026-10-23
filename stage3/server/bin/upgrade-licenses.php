<?php
declare(strict_types=1);
// Explicit CLI-only upgrade on an authorized dedicated Stage3 lab database.
if (PHP_SAPI !== 'cli') exit(1);
require dirname(__DIR__) . '/bootstrap.php';
try {
    stage3_repository()->upgradeLicenseSchema();
    echo "Stage3 manual licence schema upgraded; public sites unchanged.\n";
} catch (Throwable $e) {
    fwrite(STDERR,"Licence upgrade refused: ".$e->getMessage()."\n");
    exit(1);
}
