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

The execution plan separates **approved-for-manual-work** from **completed** (never inferred). Rejected/deferred tasks remain visible but are omitted from suggested next actions; stale decisions must be refreshed. Existing dependencies remain blocking until a subsequent audited site/backlog resolves them. This tool cannot implement or complete CMS tasks.

The `review-bundle.markdownHandoff` keeps its original remediation report at the top and appends the per-page implementation/acceptance map. No separate document needs to be assembled by the lead.

Review packages now contain `traceability`: a mapping from approved page/section IDs to implemented Site v1 fields, supplied HTML/device evidence and exact backlog task IDs. Optional `review-bundle --decisions <triage.json>` includes reconciled decisions and annotates suggested next actions; it **never** authorizes release or removes rejected decisions from the full backlog. Use `traceability-md` for the lead's human-readable acceptance map.

The full `review-bundle` includes a canonical blueprint architecture review, core-validated Site v1 audit, precise CMS field proposals, HTML parity/deep evidence (if provided), three-device captured markup comparisons (if provided), optional before/after Site v1 regression, a prioritized remediation backlog, release gates, evidence coverage, and pre-escaped Markdown handoff. No second CMS editor.

## Other CLI commands

| Command | Purpose | Required input |
|---|---|---|
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
| `execution-plan`, `execution-plan-md` | Dependency-aware phases/owners; approved, blocked, stale, deferred and rejected task lanes | `--site --blueprint`, optional `--decisions --delivery --snapshot --viewports --before` |
| `triage` | Reconcile human decisions with current backlog, detect stale proposals | `--site --blueprint --decisions`, optional `--snapshot --viewports --before` |

Use `--media <evidence.json>` in review, remediation, triage, release and traceability commands, or `media-review --site <site.json> --media <evidence.json> [--snapshot <html.json>]`. The media layer checks real Site v1 asset references, supplied public OG URLs, response status/MIME, and coverage, without fetching actual files or asserting social previews. The input schema is `schemas/media-evidence-v1.schema.json`.

For public-origin handoff, `--delivery stage3/seo-engine/fixtures/industrial.delivery.evidence.json` (synthetic example, **not** a live host) can be added to `review-bundle`, `remediation-plan`, `release-review`, `triage`, and `traceability`. It checks captured HTTP status, `X-Robots-Tag`, HTML robots, canonical target, missing page responses and a supplied complete direct XML `urlset`. Sitemap indexes are explicitly marked unenumerated. All URLs, bodies, statuses and timestamps are supplied assertions, not fetched or authenticated by this CLI. See `schemas/delivery-evidence-v1.schema.json`.

For custom project manifests, add `--manifests /path/to/manifests` to Site v1 commands; default is `stage3/components`.

## Evidence input rules

- `schemas/brief-v1.schema.json` and `schemas/blueprint-v1.schema.json`: versioned strict project research/planning; validation and canonical compilation are implemented by `lib/blueprint.cjs`. Confirmed vs unknown facts are explicit, and Schema.org entries are **candidates**, never release authorization.
- `schemas/html-snapshot-v1.schema.json`: `format=manufact-seo-html-snapshot-v1`; `pages=[{id,path,html}]`; optional sitemap/robots artifacts. **`completeness: "complete"` is a deliberate assertion that missing internal routes are genuinely absent from this supplied export**. Omitted or `"partial"` means *unverified target*, not broken link. This remains a static, trusted export—not deployed HTTP evidence.
- `schemas/viewport-capture-v1.schema.json`: `format=manufact-seo-viewport-evidence-v1`, `siteId`, and per-page `captures.desktop/tablet/mobile={method:"static-html"|"rendered-dom",html}`. All three must be supplied for *each supplied page*. The report separately flags planned pages **not covered by any capture**. Even a declared `rendered-dom` source cannot certify CSS visibility, responsive screenshots, interactivity, or browser accessibility.
- `schemas/media-evidence-v1.schema.json`: bounded caller-supplied media response evidence for known Site v1 assets and current HTML OG URLs.
- `schemas/delivery-evidence-v1.schema.json`: bounded manually supplied public HTTPS response transcript (`origin`, `pages`, optional `robots`/`sitemap`). Validates site-to-public-URL consistency, page headers/status, robots and direct sitemap URL set; **no live network capture** or status/indexing guarantee.
- `schemas/triage-v1.schema.json`: `format=manufact-seo-triage-v1`, `siteId`, and `decisions=[{taskId,taskKey,decision,reason,expectedBefore?,expectedAfter?}]`. Decisions are `approve`, `reject`, or `defer`. For field tasks, both before/after preconditions are required. `triage` marks stale decisions when matching tasks or field values changed. Approval is **not** applying a patch, passing tests, or releasing a site.

Fixtures include industrial and community briefs/plans; clean, defective, publication-drift and deep semantic HTML; mobile parity/drift and prior Site v1; a blank triage ledger.

## Ownership and guarantees

The external AI developer studies the actual niche, sources, users and SEO, then prepares **three STATIC design images** (desktop/tablet/mobile), client explanation, and portable internal specification. The lead constructs the actual site after approval. This toolkit supports research intake, blueprint, site audit, HTML evidence, readonly patch suggestions, and handoff. It never fabricates performance, rankings, demand, business facts, testimonials, or competitive evidence.

Existing Site v1 validator is reused from `stage3/sdk/contract.cjs`; no duplicate SEO UI. Editable SEO fields are limited to `title`, `description`, `robots`, `ogTitle`, `ogDescription` plus the already-existing image-asset-dependent `ogImage`; arbitrary canonical overrides, JSON-LD, and per-occurrence ALT are not automatically editable. All proposals require checking actual saved overrides, current manifest versions, and source values in the existing CMS.

Deep HTML reviews distinguish standalone/page-level JSON-LD types (including `@graph` roots) from nested `author`, `offers`, or `publisher` nodes. Nested types remain visible for diagnosis but do not independently create a misleading page-level Schema.org candidate warning.

Reports use conservative review labels and do **not** prove real HTTP codes, deployed canonical, Core Web Vitals, crawl results, browser visual parity, mobile UX, working forms, search rankings, or publication acceptance. `readyToPublish` is always false pending external, explicit human acceptance. Downstream UI must escape all data and must never execute reports.

### Publication artifact integrity (offline, read-only)

`node stage3/seo-engine/bin/seo-blueprint.cjs publication-integrity --site <site.json> --snapshot <html.snapshot.json>` compares supplied sitemap routes, page indexation, selected canonical paths and wildcard robots directives with Site v1. If **and only if** the supplied sitemapPaths is the full enumerated sitemap, set `sitemapCompleteness: "complete"` alongside `sitemapPaths` in the snapshot. Omission checks are disabled otherwise. These findings enter `remediation-plan`, `release-review` and `review-bundle.publicationIntegrity`. This tool never fetches a live host and cannot prove indexing, crawl permission, canonical origins or release readiness.

See [INTEGRATION-HANDOFF.md](INTEGRATION-HANDOFF.md), [NEXT-CHAT-HANDOFF.md](NEXT-CHAT-HANDOFF.md) and [research/PRIMARY-SOURCES.md](research/PRIMARY-SOURCES.md).
