# MANUFACT SEO — Crawl/CMS task lifecycle, human Decision Desk and post-edit recheck

**2026-10-30 | Independent SEO worker scope only: `feature/site-seo-engine` / `stage3/seo-engine/**`.** The lead developer is the **sole CMS integrator**. Everything here consumes **original private operator-selected source files** and writes only a **new private local folder**. Never commit client worklists, GSC data or human decisions; no PR, CMS Save/Publish, hosting deploy, live Google confirmation or owner authentication is performed.

## What is implemented

The first crawl/CMS worklist already maps Crawl Policy → approved Blueprint + operator Site v1 → P0/P1/P2 human tasks. This continuation adds the missing real-world operating loop:

1. **First review:** open the original private operator workspace's `crawl-cms.html`. It links `crawl-cms-decisions.html`, a source-bound, offline browser editor for reviewer status, assignee, decision date, rationale, private evidence references, and manual change description. It generates `crawl-cms-decisions-TEMPLATE.json` for operators preferring JSON. The desk supports search, P0/P1/P2 filters, status filters, editing, importing a **same-source** private draft, unfinished draft download and validated JSON export. No remote connections, external assets, client secrets or HTTP calls. CSP script is pinned by its SHA256 hash.
2. **Human decisions:** statuses are `unreviewed`, `accepted`, `in-progress`, `completed-reported`, `deferred` and `rejected`. A reviewed task needs assignee, decision date and rationale. `completed-reported` additionally needs a concrete *manual* change description and one or more references to private evidence. The schema explicitly prohibits claiming a verified public host or authenticated owner signoff. A human assertion is never a release authorization.
3. **Next evidence cycle:** collect fresh **original** robots/sitemap, approved Blueprint and owner-selected Site v1, build a **new** crawl/CMS worklist. Supply old worklist and, optionally, edited old ledger. Compare old exact task IDs with new ones. The result distinguishes **persistent**, **new/changed**, **no longer observed but NOT independently verified fixed**, and **owner reported completed yet issue is STILL observed**. New P0 tasks get a separate urgent count.
4. **Post-edit verification:** independently authenticate real owner-published CMS revision, actual HTTPS/redirect/canonical/robots/sitemap/X-Robots-Tag and Search Console status. Only the lead may implement approved corrections with rollback. The offline report **never** changes state to verified, closed or approved.

This reuses the existing SEO Operator Workspace; no second CMS, no parallel publisher and no auto-merge.

## A. Use within the EXISTING Operator Workspace

First cycle, same as previous release:

```json
{
  "format": "manufact-seo-operator-workspace-config-v1",
  "crawl": {
    "policy": "/ABS/private/crawl/CRAWL-POLICY-REPORT.json",
    "cmsBlueprint": "/ABS/private/approved-blueprint.json",
    "cmsSite": "/ABS/private/current-site-v1.json"
  }
}
```

Run:

```bash
node stage3/seo-engine/bin/build-seo-operator-workspace.cjs \
  --config /ABS/private/seo-workspace-config.json \
  --out /ABS/private/NEW-first-cycle-workspace
```

Open `index.html` → Crawl & Search Delivery → CMS implementation → `crawl-cms-decisions.html`. Save the completed export separately as `/ABS/private/first-cycle-human-decisions.json`, not inside Git. Retain the **original** `crawl-cms-worklist.json` from this cycle (including its trailing newline). Its original file SHA256 is the immutable source identity for this ledger.

For the next cycle, collect **new** original evidence and point the same builder at it. Add the two optional fields:

```json
{
  "format": "manufact-seo-operator-workspace-config-v1",
  "crawl": {
    "policy": "/ABS/private/NEW/crawl/CRAWL-POLICY-REPORT.json",
    "cmsBlueprint": "/ABS/private/NEW/approved-blueprint.json",
    "cmsSite": "/ABS/private/NEW/current-site-v1.json",
    "cmsBaseline": "/ABS/private/first-cycle-workspace/crawl-cms-worklist.json",
    "cmsDecisions": "/ABS/private/first-cycle-human-decisions.json"
  }
}
```

**`cmsBaseline` requires the new original `cmsBlueprint` and `cmsSite`; `cmsDecisions` requires `cmsBaseline`.** Omit `cmsDecisions` if no human ledger was recorded. A mismatched original worklist SHA, site ID, canonical Blueprint SHA, site mount or task list is rejected outright. The new workspace contains:

- `crawl-cms-recheck.html`: no-script, source-pinned, offline HTML recheck view.
- `crawl-cms-recheck.json`: human-readable structured classifications and exact original SHA256 source fingerprints.
- `crawl-cms-recheck.md`: private summary for the lead.
- `crawl-cms-decisions.html`: new offline Decision Desk for the current cycle's tasks (starts **unreviewed**; no automatic carry-over).
- `crawl-cms-decisions-TEMPLATE.json`: fresh current-period editable human template.
- The existing `crawl-cms.html`, `crawl-cms-worklist.md`, `crawl-cms-worklist.json`, `crawl.html`, `workspace-manifest.json`, plus any earlier optional crawl repair outputs.

Any `DRAFT-ONLY-` proposed robots/sitemap are still unapproved and never uploaded automatically.

## B. Fast independent CLI (without rebuilding Crawl Policy)

For an existing worklist, create a fresh local editor and matching template:

```bash
node stage3/seo-engine/bin/recheck-crawl-cms-work.cjs \
  --worklist /ABS/private/old-workspace/crawl-cms-worklist.json \
  --out /ABS/private/NEW-ledger-desk
```

This emits `crawl-cms-decisions.html`, `crawl-cms-decisions-TEMPLATE.json`, `PRIVATE-SOURCE-MANIFEST.json` and `PRIVATE-README.txt`. All output uses a new directory, never overwrites the worklist or anyone's decisions.

To compare an earlier and a fresh worklist:

```bash
node stage3/seo-engine/bin/recheck-crawl-cms-work.cjs \
  --before /ABS/private/old-workspace/crawl-cms-worklist.json \
  --after /ABS/private/new-workspace/crawl-cms-worklist.json \
  --decisions /ABS/private/old-human-decisions.json \
  --out /ABS/private/NEW-after-edit-recheck
```

`--decisions` is optional. If omitted, historical human status remains `unreviewed`, never guessed. Output: `crawl-cms-recheck.html`, `crawl-cms-recheck.json`, `crawl-cms-recheck.md`, `crawl-cms-next-decisions-TEMPLATE.json`, `crawl-cms-next-decisions.html`, `PRIVATE-SOURCE-MANIFEST.json`, `PRIVATE-README.txt`. Original files must be absolute, bounded regular files outside the repository; symlinks, stale human ledgers, bad hashes, duplicate IDs, cross-site/cross-Blueprint/cross-mount pairs, target overwrite and in-flight source mutation fail closed. Files are written with restrictive permissions in temporary staging and promoted atomically.

## Task classification contract and limitations

- **Persistent:** exact stable task ID exists in both source worklists. If a person marked it `completed-reported` before, it is flagged as *still observed*.
- **No longer observed:** exact task ID is missing. **NEVER** assert resolution. It might indicate changed source scope, title/detail change, missing input, editor overrides or a real fix; the lead must independently verify the public host.
- **New or changed:** exact ID appears only in the current worklist. Previous human decisions cannot be transferred. New P0 gets highlighted.
- **Source identity:** same client `siteId`, HTTPS mount and canonical approved Blueprint hash; original worklist, human ledger, and before/after selected Site v1 **raw byte SHA256** remain visible for audit. A change in operator Site v1 bytes does not authenticate a real published change.
- **Safety:** `releaseAuthorized:false`, `automaticStateTransition:false`, `ownerApprovalAuthenticated:false`, `publicHostAuthenticated:false`, `currentCmsRevisionAuthenticated:false` on the comparison report. Missing tasks are not auto-closed; statuses never execute an editor patch.

## Focused real-Node acceptance for the lead

```bash
node stage3/seo-engine/tests/crawl-cms-workspace-smoke.cjs
node stage3/seo-engine/tests/crawl-cms-lifecycle-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
```

The new lifecycle smoke tests two original reports using the existing `industrial.blueprint.json` fixture and changed operator Site v1; one task is owner-reported complete and still observed, another disappears but **is not** verified resolved, and new tasks must not inherit approval. It exercises exact raw ledger SHA pinning, old/new mismatch rejection, HTML safety, standalone CLI template, two-cycle output, repeat-output refusal, stale-decision refusal and a no-ledger comparison.

**Verification distinction:** the worker can perform isolated V8 source/syntax composition on GitHub files; **real Node CLI smoke and live customer acceptance require the integrated checkout and have not been executed in the worker environment**. A green lead CI for another branch is NOT a test of these new SEO files.

## Lead integration boundary

Bring over the allowed SEO subtree only, run the small relevant Node smokes, review the source hashes, verify the real current Site v1 revision and the actual public host, have the owner approve concrete repairs, then use lead-controlled editor/publisher with manual QA and rollback. Never copy the raw worklists, human ledger or customer GSC data to the repository. Do not merge or deploy this worker branch automatically.

**Verification addendum (2026-10-30):** the worker also exercised the actual lifecycle and standalone CLI source through an isolated V8 integration adapter with a virtual Node `fs`/`path`/`crypto` implementation. It produced a private decision template (JSON + offline HTML), a full seven-file recheck folder, pinned manifests, refused overwriting an existing directory and rejected a stale original worklist SHA ledger. This was **not** a real Node process or actual filesystem test. The `tests/crawl-cms-lifecycle-smoke.cjs` remains for the lead-integrated Node checkout.
