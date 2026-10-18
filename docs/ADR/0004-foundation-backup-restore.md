# ADR 0004 — Foundation snapshot is not a production backup

**2026-10-18 · Stage2 narrow test-only architecture decision.**

## Decision and implemented scope

The CMS must never advertise a one-table metadata snapshot as a full recoverable site backup. `cms/src/Storage/FoundationSnapshot.php` snapshots **only foundation schema v2/site identity and storage generation** into strict bounded JSON with SHA-256 for accidental corruption detection, **not proof of authenticity**. Test-only restores require explicit disposable CI/test environments and a separate, entirely empty target database. Existing targets, site ID conflicts, unknown fields and corrupt snapshots are rejected, and the source DB is not modified.

Current test evidence: [GitHub Actions #39134298097](https://github.com/manufact-test/ai-site-cms/actions/runs/39134298097) **7/7 PASS**, with SQLite 47 restoration assertions, two separate file-backed SQLite databases, MySQL 8.4 13 assertions using two independent disposable schemas, and PHP 8.1–8.4 compatibility. This is neither actual power-loss durability nor production recovery.

## Required production design later

1. A real backup must include a mutually consistent database snapshot and immutable published generation, media and site files, owner overrides, draft/revision/history, references and audit state, with an explicit policy for confidential user credentials.
2. Store backups outside the public document root. Encrypt or otherwise protect sensitive data, authenticate source and integrity via reviewed keys/signatures, provide retention and offsite copies, and never store secrets in GitHub.
3. Restore into a new isolated installation/version/database; verify every file/row and latest published pointer before explicit operator-controlled activation. Never destructively overwrite an existing installation as a hidden default.
4. Safe upgrades and rollback require tested on-disk versioning, data/schema migration strategy, concurrency checks, interrupted-MySQL-DDL fault handling and operator-reviewed recovery. MySQL DDL cannot be assumed to be transactional.
5. Fully validate on the real target PHP/shared hosting only after separately authorized read-only access; installation/deployment requires a distinct approval. Until then no production readiness claims.

**Stage2 NOT accepted, Stage3 NOT started, 0/135 product accepted.** No live Hostinger or CELIKOM changes. [Detailed implementation report](../STAGE-2-FOUNDATION-RESTORE.md).
