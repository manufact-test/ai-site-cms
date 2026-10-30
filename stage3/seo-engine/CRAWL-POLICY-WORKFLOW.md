## Follow-up: produce a private correction candidate

The read-only policy and regression modules above now feed into [CRAWL-REPAIR-WORKFLOW.md](CRAWL-REPAIR-WORKFLOW.md): produce a **private** candidate sitemap from indexable canonical approved Blueprint routes, and optionally add exact `Allow` suggestions only to existing unambiguous named-agent groups after explicit page selection. This adds an actual lead handoff artifact, not a publisher or an automatic repair. The owner-published Site v1 page/robots/canonical inventory must match the Blueprint; all ambiguous shared/wildcard robots groups remain manual review. See full commands, SHA256 and review limitations there.

# MANUFACT SEO — Crawl Policy Intelligence and Regression

**Owner:** independent SEO worker (`feature/site-seo-engine`, scope `stage3/seo-engine/**`). This is a substantial **offline technical SEO capability** for the lead to use during first-client and later site launches. It never changes CMS content, creates hosting rules, posts to an API, or confirms Google indexing.

## 1. What is checked

The original, validated SEO Blueprint v1 determines which page routes are planned as `index`, `noindex`, or canonical aliases. Given an exact public HTTPS base (including optional mount such as `https://site.example/published/site-id/`) and locally saved original `robots.txt` + XML `sitemap.xml`, the engine:

- Parses grouped `User-agent` and `Allow`/`Disallow` directives, supports wildcard and terminal-dollar matching, case-insensitive crawler tokens, UTF-8 paths and most-specific matching rule with Allow winning equal-precedence ties.
- Computes per-page access separately for **Googlebot**, **Bingbot** and the wildcard agent. A blocked canonical indexable page generates a human P0/P1 investigation; no automatic robots exceptions are made.
- Reads bounded XML URL sets and sitemap indexes without fetching external documents, resolving XML external entities or executing scripts. Detects unsupported/duplicated loc, invalid dates, unknown/foreign/mounted routes and sitemap entries for `noindex` or noncanonical aliases.
- In explicitly **complete** XML URL-set mode only, identifies canonical indexable pages absent from the supplied sitemap. Sample mode and parent sitemap-index mode **never** claim omitted child URLs.
- Checks `Sitemap:` pointers in supplied robots.txt for acceptable same-origin HTTPS URLs. A pointer is not evidence that the public host really serves this XML.
- Keeps original byte SHA256 for the inputs and canonical Blueprint hash; every report is private and explicitly `publicationAuthorized:false`.

**Important:** This is an interpreted policy from operator-supplied files, not an observation of actual live Googlebot, Bingbot, public CDN, Google Search Console, DNS/TLS or client approval. Also, this bounded XML parser is *not* an XML Schema validation engine.

## 2. Single-source technical review

Download actual relevant public robots.txt and sitemap XML through an authorized process and save all original files privately outside the Git checkout. Do **not** use the SEO tool to fetch URLs. Then run:

```bash
node stage3/seo-engine/bin/review-crawl-policy.cjs \
  --blueprint /ABS/private/compiled-blueprint.json \
  --robots /ABS/private/original-robots.txt \
  --sitemap /ABS/private/original-sitemap.xml \
  --base https://site.example/ \
  --out /ABS/private/NEW-crawl-policy-report
```

The `--blueprint` input can also be an original v1 SEO brief, which is compiled through the existing authoritative v1 compiler. The `--base` must be the exact canonical absolute HTTPS route prefix and end in `/`. All local input paths and the output directory path must be absolute. The output must not exist yet, and must be outside Git. Private input files are limited to 2 MB for Blueprint, 250 KB for robots.txt and 750 KB for sitemap XML.

Optional flags: `--scope sample` (instead of default `complete`) when the sitemap is not guaranteed exhaustive; `--agents Googlebot,Bingbot,*` to set 1–8 distinct crawler groups.

Open `index.html` in the newly created output folder. The private dossier includes `CRAWL-POLICY-REPORT.json`, `CRAWL-POLICY-REPORT.md`, `SOURCE-MANIFEST.json` and `PRIVATE-README.md`. There is no JavaScript or outgoing network code in the HTML. The CLI stages the entire report in a new folder, rehashes source bytes and promotes it atomically only if all original inputs remain unchanged. No partial destination folder on failure.

## 3. Catch regressions before changing robots or sitemap

Use two sets of actual or proposed policy files against **one unchanged Blueprint**, page base, agent list and declared coverage:

```bash
node stage3/seo-engine/bin/compare-crawl-policy.cjs \
  --blueprint /ABS/private/compiled-blueprint.json \
  --before-robots /ABS/private/old-robots.txt \
  --before-sitemap /ABS/private/old-sitemap.xml \
  --after-robots /ABS/private/new-robots.txt \
  --after-sitemap /ABS/private/new-sitemap.xml \
  --base https://site.example/ \
  --out /ABS/private/NEW-crawl-policy-diff
```

This produces `CRAWL-REGRESSION.json`, `CRAWL-REGRESSION.md`, a standalone responsive private `index.html`, and SHA256 source manifest. The engine highlights:

- **P0:** an approved canonical indexable URL that was allowed for Googlebot in the original source but newly blocked by the proposed policy.
- **P1:** newly blocked page for another agent or a canonical indexed route missing from a fully declared complete new sitemap.
- **P2:** access restored, editorial review of partial sitemap changes, or improvements that still need human inspection.
- Sitemap structure transitioning from URL set to index (or vice versa) is reported but **child coverage is never invented**.
- Changes to declared robots.txt sitemap pointers need independent owner/hosting review.

`P0/P1/P2` indicate risk **within the supplied policy revisions**, not authenticated production incidents. The comparison also does not replace a single-current-source review: look at new `CRAWL-POLICY-REPORT.json` for all remaining issues, even if unchanged.

## 4. Required owner/lead verification

Only after an authorized CMS/publishing process can the CMS lead check live DNS-pinned HTTPS responses, real robots.txt and XML bytes, redirects, the published `rel=canonical`, meta robots, X-Robots-Tag, route mounts, sitemap index children and actual search-engine URL Inspection where necessary. The verified page source must correspond to the exact candidate and approved Blueprint. A passing static policy review does not prove that Google indexed any page or that real browser/mobile SEO passes.

The lead must not automatically merge the SEO branch, edit public robots/sitemaps or treat any report as GO. All real host writes and owner approval remain separate.

## 5. Focused verification after integrating SEO worker subtree

```bash
node stage3/seo-engine/tests/crawl-policy-smoke.cjs
node stage3/seo-engine/tests/crawl-policy-regression-smoke.cjs
node stage3/seo-engine/tests/crawl-policy-cli-smoke.cjs
```

Core tests cover crawler grouping and specificity, terminal-wildcard behavior, Unicode/percent escapes, sitemap mount and sample/index scope, XML comments/entities/lastmod, noindex/canonical and mismatch errors, no-release semantics, and regression scenarios. CLI test runs both real local Node subprocesses with original private temporary files and checks hash manifests, atomic output, refusal to overwrite, rejecting unsafe XML and checkout-sourced private data.

**SEO worker does not claim real Node CI or real client website verification.** The independent lead runs these tests after integrating the subtree.

## 6. Combine original GSC indexing observation with crawl policy

**This is not Google URL Inspection, and it is NOT causal analysis.** The existing Search Indexing Intelligence already generates a private `indexing-intelligence.json` from an operator-declared GSC export. If you need to compare those historic/current operator observations against **supplied** crawler policy, use the new third CLI:

```bash
node stage3/seo-engine/bin/correlate-crawl-indexing.cjs \
  --blueprint /ABS/private/ORIGINAL-blueprint.json \
  --robots /ABS/private/original-robots.txt \
  --sitemap /ABS/private/original-sitemap.xml \
  --indexing /ABS/private/indexing-intelligence.json \
  --base https://site.example/ \
  --out /ABS/private/NEW-index-crawl-correlation
```

**Use exactly the same original Blueprint file bytes** that were used to generate the indexing intelligence; its recorded `blueprintSha256` must match that file's raw SHA256. Same approved page IDs, paths and HTTPS public-origin mount are required. Both the raw Blueprint byte hash and normalized canonical Blueprint hash are checked. Indexed/nonindexed observations are never authenticated by this step; `unobserved` stays `unobserved`.

The output is a new private, atomic directory containing `index.html`, `CRAWL-INDEXING-CORRELATION.json`, `CRAWL-INDEXING-CORRELATION.md`, `SOURCE-MANIFEST.json` and `PRIVATE-README.md`. P1 investigations include a canonical indexable Blueprint page with operator-reported not-indexed plus a Googlebot block from supplied robots.txt, or an intended noindex page reported indexed; P2 may include not-indexed with no Googlebot block or missing from a declared complete XML URL list. **These co-observations do not prove that robots caused a Google index status or that the public host currently serves the same policy.** Actual Google URL Inspection, live HTTP status, canonical and X-Robots-Tag, period/freshness review and owner permission remain mandatory.

```bash
node stage3/seo-engine/tests/crawl-indexing-correlation-smoke.cjs
node stage3/seo-engine/tests/crawl-indexing-cli-smoke.cjs
```

The SEO worker checked the deterministic core and local report generation in an emulated filesystem; full real Node CI and authentic public-site verification remain lead-owned.
