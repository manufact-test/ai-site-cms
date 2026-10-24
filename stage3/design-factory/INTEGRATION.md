# Design Factory — D6 Integration Bridge

**Scope:** standalone, offline adapter. All code is constrained to `stage3/design-factory/`; the existing CMS importer, Studio, SDK, server and PHP renderer remain unchanged. This document is for the main integration developer. It is **not** a production deployment guide.

## Versioned package and round-trip

The first-party bridge lives in [lib/bridge.cjs](lib/bridge.cjs) and exposes:

- `workspace(input)`: validates a raw `manufact-design-factory-v1` project or a strict `manufact-design-factory-workspace-v1` envelope with an optional known D3 composition.
- `build(input)`: compiles through **the current Stage3 SDK/manifests**, inserts a registered semantic composition fallback if selected, checks broken links, and returns a `manufact-design-factory-export-v1` package.
- `validateBundle(package)`: closes unknown keys and **recompiles** the complete package to detect any changed CMS JSON, layout spec, owner facts, warnings or compatibility claims. Never treats a supplied JSON string as executable markup.
- `importForCMS(package)`: returns only the SDK-validated `manufact-ai-site-v1` document, not preview HTML or new unregistered properties.

Package top-level keys are strictly: `format`, `version`, `workspace`, `site`, `designSpec`, `ownerChecklist`, `inspection`, `compatibility`. Version is 1. All generated site IDs, routes, navigation, SEO and repeaters are validated by `stage3/sdk/contract.cjs`. This deterministic integrity check is **not a digital signature**: it only prevents silent divergence from the current compiler, not malicious edits to both source code and artifacts.

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

**Formal status unchanged:** Stage2 NO-GO; Stage3+ not accepted; 0/135.
