<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use PDO;

/**
 * Import a complete source page OR a curated ordered group of sections into an
 * existing destination site. This never imports accounts, leads, grants, menus,
 * redirects, global theme, licences, site identifiers or publications.
 */
trait CrossSiteCollections
{
    private function collectionPrepare(
        string $targetId, string $sourceId, string $sourcePageId, string $mode,
        array $sectionIds, ?string $targetPageId, ?string $newPath,
        int $sourceRevision, int $targetRevision
    ): array {
        if ($sourceId === $targetId) throw new \InvalidArgumentException('Source and destination must differ');
        foreach ([$sourceId,$targetId,$sourcePageId] as $value)
            if (preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$value)!==1)
                throw new \InvalidArgumentException('Invalid site or page identity');
        if (!in_array($mode,['sections','page'],true))
            throw new \InvalidArgumentException('Unsupported collection import mode');
        $source=$this->getDraft($sourceId);
        $target=$this->getDraft($targetId);
        if ($source['revision']!==$sourceRevision || $target['revision']!==$targetRevision)
            throw new Conflict('Source or destination changed; check import again');
        $sourceSite=$this->validator->validate($source['site']);
        $page=null;
        foreach($sourceSite['pages'] as $candidate)
            if($candidate['id']===$sourcePageId){$page=$candidate;break;}
        if($page===null)throw new NotFound('Source page not found');
        $targetIndex=null;
        if($mode==='sections'){
            if(!is_string($targetPageId)||preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$targetPageId)!==1||
                $newPath!==null)throw new \InvalidArgumentException('Select a destination page for sections');
            foreach($target['site']['pages'] as $i=>$p)
                if($p['id']===$targetPageId)$targetIndex=$i;
            if($targetIndex===null)throw new NotFound('Destination page not found');
            if(!array_is_list($sectionIds)||count($sectionIds)<1||count($sectionIds)>10||
                count(array_unique($sectionIds))!==count($sectionIds))
                throw new \InvalidArgumentException('Choose 1–10 distinct source sections');
            $lookups=[];
            foreach($sectionIds as $id) {
                if(!is_string($id)||preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$id)!==1)
                    throw new \InvalidArgumentException('Invalid source section ID');
                $lookups[$id]=true;
            }
            $selected=array_values(array_filter($page['sections'],
                static fn(array $section): bool => isset($lookups[$section['id']])));
            if(count($selected)!==count($lookups))throw new NotFound('A selected source section is missing');
            if(count($selected)+count($target['site']['pages'][$targetIndex]['sections'])>100)
                throw new \InvalidArgumentException('Destination exceeds 100 sections');
        }else{
            if($sectionIds!==[]||$targetPageId!==null||!is_string($newPath)||
                $newPath===''||strlen($newPath)>240)
                throw new \InvalidArgumentException('A complete page requires a new destination path');
            if(count($target['site']['pages'])>=100)
                throw new \InvalidArgumentException('Destination exceeds 100 pages');
            foreach($target['site']['pages'] as $p)
                if($p['path']===$newPath)
                    throw new Conflict('Destination page path already exists');
            foreach($target['site']['redirects']??[] as $redirect)
                if($redirect['from']===$newPath)
                    throw new Conflict('Destination path is reserved by a redirect');
            $selected=$page['sections'];
            if(count($selected)>100)throw new \InvalidArgumentException('Source page has too many sections');
        }

        $available=[];
        foreach($sourceSite['assets'] as $asset)$available[$asset['id']]=$asset;
        $used=[];
        $collectGraph=function(array $nodes) use (&$collectGraph,&$used,$available): void {
            foreach($nodes as $node) {
                foreach(['assetId','posterAssetId'] as $key) {
                    $id=$node[$key]??null;
                    if(is_string($id)&&isset($available[$id]))$used[$id]=true;
                }
                if(isset($node['children']))$collectGraph($node['children']);
            }
        };
        foreach($selected as $section) {
            foreach(array_merge($section['elements'],$section['items']??[]) as $entry) {
                $id=$entry['values']['content.media']??null;
                if(is_string($id)&&isset($available[$id]))$used[$id]=true;
            }
            if(isset($section['designGraph']))$collectGraph($section['designGraph']['nodes']);
        }
        if($mode==='page'){
            $og=$page['seo']['ogImage']??null;
            if(is_string($og)&&isset($available[$og]))$used[$og]=true;
        }
        if(count($used)>40 || count($target['site']['assets'])+count($used)>300)
            throw new \InvalidArgumentException('Media limit exceeded (40 per import, 300 per site)');
        $mediaMap=[];$assets=[];$binaries=[];$manifest=[];$totalBytes=0;
        foreach(array_keys($used) as $old) {
            $asset=$available[$old];
            $mime=$asset['mime'];
            $ext=['image/png'=>'png','image/jpeg'=>'jpg','image/webp'=>'webp','video/mp4'=>'mp4'][$mime]??null;
            if($ext===null)throw new \InvalidArgumentException('Unsupported media type');
            $fresh='asset-'.bin2hex(random_bytes(10));
            $mediaMap[$old]=$fresh;
            $copied=$asset;$copied['id']=$fresh;$copied['src']='/assets/'.$fresh.'.'.$ext;
            $parts=[[$old,$fresh,null]];
            foreach($asset['variants']??[] as $index=>$variant) {
                $vId='asset-'.bin2hex(random_bytes(10));
                $mediaMap[$variant['id']]=$vId;
                $copied['variants'][$index]['id']=$vId;
                $copied['variants'][$index]['src']='/assets/'.$vId.'.'.$ext;
                $parts[]=[$variant['id'],$vId,$variant];
            }
            $digest=null;
            foreach($parts as [$from,$into,$variant]) {
                $original=$this->image($sourceId,$from); // SHA256 verified by storage API
                if($original['mime']!==$mime||
                    ($variant!==null&&!hash_equals($variant['sha256'],$original['sha256'])))
                    throw new \InvalidArgumentException('Corrupt source media binding');
                if($variant!==null){
                    $size=@getimagesizefromstring($original['bytes']);
                    if(!is_array($size)||$size[0]!==$variant['width']||$size[1]!==$variant['height'])
                        throw new \InvalidArgumentException('Corrupt responsive variant');
                }
                if($from===$old)$digest=$original['sha256'];
                $totalBytes+=strlen($original['bytes']);
                if($totalBytes>25165824)throw new \InvalidArgumentException('Import exceeds 24 MB');
                $binaries[]=['id'=>$into,'mime'=>$mime,'sha256'=>$original['sha256'],
                    'bytes'=>$original['bytes']];
            }
            $manifest[]=['id'=>$old,'mime'=>$mime,'sha256'=>$digest,'alt'=>$asset['alt'],
                'variants'=>count($asset['variants']??[])];
            $assets[]=$copied;
        }

        $frozenTokens=0;$newSections=[];
        foreach($selected as $section){
            $copy=$section;
            foreach($copy['elements'] as &$entry){
                $id=$entry['values']['content.media']??null;
                if(is_string($id)&&isset($mediaMap[$id]))$entry['values']['content.media']=$mediaMap[$id];
                $entry['id']='element-'.bin2hex(random_bytes(10));
            }unset($entry);
            foreach($copy['items']??[] as $i=>$entry){
                $id=$entry['values']['content.media']??null;
                if(is_string($id)&&isset($mediaMap[$id]))
                    $copy['items'][$i]['values']['content.media']=$mediaMap[$id];
                $copy['items'][$i]['id']='item-'.bin2hex(random_bytes(10));
            }
            if(isset($copy['designGraph'])){
                $walk=function(array &$nodes)use(&$walk,$mediaMap):void{
                    foreach($nodes as &$node){
                        foreach(['assetId','posterAssetId'] as $k){
                            $id=$node[$k]??null;
                            if(is_string($id)&&isset($mediaMap[$id]))$node[$k]=$mediaMap[$id];
                        }
                        $node['id']='node-'.bin2hex(random_bytes(10));
                        if(isset($node['children']))$walk($node['children']);
                    }unset($node);
                };
                $walk($copy['designGraph']['nodes']);
                $frozenTokens+=self::crossSiteFreezeGraphTokens($copy['designGraph'],$sourceSite);
                $copy['designGraph']['id']='graph-'.bin2hex(random_bytes(10));
            }
            $copy['id']='section-'.bin2hex(random_bytes(10));
            $newSections[]=$copy;
        }
        $candidate=$target['site'];
        foreach($assets as $asset)$candidate['assets'][]=$asset;
        if($mode==='sections') {
            foreach($newSections as $section)
                $candidate['pages'][$targetIndex]['sections'][]=$section;
        }else{
            $newPage=$page;
            $newPage['id']='page-'.bin2hex(random_bytes(10));
            $newPage['path']=$newPath;
            $newPage['sections']=$newSections;
            if(isset($newPage['navigation']['parentId']))unset($newPage['navigation']['parentId']);
            if(isset($newPage['seo']['ogImage'])){
                $og=$newPage['seo']['ogImage'];
                if(isset($mediaMap[$og]))$newPage['seo']['ogImage']=$mediaMap[$og];
            }
            $candidate['pages'][]=$newPage;
        }
        $candidate=$this->validator->validate($candidate);

        $paths=[];
        foreach($candidate['pages'] as $p)$paths[$p['path']]=true;
        $missing=[];
        $links=function(mixed $value,?string $key=null)use(&$links,&$missing,$paths):void{
            if(is_string($value)&&in_array($key,['behavior.href','href'],true)&&
                str_starts_with($value,'/')&&!str_starts_with($value,'//')){
                $path=explode('#',explode('?',$value,2)[0],2)[0];
                if($path!==''&&!isset($paths[$path]))$missing[$value]=true;
            }elseif(is_array($value))foreach($value as $k=>$child)$links($child,(string)$k);
        };
        foreach($selected as $section)$links($section);
        $snippets=[];
        foreach($selected as $section) {
            foreach(array_merge($section['elements'],$section['items']??[]) as $entry) {
                $v=$entry['values']['content.text']??null;
                if(is_string($v)&&trim($v)!=='')$snippets[]=mb_substr(trim($v),0,120);
            }
        }
        $summary=[
            'mode'=>$mode,'sourceSiteId'=>$sourceId,'targetSiteId'=>$targetId,
            'sourcePageId'=>$sourcePageId,'targetPageId'=>$targetPageId,'newPath'=>$newPath,
            'sourceRevision'=>$sourceRevision,'targetRevision'=>$targetRevision,
            'sections'=>count($selected),'sectionComponents'=>array_column($selected,'component'),
            'pageTitle'=>$page['title'],'copiesSEO'=>$mode==='page'&&isset($page['seo']),
            'createsPage'=>$mode==='page','copiesNavigationParent'=>false,
            'mediaCount'=>count($assets),'mediaParts'=>count($binaries),
            'mediaBytes'=>$totalBytes,'mediaManifest'=>$manifest,
            'frozenDesignTokens'=>$frozenTokens,'missingTargetLinks'=>array_keys($missing),
            'contentPreview'=>array_slice($snippets,0,5),
            'willPublish'=>false
        ];
        return ['candidate'=>$candidate,'binaries'=>$binaries,'summary'=>$summary];
    }

    public function planCrossSiteCollection(
        string $targetId,string $sourceId,string $sourcePageId,string $mode,
        array $sectionIds,?string $targetPageId,?string $newPath,
        int $sourceRevision,int $targetRevision
    ): array {
        return $this->collectionPrepare($targetId,$sourceId,$sourcePageId,$mode,
            $sectionIds,$targetPageId,$newPath,$sourceRevision,$targetRevision)['summary'];
    }

    public function applyCrossSiteCollection(
        string $targetId,string $sourceId,string $sourcePageId,string $mode,
        array $sectionIds,?string $targetPageId,?string $newPath,
        int $sourceRevision,int $targetRevision
    ): array {
        return $this->atomic(function()use($targetId,$sourceId,$sourcePageId,$mode,
            $sectionIds,$targetPageId,$newPath,$sourceRevision,$targetRevision):array {
            if($this->driver==='mysql'){
                $ids=[$sourceId,$targetId];sort($ids,SORT_STRING);
                $lock=$this->db->prepare('SELECT revision FROM stage3_drafts WHERE site_id=? FOR UPDATE');
                foreach($ids as $id){$lock->execute([$id]);$lock->fetchColumn();}
            }
            $prepared=$this->collectionPrepare($targetId,$sourceId,$sourcePageId,$mode,
                $sectionIds,$targetPageId,$newPath,$sourceRevision,$targetRevision);
            $now=$this->now();
            $insert=$this->db->prepare(
                'INSERT INTO stage3_media (site_id,asset_id,mime,sha256,bytes,created_at) VALUES (?,?,?,?,?,?)');
            foreach($prepared['binaries'] as $asset){
                $insert->bindValue(1,$targetId);
                $insert->bindValue(2,$asset['id']);
                $insert->bindValue(3,$asset['mime']);
                $insert->bindValue(4,$asset['sha256']);
                $insert->bindValue(5,$asset['bytes'],PDO::PARAM_LOB);
                $insert->bindValue(6,$now);$insert->execute();
            }
            $site=$prepared['candidate'];
            $this->assertStoredAssets($targetId,$site);
            $next=$targetRevision+1;
            $update=$this->db->prepare(
                'UPDATE stage3_drafts SET revision=?,body=?,updated_at=? WHERE site_id=? AND revision=?');
            $update->execute([$next,self::encode($site),$now,$targetId,$targetRevision]);
            if($update->rowCount()!==1)throw new Conflict('Destination changed; import rolled back');
            $this->saveRevision($targetId,$next,self::encode($site),$now);
            return ['site'=>$site,'revision'=>$next,'import'=>$prepared['summary'],'published'=>false];
        });
    }
}
