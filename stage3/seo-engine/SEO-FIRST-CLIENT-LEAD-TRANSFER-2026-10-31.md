# MANUFACT AI Site CMS — итоговая передача SEO Engine главному разработчику

**Дата:** 31 октября 2026. **Статус:** техническое ядро SEO реализовано; первый реальный клиентский SEO-прогон и окончательная приёмка ещё не выполнены.

## 1. Проверенная точка передачи и ответственность

| Параметр | Значение |
|---|---|
| GitHub | `manufact-test/ai-site-cms` |
| Независимая SEO-ветка | `feature/site-seo-engine` |
| Подтверждённый SEO HEAD **перед этим документационным коммитом** | `1317bc6403ed6f435bbb3af0bb44cb3179efa844` |
| Ветка главного разработчика | `feature/stage3-ai-site-contract` |
| Проверенный HEAD главной ветки | `ba1320ff0bb2439b06199a99f25776d961c403f6` |
| Разрешённая зона SEO-разработчика | Только `stage3/seo-engine/**` |
| Интегратор, публикация, merge, rollback | **Только главный разработчик** |

Два HEAD проверены непосредственно в GitHub 31.10.2026. Файл `lib/seo-published-content-collision.cjs` на главной ветке при проверке отсутствовал (404): **последний SEO-блок ещё не интегрирован**. Если ветки изменились, сначала заново проверьте актуальный HEAD и diff. Сам SEO-разработчик не создавал PR, не делал merge и не выполнял деплой.

SEO-разработка из предыдущего локального checkout **доставлена в GitHub**. Обычный `git push` не имел HTTPS-учётных данных, поэтому три коммита были созданы через авторизованный GitHub-коннектор; SHA коммитов отличаются от прежних локальных, однако **SHA всех трёх деревьев файлов совпали побайтно**. Локальная ветка после доставки синхронизирована с GitHub, рабочее дерево было чистым.

Последние три функциональных коммита в удалённой SEO-ветке, по порядку:

1. [`49f5faa960d56472ce74bac791308d73b4046928`](https://github.com/manufact-test/ai-site-cms/commit/49f5faa960d56472ce74bac791308d73b4046928) — международные `hreflang` из HTML, HTTP `Link`, XML sitemap, согласованность и взаимные ссылки.
2. [`558b0a1d1f613f6d50e29467554cfb3fa6f432fe`](https://github.com/manufact-test/ai-site-cms/commit/558b0a1d1f613f6d50e29467554cfb3fa6f432fe) — граф внутренней достижимости реально отданных страниц в HTTP и трёх DOM, orphan/unreachable/mobile drift.
3. [`1317bc6403ed6f435bbb3af0bb44cb3179efa844`](https://github.com/manufact-test/ai-site-cms/commit/1317bc6403ed6f435bbb3af0bb44cb3179efa844) — дубли опубликованных title+description и основного текста между утверждёнными canonical-маршрутами.

## 2. Реализованные возможности — не строить повторно

- SEO Blueprint Engine: архитектура, контент/семантика, страницы, CTA, внутренние ссылки, Schema.org candidates, авторские и CMS-решения.
- Анализ Search Console Performance/Indexing, истории и SEO-задач с ручной двухэтапной проверкой исправлений.
- Crawl Policy, robots.txt, XML sitemap, redirects, индексируемость, post-public HTTPS/metadata/canonical и проверки опубликованной версии.
- Structured Data / JSON-LD: проверка исходного HTTPS и semantic delta после реального DOM-рендеринга.
- Безопасный opt-in Chromium-сбор трёх размеров; источник HTML и DOM связаны по SHA256, измеряются CSS-видимость, изображения, responsive UX, link/fragment, timing и текстовый footprint.
- Исторические полевые Core Web Vitals через предоставленный CrUX JSON, без подмены URL-данных origin-агрегатами.
- International hreflang HTML/HTTP/sitemap, публичный link graph, published content collisions.
- Один **приватный SEO Operator Workspace**, маршрутная матрица доказательств, First-Site Lead Readiness, контроль целостности приватных отчётов и ручная очередь.

Отчёты — **наблюдения и предложения для человека**, не Google Search Console-трафик, не удостоверение клиента и не разрешение на релиз. Нет автоматических исправлений, публикации или подтверждённой индексации. Клиентские HTML/DOM и исходные Google-экспорты хранятся **вне Git**.

## 3. Фактические проверки, без преувеличений

В последнем функциональном заходе **прошли 5 реальных offline Node smoke** на полноценном checkout:

```bash
node stage3/seo-engine/tests/seo-rendered-content-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-capture-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/seo-first-client-coverage-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
```

Chromium в тесте захвата **замокирован**; использовались синтетические HTML/данные, не настоящий браузер или клиент. Ранее на полном checkout проходили сосредоточенные Node smokes для `seo-hreflang`, `public-https-capture`, `structured-data` и смежных компонентов; точный журнал — [SEO-WORKER-HANDOFF-2026-10-30.md](SEO-WORKER-HANDOFF-2026-10-30.md). При переносе трёх коммитов дополнительно проверено **побайтовое совпадение деревьев Git**, а затем удалённый HEAD. **Не запускались:** GitHub Actions на новом SEO HEAD, настоящий Chromium, реальный клиентский HTTPS, Google API/GSC owner check, клиентская приёмка и деплой.

## 4. Что сделать главному интегратору дальше

1. **Интегрировать один раз** актуальный `stage3/seo-engine/**` из `feature/site-seo-engine` в свою `feature/stage3-ai-site-contract` с контролем diff/контрактов. Сам SEO-разработчик не делает cherry-pick, PR или merge за интегратора. После интеграции запустить 5 focused Node smoke выше и только требуемые соседние CI/контрактные проверки.
2. **Выбрать первый реальный клиентский сайт и получить разрешения:** утверждённые клиентом Blueprint, Site v1 и точную опубликованную версию; публичный HTTPS hostname/mount и доступ для read-only GET; отдельное разрешение на браузерный Chromium-сбор; при наличии — реальные Google property/CrUX/GSC экспорты. **Эти данные SEO-разработчику не предоставлялись. Ничего не выдумывать.**
3. **Выполнить имеющийся безопасный HTTP-сбор и сверку источников** по [PUBLIC-CAPTURE-QUICKSTART.md](PUBLIC-CAPTURE-QUICKSTART.md) и [FIRST-SITE-LEAD-QUICKSTART.md](FIRST-SITE-LEAD-QUICKSTART.md). Подтвердить тот же release, HTTPS TLS, canonical/robots/sitemap, root recheck, security/negative route, media и redirects. Не публиковать файлы кандидата автоматически.
4. **Chromium:** вначале запустить **только offline `--mode preflight`**, затем после отдельного разрешения выполнить [RENDERED-CAPTURE-PILOT.md](RENDERED-CAPTURE-PILOT.md) для всех одобренных маршрутов desktop/tablet/mobile. Частичный `--page-ids` сбор годится для отладки, но не доказывает полное покрытие. Отказ OS sandbox, несовпадение исходного HTML, изменяющийся DOM и заблокированные запросы — не зелёная проверка.
5. **Собрать один приватный Operator Workspace** с оригинальными `crawl.publicCapture`, `crawl.renderedCapture`, Blueprint/Site и опциональными подтверждёнными Google-данными по [SEO-OPERATOR-WORKSPACE.md](SEO-OPERATOR-WORKSPACE.md). Разобрать маршрутную матрицу, P0/P1 и все `unknown`; повторно проверить CSS, медиа, JSON-LD, hreflang, link graph, дубли контента и фактическую клиентскую навигацию.
6. **Ручная приёмка владельцем:** проверить смысл контента/фактов, меню, адаптивность, доступность, формы и реальную доставку разрешённых тестовых POST, если применимо. Выполнить [LIVE-ACCEPTANCE-WORKFLOW.md](LIVE-ACCEPTANCE-WORKFLOW.md), согласовать план отката. Устранение ошибок и подтверждение после исправлений — отдельно, на **той же одобренной версии**.
7. **Только после пилота** оценивать производственную SEO-готовность и необходимость точечных изменений. Решение о merge/production/rollback принимает **только главный интегратор совместно с владельцем**.

## 5. Честный статус завершённости

**Основная техническая реализация SEO Engine завершена на уровне готовности к интеграции и первому разрешённому пилоту.** Это **не** означает полностью законченный, испытанный на клиенте SEO-продукт. Незакрытые пункты — интеграция в основную ветку, реальные host/revision/Google/browser доказательства, проверка владельцем, устранение обнаруженных на пилоте проблем, повторная проверка и решение о выпуске.

**SEO-разработчику не следует делать второй dashboard, новые типовые сайты или бесконечно расширять синтетические анализаторы без клиентских находок.** Следующая наиболее полезная работа — помощь главному интегратору по конкретным P0/P1 после реального пилота, сохраняя автономную разработку только в `stage3/seo-engine/**`.

## 6. Что читать по деталям

- [INTEGRATION-HANDOFF.md](INTEGRATION-HANDOFF.md) — полная историческая передача и новые SEO-модули.
- [HREFLANG-PUBLIC-RENDERED-QA.md](HREFLANG-PUBLIC-RENDERED-QA.md) — международный SEO.
- [PUBLISHED-LINK-GRAPH-QA.md](PUBLISHED-LINK-GRAPH-QA.md) — фактическая внутренняя достижимость.
- [PUBLISHED-CONTENT-COLLISION-QA.md](PUBLISHED-CONTENT-COLLISION-QA.md) — опубликованные дубли.
- [FIRST-CLIENT-ROUTE-COVERAGE-QA.md](FIRST-CLIENT-ROUTE-COVERAGE-QA.md) — маршрутная матрица пилота.
- [RENDERED-CONTENT-QA.md](RENDERED-CONTENT-QA.md) и [RENDERED-CAPTURE-PILOT.md](RENDERED-CAPTURE-PILOT.md) — HTTP/DOM и Chromium.
- [FIRST-SITE-LEAD-QUICKSTART.md](FIRST-SITE-LEAD-QUICKSTART.md) — один owner-approved pilot, техническая и ручная приёмка.

**Новые коммиты документации будут иметь SHA новее `1317bc6…`. Перед интеграцией всегда читайте фактический GitHub HEAD ветки.**
