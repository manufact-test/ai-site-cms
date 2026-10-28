<?php
declare(strict_types=1);
/**
 * Private site backup larger than the v2 HTTP 64 MB ceiling.
 * Explicit owner CLI only; does NOT deploy or write over an existing site.
 */
if (PHP_SAPI !== 'cli') exit(1);
require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/ArchiveBundle.php';

use Manufact\Stage3\ArchiveBundle;

try {
    if ($argc !== 4 || !in_array($argv[1], ['export','plan','restore'], true)) {
        throw new RuntimeException('Usage: php archive-bundle.php export <site-id> <NEW-absolute-dir> | plan <bundle-absolute-dir> <new-site-id> | restore <bundle-absolute-dir> <new-site-id>');
    }
    $command = $argv[1];
    if ($command === 'export') {
        if (getenv('STAGE3_ALLOW_BUNDLE_EXPORT') !== 'YES')
            throw new RuntimeException('Set STAGE3_ALLOW_BUNDLE_EXPORT=YES explicitly');
        $result = ArchiveBundle::export(stage3_repository(), $argv[2], $argv[3]);
    } elseif ($command === 'plan') {
        $result = ArchiveBundle::plan(stage3_repository(), $argv[2], $argv[3]);
    } else {
        if (getenv('STAGE3_ALLOW_BUNDLE_RESTORE') !== 'YES')
            throw new RuntimeException('Set STAGE3_ALLOW_BUNDLE_RESTORE=YES explicitly');
        $result = ArchiveBundle::restore(stage3_repository(), $argv[2], $argv[3]);
    }
    echo json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'Private bundle operation refused: ' . $e->getMessage() . "\n");
    exit(1);
}
