# MANUFACT AI Site CMS — contextual Studio UX checkpoint
Date: 2026-11-03
Role: Lead Integrator
Status: engineering refinement; owner UI/UX acceptance and FOX staging redeployment NOT performed.

## Exact GitHub checkpoint

- Repository: https://github.com/manufact-test/ai-site-cms
- Working branch: `feature/stage3-ai-site-contract`
- Last fully verified functional green: `4e6292ccd2f008ab99dcd6c82cc5a066e66ed904`; https://github.com/manufact-test/ai-site-cms/actions/runs/41607826074 — SUCCESS 4/4 (contract Chromium, technology-runtime, MariaDB 10.11 and 11.8).
- New contextual Inspector/FAQ source SHA: `b01375afb01f3cd396d58babf16e16ccc819c4bd`. The follow-up SHA `4e6292ccd2f008ab99dcd6c82cc5a066e66ed904` updates a stale offline Chromium test. Full latest CI: https://github.com/manufact-test/ai-site-cms/actions/runs/41607826074 — SUCCESS 4/4. Prior #41607455780 failed only because `studio-browser.cjs` still tried to click a now-hidden card action without opening its menu.
- The newest documentation-only commit, if any, supersedes these exact file HEAD references but not the functional baseline.

## What the owner rejected and what was fixed

The owner has years of Elementor, Tilda and WordPress experience. The old admin felt like a pile of unrelated technical controls. User requirement: familiar, modern, context-dependent editing where page settings, element properties, account and platform operations never mix.

Existing Stage3 Studio was preserved, including Design Graph, SEO Engine, Typed Site Contract, Media, forms, approved-v2 import, PHP/MariaDB, save/review/publish, history/rollback. There is no parallel CMS.

- `Мои сайты`: only real `GET /api/sites` records, honest empty state. Offline industrial factory fixture does not masquerade as hosted site.
- `Обзор`: selected site dashboard and actual pages. Rare site switch/reload behind disclosure.
- `Редактор`: existing canvas/layer tree/inspector; page and block actions contextual, Save/Review/Publish visible only here.
- `Настройки страницы`: title/URL, page SEO and navigation visibility, page-level actions; unified title/path modal replaces browser prompt chains for add/edit/duplicate.
- `Настройки сайта`: design identity, global nav, footer and site-wide SEO/audit/handoff (not current-page SEO).
- `Ресурсы`: media, leads/forms, backups/history and relevant diagnostics.
- `Аккаунт`: profile, password, sign out.
- `Управление CMS`: owner-only users, roles, licenses, audit and signed updates.
- `Подключить`: approved-v2 prerequisite guidance before any folder picker; no arbitrary URL import and no publication side effects.
- New pass: the element inspector caption reports selected field/question; one `⋯` disclosure per FAQ/repeatable card holds move/up/down/duplicate/delete, preserving the same `D.structure` calls and min/max buttons.

## Technical implementation of latest pass

Changed in `b01375afb` and test follow-up `4e6292ccd`:
- `stage3/studio/app.js`: selected element label from manifest/repeat item data; compact per-item menu using native `<details>` while retaining original event handlers, disabled states and confirmation.
- `stage3/studio/studio.css`: dark/offline repeat menu style.
- `stage3/studio/hosted.css`: white/hosted repeat menu palette.
- `stage3/studio/bundle.js`: deterministic rebuild-parity equivalent of original SDK/manifests/editor with only app content changed.
- `stage3/tests/approved-site-browser.cjs`, `stage3/tests/hosted-browser.cjs`, `stage3/tests/studio-browser.cjs`: context label, initially hidden actions, explicit reveal, FAQ reorder/delete/card copy, screenshot `owner-studio-faq-actions.png`.

All code changes are in the working feature branch. No production or Hostinger file changes occurred.

## Existing real browser evidence

- Previous verified: https://github.com/manufact-test/ai-site-cms/actions/runs/41602928099 — 4/4 SUCCESS (contract genuine Chromium, technology-runtime, MariaDB 10.11 and 11.8).
- Previous screenshots: https://github.com/manufact-test/ai-site-cms/actions/runs/41602928099/artifacts/13215212533 . Included real hosted 1400px editor, tablet/mobile, CMS home, project overview, account, platform, page settings, page details, resources and Workbench. Reviewer caught white-on-white page dialog labels and corrected them in `81e2abd`.
- Latest browser screenshots: https://github.com/manufact-test/ai-site-cms/actions/runs/41607826074/artifacts/13217473544 . `owner-studio-faq-actions.png` was visually inspected: one `⋯` menu per FAQ row, selected-question context label, original per-item operations behind disclosure. Chromium data is synthetic test fixture, NEVER the owner's first real site.

## Important future tasks

1. Check full CI on latest SHA; inspect screenshot of FAQ rows plus desktop/tablet/mobile for clipping, scroll or menu placement; resolve any actual issue.
2. Continue coherent Inspector UX: the chosen element should own displayed properties; the block-wide advanced controls remain collapsed. Avoid flooding the ordinary page editor with global SEO, passwords, updates, raw IDs or logs.
3. Finish broad owner UX acceptance of no-site/selected-site/page/element/account/platform flows, then plan a controlled FOX staging package update and actual owner walkthrough. CI is not user approval.
4. Only AFTER owner approves UI request their previously made landing, study it, agree three static desktop/tablet/mobile mockups and build first site under existing typed site contracts.

## Hard boundaries

- Isolated Stage3 FOX: https://mediumpurple-fox-175549.hostingersite.com/studio — already installed, with DB and owner login. NO reinstall, DB/Cron/secret changes or automatic staging push in this pass.
- Distinct Stage2 Woodpecker: `lightseagreen-woodpecker-264491.hostingersite.com` — never touch.
- Production, `main`, real user data, private Hostinger files untouched.
- Synthetic `stage3/fixtures/industrial-site.json` stays for offline contract tests. Do not delete persisted records based on its title.
- Avoid endless labs and redundant CI cycles. One meaningful user-visible functional block → full branch CI → real Chromium screenshot → docs handoff.
- `docs/NEXT-CHAT.md` top checkpoint supersedes historical install instructions further down. Read `docs/MASTER-TZ.md`, `docs/ROADMAP.md`, `stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md` before broader architecture changes.
