# AI Site CMS — MAIN HANDOFF v1.62 / 2026-10-24

## 0. Read first — source of truth and verification

- Repository: https://github.com/manufact-test/ai-site-cms
- **Lead/integrator writable branch:** `feature/stage3-ai-site-contract`. **Do not touch `main`.**
- **Last verified functional commit (not docs HEAD):** `38a7994d4aba09a89e2eedd82be987cba71671e9`.
- **Full CI: SUCCESS** — [Actions #40104129649](https://github.com/manufact-test/ai-site-cms/actions/runs/40104129649) for this exact functional SHA. Later cosmetic/doc-only commits can have a different HEAD and must be verified independently.
- Second independent developer works **only** in `feature/stage3-design-factory`, limited to `stage3/design-factory/**`; worker completes D1–D7. No stealing tasks, no rewriting worker files, no blind merges or unreviewed integration.
- Stage2 **NO-GO**, gates #5–9; Stage3+ isolated, **formally not accepted**, 0/135 mandatory criteria accepted. No permission for Hostinger, real DB, production, CELIKOM, PR #3/#4, or deployment.
- Core principle: AI creates complete professional designs; CMS must preserve and edit the AI-authored structure without AI re-generation. Components are helpers, not a ceiling on design variety.

## 1. Completed since v1.61 — integration of professional design primitives

- True protected responsive raster derivatives (physical 360/720/1200), SHA256 and immutable relationships, Studio previews per breakpoint, published PHP `srcset/sizes`, static HTML files, history and content archive recovery.
- Type-checked CMS-owned design tokens and universal `designGraph` with nested containers, Grid/Flex columns/span, spacing, responsive overrides, font family/letter spacing, shadows, gradients, safe SVG icons (nine reviewed IDs) and bounded motion presets; user-editable inspector, preview, Undo/Redo.
- PHP and JS contracts and static publisher respect design nodes; no raw arbitrary HTML/CSS/JS; motion CSS respects `prefers-reduced-motion`.
- Native accessible local HTML5 `video/mp4` graph node; optional poster, labeled controls, playsinline, opt-in loop, no auto-play, no trackers. Safe media asset references, authenticated private editor preview, visitor-only published URLs, HTTP Range 206/416 and ETag; binary export and archives preserve exact bytes.
- Site-owned MP4 multipart uploads: **16 MiB maximum**, **512 KiB per part**, up to **3 concurrent sessions per site**, actor/site isolation, 24-hour staging TTL; per-part SHA256 and full-file SHA256, structural MP4 validation, exact byte-count and chunk-count checks, idempotent re-sending of matching parts, atomic commit to immutable `stage3_media` and new draft revision **only after all checks pass**. Browser Studio transparently uploads small MP4 via compatible existing route and larger ones chunked with progress; drafts never auto-publish.
- Explicit schema guard/migration `stage3/server/bin/upgrade-video.php` with `STAGE3_ALLOW_VIDEO_UPGRADE=YES`; no DB DDL from HTTP handlers. Existing access/licence CLI migrations support known optional staging tables; no migration executed on external host.

## 2. Code map

- `stage3/server/VideoUploads.php` — staging/sha/session/transaction/cleanup.
- `stage3/server/VideoGuard.php` — bounded ISO BMFF MP4 top-level structure checks. **Not a codec/transcoding or full malware scanner.**
- `stage3/server/SiteRepository.php` — media persistence, protected references and publications.
- `stage3/server/Api.php` — same-origin, roles, CSRF, paused licenses; routes:
  - `POST /api/sites/{id}/video-uploads/start` with `alt,bytes,sha256,chunks,expectedRevision`.
  - `POST /api/sites/{id}/video-uploads/{video-...}/chunk` with `index,base64,sha256`.
  - `POST /api/sites/{id}/video-uploads/{video-...}/finish` with `{}`.
  - `POST /api/sites/{id}/video-uploads/{video-...}/cancel` with `{}`.
  - Legacy `POST /api/sites/{id}/video` for small files.
- `stage3/studio/hosted.js` — small/large MP4 upload UI, progress and auth-only previews.
- `stage3/sdk/design-graph.cjs`, `stage3/server/DesignGraph.php`, `stage3/schemas/site-v1.schema.json`, `stage3/studio/app.js` — cross-layer design editing, including video + poster.
- `stage3/server/SiteArchives.php`, `stage3/server/bin/export-published.php` — releases and archive/export.
- `stage3/tests/server-e2e.cjs` — dedicated fresh SQLite, old DB manual migration, tampering/duplicate/incomplete part, 2MiB+ MP4 upload, 206/416, immutable publish, archive/static export; plus existing Chromium suite.
- `stage3/studio/build.cjs` — regenerate compiled bundle after any Studio SDK/app edit, and verify parity. **Do not hand-edit bundle as a substitute for source changes.**

## 3. Known limitations, never overstate

- Video limit is **16 MiB**, not a full-scale streaming/transcoding infrastructure; chunks are staged in SQL, final and published bytes loaded from storage. No cloud object-storage/CDN path, auto-compression, thumbnails, codecs normalization, transcoding, huge video support, resumable UI after page reload, or background cleanup cron. Current per-site count 3 uploads and stale uploads are removed at next start after 24h; not on a timer.
- Private Studio preview loads the full local MP4 into a sandbox-safe data URL (up to 16 MiB). Check real UX performance before promising that large videos are lightweight. Web publishing is on-domain, HTTP Range works; static export assumes correct static server MIME/range behavior.
- `manufact-site-backup-v1` has **64 MB archive limit**, which still constrains sites with multiple videos; don't advertise unbounded media backup.
- Current `designGraph` remains an **additive typed subset**, not guaranteed 1:1 lossless coverage of independent Design Factory D7. No true pixel-perfect Factory↔CMS round trip verified; needs a scoped compatibility matrix, visual samples, versioned adapter and explicit owner decision.
- Legacy section presets still have boundaries; arbitrary canvas positioning, transform stacks, rich custom font loading, focal-point media, arbitrary nested interaction/motion timeline and universal responsive breakpoints are incomplete.
- Stage2 human/host gates #5–9 and 135 mandatory acceptance items remain untouched. CI SUCCESS only means isolated functional verification.

## 4. Engineering score and recommended next BIG lead block

**Stage:** Stage 3 (isolated). **Direction engineering estimate: ~68%** for universal Design Graph + Media & Motion, not official CMS completion. Previous check was approximately 60%. Not conflated with 0/135 official acceptance.

If Design Factory D7 handoff has arrived from owner: **first** read D7 docs and compare graph primitives/CSS/node types, responsive breakpoints, states, global tokens, hierarchy, media and route contracts; write a **loss matrix** with concrete examples. Never merge worker branch or rewrite CMS blindly. Implement a versioned additive bridge only after validating compatibility and permitted integration scope.

If D7 not yet handed over: take a **large integrated CMS block** to close universal composition gaps — editing nested containers/grid layout, breakpoint-specific alignment/position/width, responsive design tokens, richer accessible control states, real safe preview↔published fidelity, and stable property roundtrip. Use prior existing tests plus one meaningful Chromium/PHP path, not dozens of micro-tests. Video follow-on: real poster extraction (safe reviewed processor), media-size/archival limits and object storage design after implementation priorities.

## 5. Required handoff working discipline

1. One user's "продолжаем" means one **big end-to-end product feature group**; ship capabilities, avoid cosmetic churn and repeated lab validation.
2. Only modify `feature/stage3-ai-site-contract`. No `main`, Hostinger/production, existing real DB, external projects, PR3/4 or `stage3/design-factory/**`.
3. One clean meaningful CI for actual SHA; report precise sha/run, stage, engineering **direction** %, remaining work.
4. Update canonical `PROJECT-STATUS.json`, `docs/NEXT-CHAT.md`, `docs/ROADMAP.md` on next owner-requested transition, not after every "продолжаем".
5. Keep explicit AI-first editorial architecture: designer AI authors the full cohesive design; Studio edits it without asking AI again.

## 6. Ready-to-paste first message for next lead chat

Привет! 😎 Ты теперь главный разработчик и интегратор AI Site CMS.
Репозиторий https://github.com/manufact-test/ai-site-cms. Работаем ТОЛЬКО в feature/stage3-ai-site-contract.
Обязательно прочитай handoffs/lead-integrator/MAIN-HANDOFF-v1.62-2026-10-24.md, PROJECT-STATUS.json, docs/NEXT-CHAT.md, docs/ROADMAP.md и stage3/docs/AI-DESIGN-COMPOSITION.md.
Последний проверенный большой функциональный SHA: 38a7994d4aba09a89e2eedd82be987cba71671e9; Actions #40104129649 SUCCESS. Новый HEAD документов проверь отдельно (CI и SHA могут отличаться).
Мы работаем ускоренно: одно моё «продолжаем» = один БОЛЬШОЙ сквозной продуктовый блок, не размениваемся на десятки малых проверок/косметику. Уже сделаны реальные image 360/720/1200 srcset/sizes, Media & Motion, сложный типизированный Design Graph (responsive Grid/Flex, токены, градиенты, SVG, motion), и безопасный HTML5 MP4 со своим хранилищем и загрузкой до 16 МБ частями по 512 КБ с полным SHA256 и статическим экспортом. В Studio всё редактируется без повторного ИИ.
Главная идея: ИИ создаёт настоящий профессиональный дизайн по дизайн-системе, а CMS БЕЗ ПОТЕРЬ позволяет вручную редактировать каждое свойство. Design Factory работает отдельной веткой feature/stage3-design-factory, ТОЛЬКО stage3/design-factory/** — не трогать, не сливать до передачи мне D7-результата. После моей передачи документов D7 СНАЧАЛА проведи аудит совместимости и матрицу потерь, потом спроектируй безопасный мост. До D7 самостоятельно улучшай CMS-композиции, реальное редактирование сеток, контейнеров, токенов, адаптивности и медиа.
Stage2 NO-GO (#5–9); Stage3 не принят, 0/135 критериев. Не трогать main, PR #3/#4, Hostinger, production, реальные БД, CELIKOM и независимую ветку. Миграция stage3/server/bin/upgrade-video.php только после отдельного разрешения, никогда автоматически на веб-запросе.
Каждый заход: крупный завершённый блок, нужный CI, точный SHA, текущий этап, инженерный процент и что осталось. Документы обновляй по моей просьбе при переходе чата. Продолжаем! 🚀
