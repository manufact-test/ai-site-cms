# Design Factory — D6 Integration Bridge

**Scope:** standalone, offline adapter. All code is constrained to `stage3/design-factory/`; the existing CMS importer, Studio, SDK, server and PHP renderer remain unchanged. This document is for the main integration developer. It is **not** a production deployment guide.

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
