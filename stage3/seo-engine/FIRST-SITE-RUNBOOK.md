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
3. Задайте `STAGE3_PUBLIC_ORIGIN=https://approved.example` для нормальной проверки ссылок на будущий публичный host, либо `STAGE3_PUBLIC_ORIGIN=http://127.0.0.1:PORT` для строго локального режима. Для `localhost` HTTP не утверждается публичная доступность. Без этой переменной robots/sitemap могут возвращать HTTP 503; это отмечается предупреждением.
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
