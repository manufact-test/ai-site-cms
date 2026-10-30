# Crawl findings → existing CMS & publisher worklist

**Date:** 2026-10-30. **Branch:** `feature/site-seo-engine`. **Allowed scope:** `stage3/seo-engine/**`. The CMS lead is sole integrator and owner of any real CMS Save/Publish/hosting deployment. No new CMS interface, client domain fetch or release permission is created here.

## Why this addition matters

The existing Crawl Policy / Regression / Search Indexing / Repair modules answer: *what does the operator-supplied evidence suggest may be wrong?* The existing SEO Operator Workspace shows these investigation tasks. The additional **Crawl → CMS Implementation** panel answers: *where must the lead investigate each problem and what should NOT be changed automatically?*

Unlike a raw bug list, it distinguishes these distinct classes:

| Source signal | Work target | What the tool explicitly does NOT do |
|---|---|---|
| Site v1 `seo.robots` mismatches approved Blueprint | Existing page SEO editor, after override review | Does not reinterpret `seo.robots` as a robots.txt `Allow`/ `Disallow` |
| Approved canonical page newly/previously blocked for Googlebot/Bingbot | Publisher/hosting robots policy and owner privacy rules | Does not bypass named-agent groups or upload proposed robots |
| Approved canonical URL missing from *declared complete* XML sitemap | Publisher sitemap and public URL verification | Does not claim coverage from sitemap-index or sample |
| CMS Site v1 route absent, moved or extra | Lead route inventory and client-approved plan | Does not delete or recreate pages |
| Redirect shadows an approved indexable canonical URL | Lead redirect mapping and live HTTP | Does not deploy a redirect |
| Operator GSC report and robots co-observations | Independent Search Console URL Inspection | Does not infer cause or current Google indexation |
| Crawl Repair manual hold | Owner/lead implementation review | Does not treat draft candidate as approved |
| SEO title, description, OG drift | Existing SEO page fields / editorial overrides | Does not invent replacement copy or overwrite saved edits |
| Canonical drift | Lead renderer/canonical implementation review | Does not assume Site v1 supports a writable canonical field |

## Existing workspace configuration (optional enhancement)

Add **both** `cmsBlueprint` and `cmsSite` to the already-existing `crawl` object. They must be the original, private, locally saved inputs, outside Git, as used by the operator:

```json
{
  "format": "manufact-seo-operator-workspace-config-v1",
  "crawl": {
    "policy": "/ABS/private/current-crawl/CRAWL-POLICY-REPORT.json",
    "cmsBlueprint": "/ABS/private/approved-blueprint.json",
    "cmsSite": "/ABS/private/owner-current-site-v1.json"
  }
}
```

Other optional `crawl` keys — `regression`, `correlation`, and the four-file Crawl Repair dossier — continue to work. If you include a repair dossier, the raw Blueprint and Site v1 byte SHA256 MUST match its source manifest. If you add indexing correlation, the exact original Blueprint SHA256 MUST match that index report. The same HTTPS public mount, siteId, canonical Blueprint identity, original robots/sitemap and agent/scope are enforced by the unified workflow. Wrong or incomplete pairs are rejected, not silently reconciled.

Run the **same** existing command:

```bash
node stage3/seo-engine/bin/build-seo-operator-workspace.cjs \
 --config /ABS/private/seo-workspace-config.json \
 --out /ABS/private/NEW-client-operator-workspace
```

Open `index.html` → **Crawl & Search Delivery** → **CMS / publisher implementation mapping**. The builder adds these files **inside the same private output folder**:

- `crawl-cms.html`: CSP-restricted, offline, escaped comparison of approved page IDs, routes, robots/canonical and operator Site v1, with actual P0/P1/P2 targets and next manual actions.
- `crawl-cms-worklist.md`: private, source-pinned human worklist for the CMS lead.
- `crawl-cms-worklist.json`: machine-readable, **readOnly:true / releaseAuthorized:false / automaticApplication:false** work packets; NEVER an executable patch contract.
- `workspace-manifest.json`: original file SHA256 for the two additional sources plus `crawlEvidence.siteSnapshotSha256` and semantic Site v1 fingerprint.

Original inputs remain outside the generated output; no private source file is uploaded to GitHub. Existing Crawl Repair files, if any, retain their `DRAFT-ONLY-` names.

## Source consistency guarantees

The new `lib/crawl-cms-implementation.cjs` revalidates the actual canonical compiled Blueprint v1 using the unchanged existing Blueprint compiler contract. It recomputes the canonical Blueprint SHA256 used by `crawl-policy.cjs`, binds source raw SHA256 from the actual input bytes, validates the selected Site v1 format, schema version, siteId, unique stable IDs/routes, full crawl-policy page inventory, and reports missing/extra routes. Candidate repair dossier source raw hashes are compared against exactly the same Blueprint and Site v1 originals. A mismatch causes a **hard error** before any new output directory is promoted.

The output's Site v1 snapshot is still **operator-selected, not automatically authenticated as current published CMS revision**. A hash match is byte integrity, not proof of original host provenance or owner permission. The CMS lead must authenticate real current sourceRevision and public HTTPS before acting.

## Required lead acceptance

Run actual Node smokes in the lead-integrated checkout:

```bash
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/crawl-cms-workspace-smoke.cjs
node stage3/seo-engine/tests/crawl-repair-smoke.cjs
node stage3/seo-engine/tests/crawl-repair-cli-smoke.cjs
```

The new smoke uses the existing real `industrial.blueprint.json` fixture with synthetic **operator Site v1 drift**, one approved canonical Googlebot block, declared complete sitemap omission, an extra Site v1 page and a redirect collision. It creates a local private workspace with the **real Node CLI** when executed, then verifies non-overwrite, hashed manifest, private files, request refusal and no release permission.

**Verification truth:** the independent SEO worker checked JavaScript syntax and ran actual new module composition via an isolated V8 adapter and synthetic SHA provider; **real Node subprocess/FS smoke is added but not executed here**. No genuine customer source, live HTTPS/robots, GSC property authentication, frontend browser or owner signoff has been checked.

## Integration sequence

1. Lead brings only current `stage3/seo-engine/**` worker files into their checkout.
2. Lead runs focused Node tests and confirms current Site v1/Site v2 and owner-published version.
3. Operator prepares original Blueprint, actual current Site v1, original robots + sitemap, and optional regression/indexing/repair dossiers.
4. Operator builds **the same existing SEO Operator Workspace** and reviews the added CMS/publisher worklist.
5. Lead selects manual fixes in the existing CMS/publisher implementation workflow **only after owner approval**. Independently verify live HTTPS, redirects, canonical, X-Robots-Tag, on-page meta and actual Search Console URL Inspection. Rollback remains available.
6. No automatic Save/Publish, PR, merge, deployment, Google indexing request or automatic acceptance.


## Stable work tracking and evidence checklist

Each JSON/Markdown action now has a deterministic `crawl-cms:<sha256-prefix>` task ID, a specific `ownerTeam` (`CMS_EDITOR`, `PUBLISHER_LEAD`, `SEO_OPERATOR`, or `OWNER_AND_LEAD`), `evidenceRequired[]`, `ownerApprovalRequired:true`, and `readyToImplement:false`. The worklist groups practical responsibility, not automatic release authorization. IDs are stable for the **same original-source observed issue**; changed issue detail or approved source naturally produces a new ID, and the operator must not assume unrelated releases have the same task. The private HTML shows the ID, responsible team and mandatory original proof next to each action.
