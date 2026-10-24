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
