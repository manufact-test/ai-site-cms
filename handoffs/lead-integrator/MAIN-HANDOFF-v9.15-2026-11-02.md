# MANUFACT AI Site CMS — Lead Integrator Handoff v9.15

**Date:** 2026-11-02  
**Role:** Lead Integrator / primary integration owner  
**Repository:** https://github.com/manufact-test/ai-site-cms  
**Working branch:** `feature/stage3-ai-site-contract`

## 1. Git and CI checkpoint

- Tested functional code SHA: `4a7182dc859e5b4affbc0a560c5f793ff4f1041e`
- Documentation-only handoff commits follow the tested code; verify the live branch tip before writing.
- Full CI: [#41414660469](https://github.com/manufact-test/ai-site-cms/actions/runs/41414660469) — **SUCCESS, 4/4 jobs**.
  - `contract`: SUCCESS
  - `technology-runtime`: SUCCESS
  - MariaDB 10.11 compatibility: SUCCESS
  - MariaDB 11.8 compatibility: SUCCESS
- No main merge, reset or branch switch. Main remains unchanged.
- The first MariaDB integration run exposed a D3 collector allowlist mismatch because the new database compatibility helper was inadvertently included in the isolated form-collector package. `DatabaseServerCompatibility.php` was added to the collector's engine-control exclusion set. The D3 test and full CI rerun passed.

## 2. Latest implementation

Hostinger Web/Cloud uses MariaDB, while the prior hosted installer and snapshot subsystem intentionally rejected it. The project now has an explicit, tested support policy:

- MySQL 8.0.0+
- MariaDB 10.11.0+
- PDO driver remains `mysql`; MariaDB is identified from `SELECT VERSION()`.
- SQLite and older/unsupported server versions remain blocked for hosted install.

Code changes:
- Added `stage3/server/DatabaseServerCompatibility.php`.
- `Stage3Installer::plan()` uses the shared engine/version check.
- `DatabaseSnapshot::create()` and restore-target validation use the same check.
- The helper is included in CMS engine package required-file inventories.
- The helper is excluded from the isolated form collector.
- `stage3/tests/mysql-install-probe.cjs` now validates both supported engine families.
- CI matrix tests MariaDB 10.11 and 11.8 alongside existing MySQL 8.4 coverage.

## 3. Fresh artifact and Hostinger update archive

- Workflow: [#41414660469](https://github.com/manufact-test/ai-site-cms/actions/runs/41414660469)
- Artifact ID: `13127730026`
- Artifact name: `ai-site-stage3-hostinger-sibling`
- Owner-facing update archive: `stage3-hostinger-mariadb-ready-update.zip`
- SHA-256: `fdca03d63561baa645ba708ccd6c3a7a95d4deae67d8b602d519c606e26cfa6e`

The owner-facing archive contains:
- Updated full `stage3/` runtime.
- Updated `cms-release.json`.
- Temporary `stage3/server/bin/prepare-hosted-install.php` one-shot helper.
- `.stage3-private/hosted-install-input.json` template.

It intentionally excludes `public_html/`; preserve the currently verified public files. The temporary helper validates the saved account web-root inventory, creates the canonical private runner config, removes itself and the temporary input file, then invokes the existing runner's read-only `--plan`. It has no `--apply` path and does not print secrets.

## 4. Hostinger staging checkpoint

Target site selected by the owner:
- `mediumpurple-fox-175549.hostingersite.com` — separate test website, not connected to Git.

Untouched:
- `lightseagreen-woodpecker-264491.hostingersite.com` — remains connected to GitHub and watches `stage2-hostinger-cms-preflight`.

Observed/confirmed on the target:
- Prior sibling layout extracted at account-home level: `stage3/` and `public_html/` are siblings.
- `public_html/` contains exactly `index.php` and `.htaccess`, both mode `0444`.
- Original `default.php` preserved outside the public root.
- `.stage3-private/` exists with exact mode `0700`.
- Filesystem preflight found 31 candidate account web roots and saved an inventory file. The repeated preflight refused to overwrite that existing file; the one-shot helper re-discovers standard Hostinger roots and compares the saved inventory before proceeding.
- Web PHP: 8.3.
- CLI probe: PHP 8.2.35, SAPI `cli`, PDO, PDO MySQL, JSON, OpenSSL and mbstring available; result `cli_ready_for_private_plan`.
- Temporary Cron jobs have been removed.

Not done:
- No existing database opened or modified.
- No new database created yet.
- No secrets or credentials read.
- No private hosted runner config created.
- No `--plan` or `--apply` executed.
- No production site or Stage2 resources touched.

The current old runtime contains the temporary `stage3-host-preflight.php` helper. When updating, rename the entire old `stage3/` folder to a dated backup. The old helper remains only in that backup; the new runtime does not contain it.

## 5. Next actions

1. Provide the owner the download link for `stage3-hostinger-mariadb-ready-update.zip`.
2. In Hostinger File Manager at account-home level, rename current `stage3/` to a dated backup. Do not delete it.
3. Upload and extract the update archive at the same account-home level. It creates the new `stage3/`, updates `cms-release.json`, and adds the input template under the existing `.stage3-private/`. Do not extract inside `public_html/`; do not replace `public_html/`.
4. Owner privately edits `.stage3-private/hosted-install-input.json` with:
   - DSN: `mysql:host=DB_HOST;dbname=NEW_DEDICATED_DB;charset=utf8mb4`
   - new dedicated DB username/password
   - owner username (default `stage3-owner`) and a unique password of at least 14 characters
   - form origin/endpoint can remain blank for the initial install plan
   - never send these credentials in chat. The helper generates the form secret automatically.
5. Create one temporary hPanel Cron custom command, scheduled every minute:
   ```sh
   /usr/bin/php /home/u235811320/domains/mediumpurple-fox-175549.hostingersite.com/stage3/server/bin/prepare-hosted-install.php
   ```
   It revalidates isolation, creates the private 0600 config and runs read-only `--plan`. Remove the Cron immediately after receiving output.
6. Review plan. Continue only if `state=install_required`, `applyAllowed=true`, `hostIsolation.ok=true`, supported DB version and all checks clear.
7. `--apply=<approvalFingerprint>` requires a separate explicit owner decision. Do not infer approval from a green CI or successful plan.
8. After approved install, verify Studio login, save/reload, publish, visitor-site rollback, forms, test-only notifications, backup/restore and desktop/tablet/mobile behavior.

## 6. Non-negotiable boundaries

- No production deployment without separate explicit approval.
- No main merge, reset, branch switch or shared/general SSH.
- Do not touch Stage2 secrets/DB, the connected Stage2 site or customer data.
- Do not reuse existing databases; create one new empty dedicated Stage3 database.
- Never place DB credentials, owner passwords, form secrets or install tokens in chat, URLs, command arguments, screenshots, logs or repository files.
- `--plan` is read-only; `--apply` requires a separate explicit owner decision.
- Green CI and a successful CLI probe are not product acceptance.
- Formal owner acceptance remains **0/135**. Stage2 remains **NO-GO #5–#9**. Stage3 remains isolated and not formally accepted.

## 7. Canonical documents

- `docs/NEXT-CHAT.md`
- `docs/HOSTINGER-STAGING-ADDENDUM.md`
- `stage3/docs/HOSTED-INSTALL-RUNNER.md`
- `stage3/docs/STAGING-SHARED-HOSTING.md`
- `docs/DEVELOPMENT-WORKFLOW.md`
- `PROJECT-STATUS.json`
- `docs/MASTER-TZ.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
