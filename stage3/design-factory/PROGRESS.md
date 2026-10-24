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
