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

    private function visualReviewSchema(): array
    {
        $id=$this->driver==='mysql'?'VARCHAR(80)':'TEXT';
        $big=$this->driver==='mysql'?'TEXT':'TEXT';
        $tail=$this->driver==='mysql'?' ENGINE=InnoDB':'';
        return ["CREATE TABLE stage3_visual_findings (site_id $id NOT NULL, draft_revision INTEGER NOT NULL, finding_id VARCHAR(40) NOT NULL, page_id $id NOT NULL, page_path VARCHAR(240) NOT NULL, device VARCHAR(10) NOT NULL, scroll_y INTEGER NOT NULL, note $big NOT NULL, state VARCHAR(12) NOT NULL, version INTEGER NOT NULL, created_by $id NOT NULL, created_at VARCHAR(35) NOT NULL, resolved_by $id NULL, resolved_at VARCHAR(35) NULL, PRIMARY KEY(site_id,finding_id))$tail"];
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
        $q=$this->db->prepare('SELECT finding_id,page_id,page_path,device,scroll_y,note,state,version,created_by,created_at,resolved_by,resolved_at FROM stage3_visual_findings WHERE site_id=? AND draft_revision=? ORDER BY created_at,finding_id LIMIT 201');
        $q->execute([$siteId,$revision]);
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        if(count($rows)>200)throw new RuntimeException('Too many visual review notes');
        return array_map(static fn(array $row):array=>[
            'findingId'=>$row['finding_id'],'pageId'=>$row['page_id'],
            'path'=>$row['page_path'],'device'=>$row['device'],'scrollY'=>(int)$row['scroll_y'],
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
            'historical'=>$historical,'findings'=>[],'openCount'=>0,'migrationRequired'=>true];
        $rows=$this->visualReviewRows($siteId,$revision);
        return ['available'=>true,'revision'=>$revision,'historical'=>$historical,
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
        string $device,int $scrollY,string $note,string $operator): array
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
        return $this->atomic(function()use($siteId,$revision,$pageId,$path,$device,$scrollY,$note,$operator):array{
            $this->lockVisualDraftRevision($siteId,$revision);
            $count=$this->db->prepare('SELECT COUNT(*) FROM stage3_visual_findings WHERE site_id=? AND draft_revision=?');
            $count->execute([$siteId,$revision]);
            if((int)$count->fetchColumn()>=200)
                throw new InvalidArgumentException('Maximum 200 visual findings per saved revision');
            $id='visual-'.bin2hex(random_bytes(12));
            $q=$this->db->prepare('INSERT INTO stage3_visual_findings (site_id,draft_revision,finding_id,page_id,page_path,device,scroll_y,note,state,version,created_by,created_at,resolved_by,resolved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)');
            $q->execute([$siteId,$revision,$id,$pageId,$path,$device,$scrollY,$note,'open',1,$operator,$this->now()]);
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
            $items[]=$item;
        }
        return $this->atomic(function()use($siteId,$revision,$operator,$items):array{
            $this->lockVisualDraftRevision($siteId,$revision);
            $rows=$this->visualReviewRows($siteId,$revision);
            $keys=[];
            $key=static fn(array $r):string=>hash('sha256',json_encode(
                [$r['pageId'],$r['device'],$r['path'],$r['scrollY'],$r['note']],JSON_THROW_ON_ERROR));
            foreach($rows as $row)$keys[$key($row)]=true;
            $insert=$this->db->prepare('INSERT INTO stage3_visual_findings (site_id,draft_revision,finding_id,page_id,page_path,device,scroll_y,note,state,version,created_by,created_at,resolved_by,resolved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)');
            $added=0;
            foreach($items as $item){
                $fingerprint=$key($item);
                if(isset($keys[$fingerprint]))continue;
                if(count($keys)>=200)throw new InvalidArgumentException('Maximum 200 review findings');
                $insert->execute([$siteId,$revision,'visual-'.bin2hex(random_bytes(12)),
                    $item['pageId'],$item['path'],$item['device'],$item['scrollY'],
                    $item['note'],'open',1,$operator,$this->now()]);
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

    /** Edit the text/position of one still-open note, without changing its
     * immutable page/device scope. Version-checked exactly like resolution;
     * stale or historical review edits are never applied. */
    public function visualReviewEdit(string $siteId,int $revision,string $findingId,
        int $expectedVersion,string $note,int $scrollY): array
    {
        if(!$this->hasVisualReviewTable())throw new RuntimeException('Visual review schema upgrade required');
        if(!preg_match('/^visual-[a-f0-9]{24}$/D',$findingId)
            ||$expectedVersion<1||$expectedVersion>1000000000
            ||!self::visualNoteValid($note)||$scrollY<0||$scrollY>60000)
            throw new InvalidArgumentException('Invalid visual finding edit');
        if($this->getDraft($siteId)['revision']!==$revision)
            throw new Conflict('Draft revision changed; reopen visual review');
        return $this->atomic(function()use($siteId,$revision,$findingId,$expectedVersion,$note,$scrollY):array{
            $this->lockVisualDraftRevision($siteId,$revision);
            $q=$this->db->prepare("UPDATE stage3_visual_findings SET note=?, scroll_y=?, version=version+1 WHERE site_id=? AND draft_revision=? AND finding_id=? AND version=? AND state='open'");
            $q->execute([$note,$scrollY,$siteId,$revision,$findingId,$expectedVersion]);
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
        $q=$this->db->prepare("SELECT page_id,device,scroll_y,note FROM stage3_visual_findings WHERE site_id=? AND draft_revision=? AND state='open' ORDER BY created_at,finding_id LIMIT 201");
        $q->execute([$siteId,$previous]);$old=$q->fetchAll(PDO::FETCH_ASSOC);
        if(count($old)>200)throw new RuntimeException('Too many visual findings to migrate');
        $add=$this->db->prepare('INSERT INTO stage3_visual_findings (site_id,draft_revision,finding_id,page_id,page_path,device,scroll_y,note,state,version,created_by,created_at,resolved_by,resolved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)');
        foreach($old as $row){
            if(!isset($paths[$row['page_id']]))continue; // The entire page was removed.
            $add->execute([$siteId,$next,'visual-'.bin2hex(random_bytes(12)),
                $row['page_id'],$paths[$row['page_id']],$row['device'],(int)$row['scroll_y'],
                $row['note'],'open',1,'system',$this->now()]);
        }
    }

    /** Portable private backup rows, excluding login tokens and approval badges. */
    private function exportVisualReviewArchiveRows(string $siteId): array
    {
        if(!$this->hasVisualReviewTable())return [];
        $q=$this->db->prepare('SELECT draft_revision,finding_id,page_id,page_path,device,scroll_y,note,state,version,created_by,created_at,resolved_by,resolved_at FROM stage3_visual_findings WHERE site_id=? ORDER BY draft_revision,finding_id LIMIT 10001');
        $q->execute([$siteId]);$rows=$q->fetchAll(PDO::FETCH_ASSOC);
        if(count($rows)>10000)throw new RuntimeException('Visual review archive exceeds 10000 records');
        return array_map(static fn(array $r):array=>[
            'revision'=>(int)$r['draft_revision'],'findingId'=>$r['finding_id'],
            'pageId'=>$r['page_id'],'path'=>$r['page_path'],'device'=>$r['device'],
            'scrollY'=>(int)$r['scroll_y'],'note'=>$r['note'],
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
            self::archiveKeys($r,['revision','findingId','pageId','path','device','scrollY',
                'note','resolved','version','createdBy','createdAt','resolvedBy','resolvedAt']);
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
                    ($r['resolvedBy']===null&&$r['resolvedAt']===null&&$r['version']===1)),
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
        $q=$this->db->prepare('INSERT INTO stage3_visual_findings (site_id,draft_revision,finding_id,page_id,page_path,device,scroll_y,note,state,version,created_by,created_at,resolved_by,resolved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        foreach($rows as $r)$q->execute([$target,$r['revision'],$r['findingId'],
            $r['pageId'],$r['path'],$r['device'],$r['scrollY'],$r['note'],
            $r['resolved']?'resolved':'open',$r['version'],$r['createdBy'],$r['createdAt'],
            $r['resolvedBy'],$r['resolvedAt']]);
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
