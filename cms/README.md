# AI Site CMS — Stage 2 PHP foundation (INTERNAL, NOT A RELEASE)

**As of checkpoint v1.32 (18.10.2026):** Slim read-only HTTP `GET /api/health` + **CLI-only** isolated PDO MySQL schema/install framework; SQLite **test-only**. This is not an admin panel or working site CMS. No authentication, edit/save/publish API, revisions engine, media, production backup, or site adapters yet. **0/135 product requirements accepted**. Do not deploy to a client site.

## Reproduce on developer machine / GitHub CI (never claim this tests Hostinger)

Requires PHP >=8.1 as provisional development floor, JSON/PDO + PDO_SQLITE for tests, PDO_MYSQL for MySQL test service; Composer for **offline development/build** only, not intended live hosting requirement.

```bash
cd cms
composer install --no-interaction --prefer-dist
composer validate --strict --no-check-publish
composer audit --no-interaction
php tests/dependency-lock.php
php tests/storage.php
php tests/installer-cli.php
composer test
php -S 127.0.0.1:8086 -t public public/index.php
# separate terminal: curl -i http://127.0.0.1:8086/api/health
```

The MySQL CI integration test runs against the dedicated disposable mysql:8.4 service defined in [workflow](../.github/workflows/stage2-core-bootstrap.yml) and receives disposable `CMS_TEST_MYSQL_*` values, never live credentials.

## Security and installation boundary

- Public webroot is **cms/public**, never the whole `cms/`; PHP `src`, `vendor`, future `storage`, backups and secrets stay outside it.
- Only `GET /api/health` is exposed and contains fixed nonsensitive JSON; any `admin/publish/write` URL remains **unregistered**. No auth is safe only because no writable/admin routes exist.
- `bin/install.php` is CLI-only and requires explicit `--apply`, `CMS_DB_DSN` for **a new dedicated DB**, credentials and `CMS_SITE_ID`. It creates/updates schema and must never be run against live Hostinger without separate permission.
- MySQL is the intended DB, SQLite only in explicit test mode. MySQL DDL cannot be assumed transactional. If an interrupted DDL doesn't match the journal, fail closed; manual recovery, not destructive auto-healing.
- `composer.lock` pins 14 runtime PHP packages; `tests/dependency-lock.php` verifies declared licenses and known versions; license/NOTICE and SBOM review is still needed before distribution. Jedison browser bundle is NOT yet present.
- No live Hostinger access or CELIKOM interaction approved or performed.

See [Stage2 real-CI report](../docs/STAGE-2-STORAGE-RESEARCH.md), [Composer ledger](../docs/STAGE-2-COMPOSER-PINS.md), [hosting/storage architecture ADR](../docs/ADR/0002-hosting-storage-isolation.md), [canonical handoff](../docs/NEXT-CHAT.md).
