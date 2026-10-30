# MANUFACT SEO — public HTTPS evidence → existing Crawl/CMS task closure review

**Scope:** `feature/site-seo-engine` → `stage3/seo-engine/**` only. **Date:** 2026-10-30. This is an offline *observation and lead handoff* capability, not a publisher, Google connector, second CMS or automatic task closer. The sole integrator is the main developer on `feature/stage3-ai-site-contract`.

## Why this matters

The existing private Crawl/CMS Lifecycle can explain which operator-selected tasks disappeared between before/after snapshots. That does **not** establish that actual public HTTP, HTTPS, canonical, robots and sitemap changed. The new `lib/crawl-cms-public-followup.cjs` connects **current private source-bound Crawl/CMS worklist** to the project's already-existing `lib/public-https-capture.cjs`, `lib/delivery-evidence.cjs`, `lib/crawl-policy.cjs` and `lib/parity.cjs` contracts. These modules remain unchanged. No new network collector or CMS mutation is introduced.

Results for each existing task are **strictly observational**:

| State | Interpretation |
| --- | --- |
| `OBSERVED-CONFLICT` | The provided raw HTTP transcript still conflicts with approved Blueprint / canonical / crawler policy |
| `OBSERVED-ALIGNED-NOT-VERIFIED` | The provided bytes appear aligned; **not** authenticated live deployment, public source revision, verified fix or Google indexation |
| `INSUFFICIENT-EVIDENCE` | This task cannot be determined from the supplied public responses; no positive or negative closure claim |

**All states retain:** `publicHostAuthenticated:false`, `ownerApprovalAuthenticated:false`, `automaticClosure:false`, `releaseAuthorized:false`.

Supported source-bound checks: Googlebot/Bingbot/specific-agent access via parsed robots.txt (independently of sitemap availability), approved URL in direct complete XML sitemap (independently of robots availability), HTTP 200 on canonical route previously shadowed by redirect, public robots meta + X-Robots-Tag matching approved Blueprint, title/description/OG fields, and resolved canonical link. Missing HTML, failed HTTP statuses, missing robot/sitemap, partial or sitemap-index evidence, private CMS route inventory, owner override policy, GSC-only findings and draft manual holds are explicitly insufficient. Existing `DELIVERY.review` findings, including soft-404, hidden operator artifact exposure, page response status and sitemap discrepancies, appear in a **separate independent HTTP blocker section**.

We revalidate canonical compiled Blueprint, siteId, original raw SHA256 of approved Blueprint and current Site v1 against the generated worklist, exact public HTTPS origin and mount, raw public transcript SHA256 and optional lifecycle recheck (must be bound to precisely the current worklist). We never copy raw HTML/page body to the generated HTML/JSON/Markdown: outputs retain only task IDs, short observations/statuses, source SHA256 and limited field comparisons.

## A. Inside the existing SEO Operator Workspace

Use the SAME private workspace configuration as previous passes. Add **one** optional `crawl.publicCapture` file; it requires the paired original `crawl.cmsBlueprint` and `crawl.cmsSite` files and an existing `crawl.policy`.

```json
{
  "format": "manufact-seo-operator-workspace-config-v1",
  "crawl": {
    "policy": "/ABS/private/CRAWL-POLICY-REPORT.json",
    "cmsBlueprint": "/ABS/private/approved-blueprint.json",
    "cmsSite": "/ABS/private/current-owner-site-v1.json",
    "publicCapture": "/ABS/private/actual-public-https-evidence.json"
  }
}
```

Run exactly the existing command:

```bash
node stage3/seo-engine/bin/build-seo-operator-workspace.cjs \
  --config /ABS/private/seo-workspace-config.json \
  --out /ABS/private/NEW-OPERATOR-WORKSPACE
```

The public capture file is an **original saved output** of the project's existing `capture-public-https.cjs` workflow, not a fabricated source status. When that workflow is unavailable, omit `publicCapture` entirely; this new panel will not pretend public verification happened.

New entries in existing `index.html` → `crawl.html`: `crawl-public-followup.html`, `crawl-public-followup.md` and `crawl-public-followup.json`. Original input raw SHA256 is recorded in the same `workspace-manifest.json`, with a new landing-page card showing conflict/unknown counts. Other optional crawl, indexing, repair and previous human decision workflows remain independent and available.

## B. Independent offline CLI (no rebuild needed)

Reuse **already-saved original** worklist and public HTTP transcript files:

```bash
node stage3/seo-engine/bin/review-crawl-public-fixes.cjs \
  --worklist /ABS/private/CURRENT-workspace/crawl-cms-worklist.json \
  --blueprint /ABS/private/approved-blueprint.json \
  --site /ABS/private/current-owner-site-v1.json \
  --public-http /ABS/private/actual-public-https-evidence.json \
  --out /ABS/private/NEW-public-seo-review
```

Optionally add `--recheck /ABS/private/CURRENT-workspace/crawl-cms-recheck.json`. It MUST refer to the current worklist's **exact original raw SHA256**; mismatched or stale rechecks fail closed.

The CLI:
- rejects checkout-contained sources and symlinks; requires absolute distinct source files and bounded original JSON bytes
- validates all same-site, same-mount, compiled Blueprint and source byte SHA256 links
- writes a **new private folder** with `crawl-public-followup.html/.md/.json`, `PRIVATE-SOURCE-MANIFEST.json`, `PRIVATE-README.txt`; mode `0600` and no overwrite
- re-hashes every input after generation and refuses partial or changed evidence; atomic folder promotion
- contains no fetch/POST, CMS API, GitHub deployment, owner approval or Google indexing calls.

Run focused tests in lead-integrated checkout:

```bash
node stage3/seo-engine/tests/crawl-cms-public-followup-smoke.cjs
node stage3/seo-engine/tests/crawl-cms-lifecycle-smoke.cjs
node stage3/seo-engine/tests/crawl-cms-workspace-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
```

The new Node smoke uses the real compiled `industrial.blueprint.json` fixture, original source policy with Googlebot blocked and contact missing from sitemap, changed Site v1 metadata/robots and redirect collision, then synthesizes HTTP captures with restored/blocked/partial evidence. It verifies observed alignment, persisting blocks, missing sitemap, absent HTML, source mismatch, HTML CSP, same-Workspace card, original SHA256, CLI private output and refusal of source mismatches/overwrite.

**Verification honesty:** isolated V8 syntax/module checks may be run in this independent GitHub-only worker, but no real Node/Chrome/browser, customer host, current CMS source revision, Google property, staging release or client acceptance is automatically authenticated. The lead should execute real Node tests and independently verify actual HTTPS and client source revision after subtree integration. A green Actions result in the lead's branch is not proof of passing SEO worker tests.

## Lead integration checklist

1. Integrate only `stage3/seo-engine/**` files when convenient; no PR/merge or deployment from this worker.
2. Run focused real Node tests above.
3. Obtain **owner-approved, current** Site v1, original approved Blueprint and the original public HTTPS transcript captured under the same approved base. Keep these private, outside Git.
4. Investigate all `OBSERVED-CONFLICT` and independent delivery blockers first, then all unknowns. For aligned observations, independently authenticate live served bytes/sourceRevision and owner decisions; never auto-close.
5. Perform separate URL Inspection / Search Console confirmation when indexation is at issue; rank/traffic improvement remains a separate measurement.
6. Only the sole CMS lead may authorize and perform implementation with rollback; this report remains a read-only private document.
