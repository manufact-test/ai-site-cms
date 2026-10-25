<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(1);
require dirname(__DIR__).'/bootstrap.php';
try{
    stage3_repository()->upgradeDeliverySchema();
    echo "Stage3 form-delivery schema upgraded; existing public sites and submissions unchanged.\n";
}catch(Throwable $e){
    fwrite(STDERR,"Delivery upgrade refused: ".$e->getMessage()."\n");
    exit(1);
}
