# MANUFACT SEO — computed CSS visibility QA

31 October 2026 · independent SEO worker · `feature/site-seo-engine` · `stage3/seo-engine/**` only.

## Purpose

The existing HTML-to-rendered-DOM SEO audit can confirm that H1, section headings, main landmark and Blueprint CTA/navigation anchors **exist**. It cannot tell whether responsive CSS hides them on desktop, tablet or mobile. This additive block extends the **same opt-in Chromium collector and same private rendered-content report** with a bounded, source-pinned CSS layout observation. No new dashboard, CMS module, site templates, Google claim or deployment.

## Code and contract

- `lib/seo-browser-css-visibility.cjs`: browser `page.evaluate` sampler + strict untrusted observation validator. No arbitrary client text, foreign URLs or screenshots are returned; only counters, Blueprint-approved paths, timestamps and a matching rendered DOM SHA256.
- `lib/seo-rendered-capture.cjs`: observe H1, H2–H6, main, approved CTA/navigation anchors after DOM stabilization; sample computed visibility twice 250ms apart. If counts move, record `unavailable` rather than invent stable facts.
- `schemas/viewport-capture-v2.schema.json`: backward-compatible optional `captures[device].visibility`, either `observed` (with SHA256 matching the same DOM) or `unavailable` (allowlisted reason).
- `lib/seo-rendered-content-audit.cjs`: reconciling current Blueprint routes with observed counts; source-body drift still blocks comparison.
- `lib/seo-rendered-content-view.cjs`: same private HTML/Markdown report, now with CSS coverage and hidden-content counts.
- `tests/seo-css-visibility-smoke.cjs`: synthetic DOM and private report escaping without network.
- Existing `tests/seo-rendered-capture-smoke.cjs`: mocked Chromium QA including CSS binding, tamper rejection and old-v2 compatibility.

## Diagnostics

| CSS finding | Priority | Meaning |
|---|---|---|
| `rendered:css-h1-not-visible` | P1 | H1 present in HTML, no visible layout box. |
| `rendered:css-main-not-visible` | P1 | Main landmark present, no visible layout box. |
| `rendered:css-all-section-headings-hidden` | P1 | All H2–H6 are hidden. |
| `rendered:css-some-section-headings-hidden` | P2 | Some H2–H6 are hidden; manually check mobile editorial intent. |
| `rendered:css-approved-cta-hidden` | P1 | All anchors to approved CTA destination hidden. |
| `rendered:css-planned-navigation-collapsed` | P2 | Navigation anchor hidden by default: check hamburger expansion, do not assume SEO defect. |
| `rendered:css-sampling-unavailable` | P1 | JS/CSS sample failed or layout changed during two observations. |
| `rendered:css-visible-*-aria-excluded` | P2 | Visible important content under `aria-hidden`/`inert`. |
| `rendered:css-dom-count-mismatch` | P1 | Captured HTML and computed heading counts differ, CSS conclusions withheld. |

## Limitations and operator steps

Layout visibility uses computed style, Element.checkVisibility, bounded display:contents child checks and nonzero layout rectangles. This is neither Google rendering nor full visual/a11y verification. Text below the fold remains layout-visible; menu expansion, focus, CSS transitions, pseudo-content, contrast, actual crawler/indexing status and published revision must be checked manually.

The old v1 and old v2 artifact formats remain valid. An old v2 without `visibility` is **CSS unknown**, not a pass. Partial page scopes remain incomplete for unselected Blueprint pages.

Run the existing `capture-rendered-public.cjs --mode preflight`, then explicitly operator-approved Chromium capture, followed by existing `review-rendered-content.cjs` or existing Operator Workspace. Private DOM files stay outside Git; no automatic fixes/GO.

Focused checkout checks:
```bash
node stage3/seo-engine/tests/seo-css-visibility-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-capture-smoke.cjs
```
These checkout tests and real customer Chromium have **not** been run in the current constrained environment; only static syntax/schema checks are claimed here.

References: https://playwright.dev/docs/api/class-page#page-evaluate · https://developer.mozilla.org/en-US/docs/Web/API/Element/checkVisibility
