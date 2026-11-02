# MANUFACT AI Site CMS — Next Chat Checkpoint v9.15

**Updated:** 2026-11-02  
**Role:** Lead Integrator. Continue the existing Stage3 CMS; do not restart it or merge it with Design Factory / SEO work.

## Git state

- Repository: https://github.com/manufact-test/ai-site-cms
- Active branch: `feature/stage3-ai-site-contract`
- Latest functional code SHA: `4a7182dc859e5b4affbc0a560c5f793ff4f1041e`
- Latest documentation-only HEAD: `02b6020dfb4babee366e2b52093ac2f4e153a77b`
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
   - SHA-256: `fdf292c748dcc885df096c7cc7800815218d1f8dbc7a5de76cedd4866ba60225`
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
