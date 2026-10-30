# MANUFACT SEO — Blueprint Studio: practical authoring quickstart

**Owner:** SEO worker, `feature/site-seo-engine`, changes only `stage3/seo-engine/**`. **Use:** private offline site-planning editor for the existing `manufact-seo-brief-v1` / `manufact-seo-blueprint-v1` engine. Nothing deploys, publishes, calls a language model or automatically changes CMS.

## Open a brand-new SEO planning session

```bash
node stage3/seo-engine/bin/seo-blueprint-studio.cjs \
  --site-id site-new-example --out /ABS/private/NEW-blueprint-studio
```

Open `/ABS/private/NEW-blueprint-studio/BLUEPRINT-STUDIO.html` with a browser (the file is **not** a web application). Complete site name, language, region, audience, goal; add actual owner facts, research references, planned pages, one H1 per page, other sections, editorial points, meta title/description, mobile/tablet/desktop expectations, CTAs and contextual links. All links refer to **approved page IDs**, not arbitrary URLs. Optional Schema.org candidates must reference real fact IDs. Confirmed owner claims are only attested data, not verified rich-result eligibility.

Save an unfinished `seo-brief-draft-SITE-ID.json` at any point. Re-import only for the same site ID. The `Export for SEO compiler` action first runs local structural checks; it creates an ordinary private `seo-brief-SITE-ID.json`. The editor does not create any fabricated keyword research or customer evidence.

## Start from existing data

```bash
node stage3/seo-engine/bin/seo-blueprint-studio.cjs \
  --brief /ABS/private/approved-brief.json --out /ABS/private/NEW-editor-from-brief
node stage3/seo-engine/bin/seo-blueprint-studio.cjs \
  --blueprint /ABS/private/approved-blueprint.json --out /ABS/private/NEW-editor-from-blueprint
```

The compiled Blueprint input must pass the original canonical `checkBlueprint` contract and is converted losslessly back into its editable original brief fields. The original input SHA256 is stored in the **private** `STUDIO-MANIFEST.json`. The output folder is new, created atomically with local file permissions, outside the repository. Public HTML, deployment assets and CMS files are never touched.

## The authoritative next step — Node compiler

```bash
node stage3/seo-engine/bin/seo-blueprint.cjs compile \
  --brief /ABS/private/seo-brief-SITE-ID.json > /ABS/private/approved-blueprint.json
node stage3/seo-engine/bin/seo-blueprint.cjs review-blueprint \
  --blueprint /ABS/private/approved-blueprint.json
node stage3/seo-engine/bin/seo-blueprint.cjs review-architecture \
  --blueprint /ABS/private/approved-blueprint.json
```

**Do not confuse local browser field checks with the official Node compiler.** The compiler validates the exact v1 brief contract; architecture and editorial review highlight problems for an independent human/owner. This tool is not client signoff. A private draft or compilation does not authorize CMS implementation, deployment, PR or merge.

## Focused checks for the lead

```bash
node stage3/seo-engine/tests/blueprint-studio-smoke.cjs
node stage3/seo-engine/tests/blueprint-studio-cli-smoke.cjs
```

The first test checks source-accurate canonical conversions, HTML/script CSP and source escaping. The second runs actual local Node CLI creation/import against private temporary inputs and verifies non-overwrite, no-checkout imports and cleanup. These are **offline** tests; they are not a claim that a real client site or live hosting has been validated.

## Boundaries

- One primary language per `manufact-seo-brief-v1`; hreflang/localized variants require a separately approved v2 contract, not guessed locale URLs.
- Planned SEO titles, canonical paths, CTA links and schema candidates are proposals only.
- No auto-publishing, external browser network requests, LLM-generated unverifiable facts, SEO ranking guarantees, customer private addresses or website form posts.
- Keep all exported files and local studio reports outside GitHub and public uploads.
