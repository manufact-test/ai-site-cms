<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use InvalidArgumentException;
use PDO;
use PDOException;
use RuntimeException;

/**
 * Site-private visual review of a SAVED draft revision. Human observations
 * are not proof of actual client approval, do not mutate published HTML, and
 * are deliberately kept outside the typed site JSON / backup content.
 */
trait VisualReview
{
    private ?bool $visualReviewInstalled=null;
    private ?bool $visualReviewTargetsInstalled=null;

    private function visualReviewSchema(): array
    {
        $id=$this->driver==='mysql'?'VARCHAR(80)':'TEXT';
        $big=$this->driver==='mysql'?'TEXT':'TEXT';
        $tail=$this->driver==='mysql'?' ENGINE=InnoDB':'';
        return ["CREATE TABLE stage3_visual_findings (site_id $id NOT NULL, draft_revision INTEGER NOT NULL, finding_id VARCHAR(40) NOT NULL, page_id $id NOT NULL, page_path VARCHAR(240) NOT NULL, device VARCHAR(10) NOT NULL, scroll_y INTEGER NOT NULL, target_section_id $id NULL, target_node_id $id NULL, note $big NOT NULL, state VARCHAR(12) NOT NULL, version INTEGER NOT NULL, created_by $id NOT NULL, created_at VARCHAR(35) NOT NULL, resolved_by $id NULL, resolved_at VARCHAR(35) NULL, PRIMARY KEY(site_id,finding_id))$tail"];
    }

    private function hasVisualReviewTable(): bool
    {
        if($this->visualReviewInstalled!==null)return $this->visualReviewInstalled;
        if($this->driver==='sqlite'){
            $q=$this->db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='stage3_visual_findings'");
            return $this->visualReviewInstalled=$q->fetchColumn()!==false;
        }
        $q=$this->db->query("SHOW TABLES LIKE 'stage3\\_visual\\_findings'");
        return $this->visualReviewInstalled=$q->fetchColumn()!==false;
    }

    /** Older dedicated installations retain their ordinary Y-only review until
     * the owner explicitly runs the idempotent CLI upgrade. */
    private function hasVisualReviewTargets(): bool
    {
        if($this->visualReviewTargetsInstalled!==null)return $this->visualReviewTargetsInstalled;
        if(!$this->hasVisualReviewTable())return $this->visualReviewTargetsInstalled=false;
        if($this->driver==='sqlite'){
            $columns=$this->db->query('PRAGMA table_info(stage3_visual_findings)')
                ->fetchAll(PDO::FETCH_ASSOC);
            $names=array_column($columns,'name');
        }else{
            $columns=$this->db->query('SHOW COLUMNS FROM stage3_visual_findings')
                ->fetchAll(PDO::FETCH_ASSOC);
            $names=array_column($columns,'Field');
        }
        return $this->visualReviewTargetsInstalled=
            in_array('target_section_id',$names,true)&&in_array('target_node_id',$names,true);
    }

    /** Validate against the actual SAVED authored page, never a supplied DOM selector. */
    private static function visualTargetValid(array $site,string $pageId,?string $sectionId,
        ?string $nodeId): bool
    {
        if($sectionId===null)return $nodeId===null;
        if(!preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$sectionId)||
            ($nodeId!==null&&!preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$nodeId)))return false;
        foreach($site['pages'] as $page){
            if($page['id']!==$pageId)continue;
            foreach($page['sections'] as $section){
                if($section['id']!==$sectionId)continue;
                if($nodeId===null)return true;
                $walk=static function(array $nodes)use(&$walk,$nodeId):bool{
                    foreach($nodes as $node){
                        if($node['id']===$nodeId)return true;
                        if(isset($node['children'])&&$walk($node['children']))return true;
                    }
                    return false;
                };
                return isset($section['designGraph']['nodes'])&&
                    $walk($section['designGraph']['nodes']);
            }
        }
        return false;
    }

    private function visualInsertSql(): string
    {
        $target=$this->hasVisualReviewTargets();
        $columns='site_id,draft_revision,finding_id,page_id,page_path,device,scroll_y'.
            ($target?',target_section_id,target_node_id':'').
            ',note,state,version,created_by,created_at,resolved_by,resolved_at';
        return 'INSERT INTO stage3_visual_findings ('.$columns.') VALUES ('.
            implode(',',array_fill(0,$target?16:14,'?')).')';
    }

    private function visualInsertRow(array $values,?string $sectionId,?string $nodeId): array
    {
        // Caller supplies site, revision, id, page, path, device, Y, then
        // note/state/version/operator/timestamps (14 fields in all).
        if($this->hasVisualReviewTargets())array_splice($values,7,0,[$sectionId,$nodeId]);
        return $values;
    }

    /** Serialize publication and review writes on the SAME saved revision. */
    private function lockVisualDraftRevision(string $siteId,int $revision): void
    {
        $sql='SELECT revision FROM stage3_drafts WHERE site_id=?';
        if($this->driver==='mysql')$sql.=' FOR UPDATE';
        $q=$this->db->prepare($sql);$q->execute([$siteId]);
        $current=$q->fetchColumn();
        if($current===false)throw new NotFound('Unknown visual review site');
        if((int)$current!==$revision)
            throw new Conflict('Draft revision changed; reopen visual review');
    }

    /** Explicitly authorized CLI upgrade for a DEDICATED already-existing CMS database. */
    public function upgradeVisualReviewSchema(): void
    {
        if(PHP_SAPI!=='cli'||getenv('STAGE3_ALLOW_VISUAL_REVIEW_UPGRADE')!=='YES')
            throw new RuntimeException('Visual review upgrade requires explicit CLI authorization');
        $required=['stage3_users','stage3_drafts','stage3_revisions','stage3_publications',
            'stage3_publication_history','stage3_media','stage3_submissions','stage3_notifications',
            'stage3_section_templates','stage3_access_users','stage3_site_grants','stage3_audit'];
        $optional=['stage3_site_licenses','stage3_video_uploads','stage3_video_chunks',
            'stage3_delivery_settings','stage3_delivery_outbox','stage3_delivery_routes',
            'stage3_lead_workflow','stage3_lead_events','stage3_site_operations',
            'stage3_site_incidents','stage3_approval_evidence','stage3_visual_findings'];
        $tables=$this->driver==='sqlite'
            ?$this->db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN)
            :$this->db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        if(array_diff($required,$tables)||array_diff($tables,[...$required,...$optional]))
            throw new RuntimeException('Dedicated Stage3 database required for visual review upgrade');
        if(!in_array('stage3_visual_findings',$tables,true))
            $this->db->exec($this->visualReviewSchema()[0]);
        $this->visualReviewInstalled=true;
        $this->visualReviewTargetsInstalled=null;
        if(!$this->hasVisualReviewTargets()){
            $id=$this->driver==='mysql'?'VARCHAR(80)':'TEXT';
            $existing=$this->driver==='sqlite'
                ?array_column($this->db->query('PRAGMA table_info(stage3_visual_findings)')->fetchAll(PDO::FETCH_ASSOC),'name')
                :array_column($this->db->query('SHOW COLUMNS FROM stage3_visual_findings')->fetchAll(PDO::FETCH_ASSOC),'Field');
            foreach(['target_section_id','target_node_id'] as $column)
                if(!in_array($column,$existing,true))
                    $this->db->exec('ALTER TABLE stage3_visual_findings ADD COLUMN '.$column.' '.$id.' NULL');
            $this->visualReviewTargetsInstalled=null;
            if(!$this->hasVisualReviewTargets())throw new RuntimeException('Review target columns upgrade incomplete');
        }
    }

    private static function visualNoteValid(mixed $note): bool
    {
        if(!is_string($note)||strlen($note)>2000||preg_match('//u',$note)!==1
            ||preg_match('/[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]/',$note))
            return false;
        // UTF-8 byte length is NOT character count. Polish/Russian/Belarusian
        // prose must get the same 500-character limit as English comments.
        $length=preg_match_all('/[\\s\\S]/u',$note);
        return is_int($length)&&$length>=3&&$length<=500;
    }

    private function visualReviewRows(string $siteId,int $revision): array
    {
        $targets=$this->hasVisualReviewTargets();
        $q=$this->db->prepare('SELECT finding_id,page_id,page_path,device,scroll_y,'.
            ($targets?'target_section_id,target_node_id,':'').
            'note,state,version,created_by,created_at,resolved_by,resolved_at FROM stage3_visual_findings WHERE site_id=? AND draft_revision=? ORDER BY created_at,finding_id LIMIT 201');
        $q->execute([$siteId,$revision]);
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        if(count($rows)>200)throw new RuntimeException('Too many visual review notes');
        return array_map(static fn(array $row):array=>[
            'findingId'=>$row['finding_id'],'pageId'=>$row['page_id'],
            'path'=>$row['page_path'],'device'=>$row['device'],'scrollY'=>(int)$row['scroll_y'],
            'targetSectionId'=>$row['target_section_id']??null,
            'targetNodeId'=>$row['target_node_id']??null,
            'note'=>$row['note'],'resolved'=>$row['state']==='resolved',
            'version'=>(int)$row['version'],'createdBy'=>$row['created_by'],
            'createdAt'=>$row['created_at'],'resolvedBy'=>$row['resolved_by'],
            'resolvedAt'=>$row['resolved_at']
        ],$rows);
    }

    public function visualReviewStatus(string $siteId,int $revision): array
    {
        $draft=$this->getDraft($siteId);
        if($revision<1||$revision>$draft['revision'])
            throw new Conflict('Visual review revision does not exist');
        if($revision!==$draft['revision']){
            $q=$this->db->prepare('SELECT revision FROM stage3_revisions WHERE site_id=? AND revision=?');
            $q->execute([$siteId,$revision]);
            if($q->fetchColumn()===false)throw new NotFound('Unknown historical review revision');
        }
        $historical=$revision!==$draft['revision'];
        if(!$this->hasVisualReviewTable())return ['available'=>false,'revision'=>$revision,
            'historical'=>$historical,'findings'=>[],'openCount'=>0,'migrationRequired'=>true,
            'targetBindingsAvailable'=>false];
        $rows=$this->visualReviewRows($siteId,$revision);
        return ['available'=>true,'revision'=>$revision,'historical'=>$historical,
            'targetBindingsAvailable'=>$this->hasVisualReviewTargets(),
            'findings'=>$rows,
            'openCount'=>count(array_filter($rows,static fn(array $row):bool=>!$row['resolved']))];
    }

    /** Bounded read-only review history. Current draft and prior revisions are separate. */
    public function visualReviewHistory(string $siteId): array
    {
        $draft=$this->getDraft($siteId);
        if(!$this->hasVisualReviewTable())return ['available'=>false,
            'currentRevision'=>$draft['revision'],'revisions'=>[]];
        $q=$this->db->prepare("SELECT draft_revision,COUNT(*) AS total,
            SUM(CASE WHEN state='open' THEN 1 ELSE 0 END) AS open_count
            FROM stage3_visual_findings WHERE site_id=?
            GROUP BY draft_revision ORDER BY draft_revision DESC LIMIT 100");
        $q->execute([$siteId]);
        $entries=array_map(static fn(array $row):array=>[
            'revision'=>(int)$row['draft_revision'],'total'=>(int)$row['total'],
            'open'=>(int)$row['open_count']
        ],$q->fetchAll(PDO::FETCH_ASSOC));
        return ['available'=>true,'currentRevision'=>$draft['revision'],'revisions'=>$entries];
    }

    public function visualReviewCreate(string $siteId,int $revision,string $pageId,string $path,
        string $device,int $scrollY,string $note,string $operator,
        ?string $targetSectionId=null,?string $targetNodeId=null): array
    {
        if(!$this->hasVisualReviewTable())throw new RuntimeException('Visual review schema upgrade required');
        if(!in_array($device,['desktop','tablet','mobile'],true)||$scrollY<0||$scrollY>60000
            ||!self::visualNoteValid($note))
            throw new InvalidArgumentException('Invalid visual review note or device');
        $draft=$this->getDraft($siteId);
        if($revision!==$draft['revision'])throw new Conflict('Draft revision changed; reopen visual review');
        $valid=false;
        foreach($draft['site']['pages'] as $page)
            if($page['id']===$pageId&&$page['path']===$path){$valid=true;break;}
        if(!$valid)throw new NotFound('Visual review page is not in current draft');
        if(!self::visualTargetValid($draft['site'],$pageId,$targetSectionId,$targetNodeId))
            throw new InvalidArgumentException('Visual target does not belong to this page');
        if($targetSectionId!==null&&!$this->hasVisualReviewTargets())
            throw new RuntimeException('Explicit visual review target schema upgrade required');
        return $this->atomic(function()use($siteId,$revision,$pageId,$path,$device,$scrollY,$note,$operator,$targetSectionId,$targetNodeId):array{
            $this->lockVisualDraftRevision($siteId,$revision);
            $count=$this->db->prepare('SELECT COUNT(*) FROM stage3_visual_findings WHERE site_id=? AND draft_revision=?');
            $count->execute([$siteId,$revision]);
            if((int)$count->fetchColumn()>=200)
                throw new InvalidArgumentException('Maximum 200 visual findings per saved revision');
            $id='visual-'.bin2hex(random_bytes(12));
            $q=$this->db->prepare($this->visualInsertSql());
            $q->execute($this->visualInsertRow([$siteId,$revision,$id,$pageId,$path,$device,$scrollY,
                $note,'open',1,$operator,$this->now(),null,null],$targetSectionId,$targetNodeId));
            return $this->visualReviewStatus($siteId,$revision);
        });
    }

    /**
     * A downloaded review report can contribute still-open observations.
     * Never import old sign-offs, resolved state, usernames or arbitrary
     * site coordinates. The whole request commits or rejects atomically.
     */
    public function visualReviewImport(string $siteId,int $revision,array $incoming,string $operator): array
    {
        if(!$this->hasVisualReviewTable())throw new RuntimeException('Visual review schema upgrade required');
        if(count($incoming)>200)throw new InvalidArgumentException('Review import limited to 200 findings');
        $draft=$this->getDraft($siteId);
        if($draft['revision']!==$revision)throw new Conflict('Draft revision changed before review import');
        $pages=[];
        foreach($draft['site']['pages'] as $page)$pages[$page['id']]=$page['path'];
        $items=[];
        foreach($incoming as $item){
            if(!is_array($item)||!is_string($item['pageId']??null)
                ||!is_string($item['path']??null)||!is_string($item['device']??null)
                ||!is_string($item['note']??null)||!is_int($item['scrollY']??null)
                ||!isset($pages[$item['pageId']])||$pages[$item['pageId']]!==$item['path']
                ||!in_array($item['device'],['desktop','tablet','mobile'],true)
                ||$item['scrollY']<0||$item['scrollY']>60000
                ||!self::visualNoteValid($item['note']))
                throw new InvalidArgumentException('Invalid imported review finding');
            if((isset($item['targetSectionId'])&&!is_string($item['targetSectionId']))
                ||(isset($item['targetNodeId'])&&!is_string($item['targetNodeId']))
                ||!self::visualTargetValid($draft['site'],$item['pageId'],
                    $item['targetSectionId']??null,$item['targetNodeId']??null))
                throw new InvalidArgumentException('Invalid imported visual target');
            if(($item['targetSectionId']??null)!==null&&!$this->hasVisualReviewTargets())
                throw new RuntimeException('Explicit visual review target schema upgrade required');
            $items[]=$item;
        }
        return $this->atomic(function()use($siteId,$revision,$operator,$items):array{
            $this->lockVisualDraftRevision($siteId,$revision);
            $rows=$this->visualReviewRows($siteId,$revision);
            $keys=[];
            $key=static fn(array $r):string=>hash('sha256',json_encode(
                [$r['pageId'],$r['device'],$r['path'],$r['scrollY'],$r['note'],
                    $r['targetSectionId']??null,$r['targetNodeId']??null],JSON_THROW_ON_ERROR));
            foreach($rows as $row)$keys[$key($row)]=true;
            $insert=$this->db->prepare($this->visualInsertSql());
            $added=0;
            foreach($items as $item){
                $fingerprint=$key($item);
                if(isset($keys[$fingerprint]))continue;
                if(count($keys)>=200)throw new InvalidArgumentException('Maximum 200 review findings');
                $insert->execute($this->visualInsertRow([$siteId,$revision,'visual-'.bin2hex(random_bytes(12)),
                    $item['pageId'],$item['path'],$item['device'],$item['scrollY'],
                    $item['note'],'open',1,$operator,$this->now(),null,null],
                    $item['targetSectionId']??null,$item['targetNodeId']??null));
                $keys[$fingerprint]=true;$added++;
            }
            return [...$this->visualReviewStatus($siteId,$revision),'added'=>$added];
        });
    }

    public function visualReviewResolve(string $siteId,int $revision,string $findingId,
        int $expectedVersion,string $operator): array
    {
        if(!$this->hasVisualReviewTable())throw new RuntimeException('Visual review schema upgrade required');
        if(!preg_match('/^visual-[a-f0-9]{24}$/D',$findingId)
            ||$expectedVersion<1||$expectedVersion>1000000000)
            throw new InvalidArgumentException('Invalid visual finding identity or version');
        if($this->getDraft($siteId)['revision']!==$revision)
            throw new Conflict('Draft revision changed; reopen visual review');
        return $this->atomic(function()use($siteId,$revision,$findingId,$expectedVersion,$operator):array{
            $this->lockVisualDraftRevision($siteId,$revision);
            $q=$this->db->prepare("UPDATE stage3_visual_findings SET state='resolved', version=version+1, resolved_by=?,resolved_at=? WHERE site_id=? AND draft_revision=? AND finding_id=? AND version=? AND state='open'");
            $q->execute([$operator,$this->now(),$siteId,$revision,$findingId,$expectedVersion]);
            if($q->rowCount()!==1)throw new Conflict('Visual finding was resolved or changed; reload before retrying');
            return $this->visualReviewStatus($siteId,$revision);
        });
    }

    /** Edit text/position and, only when explicitly requested, retarget one
     * still-open note within its immutable page/device scope. Version-checked;
     * stale or historical review edits are never applied. */
    public function visualReviewEdit(string $siteId,int $revision,string $findingId,
        int $expectedVersion,string $note,int $scrollY,bool $replaceTarget=false,
        ?string $targetSectionId=null,?string $targetNodeId=null): array
    {
        if(!$this->hasVisualReviewTable())throw new RuntimeException('Visual review schema upgrade required');
        if(!preg_match('/^visual-[a-f0-9]{24}$/D',$findingId)
            ||$expectedVersion<1||$expectedVersion>1000000000
            ||!self::visualNoteValid($note)||$scrollY<0||$scrollY>60000)
            throw new InvalidArgumentException('Invalid visual finding edit');
        $draft=$this->getDraft($siteId);
        if($draft['revision']!==$revision)
            throw new Conflict('Draft revision changed; reopen visual review');
        if($replaceTarget&&!$this->hasVisualReviewTargets())
            throw new RuntimeException('Explicit visual review target schema upgrade required');
        return $this->atomic(function()use($siteId,$revision,$findingId,$expectedVersion,$note,$scrollY,
            $replaceTarget,$targetSectionId,$targetNodeId,$draft):array{
            $this->lockVisualDraftRevision($siteId,$revision);
            if($replaceTarget){
                $source=$this->db->prepare("SELECT page_id FROM stage3_visual_findings WHERE site_id=? AND draft_revision=? AND finding_id=? AND version=? AND state='open'");
                $source->execute([$siteId,$revision,$findingId,$expectedVersion]);
                $page=$source->fetchColumn();
                if($page===false)throw new Conflict('Visual finding was edited or resolved');
                if(!self::visualTargetValid($draft['site'],(string)$page,$targetSectionId,$targetNodeId))
                    throw new InvalidArgumentException('New visual target is outside the original page');
            }
            $sql='UPDATE stage3_visual_findings SET note=?, scroll_y=?'.
                ($replaceTarget?', target_section_id=?, target_node_id=?':'').
                ", version=version+1 WHERE site_id=? AND draft_revision=? AND finding_id=? AND version=? AND state='open'";
            $q=$this->db->prepare($sql);
            $args=[$note,$scrollY];
            if($replaceTarget)array_push($args,$targetSectionId,$targetNodeId);
            $q->execute([...$args,$siteId,$revision,$findingId,$expectedVersion]);
            if($q->rowCount()!==1)
                throw new Conflict('Visual finding was resolved or edited; reload before retrying');
            return $this->visualReviewStatus($siteId,$revision);
        });
    }

    /**
     * After saving a new draft, keep unresolved remarks on pages still
     * present. A cosmetic no-op Save must not bypass the publish gate.
     * Closed notes stay in their original revision; no approval is carried.
     */
    private function carryOpenVisualFindings(string $siteId,int $previous,int $next,array $site): void
    {
        if(!$this->hasVisualReviewTable())return;
        $paths=[];
        foreach($site['pages'] as $page)$paths[$page['id']]=$page['path'];
        $q=$this->db->prepare("SELECT page_id,device,scroll_y,note".
            ($this->hasVisualReviewTargets()?',target_section_id,target_node_id':'').
            " FROM stage3_visual_findings WHERE site_id=? AND draft_revision=? AND state='open' ORDER BY created_at,finding_id LIMIT 201");
        $q->execute([$siteId,$previous]);$old=$q->fetchAll(PDO::FETCH_ASSOC);
        if(count($old)>200)throw new RuntimeException('Too many visual findings to migrate');
        $add=$this->db->prepare($this->visualInsertSql());
        foreach($old as $row){
            if(!isset($paths[$row['page_id']]))continue; // The entire page was removed.
            $section=self::visualTargetValid($site,$row['page_id'],
                $row['target_section_id']??null,$row['target_node_id']??null)?
                ($row['target_section_id']??null):null;
            $node=$section!==null?($row['target_node_id']??null):null;
            $add->execute($this->visualInsertRow([$siteId,$next,'visual-'.bin2hex(random_bytes(12)),
                $row['page_id'],$paths[$row['page_id']],$row['device'],(int)$row['scroll_y'],
                $row['note'],'open',1,'system',$this->now(),null,null],$section,$node));
        }
    }

    /** Portable private backup rows, excluding login tokens and approval badges. */
    private function exportVisualReviewArchiveRows(string $siteId): array
    {
        if(!$this->hasVisualReviewTable())return [];
        $q=$this->db->prepare('SELECT draft_revision,finding_id,page_id,page_path,device,scroll_y,'.
            ($this->hasVisualReviewTargets()?'target_section_id,target_node_id,':'').
            'note,state,version,created_by,created_at,resolved_by,resolved_at FROM stage3_visual_findings WHERE site_id=? ORDER BY draft_revision,finding_id LIMIT 10001');
        $q->execute([$siteId]);$rows=$q->fetchAll(PDO::FETCH_ASSOC);
        if(count($rows)>10000)throw new RuntimeException('Visual review archive exceeds 10000 records');
        return array_map(static fn(array $r):array=>[
            'revision'=>(int)$r['draft_revision'],'findingId'=>$r['finding_id'],
            'pageId'=>$r['page_id'],'path'=>$r['page_path'],'device'=>$r['device'],
            'scrollY'=>(int)$r['scroll_y'],'note'=>$r['note'],
            'targetSectionId'=>$r['target_section_id']??null,
            'targetNodeId'=>$r['target_node_id']??null,
            'resolved'=>$r['state']==='resolved','version'=>(int)$r['version'],
            'createdBy'=>$r['created_by'],'createdAt'=>$r['created_at'],
            'resolvedBy'=>$r['resolved_by'],'resolvedAt'=>$r['resolved_at']
        ],$rows);
    }

    /** Validate ALL source references before any restore writes occur. */
    private function validateVisualReviewArchiveRows(array $rows,array $revisionMap): array
    {
        self::archiveCheck(array_is_list($rows)&&count($rows)<=10000,'invalid visual finding count');
        $ids=[];$perRevision=[];
        foreach($rows as $r){
            $hasTarget=array_key_exists('targetSectionId',$r)||array_key_exists('targetNodeId',$r);
            $fields=['revision','findingId','pageId','path','device','scrollY',
                'note','resolved','version','createdBy','createdAt','resolvedBy','resolvedAt'];
            if($hasTarget)$fields=[...$fields,'targetSectionId','targetNodeId'];
            self::archiveKeys($r,$fields);
            self::archiveNumber($r['revision']);self::archiveNumber($r['version']);
            self::archiveCheck(is_string($r['findingId'])&&preg_match('/^visual-[a-f0-9]{24}$/D',$r['findingId'])===1
                &&!isset($ids[$r['findingId']])&&isset($revisionMap[$r['revision']]),
                'invalid or duplicate visual finding reference');
            $ids[$r['findingId']]=true;
            $perRevision[$r['revision']]=($perRevision[$r['revision']]??0)+1;
            self::archiveCheck($perRevision[$r['revision']]<=200,'too many visual findings per revision');
            $hasPage=false;
            foreach($revisionMap[$r['revision']]['pages'] as $page)
                if($page['id']===$r['pageId']&&$page['path']===$r['path']){$hasPage=true;break;}
            self::archiveCheck($hasPage,'visual finding refers to a different source revision/page');
            if($hasTarget){
                self::archiveCheck(($r['targetSectionId']===null||is_string($r['targetSectionId']))&&
                    ($r['targetNodeId']===null||is_string($r['targetNodeId']))&&
                    self::visualTargetValid(['pages'=>$revisionMap[$r['revision']]['pages']],
                        $r['pageId'],$r['targetSectionId'],$r['targetNodeId']),
                    'visual target does not belong to archived page');
            }
            self::archiveCheck(in_array($r['device'],['desktop','tablet','mobile'],true)
                &&is_int($r['scrollY'])&&$r['scrollY']>=0&&$r['scrollY']<=60000
                &&is_bool($r['resolved'])&&self::visualNoteValid($r['note']),
                'invalid archived visual note');
            foreach(['createdBy','resolvedBy'] as $person){
                $value=$r[$person];
                self::archiveCheck($value===null||(
                    is_string($value)&&preg_match('/^[a-z][a-z0-9_-]{2,39}$/D',$value)===1),
                    'invalid visual operator');
            }
            self::archiveCheck(is_string($r['createdBy'])&&
                ($r['resolved']?($r['resolvedBy']!==null&&$r['resolvedAt']!==null&&$r['version']>=2):
                    ($r['resolvedBy']===null&&$r['resolvedAt']===null&&$r['version']>=1)),
                'invalid visual finding transition');
            self::archiveDate($r['createdAt']);
            if($r['resolvedAt']!==null)self::archiveDate($r['resolvedAt']);
        }
        return $rows;
    }

    private function restoreVisualReviewArchiveRows(string $target,array $rows): void
    {
        if($rows===[])return;
        if(!$this->hasVisualReviewTable())
            throw new RuntimeException('Visual review schema upgrade required to restore findings');
        if(!$this->hasVisualReviewTargets()&&array_filter($rows,static fn(array $r):bool=>
            ($r['targetSectionId']??null)!==null))
            throw new RuntimeException('Visual target schema upgrade required to restore pinned findings');
        $q=$this->db->prepare($this->visualInsertSql());
        foreach($rows as $r)$q->execute($this->visualInsertRow([$target,$r['revision'],$r['findingId'],
            $r['pageId'],$r['path'],$r['device'],$r['scrollY'],$r['note'],
            $r['resolved']?'resolved':'open',$r['version'],$r['createdBy'],$r['createdAt'],
            $r['resolvedBy'],$r['resolvedAt']],
            $r['targetSectionId']??null,$r['targetNodeId']??null));
    }

    /** Fail closed for open recorded notes; migrations remain separately opted in. */
    private function assertNoOpenVisualFindings(string $siteId,int $revision): void
    {
        if(!$this->hasVisualReviewTable())return; // legacy sites require opt-in upgrade before enabling this feature
        $this->lockVisualDraftRevision($siteId,$revision);
        $q=$this->db->prepare("SELECT COUNT(*) FROM stage3_visual_findings WHERE site_id=? AND draft_revision=? AND state='open'");
        $q->execute([$siteId,$revision]);
        if((int)$q->fetchColumn()>0)
            throw new Conflict('Unresolved visual review notes block publishing this draft revision');
    }
}
