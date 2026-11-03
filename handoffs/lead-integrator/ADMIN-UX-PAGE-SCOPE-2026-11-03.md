# MANUFACT AI Site CMS — contextual page / section / element Inspector
Date: 2026-11-03
Role: Lead Integrator
Branch: `feature/stage3-ai-site-contract`
Verified functional commit: `005753aad832b6628b85d47b2e705cd7ad45b92e`
Full CI: https://github.com/manufact-test/ai-site-cms/actions/runs/41684120493 — SUCCESS 4/4
Real Chromium screens: https://github.com/manufact-test/ai-site-cms/actions/runs/41684120493/artifacts/13254592185

## Owner decision still governing design
Use the full scrollable live page at the center to select actual sections and elements. The side structure navigator is an optional aid, not a required step. Page, section and element must have distinct, immediately understandable property contexts.

## This functional stage
- A third Inspector scope **«Страница»** joins «Блок» and «Элемент». Clicking an actual page entry or an approved site's page card opens its real **page-level** settings. Page title, path, existing add/rename/duplicate/reorder/remove actions and the existing SEO/menu modal are exposed in that contextual Inspector. The exact original action nodes and handlers are moved into `#cms-page-actions-slot`, not duplicated, and still require explicit draft save / publish. The offline page context has a trigger into its existing SEO modal; hosted mode uses the original `#cms-open-seo` action in page settings.
- Switching Page→Block→Element via the three clear context tabs does not rewrite the preview iframe or change the draft. Direct clicking a section background or editable heading/card in the main iframe switches naturally to Block or Element. The optional tree reports no active section while Page context is active.
- Selecting the currently open page in the page list reuses the same iframe DOM and keeps its scroll; changing to another page uses the existing renderer. The compact width pointer flow reveals the page Inspector heading rather than scrolling only to the canvas title.
- The separate existing fullscreen composition/Workbench action is labelled **«Расширенный редактор»** to distinguish it from the main central editor. No secondary editor or new contract has been created.
- Inspector layout and page action placement are tested on desktop/tablet/mobile; the original block list, repeatable FAQ editing, Graph-node selection, drafts/Undo, media/forms, SEO and server Save/Publish stay intact.

## Verification
- Real offline Chromium E2E: page context and action/SEO visibility, same-page no reload/no draft mutation, selection of a block/element again, responsive heading focus, and all original editing coverage.
- Authenticated PHP Chromium E2E: page-card selection opens page scope, original page tools actually live in the Inspector, block scope restores its existing tools, FAQ edits, real page SEO and server persistence/publish/release rollback continue to pass.
- GitHub Actions #41684120493: contract, technology-runtime, MariaDB 10.11 and 11.8 — 4/4 SUCCESS.
- Viewed the CI-generated desktop editor, mobile editor and actual page settings screenshots; they are engineering evidence, not personal owner UX acceptance. The screenshot artifact expires; the code/tests/docs remain committed.

## Boundaries and next gates
- The Stage3 FOX installation at `mediumpurple-fox-175549.hostingersite.com/studio` is **older**: none of these GitHub improvements were deployed. Do **not** invite owner verification on FOX until separately authorised reversible deployment.
- Stage2, main, Production, private MariaDB/Cron/settings and established connections untouched.
- Next: review any remaining real-world edit friction, controlled FOX update with rollback plan, and owner hands-on acceptance. First website remains blocked until owner supplies the previous landing and approves three static desktop/tablet/mobile mockups.

## Reference docs
`docs/NEXT-CHAT.md`, `stage3/docs/ADMIN-UX-ARCHITECTURE-2026-11-03.md`,
`stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md`, `docs/MASTER-TZ.md`, `docs/ROADMAP.md`.
