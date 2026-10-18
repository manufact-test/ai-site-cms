# AI Site CMS — Stage 2 schema recovery preflight and foreign-DB protection (v1.35)

**18.10.2026.** Owner-selected A stack unchanged (PHP Slim4, Opis2.6, Jedison1.27.1). **Stage2 in progress, NOT accepted**. This deliverable is a fail-closed database initialization/diagnostic layer, **NOT a tested backup-and-restore system or a complete CMS**.

## New actual source

- [SchemaManager.php](../cms/src/Storage/SchemaManager.php) now **refuses to create even a schema migration journal in a database that has unrecognized application tables/views**. This prevents accidental first-installation over an existing WordPress-like database (for the narrowly recognized v1–v2 CMS schema). Future CMS tables must be explicitly added to the allowlist alongside future schema migrations. The rule is not a substitute for *dedicated DB credentials*.
- `SchemaManager::inspectSite($siteId)` performs a **read-only diagnostic snapshot**, without DDL/DML/recovery, and returns *only* `state`, `reason`, `version`, never site IDs, credentials or SQL error texts. States: `uninitialized`, `schema_ready_unbound`, `upgrade_required`, `ready`, `blocked`.
- [CLI preflight](../cms/bin/schema-preflight.php) requires `--inspect` plus explicit `CMS_DB_DSN` / `CMS_SITE_ID`. SQLite only in explicitly flagged test mode. Exit code **0** when ready, **3** for valid non-ready (uninitialized/upgrade needed), **4** for blocked, **2** for CLI/env/database argument failure. Unlike `bin/install.php --apply`, it does not change the database. No HTTP endpoint.
- This read-only inspection result is **an advisory moment-in-time snapshot**: it takes no exclusive migration lock, and cannot certify no concurrent change or that data is backed up. It is not an authorization for automated production installation.

## Real MySQL 8.4 fault simulations — verified

[**GitHub Actions #39132640890: all 7/7 jobs success**](https://github.com/manufact-test/ai-site-cms/actions/runs/39132640890) — PHP 8.1/8.2/8.3/8.4 matrix, existing php-core, SQLite and MySQL service. Dedicated MySQL fault script [storage-mysql-faults.php](../cms/tests/storage-mysql-faults.php) ran **19 additional assertions**:

1. A foreign WordPress-shaped `wp_posts` database rejects any CMS CREATE TABLE and retains the original existing data.
2. A v1 DDL table with **missing migration journal** blocks retry rather than dropping data.
3. An already-applied v2 ALTER with **no corresponding checksum journal row** blocks replay/repeated ALTER; journal and data remain available for operator recovery.
4. A successful site install passes preflight. Wrong site identity, v1/v2 journal gaps and unknown future schema entries produce blocked reports and/or refusals.
5. Fixture cleanup returns the ephemeral CI DB to an uninitialized state. No customer's DB is accessed.

**Very important guard:** destructive fixture setup/drop runs **only** with `CI=true`, explicit `CMS_ALLOW_DESTRUCTIVE_MYSQL_CI=1`, correct disposable database **`ai_site_cms_ci`**, correct account **`cms_ci`** and matching DSN. This must never be invoked against live hosting or reused for production recovery. The script *simulates interrupted states*, but **does not actually kill MySQL or establish power-failure durability**.

Separate SQLite CI evidence: **37 schema/negative tests**, **8 cross-process CLI installer + read-only preflight assertions**, all green. Safe code is actively tested on four PHP versions. The internal offline package now automatically re-tests when `cms/src/**` or Composer lock changes: [package/editor Actions **#39132844902** 1/1 PASS](https://github.com/manufact-test/ai-site-cms/actions/runs/39132844902).

## What is still missing

Fail-closed is an important refusal policy, **not a restoration mechanism**. A real production recovery path requires consistent DB and media backups, versioned integrity, a restore to a separate site/DB, verification of published revision pointers and owner overrides, a dry-run before cutover, operator-controlled rollback after interrupted MySQL DDL, and tested offsite retention under applicable policy. No such full CMS backup exists yet. MySQL DDL remains not uniformly transactional; existing tables, backups and checksums must be preserved until verified.

The target shared-host (Hostinger) has never been accessed or installed to, and the user's trust in tech choices does not grant access. CELIKOM/customer sites remain untouched; research branch unmerged. **Stage0+1 accepted, Stage2 not accepted, Stage3 not started. 193 total = 135 mandatory, 42 desirable, 16 not-needed; 0/135 product accepted; NO MVP.**

Next Stage2 work: build a deliberately *test-only* consistent empty-schema backup/restore rehearsal on disposable databases, define full CMS backup/upgrade/rollback contract before introducing mutable CMS data, and complete legal NOTICE/SBOM and release integrity attestations. Hostinger actual smoke needs separate read-only authorization.
