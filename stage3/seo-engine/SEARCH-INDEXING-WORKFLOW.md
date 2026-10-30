### Additional bridge: robots/sitemap policy + reported URL indexation

[CRAWL-POLICY-WORKFLOW.md](CRAWL-POLICY-WORKFLOW.md) now documents `correlate-crawl-indexing.cjs`, which uses the existing private indexing-intelligence.json together with the **exact same original Blueprint bytes** and independently supplied robots/sitemap files. It creates per-page P1/P2 *manual investigation* prompts for co-observed Googlebot blocks or sitemap omissions. This cannot authenticate Search Console, live host state or whether robots caused a historic index status. Keep all four inputs and the generated private HTML/JSON/Markdown outside GitHub and hosting.

### Companion: original robots/sitemap policy and regressions

Use [CRAWL-POLICY-WORKFLOW.md](CRAWL-POLICY-WORKFLOW.md) before interpreting GSC index reports: the offline crawl policy modules can check robots rule precedence for Googlebot/Bingbot and sitemap completeness or compare before/after policy sets. This is *operator-supplied evidence only*, not authenticated URL Inspection; never use a declared robots allow/deny alone to assert actual Google indexing. The GSC indexing workflow below remains separate.

# MANUFACT SEO — Private Search Indexing Intelligence

**Scope:** independent SEO worker, stage3/seo-engine/** only. No Google authentication, CMS mutation, PR, merge or deploy. This offline operator workflow covers **URL indexing evidence**, not live Google indexation certification.

## 1. Input: operator-normalized page indexing CSV

Google Search Console's Page indexing UI exports vary: an "Examples" export may have only URL and last-crawled columns and may be a **sample**, not the entire property. Before analysis, create a **private normalized CSV** whose status and reason are copied by the operator from a specific GSC indexing section or an actual URL Inspection observation. Never invent a Google status or claim that a list of example URLs represents the entire site.

Expected columns (UTF-8 CSV, comma-separated; quoted commas supported):

~~~csv
URL,Status,Reason,Last crawled
https://example.com/,not indexed,Crawled - currently not indexed,2026-10-20
https://example.com/contact/,indexed,,2026-10-20
~~~

Allowed statuses (English): indexed, not indexed, excluded, unknown; equivalent explicit English/Polish/Russian UI labels are also accepted. Only the three normalized results indexed, not-indexed and unknown are meaningful. Last crawled is optional, YYYY-MM-DD or literal UNKNOWN. Reason is optional. A GSC sample exported from one issue bucket needs its bucket status manually and consistently attached to each URL. If status is not established, enter unknown, NOT indexed/excluded.

Two canonical approved URLs cannot be represented multiple times under URL aliases. A raw URL with query parameters, unsupported route, foreign host or unknown Blueprint path becomes an unmapped observation, not an automatically rewritten canonical.

**Never commit normalized CSV, Search Console query text or private customer status reports to GitHub.**

## 2. Declare exact GSC property and analyze

Reuse the existing private GSC context JSON (documented in SEARCH-OPERATIONS-WORKFLOW.md): format manufact-seo-search-evidence-context-v1, sc-domain:... or HTTPS URL prefix property, searchType web, device/country/filter settings and exportMethod as provided by the operator. The declared property must cover the target HTTPS public origin. The context is operator-attested only.

~~~bash
node stage3/seo-engine/bin/analyze-search-indexing.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --origin https://example.com/ \
  --context /ABS/private/gsc-context.json \
  --csv /ABS/private/gsc-indexing-normalized.csv \
  --observed-at 2026-10-29 \
  --scope selected-urls \
  --out /ABS/private/NEW-indexing-review
~~~

Allowed --scope values:
- example-urls: example URLs exported from an issue bucket; NOT full index coverage.
- selected-urls: individually selected/inspected URLs.
- all-exported-rows: every row actually supplied by an export; still not guaranteed to cover every property URL.

Optional **--performance /ABS/private/performance-insights.json** uses existing Search Performance Intelligence. It is accepted only if the siteId, exact raw Blueprint SHA256, Search Console property and public origin agree. If supplied page impressions coexist with a reported not-indexed status, that creates a **human disagreement investigation**; the observation periods may differ, so it is not proof of simultaneous inconsistency.

Outputs created outside the Git checkout:
- indexing-intelligence.json — read-only per-page indexing status, approved robots rule, optional measured impressions, unmapped evidence, P1/P2 manual checks and input SHA256.
- indexing-intelligence.md — human review worklist and limitations.
- index.html — local responsive standalone dashboard with script-free HTML/CSS and a strict CSP.
- PRIVATE-README.txt.

A missing Blueprint URL is UNOBSERVED rather than excluded or indexed. Indexable routes with supplied not-indexed statuses produce human investigation prompts. A Blueprint noindex route reported indexed is higher priority. Nothing automatically changes robots, canonical, sitemap, page content or redirects.

## 3. Track status changes across snapshots

Use **2–24 private indexing-intelligence.json reports**, all from exactly the same approved Blueprint file bytes SHA256, siteId, HTTPS public origin, declared GSC property and exportScope. Observed dates must be strictly increasing (the CLI sorts them). Different Blueprint versions/property/scope cannot be compared as a factual status change.

~~~bash
node stage3/seo-engine/bin/analyze-indexing-history.cjs \
  --report /ABS/private/index-early/indexing-intelligence.json \
  --report /ABS/private/index-middle/indexing-intelligence.json \
  --report /ABS/private/index-latest/indexing-intelligence.json \
  --out /ABS/private/NEW-index-history
~~~

Outputs: indexing-history.json, indexing-history.md and PRIVATE-README.txt. The engine explicitly reports indexed → not-indexed, not-indexed → indexed, unchanged, or insufficient comparable observations. A trailing sequence of three separate explicit not-indexed observations of an indexable page triggers a **manual review**, not a claim of continuous exclusion between inspections.

A missing URL in a later selected/example export is NEVER treated as deindexation. The history refuses mixed source context, duplicate timestamps, changed page map or approved robots changes. No Google URLs are fetched, requested for indexing or edited.

## 4. Turn reported indexing problems into actual CMS editor review packets

When the lead can supply the **actual owner-published Site v1** JSON (and its approved Blueprint raw file), the indexing report can be reconciled to the current site's SEO fields. This reuses the existing authoring audit instead of creating a separate editor.

~~~bash
node stage3/seo-engine/bin/prepare-indexing-cms-review.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --site /ABS/private/current-owner-published-site-v1.json \
  --indexing /ABS/private/NEW-indexing-review/indexing-intelligence.json \
  --out /ABS/private/NEW-indexing-cms-packets
~~~

Optional --manifests /ABS/components-dir, default stage3/components. This command validates original site/Blueprint version through existing auditSite, source SHA256 matches, approved route IDs, actual Site v1 SEO robots/canonical fields, and flags observed differences only for **manual verification**. A route not present in actual CMS becomes blocked rather than guessed.

Outputs: indexing-cms-work-packets.json, indexing-cms-work-packets.md, PRIVATE-README.txt. Not an executable patch. Do not change owner-approved noindex/canonical settings without a live URL Inspection, actual HTTPS/robots and client approval.

## 5. Include this report in the unified private operator workspace

The existing build-seo-operator-workspace.cjs now accepts an additional **optional** sibling config:

~~~json
{
  "format": "manufact-seo-operator-workspace-config-v1",
  "indexing": {
    "report": "/ABS/private/NEW-indexing-review/indexing-intelligence.json"
  }
}
~~~

FirstSite and search sections may be added independently; at least one of all three must exist. If combined, all siteId values must agree; Search History and indexing reports must have the same **exact Blueprint SHA256**. The private workspace creates indexing.html alongside launch.html and search.html as applicable and links it from the local landing page. This is NOT a publicly hosted dashboard.

## 6. Privacy, QA and open real-world dependencies

All inputs and outputs remain outside Git, with an existing private-output-policy.cjs guard: new folder, POSIX directory mode 0700, file mode 0600. Customer GSC data, statuses and URLs may be confidential.

One focused product smoke:

~~~bash
node stage3/seo-engine/tests/search-indexing-smoke.cjs
~~~

The code performs no network calls and no Google URL Inspection authentication. A real GSC export, actual owner-published Site v1, live canonical/robots checks, public release and customer approval must be independently verified by the lead. No automatic Google indexing request, CMS Save/Publish, PR, merge or deployment is performed.
