# SEO worker — next-chat handoff, 31 October 2026

## Newest 31 October continuation — optional international hreflang HTML/DOM QA

Verified live SEO branch HEAD `c256ed48bc69660b004ed06147f0da18356fa0c3` before starting this last independent functional pass. After studying existing core modules, added [HREFLANG-PUBLIC-RENDERED-QA.md](HREFLANG-PUBLIC-RENDERED-QA.md) and `lib/seo-hreflang-qa.cjs`, **integrated into the same private Crawl/SEO Operator Workspace** (no new dashboard/CLI/report file). Original already-approved same-session `crawl.publicCapture` now reviews HTML-head `hreflang` declarations; optional source-paired `crawl.renderedCapture` compares true rendered DOM, not legacy static HTML. Route reciprocity, duplicate/conflicting locale mappings, self-reference, canonical/noindex target intentions and unknown/partial sources become P1/P2 manual findings only. Monolingual absence is not a problem; cross-domain alternates are allowed but not independently verified or copied. HTTP Link header and sitemap variants are outside this HTML-only analyzer. Nothing asserts Google international targeting, real client source/revision, translation facts or release authority.

**Actually run:** `seo-hreflang-smoke.cjs`, `seo-structured-data-smoke.cjs`, `seo-rendered-content-smoke.cjs`, `seo-workspace-crawl-smoke.cjs`, `seo-operator-workspace-smoke.cjs`, `seo-first-client-coverage-smoke.cjs` — six real Node smoke programs on a full checkout, all PASS using synthetic/mock evidence. No GitHub Actions, live Chromium/browser, public client host or Google property was used. The sole main integrator still owns any merging, publishing and client acceptance. Next-chat first message is prepared in [SEO-WORKER-FIRST-MESSAGE-2026-10-31.md](SEO-WORKER-FIRST-MESSAGE-2026-10-31.md). **Read the live new GitHub branch HEAD again**; this file necessarily cannot contain its own eventual commit SHA.

## Newest continuation — integrated approved-route pilot evidence coverage

At start, verified GitHub `feature/site-seo-engine` HEAD `e9cf8c330c1a77b571fa15279df22b8efb498364`, unchanged from prior successful independent CrUX pass. New [FIRST-CLIENT-ROUTE-COVERAGE-QA.md](FIRST-CLIENT-ROUTE-COVERAGE-QA.md) integrates source-bound per-page coverage **inside existing Crawl HTML/Markdown**: approved Blueprint route, selected Site v1 match/drift, inspectable public HTTPS/JSON-LD, desktop/tablet/mobile source-paired DOM, optional exact-URL historical CrUX, overlapping P0/P1 signals and fixed manual source-acquisition steps. Original CrUX origin aggregates never fill a specific URL; missing post-launch CrUX is not a pre-launch blocker. Pure derived numbers and approved routes only; no client HTML copied, no new dashboards/files/gates/CMS/deploy/GO. Real host/current customer revision and Google account authenticity remain absent. Run only focused real Node smoke (new `tests/seo-first-client-coverage-smoke.cjs` plus adjacent operator/crawl/CrUX tests); update the final run status and obtain **new GitHub SHA** from branch, not this note. The main developer is still the sole integrator.

The matrix also lists optional, *manual* `--page-ids` batches of at most eight for routes with selected Site v1 and inspectable public HTTP but without all three DOM pairs, using the existing Chromium CLI; missing HTTP never becomes a recapture suggestion. **Actually executed real Node** on this checkout: one six-test focused suite (`seo-first-client-coverage-smoke`, `seo-workspace-crawl-smoke`, `seo-operator-workspace-smoke`, `seo-field-performance-smoke`, `seo-rendered-content-smoke`, `seo-structured-data-smoke`) all passed after fixing a legacy synthetic empty-policy case. The focused new test passed again after adding batch-suggestion coverage. No live Chromium, real customer HTTPS, GitHub Actions or deployment was run.

## Newest continuation — historical real-user CrUX field-performance QA

After verified remote SEO HEAD `b21eca8bbd0c37411e65517eeae5076884b48ac2`, the independent worker built [FIELD-PERFORMANCE-CRUX-QA.md](FIELD-PERFORMANCE-CRUX-QA.md). It extends only the **existing** private SEO Operator Workspace with optional `crawl.crux` operator-exported CrUX JSON (one raw response or array). Exact Blueprint page or matching origin, form factor, 28-day collection window, LCP/INP/CLS P75 ranges, missing-page/metric coverage and stale dates are checked; unknown evidence is never a pass. Output uses the existing Crawl page links, byte-integrity manifest and the existing post-launch human Search Performance gate. There is no Google key or request, CMS edit, new dashboard, publishing, PR or merge. The focused offline Node test `tests/seo-field-performance-smoke.cjs` covers local CLI and private report; see final handoff for exact checks and new **GitHub** SHA after upload. Current release/customer/Google property identity remains unauthenticated. The lead integrator must source actual customer evidence outside Git before field SEO signoff.

Actually executed on full checkout (real Node, all successful): `tests/seo-field-performance-smoke.cjs`, `tests/seo-workspace-crawl-smoke.cjs`, `tests/seo-operator-workspace-smoke.cjs`, `tests/seo-lead-readiness-smoke.cjs`, `tests/seo-rendered-content-smoke.cjs`, `tests/seo-structured-data-smoke.cjs`. The focused CrUX test was rerun successfully after adding exact-threshold and manifest-tampering assertions. These are synthetic/offline checks, **not** actual Google API, site deployment, GitHub Actions, authorized customer evidence or integration on the lead's branch. Do not run a live customer pilot without the lead's owner-approved host and source.

## Newest continuation — responsive/content/navigation/performance pilot QA

At start of this worker pass, the live SEO branch was verified at `d959a06281f5b2a79b8658f1e4056574c9b43b6c`; before acting next time **fetch the live branch HEAD again**. The new commit produced by this pass will have a different GitHub SHA and must be verified after upload.

Read [RENDERED-FIRST-CLIENT-UX-QA.md](RENDERED-FIRST-CLIENT-UX-QA.md) first. This substantial pass extends the **same** safe, operator-approved Chromium capture, source-pinned DOM v2 and existing one private rendered-content report/SEO Operator Workspace. New bounded, double-sampled, optional v2 observations: responsive/mobile overflow/viewport/interactive controls, isolated navigation/FCP/resource timing, and visible main-text footprint without exporting words. Existing HTTP/DOM reconciliation also now checks Blueprint-approved rel=nofollow/ugc/sponsored links, JS-created noncrawlable anchors and same-device `#fragment` targets, with partial/unknown evidence never misrepresented as broken. Source-bound empty main text/mobile loss P1/P2 and coverage counters enter existing human lead readiness; **no automatic release, Google field Core Web Vitals, client claim, new dashboard or CMS edits**.

New test programs: `tests/seo-browser-responsive-observation-smoke.cjs`, `tests/seo-browser-timing-observation-smoke.cjs`, `tests/seo-browser-text-footprint-smoke.cjs`, `tests/seo-rendered-links-fragments-smoke.cjs`. Expanded `tests/seo-rendered-capture-smoke.cjs` and `tests/seo-rendered-content-smoke.cjs` cover source matching, legacy v2, P1/P2 findings, real Node private Workspace and release gate. The existing `seo-workspace-crawl-smoke.cjs` caught an HTML safety-banner mismatch, now repaired without changing the private proposal workflow. Record final actual runs precisely in current handoff. They use offline mocked Chromium, **not** a customer-site browser or Google environment.

There is no approved real client host/current release/user facts in SEO worker context. The sole lead integrator must arrange first authorized same-release Blueprint/Site v1/public-HTTPS/Chromium SEO run, inspect P0/P1 and unknown coverage, correlate real client acceptance, run independent performance tools where permitted, and merge/ship at their own discretion. Worker owns only `stage3/seo-engine/**`, never PR, merge, deploy, main or lead branch.

## Newest 31 October continuation — rendered JSON-LD semantic QA

The live SEO branch was verified at baseline `f16b782c8ccd6ec47bb16c46f4dcedc32c3f51f3` before this pass. **Fetch live HEAD again after this handoff**; new commit SHA must be obtained from GitHub, not guessed from this document.

The existing `lib/seo-structured-data-audit.cjs` now provides in-memory, bounded `compareRenderedSemantics` over original HTTPS HTML and the existing desktop/tablet/mobile rendered DOM. The original `lib/seo-rendered-content-audit.cjs` and `lib/seo-rendered-content-view.cjs` use it to detect price/rating/review and other owner-sensitive JSON-LD claim mutations even with unchanged root type, unconfirmed/unapproved entity injections, unsafe entity URLs, invalid breadcrumbs/context, and incomplete evidence. Existing private Workspace/readiness receives P0/P1/P2 without new config or dashboard. No client values or even claim-value hashes enter reports. Read [RENDERED-STRUCTURED-DATA-QA.md](RENDERED-STRUCTURED-DATA-QA.md) for implementation and pilot use.

A real checkout was available and the worker ran the five focused **real Node** smoke programs: `seo-browser-image-observation-smoke.cjs`, `seo-css-visibility-smoke.cjs`, `seo-rendered-capture-smoke.cjs`, `seo-rendered-content-smoke.cjs`, `seo-structured-data-smoke.cjs` — all passed before changes; the expanded rendered-content smoke also passed after implementation. These tests use synthetic sources and mocked Chromium; **no real Chromium launch, GitHub Actions or client-site test** is implied. Main lead stays sole integrator; only `stage3/seo-engine/**` changed.

**Highest next priority:** the lead/operator-approved real customer pilot with matched Blueprint, Site v1, original HTTPS capture, Chromium on all three viewports, schema/crawl/readiness evidence and owner confirmation. When no approved live host/source is available, avoid inventing facts or a second dashboard. Only add another missing diagnostic if it is genuinely material; focus on integration, real evidence and resolution of actual findings.

## Ownership and canonical branch

- Product: **MANUFACT AI Site CMS — SEO Intelligence & Blueprint Engine**.
- GitHub: `manufact-test/ai-site-cms`.
- Independent SEO branch: **`feature/site-seo-engine`**. Last verified pre-handoff baseline: `d8b0cbad8252df1f6b02ec721fd16695725bcc13`; **always fetch the live branch HEAD**, because this note is committed with the final small follow-up.
- **Only write under `stage3/seo-engine/**`**. No CMS, Studio, SDK, PHP, CI, `main`, or `feature/stage3-ai-site-contract` changes.
- Main developer in `feature/stage3-ai-site-contract` is the **sole integrator**. No PR, merge, publish or deploy by SEO worker. Never build reusable finished client websites or design-template libraries.
- Work in substantial functional passes; avoid new admin panels, duplicating existing modules, repeated irrelevant tests, or invented customer/Google facts.

## Read these files, in order

1. `stage3/seo-engine/SEO-WORKER-NEXT-CHAT-2026-10-31.md` — this handoff.
2. `stage3/seo-engine/SEO-WORKER-HANDOFF-2026-10-30.md`.
3. `stage3/seo-engine/SEO-WORKER-TRANSFER-2026-10-30.md`.
4. `stage3/seo-engine/INTEGRATION-HANDOFF.md`.
5. `stage3/seo-engine/README.md`.
6. `stage3/seo-engine/RENDERED-CAPTURE-PILOT.md`.
7. `stage3/seo-engine/RENDERED-CONTENT-QA.md`.
8. `stage3/seo-engine/RENDERED-VISIBILITY-QA.md`.
9. `stage3/seo-engine/RENDERED-IMAGE-LOADING-QA.md`.
10. `stage3/seo-engine/STRUCTURED-DATA-QA.md`.

The long README/transfer docs contain earlier feature history; the **newest entries at top** supersede older next-step language.

## What the SEO subsystem already does

Blueprint contract and SEO architecture; content and internal-link analysis; Search Console performance; URL indexing and crawl policy; robots/sitemap evaluation; CMS SEO task lifecycle and two-step fix verification; public HTTPS capture and post-publication reconciliation; public static metadata analysis; structured-data/JSON-LD semantic QA; one SEO Operator Workspace; First-Site Lead Readiness; private lead-packet integrity; HTTP-to-rendered DOM reconciliation; safe opt-in Chromium viewport capture; source-bound computed CSS visibility for headings/main/CTA/nav; and source-bound browser image loading QA.

**Do not rebuild these**; read the modules and extend only a material missing first-client capability.

## Most recent functionality

### Previous full pass: browser image loading and first-viewport QA

`d8b0cbad8252df1f6b02ec721fd16695725bcc13`:

- `lib/seo-browser-image-observation.cjs`: max-1,000-image, 13-counter, read-only `img` sampler, no captured image URLs/alt values. Counts visible failed/pending, above-fold lazy, large hero candidates, missing alt/dimensions, upscaling.
- `lib/seo-rendered-capture.cjs`: same existing authorized browser and origin/mount/network limits. Samples image status twice 250 ms apart. Unstable status is **unknown**, never a pass; DOM changes invalidate CSS/image observations.
- `schemas/viewport-capture-v2.schema.json`: backward-compatible optional `media` with exact rendered DOM SHA; old v1/v2 without it remains valid but image evidence unknown.
- `lib/seo-rendered-content-audit.cjs` and `lib/seo-rendered-content-view.cjs`: image QA P1/P2 and one private report/Workspace.
- Focused `tests/seo-browser-image-observation-smoke.cjs` and expanded `tests/seo-rendered-capture-smoke.cjs`; `RENDERED-IMAGE-LOADING-QA.md` documents limitations.

### Final small follow-up before handoff

- Fixed **large above-fold candidate selection to use the visible viewport-intersection area**, not the entire element bounding box. A 1–4 px stripe of an otherwise giant offscreen image no longer becomes a false large first-screen hero.
- Added synthetic regression with a huge image barely peeking into the viewport; true failed hero remains correctly classified.
- Updated operator guidance and handoff. All changes remain under SEO subtree.

## Validation honesty

The previous pass verified JavaScript parsing, JSON syntax/schema structure, a synthetic V8 browser image sample and matching SHA envelope; it did **not** run full Node checkout tests, genuine Chromium, GitHub Actions, or a customer website. This follow-up also runs only recorded checks. Do not promote either claim into “full tests passed.” `node --check`/focused Node tests require a repository checkout with required modules. Recommended focused commands:

```bash
node stage3/seo-engine/tests/seo-browser-image-observation-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-capture-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-content-smoke.cjs
node stage3/seo-engine/tests/seo-css-visibility-smoke.cjs
node stage3/seo-engine/tests/seo-structured-data-smoke.cjs
```

The exact first-customer site, approved revision, HTTPS mount, client facts and actual Google data have not been supplied/verified. Chromium capture may run **only after explicit lead/operator approval** of a public client host and only under the existing safety gates. Source hash matching is not host attestation or real Google rendering proof.

## Highest-value next direction

Primary business objective: **first full, genuine client SEO pilot**. Coordinate via docs with sole lead integrator; first execute **one focused Node/CI regression** on a real checkout when available, then verify complete approved Blueprint/Site/HTTP/CSS/image/JSON-LD evidence and readiness blockers without fabricating missing sources. If the lead has no approved site yet, select **one materially useful, missing SEO diagnostic** from existing audit gap, implement it in this subtree and integrate into the existing Workspace; do not add another dashboard or generic template set.

Work quickly in larger passes, preserving branch boundaries, source evidence limits, and truthful validation status. Save commits in the SEO branch, update this handoff, state exact SHA and changed-file list. Never PR/merge/deploy.
