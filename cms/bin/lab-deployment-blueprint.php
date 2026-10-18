<?php
declare(strict_types=1);

// Stage2 local and READ-ONLY operator topology/ABI/routes blueprint.
// No live DNS/TLS, external requests, virtual-host writes or DB modifications.
if (PHP_SAPI!=='cli' || $argc!==3 || $argv[1]!=='--check'
    || !preg_match('/\A--config=(.+)\z/D',$argv[2],$m)) {
    fwrite(STDERR,"DEPLOYMENT_BLUEPRINT_REFUSED\n");exit(3);
}
require dirname(__DIR__).'/vendor/autoload.php';
try {
    $document=\AiSiteCms\Hosting\LabDeploymentBlueprint::load($m[1]);
    $result=\AiSiteCms\Hosting\LabDeploymentBlueprint::inspect($document);
    echo json_encode($result,JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),"\n";
    exit($result['localCliCompatible'] ? 0 : 4);
} catch (Throwable $e) {
    fwrite(STDERR,"DEPLOYMENT_BLUEPRINT_REFUSED\n");
    exit(3);
}
