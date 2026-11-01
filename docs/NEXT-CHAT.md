# MANUFACT AI Site CMS — Next Chat Checkpoint v9.12

**Updated:** 2026-11-01  
**Role:** Lead Integrator — continue the existing Stage3 implementation. Do not restart the CMS or split this work into Design Factory / SEO work.

## Git state

- Repository: https://github.com/manufact-test/ai-site-cms
- Active branch: feature/stage3-ai-site-contract
- Last fully CI-tested functional HEAD: 0047aef57537f7dd2c405eadcc44f4f54ab6aa8d
- Full CI: [run #41322050889](https://github.com/manufact-test/ai-site-cms/actions/runs/41322050889) — both jobs SUCCESS.
- This checkpoint is a documentation-only follow-up to the tested functional HEAD above. No runtime code changed after that SHA.
- User-provided handoff SHA 974909d502099b170beafa6806c6e1bc92378c78 was already 10 commits behind the live feature branch when this work began. The live branch was continued; no reset or rollback was performed.
- Main was not changed or merged. Observed main SHA before this documentation update: 12e9c3feb707e5ad46b2caeeed379eb40618466b.

## Completed in this integration block

1. **Owner logout / re-login regression:** run #41318864811 failed because the site-tools dialog remained open after logout and intercepted the next login click. Logout now closes that dialog, and the Chromium regression asserts the dialog is closed. Follow-up baseline run #41319549488 passed.
2. **Owner recovery after first-site HTTP 503:** successful owner authentication remains accepted when the first site load fails. Chromium now waits for the stable GET /api/engine response and for the version label to render before asserting the maintenance surface. This removes an asynchronous test race without weakening the check.
3. **Shared-host front controller:** stage3/server/public/.htaccess now uses mod_rewrite, DirectoryIndex and Options. It does not rely on FallbackResource, RedirectMatch or FilesMatch; hidden path segments, direct PHP execution except index.php, private file extensions and directory listing are blocked. Application routes go through index.php.
4. **Signed PHP-host package:** .htaccess is part of the required PHP-host package inventory and verifier allowlist; engine-update smoke verifies that the package retains it.
5. **Disposable Apache smoke:** a PHP 8.3 Apache container installs Stage3 into a temporary copy with CLI SQLite, then checks /studio, assets, session, owner login, owner site listing, engine status, hidden paths, stray PHP files, directory listing and unknown routes. The test checks writable PHP session storage and uses browser-like cookie rotation semantics.
6. **Staging runbook:** stage3/docs/STAGING-SHARED-HOSTING.md documents the public/private directory boundary, PHP/MySQL requirements, CLI plan/apply sequence, acceptance order, rollback and stop conditions. LiteSpeed/Hostinger-specific constraints are documented separately in docs/HOSTINGER-STAGING-ADDENDUM.md.

## Exact CI evidence

Run [#41322050889](https://github.com/manufact-test/ai-site-cms/actions/runs/41322050889) is green on functional HEAD 0047aef57537f7dd2c405eadcc44f4f54ab6aa8d.

- technology-runtime: SUCCESS.
- contract: SUCCESS.
- CMS Engine signed update, rollback and database snapshot rehearsal: SUCCESS.
- D3 isolated release cutover/rollback: SUCCESS.
- Server syntax and full HTTP persistence/publish E2E: SUCCESS.
- Apache 2.4 + PHP 8.3 shared-host smoke: SUCCESS.
- Offline editor packaging, ZIP publication and no-brief scenario: SUCCESS.

Run #41320605647 exposed an asynchronous assertion race in the browser test: it read the engine version label immediately after the dialog opened. The test now waits for the API 200 response and the rendered version. This was a test synchronization issue, not a reason to remove the owner-recovery requirement.

The Apache smoke test is a disposable container test. It is not proof of compatibility with the selected real shared host, LiteSpeed version, Hostinger account, real MySQL privileges, web-SAPI configuration or owner acceptance.

## Real shared-host staging — next priority

No Stage3 installation, database connection, file upload, Hostinger write, production deployment or customer-data operation was performed in this block.

Before any real-host write:

1. Confirm the exact staging provider and hostname.
2. Confirm which branch the external Hostinger Git auto-deployment watches. That setting is outside the GitHub repository and is not visible through the GitHub connection. Do not assume the feature branch is safe until checked.
3. If Hostinger is the target, follow docs/HOSTINGER-STAGING-ADDENDUM.md. Prior setup explicitly prohibits use of shared/general SSH. Do not reuse Stage2 secrets or databases for Stage3 without separate approval.
4. Evaluate hPanel Cron Jobs as a possible owner-controlled CLI path without shared SSH. A private, one-shot, self-disabling runner must be implemented and reviewed before use; do not expose install.php or a shell bridge over HTTP.
5. Use a dedicated Stage3 empty MySQL 8.0+ database, a private directory, exact document-root isolation and HTTPS. Verify the actual web PHP SAPI through hPanel PHP Info, not only CLI php -v.
6. Only after the owner confirms the exact target and method, perform a read-only install plan, review it, then separately approved apply on the isolated test site.
7. Complete desktop/tablet/mobile acceptance, save/reload, publish/rollback, forms and real test notifications, backup/restore, security and owner hands-on review.

## Non-negotiable boundaries

- No production deployment without a separate explicit approval.
- No merge/rebase to main during this work.
- No shared/general SSH.
- No use of Stage2 database credentials or secrets for Stage3 without explicit approval.
- No public HTTP installer, generic shell bridge or credential form.
- Do not call the product ready because CI is green. Real-host and owner acceptance remain open.
- Work in large functional blocks. Run targeted checks when there is evidence; do not create endless repeated matrices.
- Formal owner acceptance remains 0/135. Engineering completion and product acceptance are separate.

## Canonical handoff files

- docs/CMS-ENGINE-UPDATE-ROLLBACK-DESIGN.md
- docs/HOSTINGER-STAGING-ADDENDUM.md
- handoffs/lead-integrator/MAIN-HANDOFF-v9.12-2026-11-01.md
- handoffs/lead-integrator/FIRST-MESSAGE-v9.12-2026-11-01.md
