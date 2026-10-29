<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use InvalidArgumentException;
use RuntimeException;

/**
 * D2: private, immutable, version-pinned export contract. No draft writes,
 * deployment actions, filesystem staging, shell execution or visitor endpoints.
 * This portable handoff is PUBLIC CONTENT ONLY (never installation archives).
 */
final class TechnologyHandoff
{
    private const MAX_FILES = 3000;
    private const MAX_RAW_BYTES = 28000000;
    private const ROUTE = '~^/(?:[a-z0-9-]+/)*$~D';

    public static function options(SiteRepository $sites, string $siteId, int $version, ?string $origin, ?string $collector): array
    {
        $origin = PublicRenderer::origin($origin);
        if ($collector !== null && $collector !== '') {
            FormGateway::endpoint($collector, $siteId, 'section-placeholder');
        } else {
            $collector = null;
        }
        $site = $sites->publishedVersion($siteId, $version);
        if (($site['siteId'] ?? '') !== $siteId) throw new RuntimeException('Publication belongs to another site');
        PublicRenderer::assertPublishable($site);
        $forms=0;
        foreach ($site['pages'] as $page) {
            foreach ($page['sections'] as $section) {
                if (in_array($section['component'], ['lead-form','lead-form-flex'], true)) $forms++;
            }
        }
        if ($forms && $collector === null) {
            throw new InvalidArgumentException('Published forms require a separate explicitly configured HTTPS collector');
        }
        if ($forms) FormGateway::secret();
        $assets=0;
        foreach ($site['assets'] as $a) $assets += 1 + count($a['variants'] ?? []);
        if (count($site['pages']) + $assets + count($site['redirects'] ?? []) + 4 > self::MAX_FILES) {
            throw new InvalidArgumentException('Published release exceeds bounded handoff file count');
        }
        $fingerprint=hash('sha256',json_encode([$siteId,$version,$site,$origin,$collector],
            JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
        return ['site'=>$site,'version'=>$version,'origin'=>$origin,
            'collector'=>$collector,'forms'=>$forms,'fingerprint'=>$fingerprint,
            'pages'=>count($site['pages']),'assets'=>$assets,
            'redirects'=>count($site['redirects'] ?? [])];
    }

    public static function plan(SiteRepository $sites, string $siteId, int $version, ?string $origin, ?string $collector): array
    {
        $o=self::options($sites,$siteId,$version,$origin,$collector);
        $site=$o['site'];
        $paths=array_map(static fn(array $page): string=>$page['path'],$site['pages']);
        return ['siteId'=>$siteId,'version'=>$version,'sourceRevision'=>self::revision($sites,$siteId,$version),
            'pages'=>$o['pages'],'paths'=>$paths,'assets'=>$o['assets'],
            'redirects'=>$o['redirects'],'forms'=>$o['forms'],
            'formCollector'=>$o['collector'],'publicOrigin'=>$o['origin'],
            'fingerprint'=>$o['fingerprint'],'draftModified'=>($sites->getDraft($siteId)['revision'] !== self::revision($sites,$siteId,$version)),
            'outputs'=>['html','php','next-static','next-ssr'],
            'notice'=>'Export only; current draft, live visitors, DB and publication remain unchanged. Next SSR requires Node hosting.'];
    }

    private static function revision(SiteRepository $sites,string $id,int $version): int
    {
        foreach ($sites->publicationHistory($id) as $row)
            if ($row['version'] === $version) return $row['sourceRevision'];
        throw new NotFound('Unknown published release');
    }

    public static function compare(SiteRepository $sites, string $id, int $from, int $to): array
    {
        if ($from === $to) throw new InvalidArgumentException('Choose two distinct published versions');
        $a=$sites->publishedVersion($id,$from);
        $b=$sites->publishedVersion($id,$to);
        $before=[];$after=[];
        foreach ($a['pages'] as $p) $before[$p['id']]=$p;
        foreach ($b['pages'] as $p) $after[$p['id']]=$p;
        $changes=[];
        foreach (array_unique(array_merge(array_keys($before),array_keys($after))) as $pid) {
            $old=$before[$pid]??null;$new=$after[$pid]??null;
            $delta=$old===null?'added':($new===null?'removed':($old===$new?'unchanged':'changed'));
            if($delta==='unchanged')continue;
            $changes[]=['pageId'=>$pid,'from'=>$old['path']??null,'to'=>$new['path']??null,
                'status'=>$delta,'seoChanged'=>$old!==null&&$new!==null&&($old['seo']??[])!==($new['seo']??[]),
                'contentChanged'=>$old!==null&&$new!==null&&($old['sections']??[])!==($new['sections']??[])];
        }
        return ['from'=>$from,'to'=>$to,'changes'=>$changes,
            'assetsChanged'=>$a['assets']!==$b['assets'],
            'redirectsChanged'=>($a['redirects']??[])!==($b['redirects']??[]),
            'themeChanged'=>($a['theme']??[])!==($b['theme']??[]),
            'doesNotPublish'=>true];
    }

    public static function capsule(SiteRepository $sites, string $id, int $version, ?string $origin, ?string $collector): array
    {
        $o=self::options($sites,$id,$version,$origin,$collector);
        $site=$o['site'];$revision=self::revision($sites,$id,$version);
        $files=[];$rawBytes=0;
        $add=static function(string $relative,string $bytes) use (&$files,&$rawBytes): string {
            if ($relative===''||str_starts_with($relative,'/')||str_contains($relative,'\\')
                ||str_contains($relative,'..')||preg_match('~^[a-z0-9./-]+$~D',$relative)!==1)
                throw new InvalidArgumentException('Unsafe release file path');
            if(isset($files[$relative]))throw new InvalidArgumentException('Duplicate release file');
            $rawBytes+=strlen($bytes);
            if($rawBytes>self::MAX_RAW_BYTES||count($files)>=self::MAX_FILES)
                throw new InvalidArgumentException('Publication exceeds portable handoff size limit');
            $files[$relative]=['path'=>$relative,'sha256'=>hash('sha256',$bytes),'base64'=>base64_encode($bytes)];
            return hash('sha256',$bytes);
        };
        $manifest=['format'=>'manufact-ai-static-site-v1','siteId'=>$id,'publishedVersion'=>$version,
            'sourceRevision'=>$revision,'pages'=>[],'assets'=>[],'stylesheets'=>[],
            'formCollector'=>$o['forms']?$o['collector']:null,
            'publicOrigin'=>$o['origin'],'redirects'=>[]];
        foreach($site['assets'] as $asset) {
            foreach(array_merge([['id'=>$asset['id'],'src'=>$asset['src']]],$asset['variants']??[]) as $part) {
                $relative=ltrim($part['src'],'/');
                if(!preg_match('~^assets/[a-z][a-z0-9-]{2,79}\.(?:png|jpg|webp|mp4|woff2)$~D',$relative)
                    ||!str_starts_with($relative,'assets/'.$part['id'].'.')) throw new InvalidArgumentException('Unsafe asset');
                $media=$sites->image($id,$part['id']);
                if($media['mime']!==$asset['mime']
                    ||(isset($part['sha256'])&&!hash_equals($part['sha256'],$media['sha256'])))
                    throw new RuntimeException('Published media integrity mismatch');
                $sha=$add($relative,$media['bytes']);
                $manifest['assets'][]=['id'=>$part['id'],'parentId'=>$asset['id'],
                    'width'=>$part['width']??null,'file'=>$relative,'mime'=>$asset['mime'],'sha256'=>$sha];
            }
        }
        $sharedCss=null;$sharedFile=null;
        foreach($site['pages'] as $page) {
            if(preg_match(self::ROUTE,$page['path'])!==1)throw new InvalidArgumentException('Unsafe page path');
            $relative=ltrim($page['path'],'/').'index.html';
            $html=PublicRenderer::html($site,$page['path'],'',$o['collector'],$version,$o['origin']);
            if(!is_string($html))throw new RuntimeException('Missing published page');
            $split=PublicRenderer::externalizeBaseCss($html);
            if($sharedCss===null){$sharedCss=$split['css'];$sharedFile=$split['file'];}
            elseif($sharedCss!==$split['css']||$sharedFile!==$split['file'])
                throw new RuntimeException('Global styles differ between pages');
            $manifest['pages'][]=['path'=>$page['path'],'file'=>$relative,'sha256'=>$add($relative,$split['html'])];
        }
        if($sharedCss===null||$sharedFile===null)
            throw new RuntimeException('Cannot export global CSS without pages');
        $manifest['stylesheets'][]=['file'=>$sharedFile,'sha256'=>$add($sharedFile,$sharedCss)];
        foreach($site['redirects']??[] as $redirect) {
            if(preg_match(self::ROUTE,$redirect['from'])!==1||$redirect['from']==='/')
                throw new InvalidArgumentException('Invalid redirect path');
            $relative=ltrim($redirect['from'],'/').'index.html';
            $html=PublicRenderer::staticRedirect($redirect['to'],$site['language']??'ru');
            $manifest['redirects'][]=['from'=>$redirect['from'],'to'=>$redirect['to'],
                'file'=>$relative,'sha256'=>$add($relative,$html)];
        }
        if($o['origin']!==null) {
            $manifest['searchFiles']=[
                'sitemap.xml'=>$add('sitemap.xml',PublicRenderer::sitemap($site,'',$o['origin'])),
                'robots.txt'=>$add('robots.txt',PublicRenderer::robots('',$o['origin']))
            ];
        }
        $manifestBytes=json_encode($manifest,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
        $add('release-manifest.json',$manifestBytes);
        ksort($files,SORT_STRING);
        return ['format'=>'manufact-runtime-handoff-v1','siteId'=>$id,'version'=>$version,
            'sourceRevision'=>$revision,'fingerprint'=>$o['fingerprint'],
            'manifestSha256'=>hash('sha256',$manifestBytes),'rawBytes'=>$rawBytes,
            'files'=>array_values($files)];
    }
}
