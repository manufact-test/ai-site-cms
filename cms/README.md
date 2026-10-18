# AI Site CMS — Stage 2 empty PHP kernel (INTERNAL ONLY)

**Not a CMS release.** This initial foundation contains a Slim HTTP app with exactly **one GET-only health endpoint**, no authentication, no editing, no storage, no site adapters and **no write operations**. The lack of auth is deliberately safe only because *there are no admin routes yet*. Do not deploy this or a future write route without the security stage.

## Local reproducibility (developer/CI, not actual Hostinger evidence)

Requires PHP **8.1+** with JSON and Composer locally/CI. Target hosting PHP version is **unverified**; this is a provisional lower bound, not a hosting upgrade authorization.

```bash
cd cms
composer validate --no-check-publish
composer install --no-interaction --prefer-dist
composer test
php -S 127.0.0.1:8086 -t public public/index.php
# Separate terminal: curl -i http://127.0.0.1:8086/api/health
```

- `GET /api/health`: returns only `{"status":"ok"}`. Other routes are not registered.
- The PHP document root must be **cms/public/**; Composer vendor, secrets, source and data must stay outside the public root.
- `vendor/` and generated runtime secrets **must not be committed**.
- Dependencies are constrained in composer.json but **transitive dependencies are not locked until a committed composer.lock is generated and verified**. No license/SBOM attestation yet.
- Deployment, DB, authorization, real editors, migration, rollback, backup, audit and safety are **not implemented**.

Architecture decisions: [ADR 0001](../docs/ADR/0001-selected-foundation.md), [ADR 0002](../docs/ADR/0002-hosting-storage-isolation.md), [ADR 0003](../docs/ADR/0003-preview-adapter-boundaries.md). Full release remains blocked until 135/135 mandatory acceptance; this is only an internal construction checkpoint.
