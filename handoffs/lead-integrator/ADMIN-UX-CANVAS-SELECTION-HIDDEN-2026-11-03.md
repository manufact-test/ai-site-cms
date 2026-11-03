# MANUFACT AI Site CMS — canvas element selection and hidden-device clarity
Date: 2026-11-03; Stage3, Lead Integrator

## Verified engineering checkpoint
- Branch: `feature/stage3-ai-site-contract`.
- Functional SHA: fde064af85f534f8168a27183317677d0257cfe9.
- Full isolated CI: https://github.com/manufact-test/ai-site-cms/actions/runs/41687851736 — **SUCCESS 4/4**, including Stage3 real Chromium and PHP-hosted browser workflows. Captures: https://github.com/manufact-test/ai-site-cms/actions/runs/41687851736/artifacts/13256116162.
- Previous functional green: `005753aad832b6628b85d47b2e705cd7ad45b92e` (#41684120493); the older UX handoff stays historical.

## Owner intent and behavior
- Work inside the existing CMS. Primary UI is a full, scrollable page in the center, with optional collapsed side structure and context-sensitive Inspector for page → section → element. No second editor, no forced sidebar-first work.
- Fixed selection of a real rendered CTA with a decorative `aria-hidden` arrow. The scriptless preview annotates the whole visible action; click or Enter picks its manifest element and exposes the original `behavior.href` field without navigating, mutating content, or saving.
- A section hidden for the selected desktop/tablet/mobile device remains in the draft. Canvas caption explains why the section is missing; block Inspector shows a device-specific warning and one `Показать на …` action. It uses the existing undoable `setSectionVisibility` command and does not publish.
- Selecting an element from the block Inspector's `Содержимое секции` no longer calls full `draw()` and regenerates the iframe. It keeps the exact current page document and scroll position, activates the existing property inspector, and scrolls the chosen rendered node into view only if it is offscreen.
- Both `stage3/studio/app.js` and offline `stage3/studio/bundle.js` stay in parity. No persisted schema, Design Graph, SEO Engine, media, forms, Undo/Redo, save/review/publish, or rollback modifications.

## Browser acceptance exercised
- Real Chromium offline Studio E2E: direct first-screen action selection + keyboard, entire block/element selections, iframe identity unchanged, hidden mobile section warning → reveal → two Undo → exact draft restoration, page/mobile/desktop responsive contexts, screenshots.
- Real PHP-hosted Studio browser + package/runtime tests run through full CI. Screenshot **stage3-hidden-section-device.png** exercises 390px center preview and Inspector. CI is branch-only and has no live-host deployment.
- Browser imagery and CI results are engineering checks, **not** owner UX acceptance.

## Next priorities
1. Review real captures against Elementor/Webflow-inspired information hierarchy, especially visible page canvas, repeated cards/FAQ, actual hosted Design Graph layouts, and phone Inspector interactions.
2. Keep shaving unnecessary navigation/reflows; test complex real imported site in a controlled local/isolated environment.
3. Only after full CMS audit, separately plan reversible FOX update, obtain owner's authorization, then owner hands-on UX review.
4. The first real site stays blocked until Ilya supplies the source landing and approves three individual static desktop/tablet/mobile mockups.

## Hard boundaries
Do **not** deploy to FOX automatically. FOX at https://mediumpurple-fox-175549.hostingersite.com/studio still runs older code. Do not touch Stage2 `lightseagreen-woodpecker-264491.hostingersite.com`, `main`, Production, MariaDB/Cron, private settings, existing connections. Do not reinstall CMS.
