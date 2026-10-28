<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use InvalidArgumentException;
use PDO;
use RuntimeException;

/**
 * Bounded resumable MP4 staging. Site + authenticated actor own each upload.
 * All chunks remain private and never appear in published releases.
 * Finalize is one database transaction that verifies whole-file SHA256,
 * validates MP4 and atomically records an immutable asset + new draft revision.
 */
trait VideoUploads
{
    private const VIDEO_CHUNK_BYTES = 524288;
    private const VIDEO_UPLOAD_TTL = 86400;

    private function videoUploadSchema(): array
    {
        $id=$this->driver==='mysql'?'VARCHAR(80)':'TEXT';
        $tail=$this->driver==='mysql'?' ENGINE=InnoDB':'';
        $blob=$this->driver==='mysql'?'MEDIUMBLOB':'BLOB';
        return [
            "CREATE TABLE stage3_video_uploads (site_id $id NOT NULL,upload_id $id NOT NULL, actor $id NOT NULL, expected_revision INTEGER NOT NULL, label VARCHAR(200) NOT NULL, sha256 CHAR(64) NOT NULL, total_bytes INTEGER NOT NULL, total_chunks INTEGER NOT NULL, created_at VARCHAR(35) NOT NULL, PRIMARY KEY(site_id,upload_id))$tail",
            "CREATE TABLE stage3_video_chunks (site_id $id NOT NULL,upload_id $id NOT NULL, part_index INTEGER NOT NULL,sha256 CHAR(64) NOT NULL, bytes $blob NOT NULL, PRIMARY KEY(site_id,upload_id,part_index))$tail"
        ];
    }

    /** Explicit CLI-only upgrade, idempotent; never run DDL in visitor/API requests. */
    public function upgradeVideoUploadSchema(): void
    {
        if(PHP_SAPI!=='cli'||getenv('STAGE3_ALLOW_VIDEO_UPGRADE')!=='YES')
            throw new RuntimeException('Video staging upgrade needs explicit isolated CLI authorization');
        $expected=['stage3_users','stage3_drafts','stage3_revisions','stage3_publications',
            'stage3_publication_history','stage3_media','stage3_submissions','stage3_notifications',
            'stage3_section_templates','stage3_access_users','stage3_site_grants','stage3_audit',
            'stage3_site_licenses'];
        $new=['stage3_video_uploads','stage3_video_chunks'];
        $tables=$this->driver==='sqlite'
            ?$this->db->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN)
            :$this->db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        if(array_diff($expected,$tables)||array_diff($tables,[...$expected,...$new,'stage3_delivery_settings','stage3_delivery_outbox','stage3_delivery_routes','stage3_lead_workflow','stage3_lead_events','stage3_site_operations','stage3_site_incidents','stage3_approval_evidence']))
            throw new RuntimeException('Video upgrade requires a dedicated, fully upgraded Stage 3 database');
        if(in_array($new[0],$tables,true)!==in_array($new[1],$tables,true))
            throw new RuntimeException('Partial video staging schema requires manual investigation');
        if(!in_array($new[0],$tables,true))
            foreach($this->videoUploadSchema() as $sql)$this->db->exec($sql);
    }

    private function findVideoUpload(string $siteId,string $actor,string $uploadId): array
    {
        if(!preg_match('/^video-[a-f0-9]{20}$/D',$uploadId))
            throw new InvalidArgumentException('Invalid video session');
        $q=$this->db->prepare('SELECT * FROM stage3_video_uploads WHERE site_id=? AND upload_id=? AND actor=?');
        $q->execute([$siteId,$uploadId,$actor]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!$row)throw new NotFound('Unknown or inaccessible video upload');
        if(strtotime((string)$row['created_at'])<time()-self::VIDEO_UPLOAD_TTL)
            throw new Conflict('Video upload expired: start a new upload');
        return $row;
    }

    public function beginVideoUpload(string $siteId,string $actor,int $revision,
        string $label,int $bytes,string $sha256,int $chunks): array
    {
        if(!preg_match('/^[a-z][a-z0-9_-]{2,39}$/D',$actor)
            ||trim($label)===''||strlen($label)>200||preg_match('/[\x00-\x1f]/',$label)
            ||!preg_match('/^[a-f0-9]{64}$/D',$sha256)
            ||$bytes<100||$bytes>VideoGuard::MAX_BYTES
            ||$chunks!==intdiv($bytes+self::VIDEO_CHUNK_BYTES-1,self::VIDEO_CHUNK_BYTES))
            throw new InvalidArgumentException('Invalid upload size, digest or description');
        return $this->atomic(function()use($siteId,$actor,$revision,$label,$bytes,$sha256,$chunks):array {
            if($this->getDraft($siteId)['revision']!==$revision)
                throw new Conflict('Stale draft; save or refresh before video upload');
            $cutoff=gmdate('Y-m-d\TH:i:s\Z',time()-self::VIDEO_UPLOAD_TTL);
            $expired=$this->db->prepare('SELECT upload_id FROM stage3_video_uploads WHERE site_id=? AND created_at<?');
            $expired->execute([$siteId,$cutoff]);
            $ids=$expired->fetchAll(PDO::FETCH_COLUMN);
            $delPart=$this->db->prepare('DELETE FROM stage3_video_chunks WHERE site_id=? AND upload_id=?');
            $delSession=$this->db->prepare('DELETE FROM stage3_video_uploads WHERE site_id=? AND upload_id=?');
            foreach($ids as $old){$delPart->execute([$siteId,$old]);$delSession->execute([$siteId,$old]);}
            $count=$this->db->prepare('SELECT COUNT(*) FROM stage3_video_uploads WHERE site_id=?');
            $count->execute([$siteId]);
            if((int)$count->fetchColumn()>=3)
                throw new Conflict('Three concurrent video uploads per site maximum');
            $id='video-'.bin2hex(random_bytes(10));
            $q=$this->db->prepare('INSERT INTO stage3_video_uploads (site_id,upload_id,actor,expected_revision,label,sha256,total_bytes,total_chunks,created_at) VALUES (?,?,?,?,?,?,?,?,?)');
            $q->execute([$siteId,$id,$actor,$revision,$label,$sha256,$bytes,$chunks,$this->now()]);
            return ['uploadId'=>$id,'chunkBytes'=>self::VIDEO_CHUNK_BYTES,'totalChunks'=>$chunks,'expiresIn'=>self::VIDEO_UPLOAD_TTL];
        });
    }

    public function appendVideoChunk(string $siteId,string $actor,string $uploadId,int $index,
        string $base64,string $sha256): array
    {
        if(!preg_match('/^[a-f0-9]{64}$/D',$sha256)
            ||!preg_match('~^[A-Za-z0-9+/]+={0,2}$~D',$base64)
            ||strlen($base64)>self::VIDEO_CHUNK_BYTES*4/3+4)
            throw new InvalidArgumentException('Invalid chunk encoding or checksum');
        $bytes=base64_decode($base64,true);
        if(!is_string($bytes)||!hash_equals($sha256,hash('sha256',$bytes)))
            throw new InvalidArgumentException('Chunk checksum mismatch');
        return $this->atomic(function()use($siteId,$actor,$uploadId,$index,$bytes,$sha256):array {
            $u=$this->findVideoUpload($siteId,$actor,$uploadId);
            $count=(int)$u['total_chunks'];
            if($index<0||$index>=$count)throw new InvalidArgumentException('Chunk number out of range');
            $expected=$index===$count-1
                ?(int)$u['total_bytes']-($count-1)*self::VIDEO_CHUNK_BYTES
                :self::VIDEO_CHUNK_BYTES;
            if(strlen($bytes)!==$expected)throw new InvalidArgumentException('Incorrect chunk length');
            $check=$this->db->prepare('SELECT sha256 FROM stage3_video_chunks WHERE site_id=? AND upload_id=? AND part_index=?');
            $check->execute([$siteId,$uploadId,$index]);
            $existing=$check->fetchColumn();
            if($existing!==false){
                if($existing!==$sha256)throw new Conflict('Already uploaded chunk differs');
                return ['uploadId'=>$uploadId,'index'=>$index,'stored'=>true,'duplicate'=>true];
            }
            $q=$this->db->prepare('INSERT INTO stage3_video_chunks (site_id,upload_id,part_index,sha256,bytes) VALUES (?,?,?,?,?)');
            foreach([$siteId,$uploadId,$index,$sha256] as $i=>$value)$q->bindValue($i+1,$value);
            $q->bindValue(5,$bytes,PDO::PARAM_LOB);$q->execute();
            return ['uploadId'=>$uploadId,'index'=>$index,'stored'=>true,'duplicate'=>false];
        });
    }

    public function finishVideoUpload(string $siteId,string $actor,string $uploadId): array
    {
        return $this->atomic(function()use($siteId,$actor,$uploadId):array {
            $u=$this->findVideoUpload($siteId,$actor,$uploadId);
            $draft=$this->getDraft($siteId);
            $revision=(int)$u['expected_revision'];
            if($draft['revision']!==$revision)
                throw new Conflict('Draft changed during upload; begin a fresh upload');
            $q=$this->db->prepare('SELECT part_index,sha256,bytes FROM stage3_video_chunks WHERE site_id=? AND upload_id=? ORDER BY part_index');
            $q->execute([$siteId,$uploadId]);
            $parts=$q->fetchAll(PDO::FETCH_ASSOC);
            if(count($parts)!==(int)$u['total_chunks'])throw new Conflict('Video upload incomplete');
            $ctx=hash_init('sha256');$bytes='';
            foreach($parts as $i=>$part){
                if((int)$part['part_index']!==$i)throw new Conflict('Video chunk missing');
                $piece=is_resource($part['bytes'])?stream_get_contents($part['bytes']):$part['bytes'];
                if(!is_string($piece)||!hash_equals((string)$part['sha256'],hash('sha256',$piece)))
                    throw new InvalidArgumentException('Stored video chunk corrupted');
                hash_update($ctx,$piece);$bytes.=$piece;
            }
            $digest=hash_final($ctx);
            if(strlen($bytes)!==(int)$u['total_bytes']||!hash_equals((string)$u['sha256'],$digest))
                throw new InvalidArgumentException('Complete MP4 SHA256 mismatch');
            VideoGuard::validate($bytes,$digest);
            $site=$draft['site'];
            if(count($site['assets'])>=300)throw new InvalidArgumentException('Media collection full');
            $assetId='asset-'.bin2hex(random_bytes(10));
            $asset=['id'=>$assetId,'src'=>'/assets/'.$assetId.'.mp4',
                'alt'=>$u['label'],'mime'=>'video/mp4'];
            $site['assets'][]=$asset;$this->validator->validate($site);
            $insert=$this->db->prepare('INSERT INTO stage3_media (site_id,asset_id,mime,sha256,bytes,created_at) VALUES (?,?,?,?,?,?)');
            foreach([$siteId,$assetId,'video/mp4',$digest] as $i=>$v)$insert->bindValue($i+1,$v);
            $insert->bindValue(5,$bytes,PDO::PARAM_LOB);$insert->bindValue(6,$this->now());$insert->execute();
            $body=self::encode($site);$now=$this->now();
            $next=$revision+1;
            $save=$this->db->prepare('UPDATE stage3_drafts SET revision=?,body=?,updated_at=? WHERE site_id=? AND revision=?');
            $save->execute([$next,$body,$now,$siteId,$revision]);
            if($save->rowCount()!==1)throw new Conflict('Concurrent video commit');
            $this->saveRevision($siteId,$next,$body,$now);
            $del=$this->db->prepare('DELETE FROM stage3_video_chunks WHERE site_id=? AND upload_id=?');
            $del->execute([$siteId,$uploadId]);
            $del=$this->db->prepare('DELETE FROM stage3_video_uploads WHERE site_id=? AND upload_id=?');
            $del->execute([$siteId,$uploadId]);
            return ['site'=>$site,'revision'=>$next,'asset'=>$asset,'sha256'=>$digest];
        });
    }

    public function cancelVideoUpload(string $siteId,string $actor,string $uploadId): array
    {
        return $this->atomic(function()use($siteId,$actor,$uploadId):array {
            $this->findVideoUpload($siteId,$actor,$uploadId);
            $q=$this->db->prepare('DELETE FROM stage3_video_chunks WHERE site_id=? AND upload_id=?');
            $q->execute([$siteId,$uploadId]);
            $q=$this->db->prepare('DELETE FROM stage3_video_uploads WHERE site_id=? AND upload_id=?');
            $q->execute([$siteId,$uploadId]);
            return ['cancelled'=>true];
        });
    }
}
