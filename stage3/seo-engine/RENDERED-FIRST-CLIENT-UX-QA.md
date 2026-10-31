# First-client browser SEO QA — responsive layout, text, links and timing

**31 October 2026 · Independent SEO worker · `feature/site-seo-engine` · all edits within `stage3/seo-engine/**`.**

## Purpose

The existing source-bound SEO process already checks HTTPS and crawl policies, canonical/robots, JSON-LD, H1/main presence, computed CSS visibility and loaded images. A real site can nevertheless look structurally valid while suffering mobile horizontal overflow, a fixed-width viewport, unusable tiny controls, a mostly blank mobile main, JavaScript-injected `nofollow` on approved internal links, dead `#fragment` navigation, or extremely slow browser response/first paint.

This extension adds **read-only diagnostic evidence inside the existing Chromium capture and the one existing rendered-content SEO report / Operator Workspace**. It does not add a new dashboard, crawl service, Google integration, site template, CMS change, deployment, or automatic release gate. Nothing authorizes publishing or proves that Google indexed the page.

## Components and contracts

| Existing pipeline step | New bounded capability |
|---|---|
| `lib/seo-rendered-capture.cjs` | Runs three additional double-sampled, same-page `page.evaluate` probes after the existing CSS/image probes; invalidates all earlier observations if the serialized DOM changes later |
| `lib/seo-browser-responsive-observation.cjs` | Viewport meta (device-width, duplicates, fixed numeric width, zoom restriction), document horizontal overflow, clipped headings/content, small/unnamed controls, very small text and large fixed overlay candidates |
| `lib/seo-browser-timing-observation.cjs` | Navigation response start/end, DOMContentLoaded, load, optional First Contentful Paint entry, bounded resource count and transfer bytes; **no** URLs or field Web Vitals |
| `lib/seo-browser-text-footprint.cjs` | Counts main landmark raw versus browser-rendered text characters, visible paragraph/list blocks and hidden blocks; no client words or snippets leave the browser |
| `lib/seo-rendered-link-semantics.cjs` | Compares original HTTP anchors and rendered DOM anchors against the current Blueprint's **approved routes**: rel=nofollow/ugc/sponsored, query-only route links, new placeholder/JavaScript/data links, HTTP and off-mount links |
| `lib/seo-rendered-fragment-audit.cjs` | After complete per-device source checks, resolves approved internal `#fragment` links against the **same-device target DOM IDs**; missing or incomplete target evidence is unknown, never assumed broken |
| `schemas/viewport-capture-v2.schema.json` | Adds backward-compatible optional `responsive`, `timing`, `textFootprint`, each either `observed` + exact DOM SHA256 and strict numeric counters or `unavailable` + allowlisted reason |
| Existing rendered-content audit/view | Priority-coded manual investigations, per-device evidence coverage, safe aggregate counts and links to the same private HTML/Markdown/JSON Workspace reports |
| Existing lead readiness | Same 13th human gate `rendered-seo-content-parity`; description and manual next steps now mention responsive, text, fragments and isolated timings; no new auto-GO logic |

Legacy v1 supplied rendered DOM can use the new anchor and fragment comparisons after existing source checks. Old v2 without the three optional browser observation fields remains accepted; its missing evidence shows **unknown/not supplied**, never a pass.

## Findings and human priority

| Area | New finding suffixes (all prefixed `rendered:`) | Priority |
|---|---|---|
| Viewport | `viewport-meta-missing`, `viewport-fixed-width` | P1 on tablet/mobile |
| Viewport/layout | `viewport-device-width-unknown`, `viewport-meta-duplicate`, `viewport-zoom-restricted`, `prominent-content-clipped` | P2 |
| Overflow | `page-horizontal-overflow` | P1 if above 24 CSS px on mobile or 64 px otherwise; P2 for smaller positive deltas |
| Interactivity | `tiny-interactive-targets`, `interactive-names-missing`, `tiny-reading-text`, `large-fixed-overlay-candidates` | P2 heuristic |
| Browser evidence | `responsive-layout-unavailable`, `browser-timing-unavailable`, `main-text-footprint-unavailable` | P2 unknown/manual |
| Navigation timing | `slow-browser-response-candidate` (>1800 ms responseStart), `slow-browser-paint-candidate` (>3000 ms FCP), `slow-browser-load-candidate` (>8000 ms load), `many-browser-resources` (>100 entries), `first-contentful-paint-unknown` | P2 hints, **not** Core Web Vitals |
| Substantive text | `visible-main-text-empty` | P1 if main exists but browser-visible text is zero |
| Substantive text | `main-text-mostly-not-rendered`, `all-body-text-blocks-hidden`, `main-text-mobile-loss-candidate` | P2; last compares mobile with desktop only if desktop has ≥200 visible chars and mobile has under 40% |
| Approved internal links | `approved-link-rel-restricted`, `link-semantics-unavailable` | P1 manual crawlability check |
| Link changes | `approved-link-mixed-rel`, `approved-links-query-only`, `noncrawlable-anchors-increased`, `external-or-offmount-links-increased` | P2 |
| Fragment targets | `fragment-target-missing`, `fragment-target-unverified`, `fragment-navigation-unavailable` | P2; unmatched/partial target is explicitly unknown |

The counters do **not** enforce Google ranking thresholds. Inline text links can be smaller than 44 CSS px, some sliders deliberately overflow, a fixed overlay can be an approved consent dialog, content can be intentionally different on mobile, and `rel=sponsored/ugc` can be editorially correct. These are investigation prompts for the owner, designer, SEO and lead developer, not automatic defect diagnoses or CMS edits.

## Safety and evidence boundaries

- The original browser safety gates are unchanged: explicit real public-host approval, HTTPS/same origin/mount, pinned public IPv4, sandboxed ephemeral Chromium, bounded GET/HEAD, no POST, third-party and WebSocket restrictions, request limit and no deployment.
- New samplers are bounded by element/resource counts and emit only numeric counters, timestamps, allowlisted reasons and the exact DOM SHA256. They do not expose arbitrary selectors, resource names/URLs, response bodies, anchor labels/hrefs, text content, fragment IDs, private prices or screenshots. The temporary raw `innerText` used for character counts is not returned.
- Every optional observed v2 envelope is checked against the current exact captured DOM SHA. If a sample changes across 250-ms observations, its state is `unavailable`; if the DOM changes, the capture is unsettled and *all* earlier CSS/image/responsive/timing measurements are invalidated.
- Internal links are checked only against Blueprint-approved paths. Source/DOM link analyses do not make network requests or clicks. Fragment checks require a trusted same-device target pair: missing pages, partial pilots, browser response drift and unsettled DOM are unknown.
- Performance timings are from one isolated, restricted browser session, often with blocked third-party resources. FCP is nullable, resource transfer bytes can be zero due cache/timing restrictions. They are **not** LCP, CLS, INP, Search Console, CrUX, Lighthouse scores or field Core Web Vitals.
- Neither the source hash, browser capture, current owner approval, published CMS revision nor Google indexing is independently attested by this worker. All real client sources remain outside Git. No automatic fix, client-site design library, PR, merge, publish or deploy.

## First approved customer flow (unchanged tools)

1. Lead obtains matching owner-approved Blueprint v1, Site v1, original public HTTPS evidence for the **same published release**, approved mount and permission to run a public Chromium GET-only observation. Keep those originals outside Git.
2. Run the existing `capture-rendered-public.cjs --mode preflight` with real original inputs and approved `--origin`; it checks inputs and local browser availability without network, launch or output writes.
3. After explicit authorization, run the same CLI in capture mode (optionally `--page-ids` for 1–8 approved pages). Original v2 DOM HTML is saved only in the private capture directory.
4. Run existing `review-rendered-content.cjs` or pass `crawl.renderedCapture` to the same private SEO Operator Workspace. Inspect P0/P1 first, then P2 findings and unknown responsive/timing/text/fragment coverage by device.
5. Manually reproduce material mobile overflow, navigation/fragment and text-loss cases using real browsers; run independent PageSpeed Insights/Core Web Vitals only when authorized, and compare against actual customer/Google evidence rather than these synthetic hints.
6. Lead integrator correlates release/source revision, actual user experience, owner facts, browser/form acceptance and rollback. No report sets `releaseAuthorized:true`.

## Focused offline real Node checks

```bash
node stage3/seo-engine/tests/seo-browser-responsive-observation-smoke.cjs
node stage3/seo-engine/tests/seo-browser-timing-observation-smoke.cjs
node stage3/seo-engine/tests/seo-browser-text-footprint-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-links-fragments-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-capture-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-content-smoke.cjs
node stage3/seo-engine/tests/seo-lead-readiness-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
```

The added tests use synthetic content and mocked Chromium, covering source hash tampering, legacy optionality, bounded counts, missing/unknown evidence, slow timing candidates, mobile text loss, safe internal link labels, nofollow drift, partial fragment target coverage and private Workspace report redaction. The three browser samplers are additionally evaluated as serialized functions in an isolated Node `vm` context to detect accidental dependencies on Node module closures. This still does **not** test a real site, live Chromium, GitHub Actions or customer SEO signoff. See latest worker handoff for exact final executed status.

The existing crawl Workspace HTML now repeats the explicit **UNAPPROVED — NOT FOR DEPLOYMENT** banner already present in its private Markdown limitations. Its existing Node smoke caught this missing HTML wording; the emitted candidate files remain read-only drafts.
