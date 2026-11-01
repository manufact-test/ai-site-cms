# MANUFACT AI Site CMS — Lead Integrator Handoff v9.12

**Date:** 2026-11-01  
**Role:** Lead Integrator. Continue the existing Stage3 branch; do not restart CMS development or mix this role with Design Factory / SEO work.

## 1. Repository and verified state

Repository: https://github.com/manufact-test/ai-site-cms  
Working branch: feature/stage3-ai-site-contract  
Last fully CI-tested functional HEAD: 0047aef57537f7dd2c405eadcc44f4f54ab6aa8d  
Full CI: [#41322050889](https://github.com/manufact-test/ai-site-cms/actions/runs/41322050889) — SUCCESS for contract and technology-runtime.

The user-provided SHA 974909d502099b170beafa6806c6e1bc92378c78 was already 10 commits behind the live feature branch when this work began. The live branch was continued; no reset was performed. Main was not modified or merged.

The current handoff/documentation commit is a documentation-only follow-up after the tested functional HEAD. No runtime code changed after 0047aef.

## 2. Work completed in this block

### Owner login recovery

- Run #41318864811 failed because the site-tools dialog remained open after logout and intercepted the next login click.
- Logout now closes siteToolsDialog; the browser regression asserts the dialog is closed.
- Run #41319549488 passed after the fix.
- Owner recovery after a first-site HTTP 503 remains covered. The browser test waits for GET /api/engine HTTP 200 and the rendered version label; it no longer races the asynchronous refresh.

### Shared-host routing and package

- Stage3 public .htaccess uses mod_rewrite, DirectoryIndex and Options.
- It avoids FallbackResource, RedirectMatch and FilesMatch; this is deliberate for LiteSpeed compatibility.
- Hidden path segments, direct PHP execution except index.php, private/config/database file extensions and directory listing are blocked.
- Application paths are routed to the stable index.php front controller.
- .htaccess is included in the required signed PHP-host package inventory and EngineReleaseVerifier allowlist.
- The live public-root .htaccess is a stable host configuration file; engine slot activation/rollback does not update the live web-server configuration. It must be provisioned and verified separately.

### Apache smoke

- Added a disposable PHP 8.3 + Apache 2.4 container test.
- It installs Stage3 into a temporary copy using CLI SQLite; no host is contacted.
- It checks Studio route/assets, session storage, owner login, authenticated site listing, engine status, hidden paths, direct PHP, directory listing and unknown routes.
- The test harness checks PHP session storage and mirrors browser cookie-jar rotation semantics.
- The final Apache smoke step passed in #41322050889.

### Staging documentation

- stage3/docs/STAGING-SHARED-HOSTING.md describes target topology, PHP/MySQL requirements, CLI plan/apply, acceptance, rollback and stop conditions.
- docs/HOSTINGER-STAGING-ADDENDUM.md records the prior Hostinger test setup, restrictions and possible hPanel Cron CLI route.

## 3. What CI proves — and what it does not

The final full CI run #41322050889 passed both jobs. It includes signed CMS Engine update/rollback/snapshot, D3 cutover/rollback, full server persistence/publish HTTP E2E, Apache 2.4 + PHP 8.3 smoke, editor packaging and offline no-brief scenarios.

It proves isolated CI and disposable container behavior. It does NOT prove:
- real Hostinger/LiteSpeed compatibility;
- real web PHP SAPI, open_basedir, file ownership or host-level AllowOverride;
- connection to the actual Stage3 MySQL database;
- live forms, SMTP/Telegram delivery;
- responsive owner acceptance on a real host;
- backup restoration on the target account.

Do not mark the CMS ready because CI is green.

## 4. Real shared-host staging — exact next priority

No real Stage3 installation, Hostinger write, file upload, database connection, production deployment or customer-data operation was performed in this block.

Before any real-host write:
1. Confirm the exact provider and staging hostname.
2. Confirm which branch the external Hostinger Git auto-deployment watches. That setting is outside GitHub and is not visible to this connector. Do not assume feature/stage3-ai-site-contract is unwatched.
3. If Hostinger is selected, use only the two isolated test websites previously prepared, after owner confirmation. Do not use the production domain.
4. Shared/general SSH is explicitly off-limits. Do not use it even if the Business Web plan offers SSH.
5. Do not reuse Stage2 database credentials or the stage2-hostinger-lab environment secrets for Stage3 without explicit approval.
6. Consider hPanel Cron Jobs as a possible owner-controlled CLI path without shared SSH. Hostinger documents PHP jobs and custom commands. This requires a private, one-shot, self-disabling runner; it has not been implemented or run.
7. Verify web PHP through hPanel PHP Info, not only CLI php -v. Confirm pdo_mysql, mbstring, openssl, JSON and PDO.
8. Verify the exact public document root, private directory outside the public root, and that non-public runtime files cannot be reached through the primary domain or another vhost.
9. Use a dedicated empty Stage3 MySQL 8.0+ database/user. Run read-only install plan first; inspect locally; execute apply only after a separate explicit owner confirmation.
10. Then test desktop/tablet/mobile, save/reload, publish, visitor release rollback, CMS Engine rollback/recovery, forms and test notifications, backup/restore, security and owner acceptance.

Hostinger documentation:
- Cron Jobs: https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/
- PHP Info: https://www.hostinger.com/support/5920192-how-to-check-the-php-version-in-hostinger/
- Per-subdomain PHP handler: https://www.hostinger.com/support/4047803-how-to-change-the-php-version-for-subfolders-or-subdomains-in-hostinger/
- LiteSpeed directive support and FallbackResource limitation are covered in the current staging runbook.

## 5. Remaining product acceptance

- Real shared-host Stage3 staging install and host-specific smoke.
- Owner hands-on Studio acceptance.
- Connect the first agreed site.
- Desktop/tablet/mobile checks.
- Save/reload, publish, visitor-site rollback, CMS Engine update/rollback.
- Forms, HMAC/origin rejection, real test email and Telegram delivery.
- Backup and restore rehearsal.
- Security, access isolation, logs and recovery.
- Formal owner acceptance remains 0/135. Stage 2 remains NO-GO. Stage 3 remains engineering until acceptance.

## 6. Work rules for the next Lead Integrator

- Continue from the latest feature branch HEAD. The tested functional checkpoint is 0047aef57537f7dd2c405eadcc44f4f54ab6aa8d.
- First verify that the latest branch commit after that SHA is documentation-only; do not reset.
- Keep work on feature/stage3-ai-site-contract. Do not merge or rebase main.
- Work in large functional blocks. One full CI run per meaningful functional change; fix concrete failures, not already-closed issues.
- No repeated broad matrices without evidence.
- No Hostinger write action until the exact test target and method are confirmed.
- No shared/general SSH, no Stage2 secrets, no production deployment.
- No public installer, generic shell bridge or HTTP credential form.
- A green CI is necessary evidence, not product acceptance.
