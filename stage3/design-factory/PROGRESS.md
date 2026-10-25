# Design Factory — operational progress and D7 continuation

**Updated:** 24 October 2026  
**Branch:** `feature/stage3-design-factory`  
**Writable scope:** ONLY `stage3/design-factory/`. No main/lead edits, hosting, production, workflows, SDK, PHP or Studio-main changes.

## Product-level state (honest)

| Result | Engineering implementation | Still outstanding for full acceptance |
|---|---|---|
| **D1** — Compiler and CMS contract | Implemented; real SDK/manifests in read-only mode | Full Node checkout smoke/owner review |
| **D2** — 12 visual languages | Implemented, 12 responsive token systems | Chrome 1280/768/390 visual QA |
| **D3** — 42 section compositions | Implemented, 14 categories, real HTML/CSS showroom, actual SDK fallback | Chromium/keyboard/motion visual QA |
| **D4** — 12 four-page sector kits | Implemented, 12 RU + 4 EN demos, 64 pages, SHA256 catalog | Real filesystem smoke + portfolio review |
| **D5** — Browser Design Factory Studio | Implemented offline with edit/theme/navigation/import/export/undo/redo | Real interactive Chromium E2E and fixes |
| **D6** — Integration bridge | Implemented, deterministic versioned export/import with exact SDK | Real checked-out Node tests, lead PHP parity/import review |
| **D7** — Final verification and packaging | **Release tooling, ZIP builder, quality checklist and next-chat handoff implemented** | Execute full Node/Chromium checks, inspect screenshots, fix defects, approve package, final integrator handoff |

**Interpretation:** 6 out of 7 functional areas were already implemented before this pass. D7's operational tools are now built, but D7 is NOT accepted/completed. Do not convert a code coverage ratio into a misleading percentage of CMS acceptance. The platform remains **Stage2 NO-GO; Stage3+ unaccepted; 0/135 mandatory criteria**.

## Major D7 additions and concrete bug fixes in this pass

1. **D1 safety regression repaired.** With only one actual service, the CMS's second required repeater card is explicitly labeled as an unverified editorial example, and `checklist.readyForPublish` remains false. The old brittle D1 test now checks the meaningful two-card/owner-verification requirement, not a literal industry placeholder string.
2. `studio/runtime.generated.js` regenerated from current actual SDK/manifests and updated compiler. The same safety rule applies inside browser Studio.
3. `bin/release-audit.cjs` runs **six** real Node suites, hashes the complete Design Factory subtree and emits `manufact-design-factory-release-check-v1` (source file hashes, PASS/FAIL, explicit browser state). It keeps the gate open when Chromium is not run.
4. `bin/package-release.cjs` creates a deterministic offline **ZIP** with only Design Factory assets/source/docs, normalized paths, no symlinks, CRC32 and SHA256, no overwrite. `tests/package-smoke.cjs` checks reproducibility and archive integrity. The ZIP contains an offline Studio viewer; CLI execution requires the root CMS repo SDK/manifests.
5. `bin/visual-qa.cjs` generates screenshot evidence using local Chromium for 12 themes across three widths, D3 showroom and selected D4 kits. Output `visual-evidence.json` is NOT human visual approval.
6. `QUALITY-GATES.md` documents exact expected commands, three-width review, screenshots, quality issues and acceptance boundary.
7. `handoffs/NEXT-CHAT.md` is the authoritative first-file transfer for the **next independent developer chat**. The new chat continues D7 automatically on user instruction; does not become lead integrator and never merges itself.

## Verified and unverified — important distinction

**Observed in isolated JavaScript runtime in previous pass:** 288/288 kit × theme × language compiled and validated through the actual read-only Stage3 SDK, and 288/288 D6 deterministic integration bundle round trips; all 42 D3 registered fallback mappings were validated and malicious changed-package data was rejected. In this pass the single-service publish gate was evaluated using the regenerated browser bundle and returned `readyForPublish=false`, `missing=['facts.services']`, with the second card clearly marked as a placeholder.

**Not yet claimed:** Node filesystem/CLI test suite run on actual checkout; real Chromium UI E2E; visual review at 1280/768/390; GitHub Actions status for this branch; final packaging ZIP created and published to user; PHP renderer visual pixel parity; owner acceptance. The Chromium process did not complete even a minimal prior local attempt, so this is a genuine environment limitation until proven otherwise.

## Six essential commands (on a checkout, with Node >= 20)

```bash
node stage3/design-factory/bin/build-browser-bundle.cjs --check
node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-release-new.json
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/tests/studio-smoke.cjs
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-visual-new
node stage3/design-factory/bin/package-release.cjs /tmp/ai-site-cms-design-factory-new.zip
node stage3/design-factory/tests/package-smoke.cjs
```

See `QUALITY-GATES.md` for detailed expectations. All output paths must be NEW (never overwrite). No deployment is involved.

## Next chat — highest-priority D7 closure

1. Read `MISSION.md`, `ROADMAP.md`, this `PROGRESS.md`, `QUALITY-GATES.md` and `handoffs/NEXT-CHAT.md`; verify the LATEST branch SHA.
2. Run the actual Node tests and fix **real** failures. Do not iterate endlessly on cosmetics or rerun dozens of redundant suites.
3. Run real Chromium Studio E2E and the 3-width visual sweep. Visually inspect meaningful samples for overflow, navigation, keyboard focus, mobile, locale and unsupported CSS vs CMS output.
4. Produce the deterministic ZIP; record its actual SHA256 and Git SHA. Do **not** fabricate an upload/download link before the ZIP exists in the relevant environment.
5. When D1–D7 acceptance evidence actually passes, prepare the FINAL message to the lead chat. Until then, remain in the independent branch and never merge.

**Work cadence:** large useful blocks, precise factual reporting, no unnecessary laboratory loops, no new code outside `stage3/design-factory/`.

## D7 source audit checkpoint — 24 October 2026 (successor chat)

**Verified branch at start:** `0c55674c9024beb29ff919bf9404be997361a1e3`.
**Code checkpoint before this documentation:** `96f55a997e69a5fe1058c825d81526089845eb95`.
Read the current branch HEAD after documentation commits; these values are not promises about a later HEAD.

**Completed source-level fixes, solely in `stage3/design-factory/`:**

- `bin/release-audit.cjs`: distinguishes successful automated Node+Chromium checks (`automatedChecksPassed`) from **unapproved** human visual release acceptance (`humanVisualAcceptance:'pending'`, `releaseReady:false`). An exit code 0 with `--chromium` means automation passed, **not** that the product is ready for production.
- `bin/visual-qa.cjs`: reads actual PNG IHDR sizes rather than claiming that requested Chrome window sizes were achieved; records and fails viewport mismatches. Captures one English sector site and three additional internal mobile pages alongside the original theme, showroom and sector matrix.
- `studio/studio.js`: replaces an obsolete previously valid iframe preview with a static error state when current project compilation fails.
- `studio/studio.css`: improves the service delete button to a 44×44px touch target and keeps the service heading clear.

**Checks actually performed:** source files inspected through the linked GitHub connector; branch HEAD and compare verified; JavaScript syntax checked in an isolated V8 parser for modified `.cjs` and `.js` files. This is **NOT** equivalent to a checked-out Node runtime smoke test. GitHub compare confirmed all four code modifications are within the sole writable subtree.

**Environment blockers established:** Node v22.16.0 and `/usr/bin/chromium` are installed locally, but a `git ls-remote` for this public repository fails with `Could not resolve host: github.com`. A direct minimal Chromium headless `--dump-dom` probe was terminated after a 15-second timeout (exit 124, zero stdout), with DBus connection errors in stderr. No real repository checkout, Node test execution, browser interaction result, screenshot visual review, final ZIP artifact or ZIP SHA256 can be claimed from this session.

**Next D7 gate:** in a network-enabled checkout, run `build-browser-bundle --check`, `release-audit --out ... --chromium` with `DF_CHROMIUM_BIN`, `studio-smoke`, `visual-qa`, inspect screenshot dimensions/content and manually approve, then `package-release` + `package-smoke`. If Chromium cannot produce the requested 390px screenshots, correct the capture mechanism rather than mislabeling larger screenshots. Generate final ZIP SHA256 only after the actual package exists. Final handoff requires human visual and lead integration review.

**Progress:** D1–D6 engineered (6/7 independent deliverables); D7 remains **open**, not accepted. Full CMS acceptance remains **0/135, Stage2 NO-GO, Stage3 unaccepted**. No merge, deployment, or production mutation occurred.

### Follow-up: current-source contract matrix (same 24 October checkpoint)

Independently re-fetched the **current feature branch** sources for the official read-only `stage3/sdk/contract.cjs`, eight registered CMS component manifests, Design Factory compiler, themes, kits, compositions, adapter and D6 bridge. Executed them in a sandboxed, in-memory V8 module harness, with a read-only manifest filesystem substitute (not a Node checkout). Results: **288/288** industry × theme × RU/EN documents accepted by the real Stage3 `validateSite()`, four pages each, no `inspectSite()` link errors or incorrect `readyForPublish=true` with empty owner facts; **42/42** composition fallback mappings accepted by the real SDK; **12/12** representative EN kit+D3 D6 export/import cases passed; a mutated bundle was rejected. No production access.

**Scope of evidence:** verified source-level contract behavior; **NOT** `node tests/*.cjs` on actual filesystem, Chromium E2E, screenshot review, CI, or ZIP. These outstanding D7 gates remain mandatory.

## D7 next large engineering block — 24 October 2026

**Starting HEAD for this block:** `4015fd1fbbb31cbc3b74e0141e2c9edb68183807`. **Code checkpoint before this progress/handoff documentation:** `8525cc9fc56f759b8a983ec5ae7efc68ca2d0245`. Retrieve actual HEAD after this commit.

**Built and committed in `stage3/design-factory/` only:**

1. `lib/compiler.cjs`: eliminate false data-completeness from two Studio-created or example service placeholder rows. Reject blank/obvious generic service descriptions; `readyForPublish` still requires human owner review even when all fields are present. Added regression cases to `tests/smoke.cjs` and browser-runtime assertions to `tests/studio-smoke.cjs`.
2. `studio/studio.css`, `lib/preview.cjs`: 44px targets on actual Studio buttons/device selectors/page tabs and on site preview navigation, inline links and FAQ summary. Preserves original theme CSS and reduced-motion.
3. `studio/runtime.generated.js`: deterministically regenerated using the **unchanged exact first-party bundler** and current allowed SDK/manifests. Builder `--check` executed in a read-only mocked-filesystem V8 runner and matched exact current runtime bytes.
4. `tests/studio-smoke.cjs`: expanded real-Chromium test specification to click and inspect four browser downloads, checking real `site-v1` structure/SDK validation, versioned D6 bridge validation, source project title and workspace composition. Browser script syntax checked; the test was NOT executed in Chrome here.
5. `tests/package-smoke.cjs`: validate all ZIP central-directory file counts, names, offsets and CRC/size mirror of local headers, in addition to existing deterministic package and no-overwrite protections.
6. `README.md`: removed stale early-D1/D5 descriptions and included current, factual release constraints.

**Verified in isolated in-memory V8 using the latest GitHub branch sources:** 288/288 real SDK `validateSite` + internal route inspections, 288/288 first-party D6 export/validate/import round-trips, 42/42 registered composition fallbacks, unverified service examples remain missing, confirmed two-service draft can satisfy completeness but `requiresOwnerReview=true`, edited D6 export rejected, browser runtime rebuild parity PASS. Static parsing of the enhanced Chromium inline probe passed. This is not Node checkout execution.

**Blocked evidence:** `git ls-remote` cannot resolve github.com in the local checkout environment; Chromium `--dump-dom` on a minimal data URL timed out at 8 and 9 seconds in separate runs (also with `--no-zygote --single-process`). The GitHub Actions workflow-run list on this feature branch was empty. No Chromium E2E/screenshot approval, no six Node-suite checkout execution, and no actual ZIP or verified ZIP SHA256. D7 remains **OPEN / NOT ACCEPTED**. The documented commands in `QUALITY-GATES.md` are required on a checkout with working Chromium.

**Status:** D1–D6 implementation complete (6 of 7 independent engineering results); D7 verification and packaging partially hardened but not accepted. **CMS: Stage2 NO-GO, Stage3 unaccepted, 0/135 formal acceptance criteria**. No main/lead branch, workflow, SDK, PHP, production, or hosting edits.

## D7 continued independent pass — 24 October 2026

**Starting HEAD:** `b7df7ddc0378814d14c984626af6b7cc42efb9ee`. **Code checkpoint before this documentation batch:** `2913e98cba216af4a5e0b08ef93f09d1af6dd348`. Review current HEAD after doc commits before any further work.

**Completed this pass, all inside allowed subtree:**

- **D6 semantic package equality** (`lib/bridge.cjs`): correctly ignores differences in JSON object member ordering after PHP/JS serialization; still rejects changes to values/types, array ordering, unexpected members and untrusted/non-JSON types. Recompiles the bundle through current SDK. Added negative+positive coverage to `tests/bridge-smoke.cjs` and rebuilt offline Browser Studio runtime.
- **ZIP source coverage** (`tests/package-smoke.cjs`): extracted ZIP members must match every first-party source file byte-for-byte, with matching inventory, not only ZIP CRC, central-directory structure and deterministic output. This improves the final package confidence once run on a checkout.
- **Human-friendly visual QA** (`bin/visual-qa.cjs`): also creates offline `visual-review.html` grouping screenshot variants across themes, D3 and D4 sectors. Includes real dimensions, visible errors, pending acceptance status and links to PNG originals. Synthetic HTML output/escaping was checked; real screenshot generation is still unavailable in the environment.
- **D6 integration contract documentation** (`INTEGRATION.md`) records exactly what remains supported vs `integration_required`, including PHP serializer interoperability.

**Verified with the current generated offline runtime in isolated V8:** 288/288 real SDK site-v1 checks, 288/288 D6 import/export round trips, 42/42 valid composition mappings, 0 broken internal links, semantic key-reordered bundle accepted, three changed/invalid bundles rejected. The generated visual review HTML was validated using **synthetic metadata only** (not genuine screenshots).

**Not verified:** checked-out Node CI, Chromium UI and 1280/768/390 visual acceptance, screenshot contents, actual ZIP/archive SHA256, PHP pixel parity, server import/publish gate. Local GitHub resolution fails, and headless Chrome does not complete a minimal DOM probe. No deployment, merge, workflow edit, main/lead branch change or external API usage.

**Status:** D1–D6 implemented (6/7 engineering areas), D7 **OPEN** due missing execution and human review. Formal CMS acceptance remains **Stage2 NO-GO / Stage3 unaccepted / 0 of 135**.

## 24 October — lead SDK compatibility milestone and D7 status

**Start SHA:** `555ede1caf8a367e0fd19dfd2bea222d9380e7bf`. Lead HEAD observed later: `a4d6aedff277752e015f52b383f080d0c3178f5a`. Always retrieve current feature HEAD before continuation.

New main-branch Design Graph v1 properties were discovered **read-only**: the lead SDK now allows optional `site.designTokens` and `section.designGraph`, PHP renders them through its separate DesignGraph renderer, and the lead Studio contains a typed design-node editor. Existing 288 original Design Factory site documents passed the lead validator. All code changes here remain strictly within `stage3/design-factory/`.

- `lib/lead-design-graph-adapter.cjs` built: standalone, explicitly selected D3 composition → typed host editor graph with responsive grid, editable headings/body/CTA, first-party theme tokens, hover/focus and truthful owner-review restrictions. It uses an externally injected **new** SDK, leaves the old D6 package alone and refuses unsupported SDKs.
- `tests/lead-design-graph-smoke.cjs`: optional checkout matrix for 42×12 editable graphs and lead host render, behind `DF_LEAD_SDK_DIR`; its real filesystem run remains unexecuted.
- `proposals/LEAD-DESIGN-GRAPH.md`: exact support/partial-fidelity table and safe handoff recipe for lead. Advanced preview art/scroll galleries/repeater cards/pixel parity stay `integration_required`.

**Observed in V8 with live GitHub sources:** 288/288 old site-v1 exports accepted by lead SDK; 504/504 new graph candidates and 504/504 scoped host JS graph renders passed, including the latest concurrently updated lead Graph module. Old SDK fails closed on new keys. These are isolated source-level compatibility results, NOT checked-out Node, PHP parity, browser or production acceptance. Xvfb+Chromium probe also timed out; GitHub cannot be resolved from the local checkout container. No real ZIP artifact/hashes or release readiness can be claimed.

**Engineering direction:** D1–D6 implemented and D7 compatibility/packaging checks hardened, but D7 **NOT ACCEPTED** pending real runtime + owner visual review. Official Stage2 NO-GO, Stage3 not accepted, **0/135**. No merge, no main/lead edits.

## 24 October 2026 — Host graph diversity, runtime acceptance pending

Since commit 4fad42505bf551da1d1a42018da73f45d709b977, the optional lead adapter has gained theme-specific editable typography, layout-specific grid/span/order, card treatments, decorative native icons, safe gradients, reduced-motion-aware motion and 48px button targets. The legacy D6 output and Browser Studio were left intact. The optional lead smoke test now checks 504 distinct graphs, manual JSON changes to headline/color/mobile layout/hover, and an optional PHP validator/markup-parity check when DF_LEAD_PHP_FILE and DF_LEAD_SDK_DIR are provided.

Verified in isolated V8 against current GitHub lead source: 288/288 original CMS sites and 504/504 new editable graph candidates and JS renders; all 504 graph variants distinct. Editing site JSON after generation visibly changed the rendered result. These are source-level checks, not full checkout, PHP or browser acceptance.

GitHub checkout remains blocked by local DNS, and headless Chromium still times out even on a minimal data URL. No real ZIP, SHA256, Node-suite PASS, PHP parity PASS or human visual approval. D7 OPEN. Formal Stage2 NO-GO, Stage3 unaccepted, 0/135.

## 24 October — semantic repeater completeness and explicit host reconciliation

**Start HEAD:** `4eb6f682be5507774aa740ee4b5d107a4ddb9983`. All writes are under `stage3/design-factory/` on independent feature branch, no main/lead/SDK/PHP/workflows/deploy changes.

Major code changes in `lib/lead-design-graph-adapter.cjs`: carry ALL first-party semantic repeater items into typed CMS graph for services (up to 12), FAQ and benefits rather than truncating to one card; empty galleries display explicit rights/upload prompt, never mock images. On optional host candidate only, replace placeholder services and hero copy with actual sanitized owner-provided facts. Return provenance `contentBindings` for each relevant graph heading, body, link or repeater item; original D6 validation/export remains immutable.

New opt-in `reconcileSemantic(candidate, editedSite, hostSdk, registry)`: on host-authorized explicit action only, copy latest registered fields to mapped graph text/links, preserving all independent graph styles; reject forged/missing mappings, graph type mismatches or link errors. No hidden auto-sync and no false claims that Graph and semantic fields are live-bound.

The expanded optional test checks 504 graph candidates, all 12 owner service cards and their bindings, verified hero content, FAQ item completeness, no fake gallery media, HTML escaping, post-generation field editing without losing graph styles and rejection of forged binding metadata. The isolated V8 run using actual GitHub source **PASS**: 504 current lead SDK validators/renders and expanded regressions, with PHP clearly SKIP. Actual checked-out Node, PHP, Chromium, human visual QA, final ZIP SHA256 remain unexecuted/blocked by environment. D7 OPEN; Stage2 NO-GO / Stage3 unaccepted / 0/135.

## Final chat checkpoint — 24 October 2026

Last functional block closed a **content-loss risk** in optional host CMS reconciliation. New `inspectSemanticSync()` previews proposed updates, independent graph-only edits, and collisions without mutating source. Updated `reconcileSemantic()` preserves graph-only edits when the CMS value did not change, copies CMS field changes when the graph has not independently diverged, and **rejects simultaneous conflicting edits** instead of silently overwriting the user's custom graph content. Same-site/page, source bindings, node types and SDK validation remain enforced. D6 original remains unchanged. New expanded regression cases passed in isolated V8 with live GitHub lead SDK: 504/504 graphs and 504/504 first-party JS renders plus conflict/preview/no-mutation tests. Actual filesystem Node checkout, PHP parity, Chromium 54 screenshots, human review and ZIP SHA remain **NOT RUN**. D7 OPEN; formal Stage2 NO-GO / Stage3 not accepted / 0/135. The authoritative closeout is `handoffs/SESSION-CLOSEOUT-2026-10-24.md`; copyable new-chat introduction: `handoffs/START-NEXT-CHAT.md`.

## Independent continuation · 24 October 2026 — semantic provenance guard

**Starting HEAD:** `cbba270004524bd1ec31234429dc9c0d362e7dc5`.
**Implementation commit:** `dd8fa4057b5e83a6a1f6da0bf3ad1409a060b2e0`.
**Regression commit:** `6e96883d10c6bb2f30450a5e988332a3dd0b19db`.
**Final HEAD:** read live GitHub (later documentation commits advance it).
**Writable scope:** only `stage3/design-factory/`, independent branch; no merges.

Closed a real optional-host integrity problem: an apparently valid `contentBindings` entry could point a graph node at a different **existing** semantic item, even though previously missing and duplicate bindings were detected. Now reconciliation uses a deterministic binding inventory derived from the baseline's selected typed section and composition, then rejects redirected, swapped, removed or excess mappings. Preserves graph-only edits, source conflict refusal and owner styles. The stable D6 package did not change.

**Actually executed:** syntax-parsed modified adapter and regression test source via V8; ran four mocked-host reconciliation checks (valid sync, valid reordered mapping, redirected source refusal, missing source refusal), all PASS. Added five negative/positive cases to optional real `lead-design-graph-smoke.cjs` but **not** executed in Node/lead SDK on a complete checkout. Read-only lead HEAD observed at this checkpoint: `d215fac8b91dac1fc300312e4829872242763606` (no compatibility acceptance implied). Local `git ls-remote` failed DNS, Chromium minimal probe timed out. No Node suite PASS, PHP PASS, 54 screenshots, human visual approval, real ZIP or verified package SHA is claimed.

**Progress:** D1–D6 engineered, D7 still OPEN (6/7 directions ≈86% engineering implementation, **not** product acceptance). **Stage2 NO-GO, Stage3 not accepted, 0/135**. Finish the same D7 Node/Chromium/54-screenshot/ZIP gates on a usable checkout; do not divert into architecture/cosmetic loops.

## D7 continuation · 24 October 2026 — exact CMS field editability

**Start HEAD:** `edbaf584d2957909e4ec472dd743c15cb9f64813`. Code commits: `7481c612b23c67b1fd8f7cdec8c031c69824125c` (exact source), `966fd36438829d8dcbe8636b610976e9c4a63568` (regressions), `79b14f94e897c11acb5e3a4d670acee27fb5ee42` (initially empty values/source switching), `eae218293be1024c481c79c4ca6f20e2cf83b657` (further regressions). Always fetch current HEAD after docs.

**Functional defect fixed:** the optional Lead Design Graph bridge could bind the **wrong** valid CMS field to a rendered heading, description or CTA. The main description of `feature-highlights` draws from `second` and is shown twice, but only the detail card previously synced. CTA uses the actual action with a valid href (often `primary`) rather than a guessed action slot. Both are now bound to the exact source used by the graph. Text can be empty initially and gain owner-supplied content later without re-generation. Changing which of multiple fields supplies a visual value is explicitly rejected for host review/rebuild; no silent reinterpretation. Original D6 exporter remains untouched.

**Live source-level check (isolated V8, NOT Node checkout):** fresh GitHub lead SDK contract blob `e3e0797632bd0f9c4b50cd1865d516264602bcb8`; 504/504 valid lead candidates, 504/504 actual host JS renders, 504 unique graphs, no original D6 mutation. Targeted tests with actual lead source passed: benefits update appears twice, CTA text and href update correctly, twelfth service title can be reconciled, redirected valid source rejected. New extended tests for blank-to-filled and source-selection changes have been syntax checked and a separate mocked-host blank-to-filled case passed, but the entire optional Node suite and those new real-host cases have NOT run on a checkout.

**Environment:** `git ls-remote` still returns `Could not resolve host: github.com`; a minimal headless Chromium screenshot attempt timed out after eight seconds (exit 124), even with no-zygote/single-process and GPU disabled. No checked-out Node-suite PASS, PHP PASS, 54 PNGs/human visual approval, ZIP package or verified ZIP SHA256. D7 remains **OPEN**. Six of seven directions engineered (≈86% engineering, not accepted product completion). Formal CMS Stage2 NO-GO / Stage3 unaccepted / 0/135.

**Next large block:** real full checkout Node release-audit + optional lead smoke (read-only lead SDK/PHP), working Chromium screenshot sweep at 1280/768/390, human visual/keyboard review, deterministic ZIP and actual SHA256; only then final integrator handoff.

**Final source-level recheck for this block:** After the blank-field/source-switch implementation, reran the full latest-GitHub-source V8 matrix: 504/504 host SDK candidate validations and 504/504 actual JS graph renders PASS, 504 distinct graphs. Four focused cases passed against the actual lead SDK: empty declared CMS summary → owner-supplied text, CTA source precedence switch refused, two nodes updated from one second-benefit field, CTA text + href updated. Still **NOT** real checked-out Node or actual PHP/Chromium/human acceptance.

## 25 October 2026 — D7 owner-content completeness: 24 FAQ and structural edit safety

Start HEAD: `585de10adc93f122a6297efa8645cf8e831594c1`. Source checkpoint: `7b53bc02c7481a92e3b2108e511621781779e0a7`; test checkpoints `00a9648a368c274bcab5eeda698073f4638abef2`, `5ce8045bbe0830e4bef235cf410fc48d91b88cc2`. The final HEAD follows these documentation commits — fetch it live.

**Functional fixes within the optional host Graph adapter only:** The registered CMS `faq-accordion` repeater supports **24** items but `contentFor()` silently truncated it at 12. The adapter now renders all 24 Q&As as 24 separately editable heading/body pairs (80 graph nodes including shell, below the lead SDK's 90-node cap). A 25th FAQ or 13th service is rejected explicitly rather than silently dropped. When CMS items are added, removed or reordered after the graph snapshot, `inspectSemanticSync()` and `reconcileSemantic()` reject stale structural mappings and require an explicit host rebuild. Updating unsupported `media-story` / `photo-gallery` media or captions similarly fails closed instead of suggesting existing placeholders are current. Graph-only typography edits and canonical binding/conflict protection remain intact; D6 output unchanged.

**Evidence performed:** latest read-only lead HEAD `514a060a287d07c308525a802053e899da9ea486`, Graph source blob `f19814616601501c42bea39c253d461e70563324`. Isolated V8 with real GitHub lead SDK/source: **504/504** host graph validators, **504/504** host JS renders, all 504 distinct; separately a **24/24 FAQ page** validated/rendered, 80 nodes, plus three structural/media rejection cases. `tests/lead-design-graph-smoke.cjs` now exercises 24-item host validation/render, explicit over-limit refusal, addition/reordering/media-change refusal, and 24th answer reconciliation with independent style preservation; the full optional Node suite was **not** run on a checked-out repo here.

**D7 actual execution blockers:** container `git ls-remote` still fails GitHub DNS resolution, and minimal Chromium `--dump-dom` on a local data URL timed out (exit 124, no stdout). No real Node filesystem suite, PHP renderer comparison, Chromium Studio E2E, 54 PNG screenshots, human visual review or ZIP/SHA256 were produced. Engineering D1–D6 implemented (approximately 6/7 directions), D7 **OPEN**; formal Stage2 NO-GO, Stage3 unaccepted, 0/135. No main, lead, SDK, PHP, workflows, deployment or merge operations.

**Next action:** execute the six standard D7 Node suites plus optional real lead SDK/PHP suite in a checkout; inspect full 54-image visual matrix and Studio interactions; package ZIP and calculate actual hash only after validation; then have the lead integrator review. Focus on verification, not new architecture.

## D7 owner editing and media-parity advance — 25 October 2026

Start HEAD for this block: `c8acaa211188ac55947f80e7b97a6cc8e9db5ae9`. Code commit sequence includes `8c02ff9396327fefd6e77a17b57760900bf52489` (HTTPS links), `ed3f94b0a2cbf66403804f11b7ff288c2b5935bc` (gallery images/captions), `afb16d11efce2ac5d155af593fccbf253f053a19` (explicit host rebuild), `9ae340c3c041c52ddc723159f9c990599dfe0f9d` (media-story/linked captions), `ba270ad230ff58637af54b1788af5f82ade8f7be` (reject unsupported lead-Graph URLs), `6ffc70b1484d7ea7bc6c5953caae1429f2e53206` (asset metadata invalidation); permanent tests `9eaa5ae0b8246444351a8082f4b96ebdf089a028` and `037d63e672ca46155d30c4222f6b7db17005fa5d`. Check current HEAD after docs.

**Implemented optional host-editing workflow:** registered CMS gallery up to 20 owner-uploaded images (typed `site.assets` IDs) now creates real `image` Design Graph nodes with owner-provided asset alt plus independently editable captions, instead of a permanently stale no-media placeholder. Registered `media-story.photo` now also generates a typed image node when an asset exists; image requires a nonempty CMS alt. No media is invented in the original D6/504 default variants. After an owner modifies structure or media, the **explicit** `rebuildHostCandidate(candidate, editedSite, hostSdk, registry)` returns a new validated candidate without AI, publication, or persisting changes; exact canonical baseline provenance/site/section identity is checked. It preserves compatible manually edited typed styling by stable node/type identity, except reordered/replaced repeater items whose card identity changed. It returns a review report with preserved/created/reset node counts and mandatory host authorization/human visual review. The host remains responsible for permissions, revision locking, asset rights, saves/undo, visual signoff, publishing and PHP parity.

**Value edits:** gallery captions added after authorized media rebuild sync with existing conflict-safe `reconcileSemantic()` and preserve visual styles; changed media IDs or asset metadata (e.g., edited alt/src/variants) refuse stale reconciliation until rebuild. Owner-provided HTTPS CTA/service URLs are retained if they satisfy the **intersection** of current CMS/Graph URL policies; links the Graph cannot safely express are explicitly rejected, not silently changed to `/contact/` or secondary CTA. Main D6/site-v1 exporter remains untouched.

**Actual evidence (read-only fresh lead source, isolated V8)**: lead contract blob `e3e0797632bd0f9c4b50cd1865d516264602bcb8`, lead Design Graph blob `13243b5d0ba00c8eb0875730927437b134f90147`; 504/504 current host typed validations and 504/504 real host JS HTML renders, 504 distinct variants, original D6 non-mutated. Extra source-driven checks: JPEG owner asset/alt, gallery caption edit, asset-alt mismatch rejection and corrected alt rebuild, full 20-image gallery (68 graph nodes), HTTPS CTA update and incompatible Graph URL rejection, added FAQ item via explicit host rebuild. Permanent optional Node regression tests added and syntax checked, **not executed as a Node checkout suite**.

**Unchanged final gate:** D7 remains OPEN. Here GitHub host DNS for git checkout and minimal Chromium remained blocked previously; no checked-out full Node suite, PHP renderer, 54 screenshots/human visual review, actual deterministic ZIP and SHA256. Formal Stage2 NO-GO / Stage3 not accepted / 0/135. No changes to main, lead, SDK, PHP, CI, hosting, or production.

## 25 October 2026 — D7 content-preserving host rebuild and full isolated-source smoke

**Start branch HEAD:** `962cd87a237a05cfacbd1cba713286e194b0520f`. Changes confined to independent `stage3/design-factory/`: adapter fix `8fcff130ba0425a73cf3f90b399def7624d0562f`; optional smoke tests `41808b95d75ccadd2086aa89724b1122b35d2396` and HTTPS regression correction `16cab27fee7d8e727e6775406f889de8332e696d`; detailed host contract `handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md`. Fetch latest branch HEAD after docs.

**Fixes:** numeric repeater-card ID check previously matched a literal backslash-d due to a doubly escaped regex, meaning a swapped FAQ/service record could inherit a different record's typography. Correct ordinal detection now refuses to carry styles across mismatched item IDs. Opt-in `rebuildHostCandidate` also preserves independently edited Graph text/href only when the same typed source remains unchanged; competing Graph+CMS edits reject. Deleted owner-authored graph copy cannot be discarded silently: host must show affected text and confirm an exact set of `acceptedDiscardedNodes` identifiers, otherwise fail closed. Rebuild report now includes retained Graph copy and explicitly discarded edits. The host remains responsible for auth, atomic revision checks, owner confirmation, undo and visual review. D6 stays immutable.

**Evidence:** Full optional `tests/lead-design-graph-smoke.cjs` source suite executed with read-only *real GitHub lead/DF JS files* inside an isolated V8 emulating `node:assert/strict`, `node:path`, and `node:fs`. Result **504/504 validated unique Design Graph variants, 504/504 JS host renders, all optional test assertions PASS**, PHP SKIP. Additionally 4 focused mocked-host cases for graph text, conflict and loss acknowledgement PASS. This is explicitly **NOT checked-out real Node**, and does not cover real PHP or Chromium. The current read-only lead branch moved to `aff9af003c4201c3393033703a3edd6f01fd425c`; its changes since `95252a52c5d153b8bf9892d542526cf591f13390` touched docs and Studio, **not** the graph/contract SDK. The last tested lead graph blob was `13243b5d0ba00c8eb0875730927437b134f90147`.

**Blocked acceptance:** git checkout still fails GitHub DNS (and direct IP connection), minimal Chromium data-URL probe exits 124, so no real on-disk Node suite, PHP parity, full 54 responsive screenshots, human visual check, deterministic release ZIP or verified SHA256. D7 OPEN. Engineering directions D1–D6 are implemented, but not formal Stage3 acceptance; Stage2 NO-GO, Stage3 unaccepted, 0/135. Next priority remains actual D7 environment and independent review, not incremental percentage claims.

## 25 October 2026 — Three-block rebuild review and integration closeout

**Implementation checkpoint before this documentation update:** `0b11c94fa536887c18a4b008d8f57c846fd14219`. This work stays in the optional Design Factory / Lead adapter on `feature/stage3-design-factory`; no merge or production integration.

**Block 1 — structured rebuild preflight:** `inspectRebuild(candidate, editedSite, hostSdk, registry)` is read-only and returns `manufact-design-factory-rebuild-preview-v1`. It reports whether a rebuild is possible, whether explicit owner confirmation is needed, and structured `discardedGraphEdits` entries with `nodeId`, `property`, prior value, current value and presence. Conflicts and invalid candidates return `canApply:false`; the function checks that neither input changed. Provenance bindings are capped at 80 and exact discard acknowledgements at 180 short identifiers.

**Block 2 — complete matrix:** the optional cross-branch smoke was executed using actual GitHub JS source in isolated V8 with emulated Node builtins. Result: **504/504 lead-SDK graph validations, 504/504 scoped JS renders, 504/504 AI-free no-op rebuilds, 504/504 read-only rebuild previews**. All graph variants remained distinct and D6 remained immutable.

**Block 3 — source refresh + actionable diff:** CMS source edits were rebuilt across all 8 represented registered component families: company hero, feature highlights, services, media story, FAQ, CTA, contact and photo gallery. The updated report exposes `preservedVisualNodeIds`, `createdVisualNodeIds`, `resetVisualNodeIds`, `removedVisualNodeIds`, `retainedGraphCopyNodes` and `explicitlyDiscardedGraphEdits`. The destructive preflight also returns the predicted rebuild report without saving or treating the owner as having approved it.

**Evidence boundary:** the harness is an isolated V8 run over real GitHub source, with mocked `node:assert/strict`, `node:fs` and `node:path`; it is **not** an actual checkout / Node process. PHP parity, Studio Chromium interaction, 54 screenshot captures with human review, real release ZIP/CRC/source parity and actual ZIP SHA256 are still not run. D7 OPEN; formal Stage2 NO-GO / Stage3 unaccepted / 0/135. Next work should prioritize obtaining a real checkout/runtime and final visual/release gates rather than expanding another isolated matrix.
