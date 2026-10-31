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
    $site = (new ContractValidator(dirname(__DIR__, 2) . '/components'))->validate($published['site']);
    // Optional explicit deployment URL; no fake canonical host on unconfigured ZIPs.
    $exportOrigin = PublicRenderer::origin(getenv('STAGE3_EXPORT_ORIGIN') ?: null);
    if (!in_array('/', array_column($site['pages'], 'path'), true)) {
        failExport('A published website requires a root page');
    }
    // Visitor pages stay static; form submissions require an explicitly
    // deployed, separate HTTPS collector. Never export a silently broken form.
    $forms = false;
    foreach ($site['pages'] as $page) {
        foreach ($page['sections'] as $section) {
            $forms = $forms || in_array($section['component'], ['lead-form','lead-form-flex'], true);
        }
    }
    $collectorBase = getenv('STAGE3_FORM_ENDPOINT');
    if ($forms) {
        if (!is_string($collectorBase) || $collectorBase === '') {
            failExport('Form collector origin STAGE3_FORM_ENDPOINT required for this release');
        }
        \Manufact\Stage3\FormGateway::endpoint($collectorBase, $siteId, 'section-placeholder');
        \Manufact\Stage3\FormGateway::secret();
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
        'assets' => [],
        'stylesheets' => [],
        'formCollector' => $forms ? $collectorBase : null,
        'publicOrigin' => $exportOrigin,
        'redirects' => [],
    ];
    try {
        foreach ($site['assets'] as $asset) {
          foreach (array_merge([['id'=>$asset['id'],'src'=>$asset['src']]], $asset['variants'] ?? []) as $part) {
            $image = stage3_repository()->image($siteId, $part['id']);
            if ($image['mime'] !== $asset['mime']) {
                failExport('Published asset type mismatch');
            }
            $relative = ltrim($part['src'], '/');
            $expectedPrefix = 'assets/' . $part['id'] . '.';
            if (!str_starts_with($relative, $expectedPrefix)
                || !preg_match('~^assets/[a-z][a-z0-9-]{2,79}\.(png|jpg|webp|mp4|woff2)$~D', $relative)) {
                failExport('Unsafe media export path');
            }
            if (!is_dir($temp . '/assets') && !mkdir($temp . '/assets', 0755)) {
                failExport('Cannot create media directory');
            }
            if (file_put_contents($temp . '/' . $relative, $image['bytes'], LOCK_EX) === false) {
                failExport('Cannot export media bytes');
            }
            $manifest['assets'][] = [
                'id' => $part['id'],
                'parentId' => $asset['id'],
                'width' => $part['width'] ?? null,
                'file' => $relative,
                'mime' => $asset['mime'],
                'sha256' => $image['sha256']
            ];
            if (isset($part['sha256']) && $part['sha256'] !== $image['sha256'])
                failExport('Responsive variant SHA256 mismatch');
          }
        }
        $sharedCss=null;$sharedFile=null;
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
            $html = PublicRenderer::html($site, $path, '', $forms ? $collectorBase : null, $published['version'], $exportOrigin);
            if ($html === null) failExport('Cannot render published page');
            $split=PublicRenderer::externalizeBaseCss($html);
            if($sharedCss===null){$sharedCss=$split['css'];$sharedFile=$split['file'];}
            elseif($sharedCss!==$split['css']||$sharedFile!==$split['file'])
                failExport('Global styles differ between pages');
            if(file_put_contents($temp.'/'.$relative,$split['html'],LOCK_EX)===false)
                failExport('Cannot write published page');
            $manifest['pages'][] = [
                'path' => $path,
                'file' => $relative,
                'sha256' => hash('sha256', $split['html'])
            ];
        }
        $notFoundPath=PublicRenderer::notFoundPath($site);
        if($notFoundPath!==null){
            $errorHtml=PublicRenderer::html($site,$notFoundPath,'',null,
                $published['version'],$exportOrigin,null,false,true);
            if(!is_string($errorHtml))failExport('Approved 404 page is missing');
            $errorSplit=PublicRenderer::externalizeBaseCss($errorHtml);
            if($errorSplit['css']!==$sharedCss||$errorSplit['file']!==$sharedFile)
                failExport('404 page differs from published global stylesheet');
            if(file_put_contents($temp.'/404.html',$errorSplit['html'],LOCK_EX)===false)
                failExport('Cannot write custom 404 page');
            $manifest['notFound']=['path'=>$notFoundPath,'file'=>'404.html',
                'sha256'=>hash('sha256',$errorSplit['html'])];
        }
        if($sharedCss===null||$sharedFile===null)failExport('Global stylesheet missing');
        if(!mkdir($temp.'/styles',0755,true)||
            file_put_contents($temp.'/'.$sharedFile,$sharedCss,LOCK_EX)===false)
            failExport('Cannot write immutable stylesheet');
        $manifest['stylesheets'][]=['file'=>$sharedFile,'sha256'=>hash('sha256',$sharedCss)];
        // Static hosting cannot issue HTTP status 301 without provider-specific rewrite
        // rules. Export a noindex HTML fallback plus explicit redirect manifest data.
        foreach ($site['redirects']??[] as $redirect) {
            $relative=ltrim($redirect['from'],'/').'index.html';
            $folder=dirname($temp.'/'.$relative);
            if (!is_dir($folder) && !mkdir($folder,0755,true))
                failExport('Cannot create redirect directory');
            $body=PublicRenderer::staticRedirect($redirect['to'],$site['language']??'ru');
            if (file_put_contents($temp.'/'.$relative,$body,LOCK_EX)===false)
                failExport('Cannot create redirect fallback');
            $manifest['redirects'][]=[
                'from'=>$redirect['from'],'to'=>$redirect['to'],
                'file'=>$relative,'sha256'=>hash('sha256',$body)
            ];
        }
        if ($exportOrigin!==null) {
            foreach ([
                'sitemap.xml'=>PublicRenderer::sitemap($site,'',$exportOrigin),
                'robots.txt'=>PublicRenderer::robots('',$exportOrigin)
            ] as $name=>$body) {
                if (file_put_contents($temp.'/'.$name,$body,LOCK_EX)===false)
                    failExport('Cannot write search metadata');
                $manifest['searchFiles'][$name]=hash('sha256',$body);
            }
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
