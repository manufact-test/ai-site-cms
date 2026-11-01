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
- The existing GitHub environment named stage2-hostinger-lab belongs to the earlier Stage2 lab. Its secrets are not automatically authorized for Stage3.
- The external Hostinger Git auto-deployment setting is not visible from the GitHub repository. Confirm the exact watched branch before further pushes or any deployment. Do not assume feature/stage3-ai-site-contract is unwatched.
- The existing Stage2 workflows are not a Stage3 deploy mechanism:
  - stage2-consented-hostinger-https.yml is a bounded read-only HTTPS GET baseline on the two test domains.
  - stage2-hostinger-live-preflight.yml is read-only GET observation; no SSH, DB secrets, uploads or writes.
  - stage2-hostinger-private-stage.yml builds a credential-free offweb artifact and publishes a Git branch; it explicitly does not deploy to Hostinger and must never be selected as public_html.
  - stage2-hostinger-target-php.yml is a manually authorized read-only Stage2 observation on main.
- None of these workflows installs Stage3 or connects to the Stage3 database.

## Possible no-shared-SSH CLI route: hPanel Cron Jobs

Hostinger documents hPanel Cron Jobs that can execute a PHP file directly or run a custom command/script. This may provide a controlled CLI path without using shared/general SSH:

- [How to set up a Cron Job](https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/)
- [How to set up a Cron Job with special characters](https://www.hostinger.com/support/5646919-how-to-set-up-a-cron-job-with-special-characters-at-hostinger/)
- [How to check Cron Job output](https://www.hostinger.com/support/5647075-how-to-check-the-output-of-a-cron-job-at-hostinger/)

This is only a candidate approach. It has NOT been implemented or executed for Stage3. Before using it, implement and review a private one-shot runner that:

1. Is stored outside every web-exposed document root.
2. Loads Stage3 environment values from a private file with restrictive permissions; credentials never appear in the cron command, URL, logs, source control or chat.
3. Runs only under CLI and refuses HTTP execution.
4. Supports a read-only --plan phase first; apply is a separate, owner-approved one-time action using the exact plan token.
5. Writes only redacted output to a private log and exposes no credentials or approval tokens.
6. Marks the one-time action as consumed and safely refuses repeated execution.
7. Is removed or disabled after the controlled staging operation.

Do not create a public PHP installer, web shell, generic command bridge or credential form to avoid the shared-SSH restriction.

## Web PHP and document-root checks

- Verify the actual staging website/subdomain web SAPI through hPanel PHP Info. The CLI result from php -v may not match a per-subdomain PHP handler.
- Hostinger documents per-subdomain PHP version selection, but changing the handler does not automatically install required extensions or change all PHP options. Verify pdo_mysql, mbstring, openssl, JSON and PDO independently.
- Hostinger documents public_html as the usual website root and notes that the home directory cannot be changed on Web/WordPress/Cloud plans. The Stage3 non-public runtime files must not be reachable through the primary domain or another vhost. If the only available layout exposes sibling server files, stop and design/test an explicit parent-host gate or use a separate isolated website/account.
- The public Stage3 document root must be exactly server/public. The private directory and all non-public runtime files must remain inaccessible over HTTP.

Useful Hostinger references:

- [SSH access requirements](https://www.hostinger.com/support/1583645-how-to-enable-ssh-access-in-hostinger/)
- [Checking the PHP version](https://www.hostinger.com/support/5920192-how-to-check-the-php-version-in-hostinger/)
- [Per-subdomain PHP version](https://www.hostinger.com/support/4047803-how-to-change-the-php-version-for-subfolders-or-subdomains-in-hostinger/)
- [Website root directory](https://www.hostinger.com/support/1583494-what-is-the-path-to-your-website-s-root-home-directory-and-how-to-change-it-in-hostinger/)

## Required owner confirmation before Stage3 host writes

Confirm whether these two test websites remain the intended Stage3 target, which branch Hostinger auto-deployment watches, and whether the owner approves the dedicated one-shot hPanel CLI route. Until then, continue GitHub-only development and disposable CI; do not upload files, run a cron job, connect to MySQL or change Hostinger settings.
