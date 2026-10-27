# DESIGN FACTORY — OWNER VISUAL NO-GO and design-first reset
Date: 2026-10-27
Source: Owner feedback after personally viewing the D7 visual gallery and industry examples.
Scope: staging/integration-review branch only; do not reclassify original D7 validation branch or Lead production releases.

## AUTHORITY / RELEASE STATUS
**OWNER VISUAL VERDICT: REJECTED (subjective score 2/10).**
The owner saw multiple sites, calls them near-identical, generic, with poor spacing, oversized headings and non-professional proportions. The owner did NOT visually approve any of the 12 themes, 42 compositions, or example sites; do not ask them to sign the existing positive D7 human receipt. **Design Factory is NOT an acceptable end-user design system.** 
Technical D7 PASS still means ONLY Node/Chromium/PHP parity/ZIP machinery works as tested. It does not measure graphic design quality, client value, design originality or commercial readiness. Existing staging draft PR #10 is BLOCKED; do not merge, publish, advertise as ready or promote to Lead. Stage2 NO-GO, Stage3 0/135 formally accepted remain.

## ROOT CAUSE — source inspection, not speculation
1. `catalog/themes.cjs`: 12 themes share one token schema: colors, `georgia|arial|system`, max width, 3 headline sizes, layout of the same hero, geometric art variants, spacing density.
2. `lib/preview.cjs`: all sites use ONE fixed structural HTML renderer and common section CSS. The same hardcoded decorative `.art-shape`, `.art-circle` appear repeatedly; hero is up to 82px desktop and sections to 110px paddings from theme tokens. This creates superficial variety and disproportionate typography on real copy.
3. `catalog/compositions.cjs` defines 42 composition descriptors, but `lib/showcase.cjs` renders shared placeholder content keyed by 14 categories; 42 != 42 independently art-directed production-ready compositions. Multiple richer compositions are `integration_required`, not full CMS layout parity.
4. The D7 screenshots proved deterministic rendering/route health, not art direction. Owner visual feedback overrides any suggestion that machine tests established design quality.

## REFERENCES — benchmark instead of imitating a single wireframe
Source classes:
- Actual sector-specific, designer-built Framer templates: https://www.framer.com/marketplace/templates/ (furniture, SaaS, architecture, agency). Examples for photography-led furniture design: https://www.framer.com/marketplace/templates/arlow/ and architecture https://www.framer.com/marketplace/templates/categories/architecture/.
- Industrial site references with sector-real IA/components: https://webflow.com/made-in-webflow/industrial%20manufacturing ; https://templates.webflow.com/ . Examine several actual live demos per sector; do NOT just use screenshots or reproduce copyrighted templates.
- Standards: USWDS spacing tokens https://designsystem.digital.gov/design-tokens/spacing-units/ ; GOV.UK responsive spacing https://design-system.service.gov.uk/styles/spacing/ ; Digital.gov typography/accessibility https://digital.gov/guides/accessibility-for-teams/visual-design/ ; Visa typography https://design.visa.com/base-elements/typography/usage/ .

## CORRECT APPROACH (DESIGN BEFORE SCALE)
1. **Freeze** existing theme expansion, gallery/testing/docs feature creep and merge. Preserve SDK, Studio, preview/export and safe content validation engines. Current visual catalog is draft/obsolete: keep for migration/diagnostics, not sell or present to clients.
2. **Competitive benchmark**: collect 3–5 genuinely different live designer-built examples per chosen industry. Record grid, navigation, font pairing and scale, hero composition, imagery, rhythm, component order, forms, responsive mobile and actual content. Distinguish polished commercial websites from experimental art sites.
3. **Begin with THREE genuinely distinct complete design directions**, preferably furniture/product-led retail, industrial B2B catalog, SaaS/software landing. Not variants of one component. Must use three distinct IA, hero and section systems, photography/product imagery where licensed (or honest graphic placeholders only during WIP), believable short owner-approved demo copy.
4. **Working scale as starting points, not rigid laws:** body 16–18px with ~1.4–1.6 line height; ordinary H1 40–64px desktop when copy length permits, 30–42px mobile; H2 28–40px; text lines ~45–75 characters; content area ~1120–1280px; horizontal gutters 20–40px, responsive; base spacing rhythm 4/8px with deliberate 8/16/24/32/48/64 hierarchy. Headline size must adapt to actual sentence length, not just viewport. Contrast and accessible interaction remain hard requirements. Never force 110px sections on every site.
5. **Composition grammar**: data model stores actual purposeful layout variants (image-led, product-grid, comparison-table, case-study, technical specs, proof-first, editorial-story, trust/pricing etc.). Sector-specific content requirements select section order, not generic hero -> cards -> CTA -> footer for every industry. Use meaningful real images/assets with licenses, brand-specific accents, consistent icons and modular type scale. Different designs must be recognizably different with colors removed.
6. **Human quality gate BEFORE multiplying**: owner sees 3 complete, realistic, responsive homepages with actual content and mobile; user scores and chooses. If designs are poor, redesign those 3. Only after quality approval systematize components and integrate with CMS. This is a design acceptance gate, NOT another endless technical test suite.
7. **Integration**: connect only owner-approved designs to Design Graph/Studio/PHP; explicitly test layout/appearance parity as needed once, then return to main CMS development. Never let parallel design work stall functionality indefinitely.

## EXIT CONDITIONS
- 3 examples qualitatively distinct in layout, real content, hierarchy, imagery, section order (not just color).
- Owner explicitly accepts their visual quality and responsive layout; no claimed approval from technical green runs.
- Real live demos/screenshots supplied with direct viewing links (not fragile giant diagnostic archives).
- Only after approval may Lead un-block PR/integration; stage-specific acceptance still separate.
