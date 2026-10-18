# AI Site CMS — Stage 2 CLI storage and reproducible dependency foundation (v1.32)

**18 October 2026**. Approved architecture direction A: PHP Slim 4 + Opis 2.6; Jedison 1.27.1 browser component is **not yet integrated**. Stage2 in progress; **not a public CMS release** and no mandatory product ID accepted.

## Implemented in real Stage2 code

- `cms/src/Storage/SchemaManager.php` provides **CLI-only schema management** for PDO MySQL/MariaDB target and explicit SQLite test mode. The installation belongs to **one approved `site_id` and a dedicated DB**. No global cross-site database is introduced.
- Migration #1: `cms_schema_migrations` journal (version/checksum/time) plus `cms_installation` singleton site row; migration #2: `storage_generation` counter initialized to zero. Forward-only journal, repeat-safe checks, absence/unknown future versions, checksum tamper, drift/partial-DDL refusal. This is a **foundation schema only**, not the full future revisions/media/security schema.
- `cms/bin/install.php --apply` requires CLI SAPI, explicit DSN, site ID and dedicated credentials; SQLite is allowed only with both `CMS_ENV=test` and `CMS_ALLOW_SQLITE_TEST_ONLY=1`. No HTTP installation route. No credentials are output by the installer; the DB DSN in this document is a disposable example, not a real secret.
- MySQL migration locking uses named `GET_LOCK` scoped to database; SQLite `BEGIN IMMEDIATE` with SQL COMMIT/ROLLBACK. The actual **MySQL DDL is not transactional**, so a crash after DDL but before journal insertion is refused on retry, requiring controlled recovery, not automatic `DROP` or silent reset. **No full power-loss/restore guarantee**.
- `cms/composer.lock` captured from an upstream install by GitHub Actions and committed. 14 exact PHP dependencies, [pinned package ledger](STAGE-2-COMPOSER-PINS.md), strict Composer validation and known-advisory audit. Source and license notices for distribution still require review.

## GitHub CI actual results

**[Run #39127678056](https://github.com/manufact-test/ai-site-cms/actions/runs/39127678056): 3/3 jobs completed SUCCESS.**

| Job | Verified output |
|---|---|
| php-core | Real Composer dependency installation, lock/declared license baseline **14 packages**, strict validate, composer audit **no advisories**, PHP lint, **10 health/no-write checks**, HTTP health 200 and publish route 404 |
| storage-sqlite | **27 checks** for sequential migrations, checked journal, wrong-site refusal, invalid site IDs, future version, drift, partial DDL, separately isolated site DB |
| storage-sqlite — extra CLI integration | **7 cross-process assertions** using file-based temporary SQLite database, first/repeated install, wrong-site/invalid ID/test grant refused |
| storage-mysql | Real MySQL **8.4** ephemeral CI service via PDO, migrate/install/repeat/isolation; **3 deliberate denied cases** (identity, downgrade, checksum) |

A previous failed SQLite test correctly detected that SQL `BEGIN IMMEDIATE` must be ended by raw SQL `COMMIT`/`ROLLBACK`, rather than `PDO::commit()` on this PHP driver. Fix is in main; later full CI is green. Tests run in **GitHub runner only**, **NOT** actual Hostinger, **NOT** stage 15 product acceptance.

## Reproducible CLI test procedure — never on a live site without authorization

```bash
cd cms
composer install --no-interaction --prefer-dist
composer validate --strict --no-check-publish
composer audit --no-interaction
php tests/dependency-lock.php
php tests/storage.php
php tests/installer-cli.php
# MySQL service CI only: CMS_TEST_MYSQL_DSN=... etc php tests/storage-mysql.php
```

The real CLI installer needs `CMS_DB_DSN`, `CMS_DB_USER`, `CMS_DB_PASSWORD`, `CMS_SITE_ID` and `--apply`; do **not** execute it against any production/current hosting without separate scope and explicit approval. SQLite test mode is forbidden as the claimed production architecture.

## Boundaries and next Stage2 tasks

1. Pin/package actual Jedison 1.27.1 static browser editor assets with offline Node build, lock/npm dependency and source license notices; show that **public** sites do not load CMS packages.
2. Independent DB installation/recovery strategy, backup/restore, multisite data isolation through distinct databases, MySQL interrupted-DDL/operator recovery procedure, production security model. Keep real admin/write endpoints **unregistered** until auth/RBAC/CSRF/session and full validation.
3. No actual shared-host install was made. User's delegation of technology decision is **NOT** Hostinger permission; target compatibility remains unverified until separately authorized read-only probe (and a further explicit install permission if ever required).
4. Reported Stage1 research exceptions remain unresolved for later stages: external independent other-model site plus manifest, full arbitrary HTML/JS trust boundary, latest snapshot durability under corruption.

**Unchanged:** stage0 accepted, stage1 accepted via delegated stack choice, stage2 in progress, stage3 not started. Requirements: 193 total, 135 mandatory, 42 desired, 16 not needed; **0/135 product accepted**, no MVP, Stage17 CELIKOM future and independent.
