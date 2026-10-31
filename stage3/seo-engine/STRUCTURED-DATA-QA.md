> **31 October 2026 — complementary runtime semantic comparison:** the existing HTTP source Structured Data QA remains the authority for inspecting unchanged original public JSON-LD. Its bounded parser/graph helpers now also support the **existing** rendered-content audit to compare mutations from HTTP HTML to supplied desktop/tablet/mobile DOM, including changed owner-sensitive claim values inside the same type. See [RENDERED-STRUCTURED-DATA-QA.md](RENDERED-STRUCTURED-DATA-QA.md). No duplicate dashboard, client claim copying or Google guarantee.

# MANUFACT SEO — actual per-client Structured Data / JSON-LD Semantic QA

**2026-10-30 · independent SEO worker · `feature/site-seo-engine` / `stage3/seo-engine/**` only.** Main CMS/Studio/Publisher integrator remains sole developer on `feature/stage3-ai-site-contract`. There is **no** schema template library, no generic site generator, no new CMS, no public fetcher, no auto publication and no rich-result guarantee.

## Functional gap closed

Previously the real PHP/static/public comparison could prove that the same JSON-LD appears in the deployed head and official exported head (`public-static-head.cjs`). If **both** contain the same invalid or unconfirmed business claim, parity alone cannot detect the semantic/factual problem.

New `lib/seo-structured-data-audit.cjs` checks the **actual original, operator-provided public HTTP HTML** against the **same approved Blueprint `schemaCandidates` and owner fact eligibility**, canonical URL and target page route. It uses the project's existing read-only `delivery-evidence.cjs`, `blueprint.cjs` and already established `public-https-capture.cjs` workflow. There is **no invented business entity**, no auto-generated text or schema and no reuse of client-specific website templates.

Implemented source-bound checks:

- Parse `<script type="application/ld+json">` in inspected public HTML (bounded page/script/graph count, depth and size); malformed/too-large JSON-LD, no `@type`, missing/unrecognized schema.org `@context`.
- Expand `@graph`, arrays, `mainEntity` and nested breadcrumb item node types; count observed published schema types by approved page.
- Compare known material types `Organization`, `LocalBusiness`, `BreadcrumbList`, `Article`, `Product`, `Service`, `FAQPage` against **that page's approved Blueprint candidates**, and flag types relying on **unconfirmed owner facts** (P0 manual hold) versus merely absent optional *eligible* candidates (P2 human/editorial suggestion only, not an error).
- Flag potentially factual/promotional properties by **field name only** (`offers`, `price`, `review`, `aggregateRating`, `address`, `telephone`, `openingHours`, `ratingValue`, `sameAs`, etc.) for owner-backed validation. Never copy customer claims, price values, addresses or private JSON-LD bodies to report.
- Verify per-page JSON-LD WebPage/Article URLs versus approved canonical target; reject insecure/external-to-mount `@id`/`url`/`mainEntityOfPage` references. Organization’s homepage URL is **not wrongly treated as a contact-page canonical**.
- Validate `BreadcrumbList` list size, consecutive 1..N positions, last item’s approved canonical URL, foreign URLs and destinations not approved in the current Blueprint.
- Flag duplicate known schema entity types as manual identity/canonical review, not automatically invalid.
- Explicitly mark pages absent from supplied public transcript, non-2xx responses, missing head, or a `rootRecheck.matched:false` mixed deployment as **uninspected**, never positive proof.
- Source-bind to original private approved Blueprint, original Site v1, operator HTTP capture SHA256, exact siteId and optional approved HTTPS mount.

The read-only `manufact-seo-structured-data-audit-v1` report includes per-page observed types, approved type eligibility, candidate decision prompts, P0/P1/P2 manual findings, SHA256 and coverage. Safety booleans always say `releaseAuthorized:false`, `ownerApproved:false`, `publicHostAuthenticated:false`, `googleEligibilityVerified:false`. **No Google rich-result eligibility is inferred.** This is bounded source inspection, not a full Schema.org/Google validator, live URL Inspection or authenticated actual host deployment.

## Existing unified SEO Operator Workspace integration (no new config needed)

If the original private Workspace config already has:

```json
{
  "format": "manufact-seo-operator-workspace-config-v1",
  "crawl": {
    "policy": "/ABS/private/crawl-policy-report.json",
    "cmsBlueprint": "/ABS/private/approved-blueprint.json",
    "cmsSite": "/ABS/private/current-owner-site-v1.json",
    "publicCapture": "/ABS/private/public-https-evidence.json"
  }
}
```

then **the same** `build-seo-operator-workspace.cjs` also creates `structured-data.html`, `structured-data.md`, `structured-data.json`. They appear on the **existing** `index.html` and `crawl.html`; the same `LEAD-PACKET-INTEGRITY.json` checksums them. Original public page HTML stays outside Git, **not copied** into review output. The lead readiness report now has a separate owner-claim gate; P0 fact holds block, unknown pages require evidence, P1 prompts human lead review. No separate dashboard or CMS feature added.

Existing workspace command:

```bash
node stage3/seo-engine/bin/build-seo-operator-workspace.cjs \
  --config /ABS/private/seo-workspace-config.json \
  --out /ABS/private/NEW-OPERATOR-WORKSPACE
```

Only Crawl Policy and approved Blueprint with Site v1 but **without** `publicCapture` are still supported; schema report is omitted and the lead gate truthfully records missing evidence.

## Standalone private per-site CLI

Use the original read-only public HTTPS transcript as captured by existing `bin/capture-public-https.cjs` (not the derived public follow-up report):

```bash
node stage3/seo-engine/bin/review-structured-data.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --site /ABS/private/current-owner-site-v1.json \
  --public-http /ABS/private/public-https-evidence.json \
  --origin https://example.org/published/site-demo/ \
  --out /ABS/private/NEW-JSONLD-QA
```

The `--origin` option is optional but recommended for exact host/mount pinning. The CLI refuses source symlinks, oversized/unbounded input files and any original input inside Git. It writes an atomic **new** private output directory outside Git (`0600` files), never overwrites, re-hashes source files after generation, and keeps a `PRIVATE-SOURCE-MANIFEST.json` with raw SHA256 receipts. Output names are `structured-data.html`, `structured-data.md`, `structured-data.json`, `PRIVATE-SOURCE-MANIFEST.json`, `PRIVATE-README.txt`. It **never downloads, crawls, accesses a CMS API, submits a form or publishes**.

## Focused tests for the lead / next SEO worker

```bash
node stage3/seo-engine/tests/seo-structured-data-smoke.cjs
node stage3/seo-engine/tests/crawl-cms-public-followup-smoke.cjs
node stage3/seo-engine/tests/crawl-cms-workspace-smoke.cjs
node stage3/seo-engine/tests/seo-lead-readiness-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
```

The committed new focused real Node smoke uses the existing exact `industrial.blueprint.json` fixture (not a website template), synthetic public HTML and original approved Site v1, with good Organization schema, malformed JSON-LD, unsupported BreadcrumbList, invalid positions/foreign targets, owner-backed price/rating concerns, uninspected page, cross-mount mismatch, standalone atomic CLI, workspace outputs and integrity inventory. **V8 isolated source assembly and syntax checks are not equivalent to running this test under Node.** A separate lead-integrated Node checkout is required to run full smokes.

## Lead responsibilities / future work

1. The sole main developer imports only SEO-owned subtree at a convenient checkpoint, executes real Node smokes and inspects original Site v1/Blueprint/source SHA.
2. The owner approves actual factual claims, business/review/pricing/schema decisions and their source documentation. Do not auto-create JSON-LD for the client.
3. Check actual live HTTPS/current CMS source revision, published canonical, Google Search Console and Rich Results Test **separately**. Schema detection alone proves neither indexation nor eligibility.
4. Do not move private real HTML, customer facts or GSC exports to Git. The worker never deploys, creates PRs/merges or changes the lead branch.

**Important architecture rule:** this project is a CMS that produces individual client websites. There must be **no catalog/library of reusable websites**, and no generic website-template generator. SEO source evidence and linting rules are legitimate cross-site **capabilities**, never shared client content or site layouts.
