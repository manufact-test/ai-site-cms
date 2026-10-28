<?php
declare(strict_types=1);
// Explicit schema change, never a web action or silent runtime migration.
// Set STAGE3_ALLOW_APPROVAL_UPGRADE=YES only on the isolated Stage3 database.
if(PHP_SAPI!=='cli')exit(1);
require dirname(__DIR__).'/bootstrap.php';
try{
    stage3_repository()->upgradeApprovalSchema();
    echo "Stage3 immutable client-approval evidence schema ready; drafts and releases unchanged.\n";
}catch(Throwable $e){
    fwrite(STDERR,"Approval evidence upgrade refused: ".$e->getMessage()."\n");
    exit(1);
}
