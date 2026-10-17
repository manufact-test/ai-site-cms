# AI Site CMS — stage 1: PHP-only snapshot publication and rollback research

**Checkpoint:** v1.11 · 17.10.2026 · **Stage 1 research, NOT product code, NOT production-ready**

**Verification:** [GitHub Actions run #39059714864](https://github.com/manufact-test/ai-site-cms/actions/runs/39059714864), all applicable tests PASS, PHP 8.3.6 CLI and genuine Opis JSON Schema 2.6.0. Research branch [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison), **do not merge into main without owner decision**.

## 1. Why this probe exists

A previous research HTTP Hero used one published JSON snapshot. Direct file corruption caused HTTP 503. The owner needs editable sites that do not lose manual content or go offline because of a failed AI update. This research tests whether a limited PHP-only runtime could guard a published artifact separately from an admin/editor process, without requiring Node on the public PHP host.

This is **not** a settled architecture. The current real shared hosting has **not been tested**; permissions, PHP/extensions, web server, databases, uploads, backups, hosting limits and deployment access are unknown.

## 2. Probe and files (research branch only)

| File | Purpose |
|---|---|
| [public-runtime/published-hero.schema.json](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/published-hero.schema.json) | Draft 2020-12 schema for the published Hero sample |
| [public-runtime/snapshot-store.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/snapshot-store.php) | Strict PHP public reader, current→last-good fallback; basic independent runtime validation |
| [public-runtime/publish-cli.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/publish-cli.php) | CLI-only research writer, Opis validation, flock, temporary-file rename, immutable revision samples and rollback |
| [public-runtime/index.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/index.php) | Public PHP Hero, GET/HEAD only, HTML escaping, no admin/editor JS |
| [publish-rollback.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/publish-rollback.cjs) | Integration regression from Node client against PHP HTTP + PHP CLI, Node **not** required by PHP public runtime |
| [public-runtime.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime.cjs) | Previous baseline regression still runs after refactor |

**Research data flow:**

1. A CLI command reads a candidate JSON file from a separate input directory, not an HTTP POST to the public site.
2. The real upstream Opis 2.6.0 CompliantValidator validates against the Hero schema. A separate simple PHP validator constrains public output. Validation is **before** public mutation.
3. An exclusive advisory file lock serializes research CLI writers. A last-known-good snapshot of a valid current value is written before a new revision replaces the public pointer.
4. A new randomly named revision is stored in a separate revisions directory; temporary files are renamed on the same filesystem. The new current file is then atomically replaced, with a reread.
5. The public PHP renderer reads only the validated current.json or, if corrupt, the validated last-good.json. It **never** reads drafts or writes snapshots.
6. An explicit CLI rollback reads a validated, named stored revision and republishes it; arbitrary filesystem paths are rejected.

Test data directory was outside PHP document root on the CI runner. This placement is a prerequisite for a future design, **not proof of hosting access control**.

## 3. What PASS actually means

Recorded by #39059714864:

- Baseline previous HTTP and schema/UI research remains green.
- Seven forbidden inputs were rejected before public mutation: CSS-function string, extra injected property, incorrect type, oversized ASCII/Unicode, malformed JSON, oversized file.
- HTML-looking content is escaped as text, not parsed as active tags.
- Unicode text at 500 code points passes; 501 is rejected in the sample schema.
- Corrupted current.json returns **HTTP 200 with valid last-good content**; an unvalidated publish over corrupted current is refused pending explicit rollback.
- A deliberately damaged current **and** last-good pair yields **HTTP 503** (fail closed); rollback from a separate good revision restores public HTTP 200.
- Revision ID path traversal rejected.
- Four concurrent publisher processes all returned success under the advisory lock; a validated current and backup were found; prior revision files remained readable. This is **not a concurrency safety proof for production**.
- Public GET works with PHP alone; GET /admin = 404 and POST / = 405. The sample public HTML does not include editor JS.
- At the end of the probe, 11 generated version files were tracked across initial publishes, rollbacks, 4 concurrent writes, and final rollback. These are ephemeral CI files, not the product revision engine.

**Temporary failure during integration:** [CI #39059638142](https://github.com/manufact-test/ai-site-cms/actions/runs/39059638142) initially failed in the older public-runtime.cjs test because the refactored 503 body changed from “Published snapshot invalid” to “No valid published snapshot”. The expected string was corrected without weakening the HTTP 503 check. The next full run [#39059714864](https://github.com/manufact-test/ai-site-cms/actions/runs/39059714864) PASS.

## 4. Essential caveats before real CMS development

- **No production durable write guarantee:** temporary rename on one filesystem is helpful but there is no fsync, crash/power-loss test, replication, cross-filesystem guarantee, distributed lock, or object-store semantics. Advisory flock assumes cooperating writers.
- **Availability is conditional:** if both public and fallback copies are corrupt, HTTP 503. Recovery from the stored history requires the separate CLI process. There is no automatic remote backup or scheduled retention.
- **The current backup is one previous generation, not a verified offsite backup**. Successful publish could theoretically be interrupted between pointer/file operations; consistency across all files has not been formally established.
- **No authentication or secure admin API exists** in this harness. CLI access is not a substitute for product RBAC, CSRF prevention, sessions, audit, approval, rate limiting or authorization.
- **Opis installation happened in GitHub Actions**, not on Hostinger. For an ordinary PHP-only host, Composer dependencies might need to be assembled off-server and uploaded if chosen; actual compatibility with current host remains unknown.
- **Different validators need more schema parity:** the public-only reader uses a strict PHP sample validator; CLI uses it plus Opis. It is not proven equivalent for all Unicode/JSON Schema constructions. A production single-source schema/validation strategy needs design.
- **No actual database, uploaded images/files, advanced CSS, Next.js SSR, multi-user edits, CDN/cache purge, version conflict resolution or live traffic** were tested.
- **No performance/SLO, license audit, 135/135 acceptance or stack selection** is implied by PASS.

## 5. Precise continuation for next chat

Continue **stage 1 only**. Next contained research slice should test real representative multi-element PHP/React/Next-static-preview adapter boundaries (with honest Node SSR caveat), plus a comparable heavyweight RJSF scenario; or a carefully isolated smoke test on the owner's **existing** authorized shared PHP hosting, without changing its tariff. Then prepare actual foundation coverage matrix 135 mandatory IDs, remaining gaps and owner-facing basis for a future technology choice. Before starting stage 2, seek explicit owner acceptance of stage 1/foundation.

Files of record: [NEXT-CHAT.md](NEXT-CHAT.md), [STAGE-1-TEST-LOG.md](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md](FOUNDATION-COMPARISON.md), [FOUNDATIONS.md](FOUNDATIONS.md), [PROJECT-STATUS.json](../PROJECT-STATUS.json), [PROJECT-MAP.md](PROJECT-MAP.md), [ROADMAP.md](ROADMAP.md).

**Fixed project constraints:** 193 total requirements = 135 mandatory, 42 desirable, 16 unnecessary; first official release is complete only after real acceptance of 135/135, **no MVP**; existing PHP shared hosting is not upgraded; lawful permissive open-source reuse; project independent of CELIKOM, which is an independent stage-17 pilot after full CMS release. **Stage 0 accepted, stage 1 research ongoing/unaccepted, stage 2 not started.** Research code stays in research branch, main documentation only.
