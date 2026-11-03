# MANUFACT AI Site CMS — Inspector property groups and keyboard navigation handoff
Date: 2026-11-03
Role: Lead Integrator
Status: functional engineering complete and regression-tested; owner UX approval and staging deployment pending.

## Exact repository state

- Repository: https://github.com/manufact-test/ai-site-cms
- Branch: `feature/stage3-ai-site-contract`
- Last verified functional SHA: `f861ea7055dac3bff5ecdb4c68597c68d0cf73d2`
- Full GitHub Actions: https://github.com/manufact-test/ai-site-cms/actions/runs/41647681104 — **SUCCESS 4/4**
- Real Chromium screenshots: https://github.com/manufact-test/ai-site-cms/actions/runs/41647681104/artifacts/13235149333
- Previous fully-green fallback: `0d5059f9cd2fa6d77f197f1cdbefeef0ece5fa12` (CI #41635244405).
- The later documentation-only commit will be the branch HEAD; this functional SHA remains the browser-verified code.

## Product boundaries

The user has extensive Elementor, Tilda and WordPress experience and rejects scattered menus, irrelevant technical fields and fake site states. Target is a coherent **editor for existing individual sites**; it is not a new website generator, template marketplace or second editor. Work in the current Stage3 Studio. Preserve the existing Design Graph, Typed Site Contract, SEO Engine, media, forms, Undo/Redo, Save, Review/Publish, history/rollback and responsive overrides.

FOX Stage3 is installed at https://mediumpurple-fox-175549.hostingersite.com/studio with working admin/MariaDB, but **the newest source has not been deployed there**. Do not reinstall it, modify private settings/DB/Cron, or touch Stage2 `lightseagreen-woodpecker-264491.hostingersite.com`, main or production. Owner must explicitly approve a future controlled FOX update and then review personally. No first client site until owner supplies previous landing and approves three static desktop/tablet/mobile mockups.

## Functional changes in this pass

1. **Compact task groups in the element Inspector** (`stage3/studio/app.js`). Original manifest-driven controls now live inside native group disclosures. With multiple groups, «Содержимое» (or first relevant group) is open initially, while «Оформление», «Действие и ссылки» and others can be opened on demand. Opening one closes the old group, reducing the visible field pile. The choice survives property redraw and breakpoint changes for that exact page/block/element in a session-only map. Elements containing only one group keep it immediately accessible without a redundant heading. All edits still use `D.edit`; no persisted UI state or schema changes.
2. **Keyboard-first selected element navigation**. In the Inspector element list, ArrowUp, ArrowDown, Home and End select the previous/next/first/last visible item. After redraw, keyboard focus remains on the selected item and it scrolls into view; selected page/block has `aria-current` and choices expose `aria-keyshortcuts`/short tooltips; long FAQ/card disclosure state is not forcibly closed by a keyboard selection. A normal phone touch/click still scrolls and focuses the first editable field, as established by the prior responsive UX pass.
3. **Keyboard-first page and block navigation**. The pages/sections tree supports the same keys. Programmatic and keyboard selection restore focus on the active row; a physical pointer/touch selection on compact screens continues to reveal the canvas or block Inspector, matching the earlier navigation contract.
4. **Theme and responsive parity**. `stage3/studio/studio.css` and `stage3/studio/hosted.css` style disclosures, hover/focus and light/dark variants without adding a new UI panel or extra main toolbar buttons. `stage3/studio/bundle.js` was regenerated deterministically by replacing the embedded app source.

## Verified test scope

- `stage3/tests/studio-browser.cjs`: native group titles, initial open/closed state, group switching, persistence across device selection, a single-group gallery without redundant disclosure, Arrow/Home/End element navigation and keyboard focus, phone keyboard versus pointer field focus, page and section navigation and their focus, plus existing page/site/edit/SEO/media/form/Undo/saving contracts.
- `stage3/tests/approved-site-browser.cjs`: real hosted approved-folder import, light-theme group selection before responsive style change, FAQ repeat operations, page/section search focus, persistence and publishing.
- Four CI jobs: contract (real offline and hosted Chromium + PHP HTTP/publish), technology runtime (Next Static/SSR), MariaDB 10.11, MariaDB 11.8. **All green at the functional SHA above**. Screenshots `stage3-inspector-property-groups.png` and `stage3-inspector-property-groups-mobile.png` are included in the action artifacts; earlier responsive screenshots remain available from #41635244405.
- The first intermediate CI #41645882544 failed because a new test tried to open a disclosure on a gallery element with only one field group. That is deliberate UI behavior; the test now checks this edge case and the final CI is green. It was **not** a regression to gallery content or persistence.

## What remains and next safe pass

1. Review screenshot evidence and the everyday Inspector/page/block interaction for visual issues. Engineer-driven Chromium does not equal the owner's independent UI/UX GO.
2. If further UX fixes are needed, keep them in this feature branch, in coherent groups, with a full 4/4 CI and browser screenshots. Preserve the unchanged existing contracts.
3. After the owner is ready, prepare a controlled, reversible FOX update and personally validate: empty site home, selected site, actual page and element edit, responsive changes, media/form/SEO, draft/save/review/publish and rollback.
4. Only after admin UX acceptance, use the owner's previously created landing: audit it, prepare three separate static desktop/tablet/mobile mockups, approve them, then build first real site against existing contracts.

## Read first in next chat

1. `docs/NEXT-CHAT.md` top section.
2. This handoff: `handoffs/lead-integrator/ADMIN-UX-FIELD-GROUPS-KEYBOARD-2026-11-03.md`.
3. `stage3/docs/ADMIN-UX-ARCHITECTURE-2026-11-03.md`.
4. `stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md`.
5. `docs/MASTER-TZ.md` and `docs/ROADMAP.md`.

Do not confuse this Lead Integrator work with separate SEO Engine or Design Factory development. No owner action is required for the verified source commit alone.
