<?php
declare(strict_types=1);
/**
 * Export a PUBLISHED immutable CMS revision into static standalone HTML.
 * Explicit CLI only. No deployment, host credentials, web writable endpoint,
 * auto-overwrite, PHP file output, symlinks, uploads, or changing live sites.
 */
if (PHP_SAPI !== 'cli') {
    exit(1);
}
require dirname(__DIR__) . '/bootstrap.php';

use Manufact\Stage3\ContractValidator;
use Manufact\Stage3\PublicRenderer;

function failExport(string $reason): never
{
    throw new RuntimeException($reason);
}
try {
    if ($argc !== 3 || preg_match('/^[a-z][a-z0-9-]{2,79}$/D', $argv[1]) !== 1) {
        failExport('Usage: php export-published.php <site-id> <NEW-output-directory>');
    }
    $siteId = $argv[1];
    $destination = $argv[2];
    // Require a non-existing path under an existing, explicitly chosen parent.
    // The temporary build is atomic within the same filesystem.
    if (!str_starts_with($destination, '/') || str_ends_with($destination, '/')
        || file_exists($destination) || is_link($destination)) {
        failExport('Absolute non-existing output directory required');
    }
    $parent = realpath(dirname($destination));
    if ($parent === false || !is_dir($parent) || !is_writable($parent)
        || basename($destination) === '' || in_array(basename($destination), ['.', '..'], true)) {
        failExport('Output parent missing or not writable');
    }
    $published = stage3_repository()->published($siteId);
    $site = (new ContractValidator(dirname(__DIR__) . '/components'))->validate($published['site']);
    if (!in_array('/', array_column($site['pages'], 'path'), true)) {
        failExport('A published website requires a root page');
    }
    // In this baseline renderer we only use manifest-bound text/colors/links.
    // Unhandled binary assets must not become broken references in an export.
    if ($site['assets'] !== []) {
        failExport('Static export cannot yet package media assets');
    }
    $temp = $parent . '/.stage3-build-' . bin2hex(random_bytes(10));
    if (!mkdir($temp, 0755)) {
        failExport('Cannot create export staging directory');
    }
    $manifest = [
        'format' => 'manufact-ai-static-site-v1',
        'siteId' => $siteId,
        'publishedVersion' => $published['version'],
        'sourceRevision' => $published['sourceRevision'],
        'pages' => [],
    ];
    try {
        foreach ($site['pages'] as $page) {
            $path = $page['path'];
            $relative = ltrim($path, '/') . 'index.html';
            if (str_contains($relative, '\\') || str_contains($relative, '..')
                || str_starts_with($relative, '/')) {
                failExport('Unsafe output path');
            }
            $folder = dirname($temp . '/' . $relative);
            if (!is_dir($folder) && !mkdir($folder, 0755, true)) {
                failExport('Cannot create page directory');
            }
            $html = PublicRenderer::html($site, $path, '');
            if ($html === null || file_put_contents($temp . '/' . $relative, $html, LOCK_EX) === false) {
                failExport('Cannot write published page');
            }
            $manifest['pages'][] = [
                'path' => $path,
                'file' => $relative,
                'sha256' => hash('sha256', $html)
            ];
        }
        if (file_put_contents($temp . '/release-manifest.json',
            json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)
            . "\n", LOCK_EX) === false) {
            failExport('Cannot write static release manifest');
        }
        if (file_exists($destination) || !rename($temp, $destination)) {
            failExport('Output already exists; never replace it');
        }
    } catch (Throwable $e) {
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($temp, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $file) {
            if ($file->isDir()) {
                rmdir($file->getPathname());
            } else {
                unlink($file->getPathname());
            }
        }
        rmdir($temp);
        throw $e;
    }
    echo "Static published release created (no CMS runtime): " . $destination . "\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Static export refused: " . $e->getMessage() . "\n");
    exit(1);
}
