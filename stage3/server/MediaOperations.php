<?php
declare(strict_types=1);

namespace Manufact\Stage3;

/**
 * Site media maintenance without deleting immutable stored bytes.
 * This covers standard content, repeaters, SEO social images and nested Design
 * Graph image/video/poster nodes in a single all-or-nothing draft revision.
 */
trait MediaOperations
{
    private static function mediaReferences(array $site): array
    {
        $uses=[];
        foreach($site['assets'] as $asset)$uses[$asset['id']]=[];
        $record=static function(mixed $id,array $where)use(&$uses):void{
            if(is_string($id)&&$id!==''&&isset($uses[$id]))$uses[$id][]=$where;
        };
        foreach($site['pages'] as $page){
            $base=['pageId'=>$page['id'],'path'=>$page['path'],'pageTitle'=>$page['title']];
            $record($page['seo']['ogImage']??null,$base+['location'=>'seo.ogImage']);
            foreach($page['sections'] as $section){
                $baseSection=$base+['sectionId'=>$section['id'],'component'=>$section['component']];
                foreach($section['elements'] as $entry)
                    $record($entry['values']['content.media']??null,
                        $baseSection+['location'=>'element','fieldId'=>$entry['id']]);
                foreach($section['items']??[] as $entry)
                    $record($entry['values']['content.media']??null,
                        $baseSection+['location'=>'item','fieldId'=>$entry['id']]);
                $walk=static function(array $nodes)use(&$walk,$record,$baseSection):void{
                    foreach($nodes as $node){
                        foreach(['assetId','posterAssetId'] as $key)
                            $record($node[$key]??null,$baseSection+['location'=>'graph.'.$key,'nodeId'=>$node['id']]);
                        $walk($node['children']??[]);
                    }
                };
                if(isset($section['designGraph']))$walk($section['designGraph']['nodes']);
            }
        }
        return $uses;
    }

    public function mediaAudit(string $siteId): array
    {
        $draft=$this->getDraft($siteId);
        $site=$this->validator->validate($draft['site']);
        $uses=self::mediaReferences($site);
        $out=[];$unused=0;$totalRefs=0;
        foreach($site['assets'] as $asset){
            $refs=$uses[$asset['id']]??[];$count=count($refs);
            $totalRefs+=$count;if(!$count)$unused++;
            $out[]=[
                'id'=>$asset['id'],'alt'=>$asset['alt'],'mime'=>$asset['mime'],
                'variants'=>count($asset['variants']??[]),
                'count'=>$count,'references'=>$refs,'unused'=>$count===0
            ];
        }
        return ['siteId'=>$siteId,'revision'=>$draft['revision'],
            'assets'=>$out,'totalAssets'=>count($out),
            'unusedAssets'=>$unused,'totalReferences'=>$totalRefs];
    }

    private function prepareMediaMaintenance(string $siteId,array $changes,int $expectedRevision): array
    {
        foreach(array_keys($changes) as $key)
            if(!in_array($key,['replacements','altUpdates','pruneUnused'],true))
                throw new \InvalidArgumentException('Unknown media operation');
        $replacements=$changes['replacements']??[];
        $altUpdates=$changes['altUpdates']??[];
        $prune=$changes['pruneUnused']??false;
        if(!is_array($replacements)||!array_is_list($replacements)||
            count($replacements)>20||!is_array($altUpdates)||!array_is_list($altUpdates)||
            count($altUpdates)>30||!is_bool($prune))
            throw new \InvalidArgumentException('Invalid media maintenance batch');
        if(!$replacements&&!$altUpdates&&!$prune)
            throw new \InvalidArgumentException('Choose an actual media maintenance operation');

        $draft=$this->getDraft($siteId);
        if($draft['revision']!==$expectedRevision)
            throw new Conflict('Draft changed; refresh media maintenance plan');
        $candidate=$this->validator->validate($draft['site']);
        $assets=[];foreach($candidate['assets'] as $a)$assets[$a['id']]=$a;
        $map=[];
        foreach($replacements as $change){
            if(!is_array($change)||array_keys($change)!==['from','to']||
                !is_string($change['from'])||!is_string($change['to']))
                throw new \InvalidArgumentException('Invalid media replacement');
            $from=$change['from'];$to=$change['to'];
            if($from===$to||!isset($assets[$from],$assets[$to])||isset($map[$from])||
                $assets[$from]['mime']!==$assets[$to]['mime'])
                throw new \InvalidArgumentException('Replacement requires distinct assets with matching MIME');
            $map[$from]=$to;
        }
        foreach($map as $to)if(isset($map[$to]))
            throw new \InvalidArgumentException('Chained replacements are ambiguous; use separate drafts');
        $alts=[];
        foreach($altUpdates as $change){
            if(!is_array($change)||array_keys($change)!==['assetId','alt']||
                !is_string($change['assetId'])||!is_string($change['alt']))
                throw new \InvalidArgumentException('Invalid media description update');
            $id=$change['assetId'];$alt=$change['alt'];
            if(!isset($assets[$id])||isset($alts[$id])||strlen($alt)>200||
                preg_match('/[\x00-\x1f]/',$alt))
                throw new \InvalidArgumentException('Invalid or duplicate media description');
            $alts[$id]=$alt;
        }
        $before=self::mediaReferences($candidate);
        $counts=[];foreach($map as $from=>$to)$counts[$from]=count($before[$from]);
        foreach($candidate['pages'] as &$page){
            if(isset($map[$page['seo']['ogImage']??'']))
                $page['seo']['ogImage']=$map[$page['seo']['ogImage']];
            foreach($page['sections'] as &$section){
                foreach($section['elements'] as &$el){
                    $id=$el['values']['content.media']??null;
                    if(is_string($id)&&isset($map[$id]))$el['values']['content.media']=$map[$id];
                }unset($el);
                if(isset($section['items']))foreach($section['items'] as &$item){
                    $id=$item['values']['content.media']??null;
                    if(is_string($id)&&isset($map[$id]))$item['values']['content.media']=$map[$id];
                }unset($item);
                if(isset($section['designGraph'])){
                    $walk=static function(array &$nodes)use(&$walk,$map):void{
                        foreach($nodes as &$node){
                            foreach(['assetId','posterAssetId'] as $key){
                                $id=$node[$key]??null;
                                if(is_string($id)&&isset($map[$id]))$node[$key]=$map[$id];
                            }
                            if(isset($node['children']))$walk($node['children']);
                        }unset($node);
                    };
                    $walk($section['designGraph']['nodes']);
                }
            }unset($section);
        }unset($page);
        $described=[];$removed=[];
        foreach($candidate['assets'] as &$asset){
            $id=$asset['id'];
            if(isset($alts[$id])&&$asset['alt']!==$alts[$id]){
                $described[]=['assetId'=>$id,'before'=>$asset['alt'],'after'=>$alts[$id]];
                $asset['alt']=$alts[$id];
            }
        }unset($asset);
        $after=self::mediaReferences($candidate);
        if($prune){
            $remaining=[];
            foreach($candidate['assets'] as $asset){
                if(!count($after[$asset['id']]??[]))$removed[]=$asset['id'];
                else $remaining[]=$asset;
            }
            $candidate['assets']=$remaining;
        }
        $candidate=$this->validator->validate($candidate);
        $this->assertStoredAssets($siteId,$candidate);
        $actualReplacements=[];
        foreach($map as $from=>$to)
            if($counts[$from]>0)$actualReplacements[]=['from'=>$from,'to'=>$to,'references'=>$counts[$from]];
        if(!$actualReplacements&&!$described&&!$removed)
            throw new \InvalidArgumentException('Media maintenance produces no changes');
        return ['candidate'=>$candidate,'summary'=>[
            'siteId'=>$siteId,'revision'=>$expectedRevision,
            'replacements'=>$actualReplacements,
            'altUpdates'=>$described,'removedFromDraft'=>$removed,
            'retainedBinaryFiles'=>true,'published'=>false,
            'oldAssetCount'=>count($draft['site']['assets']),
            'newAssetCount'=>count($candidate['assets']),
            'referencesUpdated'=>array_sum(array_column($actualReplacements,'references'))
        ]];
    }

    public function planMediaMaintenance(string $siteId,array $changes,int $expectedRevision): array
    {
        return $this->prepareMediaMaintenance($siteId,$changes,$expectedRevision)['summary'];
    }

    public function applyMediaMaintenance(string $siteId,array $changes,int $expectedRevision): array
    {
        return $this->atomic(function()use($siteId,$changes,$expectedRevision):array{
            if($this->driver==='mysql'){
                $lock=$this->db->prepare('SELECT revision FROM stage3_drafts WHERE site_id=? FOR UPDATE');
                $lock->execute([$siteId]);$lock->fetchColumn();
            }
            $prepared=$this->prepareMediaMaintenance($siteId,$changes,$expectedRevision);
            $body=self::encode($prepared['candidate']);$now=$this->now();
            $update=$this->db->prepare(
                'UPDATE stage3_drafts SET revision=?,body=?,updated_at=? WHERE site_id=? AND revision=?');
            $update->execute([$expectedRevision+1,$body,$now,$siteId,$expectedRevision]);
            if($update->rowCount()!==1)throw new Conflict('Concurrent draft update; no media changed');
            $this->saveRevision($siteId,$expectedRevision+1,$body,$now);
            return ['site'=>$prepared['candidate'],'revision'=>$expectedRevision+1,
                'maintenance'=>$prepared['summary'],'published'=>false];
        });
    }
}
