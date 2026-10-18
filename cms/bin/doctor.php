<?php
declare(strict_types=1);

// CLI-only, read-only, no autoload/dependencies/network/db needed.
// Intentionally does not dump phpinfo(), $_SERVER, DSNs or filesystem paths.
// Explicit document-root path may be supplied as an ARGUMENT, never printed.
if (PHP_SAPI !== 'cli' || !in_array($argc, [2, 3], true)
    || ($argv[1] ?? '') !== '--check'
    || ($argc === 3 && !str_starts_with($argv[2], '--document-root='))) {
    fwrite(STDERR, "Usage: php bin/doctor.php --check [--document-root=/path/to/cms/public]\n");
    exit(2);
}
require dirname(__DIR__) . '/src/Hosting/RuntimeDoctor.php';
$documentRoot = $argc === 3 ? substr($argv[2], strlen('--document-root=')) : null;
$report = \AiSiteCms\Hosting\RuntimeDoctor::localReport(
    $documentRoot, dirname(__DIR__) . '/public'
);
echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), "\n";
exit($report['php_runtime_baseline'] === 'pass'
    && $report['document_root'] !== 'invalid' ? 0 : 1);
