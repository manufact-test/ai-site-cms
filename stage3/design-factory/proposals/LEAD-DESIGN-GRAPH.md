# Design Factory → Lead CMS Design Graph v1 (optional bridge)

**Status:** Standalone adapter implemented in `lib/lead-design-graph-adapter.cjs`. **Integration not performed.** No edits to lead SDK, Studio, PHP, server, workflows, or production. Date: 2026-10-24.

## Why this matters

The primary developer introduced **optional typed `site.designTokens` and `section.designGraph`** in its `feature/stage3-ai-site-contract` branch. These are real, editable and validated properties, unlike Design Factory's advanced standalone CSS. Our initial D6 output remains a pure `manufact-ai-site-v1` generated using the **older** first-party SDK from this feature branch; it must stay unchanged until the lead explicitly integrates a newer SDK and editor.

The Design Factory now ships an **opt-in host candidate**, not a silent upgrade or production publish path. It only enriches a previously validated D6 bundle and requires an externally supplied newer lead SDK and real manifest registry. The old SDK correctly rejects the new fields.

## API and contract

```js
const bridge = require('./stage3/design-factory/lib/bridge.cjs');
const adapter = require('./stage3/design-factory/lib/lead-design-graph-adapter.cjs');
const hostSdk = require('./stage3/sdk/contract.cjs'); // AFTER lead's newer SDK is present
const compiler = require('./stage3/design-factory/lib/compiler.cjs');
const packageV1 = bridge.build({
  format: bridge.WORKSPACE, version: 1,
  project: {format:compiler.FORMAT,version:1,kit:'agency',
    theme:'editorial',language:'ru',facts:{}},
  composition:'hero-center'
});
const candidate = adapter.buildHostCandidate(packageV1,hostSdk,compiler.loadRegistry());
hostSdk.validateSite(candidate.site,compiler.loadRegistry());
// candidate.site is a host-contract document, never auto-published.
```

**Never** import `candidate` as if it were a D6 bundle. It is a separate `manufact-design-factory-lead-graph-candidate-v1` envelope and its `site` must be validated by the host and approved by the owner. The versioned original D6 object is not mutated. Composition selection is mandatory: there is no implied graph replacement of unrelated sections.

## What is really editable in the newer contract

| New host field | Design Factory candidate | Qualification |
|---|---|---|
| `site.designTokens.colors` | Foreground, background, surface, accent, white CTA text | Exact first-party palette; no extra unregistered keys |
| `site.designTokens.spacing/radii/typography` | Three spacing sizes, two radii, body/heading sizes | Values chosen from the 12 themes; constrained to host ranges |
| `section.designGraph.nodes` | Typed layout containers, headings, paragraphs, CTA, content details | Actual serialized editable nodes; no raw HTML/CSS |
| `styles` | Grid/flex, columns, padding, gap, radius, colors, font size/weight/line height, max width | Uses only host-whitelisted names and values |
| `responsive.tablet/mobile` | Grid collapse and smaller font scale | Current lead breakpoints; inspect actual renderer at real viewports |
| `states.hover/focus` | CTA opacity, focus outline | Only approved state properties |
| Site pages, routes, SEO, existing components | Preserved from the D6 package | Existing SDK validation and local-link inspection still run |
| Owner approval | `approvedForPublish:false`, unchanged checklist | An editor must verify statements/media/contact facts before publication |

**Not yet pixel-equivalent:** art geometry, layer transforms/skew, pseudo-elements, brand font family/tracking, rails/scroll-snap, masonry grid spans, rich photo media and caption layout, native gallery state, content-driven repeater cards, animations and complicated 42-pattern variants. Newer host Graph capabilities can grow without making current unsupported preview visuals magically editable. The adapter's `fidelity:'partial'` and `integration_required` are intentional.

The newer lead SDK also supports additional optional site menus, responsive media variants, and (in subsequent lead commits) icon/gradient/motion graph features. This adapter **does not** invent content or media assets, and does not silently use capabilities that may be in flux.

## Actual test boundary

- Early lead snapshot `6c9d5dce57d2aa4385c3b348a058c07aaeab2e69`, SDK blob `7ba6fbe31c2fd6e38f60c028eb2a8533b5ab3c39`, Design Graph blob `664efd918f30298cb86088efb6190862bbb63788`.
- Executed **504/504** (42 compositions × 12 themes) in isolated V8 using actual GitHub source: generated host graphs accepted by its `validateSite`, actual first-party `design-graph.cjs` rendered scoped HTML/CSS, and legacy SDK refused unknown Graph keys. This was **not** a real Node checkout, PHP renderer, interactive Studio or visual acceptance.
- `tests/lead-design-graph-smoke.cjs` implements optional checkout verification: set `DF_LEAD_SDK_DIR` to the lead `stage3/sdk` folder (read-only), then run `node stage3/design-factory/tests/lead-design-graph-smoke.cjs`. Without it the test reports SKIP/exit 3; it is not part of the stable six-suite D7 audit. Keep old and new contract gates separate.

## Safe lead integration

1. Pin both feature branches' actual commit SHA and inspect their SDK/graph diff. Don't cherry-pick SDK or PHP from the Design Factory branch (none were edited).
2. Retain current D6 import, compiler and Browser Studio unchanged. Add an **explicit** user/editor action for a selected composition to produce a host graph candidate; don't silently replace all sections.
3. Verify owner permissions, project revisions, undo/redo, graph editing and publishing controls in the **lead** Studio. This optional adapter does not implement main editor UI or publication.
4. Run the optional Node smoke against the live host SDK and registry; test actual PHP rendering and data round trips, mobile breakpoints, focus state, translated content and unfilled owner facts. Inspect host Studio interaction with real browser.
5. Record parity per field and only mark a visual feature supported when its actual PHP-rendered result is acceptable. Keep unimplemented D3 art and gallery transformations as `integration_required`.
6. Ask owner to approve final content/media/legal copy. No fabricated reviews, prices, brands, customer statistics or licenses.

**Global gates unchanged:** Stage2 NO-GO, Stage3 not accepted, 0/135. No automatic merge or deployment.

## 24 October: expanded host-editable styles

The optional adapter now encodes D3 layout differences as real typed CMS fields: bento/mosaic spans with mobile resets, editorial order, grid density, card shadow/border/radius, host font family and tracking, gradients, decorative SVG icons and reduced-motion-aware fade-up. A CTA has a 48px minimum tap height. Content/media still require explicit owner verification. All 504 composition/theme combinations were distinct and accepted by the current lead SDK and first-party JS renderer in isolated V8 (not Node/Chromium/PHP acceptance). Direct changes to heading, accent token, mobile grid and hover opacity validated and changed HTML/CSS without AI regeneration.

The optional test now supports a real PHP host parity gate in addition to DF_LEAD_SDK_DIR: set DF_LEAD_PHP_FILE to lead stage3/server/DesignGraph.php and optionally DF_LEAD_PHP_BIN to PHP CLI. It validates four patterns with PHP and checks escaped markup against the JS renderer. That test has NOT run on the full checkout here. CSS screenshot/pixel parity and Stage3 approval remain separate.

## 24 October — real component content rather than one generic preview card

The optional adapter now maps every first-party item in a selected service/FAQ repeater to distinct **typed, individually editable** graph nodes and retains source binding metadata. Services support up to 12 item titles/descriptions/declared links; FAQ supports all declared question/answer pairs as static Q&A (not a native accordion); benefits show both registered value statements. For gallery with no licensed owner media, a transparent upload prompt replaces fabricated image boxes. For hero and services, real validated owner project facts replace demo placeholder copy in the host graph candidate ONLY. The original D6 bundle remains byte-for-byte unaffected.

The lead candidate includes `mapping.contentBindings` (node ID, semantic slot/item and field, target property). `reconcileSemantic(candidate, editedSite, hostSdk, registry)` is an opt-in, one-way host helper. After an authorized owner changes normal CMS component fields, it reuses that metadata to update graph text/links, preserving edited fonts, grid, colors and other independent design styles. Missing/forged bindings are rejected. This is **not live two-way binding**: a host editor must decide whether registered fields or graph nodes are authoritative and offer synchronization explicitly. Unapproved CMS edits are not publication authorization.

Observed source-level tests in isolated V8: 504 host graph validation + renders PASS, 12 owner services preserved, FAQ complete, empty gallery honest, original D6 immutable, owner edit-to-graph reconciliation and style preservation PASS, bad bindings rejected and user HTML text escaped. These are NOT browser/PHP/checkout release evidence. The optional PHP parity suite now has six representative samples, but execution remains pending.

## Conflict-safe content reconciliation — final independent checkpoint

Host integration can call `inspectSemanticSync(candidate, editedSite, hostSdk, registry)` first to list proposed content changes, manually changed graph-only text and collisions. It does not mutate either input. Explicit `reconcileSemantic(...)` updates graph text/links only when safe; if a CMS semantic field and its graph node text both differ from the original snapshot and from each other, it rejects the operation. Graph-only text overrides survive when the semantic field is unchanged; styling/interactive properties always survive. Graph/source binding and same-site identity are checked, as is host validation. This is not a multi-user merge system or an authorization check. The lead Studio should expose conflict resolution with revision-safe, owner-authorized UX. D7 real PHP/Chromium parity and owner acceptance are still pending.

## Canonical provenance guard — 24 October 2026

The content-sync helpers rederive the complete expected `contentBindings` inventory from the candidate's original validated typed section and composition. Even plausible source IDs are rejected when bound to the wrong graph node or semantic item; a removed binding cannot quietly stop future synchronization. Graph layouts and owner styling still remain editable; this guard only validates the metadata describing where graph text/links originally came from. Reordering metadata entries does not change meaning.

Integration caveat: `candidate.site` is a **baseline supplied by the host**, not a signed record. The host is responsible for keeping that original baseline authenticated, checking the current revision/identity and requiring an explicitly authorized owner action. This guard does not resolve concurrent revisions or eliminate the documented PHP/visual parity gaps. The source-level isolated mock regression is not a full lead SDK / Node / PHP / Chromium acceptance result.

## Visible-field provenance and empty-to-owner edits

Composition graphs bind actual selected semantic sources (including `feature-highlights.second` when rendered as summary and card, and `cta-banner.primary` for visible action/href), rather than guessing slots by names. Bindings support duplicate *source* values rendered in multiple independently editable nodes. A declared but initially empty field remains bound so the owner can fill it in CMS later. A changed source precedence or newly selected CTA rejects the snapshot reconciliation for explicit host review. Graph design styles still survive content edits. The old D6 package is untouched; all owner authorization/revisions and PHP/browser visual compatibility remain lead-owned integration steps.

## FAQ parity and structural edits · 25 October 2026

First-party `faq-accordion` supports up to **24** typed question/answer items, not 12. The adapter creates up to 24 unique heading/body graph pairs (80 nodes total including the shared shell) and rejects any excess rather than concealing owner content. FAQ nodes remain static Q&A: **no native accordion behavior** has been added. Text/answer changes in the same repeat structure use conflict-safe semantic reconciliation without altering visual styles.

Addition, deletion or reordering of repeater items, and a media/caption change unrepresented in partial gallery/media-story graph, now refuse opt-in sync and require a host-authorized design-graph rebuild and visual review. Do not interpret refusal as content deletion, and do not auto-merge graph snapshots; preserve the current CMS site and owner revisions for manual resolution. Current SDK JSON/HTML validation in isolated V8 is not PHP/browser acceptance.
