<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use InvalidArgumentException;
use PDO;
use RuntimeException;

/**
 * Private site-scoped lead management. Never included in public pages, site
 * exports, publish snapshots or visitor form fields. All revisions are atomic.
 */
trait LeadWorkflow
{
    private function leadWorkflowSchema(): array
    {
        $id=$this->driver==='mysql'?'VARCHAR(80)':'TEXT';
        $text=$this->driver==='mysql'?'TEXT':'TEXT';
        $tail=$this->driver==='mysql'?' ENGINE=InnoDB':'';
        return [
            "CREATE TABLE stage3_lead_workflow (site_id $id NOT NULL,submission_id $id NOT NULL,priority VARCHAR(8) NOT NULL,note $text NOT NULL,revision INTEGER NOT NULL,operator $id NOT NULL,changed_at VARCHAR(35) NOT NULL,PRIMARY KEY(site_id,submission_id))$tail",
            "CREATE TABLE stage3_lead_events (event_id $id PRIMARY KEY,site_id $id NOT NULL,submission_id $id NOT NULL,operator $id NOT NULL,from_status VARCHAR(20) NOT NULL,to_status VARCHAR(20) NOT NULL,from_priority VARCHAR(8) NOT NULL,to_priority VARCHAR(8) NOT NULL,note_changed INTEGER NOT NULL,changed_at VARCHAR(35) NOT NULL)$tail"
        ];
    }

    /** CLI-only, additive and idempotent. Never execute DDL in HTTP requests. */
    public function upgradeLeadWorkflowSchema(): void
    {
        if(PHP_SAPI!=='cli'||getenv('STAGE3_ALLOW_LEAD_WORKFLOW_UPGRADE')!=='YES')
            throw new RuntimeException('Lead workflow upgrade needs explicit isolated CLI authorization');
        $required=['stage3_users','stage3_drafts','stage3_revisions','stage3_publications',
            'stage3_publication_history','stage3_media','stage3_submissions','stage3_notifications',
            'stage3_section_templates','stage3_access_users','stage3_site_grants','stage3_audit',
            'stage3_site_licenses','stage3_delivery_settings','stage3_delivery_outbox'];
        $optional=['stage3_video_uploads','stage3_video_chunks',
            'stage3_lead_workflow','stage3_lead_events'];
        $tables=$this->driver==='sqlite'
            ?$this->db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN)
            :$this->db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        if(array_diff($required,$tables)||array_diff($tables,[...$required,...$optional]))
            throw new RuntimeException('Lead upgrade requires dedicated, upgraded Stage3 database');
        $new=['stage3_lead_workflow','stage3_lead_events'];
        if(in_array($new[0],$tables,true)!==in_array($new[1],$tables,true))
            throw new RuntimeException('Partial lead schema requires manual investigation');
        if(!in_array($new[0],$tables,true))
            foreach($this->leadWorkflowSchema() as $sql)$this->db->exec($sql);
    }

    /** One lead, one site, revision-checked changes. No public side-effects. */
    public function updateLeadWorkflow(
        string $siteId,string $submissionId,string $operator,
        string $status,string $priority,string $note,int $expectedRevision
    ): array {
        if(!preg_match('/^lead-[a-f0-9]{24}$/D',$submissionId)
            ||!in_array($status,['new','in_progress','reviewed'],true)
            ||!in_array($priority,['normal','high'],true)
            ||$expectedRevision<0||$expectedRevision>1000000000
            ||strlen($note)>2000||preg_match('//u',$note)!==1
            ||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/',$note)===1)
            throw new InvalidArgumentException('Invalid lead workflow fields');
        $note=trim($note);
        return $this->atomic(function()use($siteId,$submissionId,$operator,$status,$priority,$note,$expectedRevision):array{
            $this->getDraft($siteId);
            $q=$this->db->prepare('SELECT status FROM stage3_submissions WHERE site_id=? AND submission_id=?');
            $q->execute([$siteId,$submissionId]);$oldStatus=$q->fetchColumn();
            if(!is_string($oldStatus))throw new NotFound('Unknown site lead');
            $w=$this->db->prepare('SELECT priority,note,revision FROM stage3_lead_workflow WHERE site_id=? AND submission_id=?');
            $w->execute([$siteId,$submissionId]);$previous=$w->fetch(PDO::FETCH_ASSOC);
            $revision=$previous?(int)$previous['revision']:0;
            if($revision!==$expectedRevision)throw new Conflict('Lead changed; reload and review again');
            $oldPriority=$previous['priority']??'normal';
            $oldNote=$previous['note']??'';
            if($oldStatus===$status&&$oldPriority===$priority&&$oldNote===$note)
                return ['status'=>$status,'priority'=>$priority,'note'=>$note,
                    'workflow_revision'=>$revision,'changed'=>false];
            $changedAt=$this->now();
            if($previous){
                $u=$this->db->prepare('UPDATE stage3_lead_workflow SET priority=?,note=?,revision=?,operator=?,changed_at=? WHERE site_id=? AND submission_id=? AND revision=?');
                $u->execute([$priority,$note,$revision+1,$operator,$changedAt,$siteId,$submissionId,$revision]);
                if($u->rowCount()!==1)throw new Conflict('Concurrent lead change');
            }else{
                $u=$this->db->prepare('INSERT INTO stage3_lead_workflow (site_id,submission_id,priority,note,revision,operator,changed_at) VALUES (?,?,?,?,?,?,?)');
                $u->execute([$siteId,$submissionId,$priority,$note,1,$operator,$changedAt]);
            }
            if($oldStatus!==$status){
                $update=$this->db->prepare('UPDATE stage3_submissions SET status=? WHERE site_id=? AND submission_id=? AND status=?');
                $update->execute([$status,$siteId,$submissionId,$oldStatus]);
                if($update->rowCount()!==1)throw new Conflict('Concurrent lead status change');
            }
            $event=$this->db->prepare('INSERT INTO stage3_lead_events (event_id,site_id,submission_id,operator,from_status,to_status,from_priority,to_priority,note_changed,changed_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
            $event->execute(['event-'.bin2hex(random_bytes(12)),$siteId,$submissionId,$operator,
                $oldStatus,$status,$oldPriority,$priority,(int)($oldNote!==$note),$changedAt]);
            return ['status'=>$status,'priority'=>$priority,'note'=>$note,
                'workflow_revision'=>$revision+1,'changed'=>true];
        });
    }


    /**
     * Existing legacy mark-reviewed and bulk-review operations must use the
     * same private audit/revision model as explicit workflow editing.
     * Called from within an existing site-scoped SQL transaction.
     */
    private function recordLeadReviewTransition(
        string $siteId,string $submissionId,string $operator,string $fromStatus
    ): void {
        $q=$this->db->prepare('SELECT priority,revision FROM stage3_lead_workflow WHERE site_id=? AND submission_id=?');
        $q->execute([$siteId,$submissionId]);$prior=$q->fetch(PDO::FETCH_ASSOC);
        $priority=$prior['priority']??'normal';
        $version=(int)($prior['revision']??0)+1;
        $at=$this->now();
        if($prior){
            $u=$this->db->prepare('UPDATE stage3_lead_workflow SET revision=?,operator=?,changed_at=? WHERE site_id=? AND submission_id=?');
            $u->execute([$version,$operator,$at,$siteId,$submissionId]);
        }else{
            $u=$this->db->prepare('INSERT INTO stage3_lead_workflow (site_id,submission_id,priority,note,revision,operator,changed_at) VALUES (?,?,?,?,?,?,?)');
            $u->execute([$siteId,$submissionId,'normal','',1,$operator,$at]);
        }
        $event=$this->db->prepare('INSERT INTO stage3_lead_events (event_id,site_id,submission_id,operator,from_status,to_status,from_priority,to_priority,note_changed,changed_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
        $event->execute(['event-'.bin2hex(random_bytes(12)),$siteId,$submissionId,$operator,
            $fromStatus,'reviewed',$priority,$priority,0,$at]);
    }

    public function leadWorkflowHistory(string $siteId,string $submissionId): array
    {
        $this->getDraft($siteId);
        if(!preg_match('/^lead-[a-f0-9]{24}$/D',$submissionId))
            throw new InvalidArgumentException('Invalid lead ID');
        $lead=$this->db->prepare('SELECT 1 FROM stage3_submissions WHERE site_id=? AND submission_id=?');
        $lead->execute([$siteId,$submissionId]);
        if(!$lead->fetchColumn())throw new NotFound('Unknown site lead');
        $events=$this->db->prepare('SELECT event_id,operator,from_status,to_status,from_priority,to_priority,note_changed,changed_at FROM stage3_lead_events WHERE site_id=? AND submission_id=? ORDER BY changed_at DESC,event_id DESC LIMIT 50');
        $events->execute([$siteId,$submissionId]);
        return ['events'=>$events->fetchAll(PDO::FETCH_ASSOC)];
    }
}
