# Hostinger Stage3 staging addendum

**Updated:** 2026-11-01  
**Scope:** deployment planning only. This addendum preserves the previously established Hostinger constraints; it is not permission to touch a host or deploy to production.

## Previously prepared test environment

Prior project setup records the following two isolated Hostinger test websites:

- CMS/staging candidate: lightseagreen-woodpecker-264491.hostingersite.com
- Independent visitor/test site: mediumpurple-fox-175549.hostingersite.com

The recorded hosting plan is Business Web Hosting. A separate Stage2 test database and private storage above public_html were prepared earlier. They are Stage2 resources: do not assume they are available for Stage3, and do not reuse Stage2 database credentials or GitHub environment secrets without separate owner approval.

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

A private CLI-only runner is now implemented at `stage3/server/bin/hosted-install-runner.php`. It has passed the disposable MySQL 8 runner probe in GitHub Actions; **it has not been uploaded or executed on Hostinger**.

The runner:
1. Runs only under PHP CLI; HTTP execution returns 404.
2. Reads a canonical `hosted-install-runner.json` file (0600) from a private directory (0700) outside the runtime tree and every account web root.
3. Requires a complete owner-supplied inventory of 1–50 canonical account web roots, including the Stage3 public root.
4. Rejects overlap between private storage and any web root, and between the runtime tree and any other web root.
5. Runs a read-only `--plan`, stores the private approval token/state outside the web root, and prints only a redacted plan plus `approvalFingerprint`.
6. Requires a separate manually approved `--apply=REPLACE_WITH_64_HEX_APPROVAL_FINGERPRINT`; it recomputes the plan and refuses stale credentials/topology before any schema write.
7. On success, creates the 25-table schema and private topology receipt, removes credential-bearing runner config/state, and writes a private consumed marker. Later recurring invocations become silent no-ops; the owner must still remove the Cron entry manually.

Exact configuration and recovery instructions: [HOSTED-INSTALL-RUNNER.md](../stage3/docs/HOSTED-INSTALL-RUNNER.md).

Example command shape only:

```sh
php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --config=/absolute/private/path/hosted-install-runner.json --plan
php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --config=/absolute/private/path/hosted-install-runner.json --apply=REPLACE_WITH_64_HEX_APPROVAL_FINGERPRINT
```

The command contains only the private config path and, for the separately approved apply, a plan fingerprint. Do not put passwords, database DSNs, owner credentials, form secrets or the installer's private token into the command, Cron description, URL, logs, source control or chat.

The runner is only a candidate route until the owner confirms the exact Hostinger account, custom-command capability, private paths and target. It does not create the Cron job, upload files, configure the domain/document root, DNS, TLS, PHP handler or notifications. If hPanel cannot execute the custom PHP CLI command or the runtime/private paths cannot be isolated, stop; do not create a public installer or shell bridge.

## Web PHP and document-root checks

- Verify the actual staging website/subdomain web SAPI through hPanel PHP Info. The CLI result from `php -v` may not match a per-subdomain PHP handler.
- Hostinger documents per-subdomain PHP version selection, but changing the handler does not automatically install required extensions or change all PHP options. Verify `pdo_mysql`, `mbstring`, `openssl`, JSON and PDO independently.
- Hostinger documents `public_html` as the usual website root and notes that the home directory cannot be changed on Web/WordPress/Cloud plans. The Stage3 non-public runtime files must not be reachable through the primary domain or another vhost. If the only available layout exposes sibling server files, stop and design/test an explicit parent-host gate or use a separate isolated website/account.
- The public Stage3 document root must be exactly `server/public`. The private directory and all non-public runtime files must remain inaccessible over HTTP.
- After installation, the owner-only Studio diagnostics endpoint checks the actual front controller, PHP `open_basedir` path access, upload configuration, database/schema identity, topology receipt, HTTPS, session security and public-root policy. It cannot discover web roots omitted from the owner-supplied inventory.

Useful Hostinger references:

- [SSH access requirements](https://www.hostinger.com/support/1583645-how-to-enable-ssh-access-in-hostinger/)
- [Checking the PHP version](https://www.hostinger.com/support/5920192-how-to-check-the-php-version-in-hostinger/)
- [Per-subdomain PHP version](https://www.hostinger.com/support/4047803-how-to-change-the-php-version-for-subfolders-or-subdomains-in-hostinger/)
- [Website root directory](https://www.hostinger.com/support/1583494-what-is-the-path-to-your-website-s-root-home-directory-and-how-to-change-it-in-hostinger/)

## Required owner confirmation before Stage3 host writes

Confirm whether these two test websites remain the intended Stage3 target, which branch Hostinger auto-deployment watches, and whether the owner approves the dedicated one-shot hPanel CLI route. Until then, continue GitHub-only development and disposable CI; do not upload files, run a Cron job, connect to MySQL or change Hostinger settings.
