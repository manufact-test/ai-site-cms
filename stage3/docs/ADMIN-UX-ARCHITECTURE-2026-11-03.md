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
| Page editor | `Редактор` with active site | **Existing** Studio canvas, pages/sections tree, selected element inspector, Workbench, responsive modes, Undo/Redo, Save/Review/Publish. Never use fixture tree before real site selection. |
| Site settings | `Настройки сайта` with active site | Design/theme/tokens, site identity, navigation/footer, page SEO, content search/site map and controlled advanced tools. Existing buttons retain their handlers. |
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
