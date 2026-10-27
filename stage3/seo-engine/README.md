# SEO Intelligence & Blueprint Engine v1

A standalone versioned Node CommonJS toolkit for the external AI developer and lead integrator. Not a CMS, editor, template library, SERP crawler, keyword API or generator of web pages. Offline, no npm dependencies, Node 20+ recommended.

## Two-minute usage (commands from repository root)

1. Fill a project-specific brief based on actual niche/user research. Examples: fixtures/industrial.brief.json and fixtures/community.brief.json (fictional demonstration input).
2. Compile the approved plan:

    node stage3/seo-engine/bin/seo-blueprint.cjs compile --brief stage3/seo-engine/fixtures/industrial.brief.json > /tmp/seo-plan.json

3. For the three STATIC prototype pictures and the associated full design specification, supply a separate explanatory SEO/UX section to the lead:

    node stage3/seo-engine/bin/seo-blueprint.cjs explain --blueprint /tmp/seo-plan.json

4. Once a real site exists, analyze existing Site v1 content and its blueprint:

    node stage3/seo-engine/bin/seo-blueprint.cjs analyze-site --site stage3/fixtures/industrial-site.json --blueprint /tmp/seo-plan.json

5. Prepare a non-executable mapping for the lead to review in the existing CMS:

    node stage3/seo-engine/bin/seo-blueprint.cjs handoff --site stage3/fixtures/industrial-site.json --blueprint /tmp/seo-plan.json

6. Optionally analyze a trusted, explicitly supplied offline HTML snapshot:

    node stage3/seo-engine/bin/seo-blueprint.cjs analyze-html --snapshot stage3/seo-engine/fixtures/invalid.snapshot.json

One vertical standalone smoke:

    node stage3/seo-engine/tests/smoke.cjs

For custom Site v1 manifests use --manifests DIRECTORY on analyze-site/handoff (default: stage3/components).

## Contracts and safety
- schemas/brief-v1.schema.json and schemas/blueprint-v1.schema.json are descriptive pinned interchange contracts. lib/blueprint.cjs implements strict actual validation, cross-references and canonical reproducible compilation. It deliberately does not perform automatic web research or claim keyword volumes.
- Editorial brief stores confirmed vs unverified facts; source observations; per-page intent, topics, rationale and section ordering; page SEO; meaningful image ALT intent; target IDs for internal links/CTAs; schema candidates with evidence IDs; and separate desktop/tablet/mobile narratives. Three actual prototype images and full UX/design notes remain the lead's separate responsibility.
- The core Site v1 validator and its inspectSite implementation are imported from stage3/sdk/contract.cjs; analyzer adds blueprint-to-implemented-site and contextual internal-link checks rather than cloning existing checks.
- The HTML snapshot JSON shape is format=manufact-seo-html-snapshot-v1, pages=[{id,path,html}], optional sitemapPaths and robotsTxt. Bounded token/regex heuristic; NOT a real DOM, network crawl, JS renderer or HTTP status checker. Some markup cannot be analyzed reliably. Only provided artifacts are examined.
- Handoff only proposes editable Site v1 SEO fields using stable page IDs and before/after review. It never writes CMS, site, DB, source files or production. Unsupported changes and missing evidence are explicitly separated.
- The CLI emits plain text/Markdown or JSON, not executable report HTML. All downstream UIs must escape report values.
- Example plans are pinned in fixtures and can be recreated from each brief. Deliberately defective HTML snapshot and expected finding codes demonstrate failure handling.

See INTEGRATION-HANDOFF.md for exact core integration boundaries and research/PRIMARY-SOURCES.md for professional sources.