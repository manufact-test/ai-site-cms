> **SUPERSEDING HOST STATUS — 03.11.2026:** The isolated FOX site has already completed Stage3 installation and owner login (see [live-host handoff](../handoffs/lead-integrator/HOSTINGER-LIVE-AND-ADMIN-UX-RESET-2026-11-03.md)). The setup steps below record 02.11 history; **do not reinstall, reset the MariaDB database, re-run hPanel Cron, or use the Stage2 Git deployment**. The current future path is a code-only reversible update requiring separate owner approval: [FOX release gate](../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md), current verified candidate `8b296f5712fa3ed15d239fc7195b775d0cf6aa02` ([CI #41715883449 SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41715883449), [dedicated FOX code-only artifact #13270565817](https://github.com/manufact-test/ai-site-cms/actions/runs/41715883449/artifacts/13270565817)); no live deployment was performed.

# Hostinger Stage3 staging addendum

**Updated:** 2026-11-02  
**Scope:** owner-operated isolated staging preparation only. This addendum records the Hostinger constraints and the actions completed on the separate test site; it is not production deployment approval.

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



## Owner-operated Hostinger staging preparation (02.11.2026)

- Target confirmed: `mediumpurple-fox-175549.hostingersite.com`, the separate test site with no Git provider connected. The connected Stage2 site remains unchanged.
- The prior sibling-layout package was extracted at account-home level. `stage3/` and `public_html/` are siblings; `public_html/` contains exactly `index.php` and `.htaccess`, both mode `0444`. The previous `default.php` was preserved outside the public root.
- hPanel shows Web PHP 8.3 and the required extensions enabled. The owner-controlled Cron probe reports CLI PHP 8.2.35, SAPI `cli`, PDO MySQL and all required extensions; status `cli_ready_for_private_plan`.
- A private `.stage3-private/` directory exists with mode `0700`. A filesystem preflight found 31 candidate account web roots and saved an inventory file; the repeated preflight refused to overwrite that existing inventory. The new setup helper re-discovers the standard Hostinger roots and compares them before preparing the runner config.
- All temporary Cron entries have been removed. No existing database was opened or changed, no new database has yet been created, no secrets were read, and no `--plan` or `--apply` was run.
- Hostinger Web/Cloud uses MariaDB. Stage3 now explicitly supports MySQL 8.0+ and MariaDB 10.11+ through PDO MySQL; CI validates both MariaDB 10.11 and 11.8, plus the existing MySQL 8.4 path. Full CI #41414660469 is SUCCESS, all four jobs green.
- The latest update archive is built from artifact `13127730026`; it intentionally excludes `public_html/` so the currently verified public files remain untouched. The old runtime will be retained as a rollback backup.

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

A private CLI-only runner is implemented at `stage3/server/bin/hosted-install-runner.php`. Its two-step install behavior is covered by disposable MySQL 8 and MariaDB 10.11/11.8 CI. The zero-credential `--probe` has been executed on the owner-selected Hostinger test site and returned `cli_ready_for_private_plan`; the private config, `--plan` and `--apply` have not been executed there.

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

The latest verified CI artifact `ai-site-stage3-hostinger-sibling` is produced by workflow [#41414660469](https://github.com/manufact-test/ai-site-cms/actions/runs/41414660469) (artifact `13127730026`). It contains the `stage3/` runtime, the fixed two-file `public_html/` sibling, and `cms-release.json`; its build and verification are CI-only and do not deploy. Extract it at the account-home level, never into `public_html/`.

The owner has selected the exact isolated test site, confirmed the hPanel custom-command capability and prepared the initial sibling/private layout. The read-only install plan remains pending. The runner does not create the Cron job, upload files, configure the domain/document root, DNS, TLS, PHP handler or notifications. If the next private inventory/config checks cannot prove isolation, stop; do not create a public installer or shell bridge.

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

## Next staging actions

The owner selected `mediumpurple-fox-175549.hostingersite.com` as the isolated Stage3 target and approved using the owner-operated browser/File Manager and hPanel Cron route. The connected `lightseagreen-woodpecker-264491.hostingersite.com` remains untouched on its Stage2 branch. Next: replace the old runtime with the verified MariaDB-compatible package while preserving `public_html/`, create one new dedicated empty Stage3 database, prepare the private runner config from the saved account-root inventory, and execute read-only `--plan`. `--apply` remains a separate explicit owner decision.
