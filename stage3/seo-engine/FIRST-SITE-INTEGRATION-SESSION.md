# First-site integration session — practical lead-run workflow

Date: 2026-10-29. Scope: stage3/seo-engine/** only. Lead owns CMS, PHP, deployment, client approval and integration. This is not automatic publishing.

## 1. Inputs
All private paths are absolute, outside the checkout, nonsymlink sources. The output directory must be new, with an existing parent. Lead provides owner-authenticated GET /api/sites/SITE-ID/published-site JSON with site, version and sourceRevision, sealed Approved Site v2, raw Blueprint, official static export and localhost running PHP. Source revision and official export version must match. Never put GSC, lead submissions, HMAC, client sources or operator notes in GitHub.

## 2. Local phase (approved → PHP → verified public ZIP → relay → cockpit)

Private config /ABS/private/local.json:
~~~json
{
  "format":"manufact-seo-first-site-integration-session-config-v1",
  "phase":"local",
  "inputs":{
    "approvedSite":"/ABS/private/sealed-v2",
    "publishedSite":"/ABS/private/owner-published.json",
    "blueprint":"/ABS/private/approved-blueprint.json",
    "origin":"http://127.0.0.1:9000/published/site-id/",
    "staticExport":"/ABS/private/official-export",
    "provider":"netlify"
  }
}
~~~
Optional keys when ACTUAL owner evidence exists: ownerEditReview, phpCapture, previousReport, previousUpload, publicHttpEvidence, publicMediaEvidence, publicMediaDigests, deliveryStatus, visualReviewStatus, approvalArchiveIndex. Never invent approval archive or form recipients.

Read-only source preflight WITHOUT a PHP request and WITHOUT creating output:
~~~bash
node stage3/seo-engine/bin/run-first-site-integration.cjs --config /ABS/private/local.json --out /ABS/private/NEW-local --preflight-only
~~~
Execute actual localhost GET capture and offline verification:
~~~bash
node stage3/seo-engine/bin/run-first-site-integration.cjs --config /ABS/private/local.json --out /ABS/private/NEW-local
~~~
Output:
- candidate/local-php-evidence and candidate/seo-report: actual locally observed PHP/site data, blockers, page/device worksheet
- candidate/static-upload/public and candidate/public-site.zip: verified PUBLIC-only upload assets, only eligible for MANUAL operator deployment
- lead-relay/INTEGRATION-CONTRACT.json and LEAD-NEXT-ACTIONS.md: sealed source/owner version/manifest/ZIP SHA256 and human next steps
- human-acceptance-template/first-site-operator-template.json: source-summary-pinned UNFILLED manual ledger
- operator-workspace/index.html: private launch dashboard
- INTEGRATION-SESSION.json: source and generated result hashes, phase and explicit releaseAuthorized:false

## 3. Public phase (manually deployed host → actual HTTPS receipts → human acceptance template)
The lead alone deploys the approved public upload and captures real TLS/HTTPS, robots/sitemap, 301/404, public media GET SHA256, exposed private file probes. This tool consumes operator-supplied transcripts; it does not make public requests.

Config /ABS/private/public.json:
~~~json
{
  "format":"manufact-seo-first-site-integration-session-config-v1",
  "phase":"public",
  "inputs":{
    "candidate":"/ABS/private/NEW-local/candidate",
    "approvedSite":"/ABS/private/sealed-v2",
    "publishedSite":"/ABS/private/owner-published.json",
    "staticExport":"/ABS/private/official-export",
    "publicHttpEvidence":"/ABS/private/captured-public-https.json",
    "publicMediaDigests":"/ABS/private/captured-public-media-get-sha256.json"
  }
}
~~~
Optional: publicMediaEvidence, ownerEditReview, previousPublicHttp, previousPublicMediaDigests.
~~~bash
node stage3/seo-engine/bin/run-first-site-integration.cjs --config /ABS/private/public.json --out /ABS/private/NEW-public
~~~
Output: post-deploy/post-deploy-summary.json, lead-relay source contract, live-acceptance-template/live-acceptance-template.json, operator-workspace/index.html and INTEGRATION-SESSION.json. Real PHP blockers and public HTTPS mismatches stay blocking; a completed offline stage cannot claim GO.

## 4. Real browser, actual forms and explicit client signoff
Read LIVE-ACCEPTANCE-WORKFLOW.md. The generated live template covers EVERY public content route x desktop/tablet/mobile and required accessibility, real HTTPS/TLS provenance, privacy, actual form POST/delivery, client approval and rollback evidence. The operator edits an external private copy and passes it to:
~~~bash
node stage3/seo-engine/bin/first-site-live-acceptance.cjs review --candidate /ABS/private/NEW-local/candidate --contract /ABS/private/NEW-public/lead-relay/INTEGRATION-CONTRACT.json --post-deploy /ABS/private/NEW-public/post-deploy/post-deploy-summary.json --filled /ABS/private/operator-edited-live-acceptance.json --out /ABS/private/NEW-live-review
~~~
No JS here sends a real POST, performs visual/browser inspection or authenticates client approval. Even all checked observations require independent owner authorization.

## 5. Search phase after actual launch and real GSC property/exports
Use existing Search Indexing and Search History commands to make actual private reports, then config:
~~~json
{
  "format":"manufact-seo-first-site-integration-session-config-v1",
  "phase":"search",
  "inputs":{
    "candidate":"/ABS/private/NEW-local/candidate",
    "postDeploy":"/ABS/private/NEW-public/post-deploy/post-deploy-summary.json",
    "blueprint":"/ABS/private/approved-blueprint.json",
    "indexing":"/ABS/private/indexing-intelligence.json",
    "searchHistory":"/ABS/private/search-history.json"
  }
}
~~~
Either indexing or searchHistory may be omitted, but not both. The original raw Blueprint SHA256, siteId, owner release and HTTPS host must agree across evidence. Missing/sample GSC URLs NEVER establish full index coverage.
~~~bash
node stage3/seo-engine/bin/run-first-site-integration.cjs --config /ABS/private/search.json --out /ABS/private/NEW-search
~~~
Output: fresh lead relay and private HTML workspace, no CMS edits/Google auth.

## Operational boundaries
A failed stage cleans up only its NEW private session directory. It never mutates owner data or attempts PR, merge, deploy, public POST, Google URL inspection or client acceptance. Local phase DOES issue real loopback PHP GETs, whereas public/search phases only read supplied files. Do not confuse operator-provided public HTTP receipts with verified TLS provenance. A real first-client checkout, PHP/Chromium and real host are mandatory.

Focused smoke in lead-integrated Node 20+ checkout:
~~~bash
node stage3/seo-engine/tests/first-site-integration-session-smoke.cjs
node stage3/seo-engine/tests/first-site-live-acceptance-smoke.cjs
node stage3/seo-engine/tests/first-site-lead-relay-smoke.cjs
~~~
These are offline contract checks only; no full end-to-end CI or real customer acceptance is claimed for isolated worker branch.

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

Example search phase extension: add "liveAcceptanceReview":"/ABS/private/live-acceptance-review.json" and "liveAcceptanceContract":"/ABS/private/public-phase/lead-relay/INTEGRATION-CONTRACT.json" to the search inputs. Both required together, omitted when review is pending.
