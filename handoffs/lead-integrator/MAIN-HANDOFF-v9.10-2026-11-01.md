# MANUFACT AI Site CMS — lead integrator handoff v9.10 (01.11.2026)

## 1. Exact repository checkpoint

- Repository: `manufact-test/ai-site-cms`.
- Sole lead branch: `feature/stage3-ai-site-contract`.
- Latest verified functional SHA: `19a74e77c1acdfb43a7b3840f8e05bd10f2b0427`.
- Exact full GitHub Actions: [run 41302974827](https://github.com/manufact-test/ai-site-cms/actions/runs/41302974827).
  - `technology-runtime`: **SUCCESS**.
  - `contract`: **SUCCESS**.
- The run is tied to the exact functional SHA above; all 21 contract-job steps and all 7 technology-runtime steps passed.
- Current `main` observed at `12e9c3feb707e5ad46b2caeeed379eb40618466b`. No merge, deployment or production operation was performed.
- A documentation-only v9.10 commit is created on top of this functional SHA. Verify the live branch tip and its Actions before coding.

## 2. Work completed since v9.9

### D8 — independently packaged form collector

- Added an optional standalone collector ZIP alongside the visitor-site ZIP and preflight report.
- Added `package-collector.cjs` and `verify-collector.cjs`, with a reviewed PHP source allowlist, exact package inventory, file hashes and bootstrap dependency checks.
- The collector package public document root contains only `index.php` and `.htaccess`; private runtime and component registry remain outside it.
- The package excludes the CMS admin API, Studio, login, drafts, database files, backups, customer data, secrets and deployment automation.
- It uses the same dedicated Stage3 database and private HMAC secret as the CMS inbox/publisher so valid visitor submissions arrive in the existing inbox.
- The D8 disposable HTTP test extracts the real ZIP, lints it, publishes a multi-step conditional form in a disposable CMS database, starts the extracted collector on loopback, rejects an unapproved origin, invalid HMAC and inactive conditional field, then accepts a valid submission and verifies it in the same database.
- D8 is an optional delivery sidecar, not a deployment. No real host, DNS, external collector, email or Telegram was contacted.
- Details: `stage3/runtime-export/D8-FORM-COLLECTOR-SIDECAR.md`.

### Stage3 single-site installer hardening

- Added/finished the CLI-only `install.php --plan` / `--apply=<token>` path for one independent CMS instance per dedicated database.
- Private runtime configuration is persisted outside the public document root and reloaded by a fresh PHP process.
- Installation identity and database-scoped locking prevent accidental reuse or concurrent initialization.
- MySQL 8.0+ is required; MariaDB and older MySQL are rejected. SQLite is lab/CI-only.
- Read-only health checks inventory all 25 required Stage3 tables and report an incomplete schema instead of claiming the installation is healthy.
- The private installation receipt is checked for exact schema, canonical JSON, bounded size, permissions, regular-file identity and hard-link tampering.
- The plan token is bound to the database password hash, so changing the DB credential after preflight invalidates the old approval token.
- Focused probes cover SQLite, real disposable MySQL 8.4, separate database identities, non-empty DB refusal, concurrent lock refusal/retry, missing tables, receipt tampering and private config reload.
- Technical guide: `stage3/docs/INSTALLER-AND-SETUP.md`.

**Important installation limit:** the Stage3 installer is still CLI-only. There is no browser setup wizard, and the current work does not yet make first installation simple for a shared-hosting user without SSH. Do not claim requirement #183 is complete.

## 3. Exact validation

[Full Actions #41302974827](https://github.com/manufact-test/ai-site-cms/actions/runs/41302974827) completed successfully on `19a74e77c1acdfb43a7b3840f8e05bd10f2b0427`:

- Full Studio/Workbench Chromium user journey — PASS.
- SEO Engine offline contracts and standalone browser bundle parity — PASS.
- PHP 8.3 runtime with disposable SQLite and MySQL 8.4 — PASS.
- D3 visitor-release cutover/rollback loopback rehearsal — PASS.
- D8 extracted collector-package HTTP/SQLite end-to-end — PASS.
- Stage3 installer SQLite/MySQL probes — PASS.
- Full server HTTP persistence/publish journey — PASS.
- Offline click-to-open Studio package and desktop/phone screenshots — generated and uploaded.

Artifacts:
- [Offline Studio ZIP · 13081654908](https://github.com/manufact-test/ai-site-cms/actions/runs/41302974827/artifacts/13081654908).
- [Studio screenshots · 13082202778](https://github.com/manufact-test/ai-site-cms/actions/runs/41302974827/artifacts/13082202778).

These are isolated engineering results only. The collector ZIP itself is verified inside CI but is not published as a separate downloadable Actions artifact.

## 4. Owner decisions that remain in force

- The current Studio/Workbench is **temporarily agreed as the working baseline** until the owner connects the first real site and edits it hands-on.
- Do not start another abstract redesign, rearrange panels or add controls based on developer assumptions. Make targeted UX changes only after the owner uses a real site and gives concrete feedback.
- This is not final UI/UX GO or Stage 3 acceptance.
- The first pilot must start from the owner's existing landing page. Its URL/source, images, goals and target links have not yet been handed over. Do not select a random client site, invent content or fabricate assets.
- Required path remains: receive source → audit → static desktop/tablet/mobile prototype → explicit approval → actual site implementation → connect to this CMS → owner hands-on review.

## 5. Product status — do not overstate

- Stage 2 remains **NO-GO**; gates #5–#9 remain open.
- Stage 3 remains isolated engineering and is **not formally accepted**.
- Requirement ledger remains 135 MUST = 124 engineering candidates + 5 partial + 6 external gates.
- Formal owner acceptance remains **0/135**.
- Green CI does not imply product acceptance, owner approval, deployment permission or production readiness.
- SEO Engine is already integrated; do not repeat its integration.
- Runtime/export work D1–D8 is present in the isolated branch. D8 is a separate collector package, not a deployed collector.
- Design Factory remains independent on `feature/stage3-design-factory`; do not modify or merge it without explicit owner approval.

## 6. Next macroblock — CMS engine update and rollback (#184–185)

The next substantial target is the **CMS engine lifecycle**, not another visitor-site release feature.

Before implementation:
1. Inspect the current Stage3 release/package layout and the existing signed-upgrade lab under `cms/src/Release/Lab*`.
2. Separate the lifecycles clearly:
   - D2/D3 version handoff, cutover and rollback concern the published visitor site.
   - Requirements #184–185 concern independent updates and rollback of the CMS engine itself.
3. Reuse verified primitives where appropriate, but do not assume the old Stage2 lab is an integrated Stage3 updater or production-ready.
4. Define package identity, trust/signature verification, compatibility/preflight, private staging, atomic activation, previous-engine retention, safe rollback and schema migration boundaries before adding UI.
5. Keep first implementation and fault-injection tests in disposable CI only.

Requirement #183 is also not closed: the current CLI-only installer needs a separate usability decision for ordinary shared hosting. Audit whether a safe guided setup path is feasible without exposing credentials or weakening isolation. Do not silently turn the public site into an unsafe web installer.

## 7. Read before work

1. `docs/NEXT-CHAT.md`.
2. `docs/MASTER-TZ.md`.
3. Latest entry in `docs/ROADMAP.md`.
4. `stage3/docs/INSTALLER-AND-SETUP.md`.
5. `stage3/runtime-export/D8-FORM-COLLECTOR-SIDECAR.md`.
6. `stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md`.
7. `docs/ACCELERATED-MACROBLOCK-PROGRAM.md`.
8. `PROJECT-STATUS.json`.

## 8. Non-negotiable boundaries and working rhythm

- Work only in `feature/stage3-ai-site-contract`.
- Do not modify or merge `main`.
- No Hostinger, production, CELIKOM, real hosting, real databases or customer data.
- Do not send real email or Telegram messages.
- Do not change the independent Design Factory branch or SEO worker branch.
- One “продолжаем” means one substantial macroblock: 2–4 connected vertical packages and at least three meaningful user outcomes where applicable. Do not stop after one small fix or one passing smoke. Do not pad time or inflate tests.
- Use the existing full CI plus only critical tests for genuinely new paths. Verify the exact final SHA.

**Immediate instruction:** fetch the live branch tip, confirm the latest Actions state, read v9.10 and inspect the existing signed-upgrade lab before choosing the next CMS engine update/rollback implementation. Do not repeat completed D1–D8 work or resume speculative Studio redesign.
