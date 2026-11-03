# MANUFACT AI Site CMS — visual-first Studio daily editing
Date: 2026-11-03
Role: Lead Integrator
Status: engineering change implemented; real owner UX acceptance and FOX deployment separate.

## Owner decision and UX contract
The selected page itself is the primary navigation surface. The owner scrolls one full real page in the central scriptless preview, clicks a section background for block context, clicks editable text/media or repeat items for their own properties, and clicks a verified Design Graph node to open its exact existing Workbench inspector. The sidebar section tree and element chooser are secondary, on-demand aids — not required steps.

## Implemented in existing Studio
- Optional **«Структура страницы»** disclosure in the sidebar, closed initially, with current section name and total section count. The page list remains the page selector. Existing keyboard Arrow/Home/End section navigation and original structure actions are preserved.
- The **Inspector** now owns the original block actions; it shows **«Содержимое секции»** with actual manifest element/card IDs in block mode. Choose one to edit its existing fields. No duplicated editor or contract.
- Selected element properties are immediately visible. The element list is behind optional **«Элементы секции»**; repeatable-card/FAQ sections reveal their relevant item list on entry, remember deliberate manual disclosure choice per site/page/section in memory. Long repeat lists retain their own subdisclosure and action menus.
- A single **«+ Добавить секцию»** button by the page canvas invokes the original component catalog; redundant add buttons in block inspector are visually hidden. This does not create new site templates or a generator.
- Clicking or arrow-selecting a different section in the same page, clicking visible editable text/media/cards, and toggling Block/Element context update selection chrome **without reassigning iframe srcdoc**. Sidebar section selection scrolls the existing iframe to the real section. Full rerender remains for actual content changes, page change and responsive device change; scroll is retained on same page.
- Visible manifest elements and leaf Graph nodes are keyboard focusable inside the sandboxed first-party preview; Enter/Space use the same validated parent-owned selection bridge. The iframe still lacks allow-scripts, forms, navigation and popups. Click/keyboard selection does not edit content or Save/Publish.
- CSS uses the same physical Studio panels on offline and hosted PHP-rendered sites; narrow toolbar wrapping and inspector layout are preserved. No DB, schema, migration, service API, renderer or release logic changed.

## Browser and CI proof
- Functional SHA: `db6d6b5c474549344a578e5afa2dd6a7da3f3716`
- Full GitHub Actions: https://github.com/manufact-test/ai-site-cms/actions/runs/41673681398 — SUCCESS 4/4.
- Chromium captures: https://github.com/manufact-test/ai-site-cms/actions/runs/41673681398/artifacts/13250351207.
- Offline genuine Chromium verifies initial hidden tree, visible canvas add, section content-to-element selection, element keyboard focus, zero draft mutation, no iframe reload, repeat list interactions, responsive scroll, Undo and existing E2E.
- Authenticated PHP Chromium verifies actual HTML section context, exact Graph node selection by keyboard, nested block content, no draft changes/no iframe reload, and existing source-to-publish/release restore scenarios.
- Note: screenshot artifacts are automated engineering evidence, **not** owner acceptance.

## Boundaries / next gates
- FOX still contains an older Stage3 Studio; no installation/deployment took place. Stage2, `main`, Production, private MariaDB, Cron, settings and connections untouched.
- Review responsive screenshot evidence, complete remaining editor usability issues; do controlled reversible FOX update only as its own explicitly authorised stage, followed by owner hands-on UX acceptance.
- First real website remains blocked until the owner provides the original landing and approves static desktop/tablet/mobile layouts.

## Required source and owner documents
`docs/NEXT-CHAT.md`, `stage3/docs/ADMIN-UX-ARCHITECTURE-2026-11-03.md`, `stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md`, `docs/MASTER-TZ.md`, `docs/ROADMAP.md`.
