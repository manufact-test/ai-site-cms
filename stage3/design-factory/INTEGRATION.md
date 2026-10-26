# Design Factory — D6 Integration Bridge

**Scope:** standalone, offline adapter. All code is constrained to `stage3/design-factory/`; the existing CMS importer, Studio, SDK, server and PHP renderer remain unchanged. This document is for the main integration developer. It is **not** a production deployment guide.

## Latest D7 release-candidate hardening — 26 October 2026

**Current source checkpoint:** `8e0c233a592145cc5c8ad12434c92db9ff935d9b`. Always read live HEAD before continuing. This is an engineering checkpoint, not a release certificate.

- Preserved visual-review receipt **v2**: the reviewer must inspect all 42 D3 compositions and confirm the fifth `showcaseCoverage` check. Old v1 receipts are rejected.
- Added `lib/source-manifest.cjs` so the release audit and candidate runner use the same deterministic source-inventory rules. The runner validates the exact expected audit schema and check list, recomputes the source-manifest digest, and rejects added, removed or modified source files between audit and packaging.
- **Complete packaged-file inventory fix (`c61eaa270902cd019b10417f25fe55c3a60d0981`):** `handoffs/` was included in the ZIP but excluded from the audit manifest. The manifest now includes every packaged file; the audit compares all start/end entries; the candidate requires `sourceManifest.length === fileCount` and the expected source directory. The contract smoke mutates a handoff digest and requires the candidate to reject it.
- **Lead input provenance (`c3696b3a9e9cb20b4da03a3bde09b708becaa6e5`):** `lib/external-input-manifest.cjs` fingerprints every regular file in the supplied Lead SDK and optional PHP renderer. It rejects symlinks and unstable/non-canonical inputs, records before/during/after snapshots, and fails the Lead gate if those external bytes change during candidate generation. This is provenance, not authentication.
- **Audit-report semantics hardening (`072baf1f4aa23e9e6cffb2bffa6bbfbe2fbbbf4d`):** the candidate validates report structure and summary flags separately from gate outcomes. A well-formed report with failed checks remains a valid failure report; source-manifest equality is evaluated independently, so an ordinary test failure is not mislabeled as source drift.
- **Canonical ZIP32 header validation (`9aa4016f347cfbee98205458013ffae5302a156b`):** the independent verifier now requires the builder's exact ZIP version, UTF-8 flag, DEFLATE method, fixed timestamps, single-disk metadata, zero extra/comment/attribute fields, and matching local/central headers. `tests/package-smoke.cjs` includes mutated central/local header regression cases.
- **Candidate summary visibility (`8e0c233a592145cc5c8ad12434c92db9ff935d9b`):** the CLI summary now exposes `leadInputs` status, and the whole-candidate smoke asserts that unconfigured external inputs are reported explicitly.
- `bin/release-audit.cjs` now performs **browser-bundle parity plus eight Node smoke suites**, then reruns the source inventory for a final stability gate. With `--chromium`, it also runs the dedicated visual-pipeline smoke. The versioned audit report is v2: 10 checks without Chromium, 11 with Chromium.
- `bin/release-candidate.cjs` orchestrates the audit, ZIP build, independent ZIP verification, optional Chromium screenshots, v2 human-review receipt, optional Lead JS smoke and six real PHP parity probes. It records before/after Git state and rejects a changed source fingerprint.
- `bin/verify-release-zip.cjs` independently checks ZIP32 local/central records, CRC32, canonical sorted inventory, exact source bytes, source digest and archive SHA256. A ZIP can be built for engineering review while release gates remain open.
- The visual-source fingerprint covers the Design Factory `bin/`, `catalog/`, `lib/`, `studio/`, every first-party component JSON manifest and the SDK contract. Review verification rejects symlinked evidence roots and screenshot directories.
- Added `tests/release-candidate-contract-smoke.cjs` to the standard audit. The separate `tests/release-candidate-smoke.cjs` exercises the whole runner on a real checkout and is intentionally not nested inside its own audit. The audit and candidate report schemas are versioned v2; stale v1 reports are refused. The candidate also rejects contradictory check records (for example, `passed: true` with a nonzero exit code) and validates the current source manifest before reporting the Node gate as PASS.

### Commands on a complete checkout

```bash
node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-D7-report.json
node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-release-candidate
```

The output directory must not already exist. Add `--chromium /usr/bin/chromium` to the candidate command for Studio/browser QA and the full 54-image capture. Supply `--lead-sdk /path/to/lead/stage3/sdk --lead-php /path/to/lead/stage3/server/DesignGraph.php` to run the optional Lead suite and six PHP markup-parity probes. After a human completes `visual-review.html`, provide the captured evidence directory and the downloaded v2 `visual-review-decision.json` using `--evidence` and `--review`.

Exit code **3** means the core audit and exact-source ZIP are ready for engineering review but at least one release gate remains open. Exit code **0** requires every configured gate; it still does not authorize production or merge. Exit code **2** indicates a failed/incomplete core gate or an invalid candidate.

**Verification boundary for source checkpoint `8e0c233a592145cc5c8ad12434c92db9ff935d9b`:** isolated V8 syntax parsing and source-level assertions **PASS** for six JavaScript files spanning Lead-input provenance, candidate reporting, and ZIP32 header validation. Full Node audit/candidate smoke, Chromium Studio E2E, real 54-image capture/review, Lead JS/PHP parity and actual ZIP/hash remain **NOT RUN**: GitHub DNS resolution still blocks a checkout. GitHub API for this source checkpoint: **0 Actions runs, 0 check runs, 0 commit statuses**. This is not a full Node suite pass.

**Decision unchanged:** D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; **0/135** mandatory criteria. Do not modify workflows, merge, or infer acceptance from authored tests.

## Latest source hardening — 25 October 2026

**Functional/source checkpoint:** `39624c82fc7953c9afaa07452053f3acec6cd86a`. This commit changes only `stage3/design-factory/bin/build-browser-bundle.cjs` and `stage3/design-factory/tests/studio-smoke.cjs`.

- Fixed an output-boundary defect in the browser bundle builder: it previously wrote directly to `studio/runtime.generated.js`, which could follow an accidental final symlink or truncate a hard-linked external file.
- The builder now canonicalizes the repository root, rejects symlinked `stage3/`, `stage3/design-factory/` and `studio/` directories, rejects a symlink/non-regular final target, and writes to a same-directory temporary file before renaming it into place. The rename also replaces a hard-linked directory entry without modifying the other hard link.
- Added an isolated regression fixture to `tests/studio-smoke.cjs`: symlink rejection in build and check modes, creating a missing target, and safe replacement of a hard-linked target.
- Isolated V8 syntax parsing of both changed JavaScript files **PASSed**; a focused Node filesystem primitive probe **PASSed**: atomic rename left an external hard-link inode unchanged and `lstat` identified a symlink. These checks do not execute the Design Factory modules or suite; the changed test suite has **NOT** run in a genuine checkout.
- A fresh `git ls-remote` attempt still fails with `Could not resolve host: github.com`. Branch Actions runs remain 0. Do not claim Node/Studio/ZIP/PHP release acceptance from this source-level change.

**Release decision unchanged:** D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135 mandatory criteria. No merge or out-of-scope changes.

## Previous environment re-check — 25 October 2026

At the start of this audit the branch HEAD was `bb219d64a58d590fbf2f806835e996a4277aee7d`; it is a documentation-only child of functional/source checkpoint `75884b7f794fa1dabc775d802613c38979eff4b8`. The compare contains six changed paths and all six are documentation within the allowed Design Factory subtree.

The execution container has Node.js 22.16.0 and PHP 8.4.24, but `git ls-remote` fails with `Could not resolve host: github.com`; no checkout is available. GitHub reports zero Actions runs for this branch and zero check runs for the audit-start HEAD. A minimal `/usr/bin/chromium --headless` data-URL probe timed out after 15 seconds (exit 124), so no Studio E2E or screenshot capture occurred. PHP parity remains 0 probes; no source-byte-identical ZIP, CRC/source-parity result or actual archive SHA256 exists.

This is an environment blocker, not a product acceptance result. The optional Lead Design Graph adapter remains proposed/opt-in and must not be merged by this developer. D7 remains OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135.

## Previous integration checkpoint — 25 October 2026

Live functional/source checkpoint: `75884b7f794fa1dabc775d802613c38979eff4b8`. All commits since the earlier checkpoint remain confined to `stage3/design-factory/`; no Lead SDK, PHP renderer, primary Studio, workflows, hosting or production files were changed.

Recent independent improvements:

- Studio keyboard focus is preserved across kit/theme/page rerenders; failed state application rolls back instead of falsely reporting success; live preview recompilation is debounced.
- `lib/output-path.cjs` centralizes safe output destination resolution for package ZIPs, audit reports and visual QA. It canonicalizes the repository and output parent, rejects destinations inside the repository (including symlinked parents) and rejects a final symlink.
- ZIP inventory ordering is locale-independent; the source digest length-prefixes each path and payload before hashing, avoiding ambiguous path/payload boundaries.
- Visual QA builds local URLs with `pathToFileURL` and now checks exact full/quick screenshot inventories (54/30), missing or unexpected files, duplicates and requested viewport dimensions.

**Integration status is unchanged:** the Lead Design Graph adapter remains optional and must not be merged by this developer. The host must still authenticate the owner, lock the reviewed revision, obtain exact destructive-change acknowledgement, preserve undo/revision history, and validate permissions/licensing before save or publish.

Evidence boundary: the earlier isolated V8 adapter suite reported 504/504 validations/renders/no-op rebuilds/preflights, 8 component-family refreshes and 8 loss-aware regression groups. It was not a real Node checkout and does not verify the latest packaging/visual-QA changes. The current branch has no Actions runs/checks; PHP parity remains 0, Chromium captures remain 0, and no ZIP/SHA256 artifact exists. D7 is OPEN; Stage2 NO-GO, Stage3 unaccepted, 0/135.
## Versioned package and round-trip

The first-party bridge lives in [lib/bridge.cjs](lib/bridge.cjs) and exposes:

- `workspace(input)`: validates a raw `manufact-design-factory-v1` project or a strict `manufact-design-factory-workspace-v1` envelope with an optional known D3 composition.
- `build(input)`: compiles through **the current Stage3 SDK/manifests**, inserts a registered semantic composition fallback if selected, checks broken links, and returns a `manufact-design-factory-export-v1` package.
- `validateBundle(package)`: closes unknown keys and **recompiles** the complete package to detect changed CMS JSON, layout spec, owner facts, warnings or compatibility claims. JSON object key order is ignored (it has no semantic meaning), while array order, primitive types, unknown members and nested values remain strictly checked. Never treats a supplied JSON string as executable markup.
- `importForCMS(package)`: returns only the SDK-validated `manufact-ai-site-v1` document, not preview HTML or new unregistered properties.

Package top-level keys are strictly: `format`, `version`, `workspace`, `site`, `designSpec`, `ownerChecklist`, `inspection`, `compatibility`. Version is 1. The bridge accepts key-reordered JSON produced by standard serializers; it rejects non-JSON values and changed nested content. The same deterministic package can therefore be processed by a PHP/CMS serializer without requiring its original object member insertion order. All generated site IDs, routes, navigation, SEO and repeaters are validated by `stage3/sdk/contract.cjs`. This deterministic integrity check is **not a digital signature**: it only prevents silent divergence from the current compiler, not malicious edits to both source code and artifacts.

## CLI sample (Node, no dependencies)

```bash
node stage3/design-factory/bin/design-factory.cjs bridge-export stage3/design-factory/examples/projects/saas.json /tmp/new-saas-bundle.json
node stage3/design-factory/bin/design-factory.cjs bridge-validate /tmp/new-saas-bundle.json --out /tmp/new-saas-site-v1.json
node stage3/design-factory/bin/design-factory.cjs validate /tmp/new-saas-site-v1.json
node stage3/design-factory/tests/bridge-smoke.cjs
```

Export destinations **must not already exist**. For the browser counterpart, open `studio/index.html` and click **Скачать пакет для интеграции D6**. No CMS API call or automatic publication occurs.

## Parity matrix (actual source links)

| Feature | Output | Status | Primary source / lead action |
|---|---|---|---|
| Site format/schemaVersion | manufact-ai-site-v1 / 1 | supported | `stage3/sdk/contract.cjs` validateSite |
| Stable IDs, safe paths | Closed ids and routes /, /services/, /approach/, /contact/ | supported | `stage3/sdk/contract.cjs` validateSite/inspectSite |
| Page SEO/title/description/robots | Real current page.seo fields | supported | `stage3/sdk/contract.cjs` / `stage3/server/PublicRenderer.php` |
| Navigation and local links | Existing page.navigation and behavior.href values | supported | `stage3/sdk/contract.cjs` |
| Basic sections | company-hero, service-grid, feature-highlights, media-story, faq-accordion, cta-banner, contact-panel and photo-gallery | supported | Registered `stage3/components/*.json`; no new keys |
| Theme | CMS background, surface, text, primary, font, maxWidth | supported | `stage3/sdk/contract.cjs` site.theme validation |
| Section appearance | surface/spacing/align | supported | Existing `stage3/sdk/contract.cjs` and manifests |
| Responsive hero sizes | Registered manifest desktop/tablet/mobile length values | supported | `stage3/components/company-hero.json` |
| 12 rich themes / CSS | Layout, art, card, density, font hierarchy beyond CMS | integration_required | `catalog/themes.cjs`, `lib/preview.cjs`; lead PHP parity adapter |
| 42 D3 rich compositions | 14 categories with 8 new proposals | integration_required | `catalog/compositions.cjs` and `proposals/ADAPTERS.md` |
| Media assets/images | Empty media slots allowed in examples | integration_required | Connect real first-party Media & Motion assets and verify ALT/licenses |
| Galleries/carousels | Basic registered photo-gallery semantic fallback | integration_required | Future responsive picture sets / motion feature adapter |
| Contact details/owner copy | Owner-supplied factual fields | blocked without review | `ownerChecklist` + owner/editor approval |
| Lead forms + collector | No fake submit behavior in Design Factory | blocked | Actual server FormGateway and explicit production collector configuration |
| Animations / reduced-motion | Standalone CSS preview uses reduced-motion | integration_required | Must not inject unregistered styles in site-v1 |
| Client licenses/security/roles | Not managed here | blocked | Main CMS server/application gate |
| Published output, robots/sitemap/release | None from Design Factory | blocked until actual publishing gate | Main Stage3 PHP renderer/static exporter/release auditor |

## Integration sequence for lead

1. Review only changes under `stage3/design-factory/` and regenerate `studio/runtime.generated.js` with the first-party builder. Verify `--check`.
2. Run the focused Node smoke suites, especially `tests/studio-smoke.cjs` and `tests/bridge-smoke.cjs`; run optional real Chromium E2E if a browser exists.
3. Accept only `importForCMS(bundle)`/validated `site-v1` into an existing project, preserving the CMS's site/owner auth, permission checks, revisioning, media validation and publish gate. Do not let this tool become a direct publish endpoint.
4. Show the **ownerChecklist** in the main editor; never treat demo placeholders, service examples, unsupplied images, absent consent or `readyForPublish` as a signed owner assertion.
5. For rich preview parity, separately implement and review PHP/Studio adapters. Do not blend unsupported visual CSS into the registered `site-v1` document. The bridge's `integration_required` list remains explicit until genuinely implemented.
6. Keep Stage2/3 acceptance statuses unchanged; compare all diff paths before integration. Do not deploy to production as a result of green unit tests.

## Remaining gaps

- Main CMS ingest/publish permissions, PHP parity for enhanced themes and D3 patterns, real media upload mapping, formCollector verification and full Chromium responsive/keyboard/owner-content inspection are external integration steps.
- Bundle validation detects changes by deterministic regeneration, not encryption/authentication. Validate all bytes again on the server, rather than trusting an untrusted browser.
- D6 is implemented as an independent bridge API and CLI; product acceptance is not complete until the lead imports it into the CMS and completes D7 visual acceptance.

## 24 October D7 bridge compatibility checkpoint

- A concrete serializer interoperability problem was resolved: comparing `JSON.stringify(raw)` byte order rejected a valid bundle whose object properties were reordered during reserialization. The D6 validator now canonicalizes strictly JSON-compatible values (sorted object keys, preserved array order), rejects unsupported types and recompiles the full package against real Stage3 SDK manifests.
- A dedicated `tests/bridge-smoke.cjs` regression covers a fully reordered exported bundle, a changed nested page SEO title and an invalid non-JSON value. The deterministic offline `studio/runtime.generated.js` was regenerated to carry identical behavior.
- **Evidence:** in an isolated V8 runtime with the current generated bundle, 288/288 CMS documents and D6 round-trips passed, all 42 semantic composition fallbacks validated, reordered JSON accepted, and three different altered/invalid bundles rejected. This is **not** checked-out Node execution, Chromium acceptance, server-side owner authorization or a digital signature.
- The lead still must implement/verify PHP visual parity separately, enforce owner permission and explicit publish gates and run full checkout acceptance before integration. None of those capabilities is claimed as completed by this D6 update.

**Formal status unchanged:** Stage2 NO-GO; Stage3+ not accepted; 0/135.

## Optional current Lead Design Graph v1 compatibility (24 October 2026)

The primary developer has introduced actual closed, editable `site.designTokens` and `section.designGraph` to the separate `feature/stage3-ai-site-contract` SDK. This is a **newer host contract** than the SDK pinned by our branch; our stable D6 `manufact-ai-site-v1` export remains unchanged and fully valid for the legacy SDK.

New standalone opt-in adapter: [`lib/lead-design-graph-adapter.cjs`](lib/lead-design-graph-adapter.cjs). It first validates the unmodified D6 package, then adds a typed, responsive graph for the explicitly selected D3 section and validates the result with the **host-injected lead SDK**. It returns `manufact-design-factory-lead-graph-candidate-v1`, not a publishable D6 bundle. New details and mapping/limitations: [`proposals/LEAD-DESIGN-GRAPH.md`](proposals/LEAD-DESIGN-GRAPH.md). Optional actual-checkout test: `DF_LEAD_SDK_DIR=/path/to/lead/stage3/sdk node stage3/design-factory/tests/lead-design-graph-smoke.cjs`; no env → explicit SKIP, and the six normal D7 suites remain independent.

**Observed source-level evidence:** 288/288 original sites accepted by the lead SDK; 504/504 (42 compositions × 12 themes) candidates accepted and rendered using the lead's actual Design Graph module in isolated V8. Rechecked against lead HEAD `a4d6aedff277752e015f52b383f080d0c3178f5a` and Graph blob `976d4bba21f8c6e51a826e3b8f38be1584268373`. This does **not** prove Node checkout, PHP renderer pixel parity, browser Studio editability, visual QA or official Stage3 acceptance.

The candidate supports palette, spacing, radii, typography, typed headings/text/button, grids, mobile/tablet rules and focus/hover state. Advanced D3 art, galleries/scroll snapping, data-bound repeaters and other unique visual effects remain `integration_required`, even though newer host commits also add icon/gradient/motion capabilities. The lead must explicitly adopt and test those features rather than assuming full HTML/CSS parity.

## Latest lead adapter scope — 24 October 2026

Lead candidates now contain actual editable grid layouts/spans/orders, theme typography, spacing, visual card/gradient/icon styling, responsive rules and accessible motion. Source-level checks: 504/504 distinct theme/composition graphs accepted and rendered by the lead JS host; owner-style JSON edits survive SDK validation and re-render without AI. Original D6 export is not mutated. The lead integrator can run optional PHP parity checks using DF_LEAD_SDK_DIR and DF_LEAD_PHP_FILE in tests/lead-design-graph-smoke.cjs. The check has not been executed here; first-party PHP renderer, CMS save/undo and viewport pixel parity remain to be accepted by the lead. Do not deploy or auto-publish.

## 24 October: semantic content preservation and explicit reconciliation

The optional lead adapter no longer reduces all D3 compositions to a single generic detail card. Selected `service-grid` repeaters are represented by up to 12 individually editable service title/description/link nodes; `faq-accordion` exports all questions/answers as static editable Q&A; feature highlights export both registered fields. An empty photo-gallery emits a clearly labelled upload/rights prompt, NEVER fictitious images. For hero and service compositions, validated owner-entered project facts are copied into the lead candidate, while the original revalidated D6 bundle stays unchanged.

Each exported lead candidate contains `mapping.contentBindings` (graph node ID → original CMS element slot or repeater item ID + manifest field), plus `semanticContentMode: 'snapshot-requires-host-reconciliation'`. These are content snapshots, not magical live CMS references. **If the owner edits a registered section field**, the host may explicitly call `reconcileSemantic(candidate, editedSite, hostSdk, registry)` to refresh only graph text/links from the edited semantic field values. It preserves manual graph design styles, rejects removed bindings/invalid links and validates with the current host SDK. It must NOT run automatically after unrelated user graph edits, and is NOT an authorization/publishing mechanism.

The contract has a real limit: the current typed Design Graph does not implement native FAQ accordion interactions or complex photo galleries. Rendered FAQ content is semantic heading/paragraph Q&A, not a functioning accordion; rich gallery media and exact CSS parity remain `integration_required`. The lead CMS must choose its source of truth and explicitly handle graph-vs-semantic edits.

New optional cross-branch regression suite covers 12 owner service records, hero facts, 2 FAQ entries, no fake gallery images, direct service edit + graph-only fontWeight preservation, forged binding rejection and HTML-escaped owner content. The PHP parity matrix now covers six representative host compositions with `DF_LEAD_PHP_FILE`, but was NOT executed here. Source-level isolated V8 suite PASS is not production acceptance.

## Final handoff note — content conflict detection

The optional lead adapter now exports **both** `inspectSemanticSync(candidate, editedSite, hostSdk, hostRegistry)` and `reconcileSemantic(candidate, editedSite, hostSdk, hostRegistry)`. Host UI should offer preview of `changes`, `preservedGraphEdits`, and `conflicts` before an **explicit authorized** sync. If normal CMS source text and the associated graph text were independently modified, `reconcileSemantic` throws rather than choosing either edit. If only the graph text changed, it is preserved. If only the semantic source changed, its linked graph text is updated without altering layout/styles. This is a snapshot comparison, NOT an automatic 2-way data model, cryptographically authenticated diff, conflict-resolution UI or publish authorization. The main developer must wire owner controls/revisions, separately validate PHP visual parity and choose a clear content source of truth. See `handoffs/SESSION-CLOSEOUT-2026-10-24.md`.

## 24 October 2026 — strict optional Design Graph binding provenance

The opt-in `inspectSemanticSync()` / `reconcileSemantic()` now derive the **canonical** content bindings from the original candidate's typed CMS section and explicitly selected D3 composition. The entire exact set of graph node ↔ semantic field bindings must match before comparing or applying content. Changing a valid-looking item ID to another existing CMS item, swapping sources, omitting a binding or introducing extra metadata is rejected. Serialization order of the binding array is immaterial. Original D6 export and graph styles are untouched.

This is **defense against mapping mistakes and accidental retargeting**, NOT cryptographic provenance, authentication, revision locking or owner authorization: a hostile client could also forge the baseline itself. The host must authorize operations, supply the authentic saved baseline and SDK, enforce revision preconditions and review conflicts in its own UI. Normal Node/PHP/browser acceptance on a checked-out lead CMS remains pending. See `tests/lead-design-graph-smoke.cjs`.

## Exact visible CMS-field binding and source-switch refusal (24 October 2026)

An optional Design Graph candidate now records the **specific typed semantic field that rendered each main heading, description and CTA text/link**. Previously a `feature-highlights` second advantage could appear in both the main graph summary and the second detail card but only the detail would update; `cta-banner.primary` could be incorrectly associated with an unrelated action. Both cases are fixed. Initially empty declared fields retain provenance, allowing later owner-provided values to replace the preview placeholder without another AI generation.

The reconciliation helper also checks that field-precedence selection itself did not change between the original host baseline and the edited site. If a different slot now supplies visible content or the selected CTA changed, it refuses stale snapshot sync and asks the host to review/rebuild. This is not an automatic rebinding UI. The main CMS must preserve authentic baselines, owner revisions and authorization; the optional adapter does not publish or apply migrations. For 504 source-derived examples, newest host SDK JS render validation has passed only in isolated V8 (not browser or PHP).

## 25 October — no silent FAQ or repeater content loss

The optional graph exporter previously applied a shared 12-entry slice to **both** services and FAQ, even though the first-party FAQ manifest permits 24 entries. The mapped FAQ now includes all 24 typed question/answer pairs, safely within lead Design Graph v1's 90-node cap. Services remain intentionally capped at the 12 owner records supplied by the independent Design Factory project; over-limit collections throw rather than partially render.

Semantic synchronization handles **value edits only** in an already snapshotted graph. If the registered CMS repeater changes membership or order, or unrepresented `photo-gallery` / `media-story` media/caption fields change, the host helper rejects the operation with an explicit rebuild/review requirement. The primary CMS must implement a revision-safe owner-authorized structural rebuild and PHP/Studio media parity; this adapter does not silently drop additions or fake asset support. Existing individual answer edits can sync without AI, with independent graph styles preserved. Original D6 bundle is unchanged.

Observed isolated JS validator/render check at current lead HEAD `514a060a287d07c308525a802053e899da9ea486`: 504/504 candidates and 24/24 FAQ entries. Not a PHP/Chromium or signed revision claim.

## Explicit authorized media/structural Design Graph rebuild — 25 October 2026

The independent optional `lead-design-graph-adapter.cjs` now exports `rebuildHostCandidate(candidate,editedSite,hostSdk,hostRegistry)`. This is a synchronous **pure candidate transformation**; the host must first authenticate/authorize owner revision and provide a complete typed, same-site CMS snapshot. Baseline provenance, original composition/theme/language, selected section/component and site identity are checked; the new full site is revalidated by the actual injected host SDK. It neither saves, publishes, signs baselines, changes D6, merges PRs nor calls a model.

Gallery rendering: when approved first-party `photo-gallery` items contain registered `content.media` IDs and corresponding `site.assets` records with owner-provided **nonempty alt**, the graph contains actual image nodes + CMS-bound caption nodes; up to 20 images fit (68 nodes). `media-story.photo` similarly becomes a typed image node. No-source galleries still render clearly labeled upload placeholders; no invented photographs. After structural rebuild, existing caption text changes can reconcile without another AI run; media ID/asset alt/src/variants changes require another explicit rebuild. Host must check rights, alt accuracy, media transport/responsive variants, accessibility, HTML/PHP parity and thumbnails.

The rebuild retains styles/responsive/states/motion only for matching stable graph node IDs and types, and refuses to transplant card styling when positional repeat item identities changed. It intentionally regenerates content and structural layout from typed owner CMS source; custom rearranged tree and graph-only copy edits can be reset. Inspect the returned `rebuild` report, review visual diff with the owner and require explicit authorization/revision lock before saving. Original candidate remains immutable. Final `approvedForPublish=false` and `requiresOwnerVisualReview=true`. Unsupported URLs (CMS may permit HTTPS :443 but Graph not) fail loudly; safe external HTTPS CTAs and service links now map correctly. This is an opt-in lead-integration proposal, not main Studio deployment.

## 25 October — owner-authored Graph edits on AI-free rebuild

The optional `rebuildHostCandidate(candidate, editedSite, currentLeadSdk, registry, options?)` now handles owner-authored Graph copy in addition to style preservation. Identical bound source fields whose CMS value is unchanged keep independent owner Graph text/href; incompatible simultaneous CMS+Graph edits fail rather than selecting a winner. Repeater card styles and copy are transplanted only when **the same CMS item ID** remains at the same ordinal; a wrong escaped regex that permitted card-to-card styling transfer was corrected.

If a deleted/replaced Graph node contains independent user-edited content, rebuild fails with the exact `nodeId:property` IDs. The host must show the lost text, obtain owner authorization/revision lock, and retry with `{acceptedDiscardedNodes:[...exact ids...]}`; extra/missing/duplicate IDs are rejected. This **is not a permission capability**: the host still must enforce all authorization/revisions and owner review. `rebuild.explicitlyDiscardedGraphEdits` and `retainedGraphCopyNodes` expose the decision/audit. A rebuild can still reset custom structural tree edits; show visual diff and support undo. New detailed integration examples in `handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md`.

Current source-level optional lead smoke passed 504/504 Graph validation+JS render and owner-edit regressions using isolated V8 against actual GitHub source; do not claim real Node/PHP/browser acceptance.

## 25 October — structured owner-review preview for rebuild

Before changing the candidate, a host may call the new read-only `inspectRebuild(candidate, editedSite, hostSdk, registry)`:

```js
const preview = adapter.inspectRebuild(candidate, editedSite, hostSdk, registry);
if (!preview.canApply) {
  if (preview.requiresOwnerConfirmation) {
    // Show preview.discardedGraphEdits: nodeId, property, previousValue,
    // currentValue and nodeStillPresent. Ask the owner about these exact edits.
    // preview.rebuild is a simulated diff, NOT permission to persist or publish.
  } else {
    // Show preview.error; resolve conflict/validation error before retry.
  }
} else {
  // Show preview.rebuild's preserved/created/reset/removed node-ID arrays.
  // Structural rebuild still requires host authorization and owner visual review.
}
```

A successful preview has `canApply:true`, `noMutation:true`; a destructive preview has `canApply:false`, `requiresOwnerConfirmation:true`, a structured list of the exact copy/link values at risk and the predicted rebuild report. The API does not persist, publish, authorize a revision or invoke AI. Its internal retry with exact IDs exists only to calculate the hypothetical diff; it does not mean the owner approved deletion.

`rebuildHostCandidate()` returns counts plus `preservedVisualNodeIds`, `createdVisualNodeIds`, `resetVisualNodeIds` and `removedVisualNodeIds`. The host should use these to display a meaningful diff, provide undo and request visual approval before save. Exact destructive acknowledgements remain bounded; the host must also lock the reviewed site revision and authenticate the owner.

Current source-level smoke: 504/504 candidate validations, renders, no-op rebuilds and read-only previews; 8 component-family content refreshes passed in isolated V8. This is not real Node/PHP/Chromium acceptance.

## 25 October — structured owner-review preview for rebuild

Before changing the candidate, a host may call the new read-only `inspectRebuild(candidate, editedSite, hostSdk, registry)`:

```js
const preview = adapter.inspectRebuild(candidate, editedSite, hostSdk, registry);
if (!preview.canApply) {
  if (preview.requiresOwnerConfirmation) {
    // Show preview.discardedGraphEdits: nodeId, property, previousValue,
    // currentValue and nodeStillPresent. Ask the owner about these exact edits.
    // preview.rebuild is a simulated diff, NOT permission to persist or publish.
  } else {
    // Show preview.error; resolve conflict/validation error before retry.
  }
} else {
  // Show preview.rebuild's preserved/created/reset/removed node-ID arrays.
  // Structural rebuild still requires host authorization and owner visual review.
}
```

A successful preview has `canApply:true`, `noMutation:true`; a destructive preview has `canApply:false`, `requiresOwnerConfirmation:true`, a structured list of the exact copy/link values at risk and the predicted rebuild report. The API does not persist, publish, authorize a revision or invoke AI. Its internal retry with exact IDs exists only to calculate the hypothetical diff; it does not mean the owner approved deletion.

`rebuildHostCandidate()` returns counts plus `preservedVisualNodeIds`, `createdVisualNodeIds`, `resetVisualNodeIds` and `removedVisualNodeIds`. The host should use these to display a meaningful diff, provide undo and request visual approval before save. Exact destructive acknowledgements remain bounded; the host must also lock the reviewed site revision and authenticate the owner.

Current source-level smoke: 504/504 candidate validations, renders, no-op rebuilds and read-only previews; 8 component-family content refreshes passed in isolated V8. This is not real Node/PHP/Chromium acceptance.

## 25 October — loss-aware graph structure and media conflict contract

The rebuild review must cover more than text/href. A manually deleted node that would be recreated, a custom node that would be dropped, a custom ID that collides with a newly generated semantic node, or edited properties on a removed/reset node all require explicit owner acknowledgement.

`rebuildHostCandidate()` tracks the editable fields `type`, `text`, `href`, `styles`, `responsive`, `states`, `motion`, `assetId`, `alt`, `level`, `icon`, `posterAssetId` and `loop`. It throws an Error with code `DF_REBUILD_OWNER_REVIEW_REQUIRED` and `discardedGraphEditIds` containing the exact IDs the host must review. For node-level loss the property suffix is `__node__`.

`inspectRebuild()` returns each affected node/property with `kind`, `previousValue`, `currentValue`, `rebuiltValue`, `nodeInEditedGraph`, and `nodeInRebuiltGraph`. Use both presence flags: a custom ID can exist before and after rebuild while the rebuilt node is a different CMS-generated identity. Acknowledge the exact set only after the owner reviews the diff and the host locks/authenticates the intended revision.

Graph-owned image/video `assetId` and alt/media properties are preserved when their CMS-derived source is unchanged. If the CMS and graph both change a media property differently, the adapter rejects the rebuild as a conflict. Do not silently choose either side.

Regression evidence: 504/504 source-level validation/render/no-op rebuild/preflight cases; 8/8 component-family refreshes; 8 loss-aware structural/style/media groups. This was isolated V8 over current GitHub JS sources with emulated Node core modules, not an actual checkout/Node process. Real Node, PHP, Chromium and ZIP/SHA256 acceptance remain open.


## D7 candidate verification (non-publishing)

Run `node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-release-candidate` on a genuine checkout. The runner checks bundle parity + eight Node suites, exact audit inventory, reproducible ZIP bytes/CRC/SHA256, optional Chromium screenshots, review v2 and optional Lead/PHP parity. It never deploys or authorizes publication. Exit 3 is an engineering candidate with gates open; D7 remains OPEN until actual acceptance.