LATEST 29.10.2026: practical first-site integrated workflow — FIRST-SITE-INTEGRATION-SESSION.md and LIVE-ACCEPTANCE-WORKFLOW.md. Added one-command private local/public/search sessions (original real localhost PHP checks, static public ZIP, source-pinned lead relay, original human ledger, private workspace, post-public manual device/form matrix). No automatic GO/PR/merge/deploy; actual client browser, POST, TLS and signoff pending lead. Isolated V8 syntax/contract checks only, not complete Node CI.

# MANUFACT — Private Client SEO Operator Workspace

The SEO Engine now supports a single locally browsable entry point for two independent phases of an AI Site CMS customer project:

1. First-site technical acceptance: existing original first-site-check summary/bundle, optional post-deploy HTTP/media verification, optional human operator ledger.
2. Post-publication search operations: GSC Search History, optional exact-source-bound human SEO decisions and observed manual release follow-ups.

This creates a **private static report workspace** on the operator's machine. It does NOT create/publish a CMS site, authenticate Google, edit data, send POST, verify notifications or sign off a client release.

## 1. Prepare existing private reports

All source reports must already have been created by the existing SEO Engine workflows, with actual operator evidence:
- FIRST-SITE-RUNBOOK.md, FIRST-SITE-COCKPIT.md, FIRST-SITE-OPERATOR-LEDGER.md.
- SEARCH-OPERATIONS-WORKFLOW.md, SEARCH-RELEASE-AND-DASHBOARD.md.

The workspace does not duplicate technical PHP/static or live HTTPS capture. It reuses the existing strict renderer input contracts.

## 2. Create a private configuration file

Store the configuration and **every referenced input file outside the Git checkout**, with absolute local paths. Fictional example:

~~~json
{
  "format": "manufact-seo-operator-workspace-config-v1",
  "firstSite": {
    "summary": "/ABS/private/site-report/summary.json",
    "bundle": "/ABS/private/site-report/bundle.json",
    "postDeploy": "/ABS/private/post-deploy/post-deploy-summary.json",
    "operatorReview": "/ABS/private/first-site-operator-review/first-site-operator-review.json"
  },
  "search": {
    "history": "/ABS/private/search-history/search-history.json",
    "decisions": "/ABS/private/search-actions/search-action-review.json",
    "releases": "/ABS/private/release-followup/seo-release-followup.json"
  }
}
~~~

The firstSite and search objects are individually optional. At least one must exist. If firstSite is present, summary is required; if search is present, history is required. The other entries may be omitted until the actual real-world evidence exists. Never invent or fill in real published public verification before it has been collected.

The workflow accepts only the named config keys and absolute local file paths. It rejects symlink input files, user data inside the repository checkout, oversized/invalid JSON and source references that cannot be matched. If both phases are present, siteId MUST match exactly or the command fails.

## 3. Build a cohesive private workspace

~~~bash
node stage3/seo-engine/bin/build-seo-operator-workspace.cjs \
  --config /ABS/private/seo-workspace-config.json \
  --out /ABS/private/NEW-client-seo-workspace
~~~

Output (new PRIVATE folder, created outside checkout):
- index.html — client workspace landing page, current launch blocking disposition, post-launch SEO availability and next MANUAL actions.
- launch.html — original first-site technical and human acceptance cockpit, if firstSite supplied.
- search.html — original Search Console history/actions and optional release follow-up dashboard, if search supplied.
- workspace-manifest.json — exact SHA-256 for inputs, summary counts, source phase availability, readOnly and releaseAuthorized:false.
- PRIVATE-README.txt — privacy and non-publication warning.

All HTML is self-contained, responsive, script-free, external-resource-free, with strict HTML escaping and CSP default-src none. The landing page offers local links only. This is NOT a customer website, PHP CMS front end, React/Studio dashboard, public static export or production admin. Nothing is uploaded, deployed, sent to an API or merged.

The command retains the original technical and observational distinction:
- Technical first-site blockers remain blocking even if an operator marked an item checked.
- A manually supplied post-deploy report marked TECHNICALLY MATCHED still requires actual browser/device/form POST/notifications and client approval.
- Search Console observations and release comparisons are not verified causal SEO gains.
- Missing Search Console page rows remain UNKNOWN, not zero traffic.

Private output uses POSIX mode 0700 for folder and 0600 for files, refuses overwrite and symlinked output parents into Git checkout.

## 4. Minimal isolated smoke

~~~bash
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
node stage3/seo-engine/bin/build-seo-operator-workspace.cjs --help
~~~

The focused smoke uses synthetic source-bound reports with both phases, only launch phase, and deliberately mismatched siteId. Production integration and first client acceptance remain the sole responsibility of the lead developer. There is no automatic PR, merge, deploy, publication or live site mutation.

## 5. Recommended launch sequence for the lead developer

Use the standard first-site source/approval/PHP contracts first. Build a cockpit, reconcile original blockers, perform actual public HTTPS and form/device/client checks manually, and archive the approved published version. After real Search Console data exists, add a private Search History and optional editor/owner decisions to the same workspace. This gives one operational view without pretending SEO data are proof of technical release readiness.

## Optional third phase — observed URL indexing statuses

The unified workspace can also include an independent indexing report produced by [SEARCH-INDEXING-WORKFLOW.md](SEARCH-INDEXING-WORKFLOW.md). Add a sibling `indexing` object to the existing private config: `"indexing": { "report": "/ABS/private/indexing-intelligence.json" }`. `firstSite`, `search` and `indexing` are individually optional; at least one is required. Combining them requires identical `siteId`; combining Search History and indexing also requires identical approved Blueprint **raw SHA-256**. If indexing is supplied, the workspace creates `indexing.html` and a local navigation card. Missing URL observations are UNKNOWN, never automatically interpreted as excluded. No Google property authentication or publication permissions are implied.
