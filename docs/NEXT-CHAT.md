# CURRENT CHECKPOINT — structural block editing and focus stability, 2026-11-04 (read first)

**Repo/branch:** `manufact-test/ai-site-cms` / `feature/stage3-ai-site-contract`. Functional structural-block SHA `05c119ef9e94f627905a1c5827b6de696a3e6e68`; final verified code/test SHA `27476ab4a1056935aa182462b5cf452e792d4470`. [Full no-deploy CI #41730348452 SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41730348452) (offline and authenticated hosted Chromium/Contract, Technology Runtime, MariaDB 10.11 and 11.8). [Chromium captures #13277435060](https://github.com/manufact-test/ai-site-cms/actions/runs/41730348452/artifacts/13277435060), [dedicated FOX code-only artifact #13276735305](https://github.com/manufact-test/ai-site-cms/actions/runs/41730348452/artifacts/13276735305) (GitHub digest `sha256:92b9b9187bf941029ba2537b9994adabaf35aada1685decf5931cdb19b7d9ac9`, expires 2026-11-10T22:26:41Z).

**What changed:** Existing Stage3 full-page canvas now selects and reveals a newly added or duplicated block, without a redundant intermediate redraw. Deleting the currently selected block selects its nearest surviving section (following section, or previous one when deleting the last) and reveals it instead of jumping to the page's first section. The old page draft remains undoable; no new buttons, editor, schema or publish path. Page/section keyboard navigation restores focus after sidebar redraw, and compact Inspector headings are revealed again after responsive/pointer-layout settling. Chromium covers catalog insertions, duplicate/remove at a middle location, deletion at page end, Undo on a disposable second Studio tab, long-page selection, responsive changes and existing hosted form/media/SEO/save/publish/restore checks. The initial CI attempts #41727957441, #41728357954 and #41728761870 (and #41729570809) are superseded by the complete green #41730348452; test-order and Undo-stack isolation were corrected, and intermittent hosted focus was fixed and instrumented. No FOX update or owner hands-on acceptance.

**Next:** FOX `https://mediumpurple-fox-175549.hostingersite.com/studio` is installed but still runs **older Studio code**. Do not deploy/reinstall or change `public_html/`, private MariaDB, Cron, secrets, Stage2, `main`, production or first client landing. Follow [the current reversible code-only release gate](../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md); require Ilya's separate update authorization, verified backup and then his hands-on UX acceptance. First real landing awaits original source and independently approved static PC/tablet/mobile designs.

---

# CURRENT CHECKPOINT — long-page block continuity and compact Inspector focus, 2026-11-04 (read first)

**Branch:** `manufact-test/ai-site-cms` / `feature/stage3-ai-site-contract`. Functional block-continuity 93453d3ba4a4cb5726d505cbe069975e11e2f743; compact Inspector follow-up and final verified SHA 0407261da853c29333fe795cdfd86901c577cdac. Full no-deploy CI [#41719118651 SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41719118651) (offline/hosted Chromium & Contract, Technology Runtime, MariaDB 10.11 and 11.8). [Chromium evidence #13272295557](https://github.com/manufact-test/ai-site-cms/actions/runs/41719118651/artifacts/13272295557), [FOX code-only ZIP #13271450998](https://github.com/manufact-test/ai-site-cms/actions/runs/41719118651/artifacts/13271450998) (GitHub digest `sha256:2162308b166bd3b60f1a80c0f4f46ea90f31396d98c639e805bd529319c04829`, expires 2026-11-10T21:12:53Z).

**What changed:** The existing Stage3 full-page canvas now retains the **block-level** section in view through desktop/tablet/mobile redraws if it was visible before the reflow. A section the owner deliberately scrolled away from stays away. Compact (≤970px) section navigation also brings the focused Inspector heading onscreen after a long Inspector has retained its scroll offset. Real Chromium regression covers the far-down `content-switcher` block, PC→mobile→PC, intentional scroll-away→tablet, unchanged draft data and compact hosted Inspector focus; prior gallery, comparison, FAQ and media/SEO/form checks remain covered. One earlier run #41718366352 failed the compact focus-on-screen assertion; the follow-up code fix passed the complete #41719118651 run. No new editor or contract/schema change, no FOX update, no owner UX acceptance.

**Owner/deployment gate:** FOX `https://mediumpurple-fox-175549.hostingersite.com/studio` remains the older installed version. The code-only ZIP is a **candidate artifact**, not an installed update. The next step is owner-authorized backup/rollback-safe FOX code switch and Ilya's own acceptance, following [the release gate](../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md). Do not touch Stage2, `main`, production, private MariaDB, Cron, secrets, existing `public_html/`, installation state or a client site. The first real landing still needs its original source and three independently approved PC/tablet/mobile static designs.

---

# CURRENT CHECKPOINT — wide-page scrolling and regression gate, 2026-11-03 (read first)

**Repository/branch:** `manufact-test/ai-site-cms` / `feature/stage3-ai-site-contract`. **Functional change:** `43bff313da208a36832d38b5741cf00bed33d926`; **latest verified HEAD:** `8b296f5712fa3ed15d239fc7195b775d0cf6aa02`. [Full no-deploy CI #41715883449 — SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41715883449) (offline and hosted Chromium/Contract, Technology Runtime, MariaDB 10.11, MariaDB 11.8). [Real Chromium screenshots #13270665578](https://github.com/manufact-test/ai-site-cms/actions/runs/41715883449/artifacts/13270665578). [Dedicated code-only FOX artifact #13270565817](https://github.com/manufact-test/ai-site-cms/actions/runs/41715883449/artifacts/13270565817), GitHub digest `sha256:c0ca078aa707bd7130a9d7a47185c8ffa0d56d7e4ca2e57d1384d21b1e50834b`, expires 2026-11-10T20:51:54Z. Earlier green `f8f2c54adfbe1c05b1a1a9a1b67578cc3dbc290a` is superseded for any future FOX update.

**What changed:** Besides the gallery, the existing full-page Studio canvas now remembers horizontal position in wide mobile comparison tables through content edits and Undo. A selected comparison row wider than the viewport no longer drags the table to the first column. Browser E2E also proves that editing and undoing a gallery card after the user deliberately scrolled away does **not** jump back. The hosted compact Inspector's mandatory focus assertion has a CI-safe wait. No parallel editor, new site schema or auto-publication.

**Next gate:** FOX `https://mediumpurple-fox-175549.hostingersite.com/studio` remains an older installed editor and **has not been updated**. Do not reinstall, change private MariaDB, public_html, secrets, Cron, Stage2/main or production. Follow [the independent rollback-safe FOX release gate](../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md), obtain separate owner authorization, take protected backups and then request Ilya's hands-on UX acceptance. The first client landing still requires its original source and three separately approved PC/tablet/mobile static designs.

---

# CURRENT CHECKPOINT — gallery editing continuity + verified FOX package, 2026-11-03 (read first)

**Working branch:** `feature/stage3-ai-site-contract`. **Latest verified functional/packaging SHA:** `f8f2c54adfbe1c05b1a1a9a1b67578cc3dbc290a`. **Full no-deploy CI:** [#41707732922 — SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41707732922) (offline + hosted Chromium/Contract, Technology Runtime, MariaDB 10.11, MariaDB 11.8). **Real Chromium captures:** [artifact #13267975358](https://github.com/manufact-test/ai-site-cms/actions/runs/41707732922/artifacts/13267975358). **Dedicated FOX code-only ZIP:** [artifact #13268090095](https://github.com/manufact-test/ai-site-cms/actions/runs/41707732922/artifacts/13268090095) (GitHub artifact SHA-256 `sha256:bd35f5d72e61e4f293964ac47c8f6ae3fa33b7d453b5313d5b6d08952a8c474c`, expires 2026-11-10T19:58:44Z; verify file and hashes before any host operation). The earlier green code-only checkpoint `434e5e39d786279c8eeef02fd718e44a0199f6c7` is now **superseded**.

**Owner-facing improvement:** Within the existing full-page Stage3 Studio, a selected far-away horizontal gallery card stays visible after changing its caption and Undo; the current horizontal gallery position survives iframe redraws. If the selected card was visible before switching PC/tablet/mobile, the new viewport reveals it even when its narrower scrollport reflows it. Ordinary scroll-away remains respected. Real Chromium tests cover repeated cards, six-card carousel, caption editing, Undo, mobile and return to desktop. PHP-hosted editor E2E, server Save/Review/Publish/rollback, media/forms/SEO and MariaDB remain green. No parallel editor, schema change or automatic publication.

**Release discipline:** The SHA-scoped ZIP contains a staged `stage3/` runtime and integrity manifest, not a `public_html/` installer or database. The running FOX Studio is **still older and has not been updated**. Follow [the reversible code-only FOX release gate](../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md), obtain separate owner authorization and verify a private backup before any switch. Do not reinstall, migrate DB, run installer/Cron, touch Stage2/`main`/production/credentials, or begin the first client landing. Owner hands-on UX acceptance is still pending, and that landing awaits the original source plus three separately approved desktop/tablet/mobile static designs.

---

# CURRENT CHECKPOINT — FOX code-only release candidate, 2026-11-03 (read first)

**Working branch:** `feature/stage3-ai-site-contract`. **Source functionality:** `3a44e8415ef63872ee1368271dccf4ba4e6fd419` (CI #41700579265, SUCCESS 4/4). **Code-only packaging candidate:** `434e5e39d786279c8eeef02fd718e44a0199f6c7`; **full CI:** [CI #41703286381 — SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41703286381) ; **runtime artifact:** [FOX code-only artifact #13264687289](https://github.com/manufact-test/ai-site-cms/actions/runs/41703286381/artifacts/13264687289). The earlier reliable functional fallback is `9f5ac311c6260d94044db8a5f66adedef46bb237`.

**Safety improvement:** The existing PHP-host packer now makes a separate FOX update archive containing only `stage3/` and its file-hash manifest, inside a SHA-named outer folder; it cannot be mistaken for the sibling-layout installer package with a `public_html/` root. An explicit `verify-fox-code-only` command rejects public-root inclusion, changed files and unexpected entries. CI compares the runtime fingerprint byte-for-byte against the already-tested Hostinger sibling package and uploads the separate artifact **without deploying anything**.

**Next gate:** review the exact green artifact and follow [the controlled FOX runtime-only update plan](../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md). FOX is **already installed** but still runs older Studio. Do not rerun installer/Cron/DB setup; no update of FOX, Stage2, main, production, MariaDB or private files occurred. A separately approved runtime swap and Ilya's hands-on UI acceptance are still mandatory. First real site still awaits source landing and three approved static layouts.

---

# CURRENT CHECKPOINT — carousel navigation and release readiness, 2026-11-03 (read first)

**Branch:** `feature/stage3-ai-site-contract`. **Functional SHA:** `3a44e8415ef63872ee1368271dccf4ba4e6fd419`. **Full no-deploy CI:** [CI #41700579265](https://github.com/manufact-test/ai-site-cms/actions/runs/41700579265) **SUCCESS 4/4**. **Browser evidence:** [real Chromium captures](https://github.com/manufact-test/ai-site-cms/actions/runs/41700579265/artifacts/13262094912) (includes `stage3-carousel-card-selection.png`). **Previous verified fallback:** `9f5ac311c6260d94044db8a5f66adedef46bb237`.

**Owner-facing fix:** Selecting a far card in a horizontal gallery now scrolls the carousel itself to reveal that exact item in the central page, while preserving the same preview iframe and unchanged draft. Normal vertical reveal still works. Canvas captions also reflect whether the Inspector is editing an element or the block. No extra editor, toolbar, schema, Save or Publish. The existing offline Chromium scenario now exercises six gallery cards, verifies horizontal visibility, no iframe reload and no data mutation; full suite covers authenticated PHP/MariaDB and other form/media/SEO/release paths.

**Independent release review:** A broad engineering regression inventory, host preflight, source-only update, recovery and owner hands-on checklist are documented in [FOX release gate](../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md). **This is a plan, not authorization**: FOX still has older Studio, no deploy or reinstall took place. Do not alter Stage2, main, production, MariaDB, private files, Cron or settings. Owner UX GO is still pending; first real client site still awaits original landing and three approved static desktop/tablet/mobile designs.

---

# CURRENT CHECKPOINT — repeat-item canvas synchronization and media preview, 2026-11-03 (read first)

**Branch:** `feature/stage3-ai-site-contract`. **Functional SHA:** `9f5ac311c6260d94044db8a5f66adedef46bb237`. **Full CI:** [#41693383840](https://github.com/manufact-test/ai-site-cms/actions/runs/41693383840) **SUCCESS 4/4**. **Real Chromium artifact:** [screenshots](https://github.com/manufact-test/ai-site-cms/actions/runs/41693383840/artifacts/13260475490). **Latest full handoff:** [ADMIN-UX-REPEATER-MEDIA-INSPECTOR-2026-11-03.md](../handoffs/lead-integrator/ADMIN-UX-REPEATER-MEDIA-INSPECTOR-2026-11-03.md).

**Daily page editing:** The central full scrollable page is primary; click selected page, block or element to open only the relevant existing Inspector. Optional section/element lists are secondary. Picking a repeated FAQ/card through the Inspector now scrolls the unchanged live page iframe to that exact visible item without rerendering or editing the draft.

**Hidden-device context:** When a section is hidden at the selected responsive breakpoint, a visible reason and device-specific `Показать` repair are accessible in **both** block and element context. The element warning is outside the collapsed navigation. The command uses original `setSectionVisibility` and Undo/Redo; it never saves/publishes automatically.

**Image field clarity:** A manifest media field now displays a compact real thumbnail and current asset description, only when an image is selected. This reuses existing media IDs, authenticated hosted bytes and the media-ready event; no new picker/upload/library/schema. Real PHP Chromium verifies preview of an imported approved image; offline Chromium verifies the empty case.

**Preservation:** Typed Site Contract, Design Graph, SEO Engine, media, forms, Undo/Redo, Save/Review/Publish, rollback, permissions, PHP and standalone Studio remain. No parallel editor or custom site generator.

**Release gate:** Only GitHub source updated. FOX `mediumpurple-fox-175549.hostingersite.com/studio` is older; no deployment. Stage2, `main`, Production, private MariaDB/Cron/settings/connections untouched. Next: high-impact real UX checks and complete CMS verification; separately authorize reversible FOX update and owner personal acceptance. First real site stays on hold until the original landing and three separately approved desktop/tablet/mobile static designs.

---

# CURRENT CHECKPOINT — canvas-first element continuity and device-hidden sections, 2026-11-03 (read first)

**Branch:** `feature/stage3-ai-site-contract`. **Functional SHA:** `fde064af85f534f8168a27183317677d0257cfe9`. **Full CI:** [#41687851736](https://github.com/manufact-test/ai-site-cms/actions/runs/41687851736) — **SUCCESS 4/4**. **Real Chromium screenshots:** [artifact](https://github.com/manufact-test/ai-site-cms/actions/runs/41687851736/artifacts/13256116162).

**Owner-facing outcome:** Work on a complete scrollable page in the center. Clicking its real hero CTA selects the correct element (including when a decorative arrow appears) and opens its existing link field. Opening an element from the selected section's `Содержимое секции` retains the same page iframe instead of reloading it; off-screen elements are scrolled into view. Side section navigation remains optional.

**Responsive visibility:** When a selected section is intentionally hidden on the chosen device, the canvas explicitly says why it is absent; the block Inspector gives a device-specific `Показать` action. This is a normal reversible draft edit: new Chromium checks cover hide/reveal/Undo/Undo and exact draft restoration, plus keyboard selection. The saved/published site is not touched until the original commands explicitly run.

**Architecture:** Preserve the same Typed Site Contract, Design Graph Workbench, SEO Engine, forms, media, Undo/Redo, save/review/publish and rollback. Scriptless preview and validated IDs only; no new CMS engine, editor, manifest, schema, or automatic persistence.

**Release gates:** GitHub branch only. FOX `mediumpurple-fox-175549.hostingersite.com/studio` still runs older code. No uncontrolled FOX update, no Stage2/main/Production/MariaDB/Cron/private changes. Owner must personally test after a separately authorized reversible deployment. First real site remains on hold until source landing and approved distinct desktop/tablet/mobile mocks.

**Full handoff:** [ADMIN-UX-CANVAS-SELECTION-HIDDEN-2026-11-03.md](../handoffs/lead-integrator/ADMIN-UX-CANVAS-SELECTION-HIDDEN-2026-11-03.md).

---

# CURRENT CHECKPOINT — page / block / element contextual Inspector, 2026-11-03 (read first)

**Branch:** `feature/stage3-ai-site-contract`. **Verified functional SHA:** `005753aad832b6628b85d47b2e705cd7ad45b92e`. **Complete GitHub Actions:** [#41684120493](https://github.com/manufact-test/ai-site-cms/actions/runs/41684120493) **SUCCESS 4/4**. **Real Chromium captures:** https://github.com/manufact-test/ai-site-cms/actions/runs/41684120493/artifacts/13254592185.

**Owner UX rule:** The central full scrollable page is the primary navigation. Clicking its section background selects block settings; clicking visible heading/media/repeat cards selects element fields; the validated Graph node still opens the existing Workbench. The sidebar structure tree remains optional.

**New page-level flow:** Clicking a page entry in the left page list (or the site overview's page card) opens the Inspector's **«Страница»** context. It shows the selected page title/path, real original actions for creating/renaming/duplicating/reordering/deleting pages, and page SEO/menu settings. **«Блок»** and **«Элемент»** remain adjacent scopes, with their original existing controls. Re-selecting the current page changes context without reloading the iframe or mutating the draft; selecting a different page follows the existing preview render. The page list remains visible, with no simultaneous false section-active state.

**Navigation and clarity:** Inspector/page focus on 390/820px widths; original Workbench entry is now labelled «Расширенный редактор», distinguishable from the primary canvas. User can reach context from page/section/element directly without permanent competing lists. Original Typed Site Contract, Design Graph, SEO Engine, forms/media, Undo/Redo, Save/Publish/release restore all preserved.

**Validation:** Full CI 4/4 includes genuine offline and PHP Chromium. Desktop, mobile and page-settings screenshots personally reviewed as engineering evidence; not owner's UX acceptance.

**Deployment boundary:** GitHub only; FOX remains on older Stage3 and **must not be used to judge these improvements yet**. No Stage2/main/production/private Hostinger changes. Controlled reversible FOX update requires separate stage; then invite owner test. First real site remains on hold until prior landing and approved static PC/tablet/mobile mockups.

**Handoff:** [ADMIN-UX-PAGE-SCOPE-2026-11-03.md](../handoffs/lead-integrator/ADMIN-UX-PAGE-SCOPE-2026-11-03.md).

---

# CURRENT CHECKPOINT — visual-first editor, 2026-11-03 (read first)

**Working branch:** `feature/stage3-ai-site-contract`. **Functional SHA:** `db6d6b5c474549344a578e5afa2dd6a7da3f3716`. **Full CI:** [#41673681398](https://github.com/manufact-test/ai-site-cms/actions/runs/41673681398) — SUCCESS 4/4. **Chromium screenshots:** https://github.com/manufact-test/ai-site-cms/actions/runs/41673681398/artifacts/13250351207.

**Owner clarification:** The center is a real, full scrollable page. Clicking a section background selects that section and reveals its actual content list and block operations in the Inspector. Clicking a heading/image/repeat card opens exactly its own existing fields, while verified Design Graph leaves route to the existing Workbench. There is no need to find a block in a permanent side tree.

**New interaction contract:** Section tree in sidebar starts collapsed («Структура страницы») and can be opened to navigate/keyboard-select precise or hidden sections. Element navigator starts closed on regular sections; repeatable FAQ/card sections show their items when in element context, with manual per-section preference remembered. One contextual «+ Добавить секцию» at the canvas invokes the original catalog; block actions live only with block properties in the Inspector. On same-page selection, the canvas iframe is not reloaded, preserving exact scroll position and interaction continuity; choosing a section from the optional navigator scrolls the iframe to it. Editable nodes also support keyboard Enter/Space.

**Safety and preservation:** Same Typed Site Contract, Design Graph, SEO Engine, Draft/Undo, media/forms, Save/Review/Publish, rollback and server permissions. Parent-owned UI handlers only; iframe still scriptless. No new persisted state, editor, schema or renderer, and no automatic save or publish. Tests cover offline and real PHP-rendered Chromium, including no iframe reload/no draft mutation and 390px responsive focus.

**Delivery:** GitHub only. FOX is still on older code; **do not ask owner to test FOX yet**. Stage2, `main`, Production, private MariaDB/Cron/settings unchanged. Continue screenshot review and usability fixes, then separately authorize reversible FOX update and owner hands-on acceptance. First real site remains blocked until original landing plus approved static desktop/tablet/mobile mocks.

**Handoff:** [ADMIN-UX-VISUAL-FIRST-2026-11-03.md](../handoffs/lead-integrator/ADMIN-UX-VISUAL-FIRST-2026-11-03.md).

---

# CURRENT CHECKPOINT — direct Design Graph node to existing Workbench, 2026-11-03 (read first)

**Branch:** `feature/stage3-ai-site-contract`. **Latest functional SHA:** `dec59430f789e9907c545c1ecca7bbe334004843`. **Full CI:** [#41664294523](https://github.com/manufact-test/ai-site-cms/actions/runs/41664294523) — **SUCCESS 4/4**. Previous green functional SHA `9212b95b686f2ba53dfa2a389118a42f661871c6`, [CI #41662591463 SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41662591463).

**Individual Design Graph editing:** the real main Studio preview now binds validated visible Design Graph node IDs to their rendered nodes. Clicking a text/image/etc node in a custom composition opens that **exact node** in the already-existing full-page Workbench/Graph inspector. Clicking the section background still selects whole-block properties. Normal manifest text, media and repeat cards still open the regular Inspector as in the preceding checkpoint, and responsive scroll/focus behavior remains. The bridge is UI navigation only: same draft, same Workbench, no new editor or schema, no auto-Save/Publish. Node IDs are checked against the current validated graph before navigation.

**Final proof:** [CI #41664294523 SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41664294523), [real Chromium screenshots #13246870299](https://github.com/manufact-test/ai-site-cms/actions/runs/41664294523/artifacts/13246870299). The first Graph test on #41663405126 used a stale `data-cms-section-id` selector against PHP's actual `section#id`; corrected in test-only `dec5943` before the green run. **Regression:** hosted approved-site Chromium selects the exact `approved-custom-copy` node in a genuine PHP-rendered Graph section, verifies the Workbench node selector and unchanged draft, closes the dialog and returns to normal editing. Existing offline, PHP, Next and MariaDB 10.11/11.8 jobs remain the full gate. Engineer screenshot evidence is not owner acceptance.

**Next:** use the verified screenshot evidence and conduct owner UX review and a separately authorized controlled FOX update. FOX/Stage2/main/Production/private DB/Cron/settings untouched. First real site still waits for owner's original landing + three approved static desktop/tablet/mobile prototypes.

**Detailed handoff:** [ADMIN-UX-CANVAS-SELECTION-2026-11-03.md](../handoffs/lead-integrator/ADMIN-UX-CANVAS-SELECTION-2026-11-03.md).

---

# CURRENT CHECKPOINT — phone canvas re-selection focus, 2026-11-03 (read first)

**Branch:** `feature/stage3-ai-site-contract`. **Latest functional SHA:** `9212b95b686f2ba53dfa2a389118a42f661871c6`. **Full CI:** [#41662591463](https://github.com/manufact-test/ai-site-cms/actions/runs/41662591463) — **SUCCESS 4/4**. Previous verified functional fallback `2d3db6e25fd61dcab3a4a24d4ca5f54f7e2c504c`, [CI #41661403198 SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41661403198).

**Additional phone UX fix:** tapping the already selected element in the now-clickable scriptless main canvas also reveals its actual Inspector field; previously the redundant selection returned silently while the Inspector remained below the viewport. On compact screens the focus targets a **visible** control in the currently expanded «Содержимое»/«Оформление»/«Действие и ссылки» group, never an input hidden in a closed disclosure. The existing block/element selection, scroll retention, responsive inheritance, Undo/Redo, Save/Review/Publish and rollback remain unchanged.

The real offline Chromium test reproduces a 390 px phone with «Оформление» open and «Содержимое» closed, taps the selected heading again, and asserts focus + physical viewport visibility. This is editing UX only, not client content or publication. No FOX/Stage2/main/Production update. Owner personal UI/UX GO remains pending; real site starts only after original landing and three approved static designs.

**Handoff:** [ADMIN-UX-CANVAS-SELECTION-2026-11-03.md](../handoffs/lead-integrator/ADMIN-UX-CANVAS-SELECTION-2026-11-03.md) and the previous checkpoint below.

---

# CURRENT CHECKPOINT — direct canvas selection and scroll continuity, 2026-11-03 (read first)

**Branch:** `feature/stage3-ai-site-contract`. **Latest functional SHA:** `2d3db6e25fd61dcab3a4a24d4ca5f54f7e2c504c`. **Full CI:** [#41661403198](https://github.com/manufact-test/ai-site-cms/actions/runs/41661403198) — **SUCCESS 4/4**. Previous fully green functional fallback: `be2a0169a686cd2b118b8e721547f8050a827cc8` ([CI #41660481727](https://github.com/manufact-test/ai-site-cms/actions/runs/41660481727) SUCCESS 4/4).

**Everyday owner workflow:** the main Studio preview is now directly selectable. Clicking a real page block opens block settings; clicking reliably matched manifest text, an image or a repeated gallery/card item opens that element in the existing Inspector. Focusing a section in the preview and pressing Enter/Space selects its block. The selected section/field receives transient visual highlighting. The preview scroll is restored after rerenders and desktop/tablet/mobile switches on the same site/page. These are **selection-only** actions, never content changes, saves, publication or navigation.

The main iframe remains scriptless and sandboxed, with only `allow-same-origin` granted so the parent controller can bind **validated** section/element IDs (same mechanism as the existing full-page Workbench). No scripts, form submission, link navigation, popup permissions or server writes are enabled by canvas click. Design Graph internals remain selected in their existing full-page Workbench; if a visible item cannot be matched to a manifest field, clicking its section still opens block scope instead of guessing.

**Browser regression:** offline Chromium selects heading, background block, keyboard section and gallery repeater, verifies no draft mutation and scroll position after switching width. Hosted PHP preview Chromium selects a real block without changing draft. Screenshots include `stage3-canvas-click-selection.png` in the existing GitHub Actions screenshot artifact. Existing saved/reviewed/published/rollback flows and 4 CI jobs remain the gate.

**Final CI:** [#41661403198](https://github.com/manufact-test/ai-site-cms/actions/runs/41661403198) **SUCCESS 4/4**. [Real Chromium screenshot artifact #13243096641](https://github.com/manufact-test/ai-site-cms/actions/runs/41661403198/artifacts/13243096641). **Next:** inspect any additional visual evidence as needed and collect the owner's visual/hands-on approval before a separately authorized, reversible FOX staging update. **FOX still runs older code**. Do not touch Stage2, `main`, Production, private Hostinger settings/DB/Cron or begin the first client site. No new first-site design until the owner supplies the original landing and approves desktop/tablet/mobile static mockups.

**Detailed handoff:** [ADMIN-UX-CANVAS-SELECTION-2026-11-03.md](../handoffs/lead-integrator/ADMIN-UX-CANVAS-SELECTION-2026-11-03.md).

---

# CURRENT CHECKPOINT — task-focused Inspector and keyboard navigation, 2026-11-03 (read first)

**Branch:** `feature/stage3-ai-site-contract`. **Last verified functional SHA:** `f861ea7055dac3bff5ecdb4c68597c68d0cf73d2`. **Full CI:** [#41647681104](https://github.com/manufact-test/ai-site-cms/actions/runs/41647681104) — **SUCCESS 4/4** (offline and approved-site Chromium, Next runtime, MariaDB 10.11/11.8). [Genuine browser screenshots](https://github.com/manufact-test/ai-site-cms/actions/runs/41647681104/artifacts/13235149333). **Docs HEAD** is the latest documentation-only commit following this functional SHA.

**New owner-oriented workflow in the existing Studio:**
- The element Inspector now has collapsible task groups: «Содержимое», «Оформление», «Действие и ссылки», other properties as applicable. The first relevant group is open initially; choosing another closes the previous one and remembers that choice per page/block/element for this editing session, including device changes. One-group elements remain uncluttered, without a redundant disclosure.
- Pages, blocks and element rows support ArrowUp/ArrowDown/Home/End keyboard selection without losing focus after redraw; active pages/blocks expose `aria-current`, all navigator rows advertise their shortcuts, and keyboard selection scrolls into view. Pointer/touch selection still reveals the canvas or Inspector appropriately on narrow screens; phone pointer selection still moves to the first editable field. Long repeat lists keep their existing collapsed/disclosed behavior.
- The change is **presentation and editor interaction only**: no new site schema, template library, AI generator, server migration, content mutation, publication or protected-host action. Existing Undo/Redo, Save, Review/Publish, rollback, Design Graph, Typed Site Contract, SEO Engine, forms and media remain in place.
- Browser regressions now exercise group initial state, changing group, persistence across responsive device selection, one-group behavior, desktop/mobile keyboard navigation and focus, plus the existing end-to-end editing and hosted approved-site flows. Screenshots `stage3-inspector-property-groups.png` and `stage3-inspector-property-groups-mobile.png` record the task-based property editor on desktop and phone, with explicit mobile width containment assertions.

**Next gate:** owner visual/interaction review of screenshots and then controlled FOX staging update and the owner's own usability session. **FOX still runs the previous code**. Keep Stage2, `main`, production, private Hostinger data, database and Cron untouched. Do not start the first real site until the owner supplies and approves the original landing/static desktop/tablet/mobile designs.

**Detailed handoff:** [ADMIN-UX-FIELD-GROUPS-KEYBOARD-2026-11-03.md](../handoffs/lead-integrator/ADMIN-UX-FIELD-GROUPS-KEYBOARD-2026-11-03.md). **Prior fully green rollback SHA:** `0d5059f9cd2fa6d77f197f1cdbefeef0ece5fa12`.

---

# CURRENT CHECKPOINT — responsive Inspector and context-safe menus, 2026-11-03 (read first)

**Working branch:** `feature/stage3-ai-site-contract`. **Last verified functional SHA:** `0d5059f9cd2fa6d77f197f1cdbefeef0ece5fa12`. [Full CI #41635244405](https://github.com/manufact-test/ai-site-cms/actions/runs/41635244405) **SUCCESS 4/4** (genuine Chromium offline and hosted Studio, Next runtime, MariaDB 10.11/11.8). [Real Chromium screenshots](https://github.com/manufact-test/ai-site-cms/actions/runs/41635244405/artifacts/13230406794) include `stage3-inspector-desktop-responsive.png`, `stage3-inspector-tablet-responsive.png`, `stage3-inspector-mobile-responsive.png` and hosted `owner-studio-inspector-tablet.png` / `owner-studio-inspector-mobile.png`. Generated screenshots and geometry assertions are automated evidence, not a substitute for owner approval or independent pixel-level design review.

**Implemented in the existing Studio:**
- On desktop, the selected element/block heading and context tabs remain sticky inside the Inspector while its property fields scroll; changing page, section or Block/Element scope resets a stale Inspector scroll position.
- On phones (≤650 CSS px), choosing an element moves focus and the viewport directly to its first editable field, so the user does not have to hunt below the entire element list. Desktop/tablet selection preserves the existing keyboard navigator behavior.
- Repeat-item `⋯` menus decide whether to open above or below based on actual available space inside the Inspector and viewport. At tight heights menus become scrollable rather than extending past the edge; Escape closes the menu and returns focus to its toggle. The existing move/duplicate/delete actions, selection, order and Undo/Redo remain unchanged.
- Real offline Chromium assertions cover widths 1450/820/390, Inspector/field horizontal containment, sticky desktop versus non-sticky tablet/mobile, menu bounds and Escape, phone first-field focus/scroll, context/section scroll reset. A separate genuine hosted approved-site Chromium test covers tablet/mobile geometry and menu handling in the light server Studio.

**Narrow-screen page/block navigation:** on widths ≤970px, choosing a page scrolls to its real page canvas, while choosing a section scrolls to the correct block Inspector and focuses its heading. No extra toolbar buttons. Both paths guard against stale selections. Pointer/touch reveal is deliberately disabled for programmatic/keyboard selection, so the existing Enter-driven section search retains focus on its active navigation result. The offline two-column tablet sidebar was found to cover Inspector controls under its old sticky positioning; it is now a normal, independently scrollable rail at 651–970px, without overlapping the lower Inspector. Genuine Chromium verifies focus, visibility and actual pointer hit testing at 820/390px; hosted approved-site Chromium checks section focus on both widths. Intermediate CI [#41633558332](https://github.com/manufact-test/ai-site-cms/actions/runs/41633558332) exposed the previously undetected tablet overlap, fixed in the final functional SHA.

**Next:** review the responsive screenshot evidence and the remaining everyday page-to-element navigation, then controlled FOX staging update and owner UX test before building the first real website. **FOX still runs older code**. Do not touch Stage2, main, production, private DB/Cron/settings, or introduce new client content. Previous green rollback SHA: `ffe6543fd196b477b2c4130ad4ca5097f191893a`.

---

# CURRENT CHECKPOINT — contextual repeat-item move/delete UX, 2026-11-03 (read first)

**Working branch:** `feature/stage3-ai-site-contract`. **Last fully verified functional SHA:** `ffe6543fd196b477b2c4130ad4ca5097f191893a`. [Full CI #41627613839](https://github.com/manufact-test/ai-site-cms/actions/runs/41627613839) **SUCCESS 4/4** (genuine Chromium Studio, Next runtime, MariaDB 10.11/11.8). Screenshot `stage3-repeat-menu-focus.png` is generated by the same real browser E2E and available in [artifact #13226418468](https://github.com/manufact-test/ai-site-cms/actions/runs/41627613839/artifacts/13226418468); direct pixel-level owner approval is still pending.

**Implemented in the existing Studio:** repeat-card/FAQ move actions select the moved item, preserve its actual new order and return keyboard focus to its compact `⋯` menu so actions can be reopened with Enter. Removing the selected item selects the closest surviving neighbor (the next item, or previous at the end), avoiding a jump to an unrelated block field; removing another item does not steal the current selection. Focus follows the appropriate surviving row. In expanded long lists, moving an item keeps the disclosure open. Add/duplicate behavior and original `D.structure` transactions, Undo/Redo, Save/Publish, Design Graph, SEO and typed site remain unchanged. Chromium assertions cover four service cards, move up/down, Enter, deletion of selected and unrelated cards, Undo, plus 7-question FAQ move with open disclosure and Undo.

**Next:** assess actual Inspector viewport overflow and active-row visibility on desktop/tablet/mobile, and owner-appropriate keyboard/menu semantics. Later controlled FOX staging update and manual owner UX acceptance before the first real site. **FOX was not changed**. No modifications to Stage2, main, production, DB/Cron/secrets, or any client content. Previous green rollback checkpoint: `97a1ffe7daef23d321923f51ade71c9079cb108e`.

---

# CURRENT CHECKPOINT — long FAQ/card navigation and keyboard focus, 2026-11-03 (read first)

**Working branch:** `feature/stage3-ai-site-contract`. **Latest functional SHA:** `97a1ffe7daef23d321923f51ade71c9079cb108e`. Full CI [#41625200587](https://github.com/manufact-test/ai-site-cms/actions/runs/41625200587) — **SUCCESS 4/4** (genuine Chromium Studio test, Next runtime, MariaDB 10.11/11.8). New real Chromium screenshot `stage3-faq-compact-editor.png` in [artifact #13225786153](https://github.com/manufact-test/ai-site-cms/actions/runs/41625200587/artifacts/13225786153); the screenshot exists as generated test evidence, not independent visual approval.

**Implemented inside the existing Studio:** FAQ/repeated-card navigator collapses automatically when a block has more than six items, keeping the selected element properties reachable without scrolling past up to 24 rows. The summary shows item count and current selection; opening it reveals the unchanged per-item menu (move, duplicate, delete). «Добавить вопрос/карточку» stays outside the disclosure. Selecting an item re-collapses the long list, updates the Inspector title, preserves keyboard focus on the disclosure after the native click; static element selection retains focus on its selected button; add/duplicate moves focus to the new content field. Short lists of six or fewer remain directly visible. New Chromium E2E covers 7-item FAQ, click/focus, menus and Undo. No typed site schema, public runtime, SEO, Design Graph, server authority, Save/Publish or deployment changes.

**Next:** focused usability pass on repeat-list item movement/edit/navigation and Inspector scrolling at desktop/tablet/mobile widths, inspect screenshots where directly accessible; continue coherent owner editing flows. Later controlled FOX staging update and owner UX testing; **FOX is still on older installed code**. Do not touch Stage2, main, production, DB/Cron/secrets or start a real site before owner approval. Intermediate runs [#41624617701](https://github.com/manufact-test/ai-site-cms/actions/runs/41624617701) and [#41624938110](https://github.com/manufact-test/ai-site-cms/actions/runs/41624938110) exposed the native closed-details focus issue; fixed and verified in `97a1ffe7`. The previously verified functional checkpoint `dc312fa301a6dbf29acbdd38c5a9220c2face1fd` remains available for rollback.

---

# CURRENT CHECKPOINT — grouped element properties and long-text editing, 2026-11-03 (read first)

**Working branch:** `feature/stage3-ai-site-contract`. **Last fully verified functional SHA:** `dc312fa301a6dbf29acbdd38c5a9220c2face1fd`. [Full CI #41620839120](https://github.com/manufact-test/ai-site-cms/actions/runs/41620839120) **SUCCESS 4/4** (contract genuine Chromium, technology-runtime and MariaDB 10.11/11.8). [Real browser screenshot artifact #13223831807](https://github.com/manufact-test/ai-site-cms/actions/runs/41620839120/artifacts/13223831807) includes the new `owner-studio-element-properties.png` from hosted approved-site Chromium. Screenshot generation is test evidence; independent visual inspection and owner UX approval remain outstanding.

**Implemented on the same existing Studio:** selected-element properties are grouped by manifest-declared `content`, `style`, `behavior` as «Содержимое», «Оформление», «Действие и ссылки», with no redundant heading for a one-group element. Long `text` manifest fields above 180 characters and `content.options` use multiline textarea controls; short headings and labels remain compact inputs. All inputs retain their original IDs/data-field, `D.edit`, responsive inheritance, Undo/Redo and Save/Review/Publish; no contract or schema change. Offline dark and hosted light CSS covered. Existing Block/Element context switch from previous green `c2cc930` remains intact. See [architecture](../stage3/docs/ADMIN-UX-ARCHITECTURE-2026-11-03.md).

**Next:** assess screenshot density/contrast/clipping on desktop/tablet/mobile; continue coherent editing clarity for selected element rather than adding random global controls. Later plan a controlled FOX staging update and let the owner personally walk through UX before first real site. **Do not** reinstall Stage3, touch DB/Cron/private settings, Stage2 Woodpecker, main or production. FOX does NOT yet contain latest GitHub UX changes. Do not begin real landing/prototypes without owner materials and approvals.

---

# CURRENT CHECKPOINT — block / element Inspector contexts, 2026-11-03 (read first)

**Working branch:** `feature/stage3-ai-site-contract`. **Last FULL GREEN functional SHA:** `c2cc93049453abf03c4fe33eacafa840a5e569d3`. [Full CI #41612749799](https://github.com/manufact-test/ai-site-cms/actions/runs/41612749799): **SUCCESS 4/4** (contract Chromium, technology-runtime, MariaDB 10.11/11.8). [Real browser screenshots](https://github.com/manufact-test/ai-site-cms/actions/runs/41612749799/artifacts/13219468053) include `owner-studio-block-properties.png`. This is test evidence, not owner UX approval and not a claim of independent manual visual inspection.

**Implemented:** the same existing Stage3 Studio Inspector now distinguishes **«Блок»** (selected page/section, visibility and whole-block configuration, form builder and advanced shared sections) from **«Элемент»** (selected field/question and its properties, repeated item actions in a compact menu). Navigation changes context without writing the draft; media/diagnostic element focus returns to element mode. Existing Design Graph, SEO, typed site, Undo/Redo, server Save/Review/Publish, PHP/MariaDB and deployment gates are unchanged. See [new detailed handoff](../handoffs/lead-integrator/ADMIN-UX-BLOCK-ELEMENT-CONTEXT-2026-11-03.md) and [Studio architecture](../stage3/docs/ADMIN-UX-ARCHITECTURE-2026-11-03.md).

**Next:** inspect actual screenshot layout and address concrete clipping/contrast/density problems; continue selected-element property grouping and daily-edit clarity as one functional block; broad owner acceptance after controlled FOX staging update. **No new website or prototype yet.** The FOX Stage3 instance is installed but does **not** have these GitHub changes; do not redeploy without a separate plan. Do not touch Stage2 Woodpecker, main, production, secrets, Cron or persisted site data. CI green is NOT owner acceptance.

---

# CURRENT CHECKPOINT — Studio element inspector and repeat menus, 2026-11-03 (read first)

**Working branch:** `feature/stage3-ai-site-contract`. **Last verified green functional SHA:** `4e6292ccd2f008ab99dcd6c82cc5a066e66ed904`, [full Actions #41607826074](https://github.com/manufact-test/ai-site-cms/actions/runs/41607826074) **SUCCESS 4/4** (genuine Chromium, technology-runtime, MariaDB 10.11 and 11.8). **Latest functional+test SHA:** `4e6292ccd2f008ab99dcd6c82cc5a066e66ed904` — one action menu per FAQ/repeatable card, plus contextual selected element name in Inspector; deterministic bundle matched, updated offline/hosted browser tests. Its [full CI #41607826074](https://github.com/manufact-test/ai-site-cms/actions/runs/41607826074) is **SUCCESS 4/4**. [Real browser screenshot artifact #13217473544](https://github.com/manufact-test/ai-site-cms/actions/runs/41607826074/artifacts/13217473544) includes `owner-studio-faq-actions.png`, visually inspected. The intermediate source commit `b01375afb01f3cd396d58babf16e16ccc819c4bd` hit an obsolete offline browser assertion in [#41607455780](https://github.com/manufact-test/ai-site-cms/actions/runs/41607455780), which still tried to click a now-collapsed menu item; corrected by `4e6292ccd`.

**What is implemented, awaiting owner acceptance:** one Stage3 Studio, with genuine server site list/no-site empty state, selected project overview, page editor + block navigator + contextual element inspector, page-level SEO/menu and unified page title/URL dialog, separate site settings/resources, owner-controlled import onboarding, account and system platform management. Browser-visible factory pages from `stage3/fixtures/industrial-site.json` are offline fixture data, not a real server site. Save/Review/Publish remain exclusive to the editor with a real selected site; PHP authority and typed contracts unchanged.

**New element/FAQ UX:** `stage3/studio/app.js` shows the actual selected element/question in the Inspector caption, and each FAQ/other repeated card now has one `⋯` menu rather than four always-visible move/duplicate/delete icons. The underlying `D.structure` commands, item IDs, limits, confirmation, Undo and publication gates are unchanged. `stage3/studio/bundle.js` stays deterministic with `build.cjs`; styles cover hosted white and offline dark modes. Chromium tests exercise the disclosure and the original move/delete mutations. See [admin architecture](../stage3/docs/ADMIN-UX-ARCHITECTURE-2026-11-03.md) and [new handoff](../handoffs/lead-integrator/ADMIN-UX-CONTEXT-INSPECTOR-2026-11-03.md).

**Next steps:** (1) continue owner-facing polish of selected page/block workspace and review coherent task grouping without adding unrelated buttons; (2) plan a controlled staging FOX update and owner's hands-on UI acceptance before beginning first real landing. Verified browser screenshots are test evidence only; no UX GO was granted. The first supplied landing and desktop/tablet/mobile static mockups are still deferred.

**Hard boundaries:** Stage3 exists on isolated FOX `mediumpurple-fox-175549.hostingersite.com/studio` but these GitHub UI changes have **not** been deployed there. Do not rerun installation, database/Cron steps, touch Hostinger private files, Stage2 Woodpecker, production/main or persisted client data. No automatic publication, no random first-site import. GitHub green is engineering evidence, not owner UX sign-off. Prior installation directions below are historical.

---

# CURRENT PRIORITY UPDATE — 2026-11-03 (read first)

**This update SUPERSEDES the older v9.15 Hostinger “not yet installed / create DB / run plan/apply” instructions below.** Stage3 has now been successfully installed and the owner has authenticated on the isolated FOX staging host. Do NOT recreate database, rerun plan/apply, or ask for credentials. The existing site is https://mediumpurple-fox-175549.hostingersite.com/studio . No finished real website has been approved/imported. Existing “Завод оборудования” pages/sections are not approved pilot content and may be synthetic or a placeholder; first verify where they come from and preserve persisted data.

**Next task: urgently overhaul the current Stage3 Studio admin UX before asking the owner for first landing page material.** Owner inspected the actual FOX Studio and strongly rejected indiscriminate placement of controls: account password/change/logout, system updates/licenses/audit in the same “site tools / connect” dialog, fake page/block trees on an empty workspace, and a folder picker that opens without contextual onboarding. Research Elementor current official editor + contemporary Webflow/WordPress design patterns, audit actual code/navigation, implement a cohesive, context-sensitive information architecture in EXISTING Studio/Workbench, and show verified real browser screenshots. Do not bolt on a new CMS/editor. Separate: CMS home without a site; selected site dashboard; page editor canvas/layers/contextual properties; site settings/resources; account settings; owner-only platform operations. Publish/Save visible only when valid site/page active. No client data deletion or unilateral production updates.

**Authoritative, detailed, owner-approved project handoff:** [HOSTINGER-LIVE-AND-ADMIN-UX-RESET-2026-11-03.md](../handoffs/lead-integrator/HOSTINGER-LIVE-AND-ADMIN-UX-RESET-2026-11-03.md). Read it alongside [OWNER-STUDIO-UX-ACCEPTANCE.md](../stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md), MASTER-TZ and ROADMAP. This is a GitHub documentation checkpoint, not implemented UI and not owner UI/UX GO.

GitHub branch `feature/stage3-ai-site-contract`; functional code reference `4a7182dc859e5b4affbc0a560c5f793ff4f1041e`, last full code CI [#41414660469](https://github.com/manufact-test/ai-site-cms/actions/runs/41414660469), SUCCESS four jobs. Handoff commit `b5a28005fc8a6fbcc14922f54c31ca0a9e61dc9f`; documentation commits may follow. Stage2 Woodpecker and production untouched. Formal owner feature acceptance and first-site pilot still pending. No new installs, Cron, secrets or approvals required to begin GitHub UX work.

---

# MANUFACT AI Site CMS — Next Chat Checkpoint v9.15

**Updated:** 2026-11-02  
**Role:** Lead Integrator. Continue the existing Stage3 CMS; do not restart it or merge it with Design Factory / SEO work.

## Git state

- Repository: https://github.com/manufact-test/ai-site-cms
- Active branch: `feature/stage3-ai-site-contract`
- Latest functional code SHA: `4a7182dc859e5b4affbc0a560c5f793ff4f1041e`
- Full CI: [#41414660469](https://github.com/manufact-test/ai-site-cms/actions/runs/41414660469) — **SUCCESS, 4/4 jobs**: `contract`, `technology-runtime`, MariaDB 10.11 and MariaDB 11.8.
- The previous run #41413760836 exposed a collector PHP allowlist mismatch after adding the database compatibility helper. The helper was excluded from the isolated form collector; D3 and the complete rerun then passed.
- Main remains `12e9c3feb707e5ad46b2caeeed379eb40618466`; no merge, reset or main write.
- Documentation commits follow the tested functional code. Verify the live branch tip before writing.

## Completed in the latest block

1. **Hostinger database compatibility:** Hostinger Web/Cloud uses MariaDB. Stage3 now supports MySQL 8.0+ and MariaDB 10.11+ through PDO MySQL. Older MariaDB/MySQL and SQLite remain blocked for hosted installation.
2. **Shared compatibility policy:** added `stage3/server/DatabaseServerCompatibility.php`; both the installer plan and database snapshot create/restore use the same server-family/version gate.
3. **Engine package integrity:** the new helper is required by the CMS engine release inventory and Hostinger PHP package. It is explicitly excluded from the independent form-collector package.
4. **Database integration CI:** disposable install, private hosted runner, schema initialization, owner creation, engine snapshot/restore and rollback contracts pass on MariaDB 10.11, MariaDB 11.8 and MySQL 8.4.
5. **Full CI:** the original contract, browser E2E, D3 release cutover/rollback, HTTP persistence/publish, Apache shared-host smoke, Hostinger sibling package and technology runtime all passed.
6. **Fresh Hostinger artifact:** workflow #41414660469, artifact `13127730026`, `ai-site-stage3-hostinger-sibling`. A staging update archive was assembled from this verified artifact:
   - File: `stage3-hostinger-mariadb-ready-update.zip`
   - SHA-256: `fdca03d63561baa645ba708ccd6c3a7a95d4deae67d8b602d519c606e26cfa6e`
   - Contains the updated `stage3/` runtime, updated `cms-release.json`, a one-shot private setup helper and an editable private input template.
   - Intentionally excludes `public_html/` so the already verified public front controller remains untouched.
   - The helper self-deletes before invoking the read-only `--plan`; it also removes the old temporary preflight helper from the active runtime if present.

## Hostinger staging evidence (owner-operated, 02.11.2026)

- Selected target: `mediumpurple-fox-175549.hostingersite.com`, the separate test site with no Git provider connected.
- `lightseagreen-woodpecker-264491.hostingersite.com` remains connected to GitHub and watches `stage2-hostinger-cms-preflight`; it has not been changed.
- The previous sibling-layout package was extracted at account-home level. Active observed layout: sibling `stage3/` and `public_html/`; the public root contains exactly `index.php` and `.htaccess`, both mode `0444`. The original `default.php` was preserved outside the public root.
- Private directory `.stage3-private/` exists with exact mode `0700`.
- The owner-operated filesystem preflight found 31 candidate account web roots and saved a private inventory file. A repeated run correctly refused to overwrite the existing inventory. The new one-shot helper re-discovers the standard Hostinger roots and compares the saved inventory before it prepares the private runner config.
- Web PHP is 8.3. The owner-controlled Cron `--probe` returned `cli_ready_for_private_plan` with PHP CLI 8.2.35, SAPI `cli`, PDO, PDO MySQL, JSON, OpenSSL and mbstring.
- All temporary Cron entries have been removed.
- **No existing database was opened or changed. No new database has been created yet. No credentials were read. No private runner config, `--plan` or `--apply` has been executed.**
- The old runtime is to be retained as a rollback backup during replacement. Do not run CMS engine-integrity checks against that old copy.

## Immediate next actions — finish isolated staging preparation

1. Give the owner the verified `stage3-hostinger-mariadb-ready-update.zip` download link.
2. In Hostinger File Manager at the account-home level, rename the current `stage3/` folder to a dated backup (do not delete it). Upload and extract the update archive at the same account-home level. It creates the new `stage3/`, updates `cms-release.json`, and adds `.stage3-private/hosted-install-input.json`. It does **not** contain or replace `public_html/`.
3. The owner edits `.stage3-private/hosted-install-input.json` privately with the connection details for one **new, empty, dedicated Stage3 database** and a strong owner password. Use the database host/name/user/password shown by hPanel. Do not send any password or secret in chat. The helper generates the form secret automatically; form origins/endpoint may remain blank until form setup.
4. Create one temporary hPanel Cron custom command, schedule it **every minute**, and run:
   
   ```sh
   /usr/bin/php /home/u235811320/domains/mediumpurple-fox-175549.hostingersite.com/stage3/server/bin/prepare-hosted-install.php
   ```
   
   This one-shot helper revalidates the private directory, saved 31-root inventory, exact sibling layout and public read-only files; creates the canonical 0600 runner config; removes its own temporary code and input file; then invokes the existing hosted runner's read-only `--plan`. Remove the Cron entry immediately after receiving its output.
5. Review the redacted plan. Proceed only if `state=install_required`, `applyAllowed=true`, `hostIsolation.ok=true`, the database is confirmed as a dedicated empty supported MySQL/MariaDB database, and every blocker is clear.
6. `--apply=<approvalFingerprint>` remains a separate explicit owner decision. Do not run it merely because CI, `--probe` or `--plan` is green.
7. After approved install, verify Studio login, save/reload, publish, visitor-site rollback, forms, test-only notifications, backup/restore and desktop/tablet/mobile. Production remains out of scope.

## Non-negotiable boundaries

- No production deployment without separate explicit approval.
- No main merge, reset or branch switch; no shared/general SSH.
- Do not touch the connected Stage2 site, Stage2 secrets/DB or customer data.
- Do not reuse any existing database. Create one new dedicated empty Stage3 database.
- No passwords, database DSNs, owner credentials, form secrets or private install tokens in chat, URLs, command arguments, screenshots, logs or repository files.
- `--plan` is read-only; `--apply` requires a separate explicit owner decision.
- Green CI and a successful CLI probe are not product acceptance.
- Formal owner acceptance remains **0/135**. Stage2 remains **NO-GO #5–#9**; Stage3 engineering remains isolated and is not formally accepted.
- Work in meaningful functional blocks; do not repeat green tests without new evidence.

## Canonical documents

- `docs/NEXT-CHAT.md`
- `docs/DEVELOPMENT-WORKFLOW.md`
- `PROJECT-STATUS.json`
- `docs/MASTER-TZ.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/HOSTINGER-STAGING-ADDENDUM.md`
- `stage3/docs/HOSTED-INSTALL-RUNNER.md`
- `stage3/docs/STAGING-SHARED-HOSTING.md`
- `docs/ACCELERATED-MACROBLOCK-PROGRAM.md`
