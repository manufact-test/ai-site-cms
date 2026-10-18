# ADR 0010 — Stage2 unified offline EMPTY-CMS operator install lifecycle

**Date:** 2026-10-18 · **Status:** architectural CI-only decision, **NOT production approval or Stage2 acceptance**.

## Decision

Separate a **read-only operator plan** from an explicitly approved **local test-only apply**:

1. `LabEmptyCmsInstaller::plan` checks bounded unsigned package inventory, independent CMS/site roots and five delivery families, exactly declared host flags, a dedicated private SQLite test DB path and site identity, and any pre-existing binding. A missing DB is reported without opening PDO or creating a file. The plan returns only abstract state (`install_required`, `binding_required`, `ready`), action, nonsecret opaque SHA256 intent digest, and nonproduction flags. No mutation/network.
2. `LabEmptyCmsInstaller::apply` requires explicit CLI invocation and the matching fresh plan digest. A private per-instance `flock` serializes apply, which **rechecks the plan after acquiring the lock**. Only an empty disposable SQLite site metadata v2 DB may be created; the binding file is created once outside both public roots after full checks. An already-ready same-site plan is a no-op. A stale token cannot silently reinstall.
3. If interrupted after database initialization but before binding, **the operator must run a new plan** and explicitly approve `binding_required`. Inconsistent/foreign/partial schema blocks; no dropping, overwriting, destructive auto-repair or guessed rollback.
4. Private database mode is protected by restrictive test umask and existing unsafe permissions are refused. A SQLite preflight of a missing DB reports `uninitialized` **without creating even a zero-byte file**.
5. Binding generation and startup remain explicitly `ci-bound` + `CMS_ENV=test` + `CMS_ALLOW_SQLITE_TEST_ONLY=1`. SHA256 fingerprints detect accidental changes but **DO NOT provide publisher authentication, operator authorization or production trust**. PHP website adapters and Next SSR execution are not implemented in this stage.

## Implementations

- `cms/src/Hosting/LabEmptyCmsInstaller.php` and `cms/bin/lab-empty-installer.php`: strict `--plan` / `--apply --approval=<digest>` CLI (requires all declared parameters). No HTTP installer route.
- `cms/src/Hosting/LabInstanceBinding.php` + existing read-only startup gate and sealed private instance record (prior stage).
- `cms/bin/install.php` and `cms/bin/schema-preflight.php`: SQLite-only CI permission/zero-byte-file handling aligned with the operator transaction.
- `cms/tools/test-stage2-full-empty-installer.cjs`: five isolated installation pairs (HTML, PHP, React SPA, Next static, declared Next SSR), full lifecycle, stale and cross-site plans, concurrent CLI attempts, changed package/schema, and actual loopback PHP HTTP. The Next SSR fixture checks declared runtime constraints only, **does not run Node/Next SSR**.
- Integration into `stage2-core-bootstrap.yml` PHP8.1–8.4 and MySQL/SQLite jobs and `stage2-static-editor.yml` compiled package/E2E matrix.

## Verified evidence (code HEAD)

- Commit `a4a211e6cb896e1145aa9dbe92423093c14fea48`.
- PHP CI: https://github.com/manufact-test/ai-site-cms/actions/runs/39162714187 — **7/7 SUCCESS**.
- Editor/package CI: https://github.com/manufact-test/ai-site-cms/actions/runs/39162714281 — **1/1 SUCCESS**.
- New unified operator E2E: **150 assertions**; earlier independent startup **102**, binding **100**, packaged install **54**. Internal distribution **453 files**, private editor assets only.

## Explicit limits and Stage2 exit

No real Hostinger or shared-host FPM/Apache/TLS test; **access needs the owner's separate permission even for read-only**. No production publisher keys/signature trust for this bootstrap, no full content/media/revision backups or production restoration, no authenticated admin, no real site adapters or independent Next SSR execution. Research fixtures, PHP built-in loopback and self-declared capabilities are **not evidence of production deployment compatibility**. Stage2 **in progress, not accepted**; Stage3 not started; product acceptance 0/135.

## Development discipline

See `docs/DEVELOPMENT-WORKFLOW.md` v1.42. The owner explicitly requested this checkpoint **in the current chat**, as an exception to the normal prohibition on frequent documentation updates; the next ordinary `продолжаем` must not update documents automatically. Always implement a genuinely large integrated package rather than stopping after one class/one CI.
