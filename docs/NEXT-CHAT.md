# MANUFACT AI Site CMS — Next Chat Checkpoint v9.14

**Updated:** 2026-11-01  
**Role:** Lead Integrator. Continue the existing Stage3 CMS; do not restart it or merge it with Design Factory / SEO work.

## Git state

- Repository: https://github.com/manufact-test/ai-site-cms
- Active branch: `feature/stage3-ai-site-contract`
- Latest functional source SHA: `73deff8626b66308b011a52dd27e1508795920ac`
- Full CI: [#41340074041](https://github.com/manufact-test/ai-site-cms/actions/runs/41340074041) — **SUCCESS**, both `contract` and `technology-runtime`.
- Previous Hostinger package-only milestone: [#41339118010](https://github.com/manufact-test/ai-site-cms/actions/runs/41339118010) — SUCCESS.
- Main remains `12e9c3feb707e5ad46b2caeeed379eb40618466b`; no merge, reset or main write.
- Documentation/handoff checkpoint follows the functional source; always verify the live branch tip before writing.

## Completed in the latest block

1. **Hostinger sibling-layout package builder:** `stage3/bin/cms-release.cjs pack-hostinger-sibling` creates a PHP-host package with `stage3/`, `public_html/` and `cms-release.json` at one account-home level. The public root contains only `index.php` and `.htaccess`, copied byte-for-byte from the runtime template and set read-only.
2. **Strict package verification:** the release verifier accepts this exact layout only, rejects symlinks, hard links, writable public front-controller files, changed templates and extra public-root files. `stage3/tests/hostinger-package-smoke.cjs` verifies valid packaging and tamper rejection.
3. **Zero-credential PHP CLI preflight:** `hosted-install-runner.php --probe` checks PHP CLI 8.1+, required extensions, PDO MySQL availability and readability of the core runtime tree. It reads no secrets, does not connect to a database/network and performs no filesystem writes. It explicitly does not certify the website PHP handler or full host topology.
4. **Fresh deployable artifact:** [Hostinger sibling package, Actions #1293](https://github.com/manufact-test/ai-site-cms/actions/runs/41340074041/artifacts/13097246593), artifact ID `13097246593`, 581,484 bytes. It includes the new `--probe` runner. The artifact is a ZIP of a ZIP when downloaded through the GitHub Actions API; the inner file is `ai-site-stage3-hostinger-sibling.zip`.
5. **Full exact-SHA CI:** Chromium Studio E2E, PHP 8.3 SQLite/MySQL, installer/runner, engine update/rollback/snapshot, D3 rollback, HTTP persistence/publish, Apache 2.4 shared-host smoke, Hostinger package build and upload all passed.

## Hostinger evidence from owner screenshots (01.11.2026)

- `lightseagreen-woodpecker-264491.hostingersite.com` is connected to GitHub repository `ai-site-cms`; auto-deployment is enabled; watched branch is `stage2-hostinger-cms-preflight`; deployment root is `public_html`. The screenshot showed completed commit `4d528287`.
- `mediumpurple-fox-175549.hostingersite.com` had no Git provider connected.
- Treat these as screenshot observations, not a live re-check. Do not switch the connected branch or push Stage3 to it. The Hostinger archive must be extracted at account-home level so `stage3/` and `public_html/` are siblings; extracting/deploying it inside `public_html` would expose the private runtime.

## Real-host staging sequence

No Hostinger file, Git setting, Cron job, database, DNS, production site, customer data, SMTP destination or Telegram chat has been changed.

Before any real-host action:

1. Owner confirms the exact isolated staging website and explicitly authorizes the upload/extraction method. Do not assume the currently connected Git site is safe to repoint.
2. Confirm hPanel can run a custom PHP CLI command via Cron and that the archive can be extracted at account-home level, not inside `public_html`.
3. Confirm the complete 1–50 account web-root inventory. The Stage3 runtime and private directory must not overlap any other web root.
4. Use a dedicated empty Stage3 MySQL 8.0+ database and a new private 0700 directory. Do not reuse Stage2 secrets, DBs or customer data.
5. Run the no-secret, read-only probe first:
   
       php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --probe

   Continue only when the JSON status is `cli_ready_for_private_plan`. This checks CLI only.
6. Owner creates the exact private 0600 config described in [HOSTED-INSTALL-RUNNER.md](../stage3/docs/HOSTED-INSTALL-RUNNER.md), with the full account web-root inventory.
7. Run one-time `--plan`; inspect the redacted report and approval fingerprint. Remove the Cron entry after it runs. Do not leave `--plan` recurring.
8. `--apply=<fingerprint>` requires a separate explicit owner decision. Do not run it merely because CI or `--probe` is green.
9. After install, verify owner-only Studio hosting diagnostics, actual web PHP SAPI/open_basedir, save/reload, publish, visitor rollback, forms, real test notification delivery, backup/restore and desktop/tablet/mobile.

If the selected account cannot execute the private CLI runner or cannot isolate the runtime tree from every web root, stop. Do not create a public installer, shell bridge or credential form.

## Non-negotiable boundaries

- No production deployment without separate explicit approval.
- No Hostinger upload, Git-branch switch, Cron execution or database write until the exact staging scope is confirmed and approved.
- No merge/rebase to main; no shared/general SSH.
- No Stage2 secrets, databases or customer data reused for Stage3.
- No deployment based only on green CI.
- Formal owner acceptance remains **0/135**. Stage2 remains **NO-GO #5–#9**; Stage3 engineering remains isolated and is not formally accepted.
- Work in meaningful functional blocks; do not repeat green tests without new evidence.

## Canonical documents

- `docs/NEXT-CHAT.md`
- `docs/DEVELOPMENT-WORKFLOW.md`
- `PROJECT-STATUS.json`
- `docs/MASTER-TZ.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/HOSTINGER-STAGING-ADDENDUM.md`
- `stage3/docs/HOSTED-INSTALL-RUNNER.md`
- `stage3/docs/STAGING-SHARED-HOSTING.md`
- `docs/ACCELERATED-MACROBLOCK-PROGRAM.md`
