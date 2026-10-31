# SEO Operator Workspace — Crawl/Search Delivery integration (2026-10-30)

**Independent worker only**: `feature/site-seo-engine` / `stage3/seo-engine/**`. The lead is sole integrator. Nothing in this workflow authenticates the public host, changes CMS or Search Console, authorizes a release, creates PRs or publishes a candidate file.

## What changed

The existing `bin/build-seo-operator-workspace.cjs` now includes a **Crawl & Search Delivery** panel alongside first-site, post-launch search, URL indexing and manual human acceptance. **No second dashboard**. It shows P0/P1/P2 issues from the existing source reports, Googlebot/Bingbot / sitemap regressions, Search Console co-observation actions, explicit Crawl Repair manual holds, SHA256 identities and a downloadable private lead worklist.

The integrated viewer `lib/seo-workspace-crawl-panel.cjs` accepts original reports, not recomputed claims:
- `CRAWL-POLICY-REPORT.json` from `review-crawl-policy.cjs` (required for any `crawl` phase).
- `CRAWL-REGRESSION.json` from `compare-crawl-policy.cjs` (optional; must use policy as **before** and exact same Blueprint, base, robots/sitemap raw SHA).
- `CRAWL-INDEXING-CORRELATION.json` from `correlate-crawl-indexing.cjs` (optional; requires `indexing.report`, the same indexing original byte SHA, Blueprint and HTTPS root).
- `CRAWL-REPAIR-PLAN.json`, `SOURCE-MANIFEST.json`, `PROPOSED-robots.txt`, `PROPOSED-sitemap.xml` from **one** `prepare-crawl-repair.cjs` output (optional; all four files mandatory together). Manifest, before/after regression and SHA256 **actual candidate bytes** must match the original policy.
- All input reports and private source files must remain outside Git checkout; the CLI checks ordinary-file paths, absolute paths, size limits, no symlinks, rehashes all originals and atomically promotes a new local output directory.

## Exact private config

Example (replace every path with actual **operator-produced** report; remove optional keys if missing):

```json
{
  "format": "manufact-seo-operator-workspace-config-v1",
  "firstSite": {
    "summary": "/ABS/private/first-site/summary.json"
  },
  "indexing": {
    "report": "/ABS/private/indexing/indexing-intelligence.json"
  },
  "crawl": {
    "policy": "/ABS/private/crawl-policy/CRAWL-POLICY-REPORT.json",
    "regression": "/ABS/private/crawl-regression/CRAWL-REGRESSION.json",
    "correlation": "/ABS/private/crawl-indexing/CRAWL-INDEXING-CORRELATION.json",
    "repair": "/ABS/private/repair/CRAWL-REPAIR-PLAN.json",
    "repairManifest": "/ABS/private/repair/SOURCE-MANIFEST.json",
    "proposedRobots": "/ABS/private/repair/PROPOSED-robots.txt",
    "proposedSitemap": "/ABS/private/repair/PROPOSED-sitemap.xml"
  }
}
```

You may use `crawl` alone with only `crawl.policy`. If you include `crawl.correlation`, also supply exactly the **same** `indexing.report` bytes used for the correlation. If you add a repair, pass its three other files as above. A regression only connects when its **before** sources match the current policy. A regression and repair together must agree on the exact **after** file hashes. The read-only CLI never tries to auto-align mismatched versions.

Run the standard existing builder:

```bash
node stage3/seo-engine/bin/build-seo-operator-workspace.cjs \
  --config /ABS/private/seo-workspace-config.json \
  --out /ABS/private/NEW-operator-workspace
```

Output:
- `index.html`: the same existing Operator Workspace landing page, with a **Crawl & Search Delivery** card and next actions.
- `crawl.html`: CSP-restricted private offline P0/P1/P2 queue, source SHA256, warnings, escaped candidate previews, and mandatory lead actions.
- `crawl-lead-worklist.md`: private human worklist and exact fingerprints; **not** auto-executable CMS changes.
- When the repair is supplied and fully matched: `DRAFT-ONLY-robots.txt` and `DRAFT-ONLY-sitemap.xml`. These are intentionally **NOT** the official `robots.txt`/`sitemap.xml` names.
- `workspace-manifest.json`: `inputSHA256.crawl`, `crawlEvidence`, summary counts, `releaseAuthorized:false`; original client inputs are **not** stored in the repository.

**CRITICAL:** A green-looking draft or zero holds does not approve deployment. It must not be uploaded, renamed to a production file or included in a customer static-site ZIP. Lead must independently verify actual CMS current Site v1 revision, actual host HTTPS robots/sitemap/canonical/301/X-Robots-Tag, privacy intent and owner signoff, then implement separately in the lead-controlled release process with backup and rollback. Google Search Console URL status is an operator-supplied observation, not proof of a cause or a live authenticated index result.

## Targeted verification

```bash
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/crawl-repair-smoke.cjs
node stage3/seo-engine/tests/crawl-repair-cli-smoke.cjs
```

The new smoke creates a private crawl-only workspace using real Node and temporary original files, exercises actual output and non-overwrite, checks candidate byte hash pinning, HTML escaping, cross-source mismatch refusal and source manifest restrictions. The independent SEO worker has only executed **V8 isolated source/syntax checks**, not the actual Node smoke, CI, real customer site, published HTTP, authenticated GSC or client authorization. The CMS lead runs Node and one owner-approved site after integration.

## CMS lead handoff

1. Bring the latest SEO-owned subtree into the lead checkout **without changing CMS code here**.
2. Run focused Node tests; triage issues only as needed.
3. Have the operator collect original private robots, sitemap, approved Blueprint and independently authenticated Site v1 from the real client. Generate policy, optional regression/index correlation, optional repair.
4. Build this unified private workspace; review `crawl.html` and `crawl-lead-worklist.md` with owner and verify evidence source SHA and actual current public host. P0/P1 and manual holds are **investigations**, not automatic fixes.
5. Only lead/owner decides whether any proposed file is appropriate and carries an approved correction into the separate publisher; no automatic GO, CI acceptance or release is created here.


## 30 October continuation — original Blueprint + Site v1 implementation mapping

The original `crawl` workspace configuration optionally accepts `cmsBlueprint` **and** `cmsSite` together (both absolute private JSON paths). It revalidates canonical Blueprint bytes and original selected Site v1, preserves the exact original SHA256 in the shared manifest, and produces `crawl-cms.html`, `crawl-cms-worklist.md` and `crawl-cms-worklist.json` in the **same** workspace. The integrated crawl page links directly to this manual editor/publisher/GSC task breakdown. Errors on site/source/candidate drift fail closed. No CMS mutation, current-revision authentication or release authorization. Complete usage and focused Node test: [CRAWL-CMS-HANDOFF.md](CRAWL-CMS-HANDOFF.md).


## Source-bound post-edit cycle and human ledger

New optional `crawl.cmsBaseline` = exact original previous `crawl-cms-worklist.json`; `crawl.cmsDecisions` = human-edited earlier source-anchored decision ledger (requires baseline). Current `cmsBlueprint` + `cmsSite` remain mandatory. Creates `crawl-cms-decisions.html` and matching new template every cycle; optional previous baseline creates `crawl-cms-recheck.html/.md/.json`. The landing page gains a follow-up card; the existing crawl card and CMS review link the offline desk. Changed issue detail is classified separately using a stable topic ID; crawler agent/scope/sitemap-kind comparability is checked. No automatic resolution, approval or release. Exact workflow: [CRAWL-CMS-LIFECYCLE.md](CRAWL-CMS-LIFECYCLE.md).


## New source-bound actual-public-observation layer

The crawl config optionally accepts `publicCapture`: the exact private original `manufact-seo-delivery-evidence-v1` transcript from the **existing** read-only HTTPS capture tool. It requires `cmsBlueprint` and `cmsSite`, and the current crawl policy; all site, canonical Blueprint and original file SHA256 identities are checked. The private current workspace then adds `crawl-public-followup.html`, Markdown and read-only JSON, and links the result on `crawl.html` and the main landing page. No HTML page bodies are emitted in the report; original transcript remains in a private source folder. See [CRAWL-PUBLIC-FOLLOWUP.md](CRAWL-PUBLIC-FOLLOWUP.md).


## Actual per-client structured data analysis on supplied public HTML

With the existing `crawl.publicCapture` and original `crawl.cmsBlueprint`/`crawl.cmsSite` file pair, the same crawl workspace now checks actual JSON-LD scripts against **that client's** approved `schemaCandidates`, factual claim eligibility, canonical route, nested BreadcrumbList semantics and off-site/malformed entity references. Outputs: `structured-data.html/.md/.json`; linked from crawl and operator index. No extra config keys, HTTP requests, publisher change, reusable website library or Google eligibility claims. The source SHA256 and contents remain private. See [STRUCTURED-DATA-QA.md](STRUCTURED-DATA-QA.md).
