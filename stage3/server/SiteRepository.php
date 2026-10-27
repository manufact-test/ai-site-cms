<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use PDO;
use RuntimeException;
use Throwable;

final class Conflict extends RuntimeException {}
final class NotFound extends RuntimeException {}

/**
 * Transactional Stage3 CMS drafts and immutable revision/publication history.
 * MySQL 8+ or CI-only SQLite. No automatic migrations on web requests.
 */
final class SiteRepository
{
    use SiteArchives;
    use VideoUploads;
    use AccessControl;
    use Licenses;
    use FormDelivery;
    use LeadWorkflow;
    use CrossSiteTransfer;
    use CrossSiteCollections;
    use PageHistory;
    private string $driver;
    public function __construct(private PDO $db, private ContractValidator $validator)
    {
        $this->driver = (string)$db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if (!in_array($this->driver, ['mysql', 'sqlite'], true)) {
            throw new RuntimeException('Unsupported storage');
        }
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    }

    /**
     * Deliberately CLI-only and empty-database-only, NOT an auto-install endpoint.
     * Never point at a real host/DB without a separate owner authorization.
     */
    public function initializeEmptyDatabase(): void
    {
        if ($this->driver === 'sqlite') {
            $existing = $this->db->query("SELECT name FROM sqlite_master WHERE type IN ('table','view','trigger') AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN);
        } else {
            $existing = $this->db->query('SHOW FULL TABLES')->fetchAll(PDO::FETCH_NUM);
        }
        if ($existing) {
            throw new RuntimeException('Schema initialization requires a completely empty, dedicated database');
        }
        $id = $this->driver === 'mysql' ? 'VARCHAR(80)' : 'TEXT';
        $big = $this->driver === 'mysql' ? 'LONGTEXT' : 'TEXT';
        $number = $this->driver === 'mysql' ? 'BIGINT UNSIGNED' : 'INTEGER';
        $tail = $this->driver === 'mysql' ? ' ENGINE=InnoDB' : '';
        $schema = [
            "CREATE TABLE stage3_users (username $id PRIMARY KEY, password_hash VARCHAR(255) NOT NULL)$tail",
            "CREATE TABLE stage3_drafts (site_id $id PRIMARY KEY, revision $number NOT NULL, body $big NOT NULL, updated_at VARCHAR(35) NOT NULL)$tail",
            "CREATE TABLE stage3_revisions (site_id $id NOT NULL, revision $number NOT NULL, body $big NOT NULL, created_at VARCHAR(35) NOT NULL, PRIMARY KEY(site_id, revision))$tail",
            "CREATE TABLE stage3_publications (site_id $id PRIMARY KEY, version $number NOT NULL, source_revision $number NOT NULL, body $big NOT NULL, published_at VARCHAR(35) NOT NULL)$tail",
            "CREATE TABLE stage3_publication_history (site_id $id NOT NULL, version $number NOT NULL, source_revision $number NOT NULL, body $big NOT NULL, published_at VARCHAR(35) NOT NULL, PRIMARY KEY(site_id, version))$tail",
            "CREATE TABLE stage3_media (site_id $id NOT NULL, asset_id $id NOT NULL, mime VARCHAR(32) NOT NULL, sha256 VARCHAR(64) NOT NULL, bytes " . ($this->driver === 'mysql' ? 'LONGBLOB' : 'BLOB') . ", created_at VARCHAR(35) NOT NULL, PRIMARY KEY(site_id, asset_id))$tail",
            "CREATE TABLE stage3_submissions (submission_id $id PRIMARY KEY, site_id $id NOT NULL, section_id $id NOT NULL, source_version $number NOT NULL, name VARCHAR(160) NOT NULL, email VARCHAR(254) NOT NULL, message $big NOT NULL, submitted_at VARCHAR(35) NOT NULL, visitor_hash CHAR(64) NOT NULL, status VARCHAR(20) NOT NULL, extras $big NOT NULL)$tail",
            "CREATE TABLE stage3_notifications (site_id $id NOT NULL, submission_id $id NOT NULL, created_at VARCHAR(35) NOT NULL, seen_at VARCHAR(35) NULL, PRIMARY KEY(site_id, submission_id))$tail",
            "CREATE TABLE stage3_section_templates (site_id $id NOT NULL, template_id $id NOT NULL, title VARCHAR(160) NOT NULL, component VARCHAR(80) NOT NULL, body $big NOT NULL, created_at VARCHAR(35) NOT NULL, PRIMARY KEY(site_id,template_id))$tail"
        ];
        foreach (array_merge($schema, $this->accessSchema(), [$this->licenseSchema()], $this->deliverySchema(), $this->videoUploadSchema(), $this->leadWorkflowSchema()) as $sql) {
            $this->db->exec($sql);
        }
    }

    public function createOwner(string $username, string $password): void
    {
        if (!preg_match('/^[a-z][a-z0-9_-]{2,39}$/D', $username) || strlen($password) < 14
            || strlen($password) > 1024) {
            throw new RuntimeException('Unsafe owner credentials');
        }
        $count = (int)$this->db->query('SELECT COUNT(*) FROM stage3_users')->fetchColumn();
        if ($count !== 0) {
            throw new RuntimeException('Owner account already initialized; use a separate protected rotation process');
        }
        $stmt = $this->db->prepare('INSERT INTO stage3_users (username, password_hash) VALUES (?, ?)');
        $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
        $stmt = $this->db->prepare("INSERT INTO stage3_access_users (username,role,disabled,auth_version) VALUES (?,'owner',0,1)");
        $stmt->execute([$username]);
    }

    public function authenticate(string $username, string $password): bool
    {
        if (strlen($username) > 80 || strlen($password) > 1024) {
            return false;
        }
        $stmt = $this->db->prepare('SELECT password_hash FROM stage3_users WHERE username = ?');
        $stmt->execute([$username]);
        $hash = $stmt->fetchColumn();
        return is_string($hash) && password_verify($password, $hash) && $this->principal($username) !== null;
    }

    public function listSites(): array
    {
        $records = $this->db->query(
            'SELECT d.site_id, d.revision, d.updated_at, d.body, p.version AS published_version
             FROM stage3_drafts d LEFT JOIN stage3_publications p ON p.site_id = d.site_id
             ORDER BY d.site_id'
        )->fetchAll(PDO::FETCH_ASSOC);
        $listed = array_map(static function (array $row): array {
            $doc = json_decode((string)$row['body'], true, 512, JSON_THROW_ON_ERROR);
            return [
                'site_id' => $row['site_id'],
                'title' => $doc['title'],
                'revision' => (int)$row['revision'],
                'updated_at' => $row['updated_at'],
                'published_version' => $row['published_version'] === null ? null : (int)$row['published_version']
            ];
        }, $records);
        foreach ($listed as &$site) $site['license'] = $this->license($site['site_id']);
        unset($site);
        return $listed;
    }

    private function now(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }

    private static function encode(array $site): string
    {
        return json_encode($site, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private static function decode(string $body): array
    {
        return json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    }

    private function atomic(callable $action): mixed
    {
        $this->db->beginTransaction();
        try {
            $result = $action();
            $this->db->commit();
            return $result;
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function createSite(array $candidate): array
    {
        $site = $this->validator->validate($candidate);
        if (count($site['assets']) !== 0) {
            throw new \InvalidArgumentException('Create site first, then upload media via authenticated API');
        }
        $id = $site['siteId'];
        $body = self::encode($site);
        $now = $this->now();
        return $this->atomic(function () use ($id, $body, $now, $site): array {
            $stmt = $this->db->prepare('SELECT site_id FROM stage3_drafts WHERE site_id = ?');
            $stmt->execute([$id]);
            if ($stmt->fetchColumn() !== false) {
                throw new Conflict('Site already exists');
            }
            $stmt = $this->db->prepare('INSERT INTO stage3_drafts (site_id, revision, body, updated_at) VALUES (?, 1, ?, ?)');
            $stmt->execute([$id, $body, $now]);
            $this->saveRevision($id, 1, $body, $now);
            return ['site' => $site, 'revision' => 1];
        });
    }

    public function getDraft(string $id): array
    {
        $stmt = $this->db->prepare('SELECT body, revision FROM stage3_drafts WHERE site_id = ?');
        $stmt->execute([$id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($r === false) {
            throw new NotFound('Unknown site');
        }
        return ['site' => self::decode((string)$r['body']), 'revision' => (int)$r['revision']];
    }

    /**
     * Validates an ephemeral editor snapshot against the current server revision and
     * site-owned immutable media. It never writes a draft, revision or publication.
     */
    public function previewDraft(string $id,array $candidate,int $expectedRevision): array
    {
        $site=$this->validator->validate($candidate);
        if ($site['siteId']!==$id || $expectedRevision<1) {
            throw new Conflict('Site identity/revision mismatch');
        }
        $current=$this->getDraft($id);
        if ($current['revision']!==$expectedRevision) {
            throw new Conflict('Stale editor revision; reload before previewing');
        }
        $this->assertStoredAssets($id,$site);
        return $site;
    }

    private function saveRevision(string $id, int $revision, string $body, string $now): void
    {
        $stmt = $this->db->prepare('INSERT INTO stage3_revisions (site_id, revision, body, created_at) VALUES (?, ?, ?, ?)');
        $stmt->execute([$id, $revision, $body, $now]);
    }

    public function save(string $id, array $candidate, int $expectedRevision): array
    {
        $site = $this->validator->validate($candidate);
        if ($site['siteId'] !== $id || $expectedRevision < 1) {
            throw new Conflict('Site identity/revision mismatch');
        }
        $body = self::encode($site);
        return $this->atomic(function () use ($id, $site, $expectedRevision, $body): array {
            $this->assertStoredAssets($id, $site);
            $stmt = $this->db->prepare('UPDATE stage3_drafts SET revision = ?, body = ?, updated_at = ? WHERE site_id = ? AND revision = ?');
            $now = $this->now();
            $stmt->execute([$expectedRevision + 1, $body, $now, $id, $expectedRevision]);
            if ($stmt->rowCount() !== 1) {
                throw new Conflict('Stale editor revision; reload before saving');
            }
            $this->saveRevision($id, $expectedRevision + 1, $body, $now);
            return ['site' => $site, 'revision' => $expectedRevision + 1];
        });
    }

    public function history(string $id): array
    {
        $this->getDraft($id);
        $stmt = $this->db->prepare('SELECT revision, created_at FROM stage3_revisions WHERE site_id = ? ORDER BY revision DESC LIMIT 100');
        $stmt->execute([$id]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function restore(string $id, int $target, int $expectedRevision): array
    {
        $stmt = $this->db->prepare('SELECT body FROM stage3_revisions WHERE site_id = ? AND revision = ?');
        $stmt->execute([$id, $target]);
        $body = $stmt->fetchColumn();
        if (!is_string($body)) {
            throw new NotFound('Unknown revision');
        }
        return $this->save($id, self::decode($body), $expectedRevision);
    }

    public function publish(string $id, int $expectedRevision): array
    {
        return $this->atomic(function () use ($id, $expectedRevision): array {
            $draft = $this->getDraft($id);
            if ($expectedRevision !== $draft['revision']) {
                throw new Conflict('Stale draft cannot be published');
            }
            $site = $this->validator->validate($draft['site']);
            PublicRenderer::assertPublishable($site);
            $this->assertStoredAssets($id, $site);
            foreach ($site['pages'] as $page) {
                foreach ($page['sections'] as $section) {
                    FlexForm::definitions($section); // invalid select options cannot be published
                }
            }
            $body = self::encode($site);
            $stmt = $this->db->prepare('SELECT version FROM stage3_publications WHERE site_id = ?');
            $stmt->execute([$id]);
            $old = $stmt->fetchColumn();
            // Imported release history may exist before the first explicit public activation.
            $history = $this->db->prepare('SELECT MAX(version) FROM stage3_publication_history WHERE site_id = ?');
            $history->execute([$id]);
            $version = max((int)$old, (int)$history->fetchColumn()) + 1;
            $now = $this->now();
            if ($old === false) {
                $stmt = $this->db->prepare('INSERT INTO stage3_publications (site_id, version, source_revision, body, published_at) VALUES (?, ?, ?, ?, ?)');
                $stmt->execute([$id, $version, $expectedRevision, $body, $now]);
            } else {
                $stmt = $this->db->prepare('UPDATE stage3_publications SET version = ?, source_revision = ?, body = ?, published_at = ? WHERE site_id = ? AND version = ?');
                $stmt->execute([$version, $expectedRevision, $body, $now, $id, $old]);
                if ($stmt->rowCount() !== 1) {
                    throw new Conflict('Concurrent publish; retry after refresh');
                }
            }
            $stmt = $this->db->prepare('INSERT INTO stage3_publication_history (site_id, version, source_revision, body, published_at) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$id, $version, $expectedRevision, $body, $now]);
            return ['version' => $version, 'sourceRevision' => $expectedRevision, 'publishedAt' => $now];
        });
    }

    public function published(string $id): array
    {
        $stmt = $this->db->prepare('SELECT body, version, source_revision FROM stage3_publications WHERE site_id = ?');
        $stmt->execute([$id]);
        $p = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($p === false) {
            throw new NotFound('Site has never been published');
        }
        return ['site' => self::decode((string)$p['body']), 'version' => (int)$p['version'],
            'sourceRevision' => (int)$p['source_revision']];
    }

    /** All media bytes are immutable. Publications and old revisions remain usable. */
    private function assertStoredAssets(string $siteId, array $site): void
    {
        $stmt = $this->db->prepare('SELECT mime FROM stage3_media WHERE site_id = ? AND asset_id = ?');
        foreach ($site['assets'] as $asset) {
            $stmt->execute([$siteId, $asset['id']]);
            $stored = $stmt->fetchColumn();
            if ($stored !== $asset['mime']) {
                throw new \InvalidArgumentException('Media must be uploaded to this site before referencing it');
            }
            $ext = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp','video/mp4'=>'mp4'][$stored] ?? null;
            if ($ext === null || $asset['src'] !== '/assets/' . $asset['id'] . '.' . $ext) {
                throw new \InvalidArgumentException('Media path does not match stored image');
            }
            if (array_key_exists('width', $asset)) {
                $original = $this->image($siteId, $asset['id']);
                $dimensions = @getimagesizefromstring($original['bytes']);
                if (!is_array($dimensions) || $dimensions[0] !== $asset['width']
                    || $dimensions[1] !== $asset['height']) {
                    throw new \InvalidArgumentException('Original media dimensions mismatch');
                }
            }
            foreach ($asset['variants'] ?? [] as $variant) {
                $part = $this->image($siteId, $variant['id']);
                $info = @getimagesizefromstring($part['bytes']);
                if ($part['mime'] !== $stored || $part['sha256'] !== $variant['sha256']
                    || $variant['src'] !== '/assets/'.$variant['id'].'.'.$ext
                    || !is_array($info) || $info[0] !== $variant['width'] || $info[1] !== $variant['height']) {
                    throw new \InvalidArgumentException('Responsive media integrity or dimensions mismatch');
                }
            }
        }
    }

    /** Stores bounded, validated MP4 bytes inside the existing site media store. */
    public function uploadVideo(string $siteId,string $base64,string $label,int $expectedRevision,?string $sha=null): array
    {
        if($base64===''||strlen($base64)>2050000||
            preg_match('~^[A-Za-z0-9+/]+={0,2}$~D',$base64)!==1)
            throw new \InvalidArgumentException('Invalid or oversized video encoding');
        $bytes=base64_decode($base64,true);
        if(!is_string($bytes))throw new \InvalidArgumentException('Video decoding failed');
        $digest=VideoGuard::validate($bytes,$sha);
        if(strlen($label)<1||strlen($label)>200||preg_match('/[\x00-\x1f]/',$label)===1)
            throw new \InvalidArgumentException('Video requires a safe accessible description');
        return $this->atomic(function ()use($siteId,$bytes,$label,$expectedRevision,$digest):array {
            $draft=$this->getDraft($siteId);
            if($draft['revision']!==$expectedRevision)throw new Conflict('Stale video upload revision');
            $site=$draft['site'];
            if(count($site['assets'])>=300)throw new \InvalidArgumentException('Media collection full');
            $assetId='asset-'.bin2hex(random_bytes(10));
            $asset=['id'=>$assetId,'src'=>'/assets/'.$assetId.'.mp4',
                'mime'=>'video/mp4','alt'=>$label];
            $site['assets'][]=$asset;
            $this->validator->validate($site);
            $now=$this->now();
            $sql=$this->db->prepare('INSERT INTO stage3_media (site_id,asset_id,mime,sha256,bytes,created_at) VALUES (?,?,?,?,?,?)');
            foreach([$siteId,$assetId,'video/mp4',$digest] as $i=>$v)$sql->bindValue($i+1,$v);
            $sql->bindValue(5,$bytes,PDO::PARAM_LOB);$sql->bindValue(6,$now);$sql->execute();
            $revision=$expectedRevision+1;
            $body=self::encode($site);
            $update=$this->db->prepare('UPDATE stage3_drafts SET revision=?,body=?,updated_at=? WHERE site_id=? AND revision=?');
            $update->execute([$revision,$body,$now,$siteId,$expectedRevision]);
            if($update->rowCount()!==1)throw new Conflict('Concurrent video upload');
            $this->saveRevision($siteId,$revision,$body,$now);
            return ['site'=>$site,'revision'=>$revision,'asset'=>$asset,'sha256'=>$digest];
        });
    }

    public function uploadImage(string $siteId, string $base64, string $alt, int $expectedRevision, array $variants = [], ?string $expectedSha = null): array
    {
        if (strlen($base64) > 700000 || $base64 === '' || !preg_match('~^[A-Za-z0-9+/]+={0,2}$~D', $base64)) {
            throw new \InvalidArgumentException('Invalid or oversized image');
        }
        $bytes = base64_decode($base64, true);
        if ($bytes === false || $bytes === '' || strlen($bytes) > 450000) {
            throw new \InvalidArgumentException('Image must not exceed 450 KB');
        }
        if (strlen($alt) > 200 || preg_match('/[\x00-\x1f]/', $alt) === 1) {
            throw new \InvalidArgumentException('Invalid image description');
        }
        $info = @getimagesizefromstring($bytes);
        $type = is_array($info) ? ($info[2] ?? null) : null;
        $types = [
            IMAGETYPE_PNG => ['image/png', 'png'],
            IMAGETYPE_JPEG => ['image/jpeg', 'jpg'],
            IMAGETYPE_WEBP => ['image/webp', 'webp']
        ];
        if (!isset($types[$type]) || $info[0] < 1 || $info[1] < 1
            || $info[0] > 4096 || $info[1] > 4096) {
            throw new \InvalidArgumentException('Only valid PNG, JPEG or WebP images up to 4096px');
        }
        [$mime, $extension] = $types[$type];
        if ($expectedSha !== null && (!preg_match('/^[a-f0-9]{64}$/D', $expectedSha)
            || !hash_equals($expectedSha, hash('sha256', $bytes)))) {
            throw new \InvalidArgumentException('Original SHA256 mismatch');
        }
        if (!array_is_list($variants) || count($variants) > 3)
            throw new \InvalidArgumentException('Too many responsive variants');
        $prepared = []; $widths = [];
        foreach ($variants as $variant) {
            if (!is_array($variant) || array_diff(array_keys($variant), ['width','base64','sha256'])
                || count($variant) !== 3 || !in_array($variant['width'] ?? null, [360,720,1200], true)
                || isset($widths[$variant['width']]) || !is_string($variant['base64'])
                || strlen($variant['base64']) > 600000
                || !preg_match('~^[A-Za-z0-9+/]+={0,2}$~D', $variant['base64'])
                || !is_string($variant['sha256'])
                || preg_match('/^[a-f0-9]{64}$/D', $variant['sha256']) !== 1)
                throw new \InvalidArgumentException('Invalid responsive payload');
            $binary = base64_decode($variant['base64'], true);
            $size = is_string($binary) ? @getimagesizefromstring($binary) : false;
            if (!is_string($binary) || strlen($binary) < 20 || strlen($binary) > 450000
                || !hash_equals($variant['sha256'], hash('sha256', $binary))
                || !is_array($size) || ($types[$size[2]][0] ?? null) !== $mime
                || $size[0] !== $variant['width'] || $size[0] > $info[0]
                || $size[1] < 1 || $size[1] > 4096
                || abs($size[1] - round($size[0] * $info[1] / $info[0])) > 2)
                throw new \InvalidArgumentException('Responsive data/MIME/SHA256 mismatch');
            $widths[$variant['width']] = true;
            $prepared[] = ['width'=>$size[0], 'height'=>$size[1],
                'bytes'=>$binary, 'sha256'=>$variant['sha256']];
        }
        return $this->atomic(function () use ($siteId, $expectedRevision, $bytes, $alt, $mime, $extension, $prepared, $info): array {
            $draft = $this->getDraft($siteId);
            if ($draft['revision'] !== $expectedRevision) {
                throw new Conflict('Stale draft; reload before uploading media');
            }
            $site = $draft['site'];
            if (count($site['assets']) >= 300) {
                throw new \InvalidArgumentException('Media collection full');
            }
            $assetId = 'asset-' . bin2hex(random_bytes(10));
            $asset = [
                'id' => $assetId,
                'src' => '/assets/' . $assetId . '.' . $extension,
                'alt' => $alt,
                'mime' => $mime,
                'width' => $info[0],
                'height' => $info[1]
            ];
            foreach ($prepared as $part) {
                $vid = 'asset-' . bin2hex(random_bytes(10));
                $asset['variants'][] = ['id'=>$vid,'src'=>'/assets/'.$vid.'.'.$extension,
                    'sha256'=>$part['sha256'],'width'=>$part['width'],'height'=>$part['height']];
            }
            $site['assets'][] = $asset;
            $this->validator->validate($site);
            $insert = $this->db->prepare('INSERT INTO stage3_media (site_id, asset_id, mime, sha256, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)');
            $now = $this->now();
            $insert->bindValue(1, $siteId);
            $insert->bindValue(2, $assetId);
            $insert->bindValue(3, $mime);
            $insert->bindValue(4, hash('sha256', $bytes));
            $insert->bindValue(5, $bytes, PDO::PARAM_LOB);
            $insert->bindValue(6, $now);
            $insert->execute();
            foreach ($prepared as $n => $part) {
                $insert->bindValue(2, $asset['variants'][$n]['id']);
                $insert->bindValue(4, $part['sha256']);
                $insert->bindValue(5, $part['bytes'], PDO::PARAM_LOB);
                $insert->execute();
            }
            $update = $this->db->prepare('UPDATE stage3_drafts SET revision = ?, body = ?, updated_at = ? WHERE site_id = ? AND revision = ?');
            $update->execute([$expectedRevision + 1, self::encode($site), $now, $siteId, $expectedRevision]);
            if ($update->rowCount() !== 1) {
                throw new Conflict('Concurrent media update');
            }
            $this->saveRevision($siteId, $expectedRevision + 1, self::encode($site), $now);
            return ['site' => $site, 'revision' => $expectedRevision + 1, 'asset' => $asset,
                'sha256' => hash('sha256', $bytes)];
        });
    }

    /** Return only exact immutable bytes, never arbitrary filesystem paths. */
    public function image(string $siteId, string $assetId): array
    {
        $stmt = $this->db->prepare('SELECT mime, sha256, bytes FROM stage3_media WHERE site_id = ? AND asset_id = ?');
        $stmt->execute([$siteId, $assetId]);
        $media = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$media) {
            throw new NotFound('Unknown media');
        }
        $bytes = $media['bytes'];
        if (is_resource($bytes)) {
            $bytes = stream_get_contents($bytes);
        }
        if (!is_string($bytes) || !hash_equals((string)$media['sha256'], hash('sha256', $bytes))) {
            throw new \RuntimeException('Media checksum mismatch');
        }
        return ['mime' => $media['mime'], 'bytes' => $bytes, 'sha256' => $media['sha256']];
    }

    public function publishedImage(string $siteId, string $assetId, string $extension): array
    {
        $site = $this->published($siteId)['site'];
        foreach ($site['assets'] as $asset) {
            if ($asset['id'] === $assetId
                && $asset['src'] === '/assets/' . $assetId . '.' . $extension) return $this->image($siteId, $assetId);
            foreach ($asset['variants'] ?? [] as $variant) {
                if ($variant['id'] === $assetId
                    && $variant['src'] === '/assets/'.$assetId.'.'.$extension) {
                    $image = $this->image($siteId, $assetId);
                    if ($image['sha256'] !== $variant['sha256'] || $image['mime'] !== $asset['mime'])
                        throw new \RuntimeException('Published responsive SHA256 mismatch');
                    return $image;
                }
            }
        }
        throw new NotFound('Image is not part of published site');
    }


    public function publishedVersion(string $id, int $version): array
    {
        $stmt = $this->db->prepare('SELECT body FROM stage3_publication_history WHERE site_id = ? AND version = ?');
        $stmt->execute([$id, $version]);
        $row = $stmt->fetchColumn();
        if (!is_string($row)) {
            throw new NotFound('Unknown published release');
        }
        return self::decode($row);
    }

    /** Validate against exact immutable published release; never against drafts. */
    public function collectSubmission(string $siteId, string $sectionId, int $release, array $fields, string $clientIp, string $secret): string
    {
        if ($release < 1 || $release > 1000000000 || !preg_match('/^[a-z][a-z0-9-]{2,79}$/D', $siteId)
            || !preg_match('/^[a-z][a-z0-9-]{2,79}$/D', $sectionId)) {
            throw new \InvalidArgumentException('Unknown form');
        }
        $published = $this->publishedVersion($siteId, $release);
        $form = null;
        foreach ($published['pages'] as $page) {
            foreach ($page['sections'] as $section) {
                if ($section['id'] === $sectionId
                    && in_array($section['component'], ['lead-form','lead-form-flex'], true)) {
                    $form = $section;
                }
            }
        }
        if ($form === null) {
            throw new NotFound('Form is not in this published release');
        }
        $token = hash_hmac('sha256', $siteId . '|' . $sectionId . '|' . $release, $secret);
        if (!is_string($fields['_token'] ?? null)
            || !hash_equals($token, $fields['_token'])) {
            throw new \InvalidArgumentException('Invalid form token');
        }
        if (($fields['website'] ?? '') !== '') {
            throw new \InvalidArgumentException('Automated submission rejected');
        }
        $values = [];
        foreach (['name' => 120, 'email' => 254, 'message' => 4000] as $key => $max) {
            $value = $fields[$key] ?? null;
            if (!is_string($value) || !preg_match('//u', $value) || strlen($value) > $max
                || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/', $value)) {
                throw new \InvalidArgumentException('Invalid form field: ' . $key);
            }
            $values[$key] = trim($value);
        }
        if (strlen($values['name']) < 2 || strlen($values['message']) < 10
            || !filter_var($values['email'], FILTER_VALIDATE_EMAIL)
            || !in_array($fields['consent'] ?? null, ['yes'], true)) {
            throw new \InvalidArgumentException('Missing required fields or consent');
        }
        $extras = FlexForm::read($form, $fields);
        $allowed = ['name', 'email', 'message', 'consent', '_token', '_release', 'website',
            ...FlexForm::allowedNames($form)];
        // Unchecked native checkboxes and unselected optional radio groups are
        // omitted by browsers. FlexForm::read has already enforced required and
        // conditional fields, so only those native control types may be absent.
        $omittable = [];
        foreach (FlexForm::definitions($form) as $definition) {
            if (in_array($definition['kind'], ['radio','checkbox'], true)
                && (!$definition['required'] || $definition['when'] !== null)) {
                $omittable[] = $definition['name'];
            }
        }
        $missing = array_diff($allowed, array_keys($fields));
        if (array_diff(array_keys($fields), $allowed) || array_diff($missing, $omittable)) {
            throw new \InvalidArgumentException('Unknown or missing form fields');
        }
        if (($fields['_release'] ?? null) !== (string)$release) {
            throw new \InvalidArgumentException('Invalid release number');
        }
        $visitor = hash_hmac('sha256', $clientIp, $secret);
        return $this->atomic(function () use ($siteId, $sectionId, $release, $values, $extras, $visitor): string {
            // Hourly per-site limit. Hash protects raw visitor IP from storage.
            $since = gmdate('Y-m-d\TH:i:s\Z', time() - 3600);
            $check = $this->db->prepare('SELECT COUNT(*) FROM stage3_submissions WHERE site_id = ? AND visitor_hash = ? AND submitted_at >= ?');
            $check->execute([$siteId, $visitor, $since]);
            if ((int)$check->fetchColumn() >= 5) {
                throw new Conflict('Submission limit reached');
            }
            $id = 'lead-' . bin2hex(random_bytes(12));
            $stmt = $this->db->prepare('INSERT INTO stage3_submissions (submission_id, site_id, section_id, source_version, name, email, message, submitted_at, visitor_hash, status, extras) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$id, $siteId, $sectionId, $release,
                $values['name'], $values['email'], $values['message'], $this->now(), $visitor, 'new',
                self::encode($extras)]);
            $notify = $this->db->prepare('INSERT INTO stage3_notifications (site_id, submission_id, created_at, seen_at) VALUES (?, ?, ?, NULL)');
            $notify->execute([$siteId, $id, $this->now()]);
            $this->enqueueLeadDeliveries($siteId,$id);
            return $id;
        });
    }

    /** Admin-only inbox; no public read endpoints, no visitor hashes returned. */
    public function submissions(string $siteId): array
    {
        $this->getDraft($siteId);
        $stmt = $this->db->prepare('SELECT s.submission_id,s.section_id,s.source_version,s.name,s.email,s.message,s.submitted_at,s.status,s.extras,COALESCE(w.priority,\'normal\') AS priority,COALESCE(w.note,\'\') AS note,COALESCE(w.revision,0) AS workflow_revision FROM stage3_submissions s LEFT JOIN stage3_lead_workflow w ON w.site_id=s.site_id AND w.submission_id=s.submission_id WHERE s.site_id = ? ORDER BY s.submitted_at DESC,s.submission_id DESC LIMIT 100');
        $stmt->execute([$siteId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row['extras'] = self::decode($row['extras']);
        }
        return $rows;
    }


    /** Scoped, bounded and parameterized inbox filtering for real CMS operators. */
    private function inboxWhere(string $siteId, string $status, string $query, string $priority='all'): array
    {
        if (!in_array($status, ['all','new','in_progress','reviewed'], true)
            ||!in_array($priority,['all','high','normal'],true)) {
            throw new \InvalidArgumentException('Unknown inbox status/priority filter');
        }
        if (strlen($query)>120 || preg_match('//u',$query)!==1
            || preg_match('/[\x00-\x1f\x7f]/',$query)===1) {
            throw new \InvalidArgumentException('Invalid inbox search');
        }
        $where='s.site_id = ?';$params=[$siteId];
        if ($status!=='all') {$where.=' AND s.status = ?';$params[]=$status;}
        if ($priority!=='all') {$where.=" AND COALESCE(w.priority,'normal') = ?";$params[]=$priority;}
        $query=trim($query);
        if ($query!=='') {
            // Explicit LIKE wildcard escaping is portable across SQLite/MySQL.
            $escaped=str_replace(['!','%','_'],['!!','!%','!_'],$query);
            $like='%'.$escaped.'%';
            $where.=" AND (s.name LIKE ? ESCAPE '!' OR s.email LIKE ? ESCAPE '!' OR s.message LIKE ? ESCAPE '!')";
            array_push($params,$like,$like,$like);
        }
        return [$where,$params];
    }

    public function inboxPage(string $siteId, string $status='all', string $query='', int $page=1, int $limit=25,string $priority='all'): array
    {
        $this->getDraft($siteId);
        if ($page<1 || $page>10000 || $limit<1 || $limit>1000)
            throw new \InvalidArgumentException('Invalid inbox page or limit');
        [$where,$params]=$this->inboxWhere($siteId,$status,$query,$priority);
        $count=$this->db->prepare('SELECT COUNT(*) FROM stage3_submissions s LEFT JOIN stage3_lead_workflow w ON w.site_id=s.site_id AND w.submission_id=s.submission_id WHERE '.$where);
        $count->execute($params);$total=(int)$count->fetchColumn();
        $stats=['all'=>0,'new'=>0,'in_progress'=>0,'reviewed'=>0];
        $totals=$this->db->prepare('SELECT s.status,COALESCE(w.priority,\'normal\') AS priority,COUNT(*) AS tally'
            .' FROM stage3_submissions s LEFT JOIN stage3_lead_workflow w'
            .' ON w.site_id=s.site_id AND w.submission_id=s.submission_id'
            .' WHERE s.site_id=? GROUP BY s.status,COALESCE(w.priority,\'normal\')');
        $totals->execute([$siteId]);
        $pipeline=['new'=>['all'=>0,'high'=>0],
            'in_progress'=>['all'=>0,'high'=>0],'reviewed'=>['all'=>0,'high'=>0]];
        foreach($totals->fetchAll(PDO::FETCH_ASSOC) as $row){
            if(!isset($pipeline[$row['status']]))continue;
            $n=(int)$row['tally'];
            $pipeline[$row['status']]['all']+=$n;
            if($row['priority']==='high')$pipeline[$row['status']]['high']+=$n;
        }
        foreach($pipeline as $name=>$counts)$stats[$name]=$counts['all'];
        $stats['all']=$stats['new']+$stats['in_progress']+$stats['reviewed'];
        $pages=max(1,(int)ceil($total/$limit));
        $page=min($page,$pages);
        $stmt=$this->db->prepare('SELECT s.submission_id,s.section_id,s.source_version,s.name,s.email,s.message,s.submitted_at,s.status,s.extras,'
            .' COALESCE(w.priority,\'normal\') AS priority,COALESCE(w.note,\'\') AS note,'
            .' COALESCE(w.revision,0) AS workflow_revision,w.operator AS workflow_operator,w.changed_at AS workflow_changed_at'
            .' FROM stage3_submissions s LEFT JOIN stage3_lead_workflow w'
            .' ON w.site_id=s.site_id AND w.submission_id=s.submission_id'
            .' WHERE '.$where
            .' ORDER BY s.submitted_at DESC,s.submission_id DESC LIMIT ? OFFSET ?');
        foreach($params as $i=>$value)$stmt->bindValue($i+1,$value,PDO::PARAM_STR);
        $stmt->bindValue(count($params)+1,$limit,PDO::PARAM_INT);
        $stmt->bindValue(count($params)+2,($page-1)*$limit,PDO::PARAM_INT);
        $stmt->execute();
        $rows=$stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row)$row['extras']=self::decode($row['extras']);
        unset($row);
        return ['submissions'=>$rows,'page'=>$page,'pages'=>$pages,'limit'=>$limit,
            'total'=>$total,'counts'=>$stats,'pipeline'=>$pipeline];
    }

    /** Entire filtered CSV or explicit refusal: never silently truncate private exports. */
    public function inboxCsv(string $siteId, string $status='all', string $query='',string $priority='all'): string
    {
        $data=$this->inboxPage($siteId,$status,$query,1,1000,$priority);
        if ($data['total']>1000)
            throw new \InvalidArgumentException('CSV export exceeds 1000 leads; narrow the filter');
        $stream=fopen('php://temp','w+');
        if ($stream===false)throw new \RuntimeException('Cannot prepare CSV');
        fwrite($stream,"\xEF\xBB\xBF");
        fputcsv($stream,['ID','Date UTC','Status','Priority','Name','Email','Message','Private note','Form section','Published version','Extra fields'],',','"','');
        foreach ($data['submissions'] as $row) {
            $extras=[];
            foreach ($row['extras'] as $extra) {
                if (is_array($extra))$extras[]=($extra['label']??'').': '.($extra['value']??'');
            }
            $cells=[$row['submission_id'],$row['submitted_at'],$row['status'],$row['priority'],$row['name'],$row['email'],
                $row['message'],$row['note'],$row['section_id'],(string)$row['source_version'],implode(' | ',$extras)];
            // Neutralize spreadsheet formulas, including values preceded by whitespace.
            $cells=array_map(static function(string $value): string {
                return preg_match('/^[\x00-\x20]*[=+\-@]/',$value)===1?"'".$value:$value;
            },$cells);
            fputcsv($stream,$cells,',','"','');
        }
        rewind($stream);$csv=stream_get_contents($stream);fclose($stream);
        if (!is_string($csv))throw new \RuntimeException('CSV serialization failed');
        return $csv;
    }

    /** All-or-nothing review for explicitly selected new leads. No deletes or auto-ack. */
    public function bulkReviewSubmissions(string $siteId, array $ids,string $operator='system'): array
    {
        if (!array_is_list($ids)||count($ids)<1||count($ids)>50)
            throw new \InvalidArgumentException('Select 1–50 lead IDs');
        $seen=[];
        foreach($ids as $id){
            if(!is_string($id)||preg_match('/^lead-[a-f0-9]{24}$/D',$id)!==1||isset($seen[$id]))
                throw new \InvalidArgumentException('Invalid or duplicate lead ID');
            $seen[$id]=true;
        }
        return $this->atomic(function() use($siteId,$ids,$operator): array {
            $this->getDraft($siteId);
            $placeholders=implode(',',array_fill(0,count($ids),'?'));
            $check=$this->db->prepare('SELECT submission_id,status FROM stage3_submissions WHERE site_id = ? AND submission_id IN ('.$placeholders.')');
            $check->execute([$siteId,...$ids]);$matches=$check->fetchAll(PDO::FETCH_ASSOC);
            if(count($matches)!==count($ids))throw new Conflict('Unknown lead; selection was not changed');
            foreach($matches as $match)if($match['status']!=='new')
                throw new Conflict('Already reviewed lead; selection was not changed');
            $update=$this->db->prepare("UPDATE stage3_submissions SET status = 'reviewed' WHERE site_id = ? AND status = 'new' AND submission_id IN (".$placeholders.")");
            $update->execute([$siteId,...$ids]);
            if($update->rowCount()!==count($ids))throw new Conflict('Concurrent review; transaction rolled back');
            foreach($ids as $leadId)$this->recordLeadReviewTransition($siteId,$leadId,$operator,'new');
            return ['reviewed'=>count($ids)];
        });
    }

    /** Persist inbox notifications separately from review workflow; no external delivery. */
    public function notificationSummary(string $siteId): array
    {
        $this->getDraft($siteId);
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM stage3_notifications WHERE site_id = ? AND seen_at IS NULL');
        $stmt->execute([$siteId]);
        return ['unread' => (int)$stmt->fetchColumn()];
    }

    public function markNotificationsSeen(string $siteId): array
    {
        $this->getDraft($siteId);
        $stmt = $this->db->prepare('UPDATE stage3_notifications SET seen_at = ? WHERE site_id = ? AND seen_at IS NULL');
        $stmt->execute([$this->now(), $siteId]);
        return $this->notificationSummary($siteId);
    }

    public function reviewSubmission(string $siteId,string $submissionId,string $operator='system'): void
    {
        if(!preg_match('/^lead-[0-9a-f]{24}$/D',$submissionId))
            throw new \InvalidArgumentException('Invalid submission ID');
        $this->atomic(function()use($siteId,$submissionId,$operator):void{
            $this->getDraft($siteId);
            $q=$this->db->prepare('SELECT status FROM stage3_submissions WHERE site_id=? AND submission_id=?');
            $q->execute([$siteId,$submissionId]);$old=$q->fetchColumn();
            if(!is_string($old)||$old==='reviewed')
                throw new NotFound('Unknown or already reviewed submission');
            $stmt=$this->db->prepare('UPDATE stage3_submissions SET status=? WHERE site_id=? AND submission_id=? AND status=?');
            $stmt->execute(['reviewed',$siteId,$submissionId,$old]);
            if($stmt->rowCount()!==1)throw new Conflict('Concurrent review');
            $this->recordLeadReviewTransition($siteId,$submissionId,$operator,$old);
        });
    }


    /**
     * Site-scoped snapshots reference only that site's already validated draft
     * components and assets. No executable template uploads, HTML or arbitrary
     * cross-site copies. Existing templates survive later source-section edits.
     */
    public function storeSectionTemplate(
        string $siteId,
        string $pageId,
        string $sectionId,
        string $name,
        int $expectedRevision
    ): array {
        if (trim($name) === '' || strlen($name) > 140 ||
            preg_match('/[\x00-\x1f]/', $name)) {
            throw new \InvalidArgumentException('Invalid template name');
        }
        return $this->atomic(function () use ($siteId, $pageId, $sectionId, $name, $expectedRevision): array {
            $draft = $this->getDraft($siteId);
            if ($draft['revision'] !== $expectedRevision) {
                throw new Conflict('Stale draft; save/reload before creating a template');
            }
            $section = null;
            foreach ($draft['site']['pages'] as $page) {
                if ($page['id'] !== $pageId) continue;
                foreach ($page['sections'] as $current) {
                    if ($current['id'] === $sectionId) $section = $current;
                }
            }
            if ($section === null) {
                throw new NotFound('Unknown section on selected page');
            }
            $this->validator->validate($draft['site']);
            $stmt = $this->db->prepare('SELECT COUNT(*) FROM stage3_section_templates WHERE site_id = ?');
            $stmt->execute([$siteId]);
            if ((int)$stmt->fetchColumn() >= 60) {
                throw new \InvalidArgumentException('Maximum 60 reusable sections per site');
            }
            $id = 'template-' . bin2hex(random_bytes(9));
            $created = $this->now();
            $stmt = $this->db->prepare('INSERT INTO stage3_section_templates (site_id, template_id, title, component, body, created_at) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$siteId, $id, trim($name), $section['component'],
                self::encode($section), $created]);
            return ['id' => $id, 'title' => trim($name),
                'component' => $section['component'], 'section' => $section,
                'createdAt' => $created];
        });
    }

    public function sectionTemplates(string $siteId): array
    {
        $this->getDraft($siteId); // refuse nonexistent site
        $stmt = $this->db->prepare('SELECT template_id,title,component,body,created_at FROM stage3_section_templates WHERE site_id = ? ORDER BY created_at DESC,template_id DESC');
        $stmt->execute([$siteId]);
        return array_map(static fn (array $row): array => [
            'id' => $row['template_id'],
            'title' => $row['title'],
            'component' => $row['component'],
            'section' => self::decode($row['body']),
            'createdAt' => $row['created_at']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function removeSectionTemplate(string $siteId, string $templateId): void
    {
        $this->getDraft($siteId);
        if (!preg_match('/^template-[a-f0-9]{18}$/D', $templateId)) {
            throw new \InvalidArgumentException('Invalid section template ID');
        }
        $stmt = $this->db->prepare('DELETE FROM stage3_section_templates WHERE site_id = ? AND template_id = ?');
        $stmt->execute([$siteId, $templateId]);
        if ($stmt->rowCount() !== 1) {
            throw new NotFound('Template not found for this site');
        }
    }

}
