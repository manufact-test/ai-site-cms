# CURRENT CHECKPOINT — Admin UX and contextual page controls, 2026-11-03 (read first)

**Working branch:** `feature/stage3-ai-site-contract`. **Last fully green functional SHA:** `81e2abd37bc3e339899896fb088c991ee97b167f`, [Actions #41602928099](https://github.com/manufact-test/ai-site-cms/actions/runs/41602928099) **SUCCESS 4/4** (genuine Chromium contract, technology-runtime, MariaDB 10.11 and 11.8). The prior navigation cleanup `126592b18a513adabb5f299253aabb91eddff134` independently passed [#41597719791](https://github.com/manufact-test/ai-site-cms/actions/runs/41597719791) **4/4**.

**Latest implementation SHA:** `81e2abd37bc3e339899896fb088c991ee97b167f` — hosted-only color/contrast correction to the shared page-details modal, plus a Chromium palette assertion. Its full CI [#41602928099](https://github.com/manufact-test/ai-site-cms/actions/runs/41602928099) passed **4/4**; corrected page-settings screenshot [artifact #13215212533](https://github.com/manufact-test/ai-site-cms/actions/runs/41602928099/artifacts/13215212533) has been visually inspected. The previous functional page-dialog commit `94e48bf51f2ef311c303eed80e62803e6e4e9af4` is independently green 4/4. The prior source-only commit `c13716e4d97683063fc02c87ade58c21519df400` failed initial bundle parity [#41601967011](https://github.com/manufact-test/ai-site-cms/actions/runs/41601967011), corrected by the next commit. Do not confuse the failed intermediate build with a functional regression.

**Implemented, awaiting owner UX acceptance:** existing hosted Studio as one CMS with real site list/empty state, selected project overview, page editor canvas/layers and selected element inspector, site-wide settings, resources, approved-v2 onboarding, account, owner-only platform administration. On active page, `Настройки страницы` contains title/URL, SEO/menu and ordering/duplicate/delete; global site SEO contains site-level audits and handoff only. Page creation/edit/copy now opens a single form rather than native double prompts. No fixture content is shown as a real server site when `/api/sites` is empty. Password and Logout live under Account; users/audit/license/engine operations under Platform; Save/Review/Publish appear only in the active editor. See [navigation and context contract](../stage3/docs/ADMIN-UX-ARCHITECTURE-2026-11-03.md).

**Next actions:** (1) continue coherent selected-element inspector and page workflow refinement based on real screenshots; (2) add exact user-visible workflow acceptance checks where UI still hides information or repeats controls; (3) plan separately controlled FOX update and real owner hands-on acceptance, not automatic deployment. Current staging is not yet updated. Do not ask for or import a random first site.

**Hard boundaries:** Stage3 already installed and authenticated on isolated FOX `mediumpurple-fox-175549.hostingersite.com/studio`; **the new UX commits are NOT deployed there**. Do not reinstall, recreate MariaDB, change Cron/private secrets or touch Stage2 Woodpecker/production/main. The industrial factory is an offline fixture; no persisted user data was deleted. The first client landing and desktop/tablet/mobile static mockups are explicitly deferred. Full GitHub CI is engineering evidence, not owner sign-off. Historical installation instructions below are superseded.
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
