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
        $this->db->query('SELECT site_id FROM stage3_drafts LIMIT 1');
        foreach ($this->operationsSchema() as $statement) {
            $this->db->exec(preg_replace('/^CREATE TABLE /','CREATE TABLE IF NOT EXISTS ',$statement));
        }
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
