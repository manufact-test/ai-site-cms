# Design Factory — operational PROGRESS

Updated 24.10.2026. Branch `feature/stage3-design-factory`. **Only `stage3/design-factory/` is writable.** No merges, servers, workflows, SDK, PHP, Studio-main or Hostinger touched.

Baseline for this working pass: `f84412b309c0788d253bfcdbb4423b055b66b9d7`. For the final SHA, read the latest commit on this branch; this file describes implementation/verification, not a frozen git ref.

## Seven-result program

| Phase | Current status | Genuine remaining work |
|---|---|---|
| D1 Compiler / versioned contract | **Implemented** | Execute exact Node filesystem smoke on checkout as final release acceptance |
| D2 12 design systems | **Implemented** | Actual visual Chromium QA at 1280/768/390, keyboard/motion/contrast design review |
| D3 42 section compositions | **Implemented** | Actual three-viewport Chromium QA of whole showroom |
| D4 12 sector kits | **Implemented** | Actual visual review of 16 sites / 64 pages and real Node filesystem SHA256 verification |
| **D5 Browser Studio** | **Implemented: full real browser app** | Execute optional Chromium browse→edit→gallery→undo/redo test, human UI review and fix any findings |
| **D6 Integration bridge** | **Implemented: isolated versioned bundle/CLI/browser exporter/importer** | Lead to integrate actual importer and unsupported PHP layout/media adapters after separate review; product acceptance pending |
| D7 Final QA, release packaging, lead handoff | TODO | End-to-end Stage3 contract and browser tests, visual polish, complete handoff and final source diff audit |

**Functional delivery:** 6 of 7 major result code paths implemented; D7 and several necessary test/visual gates still open. **This is NOT 6/7 accepted or CMS production readiness.** Formal Stage2 NO-GO, Stage3+ unaccepted, 0/135 official acceptance checks remain.

## D5 completed in this pass

- `studio/index.html`, `studio/studio.css`, `studio/studio.js`: original three-panel responsive standalone GUI. Browse/filter 12 sector kits, select all 12 theme treatments, navigate Home/Services/Approach/Contact, preview desktop/tablet/mobile, edit owner title, verified headline, description, CTA, contact details and service repeater, choose all 42 D3 compositions with actual CMS registered fallback.
- Built-in Undo/Redo with text-field-native Ctrl+Z preserved, input validation/errors, verified owner checklist, no backend state or storage, project JSON import/export, closed versioned workspace import/export, real site-v1 download, bridge map and D6 package download.
- Security: local first-party scripts only, preview sandbox iframe without same-origin, constrained CSP, trusted page navigation messages from that exact iframe, HTML escaping via first-party renderer, disabled preview network and forms.
- `studio/runtime.generated.js` bundles current read-only Stage3 SDK/8 manifests plus own compiler, 12 kits/themes, 42 compositions, preview, D3 adapter, and D6 bridge. `bin/build-browser-bundle.cjs` re-creates it offline and checks drift.
- `lib/preview.cjs` now supports genuine registered `photo-gallery` empty-media fallback, removing a failure uncovered in integration verification.
- `tests/studio-smoke.cjs` tests first-party bundle parity and includes optional real Chromium interaction scenario with `DF_CHROMIUM_BIN`. `studio/README.md` covers usage and restrictions.

## D6 completed in this pass

- `lib/bridge.cjs`: strict `manufact-design-factory-workspace-v1` and `manufact-design-factory-export-v1`. Revalidates via current first-party Stage3 and compares every output field to deterministic recompile, rejecting unknown JSON properties or changed site/compatibility data.
- `bin/design-factory.cjs`: `bridge-export`, `bridge-validate` and optional isolated validated `site-v1` output. Never overwrites files and never publishes.
- `tests/bridge-smoke.cjs`: validates 288 combos, intentional tampering, D3 composition fallback and CLI roundtrip (authored; real Node checkout execution pending).
- `INTEGRATION.md`: supported/integration_required/blocked table for SDK properties, semantic fallback, layouts/CSS, media, forms, motion, contact facts, licensing, publishing and required server adapters.
- Existing `catalog/KITS.md`, `catalog/COMPOSITIONS.md` and `catalog/THEMES.md` remain valid earlier program documentation.

## Actual checks (truthful evidence)

- First-party **browser-runtime generated bundle executed** in an isolated JavaScript runtime, using actual unchanged Stage3 SDK/manifests. Verified **144/144** kit×theme compilations with a registered selected composition and **576** associated HTML pages.
- Next validated **288/288** kit×theme×language D6 complete packages through `build` and `validateBundle`, 4 pages and zero internal link errors in each. Explicit changed-site tamper rejected. Gallery selection produced a legal `photo-gallery` CMS section and rendered HTML without unknown component exceptions.
- Bundle builder was used to regenerate `runtime.generated.js` directly from current first-party files, with static syntax verification; Studio main JavaScript and new Node smoke scripts passed JavaScript syntax checking in the isolated runtime.
- UI interaction, true Node filesystem/CLI smoke and real Chromium E2E **not yet executed in this checkout**; not marked PASS. Chromium had failed to start in earlier session. No CI/workflow changes, no live release or public website touched.
- No claims of studio DOM visual acceptance or PHP pixel parity.

## Next independent pass

1. Check latest HEAD and this PROGRESS; work solely in our folder. **Primary action: D7 verification and quality/packaging.**
2. Run first-party Node: `tests/smoke.cjs`, `tests/compositions-smoke.cjs`, `tests/kits-smoke.cjs`, `tests/studio-smoke.cjs`, `tests/bridge-smoke.cjs`. If real checkout isn't possible, make limits explicit; avoid simulated "CI PASS".
3. Run Chrome/Chromium D5 E2E via `DF_CHROMIUM_BIN` and inspect D2/D3/D4 at 1280/768/390 widths with keyboard, empty state, theme changes, reduced-motion and representative RU/EN kits. Correct any defects.
4. Final clean documentation, deterministic package, compare changed paths and SHA. Only **after all seven results** and real meaningful acceptance prepare final message for main developer. Do not merge by yourself.

**Formal project acceptance is unchanged: Stage2 NO-GO #5–#9; Stage3+ not accepted; 0/135 mandatory criteria.**
