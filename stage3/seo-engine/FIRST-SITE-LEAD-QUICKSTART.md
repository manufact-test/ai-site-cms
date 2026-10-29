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
