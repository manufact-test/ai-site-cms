# AI Site CMS — журнал исследовательских испытаний этапа 1

**Контрольная точка:** 17.10.2026 · **Этап:** 1, в работе, не принят.  
**ВАЖНО:** это не испытания CMS, а **изолированные исследовательские стенды**. Исходный код продукта не создавался, итоговый стек не выбирался. После первых макетов настоящие библиотеки Jedison/RJSF испытаны отдельно в GitHub Actions, см. §7.

## 1. Среда и ограничения

- Исследовательское окружение: Node.js v22.16.0, PHP CLI 8.4.24, Chromium headless 144.0.7559.96, Python Playwright.
- **Существующий Hostinger-сервер пользователя не тестировался**. Версия PHP, доступность MySQL/MariaDB, параметры rewrite, backup, Composer, CLI и ограничения Hostinger остаются неподтверждёнными.
- На локальном исследовательском хосте npm-зависимости **не устанавливались** из-за `EAI_AGAIN`, Composer CLI отсутствовал; **в отдельном GitHub Actions CI позднее успешно установлены и испытаны Jedison 1.27.1 и RJSF 6.11.0** (§7). JSON Forms/Puck не запускались.
- Chromium из этой среды запрещает открывать `file://` и `http://127.0.0.1` (`ERR_BLOCKED_BY_ADMINISTRATOR`); браузерный документ передан через Playwright `page.set_content`, iframe создавался через `srcdoc`. Это ограничивает интерпретацию результатов.
- Макеты локальные в рабочей среде теста и **не включены в GitHub как продуктовый код**. Ни одного изменения в репозиториях клиентских сайтов.

## 2. Проверка A: контракт/миграции/состояния — Node.js, 10/10

Небольшой написанный **только для исследования** скрипт использовал Node `assert/strict`, без сторонних зависимостей; два блока (`hero-title`, `hero-bg`), три пользовательских overrides, несколько версий схемы. Не использовались JSON Forms, RJSF или Jedison.

| № | Проверяемый сценарий | Фактический результат |
|---|---|---|
| 1 | Отображаются только четыре зарегистрированных свойства, отсутствует `borderRadius` | PASS |
| 2 | v1→v2: исходный desktop `fontSize` 64→52 px; ручной override 68 px сохраняется | PASS |
| 3 | v1→v2: пользовательский текст сохраняется отдельно от code defaults | PASS |
| 4 | v1→v3: `fontSize` удалён из схемы; значение 68px сохранено в карантине конфликтов; публикация заблокирована | PASS |
| 5 | v1→v4: тип `fontSize` заменён с `length` на `enum`; конфликт блокирует публикацию | PASS |
| 6 | v1→v5: ID элемента переименован; две затронутые ручные настройки не потеряны, публикация заблокирована | PASS |
| 7 | Дублирование stable element ID обнаруживается | PASS |
| 8 | Изменения черновика не меняют отдельный published snapshot | PASS |
| 9 | Мобильное значение наследует desktop или переопределяется явно | PASS |
| 10 | Незарегистрированное свойство `behavior.eval` не попадает в допустимую схему полей | PASS |

**Честное ограничение:** это проверки **гипотетической алгоритмической модели**, не миграции готовой библиотеки или CMS. Не покрывают частичные конфликты, перенос значений по миграционным правилам, JSON Schema draft, транзакционность БД, конкурентную запись, Undo и восстановление из backup. Для дизайна миграций наиболее важен принцип «не уничтожать осиротевшее override при несовместимости».

## 3. Проверка B: изоляция одного блока — Chromium / Playwright

Исследовательский HTML с индексом **50 метазаписей секций**, одним iframe `sandbox="allow-scripts"` для тестового Hero и тремя обычными полями (text/color/size). Это **рукописные поля**, не генерация через сторонний schema editor.

- Метаданные 50 блоков существуют; в DOM **ровно 1 iframe** — PASS.
- Изменение текста через `input` отправлено в изолированный iframe и получено подтверждение `APPLIED` — PASS.
- Состояние помечено `dirty=true`, но `saved=false`: live preview не равен автосохранению — PASS.
- Попытка передать незарегистрированный `behavior.executeScript` не вызвала `APPLIED` — PASS.
- Ошибок выполнения JS Playwright не увидел; **это не security audit**.

**Недостаточно доказано:** быстрый монтаж реального тяжёлого блока с видео/3D, отзывчивость в миллисекундах, FPS, рамки памяти, браузерные политики CSP, безопасный `postMessage`. В макете есть `postMessage(...,'*')` и inline-JS **только как исследовательское упрощение; НЕДОПУСТИМО считать это безопасным production-контрактом**. Не доказана безопасность HTML в iframe; нужны проверка `event.source`, строгая проверка типа/формата, ограничение сообщений и подходящая изоляция origin.

## 4. Проверка C: независимость публичной PHP-страницы

Запущены **локальный PHP built-in webserver** со страницей, читающей отдельный опубликованный JSON-файл, и отдельный заглушечный HTTP-сервис админки. После успешного доступа к обоим сервисам сервис админки остановлен; PHP-страница **продолжила отвечать тем же published heading**.

**PASS:** техническая возможность читать публикационный snapshot независимо от доступности процесса админки в этом простом сценарии.

**Не подтверждает:** поведение реального Hostinger, независимую работу PHP-сайта при остановке PHP runtime/БД, поддержку Next SSR, atomic publication, безопасную публикацию в файл, раздельность БД и backend аутентификацию. Никакие user data/секреты не использованы.

## 5. Новый перспективный кандидат: Jedison (добавлен после первой волны)

[Jedison](https://github.com/germanbisurgi/jedison) — отдельная открытая реализация schema-driven HTML-форм **на обычном JavaScript, без требования React**. Проверено напрямую по GitHub 17.10.2026:

- `package.json`: версия **1.27.1**, **MIT**, `dependencies: {}`, `peerDependencies: {}`, export `./browser` → `dist/umd/jedison.umd.js`.
- Последний GitHub release **v1.27.1, 15.10.2026**; push 15.10.2026.
- Список файлов GitHub показывает готовую browser UMD-сборку **256 132 bytes без сжатия**. Это **размер отдельного файла в репозитории**, не фактический network transfer, gzip, resident RAM или стоимость адаптации.
- Исходники: `src/jedison.js` предусматривает `customEditors`, события `change`, `getValue()`, `setValue()`, `destroy()` и `keepMissingSchemaFields`. Реальную работу API в браузере **ещё не проверяли**.
- Конкретное ограничение: `keepMissingSchemaFields: false` по умолчанию требует отдельного анализа — наша панель должна показывать *все зарегистрированные используемые свойства*, а не скрывать нужные отсутствующие значения.
- [@json-editor/json-editor](https://github.com/json-editor/json-editor) (MIT), похожий проект, сейчас в **maintenance mode** и в README рекомендует Jedison для новых разработок; не путать с [josdejong/jsoneditor](https://github.com/josdejong/jsoneditor) (редактор самого JSON, а не форма свойств).

**Новый порядок сравнительных тестов редактора (не выбор технологии):** (1) Jedison как vanilla JS без runtime deps, (2) JSON Forms или RJSF для schema UI, (3) Puck как интегрированная оболочка; GrapesJS — справочный источник control UX, Winter — альтернативный backend.

## 6. Что требуется до приёмки этапа 1

1. **Реальный запуск оригинального кода** Jedison и хотя бы одного конкурента RJSF/JSON Forms на одинаковом Hero-манифесте (с собственными editors для `length`, `shadow`, `responsive`, `animation`). В этом окружении заблокирована загрузка npm; не объявлять такой тест проведённым.
2. **Одинаковая нагрузочная проверка** реальных библиотек: uncompressed/gzip bundle, время открытия одного Hero, потребление памяти, 50 секций только в метаиндексе, cleanup iframe.
3. **PHP-hosting smoke-test** на отдельной разрешённой пустой установке с текущим тарифом, без расширений: PHP/MySQL/version, security, update/rollback, installer.
4. Проверить отдельно server-side schema validation, auth, защита конфликта двух редакторов и миграции. Нельзя объявлять 135 требований реализованными из-за 10 успешных тестов алгоритма.
5. Аудит реальных **зафиксированных версий и вложенных лицензий** тех частей чужого кода, которые будем использовать (MIT/BSD/Apache приоритет); не использовать GPL/AGPL автоматически.

**Вывод на момент первых локальных стендов (до §7):** Три локальных сценария работоспособны, сторонние редакторы тогда не запускались. **Последующее подтверждение реального запуска Jedison/RJSF — §7**. Реальный хостинг не проверен, архитектура не утверждена. На основании документов и src-source Jedison стал самым интересным *кандидатом для первой проверки* за счёт framework-agnostic API и отсутствия прямых runtime dependencies. Это **не окончательный выбор**.

Связанные документы: [FOUNDATION-COMPARISON.md](FOUNDATION-COMPARISON.md), [FOUNDATIONS.md](FOUNDATIONS.md), [NEXT-CHAT.md](NEXT-CHAT.md).

## 7. Реальный upstream A/B test: Jedison 1.27.1 vs RJSF 6.11.0

**Дата:** 17.10.2026; **условия:** отдельная ветка [`research/stage1-editor-comparison`](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison), изолированный GitHub Actions runner Ubuntu 24.04, Node 22.23.3, npm 10.9.9. Источники — фактически установленные пакеты из npm (зафиксированные точные версии), **не имитации API**. **Успешный прогон:** [Actions #39054261780](https://github.com/manufact-test/ai-site-cms/actions/runs/39054261780). Код исследовательского стенда только в ветке `research/`, не в `main`, не является исходниками CMS.

### 7.1. Схема эксперимента

Одинаковая JSON Schema для отдельного Hero: `headline` (string), `fontSize` (integer 12–120), `color` (string hex), `showBadge` (boolean). Исходные значения заданы, незарегистрированное поле `borderRadius` отсутствует.

1. **Jedison:** реальный `new Jedison.Create({container, theme, schema, data, keepMissingSchemaFields:true})` в jsdom — создан UI, `getValue()/setValue()` сохранили все четыре значения. В Chromium поле заголовка изменено пользователем через `fill` + DOM `change`/blur, `getValue().headline` вернул `Browser edit`.
2. **RJSF:** реально установлен `@rjsf/core` + `@rjsf/validator-ajv8`, React19. Сформирован HTML формы через `renderToStaticMarkup` со всеми четырьмя полями; Chromium отрисовал клиентскую форму и после ввода в поле `onChange.formData.headline` вернул `Browser edit`.
3. **Bundle test:** `esbuild 0.25.12`, `bundle=true`, `minify=true`, browser IIFE, target `chrome120`, gzip level 9. Сравнивались точечные тестовые JS entrypoints, не вся будущая админка.

### 7.2. Подтверждённые фактические числа

| Показатель | Jedison | RJSF + AJV8 validator |
|---|---:|---:|
| Исследовательский entry import, minified | **253 935 bytes** | **394 917 bytes** |
| Тот же entry import, gzip | **48 287 bytes** | **130 517 bytes** |
| Полная тестовая Chromium entry (включая mounting code), minified | **254 064 bytes** | **580 804 bytes** |
| Та же Chromium entry, gzip | **48 345 bytes** | **187 930 bytes** |
| Ввод заголовка через Chromium | **PASS** | **PASS** |
| Сквозные пользовательские настройки цвета/адаптива/animations | Не проверены | Не проверены |

**Оговорка о сопоставимости:** RJSF требует React/ReactDOM + validator в проверенной браузерной entry; Jedison уже содержит большую часть поведения. Эти bundle-числа репрезентативны для заданных imports, **но не являются прямым прогнозом размера AI Site CMS**, реальных загрузок с cache/CDN, fps или задержки редактирования. Исходная Jedison CJS поставка отдельно измерена: **255 930 bytes raw / 47 738 bytes gzip**.

**Наблюдение по событиям:** в первом Chromium-прогоне `page.fill()` без `change`/blur **не привёл к ожидаемому изменению Jedison-модели в пределах тестового ожидания**. После `dispatchEvent('change')` и blur — PASS. Событийная семантика зависит от поля и типа редактора; для live preview нужно протестировать `showErrors:'input'` и последующую корректность значения. Это **не доказанный баг Jedison**, а установленная интеграционная особенность базовой конфигурации.

**Boolean rendering:** в Jedison `showBadge` может быть select вместо input-checkbox (его исходный `EditorBooleanSelect` использует select), поэтому число элементов `input` **нельзя** использовать как доказательство отсутствия поля. Проверку доступности и управления всеми четырьмя типами сделаем отдельно.

### 7.3. Реально выполнено vs ещё неизвестно

**Проверено:** настоящие пакеты установились на CI; schema-controlled field rendering, пользовательский ввод заголовка через Chromium, передача данных через API/callback, воспроизводимая минимизированная браузерная сборка; по этому сценарию Jedison заметно компактнее. Репозиторий проекта и production не затронуты.

**Не проверено:** кастомные editors для `length/shadow/background/animation`, desktop/tablet/mobile inheritance и optional+required behaviour, достаточно ли гибок UX Jedison, CSP, предотвращение XSS, iframe bridge, сохранение drafts и публикация, dual editor locking, реальные 50 тяжёлых секций, быстродействие в ms/FPS/RAM на устройстве, хостинг Hostinger, безопасность и восстановление. **Стек пока НЕ выбран, этап 1 НЕ принят.**

**Следующее разумное испытание:** один и тот же вложенный responsive field с `desktop/tablet/mobile`, custom typed UI для `length` и `shadow`, отключение неиспользуемых property groups, live preview с commit only on Save; затем PHP/shared hosting smoke test в разрешённом изолированном окружении.

## 8. Последний проход: вложенный responsive / shadow / animation / preview в настоящем Chromium — 17.10.2026

**Зафиксированный успешный GitHub Actions запуск:** [#39054829619](https://github.com/manufact-test/ai-site-cms/actions/runs/39054829619), изолированная исследовательская ветка [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison); запускаемый тест: [research/stage1/advanced.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/advanced.cjs). Настоящие \`jedison@1.27.1\` и \`@rjsf/core@6.11.0\` + validator AJV8 проверены в **headless Google Chrome**. Это **не код AI Site CMS**, не публичный релиз и не развертывание клиента.

**Единая тестовая JSON Schema:** объект Hero с \`title\`, вложенными \`responsive.desktop/tablet/mobile\` (строковый \`length\`, pattern на \`px\`), \`shadow.{x,y,blur,color}\`, \`animation.{enabled,duration,easing}\`. Тест использует **штатные поля JSON Schema**, **не собственный custom control** для CSS shadow/animation. До ввода: desktop \`64px\`, tablet \`48px\`, mobile \`36px\`, blur \`10\`, duration \`400\`.

| Реальный Chromium тест | Jedison | RJSF |
|---|---|---|
| Редактирование responsive desktop: \`64px → 58px\` через UI | PASS | PASS |
| Tablet \`48px\` и mobile \`36px\` не затронуты | PASS | PASS |
| Shadow blur \`10 → 18\` через UI | PASS | PASS |
| Animation duration \`400 → 650\` через UI | PASS | PASS |
| 50 метаданных секций, только **один** iframe в DOM | PASS | PASS |
| Изменение desktop передано в iframe, получено подтверждение \`58px\` | PASS | PASS |
| Нет постороннего borderRadius в панели по отсутствующему свойству | PASS | PASS |
| Тестовый флаг dirty меняется; saved остаётся false, published heading не изменён | PASS | PASS |
| Ошибки выполнения JS в browser \`pageerror\` | 0 | 0 |
| Количество input DOM элементов (типовые поля) | 10 | 10 |

**Важные технические оговорки:** система создала одно iframe с \`sandbox="allow-scripts"\` и \`srcdoc\`, но это **исследовательский упрощённый bridge**, а не безопасная production-схема: использованы \`postMessage(..., "*")\` и фиксированный nonce; parent проверял \`event.source\` и nonce. Перед реальным использованием нужна согласованная изоляция origins, строгая проверка протокола и типов сообщений/URL, корректный CSP и защита от XSS. \`iframe\` не обслуживал реальную PHP/React секцию, не загружал внешние ресурсы, не проверял видео/3D. Тест не измерял время открытия, FPS, память или сумму JS/CSS/HTML всей CMS.

**Технический результат:** обе библиотеки поддерживают в тестовом сценарии вложенные typed JSON Schema поля и передачу значений во внешнее preview. Jedison по-прежнему предпочтителен по предварительной простоте и замеренной ранее стоимости JS entry, **но окончательно не выбран**.

**Для завершения этапа 1 остаётся:** (1) реальный custom field renderer (\`length\` с единицами, композитная тень/градиент, анимационный объект), (2) проверки недопустимых значений на server-side, (3) проверка работы preview с реальными HTML/PHP/React-разработками и изоляцией, (4) hosting smoke test на текущем PHP shared hosting без расширения, (5) безопасность/производительность/зависимости, итоговый вывод и согласование владельца. **Этап 1 в работе; этап 2 не открыт.**


## 9. Новая серия реальных браузерных/PHP проверок — 17.10.2026

**Подтверждённый полный запуск:** [GitHub Actions #39055909594](https://github.com/manufact-test/ai-site-cms/actions/runs/39055909594), ветка [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison). Предыдущие успешные промежуточные CI: #39055561627 (кастомные контролы), #39055701112 (изоляция и PHP), #39055820132 (производительность). Всё — исключительно исследовательский код; main остаётся без исходников CMS.

### 9.1. Настоящие customEditors Jedison 1.27.1

Сценарий [custom-widgets.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/custom-widgets.cjs) зарегистрировал классы, расширяющие оригинальные Jedison.EditorStringInput и Jedison.EditorObject. Через UI headless Chrome проверены:
- length: изменение числа и единицы с 64px на 72rem — PASS;
- shadow: blur 10→25 и color #112233→#abcdef, исходные x/y сохранены — PASS;
- gradient: angle 45→120, from #112233→#aabbcc, цвет to сохранён — PASS;
- animation: enabled true→false, duration 400→850, easing ease→linear — PASS;
- структуры JSON не разрушены, отсутствующее borderRadius не появилось, ошибок pageerror 0 — PASS.

Этот UI — иллюстративный стенд, не утверждённое оформление. У него нет тестов дробных единиц, responsive override inheritance, Undo, реального сохранения и равнозначной RJSF custom UI-реализации. Стек НЕ выбран.

### 9.2. PHP typed validation

[php-validation-smoke.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/php-validation-smoke.php) успешно выполнен на PHP **8.3.6 CLI** в GitHub Actions. Без Composer, без Node runtime на PHP-стороне. Проведено **16 случаев**: 2 корректных приняты, 14 некорректных отвергнуты, включая CSS injection, HTML injection, запрещённую единицу, отрицательную длину и blur, недопустимые цвета/диапазоны, строку вместо числа, лишние вложенные и корневые свойства, отсутствие поля, неверный JSON и превышение глубины JSON. PASS. Это специально написанный ограниченный валидатор 4 типов, НЕ полноценная JSON Schema-совместимость и НЕ испытание Hostinger.

### 9.3. Безопасность и три формата предпросмотра

[secure-preview.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/secure-preview.cjs): Chrome подтвердил opaque origin = null iframe без allow-same-origin, запрет доступа к parent DOM, запрет сетевого запроса дочерней CSP, подтверждённый 58px, отказ фальшивым сообщениям и значениям не из allowlist. PASS.

[multirender.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/multirender.cjs): подтверждён рендер и стилевой ack 58px в одном iframe для (1) статического HTML, (2) HTML-строки, полученной реальным PHP CLI, (3) ReactDOMServer SSR HTML. Все 3 PASS. Это не настоящие размещённые сайты, не Next.js SSR, не production origins; multi-render harness использует упрощённый статический token, неприемлемый для продукта. Изоляция preview и CSP требуют отдельного production-аудита; postMessage к opaque iframe использует targetOrigin=* с отдельными строгими проверками.

### 9.4. Диагностические замеры в Chrome

[performance.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/performance.cjs): пять повторов на каждом оригинальном редакторе, 50 лёгких записей в индексе, 1 iframe, маленькая форма 3 input. JS загружен ДО начала таймера (время загрузки бандла НЕ учитывается).

| Результат run #39055909594 | Jedison | RJSF |
|---|---:|---:|
| Время до появления input, пять замеров, мс | 35.3, 46.5, 58.1, 68.3, 43.7 | 73.7, 51.0, 72.6, 52.6, 63.1 |
| Медиана, мс | 46.5 | 63.1 |
| gzip тестового браузерного entry, байт | 48 331 | 187 917 |
| JS heap sample, приблизительно, MB | 4.5 | 8.5 |

Нельзя считать это полноценным benchmark: CI runner нестабилен, React и vanilla отличаются, не было сети и загрузки JS внутри таймера, сложного контента, heavy-video/3D, 50 реально смонтированных блоков, долгих сессий и измерения полного RAM. Performance budget НЕ утверждён. Объём JS entry также не означает размер готовой CMS.

## 10. Оставшиеся исследования, запреты на досрочное закрытие

1. На том же JSON Schema проверить реальный PHP validator (например, Opis, если совместим по лицензии/среде), условные и составные типы, unknown fields, URLs/uploads, защиту API, версии схем.
2. Испытать **именно текущий shared hosting** с реальными версиями PHP/ext, правами файлов, URL routing, uploads/DB, без его расширения. GitHub Actions PHP CLI этого не заменяет.
3. Испытать реальные HTML/PHP/React/Next.js секции (не только отрендеренные строки), CSP/origin, XSS/CSRF, media, коммуникации, publish, откат, сохранение overrides.
4. Сопоставимые кастомные редакторы RJSF, качественный UX, доступность, inheritance, сложные элементы, долгие сессии и реалистичная нагрузка.
5. Контроль лицензий/third-party assets, сопровождения, миграций и итоговое сравнение всей матрицы 135 обязательных требований.

**Этап 1 выполняется, не принят; этап 2 не начат; окончательный стек не утверждён.**


## 11. Реальный upstream PHP JSON Schema валидатор Opis 2.6.0 — 17.10.2026

**Успешный GitHub Actions [#39056405362](https://github.com/manufact-test/ai-site-cms/actions/runs/39056405362)** на PHP 8.3.6 CLI и Composer 2.10.3. Репозиторий исследования содержит [composer.json](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/composer.json), [typed-manifest.schema.json](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/typed-manifest.schema.json), [opis-schema-smoke.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/opis-schema-smoke.php).

- Установлен настоящий upstream пакет opis/json-schema версии **2.6.0**, лицензия **Apache-2.0** (официальные composer metadata), поддержка PHP 7.4+/8; дополнительно его транзитивные зависимости opis/string и opis/uri.
- Тот же набор typed fields fontSize/shadow/gradient/animation формализован в JSON Schema Draft 2020-12.
- Реальный Opis CompliantValidator принял 2 корректных JSON-объекта, отверг 14 некорректных схемно (unit, regex, extra/missing properties, type, ranges, enum), ещё 2 malformed/depth JSON отклонены парсером (всего 18 основных случаев).
- 4 дополнительные проверки conditional/array: static без frames принимается, animated без frames отклоняется, корректный frames array принимается, превышение maxItems отклоняется. PASS.

**Что НЕ доказано:** совместимость со всеми возможными манифестами, полная сходимость диалектов браузера и PHP, безопасная доставка schema, отладка доступов/CSRF, реальные Hostinger PHP/ext/ограничения, полная производительность и нагрузка, пакетирование vendor без Composer на хостинге. Composer выполнялся на CI-раннере, не на рабочем shared hosting; composer.lock в исследовательскую ветку пока не зафиксирован, транзитивные версии на разных запусках могут различаться. Перед продуктовым использованием зафиксировать проверенные зависимости/NOTICE и отдельный аудит.

**Промежуточный вывод:** Opis — сильный доказанный кандидат серверной схемной валидации, но пока не выбран как окончательная библиотека CMS. Этап 1 открыт.


## 12. RJSF custom controls and browser/server JSON Schema parity — 17.10.2026 (checkpoint v1.9)

**Последний подтверждённый PASS:** [GitHub Actions #39057234158](https://github.com/manufact-test/ai-site-cms/actions/runs/39057234158) на отдельной ветке [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison).

Реальный RJSF 6.11.0 (ui:widget для length, ui:field для составных объектов) теперь через Chrome PASS тех же собственных редакторов, что Jedison 1.27.1: fontSize 64px → 72rem, shadow blur 10 → 25 и color #112233 → #abcdef, gradient angle 45 → 120 и from → #aabbcc, animation enabled true → false, duration 400 → 850, easing ease → linear. Оба выдали одинаковый typed JSON, сохранили остальные параметры, не добавили borderRadius, ошибок pageerror 0. Это не готовый UI, а равнозначный исследовательский стенд.

**Отрицательные контрольные запуски (сохранить как изученные ошибки):**
- [#39056526064](https://github.com/manufact-test/ai-site-cms/actions/runs/39056526064) и [#39056622168](https://github.com/manufact-test/ai-site-cms/actions/runs/39056622168) — nested RJSF field сообщал объект без пути; данные ошибочно попадали в корень. Исправление: onChange(value, fieldPathId.path) по реальному API RJSF 6, [#39056922334](https://github.com/manufact-test/ai-site-cms/actions/runs/39056922334) PASS.
- [#39057088160](https://github.com/manufact-test/ai-site-cms/actions/runs/39057088160) — default RJSF AJV8 validator не распознал JSON Schema Draft 2020-12. Исправление в сравнительном тесте: штатный customizeValidator({AjvClass: Ajv2020}), pinned ajv@8.20.0.

**Новая совместимая schema validation:** один и тот же typed-manifest.schema.json Draft 2020-12 и 14 fixtures (3 корректных, 11 некорректных) прошли через RJSF validator-ajv8 6.11.0 с Ajv2020 и реальный PHP Opis 2.6.0. Результат — **14/14 одинаковых ожидаемых результатов с каждой стороны**, [#39057234158](https://github.com/manufact-test/ai-site-cms/actions/runs/39057234158). Некорректные случаи: опасные CSS-выражения, запрещённые единицы, отрицательные значения, ошибочный hex, некорректный angle/easing, неверные типы, лишние и отсутствующие свойства. Исходники:
- [rjsf-custom.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/rjsf-custom.cjs)
- [schema-parity-fixtures.json](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/schema-parity-fixtures.json)
- [schema-parity.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/schema-parity.cjs)
- [schema-parity.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/schema-parity.php)

**Границы:** доказана согласованность лишь проверенного подмножества JSON Schema, не всей Draft 2020-12. Производственная XSS/CSRF защита, хостинг Hostinger, URL/media, продвинутая CSS-вёрстка, адаптивное inheritance, сложные HTML/PHP/React/Next проекты, реальные нагрузка, сохранение и откат ещё не приняты. Этап 1 in_progress, стек не утверждён, этап 2 не начат; ни одно из 135 обязательных требований не помечать завершённым на основании исследований.


## 13. Эволюция overrides, реалистичный Hero и PHP HTTP preview — 17.10.2026 (checkpoint v1.10)

**Полный успешный запуск:** [Actions #39058603992](https://github.com/manufact-test/ai-site-cms/actions/runs/39058603992). Код — исключительно исследовательская ветка [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison), не CMS и не production.

### 13.1. Owner overrides и ревизии (проверки в памяти)

[override-evolution.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/override-evolution.cjs) — 14 именованных сценариев PASS. Проверено: inheritance desktop→tablet→mobile; отдельные overrides на стабильном ID элемента; возврат к наследованию при очистке mobile override; draft/live/published не смешиваются; AI v1→v2 меняет базовые значения без затрагивания ручных текста и размера; удалённое поле и сужение диапазона вызывают конфликты (2 rejected update), а опубликованное значение остаётся прежним; отклонение CSS injection, неизвестных полей/breakpoints; точный rollback к первой из двух published-ревизий.

**Это алгоритмический стенд в памяти, НЕ БД, транзакции, версии сайта, real code migrations или CMS.** Тесты не свидетельствуют о завершении обязательных требований.

### 13.2. Настоящий Jedison + составная адаптивная Hero

[representative-hero.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/representative-hero.cjs): реальный Jedison 1.27.1 менял поля одной HTML/CSS Hero-секции с карточками, CTA, адаптивной сеткой, градиентом и типографикой в sandbox iframe без внешних запросов. В DOM 50 записей каталога и 1 iframe. В настоящем Chromium PASS: desktop 64px, tablet UI 48px→52px, mobile при пустом поле наследует tablet 52px, затем mobile override 32px. CSS mobile-компоновка перешла в одну колонку; HTML-подобный текст с onerror стал текстом, не элементом img; published title не менялся при live-редактировании; JS pageerrors 0.

**Ошибка исследований:** два промежуточных CI [#39058137775](https://github.com/manufact-test/ai-site-cms/actions/runs/39058137775) и [#39058260391](https://github.com/manufact-test/ai-site-cms/actions/runs/39058260391) — FAIL из-за переходного CSS font-size: iframe подтверждал присваивание 64px, но getComputedStyle() не показывал финальный размер (offscreen frame/transition). Исследовательский тест адаптива изменён: viewport прокручивается к iframe, CSS transition исключена из этого конкретного теста. [#39058376654](https://github.com/manufact-test/ai-site-cms/actions/runs/39058376654) PASS. Ack CSS assignment ≠ завершение CSS-анимации; настоящие анимации проверить отдельно.

Ограничения: искусственный насыщенный Hero, НЕ рабочий клиентский сайт, не heavy video/3D/remote resources, не равнозначная вторая RJSF-Hero реализация, не полный UX.

### 13.3. PHP HTTP-public snapshot без CMS runtime

[public-runtime/index.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/index.php) и [public-runtime.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime.cjs): PHP 8.3.6 CLI встроенный HTTP-сервер на GitHub runner. Только публичный JSON snapshot вне document root, без Node/admin на PHP-стороне. PASS: GET 200, /admin 404, POST 405; замена published JSON отражается в следующем GET; HTML-подобный текст безопасно экранирован; напрямую подменённый неверным CSS snapshot отклоняется 503; возврат прежнего JSON восстанавливает исходный Hero с HTTP 200; в публичном HTML нет script/Jedison/RJSF.

**Не доказано:** работа именно на Hostinger/shared hosting, реальный FPM/Apache, MySQL, права файлов, upload, SEO, Node SSR. 503 при повреждении snapshot — fail closed, но для полной отказоустойчивости потребуется проверка до атомарного publish и last-known-good с безопасным восстановлением. Не следует показывать результат как законченную CMS.

### 13.4. Невыполненное и дальнейшие проверки

Реальная PHP shared-hosting среда, настоящие тяжёлые HTML/PHP/React/Next секции, реальные публичные источники данных/версии в БД, конкурирующие администраторы, CSP/XSS/CSRF/API auth, media/uploads, long-session performance и полные условия лицензий остаются открытыми. **Этап 1 в работе; стек не выбран; этап 2 не открыт; 135 обязательных требований не приняты.**


## 14. Fail-safe PHP snapshot publication / last-known-good / rollback — checkpoint v1.11 (17.10.2026)

**Подтверждён полный PASS:** [GitHub Actions #39059714864](https://github.com/manufact-test/ai-site-cms/actions/runs/39059714864), research branch [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison). Этот запуск вновь исполнил прежние исследования редакторов, Opis/AJV, responsive Hero и старую PHP HTTP-проверку. Новый фрагмент проверяет **PHP-only публикацию только в экспериментальном окружении CI**, НЕ продукт.

**Новые исходники:** [published-hero.schema.json](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/published-hero.schema.json), [snapshot-store.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/snapshot-store.php), [publish-cli.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/publish-cli.php), [publish-rollback.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/publish-rollback.cjs); изменён исследовательский public-runtime/index.php и тестовый workflow.

**Что проходит в реальном PHP 8.3.6 CLI / HTTP с Opis 2.6.0:**
1. Publisher CLI предварительно валидирует кандидат настоящим Opis JSON Schema Draft 2020-12 и отдельным ограниченным PHP reader-validator; семь hostile/некорректных вариантов не меняют текущую опубликованную ревизию и резервную копию (CSS expression, посторонние поля, неверный тип, 501 ASCII, 501 Unicode, сломанный JSON, oversize файл). Unicode 500 символов проходит.
2. Файлы current.json, last-good.json и отдельные immutable revision files хранятся **вне document root** test runner, запись через temp+rename внутри одной файловой системы; CLI-писатели синхронизируются advisory flock.
3. При внешнем повреждении current.json HTTP **200** с содержимым валидного last-good.json; publish поверх повреждённого current запрещён, recovery через явный rollback на валидную историю.
4. При одновременной порче current и last-good HTTP **503 fail closed**, восстановление валидной ревизией возвращает HTTP 200.
5. Попытка path traversal в ID ревизии отвергнута; 4 параллельных CLI publish завершены с успехом, файлы указателей и 10 созданных к тому моменту исторических ревизий корректны. Итоговый rollback создаёт ещё одну, всего 11 ревизий за сценарий. Не доказательство отсутствия гонок в production.
6. HTML-подобные строки экранируются; публичная страница работает без React/Jedison/RJSF, Node и серверной админки; GET /admin=404 и POST /=405.
7. Ранее существовавший smoke public-runtime.cjs также PASS, теперь ответ на отсутствие валидной копии — 503 с телом No valid published snapshot.

**Зафиксирован промежуточный FAIL:** [#39059638142](https://github.com/manufact-test/ai-site-cms/actions/runs/39059638142) из-за устаревшего ожидания текста тела 503 в прежнем тесте после рефакторинга; при неизменном статусе код возвращал новый текст. Тест исправлен и перепроверен в [#39059714864](https://github.com/manufact-test/ai-site-cms/actions/runs/39059714864). Это не было доказательством отказа PHP-публикации.

**Ограничения:** PHP сервер был php -S в GitHub runner, НЕ настоящий Hostinger; Composer/Opis устанавливался в CI, НЕ на hosting. Нет БД, аутентификации/RBAC/CSRF, backup offsite, fsync, аварийных power-off, защиты от неконтролируемых сторонних writers, реального многопользовательского API, heavy media, production permissions или rollout. Резервная копия только одна, двойная порча даёт 503. Два reader-validator не гарантированно семантически совпадут на всех допустимых схемах. **Этап 1 не принят, этап 2 не начат, 135 требований НЕ приняты.**

Полный технический отчёт и источники: [STAGE-1-SNAPSHOT-PUBLISH-RESEARCH.md](STAGE-1-SNAPSHOT-PUBLISH-RESEARCH.md). Дальше исследовать реальные адаптеры HTML/PHP/React/Next-static, тяжёлый эквивалентный RJSF, реальный разрешённый текущий PHP shared hosting, нагрузки/security и матрицу 135 ID до выбора направления.


## 15. Многоэлементная секция: HTML/PHP/React/Next-static + настоящий RJSF — checkpoint v1.12 (17.10.2026)

**Подтверждено:** [GitHub Actions #39062360601](https://github.com/manufact-test/ai-site-cms/actions/runs/39062360601), commit [edbce0c](https://github.com/manufact-test/ai-site-cms/commit/edbce0c1a62598c727c2ccf782b1637933fec980) в ТОЛЬКО исследовательской ветке. Все запущенные прежние и новые тесты workflow **PASS**. Новый стенд: [adapter-section.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/adapter-section.cjs), [complex-adapters.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/complex-adapters.cjs); версионная тестовая зависимость Next.js 15.5.12 (только Node CI build).

**Проверено на одной и той же репрезентативной секции:** 12 стабильных `data-stable-id` (секция, заголовок, описание, две CTA, три feature items, две карточки, два stats). Четыре способа получения HTML дают одинаковые ID и текст: (1) чистая HTML функция с экранированием, (2) реальная PHP CLI генерация с `htmlspecialchars`, (3) React 19 `renderToStaticMarkup`, (4) реальная сборка **Next.js static export** `output: 'export'` с чтением `out/index.html`. Не путать React статический серверный рендер для теста с развёрнутым SSR-сервером.

**Поведение браузера:** для КАЖДОГО из четырёх HTML-артефактов в Chromium создан один sandbox iframe и настоящий RJSF 6.11.0 с AJV Draft 2020-12. RJSF отредактировал отдельный CTA, feature item и card item; tablet 48→52px, mobile без override наследовал 52px, затем mobile override 32px. HTML-подобный текст не создаёт узел `img`, запрещённое CSS-значение не принимается мостом, опубликованное исходное значение не меняется от несохранённого draft. 4/4 вариантов PASS, 12 IDs каждый, pageerror=0.

**Промежуточные отрицательные запуски:** [#39061383207](https://github.com/manufact-test/ai-site-cms/actions/runs/39061383207), [#39061563894](https://github.com/manufact-test/ai-site-cms/actions/runs/39061563894), [#39061820782](https://github.com/manufact-test/ai-site-cms/actions/runs/39061820782), [#39061989954](https://github.com/manufact-test/ai-site-cms/actions/runs/39061989954) FAIL: начальная вставка встроенного bridge script в `iframe.srcdoc` в этом новом сценарии не привела к исполняемому script в iframe DOM (`document.scripts.length=0`, `ready=false`). Диагностика локализовала симптом, но **коренная причина исходного srcdoc bootstrap не доказана**. Для конечного функционального прогона тестовый скрипт добавлен после загрузки iframe в изолированный документ через Playwright `frame.evaluate`; уже существующая отдельная проверка [secure-preview.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/secure-preview.cjs) продолжила PASS, но не доказывает, что production preview bootstrap надёжно запускается с полноценной CSP/nonce. **Не считать это закрытой security/adapter интеграцией.**

**Не проверено:** SSR-сервер Next.js, production загрузка bridge без Playwright, React hydration, PHP FPM на реальном Hostinger/shared-hosting, реальные медиа/3D, множество CMS редакторов/конфликты, долговременная память/performance, production XSS/CSP/auth, публикация многосекционного сайта, 135 обязательных продуктовых проверок. Продолжается ТОЛЬКО этап 1, никаких утверждений выбора стека.

**Для реального shared-hosting:** составлен неразрушающий план [STAGE-1-HOSTING-SMOKE-PLAN.md](STAGE-1-HOSTING-SMOKE-PLAN.md). Он не исполнен на Hostinger: потребуются санкционированный доступ и изолированное место без изменения тарифа/живых сайтов.


## 16. Нативный iframe.srcdoc bootstrap, CSP nonce и причина ошибочного HTML — checkpoint v1.13 (17.10.2026)

**Полный подтверждённый CI PASS:** [GitHub Actions #39064252770](https://github.com/manufact-test/ai-site-cms/actions/runs/39064252770) на исследовательской ветке `research/stage1-editor-comparison`, commit [c6d98dd](https://github.com/manufact-test/ai-site-cms/commit/c6d98dd64722a6e50e9a0708d5850e00cd9df465). Запущены все предыдущие тесты и новый функциональный браузерный сценарий; PHP 8.3.6 / Opis 2.6.0 / AJV parity, предыдущие snapshot/override тесты вновь PASS. Исследовательский код не сливался в main.

**Root cause v1.12:** только HTML-вариант в `complex-adapters.cjs` был завершён **`</section` вместо `</section>`**. При проверке изолированного фрагмента JSDOM/браузер автоматически восстанавливали отсутствующий `>` в конце input, и 12 stable IDs выглядели правильными. При конкатенации после этого фрагмента inline bridge получалось `</section<script nonce="...">`: HTML-парсер поглощал открытие `<script>` ошибочным закрывающим тегом, а JavaScript оставался текстовым узлом. Диагностика `DOMParser(...).scripts.length=0` и фрагмент источника возле `scriptTagOffset` подтвердили факт. **PHP-вариант уже имел полноценный закрывающий тег и в этом исправлении не менялся.**

**Решение:** исправлено завершение HTML и добавлен ранний регрессионный assert, что **каждый из 4** адаптерных HTML-артефактов оканчивается полным `</section>`. Теперь все четыре HTML/PHP/React/Next-static multi-element варианты загружают через `iframe.srcdoc` **собственный inline bridge script с случайным nonce**, мета-CSP `default-src 'none'; script-src 'nonce-...'; connect-src 'none'; img-src 'none'` и локальным inline CSS. Playwright больше НЕ вставляет скрипт после загрузки; он только автоматизирует ввод в настоящий RJSF и проверяет DOM/сообщения. На всех 4 вариантах: 12 stable IDs, одна iframe, RJSF редактирует CTA/feature/card, tablet 48→52px, mobile наследует 52px и затем override 32px, HTML XSS-подобная строка остаётся текстом, запрещённый CSS отклонён, pageerror=0, published baseline не меняется от draft — **4/4 PASS**.

**Отдельный positive/negative CSP proof:** новый [srcdoc-bootstrap.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/srcdoc-bootstrap.cjs) в настоящем Chromium проверил: (a) родной `srcdoc` без CSP исполняет bridge; (b) `srcdoc` с правильным CSP nonce исполняет bridge; (c) с **несоответствующим nonce скрипт присутствует в DOM, но не исполняется и не отправляет сообщение**. Все 3 PASS. Это проверка **CSP meta в исследовательском браузере**, НЕ аудит deploy CSP/header/Trusted Types, XSS, postMessage protocol, auth/RBAC/CSRF, sandbox escapes или иных production угроз.

**Промежуточные FAIL и урок:** [#39063380496](https://github.com/manufact-test/ai-site-cms/actions/runs/39063380496), [#39063563592](https://github.com/manufact-test/ai-site-cms/actions/runs/39063563592), [#39063776817](https://github.com/manufact-test/ai-site-cms/actions/runs/39063776817) — исходный незавершённый HTML фрагмент ломал встроенный скрипт. [#39063941053](https://github.com/manufact-test/ai-site-cms/actions/runs/39063941053) — полноценный PASS после исправления HTML. [#39064099051](https://github.com/manufact-test/ai-site-cms/actions/runs/39064099051) — отрицательный CSP-тест ошибочно ожидал **видимости** `script` через locator.waitFor(); исправлено на `state:'attached'`, итоговый [#39064252770](https://github.com/manufact-test/ai-site-cms/actions/runs/39064252770) **весь workflow PASS**.

**Нерешённое:** нет actual Hostinger/shared-hosting (read-only план в [STAGE-1-HOSTING-SMOKE-PLAN.md](STAGE-1-HOSTING-SMOKE-PLAN.md)), Next.js SSR runtime, production media/CSP/nonce lifecycle, реальные 3D/video и долгие сессии, многопользовательский publisher, полного равноправного нагрузочного Jedison/RJSF на одинаковой сложной секции или 135/135 приёмки. Этап 1 **продолжается**, этап 2 не начинать, стек не выбран.


## 17. Одинаковые многоэлементные editor-session workloads Jedison и RJSF — checkpoint v1.14 (17.10.2026)

**ПОЛНЫЙ PASS:** [GitHub Actions #39065084450](https://github.com/manufact-test/ai-site-cms/actions/runs/39065084450) на отдельной исследовательской ветке `research/stage1-editor-comparison`, исследовательский commit `1bfb163492e72947616717d4d4e3f8a8e44642d8`. Новый [matched-editor-session.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/matched-editor-session.cjs) в настоящем Chromium сравнил Jedison 1.27.1 и RJSF 6.11.0 с **одинаковой схемой 9 root properties**, 12 stable IDs в Hero, 50 metadata sections, одним sandbox `iframe`, типизированным responsive bridge, с одной и той же последовательностью изменений.

**Нагрузка и проверяемые инварианты:** 8 циклов mount/edit/unmount **в каждом из двух порядков** (Jedison→RJSF и RJSF→Jedison) = 16 циклов/редактор и **41 изменение модели на цикл**, итого **656 событий изменения модели на редактор**. Правились заголовок/описание/две CTA/feature/card/stat/tablet/mobile, включая 32 последовательных изменения заголовка за цикл. После каждого изменения ожидалось соответствующее nested JSON; результаты двух библиотек `deepEqual`. Предпросмотр отражает значения, owner draft не меняет опубликованный baseline, browser pageerrors=0, после unmount не остаются input, iframe не дублируется. **Все assertions PASS** в обоих порядках; прежние PHP/Opis/snapshot/CSP/Next-static исследования вновь PASS.

**Диагностические наблюдения CI (не сравнение production UX):** test entry gzip Jedison **48 284 bytes**, RJSF с React+AJV2020 **190 905 bytes**. Post-unmount Chrome GC JS heap в первом→восьмом цикле при запуске Jedison первым — Jedison ~2.24→2.63 МБ, RJSF ~3.90→4.30 МБ; у обоих остаётся рост, доказательства утечки нет. Медианы длительности *полного Playwright-сценария*, включая автоматизацию: Jedison ~1265 мс / RJSF ~813 мс (Jedison первым); Jedison ~1450 мс / RJSF ~841 мс (RJSF первым). **Нельзя** выводить из этих данных объективную скорость ввода для пользователей: измерение включало Playwright и зависело от порядка; тестовые сборки имеют различный состав validator, heap снимки не отражают production устройство или долгие часы работы. Этот скрипт выполнялся считанные секунды, НЕ многочасовая сессия.

**Подробный самостоятельный технический отчёт:** [STAGE-1-MATCHED-EDITOR-SESSIONS.md](STAGE-1-MATCHED-EDITOR-SESSIONS.md). Оба редактора пригодны для дальнейшего исследования, **лидер не утверждён**, выбор стека НЕ состоялся, матрица 135 mandatory НЕ принята. Осталось: составные editors на одинаковой тяжёлой странице, долгие/медиа/много редакторов, security/CSP, реальный разрешённый PHP shared-hosting (план без обновления тарифа), формальное заключение по 135 обязательным ID. Этап 1 всё ещё in_progress, этап 2 not_started.


## 18. Jedison и RJSF: идентичные composite widgets + медиа-заглушки — checkpoint v1.15 (17.10.2026)

**Полный GitHub CI PASS:** [#39066085194](https://github.com/manufact-test/ai-site-cms/actions/runs/39066085194), исследовательская ветка `research/stage1-editor-comparison`, commit `fb12a4ea6ac27808e583207240d182edde997659`. Все ранее существовавшие проверки HTML/PHP/React/Next-static, native CSP nonce и matched-session 16 циклов/656 events снова PASS. Новый [matched-custom-media.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/matched-custom-media.cjs) отдельно проверил настоящее взаимодействие с pinned **Jedison 1.27.1** и **RJSF 6.11.0** по одной схеме Draft 2020-12.

**Одинаковые UI/данные:** четыре собственных composite widget kinds: length (amount/unit), shadow (x/y/blur/color), gradient (angle/from/to), animation (enabled/duration/easing), по девять control edits в 2 mount/edit/unmount циклах **для каждой** библиотеки. Expected values: fontSize `72rem`, shadow blur `25`, color `#abcdef`, gradient angle `120` and from `#aabbcc`, animation disabled, duration `850` ms, easing `linear`. Итоговый typed JSON для обоих library **deepEqual**. 0 JS page errors и 4/4 собственных widget kinds render/pass у обоих.

**Нативный preview:** ровно один opaque sandbox iframe с `srcdoc` inline script/CSP nonce + typed message protocol, 12 stable IDs, 50 индексных записей без iframe. CSS ограничен проверенной моделью; значения font/box-shadow/gradient/transition попадают в настоящую DOM Hero-секцию. 3 fake local placeholders (image/video/animated) НЕ являются реальными media resources. Негативный пакет с CSS `url(javascript:alert(1))` отвергнут (без `applied` acknowledgment), published baseline неизменён, после unmount контролы удалены.

**Ограничения:** стенд извлекает две уже написанные setup-функции из существующих research-файлов как текстовые фрагменты для сравнения **реальных** custom implementations (в production потребуется модульное подключение); CSS CSP содержит `unsafe-inline` для fixture; parent/child trust полная безопасность не доказана. Нет реального video/image/3D/network, hours-long sessions, реального Hostinger, production CMS, approved stack или 135/135 product acceptance. Подробно в [STAGE-1-COMPOSITE-MEDIA-RESEARCH.md](STAGE-1-COMPOSITE-MEDIA-RESEARCH.md). Этап 1 продолжается, этап 2 не начат.


## 19. AI-generated HTML trust boundary и security negative controls — checkpoint v1.16 (17.10.2026)

**Полный GitHub Actions PASS**: [#39067271214](https://github.com/manufact-test/ai-site-cms/actions/runs/39067271214), research commit `15ac65fd3f590999a6dad215e7f2db22e3acb9eb`. `STAGE1_HTML_BOUNDARY={"pass":true,...,"malformedOrMaliciousRejected":20,...,"frame":{"nativeNonceBridge":true,"nonceLessScriptBlocked":true,"typedTextOnly":true,"originRestricted":true,"rogueSourceRejected":true,"wrongTokenRejected":true,"extraPayloadRejected":true,"opaqueOrigin":true,"parentDOMInaccessible":true,"pageErrors":0,"rogueMessagesRejected":2,"illicitMessages":0}}`. Все прежние HTML/PHP/React/Next-static, Jedison/RJSF 656 changes, custom widgets и PHP Opis/rollback тесты PASS на том же commit.

**Исследовательский `html-boundary-adversarial.cjs`:** parse5 v8 с parser-error reporting плюс изолированный DOM и узкая Hero-грамматика (завершённый корень `</section>`, строгий набор тегов/атрибутов, 12 уникальных stable IDs) — 2 положительных сценария (обычный HTML и экранированный опасно выглядящий текст) PASS, **20 отрицательных HTML payload — все отклонены**, включая `<script>`, `<style>`, onmouseover, src/javascript, inline style, SVG/MathML, template/iframe, meta/base, duplicate IDs, комментарии, нарушенную вложенность и closing boundary. Эта узкая грамматика НЕ sanitizer для любого произвольного ИИ-сайта.

**HTTP Chromium sandbox/bridge:** opaque `iframe sandbox=allow-scripts`, no `allow-same-origin`, CSP meta с `script-src nonce` в head, запрещённый raw inline script присутствует в DOM, но НЕ исполняется; разрешённый nonce script запускает typed `postMessage`. Parent origin точный, `source`, `token`, строгая форма сообщения, размер/тип строки; входящий HTML-похожий текст записывается в `textContent`. Неверный токен, лишнее поле, подмена из parent/self и отдельно из rogue iframe не получают applied ack. **Security audit production headers/real media/auth НЕ сделан.**

**Диагностические FAIL и устранение тестовой ошибки:** [#39066926805](https://github.com/manufact-test/ai-site-cms/actions/runs/39066926805) rogue message ошибочно посылался В rogue iframe, а не ИЗ него; [#39067088041](https://github.com/manufact-test/ai-site-cms/actions/runs/39067088041) Playwright locator.evaluate callback получил DOM element вместо дополнительного token, вызвав `DataCloneError`. Исправлено. Защитный тест перенесён в CI до тяжёлых тестов.

**Второй завершённый фрагмент:** [STAGE-1-MANDATORY-EVIDENCE-MATRIX.md](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md): **все 135 обязательных ID** из исходного CSV (193=135+42+16), 43 ID с ограниченной исследовательской/документальной связью, 92 без предметного test signal, **0/135 принятых продуктовых требований**. `R` и `D` — сигнал, НЕ принятие. Подробно: [STAGE-1-HTML-BOUNDARY-RESEARCH.md](STAGE-1-HTML-BOUNDARY-RESEARCH.md). Этап 1 НЕ принят, этап 2 НЕ начат.



## 20. Настоящие локальные media fixtures + расширяемые typed AST profiles — checkpoint v1.17 (17.10.2026)

**Полный исследовательский CI PASS:** [#39068226228](https://github.com/manufact-test/ai-site-cms/actions/runs/39068226228), ветка `research/stage1-editor-comparison`, commit [`f53d6d20a13a138270520aa97eefb022a55c3a32`](https://github.com/manufact-test/ai-site-cms/commit/f53d6d20a13a138270520aa97eefb022a55c3a32). Все шаги workflow завершились success: новая генерация media через явно установленный ffmpeg, typed AST, прежние 20 HTML negative cases, 4 HTML/PHP/React/Next-static render adapters, реальные Jedison/RJSF сравнения, PHP Opis/schema parity/public snapshot/rollback. Исследовательский код остаётся вне main.

**Медиа без mocks.** В GitHub runner созданы настоящие PNG (170 bytes), JPEG (242 bytes), VP8 WebM (2940 bytes, 1 сек, 64×48). Chromium загрузил и декодировал изображение, прочитал метаданные и воспроизвёл видео; JPG/WebM проверены также внутри opaque sandbox iframe без доступа к parent DOM; ограниченная CSP позволяет медиа с конкретного локального origin. Настоящий HTML file input → POST: **3 корректных файла приняты с SHA-256**, **5 отказов** (поддельная сигнатура, MIME mismatch, oversize, SVG/script, небезопасное имя), 404 отсутствующий файл, AbortController на delayed fetch, 0 pageerror. `STAGE1_REAL_MEDIA={"pass":true,...,"acceptedUploads":3,"rejectedUploads":5,"pageErrors":0}`. Нет upload persistence, production AV/ACL/SSRF/CSRF/decoder sandbox и подтверждения реального хостинга.

**Типизированный AST, два профиля (не один фиксированный Hero).** `typed-ast-probe.cjs`: профиль Hero — 4 узла, 3 controls; Media — 6 узлов, 4 controls; строго typed fields, asset registry, escaping, route allowlist, уникальные stable IDs, bounded node budgets. **21/21 враждебная или испорченная AST-вариация отклонена**: tags/attrs/script/inline CSS, unsafe URL, asset mismatch, duplicate ID, invalid controls и structure bounds. `STAGE1_TYPED_AST={"pass":true,...,"adversarialRejected":21}`. Это **не** universal AST library или sanitizer произвольных AI-секций, не runtime CMS и не завершённая архитектура.

**Промежуточные диагностические FAIL не скрываем:** [#39067920264](https://github.com/manufact-test/ai-site-cms/actions/runs/39067920264) — GitHub runner не имел ffmpeg; [#39068040118](https://github.com/manufact-test/ai-site-cms/actions/runs/39068040118) — плохой тест искал `onerror=` в безопасном HTML-escaped тексте; [#39068132063](https://github.com/manufact-test/ai-site-cms/actions/runs/39068132063) — тест требовал H1 также у Media profile без H1. Исправлены toolchain и обе проверки, окончательный **полный** workflow `#39068226228` успешен.

**[Подробный отчёт, архитектурные варианты и gap prioritization](STAGE-1-MEDIA-AST-GAPS-RESEARCH.md).** В матрице все 135 mandatory, 43 прежних ограниченных исследовательских/документальных сигналов, 92 без прямого целевого evidence, продуктовая приёмка **0/135**. Области №2,4,6,10 по-прежнему без соответствующих редакторских end-to-end проверок. Нельзя автоматически считать успешное отображение файла готовностью к редактированию фонового видео/галерей/alt. Этап 1 **НЕ принят**, этап 2 не начат, production stack не выбран. Хостинг реальный не проверяли; CELIKOM не трогали.


## 21. Five different typed AI sections + real Jedison/RJSF browser bindings — checkpoint v1.18 (18.10.2026)

**Полный CI PASS:** [#39069971771](https://github.com/manufact-test/ai-site-cms/actions/runs/39069971771), research HEAD `60f530745bfd324d9cedca8172e5300f0e61f9ea`, branch `research/stage1-editor-comparison`; все workflow steps success, включая предыдущие HTML adversarial/adapter/native nonce, media, сравнения Jedison/RJSF и PHP Opis/rollback. Новые [multi-section-contract.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/multi-section-contract.cjs) и [multi-section-browser.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/multi-section-browser.cjs) остаются research-only.

**`STAGE1_MULTI_SECTIONS={"pass":true,"profiles":["faq","contact","pricing","gallery","tabs"],"realEditors":["jedison-1.27.1","rjsf-6.11.0"],"editorRuns":10,"adversarialASTRejected":30,"editorModelParity":true,"realImageVideo":true,"formsSubmitLocalOnly":true,"previewSandboxed":true,...}`.** Пять разнородных вручную разработанных исследовательских секций × два настоящих upstream редактора = **10/10 PASS**; typed output после реальных UI-правок в обоих редакторах равен для каждого profile, 30/30 неподходящих моделей отклонены, `pageerrors=0` на каждом browser probe. Stable IDs: FAQ 5, Contact 10, Pricing 6, Gallery 6, Tabs 7. Реальный PNG/WebM в Gallery загружен и декодирован; у FAQ раскрытие, у Tabs переключение, у Contact только локальная валидация; у Pricing изменение стоимости 49→79, responsive size в `data-size`. Published baseline не мутировал от draft.

**Важное ограничение:** это ещё пять *ручных bounded templates*, не независимые AI-generated сайты и не универсальная генерация editors/AST для любой вёрстки; device font size проверен как **typed metadata**, а не CSS computed. Никаких настоящих отправок форм, storage или product acceptance.

**Диагностический FAIL и исправление:** [#39069807024](https://github.com/manufact-test/ai-site-cms/actions/runs/39069807024) — browser sandbox без `allow-forms` блокирует обычный submit. Вместо ослабления sandbox сценарий переписан как **local click/validity/preview-only interaction** с явным `preventDefault`, без server request. Повторный полный CI PASS. Подробный [отчёт](STAGE-1-MULTI-SECTION-RESEARCH.md) включая угрозы, варианты A/B/C, ограничения и рекомендации.

**Инварианты:** этап 1 не принят, стек не выбран, этап 2 не начат, 135 требований все без продуктовой приёмки, экспериментальный код не вливать в main, Hostinger/CELIKOM не трогали.


## 22. Annotated HTML discovery, generated typed manifest, computed CSS and owner conflict quarantine — checkpoint v1.19 (18.10.2026)

**Full GitHub Actions PASS**: [#39072109263](https://github.com/manufact-test/ai-site-cms/actions/runs/39072109263), `research/stage1-editor-comparison` SHA `e56834d379db2688bf22ad841213d48b0ab5cdd3`. Все прежние тесты Jedison/RJSF, HTML security, real media, HTML/PHP/React/Next-static и PHP Opis/publishing/rollback также PASS в том же workflow. Новый исследовательский код остаётся только в research branch.

**Исследование, не product CMS:** `annotated-html-contract.cjs` выводит field registry и JSON Schema из двух принципиально разных, **вручную аннотированных** HTML секций, без отдельного template renderer на каждый профиль. `story`: 11 DOM nodes и 8 controls; `board`: 13 nodes и 10 controls. Дженерированы полевые ключи по stable-id+property, проверены one-to-one coverage и закрытая grammar `text,fontSize,gap,backgroundColor`; **19/19 отрицательных HTML/manifest вариантов отклонены**. Не поддерживает arbitrary HTML/CSS/JS/медиа/формы и не доказывает независимую генерацию корректных аннотаций ИИ.

**Реальный браузер и редакторы:** 2 annotated HTML structures × настоящие Jedison 1.27.1 и RJSF 6.11.0 = **4/4 browser PASS**. Текст изменён в обоих upstream editor UI с безопасным escaping HTML-похожего содержимого. Chromium real `getComputedStyle` font-size/gap на 1200/720/360 px: `52px/30px`, `35px/18px`, `35px/11px` у обеих структур и редакторов, плюс board background `rgb(18,52,86)`. **Ограничение:** font/gap/background изменены через programmed typed preview patches, а не через widgets upstream editor; это не доказательство редакторского UX по всем свойствам.

**Typed override migration:** при обновлении исходной разметки с неизменным stable ID owner heading сохраняется; rename stable ID блокирует публикацию конфликтом `removed-or-renamed`, неизвестный key тоже блокирует. Нет реальной DB/CMS migration. Sandbox opaque iframe, native nonce script/style, exact origin/source/token/seq checks, rejected bad token/extra key/replay/invalid CSS/rogue ack; 0 browser JS errors. Использовано `style-src-attr 'unsafe-inline'` для fixture DOM style — это **не** утверждённая production CSP.

**Результат в CI**: `STAGE1_ANNOTATED_HTML={"pass":true,"uniqueStructures":["story","board"],"runs":4,"preflightNegatives":19,"computedCss3Devices":true,...}`. Подробнее в [STAGE-1-ANNOTATED-HTML-COVERAGE-RESEARCH.md](STAGE-1-ANNOTATED-HTML-COVERAGE-RESEARCH.md). Матрица 135: **43 partial/doc, 92 without matched target, 0/135 product acceptance** без изменений. Этап 1 не принят, этап 2 не начат.



## 23. Native editor-driven computed CSS + manifest coverage audit — checkpoint v1.20 (18.10.2026)

**Полный workflow PASS:** [#39073198622](https://github.com/manufact-test/ai-site-cms/actions/runs/39073198622), `research/stage1-editor-comparison`, HEAD `c6c7eaaeacdc665ba1b9b753a8591db533004779`; все старые regression checks также PASS. В новой `annotated-editor-css.cjs` CSS больше не подаётся вручную через `__updateTyped`: Playwright **заполняет реальные upstream Jedison 1.27.1 / RJSF 6.11.0 input** fontSize.desktop/tablet, gap.desktop/tablet/mobile, board background hex; CSS увидели `getComputedStyle` в Chromium. **4/4** scenarios `story/board × 2 editors`, desktop 1200px `52px/30px`, tablet 720px `35px/18px`, mobile 360px `35px/11px` (font inherits tablet), board rgb(18,52,86), **0 pageerrors**. Соблюдены snapshot-isolation, typed model, postMessage ACK и sandbox rules. Это native schema inputs, а НЕ готовый custom responsive UI или all properties editor.

Новый `annotated-coverage-audit.cjs`: отдельные manually authored timeline/dashboard/readonly fixture, source intent ledger vs auto-discovered manifest, **3 audited positive fixtures + 13 negative mismatch detections**, включая 2/2 пропущенных text leaf annotations; readonly copy разрешён только с explicit exception. Аудит НЕ угадывает неотмеченные CSS свойства и не способен защитить от пропуска одновременно в HTML и ledger; AI-independent generation НЕ проверена.

Промежуточный FAIL [#39073066570](https://github.com/manufact-test/ai-site-cms/actions/runs/39073066570) — race, snapshot iframe innerWidth после изменения ширины. Исправлена синхронизация реального resize перед measured computed CSS в старом и новом probe, **без** смягчения проверок. Итоговый полный CI PASS. Подробный [технический отчёт](STAGE-1-EDITOR-CSS-COVERAGE-AUDIT-RESEARCH.md). Никакого продуктового acceptance: 43 partial/doc, 92 no matched target, **0/135 accepted**, stage1 not accepted.



## 24. Extensible trusted property packs, hardening and native editor computed CSS — checkpoint v1.21 (18.10.2026)

[**Полный GitHub Actions #39075385172 PASS**](https://github.com/manufact-test/ai-site-cms/actions/runs/39075385172), research HEAD `fba0093dc836ad8aa0695c34839b30d9f8efb6af`. Весь workflow success, включая все старые медиа, редакторские parity, HTML/nonce boundary, HTML/PHP/React/Next-static и PHP Opis/publish/rollback.

В research-only добавлено 3 модуля: `extensible-style-registry.cjs` (trusted property packs + immutable typed model/schema/apply/migrate/audit), `registry-hardening.cjs` (51 negative cases + AJV schema parity), `registry-editor-browser.cjs` (actual 4 Chromium editor runs).

**10 разрешённых типов настроек:** text, fontSize, padding, borderRadius, maxWidth, gap, backgroundColor, borderColor, opacity, flexDirection; собраны из 3 independently registered trusted developer packs. Свободные уникальные по структуре markup sections объявляют stable-ID/editables без отдельного hand-coded layout renderer.

**Static proof:** 3 исследовательских layout (8 nodes/13 fields; 8/11; 3/2), **51/51** негативных input/HTML/plugin cases отказаны, AJV 2020 ↔ custom typed validation согласуются. Проверены конфликтующие pack registration, atomic refusal, unsafe CSS, missing ID, outsider intent ledger, несовместимые owner override migrations. Частный HTML parser `parse5` tolerant repair усекал закрывающий tag — добавлена проверка на исходный закрывающий `</section>`; это не universal HTML sanitizer.

**Native browser proof:** 2 distinct sections `canvas`/`brief` × реальные Jedison 1.27.1/RJSF 6.11.0 = **4/4 PASS**. Через настоящие UI inputs отредактированы fontSize/padding/borderRadius/gap/backgroundColor/opacity/flexDirection. В реальном Chromium `getComputedStyle`: desktop 1200px padding40/font49/gap30; tablet720 padding26/font49/gap17; mobile360 same inherited; radius22px, background rgb(19,68,119), opacity0.5, flex column. **0** browser JS errors, both editors parity; isolated immutable published baseline, opaque sandbox protocol negatives. Not production security (test CSP `style-src-attr unsafe-inline`), not arbitrary CSS/JS and no independent blind LLM site or rich widgets.

Diagnostic FAIL in earlier research runs: malformed generated JS schema replacement (JS replacement `$'` suffix interpolation), repaired using original committed file; tolerant HTML fragment accepted truncated root, explicitly denied afterward. Final CI all green.

Полный [STAGE-1-EXTENSIBLE-STYLE-PACKS-RESEARCH.md](STAGE-1-EXTENSIBLE-STYLE-PACKS-RESEARCH.md). **Stage 1 in progress not accepted, stage2 not started, stack unselected, product acceptance 0/135, research/doc signal 43, gaps 92.**


## 25. Uninstrumented full-site / coverage gaps / Chromium trust / safe renderer slice — v1.22 (18.10.2026)

**Полный Actions PASS:** https://github.com/manufact-test/ai-site-cms/actions/runs/39077113741, research HEAD 7d8178c54e557ec4a37f1427f0917dab2d9daabd, весь прежний suite также зелёный. Новая standalone Tide Atlas HTML/CSS/JS страница, не созданная под parser grammar: original SVG, details/dialog/form, JS, CSS variables/grid/gradients/animation/media. Это отдельная модельная композиция, **не независимый слепой второй LLM**.

STAGE1_INDEPENDENT_SITE_PREFLIGHT: 17 HTML IDs, 9 unkeyed text; 16 вручную ожидаемых bindings, 12 candidate, 4 missing (antispam, placeholder, SVG, SEO); после explicit repair 10 unsupported trusted property packs и auto-publish refused. 15 negative/audit/migration: compatible owner overrides survive, rename/type changes/unsafe aliases quarantined.

STAGE1_INDEPENDENT_SITE_RENDER_PARITY: manually mapped content-only 3-node view; HTML/PHP CLI/React static × 2 states = **6/6 semantic parity**, XSS-like content escaped, 18 bad payload refusals. NOT original site's CSS/SVG/forms/JS conversion; PHP only GitHub runner, not actual Hostinger.

STAGE1_INDEPENDENT_SITE_SANDBOX: native Chromium opaque iframe source rendered with desktop CSS H1 84px / mobile 48px; script-src none, parent DOM inaccessible, click dialog inactive, valid email form to /subscribe blocked, 0 page errors. Test inline styles permitted, NOT production CSP. Diagnostic FAIL #39076877639 favicon mistakenly counted as HTTP form request, fixed by filtering /subscribe and filling email, final full CI green.

Details: [STAGE-1-INDEPENDENT-SITE-CONTRACT-RESEARCH.md](STAGE-1-INDEPENDENT-SITE-CONTRACT-RESEARCH.md). Stage1 in_progress not accepted; Stage2 not started, technology not selected, product **0/135**; R/D 43, gaps 92.


## 26. Trusted behavior/visual, AI site re-generation and persistent PHP CLI snapshot research — v1.23 · 18.10.2026

**Final full Actions CI:** [#39111755170](https://github.com/manufact-test/ai-site-cms/actions/runs/39111755170), head 32ab15f4ec523597724610011a71695bd05d5784, comparison/regeneration/durability **all completed/success**. In previous CI rounds #39079526881, #39109244889, #39110896781 all full PASS.

- Native reviewed behavior widget sessions: Jedison/RJSF, **20 edits**, internal anchor/disclosure/dialog/preview-form; original JS/POST blocked, CSP/origin restrictions preserved, 9 bad model values refused.
- Native reviewed visual widget sessions: Jedison/RJSF, **18 edits**, 8 typed fields, two actual decoded local SVGs, gradient/animation computed CSS, reduced motion, nonce CSP and no unsafe inline CSS attributes, 16 invalid values rejected. Curated SVG is not arbitrary SVG safety.
- Typed component regeneration: 4→5 with rename/reorder/insert; **6 owner overrides** retained in both browsers, type-changing component quarantined, published unchanged until explicit publication, rollback as new immutable history revision; old RAF iframe wait replaced with bounded time-based wait to stop incidental CI stalls.
- NEW persistent PHP CLI store: durable-site-store.php, durable-site-recovery.cjs; CAS, flock, generation, bounded checked snapshots and SHA256 hash, atomic rename and last-good, failpoint before current swap, invalid/malicious input, stale writer, corrupted current fallback, corrupted both copies fails closed, explicit backup repair. **48 checks and 3 fresh JS Node process rehydrations**; corrected rollback-vs-retained-owner conflict to demand sourceRevision matching an identical saved history entry.
- No actual Hostinger, fsync-power loss, auth, DB, real backups or deployment. Full production 0/135; Stage1 still not accepted; no selection/Stage2. [Technical report](STAGE-1-DURABLE-REGENERATION-RESEARCH.md).


## 27. Mixed heterogeneous site and capability provenance — v1.24 (18.10.2026)

**Full CI PASS:** [#39115456497](https://github.com/manufact-test/ai-site-cms/actions/runs/39115456497), research HEAD `48b7579eaf7b0dddec6422b9890fdbab73daa2a0`, **all four jobs** comparison/regeneration/durability/mixed-site-trust success. Heterogeneous known reviewed graph 4→5, stable-id alias/reorder, six owner overrides retained, typed HTML/PHP CLI/React static twice and real Next static export once: **7/7** semantic states, **675 assertions**, 10 intentional DOM mutations detected, 11 malformed PHP model states refused; rollback preserved. This does not adapt arbitrary independently AI-generated HTML/CSS/JS/SEO, run PHP on Hostinger, or test Next SSR/React hydration.

Signed capability provenance: ephemeral Ed25519 signed package plus SEPARATE reviewed capability binding authority, 8 field targets, two curated SVG hashes, **38 assertions including 30 adversarial refusals**, preserved two owner edits on approved upgrade, invalid/downgrade/replay/revocation fail-closed in-memory. Correct valid signature cannot authorize new JS/CSS/filesystem/network operations. Diagnostics fixed false remote-namespace SVG rejection, malformed synthetic manifest projection and invalid fixture that was actually valid. Signed packages are not safely executable third-party plugins; trust roots, storage replay, key rotation, upload decoding and production auth unresolved.

[Technical report](STAGE-1-MIXED-SITE-PROVENANCE-RESEARCH.md). Stage 1 NOT accepted, no stack selected, Stage 2 not started, 43 limited research/doc vs 92 missing matched target, **0/135** product accepted.


## 28. New standalone mixed-site contract preflight and persistent PHP signed trust — v1.25 (18.10.2026)

**All 4 CI jobs green:** [Actions #39117432469](https://github.com/manufact-test/ai-site-cms/actions/runs/39117432469), research HEAD `557dee05b31d283fe838315c7f065b94193803b1`. New Cedar Lab researcher-authored uninstrumented page (NOT blind second LLM) yields **46** structural/source obligations vs **12** candidate manifest entries; **34** missing, **18** unsupported types, **8** missing important fields versus separate manually reviewed oracle, **1** unkeyed visible leaf; **12/12** injected invalid source/manifest cases detected including **2 correlated omitted-from-source-and-manifest** spotted by unchanged external oracle. Even repaired manifest blocks publish due to unreviewed behavior/media. No complete CSS/JS semantic coverage.

New PHP 8.3 CLI Ed25519+reviewed-target+HMAC trust state: **74 assertions / 20 refused cases / 36 fresh PHP processes / 4 parallel competing installs (1 winner)**. Owner edits (2) survive upgrades, publisher revoke survives process restarts, stale/downgrade/forgery and unapproved signed operations denied, partial local state rollback detected and crash-between-renames fail-closed. **CRITICAL NEGATIVE:** full local rollback of both HMAC-valid state+anchor restores revoked version undetected. No external monotonic proof, auth, fsync, key lifecycle, real Hostinger or production code.

[Detailed report](STAGE-1-NOVEL-SITE-PERSISTENT-TRUST-RESEARCH.md). **Stage1 not accepted, Stage2 not started, stack not selected. Product accepted 0/135; 43 limited research/doc signals / 92 matching gaps unchanged.**


## 29. External witness anti-rollback & measured original HTML rich browser quarantine — v1.26 (18.10.2026)

**FINAL FULL CI 4/4 PASS:** [GitHub Actions #39118927082](https://github.com/manufact-test/ai-site-cms/actions/runs/39118927082), research HEAD **1b518cdc28c64a97147df226325d6966ac85ac20**. Witness simulation: 42 assertions, 10 denials, 24 fresh PHP processes, separate Ed25519 witness signed current generation/owner/version/revocation and previous receipt hash. **Local state+anchor joint rollback is caught ONLY if signed external receipt is independently protected.** Complete replay of site files plus old valid witness remains undetected (critical trust gap). Missing/forged witness or uncheckpointed change fails closed; signer service not actually deployed, no production trust/key infrastructure.

Chromium rich standalone Cedar Lab site: **23 successful assertions**, original vs sandbox DOM/SEO/media/CSS computed parity, desktop 3-grid/mobile 1-grid, mobile H1 36px, **prefers-reduced-motion animation disabled**, native FAQ works in both; untrusted original JS executes in original baseline but is intentionally blocked in preview, form in preview sends zero requests. No arbitrary site import or safe JS/form behavior approval, not independent second LLM generation.

Test harness failures fixed in sequence: playwright -> installed playwright-core/system Chromium, Page viewport/media vs BrowserContext, then strengthened non-vacuous form/request and reduced-motion tests. All 4 final jobs green. [Technical report](STAGE-1-EXTERNAL-WITNESS-RICH-PREVIEW-RESEARCH.md). 43 limited R/D vs 92 matched gaps, PRODUCT 0/135, Stage1 NOT accepted, no stack selection or Stage2.


## 30. Frozen generator-evidence gate and reviewed rich-site action bridge — v1.27 (18.10.2026)

**All 4 jobs PASS:** [GitHub Actions #39120030462](https://github.com/manufact-test/ai-site-cms/actions/runs/39120030462), research HEAD `102c119cfced69a06da0bd7fd4d9168be9aa8b79`. Paired site/manifest versus separate hand-authored reviewer oracle: 28 obligations across two DIFFERENT but **not other-model independent** site fixtures, **31 assertions, 17 negative refusals, 14 mutants**, 2 correlated source+manifest omissions detected; 7 unreviewed capabilities per fixture remain blocked. Frozen deterministic protocol SHA-256 `50218db02cb47af4825d9e10b9d7970ebdd2c15b56aa034eb4190f6e147b354c`. Fabricated model provenance does NOT count as independent.

Real Chromium reviewed rich-site behavior in opaque sandbox: **26 checks**, original scripts removed/inline handlers rejected, typed menu behavior restored by reviewed CSP-nonce adapter, fragment href updates, non-network form preview ack, **0 server requests**, replay/invalid unsafe commands fail-closed. Native iframe lacking `allow-forms` suppressed submit event; fixed via reviewed button-click local action WITHOUT granting form submission privilege. All other legacy regression jobs green. NOT production arbitrary behavior transformation, independent LLM site or real form backend. [Technical report](STAGE-1-EXTERNAL-GENERATION-GATE-REVIEWED-BEHAVIOR.md). Stage1 NOT accepted; PRODUCT 0/135.


## 31. Original full HTML source + reviewed owner edits across regeneration/publish/rollback in Chromium — v1.28 (18.10.2026)

**Full 4/4 green [GitHub Actions #39121390624](https://github.com/manufact-test/ai-site-cms/actions/runs/39121390624)**, experiment branch HEAD `16b8a891676e214da92f96622a491eadc2303398`. New `research/stage1/rich-source-regeneration-browser.cjs`: parse5 against an original uninstrumented Cedar Lab HTML page, Chromium visual CSS/SEO/DOM, owner changes for **text/fragment href/img alt/CSS --gutter (4 overrides)**, v1→v2 independent hand-authored source copy changes + 2 article reorders, **45 assertions / 10 expected refusals**. Manual edits survive source update, old published v1 stays identical until explicit publish, rollback appends another history entry leaving draft v2 intact. Rejected ID rename/duplicate, same-ID wrong HTML semantic tag, missing href fragment target/alt/CSS token, unsafe style/href and unknown owner field. Original JS/inline handlers stripped in isolated preview; form sends 0 requests. Mobile 1-column and 36px H1, reduced motion measured.

**Hard limits:** In-memory history; not real durable CMS, no general source sanitizer, no arbitrary CSS/JS property editability or behavior parity, no actual second-model independently generated site+manifest. Prior typed graph and PHP durability suites green but not combined with this in-memory source editor. [Full report](STAGE-1-RICH-SOURCE-REGENERATION-RESEARCH.md). Stage1 NOT accepted, product **0/135**, evidence 43 limited/92 target gaps.
