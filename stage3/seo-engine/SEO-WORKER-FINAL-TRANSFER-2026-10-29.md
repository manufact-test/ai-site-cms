# MANUFACT AI Site CMS — FINAL SEO WORKER TRANSFER

**Date:** 2026-10-29. **Scope:** SEO Intelligence & Blueprint Engine only. **Repository:** https://github.com/manufact-test/ai-site-cms

**Worker branch:** `feature/site-seo-engine` (take the live HEAD from GitHub at the start; no merges/PRs by this worker).
**Exact functional checkpoint before final documentation commits:** `49d8cd5e00572f50cef26357e1c461d126799cb5`; documented checkpoint `5192b34b0a0db83a421388340ff21b2bfdd7297d`. The final documentation commit necessarily moves HEAD again; always inspect actual branch SHA.
**CMS lead branch:** `feature/stage3-ai-site-contract`; actively moving. Last observed lead SHA before final transfer: `53b5899a879a3f0c3147db89f5fde4cf450c6d21` (not a synchronization instruction, only a dated observation). Lead Actions run `40945609871` was PENDING at observation; no fresh success was claimed. Never treat historical successful CI as verification of another commit.

## 1. Your role, ownership and pace

You are the NEW autonomous SEO worker. The CMS lead is the ONLY integrator and owner of PHP/CMS/Studio/SDK/client release. You own **ONLY** `stage3/seo-engine/**`, on **ONLY** `feature/site-seo-engine`. Do not modify GitHub Actions/workflows, CMS PHP, Studio, SDK, root package, the lead branch or main. Do not open PRs, merge, deploy, or commit client/private credentials, forms, GSC exports or live operator data.

The user explicitly requires BIG functional work blocks (roughly 30 minutes of substantial scope, not tiny 10-minute iterations). Build actual client-useful functionality first; avoid spending most of the block on repetitive tests, another status report or speculative abstractions. Perform focused smoke and syntax checks, update useful docs, push commits. Never falsely claim 30 minutes elapsed, full CI, live HTTPS, real POST or client acceptance if not independently established.

## 2. What already works in the SEO subtree

Architecture/Blueprint/approved-site PHP review, real localhost PHP HTML/technical checks, static upload/public archive ZIP integrity, provider headers/redirects, source-approved release gates, private launch cockpit, post-deploy HTTPS/media SHA review, Search Console performance/indexing/history, CMS action packets and release follow-up.

The recent major first-client integration provides:

1. `bin/run-first-site-integration.cjs`: three original private local/public/search phases + new `public-capture`. All phases build real source-pinned lead relay and operator workspace, and return private `INTEGRATION-SESSION.json` plus `INTEGRATION-SESSION-HANDOFF.md`.
2. `public-capture` invokes EXISTING hardened GET-only `capture-public-https.cjs`, explicit DNS public-IP and pinned TLS hostname check, GET SHA256 of official originals/responsive variants, root recheck, existing `verify-deployed-site.cjs`, source relay and human acceptance template. **Never automatically deploys or POSTs.**
3. `lib/first-site-candidate-preflight.cjs`: independently checks original owner-published version/sourceRevision, sealed source, static manifest and verified public-only ZIP before public GET. Executable session `--preflight-only` is network-free.
4. `lib/first-site-session-source-pin.cjs`: SHA256-pins private direct evidence, owner JSON, approved handoff/official manifest, local PHP summary/bundle, upload ledger and ZIP; refuses source mutation before final handoff and deletes only the newly created incomplete session.
5. `lib/first-site-live-acceptance.cjs`, `bin/first-site-live-acceptance.cjs`: REAL browser/device/manual checklist and operator form POST/delivery receipts. Newly wired to `seo-report/bundle.json -> localPhpForms.pages[]`; exact number of receipts must be present on **each actual published page**, and private PHP bundle SHA is pinned. Aggregate-only count cannot mask an untested contact form.
6. `lib/first-site-live-acceptance-view.cjs` and original private `seo-operator-workspace.cjs`: show missing/failed browser/manual checks, expected vs operator-attested form receipts per page and release fingerprints. Still `releaseAuthorized:false` and `clientApprovalAuthenticated:false`.

## 3. Last functional changes from departing SEO worker

- Added original PHP review bundle cross-check against source PHP summary, source hash, actual static route map and blocker IDs.
- Added per-page real POST receipt coverage, duplicate/excess/formless-page rejection, manual signed inventory and private HTML page-by-page deficit presentation.
- Added source snapshots before and after multi-stage local/public/search session to detect owner source, evidence or ZIP drift.
- Added re-read of manually edited acceptance JSON and second verified archive/public byte pass before committing a private human acceptance result.
- Updated focused synthetic tests and source-to-lead handoff/runbooks.

## 4. Verification boundary — read carefully

Focused pure contract smoke tests were executed in an isolated V8 adapter: first-site integration phase plan PASS, candidate preflight PASS, lead relay PASS, human per-page form acceptance PASS, private human workspace PASS. Source pin was also exercised using simulated filesystem/hash: original snapshot accepted, mutated public ZIP rejected. New JS source syntax parsed. **This is NOT the same as a real Node require/FS/network integration test**. This SEO branch has no GitHub Actions runs. A full integrated Node test and real PHP/TLS/browser/form delivery validation remain with lead checkout.

Use the following focused Node smokes after lead integration:

```bash
node stage3/seo-engine/tests/first-site-candidate-preflight-smoke.cjs
node stage3/seo-engine/tests/first-site-integration-session-smoke.cjs
node stage3/seo-engine/tests/first-site-session-source-pin-smoke.cjs
node stage3/seo-engine/tests/first-site-live-acceptance-smoke.cjs
node stage3/seo-engine/tests/first-site-live-acceptance-workspace-smoke.cjs
node stage3/seo-engine/tests/first-site-lead-relay-smoke.cjs
```

These tests are synthetic only and should NOT dominate development time.

## 5. Real-client next actions and ownership

**Lead only:** integrate the `stage3/seo-engine` subtree into the lead checkout after inspecting GitHub Compare; on last observation the lead branch did **not** contain the new worker integration CLI or live acceptance module. The lead authenticates the current owner published Site v1 JSON + sourceRevision, sealed Approved Site v2 and raw approved Blueprint, generates official PHP static export, runs PHP at localhost, then `run-first-site-integration.cjs` local with network-free preflight. Lead manually decides to deploy the verified PUBLIC ZIP, then runs `public-capture` against authorized real HTTPS host, followed by actual browser desktop/tablet/mobile and form POST/persistence/email or Telegram delivery receipts and real client signoff. On real GSC exports, use `search` follow-up. Never manufacture evidence.

**SEO worker:** once new chat begins, check live HEADs; do not touch lead branch; first look for a concrete first-site integration bug discovered from the lead's focused Node/local/live evidence. If the lead has not yet integrated or no genuine first client data exist, continue only meaningful SEO-domain functionality, not redundant reporting/testing or fictitious Google observations. Eventually hand over clean source and exact branch SHA.

## 6. Canonical files — read these first

- `FIRST-SITE-LEAD-QUICKSTART.md`: shortest complete CMS lead integration path.
- `PUBLIC-CAPTURE-QUICKSTART.md`: explicit real HTTPS GET-only session configuration.
- `FIRST-SITE-INTEGRATION-SESSION.md`: all local/public/public-capture/search modes with precise input/output.
- `LIVE-ACCEPTANCE-WORKFLOW.md`: actual per-page form POST and browser/manual receipts.
- `INTEGRATION-HANDOFF.md`, `LEAD-INTEGRATION-RELAY.md`: lead responsibilities and SHA source binding.
- `SEO-OPERATOR-WORKSPACE.md`: private launch/GSC/human dashboard.
- `README.md`: current module map.
- `SEO-WORKER-TRANSFER-2026-10-29.md`, `SEO-WORKER-NEXT-CHAT-START.md`: incremental handoffs.

## 7. Things NOT done

Worker did not open PR/merge, change lead code, publish to host, run full Node CI, access real client owner API, verify actual HTTPS production DNS/TLS independently, submit forms, authenticate recipient delivery, or receive final client approval. `OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION` is not GO. All client evidence belongs only in a protected operator workspace outside GitHub.

**First task for new SEO chat:** verify HEAD and read the exact source + current lead branch. Continue a large functional SEO-only block, preferably close the first genuine integration failure the lead found, and then communicate SHA, practical result, blockers and handoff. No clarifying-question loop if available data already determines work.
