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
        if($revision!==$draft['revision'])throw new Conflict('Visual review belongs to a different saved draft revision');
        if(!$this->hasVisualReviewTable())return ['available'=>false,'revision'=>$revision,
            'findings'=>[],'openCount'=>0,'migrationRequired'=>true];
        $rows=$this->visualReviewRows($siteId,$revision);
        return ['available'=>true,'revision'=>$revision,'findings'=>$rows,
            'openCount'=>count(array_filter($rows,static fn(array $row):bool=>!$row['resolved']))];
    }

    public function visualReviewCreate(string $siteId,int $revision,string $pageId,string $path,
        string $device,int $scrollY,string $note,string $operator): array
    {
        if(!$this->hasVisualReviewTable())throw new RuntimeException('Visual review schema upgrade required');
        if(!in_array($device,['desktop','tablet','mobile'],true)||$scrollY<0||$scrollY>60000
            ||strlen($note)<3||strlen($note)>500||preg_match('//u',$note)!==1
            ||preg_match('/[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]/',$note))
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
                ||strlen($item['note'])<3||strlen($item['note'])>500
                ||preg_match('//u',$item['note'])!==1
                ||preg_match('/[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f\\x7f]/',$item['note']))
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
