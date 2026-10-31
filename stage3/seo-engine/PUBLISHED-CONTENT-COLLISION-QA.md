# First-client SEO — published cross-route content collision QA

**31 October 2026 · independent SEO worker · `feature/site-seo-engine` · `stage3/seo-engine/**` only.**

## Missing live-site diagnostic

Blueprint planning and static HTML analysis already check intended duplicate titles and authored copy. But real CMS output and JavaScript can unexpectedly publish the **same SEO title, meta description or substantive main content on different indexable canonical routes**. Until now, the first-client HTTP-to-browser SEO report did not compare those *published* pages to each other across devices.

This feature extends the existing `lib/seo-rendered-content-audit.cjs` using `lib/seo-published-content-collision.cjs`. It reuses the same original approved Blueprint + Site v1 + exact public HTTPS + source-paired desktop/tablet/mobile DOM and writes **only to the existing private rendered-content report and Crawl/Operator Workspace**. There is no new CLI, dashboard, network request, new data source, CMS change, website template, release decision or automatic correction.

## What is compared

- Only distinct Blueprint routes intended as **indexable and self-canonical** are eligible. A source must contain inspectable `<head>`, one matching self-canonical URL and no observed `noindex`. Invalid/missing canonical or missing/partial HTTP/DOM evidence is **unknown** for that scope.
- Normalize NFKC case and whitespace for actual **served SEO `<title>` and meta description**, comparing exact equality across eligible route pairs. Empty values are not duplicates; separate existing checks cover missing metadata.
- Separately compare normalized actual `<main>` text **in memory**, conservatively requiring at least 260 characters and 45 words to avoid calling short boilerplate a substantive duplication. Script/style/template, nav, forms, header and footer markup is discarded. This is *structural HTML text*, not measured CSS-visible content or an assertion of semantic similarity.
- Each route pair is observed in four distinct scopes: approved original HTTP HTML, desktop DOM, tablet DOM, mobile DOM. Existing source-pair validation is reused; Chromium v2 with mismatched HTML, unstable DOM, blocked requests or script errors cannot support a strong duplicate conclusion. The old `static-html` method is also unknown.
- **P1 manual review** requires all four usable scopes: identical substantive main text on both routes **or** the same nonempty title **and** meta description. **P2** flags provisional collisions when only source/some devices agree, single-field title/description coincidence, or a collision introduced only after browser rendering. A genuine authored repeated title or shared content may be intentional; this is never an automatic SEO defect or release rejection.

The private report contains only approved page IDs, approved route paths, fixed finding codes, source coverage and numeric counts. **No normalized customer text, excerpts, content fingerprints, literal metadata, body copy, arbitrary URLs or customer facts are saved in findings or report files.** The module holds comparison strings only transiently in memory. The existing `LEAD-PACKET-INTEGRITY.json` protects the unchanged report files; no client source is committed to Git.

For many routes with one shared fallback title, the analyzer counts **all** colliding route pairs but emits a bounded representative subset of manual pair findings that still marks every implicated approved route (at most one new not-yet-covered endpoint per finding code). This avoids flooding the operator queue with thousands of equivalent pair tickets; the owner inspects the real sources to identify the complete collision group.

## Existing first-client workflow

1. Lead collects owner-approved exact Blueprint + Site v1, approved current public HTTPS transcript, and explicit permission for same-release Chromium capture. Keep original HTML and DOM off GitHub.
2. Use existing `capture-rendered-public.cjs` (all routes and devices for maximal coverage) and `review-rendered-content.cjs` or the current `build-seo-operator-workspace.cjs` with `crawl.publicCapture` + `crawl.renderedCapture`.
3. In **existing** `rendered-content.html/.md/.json` see “Published route content collisions” coverage, P1 corroborated duplicate route pairs and P2 source/device disagreements. Only new `rendered:published-*` findings enter the existing compact Crawl manual queue; the existing route evidence matrix / lead readiness consume the standard findings.
4. Operator/owner reviews the actual approved texts, intent, canonical/indexability, menu states and real desktop/mobile content, documents whether differentiation is needed, and approves any later changes. Recapture the same verified release after owner-approved changes.

## Evidence limits

Even fully repeated content across four supplied artifacts **does not authenticate the site revision, prove Google classified the site as duplicate, predict ranking, establish accessibility, measure CSS visibility or authorize publication**. HTML string extraction can omit nested/complex semantics; short or near-duplicate copy is intentionally *not* diagnosed. Partial captures are not silently promoted to P1. The sole CMS lead owns the authorized client pilot, actual fact review, rollback and release decisions.

## Focused Node regression

```bash
node stage3/seo-engine/tests/seo-rendered-content-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-capture-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/seo-first-client-coverage-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
```

The extended rendered-content smoke includes unique published metadata, corroborated cross-route SEO metadata and substantial main duplicates, DOM-only collision, partial scope downgrade to P2, original-text redaction and standard private Workspace/manual queue propagation. The tests use **synthetic HTML and fake viewports**, never an authorized customer or real browser.
