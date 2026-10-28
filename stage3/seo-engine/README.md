# SEO Intelligence & Blueprint Engine (independent Stage 3 toolkit)

**Branch:** `feature/site-seo-engine` · **Writable area:** `stage3/seo-engine/**` only.  
Offline, Node 20+ CommonJS, no npm packages; does not edit CMS/site/files, deploy, crawl the web, invoke AI providers, or promise SEO outcomes. All outputs are **evidence-bearing recommendations**, not permission to publish.


## Real PHP-first integration: head + forms + screenshot receipts (28.10.2026)

The first-site CLI also accepts optional `--php-capture /ABS/evidence.json` from the lead's existing `stage3/bin/capture-approved-site.cjs`, combining source-verified screenshots and local PHP HTML/SEO/media observations in one release bundle. PHP title/description/OG/lang/robots mismatches now block release as probable publication drift. Public lead form markup is inspected for own-site action, POST, consent, required inputs, release/HMAC marker shape and honeypot without sending submissions or reporting token values. Unavailable or malformed robots/sitemap and selected OG image when public origin is configured are blockers, not soft readiness warnings. Full procedure: [FIRST-SITE-RUNBOOK.md](FIRST-SITE-RUNBOOK.md). This does not prove served version, visuals, public HTTPS or delivered forms.

## Media parity with current PHP DesignGraph (28.10.2026)

The local PHP acceptance now detects `picture/source srcset`, video/poster resources, static CSS `url()` backgrounds, and emitted site-mount media absent from sealed Site v1. Actual broken rendered media enters the same release blockers. See [FIRST-SITE-RUNBOOK.md](FIRST-SITE-RUNBOOK.md). This is a compatibility code change, not completed client acceptance.

## Latest: one-command first-site PHP acceptance and HTTP head parity (28.10.2026)

**New primary operator guide:** [FIRST-SITE-RUNBOOK.md](FIRST-SITE-RUNBOOK.md). Run `node stage3/seo-engine/bin/first-site-check.cjs --approved-site /ABS/sealed --blueprint /ABS/approved-blueprint.json --origin http://127.0.0.1:PORT/published/SITE-ID/ --evidence /ABS/new-evidence --report /ABS/new-report` from the lead-integrated checkout. This preflights sealed Site v2 and Blueprint, captures actual loopback HTML/robots/sitemap/301/original+responsive media bytes, builds the existing unified SEO package and saves `summary.json`, `bundle.json`, `handoff.md`. It never deploys, edits a CMS, or authenticates public HTTPS.

New `lib/php-local-head.cjs` compares observed PHP page HTTP response headers including X-Robots-Tag/CSP against canonical, og:url, actual sitemap origin and Site v1 indexation. Local `STAGE3_PUBLIC_ORIGIN=http://localhost[:PORT]` or `http://127.0.0.1[:PORT]` is allowed only as an explicitly local PHP test. Non-loopback HTTP or sitemap origin conflicts cannot count as complete public evidence. A malformed URL set now loses its 'complete' sitemap claim. Actual local head findings enter existing remediation/release gates. **Full Node subprocess test and first real sealed client site run remain pending lead integration.**

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

## Design Graph public-HTML parity (first custom site)

Current lead PHP `PublicRenderer` treats a typed `section.designGraph` as **the section's rendered content**, replacing its legacy `elements/items`. The SEO Engine now uses precisely that authoring rule. Old component headings, CTA destinations, copy and media cannot falsely satisfy an approved Blueprint when a graph is present. Nested Graph headings, text, buttons, lists, tab labels and disclosure labels remain available to offline semantic review; actual interactive visibility and behavior still require a browser check.

`analyze-site` detects an approved heading changed inside the *rendered* Graph and carries the exact `nodeId`. `traceability` reports that node ID, authored text, heading-match status and ambiguity; `propose-content` avoids proposing unsafe edits to **hidden manifest fields**. For graph heading/CTA drift, it reports manual, page/section/node-specific review requirements for existing Studio controls rather than inventing a second editor or patching a Design Graph automatically. The existing remediation backlog includes these review items.

Contract verification: a synthetic `custom-section@1.0.0` site was validated against the lead's updated `stage3/sdk/contract.cjs`, then the SEO auditor detected both the changed graph heading and missing expected CTA. That is an isolated source-level contract check, **not** the full Node smoke, a published PHP capture, or a real approved-site pilot. The existing `tests/smoke.cjs` now covers the same graph-overlay regression on the original industrial fixture using its registered manifest.

**PHP social image exception:** current `PublicRenderer` can still choose an OG image from an old `content.media` slot even when that section's visual markup was replaced by Design Graph. `analyze-site` now emits a non-blocking `social-fallback-hidden-media-review` only if that chosen image is not rendered elsewhere in the actual page. Set an existing explicit `page.seo.ogImage` through normal CMS review if the intended social card needs a different asset; do not overwrite automatically. This warning is confirmed against the actual publisher selection order and a real Site v1-validated fixture (synthetic content, not live HTTP).


## First-site real local PHP HTML evidence

The lead's capture-approved-site.cjs provides visual screenshots but no page HTML. The SEO worker now has a separate bounded **read-only local HTTP collector** for actual published PHP HTML:

~~~sh
node stage3/bin/verify-approved-site.cjs /ABS/approved-site
# Lead starts its own isolated published PHP preview at the given local origin.
node stage3/seo-engine/bin/capture-php-html.cjs \
  --approved-site /ABS/approved-site \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ \
  --output /ABS/new-php-html-01
node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle-md \
  --approved-site /ABS/approved-site --blueprint /ABS/seo-blueprint.json \
  --php-html /ABS/new-php-html-01 > /ABS/seo-php-review.md

# Optional separate lead three-viewport screenshot evidence:
node stage3/seo-engine/bin/seo-blueprint.cjs review-bundle \
  --approved-site /ABS/approved-site --blueprint /ABS/seo-blueprint.json \
  --php-html /ABS/new-php-html-01 \
  --php-capture /ABS/lead-screens/evidence.json > /ABS/seo-php-review.json
~~~

The acquisition command makes GET requests only to the exact http://127.0.0.1:PORT/published/SITE-ID/ mount. It rejects redirects, unexpected statuses/types, missing or malformed UTF-8 HTML/head, pages above 450 KB, a capture above 18 MB, and missing source pages. It never executes website JavaScript, follows external links, publishes, edits the CMS or writes to an existing evidence directory.

The fresh output contains manifest.json and deterministic page-001.html, etc. Source site digest/version, page IDs, route order, exact URLs, local HTTP 200, file sizes and SHA-256 are rechecked on import; extra files/symlinks and changed bytes fail closed. The immutable HTML snapshot is reused by the existing deep HTML, publication parity, indexation, internal link, remediation, release and lead dossier modules. The report includes phpHtmlCapture, local page counts and byte verification without pretending to certify the public deployment.

The --php-html flag requires --approved-site, applies only to review-bundle or review-bundle-md, and cannot be combined with an unrelated --snapshot. --php-capture still accepts the lead's distinct screenshot evidence.json; when both are supplied, source version/page count/local base URL must match. Matching these fields does not prove both captured the same PHP build.

**Limitations:** this verifies actual local HTTP responses, NOT the actual public HTTPS origin, production canonical/robots/sitemap, visual equality, mobile JS, working forms, client identity or approval. The capture ledger binds to a sealed input digest but **cannot authenticate that the PHP server was serving that exact source revision**. The lead must separately correlate actual publication revision and capture time before acceptance.

Smoke: node stage3/seo-engine/tests/php-html-capture-smoke.cjs starts a genuine local HTTP server and mocks only the unavailable lead sealed-v2 verifier. The main node stage3/seo-engine/tests/smoke.cjs also invokes it. These tests must be run on the integrated checkout and do not replace real customer verification.


## First-site mounted PHP publication endpoints: complete local technical review

The SEO-owned local capture now also GETs the actual PHP paths /published/SITE-ID/robots.txt, /published/SITE-ID/sitemap.xml and **every declared Site v1 redirect alias**. GET never follows a redirect and never contacts the host declared in a sitemap/canonical URL: all traffic remains on explicitly supplied 127.0.0.1. It records statuses, Content-Type, 301 Location and exact response bytes in the same new output folder as page HTML. Separate SHA-256 references and strict file listing are checked again on import.

Lead PHP requires STAGE3_PUBLIC_ORIGIN for local sitemap/robots responses. If unset, these endpoints return HTTP 503: the review creates an explicit **warning and evidence/setup request**, not a false claim that an indexable page is broken. A successful direct URL set is parsed conservatively, mapped from /published/SITE-ID/ to logical Site v1 paths, and checked for missing indexable pages, wrongly included noindex routes, unknown/duplicate routes, invalid HTTPS loc URLs or changed 301 destinations. Actual negative findings join the existing remediation backlog and become a release-review conflict gate. They are local PHP facts only; the public origin in the sitemap string was not contacted or authenticated.

The real-PHP HTML snapshot now includes mountPath and correctly recognizes links, anchors and canonical path relationships under /published/SITE-ID/ rather than treating valid published links as missing logical routes. Offline snapshots without mountPath retain their previous behavior. Valid 200 sitemap/robots content is also exposed to the existing static publication-integrity modules; an unavailable/unparseable sitemap is **never declared complete**.

Important run boundaries: this adds no CMS schema, router, deployment, GitHub workflow or automatic approvals. The first real customer pilot still requires integration of these files, an actual sealed v2 package, local published PHP with version correlation, public HTTPS/canonical/robots/sitemap validation, visual sign-off and form delivery tests. Tests/php-html-capture-smoke.cjs includes real-local-HTTP happy paths and negative sitemap/301/503/tamper scenarios; the full Node test suite is not proven by source-level checks alone.


## Actual local PHP media: verified binary receipts for first-site pilot

The source-bound, read-only local collector now extends its **single** HTML/sitemap/robots/301 evidence folder with exact published media GET responses: asset-0001.bin, etc. Every Site v1 original and responsive variant is checked under the published site mount on explicit 127.0.0.1 only. No public or OG external URL is contacted.

The media manifest binds the source ID/path, requested URL, HTTP status, MIME, ETag, response body SHA-256 and bytes. Import re-reads each binary file and rejects changed sizes/hashes, symlinks, unexpected files, wrong ID/path and missing sources. On HTTP 200 it checks PNG/JPEG/WebP/MP4 signatures, MIME, quoted SHA256 ETag, approved responsive SHA256 and PNG dimensions. An OG image or static img src/srcset actually used in captured HTML is critical if broken. Captured og:image is additionally checked against the selected Site v1 image path and HTTPS scheme without fetching that remote host. Other missing images remain explicit review warnings.

Bounded acquisition: maximum 1.2 MB per image, 12 MB/video and 100 MB for all media; a limit violation fails instead of silently skipping image files. The existing phpHtml localMedia object feeds shared remediation, release blocker local-php-media-integrity, unified review bundle and lead dossier. Report fields include localPhpMediaResources, localPhpMediaBytesChecked and localPhpMediaFindings.

No claim of actual public HTTPS, authentic served Site v1 version, image crop/visual quality, executed JS, form delivery or client approval. HTML img and srcset coverage does not imply coverage of CSS backgrounds or JS-added elements. The original browser screenshot capture remains required. The HTML-snapshot JSON schema now accepts the existing source-bound mountPath, redirectPaths, source and local-only fields.

## Fresh lead PHP FlexForm compatibility — 28 October 2026

Lead branch `074018c63ffebf4ab8a89995f0c321dbbcfc8e02` introduced additive `formFields` and `formSteps` in the approved Site v1 contract and published PHP. Read-only `php-local-forms` checks legacy extras, new field kinds/required/conditional metadata and multi-step envelope/navigation. Read-only `php-local-head` verifies the exact SHA-256 `script-src` CSP approval of observed inline wizard code and detects missing wizard JavaScript. Errors enter existing release blockers; no JS was executed and no POST was performed. Source and test additions remain strictly under `stage3/seo-engine/**`; lead owns the PHP/SDK/Studio integration.

New targeted cases are included in the existing local loopback smoke, but the full Node subprocess run and an actual customer multi-step form remain unexecuted in the isolated SEO worker context. Rerun once from the lead-integrated checkout before real-site acceptance.


## Published CMS media-ID retarget integration (28 October 2026)

Official `stage3/studio/hosted.js` v2 import replaces original image IDs/URLs with server-issued immutable site IDs. First-site checks now support `--published-site /ABS/owner-published-site.json`, the private owner-authenticated `GET /api/sites/SITE-ID/published-site` response containing `site` and numeric `version`. Offline SEO code does not call or store owner authentication.

The new `published-site-reconcile.cjs` requires exact source content equality after only the official Studio media `retarget()` and asset replacement. Media mapping binds MIME, ALT, declared dimensions and variant SHA/width, retains original sealed source raw digest and observed published Site fingerprint. Actual PHP original and responsive binary SHA-256 must match the *renamed* sealed ledger entry, with any mismatch a release blocker. Published form `_release` is checked against the supplied actual version. Ambiguous asset order, content changes or invalid media fail closed.

For real CMS-imported sites, supply `--published-site`; for direct sealed PHP fixtures it stays optional. Screenshots via optional `--php-capture` remain supported. The export file is operator-supplied, not an independently authenticated PHP build receipt; actual client/host provenance, visual approval, HTTPS, submission delivery and full Node subprocess are not yet verified. Exact commands in `FIRST-SITE-RUNBOOK.md`.


## First-site actual PHP business content, DesignGraph and operator worksheet

Local PHP HTML capture now runs **source-bound** inspection of official business components (`content-switcher`, `pricing-plans`, `comparison-matrix`, `process-timeline`) and arbitrary typed DesignGraph sections (node semantics, content, CTA URLs, linked images, ALT, responsive art direction, tabs, quotes, tables, gallery, disclosure, popup). Static markup issues flow through existing remediation, review bundle and release gates as `php-component:*` / `php-graph:*` blockers. No extra CMS fields, a second SEO editor or automated web interaction.

The first-site CLI now writes a fourth report file, `launch-worksheet.md`, next to `summary.json`, `bundle.json`, `handoff.md`. It gives verified actual findings and section/node locators for each page, separately lists availability of three matching approved prototype references and actual lead screenshot files, and deliberately leaves all human desktop/tablet/mobile approval, submission delivery, HTTPS and version-authentication checks **unsigned**. Generated worksheets do not expose raw HTML/HMAC values.

The existing `tests/php-html-capture-smoke.cjs` now includes valid and deliberately broken business/graph HTML and worksheet scenarios. Isolated JS/V8 checks passed; full Node subprocess, actual PHP client publication, browser visual matching and form POST have not been claimed. See FIRST-SITE-RUNBOOK.md.


### Расширение реального компонента PHP: 14 типов вместо четырёх

К `php-local-components.cjs` дополнительно подключены **FAQ, карточки услуг, отзывы, photo-gallery, adaptive-gallery, логотипы партнёров, CTA-banner, contact-panel, image-showcase, media-story**. Для каждого типа сопоставляются фактически отданные PHP HTML структура/содержание и элементы из sealed Site v1, где применимо: вопросы/ответы, услуги, подписи/авторы, image src/ALT/caption, внутренние и внешние CTA destination и видимые цены. Нет DOM исполнения, нет запроса к внешнему URL и нет изменения сайта. Нарушения — существующий `local-php-component-parity` release blocker с `sectionId` и `pageId`.

Репрезентативные валидные и намеренно сломанные FAQ/testimonial/CTA добавлены в *тот же* `php-html-capture-smoke.cjs`; pure JS smoke этих актуальных модулей прошёл. Полный Node subprocess/реальный PHP первого клиента по-прежнему обязан выполнить ведущий.


## PHP social metadata coverage

Real PHP head auditing now verifies Open Graph locale/type/image/alt plus Twitter title/description/card/image/alt against the approved site and captured local sitemap origin. Actual wrong URLs or missing expected tags appear as release blockers in the existing head gate, without a second social system or invented host. No actual social platform fetch, public HTTPS confirmation or client acceptance is implied.
