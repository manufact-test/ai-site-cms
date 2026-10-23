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
            "CREATE TABLE stage3_publication_history (site_id $id NOT NULL, version $number NOT NULL, source_revision $number NOT NULL, body $big NOT NULL, published_at VARCHAR(35) NOT NULL, PRIMARY KEY(site_id, version))$tail"
        ];
        foreach ($schema as $sql) {
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
    }

    public function authenticate(string $username, string $password): bool
    {
        if (strlen($username) > 80 || strlen($password) > 1024) {
            return false;
        }
        $stmt = $this->db->prepare('SELECT password_hash FROM stage3_users WHERE username = ?');
        $stmt->execute([$username]);
        $hash = $stmt->fetchColumn();
        return is_string($hash) && password_verify($password, $hash);
    }

    public function listSites(): array
    {
        return $this->db->query('SELECT site_id, revision, updated_at FROM stage3_drafts ORDER BY site_id')
            ->fetchAll(PDO::FETCH_ASSOC);
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
            $body = self::encode($site);
            $stmt = $this->db->prepare('SELECT version FROM stage3_publications WHERE site_id = ?');
            $stmt->execute([$id]);
            $old = $stmt->fetchColumn();
            $version = $old === false ? 1 : ((int)$old + 1);
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
}
