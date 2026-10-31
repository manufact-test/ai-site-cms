# MANUFACT AI Site CMS — lead integrator handoff v9.7 (31.10.2026)

## 1. Verified checkpoint

- Repository: `manufact-test/ai-site-cms`; **only** working branch `feature/stage3-ai-site-contract`.
- Last fully verified functional HEAD before this documentation commit: **`b9ab53c21c39d5e87e260d3691c134ddf3740e0d`**.
- [GitHub Actions run 41223974027](https://github.com/manufact-test/ai-site-cms/actions/runs/41223974027): **`contract=SUCCESS`, `technology-runtime=SUCCESS` on that exact SHA**.
- **This handoff/documentation commit creates a newer HEAD:** fetch the branch and verify both jobs on the latest SHA before declaring final CI green. No merge to `main`, production or Hostinger.
- Read `docs/MASTER-TZ.md` first, then the latest `docs/ROADMAP.md` sections, this handoff and v9.4–v9.3, `stage3/docs/SCHEMA-ORG-CMS-PUBLISHING.md`, the SEO worker's `stage3/seo-engine/SEO-FIRST-CLIENT-LEAD-TRANSFER-2026-10-31.md`. Older handoffs are detailed history, not a request to rebuild modules.

## 2. What actually works

- One existing Studio/Workbench and typed individual Design Graph with desktop/tablet/mobile controls, fields, media, fragments/links, tables, galleries/carousels, working first-party Graph form-slot, extras, conditional/multi-step forms, preview, Undo/Save/Publish/rollback, approved-v2 import, PHP/Next/static output and safeguards.
- Integrated private SEO Blueprint/Intelligence/Operator Workspace, internal links, metadata, Search Console import/capture tools, Schema.org CMS authoring and output. SEO source already imported from worker `feature/site-seo-engine` at `244c7ab71796916f25313c3ebde385775665cc21`; **do not integrate again** or extend with endless analyzers.
- Recent verticals: **v9.4** truthful published Graph/legacy link and anchored redirect checks + original Quality repair; **v9.5** owner-authored 404; **v9.6** safe accepted-form thank-you page; **v9.7** authored consent-information page link beside the required checkbox. These reuse real pages by stable IDs; no fabricated company/legal information.
- v9.7's first CI exposed a **test setup** issue: static form export correctly requires an explicit collector endpoint. Fixed with an isolated loopback collector in the E2E; the production safety refusal stayed intact. The later exact-SHA run above passed both jobs.

## 3. New explicit owner decisions — do not lose these

### A. First real website comes from an existing landing, not a template

Илья will later provide an **existing landing created previously with AI**, available original images/assets, target links, real facts and desired actions. **No URL/files or client approval were supplied yet.** Do not arbitrarily choose a production client/site or invent details.

1. External-to-CMS AI author (the development chat can fulfill this role) audits **that actual landing**: purpose, audience, UX/UI, SEO, structure, responsive, semantics, buttons/links, forms, animation. Explain in human language **«было → что неправильно/удачно → почему → как улучшим»**; make the owner able to judge expertise.
2. From its useful content build a **new, visually strong, static** desktop/tablet/mobile prototype and client-facing explanation of *every significant* behavior, motion/hover/tap, responsive choice and SEO decisions, plus a portable detailed implementation spec. **Do not implement full HTML website as the prototype.**
3. Obtain explicit owner/stakeholder sign-off on all three mockups. **Only then** code a truly individual live site to that spec, expose its real fields in the **same** CMS, and verify visual/functional/SEO fidelity on all three widths, real safe forms, publish/rollback/backup and owner corrections. No PNG-to-code magic or Design Factory.

### B. The admin interface itself MUST become modern and usable

The owner remembers early Studio screenshots as severely outdated/overcrowded. **Technical functionality is not an approved admin design**. Before final product handover, professionally audit and redesign **the existing Studio/Workbench UX/UI**, taking clarity and workflow ergonomics from Elementor/Tilda **without copying** them or creating a second editor. Focus on actual owner journeys (site/pages → sections/elements → context settings → 3 viewport previews → drafts/publish/history), reducing visible clutter, clear hierarchy, understandable feedback, modern consistent visuals and accessible interactions. Show real browser evidence, let Илья perform tasks, fix feedback, seek explicit **UI/UX owner GO**. Schedule as a substantive vertical during final functional closure/first pilot, **not** cosmetic micro-iterations.

### C. Reporting: short, numerical and honest

- The owner does **not** want long technical narratives or reports after each micro-action. Brief milestone updates if needed; after one substantive development session give **4–6 lines**: **current stage + approximate technical %; what owner can now do; what remains until next milestone; critical blockers; exact SHA + both CI results**. Technical details stay in the repository and are supplied only when asked.
- The prior user-facing **92%** is **124/135 engineering candidates**, *not* audited completion or real product acceptance. Five requirements remain partial, six depend on real owner environment, and **ownerAccepted=0/135**. Stage estimates shared with Илья were approximate (core 90%, editor 85%, forms/publishing 90%, SEO 95%, real client pilot 0%) and must not be silently promoted to official facts.
- No handoff/next-chat message **unless the owner explicitly requests it** (this v9.7 transfer was requested).

## 4. Boundaries, next milestone

- **Stay on `feature/stage3-ai-site-contract`**, no merge/`main`/Hostinger/production/CELIKOM, no customer data, remote AI API, dependencies or extra editor without permission; avoid edits to `stage3/seo-engine/**` unless a specific integrated defect requires it.
- No first-client approved 3 mockups/Blueprint/Site v1, public HTTPS origin/revision, Chromium/live Search Console consent, confirmed real lead delivery or owner GO. The next milestone is **one owner-approved existing-landing-derived design → real site → usable modern Studio → live pilot**; no fictional pilot acceptance.
- Until real materials arrive, finish **large, meaningful missing CMS/owner UX verticals** in existing architecture. Work sessions target at least ~30 minutes of substantive development; if a block finishes quickly, take another related block. Keep critical security/functional tests and exact latest-SHA GitHub Actions; avoid test infrastructure inflation and documentation-only working sessions (except explicit handoff requests).
