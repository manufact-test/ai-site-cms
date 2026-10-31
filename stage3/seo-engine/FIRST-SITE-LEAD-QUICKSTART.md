## 30 October 2026 — integrated human-review phase

The main first-site session runner now includes `human-review` after `public` or `public-capture`. The public operator workspace links directly to the generated private offline `LIVE-ACCEPTANCE-DESK.html`. After manually observing real browser/device and authorized POST/delivery, export a private filled JSON and invoke the same runner with the source candidate, original postDeploy, original lead relay contract and filled evidence. The runner rechecks the public ZIP/source pins, invokes the strict reviewer, creates next-action files and an HTML `human.html` workspace, then seals output SHA256 in the new session. No auto-approval, client POST, merge or deploy.

```json
{"format":"manufact-seo-first-site-integration-session-config-v1","phase":"human-review","inputs":{"candidate":"/ABS/private/local/candidate","postDeploy":"/ABS/private/public/post-deploy/post-deploy-summary.json","contract":"/ABS/private/public/lead-relay/INTEGRATION-CONTRACT.json","filled":"/ABS/private/filled-live-acceptance.json"}}
```

```bash
node stage3/seo-engine/bin/run-first-site-integration.cjs --config /ABS/private/human-review.json --out /ABS/private/NEW-human --preflight-only
node stage3/seo-engine/bin/run-first-site-integration.cjs --config /ABS/private/human-review.json --out /ABS/private/NEW-human
```

Private results: `live-acceptance-review/`, `operator-workspace/index.html`, `operator-workspace/human.html`, `INTEGRATION-SESSION.json`. The lead must independently authenticate evidence and signoff; operator attestation is not GO.

## 30 October 2026 — one cohesive first-client human acceptance workflow

**Current SEO worker branch delivers an operator-usable first-site acceptance loop**: local PHP form sections are recorded by actual `page`+`sectionId`, a v2 live acceptance template generates a private offline responsive `LIVE-ACCEPTANCE-DESK.html`, and operators can fill browser/device/manual checks and separate real POST versus destination delivery receipts without hand-editing JSON. Download the private filled JSON and run the original strict `first-site-live-acceptance.cjs review`; this produces `live-acceptance-review.json`, `live-acceptance-review.md`, and source-specific `LIVE-ACCEPTANCE-NEXT-ACTIONS.json/.md`. The private SEO operator workspace's `human.html` shows each unresolved browser/manual task and form. Failed forms with **no actual POST** are correctly recorded as failure without invented submission evidence. No automated POST, actual browser verification, authenticated client approval or GO.

After integrating the whole SEO subtree into your own branch, regenerate the **local PHP candidate first**, then the **public/capture** phase and human v2 template; old v1 manual files cannot prove the new source/proof contract. Keep all evidence and HTML editor files outside GitHub. Run the new single focused smoke from your lead checkout:

~~~bash
node stage3/seo-engine/tests/first-site-live-evidence-pipeline-smoke.cjs
~~~

Then conduct real browser, authorized test POST, actual destination confirmation, client signoff and independent review on the exact owner-published PHP/static ZIP. **Only the CMS lead merges/publishes; the SEO worker does not.**

## Final worker handoff update — 29 October 2026

**New actual client-acceptance functionality:** The original local PHP audit `seo-report/bundle.json -> localPhpForms.pages` now controls the mandatory number of **real form POST receipts per public page**, not just a site-wide total. The private human acceptance template pins the PHP bundle SHA256, identifies form expectations per route and rejects receipts on pages where no form was observed, duplicated route+form IDs, and excess receipts. The private `human.html` workspace displays each source-bound page's actual confirmed/expected receipt count and refuses manipulated totals. An all-pass operator attestation still does **not** prove real client signature or grant deployment authorization.

**Session integrity:** New `lib/first-site-session-source-pin.cjs` and smoke freeze all direct private owner/evidence inputs, original PHP summary/bundle, upload manifest and public ZIP before local/public HTTPS stages and rehash them before writing `INTEGRATION-SESSION.json`. If any input changes, the **new private session** is discarded rather than presenting stale mixed-release evidence. Standalone real-world human CLI also rechecks the edited observations and re-verifies ZIP + static upload bytes before promoting its reviewed output. No public POST, CMS write, merge, PR or hosting deploy.

**Mandatory next action:** The lead branch still does not contain these SEO workflow files; only the CMS lead should integrate the SEO subtree and run focused Node smokes, followed by a real owner-published Site v1 / Approved Site v2 / PHP/HTTPS/browser/form client acceptance. No worker CI runs or full Node live client verification can be claimed. See [SEO-WORKER-FINAL-TRANSFER-2026-10-29.md](SEO-WORKER-FINAL-TRANSFER-2026-10-29.md) and [FIRST-SITE-LEAD-QUICKSTART.md](FIRST-SITE-LEAD-QUICKSTART.md).

## 29 October 2026 — Real client public capture workflow

**New recommended public read-only mode:** [PUBLIC-CAPTURE-QUICKSTART.md](PUBLIC-CAPTURE-QUICKSTART.md). `run-first-site-integration.cjs` now supports `phase: "public-capture"` after an explicit lead-owned manual deployment. It first verifies owner-published site/version/revision, official static manifest and every byte of original candidate/ZIP *without network access*. Only then it performs safe DNS-pinned TLS-verified HTTPS GET and media SHA256 capture, existing public verification, source-bound lead relay, unfilled real device/form acceptance and private dashboard in one new session folder. `INTEGRATION-SESSION-HANDOFF.md` is generated as a human-readable companion to the JSON. This is not a production deploy, client signoff or actual form POST. Focused offline smokes exist; full Node/real client acceptance must be done in the lead-integrated checkout.

# SEO Engine → CMS lead: first real client site QUICKSTART

Date: 2026-10-29. **This is a lead-owned integration task, NOT worker authorization to deploy or merge.** Worker branch: feature/site-seo-engine. Worker has edited only stage3/seo-engine/**. All CMS/Studio/SDK/server, public host, publication and PR/merge responsibilities remain with the lead.

## 0. Integrate once into the lead's checkout

The SEO worker has no PR and must not modify the lead branch. In your own authenticated checkout, independently inspect the current worker HEAD, HEAD of feature/stage3-ai-site-contract and GitHub Compare. If and only if the directory is not already being independently edited, bring in the whole worker-owned subtree:

~~~bash
git fetch origin feature/site-seo-engine feature/stage3-ai-site-contract
git status --short
git diff --name-status origin/feature/stage3-ai-site-contract...origin/feature/site-seo-engine -- stage3/seo-engine
# LEAD DECISION ONLY: inspect first, then integrate without overwriting your work
git restore --source origin/feature/site-seo-engine --staged --worktree stage3/seo-engine
~~~

If your branch already contains modifications to the SEO subtree, do not blindly restore: reconcile them manually. The above is documentation for the lead, NOT a command this SEO worker ran. Source roots in Git/CI contain only code, fixtures and documentation; client data must remain private.

## 1. Verify only necessary Node contracts

Run once after integration into the actual lead checkout (Node 20+):
~~~bash
node stage3/seo-engine/tests/first-site-lead-relay-smoke.cjs
node stage3/seo-engine/tests/first-site-integration-session-smoke.cjs
node stage3/seo-engine/tests/first-site-live-acceptance-smoke.cjs
node stage3/seo-engine/tests/first-site-live-acceptance-workspace-smoke.cjs
~~~
These are offline contracts, not PHP/Chromium/client proof. Only run the full real PHP/renderer check when a real published owner site is ready. Don't spend the project budget on hundreds of synthetic tests.

## 2. Real owner source + PHP/static export
The lead needs:
- Real owner-authenticated GET /api/sites/SITE-ID/published-site with saved Site v1, version and sourceRevision.
- Sealed Approved Site v2 directory including original source SHA256, client-approved prototypes and source docs.
- Exact raw approved SEO Blueprint matching siteId/route map.
- Official PHP static export from the exact currently published revision.
- Real localhost PHP PublicRenderer at http://127.0.0.1:PORT/published/SITE-ID/.
- Approved target HTTPS hostname and host provider selection; signed forms/secure external collector if the static site has forms.

Do not manufacture client approval, CDN response or GSC data to make a test pass.

## 3. Prepare candidate and source-bound operator files in ONE run
Start with FIRST-SITE-INTEGRATION-SESSION.md local private JSON config and --preflight-only. Then run the same CLI without preflight flag. Outputs:
candidate/static-upload/public/ — only directory eligible for later lead-controlled manual upload;
candidate/public-site.zip — independently CRC32+SHA256-verified public-only archive;
candidate/seo-report/ — actual localhost PHP technical acceptance, blockers, page/device worksheet;
lead-relay/INTEGRATION-CONTRACT.json — version, source SHA256, official static manifest, ZIP SHA256 and unresolved gates;
human-acceptance-template/ and operator-workspace/ — real manual work queue and private HTML cockpit;
INTEGRATION-SESSION.json — exact source/output fingerprints and explicit no-auto-release flags.

At this stage it is OFFLINE/LOCAL. A lack of technical blockers still does not mean GO.

## 4. Lead-only publish, read-only public verification and real client checks
Only lead/operator decides if and when to deploy the exact approved verified ZIP/public folder. Independently authenticate TLS/DNS, 200/301/404, robots/sitemap/canonical, actual media GET SHA256, private file exposure, browser screenshot fidelity and live form POST/persistence/mail/Telegram, consent, accessibility and privacy. Run the documented public private session on the captured HTTPS reports. It creates an independent post-deploy verdict and live-acceptance-template with every public page × desktop/tablet/mobile.

After actually inspecting the website, populate the original human template with PRIVATE evidence references and real form receipts; run first-site-live-acceptance.cjs review. Even "OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION" is not GO or a verified client signature. Lead confirms client approval separately.

## 5. Real Search Console follow-up
When the site is genuinely published and Google has real property/export data, collect actual Search Performance periods and URL indexing observations, keeping GSC property, HTTPS origin, exact raw Blueprint SHA256, dates and reporting scope. Use the same first-site session in search phase, optionally supplying liveAcceptanceReview and liveAcceptanceContract to display launch + real browser/form acceptance + search/indexing as one private operator workspace. Missing URLs remain UNKNOWN, never Google "excluded".

## Existing source and dependency boundaries
If the actual first client is not yet available, report exactly which missing evidence prevents acceptance; do not claim a live site. No worker PR, merge, hosting deploy, CMS Save/Publish or actual browser/form testing was performed. Avoid expanding the SEO engine until first live-client evidence identifies concrete gaps.

Detailed docs: FIRST-SITE-INTEGRATION-SESSION.md, LIVE-ACCEPTANCE-WORKFLOW.md, LEAD-INTEGRATION-RELAY.md, FIRST-SITE-RUNBOOK.md, STATIC-LAUNCH-WORKFLOW.md, SEO-OPERATOR-WORKSPACE.md, INTEGRATION-HANDOFF.md.
