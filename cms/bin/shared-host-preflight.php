<?php
declare(strict_types=1);

// Explicit local CLI command only. No HTTP route, DB, write probe or remote call.
// This is an OFFLINE structure assessment and never permission to deploy.
if (PHP_SAPI !== 'cli' || $argc !== 3 || ($argv[1] ?? '') !== '--check'
    || !str_starts_with($argv[2] ?? '', '--document-root=')) {
    fwrite(STDERR, "Usage: php bin/shared-host-preflight.php --check --document-root=/absolute/path/to/cms/public\n");
    exit(2);
}
require dirname(__DIR__) . '/src/Hosting/SharedHostPreflight.php';
$root = dirname(__DIR__);
$report = \AiSiteCms\Hosting\SharedHostPreflight::inspect(
    $root, substr($argv[2], strlen('--document-root='))
);
echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), "\n";
exit($report['result'] === 'offline_structure_pass' ? 0 : 3);
