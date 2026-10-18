<?php
declare(strict_types=1);

// Standalone Stage2 CLI. No Composer autoload, network, database or write access.
require dirname(__DIR__).'/src/Hosting/PackageArtifactVerifier.php';

use AiSiteCms\Hosting\PackageArtifactVerifier;

try {
    if (PHP_SAPI !== 'cli') throw new RuntimeException('CLI-only operation');
    if (array_slice($argv, 1) === ['--help']) {
        echo "Usage: php bin/package-preflight.php --check --package-root=/canonical/staged/cms\n";
        exit(0);
    }
    if (count($argv) !== 3 || $argv[1] !== '--check'
        || !str_starts_with($argv[2], '--package-root=')
        || substr($argv[2], strlen('--package-root=')) === '') {
        throw new RuntimeException('Explicit read-only package inspection required');
    }
    $root = substr($argv[2], strlen('--package-root='));
    $report = PackageArtifactVerifier::verify($root);
    echo json_encode($report, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), "\n";
} catch (Throwable $error) {
    // Never disclose filesystem paths or private package contents.
    fwrite(STDERR, "PACKAGE_PREFLIGHT_REFUSED\n");
    exit(3);
}
