# AI Site CMS — Stage 2 unified signed-release / PHP / DB upgrade laboratory

**Checkpoint:** v1.39 · **Date:** 2026-10-18 · **Status:** Stage2 IN PROGRESS, NOT ACCEPTED. Stage0+1 accepted; Stage3 not started. Product acceptance **0/135 required**. No Hostinger access, live data, production installer, CMS admin or publishing.

## New integrated laboratory path

`cms/src/Release/LabTrustedUpgradeCoordinator.php` now provides one explicitly gated Stage2 **CI-only** entry point:

1. **PHP Ed25519 signature verification** of an offline ZIP envelope via `OfflineReleaseVerifier::verify`, requiring a public-key PEM and SHA-256 fingerprint provided out-of-band, exact requested version, and independently retained minimum version.
2. **Restricted Python ZIP extractor** `cms/tools/safe-offline-archive.py` extracts into an empty ephemeral directory, before calling the PHP coordinator. The coordinator independently checks all extracted files against the signed inventory manifest digest, including unexpected files and executable paths; the signed ZIP hash is checked again by PHP. Neither this extractor nor the coordinator is a production installer.
3. **Independent DB foundation checkpoint** `LabSchemaVersionGate::assertCheckpoint`: site identity, migration history/checksums, initialization lineage, and `storage_generation`. The checkpoint must come from an independent operator source; it does **not** hash business content, pages, revisions or media.
4. **Coordinated stage/activation**: acquire cooperative migration mutex / SQLite immediate transaction, revalidate DB checkpoint and package; compare expected-current and sequence before staging; PHP `LabPackageStager` puts code in a new temporary slot; `LabPhpGenerationSwitcher` registers, verifies and switches the generation via CAS while holding the PHP process lease. No live document root is changed. Bad signatures, tampered ZIP, post-extraction corruption, wrong publisher key, wrong DB checkpoint, outdated CAS, unsupported version floor and DB drift fail closed before activation.
5. **Independent read gate**: separate PHP processes can check a particular generation against the externally retained DB snapshot. Existing laboratory crash/recovery simulations cover journal precommit and postcommit, concurrent loopback HTTP requests, SIGKILL, SQLite uncommitted rollback and real MySQL cooperative migration locks.

Important distinction: this is an **integrated preferred laboratory entry point**, not an enforced production API. Older direct lab functions `LabPhpGenerationSwitcher::switchTo` and `switchToWithSchema` remain accessible in tests; **there is no production activation entry point to secure yet**. Future production operator must not expose a bypass and must persist release provenance and DB checkpoint independently and durably.

## New tests and evidence

- `cms/tools/test-lab-trusted-upgrade.cjs`: disposable Ed25519 keypair and two genuine signed ZIP archives; safe extraction and isolated SQLite; independent PHP CLI coordinator processes; negative cases for wrong pin, minimum floor, cross-version checkpoint, stale generation, editor corruption, ZIP tampering, storage_generation drift and read-side mismatch. Runs against synthetic minimal inventory on core PHP 8.1–8.4 and **full compiled 429-file internal package** in editor CI.
- `cms/tests/fixtures/trusted-upgrade-operator.php`: explicit CLI-only bridge; ephemeral exact-path SQLite fixture, never a web endpoint.
- Previously completed: `cms/tests/lab-foundation-checkpoint.php` real SIGKILL of an uncommitted SQLite writer; `cms/tests/lab-schema-gate-mysql.php` real isolated MySQL 8.4 named-lock and checkpoint tests; `cms/tools/test-lab-php-http-switch-crash.cjs` live concurrent loopback HTTP requests / operator SIGKILL recovery; `cms/tests/lab-generation-leases.php` real cross-process flock.
- **PHP matrix + SQLite + MySQL:** [7/7 SUCCESS, run 39149669381](https://github.com/manufact-test/ai-site-cms/actions/runs/39149669381).
- **Editor, Chromium, full signed ZIP + PHP code and DB:** [1/1 SUCCESS, run 39149669508](https://github.com/manufact-test/ai-site-cms/actions/runs/39149669508).
- **Source code checkpoint before documentation:** `6ca20882232d262a2fe37b909918a7ac68d7f287`. Subsequent documentation commits advance HEAD without rerunning code-triggered CI.

## Accepted boundaries and unresolved work

**Not proven / forbidden to claim:** true PHP-FPM/Apache/OPcache safety and serving real traffic; true power-cut/fsync durability and remote/multi-host locks; whole-site data/media/revisions migrations, backups and rollback; atomically committed code and MySQL DDL/DML; anti-tamper external trust storage; permanent publisher signing keys or SLSA attestations; production deploy readiness, auth/admin/publish, full requirement acceptance. SQLite transaction and MySQL GET_LOCK checks only protect cooperating processes in the ephemeral runner. SQLite foundation snapshots do not solve user-content consistency.

**Next Stage2 work (no Stage3 yet):** formal production-path design with non-bypassable release gate, independently maintained signed provenance and monotonic trust state; hardened crash state and backup/rollback plan, real shared-host read-only preflight on a separately approved test environment; additional long-lived/HTTP PHP-FPM OPcache acceptance research only with new explicit owner consent for target host. Do not touch Hostinger (including read-only) or client sites, CELIKOM, or merge research branch.

**Documentation rule:** only batch-update after major work or explicit user request, not after every small chunk. Permanent chat handoff: `docs/NEXT-CHAT.md` section 44.
