# AI Site CMS — первый реальный сайт: единая SEO/PHP-приёмка

Дата: 28.10.2026. Владелец: SEO worker, только `stage3/seo-engine/**`. Ведущий интегратор выполняет и оценивает процедуру в своём checkout, а не в нашей ветке изолированно.

## Что уже реализовано

- `bin/first-site-check.cjs` — **одна локальная команда** для проверки sealed Approved Site v2, Blueprint, всех PHP HTML-страниц, robots.txt, sitemap.xml, каждого объявленного 301, всех оригинальных и responsive-файлов, запуска **существующего** SEO review bundle и сохранения трёх отчётов.
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

Если сервер недоступен, страница возвращает невалидный HTML, файл слишком велик или source сменился, процедура выдаёт явную ошибку. Повторный запуск требует **новых директорий**, не перезаписывает sealed source. Границы: 60 страниц по 450 КБ, до 100 МБ медиа (1,2 МБ изображение, 12 МБ видео), максимум 1200 ресурсов.

## Минимальные необходимые проверки

В ведущем checkout один раз выполнить:

```bash
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
