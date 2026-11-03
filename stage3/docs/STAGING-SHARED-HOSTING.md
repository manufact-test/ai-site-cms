> **CURRENT OVERRIDE — 03.11.2026:** FOX `mediumpurple-fox-175549.hostingersite.com` is **already installed**; the owner successfully logged in. The installation instructions below are historical and **must not** be repeated on the existing database or private directory. FOX still has older editor code. For a future separately authorized code-only update, use [the current rollback-safe release gate](FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md); never re-run `--plan`, `--apply`, installer or Cron. The code-only candidate is `434e5e39d786279c8eeef02fd718e44a0199f6c7` (CI [CI #41703286381 — SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41703286381)).

# Stage3 shared-hosting staging deployment

**Status:** isolated Hostinger staging preparation is underway. The owner-selected unconnected test site has the sibling layout and PHP CLI probe/preflight completed; no database, private runner config, `--plan` or `--apply` has been used. This runbook is not production approval.



## Current Hostinger staging checkpoint (2026-11-02)

- Selected target: `mediumpurple-fox-175549.hostingersite.com`, the separate test website that is not connected to Git. The other site, `lightseagreen-woodpecker-264491.hostingersite.com`, remains connected to the Stage2 branch and has not been changed.
- The owner extracted the prior sibling-layout package at account-home level. Active layout observed: sibling `stage3/` and `public_html/`; the public root contains only `index.php` and `.htaccess`, both mode `0444`. The original `default.php` was preserved outside the public root.
- Private directory `.stage3-private/` exists with exact mode `0700`. The account web-root scan found 31 candidate roots and wrote a private inventory file; the next setup helper will re-discover and compare the inventory before allowing `--plan`.
- Web PHP is set to 8.3. The owner-controlled Cron probe reports PHP CLI 8.2.35 with PDO, PDO MySQL, JSON, OpenSSL and mbstring available. The CLI/web version difference is acceptable for the current minimums.
- Temporary Cron jobs have been removed. No existing database was opened, no database was created or changed, no credentials were read, and no private runner config, `--plan` or `--apply` has been executed.
- The old runtime contains a temporary filesystem-preflight helper; it will be left in the retained backup when the updated runtime is installed. Do not run engine-integrity checks against that old runtime.

## 1. Deployment boundary

The next real-host exercise is an isolated **staging** installation of Stage3. It must use a dedicated staging subdomain, a dedicated empty MySQL 8.0+ or MariaDB 10.11+ database and a private directory that cannot be reached from the web. It must not share production credentials, data, document root, form endpoint or notification destination.

Do not deploy to production, change main, point a live domain at this branch, or import a client site until the owner separately approves that exact action.

Installation remains intentionally CLI-only. Hostinger shared/general SSH is off-limits; a private one-shot CLI runner is now implemented for an owner-controlled hPanel Cron command. It has been exercised against disposable MySQL 8 and MariaDB 10.11/11.8 in CI; the zero-credential `--probe` has also run on Hostinger. If hPanel cannot execute a custom PHP CLI command or the private paths cannot be isolated, stop. Do not expose install.php, engine.php, a shell bridge or a credential form over HTTP. Requirement #183 (browser-guided initial setup) remains separate and open.

## 2. Required topology

The Hostinger sibling-layout package is designed to be extracted at the account-home level, so the runtime and public document root are siblings:

- Runtime tree: the canonical account path to `stage3/`, containing `components/`, `media-motion/`, `server/` and `studio/`. It must remain outside every account web root.
- Public document root: the canonical sibling `public_html/` directory. It must contain exactly `index.php` and `.htaccess`, copied byte-for-byte from `stage3/server/public/` and read-only (0444).
- Private directory: an existing canonical directory with exact mode 0700, outside and not nested under the runtime tree or any account web root. The PHP web process and CLI installer must be able to access it as the same hosting account.
- Account web-root inventory: a complete owner-supplied list of 1–50 canonical web roots. It must include the Stage3 `public_html/` and every other active domain/subdomain root in the account. The runtime tree and private directory must not overlap any other web root.
- Database: one dedicated, empty MySQL 8.0+ or MariaDB 10.11+ database and its own least-privilege user. SQLite, older/unsupported versions and existing/non-empty databases are not supported for a hosted install.
- PHP: verify the web SAPI separately from CLI. Minimum PHP 8.1 (target 8.3) with PDO, PDO MySQL, JSON, OpenSSL and mbstring.
- TLS: valid HTTPS on the staging hostname before owner login or form tests. Protect staging with host-level password protection or an IP allowlist; noindex alone is not access control.

The source template directory `stage3/server/public/` is not the document root in this layout; it remains inside the private runtime tree. The installer verifies that the public sibling contains only the two exact front-controller files, with no symlinks, hard links, writable mode bits or extra entries.

The Stage3 public .htaccess uses Apache 2.4 / LiteSpeed-compatible mod_rewrite rules, DirectoryIndex and Options. LiteSpeed documents FallbackResource as unsupported and lists RewriteRule/RewriteCond, DirectoryIndex and Options as supported; Stage3 therefore uses rewrite rules and does not depend on FallbackResource, RedirectMatch or FilesMatch. The host must enable mod_rewrite and the Options, FileInfo and Indexes AllowOverride classes (including SymLinksIfOwnerMatch). The disposable CI Apache test proves Apache syntax and PHP request flow only; it does not certify the selected LiteSpeed/Hostinger version.

## 3. Before upload

1. Confirm a dedicated staging website/subdomain that is separate from all live sites; verify its current document root and the complete account web-root inventory.
2. Create a new, empty MySQL 8.0+ or MariaDB 10.11+ database and user for Stage3 only. Never reuse Stage2 or production credentials.
3. Confirm hPanel can run a custom PHP CLI command through Cron, then check CLI PHP version/extensions and the website's web PHP version/extensions separately.
4. Upload the CI artifact `ai-site-stage3-hostinger-sibling` and extract it at the account-home level, not inside `public_html/`. The extracted layout must be `stage3/`, `public_html/` and `cms-release.json` as siblings. Do not deploy this package through a Git integration whose repository root is `public_html`; that would put the private runtime under the web root.
5. Verify `public_html/` contains exactly `index.php` and `.htaccess`, and that the complete `stage3/` runtime is outside every other web root. Do not use symlinks to expose the repository root or move the document root to `stage3/server`.
6. Create the private directory outside the runtime tree and every web root, set it to exact mode 0700, and verify the hosting account's PHP process can read/write it. Never place it under `public_html/` or another public subdomain root.

All Stage3 runtime files must remain outside every other web-exposed document root on the hosting account. The parent tree must not be reachable through the primary domain or another vhost: the public-root .htaccess cannot protect sibling server files from a different vhost that exposes their parent. If the host cannot isolate this tree in this way, stop rather than relying on this .htaccess.

### Hostinger-specific preflight (only if Hostinger is selected)

- Hostinger currently documents SSH access for Premium Web and higher plans; Single Web plans do not include SSH. Confirm the exact plan before attempting the CLI installer: [SSH access requirements](https://www.hostinger.com/support/1583645-how-to-enable-ssh-access-in-hostinger/).
- Verify the web PHP version using hPanel PHP Info for the actual staging website/subdomain. The SSH command php -v reports the plan's CLI PHP and may not match a per-subdomain PHP handler: [checking the PHP version](https://www.hostinger.com/support/5920192-how-to-check-the-php-version-in-hostinger/).
- Hostinger allows selecting PHP 8.3 for a subfolder/subdomain through its handler rule, but that does not configure PHP extensions or options. Verify pdo_mysql, mbstring, openssl and other required extensions separately: [per-subdomain PHP version](https://www.hostinger.com/support/4047803-how-to-change-the-php-version-for-subfolders-or-subdomains-in-hostinger/).
- Hostinger documents public_html as the usual website root and says the home directory cannot be changed on Web/WordPress/Cloud plans. Use a separately provisioned staging website/root and prove that the non-public runtime tree cannot be reached through the primary domain: [website root directory](https://www.hostinger.com/support/1583494-what-is-the-path-to-your-website-s-root-home-directory-and-how-to-change-it-in-hostinger/).
- If the selected plan cannot execute the private hPanel Cron CLI runner or cannot isolate the runtime tree from every account web root, stop. Do not expose the installer over HTTP. Requirement #183 or a hosting-plan change is required first.

If the host cannot satisfy any of these conditions, do not relax the isolation checks. Record the exact blocker and stop.

## 4. CLI install

### 4.0 Read-only CLI capability probe

Before creating the private runner config, execute this one-shot hPanel Cron custom command:

    php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --probe

It requires no secrets, config or database and performs no writes. Continue only when the JSON status is `cli_ready_for_private_plan` and `cliPrerequisitesPassed` is true. A blocked result lists the missing PHP CLI extensions/files; stop and correct the environment rather than bypassing checks. This probe does not test the website PHP SAPI, database, web-root inventory, TLS or private storage. It does not authorize installation.

For a shared-host staging installation, use the private hosted runner. The low-level `install.php` path remains available for an independently approved private CLI environment, but it does not create the hosted account web-root topology receipt required by the staging-readiness gate.

### 4.1 hPanel Cron runner (Hostinger, no shared SSH)

See [HOSTED-INSTALL-RUNNER.md](HOSTED-INSTALL-RUNNER.md) for the exact private config schema, path inventory, security checks and recovery behavior.

The owner prepares:
- A private directory outside the runtime tree and every account web root, mode `0700`.
- `hosted-install-runner.json` inside that directory, mode `0600`, canonical JSON with the exact documented key order.
- A complete inventory of all account web roots, including the dedicated Stage3 public root.
- A dedicated empty MySQL 8.0+ or MariaDB 10.11+ database and fresh owner/form secrets. Never reuse Stage2 or production credentials.

Run a read-only plan as a custom PHP CLI command in hPanel Cron:

```sh
php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --config=/absolute/private/path/hosted-install-runner.json --plan
```

Use a one-time Cron execution for the plan and remove that entry immediately after it runs. Do not leave `--plan` recurring: a second plan is intentionally refused while its private review/state exists.

Review the complete redacted output. Proceed only when `state=install_required`, `applyAllowed=true`, `hostIsolation.ok=true`, and every database/filesystem check is clear. The output contains an `approvalFingerprint`; it does not print the installer's private approval token or credentials.

Only after a separate owner decision, create a separate one-time Cron entry and run the apply command with that exact fingerprint:

```sh
php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --config=/absolute/private/path/hosted-install-runner.json --apply=REPLACE_WITH_64_HEX_APPROVAL_FINGERPRINT
```

After success, the credential-bearing runner config and pending token state are removed, a private consumed marker and topology receipt are retained, and later recurring Cron invocations become silent no-ops. Remove the Cron entry manually in hPanel. If an `applying` marker remains without a valid consumed marker, stop and inspect the database; never delete the marker or rerun blindly.

### 4.2 Direct private CLI path (other explicitly approved hosts)

For an approved host with a private CLI environment, set the values below only in the process environment. Never put them in URLs, web forms, repository files, ZIP packages, screenshots, logs or chat messages.

- `STAGE3_DSN` — `mysql:host=...;dbname=...;charset=utf8mb4`
- `STAGE3_DB_USER` / `STAGE3_DB_PASSWORD` — dedicated staging database credentials
- `STAGE3_OWNER_USER` / `STAGE3_OWNER_PASSWORD` — initial staging owner; password at least 14 characters
- `STAGE3_FORM_SECRET` — random private HMAC secret, 32–1024 characters
- `STAGE3_FORM_ORIGINS` — exact HTTPS staging origin(s), comma-separated, no paths
- `STAGE3_FORM_ENDPOINT` — exact HTTPS staging collector origin; may remain empty until forms are configured
- `STAGE3_PRIVATE_DIR` — canonical private 0700 directory outside the web root
- `STAGE3_PUBLIC_ROOT` — exact canonical absolute path to `stage3/server/public`

Run the read-only plan first:

```sh
php stage3/server/bin/install.php --plan
```

Proceed only if the plan explicitly says `install_required`, `applyAllowed: true`, the database is the new empty staging database, the private/public paths are separate and all blocking checks are clear. Apply only with the exact token from that plan, in the same private CLI environment. The token is single-use and bound to the selected installation, including the database password hash.

A successful install creates the single-site schema (25 required tables), owner account, private runtime configuration, private pointer and installation receipt. The installer does not publish a site or deploy visitor content. For the hosted staging path, use the hosted runner so the account topology receipt is also created.

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
9. Open the owner-only read-only `/api/hosting/diagnostics` panel in Studio. It verifies the actual front controller, PHP/open_basedir access to runtime/private/upload paths, file-upload configuration, MySQL/MariaDB schema integrity, private topology, HTTPS, sessions and public-root policy. Also record PHP/web-SAPI version, MySQL/MariaDB server version, file ownership/permissions, response codes and any LiteSpeed/Apache differences. The diagnostic cannot discover web roots omitted from the owner-supplied account inventory.

Owner hands-on acceptance of the real Studio and the first connected site is still required. A green CI or a successful HTTP health check is not product acceptance.

## 6. Rollback and stop conditions

- Take an independent host/database backup before any staging installation or update.
- CMS engine rollback selects the previous verified immutable code slot. It does not silently restore the database.
- Visitor-site D3 release rollback is separate from CMS engine rollback.
- Full database snapshot restore is a separately guarded operation into an empty target database; never point it at production or assume a code rollback rewinds data.
- If routing, TLS, PHP web SAPI, MySQL/MariaDB, private-directory isolation, permissions, session cookies, owner login or backup verification fails, put the staging hostname behind access protection and stop. Preserve logs with secrets redacted.
- Do not delete a failed staging database or private snapshot automatically; obtain owner approval before destructive cleanup.

## 7. Owner inputs required for the real-host phase

Before the first remote staging operation, confirm the hosting provider, exact staging hostname/document-root path, the complete account web-root inventory, availability of a dedicated empty MySQL 8.0+ or MariaDB 10.11+ database, the exact external Git auto-deploy branch, and owner approval for the private hPanel Cron command. Credentials must be entered privately on the host; do not send passwords, private keys or approval fingerprints in chat.

The first target may be Hostinger if that is still the intended shared host, but the current CI Apache container is not evidence of Hostinger/LiteSpeed compatibility.
