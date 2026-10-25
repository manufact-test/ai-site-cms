# Design Factory — D1–D7 independent engineering program

Independent Stage3 Design Factory. **D1–D6 are implemented; D7 final quality gates are still open**. This does not constitute Stage3 acceptance or production release. Branch: `feature/stage3-design-factory`. Only writable subtree: `stage3/design-factory/`.

## Latest source hardening — 25 October 2026

**Functional/source checkpoint:** `39624c82fc7953c9afaa07452053f3acec6cd86a`. This commit changes only `stage3/design-factory/bin/build-browser-bundle.cjs` and `stage3/design-factory/tests/studio-smoke.cjs`.

- Fixed an output-boundary defect in the browser bundle builder: it previously wrote directly to `studio/runtime.generated.js`, which could follow an accidental final symlink or truncate a hard-linked external file.
- The builder now canonicalizes the repository root, rejects symlinked `stage3/`, `stage3/design-factory/` and `studio/` directories, rejects a symlink/non-regular final target, and writes to a same-directory temporary file before renaming it into place. The rename also replaces a hard-linked directory entry without modifying the other hard link.
- Added an isolated regression fixture to `tests/studio-smoke.cjs`: symlink rejection in build and check modes, creating a missing target, and safe replacement of a hard-linked target.
- A focused Node filesystem primitive probe **PASSed**: atomic rename left an external hard-link inode unchanged and `lstat` identified a symlink. This validates the underlying filesystem behavior only; the changed Design Factory test suite has **NOT** run in a genuine checkout.
- A fresh `git ls-remote` attempt still fails with `Could not resolve host: github.com`. Branch Actions runs remain 0. Do not claim Node/Studio/ZIP/PHP release acceptance from this source-level change.

**Release decision unchanged:** D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135 mandatory criteria. No merge or out-of-scope changes.

## Previous D7 environment audit — 25 October 2026

Audit-start HEAD was `bb219d64a58d590fbf2f806835e996a4277aee7d`, a documentation-only commit whose parent and functional/source checkpoint is `75884b7f794fa1dabc775d802613c38979eff4b8`. The six paths changed since that checkpoint are all documentation inside this subtree.

A genuine GitHub checkout attempt failed with `Could not resolve host: github.com`. Node 22.16.0 and PHP 8.4.24 are installed, but there is no checkout in the execution workspace; stable Node D7 suites and PHP parity were not run. GitHub reports zero workflow runs for this branch and zero check runs for the audit-start HEAD. Chromium's one-shot minimal headless probe timed out after 15 seconds (exit 124), so Studio E2E, the 54-image matrix and human review remain outstanding. No release ZIP, CRC/source-byte parity evidence or real ZIP SHA256 exists.

**D7 is still OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135.** These are explicit environment blockers, not passes. Do not repeat attempts unless the environment/connectivity has changed.

## Previous engineering checkpoint — 25 October 2026

**Latest functional/source commit:** `75884b7f794fa1dabc775d802613c38979eff4b8`. The recent work hardened Studio editing and release tooling:

- Focus retention and debounced preview updates; failed imports/state updates cannot silently look successful.
- Shared repository-safe output path validation, including symlinked-parent and final-symlink protection.
- Deterministic ZIP inventory ordering and a length-framed digest over exact source paths and bytes.
- Exact visual evidence matrix verification: 54 screenshots for the full set and 30 for quick mode; incomplete, duplicate, unexpected or wrong-sized images prevent matrix completion.

These changes and their smoke assertions are committed, but they have **not** been validated in a genuine Node checkout for the latest HEAD. GitHub Actions currently has no run/check/status evidence for this branch. The last known checkout attempt failed because DNS could not resolve GitHub. PHP parity remains unrun, Chromium previously timed out, no screenshots were captured or human-reviewed, and no real ZIP or archive SHA256 exists.

**Release state remains unchanged:** D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135 mandatory criteria. Use the handoff in `handoffs/NEXT-CHAT.md` for the three large closure blocks.
## Working features

The compiler reads real first-party Stage3 manifests, calls the existing Stage3 SDK (contract.cjs), and generates **four-page manufact-ai-site-v1 documents**, with routes, SEO, navigation, typed elements, stable IDs, safe links, appearance, and validated CMS theme. It supports three distinct composition archetypes (agency, industrial, consulting), RU and EN, optional real owner facts, and an empty brief with truthful placeholders. Unknown keys and invalid values are refused.

D2 contains 12 closed-catalog visual directions with distinct layout, type, card and geometric tokens. The current-source 288-combination CMS validator matrix passed in isolated V8; actual Node checkout and three-viewport Chromium visual acceptance remain open.

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

Format: **manufact-design-factory-v1**, version: **1**. Exact top-level keys: format, version, kit, theme, language, facts. Kits are agency, industrial, consulting, local-services, saas, logistics, architecture, education, portfolio, restaurant, repair and nonprofit; themes are editorial, technical, minimal, noir, brutalist, atelier, verdant, oceanic, copper, plum, cobalt and mono; languages are ru/en.

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

D1/D2 smoke: `tests/smoke.cjs` implements Node contract/CLI/static preview coverage for 288 kit × theme × language combinations, with 12 distinct CSS outputs. D5 Chromium E2E now covers browse/edit/undo/redo and browser-download JSON validation; it still must be executed on a functioning browser. Do not confuse authored tests or isolated V8 checks with actual Node/Chromium acceptance.

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
- D5/D6: offline Browser Studio and versioned integration bridge implemented, awaiting actual Chromium and lead import review. D7: test tooling and ZIP builder implemented; final checked-out Node execution, visual acceptance and ZIP artifact still pending.

**Honest verification:** evaluated the actual Stage3 SDK/manifests in the isolated JS runtime: 288/288 industry-theme-language site documents are valid and 42/42 D3 compositions map to valid registered CMS fallbacks. Full Node filesystem smoke scripts were authored but have not been executed on a checked-out repository in this environment. Local Chromium launch was attempted and did not complete; no browser PASS is claimed. Do not equate completed modules with production acceptance.

## D5 and D6 — full browser editor and versioned CMS integration

**D5 Browser Studio is implemented** at [studio/index.html](studio/index.html). Open that page directly in Chrome/Edge. No server, npm, CDN or network is required.

The interface provides: 12-kit catalog search, 12 working theme switches, four real pages, desktop/tablet/mobile preview, owner title/headline/description/CTA/contact/services editing, the full 42-pattern selection, Undo/Redo, validated project/workspace imports and downloads, CMS-compatible site-v1 JSON and a complete D6 integration package.

The browser runs the actual existing Stage3 SDK and real component manifests inside a deterministic first-party `studio/runtime.generated.js` bundle. To check source parity:

    node stage3/design-factory/bin/build-browser-bundle.cjs --check
    node stage3/design-factory/tests/studio-smoke.cjs

To regenerate the bundle after *reviewed* first-party source changes, call the same builder without `--check`. It writes only inside the Design Factory subtree. Refer to [studio/README.md](studio/README.md) for the owner-facing walkthrough, security model and optional Chromium E2E command.

**D6 Integration Bridge is implemented as a standalone versioned exporter/importer**, not a production publish path:

    node stage3/design-factory/bin/design-factory.cjs bridge-export stage3/design-factory/examples/projects/saas.json /tmp/new-d6-bundle.json
    node stage3/design-factory/bin/design-factory.cjs bridge-validate /tmp/new-d6-bundle.json --out /tmp/new-cms-site.json
    node stage3/design-factory/tests/bridge-smoke.cjs

A D6 package is `manufact-design-factory-export-v1`: source workspace, valid `manufact-ai-site-v1` site, design-spec, owner checklist, link inspection and explicit compatibility matrix. On import it **recompiles and compares** the package to detect silent tampering with either site data or unsupported property claims. This is not a cryptographic signature or owner permission check. See [INTEGRATION.md](INTEGRATION.md) for the complete supported / integration_required / blocked matrix.

**Verification boundary (24 October 2026):** the generated browser runtime has been executed in an isolated JavaScript environment and validated 288/288 D6 export/import combinations, including a photo-gallery fallback and tamper rejection. The full Node filesystem and interactive Chromium scripts are committed but not yet reported as executed PASS on a checked-out repository. The old Chromium launch blocker remains pending. D2/D3/D4/D5 final visual QA and D7 package/acceptance are separate outstanding work.

No merges to main or lead branch; no CMS SDK, PHP, Studio or production edits. Stage2 remains NO-GO, Stage3+ not accepted, 0/135 official criteria.

## D7 release verification, screenshots and portable ZIP

**New:** `QUALITY-GATES.md` is the operational release checklist and `handoffs/NEXT-CHAT.md` is the first document for the next independent developer chat. D7 tooling is implemented; checked-out Node, Chrome visual and manual acceptance gates remain open.

On an actual repository checkout:

```bash
# Source drift (must match the actual Stage3 SDK + manifests):
node stage3/design-factory/bin/build-browser-bundle.cjs --check

# Six integrated Node contract, CLI, export and deterministic ZIP suites:
node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-release-new.json

# Real interactive browser acceptance with a locally installed Chromium:
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/tests/studio-smoke.cjs

# Screenshots for 12 themes on desktop/tablet/mobile + showroom and sector examples:
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-visual-new

# Portable ZIP including offline browser Studio, all source and documentation:
node stage3/design-factory/bin/package-release.cjs /tmp/ai-site-cms-design-factory-new.zip
node stage3/design-factory/tests/package-smoke.cjs
```

Output paths must not exist in advance: no accidental replacement of owner data. The ZIP includes only this independent subtree. **Opening its `studio/index.html` works independently offline; running the CLI or test suites from the ZIP still requires the original repository's unchanged Stage3 SDK and component manifests.** A ZIP-builder script in the repository is not the same thing as an already published downloadable ZIP.

### Latest quality correction

The Stage3 service-grid manifest requires two cards. When an owner supplies exactly one real service, the second card is visibly marked as an unverified example, and `ownerChecklist.readyForPublish` stays **false**; the generated content must not silently be considered publish-ready. Tests now assert this owner-safety behavior rather than one arbitrary industry-specific placeholder phrase.

**Do not mark all 7/7 accepted or Stage3 GO** until real Node/Chromium evidence, representative visual inspection, owner content review and the lead integrator's approval are complete. Current Stage2 NO-GO, Stage3 unaccepted, 0/135 formal mandatory criteria remain unchanged.

## Latest D7 engineering checkpoint — 24 October 2026

After checkpoint `4015fd1fbbb31cbc3b74e0141e2c9edb68183807`, the isolated developer branch received:

- Owner-readiness safeguard: Studio's initial service names/descriptions and obvious "Example (verify)" placeholders no longer count toward two completed services. Manually confirmed real services still allow the data-completeness checklist to become ready, while `requiresOwnerReview` remains `true`. A Node regression case and browser-bundle mirror were added.
- Consistent 44px touch hit targets in Studio navigation/controls/service deletion and exported site navigation, detail accordion headings and inline CTA text links.
- Expanded browser E2E: four real downloads (CMS site-v1, versioned D6 bundle, editable project and workspace) must parse and agree with the first-party SDK. Existing interactions remain covered.
- Stronger portable ZIP test: confirms central directory counts, names, CRC, compressed/uncompressed lengths and local offsets in addition to existing deterministic hash/no-overwrite/deflate checks.
- The offline `studio/runtime.generated.js` was rebuilt from exact first-party source and read-only registered manifests. Source-vs-bundle equality confirmed by rerunning the unchanged deterministic builder in its `--check` mode via an in-memory V8 filesystem harness.

**Actually observed in current-source in-memory V8:** 288/288 site-v1 contract validations and internal link inspections; 288/288 D6 complete round trips; 42/42 registered composition fallbacks; placeholder check refusing misleading completeness; modified D6 package rejected; browser bundle parity PASS. This is not a real filesystem-based Node checkout or a Chromium interaction test.

**Still blocked:** local `git ls-remote` fails to resolve GitHub, Chromium hangs even for a minimal data URL (also when rerun with restricted-process flags), and the branch has no GitHub Actions workflow runs. Consequently checked-out Node suites, responsive screenshots/manual review, final ZIP bytes and verified ZIP SHA256 are **not** claimed. See `PROGRESS.md`, `QUALITY-GATES.md` and `handoffs/NEXT-CHAT.md` for the executable gate plan. Do not deploy, merge or call Stage3 accepted on this evidence.

## D7 human-review and JSON interoperability additions

The D6 integration package now survives reserialization with a different order of JSON object members. `bridge.validateBundle()` still recompiles the complete package and rejects changed owner/site values, modified page SEO, unexpected properties, reordered arrays and invalid values. The negative and positive cases are documented in `tests/bridge-smoke.cjs`; PHP/Studio import remains a separate lead-integration step.

For final visual acceptance, `bin/visual-qa.cjs` generates `visual-review.html` alongside `visual-evidence.json`, original PNGs and offline sites. Open the local review HTML to inspect the desktop/tablet/mobile themes, D3 showroom and RU/EN sector sites. This is an **unapproved human-review worksheet**, never a screenshot PASS. It displays each screenshot's actual measured dimensions and flags capture errors. Inspect the entire D3 showroom and actual browser interactions separately, because one viewport image does not inspect every composition on a long page.

The ZIP smoke suite now compares extracted archive members **byte-for-byte to every source file** and validates the complete source inventory. These improvements were checked for syntax and isolated in-memory contract behavior; the full Node checkout, Chromium and actual final ZIP artifact have not been produced in the current environment. See `QUALITY-GATES.md` for exact commands and honest gate status.

## Optional Design Graph integration candidate — 24 October 2026

The lead developer's branch now exposes a newer typed CMS `designGraph` contract. A standalone candidate adapter at `lib/lead-design-graph-adapter.cjs` converts a selected D3 composition into actual host-editable graph nodes without modifying or replacing Design Factory's **existing** D6 exports. See [`proposals/LEAD-DESIGN-GRAPH.md`](proposals/LEAD-DESIGN-GRAPH.md) for precise editability, missing pixel-parity features and lead setup.

In isolated V8 against the actual lead SDK/Design Graph source, **504/504** candidate graphs validated and rendered across 42 patterns × 12 themes, and **288/288** original sites remained compatible. Neither the optional Node checkout smoke nor PHP/Chromium/manual QA has passed in this environment. The formal Stage2/Stage3 gates and D7 release status remain unchanged.

## Host-editable D3 variation update

The optional newer-lead-SDK bridge now creates 504 distinct typed Design Graph documents, with editable fonts, grids, responsive spans, gradients, card treatments, native icons, motion and 48px CTA targets. Direct owner-like edits to generated JSON re-render correctly in isolated live-source V8, without re-generating via AI. Full checkout Node, PHP validation, Chromium screenshots, ZIP and formal release remain unverified. See proposals/LEAD-DESIGN-GRAPH.md and QUALITY-GATES.md.

## Semantic CMS content in optional lead graph candidates

The newer-host graph adapter now exports all selected service/FAQ/benefit items as distinct editable nodes and preserves user-supplied hero and service information (the verified original D6 bundle is not modified). A provenance map connects graph text/links with source CMS slots and repeater items; the lead may invoke `reconcileSemantic` explicitly after a normal CMS content edit to update node text without losing its designer-controlled styles. No automatic two-way binding or publish rights are implied. Unfilled gallery output remains an honest upload prompt. See `INTEGRATION.md` and `proposals/LEAD-DESIGN-GRAPH.md` for precise API and limitations.

Expanded source-level isolated V8 lead smoke PASS: 504 graph candidates/renders, 12-owner-service scenario, FAQ, safe empty gallery, escaping, provenance reconciliation. Full checked-out Node/PHP/Chromium and final ZIP gates remain open, Stage2 NO-GO / Stage3 not accepted / 0/135.

## Final independent-developer checkpoint

Conflict-safe semantic reconciliation now has a read-only `inspectSemanticSync()` plan (changes, preserved graph edits, conflicting two-sided edits) and an explicit `reconcileSemantic()` that refuses destructive content overwrite. A successor handoff and first-chat message are in `handoffs/SESSION-CLOSEOUT-2026-10-24.md` and `handoffs/START-NEXT-CHAT.md`. The source-level 504/504 lead SDK+graph smoke passed with conflict regressions; real checkout Node/PHP/Chromium/ZIP and owner visual approval remain unverified. Do not treat source-level checks as D7 acceptance.

## 25 October — rebuild preview, structured visual diff and component-family coverage

The optional lead adapter now exposes `inspectRebuild()`, a read-only preflight for the explicit AI-free `rebuildHostCandidate()` path. It gives Studio a structured list of graph-only copy at risk (node/property and old/new values), and predicts preserved/created/reset/removed node IDs. A destructive preflight remains `canApply:false` until the authenticated host separately obtains owner confirmation. The simulated report is not an authorization token and never saves or publishes.

Regression suite expansion: 504 distinct composition/theme candidates were validated and rendered; all 504 also passed a no-op structural rebuild and read-only rebuild preflight without changing markup or the source candidate. Additional tests cover source refresh in all 8 registered component families, manual copy preservation, CMS/Graph conflicts, exact deletion confirmation, style bleed on reorder, preview immutability and bounded input sizes.

These results ran in isolated V8 using real GitHub JS sources with emulated Node core modules; they are **not** a real checkout/Node, PHP or Chromium run. D7 remains OPEN pending the actual Node release audit, PHP parity, 54 screenshot captures with human review, and a real source-matching ZIP with SHA256.

## 25 October — structural rebuild cannot silently erase owner work

The optional Lead adapter now detects owner-deleted canonical nodes, custom nodes dropped by rebuild, custom node IDs colliding with newly created CMS nodes, and owner-authored styles/media properties that would be lost with a removed/reset node. The typed `DF_REBUILD_OWNER_REVIEW_REQUIRED` error carries exact acknowledgement IDs. Read-only `inspectRebuild()` distinguishes the edited graph from the predicted rebuilt graph and returns before/current/rebuilt values.

Media `assetId` and alt edits survive if their CMS source is unchanged; divergent two-sided edits fail closed. The host remains responsible for owner authentication, revision locking, explicit confirmation, undo, visual review, persistence and publishing.

Latest isolated-source evidence: 504/504 graph validations, renders, no-op rebuilds and preflights; 8 CMS component-family refreshes; 8 loss-aware structural/style/media groups. This is not actual Node/PHP/Chromium or release-ZIP acceptance. D7 remains OPEN.
