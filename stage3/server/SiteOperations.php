<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use PDO;
use RuntimeException;

/**
 * Owner-only availability controls and privacy-minimal incident journal.
 * A maintenance switch never edits drafts, releases, or form data.
 * Schema changes are explicit CLI-only; web requests never migrate.
 */
trait SiteOperations
{
    private function operationsSchema(): array
    {
        $id=$this->driver==='mysql'?'VARCHAR(80)':'TEXT';
        $number=$this->driver==='mysql'?'BIGINT UNSIGNED':'INTEGER';
        $tail=$this->driver==='mysql'?' ENGINE=InnoDB':'';
        return [
            "CREATE TABLE stage3_site_operations (site_id $id PRIMARY KEY, revision $number NOT NULL, maintenance_enabled INTEGER NOT NULL, message VARCHAR(240) NOT NULL, changed_by VARCHAR(80) NOT NULL, changed_at VARCHAR(35) NOT NULL)$tail",
            "CREATE TABLE stage3_site_incidents (incident_id $id PRIMARY KEY, site_id $id NOT NULL, kind VARCHAR(32) NOT NULL, created_at VARCHAR(35) NOT NULL)$tail"
        ];
    }

    public function upgradeOperationsSchema(): void
    {
        if (PHP_SAPI!=='cli' || getenv('STAGE3_ALLOW_OPERATIONS_UPGRADE')!=='YES') {
            throw new RuntimeException('Operations schema upgrade requires explicit CLI opt-in');
        }
        $core=['stage3_users','stage3_drafts','stage3_revisions','stage3_publications',
            'stage3_publication_history','stage3_media','stage3_submissions','stage3_notifications',
            'stage3_section_templates','stage3_access_users','stage3_site_grants','stage3_audit'];
        $optional=['stage3_site_licenses','stage3_video_uploads','stage3_video_chunks',
            'stage3_delivery_settings','stage3_delivery_outbox','stage3_lead_workflow','stage3_lead_events',
            'stage3_site_operations','stage3_site_incidents','stage3_approval_evidence'];
        $tables=$this->driver==='sqlite'
            ?$this->db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN)
            :$this->db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        if (array_diff($core,$tables)||array_diff($tables,[...$core,...$optional])) {
            throw new RuntimeException('Operations upgrade requires the dedicated, access-upgraded Stage3 database');
        }
        $hasState=in_array('stage3_site_operations',$tables,true);
        $hasIncidents=in_array('stage3_site_incidents',$tables,true);
        if ($hasState!==$hasIncidents) throw new RuntimeException('Partial operations schema requires manual investigation');
        if (!$hasState) foreach ($this->operationsSchema() as $statement) $this->db->exec($statement);
    }

    public function operationsState(string $siteId): array
    {
        $this->getDraft($siteId);
        $stmt=$this->db->prepare('SELECT revision,maintenance_enabled,message,changed_by,changed_at FROM stage3_site_operations WHERE site_id=?');
        $stmt->execute([$siteId]);
        $row=$stmt->fetch(PDO::FETCH_ASSOC);
        return $row===false
            ?['revision'=>0,'enabled'=>false,'message'=>'','changedBy'=>null,'changedAt'=>null]
            :['revision'=>(int)$row['revision'],'enabled'=>(bool)$row['maintenance_enabled'],
              'message'=>$row['message'],'changedBy'=>$row['changed_by'],'changedAt'=>$row['changed_at']];
    }

    public function setMaintenance(string $siteId,int $expectedRevision,bool $enabled,string $message,string $actor): array
    {
        if ($expectedRevision<0 || $expectedRevision>1000000000 ||
            mb_strlen($message,'UTF-8')>240 ||
            preg_match('/[\x00-\x1f]/',$message) || trim($message)==='' && $enabled) {
            throw new \InvalidArgumentException('Maintenance message or revision is invalid');
        }
        return $this->atomic(function () use ($siteId,$expectedRevision,$enabled,$message,$actor): array {
            $current=$this->operationsState($siteId);
            if ($current['revision']!==$expectedRevision) throw new Conflict('Maintenance changed; reload before applying');
            $now=$this->now();
            if ($expectedRevision===0) {
                $s=$this->db->prepare('INSERT INTO stage3_site_operations(site_id,revision,maintenance_enabled,message,changed_by,changed_at) VALUES (?,?,?,?,?,?)');
                $s->execute([$siteId,1,(int)$enabled,trim($message),$actor,$now]);
            } else {
                $s=$this->db->prepare('UPDATE stage3_site_operations SET revision=?, maintenance_enabled=?, message=?, changed_by=?, changed_at=? WHERE site_id=? AND revision=?');
                $s->execute([$expectedRevision+1,(int)$enabled,trim($message),$actor,$now,$siteId,$expectedRevision]);
                if ($s->rowCount()!==1) throw new Conflict('Maintenance revision conflict');
            }
            return $this->operationsState($siteId);
        });
    }

    public function recordIncident(string $siteId,string $kind): void
    {
        if (!in_array($kind,['api_failure','collector_failure','visitor_failure'],true)) return;
        // Never persist exception messages, URLs, user input, IPs or lead data.
        $s=$this->db->prepare('INSERT INTO stage3_site_incidents(incident_id,site_id,kind,created_at) VALUES (?,?,?,?)');
        $s->execute(['incident-'.bin2hex(random_bytes(10)),$siteId,$kind,$this->now()]);
        // A bounded operational log; never part of a client-site export.
        $prune=$this->db->prepare('SELECT incident_id FROM stage3_site_incidents WHERE site_id=? ORDER BY created_at DESC,incident_id DESC LIMIT 100');
        $prune->execute([$siteId]);
        $kept=$prune->fetchAll(PDO::FETCH_COLUMN);
        if (count($kept)===100) {
            $cut=$this->db->prepare('DELETE FROM stage3_site_incidents WHERE site_id=? AND incident_id NOT IN ('.implode(',',array_fill(0,count($kept),'?')).')');
            $cut->execute(array_merge([$siteId],$kept));
        }
    }

    /**
     * Authenticated self-check of the current CMS connection and published
     * release. No outbound network requests, secret exposure or data writes.
     * The browser separately probes the same-origin public release endpoint.
     */
    public function connectionCheck(string $siteId): array
    {
        $draft=$this->getDraft($siteId);
        $this->validator->validate($draft['site']);
        try{$release=$this->published($siteId);}
        catch(NotFound $notPublished){
            return [
                'format'=>'manufact-ai-site-connection-v1','siteId'=>$siteId,
                'draftRevision'=>$draft['revision'],'publishedVersion'=>null,
                'localReady'=>false,'publicProbeUrl'=>null,
                'reason'=>'not_published','publicOriginConfigured'=>
                    PublicRenderer::origin(getenv('STAGE3_PUBLIC_ORIGIN')?:null)!==null
            ];
        }
        $this->validator->validate($release['site']);
        $this->assertStoredAssets($siteId,$release['site']);
        $firstPage=$release['site']['pages'][0]['path'];
        $html=PublicRenderer::html($release['site'],$firstPage,null,null,
            $release['version'],PublicRenderer::origin(getenv('STAGE3_PUBLIC_ORIGIN')?:null));
        if(!is_string($html)||!str_contains($html,'<!doctype html>'))
            throw new RuntimeException('Published page cannot be rendered');
        return [
            'format'=>'manufact-ai-site-connection-v1','siteId'=>$siteId,
            'draftRevision'=>$draft['revision'],'publishedVersion'=>$release['version'],
            'localReady'=>true,'publicProbeUrl'=>'/published/'.$siteId.'/_cms-connect',
            'publishedPageCount'=>count($release['site']['pages']),
            'publishedAssetCount'=>count($release['site']['assets']),
            'reason'=>null,'publicOriginConfigured'=>
                PublicRenderer::origin(getenv('STAGE3_PUBLIC_ORIGIN')?:null)!==null
        ];
    }

    public function siteDiagnostics(string $siteId): array
    {
        $draft=$this->getDraft($siteId);
        try{$release=$this->published($siteId);}catch(NotFound $error){$release=null;}
        $s=$this->db->prepare('SELECT incident_id,kind,created_at FROM stage3_site_incidents WHERE site_id=? ORDER BY created_at DESC,incident_id DESC LIMIT 30');
        $s->execute([$siteId]);
        $incidents=array_map(static fn(array $row):array=>[
            'id'=>$row['incident_id'],'kind'=>$row['kind'],'createdAt'=>$row['created_at']
        ],$s->fetchAll(PDO::FETCH_ASSOC));
        $site=$release['site']??null;
        $forms=0;
        foreach ($site['pages']??[] as $page) foreach ($page['sections'] as $section)
            if (in_array($section['component'],['lead-form','lead-form-flex'],true)) $forms++;
        return [
            'maintenance'=>$this->operationsState($siteId),
            'draftRevision'=>$draft['revision'],
            'publishedVersion'=>$release['version']??null,
            'publishedPages'=>count($site['pages']??[]),
            'publishedForms'=>$forms,
            'publicOriginConfigured'=>\Manufact\Stage3\PublicRenderer::origin(getenv('STAGE3_PUBLIC_ORIGIN')?:null)!==null,
            'collectorConfigured'=>is_string(getenv('STAGE3_FORM_SECRET'))&&strlen((string)getenv('STAGE3_FORM_SECRET'))>=32,
            'incidents'=>$incidents,
            'mode'=>'local-config-and-storage-only'
        ];
    }
}
