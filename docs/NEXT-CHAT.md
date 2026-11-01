# MANUFACT AI Site CMS — каноническая точка перехода (01.11.2026, v9.10)

**Актуальный handoff:** [MAIN-HANDOFF-v9.10](../handoffs/lead-integrator/MAIN-HANDOFF-v9.10-2026-11-01.md).  
**Готовое первое сообщение:** [FIRST-MESSAGE-v9.10](../handoffs/lead-integrator/FIRST-MESSAGE-v9.10-2026-11-01.md).

## Точная контрольная точка

- Repository: `manufact-test/ai-site-cms`.
- Lead branch: `feature/stage3-ai-site-contract`.
- Last verified functional SHA: `19a74e77c1acdfb43a7b3840f8e05bd10f2b0427`.
- Exact-SHA full Actions: [#41302974827](https://github.com/manufact-test/ai-site-cms/actions/runs/41302974827) — `technology-runtime=SUCCESS`, `contract=SUCCESS`.
- Current `main` observed: `12e9c3feb707e5ad46b2caeeed379eb40618466b`; no merge/deploy.
- Documentation-only v9.10 commit is on top of the functional SHA; verify the live branch tip before coding.

## Completed in v9.10

- D8 optional standalone form-collector ZIP, package verifier, explicit public/private boundary and extracted-package HTTP/SQLite end-to-end. See [D8 technical note](../stage3/runtime-export/D8-FORM-COLLECTOR-SIDECAR.md).
- Stage3 single-site CLI installer hardening: read-only plan + exact apply token, private runtime config outside document root, independent DB identity, database-scoped lock, MySQL 8.0+ gate, 25-table integrity inventory, canonical private receipt checks and DB-password-bound approval token. See [installer guide](../stage3/docs/INSTALLER-AND-SETUP.md).
- Full Chromium Studio journey, PHP/SQLite/MySQL 8.4 runtime, D3 visitor-release rollback rehearsal, HTTP persistence/publish E2E and standalone Studio artifacts all passed in Actions #41302974827.

## Explicit limitations

- Installer is CLI-only; no browser installation wizard. Requirement #183 is not formally complete.
- No integrated Stage3 CMS-engine updater/rollback entrypoint yet. Requirements #184–185 remain open.
- D3 rollback is for the published visitor site, not the CMS engine.
- Old `cms/src/Release/Lab*` signed-upgrade work is an isolated Stage2 lab, not a finished Stage3 updater.
- No real Hostinger/production deployment or live MySQL installation was performed.

## Owner decisions and product state

- Studio is temporarily agreed as the working baseline until the owner edits the first real site hands-on; no abstract redesign before then.
- First pilot uses the owner's existing landing page; its source/materials have not yet been supplied.
- Stage 2 remains NO-GO; gates #5–#9 remain open.
- Stage 3 remains isolated and not formally accepted.
- Requirement ledger: 135 MUST = 124 engineering candidates + 5 partial + 6 external gates; owner acceptance **0/135**.
- SEO Engine is already integrated. D1–D8 runtime work is already in the branch. Design Factory remains separate and unapproved.

## Read before work

1. [MASTER ТЗ](MASTER-TZ.md)
2. [ROADMAP](ROADMAP.md)
3. [MAIN HANDOFF v9.10](../handoffs/lead-integrator/MAIN-HANDOFF-v9.10-2026-11-01.md)
4. [Installer guide](../stage3/docs/INSTALLER-AND-SETUP.md)
5. [D8 collector sidecar](../stage3/runtime-export/D8-FORM-COLLECTOR-SIDECAR.md)
6. [Studio UX acceptance](../stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md)
7. [Accelerated macroblock program](ACCELERATED-MACROBLOCK-PROGRAM.md)
8. [PROJECT-STATUS.json](../PROJECT-STATUS.json)

**Next action:** verify the live branch tip and Actions, then inspect `cms/src/Release/Lab*` alongside the Stage3 package/runtime before designing a substantial CMS engine update/rollback macroblock for #184–185. Separately audit the #183 shared-hosting installation usability gap. Do not repeat D1–D8, SEO integration, pointer-interception repair or speculative Studio redesign.
