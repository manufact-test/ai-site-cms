# MANUFACT AI Site CMS — Lead Integrator Handoff v9.14
**Date:** 2026-11-01  
**Repository:** https://github.com/manufact-test/ai-site-cms  
**Branch:** `feature/stage3-ai-site-contract`  
**Functional source:** `73deff8626b66308b011a52dd27e1508795920ac`  
**Exact full CI:** [#41340074041 — SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/41340074041)

## Executive state

The previous v9.13 checkpoint was behind the live branch. The current source has completed a Hostinger sibling-layout package builder and a zero-credential PHP CLI preflight probe. The exact source SHA above passed both workflow jobs: `contract` and `technology-runtime`.

This remains isolated Stage3 engineering. Stage2 formal acceptance is still NO-GO on gates #5–#9. No Stage3 mandatory product requirement is formally accepted (0/135). Green CI is not owner acceptance or proof of a real Hostinger installation.

## Implemented since v9.13

### 1. Hostinger sibling-layout release package

- New CLI action: `node stage3/bin/cms-release.cjs pack-hostinger-sibling ABS_SOURCE_REPO ABS_NEW_OUTPUT`.
- It packages the PHP-host runtime plus a sibling `public_html/` directory.
- `public_html/` contains only `index.php` and `.htaccess`, copied byte-for-byte from `stage3/server/public/`, set to 0444.
- The verifier checks the exact sibling topology, rejects symlinks/hardlinks, writable front-controller files, mismatched templates and extra public-root files.
- A dedicated smoke test proves valid packaging and rejects tampering/extra files.
- CI artifact: [ai-site-stage3-hostinger-sibling, artifact 13097246593](https://github.com/manufact-test/ai-site-cms/actions/runs/41340074041/artifacts/13097246593). The downloadable Actions artifact wraps the actual release ZIP inside an outer artifact ZIP.

### 2. Read-only PHP CLI environment probe

Command:

    php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --probe

It requires no config or credentials. It checks:
- PHP CLI version >= 8.1;
- PDO, PDO MySQL, JSON, OpenSSL and mbstring;
- an available PDO MySQL driver;
- readability of the critical server bootstrap, installer, front controller, rewrite file and runtime directories.

It reports JSON with `cli_ready_for_private_plan` or `blocked`. It reads no environment secrets, performs no DB/network access and writes no files. Sodium is informational only in this probe. It does not validate web PHP SAPI, database version/connectivity, private-directory permissions, full account web-root inventory, TLS or actual open_basedir path access.

CI test: `stage3/tests/hosted-environment-probe.cjs` verifies the complete PHP 8.3 environment passes, a stripped PHP CLI fails closed, secret sentinel values are never echoed and no files are created.

### 3. Exact CI and artifacts

- Source SHA: `73deff8626b66308b011a52dd27e1508795920ac`.
- Full Actions: [#41340074041](https://github.com/manufact-test/ai-site-cms/actions/runs/41340074041) — SUCCESS.
- Jobs: `contract=SUCCESS`, `technology-runtime=SUCCESS`.
- Hostinger package artifact: ID `13097246593`, 581,484 bytes.
- Offline Studio artifact: ID `13096977994`.
- Desktop/phone screenshots: artifact ID `13096853340`.
- Previous package baseline [#41339118010](https://github.com/manufact-test/ai-site-cms/actions/runs/41339118010) also passed, but #1293 is the latest package and includes `--probe`.

## Hostinger screenshot observations

The owner supplied screenshots dated 01.11.2026:
- `lightseagreen-woodpecker-264491.hostingersite.com`: connected to repository `ai-site-cms`, auto-deployment on, branch `stage2-hostinger-cms-preflight`, root `public_html`, shown completed commit `4d528287`.
- `mediumpurple-fox-175549.hostingersite.com`: no Git provider connected.

These are screenshot observations, not a live check. Do not change the existing connected site's branch/root or push Stage3 into its watched branch. The sibling-layout ZIP must be extracted at account-home level, not into `public_html`, otherwise the private runtime becomes web-exposed.

## Exact next staging path

1. Owner confirms the isolated staging target and explicitly approves the upload/extraction method. Do not infer permission to alter Hostinger settings from screenshots alone.
2. Confirm hPanel custom PHP CLI Cron capability and account-home-level extraction.
3. Confirm all active account web roots (1–50), including the target public root. Runtime and private storage must be isolated from all other web roots.
4. Use a new empty dedicated MySQL 8.0+ database and a private 0700 directory. No Stage2 secrets or DB.
5. Upload/extract the CI artifact only after approval, preserving sibling `stage3/` and `public_html/`.
6. Run `--probe`; continue only on `cli_ready_for_private_plan`.
7. Prepare the exact 0600 private runner config and run one-time `--plan`. Inspect every check and the approval fingerprint; remove the Cron entry.
8. Run `--apply=<fingerprint>` only after a separate explicit owner decision.
9. After installation, verify Studio owner diagnostics, web PHP SAPI/open_basedir, save/reload, publish, visitor rollback, forms, real test notification delivery, backup/restore and responsive layouts.

No Hostinger upload, Git setting change, Cron execution, database connection/write, DNS change or production deployment has been performed in this block. Shared/general SSH remains prohibited.

## Work rules

- Continue existing branch; do not restart CMS or merge with Design Factory / SEO.
- Work in useful functional blocks, not time padding or repetitive test loops.
- Keep the existing full CI and only critical targeted smoke tests; do not weaken security checks.
- Do not merge/rebase to main.
- No production deployment without separate approval.
- Do not declare the CMS accepted from green CI. Owner acceptance remains 0/135.
