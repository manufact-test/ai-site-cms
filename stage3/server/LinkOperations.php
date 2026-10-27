<?php
declare(strict_types=1);
namespace Manufact\Stage3;

/**
 * Link inventory and migration: page routes, manifest links, repeater CTAs,
 * nested design buttons and redirect aliases. All edits are a single draft CAS.
 */
trait LinkOperations
{
    private static function linkSplit(string $href): ?array
    {
        if(!str_starts_with($href,'/')||str_starts_with($href,'//'))return null;
        if(!preg_match('~^([^?#]*)(.*)$~D',$href,$m))return null;
        return [$m[1],$m[2]];
    }

    private static function linkIndex(array $site): array
    {
        $paths=[];foreach($site['pages'] as $p)$paths[$p['path']]=$p;
        $redirects=[];foreach($site['redirects']??[] as $r)$redirects[$r['from']]=$r['to'];
        $refs=[];$state=['ok'=>0,'redirect'=>0,'broken'=>0,'broken-anchor'=>0,'external'=>0];
        $record=static function(string $href,array $details)use(&$refs,&$state,$paths,$redirects):void {
            $parts=self::linkSplit($href);
            if($parts===null){$status='external';$path=null;$target=null;}
            else{
                [$path,$suffix]=$parts;
                $target=$path;
                if(isset($redirects[$path]))$target=$redirects[$path];
                if(!isset($paths[$target]))$status='broken';
                else{
                    $status=$target!==$path?'redirect':'ok';
                    if(preg_match('/#([^?]*)/',$suffix,$m)&&$m[1]!==''){
                        $sectionIds=array_column($paths[$target]['sections'],'id');
                        if(!in_array($m[1],$sectionIds,true))$status='broken-anchor';
                    }
                }
            }
            $state[$status]++;
            $refs[]=$details+['href'=>$href,'path'=>$path,'resolvesTo'=>$target,'status'=>$status];
        };
        foreach($site['pages'] as $page){
            foreach($page['sections'] as $section){
                $where=['pageId'=>$page['id'],'pageTitle'=>$page['title'],
                    'pagePath'=>$page['path'],'sectionId'=>$section['id'],'component'=>$section['component']];
                foreach($section['elements'] as $el){
                    $href=$el['values']['behavior.href']??null;
                    if(is_string($href))$record($href,$where+['kind'=>'element','fieldId'=>$el['id']]);
                }
                foreach($section['items']??[] as $item){
                    $href=$item['values']['behavior.href']??null;
                    if(is_string($href))$record($href,$where+['kind'=>'item','fieldId'=>$item['id']]);
                }
                $walk=static function(array $nodes)use(&$walk,$record,$where):void {
                    foreach($nodes as $node){
                        if($node['type']==='button'&&isset($node['href']))
                            $record($node['href'],$where+['kind'=>'graph-button','nodeId'=>$node['id']]);
                        if(isset($node['children']))$walk($node['children']);
                    }
                };
                if(isset($section['designGraph']))$walk($section['designGraph']['nodes']);
            }
        }
        return ['references'=>$refs,'counts'=>$state,'pageCount'=>count($paths),
            'redirects'=>$site['redirects']??[]];
    }

    public function linkAudit(string $siteId): array
    {
        $draft=$this->getDraft($siteId);
        $site=$this->validator->validate($draft['site']);
        return ['siteId'=>$siteId,'revision'=>$draft['revision']]+self::linkIndex($site);
    }

    private static function linkRewrite(string $href,array $map): string
    {
        $parts=self::linkSplit($href);
        if($parts===null)return $href;
        [$path,$suffix]=$parts;
        return isset($map[$path])?$map[$path].$suffix:$href;
    }

    private function prepareLinkMigration(string $siteId,array $changes,int $expectedRevision): array
    {
        foreach(array_keys($changes) as $k)if(!in_array($k,['renames','repairs','keepRedirects'],true))
            throw new \InvalidArgumentException('Unknown link migration field');
        $renames=$changes['renames']??[];$repairs=$changes['repairs']??[];
        $keepRedirects=$changes['keepRedirects']??true;
        if(!is_array($renames)||!array_is_list($renames)||count($renames)>10||
            !is_array($repairs)||!array_is_list($repairs)||count($repairs)>30||
            !is_bool($keepRedirects)||(!$renames&&!$repairs))
            throw new \InvalidArgumentException('Invalid or empty link migration request');

        $draft=$this->getDraft($siteId);
        if($draft['revision']!==$expectedRevision)
            throw new Conflict('Draft changed; re-check link migration');
        $candidate=$this->validator->validate($draft['site']);
        $original=$candidate;
        $routes=[];$pages=[];
        foreach($candidate['pages'] as $idx=>$p){
            $routes[$p['path']]=$p['id'];$pages[$p['id']]=$idx;
        }
        $aliases=[];foreach($candidate['redirects']??[] as $r)$aliases[$r['from']]=$r['to'];
        $renamed=[];$map=[];$destinations=[];
        foreach($renames as $r){
            if(!is_array($r)||array_keys($r)!==['pageId','newPath']||
                !is_string($r['pageId'])||!is_string($r['newPath'])||
                !isset($pages[$r['pageId']])||isset($renamed[$r['pageId']]))
                throw new \InvalidArgumentException('Invalid or duplicate page rename');
            $page=$candidate['pages'][$pages[$r['pageId']]];
            $old=$page['path'];$new=$r['newPath'];
            if($old==='/'||$old===$new||strlen($new)>240||
                preg_match('~^/(?:[a-z0-9-]+/)*$~D',$new)!==1)
                throw new \InvalidArgumentException('Cannot migrate home page or invalid route');
            if(isset($aliases[$new])||isset($destinations[$new]))
                throw new Conflict('Route reserved or repeated in migration');
            $destinations[$new]=true;
            $renamed[$r['pageId']]=['pageId'=>$r['pageId'],'from'=>$old,'to'=>$new];
            $map[$old]=$new;
        }
        // Swapping route names makes redirect ancestry ambiguous: require a free
        // destination so old canonical URLs can be retained consistently.
        foreach($renamed as $r){
            if(isset($routes[$r['to']]))throw new Conflict('Destination route already exists');
            $candidate['pages'][$pages[$r['pageId']]]['path']=$r['to'];
        }
        $oldAliases=$candidate['redirects']??[];
        $newAliases=[];
        foreach($oldAliases as $r){
            $r['to']=$map[$r['to']]??$r['to'];
            $newAliases[]=$r;
        }
        if($keepRedirects){
            foreach($renamed as $r){
                if(isset($aliases[$r['from']]))
                    throw new Conflict('Original route is already a redirect');
                $newAliases[]=['from'=>$r['from'],'to'=>$r['to']];
            }
        }
        if(count($newAliases)>60)throw new \InvalidArgumentException('Redirect limit reached');
        $candidate['redirects']=$newAliases;
        $active=[];foreach($candidate['pages'] as $p)$active[$p['path']]=true;
        foreach($repairs as $repair){
            if(!is_array($repair)||array_keys($repair)!==['from','to']||
                !is_string($repair['from'])||!is_string($repair['to']))
                throw new \InvalidArgumentException('Invalid link repair');
            $from=$repair['from'];$to=$repair['to'];
            if($from===$to||isset($map[$from])||
                preg_match('~^/(?:[a-z0-9-]+/)*$~D',$from)!==1||
                !isset($active[$to])||strlen($to)>240)
                throw new \InvalidArgumentException('Repair must map a distinct route to a current page');
            $map[$from]=$to;
        }
        foreach($map as $key=>$to)if(isset($map[$to]))
            throw new \InvalidArgumentException('Chained link rules not allowed');
        $rewrites=[];$record=static function(string $before,string $after,array $where)use(&$rewrites):void{
            if($before!==$after)$rewrites[]=$where+['before'=>$before,'after'=>$after];
        };
        foreach($candidate['pages'] as &$page){
            foreach($page['sections'] as &$section){
                $where=['pageId'=>$page['id'],'sectionId'=>$section['id']];
                foreach($section['elements'] as &$entry){
                    $before=$entry['values']['behavior.href']??null;
                    if(!is_string($before))continue;
                    $after=self::linkRewrite($before,$map);
                    $record($before,$after,$where+['kind'=>'element','id'=>$entry['id']]);
                    $entry['values']['behavior.href']=$after;
                }unset($entry);
                if(isset($section['items']))foreach($section['items'] as &$entry){
                    $before=$entry['values']['behavior.href']??null;
                    if(!is_string($before))continue;
                    $after=self::linkRewrite($before,$map);
                    $record($before,$after,$where+['kind'=>'item','id'=>$entry['id']]);
                    $entry['values']['behavior.href']=$after;
                }unset($entry);
                if(isset($section['designGraph'])){
                    $walk=static function(array &$nodes)use(&$walk,$map,$record,$where):void{
                        foreach($nodes as &$node){
                            if($node['type']==='button'&&isset($node['href'])){
                                $before=$node['href'];$after=self::linkRewrite($before,$map);
                                $record($before,$after,$where+['kind'=>'graph-button','id'=>$node['id']]);
                                $node['href']=$after;
                            }
                            if(isset($node['children']))$walk($node['children']);
                        }unset($node);
                    };
                    $walk($section['designGraph']['nodes']);
                }
            }unset($section);
        }unset($page);
        if(!$renamed&&!$rewrites)throw new \InvalidArgumentException('No internal links match these repair rules');
        $candidate=$this->validator->validate($candidate);
        $after=self::linkIndex($candidate);$before=self::linkIndex($original);
        if($after['counts']['broken']>$before['counts']['broken']||
            $after['counts']['broken-anchor']>$before['counts']['broken-anchor'])
            throw new \InvalidArgumentException('Migration introduces broken internal routes or anchors');
        // Guarantee that rewritten links target an existing page, not a
        // redirect alias, and fragment anchors remain present on that page.
        foreach($after['references'] as $r){
            if($r['status']==='broken'||$r['status']==='broken-anchor'){
                foreach($rewrites as $rewrite)if($rewrite['after']===$r['href'])
                    throw new \InvalidArgumentException('Rewritten link points to an invalid anchor');
            }
        }
        return ['site'=>$candidate,'summary'=>[
            'siteId'=>$siteId,'revision'=>$expectedRevision,'renames'=>array_values($renamed),
            'repairs'=>count($repairs),'redirectsAdded'=>$keepRedirects?count($renamed):0,
            'linksRewritten'=>count($rewrites),'changes'=>array_slice($rewrites,0,60),
            'remainingBroken'=>$after['counts']['broken']+$after['counts']['broken-anchor'],
            'previousBroken'=>$before['counts']['broken']+$before['counts']['broken-anchor'],
            'redirectsNow'=>count($candidate['redirects']),'published'=>false
        ]];
    }

    public function planLinkMigration(string $siteId,array $changes,int $expectedRevision): array
    {
        return $this->prepareLinkMigration($siteId,$changes,$expectedRevision)['summary'];
    }
    public function applyLinkMigration(string $siteId,array $changes,int $expectedRevision): array
    {
        return $this->atomic(function()use($siteId,$changes,$expectedRevision):array{
            if($this->driver==='mysql'){
                $stmt=$this->db->prepare('SELECT revision FROM stage3_drafts WHERE site_id=? FOR UPDATE');
                $stmt->execute([$siteId]);$stmt->fetchColumn();
            }
            $prepared=$this->prepareLinkMigration($siteId,$changes,$expectedRevision);
            $body=self::encode($prepared['site']);$now=$this->now();
            $update=$this->db->prepare(
                'UPDATE stage3_drafts SET revision=?,body=?,updated_at=? WHERE site_id=? AND revision=?');
            $update->execute([$expectedRevision+1,$body,$now,$siteId,$expectedRevision]);
            if($update->rowCount()!==1)throw new Conflict('Concurrent draft change');
            $this->saveRevision($siteId,$expectedRevision+1,$body,$now);
            return ['site'=>$prepared['site'],'revision'=>$expectedRevision+1,
                'migration'=>$prepared['summary'],'published'=>false];
        });
    }
}
