# Stage3 — initial installation and private runtime configuration

**Status as of 01.11.2026 · isolated engineering only.** This document describes the implemented Stage3 installer. It is not a production deployment guide and does not authorize a live installation.

## Entry point and operating mode

`stage3/server/bin/install.php` is the current Stage3 single-site installer entry point. It is deliberately **CLI-only**; an HTTP request returns 404. The supported sequence is:

```sh
php stage3/server/bin/install.php --plan
php stage3/server/bin/install.php --apply=<64-character-token-from-the-current-plan>
```

`--plan` is read-only. It validates the environment and selected database and returns a one-time approval token only when the plan is eligible. `--apply` must receive the exact token from that plan. The token is bound to the selected installation configuration, including the database password hash; changing the database password invalidates the old token. Do not copy the token into tickets, chat, source control or persistent logs.

`stage3/server/bin/setup.php` is a CI-only fixture/bootstrap helper. It is not the hosted installer and must not be used as a substitute for `install.php`.

## Required environment and preflight

The installer reads private process environment values; it does not provide a public web form for credentials:

- `STAGE3_DSN` — dedicated database DSN. A hosted instance must use MySQL.
- `STAGE3_DB_USER` and `STAGE3_DB_PASSWORD` — database credentials; the user is required for MySQL.
- `STAGE3_OWNER_USER` and `STAGE3_OWNER_PASSWORD` — initial owner account; the password must be at least 14 characters.
- `STAGE3_FORM_SECRET` — private HMAC secret, 32–1024 characters.
- `STAGE3_FORM_ORIGINS` — exact allowed HTTPS origins for form submissions; no paths, credentials or query strings.
- `STAGE3_FORM_ENDPOINT` — exact HTTPS collector origin. It may be left unconfigured before forms are published; the plan warns that it must be configured before publishing forms.
- `STAGE3_PRIVATE_DIR` — an existing canonical writable directory with mode `0700`, outside the public document root.
- `STAGE3_PUBLIC_ROOT` — the canonical `stage3/server/public` document root for this installation.

Preflight requires PHP 8.1 or newer and `pdo`, `json`, `openssl`, `mbstring`, plus the matching PDO database extension. MySQL must be **8.0 or newer**; MariaDB and older MySQL are rejected. The selected database must be dedicated and empty for a new installation. The installer binds one independent Stage3 instance to that database; a second site cannot be created in the same instance.

SQLite is restricted to disposable CI/lab use and requires the explicit lab switch (`STAGE3_ALLOW_SQLITE_INSTALL=1`, or the CI environment). It is not the hosted database mode.

## What a successful apply creates

- A single-site identity record in the dedicated database.
- The initial owner account and the Stage3 schema.
- A private runtime configuration file (`config.json`) in `STAGE3_PRIVATE_DIR`.
- A small configuration pointer beside the server code (`private-config-path.json`) so the runtime can locate the private configuration without exposing its values.
- A private installation receipt and database lock state.

The private directory must remain outside the document root and have `0700` permissions. The credential-bearing config and pointer are written with `0600` permissions. `RuntimeConfig` verifies canonical JSON, exact fields, path isolation, file permissions, single-link files and SHA-256 integrity before loading the values into the PHP process.

On a later read-only plan, the installer inventories **25 required Stage3 tables** and reports missing tables as an incomplete installation. It does not silently reinstall over an existing database. The private receipt is checked for its exact schema, canonical JSON bytes, bounded size, permissions, regular-file identity and absence of hard links.

Database-scoped locking prevents concurrent apply operations. An invalid or stale approval token must not initialize the schema or write the receipt/configuration.

## Current validation and deployment boundary

- The CLI installer remains the single initial-install path: read-only --plan, then exact one-time --apply=<token>. It binds one Stage3 instance to one dedicated empty MySQL database, creates 25 required tables and persists private runtime configuration/receipt outside the document root.
- Requirements #184–185 (signed CMS engine update, private immutable slots, full 25-table snapshots, rollback and explicit recovery) are implemented on this feature branch. See docs/CMS-ENGINE-UPDATE-ROLLBACK-DESIGN.md.
- The stable public root now includes an Apache 2.4 / LiteSpeed-compatible .htaccess policy using mod_rewrite, hidden-path denial, disabled directory indexes and denial of stray executable/private files. It avoids FallbackResource, RedirectMatch and FilesMatch for LiteSpeed compatibility. The signed PHP-host package inventory retains this stable routing file.
- A disposable Apache 2.4 + PHP 8.3 container rehearsal is added to the Stage3 CI. It performs a CLI SQLite install in a temporary copy, then checks /studio, assets, /api/session, owner login, /api/sites, engine status and public-root protections. It is not a real-host deployment.
- The exact current branch CI result is recorded in the canonical docs/NEXT-CHAT.md. Do not treat the Apache rehearsal as passed until that exact-SHA run is green.

### Still open / not proven

- Requirement #183 remains open: there is no browser-guided installer. The current safe installation path requires SSH/CLI access and private process environment values.
- No real Hostinger/LiteSpeed or other shared-host Stage3 installation has been performed. Apache container evidence does not prove target-host FallbackResource, AllowOverride, PHP web-SAPI, open_basedir, filesystem ownership, MySQL privileges or OPcache behavior.
- No real staging hostname, database, site, SMTP/Telegram destination, customer data or production deployment has been contacted.
- CMS engine updates are schema-v1/code-only. Schema-changing packages remain blocked until reversible migrations are implemented.
- Formal owner acceptance remains 0/135. Stage 2 remains NO-GO; Stage 3 remains isolated engineering until owner hands-on acceptance and external gates close.

## Related implementation

- stage3/server/public/.htaccess — Apache shared-host route and public-root protection.
- stage3/server/public/index.php — stable public front controller.
- stage3/server/bin/install.php / Stage3Installer.php — CLI plan/apply and preflight.
- stage3/server/bin/engine.php / EngineLifecycle.php — owner engine update, rollback and recovery control plane.
- stage3/server/RuntimeConfig.php — private configuration writer/loader and integrity checks.
- stage3/tests/install-probe.cjs, mysql-install-probe.cjs, engine-update-smoke.cjs — disposable install/update probes.
- stage3/tests/shared-host-apache-smoke.cjs — disposable Apache/PHP HTTP rehearsal.
- STAGING-SHARED-HOSTING.md — staging deployment runbook.
- D8 form collector sidecar — optional visitor form receiver, not a CMS installer.

**Next target:** complete the exact-SHA Apache CI check, then perform a separately authorized Stage3 installation on an isolated real shared-host staging subdomain/database. Do not touch production. If SSH/CLI or a private directory outside the web root is unavailable, stop rather than weakening the installer.
