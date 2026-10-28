# AI Site CMS — первый реальный сайт: единая SEO/PHP-приёмка

Дата: 28.10.2026. Владелец: SEO worker, только `stage3/seo-engine/**`. Ведущий интегратор выполняет и оценивает процедуру в своём checkout, а не в нашей ветке изолированно.

## Что уже реализовано

- `bin/first-site-check.cjs` — **одна локальная команда** для проверки sealed Approved Site v2, Blueprint, всех PHP HTML-страниц, robots.txt, sitemap.xml, каждого объявленного 301, всех оригинальных и responsive-файлов, запуска **существующего** SEO review bundle и сохранения четырёх стандартных отчётов.
- `lib/php-local-head.cjs` — сверяет реальные HTTP-заголовки страниц, X-Robots-Tag, Content-Security-Policy, canonical и og:url с индексируемостью Site v1 и публичным origin, заявленным в **фактически полученном** PHP sitemap.
- `lib/php-local-publication.cjs` — сопоставляет URL sitemap, robots и 301 с Site v1. Ошибочный sitemap не считается доказательством полного списка страниц. Разрешён локальный HTTP origin, **только localhost/127.0.0.1**, соответствующий разрешённому режиму PHP PublicRenderer. Любая реальная внешняя HTTP-ссылка в sitemap остаётся ошибкой. Локальный HTTP помечается как проверка разработки, а не боевого HTTPS.
- `lib/php-local-media.cjs` — подлинные бинарные локальные HTTP-ответы: HTTP 200, MIME, SHA256, ETag, сигнатура PNG/JPEG/WebP/MP4, SHA и PNG-размеры responsive-вариантов, реальные ссылки `img src/srcset`, og:image. Локальный og:image HTTP принят **лишь при совпадении с публичным origin в полученном sitemap**.
- Все несоответствия идут в **существующий** `remediation`, `release-review`, `package`, `lead-dossier`; никакого параллельного CMS/SEO-планировщика и автоматического опубликования.

## Перед запуском

1. Используйте checkout ведущего, в который интегрирована актуальная ветка `feature/site-seo-engine`; файлы `stage3/server/**`, SDK, Studio и CI остаются исключительно его зоной ответственности.
2. Убедитесь, что PHP-сервер действительно публикует **тот же сайт** по `http://127.0.0.1:PORT/published/SITE-ID/`. Сверьте опубликованную версию и revision с sealed v2 в инфраструктуре ведущего: текущий SEO capture записывает SHA256 исходного пакета, но **не аутентифицирует** версию, отданную PHP.
3. Задайте `STAGE3_PUBLIC_ORIGIN=https://approved.example` для нормальной проверки ссылок на будущий публичный host, либо `STAGE3_PUBLIC_ORIGIN=http://127.0.0.1:PORT` для строго локального режима. Для `localhost` HTTP не утверждается публичная доступность. Без этой переменной robots/sitemap могут возвращать HTTP 503; теперь это техническая ошибка release gate.
4. Проверьте, что `stage3/components/*.json`, sealed Approved Site v2 и approved Blueprint актуальны. Для главной и внутренних страниц нужны их **собственные** утверждённые изображения, а не подстановка прототипов главной на все страницы.

## Проверка одним запуском

Все директории результата должны **не существовать** до запуска и иметь существующую родительскую директорию:

```bash
node stage3/seo-engine/bin/first-site-check.cjs \
  --approved-site /ABS/SEALED-V2 \
  --blueprint /ABS/approved-blueprint.json \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ \
  --evidence /ABS/first-site-evidence \
  --report /ABS/first-site-report
```

Команда пишет:

- `first-site-evidence/manifest.json` + HTML, текстовые SEO HTTP-ответы, PNG/WebP/JPEG/MP4 в `asset-XXXX.bin`, всё привязано к source ID и SHA256 на повторном импорте.
- `first-site-report/summary.json` — краткая сводка HTTP, медиа, заголовков, блокировок и остающихся ручных проверок.
- `first-site-report/bundle.json` — вся существующая аналитика SEO Engine: все проблемы и их задачи, публикация, соответствие Blueprint и gate review.
- `first-site-report/handoff.md` — человекочитаемая сводка для ведущего интегратора.
- `first-site-report/launch-worksheet.md` — постраничная карта технической приёмки desktop/tablet/mobile.

Если сервер недоступен, страница возвращает невалидный HTML, файл слишком велик или source сменился, процедура выдаёт явную ошибку. Повторный запуск требует **новых директорий**, не перезаписывает sealed source. Границы: 60 страниц по 450 КБ, до 100 МБ медиа (1,2 МБ изображение, 12 МБ видео), максимум 1200 ресурсов.

## Минимальные необходимые проверки

В ведущем checkout один раз выполнить:

```bash
node stage3/seo-engine/tests/php-local-semantics-smoke.cjs
node stage3/seo-engine/tests/php-local-footprint-smoke.cjs
node stage3/seo-engine/tests/php-html-capture-smoke.cjs
node stage3/seo-engine/tests/smoke.cjs
```

Эти тесты не проходили полный прогон в изолированном окружении SEO worker: пока подтверждена проверка JS-синтаксиса модулей. Требуется **настоящий** local PHP и реальный Approved Site v2, не только симуляция.

После прогона нужно устранить все `release.blockers`, убедиться в отсутствии критических `php-local:`, `php-head:`, `php-media:` ошибок, проверить реальные версии PHP и package, на настоящем публичном HTTPS домене отдельно пройти canonical/robots/sitemap/301 и медиа, сравнить экранные результаты с тремя утверждёнными клиентом прототипами, проверить формы и ошибки JavaScript на desktop/tablet/mobile. Ответственный за approve и publish — **ведущий и владелец сайта**, не SEO Engine.

## Что не подтверждает даже идеальный локальный прогон

Реальную публичную доступность, DNS/TLS, идентичность запущенной PHP-ревизии с sealed v2, работу CDN, визуальный UX, JS/формы/платежи и одобрение клиента. `summary.release.automaticRelease=false` всегда. Решение о публикации не принимается автоматически.

## После этого этапа

Не расширять бесконечно правила и тесты. Первостепенная работа следующего SEO-чата: устранить ошибки, обнаруженные **на реальном первом сайте**, после интеграции с ведущим, и помочь быстро довести CMS до первой рабочей публикации. Если первый прогон ещё не готов — синхронизировать источники и передать лидеру точные блокировки без изменения PHP/SDK/Studio.

## Current integration fix — real PHP DesignGraph media coverage (28 October 2026)

A concrete gap was identified against current lead `stage3/server/DesignGraph.php`: art-directed images use `<picture><source srcset>`, backgrounds use CSS `url(...)` inside `<style>`, and videos can use `<source src>` plus `poster`. Previous local-media criticality covered only ordinary `<img src/srcset>` and OG assets, so broken displayed responsive/background media might be downgraded to a warning.

The existing `lib/php-local-media.cjs` now recognizes these references through `lib/html-evidence.cjs`. Non-200, MIME, ETag and byte-integrity failures on page-used media are errors for the existing release blockers/remediation. An HTML site-scoped media path missing from sealed Site v1 adds `php-media:untracked-rendered-reference` (error). The current loopback smoke includes art-directed picture/source, CSS background, video poster, and untracked asset scenarios.

**Status:** committed in SEO worker only. No actual Node subprocess smoke, customer sealed v2, PHP served-source identity, real visual parity, public HTTPS or delivered forms have been proven in this chat. Run the two existing smoke commands and real first-site procedure in lead-integrated checkout. No automated release authorization.

## Макроблок: реальное SEO, формы и единый screenshot + HTTP handoff (28.10.2026)

1. На настоящих HTTP HTML теперь сравниваются `<title>`, Description, OG title/description, `html lang` и `meta robots` с sealed Site v1 и точными fallback текущего PHP PublicRenderer. Несовпадение — `php-head:metadata-drift` / `php-head:meta-robots-drift`, блокирующее release gate. Это признак несовместимого или устаревшего опубликованного содержимого, **но не криптографическое подтверждение ревизии PHP**.
2. Модуль `lib/php-local-forms.cjs` анализирует реальные `lead-form` / `lead-form-flex` без отправки заявок: наличие секции, action своего SITE-ID/SECTION-ID, POST, UTF-8, `_release`, форму `_token` (значение HMAC в отчёт не выводится), антиспам-поле, обязательные имя/email/сообщение/согласие и submit. Ошибки `php-form:*` становятся release blockers и задачами существующего remediation. Не подтверждает работающий collector/доставку почты/Telegram/спам-фильтры.
3. Не отвечающий HTTP 200 или некорректный по MIME robots.txt/sitemap.xml, robots wildcard запрет обхода, неверный Sitemap pointer, лишние страницы sitemap и отсутствующий OG image при заданном public origin теперь технические блокировки. Настроить `STAGE3_PUBLIC_ORIGIN` перед запуском — **HTTP 503 теперь error, не warning**.

Опционально ведущий может сначала получить исходные скриншоты настоящего PHP (этот шаг требует Chrome/Chromium, Playwright ведущего и тот же сервер):

```bash
node stage3/bin/capture-approved-site.cjs \
  /ABS/SEALED-V2 \
  http://127.0.0.1:PORT/published/SITE-ID/ \
  /ABS/new-lead-capture
```

И затем включить их в **тот же** первый SEO/HTTP-прогон:

```bash
node stage3/seo-engine/bin/first-site-check.cjs \
  --approved-site /ABS/SEALED-V2 \
  --blueprint /ABS/approved-blueprint.json \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ \
  --evidence /ABS/new-http-evidence \
  --report /ABS/new-report \
  --php-capture /ABS/new-lead-capture/evidence.json
```

Флаг `--php-capture` **необязателен**. Проверяются сохранённые скриншоты и утверждённые исходники по SHA-256, совпадение пакета, версии, siteId, маршрутов и полного loopback origin. Итоговый `bundle.json` включает фото-ошибки из снимков, HTML/HEAD, медиа, sitemap, 301 и формы в едином backlog/gate; `summary.json` сообщает число проверенных screenshot файлов. **Скриншоты остаются изображениями, не визуальным PASS.** Не утверждать реальную идентичность версии PHP, одобрение клиента, HTTPS или успешную отправку формы без отдельной работы владельца.

Локальный evidence HTML содержит отображаемые браузеру поля, поэтому хранить файлы capture приватно, не прикладывать исходный HTML с маркерами форм к публичным тикетам. В SEO `bundle.json` значения `_token` не записываются.

Минимальные целевые проверки остаются без создания новых CI-комплексов: `node stage3/seo-engine/tests/php-html-capture-smoke.cjs` и `node stage3/seo-engine/tests/smoke.cjs` в checkout ведущего. В этом SEO-чате реальный Node subprocess, первый клиентский пакет и публичный хост не проверены.

## Синхронизация с новым PHP FlexForm / formSteps ведущего

Ведущий обновил PHP/SDK (`feature/stage3-ai-site-contract` SHA `074018c63ffebf4ab8a89995f0c321dbbcfc8e02`): `lead-form-flex` теперь имеет индивидуальные `formFields`, условные зависимости `when`, опциональные `formSteps` (2–4 шага), встроенный JS-wizard и SHA-256 `script-src` в реальном HTTP CSP. **SEO не переписывает PHP.**

`php-local-forms` сверяет `extra1..3`, пользовательские поля (имя/тип/число вариантов radio/required), CSS-условные атрибуты, наличие marker `data-multi-step`, число `.lead-step`, навигационные кнопки next/back и индикатор прогресса. `php-local-head` дополнительно вычисляет SHA-256 фактически полученного inline JS и требует его точного разрешения в реально полученном `Content-Security-Policy`; если Site v1 объявляет wizard, но скрипт не выдан, это также блокировка.

Это проверки **структуры HTTP-выдачи**, а не исполнение JS и не корректность прохождения пользователем многошаговой формы. Нужны реальные desktop/tablet/mobile браузерные проверки, отправка формы, сохранение в CMS и проверка канала доставки. Если фактический JS другого содержания — должен совпадать именно с реальным HTTP CSP, а не с копией из исходника.


## Реальный импорт Site v2 в CMS: media-ID remap — важно

**В официальном Studio импорте файлы получают новые site-owned immutable ID.** Поэтому опубликованный PHP не обязан использовать исходные `/assets/asset-hero.jpg` из sealed v2, хотя его контент должен соответствовать утверждённому дизайну. Проверка только исходных URL в настоящей CMS даёт ложные 404.

Для первого реально импортированного в CMS сайта: получите JSON-ответ владельцем авторизованного `GET /api/sites/SITE-ID/published-site`; сохраните его в приватный файл, не используйте draft и не публикуйте служебный ответ. Ответ обязан содержать `site` (Site v1) и числовой `version`. Никаких cookie, ключей или прямых запросов в owner API наш инструмент не принимает/делает.

```bash
node stage3/seo-engine/bin/first-site-check.cjs \
  --approved-site /ABS/SEALED-V2 \
  --blueprint /ABS/approved-blueprint.json \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ \
  --published-site /ABS/private-owner-published-site.json \
  --evidence /ABS/new-http-evidence \
  --report /ABS/new-report \
  --php-capture /ABS/lead-capture/evidence.json
```

`--php-capture` необязателен и добавляет исходные screenshot receipts; `--published-site` обязателен для типичного реального CMS импорта с переназначенными media ID, но может быть опущен для прямой PHP fixture без импорта.

`lib/published-site-reconcile.cjs` проверяет, что `published.site` отличается от утверждённого исходника **только** разрешённой операцией импортера: original/variant ID и URL, server-reported размеры изображений; неизменны страницы, секции, DesignGraph, тексты, ссылки, SEO, ALT, меню, redirect и формы. Проверка медиа требует идентичного порядка оригиналов, типов, ALT и однозначных variant SHA; неизвестные/переупорядоченные файлы fail closed. После этого каждый фактически отданный PHP original и responsive файл проверяется против соответствующего sealed SHA-256. Содержимое media нельзя заменить даже с правильным MIME, ETag и картинкой.

Также при `--published-site` сверяем `_release` во всех формах с числовым `version`, чтобы не выдавать старую форму за опубликованную версию. Это owner-supplied snapshot и HTTP byte correlation, **не** самостоятельное криптографическое удостоверение PHP build/DB revision, не факт реального HTTPS или успешных форм.

Первый прогон этого режима должен сделать ведущий в собственном интегрированном checkout с настоящими файлами клиента. Отдельный JavaScript smoke подтвердил remap, отклонение ALT/референсов и stale published release; полноценного Node subprocess и реального client PHP здесь не было.


## Большой блок первого реального клиента: опубликованный контент и рабочий лист (28.10.2026)

Поверх прежнего sealed v2 → owner-exported published Site v1 → настоящего localhost PHP capture добавлены **две** практические проверки фактически отданного HTML:

- `lib/php-local-components.cjs`: `pricing-plans` (названия тарифов, цены, пункты, CTA текст/URL), `process-timeline` (шаги и содержание), `comparison-matrix` (строки, заголовки, семантические th/td) и `content-switcher` (доступные radio+label, наличие первой выбранной вкладки, связность панелей и CSS selector, тексты). Модуль обрабатывает вложенные section без ошибочного захвата первого закрывающего тега.
- `lib/php-local-graph.cjs`: узлы **реального PHP DesignGraph** — заголовки/уровни, текст, кнопки и адреса, изображения и ALT, art-directed responsive image source, подписи видео/постеры, списки, таблицы/заголовки, галереи, цитаты и атрибуции, disclosure, нативные popover, tab/panel/ARIA/CSS и др. Проверяет фактический HTML против Site v1; не исполняет JS и не подтверждает функциональную работу браузера.

Все ошибки `php-component:*` и `php-graph:*` идут в **существующий** remediation + release blocker (`local-php-component-parity` и `local-php-design-graph-parity`), освещены в `bundle.json` и сводке. Новую CMS или редактор SEO не добавляли.

Команда `first-site-check.cjs` теперь выдаёт **четыре** файла в папке `--report`, сохранив три прежних:

- `summary.json` — счётчики и blocking gate IDs, включая реальные business components, DesignGraph nodes и operator worksheet.
- `bundle.json` — полная existing SEO аналитика, фактические localPhpComponents и localPhpGraph с точными section/node IDs и findings.
- `handoff.md` — автоматизированный handoff задач ведущему.
- `launch-worksheet.md` — краткий приватный отчёт по каждой странице: фактические ошибки PHP, технический статус, наличие **своего** источника approved design, наличие SHA-checked screenshot для desktop/tablet/mobile, список ручных проверок. Никакие manual галочки не выставляются автоматически. Исходные HTML и HMAC `_token` не включены.

Команда и flags прежние (`--published-site` нужен для реального CMS media remap, `--php-capture` добавляет снимки по желанию); изменение опубликованного состояния CMS и отправка POST не выполняются.

Целевой smoke: `node stage3/seo-engine/tests/php-html-capture-smoke.cjs` (в нём добавлены корректный HTML и намеренно испорченные CSS tabs, CTA, media ALT, связь panel, а также worksheet). Следом один раз `node stage3/seo-engine/tests/smoke.cjs`. В worker проверены JS parse и несколько локальных isolated JS scenarios, но полный Node subprocess и настоящий PHP/клиентский пакет всё ещё только у ведущего.


### Расширение реального компонента PHP: 14 типов вместо четырёх

К `php-local-components.cjs` дополнительно подключены **FAQ, карточки услуг, отзывы, photo-gallery, adaptive-gallery, логотипы партнёров, CTA-banner, contact-panel, image-showcase, media-story**. Для каждого типа сопоставляются фактически отданные PHP HTML структура/содержание и элементы из sealed Site v1, где применимо: вопросы/ответы, услуги, подписи/авторы, image src/ALT/caption, внутренние и внешние CTA destination и видимые цены. Нет DOM исполнения, нет запроса к внешнему URL и нет изменения сайта. Нарушения — существующий `local-php-component-parity` release blocker с `sectionId` и `pageId`.

Репрезентативные валидные и намеренно сломанные FAQ/testimonial/CTA добавлены в *тот же* `php-html-capture-smoke.cjs`; pure JS smoke этих актуальных модулей прошёл. Полный Node subprocess/реальный PHP первого клиента по-прежнему обязан выполнить ведущий.


### Обязательная приоритетность PHP DesignGraph

PHP PublicRenderer выбирает `section.designGraph` **вместо** legacy component renderer, если поле присутствует. Поэтому `php-local-forms`, проверки PHP wizard CSP и все 14 `php-local-components` не требуют legacy markup при graph override; за такой секцией отвечает `php-local-graph`. Без этого корректный CMS сайт с обновлённым дизайном получал бы ложный release blocker. Исходный клиентский source не изменяется. Также проверяются section heading/intro, отдельные тарифные условия, featured card state, заголовки и примечания таблиц, только если эти значения действительно объявлены в typed Site v1.


## Social card parity for real published PHP (28.10.2026)

Добавлена сверка фактического PHP HTML `<head>` с Site v1 и текущим `PublicRenderer.php`: `og:type=website`, `og:locale`, `twitter:title`, `twitter:description`, `og:image`, `twitter:image`, `og:image:alt`, `twitter:image:alt`, `twitter:card` (`summary_large_image` только если PHP public origin и изображение доступны). Публичный origin берётся из **реального локального sitemap**, который захватывается той же командой. Изображение выбирается существующим `publisher-media.cjs` по тем же правилам, что PHP. Отсутствующий, дублированный или чужой meta field — `php-head:social-drift` / `php-head:social-unexpected`, error, через уже существующий `local-php-head-indexation-or-origin` release blocker. Если нужного origin нет, не называем HTTPS доказанным.

Обновлён существующий loopback mock PHP HTML для случаев с OG image и без него; добавлен отдельный тест подмены `twitter:image`. Изолированная V8-проверка всей локальной head review (2 страницы) дала 0 ошибок на правильном наборе и нужные errors на изменённых `twitter:image`/`og:image`. Полный Node subprocess и реальный PHP/HTTPS первичного клиента этим не проверялись.


## First-site large integration update — real owner edits and continuous technical review

1. **Strict first import:** original sealed Approved Site v2 and the owner-exported GET `/api/sites/SITE-ID/published-site` `{site,version}` are still matched exactly after CMS media-ID remap. Source seal SHA-256 remains the original source of truth.
2. **Edited CMS publication:** after a real owner checks what changed in published Site v1, the CLI accepts `--owner-edit-review /ABS/owner-review.json` alongside `--published-site`. The exact review document binds original `site.json` SHA256, the exact exported release `version` and `fingerprint(site)`. It records a *claim* of manual review, not an authenticated client approval, user identity or published runtime revision.
3. **Repeated first-site reviews:** `--previous-report /ABS/previous-report` compares earlier `summary.json`+`bundle.json` with the new verified current report, including only evidence groups instrumented in both runs, same sealed source SHA, siteId and localhost mount. Writes `delta.md` and `delta.json`. Previously seen errors that disappear are *not automatically fixed*.
4. **Public menu and authored link safety:** `php-local-navigation.cjs` checks real desktop/mobile menu links, nested hierarchy, active route, header CTA/brand/footer. `php-local-graph.cjs` checks source-authored internal button/link/image destinations and anchors even when source HTML parity matches. Errors block release through existing `php-nav:*` and `php-graph:*` gates.

### Manual owner-edited publication review JSON (replace every placeholder after real review)

```json
{
  "format": "manufact-seo-owner-edited-site-review-v1",
  "siteId": "SITE-ID",
  "approvedSiteSha256": "PASTE-ORIGINAL-SEALED-SITE-JSON-SHA256",
  "publishedVersion": 8,
  "publishedSiteFingerprint": "PASTE-FINGERPRINT-FROM-EXPORTED-SITE",
  "reviewedAt": "2026-10-28T17:00:00Z",
  "operator": "Site owner",
  "reason": "I manually checked the owner-edited pages, media and current design against the approved version",
  "acknowledged": true
}
```

Produce the exact `publishedSiteFingerprint` inside lead-integrated checkout:

```bash
node -e "const fs=require('node:fs');const {fingerprint}=require('./stage3/seo-engine/lib/acceptance.cjs');console.log(fingerprint(JSON.parse(fs.readFileSync(process.argv[1],'utf8')).site))" /ABS/published.json
sha256sum /ABS/SEALED/site.json
```

Do not reuse the original hashes for newly changed uploaded photos. The owner-edited mode explicitly disables full sealed-media SHA comparison and uses actual PHP media byte/MIME/ETag verification instead. The original source remains immutable; current edited content and visual approval are separate human checks. Lead's original sealed-source screenshot evidence cannot be represented as a verified snapshot of edited publication.

### One-run command with reviewed owner edits and prior report

```bash
node stage3/seo-engine/bin/first-site-check.cjs --approved-site /ABS/SEALED --blueprint /ABS/blueprint.json --origin http://127.0.0.1:PORT/published/SITE-ID/ --published-site /ABS/published.json --owner-edit-review /ABS/owner-review.json --previous-report /ABS/previous-report --evidence /ABS/new-evidence --report /ABS/new-report
```

Six report files when `--previous-report` is present: `summary.json`, `bundle.json`, `handoff.md`, `launch-worksheet.md`, `delta.json`, `delta.md`. Without it, four report files. Both new `--owner-edit-review` and `--previous-report` are optional; the former requires `--published-site` and real manual review. All output directories must not exist before execution.

The existing lead-integrated smoke remains: `node stage3/seo-engine/tests/php-html-capture-smoke.cjs`. Worker has performed isolated JS scenario validation only, not actual first customer Node/PHP/browser/HTTPS end-to-end or client acceptance.

## Глобальное оформление и индивидуальный DesignGraph — новая фактическая PHP проверка

После извлечения sha256-verified HTML для **каждой** опубликованной страницы `lib/php-local-theme.cjs` проверяет фактическое CSS `:root` от PHP `PublicRenderer::themeCss`, сравнивая значения с текущим validated `Site v1.theme`: `--cms-bg`, `--cms-surface`, `--cms-text`, `--cms-primary`, `--cms-width`, `--cms-font`, `--cms-body-size`, `--cms-line-height`, `--cms-h2-size`, переменные кнопок/радиусов/теней. Если нет единственного корневого набора или значение отличается — `php-theme:root-missing` / `php-theme:token-drift` (error), блокирующий gate `local-php-theme-parity`.

`lib/php-local-graph-style.cjs` встроен прямо в существующий `php-local-graph.cjs`: проверяет наличие реально опубликованных базовых и media-query селекторов на `tablet (900px)` и `mobile (600px)`, hover/focus/active, transition, анимации, sequence, CSS фоновых оригиналов и адаптивных фото, фонового видео и poster, подавление видео на mobile и `prefers-reduced-motion`. Это проверка **наличия источником объявленных правил**, не аналог CSS engine и не доказательство визуальной пиксельной идентичности. Стиль `hidden:false` осознанно не требует emitted CSS. Все расхождения имеют точный graphNodeId и будут отдельно привязаны к задачам `remediation`.

Проверка не меняет CMS и не выносит HTML/HMAC в отчёт. Новая `summary.json.theme` сообщает число проверенных страниц, переменных и ошибок, а `bundle.json.localPhpTheme`, `launch-worksheet.md` и `delta.json/md` отражают найденные отклонения. Для запуска команд **ничего не изменилось**. Включено в уже существующий smoke `tests/php-html-capture-smoke.cjs`, дополнительный CI не создан.

**Границы:** не доказывает настоящий CSS computed layout, визуальное соответствие трём утверждённым макетам, работу JS в браузере, текущую PHP ревизию или публичный HTTPS. Эти проверки остаются ручными у ведущего.


## Real PHP semantics and link-integrity gate (28.10.2026)

`lib/php-local-semantics.cjs` validates the actual SHA256-checked PHP HTML for unique main/H1, heading order, duplicate DOM IDs, image ALT presence, unlabeled form controls, broken ARIA references, unsafe links, escapes from the published site mount, unknown page/redirect/media routes and broken target fragments. Remote URLs are not crawled. Certain defects block existing release gates; possible heading/ARIA/new-tab accessibility concerns remain review items.

Available in `first-site-check` `summary.json`, `bundle.json`, remediation, release gates, lead dossier and the per-page `launch-worksheet.md`. Focused smoke: `node stage3/seo-engine/tests/php-local-semantics-smoke.cjs` (alongside existing smoke in the integrated lead checkout).

**Evidence limits:** static local HTML only. No JS runtime, keyboard/a11y certification, source revision attestation, real client first site, public HTTPS, Chromium visual match or delivered forms. Never automatic release approval.

## Source-bound PHP page footprint and loading-priority review (28.10.2026)

New `lib/php-local-footprint.cjs`: actual uncompressed HTML and inline CSS/JS bytes; per-page verified PHP media byte groups with responsive lower/upper representative candidate sizes; large image/video/payload observations; first main image lazy-loading candidate and images without dimensions. The notes are **review-only**, not blockers and not invented Core Web Vitals. Browser resource selection, gzip, field performance, LCP, INP and CLS remain unverified.

The existing one-run `first-site-check` reports `payload` in summary, `localPhpFootprint` in bundle, existing remediation/release reviews, lead dossier and post-page worksheet. Focused test: `node stage3/seo-engine/tests/php-local-footprint-smoke.cjs`. It never modifies PHP, CMS or publishing.


## Integration handoff: official static export, public HTTPS and honest previous-run delta (28.10.2026)

**Official static export parity:** Optional \`--static-export /ABS/official-static-release\` requires \`--published-site /ABS/owner-published.json\` including integer \`sourceRevision\`. Lead creates static export with EXISTING \`php stage3/server/bin/export-published.php SITE-ID /ABS/new-release\`. SEO does not edit PHP/deploy. All source/manifest files, redirects and asset SHA-256 checked; exact version and sourceRevision checked before local PHP acquisition; static sitemap/robots, fallback noindex refresh, all internal static links/assets/fragments/mount leaks reviewed. Local PHP page text/title/description/headings/CTA/image srcset/form field structure/CSS and inline wizard JS and actual media bytes compared. Disagreement blocks existing release gates as \`php-export:*\`. Agreement still cannot authenticate running PHP revision or approve client design. Static HTML redirect fallback is not HTTP 301: configure actual 301 on deployed host separately.

**Optional real public HTTPS read-only capture after lead deploy:**
\`\`\`bash
node stage3/seo-engine/bin/capture-public-https.cjs \
  --approved-site /ABS/SEALED-V2 \
  --published-site /ABS/owner-published.json \
  --origin https://approved.example/published/SITE-ID/ \
  --out /ABS/new-public-http.json \
  --media-out /ABS/new-public-media.json
\`\`\`
If the owner edited the imported site, append \`--owner-edit-review /ABS/manual-owner-review.json\`. Requires explicit DNS HTTPS:443 host with either root or exact CMS mount; resolves and pins public IP, rejects mixed/private addresses, verifies TLS hostname, issues GET only for pages/robots/sitemap/301 and HEAD only for original media. No redirects followed, POST, JS or form delivery. Missing HEAD support (405/501) marks evidence partial instead of pretending GET fails. Never transmits form submission. Results saved 0600 outside sealed input. DO NOT commit raw HTML containing tokens.

**Unified first-site report with optional public transcripts and static export:**
\`\`\`bash
node stage3/seo-engine/bin/first-site-check.cjs \
  --approved-site /ABS/SEALED-V2 \
  --blueprint /ABS/blueprint.json \
  --published-site /ABS/owner-published.json \
  --static-export /ABS/official-static-release \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ \
  --public-http-evidence /ABS/new-public-http.json \
  --public-media-evidence /ABS/new-public-media.json \
  --evidence /ABS/new-local-evidence \
  --report /ABS/new-report
\`\`\`
The public and static flags are optional, but static export requires owner-published version/sourceRevision; public transcript imports are **caller-supplied JSON, not authenticated network calls by first-site-check**. They flow through existing delivery/media reviews, remediation and release gates. No automatic release authorization and no fabricated verification of public HTTPS, forms, client approval or running PHP revision.

**Delta scope:** Existing \`--previous-report\` now covers PHP semantic links, media/HTML footprint, static export and optional public HTTP/media. It refuses to compare changed public-host cohorts or different static-export versions as confirmed fixes. Stable finding identities include href, fragment, targetPageId, graph style property.

Focused tests: \`php-local-static-export-smoke.cjs\`, \`php-local-report-delta-smoke.cjs\`, \`public-https-capture-smoke.cjs\`, plus existing \`php-html-capture-smoke.cjs\`. Worker performed syntax and selected isolated V8 mocks; real Node PHP/browser/HTTPS customer E2E and form POST are NOT confirmed. Actual first customer release is the next priority; avoid proliferating labs or extra CMS code.

## Owner per-form delivery routing readiness — PHP FormRoutes integration (28.10.2026)

Lead PHP now supports owner-only per-section delivery routes: inherit, custom, off, plus global email/Telegram settings. A structurally correct published HTML form does not prove notification delivery.

Optional CLI flag: --delivery-status /ABS/private-owner-delivery-status.json together with --published-site /ABS/owner-published.json. Owner must export authorized GET /api/sites/SITE-ID/delivery to a LOCAL private JSON file. Never check the raw file into Git or attach it to a public ticket: it contains private addresses, chat IDs, operator data and submission IDs. File must remain unchanged through capture. The SEO worker never authenticates to or calls this owner API.

New lib/php-local-delivery-readiness.cjs checks published form sections (excluding graph-overridden legacy sections), routes present, inherit/custom/off modes, transport readiness and configured recipient existence. It emits no email/chat IDs or submission history. Results go to existing remediation, release gates, bundle.deliveryReadiness, summary.deliveryReadiness, lead dossier, worksheet and previous-run delta. Disabled notifications require a manual intentionality review; selected channels without a viable recipient/route produce a blocker. A public form collector can still store submissions when notification channels are off.

These are owner-SUPPLIED configuration hints, NOT actual accepted POSTs, CMS stored leads, mail/Telegram receipt or authenticated delivery. An apparently configured route is NOT proof that messages arrived. The worker cannot claim client acceptance. For changes in current published version, delta treats owner routing evidence as incomparable rather than automatically fixed.

Focused V8 smoke: node stage3/seo-engine/tests/php-local-delivery-readiness-smoke.cjs. Real Node/PHP/browser/HTTPS/form-delivery E2E remain for lead. Note stage3/bin/cms-release.cjs is the lead's CMS engine shipment tool; not a customer site deploy or SEO runtime, and it does not bundle SEO worker code.

## Public static deployment parity + real media GET SHA256 — integration block (29.10.2026)

**Why:** Previously official `export-published.php` and public HTTPS JSON were audited separately. A locally correct static release could be absent or changed at the actual host. `lib/public-static-parity.cjs` now cross-checks operator-supplied public HTTPS *root* captures with the owner-pinned official static release. Compares every page HTTP 200 + exact route, main text, title/description, headings, section/CTA/image/form/CSS/wizard structure, canonical/robots/html lang/JSON-LD, root robots.txt and sitemap.xml bodies, real 301 Location for every declared legacy alias, and original public asset HEAD status/MIME/length vs official byte sizes. Different host or `/published/SITE-ID/` mount is expressly **not comparable** to a root static export, becomes a review rather than false PASS. Errors route to `public-static-deployment-drift` release blockers, task list, dossier, worksheet and previous-run delta. No public request is made by `first-site-check` itself; supplied HTTP JSON provenance remains unauthenticated.

**How to run the public static site SHA256 check (explicit opt-in, no form submissions):**

```bash
node stage3/seo-engine/bin/capture-public-https.cjs \
  --approved-site /ABS/SEALED-V2 \
  --published-site /ABS/owner-published.json \
  --origin https://your-static-host.example/ \
  --out /ABS/public-http.json \
  --media-out /ABS/public-media-head.json \
  --static-export /ABS/official-static-release \
  --media-digest-out /ABS/public-media-sha256.json
```

The two last flags must always be supplied together. Existing CLI without them still uses only page GET and optional media HEAD. The new `public-media-byte-verification.cjs` compares **every original and responsive variant** declared by Site v1 to the official export SHA256. Uses pinned public-DNS TLS-verified HTTPS GET streaming: 12,000,000 bytes max per resource, 180,000,000 bytes total; no redirects followed; no POST; no binary media stored. The private `public-media-sha256.json` contains URL, status, MIME, byte count and SHA256 receipt ONLY (never actual images). It can be expensive for a large customer site; run only when explicitly approving this production host and network traffic. Operator API `sourceRevision`, static export version and manifest are checked before capture and rechecked afterward. The static export must declare exactly that HTTPS production root.

Import the operator-captured evidence to the existing local first-site report with these optional flags (along with the standard mandatory --approved-site, --blueprint, --origin [LOCALHOST], --evidence and --report flags):

```bash
  --published-site /ABS/owner-published.json \
  --static-export /ABS/official-static-release \
  --public-http-evidence /ABS/public-http.json \
  --public-media-evidence /ABS/public-media-head.json \
  --public-media-digests /ABS/public-media-sha256.json
```

`--public-media-digests` requires `--static-export` and version/sourceRevision. The new digest receipt is validated against the same exact static manifest SHA256, source revision, assets and URL origin. Mismatches become `public-bytes:*` tasks and blocking `public-static-media-sha256-integrity`. Missing responsive variants or wrong GET MIME/status/length likewise block. Included in `bundle.publicMediaBytes`, `summary.publicMediaBytes`, dossier, worksheet and previous-run delta. Delta comparisons require the **same static manifest SHA and HTTPS host** to avoid marking unrelated releases as fixed.

**Critical evidence limits:** A saved JSON receipt can be forged; this tool cannot authenticate network provenance after import. An observed SHA match is not client acceptance, running PHP code identity, browser layout equality, real lead POST/recipient delivery, or authorization to deploy. Static export redirect HTML fallbacks are NOT real HTTP 301; real host rewrites must be configured by the lead. Never upload private evidence with customer form HMAC values to GitHub. Existing worker scope `stage3/seo-engine/**` only; no PHP, main or merge.

Focused checks (run in integrated Node checkout): `node stage3/seo-engine/tests/public-static-parity-smoke.cjs` and `node stage3/seo-engine/tests/public-media-byte-verification-smoke.cjs`. This worker session completed V8 execution with mocked dependencies and public transport, plus CJS syntax checks, not live Node/PHP/browser/customer-domain acceptance.

## True static-host HTTP 301 deployment handoff — operator-only (29.10.2026)

Official `stage3/server/bin/export-published.php` creates static HTML redirects with noindex + meta-refresh, NOT a real HTTP 301. Our new `lib/static-host-rewrites.cjs` builds **alternative** Apache mod_rewrite and Nginx exact-match `return 301` rules for every declared old Site v1 route, pinned to the **SHA256-verified official static release**, publishedVersion, sourceRevision and declared HTTPS static root. Rejects redirects that are duplicated, collide with real pages or do not point at a real published page; refuses exports already containing static-publication blocking findings. It never edits or accesses the hosted web server.

Generate local operator-ready files (explicit, no deployment):
```bash
node stage3/seo-engine/bin/prepare-static-host.cjs \
  --approved-site /ABS/SEALED-V2 \
  --published-site /ABS/owner-published.json \
  --static-export /ABS/official-static-release \
  --out /ABS/new-static-host-plan
```
Add `--owner-edit-review /ABS/manual-owner-review.json` when the owner changed the imported Site v1. Output is a NEW private directory: `apache.htaccess` (contents suitable for root `.htaccess` after manual installation), `nginx-redirects.conf` (exact `location = /old/ { return 301 /new/; }` blocks for existing HTTPS server context), `plan.json` (revision and file SHA256 inventory) and `HOSTING-HANDOFF.md` (site/document root, route counts, manual curl -I probes). Choose ONE server format and review its interaction with existing site rules; configure TLS, document root, index, CSP/privacy and form collector separately. This does not overwrite an existing plan or make any live server writes. Real public 301 + Location must be confirmed by the public HTTPS capture before approval.

Focused isolated V8 test: `node stage3/seo-engine/tests/static-host-rewrites-smoke.cjs`; full Node/Apache/Nginx/client-host checks have NOT been run in the SEO worker. The lead remains sole integrator/deployer and may choose not to deploy static output at all; keep the PHP route separate.

## 29.10.2026 — Дополнительный большой заход после замечания о темпе

**Ритм:** каждый заход — примерно 30 минут активной разработки, а не остановка через 10–12 минут, когда первые блоки готовы. После раннего завершения одного блока сразу брать следующий крупный. Никаких бесконечных искусственных тестов. Всё — строго stage3/seo-engine/**, без PR/merge/deploy.

### Реальные production-изменения

- `public-static-head.cjs`: паритет действительного публичного OG/Twitter/canonical/JSON-LD **по значениям**, а не только типам; не выводить содержимое в отчёт.
- `public-static-sensitive-markup.cjs`: защита публичных form action, submit formaction, hidden _release/_token (только SHA256), внешних JS/CSS loaders/SRI, iframe, link rel/target, image loading и inline JS/CSS handler атрибутов. Подмена адреса заявки или токена — блокирующее отклонение от verified official static export.
- `public-static-csp.cjs`: общественный CSP на реальном HTTPS не должен блокировать inline CMS CSS, wizard JS, style/event attrs или form-action на отдельном HTTPS collector. Error -> `public-static-csp-blocks-site`; отсутствующий/сложный CSP -> manual review. Никакого фактического POST.
- `public-https-capture.cjs`: безопасный GET заведомо несуществующего маршрута (ожидаем HTTP 404/410, иначе soft-404), повторный GET homepage в конце сбора публичных страниц/медиа с SHA256/status сравнением (защита от смешанных релизов; не аутентификация исходников). Pinned DNS отклоняет reserved/TEST-NET/benchmark/private/6to4 IP.
- `public-static-parity.cjs`: проверка страницы, full SEO head, POST/anti-spam markers, CSP, 301, robots/sitemap, image HEAD и сильного GET SHA256. Успешный GET закрывает отсутствие HEAD (405/501), а противоречивый HEAD остаётся warning. Нельзя заявлять полное покрытие без 404 probe и стабильной главной.
- `php-local-static-export.cjs`: теперь включает img srcset, CSS url() и проверяет http/ftp mixed-content для изображений и фонов.
- `first-site-report-delta.cjs`: изменение публичного HTML SHA256 / ETag и конфликт CDN кеша только при совпадении конкретного SHA256 официального static manifest и HTTPS host. Иначе сравнение недопустимо.
- `first-site-check` и `php-html-capture`: приватные каталоги 0700 и файлы 0600. Public evidence JSON также 0600.
- `prepare-static-host`: ШЕСТЬ результатов: apache.htaccess, nginx-redirects.conf, netlify._redirects (forced 301! поверх static HTML fallback), cloudflare-pages._redirects (301; проверить Pages Functions), plan.json, HOSTING-HANDOFF.md. Провайдерские _redirects вручную переименовываются в publish директории; никто не деплоит. Документация: https://docs.netlify.com/manage/routing/redirects/redirect-options/ и https://developers.cloudflare.com/pages/configuration/redirects/.

Для запуска остаются предыдущие команды capture-public-https, prepare-static-host, first-site-check в этом файле. Ведущий должен интегрировать latest HEAD SEO в свой checkout, реально выполнить Node+PHP+Chromium+HTTPS/form POST на первом клиенте. Изолированные V8/syntax проверки — не полноценный Node/CI/реальный клиентский PASS.

**Этот блок актуальнее ранних исторических секций документа (там ещё может быть написано про четыре вместо шести файлов).**

### Final production checks for the 29.10.2026 continuation

- Public CSP form-action matcher understands https://*.example.com for subdomains but not the exact parent. Does not claim actual POST delivery.
- Public root-static comparison reports declaredResponsiveVariants and sha256VerifiedResponsiveVariants. When responsive srcset variants exist, original-image HEAD alone **cannot** justify allComparedSurfacesMatched=true; all variants need successful public GET SHA256 evidence.
- Successful verified GET SHA256 can resolve HEAD 405/501 lack of coverage, but contradictory HEAD metadata stays visible as a warning.
- Positive/negative CSP focused V8 smoke with real source modules and mocked URL/crypto passed. Full Node/CI, real HTTPS/Chromium/PHP and client form submission remain unexecuted in the worker.
