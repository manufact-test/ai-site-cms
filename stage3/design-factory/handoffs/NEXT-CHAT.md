# Design Factory — NEXT CHAT / independent developer handoff

**Date:** 2026-10-24
**Repository:** https://github.com/manufact-test/ai-site-cms
**Your working branch:** `feature/stage3-design-factory`
**Sole writable subtree:** `stage3/design-factory/`
**Previous verified head (before completing handoff documentation):** `3704010f467b76b96560a7d376c65499e61d4fcf`
**IMPORTANT:** Read the CURRENT HEAD from GitHub on arrival. Do not use the older SHA as the current branch head, and do not create any competing branch.

This is the **second independent developer's permanent Design Factory program**, not the primary AI Site CMS chat. The main developer integrates into `feature/stage3-ai-site-contract` / main when ready. Do NOT edit the leader's branch or `main`, `stage3/sdk`, `stage3/components`, PHP, Studio-main, workflows, deployment, secrets, hosting or other projects. Do NOT merge this branch yourself.

## What has genuinely been built (D1–D6)

- **D1**: deterministic `manufact-design-factory-v1` → real `manufact-ai-site-v1` compiler, first-party manifests/SDK, four-page websites, safe editorial placeholders, versioned project migration and offline CLI/preview.
- **D2**: 12 typed color/typography/layout directions, programmatic >=4.5:1 contrast checks, separate CMS-supported vs design-only tokens, responsive preview CSS and reduced-motion.
- **D3**: 42 compositions / 14 categories, real offline HTML/CSS showroom, 42 registered semantic CMS component mappings, 8 well-documented proposals requiring future PHP/Studio integration.
- **D4**: 12 industry kits, 6 architectural sequences, 12 RU and 4 EN examples, 64 actual HTML pages from batch generator, real site-v1 artifacts and SHA256 manifest.
- **D5**: offline [browser Studio](../studio/index.html) with industry/theme catalogues, page+device previews, owner facts/services editing, 42 pattern selection, Undo/Redo, project/workspace import/export and SDK-validated site-v1/bridge downloads. Runtime is an embedded static bundle of **the unchanged first-party Stage3 SDK/manifests** and own modules.
- **D6**: [versioned integration bridge](../INTEGRATION.md) with closed workspace/export, deterministic site recompilation, unknown key/modified package rejection, CMS importer output and explicit parity matrix. No production publish path.

Earlier isolated JS matrix checks: **288/288** kit × theme × language contracts and D6 exports; **42/42** semantic fallback mappings; attempted injected package changes were rejected. These are **NOT full checked-out Node, Chromium or CI acceptance.** Formal Stage2 NO-GO, Stage3+ not accepted, 0/135 criteria.

## Latest D7 development in preceding chat

- Discovered and fixed a regression in the old D1 smoke: it compared literal industry placeholder text. It now checks actual service fallback semantics.
- Closed accidental false “ready to publish” with only one owner-provided service: second slot visibly marked “Example (verify)” / “Пример (подтвердить)”, checklist flags missing verified services. Browser bundle regenerated to match exact current source.
- `bin/release-audit.cjs`: one command executes SIX relevant Node suites and writes an explicit gate report + SHA256 source inventory.
- `bin/package-release.cjs` and `tests/package-smoke.cjs`: reproducible portable ZIP with local Studio/source/docs, CRC32 and SHA256, no overwrite/symlinks/path escapes.
- `bin/visual-qa.cjs`: captures real Chrome screenshots of all 12 themes at three viewports, D3 showcase and representative D4 kits; produces evidence JSON. Screenshots require human review; not an automatic PASS.
- `QUALITY-GATES.md`: exact acceptance criteria and commands.

## Read first, in this order

1. `stage3/design-factory/MISSION.md` — permanent scope/rules
2. `stage3/design-factory/ROADMAP.md` — D1–D7 success criteria
3. `stage3/design-factory/PROGRESS.md` — latest state/gaps
4. `stage3/design-factory/QUALITY-GATES.md` — D7 tests, archives, viewport checks
5. `stage3/design-factory/studio/README.md` — real user workflow
6. `stage3/design-factory/INTEGRATION.md` — PHP/SDK limitations and safe handoff
7. Source scripts in `tests/`, `bin/`, `lib/`, `catalog/`.

## Your next big block (finish D7, no new assignment needed)

Use the owner’s accelerated development mode: take a **large coherent slice**, not endless microscopic edits. But do not falsify tests.

1. Read current HEAD/diff; verify allowed writable subtree, and check no conflict with the primary developer.
2. Execute **real Node on an actual checkout**, not an isolated JS model, using `node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-release-new.json`. This covers D1–D6 and ZIP integrity. Rebuild browser bundle if the `--check` gate fails.
3. Execute real Chromium interaction smoke: `DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/tests/studio-smoke.cjs`; if blocked, record exact error and don't claim success.
4. Execute `DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-visual-new`. Inspect screenshots for 1280/768/390 widths and manually test keyboard, overflow, empty states, navigation, reduced-motion and selected RU/EN sites. Fix high-impact issues only. This is the largest remaining D2–D5 DoD gate.
5. Run tests again, produce **actual** portable ZIP using `node stage3/design-factory/bin/package-release.cjs /tmp/ai-site-cms-design-factory-new.zip`; verify archive/source SHA. Keep all published repo modifications solely within allowed subtree.
6. Update PROGRESS/README/QUALITY-GATES with factual results; mark D7 complete ONLY if visual and contract QA truly pass. Prepare a final **lead integrator handoff** stating current exact SHA, verified/blocked tests, current site-v1 fields, unsupported PHP visual parity, owner review gates and safe checkout/cherry-pick/squash instructions. Do not merge.

## User-facing reporting convention

After each meaningful large pass, include **actual functional progress**, explicit verified PASS/SKIP/FAIL, accurate git SHA, remaining defects/gates, and note that 0/135 formal CMS acceptance is unchanged. The 6/7 D1–D6 implementation count is **not** an 86% accepted product readiness measure. No new scope outside Design Factory without the owner's permission.

If real Chromium cannot be run, still complete the viable Node/package/doc tasks, report the blocking evidence, and leave D7 visually pending. Do not spin endlessly on Chromium environment setup.

## Follow-on D7 audit checkpoint (24 October 2026)

Starting HEAD was `0c55674c9024beb29ff919bf9404be997361a1e3`; code checkpoint **before docs** was `96f55a997e69a5fe1058c825d81526089845eb95`. Always fetch actual HEAD, especially after this documentation update.

Source improvements now on the same isolated branch:

1. Release audit does not confuse green automation with owner visual acceptance: `automatedChecksPassed` is distinct from permanently pending `releaseReady:false` until human review.
2. Visual screenshots include PNG intrinsic viewport dimension checks, EN SaaS, and three internal-page mobile screenshots (54 full / 30 quick).
3. Browser Studio removes stale valid iframe when a compile fails; remove-service button hit target is 44px.
4. GitHub compare shows four source paths all under `stage3/design-factory/`.

**Neither checked-out Node execution nor Chromium acceptance is confirmed**. Local Node v22 exists but the runtime cannot resolve `github.com` to download this checkout; installed Chromium also hangs on a minimal data URL and exits on a 15-second timeout. V8 static syntax inspection and GitHub diff validation only. No new ZIP file, screenshot evidence directory, source audit JSON, or verified archive hashes exist. No claims of successful runs. Formal status unchanged: Stage2 NO-GO, Stage3 not accepted, 0/135.

**Resume with an accessible checkout and working browser:** run D7 commands listed above; verify all actual PNG dimensions and inspect all layouts and the English inner pages, repair only substantive failures, create a real ZIP and record sha256, then issue a final handoff to the lead developer. Remain in this feature branch, and do not merge.

**Read-only source verification added in this chat:** 288/288 current-SDK site-v1 validations and internal-link checks, 42/42 valid registered D3 fallback sections, 12/12 representative D6 bridge round trips and rejection of a modified package. These were run in a V8 in-memory harness using GitHub-fetched source and manifests, *not* on a checkout; keep Node, Chromium, visual and ZIP gates open. See `PROGRESS.md` for the precise boundary.

## Latest independent D7 checkpoint — 24 October 2026

**Start SHA:** `4015fd1fbbb31cbc3b74e0141e2c9edb68183807`; **pre-handoff-doc source SHA:** `8525cc9fc56f759b8a983ec5ae7efc68ca2d0245`. Always query the live HEAD first. This remains the ONLY working branch, and `stage3/design-factory/` the ONLY mutable path.

Changes in the latest block:
- Compiler/service checklist fixed: two default Studio service placeholders, `Example (verify)` copy and empty service descriptions cannot mark verified owner services. Real two-service fields are still subject to owner review.
- 44px minimum touch targets for Studio navigation/buttons/service removal, site preview navigation, CTA text links and FAQ summary. Rebuilt offline browser runtime from unchanged Stage3 SDK/manifests and verified exact source parity in V8.
- New regression cases in D1 smoke and enhanced D5 browser smoke to validate **four actual browser exports** (site, D6 bundle, project, workspace), not merely buttons. ZIP smoke now fully audits its central directory for local header consistency.
- Read current `PROGRESS.md`, `QUALITY-GATES.md`, `README.md` for exact details and commands.

**Executed versus pending:** verified in isolated V8 on current GitHub source: 288/288 real SDK site documents + local links, 288/288 D6 exports/imports, 42/42 D3 fallbacks, service placeholder gate, tamper rejection, generated browser bundle parity, inline Chromium probe JavaScript syntax. Did **not** run Node against an actual checkout, launch successful Chromium, inspect three-viewport screenshots, or produce an actual ZIP. Local git DNS for GitHub fails and headless Chrome hangs even on a minimal data URL; no branch GitHub Actions runs found.

**Next action without a new product brief:** obtain accessible complete checkout, execute `node stage3/design-factory/bin/build-browser-bundle.cjs --check` and `node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-audit-NEW.json --chromium` with `DF_CHROMIUM_BIN`. Then capture and **manually review** 54 full screenshots, investigate viewport mismatch if Chrome forces minimum window dimensions, run package builder and complete ZIP smoke, record **actual** SHA256 of ZIP and source Git HEAD, and prepare the final integrator handoff only after real evidence. Never touch main, workflow, SDK, PHP, hosting, production or merge the branch. Formal CMS status Stage2 NO-GO, Stage3 not accepted, 0/135.

## D7 continuation checkpoint · 24 October 2026

**Start:** `b7df7ddc0378814d14c984626af6b7cc42efb9ee`. **Code checkpoint before docs:** `2913e98cba216af4a5e0b08ef93f09d1af6dd348`. Retrieve the **current** branch HEAD immediately; do not assume either SHA remains HEAD after documentation. Own only `feature/stage3-design-factory` and `stage3/design-factory/`.

What changed: D6 now compares complete recompiled JSON **semantically** (unimportant object-key order does not invalidate imports, but value/array/unknown/type tampering does). `tests/bridge-smoke.cjs` tests sorted/reordered JSON, changed nested SEO and forbidden non-JSON values; the Studio bundle was regenerated. ZIP smoke now checks **every extracted byte and the complete source inventory**. `visual-qa.cjs` creates an offline `visual-review.html` contact sheet of the full screenshot matrix with dimensions/errors and explicit human acceptance pending.

Isolated current-runtime V8 checks: 288/288 site SDK + link validation; 288/288 D6 round trips; 42/42 composition fallbacks; reordered JSON accepted; three corrupted/invalid bundles rejected; synthetic HTML contact-sheet/escaping test passed. These are **not** checked-out Node test runs or real screenshots. The local environment still cannot resolve github.com for a checkout and Chromium hangs even on a minimal page. No ZIP exists, no checksum or browser PASS. Formal Stage2 NO-GO, Stage3 not accepted, 0/135.

Next **without asking the owner for scope**: verify live feature HEAD/diff, run six Node suites + build-browser-bundle `--check` on an accessible checkout, run a functional Chromium Studio interaction/download smoke, generate full 54 visual screenshots, inspect `visual-review.html` at 1280/768/390 (and keyboard/locale behaviors), fix only critical failures, generate **real ZIP** with `package-release`, run `package-smoke` and record exact ZIP SHA256. Only after completed evidence and owner visual review should final D7 handoff be made to the lead. Never merge or touch SDK/PHP/workflows/main/hosting/production.

## Latest D7 handoff update: read-only lead Design Graph compatibility (24 October 2026)

Starting SHA for this block was `555ede1caf8a367e0fd19dfd2bea222d9380e7bf`; retrieve the live current HEAD immediately (docs may add more commits). Stay on `feature/stage3-design-factory`, write solely under `stage3/design-factory/`, never merge or modify SDK, PHP, Studio-main, workflows or production.

In parallel the lead implemented optional **Design Graph v1** (`site.designTokens`, `section.designGraph`). Read-only tests showed **288/288** stable Design Factory exports still pass newer lead SDK. An **opt-in** `lib/lead-design-graph-adapter.cjs` now maps a selected one of 42 D3 compositions + one of 12 themes to typed host-editable nodes, tokens, responsive rules and button states, without changing the old D6 export. In-memory real-new-SDK validation and host JS rendering passed **504/504** each, including revalidation against lead HEAD `a4d6aedff277752e015f52b383f080d0c3178f5a`. This was **NOT** checked-out Node or PHP/Chromium acceptance. Read `proposals/LEAD-DESIGN-GRAPH.md`; the candidate is explicitly partial fidelity, not an automatic full parity claim.

New optional `tests/lead-design-graph-smoke.cjs` uses `DF_LEAD_SDK_DIR` to read the lead's `stage3/sdk`. Keep separate from stable D7 audit. See the main `QUALITY-GATES.md` for exact existing Node/Chromium/ZIP gates; still blocked locally (GitHub DNS, Chromium timed out including Xvfb). No real screenshots, final ZIP or SHA256 yet. Next large work block should obtain real runtime acceptance, fix only proven major defects, and provide a verified archive + final lead handoff when possible. Formal Stage2 NO-GO, Stage3 not accepted, 0/135.

## Latest 24 October update — editable Design Graph profiles

Current branch should be fetched live. The optional adapter now creates 504 distinct typed host graphs (42 D3 compositions × 12 themes): actual CMS-editable grid/span/order, font/spacing, card visuals, icons, gradients, hover/focus and reduced-motion-aware motion. A 48px CTA is retained. Isolated lead-source V8: 288 old sites compatible, 504 host candidates accepted and rendered, and manual post-generation JSON edits re-rendered without AI. The stable D6 package remains unchanged.

The optional lead smoke adds unique-graph assertions, editability checks and a PHP validator/render markup parity option behind DF_LEAD_PHP_FILE plus DF_LEAD_SDK_DIR. No actual Node checkout, PHP parity, Chrome screenshot or ZIP was completed here (GitHub DNS and Chromium remain blocked). D7 OPEN. Stage2 NO-GO / Stage3 unaccepted / 0/135. Never merge or modify main/lead SDK, PHP or production.

## Most recent D7/Design Graph checkpoint — 24 October 2026

Starting SHA for this block: `4eb6f682be5507774aa740ee4b5d107a4ddb9983`. Read actual live HEAD before working. Continue independent branch `feature/stage3-design-factory` and edit solely `stage3/design-factory/`; NEVER merge or change the lead SDK, main branch, PHP, workflows or production.

Latest code: optional `lib/lead-design-graph-adapter.cjs` now exports all first-party service/FAQ/benefit repeater data as individually CMS-editable graph nodes (service max 12); refuses fake gallery media; uses sanitized owner-supplied hero/service facts instead of demo copy in the host candidate only. `mapping.contentBindings` records source item/slot/field. New `reconcileSemantic(candidate, editedSite, hostSdk, registry)` explicitly refreshes graph text/links after ordinary CMS field edits, while preserving graph-only style changes and rejecting forged/missing bindings. It must NOT be triggered automatically on unrelated graph edits. **This is snapshot + opt-in one-way sync, NOT automatic live binding or publish approval.**

Expanded `tests/lead-design-graph-smoke.cjs` covers 504 distinct valid host graphs, all 12 owner services, full FAQ, safe gallery placeholder, preservation of typed styles during sync, forged binding rejection and escaped user HTML. Executed in isolated V8 using current GitHub branch SDK/Graph: PASS (504/504 host JS renders, PHP SKIP). PHP optional parity matrix expanded to 6 patterns. A true Node checkout, PHP execution, Chromium human inspection, final ZIP and SHA256 remain NOT RUN; local GitHub DNS and headless Chromium are blocked. Stage2 NO-GO, Stage3 unaccepted, 0/135.

Next task: verify current lead contract after parallel commits; run checkout six D7 Node suites + optional lead SDK/PHP suite, real Chrome Studio interactions and 54 screenshots, human review, package builder+source-parity ZIP test, record actual SHA256 and pass an explicit integration handoff to the lead developer. No fake PASS claims.
