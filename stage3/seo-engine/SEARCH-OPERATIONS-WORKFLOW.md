# SEO Engine — Search Operations (29 October 2026)

Scope: stage3/seo-engine/** only. Branch: feature/site-seo-engine. The lead alone handles integration, CMS edits, PR, merge and deployment.

This offline product layer combines **multi-period Google Search Console performance intelligence**, a **source-pinned human SEO action ledger** and **search-aware internal linking**. All inputs are operator-supplied private local files. No Google API, authenticated property check, background monitoring or automatic CMS edits.

## 1. Declare exact Search Console context

New performance reports require an operator-reviewed, private GSC context JSON, for example:

~~~json
{
  "format": "manufact-seo-search-evidence-context-v1",
  "property": "sc-domain:example.com",
  "searchType": "web",
  "country": "ALL",
  "device": "ALL",
  "filters": [],
  "exportMethod": "gsc-ui",
  "exportedAt": "2026-10-29T09:00:00Z",
  "dataState": "final"
}
~~~

The property may alternatively be an exact HTTPS URL-prefix property. Supported search types: web, image, video, news; country is ALL or ISO 3166 alpha-3; devices ALL, DESKTOP, MOBILE, TABLET. Optional query/page/searchAppearance filters may use equals, notEquals, contains, notContains, regex, notRegex. Only final non-provisional date windows can be compared. Fields are **operator declarations**; no GSC ownership or CSV provenance is authenticated.

The context module hashes the exact property, search type, country, device and normalized filters, excluding export timestamp. Comparing reports also requires the same export method, public origin, exact approved Blueprint source file SHA-256, unchanged page map and equal period length. Any mismatch blocks analysis. Different versions are incomparable, NOT verified changes.

## 2. Build private performance reports

Export Pages CSV from GSC Performance → Search results. Optional separate Queries CSV is sitewide, never page-attributed. Page+Query pairs require a genuine combined-dimensions export (for example GSC API), not joining two unrelated CSVs. Keep matching GSC filters/search type per period.

~~~bash
node stage3/seo-engine/bin/analyze-search-performance.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --context /ABS/private/gsc-context.json \
  --origin https://example.com/ \
  --pages /ABS/private/Pages-Oct.csv \
  --queries /ABS/private/Queries-Oct.csv \
  --period-start 2026-10-01 \
  --period-end 2026-10-28 \
  --out /ABS/private/NEW-gsc-oct
~~~

Optional --site /ABS/private/owner-published-site-v1.json enables authoring-level link observations after existing Site v1 contract validation, **not authenticated API origin**. This CLI now emits seven private files: performance-insights.json, editorial-worklist.md, editorial-page-briefs.json, editorial-page-briefs.md, search-internal-links.json, search-internal-links.md and PRIVATE-README.txt.

Performance JSON retains source file SHA-256 and GSC context. Earlier reports without exact Blueprint SHA-256 or GSC context are **not eligible** for multi-period comparison. Re-run original CSVs with confirmed context instead of guessing.

## 3. Compare multiple periods

Use 2–24 non-overlapping performance-insights.json reports with **equal period day counts**. A sustained click-decline signal requires three consecutively observed, contiguous windows. A missing page row is UNKNOWN, never zero. Date gaps prevent sustained/adjacent comparisons.

~~~bash
node stage3/seo-engine/bin/analyze-search-history.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --report /ABS/private/gsc-aug/performance-insights.json \
  --report /ABS/private/gsc-sep/performance-insights.json \
  --report /ABS/private/gsc-oct/performance-insights.json \
  --out /ABS/private/NEW-search-history
~~~

Files: search-history.json, search-history.md, PRIVATE-README.txt. Tracks observed per-page clicks, impressions, CTR and average position across distinct cohorts; identifies persistent declines and persistent low CTR. Raw page totals reflect only supplied Pages CSV, **not complete site visibility**. Anonymized queries and truncated exports may hide data. Reported observations do not establish causes.

## 4. Human editorial action ledger

Create an editable private template from the exact new history:

~~~bash
node stage3/seo-engine/bin/manage-search-actions.cjs template \
  --history /ABS/private/NEW-search-history/search-history.json \
  --out /ABS/private/NEW-actions-template
~~~

Manually edit a copy of search-actions-template.json, never in GitHub or a public static folder. Allowed statuses: unreviewed, accepted, in-progress, completed-reported, deferred, rejected. A reviewed task requires assignedTo, reason and decisionAt YYYY-MM-DD. Completed-reported additionally requires manualChangeDescription and a private evidenceRefs entry; that status is an unverified human assertion, **not proven CMS publication or SEO uplift**.

~~~bash
node stage3/seo-engine/bin/manage-search-actions.cjs review \
  --history /ABS/private/NEW-search-history/search-history.json \
  --ledger /ABS/private/edited-search-actions.json \
  --out /ABS/private/NEW-action-review
~~~

Output: search-action-review.json, search-action-review.md and PRIVATE-README.txt. Any change to source history SHA-256 invalidates previous decisions. Nothing auto-approves a client website.

To create a fresh ledger with old decisions for reference only:

~~~bash
node stage3/seo-engine/bin/manage-search-actions.cjs template \
  --history /ABS/private/NEWER-search-history/search-history.json \
  --previous-history /ABS/private/NEW-search-history/search-history.json \
  --previous-ledger /ABS/private/edited-search-actions.json \
  --out /ABS/private/NEWER-actions-template
~~~

Old dispositions are displayed ONLY as previousDecisionForReferenceOnly for a still-present task. Current status remains unreviewed. Disappearing tasks are not classified as verified repairs.

## 5. Search-aware internal linking

The performance CLI now emits search-internal-links.json and search-internal-links.md. The reviewer combines real supplied GSC page observations with **only explicitly approved Blueprint contextual edges and CTAs**. With Site v1 supplied it examines actual authoring-level links (legacy and DesignGraph) and flags approved edges not located in authored sections; such edges may still appear in header, footer or other rendered navigation. Not observed does **not** mean broken.

Indexed page targets with 150+ impressions and average position at most 20 may receive a human editorial link-review prompt. A page without any approved incoming contextual edge triggers a human architecture check, **not automatic link creation**. All guidance remains private and read-only.

## 6. Security, implementation and testing

The new private-output policy refuses to create any GSC evidence or human decision report **inside the repository checkout**, including through a symlinked parent directory. The output parent directory must already exist outside the checkout and the destination must be new. The context preflight also verifies that the explicitly declared Search Console domain or HTTPS URL-prefix property **covers the requested public origin** before consuming the measurements. This is a consistency check, not proof that the CSV came from Google.


- Keep raw GSC queries, CSV, SEO reports, owner decision ledgers and Site v1 JSON outside GitHub. Queries can contain private text.
- Private output directories are created mode 0700 and files mode 0600 on POSIX. Storage ACLs outside the process are not authenticated.
- No external API calls, no CMS reads/writes, no GSC authenticity validation, no PR, merge, deploy or client publication.
- First real site still needs approved sealed source, owner-published Site v1, official static export, actual HTTPS and client signoff per FIRST-SITE-RUNBOOK.md.
- Run only the focused offline smoke: node stage3/seo-engine/tests/search-operations-smoke.cjs. Real GSC export and customer result not confirmed by worker.

Prioritize useful product capabilities over artificial testing. Lead alone decides dashboard / Studio integration.


## 7. NEW — accepted search tasks to exact CMS human work packets

The fourth substantial product direction bridges observed GSC history + accepted human ledger decisions back to the current **validated Site v1 authoring contract** without patching or changing CMS data.

From a verified owner-published CMS Site v1, a matching approved Blueprint, the current Search History and the user-edited ledger:

~~~bash
node stage3/seo-engine/bin/prepare-search-cms-handoff.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --site /ABS/private/actual-owner-published-site-v1.json \
  --history /ABS/private/NEW-search-history/search-history.json \
  --ledger /ABS/private/edited-search-actions.json \
  --out /ABS/private/NEW-cms-search-work-packets
~~~

Optional: --manifests /ABS/component-manifests, otherwise the actual stage3/components registry. This command runs the current authoritative Site v1 SEO audit first and refuses different site IDs, wrong exact Blueprint raw SHA256 or stale action ledger SHA256.

Outputs, private and OUTSIDE Git checkout:

- cms-search-work-packets.json: exact current Site v1 fingerprint, observed search signals, human accepted/in-progress task bindings, existing page SEO fields (title, description, robots, OG title/description), approved Blueprint target values, manifest-backed existing element proposals (heading and CTA only when unambiguous), section IDs/manifest versions, current authoring links counts, and mandatory manual checks.
- cms-search-work-packets.md: readable task-by-task handoff with page IDs, source field values and next human steps.
- PRIVATE-README.txt: no automated Save, Publish or release permission.

Separate result groups are active, reportedComplete, notSelected (including pending/rejected/deferred) and blocked by current Site v1 page/route drift. **Completed-reported is never called verified.** Accepted SEO task means approval to investigate, not that its wording should automatically overwrite the approved Blueprint or customer CMS override.

This is intentionally compatible with the existing field-proposals.cjs and approved Blueprint contracts instead of inventing an independent editor. The lead must independently authenticate the owner-published source revision and verify real browser/public HTTPS/form behavior after any actual CMS changes.

## 8. Private release and operations dashboard

See [SEARCH-RELEASE-AND-DASHBOARD.md](SEARCH-RELEASE-AND-DASHBOARD.md). It provides source-pinned owner-declared release comparison against actual operator-provided GSC periods, plus an offline HTML dashboard for all page metrics, manual SEO statuses and release follow-up. A click difference is **not causal evidence**. Dashboard HTML is PRIVATE, not a CMS static site export, and must never be uploaded to public hosting.

## 9. Optional unified private client workspace

A combined owner-only local HTML entry point for this Search History dashboard and existing First Site Launch Cockpit is available through [SEO-OPERATOR-WORKSPACE.md](SEO-OPERATOR-WORKSPACE.md). The two phases must have exactly matching siteId; the output remains a private operator report, NEVER a published website or Google-authenticated dashboard.

## 10. Search Console page indexing observations

The existing Search Performance workflow measures traffic, not Google's actual URL indexation state. A separate post-launch private [SEARCH-INDEXING-WORKFLOW.md](SEARCH-INDEXING-WORKFLOW.md) now handles operator-normalized URL Indexing exports and explicit GSC status notes, approved robots/canonical comparisons, multiple snapshots and manual CMS editor work packets. Use this when reviewing reported excluded pages, not as Google API authentication or automatic indexing remediation.
