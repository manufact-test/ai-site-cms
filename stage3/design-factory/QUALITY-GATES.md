# D7 · Final quality gates and evidence

**Document date:** 25 October 2026. **Status:** Release tooling implemented, **visual/manual and checked-out Node execution pending**. Formal Stage2 NO-GO, Stage3+ unaccepted, 0/135 mandatory criteria.

## Latest source hardening — 25 October 2026

**Functional/source checkpoint:** `39624c82fc7953c9afaa07452053f3acec6cd86a`. This commit changes only `stage3/design-factory/bin/build-browser-bundle.cjs` and `stage3/design-factory/tests/studio-smoke.cjs`.

- Fixed an output-boundary defect in the browser bundle builder: it previously wrote directly to `studio/runtime.generated.js`, which could follow an accidental final symlink or truncate a hard-linked external file.
- The builder now canonicalizes the repository root, rejects symlinked `stage3/`, `stage3/design-factory/` and `studio/` directories, rejects a symlink/non-regular final target, and writes to a same-directory temporary file before renaming it into place. The rename also replaces a hard-linked directory entry without modifying the other hard link.
- Added an isolated regression fixture to `tests/studio-smoke.cjs`: symlink rejection in build and check modes, creating a missing target, and safe replacement of a hard-linked target.
- A focused Node filesystem primitive probe **PASSed**: atomic rename left an external hard-link inode unchanged and `lstat` identified a symlink. This validates the underlying filesystem behavior only; the changed Design Factory test suite has **NOT** run in a genuine checkout.
- A fresh `git ls-remote` attempt still fails with `Could not resolve host: github.com`. Branch Actions runs remain 0. Do not claim Node/Studio/ZIP/PHP release acceptance from this source-level change.

**Release decision unchanged:** D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135 mandatory criteria. No merge or out-of-scope changes.

## Previous environment and D7 release audit — 25 October 2026

**Audit-start branch HEAD:** `bb219d64a58d590fbf2f806835e996a4277aee7d`. This was a documentation-only commit whose parent and latest functional/source checkpoint is `75884b7f794fa1dabc775d802613c38979eff4b8`. GitHub compare confirms that the single commit between those SHAs changed exactly six documentation files, all under `stage3/design-factory/`. No functional source was changed in this audit.

### Block 1 — genuine checkout, Node audit and existing CI

- Attempted `git ls-remote https://github.com/manufact-test/ai-site-cms.git refs/heads/feature/stage3-design-factory` in the execution container. Exact failure: `fatal: unable to access 'https://github.com/manufact-test/ai-site-cms.git/': Could not resolve host: github.com`.
- Node.js `v22.16.0` is installed, but no checkout is available in the workspace. The six stable D7 suites and the optional Lead suite were **not run** against a real checkout.
- GitHub API re-check: branch workflow-runs `total_count=0`; HEAD check-runs `total_count=0`; commit statuses array empty. Do not change workflows to manufacture CI evidence.

### Block 2 — PHP parity and browser acceptance

- PHP CLI `8.4.24` is installed, but PHP parity remains **NOT RUN (0 probes)** because the real repository/Lead SDK and server source are not present in the execution environment. Runtime availability alone is not parity evidence.
- `/usr/bin/chromium` exists, but a one-shot minimal headless data-URL probe timed out: `timeout 15s` ended with exit code `124` after DBus connection warnings. Therefore Studio E2E was not run and **zero** real screenshots were captured. No human visual review exists.

### Block 3 — release archive

- No source-byte-identical release ZIP was built. Without a real checkout, the package builder and extraction/source-byte comparison cannot be executed honestly.
- CRC/central-directory validation, complete source-byte parity, and the real archive SHA256 are **NOT RUN / NOT AVAILABLE**. Do not invent an artifact or checksum.

**Decision:** all three D7 closure blocks remain blocked by the current environment. D7 **OPEN**; Stage2 **NO-GO**; Stage3 unaccepted; **0/135** mandatory CMS criteria accepted. The next developer should make at most one fresh environment/checkout attempt if connectivity or the execution environment has materially changed; otherwise retain these blockers and do not loop on retries. No workflow, PHP, SDK, Studio-main, hosting, secrets, production, or out-of-scope files were changed.

## Prior evidence checkpoint — 25 October 2026

**Audit-start branch HEAD:** `bb219d64a58d590fbf2f806835e996a4277aee7d` (documentation-only commit; parent/source checkpoint: `75884b7f794fa1dabc775d802613c38979eff4b8`). The latest functional work hardens output-path containment, deterministic package/source digests and completeness checks for the visual evidence matrix. The expected matrix is now explicitly defined as 54 full captures and 30 quick captures; the latest commit adds smoke assertions for completeness, uniqueness and dimensions. These assertions are present in source but have not been run in a real Node checkout.

| Gate | Current status | Evidence boundary |
|---|---|---|
| Real Node checkout + six-suite D7 release audit | **BLOCKED / NOT VERIFIED** | Last known clone failed with DNS resolution error; no branch Actions run, check run or commit status is available for current HEAD. |
| Optional Lead Design Graph suite | **NOT RUN** | Requires genuine Node execution and the current lead source; keep it separate from stable D7 suites. |
| PHP parity | **SKIPPED — 0 probes** | No actual parity execution. |
| Chromium Studio E2E and visual captures | **BLOCKED — 0 captures** | Chromium previously timed out on a minimal page. The code now checks a 54-image matrix, but no matrix has been captured or human-reviewed. |
| Deterministic ZIP, CRC/central directory, source-byte parity, SHA256 | **NOT RUN** | Packaging protections and checks exist; no actual archive or verified hash exists. |
| D7 / Stage2 / Stage3 release decision | **OPEN / NO-GO** | Stage2 NO-GO; Stage3 unaccepted; 0/135 mandatory criteria accepted. |

Output containment is now shared through `lib/output-path.cjs`: reports, visual evidence and ZIP destinations must resolve outside the repository, including symlinked parent paths, and an existing final symlink is rejected. Package entries use deterministic name ordering and a length-framed source digest to bind exact paths and file bytes. This is implementation-level hardening, not release acceptance.

Do not close any gate based on added test code alone. Run the real checks once a usable checkout/runtime is available; if it remains unavailable, record the exact blocker and leave the gate open.
## One-command checks (on an actual repo checkout)

Requires Node.js 20 or newer. No packages to install, no server, no network. Run from repository root:

```bash
node stage3/design-factory/bin/build-browser-bundle.cjs --check
node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-D7-report.json
```

The release audit runs SIX integrated tests: D1/D2 contract/CLI, D3 composition showcase, D4 sector gallery and SHA256, D5 real bundled SDK parity, D6 reversible/tamper-rejecting package, D7 reproducible ZIP integrity. Output is a JSON report with every suite's status and a SHA256 file inventory. An `exit 3` with all Node suites green means **Chromium was not run and the gate remains intentionally open**; do not report final pass. The audit never runs against production and writes only to an explicitly requested NEW report file (or stdout).

## Browser interaction test

```bash
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/tests/studio-smoke.cjs
```

This is a real GUI scenario: open Studio, select sector and theme, switch mobile mode, edit actual owner title, select registered `photo-gallery` fallback, perform Undo/Redo, and confirm preview generation. Do not call a JavaScript-runtime-only SDK test a real GUI E2E. If Chromium fails/hangs, record the failure and keep the acceptance gate pending; do not mark PASS.

## Visual evidence at three widths

```bash
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-visual-new
```

The full mode captures first-party browser screenshots at **1280×800**, **768×1000**, **390×844**, covering all 12 visual directions, D3 showroom and four distinct sector websites. A smaller initial smoke can use `--quick`. The output includes `visual-evidence.json`, screenshot SHA256 and a pointer to original first-party source pages. Screenshots alone do **not** constitute successful human visual acceptance.

Before closing D7, manually inspect screenshots and interactions for: typography clipping/overflow, navigational menu visibility, realistic empty states, cards and CTA affordances, keyboard focus and tab order, 44px touch targets where needed, reduced-motion, no broken image symbols, high-contrast text, language correctness, page-to-page navigation, placeholders clearly labeled, gallery accessibility and accurate unsupported-feature labels. Look at at least one English kit and each distinct theme/layout. Any serious regression remains a blocker.

## Deterministic ZIP package

```bash
node stage3/design-factory/bin/package-release.cjs /tmp/ai-site-cms-design-factory-new.zip
node stage3/design-factory/tests/package-smoke.cjs
```

Creates a new, portable ZIP containing **only** the `stage3/design-factory/` subtree, including all guides, samples and standalone `studio/index.html`. ZIP entry timestamps are fixed; entries have CRC32, deflate, normalized paths and a deterministic SHA256. Existing files, symlinks, unknown asset types and source-outside-subtree paths are rejected. The ZIP viewer works offline. Running the CLI and its Node tests from ZIP-source requires the original repository's read-only `stage3/sdk/` and `stage3/components/` files; the ZIP is not a complete duplicate of main CMS.

This script **is a packaging option**, not a claim that a downloadable ZIP has already been generated on GitHub. The next developer can build it on a normal checkout, upload that resulting artifact if requested, and provide its actual link.

## D7 release decision and formal boundary

| Criterion | Evidence needed | Status |
|---|---|---|
| D1 strict first-party CMS contract | Node suites & real site-v1 JSON | Implemented, checkout run pending |
| D2 12 visual styles | 12×3 screenshots + human inspection | Pending |
| D3 42 real section previews | HTML/CSS, mapping suite, 3-width QA | Mapping implemented, Chromium pending |
| D4 12 industries, 16 local sites, 64 pages | Node export/hash test, 3-width human review | Code implemented, checkout run pending |
| D5 full offline Studio | Browser sector→theme→edit→mobile→export→undo E2E | Implementation in Git, real Chromium pending |
| D6 closed integration package | Tamper rejection + real SDK import + PHP parity limitations | Standalone adapter implemented, main integration pending |
| D7 packaging and handoff | Release-gate JSON, deterministic ZIP, manual acceptance, approved SHA | Gate tools in Git, final acceptance pending |

Never state **all seven accepted** merely because new tools are committed, or because source code passed isolated JS validation. The lead developer alone reviews integration and any changes to main. Stage2/3 product acceptance remains separate.

## D7 audit corrections (24 October 2026)

`release-audit.cjs` reports **two different concepts**: `automatedChecksPassed` requires its Node and requested Chromium suites, while `releaseReady` remains false and `humanVisualAcceptance` remains `pending` until a reviewer has inspected real screenshots, locales, keyboard interactions, inner pages and semantic CMS parity. An automated process exit 0 does **not** confer human release approval. Do not treat `nodePassed` as real Node evidence unless the six suites ran on a complete checkout.

`visual-qa.cjs` now records **actualWidth/actualHeight and requestedWidth/requestedHeight** from PNG IHDR. A size mismatch is recorded as an error and makes `captureCompleted=false`. Both the full and quick screenshot set now include an English SaaS site and its three internal mobile pages (services, approach, contact); the full capture expects **54 screenshots** (36 theme, 3 showroom, 12 sector home, 3 SaaS inner-page), and quick expects **30**. Even 54 files do not mean all 42 showcased compositions were visually reviewed: inspect the actual showcase content across its entire scrollable document.

**This checkpoint's observed limits:** GitHub branch code was readable and writable through the connector, but the normal local checkout could not reach `github.com` (DNS error). Headless Chromium failed a minimal `--dump-dom` data-page probe (15-second timeout, exit 124). Hence none of the actual checked-out Node, Chromium, viewport review or ZIP results was performed/approved here. A network-accessible checkout with a functioning Chromium runtime is required to finish D7.

**Recommended final run order:** checkout at exact branch HEAD → rebuild/check browser bundle if applicable → run integrated release audit using Chromium → run visual capture → inspect real screenshots and Studio interactions → build and CRC/SHA-verify ZIP → update evidence and obtain lead integrator review. If any gate is missing, keep D7 and `releaseReady` open.

### Additional source-level evidence, not checkout acceptance

At the current branch code, an isolated V8 execution of the actual GitHub SDK/manifests and Design Factory modules checked 288/288 site-v1 projects, 42/42 registered composition fallback exports, 12/12 representative bridge imports, and rejection of a modified bridge package. The isolated harness provides meaningful contract evidence but bypasses the real Node filesystem/CLI process, headless Chrome, screenshot review and ZIP bytes, so it **does not satisfy** the corresponding checkout or browser criteria above.

## Next D7 hardening checkpoint — 24 October 2026

- Added `tests/smoke.cjs` negative samples for two Studio service placeholders, labelled demo/example slots and empty descriptions. Checklist must retain `facts.services` missing. A legitimate two-service example can satisfy data completeness but `requiresOwnerReview` **must always be true**.
- Added `tests/studio-smoke.cjs` assertions for minimum 44px controls and template-service gating. Optional Chromium E2E now checks not just kit→theme→device→edit→gallery→undo/redo but that **all four actual browser JSON downloads** parse, are CMS SDK-compliant and the D6 bundle matches the exported site. This is authored executable QA, **not a run PASS**.
- Added central-directory parity checks to `tests/package-smoke.cjs`: entry count, CRC, compressed/original sizes and local-file-header offsets. A package is not verified without executing the Node suite against real ZIP bytes.
- Regenerated `studio/runtime.generated.js` from the exact local first-party SDK and manifests (using the unchanged builder), and verified deterministic parity in an isolated in-memory V8 harness. Contract checks run on the same fetched sources: 288/288 site-v1 and 288/288 bridge round trips, 42/42 section fallbacks, service placeholders rejected, D6 tamper detection PASS.
- Local developer environment continues to lack resolvable git checkout access and functional headless Chromium. Two minimal Chrome page probes timed out with zero stdout. No screenshot files, no full Node checkout test report or executable ZIP hash exists. No GitHub Actions runs on this feature branch were found at the checkpoint.

**Release gate remains unapproved.** A future runtime with checkout and Chromium must perform six Node suites, the four-download browser E2E, actual 1280/768/390 screenshots and human inspection, build/verify ZIP, inspect diff scope and obtain lead approval. Automated green is not manual release approval. Stage2 NO-GO / Stage3 not accepted / 0/135 unchanged.

## 24 October · D7 cross-serializer and human-review improvements

**D6 canonical JSON**: the bridge now verifies complete regenerated package semantics independently of JSON object key order (which PHP and JavaScript serializers may reorder). It still rejects altered nested data, reordered arrays, extra members, NaN/undefined and unsupported object types. `tests/bridge-smoke.cjs` now covers key reordering, mutated SEO and non-JSON input. Isolated real-SDK V8 verification passed **288/288 CMS sites, 288/288 bridge round trips, 42/42 registered section fallbacks**; the reordered package passed and 3 malformed or tampered packages were rejected. These do NOT substitute for checked-out Node or PHP execution.

**ZIP source parity**: `tests/package-smoke.cjs` now validates not just ZIP structure, reproducibility, central directory offsets and CRC32, but every extracted member's SHA256 against its actual filesystem source and complete inventory equality with `stage3/design-factory/`. The code is committed and syntax checked, but **the real ZIP builder/smoke have not been executed against the complete checkout**, so no ZIP checksum, archive artifact or PASS is asserted.

**Visual review contact sheet**: `bin/visual-qa.cjs --out NEW-DIRECTORY` now writes a **local `visual-review.html`** alongside `visual-evidence.json`, site previews and up to **54 screenshots** (30 in quick mode). The review HTML groups all 12 theme previews, the D3 showroom and RU/EN sector site captures, links original PNGs, shows measured image dimensions and highlights mismatch errors. It is offline, never automatically approves release, and preserves `humanVisualAcceptance:'pending'`. A synthetic three-card V8 test confirmed local HTML output and escaping; **no actual screenshots** were produced or manually approved here.

**Unresolved runtime barrier**: the container can run Node 22.16.0 and has /usr/bin/chromium, but `git ls-remote` cannot resolve GitHub and a minimal headless Chromium `--dump-dom` attempt timed out (exit 124, no DOM stdout). No GitHub workflow file was changed and no current branch CI run is claimed. Full checked-out Node suites, Chrome interaction, viewport evidence, owner manual review and ZIP bytes remain **OPEN**.

On a working checkout, run `node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-new.json --chromium` with a working `DF_CHROMIUM_BIN`, then `visual-qa`, open **visual-review.html** to inspect the 54 captures and actual keyboard/route behaviors, execute ZIP builder + package-smoke, and only then record the ZIP SHA256 and seek lead approval. Keep formal Stage2 NO-GO, Stage3 not accepted, 0/135.

## Latest cross-branch graph QA checkpoint (24 October 2026)

Read-only comparison against the **current lead** SDK discovered the optional first-party `site.designTokens` / `section.designGraph` contract. All **288/288** original Design Factory sites continue to validate against that new SDK. The new **optional** `lib/lead-design-graph-adapter.cjs` generates typed graph candidates without changing D6 JSON. In isolated V8 with the lead's real `contract.cjs` + `design-graph.cjs`, **504/504** combinations (42 compositions × 12 themes) passed graph validation and host HTML/CSS rendering. Rechecked on lead HEAD `a4d6aedff277752e015f52b383f080d0c3178f5a`; the first-party Graph module has changed in parallel, but all 504 remained valid. Original legacy SDK rejects the optional new keys by design.

Added `tests/lead-design-graph-smoke.cjs` as **optional**, using read-only `DF_LEAD_SDK_DIR`. It is not added to the six-suite D7 audit: it requires the lead branch's newer SDK. Its code was authored and syntax-checked; no checked-out Node pass is claimed. A candidate's `approvedForPublish` is always false, and full visual parity is not asserted. See `proposals/LEAD-DESIGN-GRAPH.md` for supported properties and gaps.

**D7 still open:** local GitHub DNS and Chromium remain blocked, including Chromium under Xvfb (12-second timeout, 0-byte DOM output). Full checked-out Node/Chrome/54-image QA, human visual review, and a real ZIP hash are still missing. Do not mistake 504 isolated SDK cases for release acceptance.

## 24 October: editable graph diversity gate

Isolated V8 on actual lead source verified 288/288 old CMS sites and 504/504 distinct host-editable graphs and JS renders. Node, host PHP, Chromium and ZIP gates remain OPEN. Optional tests/lead-design-graph-smoke.cjs now checks editable JSON changes and distinct layouts; when DF_LEAD_PHP_FILE points to actual lead DesignGraph.php it invokes PHP validate/render on four representative candidates and compares DOM markup with the JS host (CSS pixel QA still separate). No PHP PASS was claimed. Minimum 48px CTA and prefers-reduced-motion CSS observed on host JS output. Stage2 NO-GO / Stage3 not accepted / 0/135.

## 24 October — owner facts and semantic source mapping

New opt-in lead graph QA proves that an owner-filled D6 project with 12 service entries yields a valid host candidate with **12 actual editable service cards**, not 2 generic fallback rows. Content metadata identifies the registered repeater item and field supplying every graph title, paragraph and declared action. The D6 original is never mutated. The host graph also renders both first-party FAQ entries, benefits and honest unfilled gallery placeholders. User strings such as `<script>` are escaped by the first-party host renderer.

A separate explicit `reconcileSemantic` function can update graph text/links after normal CMS section edits, without overwriting graph layout or typography; forged or missing provenance is rejected. No automatic overwrite of graph-authored changes.

Executed current-source optional lead smoke in isolated V8: **504** distinct typed graphs, **504** scoped JS host renders, 12/12 owner repeater export, FAQ/gallery/hero/sync/HTML escaping regressions PASS; PHP gate SKIP (not executed), Node checkout NOT RUN, Chromium NOT RUN, screenshots NOT CAPTURED, ZIP NOT BUILT. The PHP source parity probe, when supplied `DF_LEAD_SDK_DIR` and `DF_LEAD_PHP_FILE`, now covers six representative compositions. It must be executed for a true PHP PASS. Stage2 NO-GO, Stage3 unaccepted, 0/135 remain unchanged.

## Final chat checkpoint — conflict-safe synchronization

Source-level V8 with latest fetched real lead SDK: optional lead Design Graph smoke **PASS** for 504 valid distinct graph candidates, 504 JS renders, owner copy, repeater records, safe galleries, HTML escaping and the new collision checks. `inspectSemanticSync()` does not mutate input and reports conflicts; `reconcileSemantic()` rejects concurrent edits to the same bound graph property and preserves unrelated graph content and style changes. Cross-site/page synchronization is rejected. These are **not** real Node checkout/PHP/Chromium acceptance. D7 formal releaseReady remains false. Read `handoffs/SESSION-CLOSEOUT-2026-10-24.md` before attempting final ZIP and manual QA.

## Provenance-integrity addition — 24 October 2026

Optional cross-branch Node suite `tests/lead-design-graph-smoke.cjs` now contains cases for reordered equivalent bindings (allowed) and incorrect existing item IDs, swapped sources, omitted entries, duplicate entries and unknown nodes (rejected). The implementation rebuilds expected source mappings from the original CMS section, not supplied mapping metadata. This suite is **separate** from the six stable D7 release suites and must be executed against the live lead checkout using `DF_LEAD_SDK_DIR`. The isolated mock checks run while editing this branch are not accepted Node or SDK runtime evidence.

Local checkout is still unavailable because `github.com` cannot resolve here. A standalone minimal Chromium probe with `--no-zygote --single-process` also timed out (exit 124), so no 54 PNG files, visual approval, actual package or ZIP hash were created in this checkpoint. D7 **OPEN**, Stage2 NO-GO, Stage3 unaccepted, 0/135.

## Exact field-source synchronization QA · 24 October 2026

The optional `lead-design-graph-smoke.cjs` includes concrete regressions that must pass on a lead checkout: changing `feature-highlights.second` updates both the main graph summary and the second content card; editing `cta-banner.primary` updates the visible button label **and** href; changing a blank typed summary to approved owner text updates the graph; a source switch to another action (e.g. a newly external primary href that makes secondary the selected graph action) requires explicit review rather than silently rebinding. Previous forged/omitted/duplicate source checks still run.

Source-level 504/504 validated graphs + 504/504 host JS renders were performed in isolated V8 against the live current lead SDK, with nonmutation and 4 focused edit regressions. The blank-value and source-switch real-host cases are added to the Node suite but not executed in a complete checkout; only a mocked blank-value case was run. These checks are **not** PHP rendering, browser/viewport acceptance or real ZIP evidence. The minimal local Chromium probe still times out and GitHub checkout DNS is unavailable. D7 stays OPEN.

**Latest checkpoint clarification:** On the final adapter code, the real GitHub **lead SDK source** was exercised in isolated V8 for 504/504 graph validators and renders and four focused semantic sync scenarios, including empty-to-filled and changed source refusal. The optional Node suite contains the corresponding cases but itself has not been executed on a checkout. Visual/manual, PHP, ZIP bytes and SHA256 gates remain open.

## 25 October — 24-entry FAQ acceptance matrix and safe structural edits

The original `faq-accordion` CMS manifest allows 2–24 items; the optional host Graph must preserve **every question and answer**. The 24-entry graph has 80 typed nodes, below the current lead SDK's limit of 90. Source-level V8 against lead HEAD `514a060a287d07c308525a802053e899da9ea486` validated and rendered all 24 entries and retained 504/504 composition/theme compatibility. The **Node checkout** optional `lead-design-graph-smoke.cjs` now includes 24 Q&As, a 24th-answer edit retaining typography, and over-limit refusal.

Additional safety requirements: a changed repeater set/order (add/remove/reorder) must be refused as a stale graph snapshot; a new media upload or changed caption on the incomplete gallery/media-story adapter must request host parity/rebuild rather than keeping a stale placeholder. These refusals were exercised in isolated V8 with the real host SDK. Only host-authorized baseline replacement can support structural re-selection; no transparent import or publication is implied.

Outstanding acceptance: checked-out Node six-suite and optional lead/PHP runs, real Chromium UI and 54 responsive PNGs, manual quality review, deterministic ZIP and genuine SHA256. No CI acceptance or pixel parity is asserted. D7 **OPEN**, main CMS criteria 0/135.

## D7 owner-media/HTTPS/rebuild regression gates — 25 October 2026

The optional `lead-design-graph-smoke.cjs` now asserts: honest original no-image gallery; verified typed image asset with nonempty alt rendered in host JS HTML after an explicit no-AI host rebuild; 20 gallery images (68 graph nodes under 90 limit); independently synced owner caption; owner-adjusted image alt rejected until explicit rebuild and then refreshed; media-story typed photo; HTTPS external CTA retained and synced; lead Graph incompatible (:443) links rejected rather than redirected; newly added FAQ card through explicit rebuild; malicious/fake baseline provenance still rejected; same identity owner graph styles preserved across rebuild.

Actual isolated-V8 live-source matrix after these changes: **504/504 host validations, 504/504 JS renders, 504 unique**, plus targeted owner-media/rebuild cases passing with read-only lead graph blob `13243b5d0ba00c8eb0875730927437b134f90147`. The permanent Node test source parses; it is NOT a full checkout suite PASS. No actual lead PHP image markup test, Chromium 54-PNG/manual QA, ZIP integrity or SHA256 performed. D7 remains OPEN, final acceptance unchanged.

## 25 October — loss-aware structural rebuild acceptance

A newly identified reorder bug could allow a graph card to inherit the wrong CMS item's typography because the ordinal matcher used an escaped literal `\\d` rather than digit class `\d`. The pattern is corrected and the optional smoke suite asserts a reordered FAQ's fontWeight is **not** transplanted and affected nodes are reported as `resetVisualNodes`.

Owner Graph text/href edited independently should survive an authorized rebuild when its exact bound CMS field is unchanged. A different CMS change to the same field causes an explicit conflicting-edit refusal, not silent overwrite. Deletion of a card containing owner-authored Graph text refuses rebuild until the host provides exactly the owner-approved `acceptedDiscardedNodes` set. False, duplicate and missing node IDs must fail. A new audit report includes `retainedGraphCopyNodes` and `explicitlyDiscardedGraphEdits`.

The full optional source smoke (504/504 typed graphs and 504/504 renderer invocations, plus all assertions) passed in an **isolated V8 emulation of Node builtins using real GitHub JS sources**. This is stronger coverage than syntax-only but does **NOT** count as checked-out Node/PHP/browser acceptance. Formal D7 gates are still open: checkout Node, lead PHP, 54 PNGs with owner visual review, release ZIP with CRC/source parity and actual SHA256. Follow `handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md`.

## 25 October 2026 — structured rebuild preview and full no-op matrix

New gate: `adapter.inspectRebuild(candidate, editedSite, hostSdk, registry)` must be read-only, return a versioned structured preview and never mutate either input. A destructive preview must list the exact graph text/href properties, old/new values, node presence and the predicted structural rebuild diff while retaining `canApply:false` and `requiresOwnerConfirmation:true`. The host must not mistake the preview's internal simulated report for user consent or a save/publish approval.

Rebuild metadata now contains counts and explicit node-ID arrays for preserved, created, reset and removed nodes, plus retained graph-copy count and exact owner-approved discarded graph-edit IDs. Input limits: 80 provenance bindings and 180 discard acknowledgements.

**Current isolated-source results:** 504/504 graph validations; 504/504 host JS renders; 504/504 no-op rebuilds; 504/504 read-only rebuild preflights; 8/8 CMS component-family source-refresh rebuilds; all optional smoke assertions PASS. These used actual GitHub JS sources with isolated V8 and mocked Node core modules, **not a real checkout/Node process**. PHP parity SKIP. No Chromium Studio E2E, 54 human-reviewed PNGs, real ZIP/source-byte parity or verified SHA256. Therefore this strengthens engineering evidence but does not close D7. Follow `handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md`.

## 25 October — structural loss-aware rebuild gate

A rebuild must never silently discard graph structure or owner-authored node properties. The explicit preflight/rebuild contract now covers:
- a canonical graph node deleted by the owner but about to be regenerated;
- custom graph nodes that will be removed;
- custom node IDs colliding with newly generated CMS node IDs;
- style/responsive/state/motion/type/asset/alt/icon/level edits on nodes that are reset or removed by a CMS structural change;
- graph media edits versus simultaneous CMS asset/alt changes.

The adapter raises a typed `DF_REBUILD_OWNER_REVIEW_REQUIRED` error with exact `discardedGraphEditIds`; `inspectRebuild()` returns structured entries including `kind`, `previousValue`, `currentValue`, `rebuiltValue`, `nodeInEditedGraph` and `nodeInRebuiltGraph`. The host must present these entries, authenticate the owner, lock the reviewed revision and pass the exact approved ID set. A preview is not consent, save, publish or authorization.

**Isolated-source evidence:** 504/504 validations, renders, no-op rebuilds and read-only preflights; 8 component-family source-refresh rebuilds; 8 loss-aware regression groups PASS. Actual Node checkout unavailable because `git clone` failed at DNS resolution; PHP parity SKIP (0 probes); Chromium/54 visual captures and real ZIP/SHA256 remain unrun. GitHub commit status contains no checks for this head. This is strong source-level evidence, not D7 acceptance. Do not add the optional Lead suite to stable D7 release-audit before Lead SDK integration.
