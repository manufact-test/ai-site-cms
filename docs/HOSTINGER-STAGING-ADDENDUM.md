# Hostinger Stage3 staging addendum

**Updated:** 2026-11-01  
**Scope:** deployment planning only. This addendum preserves the previously established Hostinger constraints; it is not permission to touch a host or deploy to production.

## Previously prepared test environment

Prior project setup records the following two isolated Hostinger test websites:

- CMS/staging candidate: lightseagreen-woodpecker-264491.hostingersite.com
- Independent visitor/test site: mediumpurple-fox-175549.hostingersite.com

The recorded hosting plan is Business Web Hosting. A separate Stage2 test database and private storage above public_html were prepared earlier. They are Stage2 resources: do not assume they are available for Stage3, and do not reuse Stage2 database credentials or GitHub environment secrets without separate owner approval.

## Observed Hostinger Git settings (owner screenshots, 01.11.2026)

The screenshots supplied by the owner show two different states:

- `lightseagreen-woodpecker-264491.hostingersite.com`: connected to GitHub repository `ai-site-cms`, auto-deployment enabled, watched branch `stage2-hostinger-cms-preflight`, deployment root `public_html`. The shown deployment was completed from commit `4d528287`.
- `mediumpurple-fox-175549.hostingersite.com`: no Git provider connected.

This is a screenshot observation, not a live re-check. Do not switch the connected site's branch, change its root, push Stage3 commits to the watched branch, or use this Git integration for the sibling-layout archive without a separate owner-approved scope. The Stage3 archive must be extracted above `public_html` so `stage3/` and `public_html/` remain siblings; deploying the repository directly into `public_html` would expose the private runtime.

## Access restrictions

- Shared/general SSH access is explicitly off-limits. Do not use it even if the hosting plan includes SSH.
- Do not use production database credentials, production files, client data, real notification destinations or the production domain.
- The existing GitHub environment named `stage2-hostinger-lab` belongs to the earlier Stage2 lab. Its secrets are not automatically authorized for Stage3.
- The external Hostinger Git auto-deployment setting is not visible from the GitHub repository. Confirm the exact watched branch before further pushes or any deployment. Do not assume `feature/stage3-ai-site-contract` is unwatched.
- The existing Stage2 workflows are not a Stage3 deploy mechanism:
  - `stage2-consented-hostinger-https.yml` is a bounded read-only HTTPS GET baseline on the two test domains.
  - `stage2-hostinger-live-preflight.yml` is read-only GET observation; no SSH, DB secrets, uploads or writes.
  - `stage2-hostinger-private-stage.yml` builds a credential-free offweb artifact and publishes a Git branch; it explicitly does not deploy to Hostinger and must never be selected as public_html.
  - `stage2-hostinger-target-php.yml` is a manually authorized read-only Stage2 observation on main.
- None of these workflows installs Stage3 or connects to the Stage3 database.

## Implemented no-shared-SSH candidate: private hPanel Cron runner

Hostinger documents hPanel Cron Jobs that can execute a PHP file or run a custom command/script:

- [How to set up a Cron Job](https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/)
- [How to set up a Cron Job with special characters](https://www.hostinger.com/support/5646919-how-to-set-up-a-cron-job-with-special-characters-at-hostinger/)
- [How to check Cron Job output](https://www.hostinger.com/support/5647075-how-to-check-the-output-of-a-cron-job-at-hostinger/)

A private CLI-only runner is implemented at `stage3/server/bin/hosted-install-runner.php`. Its two-step install behavior passed the disposable MySQL 8 CI probe, and its new zero-credential `--probe` passed the PHP 8.3 CI contract. **The runner has not been uploaded or executed on Hostinger**.

The runner:
1. Runs only under PHP CLI; HTTP execution returns 404.
2. Supports a zero-credential `--probe` command before private config creation. It checks PHP CLI prerequisites and runtime readability without DB/network access or filesystem writes.
3. Reads a canonical `hosted-install-runner.json` file (0600) from a private directory (0700) outside the runtime tree and every account web root.
4. Requires a complete owner-supplied inventory of 1–50 canonical account web roots, including the Stage3 public root.
5. Rejects overlap between private storage and any web root, and between the runtime tree and any other web root.
6. Runs a read-only `--plan`, stores the private approval token/state outside the web root, and prints only a redacted plan plus `approvalFingerprint`.
7. Requires a separate manually approved `--apply=REPLACE_WITH_64_HEX_APPROVAL_FINGERPRINT`; it recomputes the plan and refuses stale credentials/topology before any schema write.
8. On success, creates the 25-table schema and private topology receipt, removes credential-bearing runner config/state, and writes a private consumed marker. Later recurring invocations become silent no-ops; the owner must still remove the Cron entry manually.

Exact configuration and recovery instructions: [HOSTED-INSTALL-RUNNER.md](../stage3/docs/HOSTED-INSTALL-RUNNER.md).

Example command shape only. Run the read-only CLI probe first; it needs no secrets or config:

```sh
php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --probe
```

Then, after the private config is prepared, use the two-step plan/apply commands:

```sh
php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --config=/absolute/private/path/hosted-install-runner.json --plan
php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --config=/absolute/private/path/hosted-install-runner.json --apply=REPLACE_WITH_64_HEX_APPROVAL_FINGERPRINT
```

The command contains only the private config path and, for the separately approved apply, a plan fingerprint. Use a one-time Cron execution for `--plan`, delete that entry after its first output, then create a separate one-time entry for the approved `--apply`. Do not leave `--plan` recurring; the runner deliberately refuses a second plan while pending state exists. Do not put passwords, database DSNs, owner credentials, form secrets or the installer's private token into the command, Cron description, URL, logs, source control or chat.

The verified CI artifact `ai-site-stage3-hostinger-sibling` is produced by workflow #41340074041 (artifact 13097246593). It contains the `stage3/` runtime, the fixed two-file `public_html/` sibling, and `cms-release.json`; its build and verification are CI-only and do not deploy. Extract it at the account-home level, never into `public_html/`.

The runner is only a candidate route until the owner confirms the exact Hostinger account, custom-command capability, private paths and target. It does not create the Cron job, upload files, configure the domain/document root, DNS, TLS, PHP handler or notifications. If hPanel cannot execute the custom PHP CLI command or the runtime/private paths cannot be isolated, stop; do not create a public installer or shell bridge.

## Web PHP and document-root checks

- Verify the actual staging website/subdomain web SAPI through hPanel PHP Info. The CLI result from `php -v` may not match a per-subdomain PHP handler.
- Hostinger documents per-subdomain PHP version selection, but changing the handler does not automatically install required extensions or change all PHP options. Verify `pdo_mysql`, `mbstring`, `openssl`, JSON and PDO independently.
- Hostinger documents `public_html` as the usual website root and notes that the home directory cannot be changed on Web/WordPress/Cloud plans. The sibling layout is acceptable only when the complete `stage3/` runtime is outside every other account web root. If the primary domain or another vhost exposes the account-home parent (or any parent containing `stage3/`), stop and use a genuinely isolated website/account; the target site's `.htaccess` cannot protect files exposed by a different vhost.
- The Hostinger package uses the fixed sibling layout: account-home `stage3/` runtime plus `public_html/` document root containing only the matching read-only `index.php` and `.htaccess`. The template source remains at `stage3/server/public/` and is not itself the active document root.
- The private directory and all non-public runtime files must remain inaccessible over HTTP.
- After installation, the owner-only Studio diagnostics endpoint checks the actual front controller, PHP `open_basedir` path access, upload configuration, database/schema identity, topology receipt, HTTPS, session security and public-root policy. It cannot discover web roots omitted from the owner-supplied inventory.

Useful Hostinger references:

- [SSH access requirements](https://www.hostinger.com/support/1583645-how-to-enable-ssh-access-in-hostinger/)
- [Checking the PHP version](https://www.hostinger.com/support/5920192-how-to-check-the-php-version-in-hostinger/)
- [Per-subdomain PHP version](https://www.hostinger.com/support/4047803-how-to-change-the-php-version-for-subfolders-or-subdomains-in-hostinger/)
- [Website root directory](https://www.hostinger.com/support/1583494-what-is-the-path-to-your-website-s-root-home-directory-and-how-to-change-it-in-hostinger/)

## Required owner confirmation before Stage3 host writes

Confirm which of the two test websites is the intended Stage3 target, reconfirm that the connected site's screenshot-observed branch is still `stage2-hostinger-cms-preflight`, and whether the owner approves the dedicated one-shot hPanel CLI route and account-home-level archive extraction. Until then, continue GitHub-only development and disposable CI; do not upload files, run a Cron job, connect to MySQL or change Hostinger settings.
