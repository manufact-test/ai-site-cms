# AI Site CMS — исследование open-source основы (этап 1, в работе)

**Дата:** 17.10.2026 · **Статус:** исследование начато; ни стек, ни fork, ни CMS не утверждены.

Основной документ с индивидуальной матрицей всех 135 обязательных требований: [FOUNDATION-COMPARISON.md](FOUNDATION-COMPARISON.md). Результаты исследовательских локальных тестов: [STAGE-1-TEST-LOG.md](STAGE-1-TEST-LOG.md). Главные бизнес/технические условия: [MASTER-TZ.md](MASTER-TZ.md) §1.4, [ROADMAP.md](ROADMAP.md) этап 1.

## Рамки поиска

- **Внутренний продукт** команды для админок клиентских сайтов, не публичная платформа для перепродажи. Внешний доступ клиентов возможен. **Используем хорошие готовые большие/малые модули, не переписываем искусственно**; права и обязательства определяются исходной лицензией конкретного кода.
- Лёгкий редактор **одного** блока по AI manifest, без ручного drag-and-drop создания страниц. Свойства только реально используемые; responsive, defaults, stable IDs, межверсионные overrides и конфликты.
- **Текущий PHP shared hosting** без апгрейда, отдельный Node-server для CMS не требуется. Браузерный редактор может собираться заранее. Next SSR отдельно от PHP-only backend.
- Публикация не равна сохранению черновика; публичный сайт автономен от панели.
- Полный release только после 135/135 обязательных, без MVP.

## Shortlist

| Направление | Кандидаты | Задача | Предварительная оценка |
|---|---|---|---|
| Framework-agnostic schema UI | [Jedison](https://github.com/germanbisurgi/jedison) (MIT, 1.27.1, 0 runtime/peer deps) | JSON Schema → HTML inputs без React; custom editors/events | **Реальный базовый A/B тест пройден в CI**; по custom/responsive полям и архитектуре кандидат ещё не принят |
| Готовый JS field editor | [JSON Forms](https://github.com/eclipsesource/jsonforms) (MIT), [RJSF](https://github.com/rjsf-team/react-jsonschema-form) (Apache-2.0) | Автоматически строить настройки из schema | **Первая исследовательская ветка** |
| Готовая оболочка редактора | [Puck](https://github.com/puckeditor/puck) (MIT) | Property UI, preview | Сравнить с полями без DnD, не брать целиком заранее |
| Visual editor primitives | [GrapesJS](https://github.com/GrapesJS/grapesjs) (BSD-3-Clause), [VvvebJs](https://github.com/givanz/VvvebJs) (Apache-2.0) | CSS-controls, selection, HTML preview | Только пригодные компоненты при отделимости от builder model |
| PHP API | [Slim](https://github.com/slimphp/Slim) (MIT), Symfony components | API/auth framework primitives | Проверить стоимость собственного revision engine |
| PHP CMS-backend | [Winter CMS](https://github.com/wintercms/winter) (MIT), [ProcessWire](https://github.com/processwire/processwire) (проверить по каждому файлу и сборке) | Auth/storage/pages/plugins | Резервный путь, оценить retrofit и 3rd party assets |
| JSON schema PHP | [Opis JSON Schema](https://github.com/opis/json-schema) (Apache-2.0) | Валидировать typed manifest на сервере | Сравнить JSON Schema dialect и безопасность |
| Тяжёлые CMS | [Microweber](https://github.com/microweber/microweber), [Grav](https://github.com/getgrav/grav), [Payload](https://github.com/payloadcms/payload) | Часть готового backend/editor | Вероятен лишний вес либо Node runtime |
| Более сложные лицензии | [Vvveb CMS](https://github.com/givanz/Vvveb) (AGPL), [Directus](https://github.com/directus/directus) (MSCL) | Кандидаты для исключения/анализа | **Не интегрировать по умолчанию** |
| React editor toolkit | [Craft.js](https://github.com/prevwong/craft.js) (MIT) | Контролы/редактор React | Слабее актуальность релизов; без преимущества над первыми кандидатами |

**Лицензия ≠ бренд на сайте:** permissive-компоненты обычно требуют технического текста об авторских правах и лицензии, а не вывода логотипа/ссылки посетителям. Изменение 30% кода не прекращает условия на сохранённые 70%. Лицензии конкретных встроенных assets/plugins проверяются отдельно.

## Исследовательские приоритеты

1. **Модули:** Jedison **или** JSON Forms/RJSF + PHP API + isolated iframe + versioned manifest. Jedison — новый первый кандидат за счёт vanilla JS и нулевых runtime-зависимостей; работоспособность ещё не доказана. Выбирать после фактической проверки.
2. **Альтернатива:** Puck editor shell + отдельный PHP backend; узнать, можно ли использовать редактор без React page-builder model.
3. **Альтернатива backend:** Winter CMS или ProcessWire + собственный block editor; оценить сложность адаптации.
4. **Идеи/компоненты UX:** GrapesJS/VvvebJs style controls; выбирать реализацию по лицензии и независимости.

**Ни один пункт не утверждает готовность или выбор стека.** Сравнение характеристик по репозиториям недостаточно, чтобы закрыть этап: нужны изолированные сопоставимые испытания, тестирование зависимостей, hosting и миграций overrides.

Последний checkpoint: [NEXT-CHAT.md](NEXT-CHAT.md).

## ADVANCED CHROMIUM CHECK — stage 1, 17.10.2026

Оригинальные Jedison/RJSF в [успешном тесте CI](https://github.com/manufact-test/ai-site-cms/actions/runs/39054829619) **оба** корректно редактировали вложенные \`desktop/tablet/mobile\`, \`shadow.blur\` и \`animation.duration\`, передавали изменение размера в один изолированный тестовый iframe, без автосохранения. Полный результат и ограничения [STAGE-1-TEST-LOG.md §8](STAGE-1-TEST-LOG.md).

**Это не окончательный выбор.** Дальше проверить реальные *пользовательские* контролы для CSS типов, безопасность и настоящий PHP-hosting. Лёгкость Jedison — лишь одна из важных характеристик; UX/поддерживаемость/валидаторы ещё не сопоставлены.


## Проверенный дополнительный стенд 17.10.2026

[CI #39055909594](https://github.com/manufact-test/ai-site-cms/actions/runs/39055909594) PASS: четыре настоящих кастомных Jedison-контрола, 16 PHP CLI проверок данных, sandbox/CSP + typed iframe messages, preview HTML/PHP CLI/React SSR и пять измерений лёгких редакторов (медиана первого input 46.5/63.1 мс для Jedison/RJSF после загрузки JS). Подробности — [STAGE-1-TEST-LOG.md](STAGE-1-TEST-LOG.md). **Не проверены настоящий shared-hosting, Next.js SSR, безопасный production API, полноценная PHP JSON Schema библиотека, тяжёлые реальные сайты и равнозначные custom RJSF контролы. Этап 1 и стек не утверждены.**


## Подтверждённое дополнение: RJSF widgets и PHP/client parity (17.10.2026)

[GitHub Actions #39057234158](https://github.com/manufact-test/ai-site-cms/actions/runs/39057234158) PASS: RJSF 6.11.0 повторил четыре собственных сложных Jedison-контрола (length, shadow, gradient, animation) с одинаковыми результатами. RJSF AJV8 после явной настройки Draft 2020-12 и PHP Opis 2.6.0 подтвердили согласованность 14/14 одинаковых fixtures каждый. Отрицательные промежуточные запуски раскрыли особенности nested field path в RJSF 6 и несовместимость AJV default с Draft 2020-12. Подробнее [STAGE-1-TEST-LOG.md §12](STAGE-1-TEST-LOG.md). Реальный shared-hosting и окончательный стек не проверены/не выбраны.


## Исследовательские проверки Hero, overrides и PHP HTTP (17.10.2026)

[CI #39058603992](https://github.com/manufact-test/ai-site-cms/actions/runs/39058603992) PASS: 14 алгоритмических проверок сохранения owner overrides и конфликтов миграции, настоящий Jedison с responsive Hero в одном iframe и PHP HTTP страница из published JSON без admin JS. Настоящий Hostinger shared hosting, тяжёлые production блоки и security не проверены. Подробнее [STAGE-1-TEST-LOG.md §13](STAGE-1-TEST-LOG.md). Этап 1 продолжается, стек не выбран.


## Обновление checkpoint v1.11 — PHP-only guarded publish, 17.10.2026

[CI #39059714864](https://github.com/manufact-test/ai-site-cms/actions/runs/39059714864) PASS: Opis 2.6.0 валидирует перед записью; PHP public renderer работает только с валидным published snapshot и fallback last-known-good (200 при повреждении current), при двойном повреждении fail-closed 503, доступен explicit rollback из history. 7 запрещённых кандидатов отклонены, 4 параллельных CLI writer отработали через flock. Это не тест реального Hostinger, не product publisher и не решение о стеке. Подробнее [STAGE-1-SNAPSHOT-PUBLISH-RESEARCH.md](STAGE-1-SNAPSHOT-PUBLISH-RESEARCH.md) и [STAGE-1-TEST-LOG.md §14](STAGE-1-TEST-LOG.md).


## Контрольная точка v1.12 — 4 renderer boundary + реальный RJSF (17.10.2026)

[Успешный GitHub Actions #39062360601](https://github.com/manufact-test/ai-site-cms/actions/runs/39062360601): сложная секция с 12 stable IDs собрана идентично для HTML, PHP CLI, React static render, Next.js static export; в каждом Chromium iframe RJSF 6.11.0 изменил CTA/feature/card и responsive tablet→mobile. 4/4 PASS. Это расширяет доказанное подмножество возможностей **обоих редакторов**, но не утверждает ни Jedison, ни RJSF и не тестирует React/Next.js SSR на текущем хостинге. Bridge в новом функциональном тесте bootstrapped через Playwright после srcdoc загрузки; production CSP/bootstrap остаётся открытым. См. [журнал §15](STAGE-1-TEST-LOG.md), [матрицу §12](FOUNDATION-COMPARISON.md) и [план безопасной проверки имеющегося хостинга](STAGE-1-HOSTING-SMOKE-PLAN.md). Этап 1 не принят; 135 обязательных требований не закрыты.


## checkpoint v1.13 — исправление iframe adapter bootstrap (17.10.2026)

[Полный CI #39064252770](https://github.com/manufact-test/ai-site-cms/actions/runs/39064252770) PASS: HTML/PHP CLI/React static/Next static export (по 12 ID) + реальный RJSF 6.11.0 теперь работают с нативным `iframe.srcdoc` bridge и CSP nonce **без внедрения JS через Playwright**; отдельно проверен запрещённый nonce mismatch. Первоначальные ошибки происходили из-за неполного `</section` исключительно в HTML-фикстуре. Добавлен fail-fast assert закрытия секции. Это доказательство ограниченного исследовательского подмножества, не production CSP и не финальный выбор Jedison/RJSF. [STAGE-1-TEST-LOG.md §16](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §13](FOUNDATION-COMPARISON.md).


## checkpoint v1.14 — matched 12-ID editor sessions (17.10.2026)

[Полный CI #39065084450](https://github.com/manufact-test/ai-site-cms/actions/runs/39065084450) PASS для **обоих** pinned open-source редакторов: Jedison 1.27.1 и RJSF 6.11.0 с 9 одинаковыми schema properties, 12 stable IDs и одним preview. В двух порядках сравнения по 16 mount/edit/unmount циклов и 656 модельных изменений на редактор, итоговые JSON идентичны, browser errors 0. Test entry gzip Jedison ~48.3 КБ, RJSF+React+AJV2020 ~190.9 КБ, но dependency coverage отличается; меньшая heap snapshot Jedison и меньшее scripted action wall time RJSF — только ограниченные CI наблюдения. **Ни один не выбран.** См. [STAGE-1-MATCHED-EDITOR-SESSIONS.md](STAGE-1-MATCHED-EDITOR-SESSIONS.md) и [STAGE-1-TEST-LOG.md §17](STAGE-1-TEST-LOG.md).


## checkpoint v1.15 — true composite widgets and media placeholders (17.10.2026)

[CI #39066085194](https://github.com/manufact-test/ai-site-cms/actions/runs/39066085194) полный PASS: Jedison 1.27.1 и RJSF 6.11.0 расширены собственными length/shadow/gradient/animation полями в одинаковой Draft2020 JSON Schema, по 2 полных mount/edit/unmount цикла и 9 правок каждому, выходной JSON идентичен, одна nonce-CSP iframe с 12 stable ID, 3 **фиктивные DOM/CSS media-placeholder** (НЕ actual медиа), hostile CSS отказ, published baseline не меняется, pageerrors 0. Это ограниченная исследовательская функциональность, стек НЕ выбран; подробности [STAGE-1-COMPOSITE-MEDIA-RESEARCH.md](STAGE-1-COMPOSITE-MEDIA-RESEARCH.md).


## checkpoint v1.16 — raw AI HTML boundary + mandatory evidence (17.10.2026)

[Полный CI #39067271214](https://github.com/manufact-test/ai-site-cms/actions/runs/39067271214) PASS: 20/20 adversarial HTML payload отклонены ограниченным Hero grammar/preflight (parse5 + DOM, ID/attribute allowlist), корректно escaped HTML text PASS, native opaque iframe script-src nonce CSP негативный контроль PASS, strict HTTP origin/source/token/shape postMessage и rogue frame negative sender PASS. Это только исследовательский fixture, не production sanitizer и не комплексный XSS аудит. Исходные [135 обязательных ID с evidence gaps](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md): 43 частично сопоставлены, 92 без предметной проверки, 0/135 принято как продукт. [Отчёт](STAGE-1-HTML-BOUNDARY-RESEARCH.md). Framework не утверждён.

