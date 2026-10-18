<?php
declare(strict_types=1);

// Lab-only operator fleet entrypoint. No HTTP route and no implicit install.
// A configuration JSON file is supplied from an explicitly private directory.
// Individual site roots, separate SQLite DBs and nonproduction capabilities
// are fully verified before ANY apply begins.
if (PHP_SAPI !== 'cli' || $argc !== 4
    || !in_array($argv[1] ?? '', ['--plan','--apply'],true)) {
    fwrite(STDERR, "FLEET_OPERATOR_REFUSED\n");
    exit(3);
}
require dirname(__DIR__).'/vendor/autoload.php';
try {
    $args=[];
    foreach (array_slice($argv,2) as $value) {
        if (!preg_match('/^--(config|approval)=(.+)$/D',$value,$parts)
            || isset($args[$parts[1]])) {
            throw new RuntimeException('Unknown fleet operator input');
        }
        $args[$parts[1]]=$parts[2];
    }
    if (count($args)!==2) throw new RuntimeException('Fleet inputs missing');
    $doc=\AiSiteCms\Hosting\LabInstallationFleet::load($args['config']);
    if ($argv[1]==='--plan') {
        if ($args['approval']!=='none') throw new RuntimeException('Plan may not include approval');
        $result=\AiSiteCms\Hosting\LabInstallationFleet::plan($doc);
    } else {
        $result=\AiSiteCms\Hosting\LabInstallationFleet::apply($doc,$args['approval']);
    }
    echo json_encode($result,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),"\n";
} catch (Throwable $error) {
    // Never send paths, host declaration or DB details to stdout/stderr.
    fwrite(STDERR,"FLEET_OPERATOR_REFUSED\n");
    exit(3);
}
