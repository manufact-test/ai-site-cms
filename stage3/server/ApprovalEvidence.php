<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use InvalidArgumentException;
use PDO;
use RuntimeException;

/**
 * Private, immutable client-approval evidence. Never enters a visitor page,
 * draft, or published release; the owner keeps independent local originals.
 * Storage is append-only by sealed v2 handoff SHA256 and site ID.
 */
trait ApprovalEvidence
{
    private const APPROVAL_KINDS = [
        'handoff'=>'handoff','site'=>'site','desktop'=>'desktop',
        'tablet'=>'tablet','mobile'=>'mobile',
        'clientExplanation'=>'clientExplanation','implementationSpec'=>'implementationSpec'
    ];

    private function approvalSchema(): array
    {
        $id=$this->driver==='mysql'?'VARCHAR(80)':'TEXT';
        $hash=$this->driver==='mysql'?'CHAR(64)':'TEXT';
        $blob=$this->driver==='mysql'?'LONGBLOB':'BLOB';
        $tail=$this->driver==='mysql'?' ENGINE=InnoDB':'';
        return ["CREATE TABLE stage3_approval_evidence (site_id $id NOT NULL, package_sha $hash NOT NULL, kind VARCHAR(32) NOT NULL, version VARCHAR(64) NOT NULL, sha256 $hash NOT NULL, bytes $blob NOT NULL, created_at VARCHAR(35) NOT NULL, PRIMARY KEY(site_id,package_sha,kind))$tail"];
    }

    /** Run only as an explicitly opted-in, separate CLI schema upgrade. */
    public function upgradeApprovalSchema(): void
    {
        if (PHP_SAPI!=='cli'||getenv('STAGE3_ALLOW_APPROVAL_UPGRADE')!=='YES')
            throw new RuntimeException('Approval evidence upgrade requires explicit CLI authorization');
        $core=['stage3_users','stage3_drafts','stage3_revisions','stage3_publications',
            'stage3_publication_history','stage3_media','stage3_submissions','stage3_notifications',
            'stage3_section_templates','stage3_access_users','stage3_site_grants','stage3_audit'];
        $optional=['stage3_site_licenses','stage3_video_uploads','stage3_video_chunks',
            'stage3_delivery_settings','stage3_delivery_outbox','stage3_lead_workflow',
            'stage3_lead_events','stage3_site_operations','stage3_site_incidents',
            'stage3_approval_evidence'];
        $tables=$this->driver==='sqlite'
            ?$this->db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN)
            :$this->db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        if (array_diff($core,$tables)||array_diff($tables,[...$core,...$optional]))
            throw new RuntimeException('Dedicated Stage3 database required for approval evidence upgrade');
        if (!in_array('stage3_approval_evidence',$tables,true))
            $this->db->exec($this->approvalSchema()[0]);
    }

    private static function approvalHash(mixed $value): string
    {
        if (!is_string($value)||!preg_match('/^[a-f0-9]{64}$/D',$value))
            throw new InvalidArgumentException('Expected SHA256 digest');
        return $value;
    }

    private static function approvalKind(mixed $value): string
    {
        if (!is_string($value)||!isset(self::APPROVAL_KINDS[$value]))
            throw new InvalidArgumentException('Unknown approval evidence kind');
        return $value;
    }

    private static function approvalHandoff(string $bytes): array
    {
        $handoff=json_decode($bytes,true,64,JSON_THROW_ON_ERROR);
        if (!is_array($handoff)||($handoff['format']??null)!=='manufact-approved-site-handoff-v2'
            ||($handoff['status']??null)!=='approved'
            ||!is_string($handoff['version']??null)
            ||!preg_match('/^[a-zA-Z0-9._-]{1,64}$/D',$handoff['version'])
            ||($handoff['integrity']['algorithm']??null)!=='sha256'
            ||!is_array($handoff['integrity']['files']??null)
            ||!is_array($handoff['files']??null))
            throw new InvalidArgumentException('Only sealed v2 approved packages may be archived');
        $files=$handoff['files'];
        $paths=[];
        foreach (['site','desktop','tablet','mobile','clientExplanation','implementationSpec'] as $kind) {
            $path=$files[$kind]??null;
            if (!is_string($path)||strlen($path)>200||
                !preg_match('~^[a-zA-Z0-9_/-]+\.(?:json|md|txt|png|jpe?g|webp)$~D',$path)
                ||str_contains('/'.$path.'/','/../')||isset($paths[$path]))
                throw new InvalidArgumentException('Unsafe or duplicate approved file path');
            if (in_array($kind,['desktop','tablet','mobile'],true)&&
                !preg_match('/\.(?:png|jpe?g|webp)$/D',$path))
                throw new InvalidArgumentException('Prototype must be an image');
            $paths[$path]=true;
            self::approvalHash($handoff['integrity']['files'][$path]??null);
        }
        return $handoff;
    }

    /** Idempotent same-byte upload, never overwrite an existing evidence file. */
    public function recordApprovalEvidence(string $siteId, mixed $packageSha,
        mixed $kind, mixed $sha256, mixed $base64): array
    {
        $this->getDraft($siteId);
        $packageSha=self::approvalHash($packageSha);
        $kind=self::approvalKind($kind);
        $sha256=self::approvalHash($sha256);
        if (!is_string($base64)||strlen($base64)>11000000||$base64==='')
            throw new InvalidArgumentException('Invalid approval file upload');
        $bytes=base64_decode($base64,true);
        $limit=in_array($kind,['desktop','tablet','mobile'],true)?8000000:
            ($kind==='site'?500000:200000);
        if (!is_string($bytes)||strlen($bytes)<10||strlen($bytes)>$limit||
            !hash_equals($sha256,hash('sha256',$bytes)))
            throw new InvalidArgumentException('Approval evidence size or SHA256 mismatch');
        if ($kind==='handoff') {
            if (!hash_equals($packageSha,$sha256))
                throw new InvalidArgumentException('Package ID must equal sealed handoff SHA256');
            $handoff=self::approvalHandoff($bytes);
        } else {
            $handoffFile=$this->readApprovalEvidence($siteId,$packageSha,'handoff');
            $handoff=self::approvalHandoff($handoffFile['bytes']);
            $path=$handoff['files'][$kind];
            if (!hash_equals(self::approvalHash($handoff['integrity']['files'][$path]??null),$sha256))
                throw new InvalidArgumentException('Approved source file not included in signed-off SHA256 list');
            if (in_array($kind,['desktop','tablet','mobile'],true)) {
                $pixels=@getimagesizefromstring($bytes);
                $expected=strtolower(pathinfo($path,PATHINFO_EXTENSION));
                $mime=$expected==='png'?'image/png':($expected==='webp'?'image/webp':'image/jpeg');
                if (!$pixels||$pixels['mime']!==$mime)
                    throw new InvalidArgumentException('Prototype image bytes or MIME mismatch');
            }
            if ($kind==='site') {
                $site=json_decode($bytes,true,512,JSON_THROW_ON_ERROR);
                if (!is_array($site)||($site['siteId']??null)!==$siteId)
                    throw new InvalidArgumentException('Approval source site does not match selected site');
                $this->validator->validate($site);
            } elseif (in_array($kind,['clientExplanation','implementationSpec'],true)) {
                if (!preg_match('//u',$bytes))
                    throw new InvalidArgumentException('Approval description must be UTF-8');
            }
        }
        $version=$handoff['version'];
        $this->atomic(function () use ($siteId,$packageSha,$kind,$sha256,$bytes,$version): void {
            $check=$this->db->prepare('SELECT sha256,version FROM stage3_approval_evidence WHERE site_id=? AND package_sha=? AND kind=?');
            $check->execute([$siteId,$packageSha,$kind]);
            $old=$check->fetch(PDO::FETCH_ASSOC);
            if ($old!==false) {
                if (!hash_equals((string)$old['sha256'],$sha256)||$old['version']!==$version)
                    throw new Conflict('Archived approval is immutable; new version requires new handoff');
                return;
            }
            $sql='INSERT INTO stage3_approval_evidence (site_id,package_sha,kind,version,sha256,bytes,created_at) VALUES (?,?,?,?,?,?,?)';
            $stmt=$this->db->prepare($sql);
            $stmt->bindValue(1,$siteId);
            $stmt->bindValue(2,$packageSha);
            $stmt->bindValue(3,$kind);
            $stmt->bindValue(4,$version);
            $stmt->bindValue(5,$sha256);
            $stmt->bindValue(6,$bytes,PDO::PARAM_LOB);
            $stmt->bindValue(7,$this->now());
            $stmt->execute();
        });
        return $this->approvalEvidenceIndex($siteId);
    }

    /**
     * Versioned private backup payload. Original bytes and the signed handoff
     * are preserved verbatim, including when a future restore uses a new CMS
     * site ID. Never rewrite the signed site's original siteId.
     */
    private function exportApprovalArchiveRows(string $siteId): array
    {
        $rows=$this->archiveRows('stage3_approval_evidence',$siteId,
            'package_sha,kind,version,sha256,created_at','package_sha,kind');
        $result=[];
        foreach ($rows as $row) {
            $entry=$this->readApprovalEvidence($siteId,$row['package_sha'],$row['kind']);
            $result[]=[
                'packageSha'=>$row['package_sha'],'kind'=>$row['kind'],
                'version'=>$row['version'],'sha256'=>$row['sha256'],
                'base64'=>base64_encode($entry['bytes']),'createdAt'=>$row['created_at']
            ];
        }
        return $result;
    }

    /**
     * Full preflight of every original document, before ANY restore write.
     * External SHA256 alone is insufficient: check the sealed handoff ledger,
     * actual prototype MIME, original site contract and all package versions.
     * Incomplete interrupted imports are allowed, but honestly stay incomplete.
     */
    private function validateApprovalArchiveRows(array $rows,string $sourceSiteId): array
    {
        if(!array_is_list($rows)||count($rows)>140)
            throw new InvalidArgumentException('Archive: invalid approval document count');
        $groups=[];$checked=[];
        foreach ($rows as $row) {
            self::archiveKeys($row,['packageSha','kind','version','sha256','base64','createdAt']);
            $packageSha=self::approvalHash($row['packageSha']);
            $kind=self::approvalKind($row['kind']);
            $sha=self::approvalHash($row['sha256']);
            self::archiveDate($row['createdAt']);
            if(!is_string($row['version'])||
                !preg_match('/^[a-zA-Z0-9._-]{1,64}$/D',$row['version'])||
                !is_string($row['base64'])||strlen($row['base64'])>11000000)
                throw new InvalidArgumentException('Archive: invalid approval metadata');
            $bytes=base64_decode($row['base64'],true);
            $limit=in_array($kind,['desktop','tablet','mobile'],true)?8000000:
                ($kind==='site'?500000:200000);
            if(!is_string($bytes)||strlen($bytes)<10||strlen($bytes)>$limit||
                !hash_equals(hash('sha256',$bytes),$sha))
                throw new InvalidArgumentException('Archive: approval document checksum or size mismatch');
            if(isset($groups[$packageSha][$kind]))
                throw new InvalidArgumentException('Archive: duplicate approval document');
            $groups[$packageSha][$kind]=['row'=>$row,'bytes'=>$bytes];
            $checked[]=$row;
        }
        if(count($groups)>20)throw new InvalidArgumentException('Archive: too many approval packages');
        foreach($groups as $packageSha=>$group) {
            if(!isset($group['handoff']))
                throw new InvalidArgumentException('Archive: missing immutable approval handoff');
            $raw=$group['handoff'];
            if(!hash_equals($packageSha,$raw['row']['sha256']))
                throw new InvalidArgumentException('Archive: approval handoff identity mismatch');
            $handoff=self::approvalHandoff($raw['bytes']);
            foreach($group as $kind=>$entry) {
                if($entry['row']['version']!==$handoff['version'])
                    throw new InvalidArgumentException('Archive: approval handoff version mismatch');
                if($kind==='handoff')continue;
                $sourcePath=$handoff['files'][$kind];
                if(!hash_equals(self::approvalHash(
                    $handoff['integrity']['files'][$sourcePath]??null),$entry['row']['sha256']))
                    throw new InvalidArgumentException('Archive: approval ledger mismatch');
                $bytes=$entry['bytes'];
                if(in_array($kind,['desktop','tablet','mobile'],true)){
                    $info=@getimagesizefromstring($bytes);
                    $ext=strtolower(pathinfo($sourcePath,PATHINFO_EXTENSION));
                    $mime=$ext==='png'?'image/png':($ext==='webp'?'image/webp':'image/jpeg');
                    if(!is_array($info)||$info['mime']!==$mime)
                        throw new InvalidArgumentException('Archive: invalid approved prototype');
                }elseif($kind==='site'){
                    $source=json_decode($bytes,true,512,JSON_THROW_ON_ERROR);
                    if(!is_array($source)||($source['siteId']??null)!==$sourceSiteId)
                        throw new InvalidArgumentException('Archive: original approval site mismatch');
                    $this->validator->validate($source);
                }elseif(!preg_match('//u',$bytes))
                    throw new InvalidArgumentException('Archive: approval text is not UTF-8');
            }
        }
        return $checked;
    }

    public function approvalEvidenceIndex(string $siteId): array
    {
        $this->getDraft($siteId);
        $q=$this->db->prepare('SELECT package_sha,kind,version,sha256,LENGTH(bytes) AS size,created_at FROM stage3_approval_evidence WHERE site_id=? ORDER BY created_at,kind');
        $q->execute([$siteId]);
        $packages=[];
        foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $key=$row['package_sha'];
            if (!isset($packages[$key]))$packages[$key]=['packageSha'=>$key,
                'version'=>$row['version'],'createdAt'=>$row['created_at'],'files'=>[]];
            $packages[$key]['files'][$row['kind']]=['sha256'=>$row['sha256'],'bytes'=>(int)$row['size']];
        }
        foreach ($packages as &$entry)
            $entry['complete']=count($entry['files'])===count(self::APPROVAL_KINDS);
        unset($entry);
        return ['packages'=>array_values($packages)];
    }

    /** Read-only, private owner download, checksum verified on every retrieval. */
    public function readApprovalEvidence(string $siteId,string $packageSha,string $kind): array
    {
        $this->getDraft($siteId);
        self::approvalHash($packageSha);self::approvalKind($kind);
        $q=$this->db->prepare('SELECT bytes,sha256 FROM stage3_approval_evidence WHERE site_id=? AND package_sha=? AND kind=?');
        $q->execute([$siteId,$packageSha,$kind]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if (!$row)throw new NotFound('Approval evidence file does not exist');
        $bytes=is_resource($row['bytes'])?stream_get_contents($row['bytes']):$row['bytes'];
        if (!is_string($bytes)||!hash_equals((string)$row['sha256'],hash('sha256',$bytes)))
            throw new RuntimeException('Archived approval evidence checksum mismatch');
        return ['bytes'=>$bytes,'sha256'=>$row['sha256']];
    }
}
