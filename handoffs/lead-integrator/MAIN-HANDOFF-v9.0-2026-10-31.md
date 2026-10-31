# MANUFACT AI Site CMS — главный интегратор / передача v9.0
**31 октября 2026 · интеграция SEO Engine в изолированную рабочую ветку**

## Откуда продолжать
- Рабочая ветка: `feature/stage3-ai-site-contract`. Проверять новый фактический HEAD и два Actions jobs (`contract`, `technology-runtime`) именно для этого SHA.
- Непосредственно перед интеграцией lead HEAD был `93d12f32e6e5ced93bb720fe743314eb91474f3a`; последний успешный Actions run: [41191483021](https://github.com/manufact-test/ai-site-cms/actions/runs/41191483021).
- Независимая SEO-ветка: `feature/site-seo-engine`, подтверждённый HEAD `244c7ab71796916f25313c3ebde385775665cc21`, каталог `stage3/seo-engine/**` tree SHA `29dfbb600ce2c459123e92d65727004ca89ff52e`.
- Из SEO-ветки импортирован **только** указанный каталог целиком (320 файлов, без редактирования исходных SEO-файлов). Не делать merge SEO-ветки целиком: у неё устаревшее состояние остальных Stage3 файлов. `main`/Hostinger/production не затронуты.
- В основной GitHub Actions workflow добавлена одна офлайновая проверка восьми ключевых SEO smoke вместе с существующими Stage3 контрактами; нет реального HTTPS/Chromium/GSC/POST обращения.

## Реальные проверки до GitHub-коммита
В изолированном Node 24 checkout успешно выполнены:

```bash
node stage3/seo-engine/tests/seo-hreflang-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-content-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-capture-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/seo-first-client-coverage-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
node stage3/seo-engine/tests/first-site-live-evidence-pipeline-smoke.cjs
node stage3/seo-engine/tests/public-https-capture-smoke.cjs
```

Это синтетические offline fixtures; Chromium mock, не клиентский сайт. После коммита обязательно проверить Actions на фактическом новом SHA и не объявлять зелёный CI заранее.

## Продуктовые границы
- Главный источник — `docs/MASTER-TZ.md`; один индивидуальный сайт из **трёх согласованных статичных изображений**, затем реальная реализация, manifest-bound editing, Save/Publish/Rollback. Не возвращать шаблонную Design Factory или вторую SEO/Studio систему.
- 135 MUST: 124 engineering candidates, 5 partial, 6 owner-environment gates; **0/135 лично приняты владельцем**. Импорт SEO и зелёный CI не меняют счёт.
- Оригинальные SEO/Google/client HTML/DOM/POST результаты и артефакты приватного пилота хранятся вне Git; запрещено выдумывать факт сбора.

## Первый реальный пилот — следующий приоритет
1. Получить от владельца утверждённые три макета, Blueprint/Site v1, точный HTTPS host и опубликованный revision/ZIP, согласованный read-only GET и отдельное разрешение на настоящий Chromium. Без них реальный аудит заблокирован.
2. Использовать готовые `stage3/seo-engine/FIRST-SITE-LEAD-QUICKSTART.md`, `PUBLIC-CAPTURE-QUICKSTART.md`, `RENDERED-CAPTURE-PILOT.md`, `SEO-OPERATOR-WORKSPACE.md`; не изобретать ещё один pipeline. Сначала локальная/публичная source-pin проверка, затем offline preflight и только разрешённый браузерный сбор.
3. Разобрать по одной route matrix реальные P0/P1, unknown, адаптивность, навигацию, формы с подтверждёнными тестовыми POST и фактической доставкой; исправить и проверить повторно ту же ревизию; решение GO только с владельцем.
4. Если материалы первого клиента ещё недоступны, продолжать **одну крупную функциональную вертикаль** существующей CMS по MASTER-TZ; не расширять SEO Engine синтетическими анализаторами без клиентских находок.

## Чего не было сделано
- Нет реального клиента/HTTPS/Google Search Console/Chromium evidence, визуального owner signoff, реальной формы или разрешённого production deploy.
- Нет merge с SEO-веткой и нет правок `main`.

Предыдущие документы v8.0–v8.2 сохраняют историю Form Graph; на 31 октября следующий большой блок Stage3 уже включает пакетную загрузку до 20 изображений, alt review, DnD и responsive image picker (см. конец ROADMAP). Перед новой работой получить актуальный SHA и читать новейшие части ROADMAP.

## Интеграционное исправление контракта Graph form-slot

При адаптации SEO Engine к **актуальной** основной ветке обнаружен настоящий пропуск: SEO-аудит формы и owner delivery readiness, wizard CSP/inline script и проверка статичного HTML учитывали лишь старые `lead-form`/`lead-form-flex` без `designGraph`. Между тем PHP publisher уже рендерит реальную подписанную форму через единственный типизированный `form-slot`. Это могло ложно занизить число обязательных POST/receipt проверок на первом сайте.

Исправлено одной общей детерминированной функцией `hasPublishedForm` в `stage3/seo-engine/lib/graph-authored.cjs`: обычная форма учитывается; Graph-форма учитывается **только при настоящем `form-slot`**; Graph без слота по-прежнему исключается. Пять потребителей сведены к одному определению в `php-local-forms`, `php-local-delivery-readiness`, `php-local-head` и `php-local-static-export`. Добавлены изолированные контракты для точных sectionId/formInstances, owner route, multi-step wizard и static collector. В старом SEO report delta исправлен runtime TypeError (пропущенный оператор конкатенации); устаревший loopback fixture обновлён под обязательный Site v1 `assets:[]`, текущие social meta и проверку полного HTML.

Локально прошли три дополнительные smoke: `php-html-capture-smoke.cjs`, `php-local-delivery-readiness-smoke.cjs`, `php-local-static-export-smoke.cjs`; они добавлены к существующим восьми в один offline CI step. Тесты **не отправляют реальный POST** и не доказывают доставку. Источник и публикация остаются неизменными; клиентский пилот по-прежнему требует разрешений и живых доказательств.

### Дополнительная точная совместимость PHP Graph

Реальный клиентский Graph может содержать семантическую вложенную `<section>` **перед** формой. Прежний SEO form-audit обрезал внешний блок первым встречным `</section>` и ложно сообщал, что форма не обнаружена. Теперь он использует уже существующий вложенно-безопасный `sectionById` из `php-local-components.cjs`; проверка единственности исходного sectionId и безопасного подписанного POST сохранена.

Также у актуального PHP DesignGraph таблицы могут иметь `rowHeaders:true`, где первая ячейка строки становится `<th scope="row">`. SEO `php-local-graph` теперь различает `scope="col"`, `scope="row"` и обычные `<td>` по исходным типизированным идентификаторам. Старый анализатор ошибочно требовал `<td>` для настоящего заголовка строки. Один существующий loopback smoke покрывает вложенную секцию, настоящую разметку заголовков и отрицательный тест неправильного `scope`.

Ни одна исправленная проверка не меняет сайт, клиентскую форму, данные или публикацию. Это интеграционная точность отчётов и ручного списка обязательных проверок; реальный пилот ещё требует approval и фактического содержимого.

## SEO Blueprint → authored Graph link parity

После импорта обнаружен ещё один настоящей продуктовый разрыв: старый SEO-анализ учитывал только `button.href` в Design Graph, хотя современный PHP/JS уже публикует `link`, кликабельные `image` и ссылки `runs[].href` внутри заголовков и текста. Это искажало до-публикационный граф внутренних ссылок, подсказки об orphan pages, содержательные SEO-решения и проверку устаревших URL после смены slug.

Теперь один `graph-authored.links()` со стабильными nodeId/fieldPath используется в `analyze.cjs`, `content-intelligence.cjs`, `route-migration.cjs` и разборе Graph CTA. Legacy `section.elements/items`, скрытые настоящим Graph, не считаются видимыми переходами. URL не переписываются и не применяются автоматически. Узкий `seo-graph-authored-links-smoke.cjs` добавлен к исходному Stage3 CI и локально прошёл.

Дополнительно адаптированы три устаревшие исключительно синтетические фикстуры старого SEO smoke (реальные PNG размеры, допустимые поля `seo.title/description`, корректная ссылка на HTML inspect). Существующий полный `node stage3/seo-engine/tests/smoke.cjs` теперь локально PASS без реальных хостов, POST или Google. Ни одно исправление не меняет опубликованный сайт или SEO источник внешнего разработчика — все правки интегратора находятся на собственной ветке. Реальный HTTPS/Chromium/client пилот ещё впереди.
