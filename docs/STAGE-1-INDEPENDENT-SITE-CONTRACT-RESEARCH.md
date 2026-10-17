# AI Site CMS — Stage 1: stand-alone site / contract preflight and trust boundaries

**Checkpoint v1.22 (18.10.2026).** Full [GitHub Actions PASS #39077113741](https://github.com/manufact-test/ai-site-cms/actions/runs/39077113741), research head 7d8178c54e557ec4a37f1427f0917dab2d9daabd. This is research only; no CMS production code and no architecture selection. Experimental code stays in research/stage1-editor-comparison, not main.

## 1. Independent layout experiment (scope and provenance)

A complete HTML document, Tide Atlas, was authored outside the current CMS parser grammar, from a creative brief. It includes unique CSS layout/grid, CSS variables, radial and conic gradients, clamp(), media queries, keyframes, filter, embedded SVG, disclosure details, dialog, a form and custom JavaScript. Its original HTML has no data-stable-id/data-editable annotations. Source: [fixture](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/fixtures/tide-atlas-standalone.html).

**Important:** this is one separately authored assistant/model output, NOT a blinded second independent LLM run, not a generator benchmark and not proof of universal AI-first site compatibility. A separate manually supplied editable-intent ledger was used; synchronized omissions in both source and ledger could still escape detection. Original HTML IDs are not automatically trustworthy stable CMS identifiers.

## 2. Concrete preflight evidence

Parse5 extracts 17 HTML IDs and finds 9 leaf text elements without their own IDs. Styles/behaviors include CSS custom properties, gradients, clamp, grid, keyframes, two media queries, CSS filter, inline JS, SVG, form, dialog and details. The existing restrictive annotated-section registry **refuses** the uninstrumented full document, rather than silently claiming compatibility.

Manual external intent expects 16 properties. An initial candidate manifest declares only 12. **Four missing bindings** are detected: signup-form security.antispam, signup-email content.placeholder, skyline media.svg and document seo.description. Repairing the declarations gives 16/16 against that ledger, **but ten entries remain unsupported** by current trusted packs: link href, gradient, float animation, disclosure, form submission, dialog action, antispam, placeholder, SVG and SEO metadata. Automatic publication must remain blocked rather than executing arbitrary site JS/CSS or hiding missing controls.

15 targeted negative / migration checks pass. Compatible owner overrides survive a changed default; removed or renamed IDs, type changes, unreviewed aliases, collisions and orphan overrides are quarantined and must block publishing. This is an algorithmic experiment, not a durable production revision store.

Source checks: [independent-site-preflight.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/independent-site-preflight.cjs).

## 3. Actual Chromium source boundary

The full original site loaded in a native browser with an opaque-origin sandbox iframe (allow-scripts WITHOUT allow-same-origin), script-src none, form-action none and disabled external connections. Source JS did not execute, parent DOM access was denied; the demo dialog click did nothing, and a valid email entered in the real form did not submit to /subscribe. CSS nevertheless rendered actual grid and responsive H1 at **84px desktop (1200px)** and **48px mobile (360px)**. **Zero browser page errors.**

Test-only style-src unsafe-inline enables original style element; do not treat it as an approved production CSP or safe general-purpose CSS. Disabling scripts deliberately breaks source behaviors: this test is a boundary demonstration, not functional CMS integration. Native preview code: [independent-site-sandbox.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/independent-site-sandbox.cjs).

Earlier [diagnostic FAIL #39076877639](https://github.com/manufact-test/ai-site-cms/actions/runs/39076877639) was caused by counting a favicon HTTP request as form submission. The corrected test explicitly fills email and counts only requests to /subscribe. Full final run PASS.

## 4. Manual safe-content projection: HTML/PHP/React parity

The original site was **not converted**. An explicitly mapped content-only subset (three nodes: heading, description, CTA; four values) is rendered in HTML, PHP CLI and React static markup. Two states × three renderers = **6/6 semantic parity** (stable IDs, text and local href). XSS-like HTML strings remain text; **18 invalid-payload refusals** including unsafe href across three renderers. CSS grid/gradient, SVG, forms, dialog, scripts, SEO, motion and responsive CSS are excluded — do not claim full-site adapter parity. PHP runs on GitHub runner CLI, NOT tested on actual Hostinger. Next static/SSR were not exercised on this particular source. [Renderer code](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/independent-site-render-parity.cjs).

## 5. Architecture decision still open

A. Modular PHP API + typed fields + reviewed site adapters: content-only renderer parity and earlier publishing/editors promising; independent rich components, capabilities, server verification and source trust remain blockers.

B. Puck fields + PHP backend: powerful UI, but React/store/page-model coupling and arbitrary HTML/PHP compatibility not resolved.

C. Winter CMS + custom editor: PHP backend mechanisms, but retrofit, real hosting compatibility and source contract remain untested.

D. GrapesJS components selectively: useful UX reference but DOM-builder source-of-truth problem persists.

Possible future protocol must distinguish trusted *site build/source* from untrusted editable *data*: source/version/hash provenance; stable IDs and approved versioned aliases; independent property/behavior/SEO/media expectation coverage; reviewed typed extensions, allowlisted URLs and CSS targets; server-side revalidation; CSP/iframe and authorization; atomic staged migrations and rollback. Unknown capabilities must produce blocking coverage reports, not execute arbitrary plugin code.

**Next Stage 1 gates:** truly blinded other-model site+manifest run with independently derived intent scoring; reviewed versioned extensions for href/dialog/form/gradient/media and CSS safety; multi-renderer parity for rich components and source updates/rollback; read-only real shared PHP Hostinger check only if authorized. No technology selection without owner approval, no Stage 2, no production changes, no CELIKOM.

**Fixed product status:** Stage 0 accepted, Stage 1 in_progress NOT accepted, Stage 2 not_started, technology unselected. 193 requirements (135 mandatory / 42 desirable / 16 unwanted), research/documentary evidence matrix 43 limited signals + 92 gaps, **0/135 product accepted**. Full first release requires all 135, no reduced MVP.
