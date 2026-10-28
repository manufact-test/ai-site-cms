# AI Site CMS SEO Engine — integration handoff (28 October 2026)

## Latest final worker batch: complete one-pass local first-site acceptance

Run [FIRST-SITE-RUNBOOK.md](FIRST-SITE-RUNBOOK.md) from a *lead-integrated* Node 20+ checkout. New `bin/first-site-check.cjs` validates the sealed Approved Site v2 and source-matching Blueprint, captures actual local PHP HTML, robots/sitemap/301 and all original/variant binary media in one source-bound evidence directory, then calls the EXISTING `PACKAGE.build` and writes independent `summary.json`, `bundle.json` and `handoff.md`. CLI flags: `--approved-site /ABS/sealed --blueprint /ABS/approved-blueprint.json --origin http://127.0.0.1:PORT/published/SITE-ID/ --evidence /ABS/new-evidence --report /ABS/new-report`. Evidence/report directories must not exist beforehand. No PHP server launch, CMS edits, release approval, PR or deploy.

New `lib/php-local-head.cjs` preserves bounded observed response headers from actual PHP page GET and audits X-Robots-Tag indexation, CSP presence, canonical/og:url route and origin consistency with sitemap. All php-head errors/warnings enter the same remediation, release gate, bundle and lead dossier. The PHP PublicRenderer's official local `http://localhost`/`http://127.0.0.1` public-origin configuration is now handled by `lib/php-local-publication.cjs` and `lib/php-local-media.cjs` without falsely asserting real public HTTPS. A malformed/mixed-origin sitemap no longer claims complete enumeration. The synthetic real-localhost smoke now also tests development origin, header/CSP, wrong canonical/og:url and X-Robots noindex.

**Validation limits:** modified JS files were syntax-checked. The full Node subprocess smoke/CI, real client sealed package, real published PHP source-revision identity, browser fidelity, forms and production HTTPS remain unexecuted/unproven; the lead must run them before release. After integration prioritize failures on first real site over further generic SEO feature work.

## Ownership and repository state

- Repository: `manufact-test/ai-site-cms`; branch `feature/site-seo-engine`.
- Worker may modify **only** `stage3/seo-engine/**`. No changes to main, production, lead files, former Design Factory, `docs/`, `handoffs/`, SDK, PHP renderer, Studio or `.github/`.
- Use current GitHub worker branch HEAD for the latest commit; old handoff commit references are historical.
- No direct integration, PR merge, live deployment, CMS writes, database updates, AI provider, ranking crawler or independent SEO editor.

## What now exists

1. **Research → canonical SEO Blueprint**: `lib/blueprint.cjs` accepts owner facts (confirmed/unverified), audience and language, sources, page intent/topics, page map, outlines with H1/section ordering, CTA/cross-links, meta/OG, indexation and canonical *proposals*, image/alt purposes, responsive narratives, and conditional structured-data candidates. `lib/explain.cjs` gives the SEO/UX portion of the client's prototype presentation. Two different project fixture families.
2. **Plan architecture**: `lib/architecture.cjs`, `lib/content-intelligence.cjs` check planned navigation, paths, canonical/indexation conflicts, overlapping intent, content phrase evidence, authored CTA/anchor relationships, substantial duplicate body, shared media ALT intent, and sections requiring editorial judgment. No invented keyword data.
3. **Actual Site v1**: `lib/analyze.cjs` imports **existing** `stage3/sdk/contract.cjs` `validateSite`, `inspectSite`, `registry`. It adds plan-to-implementation issues keyed by stable IDs. `lib/field-proposals.cjs` only proposes unambiguous manifest-allowed heading/CTA edits with version and before-value guards. `lib/handoff.cjs` separates editable SEO field changes, unverified facts, and work requiring the lead.
4. **Trusted static export**: `lib/analyze.cjs` `snapshotAudit`, `lib/parity.cjs`, `lib/html-evidence.cjs` examine explicitly supplied HTML. `completeness=complete` is required before an export-absent target is classified as broken; default is partial/unknown. Checks include heading and link evidence, semantic landmarks, duplicate IDs, language/viewport hints, labels, alt, static JSON-LD candidates and metadata vs Site v1. This is not a live browser or crawler.
5. **Three-device markup checks**: `lib/viewport-evidence.cjs` compares captured heading/route/CTA/landmark evidence and names planned pages missing in the capture set. Never claim screenshot/visual/performance checks were done.
6. **Regression, work queue and release**: `lib/regression.cjs` compares two core-validated Site v1 documents; `lib/remediation.cjs` produces stable, non-executable task IDs, work phases, owners, evidence, dependencies and priorities; `lib/release-review.cjs` keeps manual acceptance mandatory. `lib/reporter.cjs` renders Markdown with untrusted text escaped.
7. **One integration envelope and decisions**: `lib/package.cjs` builds a `manufact-seo-review-bundle-v1` with coverage, analyses, handoff, backlog, release gate, Markdown and next tasks. `lib/triage.cjs` records approved/rejected/deferred **human decisions** and flags stale field values, never mutates anything.

## Exact integration contracts

- Site v1 `stage3/schemas/site-v1.schema.json`: validated by existing SDK (read-only).
- Editable page `seo`: `title` (160), `description` (300), `robots` (index/noindex), `ogTitle` (160), `ogDescription` (300), `ogImage` (known image asset ID). Proposals only: no live apply. `ogImage` is not auto-fabricated from an editorial intention.
- `assets[].alt` belongs to a shared asset, so a per-context ALT suggestion cannot blindly overwrite it globally.
- `stage3/server/PublicRenderer.php` outputs Title, Description, OG, robots, self-canonical when public origin set, indexed-only sitemap and robots.txt. Source-level checks do not prove actual HTTP deployment. Arbitrary canonical override, general Schema.org JSON-LD and `hreflang` are **not guaranteed supported** by Site v1.
- Structured data: a confirmed fact only makes a candidate eligible **for further review**. The engine must never assert rich-result eligibility or publish claims without actual markup and page-content checks.
- The module cannot approve or produce the three static design pictures, prove actual responsiveness or working forms, certify SEO ranking or performance, or replace browser/manual acceptance.

### Lead usage

```bash
node stage3/seo-engine/tests/smoke.cjs

node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle \
  --site stage3/fixtures/industrial-site.json \
  --blueprint stage3/seo-engine/fixtures/industrial.blueprint.json \
  --snapshot stage3/seo-engine/fixtures/industrial.html.snapshot.json \
  --viewports stage3/seo-engine/fixtures/industrial.viewports.json \
  > /tmp/seo-review.json

node stage3/seo-engine/bin/seo-blueprint.cjs remediation-md \
  --site stage3/fixtures/industrial-site.json \
  --blueprint stage3/seo-engine/fixtures/industrial.blueprint.json \
  > /tmp/seo-tasks.md
```

If the lead has a previously saved Site v1 version, add `--before previous-site.json` to review/plan/release commands. If they have actual project-specific manifests, pass `--manifests <directory>`. Review every proposal's target ID, manifest and `expectedBefore` against saved overrides and current CMS before any editor change.

## Verification status — do not overstate

- Function-level checks under V8 shims: **passed** for real Site v1 validator with current component manifests, partial-vs-complete HTML link handling, assembled review bundle, stale/approved ledger and three-device coverage. Previous passes also covered schema candidate/viewport/CTA regression evidence. These checks do not substitute for a Node process.
- The single `tests/smoke.cjs` includes an offline CLI E2E across plan compilation, Site v1, HTML, viewport, regression, release, unified bundle and decision ledger. **The actual Node CLI smoke and GitHub CI were NOT executed in this environment**; the next chat/lead must execute it from a real Node checkout before accepting the module.
- No PR/merge/deploy or real production website/HTTP/browser acceptance has occurred.
- A test PASS is code-level evidence only, not proof of visual quality, customer approval, crawl/indexation or actual SEO outcomes.

## Integration sequence and the remaining work

1. Run the real Node smoke in the repository checkout; fix any genuine compatibility failures **within SEO-owned files**. Don't spend days writing microtests.
2. Check and adapt to *current* Site v1 component manifests, PHP renderer, Studio and any changes from the lead since this branch was created; record only grounded compatibility issues. Keep versions immutable.
3. Validate the end-to-end flow on **one** approved 3-image prototype / first actual Site v1 site with the lead. SEO plan must be carried into the prototype and real site; no standalone demo/template factory.
4. Provide the lead with the complete `review-bundle` and read-only field proposals; identify which requested changes are within existing CMS fields versus lead-only canonical/schema/publisher work.
5. Leave browser/HTTP/mobile/performance, form delivery, manual overrides, publish/rollback and SEO outcomes to actual real-site acceptance. No auto-release.

Primary sources and official norms: `research/PRIMARY-SOURCES.md`. For next worker instructions, see `NEXT-CHAT-HANDOFF.md`.

## Publication acceptance batch: three integrated workstreams (28 October 2026)

**1. Supplied HTTP transcript and publication integrity:** `lib/delivery-evidence.cjs`, `schemas/delivery-evidence-v1.schema.json`, example `fixtures/industrial.delivery.evidence.json`, CLI `delivery-review`. Supplied page statuses/headers, public HTTPS origin and mount, X-Robots-Tag, canonical, robots, and direct XML urlset are checked against Site v1. Sitemap indexes remain unenumerated, not silently complete. Findings connect to review-bundle, remediation and release blockers.

**2. Decision-aware dependency execution:** `lib/execution-plan.cjs`, CLI `execution-plan` and `execution-plan-md`. Human approved, undecided, deferred, rejected, stale and dependency-blocked tasks are tracked separately. Approval never marks a task completed; a remaining dependency blocks its children. `review-bundle.executionPlan` and the appended Markdown give the lead one comprehensive handoff.

**3. Public OG and media delivery evidence:** `lib/media-delivery.cjs`, `schemas/media-evidence-v1.schema.json`, CLI `media-review`. Verifies supplied asset response status, Content-Type, URL/mount, media reference, and `og:image` against actual Site v1 asset IDs. Media failures become release gate conflicts. Shared asset ALT is not rewritten or inferred.

Example from repository root (real Node 20+ checkout):

```bash
node stage3/seo-engine/bin/seo-blueprint.cjs delivery-review --site stage3/fixtures/industrial-site.json --delivery stage3/seo-engine/fixtures/industrial.delivery.evidence.json
node stage3/seo-engine/bin/seo-blueprint.cjs execution-plan-md --site stage3/fixtures/industrial-site.json --blueprint stage3/seo-engine/fixtures/industrial.blueprint.json --delivery stage3/seo-engine/fixtures/industrial.delivery.evidence.json
node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle --site stage3/fixtures/industrial-site.json --blueprint stage3/seo-engine/fixtures/industrial.blueprint.json --snapshot stage3/seo-engine/fixtures/industrial.html.snapshot.json --delivery stage3/seo-engine/fixtures/industrial.delivery.evidence.json
```

For a project with Site v1 image assets, provide a JSON document conforming to `schemas/media-evidence-v1.schema.json` and supply `--media /path/media.json` to `media-review` or the existing review/triage/release commands. `--decisions /path/triage.json` links explicit editor decisions to the execution plan. Synthetic industrial fixtures are NOT real live website recordings.

**Verification limits:** changed CommonJS source syntax was checked; targeted V8 checks used actual industrial fixture data and a test URL shim. A clean synthetic HTTP recording had no critical errors; supplied 404, noindex response header, and missing sitemap route produced expected conflicts; a missing OG asset also produced an error. The execution planner distinguished approved, dependent and rejected work. **No actual Node subprocess CLI smoke, GitHub CI, live HTTP request or production browser verification was performed.** The lead must run `node stage3/seo-engine/tests/smoke.cjs` on a complete checkout and perform actual browser/host/manual acceptance.

**Boundary:** worker writes `stage3/seo-engine/**` only. No merge, deploy, PR, CMS mutation or auto-approval.


## First real-site integration workstream: execution safety and capture confidence (28 October 2026)

Additional worker-owned modules now form a lead-ready, read-only workflow:

1. `lib/capture-plan.cjs` + CLI `capture-plan --site ... --blueprint ... [--origin https://host/mount/]` creates the request manifest for every actual Site v1 route, media asset, robots/sitemap candidate, three device markups, screenshot comparison and human acceptance. URL values require an explicit approved HTTPS public origin; without it, request URLs remain null. The tool performs **no HTTP calls**.
2. `lib/cms-change-packet.cjs` + CLI `cms-change-packet` / `cms-change-packet-md` turns **approved only** backlog field tasks into non-executable, manually applicable CMS field instructions. It verifies exact ID, blueprint value, site field before-value, manifest version and unresolved dependencies. It includes manual-override/Save/Publish warnings and never writes CMS data. Both JSON and human-readable versions enter `review-bundle`.
3. `lib/evidence-consistency.cjs` + CLI `evidence-consistency` compares two supplied HTML captures (snapshot vs HTTP transcript). Conflicting index/noindex becomes a release blocker; title/canonical/meta/OG mismatches prompt revision review. Caller-supplied HTTP/media origins must agree. Matching static sources never prove actual live origin.
4. `lib/delivery-evidence.cjs` now refuses completeness conclusions from malformed/truncated XML sitemap URL sets; a sitemap index remains unenumerated. Missing HTTP page responses become explicit unverified coverage findings. URLs with tracking query parameters are reviewable drift, not a fatal parsing error. `lib/media-delivery.cjs` only classifies failures of specifically referenced OG assets as OG release blockers; unused asset failures remain review work.

Recommended integrator sequence:

```bash
node stage3/seo-engine/tests/smoke.cjs
node stage3/seo-engine/bin/seo-blueprint.cjs capture-plan --site stage3/fixtures/industrial-site.json --blueprint stage3/seo-engine/fixtures/industrial.blueprint.json --origin https://example.test/site/
node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle --site stage3/fixtures/industrial-site.json --blueprint stage3/seo-engine/fixtures/industrial.blueprint.json --snapshot stage3/seo-engine/fixtures/industrial.html.snapshot.json --delivery stage3/seo-engine/fixtures/industrial.delivery.evidence.json
```

The sample origin and transcript are synthetic; replace with owner-approved and independently captured values before drawing conclusions. Add `--decisions` for human approvals; use `cms-change-packet-md` only after reconciling a current ledger and verifying saved CMS override history.

**Verification reality:** targeted real-fixture module checks were run in isolated V8 shims for sitemap, read-only CMS change eligibility, manifest/precondition drift, first-site capture URL mapping, and cross-source indexation discrepancy. New CommonJS sources were syntax checked. **Actual Node CLI smoke was not executable here**: the external container has Node v22 but no repository checkout and cannot resolve github.com to clone. CI result is not claimed. Run on a full local checkout before integration. No merge or deployment, and only `stage3/seo-engine/**` is writable.

## Stage 3 lead acceptance and revision history — major integration batch

- `lib/acceptance.cjs`, `schemas/acceptance-v1.schema.json`: deterministic SHA-256 of approved SEO Blueprint and Site v1, three distinct static image references/hash records and seven explicit manual attestations. CLI: `acceptance-template`, `acceptance-review`. Reviewer identity and evidence URIs are provided assertions, **not authenticated**; any changed revision makes previous signoff stale.
- `lib/task-progress.cjs`: two independent but equally scoped Site v1 authoring backlogs, stable task keys, decision carry-over for the *old* ledger and candidate field closures. CLI: `task-progress --before ... --site ... --blueprint ... [--prior-decisions ...]`. A disappeared task is not automatically a fix.
- Integrated into `review-bundle`; `release-review --acceptance ...` adds blockers for rejected or stale human attestations and displays claimed gate status while preserving `readyToPublish:false`.
- Expanded the single `tests/smoke.cjs` to cover full ledger, stale site revision, rejected check, incomplete attestation, current/historical backlog and closure candidates. **Actual Node subprocess smoke was not run** without a full checkout; run on Node 20+ before integrating.
- Write boundary remains `stage3/seo-engine/**`; no main/SDK/Studio/renderer edits, merge or deploy.

## One-file review dossier for first real site

`lib/lead-dossier.cjs` generates `review-bundle.leadDossier` with prioritized release issues, owner-specific actions, prototype/client approval ledger status, Site v1 revision risk, unresolved task comparison and hypothetical CMS impact. The report is read-only and never implies authenticated acceptance, deployed fixes or permission to release.

`review-bundle-md --site <site.json> --blueprint <plan.json> [--acceptance <ledger.json>] [--decisions <decisions.json>] [--before <site-before.json>]` renders the full portable Markdown handoff. It starts with the lead summary then retains remediation, exact page/section mapping, execution and guarded CMS field proposals.

## Current lead core cross-check (28 October 2026)

The active lead branch `feature/stage3-ai-site-contract` (read-only inspected SHA `88c291dab5e6bea40ccca51ca77a2056b48c10d8`) introduced an additional Site v1 invariant: a `custom-section` must include its Design Graph. That stricter core was used directly in an isolated V8 run: `stage3/fixtures/industrial-site.json` + 3 real component manifests passed authoritative validation and the SEO analyzer returned 13 review findings. No core, server or Studio files were modified.

The current `PublicRenderer.php` resolves OG media from `page.seo.ogImage`, otherwise first legacy `content.media` in section/repeat order, otherwise nested Design Graph image nodes. Worker module `lib/publisher-media.cjs` mirrors that published order for the read-only media and capture reports. A separate fixture with a **valid** `media-story` component, absent explicit OG image and fallback WebP was validated with the updated lead SDK; its synthetic public HTTP 404 was detected as a release-relevant OG failure. The media evidence is a fixture, not a captured live site.

`lib/explain.cjs` now produces a substantive SEO/UX subsection for the client's prototype explanation (all block points, CTA targets, cross-page links, media purpose/ALT intent, desktop/tablet/mobile behavior, owner fact status and exact planned metadata), while explicitly leaving three static pictures, motion, hover/tap/focus, typography and color approvals to the lead specification. No invented visual decisions or ranking promises.

`media-review` also treats unsafe HTTP/javascript/empty OG and Twitter image URLs as errors and mismatched Twitter images as review actions. Full Node subprocess smoke remains unverified until the lead runs the script in a checkout; isolated real-SDK checks are not a CI substitute.


## Big vertical batch — publisher-compatible social SEO + migration + practical client explanation

**Owner-compatible read-only additions:**

1. `lib/publisher-media.cjs` mirrors existing PHP `PublicRenderer.php` social image fallback (explicit `page.seo.ogImage` → first `content.media` in elements/repeated items → nested Design Graph image). `media-delivery` and `capture-plan` share this one selection; an automatically chosen social image can now be release-critical on an actual supplied 404/MIME mismatch. Do not infer a successful live fetch from synthetic evidence.
2. `lib/explain.cjs` outputs a much fuller client-ready SEO/UX description of each approved page, section, content point, CTA route, internal link, three responsive narratives, image/ALT intent, facts and proposed metadata. It explicitly does **not** invent visual styles, interactions, static mockups, ranking gains or claim that a site is built. Lead still owns complete prototype description/spec.
3. `lib/route-migration.cjs`: compares two Site v1 revisions by stable page ID; confirms the existing typed `site.redirects=[{from,to}]` path alias for every renamed page, warns on formerly indexable deleted routes and old authored links, and identifies noindex drift. Its errors join remediation and release gates. CLI: `route-migration --before old.json --site new.json --blueprint plan.json`.
4. `capture-plan --before old.json` emits old-route 301/Location and destination 200/canonical probes with mount-correct expected URLs; `review-bundle.routeMigration` exposes the same decisions and blocks missing redirects.
5. `lib/delivery-evidence.cjs` and schema now accept bounded optional `redirects: [{from,requestUrl,status,location}]` in manually supplied transcripts, including relative Location. The declared Site v1 alias must return **301** and the exact expected destination on approved host/mount; 302, mismatched Location or invalid Location are release blockers. Missing transcript observations remain unverified. All evidence is caller-provided, not authenticated live HTTP.
6. `media-delivery` now checks both OG and Twitter images for unsafe schemes/empty URLs and cross-platform parity. An absent Twitter image or different Twitter target is a review item; invalid unsafe URLs block release.
7. Added `fixtures/industrial.social-fallback.site.json` + media/HTML capture examples; **validated the Site v1 fixture using the actual newer SDK** from lead branch with the real `media-story` manifest, not a fake schema validator. The read-only synthetic 404 social image produces an error. Added coverage for these flows to the existing single Node smoke script.

**Actually executed in the isolated V8 environment:** authoritative current lead SDK `validateSite()` with real component registry on industrial Site v1; SEO `analyze.auditSite()` → 13 issue findings; valid legacy-fallback media example; URL/metadata reviewer; route migration /contact/ → /team/ with no 301 vs declared 301; 301 correct vs supplied 302+bad Location. Source-only static checks have not run PHP, real browser requests, complete Node CLI smoke, or CI. The environment cannot resolve github.com for a Node checkout. The lead should run `node stage3/seo-engine/tests/smoke.cjs` on their checkout before integration.

**Current lead contract drift:** lead ref `88c291dab5e6bea40ccca51ca77a2056b48c10d8` has a stricter `custom-section` requirement: a Design Graph must exist. Worker has not changed or rebased core SDK; later integration must use the actual latest lead validator and manifest registry.

**Write scope and release:** only `stage3/seo-engine/**`; no main, master TЗ, SDK, Studio, server, GitHub Actions, merge, PR or deployment. Core owner approval and actual three-picture client signoff remain required.


## FINAL integration alignment — sealed lead handoff v2, real first-site workflow

**Source checked:** lead branch `feature/stage3-ai-site-contract` at `16346a16413838e5652117471e11f5b37df91cbb` (read only). Between earlier core-check SHA `88c291dab5e6bea40ccca51ca77a2056b48c10d8` and this revision, the lead added sealed approval evidence, a private owner-only approval archive, Studio side-by-side three-device prototype review, package preflight/audit and local public-PHP screenshot capture.

**Do not duplicate this functionality.** The lead's approved-source evidence is **`manufact-approved-site-handoff-v2`**, a folder with original `site.json`, mockup images, client explanation, implementation specification, media and file-level SHA-256. It may also contain extra per-page approved prototype triplets. The actual `stage3/bin/verify-approved-site.cjs` checks sealed bytes, Site v1 contract, prototype MIME and asset integrity. The lead's import is an explicitly authorized draft, not SEO publication.

The SEO worker's `manufact-seo-acceptance-v1` is **additional human SEO evidence** only. Its `siteSha256` is a canonical parsed-object SHA-256, **not** the raw `site.json` byte hash in the sealed package. It must not be compared as though the digests are interchangeable or represented as client authentication. The SEO tool never executes the lead's PHP runner or image verifier. Real prototype verification and final publishing remain solely with the lead and site owner.

### Recommended first-real-site handoff

1. Lead gathers actual client-approved folder, three required images (and per-page references if appropriate), written client explanation, implementation specification and site source. Verify v2 source with `node stage3/bin/verify-approved-site.cjs /ABS/approved-site`. Do not create invented signoffs.
2. External AI/lead maintains the SEO Blueprint from verified owner facts and approved page information. `node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle-md --site /ABS/approved-site/site.json --blueprint /ABS/seo-blueprint.json > /ABS/seo-review.md` provides source-only SEO review and all missing-evidence requests. The standalone SEO ledger is optional supplementary review, not an import artifact.
3. Lead uses its already-implemented `stage3/bin/audit-approved-site.cjs` and, if and when owner-authorized locally published PHP site exists, `stage3/bin/capture-approved-site.cjs` to obtain real screenshots. The SEO engine consumes separately supplied HTML/viewport/HTTP/media observations only with honest provenance disclaimers.
4. After approved CMS field changes, use `task-progress --before ... --site ...` and `route-migration --before ... --site ...`, and review exact declared Site v1 redirects and saved overrides. `capture-plan --before ...` lists 301, canonical, media and viewport items not independently captured.
5. Lead manually verifies actual content/rendering/forms/performance, authorizes Save vs Publish and closes the release. SEO's `readyToPublish:false` is intentionally permanent.

### Final cleanup of this SEO-worker batch

- **CMS field safety:** CTA labels/destinations in `cms-change-packet` now require *exactly one* manifest-declared CTA candidate, exactly one corresponding heading, matching real target route and current field preconditions. Ambiguous candidates are blocked, not guessed.
- **Historical redirect protection:** `route-migration` now detects removed **previous** 301 aliases as review items, even if no current page was renamed. It produces retired-alias human HTTP probes, never an automatic redirect.
- **Change-preview conservatism:** `change-impact` now highlights *introduced/escalated SEO warnings* as review-worthy, not just blocker/error severity, while continuing to simulate only in memory.
- **First-site dossier:** `lead-dossier.evidenceRequests` specifies missing artifact categories, owner/reason/affected pages for real manual signoff, HTML/device coverage, public HTTP/media and 301 captures. All flags stay unverified without live collection.
- **Smoke fix:** the full Node smoke explanation assertion is now case-insensitive for "Mobile", matching the expanded client-facing document. More full smoke validation is needed on a checkout after lead integration.

**Actual check status:** isolated module logic and a real current-lead SDK sample have been exercised in V8, and the worker branch syntax/import graph was validated. A full Node 20 smoke subprocess, GitHub Actions test suite, binary image integrity test, PHP renderer/browser run and deployed live-host check **were not performed by the SEO worker**. The next chat should first run `node stage3/seo-engine/tests/smoke.cjs` in a complete checkout, fix any genuine failures only inside owned path and then perform one real first-site integration batch. Do **not** spend the next sprint polishing existing offline diagnostics without first-site evidence.


## Approved Site v2 source adapter — new integration checkpoint (28 October 2026)

- `lib/approved-site-bridge.cjs` and the `review-bundle[/-md] --approved-site /ABS/folder` option reuse the **lead's actual** `stage3/bin/verify-approved-site.cjs::preflight`; there is no worker-authored lock verifier, second client approval mechanism or CMS import. A sealed-v2 package is mandatory. `--site` remains the normal unsealed Site v1 review mode.
- `review-bundle.approvedSiteSource` records exact source package version, raw `site.json` SHA-256, the separate canonical JSON SEO fingerprint and which real page IDs have their own desktop/tablet/mobile prototype triplets. Missing interior references stay explicit and cannot be substituted with homepage images. All evidence/approval/publication flags remain negative.
- This worker branch currently does **not** contain the lead's new verifier or `custom-section` manifest. To exercise `--approved-site`, the lead must first integrate the two branches in its own authorized workflow and run the real approved-site preflight/SEO review from that integrated tree. A standalone worker checkout must fail closed; do not copy or fork the lead verifier into the SEO folder.
- No actual client-approved package, client screenshots or real published HTTP transcript is present in the reviewed repository source. The feature is adapter compatibility, **not a real-world pilot PASS**. The full Node 20+ CLI smoke remains to be executed in a complete checkout; passing individual checks is not equivalent.


## Lead's real published PHP screenshot evidence → SEO handoff

A direct read-only integration now exists: `--approved-site /ABS/source --php-capture /ABS/capture/evidence.json` on `review-bundle` and `review-bundle-md`. The lead first runs its own `verify-approved-site.cjs` then `capture-approved-site.cjs` on the isolated local PHP publication. Both commands remain owned by the lead. No worker reimplementation or browser dependency was added.

The adapter validates the lead's **actual output contract** `manufact-public-site-acceptance-evidence-v1`: source site ID, locked version, public site mount restricted to 127.0.0.1, exact page route order, all three viewports 1280/768/390, copied approved homepage mockup hashes and local screenshot-file bytes/SHA-256. A missing image warning becomes a stable page-linked remediation task and a blocking release gate, without assuming it is already fixed or allowing automatic publishing. All other image-free screenshots still need manual layout comparison. `review-bundle.phpCapture` is additive and never fills `deliveryEvidence`, `htmlEvidence` or `deviceEvidence` with fictional data.

The complete `tests/smoke.cjs` includes a bounded synthetic lead-output shape and rejection scenarios. Real end-to-end acceptance must run on a merged/lead-integrated Node 20+ checkout and **real** client-approved source. In this isolated branch the lead verifier is absent by design; do not treat a mocked or synthetic screenshot as real site evidence. No files outside `stage3/seo-engine/**` were written.

**Important provenance correction:** `capture-approved-site.cjs` presently omits the original source `site.json` hash from `evidence.json`. The SEO adapter now explicitly marks `exactSourceRevisionProvenByCapture:false` and `coverage.screenshotCaptureExactSiteRevisionProven:false`. Local screenshot SHA-256 validates file consistency **only** (the JSON digest claim can be rewritten), not creator authenticity or the original capture time. Lead must correlate actual deployed revision and capture folder before acceptance; do not treat capture evidence as cryptographically bound to `site.json`. PNG width is read from actual screenshot bytes rather than trusted solely from JSON metadata.

## Graph-rendered SEO parity and real PHP social fallback (28 October 2026)

**Confirmed against lead PHP renderer and current lead Site v1 contract:** when `section.designGraph` exists, PHP publishes the Graph instead of the legacy component body. Source-level SEO now ignores hidden legacy headings, links, CTA values and media during content coverage and internal link analysis. A shared helper `lib/graph-authored.cjs` returns stable graph heading/button identities; `analyze-site`, `traceability`, `propose-content`, and `remediation` consume it. Graph drift is **manual-only existing Studio node review**, with exact `nodeId` and before/expected data; no invented core manifest edit, automatic Graph mutation or second editor.

**Important publisher nuance:** the lead PHP social-image fallback currently still checks legacy `content.media` **before** Graph images. `analyze-site` therefore adds `social-fallback-hidden-media-review` only if the image selected from a graph-overridden section is **not found anywhere in the rendered page media**. An intentional social-image override is legitimate; this is a recommendation, not an SEO blocker or automatic change. `publisher-media.cjs` remains source-compatible with the actual PHP fallback ordering.

**Verification:** isolated V8 execution against the actual current lead `custom-section@1.0.0` SDK successfully validated a typed custom graph Site v1 and produced correct changed-heading/missing-CTA diagnostics. Isolated worker SDK Graph checks likewise passed. The one Node smoke script includes industrial graph overlay and legacy social-fallback cases, but the **complete Node subprocess smoke is still unverified** without a full accessible checkout. No first-client sealed package, production HTTP, screenshot comparison or user signoff has been fabricated.


## First site: live loopback PHP HTML into SEO

In addition to the lead-owned Chromium screenshot capture, the SEO-only bin/capture-php-html.cjs now collects **the exact HTML served by isolated PHP pages** over 127.0.0.1 HTTP GET and writes an immutable-by-convention SHA-256-checked manifest directory. This directly fills the existing manufact-seo-html-snapshot-v1-compatible report pipeline: metadata/H1/links/canonical/indexation, deep HTML, remediation, release and lead traceability. No duplicate SEO parser or CMS write was added.

Run the sealed verifier, start the lead-owned published PHP loopback preview, then capture:

~~~sh
node stage3/seo-engine/bin/capture-php-html.cjs --approved-site /ABS/sealed \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ --output /ABS/new-folder
node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle-md \
  --approved-site /ABS/sealed --blueprint /ABS/blueprint.json \
  --php-html /ABS/new-folder
~~~

Optionally attach the original lead screenshot evidence with --php-capture /ABS/screens/evidence.json. Mismatched source/version/page count/base URL, modified bytes, non-HTML responses, redirects, symlink escapes and unsafe paths fail closed. This is local publisher evidence only; no actual public HTTPS/crawl, form delivery, visual approval or authenticated running PHP source revision. The lead dossier explicitly requests a served-revision correlation review.

New tests/php-html-capture-smoke.cjs uses a **real localhost Node HTTP server** and synthetic sealed-verifier mock only; it is invoked by the full tests/smoke.cjs. Real client-approved pilot and full Node/CI remain to be validated in the lead-integrated checkout.


## Additional completed batch: PHP mount semantics, sitemap, robots, 301

Confirmed against latest lead stage3/server/Api.php: published PHP serves /published/SITE-ID/{page-path}, /published/SITE-ID/robots.txt, /published/SITE-ID/sitemap.xml and HTTP 301 aliases inside the mount. Both robots/sitemap currently require STAGE3_PUBLIC_ORIGIN and may respond 503 on unconfigured local preview. Existing SEO static scanners lacked this mount mapping. The worker added lib/published-mount.cjs plus mount-aware link and canonical checks in analyze.cjs, html-evidence.cjs and publication-integrity.cjs. No HTML rewriting or source mutation.

lib/php-local-publication.cjs handles bounded and hashed **actual localhost HTTP** SEO artifacts. lib/php-html-capture.cjs now records local robots/sitemap/301 into manifest.json alongside page HTML, in one new directory. Actual HTTP statuses, body content and Location are bound to the sealed source ID/version and exact logical routes and reviewed for indexability / redirects. Findings are wired to remediation, release review, bundle and lead dossier, with stable affected page IDs. Invalid local PHP sitemap or redirect becomes a real technical release conflict; missing STAGE3_PUBLIC_ORIGIN is a warning. Neither case proves public HTTPS or that the PHP process was running the particular sealed revision.

The standalone real localhost test in tests/php-html-capture-smoke.cjs now covers valid HTML/robots/sitemap/301, missing indexable page, wrong 301/Location, origin-not-configured 503, hash tampering and invalid mounts. Main tests/smoke.cjs calls it. Test files have been syntax checked, but full Node subprocess tests and actual client published site acceptance require the lead-integrated checkout. Do not call smoke green until it runs there.

No worker edits outside stage3/seo-engine/**; no PR, merging, CMS writes, production deploy or human approval.


## New integrated first-site media PHP byte verification

The original capture-php-html.cjs now GETs exact media bytes for all source originals and responsive variants, writes an immutable-by-convention SHA256 manifest with asset-XXXX.bin files, and verifies every byte on import. lib/php-local-media.cjs checks SiteRepository::publishedImage route semantics, HTTP status, MIME/signature, immutable ETag, responsive SHA, PNG dimensions, actual static img references and observed og:image URL path. Missing OG and visibly referenced img responses are critical release issues; other failures remain review items.

Commands are unchanged: capture-php-html.cjs --approved-site /ABS/sealed --origin http://127.0.0.1:PORT/published/SITE-ID/ --output /ABS/new-dir, then seo-blueprint.cjs review-bundle-md --approved-site /ABS/sealed --blueprint /ABS/plan --php-html /ABS/new-dir.

Media budget: 1.2 MB per still image, 12 MB per MP4, 100 MB media total. No silent partial evidence. Local media findings flow into existing remediation/release/lead dossier; they are not HTTPS public observations. tests/php-html-capture-smoke.cjs adds real local HTTP PNG original/variant, rendered-only image, bad OG, MIME, ETag, responsive SHA/dimensions and binary tamper cases. It uses minimal synthetic PNG headers (not full image decoding). Run actual Node smoke and first real customer checkout in lead integration. No worker edits outside stage3/seo-engine/**, no deploy/PR/merge.

## Current integration fix — real PHP DesignGraph media coverage (28 October 2026)

A concrete gap was identified against current lead `stage3/server/DesignGraph.php`: art-directed images use `<picture><source srcset>`, backgrounds use CSS `url(...)` inside `<style>`, and videos can use `<source src>` plus `poster`. Previous local-media criticality covered only ordinary `<img src/srcset>` and OG assets, so broken displayed responsive/background media might be downgraded to a warning.

The existing `lib/php-local-media.cjs` now recognizes these references through `lib/html-evidence.cjs`. Non-200, MIME, ETag and byte-integrity failures on page-used media are errors for the existing release blockers/remediation. An HTML site-scoped media path missing from sealed Site v1 adds `php-media:untracked-rendered-reference` (error). The current loopback smoke includes art-directed picture/source, CSS background, video poster, and untracked asset scenarios.

**Status:** committed in SEO worker only. No actual Node subprocess smoke, customer sealed v2, PHP served-source identity, real visual parity, public HTTPS or delivered forms have been proven in this chat. Run the two existing smoke commands and real first-site procedure in lead-integrated checkout. No automated release authorization.

## Current accelerated integration macroblock — 28 October 2026

Implemented additional first-site checks against the lead's actual current PHP renderer (without editing core): real `title`, description, OG metadata, html language and meta robots compared against sealed Site v1 with release-blocking `php-head:*` errors; actual form POST/action, release/HMAC marker shape (never print token), required fields/consent/honeypot with `php-form:*` tasks and gates; robots/sitemap 503, misconfiguration, crawler root-block, wrong sitemap pointer and configured-origin missing OG now technical blockers. This is read-only GET evidence, never a form submission or a deployed-site attestation.

The one-command CLI `bin/first-site-check.cjs` now optionally takes `--php-capture /ABS/lead-capture/evidence.json`, reads the lead's original source-bound SHA-256 screenshot artifacts using the existing adapter, checks exact 127.0.0.1 mount and includes them in the same release bundle/summary. No second screenshot engine. See `FIRST-SITE-RUNBOOK.md` for actual operator commands.

Verification limits: targeted V8 execution passed clean/bad PHP lead-form token and clean/stale SEO title cases, edited CommonJS files syntax-compiled, and existing loopback smoke was extended. Full Node subprocess smoke, actual customer sealed v2, current published PHP revision, screenshots, form delivery and HTTPS have NOT been verified. Do not call local code-only checks client approval or release.

## Fresh lead PHP FlexForm compatibility — 28 October 2026

Lead branch `074018c63ffebf4ab8a89995f0c321dbbcfc8e02` introduced additive `formFields` and `formSteps` in the approved Site v1 contract and published PHP. Read-only `php-local-forms` checks legacy extras, new field kinds/required/conditional metadata and multi-step envelope/navigation. Read-only `php-local-head` verifies the exact SHA-256 `script-src` CSP approval of observed inline wizard code and detects missing wizard JavaScript. Errors enter existing release blockers; no JS was executed and no POST was performed. Source and test additions remain strictly under `stage3/seo-engine/**`; lead owns the PHP/SDK/Studio integration.

New targeted cases are included in the existing local loopback smoke, but the full Node subprocess run and an actual customer multi-step form remain unexecuted in the isolated SEO worker context. Rerun once from the lead-integrated checkout before real-site acceptance.


## Published CMS media-ID retarget integration (28 October 2026)

Official `stage3/studio/hosted.js` v2 import replaces original image IDs/URLs with server-issued immutable site IDs. First-site checks now support `--published-site /ABS/owner-published-site.json`, the private owner-authenticated `GET /api/sites/SITE-ID/published-site` response containing `site` and numeric `version`. Offline SEO code does not call or store owner authentication.

The new `published-site-reconcile.cjs` requires exact source content equality after only the official Studio media `retarget()` and asset replacement. Media mapping binds MIME, ALT, declared dimensions and variant SHA/width, retains original sealed source raw digest and observed published Site fingerprint. Actual PHP original and responsive binary SHA-256 must match the *renamed* sealed ledger entry, with any mismatch a release blocker. Published form `_release` is checked against the supplied actual version. Ambiguous asset order, content changes or invalid media fail closed.

For real CMS-imported sites, supply `--published-site`; for direct sealed PHP fixtures it stays optional. Screenshots via optional `--php-capture` remain supported. The export file is operator-supplied, not an independently authenticated PHP build receipt; actual client/host provenance, visual approval, HTTPS, submission delivery and full Node subprocess are not yet verified. Exact commands in `FIRST-SITE-RUNBOOK.md`.
