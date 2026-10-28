# SEO Intelligence & Blueprint Engine (independent Stage 3 toolkit)

**Branch:** `feature/site-seo-engine` · **Writable area:** `stage3/seo-engine/**` only.  
Offline, Node 20+ CommonJS, no npm packages; does not edit CMS/site/files, deploy, crawl the web, invoke AI providers, or promise SEO outcomes. All outputs are **evidence-bearing recommendations**, not permission to publish.

## Working workflow: brief → blueprint → approved 3-picture prototype → real site → review package

From the repository root:

```bash
# Research is done by the external AI developer, not this CLI.
node stage3/seo-engine/bin/seo-blueprint.cjs compile \
  --brief stage3/seo-engine/fixtures/industrial.brief.json > /tmp/seo-blueprint.json

# SEO/UX section of the client's prototype explanation (NOT a design generator).
node stage3/seo-engine/bin/seo-blueprint.cjs explain \
  --blueprint /tmp/seo-blueprint.json

# Main integration artifact: one complete read-only JSON bundle.
node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle \
  --site stage3/fixtures/industrial-site.json \
  --blueprint /tmp/seo-blueprint.json \
  --snapshot stage3/seo-engine/fixtures/industrial.html.snapshot.json \
  --viewports stage3/seo-engine/fixtures/industrial.viewports.json \
  > /tmp/seo-review.json

# Human-facing work plan; work is grouped by phase/priority/owner/dependency.
node stage3/seo-engine/bin/seo-blueprint.cjs remediation-md \
  --site stage3/fixtures/industrial-site.json \
  --blueprint /tmp/seo-blueprint.json > /tmp/seo-actions.md

# One full offline smoke (requires local Node and complete repository checkout).
node stage3/seo-engine/tests/smoke.cjs
```

`evidence-consistency` highlights when two caller-supplied captures contradict each other, especially an index/noindex signal. A conflict on captured indexation is a release blocker until the lead confirms the real deployed build; agreement still does not authenticate either recording. Integrated into `review-bundle.evidenceConsistency` and the remediation work queue.

Cross-platform social HTML is reviewed as well: unsafe/empty OG or Twitter image URLs are now blocking findings; a different Twitter image or missing Twitter image is a separate human review item. Resource-status problems remain scoped to the actual selected image, not to every unused media asset.

Real-SDK-validated fallback fixture (not production): `fixtures/industrial.social-fallback.site.json`, `fixtures/industrial.social-fallback.media.json`, and `fixtures/industrial.social-fallback.html.snapshot.json`. Run `media-review --site stage3/seo-engine/fixtures/industrial.social-fallback.site.json --media stage3/seo-engine/fixtures/industrial.social-fallback.media.json --snapshot stage3/seo-engine/fixtures/industrial.social-fallback.html.snapshot.json`; it checks the actual `media-story` component, selected OG/Twitter image and user-supplied response. Alter the captured response status to 404 and the same selected fallback becomes a release blocker. Media evidence remains synthetic.

Stage 3 publisher compatibility: social image selection is resolved using the actual PublicRenderer priority (explicit `page.seo.ogImage`, then the first section `content.media` slot or repeat item, then the first nested Design Graph image). `capture-plan` and `media-review` now include automatically chosen fallback images in capture coverage and release-relevant HTTP/MIME checks; the module remains read-only and does not claim the public image has actually loaded.

`capture-plan` generates a complete first-real-site evidence capture checklist, including all Site v1 pages, approved blueprint routes, known media, exact HTTPS public URLs when `--origin` is provided, robots/sitemap candidates, desktop/tablet/mobile markup, screenshots, forms and acceptance checks. This is a request manifest, not a fetch or actual observation. `review-bundle.capturePlan` includes the checklist; when provided delivery/media evidence disagree on public origin, the bundle records the conflict and refuses to choose an arbitrary origin.

`cms-change-packet` derives candidate edits only from approved, current backlog items, rechecks Site v1 page/element IDs, manifest version and field limits, verifies the proposed value against the current approved blueprint, and refuses unresolved dependencies. It never writes to CMS; manual saved overrides and real Save/Publish must still be reviewed. The `review-bundle.cmsChangePacket` includes the same guarded instructions.

The execution plan separates **approved-for-manual-work** from **completed** (never inferred). Rejected/deferred tasks remain visible but are omitted from suggested next actions; stale decisions must be refreshed. Existing dependencies remain blocking until a subsequent audited site/backlog resolves them. This tool cannot implement or complete CMS tasks.

The Markdown handoff also appends a human-readable CMS change packet with exact field preconditions and blocked/pending reasons. Combined HTTP and media evidence with conflicting public origins produces a release blocker until the lead resolves the discrepancy.

The lead dossier includes a concrete `evidenceRequests` checklist, not a readiness score: approved 3-picture signoff, missing page HTML/three-device samples, public HTTP/OG evidence, historical 301 probes and manually retired aliases. `review-bundle-md` exposes owner, reason, page IDs and what remains unverified, even when a caller supplies optimistic evidence flags. It never treats an unverified capture as actual live validation.

The `review-bundle.markdownHandoff` begins with a concise release overview and retains the original complete remediation report and appends the per-page implementation/acceptance map. No separate document needs to be assembled by the lead.

`review-bundle-md --site <site.json> --blueprint <blueprint.json> [--acceptance <ledger.json>]` provides a complete one-file Markdown handoff. It starts with the lead overview (release blockers, actions by owner, revision acceptance, regression closure and hypothetical CMS impact), then includes remediation, traceability, execution and guarded CMS fields.

`change-impact --site <site.json> --blueprint <blueprint.json> --decisions <ledger.json>` builds the guarded CMS change packet, applies only eligible approved field proposals to an **in-memory clone**, validates that clone against the actual existing Site v1 contract and manifests, then compares hypothetical SEO regressions. The preview does not output the site document, save CMS data, deploy, grant automatic permission or replace manual acceptance. `review-bundle.changeImpact` includes this simulation only when a current decision ledger was supplied.

Human acceptance is now explicitly version-bound: generate an empty signed-evidence structure with `acceptance-template`, attach the real client's three static image artifact references/SHA-256 digests and signoff, plus seven manual review attestations, then use `acceptance-review --acceptance ...`. The approved Blueprint and implemented Site v1 are fingerprinted using deterministic SHA-256 of their canonical JSON. A changed revision invalidates the prior assertions. The review still never authenticates a person, fetches artifacts or authorizes release. `release-review --acceptance ...` raises blockers on stale/rejected attestations; `review-bundle.acceptanceReview` carries their exact status. `task-progress` compares *only like-for-like Site v1 authoring tasks* across a baseline and current revision, so missing captures do not look like fixed bugs. Optional `--prior-decisions` refers to the **baseline** backlog, not the current ledger.

Review packages now contain `traceability`: a mapping from approved page/section IDs to implemented Site v1 fields, supplied HTML/device evidence and exact backlog task IDs. Optional `review-bundle --decisions <triage.json>` includes reconciled decisions and annotates suggested next actions; it **never** authorizes release or removes rejected decisions from the full backlog. Use `traceability-md` for the lead's human-readable acceptance map.

The full `review-bundle` includes a canonical blueprint architecture review, core-validated Site v1 audit, precise CMS field proposals, HTML parity/deep evidence (if provided), three-device captured markup comparisons (if provided), optional before/after Site v1 regression, a prioritized remediation backlog, release gates, evidence coverage, and pre-escaped Markdown handoff. No second CMS editor.

## Other CLI commands

| Command | Purpose | Required input |
|---|---|---|
| `route-migration` | Compare former/current Site v1 pages, declared 301 aliases and old authored links | `--before --site --blueprint` |
| `review-bundle-md` | Complete lead Markdown: release overview, remediation, mapping, execution and CMS field review | `--site --blueprint`, optional evidence/acceptance/decision flags |
| `change-impact` | Simulate human-approved CMS field proposals on a temporary Site v1 clone; validate with existing core SDK and analyze hypothetical regression | `--site --blueprint --decisions`, optional evidence flags |
| `acceptance-template`, `acceptance-review` | Revision-bound human acceptance evidence for three prototype images and seven lead gates | `--site --blueprint`, `--acceptance` to review |
| `task-progress` | Like-for-like previous/current Site v1 backlog lifecycle, without fake issue closure | `--before --site --blueprint`, optional `--prior-decisions` |
| `review-blueprint`, `review-architecture` | Editorial/route plan review | `--blueprint` |
| `analyze-site`, `analyze-content` | Core Site v1 + content evidence | `--site`, optionally `--blueprint` for site analysis; required for content |
| `propose-content` | Manifest-safe heading/CTA field proposals | `--site --blueprint` |
| `handoff` | Core SEO field changes and lead-only work | `--site --blueprint` |
| `analyze-html`, `deep-html` | Bounded trusted static HTML diagnostics | `--snapshot`, optional `--blueprint` for deep HTML |
| `html-parity` | Compare supplied HTML metadata to Site v1 | `--site --blueprint --snapshot` |
| `viewport-parity` | Compare desktop/tablet/mobile captured HTML | `--blueprint --viewports` |
| `compare-site` | Before/after Site v1 regression | `--before --site --blueprint` |
| `traceability`, `traceability-md` | Page/section coverage, authoring evidence and acceptance map | `--site --blueprint`, optional `--snapshot --viewports` |
| `remediation-plan`, `remediation-md`, `release-review` | JSON work queue, Markdown work queue, publication checklist | `--site --blueprint`, optional `--snapshot --viewports --before` |
| `media-review` | Validate caller-supplied OG image resource URL/status/MIME | `--site --media`, optional `--snapshot` |
| `delivery-review` | Read-only HTTP transcript: statuses, headers, canonical, robots, sitemap | `--site --delivery`, optional `--blueprint` |
| `evidence-consistency` | Compare the caller-supplied HTML export and HTTP-captured HTML, highlight conflicting title/robots/canonical/OG or media origin | `--site`, optional `--snapshot --delivery --media` |
| `capture-plan` | First real-site lead capture manifest: exact page/media URLs, HTTP, three device markup and manual acceptance | `--site --blueprint`, optional `--origin https://host/mount/` |
| `cms-change-packet`, `cms-change-packet-md` | Non-executable manifest- and source-guarded CMS field instructions after decisions | `--site --blueprint`, optional `--decisions --snapshot --delivery` |
| `execution-plan`, `execution-plan-md` | Dependency-aware phases/owners; approved, blocked, stale, deferred and rejected task lanes | `--site --blueprint`, optional `--decisions --delivery --snapshot --viewports --before` |
| `triage` | Reconcile human decisions with current backlog, detect stale proposals | `--site --blueprint --decisions`, optional `--snapshot --viewports --before` |

Use `--media <evidence.json>` in review, remediation, triage, release and traceability commands, or `media-review --site <site.json> --media <evidence.json> [--snapshot <html.json>]`. The media layer checks real Site v1 asset references, supplied public OG URLs, response status/MIME, and coverage, without fetching actual files or asserting social previews. The input schema is `schemas/media-evidence-v1.schema.json`. Missing or truncated XML sitemap segments are marked unverified instead of creating false missing-page blockers; only response failures on Site v1-referenced OG assets trigger a media release blocker.

Redirect response transcripts can now be supplied in the same HTTP evidence artifact as `redirects: [{from,requestUrl,status,location}]`. They are compared with existing Site v1 `redirects` aliases, the approved public host/mount and the publisher's expected 301 status and `Location`; a missing/wrong target is a release blocker, and omitted captures are explicitly unverified rather than silently passed. This closes the migration → capture-plan → HTTP evidence → release review loop without fetching real URLs.

For public-origin handoff, `--delivery stage3/seo-engine/fixtures/industrial.delivery.evidence.json` (synthetic example, **not** a live host) can be added to `review-bundle`, `remediation-plan`, `release-review`, `triage`, and `traceability`. It checks captured HTTP status, `X-Robots-Tag`, HTML robots, canonical target, missing page responses and a supplied complete direct XML `urlset`. Sitemap indexes are explicitly marked unenumerated. HTTP request/response URLs with tracking query parameters are accepted as evidence and reported as route drift rather than aborting the review. All URLs, bodies, statuses and timestamps are supplied assertions, not fetched or authenticated by this CLI. See `schemas/delivery-evidence-v1.schema.json`.

For custom project manifests, add `--manifests /path/to/manifests` to Site v1 commands; default is `stage3/components`.

## Evidence input rules

- `schemas/brief-v1.schema.json` and `schemas/blueprint-v1.schema.json`: versioned strict project research/planning; validation and canonical compilation are implemented by `lib/blueprint.cjs`. Confirmed vs unknown facts are explicit, and Schema.org entries are **candidates**, never release authorization.
- `schemas/html-snapshot-v1.schema.json`: `format=manufact-seo-html-snapshot-v1`; `pages=[{id,path,html}]`; optional sitemap/robots artifacts. **`completeness: "complete"` is a deliberate assertion that missing internal routes are genuinely absent from this supplied export**. Omitted or `"partial"` means *unverified target*, not broken link. This remains a static, trusted export—not deployed HTTP evidence.
- `schemas/viewport-capture-v1.schema.json`: `format=manufact-seo-viewport-evidence-v1`, `siteId`, and per-page `captures.desktop/tablet/mobile={method:"static-html"|"rendered-dom",html}`. All three must be supplied for *each supplied page*. The report separately flags planned pages **not covered by any capture**. Even a declared `rendered-dom` source cannot certify CSS visibility, responsive screenshots, interactivity, or browser accessibility.
- `schemas/media-evidence-v1.schema.json`: bounded caller-supplied media response evidence for known Site v1 assets and current HTML OG URLs.
- `schemas/delivery-evidence-v1.schema.json`: bounded manually supplied public HTTPS response transcript (`origin`, `pages`, optional `robots`/`sitemap`). Validates site-to-public-URL consistency, page headers/status, robots and direct sitemap URL set; **no live network capture** or status/indexing guarantee.
- `schemas/acceptance-v1.schema.json`: evidence ledger for three approved static prototype images, blueprint/Site v1 SHA-256 revision fingerprints and seven named manual acceptance gates. Approval is supplied, not authenticated.
- `schemas/triage-v1.schema.json`: `format=manufact-seo-triage-v1`, `siteId`, and `decisions=[{taskId,taskKey,decision,reason,expectedBefore?,expectedAfter?}]`. Decisions are `approve`, `reject`, or `defer`. For field tasks, both before/after preconditions are required. `triage` marks stale decisions when matching tasks or field values changed. Approval is **not** applying a patch, passing tests, or releasing a site.

Fixtures include industrial and community briefs/plans; clean, defective, publication-drift and deep semantic HTML; mobile parity/drift and prior Site v1; a blank triage ledger.

### First-site acceptance and revision reconciliation

`acceptance-template --site <site.json> --blueprint <blueprint.json>` creates an empty human-approval ledger bound to SHA-256 of the approved Blueprint and actual Site v1 JSON. The lead must supply *three distinct static* desktop/tablet/mobile image references and SHA-256 values, client signoff, and all seven manual gate attestations with actor, date and evidence reference. `acceptance-review --acceptance <ledger.json>` reports incomplete, rejected or stale revision assertions; `release-review --acceptance ...` blocks explicit rejections or changed revisions. None of these assertions is independently authenticated, and even a complete ledger cannot auto-authorize release.

`route-migration --before <prior-site.json> --site <current-site.json> --blueprint <blueprint.json>` checks exact supported Site v1 `redirects: [{from,to}]` after a stable page's slug changes. It flags missing or incorrect 301 aliases, removed indexable pages, old authored links and indexation changes, and adds human HTTP Location/canonical probes via `capture-plan --before ...`. The checks are read-only; a saved alias is not proof of live HTTP 301.

`task-progress --before <prior-site.json> --site <site.json> --blueprint <blueprint.json>` compares two **like-for-like, Site v1-only** remediation backlogs using the same Blueprint and component manifests; optional `--prior-decisions` reconciles human decisions against the **prior** queue. The report separates vanished, introduced, persistent and modified tasks, and marks any matching accepted field change as a *candidate*, never a proven completion. Deployment captures are excluded from historical comparison to avoid misleading closures.

## Integration with the lead's sealed approved-site v2 package (October 2026)

The lead's **actual** import source of truth is `stage3/docs/APPROVED-SITE-PACKAGE.md`, not this toolkit's optional acceptance ledger. A real handoff is an externally created folder with `handoff.json` v2, `site.json`, three static desktop/tablet/mobile images, `client-explanation.md`, `implementation-spec.md`, and source assets. Lead scripts `stage3/bin/seal-approved-site.cjs` and `stage3/bin/verify-approved-site.cjs` seal and check the **original file bytes**, image MIME, SDK compatibility and source SHA-256; `audit-approved-site.cjs` and `capture-approved-site.cjs` create separate human-review/published-PHP evidence. These are lead-owned capabilities; **do not reimplement them in SEO Engine**. Supplementary per-page approved images are permitted by the lead's current v2 handoff.

For a real approved site, first have the lead run `verify-approved-site.cjs APPROVED_FOLDER`, then use its validated `APPROVED_FOLDER/site.json` and the project SEO Blueprint for this toolkit's `review-bundle-md` or `review-bundle`. The optional `acceptance-template` ledger is *a separate, caller-reported SEO review record*, bound to a deterministic hash of parsed Site v1 and Blueprint; it is **not** the v2 handoff raw-file digest, does not verify original PNG/JPEG/WebP bytes, does not authenticate client identity and cannot replace sealed-folder verification. A changed site revision or post-import CMS override needs fresh source/approval review.

```bash
# The first command is owned by the main developer and checks the real sealed folder.
node stage3/bin/verify-approved-site.cjs /ABS/approved-site

# This worker's one complete, offline, read-only SEO review.
node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle-md \
  --site /ABS/approved-site/site.json \
  --blueprint /ABS/seo-blueprint.json > /ABS/seo-lead-review.md

# Optional comparison after an approved CMS revision; add evidence flags only
# when their source artifacts actually exist and were collected for the same build.
node stage3/seo-engine/bin/seo-blueprint.cjs route-migration \
  --before /ABS/previous-site.json --site /ABS/current-site.json \
  --blueprint /ABS/seo-blueprint.json
```

The lead dossier's `evidenceRequests` list identifies which **input categories** remain missing: prototype/client signoff, static HTML, desktop/tablet/mobile, public HTTP, selected media, legacy redirects and human gate attestations. It never proves independently that the supplied captures are genuine, that the approved prototype matches the PHP renderer, that forms submit, or that publication is authorized.

## Ownership and guarantees

The external AI developer studies the actual niche, sources, users and SEO, then prepares **three STATIC design images** (desktop/tablet/mobile), client explanation, and portable internal specification. The lead constructs the actual site after approval. This toolkit supports research intake, blueprint, site audit, HTML evidence, readonly patch suggestions, and handoff. It never fabricates performance, rankings, demand, business facts, testimonials, or competitive evidence.

Existing Site v1 validator is reused from `stage3/sdk/contract.cjs`; no duplicate SEO UI. Editable SEO fields are limited to `title`, `description`, `robots`, `ogTitle`, `ogDescription` plus the already-existing image-asset-dependent `ogImage`; arbitrary canonical overrides, JSON-LD, and per-occurrence ALT are not automatically editable. All proposals require checking actual saved overrides, current manifest versions, and source values in the existing CMS.

Deep HTML reviews distinguish standalone/page-level JSON-LD types (including `@graph` roots) from nested `author`, `offers`, or `publisher` nodes. Nested types remain visible for diagnosis but do not independently create a misleading page-level Schema.org candidate warning.

Reports use conservative review labels and do **not** prove real HTTP codes, deployed canonical, Core Web Vitals, crawl results, browser visual parity, mobile UX, working forms, search rankings, or publication acceptance. `readyToPublish` is always false pending external, explicit human acceptance. Downstream UI must escape all data and must never execute reports.

### Publication artifact integrity (offline, read-only)

`node stage3/seo-engine/bin/seo-blueprint.cjs publication-integrity --site <site.json> --snapshot <html.snapshot.json>` compares supplied sitemap routes, page indexation, selected canonical paths and wildcard robots directives with Site v1. If **and only if** the supplied sitemapPaths is the full enumerated sitemap, set `sitemapCompleteness: "complete"` alongside `sitemapPaths` in the snapshot. Omission checks are disabled otherwise. These findings enter `remediation-plan`, `release-review` and `review-bundle.publicationIntegrity`. This tool never fetches a live host and cannot prove indexing, crawl permission, canonical origins or release readiness.

See [INTEGRATION-HANDOFF.md](INTEGRATION-HANDOFF.md), [NEXT-CHAT-HANDOFF.md](NEXT-CHAT-HANDOFF.md) and [research/PRIMARY-SOURCES.md](research/PRIMARY-SOURCES.md).

## First real site: direct sealed Approved Site v2 input (lead integration)

In a **lead-integrated checkout containing** `stage3/bin/verify-approved-site.cjs`, the same read-only SEO review can consume the sealed folder directly:

```sh
node stage3/bin/verify-approved-site.cjs /ABS/approved-site
node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle-md \\
  --approved-site /ABS/approved-site --blueprint /ABS/seo-blueprint.json > /ABS/seo-review.md
node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle \\
  --approved-site /ABS/approved-site --blueprint /ABS/seo-blueprint.json > /ABS/seo-review.json
```

`--approved-site` is **only** for `review-bundle` / `review-bundle-md` and cannot be combined with `--site`. It invokes the **lead-owned** full preflight, requires SHA-256-locked `manufact-approved-site-handoff-v2` and reads its verified original Site v1. It refuses the worker-only checkout (which does not yet contain the lead verifier), unsealed legacy packages, or a changed `site.json`. This is not a second approval system.

The bundle adds `approvedSiteSource`, source byte SHA-256 vs separately named canonical SEO fingerprint, and homepage/per-interior-page reference coverage. Three approved homepage pictures **must not** be presented as independent interior-page visual acceptance. It does not fetch public URLs, inspect screenshots, publish, validate human signoff or write the package. A real Blueprint and real HTTP/viewport/media observations must come from the lead's actual first site; none is implied by the sealed source.

## Real PHP capture → SEO remediation/release review (lead-owned, read-only)

The main developer can use the existing Stage 3 screenshot command for the first approved customer site:

```sh
node stage3/bin/verify-approved-site.cjs /ABS/approved-site
node stage3/bin/capture-approved-site.cjs /ABS/approved-site \
  http://127.0.0.1:PORT/published/ACTUAL-SITE-ID/ /ABS/evidence-01
node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle-md \
  --approved-site /ABS/approved-site --blueprint /ABS/site.blueprint.json \
  --php-capture /ABS/evidence-01/evidence.json > /ABS/seo-review.md
```

The SEO command checks **all three original prototype hashes** against the sealed package, validates the page list/order and loopback mount, and rehashes every captured desktop/tablet/mobile PNG. Screenshot warnings from the actual PHP capture become page-identified **P1 remediation work** and a **publication blocker** for missing rendered images. Coverage, original source byte digest and exact scope enter `review-bundle.phpCapture`, the release review and the lead dossier. Changed/missing capture files, inconsistent paths, bogus sources, incompatible versions or screenshots from another site fail closed.

**What this does not prove:** CSS matches the client's approved mockups; mobile interactions, successful forms, on-page HTML SEO head, HTTPS production, robots/sitemap, public OG assets, performance and any human approval. A screenshot is not an HTML snapshot or actual published HTTP transcript. Use the separate existing `--snapshot`, `--viewports`, `--delivery`, and `--media` inputs only when those artifacts were independently collected for the **same** build. No CMS mutations, no new capture implementation and no visual similarity score.

**Capture revision limit:** the lead's existing screenshot `evidence.json` does not include the source `site.json` byte SHA-256. Matching version, page routes and sealed prototype hashes is a compatibility check, **not cryptographic proof that captured PHP used the exact current Site v1 revision**. The report explicitly states this; the lead must correlate capture time/revision and confirm the PHP deployment matches approved source before final acceptance. PNG IHDR pixel widths are checked against the claimed device width in addition to SHA-256.
