# AI Site CMS — передача основному чату v4.0 (28.10.2026)
> **CURRENT HANDOFF.** Replaces v3 as the operational handoff. All historic handoffs remain in Git. Verify latest branch HEAD and its **matching** GitHub Actions run at the start: documentation may itself advance HEAD after the last code-only green run.

## Роль и рабочая граница
Новый чат — **главный разработчик и единственный интегратор**. Репозиторий https://github.com/manufact-test/ai-site-cms (private). Писать **только** в `feature/stage3-ai-site-contract`; не делать merge в `main`, production/Hostinger/CELIKOM/deploy или работу с реальными БД/секретами без отдельного решения владельца. Параллельный SEO-разработчик единолично ведёт ветку `feature/site-seo-engine` и каталог `stage3/seo-engine/**`; не менять его код и не переносить ветку самовольно. Все изменения core, PHP, SDK, Studio и документации Lead выполняет только главный чат.

## Обязательная продуктовая цель
Источник истины: `docs/MASTER-TZ.md` (самый высокий приоритет), `requirements/requirements.csv` (193 исходных решения: 135 MUST, 42 desirable, 16 unnecessary), `docs/ROADMAP.md`, `docs/CODE-SCOPE-AUDIT-2026-10-27.md`, `stage3/docs/APPROVED-SITE-PACKAGE.md`. По дизайну нет фабрики и встроенного генератора ИИ. Внешний ИИ сначала готовит **настоящие изображения макетов desktop/tablet/mobile**, клиент реально утверждает, после этого AI программирует готовый сайт в собственном typed `site.json` + asset bytes + copy/spec + immutable sealed `manufact-approved-site-handoff-v2`. CMS подключает **индивидуальный** сайт, редактирует нужное и публикует с возможностью отката. Ни подмена скриншота HTML, ни импорт произвольных HTML/JS/PHP, ни generic site builder, ни SaaS/биллинг/CRM не входят в проект.

## Что уже работает и не надо делать заново
- Типизированный JS и PHP контракт, first-party Design Graph для отдельных секций, реальные медиа, страницы, формы с серверной валидацией, FAQ, SEO, глобальные/локальные стили и адаптивные правки в одной Studio. Обычные Node/HTML/Next/PHP технологии имеют разные явные режимы, PHP-хостинг не обязан иметь Node.
- Многостраничный sealed-v2 import с SHA-256, оригинальными макетами страниц, owner preflight/visual review и отменой без изменения сайта. Опубликование отдельное от Save. При обрыве загрузки есть защищённое продолжение по закрытым исходным anchor handoff/site.json с ручным подтверждением.
- **Владелец** может сравнить сохранённые исходные полноразмерные макеты с реальным PHP draft/public для каждой страницы, которая имеет собственные оригиналы, на трёх ширинах и поставить ручные отметки. Отчёт — свидетельство просмотра, не гарантия сходства.
- Неизменяемый owner-only approval evidence archive, backup-v2 до 64MB и изолированное восстановление без автопубликации; сегментированный offline архив существует отдельно. Ранее существующая DB может потребовать специально разрешённую CLI миграцию (НЕ запускать самостоятельно).
- Персональные семантические композиции: таблицы со строками/столбцами, галереи, списки, ссылки, цитаты, раскрытия, вкладки, CSS-prescribed стили, animations/hover/focus/active. Static responsive фон `backgroundMedia` привязан к утверждённым изображениям, имеет overlay/position/breakpoint variants. Все image URL и media IDs замкнуты на этом сайте.
- **Последний большой блок:** per-image art direction: `image.responsiveMedia={tabletAssetId?,mobileAssetId?}` для *разных оригиналов*, а не только размеры одного фото или фон секции. Оба рендерера используют native `picture/source/img`, мобильные и планшетные изображения редактируются в существующем full Design Graph editor и workbench, импорт рекурсивно переназначает server media IDs, браузерный Draft и PHP media maintenance включают replacement/pruning safety. Всё сквозное без JS на публичной странице и без сторонних runtime.
- При изменении `stage3/sdk/*.cjs` или `stage3/studio/app.js` ОБЯЗАТЕЛЬНО синхронизировать `stage3/studio/bundle.js` через `node stage3/studio/build.cjs` (или эквивалент строго идентичной inline-сборки); GitHub CI требует `--check`.

## Реальный незакрытый рубеж / без подмены
**НИ ОДНОГО настоящего клиента-approved full site bundle пока не получено и не принято визуально владельцем.** Green CI и синтетические двухстраничные тесты — проверки совместимости. Не писать готовность 135/135 и искусственный процент. Если есть настоящий клиентский пакет: **verify → audit → preflight → import → owner changes H1/photo/ALT/adaptive/FAQ/SEO → explicit Save → real full-height PHP desktop/tablet/mobile comparison of every available approved page → Publish → public verification → Rollback → full backup/isolated restore → owner GO**. Нельзя утверждать что внутренние страницы согласованы, если у них нет собственных макетов.

## Если клиентские оригиналы пока не получены
Брать **большую недостающую обязательную продуктовую вертикаль** из реестра (например безопасное фоновое видео #26 при согласовании real use case; полное editable поведение #73 popup или #82 multistep form по применимости), а не придумывать очередную синтетическую дизайн-фабрику/референсный сайт. Сначала просмотреть реальный текущий SDK, PHP, Studio, deployed capabilities, чтобы не реализовать дубль. Сразу проводить работу через manifest → SDK + PHP → owner UX → media/links/backup → один существующий E2E. Длинный цикл новых тест-лабораторий запрещён. В реальных материалах станет понятно, какой дизайн capability действительно нужен.

## Стиль работы владельца и отчёт
Работать **крупными связанными блоками**, приоритет — скорее получить работающий визуально законченный продукт и править по факту, **не** заниматься мелкими правками и десятками малых CI тестов вместо функционала. Достаточно целевого теста и существующего GitHub Actions. Корректировки и tests только по реальным дефектам. Отчёт кратко: реализовано / commit + matching CI / что не реализовано и реальные blockers. Никаких обещаний фоновой работы или действий без инструмента.

## Перед продолжением
Проверить GitHub branch HEAD и GitHub Actions на этот самый SHA, особенно `contract` и `technology-runtime`. Проверить `stage3/docs/APPROVED-SITE-PACKAGE.md`, `stage3/sdk/design-graph.cjs`, `stage3/server/DesignGraph.php`, `stage3/sdk/draft.cjs`, `stage3/server/MediaOperations.php`, `stage3/studio/app.js` и `stage3/studio/hosted.js`. Важно не ломать валидацию backgroundMedia, новые responsiveMedia, immutable evidence vault и вручную подтверждаемую публикацию. Точная проверенная контрольная точка должна совпадать с *последним commit и последним CI*; любые старые SHA в чатах — история.

## Обновление интегратора — несколько функциональных блоков за один заход (28.10.2026)

Ветка: `feature/stage3-ai-site-contract`. После блока нативных popup/sequence
последовательно реализованы: (1) scroll-driven entrance animation через
`motion.trigger=scroll` и CSS View Timeline без JS с безопасным статичным
fallback, (2) детальные тени `shadowFine` с x/y/blur/spread/color/inset и
проверкой JS/PHP, (3) плавные hover/focus/tap переходы, включая масштаб,
(4) быстрые настройки размеров, рамок, медиафильтров и кадрирования,
(5) фоновые art-directed изображения для desktop/tablet/mobile в Workbench,
(6) создание и редактирование popup из Workbench. Все свойства ограничены
валидируемыми контрактами, synchronized Studio bundle и JS/PHP render parity.
Число технических engineering candidates после обновления реестра: 119/135,
не означает личной приёмки: `ownerAccepted` остаётся false для всех.
GitHub Actions проверяют синтетическую совместимость, а **не реальный сайт**.
См. docs/ROADMAP.md и stage3/docs/APPROVED-SITE-PACKAGE.md.

### Временный рабочий режим, явно выбранный владельцем

- Ориентир одного захода: **около 30 минут активной реализации**, не
  «одна небольшая функция и немедленный финальный отчёт».
- Если блок закрывается быстро — **сразу продолжить** со следующим
  существенным функциональным блоком, пока позволяет контекст и доступ.
  Не превращать минуты в формальные критерии и не обещать фоновую работу.
- Приоритет: прогресс реального пользовательского сценария от данных и
  валидатора до Studio, PHP-рендера, сохранения и публикации; не число файлов,
  коммитов, тестов или зелёных отчётов.
- Документацию и минимальные нужные проверочные сценарии собирать в конце
  большого захода. Существующие GitHub Actions — основной регресс-gate;
  точечный фикс только если CI обнаружил реальную проблему.
- Отчёт: **какие новые возможности появились у владельца/посетителя**,
  последний HEAD и matching CI, что ещё не закрыто. Не полировать уже
  работающие элементы бесконечно, если есть крупные недостающие сценарии.
- SEO — отдельная ветка `feature/site-seo-engine`; `main`, production,
  Hostinger, CELIKOM и реальные клиентские БД без разрешения не затрагивать.

Следующие крупные приоритеты без реального approved-v2: **связанные
общие секции нескольких страниц (#144)**, проверка подключения (#191),
журнал ошибок (#173), уточнение production-independent update/recovery,
первый реальный согласованный сайт как немедленный основной приоритет
после предоставления исходных материалов.

## Следующий handoff — итог большого прохода 28.10.2026

Запрос владельца: выполнять около 30 минут активной разработки в одном
заходе, даже если первый блок закончен намного раньше; самостоятельно
переходить к следующим полезным блокам, не спрашивать разрешения. В начале
сверить текущий HEAD и CI, затем продолжить крупные сценарии.

В этом заходе:
1. Общие секции нескольких страниц с сохранением уникальных DOM/graph ID,
   редакторской синхронизацией полного содержимого, переносом popupTargets,
   отвязкой, Undo и fail-closed PHP/JS проверкой.
2. Проверка соединения между текущей CMS и PHP-публикацией: owner-only
   диагностика + публичный canary, авто-проверка после Publish **без popup**.
3. Каталог 31 безопасных встроенных иконок с размером и толщиной, инструменты
   позиционирования на 1/10 px в обоих инспекторах.
4. Операционный журнал с категориями и статистикой 24h/7d.
5. HTTP ETag revalidation публичных страниц и строгое переназначение media,
   токенов, popup ID при межсайтовом переносе, без переноса sharedKey.
6. Целевые Node / PHP / HTTP / Chromium проверки встроены в существующий CI.

См. docs/ROADMAP.md и stage3/docs/APPROVED-SITE-PACKAGE.md. Для Next/ZIP
проверка подключения остаётся partial; реальные performance-метрики и
production разрешение отсутствуют. Нет ни одного owner-accepted MUST.
Сверять **самый последний HEAD и matching CI**, не предыдущие SHA.
SEO отдельной команды и main не менять. Не занимать весь следующий заход
одними регрессионными тестами; продолжать реальные недостающие сценарии.

## Уточнённая окончательная передача в новый чат — 28.10.2026

**Текущая исходная проверенная кодовая точка:** `d8cfdb2f23ef94e111c63e2965f757c21bfca1b8`, GitHub Actions
[40758345036](https://github.com/manufact-test/ai-site-cms/actions/runs/40758345036):
оба задания `contract` и `technology-runtime` — **SUCCESS**.
Исключительно документационные коммиты передачи могут передвинуть HEAD;
новый чат сверяет реальный HEAD в начале. Нельзя выдавать документационный
HEAD за отдельно проверенный код.

**Актуальный файл первого сообщения (вместо старого сообщения с v3 / SHA):**
[`NEXT-MAIN-CHAT-START-2026-10-28.md`](NEXT-MAIN-CHAT-START-2026-10-28.md).
Он ссылается на **этот v4**, а не v3.

### Жёстко согласованный владельцем режим получасового захода

Ориентир каждого запроса «продолжаем» — **около 30 минут активной
разработки**. Закрыл пользовательский функциональный блок за 7–12 минут →
**без паузы бери следующий**, затем следующий, пока объём не соответствует
большому проходу; не заканчивай разговор после первой зелёной проверки.
Нет требования искусственно ждать до 30 минут; задача — большой объём
реального функционала, а не время и не число коммитов. Владелец **не
должен каждый раз просить продолжать**. Проверки, handoff и документацию
делать в конце серии, исключая адресные проверки безопасности по
необходимости. Никакой фоновой работы и обещаний будущего результата.

### Актуальная граница после последнего захода

Сделаны #144 shared section, локальный #191 connection doctor, каталог
иконок #44/#45, точная позиционная коррекция #18, сводка incidents
#173, условные ETag публичного PHP и безопасный межсайтовый copy,
включая media/remap popup и отсутствие sharedKey в чужом сайте.
`stage3/mandatory-coverage.json`: **124/135 implemented_candidate, 5 partial,
6 owner_environment_gate, 0 ownerAccepted**. Это **не owner GO**.

Следующие крупные потенциальные блоки: #80 per-form delivery recipients,
#178 фактическая интеграция индивидуальных Next/React сайтов, #193
ограничение веса поставки; #187/#191 внешняя проверка только на отдельно
разрешённом хосте; #174/#175/#181/#183/#184/#185 — owner
environment gates. Начинать с фактического анализа имеющейся реализации,
не добавлять дубли. Основная продуктовая цель — первый
реально approved-v2 клиентский сайт — немедленно имеет приоритет
при появлении согласованного пакета.

## Lead integrator checkpoint — next autonomous development round (28.10.2026)

This lead branch has since gained **four linked feature verticals**:
- Owner-only per-form Email/Telegram recipient routing with inherited/off/custom modes, optimistic-lock changes, immutable outbox targets, existing inbox and notification retry; dedicated offline CLI schema upgrade required for pre-existing databases.
- HTTP gzip and encoding-specific ETag / 304 revalidation for hosted Studio JS/CSS.
- Read-only independent PHP and Next Static/SSR public release identity at /_cms-connect.json for manual version matching (NOT automatic external connectivity verification).
- stage3/bin/cms-release.cjs local-only CMS runtime package pack/verify/compare with bounded files and tamper-resistant inventory; NOT auto-updating production, migrating DB or rolling back live installations.

Updated details and exact safety boundaries are in docs/ROADMAP.md, stage3/docs/APPROVED-SITE-PACKAGE.md, and stage3/mandatory-coverage.json. The technical requirement registry still reports 124 implemented candidates, five partial, six environment gates and **zero personally owner-accepted** items. Do not advance this count without full workflow evidence. No actual client approved-v2 remains the primary blocker; all CI exercises are disposable synthetic verification.

Before next work, check **actual HEAD + matching Actions jobs**. Apply the owner’s rule: one round means approximately thirty minutes of active functionality, immediately follow a fast block with the next, and leave docs/regression for the end. Do not touch main, production, real databases, Hostinger, CELIKOM, or stage3/seo-engine/**. Only lead may integrate SDK, PHP, core and Studio; no PR/merge/deploy without explicit owner permission.

### Additional lightweight host profile

The offline CMS package CLI now supports a second, deliberately separate
profile: node stage3/bin/cms-release.cjs pack-php-host /ABS/REPO /ABS/NEW-PHP-HOST.

Unlike a full developer/transfer bundle, the compact PHP profile contains
PHP CMS server and migration entrypoints, component manifests, the *compiled*
Studio editor and its exact needed media scripts. It excludes SDK sources,
Next/ZIP export build tools, uncompiled Studio sources, demos and tests.
It runs with a PHP host and does not require Node at visitor/admin runtime.
Use the full source tree on a separate build machine for Node-based D2/D5
Next/ZIP delivery workflows; this limited profile does NOT ship those CLI
export tools. Both profiles carry the same fail-closed integrity inventory.
Verifying either profile works with the full source CLI; comparing packages
of different profiles is explicitly prohibited (not an upgrade path).

The host profile does NOT install to a real server, create/upgrade the live
DB or authorize remote operations; its actual suitability must be verified
on a dedicated owner-approved target before any changeover. The normal
runtime package is unchanged unless the operator explicitly uses
pack-php-host.

## Continuation checkpoint — 29 October 2026 · independent PHP and Next visitor parity

The lead branch now includes three more visitor-facing capabilities beyond the previous checkpoint: (1) Next Static and SSR restore functional native multi-step form wizard behavior using next/script afterInteractive, admitting only the PHP publisher's known first-party script and rejecting other body scripts; authored OG locale/image alt/Twitter card metadata is carried across; (2) standalone PHP published MP4 media supports byte-range seeking, HTTP 206/416, HEAD, If-Range, immutable ETags, bounded streaming; and (3) standalone PHP published HTML, sitemap.xml and robots.txt respond conditionally with ETag/304. The original form collector, CMS database, and published source revisions remain independent. No generic arbitrary JS integration, CMS site generation, new framework or dependencies have been introduced.

The existing server HTTP E2E now covers an actual sealed-by-publisher multi-step form export to both Next adapters, real PHP MP4 requests and conditional HTML/sitemap requests. The registry remains 124 implemented candidates, 5 partial, 6 owner-environment gates, ownerAccepted=0; the first approved-v2 customer site and actual external hosting/performance tests are not available. See docs/ROADMAP.md and stage3/docs/APPROVED-SITE-PACKAGE.md. For future work: check current branch HEAD and matching Actions first; do not assume this appended note's older SHA is HEAD. User's ~30-minute active-development-per-round rule continues, and the SEO parallel branch remains out of bounds. Do not touch main, production, Hostinger, real databases, PR or merge without separate owner approval.

## Lead handoff extension — 29.10.2026: practical approved visual review

Main branch feature/stage3-ai-site-contract gained a complete operator review UX in hosted Studio, not in the public site. Actual verified archived device screenshots may be overlaid over the script-disabled PHP preview with opacity slider and native-width mismatch warning. Adjacent publication/reference panels optionally scroll together. Operator records page/device/Y-specific visual discrepancies, resolves them manually, exports/imports a same-site JSON review (old revision notes reopen and never restore sign-off), and copies unresolved findings as a short fix brief for the external site designer. Same-tab/revision notes live in memory until logout; **download JSON** for persistence beyond the tab. With a complete approved-v2 archive, source bytes must be viewed and SHA-256 verified before marking a supported device reviewed. Open findings block marking/publish-from-review. None of this auto-certifies pixel parity, signs off on behalf of the owner or changes published site output.

New work is confined to hosted.js/hosted.css and existing approved-site-browser.cjs plus docs. Before next autonomous feature round, verify actual branch HEAD and matching Actions because intermediate CI jobs were cancelled by subsequent pushes. Registry counts and owner accepted MUST remain unchanged. Keep ~30 minutes of active product implementation per owner request. No changes to main, SEO branch, real infrastructure/DB, Hostinger, production, PR or merge.

## 29 October 2026 — persistent review ledger (lead extension)

New `stage3/server/VisualReview.php`, `stage3/server/bin/upgrade-visual-review.php`, updated PHP SiteRepository/Api/SiteArchives and hosted Studio make manual visual discrepancy notes durable per saved draft revision. One owner-only endpoint `GET /api/sites/{id}/visual-review?revision=N` and `POST /api/sites/{id}/visual-review` with actions create/resolve/import. Remote review imports are atomic and deduplicated; updates require explicit optimistic versions, and no user-controlled publication action or arbitrary executable data is accepted. User sees global review finding navigation, source device and coordinate. Direct Publish blocks open notes; Save carries open notes for still-present pages, with no carried-over sign-offs.

Existing DBs DO NOT auto-migrate; only owner-approved dedicated DB after backup and the explicit flag `STAGE3_ALLOW_VISUAL_REVIEW_UPGRADE=YES` running `php stage3/server/bin/upgrade-visual-review.php`. Without the table Studio transparently retains the prior tab/JSON-only mode. Full backup-v2 now includes optional `visualFindings`; old v2 remains restorable. Notes from original revision plus operators/status are restored only into an isolated new site; never auto-published. No proof of owner/client acceptance. Main and parallel SEO branch are not touched.

Next milestone stays the authentic approved-v2 client handoff and owner evaluation. Do not spend another round duplicating generic tests, building an AI website generator or exposing protected approval originals on public pages. Check HEAD/matching CI at beginning of next round. Retain the user's large ~30-minute product-feature block rule.

Final extension of the same visual-review block: historical owner read-only endpoints and an in-Studio revision history list now show prior visual notes, authors and closure dates. Current-revision POST create/resolve/import remains the only mutation path. The direct publish gate, carry-forward, optional CLI upgrade, backup-v2 compatibility and no automated client approval behavior remain unchanged. Source of truth: `VisualReview.php`, `SiteArchives.php`, `Api.php`, hosted Studio and their existing E2Es. Verify final matching Actions, not an intermediate cancelled run.
