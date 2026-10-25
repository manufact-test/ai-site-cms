<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;
use PDO;
use PDOException;
use RuntimeException;

/** Site-scoped manual licences: NEVER affect public pages or visitor forms. */
trait Licenses
{
    private function licenseSchema(): string
    {
        $id = $this->driver === 'mysql' ? 'VARCHAR(80)' : 'TEXT';
        $tail = $this->driver === 'mysql' ? ' ENGINE=InnoDB' : '';
        return "CREATE TABLE stage3_site_licenses (site_id $id PRIMARY KEY, license_type VARCHAR(16) NOT NULL, reminder_date VARCHAR(10) NULL, domain VARCHAR(253) NOT NULL, paused INTEGER NOT NULL, version INTEGER NOT NULL, operator $id NOT NULL, reason VARCHAR(240) NOT NULL, changed_at VARCHAR(35) NOT NULL)$tail";
    }

    /** CLI-only additive upgrade for a dedicated Stage3 DB. No DDL on HTTP paths. */
    public function upgradeLicenseSchema(): void
    {
        if (PHP_SAPI !== 'cli' || getenv('STAGE3_ALLOW_LICENSE_UPGRADE') !== 'YES') {
            throw new RuntimeException('Licence upgrade requires explicit isolated CLI authorization');
        }
        $expected = ['stage3_users','stage3_drafts','stage3_revisions','stage3_publications',
            'stage3_publication_history','stage3_media','stage3_submissions','stage3_notifications',
            'stage3_section_templates','stage3_access_users','stage3_site_grants','stage3_audit'];
        $tables = $this->driver === 'sqlite'
            ? $this->db->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN)
            : $this->db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        if (array_diff($expected,$tables) || array_diff($tables,[...$expected,'stage3_site_licenses','stage3_video_uploads','stage3_video_chunks','stage3_delivery_settings','stage3_delivery_outbox'])) {
            throw new RuntimeException('Licence upgrade requires dedicated Stage3 schema and completed access upgrade');
        }
        if (!in_array('stage3_site_licenses',$tables,true)) $this->db->exec($this->licenseSchema());
    }

    public function license(string $siteId): array
    {
        $this->getDraft($siteId);
        $q = $this->db->prepare('SELECT license_type,reminder_date,domain,paused,version,operator,reason,changed_at FROM stage3_site_licenses WHERE site_id = ?');
        $q->execute([$siteId]); $r = $q->fetch(PDO::FETCH_ASSOC);
        $type = $r['license_type'] ?? 'perpetual';
        $date = $r['reminder_date'] ?? null;
        $status = 'none';
        if ($type === 'subscription' && $date !== null) {
            $today = new DateTimeImmutable('today',new DateTimeZone('UTC'));
            $due = DateTimeImmutable::createFromFormat('!Y-m-d',$date,new DateTimeZone('UTC'));
            $days = (int)$today->diff($due)->format('%r%a');
            $status = $days < 0 ? 'overdue' : ($days === 0 ? 'today' : ($days <= 30 ? 'soon' : 'scheduled'));
        }
        return ['siteId'=>$siteId,'type'=>$type,'reminderDate'=>$date,
            'reminderStatus'=>$status,'domain'=>$r['domain'] ?? '',
            'paused'=>isset($r['paused']) && (int)$r['paused'] === 1,
            'version'=>isset($r['version']) ? (int)$r['version'] : 0,
            'operator'=>$r['operator'] ?? null,'reason'=>$r['reason'] ?? null,
            'changedAt'=>$r['changed_at'] ?? null];
    }

    public function allLicenses(): array
    {
        return array_map(static fn(array $site): array =>
            ['siteId'=>$site['site_id'],'title'=>$site['title'],...$site['license']],$this->listSites());
    }

    public function assertLicenseWritable(string $siteId): void
    {
        if ($this->license($siteId)['paused']) throw new Conflict('CMS editing and publishing manually paused for this site');
    }

    public function changeLicense(string $siteId,string $operator,string $operation,int $version,string $reason,
        ?string $type=null,?string $date=null,?string $domain=null): array
    {
        $reason=trim($reason);
        if ($version<0 || $version>1000000000 || $reason==='' || strlen($reason)>240 ||
            preg_match('/[\x00-\x1f\x7f]/',$reason)) throw new InvalidArgumentException('Licence version and reason required');
        if (!in_array($operation,['details','pause','resume'],true)) throw new InvalidArgumentException('Invalid licence operation');
        if ($operation==='details') {
            if (!in_array($type,['perpetual','subscription'],true)) throw new InvalidArgumentException('Invalid licence type');
            if ($type==='perpetual' && $date!==null) throw new InvalidArgumentException('Perpetual licence cannot have a reminder');
            $parsed=$date===null ? false : DateTimeImmutable::createFromFormat('!Y-m-d',$date,new DateTimeZone('UTC'));
            if ($type==='subscription' && (!$parsed || $parsed->format('Y-m-d')!==$date)) {
                throw new InvalidArgumentException('Subscription needs a valid YYYY-MM-DD reminder');
            }
            if ($domain===null || strlen($domain)>253 ||
                ($domain!=='' && !preg_match('/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/D',$domain))) {
                throw new InvalidArgumentException('Domain must be empty or a lowercase DNS name');
            }
        }
        return $this->atomic(function() use($siteId,$operator,$operation,$version,$reason,$type,$date,$domain): array {
            $old=$this->license($siteId);
            if ($old['version']!==$version) throw new Conflict('Stale licence version; refresh first');
            $newType=$operation==='details'?$type:$old['type'];
            $newDate=$operation==='details'?$date:$old['reminderDate'];
            $newDomain=$operation==='details'?$domain:$old['domain'];
            $paused=$operation==='details'?$old['paused']:($operation==='pause');
            if ($operation!=='details' && $paused===$old['paused']) throw new Conflict('CMS already in requested pause state');
            $values=[$newType,$newDate,$newDomain,(int)$paused,$operator,$reason,$this->now()];
            try {
                if ($version===0) {
                    $q=$this->db->prepare('INSERT INTO stage3_site_licenses (license_type,reminder_date,domain,paused,operator,reason,changed_at,version,site_id) VALUES (?,?,?,?,?,?,?,1,?)');
                    $q->execute([...$values,$siteId]);
                } else {
                    $q=$this->db->prepare('UPDATE stage3_site_licenses SET license_type=?,reminder_date=?,domain=?,paused=?,operator=?,reason=?,changed_at=?,version=version+1 WHERE site_id=? AND version=?');
                    $q->execute([...$values,$siteId,$version]);
                    if ($q->rowCount()!==1) throw new Conflict('Licence changed concurrently');
                }
            } catch(PDOException $e) {
                if ($version===0) throw new Conflict('Licence initialized concurrently',0,$e);
                throw $e;
            }
            return $this->license($siteId);
        });
    }
}
