<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use InvalidArgumentException;
use PDO;

/** Content recovery only: fixed data vocabulary, no SQL, paths, users or executable code. */
trait SiteArchives
{
    public const ARCHIVE_LIMIT = 64000000;

    private static function archiveCheck(bool $condition, string $message): void
    {
        if (!$condition) throw new InvalidArgumentException('Archive: ' . $message);
    }

    private static function archiveKeys(mixed $value, array $keys): void
    {
        self::archiveCheck(is_array($value) && count($value) === count($keys)
            && !array_diff(array_keys($value), $keys), 'unexpected or missing fields');
    }

    private static function archiveNumber(mixed $value): void
    {
        self::archiveCheck(is_int($value) && $value >= 1 && $value <= 1000000000, 'invalid revision/version');
    }

    private static function archiveDate(mixed $value): void
    {
        self::archiveCheck(is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/D', $value) === 1
            && strtotime($value) !== false, 'invalid date');
    }

    private static function archiveText(mixed $value, int $max): void
    {
        self::archiveCheck(is_string($value) && strlen($value) <= $max && preg_match('//u', $value) === 1
            && !preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/', $value), 'invalid text');
    }

    private function archiveRows(string $table, string $id, string $columns, string $order): array
    {
        // All table/column/order arguments are internal constants, never archive input.
        $q = $this->db->prepare("SELECT $columns FROM $table WHERE site_id = ? ORDER BY $order");
        $q->execute([$id]);
        return $q->fetchAll(PDO::FETCH_ASSOC);
    }

    /** A consistent snapshot of ALL persisted content, not just the current editor JSON. */
    public function exportArchive(string $id): array
    {
        return $this->atomic(function () use ($id): array {
            $draft = $this->getDraft($id);
            $revisions = [];
            foreach ($this->archiveRows('stage3_revisions', $id, 'revision,body,created_at', 'revision') as $r) {
                $revisions[] = ['revision' => (int)$r['revision'], 'site' => self::decode($r['body']), 'createdAt' => $r['created_at']];
            }
            $releases = [];
            foreach ($this->archiveRows('stage3_publication_history', $id, 'version,source_revision,body,published_at', 'version') as $r) {
                $releases[] = ['version' => (int)$r['version'], 'sourceRevision' => (int)$r['source_revision'],
                    'site' => self::decode($r['body']), 'publishedAt' => $r['published_at']];
            }
            $media = [];
            foreach ($this->archiveRows('stage3_media', $id, 'asset_id,created_at', 'asset_id') as $r) {
                $image = $this->image($id, $r['asset_id']);
                $media[] = ['id' => $r['asset_id'], 'mime' => $image['mime'], 'sha256' => $image['sha256'],
                    'base64' => base64_encode($image['bytes']), 'createdAt' => $r['created_at']];
            }
            $notices = [];
            foreach ($this->archiveRows('stage3_notifications', $id, 'submission_id,created_at,seen_at', 'submission_id') as $r) {
                $notices[$r['submission_id']] = ['createdAt' => $r['created_at'], 'seenAt' => $r['seen_at']];
            }
            $workflows=[];
            foreach($this->archiveRows('stage3_lead_workflow',$id,
                'submission_id,priority,note,revision,operator,changed_at','submission_id') as $w){
                $workflows[$w['submission_id']]=['priority'=>$w['priority'],'note'=>$w['note'],
                    'revision'=>(int)$w['revision'],'operator'=>$w['operator'],'changedAt'=>$w['changed_at']];
            }
            $events=[];
            foreach($this->archiveRows('stage3_lead_events',$id,
                'event_id,submission_id,operator,from_status,to_status,from_priority,to_priority,note_changed,changed_at',
                'submission_id,changed_at,event_id') as $row){
                $events[$row['submission_id']][]=[
                    'eventId'=>$row['event_id'],'operator'=>$row['operator'],
                    'fromStatus'=>$row['from_status'],'toStatus'=>$row['to_status'],
                    'fromPriority'=>$row['from_priority'],'toPriority'=>$row['to_priority'],
                    'noteChanged'=>(int)$row['note_changed'],'changedAt'=>$row['changed_at']];
            }
            $leads = [];
            foreach ($this->archiveRows('stage3_submissions', $id,
                'submission_id,section_id,source_version,name,email,message,submitted_at,status,extras', 'submission_id') as $r) {
                $r['source_version'] = (int)$r['source_version'];
                $r['extras'] = self::decode($r['extras']);
                $r['notification'] = $notices[$r['submission_id']] ?? null;
                $r['workflow']=$workflows[$r['submission_id']]??null;
                $r['workflowEvents']=$events[$r['submission_id']]??[];
                $leads[] = $r;
            }
            $q = $this->db->prepare('SELECT version FROM stage3_publications WHERE site_id = ?');
            $q->execute([$id]); $active = $q->fetchColumn();
            $payload = ['siteId' => $id, 'createdAt' => $this->now(), 'draft' => $draft,
                'publishedVersion' => $active === false ? null : (int)$active,
                'revisions' => $revisions, 'releases' => $releases, 'media' => $media,
                'templates' => $this->sectionTemplates($id), 'submissions' => $leads,
                'approvalEvidence' => $this->exportApprovalArchiveRows($id)];
            $archive = ['format' => 'manufact-site-backup-v2', 'payload' => $payload,
                'sha256' => hash('sha256', self::encode($payload))];
            self::archiveCheck(strlen(self::encode($archive)) <= self::ARCHIVE_LIMIT - 1024, 'exceeds 64 MB export limit');
            // Export and import use one validation policy. Never emit an unrecoverable success.
            $this->validateArchive($archive, $id);
            return $archive;
        });
    }

    /** Full preflight, before any write. Checks integrity, domain contracts and all references. */
    private function validateArchive(array $archive, string $target): array
    {
        try {
            return $this->validateArchiveData($archive, $target);
        } catch (\TypeError | \ValueError $e) {
            throw new InvalidArgumentException('Archive: invalid data types');
        }
    }

    private function validateArchiveData(array $archive, string $target): array
    {
        self::archiveKeys($archive, ['format', 'payload', 'sha256']);
        self::archiveCheck(in_array($archive['format'],['manufact-site-backup-v1','manufact-site-backup-v2'],true) && is_array($archive['payload'])
            && is_string($archive['sha256']) && hash_equals(hash('sha256', self::encode($archive['payload'])), $archive['sha256']),
            'unsupported format or checksum mismatch');
        self::archiveCheck(strlen(self::encode($archive)) <= self::ARCHIVE_LIMIT - 1024, 'exceeds 64 MB limit');
        self::archiveCheck(preg_match('/^[a-z][a-z0-9-]{2,79}$/D', $target) === 1, 'invalid target site ID');
        $p = $archive['payload'];
        $isV2=$archive['format']==='manufact-site-backup-v2';
        self::archiveKeys($p, $isV2
            ? ['siteId','createdAt','draft','publishedVersion','revisions','releases','media','templates','submissions','approvalEvidence']
            : ['siteId','createdAt','draft','publishedVersion','revisions','releases','media','templates','submissions']);
        self::archiveCheck(is_string($p['siteId']) && preg_match('/^[a-z][a-z0-9-]{2,79}$/D', $p['siteId']) === 1, 'invalid source site');
        self::archiveDate($p['createdAt']);
        if($isV2)$p['approvalEvidence']=$this->validateApprovalArchiveRows(
            $p['approvalEvidence'],$p['siteId']);
        else $p['approvalEvidence']=[];
        foreach (['revisions' => 5000, 'releases' => 5000, 'media' => 3000, 'templates' => 60, 'submissions' => 50000] as $key => $limit) {
            self::archiveCheck(is_array($p[$key]) && array_is_list($p[$key]) && count($p[$key]) <= $limit, 'invalid or oversized ' . $key);
        }
        $media = []; $assetList = [];
        foreach ($p['media'] as $m) {
            self::archiveKeys($m, ['id','mime','sha256','base64','createdAt']);
            self::archiveCheck(is_string($m['id']) && preg_match('/^[a-z][a-z0-9-]{2,79}$/D', $m['id']) === 1
                && !isset($media[$m['id']]) && is_string($m['base64']) && strlen($m['base64']) <= ($m['mime']==='video/mp4'?22369624:1400000), 'invalid/duplicate media');
            $bytes = base64_decode($m['base64'], true);
            self::archiveCheck(is_string($bytes) && $bytes !== '' && strlen($bytes) <= ($m['mime']==='video/mp4'?VideoGuard::MAX_BYTES:self::IMAGE_MAX_BYTES)
                && is_string($m['sha256']) && hash_equals(hash('sha256', $bytes), $m['sha256']), 'image checksum mismatch');
            if($m['mime']==='video/mp4')VideoGuard::validate($bytes,$m['sha256']);
            else{
                $info = @getimagesizefromstring($bytes);
                $types = [IMAGETYPE_PNG => 'image/png', IMAGETYPE_JPEG => 'image/jpeg', IMAGETYPE_WEBP => 'image/webp'];
                self::archiveCheck(is_array($info) && ($types[$info[2]] ?? null) === $m['mime']
                    && $info[0] >= 1 && $info[1] >= 1 && $info[0] <= 4096 && $info[1] <= 4096,
                    'invalid image data');
            }
            self::archiveDate($m['createdAt']);
            $media[$m['id']] = $m;
            $ext = ['image/png' => 'png','image/jpeg' => 'jpg','image/webp' => 'webp','video/mp4'=>'mp4'][$m['mime']];
            $assetList[$m['id']] = ['id' => $m['id'], 'mime' => $m['mime'], 'src' => '/assets/' . $m['id'] . '.' . $ext, 'alt' => ''];
        }
        $validateSite = function (mixed $site) use ($p, $target, $assetList, $media): array {
            $site = $this->validator->validate($site);
            self::archiveCheck($site['siteId'] === $p['siteId'], 'foreign site document');
            $site['siteId'] = $target;
            $site = $this->validator->validate($site); // target cannot collide with any stable ID
            foreach ($site['assets'] as $asset) {
                self::archiveCheck(isset($assetList[$asset['id']])
                    && $asset['mime'] === $assetList[$asset['id']]['mime']
                    && $asset['src'] === $assetList[$asset['id']]['src'], 'missing or inconsistent image');
                foreach ($asset['variants'] ?? [] as $variant) {
                    $v = $assetList[$variant['id']] ?? null;
                    self::archiveCheck(is_array($v) && $v['mime'] === $asset['mime']
                        && $v['src'] === $variant['src']
                        && $media[$variant['id']]['sha256'] === $variant['sha256'],
                        'missing or modified responsive image');
                    $pixels = @getimagesizefromstring(base64_decode($media[$variant['id']]['base64'], true));
                    self::archiveCheck(is_array($pixels) && $pixels[0] === $variant['width']
                        && $pixels[1] === $variant['height'], 'responsive archive dimensions mismatch');
                }
            }
            return $site;
        };
        self::archiveKeys($p['draft'], ['site','revision']);
        self::archiveNumber($p['draft']['revision']);
        $p['draft']['site'] = $validateSite($p['draft']['site']);
        $revisionMap = [];
        foreach ($p['revisions'] as &$r) {
            self::archiveKeys($r, ['revision','site','createdAt']); self::archiveNumber($r['revision']); self::archiveDate($r['createdAt']);
            self::archiveCheck(!isset($revisionMap[$r['revision']]), 'duplicate revision');
            $r['site'] = $validateSite($r['site']); $revisionMap[$r['revision']] = $r['site'];
        }
        unset($r);
        self::archiveCheck($revisionMap && max(array_keys($revisionMap)) === $p['draft']['revision']
            && ($revisionMap[$p['draft']['revision']] ?? null) === $p['draft']['site'], 'current draft/history mismatch');
        $releaseMap = [];
        foreach ($p['releases'] as &$r) {
            self::archiveKeys($r, ['version','sourceRevision','site','publishedAt']);
            self::archiveNumber($r['version']); self::archiveNumber($r['sourceRevision']); self::archiveDate($r['publishedAt']);
            self::archiveCheck(!isset($releaseMap[$r['version']]), 'duplicate release');
            $r['site'] = $validateSite($r['site']);
            self::archiveCheck(($revisionMap[$r['sourceRevision']] ?? null) === $r['site'], 'release/history mismatch');
            $releaseMap[$r['version']] = $r['site'];
        }
        unset($r);
        self::archiveCheck($p['publishedVersion'] === null || (is_int($p['publishedVersion']) && isset($releaseMap[$p['publishedVersion']])), 'unknown active release');
        $templateIds = [];
        foreach ($p['templates'] as $t) {
            self::archiveKeys($t, ['id','title','component','section','createdAt']);
            self::archiveCheck(is_string($t['id']) && preg_match('/^template-[a-f0-9]{18}$/D', $t['id']) === 1
                && !isset($templateIds[$t['id']]), 'invalid/duplicate template');
            $templateIds[$t['id']] = true;
            self::archiveText($t['title'], 140); self::archiveCheck(trim($t['title']) !== '', 'empty template title'); self::archiveDate($t['createdAt']);
            self::archiveCheck(is_array($t['section']) && ($t['section']['component'] ?? null) === $t['component'], 'invalid template component');
            // Validate a preset in its own page with only the image IDs it actually uses.
            $presetAssets = [];
            foreach ($t['section']['elements'] ?? [] as $e) {
                foreach ($e['values'] ?? [] as $v) {
                    if (is_string($v) && isset($assetList[$v])) $presetAssets[$v] = $assetList[$v];
                }
            }
            $walkDesign=function(array $nodes) use (&$walkDesign, &$presetAssets, $assetList): void {
                foreach ($nodes as $node) {
                    if (in_array($node['type']??null,['image','video'],true) && isset($assetList[$node['assetId']??'']))
                        $presetAssets[$node['assetId']]=$assetList[$node['assetId']];
                    if(isset($node['posterAssetId']) && isset($assetList[$node['posterAssetId']]))
                        $presetAssets[$node['posterAssetId']]=$assetList[$node['posterAssetId']];
                    if (isset($node['children'])&&is_array($node['children']))$walkDesign($node['children']);
                }
            };
            $walkDesign($t['section']['designGraph']['nodes']??[]);
            $dummyId = 'backup-' . bin2hex(random_bytes(10));
            $this->validator->validate(['format' => 'manufact-ai-site-v1', 'schemaVersion' => 1,
                'siteId' => $dummyId, 'title' => 'Template', 'assets' => array_values($presetAssets),
                'pages' => [['id' => $dummyId . '-page', 'path' => '/', 'title' => 'Template', 'sections' => [$t['section']]]]]);
        }
        $leadIds = [];
        foreach ($p['submissions'] as $lead) {
            $baseKeys=['submission_id','section_id','source_version','name','email','message',
                'submitted_at','status','extras','notification'];
            if(array_key_exists('workflow',$lead)||array_key_exists('workflowEvents',$lead)){
                // New backups include both fields; legacy v1 archives include neither.
                self::archiveKeys($lead,[...$baseKeys,'workflow','workflowEvents']);
            }else self::archiveKeys($lead,$baseKeys);
            self::archiveCheck(is_string($lead['submission_id']) && preg_match('/^lead-[a-f0-9]{24}$/D', $lead['submission_id']) === 1
                && !isset($leadIds[$lead['submission_id']]), 'invalid/duplicate submission');
            $leadIds[$lead['submission_id']] = true;
            self::archiveNumber($lead['source_version']);
            self::archiveCheck(isset($releaseMap[$lead['source_version']]) && is_string($lead['section_id']), 'unknown lead source');
            $form = null;
            foreach ($releaseMap[$lead['source_version']]['pages'] as $page) {
                foreach ($page['sections'] as $section) {
                    if ($section['id'] === $lead['section_id'] && in_array($section['component'], ['lead-form','lead-form-flex'], true)) $form = $section;
                }
            }
            self::archiveCheck($form !== null, 'lead form is missing');
            foreach (['name' => 120, 'email' => 254, 'message' => 4000] as $field => $max) self::archiveText($lead[$field], $max);
            self::archiveCheck(in_array($lead['status'], ['new','in_progress','reviewed'], true) && is_array($lead['extras']) && count($lead['extras']) <= 3, 'invalid lead data');
            foreach ($lead['extras'] as $key => $extra) {
                self::archiveCheck(is_string($key) && preg_match('/^[a-z0-9_-]{1,80}$/D', $key) === 1, 'invalid extra key');
                self::archiveKeys($extra, ['label','value']); self::archiveText($extra['label'], 200); self::archiveText($extra['value'], 4000);
            }
            self::archiveDate($lead['submitted_at']);
            if(array_key_exists('workflow',$lead)){
                $workflow=$lead['workflow'];
                if($workflow!==null){
                    self::archiveKeys($workflow,['priority','note','revision','operator','changedAt']);
                    self::archiveCheck(in_array($workflow['priority'],['normal','high'],true)
                        &&is_int($workflow['revision'])&&$workflow['revision']>=1
                        &&$workflow['revision']<=1000000000
                        &&is_string($workflow['operator'])
                        &&preg_match('/^[a-z][a-z0-9_-]{2,39}$/D',$workflow['operator'])===1,
                        'invalid private lead workflow');
                    self::archiveText($workflow['note'],2000);self::archiveDate($workflow['changedAt']);
                }
                self::archiveCheck(is_array($lead['workflowEvents'])&&array_is_list($lead['workflowEvents'])
                    &&count($lead['workflowEvents'])<=5000,'invalid lead audit event count');
                if($lead['status']==='in_progress')self::archiveCheck($workflow!==null,'missing in-progress workflow');
                if($workflow===null)self::archiveCheck(count($lead['workflowEvents'])===0,'orphan lead audit events');
                $seenEvents=[];
                foreach($lead['workflowEvents'] as $event){
                    self::archiveKeys($event,['eventId','operator','fromStatus','toStatus','fromPriority',
                        'toPriority','noteChanged','changedAt']);
                    self::archiveCheck(is_string($event['eventId'])
                        &&preg_match('/^event-[a-f0-9]{24}$/D',$event['eventId'])===1
                        &&!isset($seenEvents[$event['eventId']])
                        &&is_string($event['operator'])
                        &&preg_match('/^[a-z][a-z0-9_-]{2,39}$/D',$event['operator'])===1
                        &&in_array($event['fromStatus'],['new','in_progress','reviewed'],true)
                        &&in_array($event['toStatus'],['new','in_progress','reviewed'],true)
                        &&in_array($event['fromPriority'],['normal','high'],true)
                        &&in_array($event['toPriority'],['normal','high'],true)
                        &&in_array($event['noteChanged'],[0,1],true),'invalid lead audit event');
                    $seenEvents[$event['eventId']]=true;
                    self::archiveDate($event['changedAt']);
                }
            }else self::archiveCheck($lead['status']!=='in_progress',
                'legacy archive has unsupported in-progress lead');
            if ($lead['notification'] !== null) {
                self::archiveKeys($lead['notification'], ['createdAt','seenAt']); self::archiveDate($lead['notification']['createdAt']);
                if ($lead['notification']['seenAt'] !== null) self::archiveDate($lead['notification']['seenAt']);
            }
        }
        return $p;
    }

    public function planArchive(array $archive, string $target): array
    {
        $p = $this->validateArchive($archive, $target);
        $q = $this->db->prepare('SELECT site_id FROM stage3_drafts WHERE site_id = ?'); $q->execute([$target]);
        if ($q->fetchColumn() !== false) throw new Conflict('Target site already exists; choose a new ID');
        return ['targetSiteId' => $target, 'sourceSiteId' => $p['siteId'], 'title' => $p['draft']['site']['title'],
            'createdAt' => $p['createdAt'], 'revision' => $p['draft']['revision'], 'pages' => count($p['draft']['site']['pages']),
            'revisions' => count($p['revisions']), 'releases' => count($p['releases']), 'images' => count($p['media']),
            'templates' => count($p['templates']), 'submissions' => count($p['submissions']),
            'approvalFiles' => count($p['approvalEvidence']),
            'approvalPackages' => count(array_unique(array_column($p['approvalEvidence'],'packageSha'))),
            'formerPublishedVersion' => $p['publishedVersion'], 'willPublish' => false];
    }

    /** Restore into a NEW site only. Whole import commits once or rolls back, never deletes anything. */
    public function importArchive(array $archive, string $target): array
    {
        $this->planArchive($archive, $target);
        $p = $this->validateArchive($archive, $target);
        return $this->atomic(function () use ($p, $target): array {
            $q = $this->db->prepare('SELECT site_id FROM stage3_drafts WHERE site_id = ?'); $q->execute([$target]);
            if ($q->fetchColumn() !== false) throw new Conflict('Target site already exists');
            // Reserve identity first; the primary key also prevents concurrent imports.
            $q = $this->db->prepare('INSERT INTO stage3_drafts (site_id,revision,body,updated_at) VALUES (?,?,?,?)');
            $q->execute([$target, $p['draft']['revision'], self::encode($p['draft']['site']), $this->now()]);
            foreach ($p['revisions'] as $r) $this->saveRevision($target, $r['revision'], self::encode($r['site']), $r['createdAt']);
            $q = $this->db->prepare('INSERT INTO stage3_media (site_id,asset_id,mime,sha256,bytes,created_at) VALUES (?,?,?,?,?,?)');
            foreach ($p['media'] as $m) {
                foreach ([$target, $m['id'], $m['mime'], $m['sha256']] as $i => $v) $q->bindValue($i + 1, $v);
                $q->bindValue(5, base64_decode($m['base64'], true), PDO::PARAM_LOB); $q->bindValue(6, $m['createdAt']); $q->execute();
            }
            // Restored package belongs to the NEW site for access isolation,
            // while its signed original handoff/site.json bytes remain intact.
            // This is inside the same transaction as the draft and all media.
            $evidenceInsert=$this->db->prepare('INSERT INTO stage3_approval_evidence (site_id,package_sha,kind,version,sha256,bytes,created_at) VALUES (?,?,?,?,?,?,?)');
            foreach($p['approvalEvidence'] as $proof){
                foreach([$target,$proof['packageSha'],$proof['kind'],$proof['version'],
                    $proof['sha256']] as $i=>$value)$evidenceInsert->bindValue($i+1,$value);
                $evidenceInsert->bindValue(6,base64_decode($proof['base64'],true),PDO::PARAM_LOB);
                $evidenceInsert->bindValue(7,$proof['createdAt']);
                $evidenceInsert->execute();
            }
            $q = $this->db->prepare('INSERT INTO stage3_publication_history (site_id,version,source_revision,body,published_at) VALUES (?,?,?,?,?)');
            foreach ($p['releases'] as $r) $q->execute([$target,$r['version'],$r['sourceRevision'],self::encode($r['site']),$r['publishedAt']]);
            $q = $this->db->prepare('INSERT INTO stage3_section_templates (site_id,template_id,title,component,body,created_at) VALUES (?,?,?,?,?,?)');
            foreach ($p['templates'] as $t) $q->execute([$target,$t['id'],$t['title'],$t['component'],self::encode($t['section']),$t['createdAt']]);
            $leadInsert = $this->db->prepare('INSERT INTO stage3_submissions (submission_id,site_id,section_id,source_version,name,email,message,submitted_at,visitor_hash,status,extras) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
            $noticeInsert = $this->db->prepare('INSERT INTO stage3_notifications (site_id,submission_id,created_at,seen_at) VALUES (?,?,?,?)');
            $workflowInsert=$this->db->prepare('INSERT INTO stage3_lead_workflow (site_id,submission_id,priority,note,revision,operator,changed_at) VALUES (?,?,?,?,?,?,?)');
            $eventInsert=$this->db->prepare('INSERT INTO stage3_lead_events (event_id,site_id,submission_id,operator,from_status,to_status,from_priority,to_priority,note_changed,changed_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
            foreach ($p['submissions'] as $lead) {
                // Lead identity is installation-global: generate a fresh ID for independent copies.
                $id = 'lead-' . bin2hex(random_bytes(12));
                $leadInsert->execute([$id,$target,$lead['section_id'],$lead['source_version'],$lead['name'],$lead['email'],$lead['message'],
                    $lead['submitted_at'],hash('sha256',random_bytes(32)),$lead['status'],self::encode($lead['extras'])]);
                if ($lead['notification'] !== null) $noticeInsert->execute([$target,$id,$lead['notification']['createdAt'],$lead['notification']['seenAt']]);
                $workflow=$lead['workflow']??null;
                if($workflow!==null)$workflowInsert->execute([$target,$id,$workflow['priority'],
                    $workflow['note'],$workflow['revision'],$workflow['operator'],$workflow['changedAt']]);
                foreach($lead['workflowEvents']??[] as $event)$eventInsert->execute([
                    'event-'.bin2hex(random_bytes(12)),$target,$id,$event['operator'],
                    $event['fromStatus'],$event['toStatus'],$event['fromPriority'],$event['toPriority'],
                    $event['noteChanged'],$event['changedAt']]);
            }
            return ['site' => $p['draft']['site'], 'revision' => $p['draft']['revision']];
        });
    }

    public function publicationHistory(string $id): array
    {
        $this->getDraft($id);
        $rows = $this->archiveRows('stage3_publication_history', $id, 'version,source_revision,published_at', 'version DESC');
        return array_map(static fn (array $r): array => ['version' => (int)$r['version'],
            'sourceRevision' => (int)$r['source_revision'], 'publishedAt' => $r['published_at']], $rows);
    }
}
