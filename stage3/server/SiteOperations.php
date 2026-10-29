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
            'stage3_delivery_settings','stage3_delivery_outbox','stage3_delivery_routes','stage3_lead_workflow','stage3_lead_events',
            'stage3_site_operations','stage3_site_incidents','stage3_approval_evidence','stage3_visual_findings'];
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

    /**
     * Read-only launch preparation for a REAL client form on its current draft
     * AND any still-live published release.  No outbound connection, no fake
     * notification test, no permission to publish and no secret disclosure.
     * Form delivery may be entirely inbox-only by the owner's explicit choice;
     * it is shown honestly as such, never as a delivered message.
     */
    public function launchFormReadiness(string $siteId): array
    {
        $draft=$this->getDraft($siteId);
        try{$published=$this->published($siteId);}catch(NotFound $ignored){$published=null;}
        $settings=$this->deliverySettingsRow($siteId)
            ??['email_enabled'=>0,'email_recipient'=>'','telegram_enabled'=>0,'telegram_chat_id'=>''];
        $transport=[
            'email'=>$this->deliveryTransport('email'),
            'telegram'=>$this->deliveryTransport('telegram')
        ];
        $forms=[];
        foreach(['draft'=>$draft['site'],'published'=>$published['site']??null] as $source=>$site){
            if($site===null)continue;
            foreach($site['pages'] as $page)foreach($page['sections'] as $section){
                if(!in_array($section['component'],['lead-form','lead-form-flex'],true))continue;
                $id=$section['id'];
                if(!isset($forms[$id])){
                    $route=$this->formRouteRow($siteId,$id);
                    $channels=[];
                    foreach(['email','telegram'] as $channel){
                        $destination=$this->deliveryTarget($channel,$settings,$route);
                        $reason=$transport[$channel]['reason'];
                        $channels[$channel]=[
                            'mode'=>$route[$channel.'_mode']??'inherit',
                            'status'=>$destination===null?'disabled':
                                ($destination===''||!$transport[$channel]['ready']
                                    ?'configuration_required':'configured_unverified'),
                            'reason'=>$destination===null?'disabled':
                                ($destination===''?'recipient_missing':
                                    (!$transport[$channel]['ready']?$reason:'live_delivery_not_verified')),
                            'recipientConfigured'=>$destination!==null&&$destination!=='',
                            'transportConfigured'=>$transport[$channel]['ready']
                        ];
                    }
                    $forms[$id]=[
                        'sectionId'=>$id,'sources'=>[],'pages'=>[],
                        'channels'=>$channels,'inboxPersistence'=>'configured_local',
                        'notificationsConfigured'=>false,'externalDeliveryVerified'=>false
                    ];
                }
                if(!in_array($source,$forms[$id]['sources'],true))$forms[$id]['sources'][]=$source;
                $forms[$id]['pages'][]=[
                    'source'=>$source,'pageId'=>$page['id'],
                    'path'=>$page['path'],'title'=>$page['title']
                ];
            }
        }
        // Evidence is per immutable FORM section, not a cross-site total:
        // a single working test form must not make another form seem ready.
        // Provider acceptance means API/mail accepted the operation, NOT
        // delivery to a recipient's inbox or proof of owner acceptance.
        $submissions=[];
        $q=$this->db->prepare('SELECT section_id,COUNT(*) AS amount FROM stage3_submissions WHERE site_id=? GROUP BY section_id');
        $q->execute([$siteId]);
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row)
            $submissions[$row['section_id']]=(int)$row['amount'];
        $deliveryRows=[];
        $q=$this->db->prepare('SELECT s.section_id,o.channel,o.state,COUNT(*) AS amount
            FROM stage3_delivery_outbox o
            JOIN stage3_submissions s ON s.site_id=o.site_id AND s.submission_id=o.submission_id
            WHERE o.site_id=?
            GROUP BY s.section_id,o.channel,o.state');
        $q->execute([$siteId]);
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
            $key=(string)$row['section_id'];
            $channel=(string)$row['channel'];$state=(string)$row['state'];
            if(!isset($deliveryRows[$key]))$deliveryRows[$key]=[];
            if(!isset($deliveryRows[$key][$channel]))$deliveryRows[$key][$channel]=[];
            $deliveryRows[$key][$channel][$state]=(int)$row['amount'];
        }
        $items=[];
        $latestProbeByForm=[];
        foreach($this->deliveryProbeHistory($siteId)['probes'] as $probe){
            $key=$probe['sectionId'].'/'.$probe['channel'];
            if(!isset($latestProbeByForm[$key]))$latestProbeByForm[$key]=$probe;
        }
        foreach($forms as $entry){
            $entry['notificationsConfigured']=in_array('configured_unverified',
                array_column($entry['channels'],'status'),true);
            $entry['requiresConfiguration']=in_array('configuration_required',
                array_column($entry['channels'],'status'),true)
                ||!$entry['notificationsConfigured'];
            $entry['inboxOnly']=!$entry['notificationsConfigured'];
            $entry['savedSubmissionCount']=$submissions[$entry['sectionId']]??0;
            $entry['deliveryEvidence']=$deliveryRows[$entry['sectionId']]??new \stdClass();
            $entry['manualRoutingTests']=[];
            foreach(['email','telegram'] as $channel){
                $key=$entry['sectionId'].'/'.$channel;
                if(isset($latestProbeByForm[$key]))
                    $entry['manualRoutingTests'][]=$latestProbeByForm[$key];
            }
            $entry['externalDeliveryVerified']=false; // even owner-reported probe receipt is not full lead delivery proof
            $items[]=$entry;
        }
        $queue=['accepted'=>0,'failed'=>0,'configuration_required'=>0,'uncertain'=>0,'pending'=>0];
        $q=$this->db->prepare('SELECT state,COUNT(*) AS amount FROM stage3_delivery_outbox WHERE site_id=? GROUP BY state');
        $q->execute([$siteId]);
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
            if(array_key_exists($row['state'],$queue))$queue[$row['state']]=(int)$row['amount'];
        }
        return [
            'format'=>'manufact-launch-form-readiness-v1',
            'siteId'=>$siteId,'draftRevision'=>$draft['revision'],
            'publishedVersion'=>$published['version']??null,
            'collectorSecretConfigured'=>strlen((string)(getenv('STAGE3_FORM_SECRET')?:''))>=32,
            'formCount'=>count($items),'forms'=>$items,
            'formConfigurationRequired'=>count(array_filter($items,
                static fn(array $form):bool=>$form['requiresConfiguration'])),
            'formsWithConfiguredNotifications'=>count(array_filter($items,
                static fn(array $form):bool=>$form['notificationsConfigured'])),
            'queue'=>$queue,
            'liveDeliveryVerified'=>false,
            'ownerAcceptanceConfirmed'=>false,
            'scope'=>'private-configuration-inspection-only',
            'note'=>'Configured transport never proves external delivery; check real inbox and transport separately.'
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
        $incidentSummary=[];
        foreach(['day'=>86400,'week'=>604800] as $period=>$seconds){
            $since=gmdate('Y-m-d\\TH:i:s\\Z',time()-$seconds);
            $q=$this->db->prepare('SELECT kind,COUNT(*) AS total FROM stage3_site_incidents WHERE site_id=? AND created_at>=? GROUP BY kind');
            $q->execute([$siteId,$since]);
            $kinds=['api_failure'=>0,'collector_failure'=>0,'visitor_failure'=>0];
            foreach($q->fetchAll(PDO::FETCH_ASSOC) as $entry)
                if(array_key_exists($entry['kind'],$kinds))$kinds[$entry['kind']]=(int)$entry['total'];
            $incidentSummary[$period]=[
                'total'=>array_sum($kinds),
                'api'=>$kinds['api_failure'],
                'collector'=>$kinds['collector_failure'],
                'visitor'=>$kinds['visitor_failure']
            ];
        }
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
            'incidentSummary'=>$incidentSummary,
            'mode'=>'local-config-and-storage-only'
        ];
    }
}
