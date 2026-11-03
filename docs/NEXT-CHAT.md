# CURRENT CHECKPOINT — Admin UX restructuring, 2026-11-03 (read first)

**Working branch:** `feature/stage3-ai-site-contract`. **Last fully green functional SHA:** `7ee38f8e578a7240d3397a39e149ab80cc8d8814`, [GitHub Actions #41596955430](https://github.com/manufact-test/ai-site-cms/actions/runs/41596955430) **SUCCESS 4/4** (contract with genuine Chromium, technology-runtime, MariaDB 10.11 and 11.8). [Real screenshot artifact #13212159401](https://github.com/manufact-test/ai-site-cms/actions/runs/41596955430/artifacts/13212159401).

**Latest functional UI cleanup SHA:** `126592b18a513adabb5f299253aabb91eddff134` — follows the green checkpoint. Its CI must be checked separately; do not label it green based on the prior run. It hides redundant site-settings and page-preview entrypoints from the editor and collapses site switching in project overview, while preserving the original button IDs and handlers.

**What is implemented, not yet owner-accepted:** one existing hosted Studio with explicit CMS home (real server sites only), project overview, editor, site settings, resources, approved-v2 import guidance, account and owner platform administration. The offline industrial fixture remains for offline testing but is never displayed as a server site when no real site is selected. Login opens the real site list; no arbitrary automatic site selection. Password/logout belong to Account; users/audit/licenses/engine updates to platform; Save/Review/Publish only to active editor. Genuine Chromium tests cover empty CMS, account/platform, explicit sealed import and recovery, responsive canvas, media, SEO, save/publish/restore. See [admin UX architecture](../stage3/docs/ADMIN-UX-ARCHITECTURE-2026-11-03.md).

**Next actions:** (1) verify full Actions for the latest UI cleanup SHA, repair any authentic failure without reversing the information architecture; (2) inspect updated real screenshots of home, project overview, editor and settings at 1400/768/390 px; (3) continue coherent contextual editor refinements and owner UX acceptance. Do not create or import a random client site or request the first landing yet.

**Hard boundaries:** Stage3 is already installed and authenticated on isolated FOX `mediumpurple-fox-175549.hostingersite.com/studio`; no staging redeployment, reinstallation, database/Cron/secret edits have been performed in this UX pass. Stage2 Woodpecker, production, main and client data untouched. GitHub CI is not owner UI/UX GO. Old installation instructions lower in this file are historical and superseded.

---

# CURRENT PRIORITY UPDATE — 2026-11-03 (read first)

**This update SUPERSEDES the older v9.15 Hostinger “not yet installed / create DB / run plan/apply” instructions below.** Stage3 has now been successfully installed and the owner has authenticated on the isolated FOX staging host. Do NOT recreate database, rerun plan/apply, or ask for credentials. The existing site is https://mediumpurple-fox-175549.hostingersite.com/studio . No finished real website has been approved/imported. Existing “Завод оборудования” pages/sections are not approved pilot content and may be synthetic or a placeholder; first verify where they come from and preserve persisted data.

**Next task: urgently overhaul the current Stage3 Studio admin UX before asking the owner for first landing page material.** Owner inspected the actual FOX Studio and strongly rejected indiscriminate placement of controls: account password/change/logout, system updates/licenses/audit in the same “site tools / connect” dialog, fake page/block trees on an empty workspace, and a folder picker that opens without contextual onboarding. Research Elementor current official editor + contemporary Webflow/WordPress design patterns, audit actual code/navigation, implement a cohesive, context-sensitive information architecture in EXISTING Studio/Workbench, and show verified real browser screenshots. Do not bolt on a new CMS/editor. Separate: CMS home without a site; selected site dashboard; page editor canvas/layers/contextual properties; site settings/resources; account settings; owner-only platform operations. Publish/Save visible only when valid site/page active. No client data deletion or unilateral production updates.

**Authoritative, detailed, owner-approved project handoff:** [HOSTINGER-LIVE-AND-ADMIN-UX-RESET-2026-11-03.md](../handoffs/lead-integrator/HOSTINGER-LIVE-AND-ADMIN-UX-RESET-2026-11-03.md). Read it alongside [OWNER-STUDIO-UX-ACCEPTANCE.md](../stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md), MASTER-TZ and ROADMAP. This is a GitHub documentation checkpoint, not implemented UI and not owner UI/UX GO.

GitHub branch `feature/stage3-ai-site-contract`; functional code reference `4a7182dc859e5b4affbc0a560c5f793ff4f1041e`, last full code CI [#41414660469](https://github.com/manufact-test/ai-site-cms/actions/runs/41414660469), SUCCESS four jobs. Handoff commit `b5a28005fc8a6fbcc14922f54c31ca0a9e61dc9f`; documentation commits may follow. Stage2 Woodpecker and production untouched. Formal owner feature acceptance and first-site pilot still pending. No new installs, Cron, secrets or approvals required to begin GitHub UX work.

---

# MANUFACT AI Site CMS — Next Chat Checkpoint v9.15

**Updated:** 2026-11-02  
**Role:** Lead Integrator. Continue the existing Stage3 CMS; do not restart it or merge it with Design Factory / SEO work.

## Git state

- Repository: https://github.com/manufact-test/ai-site-cms
- Active branch: `feature/stage3-ai-site-contract`
- Latest functional code SHA: `4a7182dc859e5b4affbc0a560c5f793ff4f1041e`
- Full CI: [#41414660469](https://github.com/manufact-test/ai-site-cms/actions/runs/41414660469) — **SUCCESS, 4/4 jobs**: `contract`, `technology-runtime`, MariaDB 10.11 and MariaDB 11.8.
- The previous run #41413760836 exposed a collector PHP allowlist mismatch after adding the database compatibility helper. The helper was excluded from the isolated form collector; D3 and the complete rerun then passed.
- Main remains `12e9c3feb707e5ad46b2caeeed379eb40618466`; no merge, reset or main write.
- Documentation commits follow the tested functional code. Verify the live branch tip before writing.

## Completed in the latest block

1. **Hostinger database compatibility:** Hostinger Web/Cloud uses MariaDB. Stage3 now supports MySQL 8.0+ and MariaDB 10.11+ through PDO MySQL. Older MariaDB/MySQL and SQLite remain blocked for hosted installation.
2. **Shared compatibility policy:** added `stage3/server/DatabaseServerCompatibility.php`; both the installer plan and database snapshot create/restore use the same server-family/version gate.
3. **Engine package integrity:** the new helper is required by the CMS engine release inventory and Hostinger PHP package. It is explicitly excluded from the independent form-collector package.
4. **Database integration CI:** disposable install, private hosted runner, schema initialization, owner creation, engine snapshot/restore and rollback contracts pass on MariaDB 10.11, MariaDB 11.8 and MySQL 8.4.
5. **Full CI:** the original contract, browser E2E, D3 release cutover/rollback, HTTP persistence/publish, Apache shared-host smoke, Hostinger sibling package and technology runtime all passed.
6. **Fresh Hostinger artifact:** workflow #41414660469, artifact `13127730026`, `ai-site-stage3-hostinger-sibling`. A staging update archive was assembled from this verified artifact:
   - File: `stage3-hostinger-mariadb-ready-update.zip`
   - SHA-256: `fdca03d63561baa645ba708ccd6c3a7a95d4deae67d8b602d519c606e26cfa6e`
   - Contains the updated `stage3/` runtime, updated `cms-release.json`, a one-shot private setup helper and an editable private input template.
   - Intentionally excludes `public_html/` so the already verified public front controller remains untouched.
   - The helper self-deletes before invoking the read-only `--plan`; it also removes the old temporary preflight helper from the active runtime if present.

## Hostinger staging evidence (owner-operated, 02.11.2026)

- Selected target: `mediumpurple-fox-175549.hostingersite.com`, the separate test site with no Git provider connected.
- `lightseagreen-woodpecker-264491.hostingersite.com` remains connected to GitHub and watches `stage2-hostinger-cms-preflight`; it has not been changed.
- The previous sibling-layout package was extracted at account-home level. Active observed layout: sibling `stage3/` and `public_html/`; the public root contains exactly `index.php` and `.htaccess`, both mode `0444`. The original `default.php` was preserved outside the public root.
- Private directory `.stage3-private/` exists with exact mode `0700`.
- The owner-operated filesystem preflight found 31 candidate account web roots and saved a private inventory file. A repeated run correctly refused to overwrite the existing inventory. The new one-shot helper re-discovers the standard Hostinger roots and compares the saved inventory before it prepares the private runner config.
- Web PHP is 8.3. The owner-controlled Cron `--probe` returned `cli_ready_for_private_plan` with PHP CLI 8.2.35, SAPI `cli`, PDO, PDO MySQL, JSON, OpenSSL and mbstring.
- All temporary Cron entries have been removed.
- **No existing database was opened or changed. No new database has been created yet. No credentials were read. No private runner config, `--plan` or `--apply` has been executed.**
- The old runtime is to be retained as a rollback backup during replacement. Do not run CMS engine-integrity checks against that old copy.

## Immediate next actions — finish isolated staging preparation

1. Give the owner the verified `stage3-hostinger-mariadb-ready-update.zip` download link.
2. In Hostinger File Manager at the account-home level, rename the current `stage3/` folder to a dated backup (do not delete it). Upload and extract the update archive at the same account-home level. It creates the new `stage3/`, updates `cms-release.json`, and adds `.stage3-private/hosted-install-input.json`. It does **not** contain or replace `public_html/`.
3. The owner edits `.stage3-private/hosted-install-input.json` privately with the connection details for one **new, empty, dedicated Stage3 database** and a strong owner password. Use the database host/name/user/password shown by hPanel. Do not send any password or secret in chat. The helper generates the form secret automatically; form origins/endpoint may remain blank until form setup.
4. Create one temporary hPanel Cron custom command, schedule it **every minute**, and run:
   
   ```sh
   /usr/bin/php /home/u235811320/domains/mediumpurple-fox-175549.hostingersite.com/stage3/server/bin/prepare-hosted-install.php
   ```
   
   This one-shot helper revalidates the private directory, saved 31-root inventory, exact sibling layout and public read-only files; creates the canonical 0600 runner config; removes its own temporary code and input file; then invokes the existing hosted runner's read-only `--plan`. Remove the Cron entry immediately after receiving its output.
5. Review the redacted plan. Proceed only if `state=install_required`, `applyAllowed=true`, `hostIsolation.ok=true`, the database is confirmed as a dedicated empty supported MySQL/MariaDB database, and every blocker is clear.
6. `--apply=<approvalFingerprint>` remains a separate explicit owner decision. Do not run it merely because CI, `--probe` or `--plan` is green.
7. After approved install, verify Studio login, save/reload, publish, visitor-site rollback, forms, test-only notifications, backup/restore and desktop/tablet/mobile. Production remains out of scope.

## Non-negotiable boundaries

- No production deployment without separate explicit approval.
- No main merge, reset or branch switch; no shared/general SSH.
- Do not touch the connected Stage2 site, Stage2 secrets/DB or customer data.
- Do not reuse any existing database. Create one new dedicated empty Stage3 database.
- No passwords, database DSNs, owner credentials, form secrets or private install tokens in chat, URLs, command arguments, screenshots, logs or repository files.
- `--plan` is read-only; `--apply` requires a separate explicit owner decision.
- Green CI and a successful CLI probe are not product acceptance.
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
