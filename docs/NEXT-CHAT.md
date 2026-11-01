# MANUFACT AI Site CMS — Next Chat Checkpoint v9.13

**Updated:** 2026-11-01  
**Role:** Lead Integrator. Continue the existing Stage3 CMS; do not restart it or merge it with Design Factory / SEO work.

## Git state

- Repository: https://github.com/manufact-test/ai-site-cms
- Active branch: `feature/stage3-ai-site-contract`
- Functional source SHA: `f4366d1982413ea7a27ba8c807d9c54c78abed14`
- Full CI for that functional SHA: [#41333071592](https://github.com/manufact-test/ai-site-cms/actions/runs/41333071592) — **SUCCESS**, both `contract` and `technology-runtime`.
- Documentation/workflow checkpoint: `82a6eea97d255e5c21d60c65a7de63af62cd507d`; full CI [#41333649907](https://github.com/manufact-test/ai-site-cms/actions/runs/41333649907) — **SUCCESS**, both jobs green.
- Docs-only follow-ups: command-placeholder correction `52a4873c217bb25884d5da9e8f2824fb343fd17a` and one-time Cron scheduling clarification `fca63e3c15900dd6909eb29fb8dee8d171750556`. They change documentation only; no runtime code changed after the green source SHA.
- The v9.13 handoff/metadata commit is the current documentation checkpoint. Always verify the live branch tip before writing.
- Main remains `12e9c3feb707e5ad46b2caeeed379eb40618466b`; no merge or reset was performed.

## Recovery from the supplied handoff

The user-provided checkpoint `974909d502099b170beafa6806c6e1bc92378c78` was already behind the live branch. At takeover, the real branch HEAD was `6e5e924307a8f6dc9010cf7e2453581455569835`; several additional functional commits were already present.

The supplied Actions run [#41318864811](https://github.com/manufact-test/ai-site-cms/actions/runs/41318864811) did not remain the active blocker. Later branch work corrected the regressions and [#41331474520](https://github.com/manufact-test/ai-site-cms/actions/runs/41331474520) passed on `6e5e924`. Do not reset to the supplied SHA or repeat already completed work.

## Completed work carried forward

1. **Owner recovery and browser regressions:** owner authentication is retained when the first site load fails; logout closes the owner tools dialog before the next login.
2. **Shared-host routing:** stable public front controller and Apache 2.4 / LiteSpeed-compatible `.htaccess`; hidden paths, directory listing and stray executable/private files are denied. The signed PHP-host package inventory retains the routing file.
3. **Private hosted installation runner:** `stage3/server/bin/hosted-install-runner.php` is CLI-only and intended for an owner-controlled hPanel Cron custom command where shared/general SSH is prohibited. It requires a private 0700 directory, canonical 0600 config, complete account web-root inventory and dedicated MySQL 8.0+.
4. **Two-step install:** read-only `--plan` stores a private review/state and prints a redacted plan plus approval fingerprint. Separate `--apply=<fingerprint>` recomputes the plan and rejects stale credentials/topology before schema writes. Success creates the 25-table schema, owner account, private topology receipt and consumed marker, then removes credential-bearing config/state. A recurring Cron call becomes a silent no-op; owner must remove the Cron entry manually.
5. **Hosting readiness diagnostics:** owner-only read-only Studio panel calls `GET /api/hosting/diagnostics`. It checks database/schema identity, private runtime config and permissions, document root, actual `SCRIPT_FILENAME`, public-root policy, hosted topology, PHP `open_basedir` access to runtime/public/private/upload paths, HTTPS/session flags and upload configuration.
6. **Diagnostics hardening in this block:** removed the hard-coded `frontController=true`; checks the real script path. Added `open_basedir` and upload checks (`file_uploads`, `max_file_uploads`, upload/POST size compatibility and temp directory). Added Studio rows, PHP helper tests and Chromium/Apache regression assertions.
7. **Documentation:** private runner guide, updated shared-host runbook, installer guide, Hostinger addendum and Stage3 README. CI path filters now exclude `stage3/docs/**` and `stage3/README.md` from full runs; runtime paths and workflow changes still trigger CI. Shell command examples use safe replaceable placeholders.

## Exact CI evidence

- [#41331474520](https://github.com/manufact-test/ai-site-cms/actions/runs/41331474520) — SUCCESS on `6e5e924`; shared-host routing and runner foundation.
- [#41333071592](https://github.com/manufact-test/ai-site-cms/actions/runs/41333071592) — SUCCESS on `f4366d1`; new PHP diagnostics smoke, MySQL 8 runner, full Chromium E2E, CMS engine update/rollback/snapshot, D3 rollback, HTTP persistence/publish E2E, Apache shared-host smoke, offline Studio package and screenshots.
- [#41333649907](https://github.com/manufact-test/ai-site-cms/actions/runs/41333649907) — SUCCESS on `82a6eea`; documentation/workflow checkpoint, both jobs green.

The Apache container and MySQL 8 probes are disposable CI evidence only. They are not proof of Hostinger/LiteSpeed behavior or real owner acceptance.

## Real shared-host staging — next priority

No Hostinger files, Cron jobs, databases, DNS, production sites, customer data, SMTP destinations or Telegram chats have been touched.

Prior project notes list two Hostinger test websites:

- CMS/staging candidate: `lightseagreen-woodpecker-264491.hostingersite.com`
- Independent visitor/test site: `mediumpurple-fox-175549.hostingersite.com`

Treat these as historical candidates until the owner reconfirms them. The external Hostinger Git auto-deployment branch is not visible from GitHub; confirm it before any upload/push that could deploy. Shared/general SSH is explicitly prohibited. Stage2 database credentials and `stage2-hostinger-lab` secrets are not authorized for Stage3.

Next sequence after explicit owner approval:

1. Confirm the exact staging website/subdomain, the external auto-deploy branch, hPanel custom PHP CLI capability, dedicated Stage3 MySQL 8.0+ database and the complete account web-root inventory.
2. Confirm private runtime and storage paths are outside every account web root. The owner enters credentials privately on the host; never request or accept passwords, private keys, DSNs or form secrets in chat.
3. Upload the reviewed PHP-host package and private runtime tree using the approved owner-controlled method.
4. Create the private runner config with exact documented schema and permissions.
5. Run the read-only hPanel Cron `--plan`; inspect every check and the account topology.
6. Only after a separate owner decision, run `--apply=REPLACE_WITH_64_HEX_APPROVAL_FINGERPRINT`.
7. Open Studio and verify `/api/hosting/diagnostics`; then test desktop/tablet/mobile, save/reload, publish, visitor rollback, CMS engine rollback, forms, real test notifications, backup/restore and security.

If the selected account cannot execute the private Cron command or cannot isolate the runtime tree, stop. Do not create a public installer, shell bridge or credential form.

## Non-negotiable boundaries

- No production deployment without separate explicit approval.
- No merge/rebase to main.
- No shared/general SSH.
- No Stage2 secrets, databases or customer data reused for Stage3.
- No deployment based only on green CI.
- Formal owner acceptance remains **0/135**. Stage2 remains **NO-GO #5–#9**; Stage3 is isolated engineering pending real-host and hands-on acceptance.
- Keep work in substantial functional blocks; do not repeat green tests without new evidence.

## Canonical documents

- `docs/NEXT-CHAT.md`
- `stage3/docs/HOSTED-INSTALL-RUNNER.md`
- `stage3/docs/STAGING-SHARED-HOSTING.md`
- `stage3/docs/INSTALLER-AND-SETUP.md`
- `docs/HOSTINGER-STAGING-ADDENDUM.md`
- `docs/CMS-ENGINE-UPDATE-ROLLBACK-DESIGN.md`
