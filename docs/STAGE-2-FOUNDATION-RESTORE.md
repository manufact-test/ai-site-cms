# AI Site CMS — Stage2 isolated foundation snapshot and restore, checkpoint v1.36

**Date:** 2026-10-18. **Stage2 remains IN PROGRESS, NOT accepted.** This is **test-only restoration of the EMPTY CMS foundation metadata**, NOT a real site/content/media/revisions backup or production recovery system.

## Working implementation

- `cms/src/Storage/FoundationSnapshot.php`: strict source-site check and read-only `export(siteId)`; bounded JSON snapshot of only `format`, `site_id`, `schema_version=2`, `storage_generation` and `sha256`. Source schema/journal must be valid before exporting. No user content, credentials, media or versions of generated sites are included.
- `verify(snapshot, expectedSiteId)`: exact key set and types, bounded payload, correct site, known schema, integer-string generation range, SHA-256 accidental corruption detection. **SHA-256 is NOT cryptographic author authentication or a signature**; anyone replacing both payload and checksum could forge it.
- `restoreToFreshCiDatabase(...)`: intentionally **only for disposable test DBs**. Requires explicit SQLite testing flags or exact disposable MySQL CI account/database/flag. Verifies snapshot before DDL and accepts only an absolutely empty dedicated target DB. Does not overwrite existing/foreign site data. Initializes v1/v2 migrations and site metadata through existing SchemaManager, writes generation and verifies byte-identical re-export against original.
- Does NOT add any HTTP/admin/write/backup endpoint. Does NOT silently repair interrupted MySQL DDL; a failed test restore can leave a partial *disposable target*, which must be discarded.

## Independently verified CI

[GitHub Actions run #39134298097](https://github.com/manufact-test/ai-site-cms/actions/runs/39134298097): **7/7 SUCCESS**, including php-core, SQLite, real ephemeral MySQL 8.4, and PHP 8.1/8.2/8.3/8.4 compatibility. Relevant outputs:

| Test evidence | Result |
|---|---|
| `cms/tests/backup-sqlite.php` | **47 assertions**: independent SQLite target DB, wrong site, extra/missing keys, corrupt checksum, future schema, oversized payload, invalid generation, foreign table, overwrite denied, source unmodified |
| Separate persisted SQLite source/target files | Tested with fresh PDO connections and saved JSON snapshot, both DBs retained correct matching metadata |
| `cms/tests/backup-mysql.php` | **13 assertions**: separate real MySQL schemas `ai_site_cms_ci` (source) and `ai_site_cms_restore_ci` (target), same v2 identity/version/generation, source preserved, second restore and wrong site denied |
| `cms/tests/setup-mysql-restore-ci.php` | Creates extra MySQL database **only** in guarded disposable CI using temporary root credentials; never a user-host action |
| Existing MySQL interrupted-DDL/foreign schema suite | **19 checks PASS**, still fail-closed |
| Browser/internal editor bundle | Last confirmed [#39134177442](https://github.com/manufact-test/ai-site-cms/actions/runs/39134177442): PASS, independent of restoration tests |

Real MySQL **8.4** was used; the target database belongs only to the ephemeral test container. This does not prove safe restoration of arbitrary MariaDB or production MySQL and does **not** simulate an actual server power failure.

## Remaining blockers and safety

- This tests a narrow foundation-only snapshot: site identity, schema version, one metadata counter. Full future CMS backups must cover pages, owners' settings, drafts, media/files, published revisions, audit, credentials policy and coherent point-in-time DB+filesystem state. They do not exist yet.
- Missing: production backup encryption/authenticated signature, offsite retention, operator-approved restore workflow, crash-consistent publication, real safe installer/versioned rollout/rollback, full transitive legal SBOM and NOTICE, live-host verification.
- Existing internal 425-file package is still **not a deployable production CMS**. Hostinger has **not** been touched; read-only inspection requires separate owner permission, deployment another permission.
- No CELIKOM/live customer sites or research branch were changed.

**Status unchanged:** Stage0 and Stage1 accepted; Stage2 ongoing and not accepted; Stage3 not started. 18 stages (0–17), 193 requirements = 135 required, 42 desirable, 16 excluded; **0/135 mandatory PRODUCT accepted**. No MVP: first release only after all 135 mandatory requirements pass.

See [ADR 0004](ADR/0004-foundation-backup-restore.md), [earlier fail-closed schema report](STAGE-2-RECOVERY-PREFLIGHT.md), [canonical handoff §41](NEXT-CHAT.md).
