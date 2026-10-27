# AI Site CMS — MAIN LEAD HANDOFF v1.76: Design Factory visual NO-GO
**27 October 2026. This is the current lead instruction and supersedes v1.75 only on visual governance / branch integration. Technical v1.75 history remains intact.**

## Who owns what
You are the **sole Lead integrator** on feature/stage3-ai-site-contract. Independent Design Factory worker operates only on feature/stage3-design-factory within stage3/design-factory/**. Source repo: https://github.com/manufact-test/ai-site-cms. Do NOT edit other developer's directory from Lead branch or merge without explicit owner approval. main and production stay unchanged.

## Critical owner event: visual designs REJECTED
Owner personally inspected multiple Design Factory gallery/site examples and rated them **2/10**. 12 themes and 42 composition previews seem formulaic/near-identical, with enormous H1, unbalanced whitespace, poor art direction. **This is formal VISUAL NO-GO.** Do not confuse D7 technical success with design acceptance. The original concept "build 12+ themes / 42 showcase variations before design research and owner visual review" was wrong. Owner wants a professional reference-driven design system and multiple genuinely different sites.

## What actually was done since v1.75 (separate branches)
- Lead ran D7 on separate feature/stage3-design-factory-d7-validation branch @ 535ce5c6e89776c31539795ac9f742272e1fce26. Real Actions https://github.com/manufact-test/ai-site-cms/actions/runs/40567001862 reported Node/Chromium PASS, 54 PNG desktop/tablet/mobile, 64 browser routes, 164 compiled artifacts, six PHP probes and validated ZIP. **Machine infrastructure YES; owner visual acceptance NO.** This source differs from original independent worker branch; do not imply bugfixes landed there.
- Integration-review branch and draft PR #10 imported 94 Design Factory source files into a staging review, but **never merged**. Owner visual rejection now blocks/cancels such integration until designs replaced and accepted. No main, SDK, PHP, live hosting changes.
- Old worker branch feature/stage3-design-factory has new controlling documents:
  - https://github.com/manufact-test/ai-site-cms/blob/feature/stage3-design-factory/stage3/design-factory/DESIGN-RESET-2026-10-27.md
  - https://github.com/manufact-test/ai-site-cms/blob/feature/stage3-design-factory/stage3/design-factory/DESIGN-REFERENCE-PLAYBOOK.md
  - https://github.com/manufact-test/ai-site-cms/blob/feature/stage3-design-factory/stage3/design-factory/handoffs/DESIGN-REBUILD-SECOND-DEVELOPER-2026-10-27.md
- Original worker's mission/roadmap/quality/handoffs have owner-NO-GO prefixes; older "86%", "12 professional" and "close D7 next" do not supersede the new visual policy.

## Design worker's ordered deliverable (not a parallel architecture rewrite)
R0: analyze 3–5 actual live designer-made references per sector (furniture retail, manufacturing B2B, SaaS). Use Framer/Webflow examples and GOV.UK/USWDS typography/spacing. Document strengths, defects and actionable design decisions, assets rights.
R1–R2: implement three original recognizably different responsive sites, with meaningful full homepage + secondary flow, real content/imagery, distinct brand styles and section/hero/IA, professional type scales and responsive spacing. No shared one-page skeleton recolored three times.
R3: easy visual demos on desktop/mobile to owner EARLY, solicit specific accept/revise/reject. No 54-checklist signoff coercion.
R4: only after actual owner visual GO, extract quality design system and propose CMS/PHP rendering parity; Lead evaluates integration into the main product. No unknown CMS schema properties, preserve integration_required.

## Lead immediate priorities in parallel
Continue v1.75 functional user-journey program: 135 mandatory requirement coverage mapping and 2–4 substantial missing production-feature verticals across Studio → PHP/SDK → visitor/forms/inbox/revisions. Focus complete functional product, do not start another D7 exporter. Maintain one important cross-subsystem smoke + existing CI for actual changes. Do not freeze main CMS while second developer fixes designs.
Stage0–1 officially accepted; Stage2 ~85–90% engineered but manual gates #5–#9 NO-GO; Stage3 0/135 mandatory officially accepted and no production approval. Do not change acceptance percentages artificially.

## Non-negotiable future safeguards
- No mass template/program expansion before upfront user-visible prototype and explicit design GO.
- Professionally sourced design references and grid/typography/spacing rules BEFORE code; don't treat numbers as universal maximums, assess actual design and mobile.
- Technical PASS is never visual PASS. Business/customer content must be credible (no fake testimonials/statistics/certs/paid images).
- In any future handoff link this v1.76 and latest worker design reset. No auto merge, no production/Hostinger, no live customer operations.
- Keep updates factual: actual branch HEAD, machine evidence scoped to checked SHA, explicit visual acceptance evidence and approved integration only.
