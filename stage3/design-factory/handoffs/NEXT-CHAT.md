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
