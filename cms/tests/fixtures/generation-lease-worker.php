<?php
declare(strict_types=1);
// CI child process for real cross-process PHP flock leases. No network or web SAPI.
require dirname(__DIR__, 2) . '/src/Release/LabPackageStager.php';
require dirname(__DIR__, 2) . '/src/Release/LabPhpGenerationSwitcher.php';

use AiSiteCms\Release\LabPhpGenerationSwitcher;

if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true' || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1'
    || $argc !== 4 || $argv[1] !== '--hold') {
    fwrite(STDERR, "CI worker only\n");
    exit(2);
}
try {
    $switcher = LabPhpGenerationSwitcher::reopen($argv[2]);
    $switcher->withRequestLease($argv[3], static function (array $generation): void {
        echo json_encode(['event'=>'ready','version'=>$generation['version'],
            'sequence'=>$generation['sequence']], JSON_THROW_ON_ERROR), "\n";
        fflush(STDOUT);
        if (fgets(STDIN) !== "release\n") {
            throw new RuntimeException('Parent did not explicitly release lease');
        }
        echo json_encode(['event'=>'finished','version'=>$generation['version']], JSON_THROW_ON_ERROR), "\n";
        fflush(STDOUT);
    });
} catch (Throwable $e) {
    fwrite(STDERR, "LEASE_WORKER_REFUSED\n");
    exit(3);
}
