# Stage3 shared-hosting staging deployment

**Status:** deployment preparation only. No real host, DNS, staging subdomain, production database or customer data has been contacted by this work. This runbook is not production approval.

## 1. Deployment boundary

The next real-host exercise is an isolated **staging** installation of Stage3. It must use a dedicated staging subdomain, a dedicated empty MySQL database and a private directory that cannot be reached from the web. It must not share production credentials, data, document root, form endpoint or notification destination.

Do not deploy to production, change main, point a live domain at this branch, or import a client site until the owner separately approves that exact action.

The current installer is intentionally CLI-only. If the shared host does not provide a safe CLI/SSH path for installation, stop. Do not expose install.php, engine.php, a shell bridge or a credential form over HTTP as a workaround. Requirement #183 (guided initial setup) remains separate and open.

## 2. Required topology

- Web root: the exact canonical path to stage3/server/public and nothing above it.
- Public files: index.php and .htaccess only. The PHP server code, Studio assets, component registry, media-motion runtime, database, installation receipt, engine slots, signing trust, snapshots and backups remain outside the document root.
- Private directory: an existing canonical directory with mode 0700, outside and not nested under the public document root. The PHP web process and CLI installer must be able to access it as the same hosting account.
- Database: one dedicated, empty MySQL 8.0+ database and its own least-privilege user. MariaDB, SQLite and an existing/non-empty database are not supported for a hosted install.
- PHP: verify the web SAPI, not just CLI, is PHP 8.1+ (target 8.3) with pdo, pdo_mysql, json, openssl and mbstring.
- TLS: valid HTTPS on the staging hostname before owner login or form tests. Protect staging with host-level password protection or an IP allowlist; noindex alone is not access control.

The Stage3 public .htaccess uses Apache 2.4-compatible FallbackResource, mod_dir, mod_alias and FilesMatch rules; it does not rely on mod_rewrite. The host must permit AllowOverride Options Indexes FileInfo AuthConfig. The disposable CI Apache test proves the Apache configuration and PHP request flow only. It does not certify LiteSpeed/Hostinger compatibility; that must be tested on the selected target.

## 3. Before upload

1. Select and protect a staging subdomain that is separate from all live sites.
2. Create a new, empty MySQL 8.0+ database and user for staging only.
3. Confirm SSH/CLI access, PHP CLI version, web PHP version, required extensions, database version, open_basedir, file ownership and writable private storage.
4. Configure the subdomain document root to the canonical stage3/server/public directory. Do not use a symlink to expose the repository root or move the document root to stage3/server.
5. Upload the Stage3 runtime directories (components, media-motion, server, studio) while preserving their relative paths. The server/public directory is the only public directory.
6. Create the private directory outside the web root, set it to 0700, and verify the hosting account's PHP process can read/write it. Do not place it under public_html, a public subdomain root or a nested directory of the web root.

If the host cannot satisfy any of these conditions, do not relax the isolation checks. Record the exact blocker and stop.

## 4. CLI install

Set these values only in a private SSH shell or an approved hosting environment-variable facility. Do not place credentials in URLs, query strings, web forms, repository files, ZIP packages, screenshots or chat messages.

- STAGE3_DSN — mysql:host=...;dbname=...;charset=utf8mb4
- STAGE3_DB_USER / STAGE3_DB_PASSWORD — dedicated staging database credentials
- STAGE3_OWNER_USER / STAGE3_OWNER_PASSWORD — initial staging owner; password at least 14 characters
- STAGE3_FORM_SECRET — random private HMAC secret, 32–1024 characters
- STAGE3_FORM_ORIGINS — exact HTTPS staging origin(s), comma-separated, no paths
- STAGE3_FORM_ENDPOINT — exact HTTPS staging collector origin; may remain empty until forms are configured
- STAGE3_PRIVATE_DIR — canonical private 0700 directory outside the web root
- STAGE3_PUBLIC_ROOT — exact canonical absolute path to stage3/server/public

Run the read-only plan first:

    php stage3/server/bin/install.php --plan

Proceed only if the plan explicitly says install_required, applyAllowed: true, the database is the new empty staging database, the private/public paths are separate and all blocking checks are clear. Review the plan locally; never share or log its one-time token.

Then run the exact --apply=<token-from-that-plan> command in the same private CLI environment. The token is single-use and bound to the selected installation, including the database password hash. If the plan is stale, credentials changed or any check fails, rerun --plan; never bypass the refusal.

A successful install creates the single-site schema (25 required tables), owner account, private runtime configuration, private pointer and installation receipt. The credential-bearing configuration is outside the document root with restrictive permissions. The installer does not publish a site or deploy visitor content.

## 5. Staging acceptance sequence

Use only a disposable test site and test identities:

1. HTTPS GET /studio returns the server-backed Studio and first-party assets.
2. Unauthenticated GET /api/session reports no authenticated owner; GET /api/sites is denied.
3. Owner login succeeds; session cookie and CSRF protection work; owner can open the empty site workspace.
4. Desktop, tablet and mobile layout are inspected in a real browser.
5. Create a disposable site, save a draft, reload, publish to the staging hostname, verify the published route, then restore the previous visitor-site release.
6. Inspect the CMS engine version and trust state. Rehearse a signed schema-preserving engine update, verified 25-table snapshot, rollback and explicit recovery using a test release. Do not test schema migrations; they remain blocked.
7. Submit test forms only to a staging inbox. Verify conditional fields, spam/origin/HMAC rejection, stored lead, email to a test mailbox and Telegram to a test chat. No client notification destination is used.
8. Verify backup retrieval and a restore rehearsal into a separate empty staging database.
9. Record PHP/web-SAPI version, MySQL version, extensions, file ownership/permissions, open_basedir, response codes, upload limits and any LiteSpeed/Apache compatibility differences.

Owner hands-on acceptance of the real Studio and the first connected site is still required. A green CI or a successful HTTP health check is not product acceptance.

## 6. Rollback and stop conditions

- Take an independent host/database backup before any staging installation or update.
- CMS engine rollback selects the previous verified immutable code slot. It does not silently restore the database.
- Visitor-site D3 release rollback is separate from CMS engine rollback.
- Full database snapshot restore is a separately guarded operation into an empty target database; never point it at production or assume a code rollback rewinds data.
- If routing, TLS, PHP web SAPI, MySQL, private-directory isolation, permissions, session cookies, owner login or backup verification fails, put the staging hostname behind access protection and stop. Preserve logs with secrets redacted.
- Do not delete a failed staging database or private snapshot automatically; obtain owner approval before destructive cleanup.

## 7. Owner inputs required for the real-host phase

Before the first remote staging operation, confirm the hosting provider, exact staging hostname/document-root path, availability of a dedicated empty MySQL database, and the permitted access method (temporary SSH/SFTP or owner-run CLI commands). Credentials must be entered privately on the host; do not send passwords, private keys or plan tokens in chat.

The first target may be Hostinger if that is still the intended shared host, but the current CI Apache container is not evidence of Hostinger/LiteSpeed compatibility.
