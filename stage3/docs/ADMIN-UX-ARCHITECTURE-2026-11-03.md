> **Canvas selection continuity, 03.11.2026:** icon-decorated CTA in the scriptless preview binds to its actual element; choosing an element via Inspector's section contents preserves iframe identity and scrolls its exact rendered node when offscreen; hidden device-specific sections show a clear explanation and normal undoable visibility repair. Functional SHA `fde064af85f534f8168a27183317677d0257cfe9`; [full CI #41687851736](https://github.com/manufact-test/ai-site-cms/actions/runs/41687851736) **SUCCESS 4/4**; [Chromium screenshots](https://github.com/manufact-test/ai-site-cms/actions/runs/41687851736/artifacts/13256116162). Engineering only: FOX unchanged, owner acceptance pending. [Handoff](../../handoffs/lead-integrator/ADMIN-UX-CANVAS-SELECTION-HIDDEN-2026-11-03.md).

# Stage3 Studio — navigation and context contract (2026-11-03)

Status: engineering UX restructuring, **not** owner acceptance or Hostinger deployment. Branch `feature/stage3-ai-site-contract`. Stage2, main, production, Hostinger private files and persisted site records are outside this change.

## Evidence and root cause

- Elementor's official documentation separates the top bar, selected-widget properties, page settings, global site settings and page structure: https://elementor.com/help/elementor-top-bar/ , https://elementor.com/help/page-settings/ , https://elementor.com/help/site-settings/ , https://elementor.com/help/navigator/ .
- Webflow's official Designer documentation likewise separates Pages, Navigator, Style and Element Settings: https://help.webflow.com/hc/en-us/articles/33961260162323-Intro-to-Webflow . These are interaction references, not UI or code to copy.
- `stage3/studio/build.cjs` unconditionally compiles `fixtures/industrial-site.json` into `bundle.js` as `FIXTURE`. `stage3/studio/app.js` starts an in-memory editor session from `FIXTURE` before hosted authentication. Therefore the displayed "Завод оборудования", "Главная", "Контакты" and example sections are **fixture-backed local presentation**, not evidence of a persisted server site.
- `stage3/studio/hosted.js` obtains actual sites from authenticated `GET /api/sites` and loads their manifests via `GET /api/sites/:id`. Sign-in with zero sites previously hid only canvas and inspector, leaving the fixture-backed sidebar visible. **No database delete or demo migration is needed** to fix this presentation bug. A separately persisted site with the same title, if one exists, must be treated as genuine server data.
- Existing controls were distributed by feature implementation into `#server-toolbar`, `.site-actions`, `#server-site-tools` and six resource drawers, then moved wholesale into one enormous modal. `stage3/studio/access.js` appended password and owner-only user/audit/license operations to that same toolbar, which caused cross-context clutter.

## One Studio, context-sensitive navigation

| Context | Entry | Content and rules |
| --- | --- | --- |
| CMS home | `Мои сайты` | Only `/api/sites` entries; honest empty state, no fake sidebar, page tree or Save/Publish. |
| Project overview | `Обзор` after selecting a site | Actual name, revision, published version, page list; open editor, site settings or resources. |
| Page editor | `Редактор` with active site | **Existing** Studio canvas, pages/sections tree, selected element inspector, Workbench, responsive modes, Undo/Redo, Save/Review/Publish. The selected page owns `Настройки страницы` (title/URL, page SEO/menu, duplication and ordering). One contextual form replaces browser prompt chains for creation, rename and duplication. Never use fixture tree before real site selection. |
| Site settings | `Настройки сайта` with active site | Design/theme/tokens, site identity, navigation/footer, **site-level** SEO audits/handoff, content search/site map and controlled advanced tools. Per-page SEO metadata stays with the selected page. Existing controls retain their handlers. |
| Site resources | `Ресурсы` with active site | Media, forms/leads/delivery, reusable sections, history/backup/restore, transfers, site maintenance and connection diagnostics. |
| Import | `Подключить`, owner only | Preparation guidance first; explicit subsequent approved-v2 folder selection; original sealed package checks, immutable evidence and nonpublished draft creation unchanged. Raw JSON import remains a separate advanced option, not an arbitrary website converter. |
| Account | `Аккаунт` | Signed-in principal, password change and Logout. Never in site import. |
| Platform | `Управление CMS`, owner only | Users, roles, audit, licences, signed engine update and recovery; independent from per-site editing. Server still enforces permissions. |

All destinations are **in-place views inside the existing Stage3 Studio**. The same DOM controls/IDs, Stage3Editor session, PHP endpoints, typed contracts, approvals, image/media tools and save/release gates remain in use. No new editor, parallel datastore, stateful UI persistence or automatic publication is introduced. Existing secondary dialogs continue to open only for their specific advanced task.

## State gates and click paths

1. Anonymous: login gate. No site data or page editor exposed.
2. Authenticated, `sites=[]`: `Мои сайты` shows empty onboarding; `Аккаунт`, owner-only `Управление CMS` and `Подключить` available. Import action is **not** an immediate file picker.
3. Authenticated, saved sites: site list → selected `Обзор` → click a real page → `Редактор` → chosen section/element → contextual properties → Save draft → Review → Publish. A change in navigation view never itself saves or publishes.
4. Site-wide action: `Настройки сайта` or `Ресурсы`, not the inspector. Return to `Редактор` with the same in-memory draft and Undo history.
5. Account action: `Аккаунт` → password/logout. Owner operations: `Управление CMS` → user/engine/audit/license. PHP authorization remains authoritative if a hidden control is invoked manually.
6. Import: `Подключить` → read approved-v2 prerequisites → deliberately choose folder → review and confirm → new nonpublished draft → editor. Cancel has no publication side effect.

## Verification and remaining acceptance

- Static syntax, bundle parity, contract and GitHub Actions are the engineering gates. The authenticated Chromium workflow additionally needs zero-site, account/platform, approved import, real page editing, desktop/tablet/mobile screenshots and no horizontal overflow checks. Screenshots are test evidence, not an owner-approved design.
- Test fixtures **must never** be called the first real client site. The first externally supplied landing and three approved static mockups remain future work.
- This structural pass does not yet constitute full UI/UX acceptance. Real Hostinger FOX update and owner hands-on evaluation require a separately verified staging release; no automatic deployment from GitHub or change of private installation files is authorized.

## Engineering checkpoint and screenshot inspection (2026-11-03)

- The full isolated CI on functional SHA `7ee38f8e578a7240d3397a39e149ab80cc8d8814` passed all four jobs: [#41596955430](https://github.com/manufact-test/ai-site-cms/actions/runs/41596955430), with real Chromium screenshots [artifact #13212159401](https://github.com/manufact-test/ai-site-cms/actions/runs/41596955430/artifacts/13212159401). The browser path includes explicit login → real site list → selected site and the negative 503 site-fetch/recovery scenario. The old implicit first-site auto-open expectation was deliberately removed.
- Screenshot review of the actual project overview and editor revealed redundant entrypoints. A follow-up UI cleanup at SHA `126592b18a513adabb5f299253aabb91eddff134` keeps per-project switching/reload behind a disclosure, keeps site settings in global navigation (without a duplicate sidebar trigger), and makes the top editor's full-page action the one visible entrypoint. Existing controls and event handlers remain available in the same Studio. **This follow-up passed full isolated CI 4/4 in [#41597719791](https://github.com/manufact-test/ai-site-cms/actions/runs/41597719791).**
- The initial login and account screenshots caught a detached-node error that displayed literal `null` instead of Logout; the actual button has now been mounted and validated. Import bootstrap and disclosure persistence issues were likewise corrected through real-browser failures. No demonstration fixture was deleted; no server DB data was manipulated.
- Staging FOX still runs its previously installed version until a separately controlled Hostinger update and owner hands-on testing. The first client landing and three approved static layouts remain unavailable; no fictional site acceptance is inferred from synthetic CI data.

## Page-settings and identity form integration (2026-11-03)

- Page-specific SEO/menu action `#cms-open-seo` now sits inside the selected page’s `#server-page-actions`, separate from site-level SEO audits and blueprint handoff. It opens the original `app.js` metadata dialog and applies its changes through the original draft contract. Verified full CI 4/4 on SHA `e65a54c05259bc461fe7adabe5e84b0f04dc8eea`: [#41601120545](https://github.com/manufact-test/ai-site-cms/actions/runs/41601120545).
- `stage3/studio/app.js` now uses a **single** accessible `#cms-page-details-dialog` for create, rename/URL and duplicate. It does not add a datastore, editor or content schema. Apply still calls the existing `D.structure` commands, preserves page selection, Undo/Redo, redirects and publication gates; cancel leaves the draft unchanged. Basic title/path validation is inline. Shared offline + hosted Studio form styling is in `studio.css`.
- Genuine browser acceptance probes open/cancel the new dialog, verify selected page context, and capture `owner-studio-page-details.png` and `owner-studio-page-settings.png` along with the prior desktop/tablet/mobile screenshots. The older offline and hosted browser scenarios were adjusted to interact with the form instead of native prompt dialogs.
- **Engineering release:** source commit `c13716e4d97683063fc02c87ade58c21519df400`, rebuilt deterministic `bundle.js` at `94e48bf51f2ef311c303eed80e62803e6e4e9af4`. The initial [#41601967011](https://github.com/manufact-test/ai-site-cms/actions/runs/41601967011) correctly caught a stale compiled bundle before browser execution; parity was restored before the full retest [#41602151225](https://github.com/manufact-test/ai-site-cms/actions/runs/41602151225). The rebuilt source passed **4/4**.
- Visual review of `owner-studio-page-details.png` from that run revealed an actual contrast defect: the hosted light theme showed near-white title/URL labels on a white modal. SHA `81e2abd37bc3e339899896fb088c991ee97b167f` supplies an explicit hosted-only modal palette in `hosted.css` while preserving offline dark styling, and asserts computed label/description colors in Chromium. [Full retest #41602928099](https://github.com/manufact-test/ai-site-cms/actions/runs/41602928099) passed **SUCCESS 4/4**, including real Chromium label-contrast assertions; verified corrected browser screenshot [artifact #13215212533](https://github.com/manufact-test/ai-site-cms/actions/runs/41602928099/artifacts/13215212533).

FOX is intentionally unchanged. Real owner hands-on UX approval remains pending; browser screenshots and synthetic tests alone are not acceptance.


## Contextual selected element and repeated-card menus (2026-11-03)

- `stage3/studio/app.js` now identifies the **selected element**, not merely its containing section, in the Inspector caption. Static element labels come from the existing registered manifest; repeat item captions use their current content/title/question/author. Neither contract nor site data is modified by this display logic.
- FAQ questions and other repeatable cards expose one native `<details>` disclosure per row for `moveItem`, `duplicateItem` and `removeItem`, with original IDs, disabled min/max limits and delete confirmation untouched. Four permanently visible glyph buttons are removed. The menu names and original aria-labels stay discoverable by keyboard and screen readers.
- Server light and offline dark modes use the same `app.js` and generated `bundle.js` source. Only their palette differs. Real Chromium assertions check collapsed actions and actual move/delete behavior; screenshot `owner-studio-faq-actions.png` shows the reduced density.
- Functional commit `b01375afb01f3cd396d58babf16e16ccc819c4bd` introduced the UI; test-only `4e6292ccd2f008ab99dcd6c82cc5a066e66ed904` updates one offline Chromium flow to open the new menu before copying a card. Initial [#41607455780](https://github.com/manufact-test/ai-site-cms/actions/runs/41607455780) failed on the stale test locator, not the card contract; [full retest #41607826074](https://github.com/manufact-test/ai-site-cms/actions/runs/41607826074) passed **SUCCESS 4/4**. The real browser screenshot was visually inspected: [artifact #13217473544](https://github.com/manufact-test/ai-site-cms/actions/runs/41607826074/artifacts/13217473544), file `owner-studio-faq-actions.png`. No staging deployment. This is a UI refinement only, not a Hostinger deployment or owner approval.


## Distinct Inspector scope: whole block versus selected element (2026-11-03)

- A single visible two-state switcher in the existing Inspector separates block-level operations from element content/style fields. Selecting a page or section opens block context; selecting a field/card opens element context. No new editor or data schema was introduced.
- Block context includes per-device visibility, form builder / form success handling when relevant, and advanced cross-page shared sections. Element context owns the selected field/question and repeat-item list/actions, but does not display whole-block controls. Direct media binding and issue focus enter element context.
- Same `D.edit`, `D.structure`, `D.inheritBreakpoint`, typed manifests, responsive inheritance, Undo/Redo and server save/review/publish gates remain authoritative.
- Functional and browser-test SHA `c2cc93049453abf03c4fe33eacafa840a5e569d3`; [full Actions #41612749799](https://github.com/manufact-test/ai-site-cms/actions/runs/41612749799) **SUCCESS 4/4**. [Chromium artifact #13219468053](https://github.com/manufact-test/ai-site-cms/actions/runs/41612749799/artifacts/13219468053) includes block properties screenshot plus desktop/tablet/mobile cases. Tests cover block responsive visibility + Undo and selected FAQ field editing. Independent pixel review and real owner acceptance remain outstanding.
- FOX is not yet updated; main, Stage2 and production untouched. [Handoff](../../handoffs/lead-integrator/ADMIN-UX-BLOCK-ELEMENT-CONTEXT-2026-11-03.md).


## Selected-element task groups and multiline content (2026-11-03)

- The existing Inspector now uses the manifest's typed `group` per field: `content` → «Содержимое», `style` → «Оформление», `behavior` → «Действие и ссылки» (fallback «Другие свойства»). Empty groups are omitted and a single-group element has no redundant heading. Original controls, field IDs, SDK paths and event handlers are unchanged.
- Long declared text fields (`maxLength > 180`) and `content.options` use native multi-line `textarea` with the same `change` mutation and maxLength validation; short labels/headings remain inputs. The original responsive value inheritance and explicit reset button operate in the same field container.
- Styles cover both offline dark and hosted light palettes; groups add visual hierarchy without new toolbars, buttons, schemas, persistence or publication flows.
- Last functional SHA `dc312fa301a6dbf29acbdd38c5a9220c2face1fd`; [full CI #41620839120](https://github.com/manufact-test/ai-site-cms/actions/runs/41620839120) **SUCCESS 4/4**. Offline, hosted and approved-site Chromium assertions check group order, multi-line description/FAQ fields and unchanged edit paths. [Screenshot artifact #13223831807](https://github.com/manufact-test/ai-site-cms/actions/runs/41620839120/artifacts/13223831807) contains `owner-studio-element-properties.png` and existing responsive screenshots. Separate human pixel review and owner UX GO are still pending.
- FOX staging is unchanged; no first real site started.


## Long repeat-item navigation (2026-11-03)

- Selected element fields are primary. A repeated FAQ/card block with **more than six** items gets a native keyboard-operable `<details>` navigator; items in shorter blocks remain one-click visible.
- The disclosure summary identifies total count and selected repeated item. The existing `cms-repeat-row` controls, one per-item `⋯` menu and `D.structure` actions are preserved inside the expanded list. The Add action is always outside the disclosure.
- Selecting any element closes long repeat navigation, redraws properties for the requested item and restores focus to the new selected control (or the native summary for a just-collapsed list). Because the browser may finish a native disclosure click after the old node is replaced, summary focus restoration is deferred to the next animation frame; stale selection/page callbacks are ignored. Add/duplicate moves focus to the new item editing field.
- Disclosure expansion is session-only UI state keyed by section ID; it never modifies the typed site contract, persisted draft, Undo/Redo history or publication state. The hosted light stylesheet and offline stylesheet both style the navigator. Browser regression adds seven FAQ items and checks long-list visibility, selected caption, focus, per-item actions and Undo back to the short list.
- Evidence: functional `97a1ffe7daef23d321923f51ade71c9079cb108e`, [full CI #41625200587](https://github.com/manufact-test/ai-site-cms/actions/runs/41625200587) (4/4); `stage3-faq-compact-editor.png` in [genuine Chromium screenshot artifact #13225786153](https://github.com/manufact-test/ai-site-cms/actions/runs/41625200587/artifacts/13225786153). Owner acceptance and FOX staging update are later gates.


## Repeat action continuity (2026-11-03)

- A successful `moveItem` selects the moved item, leaves the `D.structure` action as one Undo step, redraws the inspector and preview, and focuses its new compact `⋯` action toggle on the next animation frame. An operator can use Enter to reopen the menu and continue moving the same item without hunting for it after the order changes.
- A successful `removeItem` chooses the item at the old index (or the last previous item if deleting the final row) **only when the deleted item was the current Inspector selection**. If another item was selected, that selection is preserved. Keyboard focus moves to the nearest surviving row; the existing confirmation and Undo are untouched.
- Invalid/declined operations do not change the selection or focus; success is checked against the draft session revision. For a long list deliberately expanded to operate on items, `moveItem` leaves the disclosure open. Focus restoration guards against switching page/section/element before the scheduled browser frame.
- Real Chromium regression covers exact repeated-item identity/order before and after move up/down, keyboard activation of `⋯`, selection and focus after deleting a selected card, stability when deleting a different card, and Undo, plus moving item seven in an expanded FAQ and Undo. The deterministic `studio/bundle.js` is updated from the same app source; typed contracts, public rendering, server authority and hosting are unchanged.
- Evidence: functional `ffe6543fd196b477b2c4130ad4ca5097f191893a`, [full CI #41627613839](https://github.com/manufact-test/ai-site-cms/actions/runs/41627613839) 4/4, `stage3-repeat-menu-focus.png` in [browser screenshot artifact #13226418468](https://github.com/manufact-test/ai-site-cms/actions/runs/41627613839/artifacts/13226418468). FOX update and owner UX acceptance remain separate gates.


## Responsive Inspector and repeat-menu visibility (2026-11-03)

- At widths above 970px, the Inspector is its own scroll region and keeps `.inspector-top` sticky. This exposes selected element/block identity and the context switch while scrolling declared properties; section/page/context navigation resets stale Inspector scroll. At 970px and narrower the inspector layout remains static, with the existing two-column tablet and stacked phone arrangements.
- In the stacked phone arrangement (≤650px), selecting a real element schedules focus and scroll to the first editable `#fields` control after redraw, guarded against stale page/section/element changes. Desktop/tablet selection continues to focus the selected navigator control or collapsed repeat summary.
- Each repeat `⋯` menu uses native details + existing `D.structure` actions. Its opening event measures menu/anchor geometry, viewport and actual Inspector scrollport, respecting sticky-header occupied space. It flips above the row only where more space is available, and clamps the menu's scrollable height. Escape closes it and returns focus to its summary. No schema, persisted flag, new public component or server mutation.
- Browser QA now measures Inspector and form field bounding boxes at 1450/820/390 widths, native menu visible bounds, Escape, phone field focus/scroll and scroll reset. The approved-site hosted Chromium additionally takes owner light-theme Inspector screenshots at 820/390 and checks menu placement. Real screenshots are CI artifacts for follow-up visual review, not owner UX acceptance.
- Evidence: functional `0d5059f9cd2fa6d77f197f1cdbefeef0ece5fa12`, [full CI #41635244405](https://github.com/manufact-test/ai-site-cms/actions/runs/41635244405) (4/4). FOX remains unchanged.


## Compact page-versus-section navigation and tablet overlay fix (2026-11-03)

- Within ≤970px editor layouts, an explicit page-nav selection reveals and focuses the canvas page title, while an explicit section-nav selection reveals and focuses that block's Inspector title. The owner sees the appropriate context immediately without another global action; both deferred focus/scroll callbacks verify that the intended page/section remains selected.
- During Chromium regression, a preexisting offline 651–970px sticky sidebar intercepted clicks intended for the Inspector below the preview. The sidebar is now non-sticky but retains its own bounded scroll rail at that breakpoint; the Inspector's scope buttons receive actual pointer events. Mobile ≤650px and hosted responsive mode retain their own existing layout rules.
- Offline browser regression covers page and section navigation at 820px and 390px, restores the original editing section, checks focused headings and visible viewport positions, and probes hit testing at the Element/Block scope control. Hosted approved-site Chromium exercises the same section-focus path in its light theme.
- The reveal handler runs only for pointer/touch clicks (positive `MouseEvent.detail`); keyboard/programmatic navigation preserves the selected `.nav-entry` focus for existing section-search accessibility. Hosted approved-site Chromium's preexisting Enter-search regression test remains the guard.
- Evidence: functional `0d5059f9cd2fa6d77f197f1cdbefeef0ece5fa12`, full [CI #41635244405](https://github.com/manufact-test/ai-site-cms/actions/runs/41635244405) and [responsive screenshot artifacts](https://github.com/manufact-test/ai-site-cms/actions/runs/41635244405/artifacts/13230406794). No server deployment or schema mutation.


## Task-based element properties and keyboard-first navigation (2026-11-03)

- `stage3/studio/app.js` groups the existing manifest-declared element fields using native `details` / `summary` controls. For elements with multiple groups, only the current one opens; content (or the first available group) is the default. User choice is kept in a session-only `Map` keyed by page, section and element IDs. No new field, persisted contract, server setting or site markup. A single group has no redundant summary.
- The existing groups retain their actual controls, validation, responsive inheritance/reset and `D.edit` transactions. Changing the device redraws controls inside the remembered group without losing the owner's place.
- `#elements`, `#pages` and `#sections` accept ArrowUp, ArrowDown, Home and End for selection. Keyboard and programmatic activation preserve focus on the newly selected row, scroll it into view and announce current page/block via `aria-current` and navigation shortcuts via `aria-keyshortcuts`; pointer/touch remains contextual, and stacked phone pointer selection still focuses the first field. Long-list FAQ expansion, repeat-item action menus, Escape and structural Undo remain unchanged.
- `stage3/studio/studio.css` and `stage3/studio/hosted.css` style the identical collapsed/expanded groups in the offline dark and hosted light Studio, including visible focus rings. Generated `stage3/studio/bundle.js` is derived from the same updated app source.
- Real browser coverage: `stage3/tests/studio-browser.cjs` asserts group visibility, opening/closing, remembered choice at another breakpoint, keyboard focus for element/page/section navigation at desktop/mobile, the one-group gallery edge case, and mobile grouped-summary geometry at 390px; `stage3/tests/approved-site-browser.cjs` checks hosted light Inspector appearance edit with explicit group choice. Full [CI #41647681104](https://github.com/manufact-test/ai-site-cms/actions/runs/41647681104) **SUCCESS 4/4** on functional SHA `f861ea7055dac3bff5ecdb4c68597c68d0cf73d2`; [screenshot evidence](https://github.com/manufact-test/ai-site-cms/actions/runs/41647681104/artifacts/13235149333). These checks are engineering verification, not owner UI/UX signoff. FOX unchanged.


## Main canvas direct selection and preview continuity (2026-11-03)

- Main Studio canvas remains the real scriptless page preview and **now supports pointer selection** through a parent-owned DOM listener. Only IDs belonging to the currently validated page sections and registered manifest controls can select editable targets; manifest text is matched to its current visible value, static media and repeat items use their actual element IDs. Unmatched or Design Graph internals fall back to whole-block selection; graph-node editing stays in the pre-existing full-page Workbench.
- The iframe's `sandbox="allow-same-origin"` permits the parent to inspect first-party DOM, but intentionally omits `allow-scripts`, forms, top navigation and popups. Click/submit defaults are prevented; the preview CSP continues to disable scripts. The canvas selection does not call `D.edit`, `D.structure`, server Save or Publish.
- Section Enter/Space selection and scroll restoration across same-page redraw and responsive mode changes are covered by offline Chromium. Hosted test clicks real PHP-rendered page content. The selected block/element is indicated transiently in preview without modifying the generated published HTML or site contract.
- Functional candidate `2d3db6e25fd61dcab3a4a24d4ca5f54f7e2c504c`, CI [#41661403198](https://github.com/manufact-test/ai-site-cms/actions/runs/41661403198) **SUCCESS 4/4**. Owner UI/UX approval remains pending. FOX, Stage2, main, production and live data untouched.


## Phone re-selection of the current canvas element (2026-11-03)

On ≤970px viewports the main preview picker now also reveals the Inspector when the same element is tapped again. For element context it selects the first physically rendered input/textarea/select/button from the currently **open** field group, falling back to a disclosure summary when all controls are closed. This prevents focusing a hidden input behind a collapsed group. Block context continues to reveal its heading. No draft mutation or new editor state.

The genuine 390px Chromium flow leaves the Style group expanded and Content closed, re-taps the selected heading, and asserts that the active field belongs to Style and is inside the viewport. Functional candidate `9212b95b686f2ba53dfa2a389118a42f661871c6`, [CI #41662591463](https://github.com/manufact-test/ai-site-cms/actions/runs/41662591463) **SUCCESS 4/4**. Owner acceptance, Hostinger FOX deployment and real client site remain separate gates.


## Individual Design Graph node click-through (2026-11-03)

The main preview now identifies **validated** graph IDs via the same emitted `.cmsdg-n-{id}` classes already consumed by Workbench. A click on such a node routes to the existing `focusVisualReview` → full-page Workbench with its exact node ID, responsive mode and scroll position; background clicks still select block scope. Workbench's own Graph inspector renders the same original typed node controls, undo/save/review/publish gates. This is not a new Graph editor or hidden code evaluation, and site/graph data is unchanged by navigation.

Hosted approved-site genuine Chromium clicks `approved-custom-copy` in PHP-rendered Design Graph, requires `#cms-work-graph-node` to be the same stable ID, and compares the draft before and after. Verified functional SHA `dec59430f789e9907c545c1ecca7bbe334004843`, [CI #41664294523](https://github.com/manufact-test/ai-site-cms/actions/runs/41664294523) **SUCCESS 4/4** final result. Owner acceptance and staging deployment remain separate.


## Owner UX clarification — center-first page and contextual inspector (2026-11-03)

The main scrollable **full-page preview** is the primary navigation/control surface. Click an actual section background to open its own block context (contents and original block actions), and click its visible text/media/repeat item to open its existing element properties. A validated leaf Design Graph node still routes into the existing Workbench. This is a presentation/selection change, **not a new editor, site schema, renderer or persistence mechanism**.

- Sidebar `#cms-section-navigator` is an optional, initially collapsed structure tree, retaining accurate keyboard Arrow/Home/End and scroll-to-section behavior. No permanent duplicate section cards beside the page.
- In block context `#cms-block-contents` lists the section’s exact element/item manifest IDs; it links the real selected block to the corresponding element inspector. Previously existing block actions and `#section-catalog` move into the Inspector’s `#cms-selected-block-actions`; the canvas exposes one `#cms-canvas-add-block` command.
- In element context the inspector renders the selected properties first. `#cms-element-navigator` is an optional disclosure; repeatable cards/FAQ auto-expose their actual items unless the user deliberately closed them in that section. Section and element properties are kept separate, including on narrow viewports.
- Same-page section/element selection updates selection chrome **without overwriting iframe `srcdoc`**, preserving the actual central page and scroll. Direct section selection scrolls the Inspector into view on tablet/phone; tapping an element reveals its editable field. Actual content edits/responsive mode/page changes follow the existing render/update contract.
- Keyboard selection on real visible manifest elements and Design Graph leaves routes through the existing validated host-owned selection. Iframe is still scriptless (no `allow-scripts`). Save/Undo/Publish remain separately controlled.

**Engineering evidence:** functional `db6d6b5c474549344a578e5afa2dd6a7da3f3716`; [full CI #41673681398](https://github.com/manufact-test/ai-site-cms/actions/runs/41673681398) **SUCCESS 4/4**, including offline and authenticated real Chromium plus 390/820px responsive selection and no-iframe-reload assertions. [Browser screenshot artifact](https://github.com/manufact-test/ai-site-cms/actions/runs/41673681398/artifacts/13250351207). The artifact is CI-generated; human visual acceptance is still open. **FOX not updated**; Stage2, `main`, production, MariaDB, Cron and private settings untouched. See `handoffs/lead-integrator/ADMIN-UX-VISUAL-FIRST-2026-11-03.md`.


## Third contextual scope — selected page (03.11.2026)

The Inspector now explicitly models **page → block → element**. A page-list click activates Page scope and the original `#page-add` command group moves into `#cms-page-actions-slot`. In hosted mode the already-existing `#server-page-actions` and page-specific `#cms-open-seo` travel with this group; in offline mode a nonduplicating SEO launcher clicks its existing modal button. All server permission guards, write handlers and Save/Publish boundaries remain unchanged. Block and element selection return their respective Inspector controls; the section tree remains optional. Page scope clears the section's visual selection and `aria-current=location` so page selection is unambiguous.

A repeated click on the current page updates context without `srcdoc` assignment; a page switch still runs the existing preview renderer. The full-page Workbench control is labelled «Расширенный редактор» to distinguish it from main-canvas everyday editing. On compact screen a page pick scrolls to page Inspector rather than solely the canvas title.

**Evidence:** functional `005753aad832b6628b85d47b2e705cd7ad45b92e`, [CI #41684120493](https://github.com/manufact-test/ai-site-cms/actions/runs/41684120493) SUCCESS 4/4, [real Chromium screenshots](https://github.com/manufact-test/ai-site-cms/actions/runs/41684120493/artifacts/13254592185); desktop/mobile/page-settings captures inspected as engineering evidence. Owner sign-off and controlled FOX deployment remain outstanding; no Stage2/main/production/private server changes. See `handoffs/lead-integrator/ADMIN-UX-PAGE-SCOPE-2026-11-03.md`.
