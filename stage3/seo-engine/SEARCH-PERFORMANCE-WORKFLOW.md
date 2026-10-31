# MANUFACT AI Site CMS — Search Performance Intelligence

**Scope:** only stage3/seo-engine/**. This is an offline, read-only **post-publication SEO improvement worklist** based on operator-exported Google Search Console (GSC) CSV data. It does **not** query Google, modify the CMS, publish content, validate GSC property ownership or predict search rankings.

**New prerequisite (29 Oct):** a private --context file is REQUIRED. It explicitly declares GSC property, search type, device, country, filters, method and final data status; without it the report is ineligible for historical comparison. See [SEARCH-OPERATIONS-WORKFLOW.md](SEARCH-OPERATIONS-WORKFLOW.md) for an exact JSON example and the new historical/action-ledger workflows.

## Goal

Earlier SEO Engine checks approved Blueprint, actual PHP rendering, static uploads and public HTTPS evidence. This module answers a different operational question: **which published pages should the editor investigate or improve when search impressions and clicks become available?**

It combines the approved SEO Blueprint with measured GSC pages, optional queries and paired Page/Query dimensions, and optionally compares a previous period. It provides specific human-only next actions with observational metric evidence and no invented search-volume claims.

## Operator workflow

1. Open **Google Search Console → Performance → Search results**. Set property, search type, country/device filters and date period. Export the **Pages** CSV. Typical English headers: Top pages,Clicks,Impressions,CTR,Position.
2. Optionally export **Queries** CSV with the same filters. Separate Queries CSV gives **sitewide queries only** and does not attribute each query to a page.
3. For query-to-page overlap analysis, export an additional **paired Page+Query** CSV, for example using both dimensions from the GSC API. Required headers: Page,Query,Clicks,Impressions,CTR,Position. Two separate GSC UI CSVs are not equivalent to a paired export.
4. For traffic change signals, optionally supply earlier **Pages** CSV with equal day count, non-overlapping dates and matching GSC filters.
5. Run from the lead-integrated Node 20+ checkout. Keep all source CSVs and outputs PRIVATE, not in Git or the static upload folder.

Example (fictional URLs and private local paths):

~~~bash
node stage3/seo-engine/bin/analyze-search-performance.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --context /ABS/private/gsc-context.json \
  --origin https://example.com/ \
  --pages /ABS/private/Pages.csv \
  --queries /ABS/private/Queries.csv \
  --pairs /ABS/private/Paired-Page-Query.csv \
  --period-start 2026-10-01 \
  --period-end 2026-10-28 \
  --previous-pages /ABS/private/Older-Pages.csv \
  --previous-start 2026-09-03 \
  --previous-end 2026-09-30 \
  --out /ABS/private/NEW-search-performance-report
~~~

Optional: --site /ABS/private/actual-published-Site-v1.json. It is checked with the existing Site v1 validator and manifests before reporting implementation mapping. However, the operator must independently obtain the correct owner-published revision from CMS; this tool does not authenticate it. Missing Site v1 means implementation status is explicitly not-supplied.

## Output

- performance-insights.json — typed read-only report with page metrics, approved intent, optional top paired queries, unmatched URLs, period changes, prioritized editorial actions and SHA-256 input digests.
- editorial-worklist.md — editor-friendly report, action table, page performance and clear limitations. Global Queries are explicitly **not attributed to a page**.
- PRIVATE-README.txt — privacy reminder.

The new output directory uses mode 0700 and files mode 0600 on POSIX systems; actual ACL/storage permissions are outside the module. Existing directories cannot be overwritten. No data from this tool belongs in the public site ZIP, static-host folder or repository.

## Accepted evidence and restrictions

CSV parser supports UTF-8 CSV with quoted fields (including commas inside a query), standard English and selected Russian/Polish GSC headers, integers for clicks/impressions, decimal average positions and percent CTR. Rows, sizes and field lengths are bounded. Contradictory metrics and duplicate dimension rows fail closed.

The explicit HTTPS origin includes an optional public mount path. Parameterized pages, other domains and routes missing from the approved Blueprint are marked unmapped rather than silently assigned to a page. No CMS edit is created.

**P1 triage:** at least a 30% decline in observed clicks vs equal-length prior period with at least 30 prior clicks; surprising impressions on planned noindex pages; supplied Site v1 route disagreement; unexpected measured URLs.

**P2 triage:** at least 200 impressions with observed CTR below 1.5% and average position at most 10; average position 8–20 with at least 100 impressions; overlapping query evidence for two or more approved indexed pages in a paired export. Overlap is **not proof of cannibalization**.

These are simple editorial heuristics, **not industry CTR standards, ranking forecasts or causal diagnoses**. GSC UI exports can have row limits, anonymized queries may be absent, search type and filters change denominators and average position is not a fixed ranking. Never infer no search demand from an absent query. A click drop can reflect seasonality, demand or the results page rather than a CMS defect.

## Integration

Lead developer alone decides how to expose insights in Studio or client dashboards. Worker must not modify server, SDK, Studio, workflow, main, PR, merge or deploy.

Focused smoke (offline synthetic example only):

~~~bash
node stage3/seo-engine/tests/gsc-performance-smoke.cjs
node stage3/seo-engine/bin/analyze-search-performance.cjs --help
~~~

Production GSC data, owner approval and customer results are **not yet verified**. First real CSV data must be reviewed against property, date, search type, filters and expected canonical host before acting on the findings.

## Editorial page briefs — second major capability

The same CLI additionally writes **editorial-page-briefs.json** and **editorial-page-briefs.md**. These join the approved page intent, meta title/description, sections, planned talking points, CTA targets, contextual links, declared schema candidate fact statuses and observed per-page GSC queries (only when paired evidence was supplied). P1/P2 findings become specific, page-bound human editorial assignments. No new marketing claims, drafts or CMS changes are produced. Missing queries remain explicitly unverified, and noindex/canonical decisions are never automated.

This is a private, human-review-only companion to the measured search performance worklist. Publishing it or treating the approved Blueprint as proof of actual live HTML is forbidden.

**Input/output safety update:** The declared GSC property must cover the HTTPS public origin. The private output directory must be new and located outside the Git checkout; symlinked paths back into the checkout are refused. Neither check authenticates an actual GSC export.

## Post-publication operations: several periods, decisions and links

See [SEARCH-OPERATIONS-WORKFLOW.md](SEARCH-OPERATIONS-WORKFLOW.md). The performance CLI now additionally creates search-internal-links.json/.md. The new standalone analyze-search-history.cjs compares 2–24 fully comparable report periods; manage-search-actions.cjs creates source-SHA-pinned private human decision templates and reviews. These are operator-asserted Search Console observations, not automatic permission to edit/publish a client website.
