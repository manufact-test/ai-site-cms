> **АКТУАЛЬНО · 24.10.2026 · v1.59 · ДВА ЧАТА / УСКОРЕННАЯ ПРОГРАММА.** Единственный главный интегратор пишет в `feature/stage3-ai-site-contract`; второй работает отдельно в `feature/stage3-release-audit-lab` и ТОЛЬКО `stage3/release-audit/`. Основной code checkpoint `58b7ebb2e309d1845c8139fbcf58689f5a8ad2a2`, [aggregate CI](https://github.com/manufact-test/ai-site-cms/actions/runs/40037244195) (SUCCESS, проверено). Роли, точные пути и разрешения: [главная передача](../handoffs/lead-integrator/MAIN-HANDOFF-v1.59-2026-10-24.md) и [задание второму чату](../handoffs/parallel/RELEASE-AUDIT-ASSIGNMENT-v1.59-2026-10-24.md). Одно «продолжаем» главного = большой полный функциональный блок; второй не пишет в файлы главного. Stage2 NO-GO #5–#9; Stage3 изолированно, не принят; 0/135. Без Hostinger/production/merge main. Более старые записи ниже исторические.

# AI Site CMS — isolated implementation v1.58

Branch **`feature/stage3-ai-site-contract`**. Tested source **`964e6746db7680c064cce502ae034c00683115b5`**, [aggregate CI SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40019059962). [Canonical handoff](../handoffs/lead-integrator/MAIN-HANDOFF-v1.58-2026-10-23.md), [next-chat §63](../docs/NEXT-CHAT.md). No main merge, Hostinger or real database access authorized. Stage2 formal NO-GO; Stage3 isolated development allowed but not accepted; **0/135 formal product acceptance**.

## Implemented workflows

- Versioned typed site/component contract, registered first-party components, immutable draft, stable IDs, responsive inheritance, owner override preservation, Undo/Redo.
- Offline click-to-open Studio and hosted PHP Studio: page/section/field edits, clones, same-site section-template library, explicit CAS save, revision restore and separate Publish.
- Media PNG/JPEG/WebP up to 450 KB; real visitor forms and flexible 3-slot form fields, consent/spam/rate-limit/release-HMAC checks, private inbox/unread notices and separate form collector. No external email/Telegram delivery.
- Standalone multipage HTML/image export; forms require an explicitly configured separate collector. Static export is not the CMS runtime or full installation backup.
- `sdk/recipes.cjs` + Studio composer: deterministic company/services/portfolio/landing recipes, owner facts only, structure review/edit, full-page preview, same-site templates, recipe import/export, server draft creation or replace-with-Undo. No external AI provider or key.
- `server/SiteArchives.php`: private `manufact-site-backup-v1` JSON up to 64 MB, entire draft/revision/publication history, media bytes/checksums, templates and inbox/notification state. Full preflight and 15-minute session-bound plan token; atomic restore only to an unused site ID; new lead IDs; never auto-publish. Publication history can be restored into a new draft. Accounts/grants/audit/configuration/secrets and visitor hashes excluded. Not a full installation disaster-recovery solution.
- `server/AccessControl.php`, `studio/access.js`: owner manages accounts, assigned sites, role/status/reason, CAS account versions. Viewer: content only; editor: drafts/media/templates/inbox; publisher: same plus Publish; owner: all plus sites/archives/users/audit. Server deny-by-default enforcement on direct URLs; site picker scoped. Password change and access changes invalidate existing sessions on their next request. Initial owner protected from disable/demotion. Local audit of writes/login/archive downloads/denied operations, latest 200 with site filter; never passwords/tokens/lead bodies. Not an externally tamper-proof log.

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
