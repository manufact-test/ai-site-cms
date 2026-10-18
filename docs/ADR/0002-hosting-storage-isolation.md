# ADR 0002 — PHP runtime, storage boundaries, lifecycle and data ownership

**18.10.2026 · APPROVED ARCHITECTURAL DIRECTION, hosting compatibility still unverified.**

## Runtime split

```text
AI creator -> original site source + complete manifest + reviewable generated defaults
                                      |
                            CMS-owned typed adapter boundary
                                      |
       per-site PHP shared-host CMS instance (Slim API + Opis validation)
        |             |            |                |
   authenticated     drafts      revisions        media & audit
   admins and ACL       |            |                |
        +----> validated explicit publication transaction ----> immutable/safe public snapshot
                                      |
                       independent public site runtime
   HTML/CSS/JS | PHP | React static export | Next static export
```

The public site never downloads admin bundles or requires live CMS services. Next.js SSR and app server functions require their **own host runtime**; PHP-only hosting does NOT satisfy it. Node is only for asset compiling in this CMS architecture.

## Hosting baseline

Primary intended deployment: PHP >=8.1 (provisional compatibility floor), HTTPS, PHP JSON, PDO MySQL/MariaDB driver, adequate file permissions and web root pointed to `cms/public`. Select **PDO MySQL/MariaDB as primary for state**, with **PDO SQLite as an optional local test adapter**; do not claim equivalent transaction/failure semantics. This is a **choice subject to read-only verification on existing Hostinger**; if not supported, reconsider the implementation *within the current tariff* before requiring an upgrade. Composer runs only in developer/CI, distributable will include vendor + built JS; Node and Composer on production host not assumed.

## Data contracts (planned, not implemented)

- Separate site identity and own credentials/DB tables/files/migration state; one CMS per site, no global shared data/control keys.
- Schema/manifest/revision IDs are stable and signed or otherwise authenticated according to the later security design. Never rely on SHA256 hashes as attacker-authentication proof.
- Draft and published revisions are distinct; `Save` is never `Publish`. Store owner overrides separately from regenerated defaults; detect ID/type conflicts before publication.
- Publish via DB transactional pointer to a validated durable generation; blob/media staging and fsync/retention/atomic filesystem behavior require explicit research and fault tests. `last-good` in research v1.29 can lose last published state; no production silent rollback to stale version.
- Backup + restore + cross-process/multiadmin consistency must be verified on the supported DB/filesystem and failure scenarios; no automatic trust in PHP CLI lab results.
- No real secret values in source repo; `public` webroot must not expose source, DB, vendor, private uploads, revisions or keys.
- Auth/session/CSRF/rate limits/security headers/audit and privilege boundaries are mandatory before introducing real writable admin endpoints. If auth is not implemented, no edit/publish APIs are registered.

## Migration and safety rules

Versioned forward-only schema migrations and validated rollback, DB migrations before feature enable, independent release package updates preserving site data, mandatory restore test before changes. Installer/upgrader and hosting smoke remain Stage2 exit work. No customer sites, CELIKOM or Hostinger access authorized by this ADR.

## Implementation update v1.32 — still only an internal foundation

The selected MySQL/MariaDB-primary/SQLite-test-only direction now has real code: [SchemaManager](../../cms/src/Storage/SchemaManager.php), CLI-only [installer](../../cms/bin/install.php), [CI tests](../STAGE-2-STORAGE-RESEARCH.md). MySQL8.4 migration and isolation tested via a GitHub ephemeral service, SQLite schema and distinct process installations tested, pin checksum validated. However production publication transaction, auth, backups, partial MySQL DDL recovery, real Hostinger environment, and full AI manifest remain **UNVERIFIED**; the earlier "planned" items above still require Stage2+ engineering. No HTTP write endpoints enabled, Stage2 NOT accepted.


## v1.34 test evidence without target-host permission

Read-only `cms/bin/doctor.php` validates PHP 8.1+, required extensions and an explicitly supplied public document root without network/DB/filesystem writes. GitHub Actions PHP 8.1/8.2/8.3/8.4 passed [7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39131771955), **not actual Hostinger compatibility**. An internal 425-file prebuilt archive preserves PHP vendor dependencies and Jedison JS under private folder only, with SHA-256 manifest (not authenticated signature) and isolated webroot HTTP check [PASS](https://github.com/manufact-test/ai-site-cms/actions/runs/39131661335). Real hosting docroot controls, safe installation/backup/upgrade, complete license legal due diligence, auth and real site integration remain future tasks. [Details](../STAGE-2-HOSTING-AND-PACKAGE.md).


## Implementation v1.35 — no automatic recovery from corrupted/incomplete migrations

Stage2 adds `SchemaManager::inspectSite` with a separate read-only CLI report and explicit dedicated-database table allowlist. Ephemeral MySQL8.4 negative tests prove refusal of foreign schema and incomplete v1/v2 journal, **not** genuine backup/restore or crash-recovery. [Proof/report](../STAGE-2-RECOVERY-PREFLIGHT.md), [CI 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39132640890). Operator must preserve original data and seek reviewed backup/restore plan; never silently reset migration journal. Target Hostinger untested. Stage2 remains unaccepted.


## Update v1.36 — isolated foundation metadata restore is NOT full production backup

A new [FoundationSnapshot.php](../../cms/src/Storage/FoundationSnapshot.php) can serialize validated site identifier/v2 schema/storage generation and rehearse restoration in a separate **test-only** empty SQLite or dedicated MySQL CI database. [CI 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39134298097) includes SQLite47 and MySQL13 restoration assertions. This does **not** fulfill CMS site/media/owner changes backups, authenticated restore, offsite retention, live DDL recovery or Hostinger compatibility. [ADR0004](0004-foundation-backup-restore.md) and [report](../STAGE-2-FOUNDATION-RESTORE.md). Stage2 is still NOT accepted.
