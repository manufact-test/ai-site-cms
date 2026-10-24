# D7 · Final quality gates and evidence

**Document date:** 24 October 2026. **Status:** Release tooling implemented, **visual/manual and checked-out Node execution pending**. Formal Stage2 NO-GO, Stage3+ unaccepted, 0/135 mandatory criteria.

## One-command checks (on an actual repo checkout)

Requires Node.js 20 or newer. No packages to install, no server, no network. Run from repository root:

```bash
node stage3/design-factory/bin/build-browser-bundle.cjs --check
node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-D7-report.json
```

The release audit runs SIX integrated tests: D1/D2 contract/CLI, D3 composition showcase, D4 sector gallery and SHA256, D5 real bundled SDK parity, D6 reversible/tamper-rejecting package, D7 reproducible ZIP integrity. Output is a JSON report with every suite's status and a SHA256 file inventory. An `exit 3` with all Node suites green means **Chromium was not run and the gate remains intentionally open**; do not report final pass. The audit never runs against production and writes only to an explicitly requested NEW report file (or stdout).

## Browser interaction test

```bash
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/tests/studio-smoke.cjs
```

This is a real GUI scenario: open Studio, select sector and theme, switch mobile mode, edit actual owner title, select registered `photo-gallery` fallback, perform Undo/Redo, and confirm preview generation. Do not call a JavaScript-runtime-only SDK test a real GUI E2E. If Chromium fails/hangs, record the failure and keep the acceptance gate pending; do not mark PASS.

## Visual evidence at three widths

```bash
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-visual-new
```

The full mode captures first-party browser screenshots at **1280×800**, **768×1000**, **390×844**, covering all 12 visual directions, D3 showroom and four distinct sector websites. A smaller initial smoke can use `--quick`. The output includes `visual-evidence.json`, screenshot SHA256 and a pointer to original first-party source pages. Screenshots alone do **not** constitute successful human visual acceptance.

Before closing D7, manually inspect screenshots and interactions for: typography clipping/overflow, navigational menu visibility, realistic empty states, cards and CTA affordances, keyboard focus and tab order, 44px touch targets where needed, reduced-motion, no broken image symbols, high-contrast text, language correctness, page-to-page navigation, placeholders clearly labeled, gallery accessibility and accurate unsupported-feature labels. Look at at least one English kit and each distinct theme/layout. Any serious regression remains a blocker.

## Deterministic ZIP package

```bash
node stage3/design-factory/bin/package-release.cjs /tmp/ai-site-cms-design-factory-new.zip
node stage3/design-factory/tests/package-smoke.cjs
```

Creates a new, portable ZIP containing **only** the `stage3/design-factory/` subtree, including all guides, samples and standalone `studio/index.html`. ZIP entry timestamps are fixed; entries have CRC32, deflate, normalized paths and a deterministic SHA256. Existing files, symlinks, unknown asset types and source-outside-subtree paths are rejected. The ZIP viewer works offline. Running the CLI and its Node tests from ZIP-source requires the original repository's read-only `stage3/sdk/` and `stage3/components/` files; the ZIP is not a complete duplicate of main CMS.

This script **is a packaging option**, not a claim that a downloadable ZIP has already been generated on GitHub. The next developer can build it on a normal checkout, upload that resulting artifact if requested, and provide its actual link.

## D7 release decision and formal boundary

| Criterion | Evidence needed | Status |
|---|---|---|
| D1 strict first-party CMS contract | Node suites & real site-v1 JSON | Implemented, checkout run pending |
| D2 12 visual styles | 12×3 screenshots + human inspection | Pending |
| D3 42 real section previews | HTML/CSS, mapping suite, 3-width QA | Mapping implemented, Chromium pending |
| D4 12 industries, 16 local sites, 64 pages | Node export/hash test, 3-width human review | Code implemented, checkout run pending |
| D5 full offline Studio | Browser sector→theme→edit→mobile→export→undo E2E | Implementation in Git, real Chromium pending |
| D6 closed integration package | Tamper rejection + real SDK import + PHP parity limitations | Standalone adapter implemented, main integration pending |
| D7 packaging and handoff | Release-gate JSON, deterministic ZIP, manual acceptance, approved SHA | Gate tools in Git, final acceptance pending |

Never state **all seven accepted** merely because new tools are committed, or because source code passed isolated JS validation. The lead developer alone reviews integration and any changes to main. Stage2/3 product acceptance remains separate.
