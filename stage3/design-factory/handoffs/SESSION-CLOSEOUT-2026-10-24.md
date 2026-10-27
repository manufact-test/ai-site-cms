# AI Site CMS — Design Factory: independent developer session closeout
**Date:** 24 October 2026
**Repository:** https://github.com/manufact-test/ai-site-cms
**Branch:** `feature/stage3-design-factory` (never merge autonomously)
**Writable area:** ONLY `stage3/design-factory/`
**Starting HEAD of this final block:** `9b1c92f9a44f3d477e0c4d15d88db13d2d19a5b5`.
**Final HEAD:** always fetch live from GitHub; subsequent documentation commits advance it.

## Mission and owner requirements

Design Factory is the **secondary independent development program**, not the principal AI Site CMS developer. The main developer alone owns SDK, PHP renderer, Stage3 Studio, main branch and final integration. Our objective is a professional AI-first design architecture with genuinely varied page composition, rhythm, typography, grid, responsive behavior, interactions and states, with maximal post-generation CMS editability. This is **not** a fixed-block-only website builder.

The owner requests an accelerated workflow: take large functional chunks, avoid minor cosmetic iterations and gratuitous repeated laboratory testing, update documentation, show the genuine completion state and remaining acceptance steps. Don't add a new architecture without a material benefit.

## Implemented work

- **D1**: safe first-party CMS compiler for real `manufact-ai-site-v1`, typed SDK/manifests, owner-fact validation, honest placeholders and content readiness rules.
- **D2**: 12 visual languages with responsive design tokens, accessibility and contrast checks.
- **D3**: 42 section composition presets in 14 families, rich standalone previews with registered CMS semantic fallbacks.
- **D4**: industry kits, complete multi-page site previews RU/EN, typed four-page CMS output.
- **D5**: standalone offline Browser Studio for kits, themes, device previews, content editing, project/workspace import/export, undo/redo.
- **D6**: immutable, versioned compiler bridge and strict CMS export validation; semantic JSON equality survives reordered object keys while tampering is rejected.
- **D7**: test, screenshot, release audit, package and human-review tooling implemented but **NOT accepted**: real Node checkout, Chromium, human visual review and true ZIP + SHA256 are still missing.

**Optional independent bridge to the evolving lead SDK:** `lib/lead-design-graph-adapter.cjs`. It takes a valid, immutable D6 export and an **explicit** selected D3 composition, then builds a separate host Design Graph candidate using an injected current lead SDK. It preserves owner hero/service facts, exports up to 12 service items and all typed FAQ/feature values to individually editable graph nodes, handles empty gallery truthfully, maps real layout/theme CSS properties to typed CMS tokens/nodes and returns source provenance for graph content. Candidate is always `approvedForPublish:false`, `fidelity:'partial'`. It is not the stable D6 export, nor a server publish implementation.

## Final-block conflict-safety improvement

Previously `reconcileSemantic(candidate, editedSite, hostSdk, hostRegistry)` could replace an independently edited graph heading when syncing a CMS semantic text change. **Now it compares the original candidate snapshot and the edited host site**:

- `inspectSemanticSync(...)`: read-only preview reporting proposed content changes, conflicting edits and preserved graph-only changes. No mutation, no AI re-generation.
- `reconcileSemantic(...)`: explicit host-authorized action; preserves independent graph text edits when the semantic source is unchanged, updates graph text/links only when its semantic source changes, and **rejects any conflicting simultaneous edits to the same bound property** without selecting a winner.
- Design properties (spacing, type, colors, grids, motion) stay intact. Cross-site/cross-page replay, removed bindings, duplicate bindings and incompatible graphs are rejected.
- It is a **one-way, opt-in content sync**, not a live two-way binding, security signature, authorization check, revision merger or publishing system. Final source-of-truth/conflict resolution UX belongs in the main CMS.

Source-level regression checks in `tests/lead-design-graph-smoke.cjs` cover original source snapshot unchanged, 504 distinct host graphs and JS renders, up to 12 owner services, full FAQ, empty galleries, HTML escaping, manual styles, graph-only text preservation, conflict reporting/rejection, fake bindings and wrong-site refusal. PHP parity covers six representative samples **only when run on an actual lead checkout** with explicit environment variables.

## Evidence boundary

**Verified with live GitHub source in an isolated V8 runner:** 504/504 new host Design Graph candidates and 504/504 first-party host JS renders accepted against the latest fetched lead SDK/Graph; full optional lead smoke including new conflict cases PASS. Previously 288/288 older CMS site outputs and D6 round trips were checked in-memory. These are **NOT** checked-out Node suites, PHP validation, actual Chrome interaction, screenshot approval or ZIP bytes.

**Real D7 still blocked:** local container cannot resolve `github.com` for checkout; minimal headless Chromium page probes timed out even with Xvfb. Zero confirmed CI workflow runs on this isolated feature branch. No verified screenshot corpus, no verified ZIP SHA256; do not invent one.

**Product status:** D1–D6 implemented (~6/7 engineering directions, not audited final acceptance); D7 **OPEN**. Main CMS formal acceptance is unchanged: **Stage2 NO-GO, Stage3 unaccepted, 0/135**. Never increase percentages/criteria just because V8 tests pass.

## First actions in the successor chat

1. Connect GitHub and read **live HEAD** on `feature/stage3-design-factory`. Read this file, `handoffs/NEXT-CHAT.md`, `PROGRESS.md`, `QUALITY-GATES.md`, `INTEGRATION.md` and `proposals/LEAD-DESIGN-GRAPH.md`. Review the latest actual lead branch contract separately, read-only.
2. Check remaining D7 gaps. On a real checkout: `node stage3/design-factory/bin/build-browser-bundle.cjs --check` and `node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-audit.json`; rerun with functioning Chromium (see QUALITY-GATES). Never confuse success without `--chromium` with full release readiness.
3. Optional cross-branch suite: supply read-only `DF_LEAD_SDK_DIR` pointing at the **lead** `stage3/sdk`. Add `DF_LEAD_PHP_FILE` pointing to its `stage3/server/DesignGraph.php` for six real PHP/JS markup parity probes (and `DF_LEAD_PHP_BIN` if needed). This suite is separate from the six stable D7 Node suites.
4. Generate and **visually inspect** real 1280/768/390 screenshots (full matrix 54). The local `visual-review.html` contact sheet is an inspection tool, not acceptance. Test Studio keyboard focus, deep routes, RU/EN, form/media safety, mobile tap targets and reduced motion.
5. Build ZIP using first-party packaging tool, run ZIP CRC/central-directory/source-byte-parity test and record the **actual** SHA256. Prepare a final lead integrator handoff **only after the evidence is real**.
6. Don't merge or edit `main`, lead branch, SDK, PHP, workflows, CI config, hosting, secrets, production or other products. Keep accelerated scope; fix substantive failures before adding new design infrastructure.

## Integration limitations worth highlighting

- Registered legacy `site-v1` fallback is not visually identical to D3 HTML/CSS previews.
- New lead Design Graph mapping gives genuine editable layout/typography/content but only **partial** fidelity: complex D3 art, native FAQ accordion behavior, galleries with real licensed media, rails/scroll snap and exact PHP responsive pixel parity remain integrations to implement.
- `mapping.contentBindings` is metadata only and can go stale; the host must validate project permissions, revision history, content consent, licensing and publication gates on every edit.
- An empty screenshot/Node evidence folder is **not** a pass. Keep D7 and main Stage3 status open until tests and owner review actually complete.

**Read carefully:** `handoffs/START-NEXT-CHAT.md` contains the copyable first message for the successor independent developer.
