# MANUFACT AI Site CMS — Lead Integrator Handoff v9.13

**Date:** 2026-11-01  
**Owner:** MANUFACT  
**Role:** Lead Integrator / main CMS developer

## 1. Exact repository state

- Repository: `manufact-test/ai-site-cms`
- Branch: `feature/stage3-ai-site-contract`
- Last fully CI-tested functional source SHA: `f4366d1982413ea7a27ba8c807d9c54c78abed14`
- Exact full CI: [#41333071592 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/41333071592), both jobs SUCCESS.
- Documentation/workflow checkpoint SHA: `82a6eea97d255e5c21d60c65a7de63af62cd507d`
- Exact full CI for documentation/workflow checkpoint: [#41333649907 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/41333649907), both jobs SUCCESS.
- Subsequent docs-only follow-ups: command placeholder correction `52a4873c217bb25884d5da9e8f2824fb343fd17a` and one-time Cron scheduling clarification `fca63e3c15900dd6909eb29fb8dee8d171750556`; no runtime source changed.
- Main was checked and remains `12e9c3feb707e5ad46b2caeeed379eb40618466b`. No merge, reset or production deployment.

The handoff SHA supplied at the beginning of this chat (`974909d502099b170beafa6806c6e1bc92378c78`) was stale. The live feature branch was already at `6e5e924307a8f6dc9010cf7e2453581455569835` and contained later functional work. The old run #41318864811 had already been superseded by later fixes and green runs. Do not roll back to the stale SHA.

## 2. What was completed

### Shared-host foundation carried forward

- Apache 2.4 / LiteSpeed-compatible public routing through stable `server/public/index.php`.
- Hidden-path denial, disabled directory listing and protection against stray executable/private files.
- Routing file retained in the signed PHP-host package inventory.
- Private CLI-only `hosted-install-runner.php` for hPanel Cron custom commands when shared/general SSH is forbidden.
- Complete account web-root inventory, topology validation and private topology receipt.
- Read-only owner-only Studio hosting diagnostics.

### Diagnostics hardening completed in this block

The old diagnostics response reported `frontController=true` unconditionally. That was a false positive. It now resolves `$_SERVER['SCRIPT_FILENAME']` and requires it to match the canonical public `index.php`.

Additional checks:
- PHP `open_basedir` permits the runtime, public root, private storage and upload temp directory.
- `file_uploads` is enabled.
- `max_file_uploads` is positive.
- `upload_max_filesize` and `post_max_size` are valid and compatible.
- Upload temp directory is writable.

The Studio diagnostics panel now shows these checks. Regression coverage was added to the owner Chromium flow, Apache shared-host smoke and a PHP helper test for open_basedir path matching.

### Private hPanel runner behavior

The runner:
- Returns 404 outside CLI.
- Requires `<privateDir>/hosted-install-runner.json`, canonical JSON, exact key order, file mode 0600, directory mode 0700, same owner, no symlink and no hard links.
- Requires a complete 1–50 directory account web-root inventory and the Stage3 public root within it.
- Rejects private storage overlapping any account web root and runtime overlap with any other web root.
- Accepts only dedicated MySQL; SQLite/MariaDB are rejected.
- `--plan` is read-only with respect to the database, stores private review/token state and emits only a redacted plan plus a SHA-256 approval fingerprint.
- `--apply=<fingerprint>` recomputes the plan and requires the private token and fingerprint to match before schema writes.
- Successful apply creates the 25-table schema, owner account, private topology receipt and consumed marker, then removes credential-bearing config/state/applying files.
- Repeated Cron execution after success is a silent no-op; owner must still remove the Cron entry manually.
- An unresolved applying marker requires manual database inspection; do not delete it or rerun blindly.

The runner is included in the server runtime tree and exercised by the disposable MySQL 8 install probe. It has **not** been uploaded or executed on Hostinger.

## 3. CI evidence

| Run | Exact SHA | Result | Coverage |
|---|---|---|---|
| [#41331474520](https://github.com/manufact-test/ai-site-cms/actions/runs/41331474520) | `6e5e924` | SUCCESS | Shared-host routing and runner foundation |
| [#41333071592](https://github.com/manufact-test/ai-site-cms/actions/runs/41333071592) | `f4366d1` | SUCCESS | Diagnostics hardening, PHP/MySQL, Chromium, CMS engine lifecycle, HTTP E2E, Apache smoke, offline Studio artifact |
| [#41333649907](https://github.com/manufact-test/ai-site-cms/actions/runs/41333649907) | `82a6eea` | SUCCESS | Documentation/workflow checkpoint; both full CI jobs |

The workflow path filter now excludes `stage3/docs/**` and `stage3/README.md` from full CI. Runtime code and workflow changes still trigger it. This avoids spending a full browser/HTTP run on documentation-only edits.

## 4. Documentation updated

- `stage3/docs/HOSTED-INSTALL-RUNNER.md` — private config, exact key order, plan/apply, consumed marker and recovery.
- `stage3/docs/STAGING-SHARED-HOSTING.md` — hPanel Cron staging route and acceptance sequence.
- `stage3/docs/INSTALLER-AND-SETUP.md` — distinguishes low-level installer from hosted runner.
- `docs/HOSTINGER-STAGING-ADDENDUM.md` — updates the formerly unimplemented hPanel Cron idea to the actual CI-tested runner; still no real host use.
- `stage3/README.md` — current v9.13 checkpoint.
- `docs/NEXT-CHAT.md`, `PROJECT-STATUS.json`, root `README.md`, this handoff and the first-message file carry the latest checkpoint.

## 5. Next priority: real shared-host staging

No real host has been touched. Prior records identify these Hostinger sites as candidates, not confirmed targets:

- CMS/staging candidate: `lightseagreen-woodpecker-264491.hostingersite.com`
- Independent visitor/test site: `mediumpurple-fox-175549.hostingersite.com`

Before any upload or Cron execution, the owner must reconfirm the target and the external Hostinger Git auto-deployment branch. That setting is outside GitHub and is not visible to this integration. Do not assume the feature branch is unwatched.

Shared/general SSH is explicitly prohibited. The hPanel Cron route is the only current candidate. It must be owner-approved and must run the private PHP CLI command. Use a dedicated Stage3 MySQL 8.0+ database and a private directory outside every account web root. Do not reuse Stage2 database credentials, Stage2 GitHub secrets, production data or real notification destinations.

The next safe sequence:
1. Confirm the intended staging website/subdomain and external auto-deploy branch.
2. Confirm hPanel supports the required custom PHP CLI command and verify the complete account web-root inventory.
3. Owner prepares private config and secrets on the host; never request credentials in chat.
4. Run read-only `--plan` and review every check.
5. Obtain separate owner approval before `--apply=REPLACE_WITH_64_HEX_APPROVAL_FINGERPRINT`.
6. Verify owner-only Studio diagnostics on the real web SAPI.
7. Perform hands-on desktop/tablet/mobile, save/reload, publish/rollback, forms, test notifications, backup/restore and security acceptance.

If private path isolation or Cron CLI is unavailable, stop rather than exposing an HTTP installer or weakening the checks.

## 6. Product status and boundaries

- Stage2 remains **NO-GO #5–#9**.
- Stage3 formal owner acceptance remains **0/135**.
- Green CI is engineering evidence only, not product acceptance.
- No main merge, production deployment, client data or live notification destinations.
- Design Factory remains separate and untouched.
- Do not restart the CMS or repeat already-green tests without new evidence.

## 7. First-message file

Use `handoffs/lead-integrator/FIRST-MESSAGE-v9.13-2026-11-01.md` to start the next chat.
