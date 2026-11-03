# MANUFACT AI Site CMS — final Stage3 daily editing handoff (2026-11-03)
Role: Lead Integrator. Scope: existing Stage3 Studio only, no deployment.

## Exact checkpoint
- Repository: https://github.com/manufact-test/ai-site-cms
- Working branch: `feature/stage3-ai-site-contract`
- Verified functional SHA: `9f5ac311c6260d94044db8a5f66adedef46bb237`
- Documentation HEAD after this handoff: this handoff's documentation commit (the current branch HEAD)
- Full CI 4/4: https://github.com/manufact-test/ai-site-cms/actions/runs/41693383840
- Browser screenshots: https://github.com/manufact-test/ai-site-cms/actions/runs/41693383840/artifacts/13260475490
- Previous fully green fallback: `2bae2c0b01c03cf1a359a26a192447a0342177da`, CI #41691748152. Previous handoff `ADMIN-UX-CANVAS-SELECTION-HIDDEN-2026-11-03.md` remains historical.

## Owner direction
- Primary editor is the whole actual page scrolling in center. Click section for block settings and real rendered text/image/repeat card for element properties. The optional sidebar section structure is not the primary workflow.
- Three contexts in Inspector: selected page → original page settings and SEO; selected block → own visibility/actions/contents; selected element → manifest fields and responsive values. Keep nonessential global/technical settings away.
- No new CMS, no second editor, no arbitrary site generator or template market. First real client site on hold.

## Changes implemented in this final stage
1. **Navigator ↔ canvas synchronization for repeated cards and FAQ.** Choosing an existing item through the Inspector's element navigator moves the main canvas to that precise rendered card/answer when offscreen. No reload of the same iframe, no newly selected data persisted, no affected page scroll if the item is already visible. Same existing in-memory `scrollCanvasToElement` path is reused for ordinary elements.
2. **Device-hidden section can be repaired while an element is selected.** On a chosen breakpoint where section visibility is false, the warning and `Показать на …` now live in the visible element-field context, not inside the collapsed optional element navigator. Block scope retains its own warning. One original undoable `setSectionVisibility` edit, no automatic save or publish.
3. **Real visual confirmation for an existing chosen image.** The manifest `content.media` field still uses the unchanged asset-ID selection and original media library; it now shows the selected asset thumbnail and description in the Inspector. A field with no selected image remains compact; unknown preview gracefully describes the situation. On PHP-hosted Studio the existing authenticated media-read event refreshes only the current field thumbnail after bytes arrive. No new media picker, upload path, provider or stored schema.

Changed source files: `stage3/studio/app.js`, embedded `stage3/studio/bundle.js`, `stage3/studio/studio.css`, browser E2E `stage3/tests/studio-browser.cjs` and `stage3/tests/approved-site-browser.cjs`. All actual mutations still flow through existing Typed Site Contract/Undo; mere selection never mutates drafts. Preserve Design Graph Workbench, SEO Engine, media, forms, Save/Review/Publish, rollback, permissions and standalone bundle parity.

## Browser / CI acceptance
- Offline genuine Chromium: section visibility on mobile, hidden chosen element, visible warning + show + Undo twice, identical site JSON restored, no iframe replacement; long/repeated card navigation scrolls the actual item into view, no draft mutation or iframe reload, desktop/tablet/390px phone and accessibility checks.
- Hosted PHP Chromium: approved external site image returns existing authenticated image bytes and displays its actual preview in manifest element properties; source import, custom Design Graph Workbench, responsive media, save/publish/rollback and FAQ remain exercised.
- Full CI jobs: contract, technology-runtime, MariaDB 10.11 and MariaDB 11.8; screenshots stored as GitHub Actions artifact. CI acceptance is engineering evidence, NOT an owner's UX GO.

## Safety / next tasks
- FOX https://mediumpurple-fox-175549.hostingersite.com/studio remains on older source. DO NOT deploy or reinstall FOX until a separately approved, reversible, controlled stage and owner's personal UX review.
- Stage2 `lightseagreen-woodpecker-264491.hostingersite.com`, `main`, production, private MariaDB/Cron/settings/connections untouched.
- Next safe stage: inspect real owner-facing screenshots and actual imported/custom site editing, finish remaining high-impact ergonomics; then broad CMS verification (Draft/Undo/Publish/rollback, image/form/SEO/runtime), independent release checklist, only then authorized FOX update and owner's UX acceptance.
- First real website begins only after Ilya supplies his previously created landing and approves three separate static desktop/tablet/mobile prototypes; only then code via existing contracts.

Read `docs/NEXT-CHAT.md` first, then this handoff, `stage3/docs/ADMIN-UX-ARCHITECTURE-2026-11-03.md`, `stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md`, `docs/MASTER-TZ.md`, `docs/ROADMAP.md`. Never confuse Lead Integrator Stage3 work with separate SEO/Design Factory roles.
