<?php
declare(strict_types=1);
// Run ONLY on a backed-up, separately owner-authorized dedicated Stage3 DB.
// Never invoked through HTTP; this CLI does not change drafts/releases.
require dirname(__DIR__).'/bootstrap.php';
try {
    stage3_repository()->upgradeVisualReviewSchema();
    echo "Stage3 visual review notes table ready; drafts and releases unchanged.\n";
} catch (Throwable $e) {
    fwrite(STDERR,"Visual review upgrade refused: ".$e->getMessage()."\n");
    exit(1);
}
