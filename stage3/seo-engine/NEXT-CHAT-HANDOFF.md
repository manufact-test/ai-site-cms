# AI Site CMS — SEO worker: передача новому чату

**Дата:** 28 октября 2026. **Репозиторий:** https://github.com/manufact-test/ai-site-cms
**Рабочая ветка:** `feature/site-seo-engine`. **Никаких самостоятельных PR/merge/deploy.**
**Разрешено изменять только:** `stage3/seo-engine/**`. Не менять `main`, `stage3/sdk/**`, `stage3/server/**`, `stage3/studio/**`, `docs/**`, `handoffs/**`, `.github/**` и код ведущего.

## Начни здесь, без лишних вопросов

**Главное ТЗ:** [MASTER-TZ.md](../../docs/MASTER-TZ.md) (v2, 27.10.2026).
**Задание второго разработчика:** [SEO-ENGINE-v2-ASSIGNMENT.md](../../handoffs/parallel/SEO-ENGINE-v2-ASSIGNMENT.md).
**README:** [README.md](README.md).
**Интеграционный handoff:** [INTEGRATION-HANDOFF.md](INTEGRATION-HANDOFF.md).
**Один большой smoke:** [tests/smoke.cjs](tests/smoke.cjs).

Проверь **фактический HEAD** `feature/site-seo-engine` при старте; не доверяй старым SHA в исторических записях. Ветка ведущего: `feature/stage3-ai-site-contract`. На момент этой передачи ведущий работал с SHA `16346a16413838e5652117471e11f5b37df91cbb`, но он может измениться.

## Что уже сделано — не переделывать

- Полный Brief → SEO Blueprint с фактами, намерениями, архитектурой, страницами, метаданными, Schema.org кандидатами, media/ALT и адаптивными правилами.
- Клиентское SEO/UX описание всех секций, CTA, ссылок, смысловой иерархии и desktop/tablet/mobile. Оно дополняет, но НЕ заменяет согласование трёх статических изображений.
- Отчёт Site v1, семантика, HTML snapshot, source/HTTP consistency, три viewport, media и реальный статус/robots/sitemap; всё **offline/read-only**.
- Рекомендации по точным полям существующей CMS, разрешения/отклонения/зависимости, закрытие задач между версиями, изменение CMS **только гипотетически в памяти**, ни одной записи в БД.
- Безопасная миграция URL с проверкой существующего Site v1 301, Location, потерянных исторических alias, старых внутренних ссылок.
- Приёмка с привязкой к конкретной версии Site v1 и Blueprint, семь ручных gate; `review-bundle`, `review-bundle-md`, `leadDossier.evidenceRequests` и `capture-plan`.
- Структурные примеры промышленного сайта, community проекта и фикстуры настоящего SDK для автоматически выбранных OG изображений.
- README и INTEGRATION-HANDOFF обновлены. Все это **не разрешает публикацию**.

## Очень важная новая интеграция ведущего

Ведущий уже реализовал папку `manufact-approved-site-handoff-v2`, запечатанную SHA-256: оригинальный Site v1, три статических утверждённых прототипа, клиентское описание и переносимая спецификация. Он добавил `stage3/bin/verify-approved-site.cjs`, `seal-approved-site.cjs`, `audit-approved-site.cjs` и `capture-approved-site.cjs`, а также собственный Studio/prototype review. **НЕ создавай вторую такую систему.** SEO ledger — отдельная вспомогательная запись, её `siteSha256` (от канонизированного JSON) НЕ совпадает по определению с хешем байт файла `site.json` в запечатанном handoff. Читай `stage3/docs/APPROVED-SITE-PACKAGE.md` на актуальной ветке ведущего.

## Следующая большая задача

Одна **крупная** работа: проверить и совместить SEO Engine с реальным первым approved-site пакетом ведущего.
1. Сначала на полном Node 20+ checkout выполнить `node stage3/seo-engine/tests/smoke.cjs`; если есть реальные ошибки, исправить их пачкой **только в разрешённом каталоге**. До этого запуск полного smoke НЕ подтверждён.
2. Перепроверить актуальные core SDK, manifests, PHP renderer и sealed-v2 handoff. Ведущий продолжает работу параллельно. Учитывай `custom-section` + обязательный Design Graph.
3. При наличии фактически утверждённого сайта взять его `site.json`, точный SEO Blueprint, исходные три картинки, реальные browser/HTTP/media-свидетельства. Генерировать единый `review-bundle-md`, закрывать найденные несовместимости **одним большим заходом**, без самовольной публикации.
4. Если реального пакета нет, не выдумывать факты/согласования/замеры. Лучше подготовить одну конкретную интеграционную совместимость и короткий отчёт для ведущего, чем продолжать умножать тесты и вспомогательные библиотеки.

**Скорость принципиальна:** пользователь просит большие завершённые задачи за сообщение, минимальные необходимые smoke/contract проверки, без длительной микрополировки. Не останавливайся после каждой маленькой правки. Каждая задача должна приближать первую полноценную CMS к реальному пользовательскому тестированию.

## Технические границы

Node 20+, CommonJS, без новых npm-зависимостей, без live crawler, AI/provider API, SERP metrics, SEO-админки, автоматического CMS write, скрытой генерации страниц, выдуманных SEO гарантий. Никаких git merge, deploy, изменений master/docs/SDK/Studio. Главный единолично интегрирует branch после проверки.

## Проверки честно

Синтаксис и связь модулей проверялись; сценарии CTA-предпосылок, OG, текущего Site v1 контракта и 301-переносов выполнены изолированно. Полный Node smoke, CI, PHP/Chromium и production **НЕ проверены в этом чате**. Не называй такую частичную проверку полноценным PASS. Последний SHA смотри в ветке.

## Дополнение: большой этап Graph-rendered SEO parity — 28.10.2026

После исходного handoff завершена связанная интеграция реального Stage 3 PHP `Design Graph` в SEO Engine (только внутри `stage3/seo-engine/**`). Основные изменения: `lib/graph-authored.cjs`, `analyze.cjs`, `content-intelligence.cjs`, `field-proposals.cjs`, `traceability.cjs`, `remediation.cjs`, единый `tests/smoke.cjs`.

**Факт из PHP:** если секция имеет `designGraph`, её legacy `elements/items` больше не являются видимым body-контентом. Все SEO проверки теперь придерживаются этого правила, иначе старые скрытые H1/CTA/ссылки могли ошибочно считаться выполненными. Тексты вложенных Graph `list-item`, `tab`, `disclosure` участвуют в анализе авторского контента. Заголовки, CTA и их отличие от Blueprint привязаны к реальным `nodeId`; никаких невидимых manifest-field CMS правок не предлагается. Для Graph-узлов предусмотрена только явная ручная проверка в существующей Studio.

Ещё одно конкретное несоответствие: ведущий PHP выбирает социальное OG fallback изображение сначала из legacy `content.media`, даже если секция заменена Graph. SEO Engine оставляет это поведение как есть, но создаёт **неблокирующую** рекомендацию `social-fallback-hidden-media-review`, только если выбранный asset вообще отсутствует в публикуемом визуальном контенте страницы.

**Проверено:** синтаксис всех изменённых JS; V8 runtime с актуальными файлами SDK и компонентами нашей ветки (валидный Graph Site v1 и SEO аудиты); V8 runtime с актуальным SDK ведущего + `custom-section@1.0.0` (валидный Site v1, найдено расхождение heading и отсутствие правильной CTA); реальная валидная структура social-fallback фикстуры, рекомендация появляется/исчезает корректно. **Полный subprocess Node smoke/CI не запускался**, как и реальный утверждённый клиентский пакет/production HTTP. Не называй имитацию Node E2E.

Продолжение: сначала интегратор объединяет ветки в собственном checkout, запускает `node stage3/seo-engine/tests/smoke.cjs`, затем проверяет реальную sealed Approved Site v2 и опубликованный PHP HTML с фактическим Blueprint и evidence. Никаких PR, merge, deploy, CMS writes вторым разработчиком.


## Added vertical: sealed source -> local PHP HTML -> SEO release handoff

Worker developed lib/php-html-capture.cjs and bin/capture-php-html.cjs. Unlike visual screenshots, this captures real loopback PHP HTML over GET-only local HTTP, records deterministic per-page files with SHA-256 and a sealed-source digest, and imports them via review-bundle[/-md] --approved-site /ABS/sealed --blueprint /ABS/plan --php-html /ABS/evidence-directory. The existing deep HTML/head/robots/links/parity/backlog/lead dossier modules process these actual bytes. Separate --php-capture lead screenshots can be supplied if origin/site version/page count match.

Boundaries: localhost technical evidence, NOT public HTTPS, client approval, pixel/behavior match or proof that the running PHP served the recorded sealed input revision. Output is written only to a new folder, never CMS or the lead repository. New tests/php-html-capture-smoke.cjs exercises a real local Node HTTP server with the sealed verifier stubbed, and the full tests/smoke.cjs runs it. Full Node smoke plus first actual sealed customer site must still be tested on the integrated checkout. No PR/merge/deploy by this worker.


## Latest worker milestone: local PHP publication endpoint parity

In worker branch feature/site-seo-engine, PHP HTML collector additionally captures real localhost published sitemap.xml and robots.txt (with 503 warnings if STAGE3_PUBLIC_ORIGIN is missing) and every declared 301 redirect. New read-only module lib/php-local-publication.cjs validates hash-bound endpoint records and actual local sitemap locs, indexable/noindex lists and redirect destinations. lib/published-mount.cjs normalizes real /published/SITE-ID/ routes in existing HTML, deep HTML and canonical checks. No extra architecture or SEO parser; findings feed the same backlog, release gates and lead-dossier summary.

Main capture entrypoint remains node stage3/seo-engine/bin/capture-php-html.cjs --approved-site /ABS/sealed --origin http://127.0.0.1:PORT/published/SITE-ID/ --output /ABS/new-evidence, followed by review-bundle-md --approved-site ... --blueprint ... --php-html /ABS/new-evidence, optionally also --php-capture /ABS/lead-screens/evidence.json. Only the local origin is ever contacted; public HTTP/HTTPS, client/owner approval, matching deployed version, form delivery and visual equivalence remain unproven and manual. New localhost Node smoke covers correct and adverse responses but must be run in integrated checkout. No merge/deploy by worker.
