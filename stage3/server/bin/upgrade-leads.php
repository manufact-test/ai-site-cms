<?php
declare(strict_types=1);
// Explicit and isolated CLI schema upgrade. Never available via HTTP.
if(PHP_SAPI!=='cli')exit(1);
require dirname(__DIR__).'/bootstrap.php';
try{
    stage3_repository()->upgradeLeadWorkflowSchema();
    echo "Stage3 private lead workflow schema ready; existing submissions unchanged.\n";
}catch(Throwable $error){
    fwrite(STDERR,"Lead workflow upgrade refused: ".$error->getMessage()."\n");
    exit(1);
}
