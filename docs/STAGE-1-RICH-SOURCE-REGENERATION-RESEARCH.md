# AI Site CMS — Stage 1 original rich HTML regeneration and owner-value migration (v1.28)

**Date:** 18 October 2026. **Experiment branch:** `research/stage1-editor-comparison`, HEAD **16b8a891676e214da92f96622a491eadc2303398**. **Full GitHub Actions 4/4 completed SUCCESS:** [run #39121390624](https://github.com/manufact-test/ai-site-cms/actions/runs/39121390624). Comparison, regeneration, durability and mixed-site-trust all passed. Stage1 NOT accepted, Stage2 not begun, architecture/editor stack not selected.

## A. New real-browser integration test of editing the ORIGINAL rich HTML source

File: `research/stage1/rich-source-regeneration-browser.cjs`, testing the existing researcher-authored Cedar Lab complete HTML/CSS/JS site from `fixtures/cedar-lab-standalone.html`. The code uses pinned parse5 + actual system Chromium on a GitHub runner, rather than only the earlier known five-component typed graph renderer. Original page is not independently produced by another LLM.

**45 successful assertion checks, 10 expected rejections** in the final complete CI. Four separately validated **manual owner overrides** are applied to original HTML/CSS without replacing its overall component composition:
- `hero-title/content.text`: owner text with literal `<script>` markup is rendered as harmless escaped text;
- `hero-cta/behavior.href`: in-page fragment only, and target ID must exist;
- `hero-image/media.alt`: owner-managed accessible description;
- `document/style.gutter`: a bounded integer updates exactly one predeclared CSS custom property `--gutter`; arbitrary CSS code cannot be supplied.

A manually authored **v1 → v2 regeneration** changes default hero copy, newsletter title, CSS base gutter and gradient, and reorders two article cards. All four overrides stay attached to their original stable IDs; the source revision and card order update in the draft. The previously published v1 remains **byte-identical source and owner state** until an explicit publish. Publishing appends an immutable logical history entry; rollback to published v1 appends another revision and does not discard the current v2 draft. **This research revision journal is memory-only, NOT durable production PHP storage**; existing PHP durability tests remain separate.

## B. Conflict quarantine and browser security

The migration refuses and leaves the existing draft unmodified for reviewed ID removed/renamed, duplicate IDs, a reviewed element whose stable ID is reused for a **different HTML element type** (e.g. h1 → button), a removed owner-edited `alt` attribute, an absent reviewed CSS variable, an invalid style value, an arbitrary owner field, an unsafe JavaScript URL and a fragment whose in-page destination no longer exists. The experiment does not silently infer an alias when IDs or semantics change; manual reviewed alias/migration would be necessary.

Original input scripts, inline event handlers, iframe/object/embed elements are stripped for its **opaque CSP sandbox read-only preview**. Real Chromium proves owner-edited text/link/alt, computed CSS gutter **40px**, responsive CSS original mobile 1-column grid and **36px** heading, reduced-motion suppression, and changed source card order versus unchanged published card order. Hosted form and media cannot fetch from the preview due to CSP and network denial; any original JavaScript behavior is intentionally disabled, not preserved. A source attack with inline handler and script is stripped.

This is **NOT** a generic safe sanitizer or arbitrary script/style importer. It supports a known, manually reviewed handful of targets. It does **NOT** prove browser hydration, Next SSR, full PHP-source parity, executable plugin controls, independently authored site/manifest generation, actual server-side multiwriter durability or a CMS product. A browser-preserved original CSS appearance in restricted preview is not equivalent to complete interactive production fidelity or to every CSS field being editable.

## Verification and diagnosis

- First test build passed the wrong parse5 API shape (`parse` function vs `parse + serialize` module), fixed in research code; subsequent full runner confirmed the test.
- A further strict semantic hardening rejected same-ID wrong-element-kind mutations and broken target anchors, followed by a new full CI run.
- **Final GitHub Actions [#39121390624](https://github.com/manufact-test/ai-site-cms/actions/runs/39121390624): all 4 jobs completed/success**, including old Jedison/RJSF browser comparisons, PHP persistence, versioned site reconciliation and provenance suites.
- Only research code changed in research branch, and only this report/status/handoff documents change on main.

## Conclusions without architectural sign-off

The selected target-binding mechanism can preserve some hand-edited content/appearance through a source-code change and detect important semantic schema conflicts. This reduces a previously missing integration evidence gap between "original AI HTML/CSS" and "typed owner overrides", but proof is still **bounded to one manually authored site and four approved bindings**.

**Mandatory next evidence:** truly independent *other-model* site+separately produced manifest against an evaluator isolated from generation; multi-design/SEO/media/JS editable coverage; safe capability registration and generated behavior reviews; durable cross-runtime source migrations with real storage/permissions/rollback; remote append-only trust/anti-replay and auth/key lifecycle; only owner-approved read-only shared-host test. Technology A/B/C decision remains reserved to owner.

**Status unchanged:** Stage0 accepted; Stage1 in progress NOT accepted; Stage2 not started; 18 stages total (0–17), 193 requirements=135 mandatory+42 desirable+16 not needed; 43 limited R&D/document signals and 92 missing matched target evidence; **0/135 mandatory PRODUCT accepted**, no MVP, one full first release only after 135/135. CELIKOM independent late pilot Stage17, not modified.
