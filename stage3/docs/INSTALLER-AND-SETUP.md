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

## CI evidence and current limits

Exact verified source: [`19a74e77c1acdfb43a7b3840f8e05bd10f2b0427`](https://github.com/manufact-test/ai-site-cms/commit/19a74e77c1acdfb43a7b3840f8e05bd10f2b0427). Full isolated workflow: [Actions #41302974827](https://github.com/manufact-test/ai-site-cms/actions/runs/41302974827) — `technology-runtime=SUCCESS`, `contract=SUCCESS`.

The workflow covers PHP 8.3, disposable SQLite and MySQL 8.4, independent database identities, refusal of non-empty databases, concurrent-install lock handling, schema completeness, private configuration reload in a fresh PHP process, receipt tampering/hard-link refusal, stale approval refusal and database-password-bound plan tokens.

**Not implemented or not proven:**

- There is no browser-based installation wizard. The current installer requires CLI access and private environment configuration; this does not yet satisfy a simple non-SSH shared-hosting setup on its own.
- This installer does not update the CMS engine and does not roll back CMS code versions.
- The D3 release manager rolls back an independently published visitor-site release in its disposable lab. That is not the same as upgrading or rolling back the CMS engine.
- Older signed-upgrade experiments under `cms/src/Release/Lab*` are isolated Stage2 lab components; they are not an integrated Stage3 CMS updater or permission to reuse them as production code.
- MySQL was tested in disposable GitHub Actions infrastructure, not on Hostinger or another real shared host.
- No real database, site, host, customer data or production deployment was touched.

Requirements #183–185 remain open for formal owner acceptance. In particular, do not mark #183 complete merely because the CLI installer exists.

## Related implementation

- `stage3/server/bin/install.php` — CLI plan/apply entry point.
- `stage3/server/bin/Stage3Installer.php` — preflight, approval token, database lock, schema and receipt checks.
- `stage3/server/RuntimeConfig.php` — private configuration writer/loader and integrity checks.
- `stage3/tests/install-probe.cjs` and `stage3/tests/mysql-install-probe.cjs` — disposable install probes.
- [D8 form collector sidecar](../runtime-export/D8-FORM-COLLECTOR-SIDECAR.md) — separate optional visitor form receiver package; not a CMS installer.

**Next development target:** inspect the existing `cms/src/Release/Lab*` signed-upgrade work and the current Stage3 server packaging before designing the CMS engine update/rollback path for requirements #184–185. Keep visitor-site release rollback and CMS-engine rollback as separate lifecycles.
