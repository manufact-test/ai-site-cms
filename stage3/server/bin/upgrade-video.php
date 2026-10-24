<?php
declare(strict_types=1);
// Explicit isolated Stage3 DB upgrade. No migrations on HTTP requests.
if(PHP_SAPI!=='cli')exit(1);
require dirname(__DIR__).'/bootstrap.php';
try{
    stage3_repository()->upgradeVideoUploadSchema();
    echo "Stage3 video upload tables ready; existing media/releases unchanged.\n";
}catch(Throwable $e){
    fwrite(STDERR,"Video staging upgrade refused: ".$e->getMessage()."\n");
    exit(1);
}
