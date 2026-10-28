<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use PDO;

/**
 * Cross-site section transfer. Both source and destination are existing, private,
 * explicitly authorized sites. Never copies grants, submissions or publications.
 */
trait CrossSiteTransfer
{
    /**
     * Materialize only the copied graph's source-side design token values.
     * The destination's global palette/spacing/typography is never overwritten,
     * even when a token name exists in both sites with different values.
     */
    private static function crossSiteFreezeGraphTokens(array &$graph,array $sourceSite): int
    {
        $tokens=DesignGraph::tokens($sourceSite['designTokens']??null);
        $count=0;
        $style=function(array &$styles) use($tokens,&$count): void {
            $colors=['color','background','borderColor','outlineColor'];
            $spacing=['gap','rowGap','columnGap','padding','paddingX','paddingY',
                'top','left','right','bottom','minHeight'];
            $radii=['radius','borderTopLeftRadius','borderTopRightRadius',
                'borderBottomRightRadius','borderBottomLeftRadius'];
            foreach($styles as $key=>&$value) {
                if($key==='shadowFine' && is_array($value)){
                    if(is_string($value['color']??null)&&str_starts_with($value['color'],'@')){
                        $name=substr($value['color'],1);
                        if(!array_key_exists($name,$tokens['colors']))
                            throw new \InvalidArgumentException('Unknown source shadow color');
                        $value['color']=$tokens['colors'][$name];$count++;
                    }
                    continue;
                }
                if($key==='gradient' && is_array($value)) {
                    foreach(['from','via','to'] as $part) {
                        if(!isset($value[$part])||!is_string($value[$part])||
                            !str_starts_with($value[$part],'@'))continue;
                        $name=substr($value[$part],1);
                        if(!array_key_exists($name,$tokens['colors']))
                            throw new \InvalidArgumentException('Source graph uses unknown color token');
                        $value[$part]=$tokens['colors'][$name];$count++;
                    }
                    continue;
                }
                $kind=in_array($key,$colors,true)?'colors':
                    (in_array($key,$spacing,true)?'spacing':
                    (in_array($key,$radii,true)?'radii':
                    ($key==='fontSize'?'typography':null)));
                if($kind===null||!is_string($value)||!str_starts_with($value,'@'))continue;
                $name=substr($value,1);
                if(!array_key_exists($name,$tokens[$kind]))
                    throw new \InvalidArgumentException('Source graph uses unknown design token');
                $value=$tokens[$kind][$name];$count++;
            }
            unset($value);
        };
        $walk=function(array &$nodes) use(&$walk,$style): void {
            foreach($nodes as &$node) {
                if(isset($node['styles']))$style($node['styles']);
                foreach(['tablet','mobile'] as $breakpoint)
                    if(isset($node['responsive'][$breakpoint]))$style($node['responsive'][$breakpoint]);
                foreach(['hover','focus','active'] as $state)
                    if(isset($node['states'][$state]))$style($node['states'][$state]);
                foreach(['backgroundMedia','backgroundVideo'] as $kind){
                    if(!isset($node[$kind]['overlay']['color']))continue;
                    $overlay=&$node[$kind]['overlay']['color'];
                    if(is_string($overlay)&&str_starts_with($overlay,'@')){
                        $name=substr($overlay,1);
                        if(!array_key_exists($name,$tokens['colors']))
                            throw new \InvalidArgumentException('Unknown source background overlay token');
                        $overlay=$tokens['colors'][$name];$count++;
                    }
                    unset($overlay);
                }
                if(isset($node['children']))$walk($node['children']);
            }
            unset($node);
        };
        $walk($graph['nodes']);
        return $count;
    }

    private function crossSitePrepare(
        string $targetId, string $sourceId, string $sourcePageId, string $sectionId,
        string $targetPageId, int $sourceRevision, int $targetRevision
    ): array {
        if ($sourceId === $targetId) throw new \InvalidArgumentException('Choose two different sites');
        foreach ([$sourceId,$targetId,$sourcePageId,$sectionId,$targetPageId] as $id) {
            if (!preg_match('/^[a-z][a-z0-9-]{2,79}$/D', $id))
                throw new \InvalidArgumentException('Invalid site/page/section ID');
        }
        $source=$this->getDraft($sourceId);
        $target=$this->getDraft($targetId);
        if ($source['revision']!==$sourceRevision || $target['revision']!==$targetRevision)
            throw new Conflict('Site revision changed; create a new transfer plan');
        $section=null;
        foreach ($source['site']['pages'] as $page) {
            if ($page['id']!==$sourcePageId) continue;
            foreach ($page['sections'] as $item) if ($item['id']===$sectionId) $section=$item;
        }
        if ($section===null) throw new NotFound('Source section not found');
        $targetIndex=null;
        foreach ($target['site']['pages'] as $index=>$page) {
            if ($page['id']===$targetPageId) $targetIndex=$index;
        }
        if ($targetIndex===null) throw new NotFound('Destination page not found');
        if (count($target['site']['pages'][$targetIndex]['sections'])>=100)
            throw new \InvalidArgumentException('Destination page is full');

        $available=[];
        foreach ($source['site']['assets'] as $asset) $available[$asset['id']]=$asset;
        $used=[];
        // Only typed media bindings are dependencies. Arbitrary text matching
        // an asset ID must remain untouched during copying.
        foreach (array_merge($section['elements'],$section['items']??[]) as $entry) {
            $ref=$entry['values']['content.media']??null;
            if (is_string($ref) && isset($available[$ref])) $used[$ref]=true;
        }
        $scanGraph=function(array $nodes) use (&$scanGraph,&$used,$available): void {
            foreach ($nodes as $node) {
                foreach (['assetId','posterAssetId'] as $key) {
                    $ref=$node[$key]??null;
                    if (is_string($ref) && isset($available[$ref])) $used[$ref]=true;
                }
                foreach (['responsiveMedia','backgroundMedia','backgroundVideo'] as $type){
                    foreach (['assetId','posterAssetId','tabletAssetId','mobileAssetId',
                        'tabletPosterAssetId','mobilePosterAssetId'] as $key){
                        $ref=$node[$type][$key]??null;
                        if(is_string($ref)&&isset($available[$ref]))$used[$ref]=true;
                    }
                }
                if(isset($node['children']))$scanGraph($node['children']);
            }
        };
        if (isset($section['designGraph'])) $scanGraph($section['designGraph']['nodes']);
        if (count($used)>40) throw new \InvalidArgumentException('Maximum 40 media assets per transfer');
        if (count($target['site']['assets'])+count($used)>300)
            throw new \InvalidArgumentException('Destination media library is full');

        $mediaMap=[];$additions=[];$binary=[];$bytesTotal=0;$manifest=[];
        foreach (array_keys($used) as $oldId) {
            $asset=$available[$oldId];
            $newId='asset-'.bin2hex(random_bytes(10));
            $mediaMap[$oldId]=$newId;
            $newAsset=$asset;
            $newAsset['id']=$newId;
            $extension=['image/png'=>'png','image/jpeg'=>'jpg','image/webp'=>'webp','video/mp4'=>'mp4'][$asset['mime']]??null;
            if ($extension===null) throw new \InvalidArgumentException('Cannot copy unsupported media');
            $newAsset['src']='/assets/'.$newId.'.'.$extension;
            $parts=[[$oldId,$newId,null]];
            foreach ($asset['variants']??[] as $idx=>$variant) {
                $variantId='asset-'.bin2hex(random_bytes(10));
                $mediaMap[$variant['id']]=$variantId;
                $newAsset['variants'][$idx]['id']=$variantId;
                $newAsset['variants'][$idx]['src']='/assets/'.$variantId.'.'.$extension;
                $parts[]=[$variant['id'],$variantId,$variant];
            }
            foreach ($parts as [$from,$to,$variant]) {
                $stored=$this->image($sourceId,$from);
                if ($stored['mime']!==$asset['mime'] ||
                    !hash_equals($stored['sha256'],hash('sha256',$stored['bytes'])) ||
                    ($variant!==null && !hash_equals($variant['sha256'],$stored['sha256'])))
                    throw new \InvalidArgumentException('Source media failed checksum validation');
                if ($variant!==null) {
                    $size=@getimagesizefromstring($stored['bytes']);
                    if (!is_array($size) || $size[0]!==$variant['width'] ||
                        $size[1]!==$variant['height'])
                        throw new \InvalidArgumentException('Source responsive media dimensions mismatch');
                }
                $bytesTotal+=strlen($stored['bytes']);
                if ($bytesTotal>25165824) throw new \InvalidArgumentException('Transfer exceeds 24 MB');
                $binary[]=['id'=>$to,'mime'=>$stored['mime'],'sha256'=>$stored['sha256'],'bytes'=>$stored['bytes']];
            }
            $original=$this->image($sourceId,$oldId);
            $manifest[]=['id'=>$oldId,'mime'=>$asset['mime'],'alt'=>$asset['alt'],
                'sha256'=>$original['sha256'],'responsiveVariants'=>count($asset['variants']??[])];
            $additions[]=$newAsset;
        }
        $copy=$section;
        // Cross-site transfer creates a new local section; shared identity
        // never travels to another site's group namespace.
        unset($copy['sharedKey']);
        foreach ($copy['elements'] as &$entry) {
            $ref=$entry['values']['content.media']??null;
            if (is_string($ref) && isset($mediaMap[$ref]))
                $entry['values']['content.media']=$mediaMap[$ref];
        }
        unset($entry);
        foreach ($copy['items']??[] as $i=>$entry) {
            $ref=$entry['values']['content.media']??null;
            if (is_string($ref) && isset($mediaMap[$ref]))
                $copy['items'][$i]['values']['content.media']=$mediaMap[$ref];
        }
        $rewriteGraph=function(array &$nodes) use (&$rewriteGraph,$mediaMap): void {
            foreach ($nodes as &$node) {
                foreach (['assetId','posterAssetId'] as $key) {
                    $ref=$node[$key]??null;
                    if (is_string($ref) && isset($mediaMap[$ref]))
                        $node[$key]=$mediaMap[$ref];
                }
                foreach (['responsiveMedia','backgroundMedia','backgroundVideo'] as $kind){
                    if(!isset($node[$kind]))continue;
                    foreach (['assetId','posterAssetId','tabletAssetId','mobileAssetId',
                        'tabletPosterAssetId','mobilePosterAssetId'] as $key) {
                        $ref=$node[$kind][$key]??null;
                        if(is_string($ref)&&isset($mediaMap[$ref]))
                            $node[$kind][$key]=$mediaMap[$ref];
                    }
                }
                if(isset($node['children']))$rewriteGraph($node['children']);
            }
            unset($node);
        };
        if (isset($copy['designGraph'])) $rewriteGraph($copy['designGraph']['nodes']);
        $copy['id']='section-'.bin2hex(random_bytes(10));
        foreach ($copy['elements'] as &$element) $element['id']='element-'.bin2hex(random_bytes(10));
        unset($element);
        foreach ($copy['items']??[] as $index=>$item) $copy['items'][$index]['id']='item-'.bin2hex(random_bytes(10));
        $frozenTokens=0;
        if (isset($copy['designGraph'])) {
            $frozenTokens=self::crossSiteFreezeGraphTokens($copy['designGraph'],$source['site']);
            $copy['designGraph']['id']='graph-'.bin2hex(random_bytes(10));
            $nodeMap=[];
            $renew=function(array &$nodes) use (&$renew,&$nodeMap): void {
                foreach ($nodes as &$node) {
                    $old=$node['id'];$node['id']='node-'.bin2hex(random_bytes(10));
                    $nodeMap[$old]=$node['id'];
                    if (isset($node['children'])) $renew($node['children']);
                }
                unset($node);
            };
            $renew($copy['designGraph']['nodes']);
            $renewTargets=function(array &$nodes) use (&$renewTargets,$nodeMap): void {
                foreach($nodes as &$node){
                    if(isset($node['popupTarget']))
                        $node['popupTarget']=$nodeMap[$node['popupTarget']]??$node['popupTarget'];
                    if(isset($node['children']))$renewTargets($node['children']);
                }
                unset($node);
            };
            $renewTargets($copy['designGraph']['nodes']);
        }
        $candidate=$target['site'];
        foreach ($additions as $asset) $candidate['assets'][]=$asset;
        $candidate['pages'][$targetIndex]['sections'][]=$copy;
        // Full contract validation catches token dependencies, media types,
        // unique IDs, form scenarios and all Design Graph constraints BEFORE write.
        $candidate=$this->validator->validate($candidate);
        $paths=[];
        foreach ($target['site']['pages'] as $page) $paths[$page['path']]=true;
        $links=[];$findLinks=function(mixed $value,?string $key=null) use (&$findLinks,&$links,$paths): void {
            if (is_string($value) && in_array($key,['behavior.href','href'],true)
                && str_starts_with($value,'/') && !str_starts_with($value,'//')) {
                $path=explode('#',explode('?',$value,2)[0],2)[0];
                if ($path!=='' && !isset($paths[$path])) $links[$value]=true;
            } elseif (is_array($value)) foreach ($value as $k=>$item) $findLinks($item,(string)$k);
        };
        $findLinks($section);
        $summary=['component'=>$section['component'],'sourceSiteId'=>$sourceId,
            'targetSiteId'=>$targetId,'sourceRevision'=>$sourceRevision,
            'targetRevision'=>$targetRevision,'sourcePageId'=>$sourcePageId,
            'targetPageId'=>$targetPageId,'sectionId'=>$sectionId,
            'mediaCount'=>count($additions),'mediaParts'=>count($binary),
            'mediaManifest'=>$manifest,
            'mediaBytes'=>$bytesTotal,'frozenDesignTokens'=>$frozenTokens,
            'missingTargetLinks'=>array_keys($links),
            'sectionsAfter'=>count($candidate['pages'][$targetIndex]['sections'])];
        return ['candidate'=>$candidate,'binary'=>$binary,'mediaMap'=>$mediaMap,'summary'=>$summary];
    }

    public function planCrossSiteSection(
        string $targetId,string $sourceId,string $sourcePageId,string $sectionId,
        string $targetPageId,int $sourceRevision,int $targetRevision
    ): array {
        $p=$this->crossSitePrepare($targetId,$sourceId,$sourcePageId,$sectionId,
            $targetPageId,$sourceRevision,$targetRevision);
        return $p['summary'];
    }

    public function applyCrossSiteSection(
        string $targetId,string $sourceId,string $sourcePageId,string $sectionId,
        string $targetPageId,int $sourceRevision,int $targetRevision
    ): array {
        return $this->atomic(function() use($targetId,$sourceId,$sourcePageId,$sectionId,
            $targetPageId,$sourceRevision,$targetRevision): array {
            // MySQL serializes source/destination revisions; fixed order prevents
            // two simultaneous reciprocal transfers from deadlocking by order.
            if ($this->driver==='mysql') {
                $ids=[$sourceId,$targetId];sort($ids,SORT_STRING);
                $lock=$this->db->prepare('SELECT revision FROM stage3_drafts WHERE site_id=? FOR UPDATE');
                foreach($ids as $id) {$lock->execute([$id]);$lock->fetchColumn();}
            }
            $p=$this->crossSitePrepare($targetId,$sourceId,$sourcePageId,$sectionId,
                $targetPageId,$sourceRevision,$targetRevision);
            $now=$this->now();
            $insert=$this->db->prepare(
                'INSERT INTO stage3_media (site_id,asset_id,mime,sha256,bytes,created_at) VALUES (?,?,?,?,?,?)');
            foreach ($p['binary'] as $media) {
                $insert->bindValue(1,$targetId);
                $insert->bindValue(2,$media['id']);
                $insert->bindValue(3,$media['mime']);
                $insert->bindValue(4,$media['sha256']);
                $insert->bindValue(5,$media['bytes'],PDO::PARAM_LOB);
                $insert->bindValue(6,$now);$insert->execute();
            }
            $site=$p['candidate'];
            $this->assertStoredAssets($targetId,$site);
            $body=self::encode($site);
            $next=$targetRevision+1;
            $update=$this->db->prepare(
                'UPDATE stage3_drafts SET revision=?,body=?,updated_at=? WHERE site_id=? AND revision=?');
            $update->execute([$next,$body,$now,$targetId,$targetRevision]);
            if ($update->rowCount()!==1) throw new Conflict('Destination changed; transfer rolled back');
            $this->saveRevision($targetId,$next,$body,$now);
            return ['site'=>$site,'revision'=>$next,'transfer'=>$p['summary'],
                'assetMap'=>$p['mediaMap'],'published'=>false];
        });
    }
}
