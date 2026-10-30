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

## Live architecture intelligence while editing

The Studio's **Architecture intelligence** panel continuously reconstructs explicit planned contextual links and CTAs into a local site map. It shows counts of planned indexed pages, pages lacking direct indexed inbound links, pages unreachable from home through the planned edges, and proposed links. For each page it displays the planned robots directive, canonical, incoming and outgoing edges. It flags duplicate declared primary intent/topics or titles, canonical references targeting noindex pages/chains, and unconfirmed owner facts used by Schema.org proposals. No content is fetched or published. **A warning about a missing planned edge is not a claim that the real website lacks header/footer navigation or cannot be crawled.** The official Node `review-architecture` is still mandatory.

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
node stage3/seo-engine/tests/blueprint-studio-browser-smoke.cjs
```

The first test checks source-accurate canonical conversions, HTML/script CSP and source escaping. The second runs actual local Node CLI creation/import against private temporary inputs and verifies non-overwrite, no-checkout imports and cleanup. A third test drives the exported offline HTML with a minimal DOM to check a live page-count/link-plan preview, adding a page, incomplete-state rejection and safe draft export. These are **offline** tests; they are not a claim that a real client site or live hosting has been validated.

## Compare prior SEO plans with a new Studio export

After exporting a new Studio brief, run bin/compare-seo-blueprints.cjs against the previous approved Blueprint/brief. Both original compiled Blueprint v1 and raw v1 brief are supported. The new private HTML report contains an offline DECISION-DESK.html for the owner/SEO lead. A second exact-source decision reviewer records status without authenticating client approval. See BLUEPRINT-CHANGE-REVIEW.md. These tools never update Site v1 or create actual 301s.

## Boundaries

- One primary language per `manufact-seo-brief-v1`; hreflang/localized variants require a separately approved v2 contract, not guessed locale URLs.
- Planned SEO titles, canonical paths, CTA links and schema candidates are proposals only.
- No auto-publishing, external browser network requests, LLM-generated unverifiable facts, SEO ranking guarantees, customer private addresses or website form posts.
- Keep all exported files and local studio reports outside GitHub and public uploads.
