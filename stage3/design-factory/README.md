# Design Factory — D1 compiler and design tokens

Independent implementation for Stage3. This is a functional **D1 delivery**, not the completion of D2–D7 or Stage3 acceptance. Branch: feature/stage3-design-factory. Writable folder only: stage3/design-factory/.

## Working features

The compiler reads real first-party Stage3 manifests, calls the existing Stage3 SDK (contract.cjs), and generates **four-page manufact-ai-site-v1 documents**, with routes, SEO, navigation, typed elements, stable IDs, safe links, appearance, and validated CMS theme. It supports three distinct composition archetypes (agency, industrial, consulting), RU and EN, optional real owner facts, and an empty brief with truthful placeholders. Unknown keys and invalid values are refused.

D1 started with three foundation themes. Work on D2 now includes twelve closed-catalog visual directions, with distinct layout, type, card and geometric tokens. The D2 catalog has passed a 72-combination contract matrix; final three-viewport Chromium visual review remains outstanding.

The CLI can create, validate and inspect CMS site JSON. It can export a standalone, truly browsable **multi-page visual preview** as HTML/CSS, with responsive grids and reduced-motion support, using no network, CDN or other runtime. It clearly labels the preview, adds noindex, and does **not** claim the existing PHP renderer can reproduce its custom layout.

## Commands (run from repository root)

    node stage3/design-factory/bin/design-factory.cjs help
    node stage3/design-factory/bin/design-factory.cjs kits
    node stage3/design-factory/bin/design-factory.cjs create --kit industrial --theme technical --lang en --out /tmp/df-site.json
    node stage3/design-factory/bin/design-factory.cjs validate /tmp/df-site.json
    node stage3/design-factory/bin/design-factory.cjs inspect /tmp/df-site.json
    node stage3/design-factory/bin/design-factory.cjs create --brief stage3/design-factory/examples/agency-ru.json --out /tmp/df-agency.json
    node stage3/design-factory/bin/design-factory.cjs export stage3/design-factory/examples/agency-ru.json /tmp/df-new-preview
    node stage3/design-factory/tests/smoke.cjs

Requires Node.js >=20. No npm install. New export directory must not exist; no overwrite. Create --out must target a new file. Create without --out writes site-v1 JSON to stdout; missing-owner-fields summary goes to stderr. Optional --project-out saves an editable design project. CLI JSON input is limited to 1 MiB and refuses symlink files.

Open the new preview directory's index.html in a browser. Its Services, Approach and Contact pages are real linked HTML files. Native FAQ accordions work without scripts.

## Exported directory

- site-v1.json: supported subset for existing CMS, validated via real SDK
- project.json: original versioned Design Factory project, reusable for edits
- design-spec.json: theme, archetype, CMS supported values, and explicitly integration_required layout differences
- owner-checklist.json: missing verified facts; still requires human approval
- inspection.json: real SDK site inspection
- index.html, services/index.html, approach/index.html, contact/index.html: self-contained pages for standalone design inspection, NOT the current PHP visitor implementation
- assets/preview.css: deterministic local styles, responsive and prefers-reduced-motion

## Strict project contract

Format: **manufact-design-factory-v1**, version: **1**. Exact top-level keys: format, version, kit, theme, language, facts. Kits are agency/industrial/consulting; themes are editorial, technical, minimal, noir, brutalist, atelier, verdant, oceanic, copper, plum, cobalt and mono; languages are ru/en.

The facts object accepts ONLY these optional fields:
- siteId: 3–80 lowercase letters/digits/hyphens (starts with letter)
- title: owner-provided brand/site title, max 120
- headline: verified hero statement, max 120
- description: verified description, max 400
- ctaLabel: CTA label, max 120 (must still satisfy real CMS field limit)
- contactText: explanatory text, max 400, not an invented contact address
- services: up to 12 objects with exact keys title (max 120) and description (max 320)

Example source projects: examples/agency-ru.json, examples/industry-en.json, examples/consulting-ru.json. Three independently precompiled four-page CMS documents are also provided as examples/generated-agency-site-v1.json, examples/generated-industrial-site-v1.json and examples/generated-consulting-site-v1.json. They are **illustrative**. Owner facts must be verified, not treated as real company claims.

An entirely missing project compiles to agency/editorial/RU with placeholders. Closed version 0 input (same fields) migrates to version 1; unknown/future versions are refused. Round-trip JSON does not introduce unknown CMS keys.

CMS service-grid requires at least 2 cards. If the owner lists exactly one service, a visibly marked second **placeholder** is added (not a claimed real service). Owner-checklist flags missing facts. The generated site still requires owner review before any publication; the checker cannot independently verify facts.

## Compatibility and integration

| Feature | D1 output | Status |
|---|---|---|
| Site model | Existing manufact-ai-site-v1 and schemaVersion 1 | supported |
| Components | Real manifests through sdk.sectionFrom and sdk.validateSite | supported |
| SEO/navigation/routes | Existing page.seo, page.navigation, safe local URLs | supported |
| Site theme | Existing background/surface/text/primary/font/maxWidth | supported |
| Section appearance | Existing surface/spacing/align enums | supported |
| Images | Empty registered media slots, no invented asset bytes | manual owner media required |
| Enhanced visual preview | Standalone first-party CSS layout | integration_required for PHP parity |
| Custom type hierarchy, grids, picture variants | Design preview only | integration_required |
| Lead forms | Not silently inserted or submitted; real collector needs server configuration | not in D1 |
| Accounts, publishing, rollback | Not performed or simulated | outside scope |

The preview escapes all owner text, uses no inserted user HTML/JavaScript, and never runs code supplied by project facts. Its noindex pages are for offline checking only. It is not a release export, is not proof of working forms, and must not be deployed as a production CMS site without separate integration.

D1/D2 smoke: one Node contract/CLI/static preview test at tests/smoke.cjs, including a 72-combination CMS validator matrix and 12 distinct CSS outputs. D5 will add actual Chromium E2E for browse/edit/export. Do not confuse offline construction with stage acceptance.

Formal status remains Stage2 NO-GO #5–#9; Stage3+ unaccepted; **0/135** officially accepted criteria.

## D3 and D4 — usable new workflows (24 October 2026)

Beyond the D1 compiler and D2 theme catalog, this branch now also contains **42 designed compositions** and **12 real four-page sector kits**. All code is still in stage3/design-factory/ and uses only Node standard libraries and approved Stage3 read-only SDK/manifest imports.

### Section composition showcase — D3

    node stage3/design-factory/bin/design-factory.cjs compositions
    node stage3/design-factory/bin/design-factory.cjs compositions gallery
    node stage3/design-factory/bin/design-factory.cjs showcase /tmp/df-compositions-new
    node stage3/design-factory/bin/design-factory.cjs compose hero-center --out /tmp/df-composition-site.json
    node stage3/design-factory/bin/design-factory.cjs compose gallery-mosaic --out /tmp/df-gallery-fallback.json --report /tmp/df-gallery-parity.json
    node stage3/design-factory/tests/compositions-smoke.cjs

The new local showroom is a real HTML/CSS page with 42 original responsive compositions across 14 categories, keyboard focus, semantic placeholders, native FAQ, scroll-snap galleries and reduced-motion. `compose` produces a valid existing CMS site-v1 document using its real registered component fallback. The richer visual composition is NOT a new PHP manifest or visitor renderer, and 8 integration-required component proposals are in proposals/ADAPTERS.md. More details: catalog/COMPOSITIONS.md.

### Sector gallery — D4

    node stage3/design-factory/bin/design-factory.cjs kits
    node stage3/design-factory/bin/design-factory.cjs kit-gallery /tmp/df-sector-new
    node stage3/design-factory/tests/kits-smoke.cjs

Opening /tmp/df-sector-new/index.html lets you browse 12 RU and 4 EN self-contained sample websites with a total of **64 real HTML pages**. Files include actual per-site theme CSS, reviewed site-v1 JSON, and a catalog-manifest.json with SHA256 for each site's four pages, CSS and CMS JSON. All 12 project sources live at examples/projects/. You can recompile any of them with the same create/export commands. Never overwrite an existing destination; the CLI refuses it.

D4 source and 12 registered sector kits: catalog/kits.cjs and catalog/KITS.md. Six archetypal page sequences, explicit demo-only industry copy and 4 bilingual sector definitions. Generated default service labels explicitly say they must be verified; neither mock customer proof nor real email/phone/prices are invented.

### Status distinction

- D1: real Stage3 contract and compiler implemented.
- D2: 12 genuinely different theme treatments and contrast guards, actual Chromium visual QA pending.
- D3: 42-pattern implementation, semantic CMS mapping and offline showcase built; 3-viewport browser QA pending.
- D4: 12 kits / 64 exportable pages and SHA256 gallery built; 3-viewport browser QA pending.
- D5–D7: not yet completed — browser Studio/editor, complete integration bridge, final acceptance/packaging.

**Honest verification:** evaluated the actual Stage3 SDK/manifests in the isolated JS runtime: 288/288 industry-theme-language site documents are valid and 42/42 D3 compositions map to valid registered CMS fallbacks. Full Node filesystem smoke scripts were authored but have not been executed on a checked-out repository in this environment. Local Chromium launch was attempted and did not complete; no browser PASS is claimed. Do not equate completed modules with production acceptance.
