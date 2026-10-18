<?php
declare(strict_types=1);

// CLI-only Stage2 CI rehearsal. No writes, no web request input, no secrets in output.
// This uses the same check invoked by the opt-in HTTP bootstrap.
if (PHP_SAPI !== 'cli' || $argc !== 2 || $argv[1] !== '--check') {
    fwrite(STDERR, "STARTUP_READINESS_REFUSED\n");
    exit(3);
}
require dirname(__DIR__).'/vendor/autoload.php';

$report = \AiSiteCms\Hosting\EmptyCmsStartupReadiness::fromProcess(dirname(__DIR__));
echo json_encode($report, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), "\n";
exit($report['ready'] ? 0 : 4);
