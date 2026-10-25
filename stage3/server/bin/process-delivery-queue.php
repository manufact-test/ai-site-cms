<?php
declare(strict_types=1);

// Deliberately CLI-only: processing may send real customer inquiries externally.
if(PHP_SAPI!=='cli')exit(1);
if(getenv('STAGE3_ALLOW_DELIVERY_WORKER')!=='YES'){
    fwrite(STDERR,"Delivery worker refused; set STAGE3_ALLOW_DELIVERY_WORKER=YES explicitly.\n");
    exit(2);
}
$limit=50;
if($argc>2){
    fwrite(STDERR,"Usage: php process-delivery-queue.php [limit: 1..250]\n");
    exit(2);
}
if($argc===2){
    $parsed=filter_var($argv[1],FILTER_VALIDATE_INT);
    if($parsed===false||$parsed<1||$parsed>250){
        fwrite(STDERR,"Delivery batch limit must be between 1 and 250.\n");
        exit(2);
    }
    $limit=$parsed;
}
require dirname(__DIR__).'/bootstrap.php';
try{
    $result=stage3_repository()->processDeliveryQueue($limit);
    echo json_encode($result,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES)."\n";
}catch(Throwable $e){
    fwrite(STDERR,"Delivery worker failed: ".get_class($e)."\n");
    exit(1);
}
