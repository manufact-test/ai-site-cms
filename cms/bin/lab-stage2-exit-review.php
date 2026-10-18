<?php
declare(strict_types=1);

// Stage2 local read-only architecture/host handoff checklist. Operates only
// on disposable laboratory declaration; no live host/DNS/database probing.
if (PHP_SAPI !== 'cli' || $argc !== 3 || $argv[1] !== '--check'
    || !preg_match('/\A--config=(.+)\z/D', $argv[2], $match)) {
    fwrite(STDERR,"STAGE2_EXIT_REVIEW_REFUSED\n");
    exit(3);
}
require dirname(__DIR__).'/vendor/autoload.php';
try {
    $doc=\AiSiteCms\Hosting\LabDeploymentBlueprint::load($match[1]);
    $report=\AiSiteCms\Hosting\LabStage2ExitReview::inspect($doc);
    echo json_encode($report,JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),"\n";
    exit($report['readyForOwnerArchitectureReview'] ? 0 : 4);
} catch (Throwable $e) {
    fwrite(STDERR,"STAGE2_EXIT_REVIEW_REFUSED\n");
    exit(3);
}
