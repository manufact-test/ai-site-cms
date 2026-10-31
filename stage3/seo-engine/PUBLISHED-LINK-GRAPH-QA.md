# First-client SEO — published internal-link reachability QA

**31 October 2026 · independent SEO worker · `feature/site-seo-engine` · `stage3/seo-engine/**` only.**

## The concrete pilot gap

The existing SEO Blueprint graph checks *planned* architecture. Existing HTTP-to-rendered DOM review checks whether particular approved CTA/navigation destinations survive JavaScript rendering, but had no site-wide answer to a critical first-client question: **can a user/crawler-like link traversal actually reach every approved canonical, indexable route from the homepage?** A valid route, XML sitemap entry and SEO metadata do not guarantee internal navigation reachability.

This adds the answer to the **same** private `rendered-content` report and SEO Operator Workspace; no new dashboard, CLI input, URL fetch, new browser session, CMS edit, website template, automatic fix or release gate.

## What is observed

- Four **separate** graph snapshots are derived from already validated original HTTP HTML and source-paired desktop, tablet and mobile `rendered-dom` evidence. Only existing Blueprint-approved exact same-origin/mount routes can be edges, including protocol-relative URLs resolving to the approved host. A trusted same-mount `<base href>` is honored; an invalid/foreign base makes that page's graph scope **unknown**, never silently resolves relative links against a guessed base. Unapproved/external/parameterized targets, JS placeholders and raw source content are never emitted.
- Only approved Blueprint routes with `seo.robots=index` and an approved **self-canonical** are eligibility targets. Noindex and alternate-canonical routes are not treated as required indexable graph destinations. These are **planned** status values; current deployed Google indexability is not asserted.
- Traversal starts at the approved `/` route. Direct incoming links are counted from *other approved indexable canonical pages*; same-page links do not count as incoming. `<a download>` and `rel=nofollow/ugc/sponsored` anchors are conservatively excluded from crawlable-edge candidates, and pages declaring `meta robots nofollow` contribute no candidate outgoing edges. These attributes are search heuristics, not absolute guarantees of Googlebot behavior.
- **Only when HTTP and all three matching rendered DOM graphs cover every approved route**, a page with no other-page incoming links in all four scopes is a P1 manual `published-indexable-page-orphaned` finding; a page in an isolated interlinked island unreachable from `/` in all four is P1 `published-indexable-page-unreachable`. The same page is not given both P1 diagnoses.
- Disagreements between complete graph sources are P2 `published-link-graph-cross-source-drift`; desktop-reachable but mobile-unreachable routes also get `published-mobile-navigation-loss` P2.
- Missing or drifted source pairs, partial pilot `--page-ids` capture, an absent/nonindexable homepage and legacy `static-html` stay **unknown**. For v2 Chromium, any observed blocked requests, page-script errors or unstable DOM also withhold that viewport from **strong graph conclusions**; denied third-party resources could be hiding navigation. A single `published-link-graph-partial` P2 tells the lead which follow-up source to obtain; it never invents a confirmed orphan.

The existing `rendered-content.json` now contains only allowed approved page IDs/routes, numeric inbound counts, Boolean reachability and source coverage per scope; the existing HTML/Markdown show source coverage, corroborated P1 counts and human investigations. The same unsigned `LEAD-PACKET-INTEGRITY.json` covers these bytes without changing the allowlist or report files. **Only the new graph-specific P1/P2 findings** enter the compact existing Crawl manual queue (avoids duplicating every old rendered-content finding); the route P0/P1 matrix and rendered SEO lead gate continue consuming the complete rendered report through their current pathways.

## Operator workflow

1. Main integrator obtains actual owner-approved Blueprint + Site v1, matching current public HTTPS capture, approval for read-only Chromium capture and the exact published revision. Keep original HTML/DOM and owner materials outside Git.
2. Use the existing `capture-rendered-public.cjs --mode preflight`, then explicitly authorized Chromium capture for **all** approved routes and three devices. A bounded subset is useful to debug individual pages but **cannot** prove absence of graph edges.
3. Run existing `review-rendered-content.cjs` or the same `build-seo-operator-workspace.cjs` with the original `crawl.publicCapture` + `crawl.renderedCapture` sources. Open `rendered-content.html` → **Published approved-route link graph** and the existing manual queue.
4. Verify P1 orphan/island routes and P2 desktop/mobile link loss in live human navigation, including menus, intentional client design and whether sitemap/other discovery paths exist. Confirm actual public release and rollback with the owner. Re-capture the same deployed revision after approved fixes.

The report never authenticates a live deployment, actual Google crawl/indexation, JavaScript menu clicks, accessibility, SERP performance, client acceptance, or release GO. A page reachable only through a sitemap may still be discovered, and restricted rel values are hints. Treat findings as **human SEO investigations**, not automatic deployment blockers.

## Focused real Node smoke

```bash
node stage3/seo-engine/tests/seo-rendered-content-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-capture-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/seo-first-client-coverage-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
node stage3/seo-engine/tests/seo-lead-readiness-smoke.cjs
```

The expanded rendered-content smoke exercises a fully linked two-route site, missing cross-route links in all four scopes, restricted-only anchors, safe same-host protocol-relative links, a foreign `<base>` that invalidates graph evidence, mobile-only navigation gap, partial DOM scope, report redaction and Workspace propagation. The mocked Chromium capture smoke additionally verifies that blocked browser resources force the graph's device scopes to **unknown** even with matched original HTML. All six commands above passed on a real Node checkout using synthetic original HTML and fake browser evidence. This was **not** a real Chromium launch, GitHub Actions run or first customer test.
