# Design Factory — D1 compiler and design tokens

Independent implementation for Stage3. This is a functional **D1 delivery**, not the completion of D2–D7 or Stage3 acceptance. Branch: feature/stage3-design-factory. Writable folder only: stage3/design-factory/.

## Working features

The compiler reads real first-party Stage3 manifests, calls the existing Stage3 SDK (contract.cjs), and generates **four-page manufact-ai-site-v1 documents**, with routes, SEO, navigation, typed elements, stable IDs, safe links, appearance, and validated CMS theme. It supports three distinct composition archetypes (agency, industrial, consulting), RU and EN, optional real owner facts, and an empty brief with truthful placeholders. Unknown keys and invalid values are refused.

D1 includes three foundation themes: editorial, technical, minimal. The separate D2 requirement is **12 professionally finished visual systems**, not claimed completed here.

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

Format: **manufact-design-factory-v1**, version: **1**. Exact top-level keys: format, version, kit, theme, language, facts. Kits are agency/industrial/consulting; themes are editorial/technical/minimal; languages are ru/en.

The facts object accepts ONLY these optional fields:
- siteId: 3–80 lowercase letters/digits/hyphens (starts with letter)
- title: owner-provided brand/site title, max 120
- headline: verified hero statement, max 120
- description: verified description, max 400
- ctaLabel: CTA label, max 120 (must still satisfy real CMS field limit)
- contactText: explanatory text, max 400, not an invented contact address
- services: up to 12 objects with exact keys title (max 120) and description (max 320)

Example source projects: examples/agency-ru.json, examples/industry-en.json, examples/consulting-ru.json. They are **illustrative**. Owner facts must be verified, not treated as real company claims.

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

D1 smoke: one Node contract/CLI/static preview test at tests/smoke.cjs. D5 will add actual Chromium E2E for browse/edit/export. Do not confuse offline construction with stage acceptance.

Formal status remains Stage2 NO-GO #5–#9; Stage3+ unaccepted; **0/135** officially accepted criteria.
