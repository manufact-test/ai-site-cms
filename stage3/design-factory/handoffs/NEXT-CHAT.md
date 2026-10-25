# Design Factory — NEXT CHAT / independent developer handoff

**Date:** 2026-10-25 (latest checkpoint appended below)
**Repository:** https://github.com/manufact-test/ai-site-cms
**Your working branch:** `feature/stage3-design-factory`
**Sole writable subtree:** `stage3/design-factory/`
**Latest functional/source checkpoint:** `39624c82fc7953c9afaa07452053f3acec6cd86a`. **Last documentation-audit HEAD:** `7b7654d6e42ae64c0ae234b19854e49d8cb388c7`. The source commit above is newer; always read live HEAD on arrival.
**IMPORTANT:** Read the CURRENT HEAD from GitHub on arrival. Do not use the older SHA as the current branch head, and do not create any competing branch.

This is the **second independent developer's permanent Design Factory program**, not the primary AI Site CMS chat. The main developer integrates into `feature/stage3-ai-site-contract` / main when ready. Do NOT edit the leader's branch or `main`, `stage3/sdk`, `stage3/components`, PHP, Studio-main, workflows, deployment, secrets, hosting or other projects. Do NOT merge this branch yourself.


## Latest source hardening — 25 October 2026

**Functional/source checkpoint:** `39624c82fc7953c9afaa07452053f3acec6cd86a`. This commit changes only `stage3/design-factory/bin/build-browser-bundle.cjs` and `stage3/design-factory/tests/studio-smoke.cjs`.

- Fixed an output-boundary defect in the browser bundle builder: it previously wrote directly to `studio/runtime.generated.js`, which could follow an accidental final symlink or truncate a hard-linked external file.
- The builder now canonicalizes the repository root, rejects symlinked `stage3/`, `stage3/design-factory/` and `studio/` directories, rejects a symlink/non-regular final target, and writes to a same-directory temporary file before renaming it into place. The rename also replaces a hard-linked directory entry without modifying the other hard link.
- Added an isolated regression fixture to `tests/studio-smoke.cjs`: symlink rejection in build and check modes, creating a missing target, and safe replacement of a hard-linked target.
- A focused Node filesystem primitive probe **PASSed**: atomic rename left an external hard-link inode unchanged and `lstat` identified a symlink. This validates the underlying filesystem behavior only; the changed Design Factory test suite has **NOT** run in a genuine checkout.
- A fresh `git ls-remote` attempt still fails with `Could not resolve host: github.com`. Branch Actions runs remain 0. Do not claim Node/Studio/ZIP/PHP release acceptance from this source-level change.

**Release decision unchanged:** D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135 mandatory criteria. No merge or out-of-scope changes.

## Previous fresh environment audit — 25 October 2026

At audit start, live HEAD was `bb219d64a58d590fbf2f806835e996a4277aee7d`, directly above functional/source checkpoint `75884b7f794fa1dabc775d802613c38979eff4b8`. Compare confirms one documentation-only commit affecting six paths, all under `stage3/design-factory/`.

- `git ls-remote https://github.com/manufact-test/ai-site-cms.git refs/heads/feature/stage3-design-factory` failed exactly with `Could not resolve host: github.com`. Node.js 22.16.0 is installed, but no real checkout is available; stable six-suite D7 audit and optional Lead suite were not run.
- Branch Actions API: zero workflow runs. Audit-start HEAD: zero check runs and no commit statuses.
- PHP CLI 8.4.24 is present, but PHP parity was not run (0 probes) because no real checkout/Lead SDK source is available.
- `/usr/bin/chromium` timed out on a minimal headless data URL after 15 seconds (exit 124); no Studio E2E or screenshots were captured.
- No release ZIP was produced; CRC, exact source-byte parity and real ZIP SHA256 remain unverified.

The three planned blocks were attempted once and are blocked by environment availability. Do not loop on retries unless connectivity/runtime has changed. Keep D7 OPEN, Stage2 NO-GO, Stage3 unaccepted, 0/135. Do not modify workflows to manufacture CI evidence.

## Latest verified environment and source re-check — 25 October 2026

**Functional/source checkpoint:** `75884b7f794fa1dabc775d802613c38979eff4b8` is 12 commits ahead of `82b9f7aab5adbb0c0950e7be951aa9ff9beb9369`; audit-start HEAD adds one documentation-only commit. All changed paths remain inside the independent writable subtree.

Recent code changes after the previous graph-rebuild checkpoint:

- Safe, canonical output path guard shared by ZIP packaging, audit report and visual QA; rejects repository destinations, symlinked parents and final symlinks.
- Deterministic package ordering and a length-framed source digest.
- Studio focus retention, 120 ms preview debounce, and rollback on failed state/import application.
- Visual evidence audit now checks exact 54-image full and 30-image quick matrices, including missing/unexpected paths, duplicates and viewport dimensions.

**Do not confuse code added with tests executed.** GitHub Actions shows no run for this branch; the current HEAD has zero check runs/statuses. The last known clone failed because DNS could not resolve github.com. PHP parity has 0 probes; Chromium timed out; no actual screenshots, human review, release ZIP or archive SHA256 exists. Earlier 504/504 isolated-V8 evidence belongs to the optional graph adapter and is not proof of the latest D7 tooling. D7 remains OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135.

Next: (1) genuine Node checkout or verifiable existing CI result, then six-suite D7 audit and separate optional Lead suite if available; (2) real PHP parity plus 54 real screenshots and human review if Chromium works; (3) build and verify a real source-byte-identical ZIP and actual SHA256. Do not modify workflows to manufacture a run.
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

## FINAL CHAT TRANSFER — 24 October 2026

**Use the newest consolidated documents rather than assuming any historical SHA in this cumulative log is HEAD:** `handoffs/SESSION-CLOSEOUT-2026-10-24.md` and `handoffs/START-NEXT-CHAT.md`. Live GitHub branch `feature/stage3-design-factory` must be queried afresh. The last functional pass added `inspectSemanticSync()` and conflict-safe `reconcileSemantic()` to the optional lead adapter; source-level V8 lead smoke with 504 valid graphs/JS renders and content-conflict regression PASS. Graph-only text updates are preserved if source unchanged; simultaneous competing source/graph edits cause an explicit conflict. D6 original intact. **D7 remains OPEN**, no checked-out Node, PHP, Chromium, screenshot human approval or real ZIP SHA256. Stage2 NO-GO, Stage3 not accepted, 0/135. Continue fast large blocks on the independent branch **only**, do not merge or touch SDK/PHP/workflows/main/hosting.

## Continuation checkpoint — 24 October 2026: binding integrity

Live branch started at `cbba270004524bd1ec31234429dc9c0d362e7dc5`, then implementation `dd8fa4057b5e83a6a1f6da0bf3ad1409a060b2e0` and tests `6e96883d10c6bb2f30450a5e988332a3dd0b19db` landed exclusively in `stage3/design-factory/`. Read the LATEST HEAD, not these source checkpoints, after documentation updates.

`lead-design-graph-adapter.cjs` now verifies canonical content provenance before every preview or explicit sync: redirects to other valid items, swapped sources and missing/extra mappings fail closed. Equivalent reordering is accepted. This protects owner content against mapping errors but does not sign the baseline or authorize edits. Five new regression scenarios are in optional `tests/lead-design-graph-smoke.cjs`. Modified adapter and test parsed in V8; four isolated mocked-host cases passed. No checked-out Node/real lead SDK/PHP/Chromium results. Latest observed *read-only* lead HEAD: `d215fac8b91dac1fc300312e4829872242763606`.

**Next:** run normal six Node suites + optional host suite on a complete checkout, then 54 real PNGs at 1280/768/390 with human review, offline Studio E2E, package builder, archive integrity and actual SHA256. Here GitHub DNS checkout failed and minimal Chromium still timed out (124); do not claim this as PASS. D7 OPEN, main Stage2 NO-GO, Stage3 unaccepted, 0/135. Remain the second developer; no merges, main, PHP, SDK, CI or production edits.

## Current successor checkpoint — 24 October 2026 · exact semantic editing

Branch start `edbaf584d2957909e4ec472dd743c15cb9f64813`; actual current HEAD **must be fetched again after documentation writes**. All commits only under `stage3/design-factory/` and no merge/main/lead/SDK/PHP/actions/hosting edits.

Additional optional lead bridge commits: `7481c612b23c67b1fd8f7cdec8c031c69824125c`, `966fd36438829d8dcbe8636b610976e9c4a63568`, `79b14f94e897c11acb5e3a4d670acee27fb5ee42`, `eae218293be1024c481c79c4ca6f20e2cf83b657`. Actual visible source CMS slots now sync: a second benefit reused in two nodes, CTA label+href from `primary`, and originally blank fields later filled by the owner. Changing the visible field source requires host approval/rebuild rather than silent rebinding. Canonical provenance protection from preceding block remains active.

Fresh GitHub lead contract blob `e3e0797632bd0f9c4b50cd1865d516264602bcb8`; isolated V8 actual-source matrix **504/504 SDK validations and 504/504 JS renders** plus four focused edit checks PASS, original D6 untouched. This is NOT real Node/PHP/Chromium. The expanded optional Node smoke includes new blank-to-filled/source-change cases, but no full checkout execution. Local GitHub DNS unavailable and Chromium screenshot probe timed out. No real ZIP hash. Keep D7 OPEN and main 0/135 formal acceptance unchanged.

Next work: obtain complete checkout, run six D7 Node suites and optional lead SDK/PHP smoke, Chromium Studio and 54 responsive PNGs with manual review, then reproducible ZIP and SHA256. Report genuine evidence; do not merge or touch other branches.

**Final verification update:** On the latest adapter source, isolated V8 against the actual lead SDK passed 504/504 typed graph validations, 504/504 real JS renderer invocations, 504 unique graphs, and four focused scenarios: benefit reused in 2 nodes, CTA text/href, blank-to-owner-content and source-switch rejection. These are genuine source-level runtime checks, **not** checked-out Node/PHP/Chromium execution. Continue D7 on a full checkout; do not claim visual acceptance.

## 25 October 2026 — independent D7 checkpoint (24 FAQ parity)

Start from the **live HEAD**, not the earlier `585de10adc93f122a6297efa8645cf8e831594c1`. This independent pass only changes `stage3/design-factory/` in `feature/stage3-design-factory`; never merge. Source fix: `7b53bc02c7481a92e3b2108e511621781779e0a7`; test updates `00a9648a368c274bcab5eeda698073f4638abef2` and `5ce8045bbe0830e4bef235cf410fc48d91b88cc2`.

The newer host adapter now retains **all 24 declared FAQ entries** (previously stopped after 12), explicitly refuses excess repeater entries, rejects reordered/added/deleted semantic items until a structural rebuild, and refuses unrepresented gallery/media changes to avoid stale claims. A lead-host test for 24th-answer edit and independent styling preservation was added. Reconciliation remains opt-in, one-way, nonpublishing, and revision/permission UX is lead-owned. No change to D6 export or lead files.

Latest inspected lead HEAD: `514a060a287d07c308525a802053e899da9ea486`, Graph blob `f19814616601501c42bea39c253d461e70563324`. **Actually passed (isolated V8 using GitHub source):** 504/504 lead SDK host candidates, 504/504 JS renders, 24/24 FAQ content in an 80-node valid host graph, plus add/reorder/media refusal probes. **NOT run:** checked-out Node optional test (including new 24th-answer regression), PHP, Chromium, 54 real screenshots, human acceptance, real ZIP and SHA256. Github DNS git clone remains blocked and Chromium minimal data-page times out. D1–D6 engineered; D7 OPEN; Stage2 NO-GO / Stage3 unaccepted / 0/135.

Continue on real checkout: run `node stage3/design-factory/bin/build-browser-bundle.cjs --check`, `node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-D7-final.json --chromium` with explicit `DF_CHROMIUM_BIN`, plus `DF_LEAD_SDK_DIR` and `DF_LEAD_PHP_FILE` optional host suite; capture and visually inspect full 54 PNGs, then package and record actual ZIP SHA256. If blocked, preserve honest pending gates and focus on valuable functional corrections. Do not merge or edit main/lead/SDK/PHP/actions/production.

## Current engineering checkpoint — 25 October 2026 · owner media and AI-free graph rebuild

Start from fresh independent branch HEAD; this pass began `c8acaa211188ac55947f80e7b97a6cc8e9db5ae9`. No merge/main/SDK/PHP/workflows/hosting edits; only `stage3/design-factory/` in `feature/stage3-design-factory`. Optional adapter now supports first-party owner image assets in gallery (up to 20, 68 graph nodes) and media-story, nonempty owner alt, editable captions and safe external HTTPS links. `rebuildHostCandidate` opt-in host API allows revision-authorized structural/media changes **without AI**, retaining compatible graph visual styling and exact provenance and rejecting incompatible site/section/candidate baseline; result **not published** with mandatory owner visual review. Stale asset metadata/alt changes refuse a blind sync; post-rebuild caption can sync. CMS-permitted but Graph-unsupported HTTPS :443 fails loudly. Main immutable D6 remains unchanged.

Latest source-level check used actual read-only lead contract blob `e3e0797632bd0f9c4b50cd1865d516264602bcb8`, Graph blob `13243b5d0ba00c8eb0875730927437b134f90147`: **504/504 typed graph validators and 504/504 JS renders, 504 distinct**; gallery JPEG and nonempty alt, caption, asset alt refresh, 20-image gallery, CTA HTTPS, third FAQ structural rebuild passed in isolated V8; expanded optional Node tests syntax checked but NOT executed on a real checkout. All source commits and tests in isolated folder, available in GitHub branch; read source/docs for exact commit history.

**D7 OPEN**: still lacking actual on-disk Node release audit, optional lead SDK/PHP smoke, Chromium screenshot QA 1280/768/390 (54 images) with real human review, ZIP/CRC/source parity, real ZIP SHA256. Prior local git remote DNS failed, minimal headless Chromium timed out. Do NOT conflate V8 source validation with Node/real browser/PHP acceptance. Engineering ≈6/7, formal CMS Stage2 NO-GO / Stage3 unaccepted / 0/135. Next fastest progress: obtain full checkout, run D7/lead suites, screenshots, archive integrity and explicit lead review. Only the main integrator should accept or merge.

**Last read-only lead-head compatibility recheck (25 October):** While this handoff was being written, the lead branch advanced to `95252a52c5d153b8bf9892d542526cf591f13390`. Re-ran source-level isolated V8 against its actual SDK files: 504/504 typed candidates and 504/504 host Graph JS renders PASSED, 504 unique graphs and D6 unmodified; typed JPEG media gallery rebuild/render also PASSED. Graph blob in that read was `13243b5d0ba00c8eb0875730927437b134f90147`. This remains a read-only, non-Node/non-PHP/non-Chromium check. Fetch lead HEAD again before future acceptance.

## Next-session checkpoint — 25 October 2026, loss-aware rebuild

**Live branch HEAD must be fetched.** This session started from `962cd87a237a05cfacbd1cba713286e194b0520f`. Code `8fcff130ba0425a73cf3f90b399def7624d0562f` fixes a real wrongly escaped ordinal-matcher bug (style bleeding between reordered repeater cards) and preserves independently edited Graph text/href on AI-free rebuild when CMS source unchanged. Conflicting CMS+Graph edits fail. Deleted Graph-only user copy is protected until the host explicitly supplies an exact reviewed `acceptedDiscardedNodes` set; incorrect, missing and duplicate acknowledgements fail. `rebuild` reports preserved/restarted nodes and copy-discard decisions; not published, not authorized automatically. Full contract/integrator examples: `handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md`.

Test changes `41808b95d75ccadd2086aa89724b1122b35d2396`, `16cab27fee7d8e727e6775406f889de8332e696d`. For the first time in this project chat, **the complete optional `lead-design-graph-smoke.cjs` source test suite ran and PASSed** under an *isolated V8 emulation* of `node:assert/strict`, `node:path` and `node:fs` with real read-only GitHub SDK and independent branch source. Output confirmed 504 distinct validated lead candidates, 504 real lead JS renders, D6 immutability and legacy SDK rejection; PHP SKIP. Additional 4 focused synthetic valid-host cases for manual Graph copy, conflict, card reorder and exact discarded node confirmation passed. This is **NOT an actual local Node checkout execution** and not PHP/Chromium/visual acceptance. Latest read-only lead HEAD `aff9af003c4201c3393033703a3edd6f01fd425c`; latest changes touched Studio/docs not SDK. Node/Chrome remain environment-blocked (GitHub DNS inaccessible; minimal Chromium timed out).

Next fastest steps: real checkout Node full release-audit + optional lead/PHP integration, visual QA Studio 54 captures at 1280/768/390, human/owner UI visual review and file-integrity ZIP+actual SHA256. Keep D7 OPEN, Stage2 NO-GO / Stage3 unaccepted / 0/135, do not merge or modify main, lead, SDK, PHP, Actions or production. Work only `stage3/design-factory/` on `feature/stage3-design-factory`.

## Next-session checkpoint — 25 October 2026, three-block rebuild review

Latest functional code checkpoint: `0b11c94fa536887c18a4b008d8f57c846fd14219`; re-read live HEAD before writing. Latest code adds `inspectRebuild(candidate, editedSite, hostSdk, registry)` and a structured visual diff. Read `handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md` first.

**Three substantial blocks completed:**
1. Read-only rebuild preview with exact discarded graph copy details, no-mutation guarantee and bounded input sizes.
2. Full `42 compositions × 12 themes = 504` source matrix: 504/504 lead SDK validations, renders, no-op rebuilds and read-only preflights.
3. Source-refresh rebuild tests for all 8 CMS component families, plus actionable preserved/created/reset/removed graph-node IDs for host UI review.

Test output came from isolated V8 using real GitHub JS source and emulated Node core modules; it is **not** an actual checked-out Node process. PHP is SKIP; Chromium/54 PNG visual review and real ZIP SHA256 remain open. D7 OPEN; Stage2 NO-GO / Stage3 unaccepted / 0/135.

Next priority: obtain a real checkout and run the existing Node release-audit plus this optional Lead suite; if available, run real PHP DesignGraph parity. Then capture 54 real 1280/768/390 screenshots, review them visually with the owner, and produce a source-byte-identical ZIP with archive integrity and a genuine SHA256. Continue only in `stage3/design-factory/` on `feature/stage3-design-factory`. No merge, no main/lead SDK/PHP/workflow/production changes.

## Previous substantial checkpoint — 25 October 2026

This was a full loss-aware rebuild block, not a cosmetic follow-up.

1. **Node structure safety:** canonical node deletions, custom node drops, new-ID collisions and edited properties on nodes reset/removed by CMS structure changes now require explicit exact-ID owner review. Rebuild throws typed `DF_REBUILD_OWNER_REVIEW_REQUIRED` with `discardedGraphEditIds`.
2. **Media three-way conflict handling:** graph-owned image/video `assetId` and alt/media edits persist when the CMS-derived value is unchanged; divergent edits on both sides fail closed.
3. **Broad regression and evidence:** 504/504 SDK validations, scoped renders, no-op rebuilds and read-only previews; 8/8 component-family source refreshes; 8 loss-aware regression groups. The suite explicitly covers owner-deleted nodes, custom nodes, collisions with new CMS IDs, style loss on removed cards, reordered card styles, media alt/asset edits and conflicts.

The suite used actual GitHub JavaScript sources in isolated V8 with emulated Node core modules. A real checkout attempt failed because the environment could not resolve `github.com`. Therefore no actual Node checkout, PHP parity, Chromium screenshots, owner visual review or real ZIP/SHA256 acceptance is claimed. GitHub combined status had no checks and the commit had no PR-triggered workflow runs.

**Next three substantial blocks:** (1) establish genuine Node execution or a trustworthy existing GitHub Actions run and execute the D7 release audit plus the optional Lead suite without modifying workflows; (2) run real PHP parity and capture/review 54 real 1280/768/390 Chromium screenshots if the environment supports it; (3) package a source-byte-identical release ZIP, verify archive integrity and calculate its real SHA256. Do not fake results if the environment cannot provide the required runtime.

Stay on `feature/stage3-design-factory`, write only under `stage3/design-factory/`. Do not merge, edit main/Lead SDK/PHP/Studio-main/workflows/hosting/production, or fold the optional suite into stable D7 audit before Lead SDK integration.


## Previous continuation checkpoint — 25 October 2026 · visual evidence matrix

Latest functional/source commit is `75884b7f794fa1dabc775d802613c38979eff4b8`. The release path now has canonical output containment and deterministic source digest protections; the Studio preserves focus and debounces preview recompilation; visual QA checks all 54 expected full-matrix screenshots (or 30 quick-mode screenshots) and rejects missing, unexpected, duplicate or wrong-dimension captures.

These are code changes plus added assertions, not an acceptance result. No current-branch Actions runs/checks/statuses are available. Real Node checkout/audit is blocked by the last known GitHub DNS failure, PHP parity is 0, Chromium has timed out, and no screenshots, human review, ZIP or SHA256 have been produced. Keep D7 OPEN. The next chat should attempt each viable environment route once, then move on or document the exact blocker rather than repeating retries.