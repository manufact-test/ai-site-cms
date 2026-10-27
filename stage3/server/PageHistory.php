<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use PDO;

/**
 * Revision-scoped selective recovery. Source snapshots are immutable and
 * belong to this site. A recovery writes exactly one new draft revision.
 * Site globals, credentials, leads, license and active publications stay put.
 */
trait PageHistory
{
    private function historicalSnapshot(string $siteId,string $kind,int $number): array
    {
        if(!in_array($kind,['revision','release'],true)||$number<1||$number>1000000000)
            throw new \InvalidArgumentException('Invalid history source');
        if($kind==='release')return $this->publishedVersion($siteId,$number);
        $stmt=$this->db->prepare('SELECT body FROM stage3_revisions WHERE site_id=? AND revision=?');
        $stmt->execute([$siteId,$number]);$body=$stmt->fetchColumn();
        if(!is_string($body))throw new NotFound('Unknown saved draft revision');
        return self::decode($body);
    }

    public function historicalCatalog(string $siteId,string $kind,int $number): array
    {
        $this->getDraft($siteId); // The requested site must exist and be accessible.
        $snapshot=$this->validator->validate($this->historicalSnapshot($siteId,$kind,$number));
        if($snapshot['siteId']!==$siteId)throw new Conflict('History belongs to another site');
        return ['historyKind'=>$kind,'historyNumber'=>$number,'pages'=>array_map(
            static fn(array $page):array=>[
                'id'=>$page['id'],'path'=>$page['path'],'title'=>$page['title'],
                'sections'=>array_map(static fn(array $section):array=>[
                    'id'=>$section['id'],'component'=>$section['component']
                ],$page['sections'])
            ],$snapshot['pages'])
        )];
    }

    private static function historicalReferencedMedia(array $sections,?array $seo): array
    {
        $ids=[];
        foreach($sections as $section){
            foreach(array_merge($section['elements'],$section['items']??[]) as $el){
                $id=$el['values']['content.media']??null;
                if(is_string($id)&&$id!=='')$ids[$id]=true;
            }
            $scan=function(array $nodes)use(&$scan,&$ids):void{
                foreach($nodes as $node){
                    foreach(['assetId','posterAssetId'] as $key){
                        $id=$node[$key]??null;
                        if(is_string($id)&&$id!=='')$ids[$id]=true;
                    }
                    if(isset($node['children']))$scan($node['children']);
                }
            };
            if(isset($section['designGraph']))$scan($section['designGraph']['nodes']);
        }
        $og=$seo['ogImage']??null;
        if(is_string($og)&&$og!=='')$ids[$og]=true;
        return array_keys($ids);
    }

    private function prepareHistoricalRecovery(
        string $siteId,string $kind,int $number,string $pageId,
        string $mode,?string $sectionId,int $expectedRevision
    ): array {
        if(!preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$pageId)||
            ($sectionId!==null&&!preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$sectionId))||
            !in_array($mode,['page','section'],true)||
            ($mode==='page'&&$sectionId!==null)||
            ($mode==='section'&&$sectionId===null))
            throw new \InvalidArgumentException('Invalid page/section recovery selection');

        $current=$this->getDraft($siteId);
        if($current['revision']!==$expectedRevision)
            throw new Conflict('Draft changed; check historical recovery again');
        $source=$this->validator->validate($this->historicalSnapshot($siteId,$kind,$number));
        if($source['siteId']!==$siteId)
            throw new Conflict('History belongs to a different site');
        $previous=null;
        foreach($source['pages'] as $p)if($p['id']===$pageId){$previous=$p;break;}
        if($previous===null)throw new NotFound('Page does not exist in selected history');
        $targetIndex=null;
        foreach($current['site']['pages'] as $i=>$p)
            if($p['id']===$pageId)$targetIndex=$i;
        if($mode==='section'&&$targetIndex===null)
            throw new NotFound('Destination page was deleted; recover the entire page first');

        $candidate=$current['site'];
        $currentPage=$targetIndex!==null?$candidate['pages'][$targetIndex]:null;
        $restoredSections=[];$restoredSeo=null;$recreated=false;
        if($mode==='page'){
            $copy=$previous;
            if($currentPage!==null){
                // URL and menu hierarchy can have changed since the snapshot.
                // Preserve current navigation/slug and restore authored content+SEO.
                $copy['path']=$currentPage['path'];
                if(isset($currentPage['navigation']))$copy['navigation']=$currentPage['navigation'];
                else unset($copy['navigation']);
                $candidate['pages'][$targetIndex]=$copy;
            }else{
                if(count($candidate['pages'])>=100)throw new \InvalidArgumentException('Page limit reached');
                foreach($candidate['pages'] as $p)
                    if($p['path']===$copy['path'])throw new Conflict('Historical path is occupied');
                foreach($candidate['redirects']??[] as $redirect)
                    if($redirect['from']===$copy['path'])throw new Conflict('Historical path is a redirect alias');
                // Orphaned navigation parents are not restored silently.
                unset($copy['navigation']['parentId']);
                $candidate['pages'][]=$copy;$targetIndex=count($candidate['pages'])-1;
                $recreated=true;
            }
            $restoredSections=$copy['sections'];
            $restoredSeo=$copy['seo']??null;
        }else{
            $section=null;
            foreach($previous['sections'] as $s)
                if($s['id']===$sectionId){$section=$s;break;}
            if($section===null)throw new NotFound('Section does not exist in selected history');
            $changed=false;
            foreach($candidate['pages'][$targetIndex]['sections'] as $index=>$existing){
                if($existing['id']===$sectionId){
                    $candidate['pages'][$targetIndex]['sections'][$index]=$section;
                    $changed=true;break;
                }
            }
            if(!$changed){
                if(count($candidate['pages'][$targetIndex]['sections'])>=100)
                    throw new \InvalidArgumentException('Page section limit reached');
                $candidate['pages'][$targetIndex]['sections'][]=$section;
            }
            $restoredSections=[$section];
        }

        // Design token names are global and may have been altered after the
        // historical snapshot. Freeze historical graph values to avoid
        // overwriting the current site's global theme and other pages.
        $frozen=0;
        foreach($candidate['pages'][$targetIndex]['sections'] as $idx=>&$section){
            if(!in_array($section['id'],array_column($restoredSections,'id'),true)||
                !isset($section['designGraph']))continue;
            $frozen+=self::crossSiteFreezeGraphTokens($section['designGraph'],$source);
        }
        unset($section);
        $restoreAssets=self::historicalReferencedMedia($restoredSections,$restoredSeo);
        $sourceAssets=[];foreach($source['assets'] as $asset)$sourceAssets[$asset['id']]=$asset;
        $existingAssets=[];foreach($candidate['assets'] as $asset)$existingAssets[$asset['id']]=true;
        $added=[];
        foreach($restoreAssets as $id){
            if(!isset($sourceAssets[$id]))
                throw new \InvalidArgumentException('Historical media reference missing');
            if(isset($existingAssets[$id]))continue;
            $candidate['assets'][]=$sourceAssets[$id];
            $existingAssets[$id]=true;$added[]=$id;
        }
        if(count($candidate['assets'])>300)throw new \InvalidArgumentException('Site media limit reached');
        // Check legacy bytes even when they are not part of the current draft.
        $candidate=$this->validator->validate($candidate);
        $this->assertStoredAssets($siteId,$candidate);
        $changed=[];
        $currentSections=[];foreach($currentPage['sections']??[] as $section)
            $currentSections[$section['id']]=$section;
        $pastSections=[];foreach($previous['sections'] as $section)
            $pastSections[$section['id']]=$section;
        foreach(array_unique(array_merge(array_keys($currentSections),array_keys($pastSections))) as $id){
            $before=$currentSections[$id]??null;$after=$pastSections[$id]??null;
            if($before===$after)continue;
            $changed[]=['sectionId'=>$id,
                'component'=>$after['component']??$before['component'],
                'change'=>$before===null?'restore-deleted':($after===null?'added-after-snapshot':'changed')];
        }
        $resulting=$candidate['pages'][$targetIndex];
        $text=[];
        foreach($restoredSections as $section)
            foreach(array_merge($section['elements'],$section['items']??[]) as $entry){
                $content=$entry['values']['content.text']??null;
                if(is_string($content)&&trim($content)!=='')$text[]=mb_substr(trim($content),0,110);
            }
        return [
            'candidate'=>$candidate,
            'summary'=>[
                'siteId'=>$siteId,'historyKind'=>$kind,'historyNumber'=>$number,
                'currentRevision'=>$expectedRevision,'mode'=>$mode,
                'pageId'=>$pageId,'sectionId'=>$sectionId,'pageTitle'=>$resulting['title'],
                'pagePath'=>$resulting['path'],'pageRecreated'=>$recreated,
                'restoredSections'=>count($restoredSections),
                'sectionChanges'=>$changed,'addedMediaIds'=>$added,
                'frozenDesignTokens'=>$frozen,'seoRestored'=>$mode==='page',
                'contentPreview'=>array_slice($text,0,5),
                'globalThemeChanged'=>false,'published'=>false
            ]
        ];
    }

    public function planHistoricalRecovery(
        string $siteId,string $kind,int $number,string $pageId,
        string $mode,?string $sectionId,int $expectedRevision
    ): array {
        return $this->prepareHistoricalRecovery($siteId,$kind,$number,$pageId,
            $mode,$sectionId,$expectedRevision)['summary'];
    }

    public function applyHistoricalRecovery(
        string $siteId,string $kind,int $number,string $pageId,
        string $mode,?string $sectionId,int $expectedRevision
    ): array {
        return $this->atomic(function()use($siteId,$kind,$number,$pageId,$mode,
            $sectionId,$expectedRevision):array {
            if($this->driver==='mysql'){
                $lock=$this->db->prepare('SELECT revision FROM stage3_drafts WHERE site_id=? FOR UPDATE');
                $lock->execute([$siteId]);$lock->fetchColumn();
            }
            $prepared=$this->prepareHistoricalRecovery($siteId,$kind,$number,$pageId,
                $mode,$sectionId,$expectedRevision);
            $site=$prepared['candidate'];$body=self::encode($site);$now=$this->now();
            $next=$expectedRevision+1;
            $stmt=$this->db->prepare(
                'UPDATE stage3_drafts SET revision=?,body=?,updated_at=? WHERE site_id=? AND revision=?');
            $stmt->execute([$next,$body,$now,$siteId,$expectedRevision]);
            if($stmt->rowCount()!==1)throw new Conflict('Draft changed; recovery rolled back');
            $this->saveRevision($siteId,$next,$body,$now);
            return ['site'=>$site,'revision'=>$next,'recovered'=>$prepared['summary'],
                'published'=>false];
        });
    }
}
