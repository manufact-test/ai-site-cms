# Lead integration handoff — 2026-10-27

Branch: feature/site-seo-engine
Only changed files: stage3/seo-engine/**
No merges, deploys, CMS writes or modification of the lead's code.

## Existing contract compatibility
- Site v1: stage3/schemas/site-v1.schema.json; stage3/sdk/contract.cjs validateSite and inspectSite; manifests in stage3/components/*.json.
- Existing page SEO fields: page.seo.title (<=160), description (<=300), robots (index/noindex), ogTitle (<=160), ogDescription (<=300), ogImage (known image asset ID). No generic canonical or schema markup field.
- Existing page fields: id/path/title/sections; section IDs and element/node IDs are stable.
- Existing PHP PublicRenderer produces page metadata, OG, self canonical when origin is configured, sitemap of indexed pages and robots allowing discovery. Offline report does NOT verify deployment/origin or HTTP status.
- Core inspectSite already checks internal links, anchor targets, H1/hierarchy, title/description length/missing/duplicates and alt. Our Site v1 analyzer imports it, classifies findings, and adds plan/intent/structural mismatches, orphan-page findings. Numeric length hints are NOT hard Google rules.

## Supported safely now
Call lib/blueprint.cjs compileBrief(brief) or CLI compile to save a portable blueprint with the approved three-image prototype specification.
Call lib/analyze.cjs auditSite(site, manifests, blueprint) for normalized findings with stable page/section/element references. For an offline HTML export call snapshotAudit(snapshot) for heuristic checks.
Call lib/explain.cjs explain(blueprint) for the SEO portion of the client's description.
Call lib/handoff.cjs propose(site,manifests,blueprint): supportedChanges with pageId, pagePath, seo.field, before, after, reviewRequired and rationale. These are proposals ONLY; lead reviews manual overrides and applies through existing CMS Save -> Publish.

## Requires the lead's independent decision/implementation
- Non-self canonical: no Site v1 override; needs schema, editor and publisher support if truly required.
- Structured data JSON-LD: only candidate plan from verified facts. Current contract has no generic schema property; schema.org types must also meet search-engine-specific policies before public output. Unverified facts are never safe to publish.
- Asset alt: Site v1 has asset-level alt, so shared media may require page-specific binding; do not bulk override.
- OG image needs a real existing image asset ID; editorial image description cannot be automatically converted into one.
- New pages and missing sections require developer work from the approved prototype; do not inject templates.
- Robots/sitemap generation implemented but requires real public host checks; source-only analysis cannot confirm indexing.
- JS-rendered/SSR HTML, content parity on mobile, canonical HTTP handling, status code, headers, redirect status, real search appearance, accessible focus, Lighthouse/CrUX and CWV need appropriate live browser/server observation when explicitly authorized.

## Not in scope
SEO editor, CMS fork, new template generator, demo website, online SERP/crawler, ranking claims, keyword volume, auto-apply patch, extra dependencies, production, main branch.

## Integration steps for lead
1. Compare blueprint against client's approved static desktop/tablet/mobile pictures and complete design specification.
2. Build real site separately using existing manifest + Site v1.
3. Analyze real Site v1 with existing manifests; fix confirmed issues and review recommendations.
4. Review each supported SEO proposal against manual saved overrides before applying in CMS; keep requiresLeadImplementation separate.
5. Do a real-browser/mobile/performance/HTTP verification as part of actual site acceptance; this offline module does not certify it.

A green smoke verifies only basic module interoperability, never visual acceptance or rankings.