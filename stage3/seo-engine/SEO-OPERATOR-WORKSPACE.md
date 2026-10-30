## Final worker handoff update — 29 October 2026

**New actual client-acceptance functionality:** The original local PHP audit `seo-report/bundle.json -> localPhpForms.pages` now controls the mandatory number of **real form POST receipts per public page**, not just a site-wide total. The private human acceptance template pins the PHP bundle SHA256, identifies form expectations per route and rejects receipts on pages where no form was observed, duplicated route+form IDs, and excess receipts. The private `human.html` workspace displays each source-bound page's actual confirmed/expected receipt count and refuses manipulated totals. An all-pass operator attestation still does **not** prove real client signature or grant deployment authorization.

**Session integrity:** New `lib/first-site-session-source-pin.cjs` and smoke freeze all direct private owner/evidence inputs, original PHP summary/bundle, upload manifest and public ZIP before local/public HTTPS stages and rehash them before writing `INTEGRATION-SESSION.json`. If any input changes, the **new private session** is discarded rather than presenting stale mixed-release evidence. Standalone real-world human CLI also rechecks the edited observations and re-verifies ZIP + static upload bytes before promoting its reviewed output. No public POST, CMS write, merge, PR or hosting deploy.

**Mandatory next action:** The lead branch still does not contain these SEO workflow files; only the CMS lead should integrate the SEO subtree and run focused Node smokes, followed by a real owner-published Site v1 / Approved Site v2 / PHP/HTTPS/browser/form client acceptance. No worker CI runs or full Node live client verification can be claimed. See [SEO-WORKER-FINAL-TRANSFER-2026-10-29.md](SEO-WORKER-FINAL-TRANSFER-2026-10-29.md) and [FIRST-SITE-LEAD-QUICKSTART.md](FIRST-SITE-LEAD-QUICKSTART.md).

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

## Unified manual human acceptance in the private SEO workspace (29.10.2026)

After the actual operator completes the private live browser/device/form template, run first-site-live-acceptance.cjs review on the exact public lead relay and post-deploy summary. The resulting live-acceptance-review.json can be added to the existing unified private SEO Operator Workspace, along with the **original** lead relay contract, by adding the optional sibling config:

~~~json
"liveAcceptance": {
  "report": "/ABS/private/actual-live-acceptance-review.json",
  "contract": "/ABS/private/actual-public-phase-lead-relay/INTEGRATION-CONTRACT.json"
}
~~~

It MUST be accompanied by firstSite.summary and firstSite.postDeploy from the SAME original PHP/source and public release; exact raw SHA256 of the human report's lead contract, PHP summary and postDeploy report are compared. The workspace adds human.html with checked/pending/failed tasks and actual POST receipt counts, never an automatic GO. Offline claims remain subject to independent real TLS, screenshots, mail/Telegram delivery and client signoff.

The one-command first-site integration runner supports optional search-phase keys liveAcceptanceReview and liveAcceptanceContract **together**. This permits a single later private workspace including local launch, public technical evidence, human acceptance, real indexing and Search History, only when each source identity agrees. If the human review is not available, omit both keys and proceed with observational GSC reports without fabricating acceptance.


## 30 October 2026 — integrated Crawl & Search Delivery phase

The existing private Operator Workspace now accepts optional `crawl` with required `policy` and optional `regression`, `correlation`, and a **complete** four-file repair dossier. It adds the `crawl.html` private panel, P0/P1/P2 manual task queue, source SHA256 ledger and optional explicitly unapproved `DRAFT-ONLY-robots.txt` / `DRAFT-ONLY-sitemap.xml`, plus a private lead Markdown worklist. There is **no new dashboard and no publisher**. Mixed site IDs, HTTPS roots, canonical Blueprint hashes, original robots/sitemap inputs, GSC original report SHA or modified candidate file bytes are rejected rather than displayed as a common release. Full path/config and limitations: [CRAWL-WORKSPACE-INTEGRATION.md](CRAWL-WORKSPACE-INTEGRATION.md). The private workspace remains non-authorizing regardless of zero holds.


## 30 October continuation — source-pinned CMS implementation action map

Optionally set `crawl.cmsBlueprint` to the original canonical `manufact-seo-blueprint-v1` JSON and `crawl.cmsSite` to the operator-selected original `manufact-ai-site-v1` JSON, both private files outside checkout. They must be provided as a pair and match the existing crawl report's canonical Blueprint SHA256, stable page IDs and HTTPS mount; if a repair dossier or indexing correlation is included its original raw file hash identity must also match. The existing `crawl.html` now links `crawl-cms.html`, a read-only list separating **CMS page SEO field drift** from **publisher robots/sitemap/redirect** tasks and **GSC URL Inspection**. JSON/Markdown worklists and SHA256 are written into the same private output directory. Nothing is automatically applied, saved, merged or published. See [CRAWL-CMS-HANDOFF.md](CRAWL-CMS-HANDOFF.md).


## Crawl implementation and human post-edit follow-up (30 October, next pass)

The existing Operator Workspace has a **local-only crawl CMS Decision Desk** (`crawl-cms-decisions.html`, source-bound human statuses and private evidence refs), fresh editable template and optional **two-cycle Crawl/CMS Recheck** (`crawl-cms-recheck.html`, JSON and Markdown). Add `crawl.cmsBaseline` to the current workspace config for the exact previous original private `crawl-cms-worklist.json`; optionally add `crawl.cmsDecisions` for its source-pinned human ledger. The new landing card distinguishes persistent, no longer observed *but never verified fixed*, newly observed and changed-detail/priority issues; owner-reported completion still observed is singled out. All history and outputs remain private, nonexecutable and independent of CMS Save/Publish. Standalone CLI `bin/recheck-crawl-cms-work.cjs` operates directly on two already-saved worklists without recomputing policy or CMS source. See [CRAWL-CMS-LIFECYCLE.md](CRAWL-CMS-LIFECYCLE.md).


## Public HTTPS evidence for crawl fixes

Optionally specify `crawl.publicCapture` alongside `crawl.policy` + the original `cmsBlueprint`/`cmsSite` pair to render an additional **Public HTTPS — Crawl CMS Fix Evidence** view in the SAME workspace. It correlates manual issue IDs with existing read-only public HTTPS GET transcripts: robots permissions by named crawler, complete direct sitemap, canonical 200, robots meta/X-Robots-Tag, approved metadata and canonical. No original page HTML is copied to generated reports. Source SHA256 and separate HTTP delivery blockers remain visible. The only possible task states are `OBSERVED-CONFLICT`, `OBSERVED-ALIGNED-NOT-VERIFIED`, `INSUFFICIENT-EVIDENCE`; NEVER verified task closure or owner approval. Run [CRAWL-PUBLIC-FOLLOWUP.md](CRAWL-PUBLIC-FOLLOWUP.md) for standalone usage and exact lead verification.


## First-client lead handoff and private source packet audit

The **same** existing Operator Workspace now ALWAYS creates a first card for `lead-readiness.html`, plus `lead-readiness.md`, `lead-readiness.json` and `LEAD-PACKET-INTEGRITY.json`, using **only previously compiled, source-checked modules**. This does not add any required fields or second tool. All original configuration combinations continue to work, including crawl-only. The lead's 11 P0/P1/P2 readiness checks distinguish missing prelaunch evidence, operator-reported blockers, lead-required independent checks and deferred postlaunch Google observations. No automatic publication or approval. For local bundle byte consistency, run `node stage3/seo-engine/bin/verify-seo-lead-packet.cjs --bundle /ABS/private/workspace`. It verifies the **unsigned local** SHA256 of all outputs and their original source metadata; it cannot authenticate origin or owner. More at [FIRST-CLIENT-LEAD-READINESS.md](FIRST-CLIENT-LEAD-READINESS.md).
