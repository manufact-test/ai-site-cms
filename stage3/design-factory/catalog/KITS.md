# D4 — 12 sector kits, 16 local sites, 64 actual pages

This catalog is **offline and content-safe**. The generated examples are independent four-page websites, not a renamed single JSON template; six composition archetypes govern the sequence and variety of registered components. Twelve kits have distinct industry-specific owner-review content and theme defaults. Four kits have curated RU + EN sector copy.

| ID | Industry | Archetype | Default theme | RU / EN |
|---|---|---|---|---|
| agency | Digital agency | editorial | editorial | Both |
| industrial | Manufacturing B2B | industrial | technical | Both |
| consulting | Consulting | minimal | minimal | Both |
| local-services | Local professional services | directory | verdant | RU |
| saas | Software and SaaS | product | cobalt | RU |
| logistics | Logistics and delivery | industrial | oceanic | Both |
| architecture | Architecture and design | story | atelier | RU |
| education | Education and courses | product | plum | RU |
| portfolio | Personal portfolio | story | noir | RU |
| restaurant | Restaurant information | editorial | copper | RU |
| repair | Repair and home services | directory | technical | RU |
| nonprofit | Nonprofit sector | story | verdant | RU |

All 12 kits have Home, Services, Approach and Contact routes; actual headings, semantic sections, navigation and SEO, with explicit editorial missing-facts state. CTA URLs lead only to real local pages. The restaurant example deliberately does **not** promise reservations, and the SaaS example does not claim unverified integrations. No fictional awards, operating hours, reviews, contacts, prices or images.

## Generate and browse 16 real websites

From repository root with Node.js >=20:

```sh
node stage3/design-factory/bin/design-factory.cjs kits
node stage3/design-factory/bin/design-factory.cjs kit-gallery /tmp/df-gallery-new
node stage3/design-factory/tests/kits-smoke.cjs
```

Open `/tmp/df-gallery-new/index.html` directly in a browser. Navigate into any site and its four linked pages. Site styles are wholly local, with desktop/tablet/mobile CSS and reduced-motion. No server, npm, CDN or public API is needed.

The kit-gallery command creates a **new output directory only**, refusing to replace existing content. Contents:

- Root index.html — 16 accessible cards to open 12 RU plus 4 EN sites.
- Root catalog-manifest.json — versioned manifest `manufact-design-sector-gallery-v1`, with file SHA256.
- For each ID-language folder: four real HTML pages, assets/preview.css, site-v1.json, design-spec.json, owner-checklist.json, project.json, inspection.json.
- Every tracked page/CSS/site JSON has SHA256 independently hashed from actual bytes, not from guessed metadata.

You can also export or edit a single source project:

```sh
node stage3/design-factory/bin/design-factory.cjs export stage3/design-factory/examples/projects/logistics.json /tmp/logistics-standalone-preview
node stage3/design-factory/bin/design-factory.cjs create --brief stage3/design-factory/examples/projects/architecture.json --out /tmp/architecture-site-v1.json
node stage3/design-factory/bin/design-factory.cjs validate /tmp/architecture-site-v1.json
```

All 12 source projects are committed in `examples/projects/`. Every source and generated site is still a **demo that requires a real owner brief**; the compiler's readyForPublish checklist is false for those examples. A production publication must pass owner/legal/content gates separately.

## CMS parity and limitations

The site-v1 JSON is validated through the unchanged first-party Stage3 SDK and manifests and can be fed into a reviewed CMS import path. The stylesheet and standalone HTML arrangement are **Design Factory previews**, not a guarantee of pixel parity with the PHP PublicRenderer. Rich compositions, expanded fonts and layouts require later integration. Static preview files are noindex, local and not a live release.

Validation matrix exercised in the current isolated JavaScript runtime: **12 kits × 12 themes × 2 language choices = 288 valid four-page site-v1 documents**, zero detected internal link errors. A Node filesystem/CLI smoke is authored at tests/kits-smoke.cjs but has not yet been run against an actual checked-out repository here. Browser QA of all 16 sites on real desktop/tablet/mobile Chrome remains pending before declaring complete visual acceptance.

## Next planned work

D5: real browser-facing Design Factory studio/catalogue, theme and page switching, owner data editing and export with Undo/Redo. D6: accepted mapping into the main CMS SDK/Studio/Server. D7: final visual portfolio review and handoff. Formal CMS acceptance: Stage2 NO-GO, Stage3+ unaccepted, 0/135.
