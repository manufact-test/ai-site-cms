<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use InvalidArgumentException;
use PDO;
use RuntimeException;

trait AccessControl
{
    private function accessSchema(): array
    {
        $id = $this->driver === 'mysql' ? 'VARCHAR(80)' : 'TEXT';
        $big = $this->driver === 'mysql' ? 'LONGTEXT' : 'TEXT';
        $tail = $this->driver === 'mysql' ? ' ENGINE=InnoDB' : '';
        return [
            "CREATE TABLE stage3_access_users (username $id PRIMARY KEY, role VARCHAR(20) NOT NULL, disabled INTEGER NOT NULL, auth_version INTEGER NOT NULL)$tail",
            "CREATE TABLE stage3_site_grants (username $id NOT NULL, site_id $id NOT NULL, PRIMARY KEY(username,site_id))$tail",
            "CREATE TABLE stage3_audit (event_id $id PRIMARY KEY, actor $id NOT NULL, action VARCHAR(180) NOT NULL, site_id $id NULL, outcome VARCHAR(20) NOT NULL, detail $big NOT NULL, created_at VARCHAR(35) NOT NULL)$tail"
        ];
    }

    /** Explicit CLI-only upgrade; never run DDL from HTTP requests. Re-runnable after interruption. */
    public function upgradeAccessSchema(): void
    {
        if (PHP_SAPI !== 'cli' || getenv('STAGE3_ALLOW_ACCESS_UPGRADE') !== 'YES') {
            throw new RuntimeException('Access upgrade requires explicit isolated CLI authorization');
        }
        $expected = ['stage3_users','stage3_drafts','stage3_revisions','stage3_publications','stage3_publication_history',
            'stage3_media','stage3_submissions','stage3_notifications','stage3_section_templates',
            'stage3_access_users','stage3_site_grants','stage3_audit','stage3_site_licenses',
            'stage3_video_uploads','stage3_video_chunks','stage3_delivery_settings','stage3_delivery_outbox'];
        $tables = $this->driver === 'sqlite'
            ? $this->db->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN)
            : $this->db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        if (array_diff($tables, $expected) || array_diff(array_slice($expected,0,9), $tables)) {
            throw new RuntimeException('Upgrade requires the dedicated Stage3 database');
        }
        foreach ($this->accessSchema() as $sql) {
            preg_match('/CREATE TABLE ([a-z0-9_]+)/', $sql, $match);
            if (!in_array($match[1], $tables, true)) $this->db->exec($sql);
        }
        // The legacy model allowed one initial owner only. Never promote later accounts.
        $users = $this->db->query('SELECT username FROM stage3_users')->fetchAll(PDO::FETCH_COLUMN);
        $count = (int)$this->db->query('SELECT COUNT(*) FROM stage3_access_users')->fetchColumn();
        if ($count === 0 && count($users) === 1) {
            $q = $this->db->prepare("INSERT INTO stage3_access_users (username,role,disabled,auth_version) VALUES (?,'owner',0,1)");
            $q->execute([$users[0]]);
        } elseif ($count === 0 && count($users) > 1) {
            throw new RuntimeException('Ambiguous legacy owners; no accounts promoted');
        }
    }

    public function principal(string $username): ?array
    {
        $q = $this->db->prepare('SELECT role,disabled,auth_version FROM stage3_access_users WHERE username = ?');
        $q->execute([$username]); $r = $q->fetch(PDO::FETCH_ASSOC);
        if (!$r || (int)$r['disabled'] !== 0) return null;
        $q = $this->db->prepare('SELECT site_id FROM stage3_site_grants WHERE username = ? ORDER BY site_id');
        $q->execute([$username]);
        return ['username' => $username, 'role' => $r['role'], 'authVersion' => (int)$r['auth_version'], 'sites' => $q->fetchAll(PDO::FETCH_COLUMN)];
    }

    public function sessionPrincipal(string $username, int $version): ?array
    {
        $p = $this->principal($username);
        return $p !== null && $p['authVersion'] === $version ? $p : null;
    }

    private static function credentials(string $username, string $password): void
    {
        if (!preg_match('/^[a-z][a-z0-9_-]{2,39}$/D', $username) || strlen($password) < 14 || strlen($password) > 1024) {
            throw new InvalidArgumentException('Username: 3–40 lowercase letters/digits/_/-. Password: 14–1024 bytes');
        }
    }

    private function accountPolicy(string $role, array $sites): array
    {
        if (!in_array($role, ['viewer','editor','publisher'], true) || !array_is_list($sites) || count($sites) > 100) {
            throw new InvalidArgumentException('Choose viewer, editor or publisher and up to 100 sites');
        }
        $result = [];
        foreach ($sites as $siteId) {
            if (!is_string($siteId) || !preg_match('/^[a-z][a-z0-9-]{2,79}$/D', $siteId) || isset($result[$siteId])) {
                throw new InvalidArgumentException('Invalid or duplicate site grant');
            }
            $this->getDraft($siteId); $result[$siteId] = true;
        }
        return array_keys($result);
    }

    public function accounts(): array
    {
        $q = $this->db->query('SELECT username,role,disabled,auth_version FROM stage3_access_users ORDER BY username');
        $rows = $q->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $g = $this->db->prepare('SELECT site_id FROM stage3_site_grants WHERE username = ? ORDER BY site_id');
            $g->execute([$r['username']]); $r['sites'] = $g->fetchAll(PDO::FETCH_COLUMN);
            $r['disabled'] = (bool)$r['disabled']; $r['authVersion'] = (int)$r['auth_version']; unset($r['auth_version']);
        }
        return $rows;
    }

    public function createAccount(string $username, string $password, string $role, array $sites): void
    {
        self::credentials($username, $password); $sites = $this->accountPolicy($role, $sites);
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $this->atomic(function () use ($username, $hash, $role, $sites): void {
            $q = $this->db->prepare('SELECT username FROM stage3_users WHERE username = ?'); $q->execute([$username]);
            if ($q->fetchColumn() !== false) throw new Conflict('Username already exists');
            $q = $this->db->prepare('INSERT INTO stage3_users (username,password_hash) VALUES (?,?)'); $q->execute([$username,$hash]);
            $q = $this->db->prepare('INSERT INTO stage3_access_users (username,role,disabled,auth_version) VALUES (?,?,0,1)'); $q->execute([$username,$role]);
            $q = $this->db->prepare('INSERT INTO stage3_site_grants (username,site_id) VALUES (?,?)');
            foreach ($sites as $id) $q->execute([$username,$id]);
        });
    }

    public function updateAccount(string $username, string $role, bool $disabled, array $sites, int $version): void
    {
        $sites = $this->accountPolicy($role, $sites);
        $this->atomic(function () use ($username,$role,$disabled,$sites,$version): void {
            // Initial owner cannot be disabled, demoted or reassigned through this API.
            $q = $this->db->prepare("UPDATE stage3_access_users SET role = ?, disabled = ?, auth_version = auth_version + 1 WHERE username = ? AND role <> 'owner' AND auth_version = ?");
            $q->execute([$role,(int)$disabled,$username,$version]);
            if ($q->rowCount() !== 1) throw new Conflict('Unknown, protected owner or stale account version');
            $q = $this->db->prepare('DELETE FROM stage3_site_grants WHERE username = ?'); $q->execute([$username]);
            $q = $this->db->prepare('INSERT INTO stage3_site_grants (username,site_id) VALUES (?,?)');
            foreach ($sites as $id) $q->execute([$username,$id]);
        });
    }

    public function changePassword(string $username, string $current, string $next): void
    {
        self::credentials($username,$next);
        $q = $this->db->prepare('SELECT password_hash FROM stage3_users WHERE username = ?'); $q->execute([$username]);
        $oldHash = $q->fetchColumn();
        if (!is_string($oldHash) || !password_verify($current,$oldHash) || $this->principal($username) === null) throw new InvalidArgumentException('Current password is incorrect');
        $hash = password_hash($next,PASSWORD_DEFAULT);
        $this->atomic(function () use ($username,$hash,$oldHash): void {
            $q = $this->db->prepare('UPDATE stage3_users SET password_hash = ? WHERE username = ? AND password_hash = ?'); $q->execute([$hash,$username,$oldHash]);
            if ($q->rowCount() !== 1) throw new Conflict('Password changed concurrently; sign in again');
            $q = $this->db->prepare('UPDATE stage3_access_users SET auth_version = auth_version + 1 WHERE username = ?'); $q->execute([$username]);
        });
    }

    /** The log stores operation metadata only; passwords, contents and tokens never enter it. */
    public function audit(string $actor, string $action, ?string $siteId, string $outcome, string $detail = ''): void
    {
        $q = $this->db->prepare('INSERT INTO stage3_audit (event_id,actor,action,site_id,outcome,detail,created_at) VALUES (?,?,?,?,?,?,?)');
        $q->execute(['event-'.bin2hex(random_bytes(12)),substr($actor,0,80),substr($action,0,180),$siteId,$outcome,$detail,$this->now()]);
    }

    public function auditLog(?string $siteId = null): array
    {
        $sql = 'SELECT event_id,actor,action,site_id,outcome,detail,created_at FROM stage3_audit';
        if ($siteId !== null) { $this->getDraft($siteId); $sql .= ' WHERE site_id = ?'; }
        $q = $this->db->prepare($sql . ' ORDER BY created_at DESC,event_id DESC LIMIT 200');
        $q->execute($siteId === null ? [] : [$siteId]); return $q->fetchAll(PDO::FETCH_ASSOC);
    }
}
