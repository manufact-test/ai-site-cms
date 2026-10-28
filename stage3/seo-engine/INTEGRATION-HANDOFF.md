# AI Site CMS SEO Engine — integration handoff (28 October 2026)

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
