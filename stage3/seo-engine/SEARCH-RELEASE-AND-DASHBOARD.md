# MANUFACT SEO — Post-publication release follow-up and private dashboard

Scope: stage3/seo-engine/** only. This workflow is offline, read-only and non-publishing. It does not authenticate Google Search Console, the published CMS revision or any client approval. Run it only with local, private, owner-supplied data.

## Business goal

After site publication and SEO edits, editors need to understand which pages changed, what Google Search Console reported before/after and which pending items deserve investigation. This workflow adds a release journal bound to exact existing Search History bytes and an accessible, self-contained local HTML dashboard. No causal claims about traffic differences are made.

## 1. Prepare real Search History

Follow SEARCH-OPERATIONS-WORKFLOW.md sections 1–3. All reports require the explicit identical Search Console property/filter context, exact approved Blueprint SHA-256, equal-duration and non-overlapping periods. The existing analyze-search-history CLI builds search-history.json. A missing GSC row is UNKNOWN, never zero clicks. Operator-supplied exports may be incomplete or anonymized.

## 2. Record manual CMS releases

Create an empty private journal template:

~~~bash
node stage3/seo-engine/bin/manage-search-releases.cjs template \
  --history /ABS/private/search-history/search-history.json \
  --out /ABS/private/NEW-release-template
~~~

Edit a copy of release-journal-template.json OUTSIDE the Git checkout. A fictional entry in the releases array is:

~~~json
{
  "id": "release-editorial-oct",
  "publishedDate": "2026-10-08",
  "siteRevisionFingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "cmsPublishedVersion": "13",
  "pageIds": ["page-home"],
  "changeKinds": ["metadata", "content"],
  "changeSummary": "Editor updated the headline and summary after client review",
  "evidenceReferences": ["private://approval-note"],
  "ownerRecordedBy": "Client editor"
}
~~~

Keep every other template key unchanged, including sourceHistorySha256 and blueprintSha256. These prevent accidental reuse with a different measurement series, not forged operator claims.

The release journal accepts multiple entries with kinds metadata, content, navigation, schema, media, layout, indexation and other. The main developer must confirm the real saved/published CMS revision separately.

Generate the follow-up:

~~~bash
node stage3/seo-engine/bin/manage-search-releases.cjs review \
  --history /ABS/private/search-history/search-history.json \
  --journal /ABS/private/edited-release-journal.json \
  --out /ABS/private/NEW-release-followup
~~~

Outputs: seo-release-followup.json, seo-release-followup.md and PRIVATE-README.txt. A page gets a numerical pre/post comparison ONLY when both equal-length surrounding Search History periods exist and contain observed GSC rows; those periods are adjacent report entries; the release is strictly between the date windows; no other declared release intervenes. Otherwise status is NOT COMPARABLE, never an invented zero.

Even a comparable result is an observational correlation only. Search demand, competitors, indexing, SERP features, algorithm changes, truncation and unrecorded interventions can affect results. No CTR/click difference is proven SEO improvement or ROI.

## 3. Build a private HTML SEO dashboard

~~~bash
node stage3/seo-engine/bin/build-search-ops-dashboard.cjs \
  --history /ABS/private/search-history/search-history.json \
  --decisions /ABS/private/action-review/search-action-review.json \
  --releases /ABS/private/release-followup/seo-release-followup.json \
  --out /ABS/private/NEW-SEO-DASHBOARD
~~~

Both --decisions and --releases are optional. If present, they must reference the EXACT same Search History source SHA-256. Stale inputs are rejected.

Output:
- index.html: responsive self-contained local HTML; inline CSS; no external assets/scripts/network calls; CSP default-src none; observed periods, prioritized tasks with human status, per-page details, accessible SVG trend lines that do not connect across missing data, and optional owner-declared release observations.
- dashboard-manifest.json: input SHA-256 digests, report dimensions and read-only flag.
- PRIVATE-README.txt: privacy and non-publication warnings.

Open index.html locally from your private filesystem. It is NOT a publishable site ZIP or static CMS export. Never upload to hosting, attach it to a customer site or commit the private GSC history, queries and decisions to GitHub. All text is HTML-escaped. Missing data is UNKNOWN, not zero.

Private output folders are forbidden inside the checkout even through symlinks and are created with POSIX mode 0700; files are 0600. There is no overwrite, outbound API, deployment, background process or automatic CMS edit.

## 4. Focused check / limits

~~~bash
node stage3/seo-engine/tests/search-release-dashboard-smoke.cjs
~~~

The synthetic scenario checks the compiled Blueprint and three observed periods, release journal source binding, a true pre/post observation, an excluded confounded observation, offline HTML escaping and stale input rejection. It is NOT proof of actual Google property authentication, a deployed website, submitted forms, client signoff or ranking improvement. The lead remains sole integrator and publisher.
