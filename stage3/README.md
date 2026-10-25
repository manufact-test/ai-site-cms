> **АКТУАЛЬНО · 25.10.2026 · v1.68 · PRIVATE INBOX + HANDOFF.** Последний проверенный функциональный SHA [`70a6a4776b03`](https://github.com/manufact-test/ai-site-cms/commit/70a6a4776b0389fd5a35830226952a0372cccd65), [полный CI #40234189046 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40234189046). Реализованы поиск/фильтрация/страницы/счётчики заявок, массовая атомарная обработка 1–50, приватный CSV до 1000 и устранено залипание кнопки уведомлений. Параллельный v1.67 SEO/a11y граф→исправление и live SEO/social previews сохранены ([CI #40233695097 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40233695097)). Старые предупреждения v1.67 о FAIL `8db3d32` ниже исторические: более новый функциональный `70a6a4776b03` успешно прошёл весь CI. Документационный HEAD после этого SHA проверять отдельно. **Ускоренная программа:** одно «продолжаем» = один большой сквозной функциональный блок; полный CI + минимальные критические проверки. Stage2 NO-GO #5–#9, Stage3 не принят, 0/135. Не трогать `main`, Hostinger, production, реальную БД и независимую Factory. [Handoff v1.68](../handoffs/lead-integrator/MAIN-HANDOFF-v1.68-2026-10-25.md).

### Private inbox v1.68 API

`GET /api/sites/{id}/submissions?status=all|new|reviewed&q=<query>&page=1` → `{submissions,page,pages,limit,total,counts}` (25/page); `GET /api/sites/{id}/submissions/export` → CSV (no-store, max 1000 matches, 422 otherwise); `POST /api/sites/{id}/submissions/bulk-review` body `{"ids":["lead-..."]}` → `{"reviewed":N}`, 1–50 unique new IDs, all-or-nothing, CSRF. All private and scoped to owner/editor/publisher site access; CSV can contain personal data. UI in `studio/hosted.js`, styles `studio.css`. Independent unread acknowledgement repaired. No new schema. Source `70a6a4776b03`, [CI PASS](https://github.com/manufact-test/ai-site-cms/actions/runs/40234189046).

> **АКТУАЛЬНО · 25.10.2026 · v1.67 · QUALITY → GRAPH REMEDIATION + HANDOFF.** Проверенный функциональный SHA [`0eeff2e9cd77`](https://github.com/manufact-test/ai-site-cms/commit/0eeff2e9cd77b29e3426c52393b03e583a5e672a) — [полный Stage3 CI #40233695097 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40233695097): SEO/a11y-аудит теперь открывает точный узел композиции, показывает текущий статус замечания и повторно запускает проверку после применения в черновик; предыдущий [SEO/social preview #40225894128 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40225894128). **Осторожно:** в той же ветке позже появился самостоятельный функциональный коммит [`8db3d32e1ed7`](https://github.com/manufact-test/ai-site-cms/commit/8db3d32e1ed7f087445c507c76c13e8165ebe8c3) по private lead inbox; его [CI #40233889710 FAILED](https://github.com/manufact-test/ai-site-cms/actions/runs/40233889710) на hosted notification test (disabled #server-notifications-seen). Этот более новый SHA **НЕ считать проверенным**; прежде чем продолжать, проверь актуальный HEAD и CI, исправь только блокирующий сквозной регресс без циклов ненужных тестов. Stage2 NO-GO #5–#9, Stage3 не принят, 0/135; основная ветка и реальные хостинги не затронуты. [Главная передача v1.67](../handoffs/lead-integrator/MAIN-HANDOFF-v1.67-2026-10-25.md).

> **АКТУАЛЬНО · 25.10.2026 · v1.66 · HANDOFF REFRESH.** Ветка `feature/stage3-ai-site-contract`; последний проверенный функциональный SHA `97811cecc2946ed1daf52d0e4ed9fcf3b360c221`, [полный CI SUCCESS #40205358049](https://github.com/manufact-test/ai-site-cms/actions/runs/40205358049). Предыдущий docs-only HEAD `90333fc0aca9c3cfa66daa18067812cf141d2ba8` прошёл [CI #40212155888 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40212155888); текущий v1.66 handoff-коммит — документационное обновление, проверь его CI отдельно. Функционально последняя задача — guarded CLI worker для восстановления pending Email/Telegram outbox; зависшие отправки становятся `uncertain`, автоматического повтора нет. Реальные сообщения не отправлялись, production cron не настроен. Ускоренная программа: одно «продолжаем» = один большой сквозной блок; существующий full CI + только необходимые проверки. Stage2 NO-GO (#5–#9), Stage3 не принят, 0/135. Не трогать `main`, Hostinger, production, реальные БД и независимую Design Factory без явного разрешения. [Главный handoff v1.66](../handoffs/lead-integrator/MAIN-HANDOFF-v1.66-2026-10-25.md).

> **АКТУАЛЬНО · 25.10.2026 · v1.65 · RECOVERABLE LEAD DELIVERY QUEUE.** Рабочая ветка `feature/stage3-ai-site-contract`; проверенный функциональный SHA `97811cecc2946ed1daf52d0e4ed9fcf3b360c221`, [полный CI SUCCESS #40205358049](https://github.com/manufact-test/ai-site-cms/actions/runs/40205358049). Добавлен guarded CLI worker для durable Email/Telegram outbox: пакет 1–250, восстановление pending jobs, зависшие `sending` старше 15 минут переводятся в `uncertain` без автоматического повтора; uncertain можно повторить только по явному решению владельца. CI проверяет worker gate и восстановление. Реальные сообщения не отправлялись, production cron не настроен. Ранее: v1.64 глобальные типографика/кнопки; v1.63 provisional Design Graph handoff — **не реальная D7-совместимость**. Ускоренная программа: один «продолжаем» = один большой сквозной блок, минимум необходимых проверок. Stage2 NO-GO (#5–#9), Stage3 не принят, 0/135. Не трогать `main`, Hostinger, production, реальные БД и независимую Design Factory ветку без явного разрешения. Канонический [handoff v1.65](../handoffs/lead-integrator/MAIN-HANDOFF-v1.65-2026-10-25.md).

> **АКТУАЛЬНО · 25.10.2026 · v1.63 · PROVISIONAL DESIGN GRAPH IMPORT/HANDOFF.** Рабочая ветка `feature/stage3-ai-site-contract`; функциональный SHA `86f9f8b6db1e69add234b3adc0478025626aa711`, [полный CI SUCCESS #40188715664](https://github.com/manufact-test/ai-site-cms/actions/runs/40188715664). Добавлен версионированный кандидат/hand-off envelope, раздельный baseline Factory candidate и CMS edits, audit diff/field bindings, безопасный экспорт и round-trip. **Это не доказательство реальной D7-совместимости**: финальный Factory-пакет не проверен, нужен реальный owner handoff и матрица потерь. Ускоренная программа: один «продолжаем» = большой сквозной блок, минимум критических проверок. Stage2 NO-GO (#5–9), Stage3 не принят, 0/135. Не трогать `main`, Hostinger, production, реальные БД и независимую Design Factory ветку/файлы без явного разрешения. Канонический [handoff v1.63](../handoffs/lead-integrator/MAIN-HANDOFF-v1.63-2026-10-25.md).

# AI Site CMS — isolated implementation v1.58

Branch **`feature/stage3-ai-site-contract`**. Tested source **`964e6746db7680c064cce502ae034c00683115b5`**, [aggregate CI SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40019059962). [Canonical handoff](../handoffs/lead-integrator/MAIN-HANDOFF-v1.58-2026-10-23.md), [next-chat §63](../docs/NEXT-CHAT.md). No main merge, Hostinger or real database access authorized. Stage2 formal NO-GO; Stage3 isolated development allowed but not accepted; **0/135 formal product acceptance**.

## Implemented workflows

- Versioned typed site/component contract, registered first-party components, immutable draft, stable IDs, responsive inheritance, owner override preservation, Undo/Redo.
- Offline click-to-open Studio and hosted PHP Studio: page/section/field edits, clones, same-site section-template library, explicit CAS save, revision restore and separate Publish.
- Media PNG/JPEG/WebP up to 450 KB; real visitor forms and flexible 3-slot form fields, consent/spam/rate-limit/release-HMAC checks, private inbox/unread notices and separate form collector. Optional per-site Email/Telegram delivery uses a durable outbox, owner-configured recipients, process-environment secrets, bounded retries and explicit confirmation for uncertain sends.
- Standalone multipage HTML/image export; forms require an explicitly configured separate collector. Static export is not the CMS runtime or full installation backup.
- `sdk/recipes.cjs` + Studio composer: deterministic company/services/portfolio/landing recipes, owner facts only, structure review/edit, full-page preview, same-site templates, recipe import/export, server draft creation or replace-with-Undo. No external AI provider or key.
- `server/SiteArchives.php`: private `manufact-site-backup-v1` JSON up to 64 MB, entire draft/revision/publication history, media bytes/checksums, templates and inbox/notification state. Full preflight and 15-minute session-bound plan token; atomic restore only to an unused site ID; new lead IDs; never auto-publish. Publication history can be restored into a new draft. Accounts/grants/audit/configuration/secrets and visitor hashes excluded. Not a full installation disaster-recovery solution.
- `server/AccessControl.php`, `studio/access.js`: owner manages accounts, assigned sites, role/status/reason, CAS account versions. Viewer: content only; editor: drafts/media/templates/inbox; publisher: same plus Publish; owner: all plus sites/archives/users/audit. Server deny-by-default enforcement on direct URLs; site picker scoped. Password change and access changes invalidate existing sessions on their next request. Initial owner protected from disable/demotion. Local audit of writes/login/archive downloads/denied operations, latest 200 with site filter; never passwords/tokens/lead bodies. Not an externally tamper-proof log.

### Optional Email/Telegram lead delivery

Per-site delivery settings and the outbox are stored in the dedicated Stage 3 database; mail sender configuration and the Telegram bot token remain in the process environment. The public form collector attempts immediate delivery after the lead and outbox entries have committed. If a process stops before dispatch, a bounded CLI worker can recover pending jobs:

```sh
STAGE3_ALLOW_DELIVERY_WORKER=YES php stage3/server/bin/process-delivery-queue.php 50
```

Run it only with the same private `STAGE3_DSN` / database credentials as the isolated collector and with the intended provider environment configured. The worker accepts a batch size from 1 to 250, processes pending rows only, and marks `sending` rows older than 15 minutes as `uncertain`. It does not automatically resend uncertain jobs because the provider may already have accepted the first request. Failed or configuration-required jobs can be retried by an authorized owner; uncertain jobs require an explicit owner choice. CI uses empty provider configuration and never sends real messages. This command does not authorize production setup or deployment.

## Storage and upgrades

PDO SQLite is tested only in disposable CI. PDO MySQL schema exists in code but real MySQL/Hostinger compatibility for Stage3 is **not verified**. `server/bin/setup.php` creates a new dedicated empty database and initial owner; refuses existing schemas. Credentials/DSN are private environment settings, never a web setup form.

For an old dedicated Stage3 lab database, explicitly run only in authorized isolation:

```sh
STAGE3_ALLOW_ACCESS_UPGRADE=YES php stage3/server/bin/upgrade-access.php
```

Requires preconfigured private `STAGE3_DSN`. Adds access/grants/audit tables; repeatable after interrupted additive DDL. Migrates a sole legacy owner, refuses ambiguous promotion. Never performs DDL in web requests. Existing sessions require fresh login. Does not authorize production upgrades or deployment.

## Relevant endpoints

| Path | Purpose | Permission |
|---|---|---|
| `GET /api/session`, `POST /api/login` | Fresh principal/session/CSRF | Login |
| `GET /api/sites` | Site picker | Filtered to assigned sites |
| `/api/sites/{id}/save`, `/restore`, `/restore-release`, `/media`, `/templates` | Explicit draft/content operations | editor/publisher/owner with scope |
| `POST /api/sites/{id}/publish` | Explicit activation | publisher/owner with scope |
| `GET /api/sites/{id}/backup` | Private content archive | owner |
| `POST /api/backups/plan`, `/api/backups/restore` | Validate, then recover separate site | owner + CSRF + exact plan token |
| `GET/POST /api/users`, `POST /api/users/{username}` | Accounts, role/grants/disable/CAS/reason | owner |
| `POST /api/password` | Change own password, revoke sessions | Current password + CSRF |
| `GET /api/audit?siteId=...` | Last 200 metadata events | owner |

Public pages/assets/forms operate independently of CMS account availability. Account disabling never unpublishes a website. Content archives do not grant access to the recovered site to previous staff automatically.

## Validation and next work

Existing `.github/workflows/stage3-ai-contract.yml` verifies SDK/recipes/bundle, offline Chromium, PHP8.3 syntax and HTTP/SQLite, hosted Chromium. Account path: owner creates staff → edit without publish → downgrade invalidates session → viewer cannot edit/read contacts → audit. Also validates archived recovery and previous workflows. One integrated browser path plus existing CI, not repeated huge matrices. Offline ZIP has no server account/archive UI; those are hosted-only.

Next: manual licensing/reminders/pause/resume ADR0012 using owner roles and audit; then remaining rich components/forms/media, global styles, SEO/navigation/repeaters, production adapters/migrations and cohesive UX. No requirement acceptance inferred from CI.

**Accelerated workflow:** one continue = a large complete useful feature group, minimum necessary checks, no repeated polishing/testing of unfinished demos. Documentation only on explicit owner handoff request.


### Visual Design Graph editor

The isolated Design Graph editor supports canvas selection, desktop/tablet/mobile previews, drag-to-reorder/reparent, Alt-drag free positioning, 8 px snapped resize handles, breakpoint-specific size overrides, and graph-local undo/redo. See [AI-DESIGN-COMPOSITION.md](docs/AI-DESIGN-COMPOSITION.md) for the safety boundaries and E2E coverage. This does not imply Stage 2 acceptance or Design Factory D7 lossless compatibility.


### Provisional Design Graph import/handoff (v1.63)

The Studio import path accepts a versioned candidate envelope and a versioned handoff package, preserves the candidate baseline separately from CMS edits, and shows a graph/content-binding audit. See [MAIN-HANDOFF v1.63](../handoffs/lead-integrator/MAIN-HANDOFF-v1.63-2026-10-25.md) and [Design Graph compatibility note](docs/AI-DESIGN-COMPOSITION.md). This is not yet a real D7 adapter or a lossless Factory round trip; the synthetic smoke fixture starts from a valid CMS site-v1 graph. Do not claim D7 compatibility until the owner supplies the final artifact and the actual schema/loss matrix is reviewed.
