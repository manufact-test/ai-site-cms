# MANUFACT SEO — Rendered Content / HTTP-to-DOM reconciliation

Independent SEO worker · 2026-10-30 · branch `feature/site-seo-engine` · strictly `stage3/seo-engine/**`.

> **2026-10-30 v2 update:** Manual viewport v1 evidence remains supported, and the new opt-in Chromium `bin/capture-rendered-public.cjs` can create `manufact-seo-viewport-evidence-v2`. For full prerequisites, operator consent, pinned main-response HTML checks, per-device request budgets and restrictions, see [RENDERED-CAPTURE-PILOT.md](RENDERED-CAPTURE-PILOT.md). The report now includes v2 source-body-match/drift, browser block, JavaScript error and DOM-stability counts. No automatic release GO.

## Practical pilot gap

Existing tools inspect original public HTTPS HTML, separate three-viewport markup, and semantic JSON-LD. None compares the **same page** across HTTP source, JavaScript-rendered desktop/tablet/mobile DOM and the approved Blueprint. This feature links those existing contracts: no website template, new CMS, browser robot, deployment, or second dashboard.

- `lib/seo-rendered-content-audit.cjs` — read-only source-pair diagnostic core.
- `lib/seo-rendered-content-view.cjs` — private, escaped, no-script HTML and Markdown.
- `bin/review-rendered-content.cjs` — private, atomic/no-overwrite source-hashed output.
- `tests/seo-rendered-content-smoke.cjs` — committed focused Node integration test.
- Existing **one** SEO Operator Workspace optionally accepts `crawl.renderedCapture` and saves `rendered-content.html`, `.md`, `.json` with hashes in the existing `LEAD-PACKET-INTEGRITY.json`.
- Existing Lead Readiness now has a **13th** gate `rendered-seo-content-parity`; never automatic GO.

## Four original private inputs

Original files stay OUTSIDE the repository checkout:

1. `--blueprint` — compiled and approved `manufact-seo-blueprint-v1`.
2. `--site` — current selected owner `manufact-ai-site-v1` with the approved page IDs/routes.
3. `--public-http` — original `manufact-seo-delivery-evidence-v1` (ideally produced by existing `capture-public-https.cjs`); exact HTTPS host AND mount.
4. `--viewports` — original `manufact-seo-viewport-evidence-v1`, where every supplied page has desktop/tablet/mobile `captures` of `{ "method": "rendered-dom", "html": "<html>...</html>" }`, from full-document serialized DOM at that device viewport. Not an image, fragment, guessed browser pass or server snapshot. Legacy `static-html` is accepted as a source but never counted as a rendered comparison.

Original input file **bytes** are SHA256 pinned and rechecked before output rename. All sources must concern the same owner-selected deployed revision; the lead must independently establish this. The existing viewport v1 contract has no trustworthy URL/time stamp; matching IDs and routes alone is **not** proof of a shared build or real browser provenance.

### Standalone offline command

```bash
node stage3/seo-engine/bin/review-rendered-content.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --site /ABS/private/selected-owner-site.json \
  --public-http /ABS/private/public-https.json \
  --viewports /ABS/private/rendered-viewport-capture.json \
  --origin https://actual.example/optional-mount/ \
  --out /ABS/private/NEW-RENDERED-SEO-REPORT
```

`--origin` is optional, but must match the exact original HTTPS mount when passed. No HTTP request or browser launch occurs. Parent of output must exist, destination cannot already exist, and output and source files are outside Git. Outputs: `rendered-content.html`, `rendered-content.md`, `rendered-content.json`, `PRIVATE-SOURCE-MANIFEST.json`, `PRIVATE-README.txt`. No customer HTML is copied into reports.

### Existing private Workspace

Add one optional property inside existing `crawl` config. The example is an **excerpt** of `manufact-seo-operator-workspace-config-v1`:

```json
{
  "format": "manufact-seo-operator-workspace-config-v1",
  "crawl": {
    "policy": "/ABS/private/crawl-policy.json",
    "cmsBlueprint": "/ABS/private/approved-blueprint.json",
    "cmsSite": "/ABS/private/selected-site.json",
    "publicCapture": "/ABS/private/public-https.json",
    "renderedCapture": "/ABS/private/rendered-viewport-capture.json"
  }
}
```

Run existing `bin/build-seo-operator-workspace.cjs --config ... --out ...`. A single link appears in the existing crawl/operator workspace. All three new outputs are pinned in the existing private integrity receipt. Rendered capture without public HTTP + original Blueprint/Site v1, mismatched mount, changed files and unknown page IDs fail closed.

## What is investigated per approved page/device

Only an exact-shaped 2xx HTTPS response, matching approved request+response path, bounded HTML head, current Site v1 route and non-conflicting optional root recheck is comparable. Missing HTTP, mixed capture, non-2xx, absent source or missing rendered method means **uninspected**, never 'clean'.

- HTTP and DOM canonical link count and target vs approved Blueprint; post-render canonical mutation is P0.
- HTTP and DOM meta robots noindex vs Blueprint; post-render noindex mutation is P0. HTTP `X-Robots-Tag` is separately checked by existing delivery tooling.
- Exactly one DOM H1; H1 disappearance after render, H1 only appearing after JavaScript, Blueprint H1 editorial differences (output only approved section ID), missing approved section headings.
- Presence of a primary main landmark and its disappearance after render; approved internal navigation and CTA destinations in the rendered anchors. Only known same-mount approved page paths; raw link text is never exported.
- Page-level JSON-LD type removal/injection, invalid JSON-LD, and increased count of unlabelled form controls as static indicators. Existing Structured Data QA remains the authority for owner fact eligibility, BreadcrumbList, offers/reviews/price and semantic checks.

Reports include priority-coded manual investigations, approved stable page/section/target IDs, approved route paths, counts and SHA256. No customer heading text, body, JSON-LD, private values or research sources are copied. HTML is escaped with restrictive CSP, no scripts or external resources.

## Limitations and manual steps

`SOURCE-PAIR-OBSERVED` means the operator supplied two comparable artifacts. This is **not** a browser attestation. HTML-string inspection cannot establish CSS visibility, computed accessible names, lazy loading, runtime errors, tap targets, visual parity, form delivery, real Google rendering or indexing. `sourceOriginAuthenticated`, `browserCaptureAuthenticated`, `sameReleaseRevisionProven`, `googleRenderingVerified`, `visualAccessibilityVerified`, `ownerApprovalAuthenticated` and `releaseAuthorized` are always false.

The lead must:

1. Correlate real HTTPS/DOM captures to **the exact same** published customer revision, domain and mount.
2. Resolve P0 canonical/noindex and inspect P1 disappearing H1/main/CTA across real devices.
3. Confirm intended copy changes and JSON-LD owner facts separately; assess visual accessibility and actual client experience.
4. Review publisher version, real Google Search Console when relevant, explicit client approval, forms and rollback.

The new Lead Readiness gate is BLOCKED on any P0, NEEDS-EVIDENCE for absent or incomplete matched captures, and LEAD-REVIEW-REQUIRED otherwise. It never authorizes release.

## Focused checkout verification

```bash
node stage3/seo-engine/tests/seo-rendered-content-smoke.cjs
node stage3/seo-engine/tests/seo-structured-data-smoke.cjs
node stage3/seo-engine/tests/seo-lead-readiness-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
```

The new Node smoke uses only synthetic sources for clean pairs, bad canonical/noindex, lost H1 and routes, unavailable/static views, wrong mount/site, private CLI, integrated workspace and unsigned packet integrity. **Running an isolated in-memory Node smoke does NOT mean the full checkout or GitHub Actions passed.** Lead developer alone integrates and runs full regression.
