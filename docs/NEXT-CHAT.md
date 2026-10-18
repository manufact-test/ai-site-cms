# AI Site CMS — постоянный файл передачи между чатами

**Контрольная точка:** v1.25 · **дата:** 18.10.2026  
**Единственный постоянный путь:** `docs/NEXT-CHAT.md`  
**Постоянная ссылка:** https://github.com/manufact-test/ai-site-cms/blob/main/docs/NEXT-CHAT.md  
**Проект:** AI Site CMS, без MFT/MANUFACT в названии.  
**Репозиторий:** https://github.com/manufact-test/ai-site-cms · private · ветка `main`.  
**Состояние на эту дату:** документация готова; **18 этапов (0–17) утверждены владельцем 17.10.2026**. Этап 0 принят, **этап 1 начат и продолжается, не принят**. Код CMS не написан, основа/фреймворк не выбраны, продуктовых тестов/выпусков нет; выполнены локальные исследовательские тесты и реальные сравнения Jedison/RJSF, включая custom-editors Jedison/RJSF, Opis/AJV parity, 14 сценариев owner overrides, сложный Hero и защищённый исследовательский PHP HTTP publish с fallback/rollback (STAGE-1-TEST-LOG.md §§7–14).

> **ЭТО РАБОЧИЙ ЖУРНАЛ ПРОЕКТА И ФАЙЛ ДЛЯ ПЕРЕХОДА МЕЖДУ ЧАТАМИ.** Не начинать работу «по памяти»: сперва прочитать этот файл **напрямую из GitHub**, затем проверить PROJECT-STATUS.json и документы. При просьбе владельца «обнови этот файл», «обнови файл для следующего чата», «заканчиваем чат» **перезаписывать именно `docs/NEXT-CHAT.md`**, а не создавать новые независимые документы-копии. Ссылка на файл не меняется, изменяется его содержимое. После успешной записи давать владельцу эту же GitHub-ссылку и по возможности **свежую скачиваемую .md-копию**, которую можно приложить к следующему чату.

## 1. Готовое первое сообщение нового чата

> Продолжаем разработку **AI Site CMS**. Постоянный файл состояния: https://github.com/manufact-test/ai-site-cms/blob/main/docs/NEXT-CHAT.md. Репозиторий https://github.com/manufact-test/ai-site-cms, private, ветка main. **Сначала прочитай этот файл в GitHub и сверь фактические файлы и PROJECT-STATUS.json.** Затем изучи docs/ROADMAP.md, docs/MASTER-TZ.md, docs/PROJECT-MAP.md, docs/REQUIREMENTS.md, docs/FOUNDATIONS.md, docs/OPEN-QUESTIONS.md, docs/ARCHITECTURE.md, docs/AI-SITE-CONTRACT.md и docs/ACCEPTANCE.md. Пользователь **утвердил план 18 этапов 0–17 17.10.2026**. Этап 0 принят; теперь продолжаем **этап 1 — продолжение исследования открытых CMS/редакторов/библиотек** и сравнение подходящих основ, лицензий, пригодности к shared hosting и покрытия наших требований. **Не выбирать стек и не писать CMS до завершения исследования и согласования выбора.** Никакой урезанной MVP; первая полная версия — только после приёмки всех 135 обязательных требований. Сначала изучи состояние и изложи план этапа 1.

## 2. Что такое AI Site CMS

- Самостоятельная CMS **для сайтов, создаваемых ИИ**, а не ручной drag-and-drop конструктор сайтов.
- ИИ создаёт дизайн и код страниц, **автоматически регистрирует все используемые редактируемые параметры** с исходными значениями, stable ID, responsive и контрактом. Даже просьба «сделай сайт полностью на свой вкус» не отменяет обязанность создать полную схему администрирования (**обязательное №119**).
- В панели выбирается **только один блок**: слева изолированный живой предпросмотр, справа параметры, элементы выбираются кликом или в дереве. Не нужно загружать всю тяжёлую страницу.
- Показываются **только реально используемые настройки**; новые параметры ИИ регистрирует вместе с изменением блока.
- Ручные изменения **не исчезают** после обновлений; нужны версии, проверка конфликтов, черновики, отдельная публикация, rollback.
- Отдельная CMS-инсталляция и собственные данные для каждого сайта; работа панели на обычном виртуальном хостинге, сайт посетителя не зависит от работающей CMS.
- Поддержка HTML/CSS/JS, PHP, React/Next.js. **Next.js SSR может требовать Node**, не считать его автоматически совместимым с PHP-only hosting.
- Не создаём WordPress-плагин, универсальную миграцию старых сайтов, визуальный редактор создания новых страниц или ручное редактирование CSS в CMS.

## 3. Утверждённые требования и политика релиза

- 12 частей опроса, **193 ответа**: **135 «Обязательно»**, **42 «Желательно»**, **16 «Не нужно»**. Источник — `docs/REQUIREMENTS.md` и `requirements/requirements.csv` / `requirements/CMS_REQUIREMENTS_REGISTER_v0.1.xlsx`.
- **НИКАКОГО MVP.** Разрешены внутренние этапы, сборки и тестирование, но **первый полноценный релиз** только после фактического выполнения и проверки **135/135 обязательных требований** (этапы 15–16). Желательные остаются желательными, ненужные не добавлять «на всякий случай».
- Вопросы совместимости перечислены в `docs/OPEN-QUESTIONS.md`; их нельзя выдавать за решённые без результатов исследования и согласования.

## 4. Утверждённая последовательность этапов

Официальная детализация, условия готовности и примечания находятся **только в `docs/ROADMAP.md`**:

| № | Краткое название | Статус на дату checkpoint |
|---|---|---|
| 0 | Согласование документации, требований и этапов | **Принят 17.10.2026** |
| 1 | Изучение действующих open-source CMS, редакторов и библиотек | **В работе; не принят** |
| 2 | Выбор / законная адаптация основы, утверждение архитектуры | Не начат |
| 3 | Контракт ИИ ↔ сайт ↔ CMS, manifest, stable IDs, schema | Не начат |
| 4 | Ядро, API, БД, самостоятельная инсталляция | Не начат |
| 5 | Лёгкий редактор одного блока | Не начат |
| 6 | Типографика, размеры, фон, оформление | Не начат |
| 7 | Медиа, галереи, видео, анимации | Не начат |
| 8 | Кнопки, навигация, формы, интерактивы | Не начат |
| 9 | Глобальные стили, адаптив, наследование | Не начат |
| 10 | Страницы, повторяющийся контент, SEO | Не начат |
| 11 | Пользователи, доступ, безопасность, аудит | Не начат |
| 12 | Публикация, бэкапы, версии, восстановление | Не начат |
| 13 | Адаптеры HTML/PHP/React/Next и производительность | Не начат |
| 14 | Сквозные тесты, аудит, устранение ошибок | Не начат |
| 15 | Формальная приёмка всех 135 обязательных требований | Не начат |
| 16 | Выпуск **первой полной** версии CMS | Не начат |
| 17 | **Независимый безопасный пилот на CELIKOM**, затем другие сайты | Не начат |

**Этап 17 — будущая проверка на реальном сайте:** после полного релиза CMS и отдельного согласования испытать её на изолированной тестовой копии CELIKOM с резервированием и возможностью отката, затем перейти к другим сайтам. Это **не текущая задача**; подробные правила независимости проекта записаны в утверждённом `docs/ROADMAP.md`.

## 5. Карта источников и папок (от корня GitHub)

| Файл/папка | Назначение |
|---|---|
| `README.md` | Короткий вход в AI Site CMS |
| `PROJECT-STATUS.json` | Машиночитаемое текущее состояние и активный этап |
| `docs/ROADMAP.md` | **УТВЕРЖДЁННАЯ дорожная карта** 18 этапов |
| `docs/MASTER-TZ.md` | Главное мастер-ТЗ продукта |
| `docs/REQUIREMENTS.md` | Все 193 требования по приоритетам |
| `requirements/requirements.csv` и `requirements/CMS_REQUIREMENTS_REGISTER_v0.1.xlsx` | Таблица первичных ответов |
| `docs/FOUNDATIONS.md` | Первичные кандидаты для open-source исследования |
| `docs/ARCHITECTURE.md` | Предварительные варианты технологии, пока не выбранной |
| `docs/AI-SITE-CONTRACT.md` | Стандарт ИИ-компонентов, схем, данных и свойств |
| `docs/OPEN-QUESTIONS.md` | 14 открытых архитектурных вопросов и зависимости |
| `docs/ACCEPTANCE.md` | Проверка готовности полного релиза |
| `docs/PROJECT-MAP.md` | Полная карта проекта, папки и порядок работы |
| **`docs/NEXT-CHAT.md`** | **ЭТОТ постоянный файл передачи между чатами** |

Корень GitHub: https://github.com/manufact-test/ai-site-cms/tree/main  
Раздел документации: https://github.com/manufact-test/ai-site-cms/tree/main/docs

Папка/проект ChatGPT пользователя — не папка GitHub. В новой папке ChatGPT нужно либо открыть GitHub через подключение, либо прикрепить свежую копию этого файла и дать ссылку на репозиторий.

## 6. ОБЯЗАТЕЛЬНО: как обновлять этот файл по просьбе пользователя

Когда пользователь говорит **«обнови файл для следующего чата» / «заканчиваем чат» / «переходим»**:

1. Открой в **GitHub** `docs/NEXT-CHAT.md` (этот же путь) и `PROJECT-STATUS.json`; проверь последние коммиты/исходники/тесты/ROADMAP и актуальные решения, а не полагайся исключительно на контекст чата.
2. Обнови этот файл **на том же месте в GitHub**: дата, версия checkpoint, что сделано и проверено, что принял/не принял владелец, активный этап, завершённые этапы, оставшиеся ошибки, блокеры, ссылки на коммиты/issues, конкретный следующий шаг и стартовое сообщение для нового чата.
3. Синхронизируй `PROJECT-STATUS.json`, статусы и приёмку в `docs/ROADMAP.md`, и другие затронутые документы. Не теряй ранее утверждённых решений и требований.
4. Прочти файл повторно **после записи**, убедись, что новое содержимое реально в GitHub. **Не утверждай успешное сохранение, если оно не подтверждено инструментом.**
5. Верни пользователю **постоянную ссылку** https://github.com/manufact-test/ai-site-cms/blob/main/docs/NEXT-CHAT.md и **новый скачиваемый .md-файл**, если есть возможность создать его в текущем сеансе. Это **актуальная версия**, старые вложения могут устареть.
6. Следующий чат должен начинать с актуального файла и текущего этапа, **без нового глобального исследования всей истории переписки**. Если GitHub недоступен, честно скажи об этом и не выдавай локальную копию за обновление репозитория.

**Не делать:** создавать новое конкурирующее место хранения checkpoint, указывать ложный прогресс, удалять журнал важных решений, менять приоритеты без владельца или публиковать секреты.

## 7. Последний зафиксированный результат и следующий шаг

**Выполнено и подтверждено владельцем (17.10.2026):**
- название **AI Site CMS** и отдельный приватный репозиторий;
- 193 требования с приоритетами (135/42/16), ключевое AI-first правило №119;
- отказ от любого «минимального» релиза;
- детальный план из **18 этапов 0–17** принят;
- этап 17 конкретизирован: **CELIKOM — будущий первый испытательный сайт готовой CMS**, после него — другие сайты;
- все основные документы и реестр требований подготовлены, roadmap утверждён.

**Пока НЕ сделано:** утверждение фреймворка/основы, завершение ВСЕХ испытаний этапа 1 и проверка на реальном текущем shared hosting; продуктовый код CMS, продуктовые интеграции, релиз и CELIKOM-пилот. Исследовательские CI-тесты выполнены, но не означают создание CMS.

**СЛЕДУЮЩИЙ ШАГ (актуализация v1.10 ниже):** продолжить только **этап 1**: after successful synthetic Hero/override/PHP HTTP research, испытать реальные сложные PHP/React/Next/static секции, устойчивость публикации, долгие сессии, security/API и реальную доступную PHP shared-hosting среду без расширения. CMS не писать и стек не утверждать до согласования; матрица всех 135 обязательных ID остаётся критерием последующей приёмки.

## 8. Краткая хронология

- 17.10.2026 — завершён опрос из 12 частей: 193 требования, 135/42/16; №119 обязательно.
- 17.10.2026 — создан приватный `manufact-test/ai-site-cms`, утверждено название.
- 17.10.2026 — принято правило: никаких урезанных MVP, полный выпуск после 135/135.
- 17.10.2026 — **утверждён** поэтапный ROADMAP 0–17 и принято особое условие независимого пилота CELIKOM на этапе 17.
- 17.10.2026 — `docs/NEXT-CHAT.md` назначен **единственным постоянным файлом для передачи между чатами**.
- 17.10.2026 — по просьбе владельца из первого сообщения убрали избыточное указание про CELIKOM; оставили его только как будущий пилот этапа 17 в дорожной карте.

## 9. Новые решения владельца и состояние исследования (17.10.2026, checkpoint v1.4)

**Владелец уточнил и разрешил:**
- AI Site CMS — собственный **внутренний** продукт команды, применяемый для администрирования клиентских сайтов; коммерческая продажа самой CMS/публичное распространение не запланированы. Клиенты могут получать доступ к админке.
- Максимально **переиспользовать готовые качественные части открытого кода**, вплоть до крупного модуля с частичной переработкой (например, 70% оставить, 30% адаптировать). Не надо бессмысленно переписывать рабочий код; изменение процента не отменяет исходную лицензию.
- Выбирать прежде всего MIT/BSD/Apache-2.0 и хранить обязательные лицензии/NOTICE в технических материалах; **не нужно** выводить чужие бренды в панели или покупать платные разрешения при свободной лицензии. Избегать AGPL/GPL и коммерчески-ограниченных лицензий без отдельного согласования. Проверять лицензии конкретных импортируемых модулей и ассетов.
- **Оставаться на текущем хостинге**. Архитектура не должна требовать расширения PHP shared hosting; вопрос будущего апгрейда решается отдельно.

**Установленные факты исследования:** прочитаны MASTER-TZ, ROADMAP, REQUIREMENTS, FOUNDATIONS, AI-SITE-CONTRACT, ARCHITECTURE, OPEN-QUESTIONS, ACCEPTANCE и весь CSV. Верифицированы официальные репозитории и релизы Puck, GrapesJS, VvvebJs, Craft.js, Winter, Microweber, Payload и ряда JS/PHP библиотек. Выявлены перспективные направления: schema-driven формы (JSON Forms/RJSF), изолированный preview и PHP runtime; альтернативы — адаптация Puck и готового PHP backend. Ни одна система целиком не покрывает AI-first manifest + три семейства сайтов + сохранение overrides.


**Новый факт из осмотра кода:** Puck AutoField/Preview тесно связаны с Puck store, а GrapesJS Style Manager — с моделями DOM/CSS/editor. JSON Forms и RJSF имеют более независимые schema-driven interfaces, поэтому их проверяем первыми; Winter имеет backend widgets, но их выделение тоже непросто. Осмотр GitHub-кода **не** заменяет runtime-tests. См. FOUNDATION-COMPARISON §3.1.

**Новое из PHP/runtime manifest:** Slim рассчитан на поддерживаемые версии PHP 7.4–8.5, Winter — PHP >=8.1, Symfony HttpKernel/Routing 7.4 — PHP >=8.2; версия реального текущего хостинга ещё не проверена. UI schema-библиотека не принимает наш AI manifest без mapping; live-preview onChange не равен автосохранению. Детали в FOUNDATION-COMPARISON §3.2. **PHP/runtime manifest ≠ тест на хостинге.**

**Непроверенное:** реальные затраты адаптации, CPU/RAM/загрузка полной админки, PHP-only deployment, backup/revision engine, качество нестандартных адаптеров. Оценки в сравнении — гипотезы, не прохождение тестов и не доказанные проценты готовности. Этап 1 **идёт**, но **не принят**; этап 2 не открыт. Не менялись исходники CMS и исходные приоритеты.

**Документы:** `docs/FOUNDATIONS.md` (shortlist и критерии), `docs/FOUNDATION-COMPARISON.md` (135 строк, сравнительные гипотезы, code inspection, протокол испытаний), `docs/STAGE-1-TEST-LOG.md` (локальные тесты и ограничения), `docs/MASTER-TZ.md` §1.4 (внутренний характер и лицензии), `PROJECT-STATUS.json` (in_progress).

**При переносе в новый чат:** сначала прочитать этот файл и PROJECT-STATUS.json из GitHub, затем два исследовательских документа. Продолжать этап 1, без преждевременного выбора стека, без релиза MVP и без работы с CELIKOM.

## 10. Результаты продолжения этапа 1 — checkpoint v1.5 (17.10.2026)

**ДЕЙСТВИТЕЛЬНО ПРОВЕРЕНО:** в локальном исследовательском стенде Node 22 — 10/10 алгоритмических assert-сценариев по сохранению overrides, конфликтам v1→v2/v3/v4/v5, draft/published, inheritance и стабильным ID; в Chromium headless — метаиндекс 50 блоков при одном смонтированном iframe, live update без autosave и отказ неизвестному параметру; с локальным PHP 8.4 — отдельно опубликованный JSON продолжил обслуживаться публичной PHP-страницей после остановки заглушки админки.

**ГРАНИЦЫ ДОКАЗАТЕЛЬСТВ:** эти стенды **не используют и не проверяют исходный код Puck, JSON Forms, RJSF, Jedison или иной CMS**. Не тестировался реальный хостинг, сложные секции, безопасность, реальные сборки, миграции БД и нагрузка. npm registry недоступен (`EAI_AGAIN`), Composer CLI в исследовательской среде отсутствует. Стенды *не* являются продуктовым кодом и не означают принятие обязательных требований.

**НОВЫЙ КАНДИДАТ:** [Jedison](https://github.com/germanbisurgi/jedison) — MIT v1.27.1 (15.10.2026), JS без требуемых runtime/peer dependencies, готовая browser UMD-сборка (файл GitHub 256 132 bytes raw), customEditors/on-change/getValue/setValue/destroy по source code. JSON Editor того же типа ([json-editor/json-editor](https://github.com/json-editor/json-editor)) в maintenance mode, авторы направляют новых пользователей к Jedison. **Jedison теперь первое направление для следующего реального сравнения, а не утверждённый выбор технологии**; React варианты JSON Forms/RJSF остаются альтернативой, Puck/Winter — резервными архитектурами.

**Что дальше:** сравнить реальные оригинальные пакеты Jedison и JSON Forms/RJSF на одинаковом manifest Hero, измерить UI и сборки, проверить специфические custom controls, взаимодействие с iframe, затем в доступной разрешённой целевой среде PHP shared-hosting (без апгрейда) проверить предпосылки. Только затем давать окончательную рекомендацию для решения владельца на границе этапов 1/2.

**Где результаты:** [STAGE-1-TEST-LOG.md](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md](FOUNDATION-COMPARISON.md) §§3.1–3.3, [FOUNDATIONS.md](FOUNDATIONS.md). **Этап 1 в работе, не принят.** `PROJECT-STATUS.json` должен сохранять `code_exists=false`, `technology_selected=false` и `current_stage.state=in_progress`. CELIKOM не затрагивался.

## 11. Проверенный сравнительный запуск исходных редакторов — checkpoint v1.6 (17.10.2026)

**Успех:** создана отдельная не-продуктовая ветка `research/stage1-editor-comparison`; GitHub Actions [run #39054261780](https://github.com/manufact-test/ai-site-cms/actions/runs/39054261780) действительно установил исходные пакеты Jedison **1.27.1**, RJSF core и validator-ajv8 **6.11.0**, React19. Обе библиотеки в реальном headless Chromium приняли изменение `headline` с `Welcome` на `Browser edit`; Jedison также проверен в jsdom по get/setValue, RJSF в React SSR по четырём полям.

**Измерены минимизированные entry JS, gzip**: Jedison 48 287 bytes, RJSF+AJV8 130 517 bytes. Более полные браузерные entry: 48 345 vs 187 930 bytes gzip. Сравнивать с оговоркой: RJSF включает ReactDOM, Jedison не требует React. Реальная админка и CPU/RAM/FPS ещё **не измерены**. У Jedison для интерактивного изменения текста понадобились `change`/blur в стандартной конфигурации; это исследовательское наблюдение, не объявленный баг.

**Не сделано:** тест nested responsive/style fields и custom editors, запуск на существующем Hostinger, безопасный production-preview, реальные schema migrations в БД, релиз, принятие стека. `code_exists=false`, `technology_selected=false`, этап 1 всё ещё `in_progress`, не принят.

**Где смотреть:** [STAGE-1-TEST-LOG.md](STAGE-1-TEST-LOG.md) §7; [FOUNDATION-COMPARISON.md](FOUNDATION-COMPARISON.md) §3.4; [исследовательская ветка](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison). Продолжать исследование без начала программирования CMS и без расширения хостинга. Этап 2 только после выбора и приёмки владельцем.

## 12. Финальный контрольный проход перед сменой чата — checkpoint v1.7 (17.10.2026)

**Подтверждённый CI PASS:** [GitHub Actions run #39054829619](https://github.com/manufact-test/ai-site-cms/actions/runs/39054829619). Исследовательская ветка: \`research/stage1-editor-comparison\` (НЕ вливать в \`main\` до отдельного решения). Файл теста \`research/stage1/advanced.cjs\`. Действительные библиотеки Jedison 1.27.1 и RJSF 6.11.0 с AJV8 запущены в headless Chrome на **одинаковой** вложенной JSON Schema Hero.

**Оба редактора PASS:** desktop \`64px → 58px\`, tablet \`48px\` и mobile \`36px\` сохранены; shadow.blur \`10 → 18\`; animation.duration \`400 → 650\`; 50 секций метаиндекса и **1 iframe**; изменение desktop дошло до iframe и подтверждено; dirty flag без автосохранения, тестовый published snapshot не тронут. Оба показали 10 input elements, ошибок JS не зафиксировано. Это **обычные поля JSON Schema**, НЕ кастомные сложные field editors. Для preview используется исследовательский небезопасный \`postMessage("*")\`/fixed nonce — его НЕ использовать в production.

**Ранее подтверждено:** реальные bundle gzip entry (~48.3 KB Jedison vs ~130.5 KB RJSF + validator в одном варианте сборки; клиентский Chrome entry ~48.3 vs ~187.9 KB), и реальный ввод заголовка в Chrome. Результаты зависят от включённых пакетов и **не** являются весом CMS или прогнозом скорости.

**Исследовательская рекомендация:** Jedison — *лидер для дальнейшего прототипного сравнения* благодаря лёгкости и успешным тестам, но **НЕ утверждён как стек CMS**. Следующая работа этапа 1: проверить собственные field factories (length+units, composite shadow/gradient, animation), безопасность iframe, серверную PHP JSON Schema validation, ресурсоёмкость реальных секций, интеграцию с HTML/PHP/React и фактические условия shared hosting. **Ни этап 1, ни выбор основы ещё не приняты. Этап 2 не начинать.**

**Неприкосновенные решения:** 193 требований (135 обязательно, 42 желательно, 16 не нужно), полный релиз без MVP только после 135/135; CMS — независимый внутренний инструмент для клиентских админок; законно переиспользуем большие/малые части MIT/BSD/Apache кода, без платной лицензии по умолчанию, NOTICE внутри технической документации; текущий PHP-хостинг не расширяем; CELIKOM только изолированный пилот **после полного релиза на этапе 17**. \`main\` содержит только документацию исследования, оригинального CMS кода нет. **Все изменения checkpoint всегда записывать в тот же \`docs/NEXT-CHAT.md\` непосредственно в GitHub.**

**Источники истины:** [STAGE-1-TEST-LOG.md](STAGE-1-TEST-LOG.md) §8, [FOUNDATION-COMPARISON.md](FOUNDATION-COMPARISON.md) §3.5, [FOUNDATIONS.md](FOUNDATIONS.md), [PROJECT-STATUS.json](../PROJECT-STATUS.json), [ROADMAP.md](ROADMAP.md), [MASTER-TZ.md](MASTER-TZ.md), [REQUIREMENTS.md](REQUIREMENTS.md).

## 13. Новые проверенные результаты этапа 1 — checkpoint v1.8 (17.10.2026)

**Новый последний успешный прогон:** [GitHub Actions #39055909594](https://github.com/manufact-test/ai-site-cms/actions/runs/39055909594). Изменён исключительно исследовательский код ветки [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison); **НЕ сливать в main**. Новые файлы:
- [custom-widgets.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/custom-widgets.cjs)
- [secure-preview.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/secure-preview.cjs)
- [php-validation-smoke.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/php-validation-smoke.php)
- [performance.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/performance.cjs)
- [multirender.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/multirender.cjs)

**Что реально успешно проверено:**
1. Оригинальный Jedison 1.27.1 в настоящем Chrome с настоящими customEditors: изменение length 64px→72rem, составной shadow blur/color, gradient angle/from, animation enabled/duration/easing через самостоятельные контролы; конечный typed JSON цел, ошибок pageerror = 0. Внутренняя пользовательская конфигурация ещё НЕ окончательно определена.
2. Изолированный Chrome iframe без allow-same-origin получил opaque origin null, не смог обратиться к parent DOM, тестовый CSP заблокировал сетевой запрос; проверяемый typed postMessage-контракт применил 58px и отверг фальшивые/опасные сообщения. **Это стенд, НЕ production security certification.**
3. PHP 8.3.6 CLI в CI (без Composer/Node runtime PHP части) выполнил 16 кейсов собственного минимального typed-валидатора: 2 корректных принято, 14 ошибочных/вредоносных отклонено, включая 2 JSON parse/depth случая. **Полного JSON Schema валидатора ещё нет; реальный Hostinger не проверен.**
4. В отдельном тестовом iframe успешно менялся стиль у markup-строки статического HTML, PHP CLI output и React SSR output. **Не** настоящий Next.js SSR и **не** реальные клиентские сайты; упрощённый bridge из этого сценария нельзя копировать в production.
5. Первые диагностические замеры в Chrome, 5 прогонов: Jedison медиана 46.5 ms, RJSF медиана 63.1 ms до появления трёх полей, при 50 записях метаиндекса и одном iframe, JS загружен до таймера. **Не доказывает performance готовой CMS, не считается SLO**. Исследовательские browser gzip entries в этом эксперименте ~48.3 KB против ~187.9 KB, только для этих imports.

**Что осталось обязательно проверить ДО завершения этапа 1:**
- Полноценный PHP JSON Schema validator и соответствие dialect/семантики браузера и сервера, hostile payloads, медиатипы, URL, conditional/dependencies, неизвестные свойства; security API.
- Собственные составные editors RJSF на той же схеме для честного сравнения UX, нагрузок и сложности поддержки.
- Реальные сложные HTML/PHP/React/Next.js компоненты, сохранение overrides, responsive inheritance, тяжёлые секции и ресурсы, долгие сессии и rollback (не только строки markup).
- Изолированный smoke test **на текущем shared-hosting** без расширения тарифов и runtime, проверки версии PHP/extensions, прав/DB/rewrites/upload, security и backup в согласованном окружении.
- Итоговое исследовательское заключение для владельца с матрицей 135 обязательных ID и открытыми Q01–Q14. Отдельного согласования стека и приёмки этапа 1 пока НЕ было.

**ТОЧНЫЙ СЛЕДУЮЩИЙ ШАГ:** рассмотреть выбранный PHP JSON Schema валидатор (Opis или эквивалент с допустимой лицензией/доступным PHP), запустить его на том же manifest schema вместе с негативными fixtures через GitHub Actions; затем сопоставимое RJSF custom UI исследование. Документы — [STAGE-1-TEST-LOG.md](STAGE-1-TEST-LOG.md) §§9–10, [FOUNDATION-COMPARISON.md](FOUNDATION-COMPARISON.md) §8, [FOUNDATIONS.md](FOUNDATIONS.md), [PROJECT-STATUS.json](../PROJECT-STATUS.json).

**Границы без изменений:** 18 этапов 0–17; этап 0 принят; этап 1 *в работе, НЕ принят*; этап 2 *не начат*; 193 ответа (135 обязательных / 42 желательных / 16 ненужных), никакого MVP до 135/135; внутренний собственный AI Site CMS с законным максимальным повторным использованием permissive open-source; текущий PHP shared hosting не расширяем; CELIKOM только независимый пилот после полного выпуска на этапе 17. Код продукта CMS по-прежнему НЕ написан, выбранного стека НЕТ. Все следующие handoff-обновления — в ЭТОМ ЖЕ файле docs/NEXT-CHAT.md.


## 14. Продолжение после восстановления чата — checkpoint v1.9 (17.10.2026)

**Последний подтверждённый запуск:** [GitHub Actions #39057234158](https://github.com/manufact-test/ai-site-cms/actions/runs/39057234158), исследовательская ветка [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison); он **полностью PASS**. Исследования остаются в своей ветке; main содержит документацию, не production-код CMS. Документы текущего состояния обновлены: [PROJECT-STATUS.json](../PROJECT-STATUS.json), [STAGE-1-TEST-LOG.md §12](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §9](FOUNDATION-COMPARISON.md), [FOUNDATIONS.md](FOUNDATIONS.md).

**Подтверждено теперь, чего ещё НЕ было на v1.8:**
1. Настоящий RJSF 6.11.0 через user-defined ui:widget/ui:field повторил ровно те же четыре сложных контрола, что Jedison 1.27.1: length (64px→72rem), shadow blur/color, gradient angle/from, animation boolean/duration/easing. Выходной nested JSON идентичен, pageerror=0.
2. Две предыдущие CI-проверки RJSF были FAIL (#39056526064 и #39056622168) из-за отсутствующего второго аргумента пути у onChange при изменении вложенного объекта (RJSF v6 API). Исправлено через onChange(value, fieldPathId.path). Следующий CI #39056922334 PASS.
3. При тестировании одного и того же Draft 2020-12 manifest открылось отличие диалекта: обычный RJSF AJV8 default не понимал ссылку на Draft 2020-12 (CI #39057088160 FAIL). В исследовательском браузерном валидаторе теперь явная настройка customizeValidator({AjvClass: Ajv2020}) с pinned ajv 8.20.0. Opis 2.6.0 (Apache-2.0) уже поддерживал этот диалект.
4. Общий JSON Schema Draft 2020-12 и **14 идентичных fixtures** проверены независимо на JS RJSF validator-ajv8 с Ajv2020 и PHP Opis 2.6.0. **Обе стороны 14/14 PASS**: три правильных и 11 невалидных; в невалидных — опасные CSS строки, ошибочные units/types/ranges, лишние и отсутствующие свойства. Это доказательство покрытого подмножества, НЕ всех конструкций JSON Schema.
5. До этого через upstream Opis 2.6.0 с Composer/PHP 8.3.6 дополнительно успешно прошли 18 основных кейсов + 4 conditional/array кейса [CI #39056405362](https://github.com/manufact-test/ai-site-cms/actions/runs/39056405362).
6. Предыдущие данные о компактности Jedison, ограниченном диагностическом времени первого появления простых полей, sandbox/CSP и рендере строк HTML/PHP CLI/React SSR остаются верными **только для этих исследовательских тестов**, не являются production benchmarks.

**Важные неготовые вещи:** реальный Hostinger/shared-hosting не тестирован; Composer был только в CI, Node нужен только для сборки инструментов исследования, а не для PHP runtime. Не проверены полноценные реальные PHP/React/Next сайты и SSR, сохранение edited overrides с обновлениями, адаптивное наследование и UX, бэкапы/публикация/rollback, production CSP/XSS/CSRF, авторизация, uploads, browser RAM/FPS/тяжёлые секции, исполнение 135 обязательных требований. Никаких product claims по выполнению требований, архитектура не утверждена.

**ТОЧНЫЙ СЛЕДУЮЩИЙ ШАГ после v1.9:** продолжить этап 1 с проверок real-world сложного Hero/многошаговой секции на HTML/PHP/React (Next/SSR отдельно), корректного наследования desktop/tablet/mobile и сохранения owner overrides при смене manifest; сравнить нагрузку при длинной сессии и враждебные payloads. Проверить текущий PHP shared-hosting в разрешённой изолированной среде БЕЗ расширения тарифа и потом подготовить доказательную рекомендацию владельцу. Новые существенные тесты и ошибки писать в docs/STAGE-1-TEST-LOG.md и синхронизировать этот же файл docs/NEXT-CHAT.md при переходе в новый чат.

**Неизменные правила:** 193 приоритета (135 обязательных, 42 желательных, 16 ненужных), первый полноценный релиз только после приёмки 135/135, этапы 0–17 утверждены; этап 0 принят, **этап 1 продолжается, не принят**, этап 2 **не начат**. Jedison — предварительный лидер, RJSF — доказанная альтернатива, Opis — доказанный кандидат PHP validation; окончательный стек никто не утвердил. Код CMS не написан, пилот CELIKOM только после полного релиза этапа 16, как этап 17. Не вливать исследовательскую ветку в main без отдельного решения, не создавать параллельный handoff-файл.


## 15. Следующий исследовательский проход — checkpoint v1.10 (17.10.2026)

**Новый подтверждённый полный PASS:** [GitHub Actions #39058603992](https://github.com/manufact-test/ai-site-cms/actions/runs/39058603992), ветка [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison), НЕЛЬЗЯ автоматически вливать в main. Исследовательские исходники:
- [override-evolution.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/override-evolution.cjs)
- [representative-hero.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/representative-hero.cjs)
- [public-runtime/index.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/index.php)
- [public-runtime.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime.cjs)

**Что проверено:**
1. 14 сценариев модельного поведения stable IDs / responsive desktop, tablet, mobile inheritance, owner overrides, separate live/draft/published state, два revisions и rollback. При AI v1→v2 пользовательские текст и desktop/tablet размеры не перезаписаны. Попытки удалить используемый параметр или сделать старое owner значение недопустимым дают два явных конфликта; published snapshot при ошибке не изменяется. Опасные CSS и неизвестные поля отклоняются. PASS. Это исключительно исследовательская модель в памяти, не CMS и не реально мигрированная БД.
2. В Chromium настоящий Jedison 1.27.1 управляет более сложным HTML/CSS Hero с карточками, CTA, адаптивной сеткой и цветами. Слева 50 записей метаиндекса, смонтирован один sandbox iframe. Desktop 64px, tablet через UI 48→52px, mobile наследует tablet 52px, собственный mobile 32px. Строка похожая на HTML с onerror появляется только текстом. Published title не затронут live editing. JS errors 0. PASS. Это искусственная HTML секция, без внешней сети, тяжёлых 3D/видео и production-адаптеров.
3. Ранние [CI #39058137775](https://github.com/manufact-test/ai-site-cms/actions/runs/39058137775) и [#39058260391](https://github.com/manufact-test/ai-site-cms/actions/runs/39058260391) FAIL: мгновенный postMessage ack не гарантировал завершение CSS transition и computed font-size. В тесте responsive CSS transition отключена, iframe прокручивается в видимую область; [#39058376654](https://github.com/manufact-test/ai-site-cms/actions/runs/39058376654) PASS. Отдельные проверки CSS animations остаются нужны.
4. PHP 8.3.6 built-in HTTP server на runner GitHub Actions отдал HTML Hero из **отдельного опубликованного JSON файла**, без Node/admin/editor JavaScript. GET 200, /admin 404, POST 405, атомарная замена опубликованного snapshot отображается в новом GET, HTML escaping защищает от разметочной инъекции, rollback восстанавливает предыдущий контент. Неверный напрямую подменённый CSS snapshot даёт 503 (fail closed), а не опасный CSS. PASS. Не проверено реальное окружение Hostinger, защита и устойчивость к повреждению опубликованных данных — для production нужен last-known-good и prepublish validation.
5. Предыдущие успехи: RJSF/Jedison custom widgets одинаково меняют четыре сложных типа, RJSF AJV Draft 2020-12 и PHP Opis 2.6.0 одинаково принимают/отвергают все 14 schema fixtures. Это покрытие отдельных сценариев, не готовая CMS.

**Ограничения (не выдавать за сделанное):** фреймворк окончательно не выбран; настоящая CMS/база/выпуск не написаны; Hostinger shared hosting НИ РАЗУ не тестирован; реальный Next.js SSR может требовать Node, не обещать PHP-only SSR; не проверены конкурентные изменения пользователей, filesystem/DB backups, реальные многосекционные сайты, hosting rewrite/uploads/extensions, реальные CSP/CSRF/XSS/API правила, реальные большие 3D/video, performance на пользовательском устройстве и при длительном редактировании.

**ТОЧНЫЙ СЛЕДУЮЩИЙ ШАГ:** в этапе 1 проверить реальный многоэлементный PHP/React/Next-static блок в preview через adapter boundaries, сравнить такой же сложный сценарий на RJSF, проверить server-side publish validation с last-known-good/rollback под невалидными данными и выполнить доступный разрешённый smoke test именно на существующем shared hosting без расширения среды. Затем подготовить объективный вывод по foundation matrix и 135 обязательным ID, предъявить владельцу для согласования выбора направления. **Этап 1 не принят. Этап 2 не начинать без подтверждения владельца.**

**Последние документы:** [STAGE-1-TEST-LOG.md §13](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §10](FOUNDATION-COMPARISON.md), [FOUNDATIONS.md](FOUNDATIONS.md), [PROJECT-STATUS.json](../PROJECT-STATUS.json), [ROADMAP.md](ROADMAP.md). В будущем обновлять **именно этот** docs/NEXT-CHAT.md. Владелец утвердил 193 требования: 135 обязательно, 42 желательно, 16 не нужно. Весь первый официальный релиз — только после реальной 135/135 приёмки, без MVP. Этап 0 принят; этап 1 in_progress; этап 2 not_started; этап 17 CELIKOM — только отдельный пилот после полного релиза, вне текущего проекта. Исследовательская ветка отдельно от main; main — документация.


## 16. Фрагмент этапа 1 завершён, передача в новый чат — checkpoint v1.11 (17.10.2026)

**ПОСЛЕДНИЙ ПОДТВЕРЖДЁННЫЙ ПОЛНЫЙ CI PASS:** [GitHub Actions #39059714864](https://github.com/manufact-test/ai-site-cms/actions/runs/39059714864); отдельная research-ветка [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison), исследовательский commit **a7d8ac5e068d619397ab77c699a046bb73b3768a**. В main сохранены только документы; исследовательский код не сливать. Статус [PROJECT-STATUS.json](../PROJECT-STATUS.json) checkpoint **1.11**.

### Что только что реально сделано

- В research-ветке добавлены [public-runtime/published-hero.schema.json](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/published-hero.schema.json), [snapshot-store.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/snapshot-store.php), [publish-cli.php](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/public-runtime/publish-cli.php), [publish-rollback.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/publish-rollback.cjs); изменены исследовательские public-runtime/index.php, public-runtime.cjs и CI workflow.
- Настоящий **PHP 8.3.6 HTTP + CLI на GitHub runner и Opis JSON Schema 2.6.0**. Перед публикацией валидатор отклоняет 7 вредоносных/некорректных входов без изменения опубликованного файла. 500 кодовых точек Unicode корректны, 501 — отвергнуты. Проверены HTML escaping, сохранение истории ревизий, явный CLI rollback, отказ path traversal, 4 одновременных CLI writer под flock, временная запись+rename на одной файловой системе.
- При **повреждении current.json** публичная PHP-страница возвращает HTTP **200** из проверенного **last-good.json**, без Node/admin/editor JavaScript. Publisher не перезаписывает повреждённый current до явного rollback. Если повреждены и current, и last-good — **HTTP 503 fail closed**; отдельный rollback из валидной истории восстанавливает HTTP 200. В сценарии создано 11 сохранённых исследовательских ревизий. Это однофайловый snapshot Hero, а не реальное долговременное хранилище проекта.
- Ошибка: [#39059638142](https://github.com/manufact-test/ai-site-cms/actions/runs/39059638142) FAIL старого regression из-за изменившегося текста ответа 503, его HTTP-статус не менялся. Assertion исправлен, итоговый [#39059714864](https://github.com/manufact-test/ai-site-cms/actions/runs/39059714864) PASS всех прежних и новых тестов.
- **Подробный технический отчёт в main:** [STAGE-1-SNAPSHOT-PUBLISH-RESEARCH.md](STAGE-1-SNAPSHOT-PUBLISH-RESEARCH.md); [STAGE-1-TEST-LOG.md §14](STAGE-1-TEST-LOG.md); [FOUNDATION-COMPARISON.md §11](FOUNDATION-COMPARISON.md); [FOUNDATIONS.md](FOUNDATIONS.md); [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md); [PROJECT-MAP.md](PROJECT-MAP.md); [ROADMAP.md](ROADMAP.md); [README](../README.md). Документы и PROJECT-STATUS синхронизированы.

### Границы — не преувеличивать

**Настоящий текущий shared hosting/Hostinger НЕ проверен.** Версия PHP, расширения, Composer vendor на реальном hosting неизвестны; нет реального Apache/Nginx/FPM, БД, файловых прав, uploads, подключения клиентского сайта или auth. Нет production fsync/offsite backups/distributed locks/rollback при потере питания, RBAC/CSRF/XSS assurance, CDN, real traffic или multiple-editor conflict resolution. Четыре CLI writer — ограниченный smoke-test. Ни одно из 135 обязательных требований CMS не принято из-за тестов. CMS не разрабатывалась, итоговый стек не утверждён. Jedison/RJSF/Opis остаются кандидатами, а не выбранной основой.

### Точный следующий исследовательский фрагмент — следующий чат

**Продолжить ЭТАП 1, а НЕ начинать этап 2:** исследовать real representative multi-element HTML/PHP/React/Next-static preview adapter boundaries, проверить сопоставимый тяжёлый Hero на втором редакторе RJSF с идентичными данными и breakpoints, затем при наличии санкционированного доступа выполнить изолированный smoke-test **существующего** PHP shared-hosting без расширения тарифов. Далее — security/performance/migrations, матрица 135 обязательных ID и отчёт для владельца. Next.js SSR на обычном PHP shared-hosting нельзя обещать: отличать Next static export от Node SSR. До начала продуктовой разработки/этапа 2 необходимо отдельное подтверждение владельца.

### Официальный статус и ограничения

193 требования: **135 обязательных / 42 желательных / 16 ненужных**; первая официальная версия только полная **135/135, без MVP**. Этапы 0–17: **0 принят, 1 in_progress/НЕ принят, 2 not_started**. CMS — независимый внутренний AI-first инструмент для сайтов клиентов, повторное использование permissive open-source, **никаких апгрейдов текущего PHP shared hosting**. CELIKOM не объединять с репозиторием: только отдельный пилот после полного выпуска CMS (этап 17). **Нельзя вливать research в main и нельзя создавать параллельный NEXT-CHAT.** При новых результатах сначала проверить CI, затем актуализировать main docs и **этот же** постоянный handoff.


## 17. Четыре реальные renderer-границы + сложный RJSF — checkpoint v1.12 (17.10.2026)

**ПОСЛЕДНИЙ ПОДТВЕРЖДЁННЫЙ ПОЛНЫЙ CI PASS:** [GitHub Actions #39062360601](https://github.com/manufact-test/ai-site-cms/actions/runs/39062360601) на исследовательском коммите [edbce0c1a62598c727c2ccf782b1637933fec980](https://github.com/manufact-test/ai-site-cms/commit/edbce0c1a62598c727c2ccf782b1637933fec980), ветка [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison). **НЕ ВЛИВАТЬ** исследовательскую ветку в main без отдельного согласования. В main — официальные документы/статус, исследовательский код вне main.

### Что фактически проверено в новом фрагменте

1. Исследовательская многоэлементная секция: 12 stable IDs (section, title, lead, 2 CTA, 3 features, 2 cards, 2 stats), одинаковые ID и текст в **HTML**, реальном **PHP CLI HTML rendering**, **React 19 renderToStaticMarkup** и **реальном Next.js 15.5.12 `output:'export'`** со считыванием `out/index.html`. Не выдавать Next static export за Next SSR: SSR Node-сервер НЕ запускался на shared-hosting.
2. Настоящий **RJSF 6.11.0** с AJV Draft 2020-12 в Chromium на каждом из четырёх HTML артефактов меняет независимые CTA/feature/card; адаптив наследуется tablet 48→52px и mobile 52px, затем явно mobile 32px. Один sandbox iframe на вариант, 4/4 PASS, pageerror=0; HTML-like XSS строка остаётся текстом, типизированный bridge не принимает CSS injection. Unsaved draft не мутирует baseline published.
3. Новые файлы в ветке: [adapter-section.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/adapter-section.cjs), [complex-adapters.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/complex-adapters.cjs); CI workflow обновлён и заново прогнал прежние исследования, включая Opis.
4. Четыре **промежуточных FAIL**: [#39061383207](https://github.com/manufact-test/ai-site-cms/actions/runs/39061383207), [#39061563894](https://github.com/manufact-test/ai-site-cms/actions/runs/39061563894), [#39061820782](https://github.com/manufact-test/ai-site-cms/actions/runs/39061820782), [#39061989954](https://github.com/manufact-test/ai-site-cms/actions/runs/39061989954). Первоначальный inline `iframe.srcdoc` bridge script не попал в DOM и не прислал ready; истинная первопричина НЕ определена. Итоговый тест подтвердил **функциональность** моста после post-load вставки скрипта в sandbox iframe **через Playwright**. Это **не проверка нормальной production загрузки bridge с реальной CSP/nonce**, этот вопрос открыт! Предыдущий самостоятельный CSP/secure-preview тест прошёл, но не заменяет сквозного.

### Обновлённые документы в main

- [STAGE-1-TEST-LOG.md §15](STAGE-1-TEST-LOG.md) — подробный PASS, промежуточные FAIL и ограничения.
- [FOUNDATION-COMPARISON.md §12](FOUNDATION-COMPARISON.md), [FOUNDATIONS.md](FOUNDATIONS.md) — исследовательская сравнительная оценка, НЕ выбор технологии и не приёмка 135 mandatory.
- [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) — Q01–Q14 по-прежнему открыты.
- **Новый технический план**, не параллельный файл передачи: [STAGE-1-HOSTING-SMOKE-PLAN.md](STAGE-1-HOSTING-SMOKE-PLAN.md) — сначала read-only проверка существующего PHP shared-hosting, затем только с разрешением владельца изолированный краткий smoke без изменения тарифа/рабочих сайтов. **На реальном Hostinger/shared-hosting НИЧЕГО НЕ проверено.**
- [PROJECT-STATUS.json](../PROJECT-STATUS.json) — checkpoint 1.12.

### Точный следующий исследовательский шаг (этап 1, НЕ этап 2)

**Небольшой следующий фрагмент:** выяснить первопричину неисполнения inline iframe bootstrap в новом многоэлементном сценарии и независимо продемонстрировать обычный browser-load с обоснованной CSP, а не только инъекцию через Playwright; затем честно сопоставить по одинаковым нагрузкам RJSF/Jedison на многоэлементной секции, длинную редакторскую сессию/ресурсы и при разрешении изучить фактические ограничения текущего PHP shared-hosting по [плану](STAGE-1-HOSTING-SMOKE-PLAN.md). После каждого фрагмента CI и документирование; дальше матрица 135 ID и предъявление исследовательской рекомендации владельцу. **НЕ выбирать стек и НЕ создавать продуктовый код/начинать этап 2 без отдельного согласования.**

**Неизменные границы:** 193 требования, 135 обязательных / 42 желательных / 16 ненужных; первый релиз только после реальной 135/135 приёмки, без MVP; этап 0 принят, этап 1 *идёт, не принят*, этап 2 *не начат*; основной сайт посетителя должен быть независимым от админки; никаких изменений тарифа PHP shared-hosting; CELIKOM — отдельный пилот на этапе 17 только после полного релиза CMS; никто не утвердил окончательную основу.

### Для следующего чата

> Продолжаем **AI Site CMS** с checkpoint **v1.12**. Открой прежде всего [docs/NEXT-CHAT.md](https://github.com/manufact-test/ai-site-cms/blob/main/docs/NEXT-CHAT.md) §17 и [PROJECT-STATUS.json](https://github.com/manufact-test/ai-site-cms/blob/main/PROJECT-STATUS.json), затем журнал §15 и связанные документы. Последний полный успешный CI: [#39062360601](https://github.com/manufact-test/ai-site-cms/actions/runs/39062360601). В research-ветке HTML/PHP/React/Next-static сложная секция с 12 stable IDs и RJSF 4/4 PASS; inline iframe srcdoc bootstrap дал диагностические FAIL, итоговый functional PASS использовал post-load Playwright injection; CSP/bootstrap production НЕ доказан, Hostinger не тестировался. Продолжай **только этап 1**, исследуй реальный bridge bootstrap/CSP и честные Jedison/RJSF сравнения. Исследовательскую ветку не сливать в main, технологию не утверждать, тариф не менять, этап 2 не начинать без моего отдельного согласования. Документы обновлять в **этом же** NEXT-CHAT и PROJECT-STATUS.


## 18. Разобран srcdoc bootstrap, подтверждён CSP nonce — checkpoint v1.13 (17.10.2026)

**ПОСЛЕДНИЙ ДОКАЗАННЫЙ ПОЛНЫЙ CI PASS:** [GitHub Actions #39064252770](https://github.com/manufact-test/ai-site-cms/actions/runs/39064252770), исследовательский commit [c6d98dd64722a6e50e9a0708d5850e00cd9df465](https://github.com/manufact-test/ai-site-cms/commit/c6d98dd64722a6e50e9a0708d5850e00cd9df465), ветка `research/stage1-editor-comparison`. Основная `main` содержит документацию/статус, **исследовательскую ветку НЕ вливать** без отдельного решения владельца. Этап 1 всё ещё НЕ принят.

### Подтверждённый результат нового фрагмента

- Точная первопричина старых ошибок `iframe.srcdoc` из v1.12 найдена: **только HTML fixture** заканчивался на `</section` без финального `>`; одиночный DOM-parser/JSDOM молча закрывал тег в конце фрагмента, поэтому 12 stable IDs выглядели корректно. После конкатенации inline script получался `</section<script nonce=...`, содержимое bridge становилось текстом, `document.scripts.length=0`. **PHP-fixture был корректен**. Проблема не в природе CSP/React/Next.js/RJSF.
- Исправлен HTML closing tag и добавлен fail-fast assert, что **каждый из четырёх renderer-фрагментов** заканчивается полным `</section>`. Этот кейс демонстрирует, что browser DOM parity недостаточно для проверки корректности границы HTML-артефакта.
- **HTML, настоящий PHP CLI renderer, React static HTML, настоящий Next.js static export** снова дали одинаковые 12 stable IDs. Но теперь все 4 сценария с настоящим **RJSF 6.11.0** запускают preview bridge через **нативный `iframe.srcdoc` inline script с CSP nonce**, а не через Playwright injection. Один sandbox iframe на секцию, tablet 48→52px, mobile inherit 52px/override 32px, CTA/feature/card обновляются, XSS-подобная строка — текст, некорректный CSS отклонён, editor draft не меняет опубликованный baseline, page errors 0. **4/4 PASS**.
- Новый [srcdoc-bootstrap.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/srcdoc-bootstrap.cjs): (а) обычный native script PASS, (б) правильный nonce + CSP meta PASS, (в) **неправильный nonce: script остаётся в DOM, но НЕ выполняется и НЕ отправляет сообщение** — PASS. Метаполитика использована в CI; полноценный production CSP/header/nonce lifecycle пока НЕ испытан.
- Цепочка промежуточных failures задокументирована в [STAGE-1-TEST-LOG.md §16](STAGE-1-TEST-LOG.md): [#39063380496](https://github.com/manufact-test/ai-site-cms/actions/runs/39063380496), [#39063563592](https://github.com/manufact-test/ai-site-cms/actions/runs/39063563592), [#39063776817](https://github.com/manufact-test/ai-site-cms/actions/runs/39063776817) — дефект HTML; [#39063941053](https://github.com/manufact-test/ai-site-cms/actions/runs/39063941053) — рабочий полный bootstrap; [#39064099051](https://github.com/manufact-test/ai-site-cms/actions/runs/39064099051) — ошибочное ожидание *видимости* script вместо `attached` в отрицательном тесте; [#39064252770](https://github.com/manufact-test/ai-site-cms/actions/runs/39064252770) — окончательный **весь workflow PASS**, в том числе старые Opis/override/publisher.

### Где результаты находятся в main

[STAGE-1-TEST-LOG.md §16](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §13](FOUNDATION-COMPARISON.md), [FOUNDATIONS.md](FOUNDATIONS.md), [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) и машиночитаемый [PROJECT-STATUS.json](../PROJECT-STATUS.json) — checkpoint **1.13**. Постоянный файл передачи всё ещё единственный: **этот** `docs/NEXT-CHAT.md`; старые разделы содержат исторические результаты, актуальна последняя контрольная точка.

### Оставшиеся ограничения и точный следующий фрагмент этапа 1

1. **Сопоставимый по данным и сложности нагрузочный тест Jedison 1.27.1 vs RJSF 6.11.0** на одинаковых 12 stable IDs, одинаковых многоэлементных полях, частых изменениях, повторных монтированиях/размонтированиях, более долгой сессии; браузерные метрики не выдавать за реальные пользовательские SLO.
2. Проверка AI-generated HTML syntax/rawtext edge cases до внедрения preview bridge; CSP nonce lifecycle, взаимодействие с недоверенной HTML/CSS/медиа, protocol-level postMessage, права доступа и production security всё ещё не закрыты.
3. **На реальном PHP shared-hosting/Hostinger ни разу не тестировали**: сначала согласованный read-only осмотр фактических PHP/extension/permissions по [STAGE-1-HOSTING-SMOKE-PLAN.md](STAGE-1-HOSTING-SMOKE-PLAN.md); никаких апгрейдов тарифов, глобальных настроек, реальных сайтов или CELIKOM.
4. Затем интегральное заключение по требованиям: 135 обязательных ID, корректное покрытие/недоказанные пункты, предложение владельцу. **Не начинать этап 2 / не выбирать окончательный стек** до явного согласования и приёмки этапа 1.

**Неизменные условия:** 18 этапов (0–17), этап 0 принят, этап 1 `in_progress` и НЕ принят, этап 2 `not_started`. Из 193 требований 135 обязательных / 42 желательных / 16 ненужных; никакого сокращённого MVP и первого релиза до реальной приёмки 135/135. Максимальное законное переиспользование permissive open-source, существующий PHP shared-hosting без расширения тарифа, CELIKOM — независимый будущий пилот на этапе 17 ПОСЛЕ полноценного релиза. Production CMS не написана; исследовательские harnesses — не релизный код.

### Текст для перехода в следующий чат, когда это понадобится

> Продолжаем **AI Site CMS** с checkpoint **v1.13**, репозиторий `manufact-test/ai-site-cms`. Сначала прочитай `docs/NEXT-CHAT.md` **раздел 18**, `PROJECT-STATUS.json`, `docs/STAGE-1-TEST-LOG.md` §16, `docs/FOUNDATION-COMPARISON.md` §13, затем все нормативные документы. Последний полный успешный исследовательский CI: https://github.com/manufact-test/ai-site-cms/actions/runs/39064252770. Исправлена отсутствующая `>` в HTML `</section>`, из-за которой srcdoc bridge не запускался; все 4 HTML/PHP/React/Next-static + RJSF теперь 4/4 PASS с нативной CSP nonce загрузкой без Playwright injection; positive/negative nonce тесты тоже PASS. Остаёмся ТОЛЬКО на **этапе 1**. Следующий фрагмент — честный одинаковый long-session Jedison/RJSF workload и проверки HTML safety/hosting по разрешению. Исследовательскую ветку `research/stage1-editor-comparison` НЕ сливать в `main`, этап 2 НЕ начинать без согласования. Для handoff обновлять только существующий `docs/NEXT-CHAT.md` и `PROJECT-STATUS.json`.


## 19. Идентичные многоэлементные сеансы Jedison/RJSF — checkpoint v1.14 (17.10.2026)

**ПОСЛЕДНИЙ ПОДТВЕРЖДЁННЫЙ ПОЛНЫЙ CI PASS:** [GitHub Actions #39065084450](https://github.com/manufact-test/ai-site-cms/actions/runs/39065084450), исследовательский commit [1bfb163492e72947616717d4d4e3f8a8e44642d8](https://github.com/manufact-test/ai-site-cms/commit/1bfb163492e72947616717d4d4e3f8a8e44642d8), ветка **research/stage1-editor-comparison**. В неё добавлен [matched-editor-session.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/matched-editor-session.cjs); рабочий `main` содержит только официальную документацию и статус, НЕ продуктовый код. Исследовательскую ветку НЕ сливать в `main` без решения владельца.

### Подтверждённый новый результат

- **Настоящие Jedison 1.27.1 и RJSF 6.11.0**, оба на одном и том же `adapter-section.cjs`, **9 root JSON Schema properties**, **12 stable ID** (Hero с элементами CTA/feature/card/stat), 50 metadata-only записей и один sandbox iframe с нативным bridge. Реальные браузерные изменения: title, lead, 2 CTA, feature, card, stat, tablet responsive 48→52px, mobile inherits 52px и явный override 32px, ещё 32 последовательных изменения title за цикл. Ни одно значение published baseline не теряется от draft.
- Две очередности сравнения в ОДНОМ полном CI: (1) Jedison→RJSF, (2) RJSF→Jedison, **8 полных циклов mount/edit/unmount на каждую очередь** = **16 циклов и 656 зарегистрированных событий изменения модели на редактор**. После каждого изменения сопоставлено typed nested JSON, итоговые output библиотек `deepEqual`; одно iframe, 50 metadata elements, pageerror **0**. **PASS обеих библиотек**.
- **Наблюдения только внутри этого тестового Chromium/CI**, не свойства конечного продукта: gzip конкретной test entry сборки Jedison **48 284 байта**, RJSF с React+AJV2020 **190 905 байт**. Это НЕ полностью сопоставимые validator-included сборки. После GC цифры heap Jedison примерно 2.24→2.63 МБ по циклам, RJSF примерно 3.90→4.30 МБ, при обоих есть рост: **memory leaks ни доказаны, ни опровергнуты**. Полный scripted Playwright cycle в этих двух очередностях иногда проходил быстрее на RJSF; это не user-first-input SLO и не доказательство быстродействия реального UI. Тест — не многочасовая сессия.
- **Полный технический отчёт** с методикой, таблицей, caveats и воспроизведением: [STAGE-1-MATCHED-EDITOR-SESSIONS.md](STAGE-1-MATCHED-EDITOR-SESSIONS.md), [STAGE-1-TEST-LOG.md §17](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §14](FOUNDATION-COMPARISON.md), [FOUNDATIONS.md](FOUNDATIONS.md), [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md), [PROJECT-MAP.md](PROJECT-MAP.md), обновлённый [PROJECT-STATUS.json](../PROJECT-STATUS.json) checkpoint 1.14. Все эти документы находятся в `main`.

### Что следующим брать внутри этапа 1

1. Сравнить **одни и те же собственные composite custom editors** обоих кандидатов на одной более тяжёлой многоэлементной странице с имитированными медиа/анимацией, оценить проблемы длинной пользовательской сессии и синхронизации. Старые customWidgets были тестированы отдельно и не доказывают общий end-to-end UX.
2. Дополнить adversarial HTML syntax/inline rawtext CSS/JS и typed postMessage/nonce lifecycle проверки перед адаптерами; пройти реальные ресурсы, строгие права, медиа, конкурентность/rollback. В браузерных фикстурах PASS не означает production security.
3. **РЕАЛЬНЫЙ текущий Hostinger/PHP shared-hosting НЕ проверялся.** По [STAGE-1-HOSTING-SMOKE-PLAN.md](STAGE-1-HOSTING-SMOKE-PLAN.md) первоначально только разрешённый read-only осмотр, без изменения тарифа/работающих сайтов; отдельный smoke в изоляции возможен при доступе и отдельном разрешении.
4. Сопоставить все **135 обязательных ID** с доказанным/непроверенным и подготовить владельцу вариант решения. **Не утверждать технологию**, не принимать этап 1 без владельца, **не начинать этап 2**, не разрабатывать готовую CMS или ограниченный MVP.

**Неизменные условия:** 18 этапов 0–17, этап 0 принят, **этап 1 в работе, НЕ принят, этап 2 не начат**; 193 требований: 135 обязательных, 42 желательных, 16 не нужны. Первый официальный релиз только после 135/135 настоящих принятых mandatory требований, без MVP; permissive open-source с лицензиями; текущий PHP shared hosting без апгрейдов; CELIKOM — независимый первый пилот на этапе 17 только после полноценного релиза CMS. **Ни один из 135 обязательных пунктов не получил продуктовую приёмку от этой серии исследовательских стендов.** Этот `docs/NEXT-CHAT.md` — единственный постоянный handoff.

### Для нового чата, когда понадобится

> Продолжаем **AI Site CMS** с checkpoint **v1.14**, GitHub `manufact-test/ai-site-cms`. Прочитай из **main** `docs/NEXT-CHAT.md` **раздел 19**, `PROJECT-STATUS.json`, `docs/STAGE-1-TEST-LOG.md` §17, `docs/STAGE-1-MATCHED-EDITOR-SESSIONS.md` и остальные нормативные документы. Последний полный успешный CI: https://github.com/manufact-test/ai-site-cms/actions/runs/39065084450. В research-ветке подтверждены одинаковые JSON Jedison/RJSF на 12-ID многоэлементной схеме, по 16 циклов mount/edit/unmount и 656 изменений на редактор в двух порядках; page errors 0. Различия bundle/heap/time диагностические и недостаточны для выбора стека. Следующий фрагмент этапа 1: идентичные сложные custom composite widgets/media-мокки, продлённая сессия, security и read-only hosting при доступе; затем покрытие 135 обязательных ID. НЕ сливать research в main, не начинать этап 2 без отдельного согласия; единственный handoff — этот же `docs/NEXT-CHAT.md`.


## 20. Одинаковые составные поля Jedison/RJSF и безопасные media mocks — checkpoint v1.15 (17.10.2026)

**ПОСЛЕДНИЙ ПОЛНЫЙ УСПЕШНЫЙ CI:** [GitHub Actions #39066085194](https://github.com/manufact-test/ai-site-cms/actions/runs/39066085194), ветка `research/stage1-editor-comparison`, экспериментальный commit [fb12a4ea6ac27808e583207240d182edde997659](https://github.com/manufact-test/ai-site-cms/commit/fb12a4ea6ac27808e583207240d182edde997659). Проверено в логах `STAGE1_MATCHED_CUSTOM_MEDIA={"pass":true,...,"equalOutput":true}`. Все прежние тесты 12-ID HTML/PHP/React/Next static + native CSP nonce и 16-cycle/656-editor-event stress вновь PASS, PHP/Opis/rollback/parity PASS. Исследовательский код **НЕ сливался в main**, где живут только нормативные документы.

### Что реально сделали и подтвердили

- Добавлен [research/stage1/matched-custom-media.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/matched-custom-media.cjs) — сравнительный **настоящий Chrome** тест настоящих pinned **Jedison 1.27.1 / RJSF 6.11.0** по одному `typed-manifest.schema.json` Draft 2020-12.
- **4 composite kinds** по одной модели: `length` (number + px/rem/%), `shadow` (x/y/blur/color), `gradient` (angle/from/to), `animation` (enabled/duration/easing). Для каждого editor **два цикла mount/edit/unmount**, **девять UI правок в цикл**. Итог одинаков `fontSize:72rem`, shadow blur 25/color #abcdef, gradient 120/from #aabbcc, animation disabled/duration 850/easing linear. Nested JSON обоих кандидатов сравнивается `deepEqual`. Browser pageerrors **0**, 4/4 виджета и оба цикла PASS.
- Предпросмотр — одна нативно загруженная `iframe.srcdoc sandbox=allow-scripts`, opaque origin, токен и CSP nonce для JS, строго типизированная проверка входящего `postMessage`, **12 stable IDs**, 50 metadata-only записей без новых iframe. Контролы обновляют стиль реальной Hero-разметки; в ней только **3 DOM/CSS media mocks (image/video/animation)**, совершенно **БЕЗ загрузки реальных фото/видео/3D/WebGL/CDN**.
- Негативный CSS packet `shadow.color='url(javascript:alert(1))'` не даёт applied acknowledgment; published baseline не меняется от draft; controls исчезают после unmount. Это **узкое** исследование, не гарантия production безопасности, CSP/nonce lifecycle либо защищённости от недоверенной AI HTML.
- Важно: исследовательский harness переиспользует **существующие** реальные классы Jedison из `custom-widgets.cjs` и React RJSF fields из `rjsf-custom.cjs`, извлекая setup-функции как фрагменты текста. Это полезно для честного тестового reuse, но **НЕ production module/API design**; в проекте потребуются обычные модульные экспорты.
- **Новый подробный отчёт:** [docs/STAGE-1-COMPOSITE-MEDIA-RESEARCH.md](STAGE-1-COMPOSITE-MEDIA-RESEARCH.md). Прописали в [STAGE-1-TEST-LOG.md §18](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §15](FOUNDATION-COMPARISON.md), [FOUNDATIONS.md](FOUNDATIONS.md), [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md), [PROJECT-MAP.md](PROJECT-MAP.md), в машиночитаемом [PROJECT-STATUS.json](../PROJECT-STATUS.json) checkpoint **1.15**. Всё на `main`, перепроверять именно последний раздел этого единственного файла `NEXT-CHAT.md`.

### Где остановились и что делать дальше — только этап 1

1. **Следующий небольшой исследовательский кусок**: независимый adversarial test слоя AI-generated HTML/iframe, включая rawtext `<script>`/`<style>`, незавершённые теги, CSS injection, message source/token/origin; тест должен честно различать доверенный adapter HTML и недоверенный HTML, не обещая что production sanitizer уже есть.
2. Затем реальная **локальная media fixture** (фото, видео, отсутствие/ошибка resource, задержка, ограничения размера) без подключения к реальным сайтам, не забывая SSR/Next/static и UI fidelity; продлённая reliability-сессия, дизайн модульных интерфейсов custom editors.
3. Продолжать разбор **матрицы 135 mandatory ID**, доказательства против непроверенных ограничений; передавать владельцу оценку на этапе 1, НЕ утверждать окончательный стек. **Текущий реальный Hostinger/shared PHP ни разу не проверяли**: сначала только авторизованный read-only осмотр по [STAGE-1-HOSTING-SMOKE-PLAN.md](STAGE-1-HOSTING-SMOKE-PLAN.md) без изменений тарифа/реальных сайтов.
4. Этап 0 принят; **этап 1 = in_progress, НЕ принят**; **этап 2 = not_started**. Никакого внедрения product CMS, выбора framework или merge экспериментальной ветки без отдельного разрешения владельца. Ни одно из 135 обязательных требований не принято как продукт только по test harnesses.

**Неизменная политика:** 193 требования = 135 mandatory + 42 желательных + 16 не нужных, никакого MVP и первого релиза раньше реальных 135/135. Существующий PHP shared-hosting не апгрейдить, Node допустим для offline tooling. CELIKOM — **отдельный пилот на этапе 17, после полного релиза**, без смешивания репозиториев, баз данных, ключей или деплоя. Постоянный handoff один — этот `docs/NEXT-CHAT.md`.

### Стартовое сообщение для следующего чата (при необходимости)

> Продолжаем AI Site CMS с checkpoint **v1.15**. Репозиторий `manufact-test/ai-site-cms`. Открой на **main** `docs/NEXT-CHAT.md` раздел **20**, `PROJECT-STATUS.json`, `STAGE-1-TEST-LOG.md` §18 и `docs/STAGE-1-COMPOSITE-MEDIA-RESEARCH.md`. Последний полный CI PASS: https://github.com/manufact-test/ai-site-cms/actions/runs/39066085194. На research-ветке реальный Jedison 1.27.1 и RJSF 6.11.0 успешно тестированы с одинаковой Draft2020 моделью четырёх custom composite UI, нативной CSP nonce iframe, 12 stable IDs, тремя **только имитационными** media placeholders; 2×9 UI edits на редактор, JSON parity и pageerrors 0. Продолжай **исключительно этап 1**: next adversarial AI-generated HTML/iframe safety boundary, затем локальные real-media fixtures и 135 mandatory ID gap matrix. Не выбирать стек, не сливать research в main, не менять тариф/реальные сайты, не начинать этап 2 без согласия. Документы обновлять в **этом же** NEXT-CHAT и PROJECT-STATUS.


## 21. AI HTML boundary, rogue iframe/nonce protocol + 135-ID evidence matrix — checkpoint v1.16 (17.10.2026)

**ПОСЛЕДНИЙ УСПЕШНЫЙ ПОЛНЫЙ CI:** [GitHub Actions #39067271214](https://github.com/manufact-test/ai-site-cms/actions/runs/39067271214), commit [15ac65fd3f590999a6dad215e7f2db22e3acb9eb](https://github.com/manufact-test/ai-site-cms/commit/15ac65fd3f590999a6dad215e7f2db22e3acb9eb), исследовательская ветка `research/stage1-editor-comparison`. Запись GitHub `status=completed`, `conclusion=success`, лог `STAGE1_HTML_BOUNDARY={"pass":true,...,"malformedOrMaliciousRejected":20}`; ВСЕ прежние тесты Jedison/RJSF, 4 render adapters, PHP/Opis/parity/rollback, 16-cycle editor sessions и composite media mocks снова PASS в том же workflow. **Тестовый код не сливался в main.**

### Часть A. Защитная граница для разметки, создаваемой ИИ — исследование, НЕ production security

- Новый research-only [html-boundary-adversarial.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/html-boundary-adversarial.cjs), pinned `parse5 8.0.0`, строгое проверочное правило только для заданной Hero-грамматики: HTML fragment syntax parser errors, полный closing `</section>`, ровно один root, разрешённые теги/атрибуты и **12 уникальных stable ID** без изменения порядка. Реальный React-рендеринг с подозрительным HTML-подобным текстом сохраняет этот текст экранированным. **Оба положительных случая PASS; все 20 враждебных или некорректных HTML-случаев отклонены**: `script`, nonce spoof, `style`, inline style/URL/event handler, SVG, MathML, iframe/srcdoc, base/meta, foreign template, HTML comment, duplicate stable ID, malformed/unclosed tag and rawtext breakout.
- Отдельный нативный Chromium HTTP localhost probe: opaque `iframe sandbox=allow-scripts` без `allow-same-origin`, CSP meta с nonce script; **trusted bridge выполняется**, добавленный `<script>` без nonce блокируется, не вызывает illicit message. Проверка `postMessage` по `event.source`, ожидаемому реальному HTTP origin, token, kind, точной форме и типам; проверена подмена из parent/self и из **действительно чужого iframe**, а не из parent-контекста. Wrong token, additional payload field, wrong source rejected. Parent DOM недоступен child; XSS-like string через `textContent`, 0 browser page errors.
- **Никакой универсальной HTML sanitization/security готовности** отсюда не следует: политика фиксированного Hero допускает лишь узкую разметку, не любую будущую AI-generated секцию; реальные production CSP headers, media URL, external resources, authentication/authorization, token lifecycle и security threat model НЕ подтверждены.
- Честно документированы промежуточные debug FAIL: [#39066926805](https://github.com/manufact-test/ai-site-cms/actions/runs/39066926805) — отрицательный тест отправлял сообщение В rogue iframe вместо ИЗ него; [#39067088041](https://github.com/manufact-test/ai-site-cms/actions/runs/39067088041) — Playwright `locator.evaluate` принял DOM element за token и получил `DataCloneError`. После исправления код запускает adversarial security test **перед дорогими browser/editor comparison**, финальный #39067271214 **весь PASS**. Подробный документ в `main`: [STAGE-1-HTML-BOUNDARY-RESEARCH.md](STAGE-1-HTML-BOUNDARY-RESEARCH.md).

### Часть B. Полная traceability по исходным 135 обязательным требованиям

- Создан [STAGE-1-MANDATORY-EVIDENCE-MATRIX.md](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md) в `main` **не как продуктовая готовность**, а как postrочный gap report на основе **официального `requirements/requirements.csv`**, не пересказа. Все **193 ID** реестра: 135 обязательных, 42 желательных, 16 не нужно. В новой матрице перечислены **ровно все 135 обязательных ID**, все уникальные, без потери изначальных наименований.
- Из них **43** получили *только* ограниченные связи с существующими исследовательскими прототипами или документальным контрактом, **92** не имеют сопоставленного предметного теста. 43 **не означает** «43 сделаны»: **продуктовая приёмка 0/135**, цель остаётся 135/135. Каждому пункту будущий этап должен принести working module, реальные integration/e2e, responsive proofs, commit, решение владельца по [ACCEPTANCE.md](ACCEPTANCE.md).
- Матрица не меняет ранжирование требований и не отменяет 42 desirable/16 not needed. Она открывает пробелы в медиа, CSS, UI, SEO, публичном runtime, auth, backup, AI-first без дизайна и multiuser-конфликтах, и пригодна для будущего stage planning.

### Где всё сохранено и следующая задача (после перехода в новый чат)

- **main:** `docs/NEXT-CHAT.md` **этот же единственный файл**, раздел **21**, `PROJECT-STATUS.json` checkpoint **1.16**, [STAGE-1-TEST-LOG.md §19](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §16](FOUNDATION-COMPARISON.md), [STAGE-1-HTML-BOUNDARY-RESEARCH.md](STAGE-1-HTML-BOUNDARY-RESEARCH.md), [STAGE-1-MANDATORY-EVIDENCE-MATRIX.md](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md), `FOUNDATIONS.md`, `OPEN-QUESTIONS.md`, `PROJECT-MAP.md`; первая колонка / официальный source of truth `requirements/requirements.csv`.
- **research/stage1-editor-comparison:** новый `html-boundary-adversarial.cjs`, pinned `parse5 8.0.0` в `research/stage1/package.json`, обновлён workflow с security test первым; HEAD `15ac65fd3f590999a6dad215e7f2db22e3acb9eb`; main по-прежнему официальные документы, а не рантайм CMS.
- **Что делать следующим** исключительно внутри этапа 1: (а) сделать локальный реально загружаемый image/video fixture с fail/timeout/resource/permission boundary и подсчитать, что нужно для CMS; (б) разработать *проект решения*, не готовую production-систему, по расширяемой AI-site HTML/AST contract и CSP/origin/media policy; (в) использовать **всю 135-ID evidence matrix** для gap-based анализа; (г) read-only осмотр действующего PHP shared-hosting по [STAGE-1-HOSTING-SMOKE-PLAN.md](STAGE-1-HOSTING-SMOKE-PLAN.md) только при разрешённом доступе, без изменения тарифа/реальных сайтов; (д) подготовить варианты архитектуры для владельца без преждевременного выбора стека/начала этапа 2.
- **Неизменно:** 18 этапов (0–17), этап 0 принят; **этап 1 в работе и НЕ принят**, **этап 2 не начат**. Всего 193 требования, 135 mandatory; до первого полного релиза только после реальной приёмки 135/135 без урезанного MVP. Не трогать CELIKOM до отдельного этапа 17 ПОСЛЕ CMS релиза, независимый проект и тестовая копия. Текущий PHP shared-hosting НЕ апгрейдить, сам Hostinger не исследован. Ни технология, ни продуктовая архитектура не утверждены отдельно владельцем. Не merge research→main.

### ГОТОВОЕ ПЕРВОЕ СООБЩЕНИЕ СЛЕДУЮЩЕГО ЧАТА

> Привет! Продолжаем самостоятельный проект **AI Site CMS** с checkpoint **v1.16**. GitHub: https://github.com/manufact-test/ai-site-cms — открой в **main** `docs/NEXT-CHAT.md` **§21**, `PROJECT-STATUS.json`, `docs/STAGE-1-TEST-LOG.md` §19, `docs/STAGE-1-HTML-BOUNDARY-RESEARCH.md` и `docs/STAGE-1-MANDATORY-EVIDENCE-MATRIX.md`, потом актуальные `ROADMAP.md`, `MASTER-TZ.md`, `ACCEPTANCE.md`, `FOUNDATION-COMPARISON.md`, `AI-SITE-CONTRACT.md`. Последний проверенный полный CI PASS: https://github.com/manufact-test/ai-site-cms/actions/runs/39067271214 на ветке `research/stage1-editor-comparison`, commit `15ac65fd3f590999a6dad215e7f2db22e3acb9eb`. В исследовании adversarial HTML syntax/parser + srcdoc nonce/origin/source/token: 20/20 враждебных фрагментов отклонено узкой Hero-грамматикой, native iframe безопасные негативные сценарии PASS; это НЕ универсальный sanitizer/security-аудит. Создана матрица по исходным **135 обязательным ID**: 43 имеют лишь частичные research/doc сигналы, 92 пока без исследовательских доказательств, **продуктовая приёмка 0/135**. Прошу **самостоятельно продолжать только этап 1**: локальные реальные media fixtures и их отказные сценарии, затем расширяемая доверенная AI HTML/AST архитектура, gap analysis по 135 ID; разрешённый read-only осмотр существующего PHP shared-hosting только при доступе. Не выбирать стек без моего отдельного согласования, не начинать этап 2, не вливать research в main, не менять хостинг и не касаться CELIKOM. По окончании очередного блока обновляй ТОЛЬКО текущие постоянные документы и этот же единственный NEXT-CHAT, без второго handoff.



## 22. Реальные медиа, два профиля безопасного AST, 135-ID gap priorities — checkpoint v1.17 (17.10.2026)

**ПОСЛЕДНИЙ ПОЛНЫЙ CI PASS:** [#39068226228](https://github.com/manufact-test/ai-site-cms/actions/runs/39068226228) на исследовательской ветке `research/stage1-editor-comparison`, commit [`f53d6d20a13a138270520aa97eefb022a55c3a32`](https://github.com/manufact-test/ai-site-cms/commit/f53d6d20a13a138270520aa97eefb022a55c3a32). Реальный workflow **completed/success**, включая старые Jedison/RJSF, HTML/PHP/React/Next-static adapters, HTML security, PHP Opis/publishing/rollback и оба новых эксперимента. **Исследовательский код НЕ в main.**

### Завершено за несколько последовательных исследовательских фрагментов

1. **Настоящие media, а не DOM placeholders.** Новый `research/stage1/media-fixtures.cjs` создаёт через `ffmpeg` настоящие PNG/JPEG/WebM, проверяет их через localhost HTTP + настоящий Chromium. Изображение декодируется, видео duration 1s проигрывается, в opaque sandbox frame JPG/WebM также загружаются, frame не читает parent DOM. Реальный browser `<input type=file>` и POST принимают 3 корректных объекта и отклоняют 5 некорректных; 404, клиентский Abort, внешнее image load не декодировано, **page errors 0**. Хранение/полная upload security/антивирус, CDN, responsive image/video editing, large files, клиентские браузеры НЕ доказаны.
2. **Типизированный AI HTML/AST contract за пределами одного Hero.** `research/stage1/typed-ast-probe.cjs`: **два профиля** `hero` (4 nodes, 3 controls) / `media` (6 nodes, 4 controls), typed manifest/value separation, internal links, asset registry, HTML escaping, unique stable IDs/limits. **21/21 негативных AST payload отклонены**. Это proof-of-concept модульной грамматики, НЕ безопасный универсальный AI HTML/JS sanitizer и НЕ выбранная production архитектура.
3. **Глубже разобраны gaps всех 135 обязательных ID**: особенно непротестированные области геометрии 10/10, медиа 8/8, взаимодействий 15/15, страниц/SEO 15/15; даже 19/19 AI-контракт сигналов не означают working AI-first end-to-end. **43 ограниченных research/doc сигналов, 92 без соответствующей целевой проверки, продуктовая приёмка 0/135**. Числа не изменялись механически из-за media/AST stand-alone теста.

**Документы в main:** [STAGE-1-MEDIA-AST-GAPS-RESEARCH.md](STAGE-1-MEDIA-AST-GAPS-RESEARCH.md) (новый исследовательский отчёт, не handoff), [STAGE-1-TEST-LOG.md §20](STAGE-1-TEST-LOG.md), [STAGE-1-MANDATORY-EVIDENCE-MATRIX.md](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md) дополнение, [FOUNDATION-COMPARISON.md §17](FOUNDATION-COMPARISON.md), `PROJECT-STATUS.json`. **Единственный постоянный файл передачи — ЭТОТ `docs/NEXT-CHAT.md` (раздел 22).** Предыдущие разделы — история, не новая контрольная точка.

**Промежуточные FAIL были чисто исследовательскими и исправлены:** #39067920264 — ffmpeg отсутствовал в runner, его стали устанавливать в workflow; #39068040118 — тест принимал экранированную строку `onerror=` за атрибут; #39068132063 — media-профиль не содержит H1, а отрицательная проверка требовала его. После исправления **весь** workflow #39068226228 PASS.

### Что дальше, только этап 1

Исследовать реальные угрозы media ingestion (MIME+decode, malicious resource, storage boundaries, responsive variants), расширяемый AST/HTML-контракт на **3–5 действительно неодинаковых AI-authored секциях** с разными поведениями и редакторскими control bindings, CSS policy/render parity/nonce lifecycle. Продолжить сравнение вариантов А/В/С из отчёта и лицензий **без выбора**. Из матрицы 135 ID выбрать архитектурные блокеры, не превращая gaps в сокращённый scope. Действующий PHP shared-hosting Hostinger до сих пор **не проверен**: при разрешённом доступе сначала read-only осмотр по `docs/STAGE-1-HOSTING-SMOKE-PLAN.md`, никаких тарифов/изменений production. После ещё нескольких завершённых фрагментов обновлять документы пачкой и **тот же** NEXT-CHAT.

**Неподвижные границы:** этап 0 принят; этап 1 `in_progress` **не принят**; этап 2 `not_started`. 193 требования = 135 обязательных, 42 желательных, 16 не нужны. Первый релиз после реальных 135/135 без MVP; по-прежнему **0/135** продуктовых приёмок. Финальный стек только после согласования владельца, экспериментальный код нельзя merge в main. Независимый CELIKOM — только пилот на этапе 17 **после полного релиза** CMS, никакого касания сейчас.

### Стартовое сообщение следующего чата (при необходимости)

> Привет! Продолжаем независимый проект **AI Site CMS** с **checkpoint v1.17 (17.10.2026)**. Репозиторий private `manufact-test/ai-site-cms`, основная ветка `main`. Сначала открой `docs/NEXT-CHAT.md` **§22** (единственный постоянный handoff), `PROJECT-STATUS.json`, `docs/STAGE-1-TEST-LOG.md` **§20**, `docs/STAGE-1-MEDIA-AST-GAPS-RESEARCH.md`, `docs/STAGE-1-MANDATORY-EVIDENCE-MATRIX.md`, затем `FOUNDATION-COMPARISON.md`, `ROADMAP.md`, `MASTER-TZ.md`, `ACCEPTANCE.md`, `AI-SITE-CONTRACT.md`. Последний ПОЛНЫЙ успешный GitHub Actions: https://github.com/manufact-test/ai-site-cms/actions/runs/39068226228 на `research/stage1-editor-comparison`, commit `f53d6d20a13a138270520aa97eefb022a55c3a32`. Настоящие локальные PNG/JPEG/WebM в Chromium, включая video, sandbox frame, uploads: 3 приняты, 5 отклонены; отдельно два typed AI HTML AST профиля с 21/21 негативными отказами. Подробности в отчёте. Это только исследования, не production security/CMS. Матрица всех 135 mandatory: 43 частичных исследовательских/документальных сигналов, 92 без целевых тестов, продуктовая приёмка **0/135**. Самостоятельно продолжай **только этап 1**: сложные уникальные AI HTML/AST секции, editor-binding, media threats и архитектурные gaps/Hosting read-only только при доступе. Этап 1 не принят, этап 2 не начинать, стек не выбирать без согласования, research-ветку не сливать в main, CELIKOM не трогать. Обновлять после нескольких завершённых исследований только существующий `docs/NEXT-CHAT.md` + официальные документы, никакого второго handoff.


## 23. Пять уникальных типов секций × два реальных editor frameworks — checkpoint v1.18 (18.10.2026)

**ПОСЛЕДНИЙ ПОЛНЫЙ GITHUB ACTIONS PASS:** [#39069971771](https://github.com/manufact-test/ai-site-cms/actions/runs/39069971771), `research/stage1-editor-comparison`, head commit [`60f530745bfd324d9cedca8172e5300f0e61f9ea`](https://github.com/manufact-test/ai-site-cms/commit/60f530745bfd324d9cedca8172e5300f0e61f9ea). GitHub workflow **completed/success** целиком: новые профили, все прежние media/HTML/parser/nonce, HTML/PHP/React/Next-static adapters, Jedison/RJSF, Opis/PHP snapshot/rollback. **Исследовательский код не сливать в main**.

### Что добавлено с v1.17

- Новый research-only `multi-section-contract.cjs` — пять **разных вручную описанных** моделей `faq`, `contact`, `pricing`, `gallery`, `tabs` с явным registry типов, нормализованной JSON Schema, typed values, safe URL/asset/canonical render, стабильными ID, безопасным escaping. **Важно: это не независимая AI-генерация произвольного сайта**; templates остаются специально написанными для теста.
- Новый `multi-section-browser.cjs` — настоящие Jedison 1.27.1 и RJSF 6.11.0 на всех пяти секциях (**10/10 PASS**, модели после реальных UI правок одинаковые). Настоящий PNG/WebM браузер загружал; FAQ и tabs взаимодействуют в preview, Contact делает **только local** validation/confirmation (не реальная отправка); 30/30 hostile typed variant отклонены; по каждому профилю 0 pageerrors. Published baseline от draft не мутировал.
- Native browser `iframe sandbox=allow-scripts` с nonce CSP, typed source/origin/token/sequence сообщения и rogue sibling. Важная находка: обычный submit из iframe без `allow-forms` не работает — специально оставили ограничение и сделали local `click + checkValidity + preventDefault`, так что не пришлось ослаблять sandbox. Предварительный диагностический failure [#39069807024](https://github.com/manufact-test/ai-site-cms/actions/runs/39069807024); конечный полный PASS #39069971771. **Не утверждать, что формы на production проверены**.
- Mobile font inheritance FAQ 42px, Pricing 38px проверяли **по `data-size` typed render metadata**, НЕ по computed CSS для этих пяти профилей. Этот аспект надо отдельно закрывать.

**Официальные документы в main:** новый [STAGE-1-MULTI-SECTION-RESEARCH.md](STAGE-1-MULTI-SECTION-RESEARCH.md) (исследовательский отчёт, НЕ второй handoff), [STAGE-1-TEST-LOG.md §21](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §18](FOUNDATION-COMPARISON.md), дополнение [STAGE-1-MANDATORY-EVIDENCE-MATRIX.md](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md), `PROJECT-STATUS.json`, **этот же ЕДИНСТВЕННЫЙ `docs/NEXT-CHAT.md` §23**. Старый §22 и предшествующие — история.

### Что делать дальше — строго этап 1

1. Проверить **действительно независимые AI-generated уникальные sections** с новой вложенностью/CSS/behavior, не исходными пятью доверенными templates. Доказать register/manifest/bindings/coverage и обновление такого кода, отследить пробелы.
2. Сквозные renderer adapters HTML/PHP/React/Next-static для **неоднородных** секций и применение typed responsive/style changes к **computed CSS**, а не только `data-size`; отдельно browser a11y/real device.
3. Жёстче испытать media ingestion и строгую source/policy границу (polyglot MIME/signature, decoder, adversarial URLs, caching, limited uploads), nonce/token lifecycle/authorization model, и реальные формы только в изолированном отдельном тестовом public runtime.
4. На текущем PHP shared hosting при разрешении исследовать **только read-only** по `STAGE-1-HOSTING-SMOKE-PLAN.md`; не менять тариф, действующие сайты или production.
5. Сопоставлять с исходными 135 mandatory ID; готовить владельцу варианты архитектуры А/B/C и компромиссы **без одностороннего выбора стека или этапа 2**. Обновлять этот же NEXT-CHAT после нескольких исследовательских частей либо большого блока.

**Инварианты:** 18 этапов, этап 0 принят, этап 1 **in_progress/NOT accepted**, этап 2 **not_started**, technology **not selected**. Из 193 требований — 135 обязательных, 42 желательных, 16 не нужны, **производственная приёмка 0/135**, 43 частичных R/D и 92 N исследования, первый релиз только после 135/135 без MVP. Реальный Hostinger не проверен, experiment branch не вливать в main, CELIKOM отдельный пилот только этап 17 ПОСЛЕ полного CMS релиза.

### Готовое начало для следующего чата (когда понадобится)

> Продолжаем самостоятельный **AI Site CMS** с checkpoint **v1.18 от 18.10.2026**, GitHub private `manufact-test/ai-site-cms`. В `main` сначала прочитай **`docs/NEXT-CHAT.md` раздел 23** (единственный handoff), `PROJECT-STATUS.json`, `docs/STAGE-1-TEST-LOG.md` §21, `docs/STAGE-1-MULTI-SECTION-RESEARCH.md`, `docs/STAGE-1-MANDATORY-EVIDENCE-MATRIX.md`, `docs/FOUNDATION-COMPARISON.md`, затем ROADMAP/MASTER-TZ/ACCEPTANCE/AI-SITE-CONTRACT. Последний полный CI PASS: https://github.com/manufact-test/ai-site-cms/actions/runs/39069971771 на `research/stage1-editor-comparison`, commit `60f530745bfd324d9cedca8172e5300f0e61f9ea`. Новый исследовательский стенд: FAQ/Contact/Pricing/Gallery/Tabs × реальные Jedison/RJSF — 10/10 PASS, 30/30 hostile AST typed contracts refused, обе библиотеки дают одинаковые JSON, настоящие media и sandbox preview проверены. Это **ручные конечные профили**, НЕ автоматическое подключение произвольного AI-generated сайта; формы в iframe только local validation, без реальных submissions; адаптивные размеры здесь проверены как `data-size`, не computed CSS. Матрица 135 mandatory: 43 частичных research/doc сигналов, 92 без целевых доказательств, **0/135 продуктово принято**. Продолжай **ТОЛЬКО этап 1**: independent AI HTML/AST + manifest coverage, реальные CSS/behavior bindings, media threat boundaries, read-only осмотр хостинга исключительно при разрешённом доступе. Этап 1 не принят, этап 2 не начат, стек не выбирать без моего отдельного согласования, никакого MVP, research не мержить в main, CELIKOM не трогать. Обновлять по результатам следующих нескольких крупных фрагментов **тот же NEXT-CHAT** и официальные документы.

## 24. Новый слой annotated HTML, покрытие полей, реальный CSS и миграции — checkpoint v1.19 (18.10.2026)

**ПОСЛЕДНИЙ ПОЛНЫЙ CI PASS** — [GitHub Actions #39072109263](https://github.com/manufact-test/ai-site-cms/actions/runs/39072109263), на `research/stage1-editor-comparison` commit `e56834d379db2688bf22ad841213d48b0ab5cdd3`. Workflow **completed/success**, включая все прежние regression tests (Jedison/RJSF, real media, HTML trust boundary, HTML/PHP/React/Next static, PHP Opis/publish/rollback). **Тестовый код остаётся только в research branch**, `main` содержит официальные документы.

### Завершённый крупный исследовательский блок v1.19

- **От конечных ручных шаблонов к аннотированным произвольным по структуре секциям:** `research/stage1/annotated-html-contract.cjs` собирает manifest и JSON Schema из допустимого HTML с `data-stable-id` и `data-editable`, без отдельного `if(kind===...)` renderer на каждую структуру. Два вручную написанных исследовательских layouts: story/timeline (11 nodes, 8 declared editable fields) и board/comparison (13 nodes, 10 fields). Это НЕ реальный independently generated LLM HTML; аннотации заранее подготовлены.
- **Upstream browser parity:** `research/stage1/annotated-html-browser.cjs` использует реальный Chromium, Jedison 1.27.1 и RJSF 6.11.0, **2 structures × 2 editors = 4/4 PASS**, text editing через editor input, literal XSS-looking strings remain text, no pageerrors, draft не меняет published baseline.
- **Computed CSS в настоящем браузере (важная разница с v1.18):** font-size/gap `52px/30px` desktop 1200px, `35px/18px` tablet 720px, `35px/11px` mobile 360px для обеих структур и обоих редакторов; board `background-color: rgb(18, 52, 86)` через typed patch. **CSS values поданы программно через разрешённый typed preview bridge, НЕ через UI widgets редактора.** Viewport device simulation не является multi-browser device QA.
- **Ограниченная проверка HTML/manifest trust:** 19/19 malformed/hostile variations отказаны через parse5/strict HTML registry, ID uniqueness и typed values; CSP nonce opaque sandbox + origin/source/token/replay checks. Для scripted `.style` использован `style-src-attr 'unsafe-inline'` только в стенде, production CSP/security НЕ доказаны.
- **Owner override evolution:** обновление исходного HTML при неизменном stable ID сохраняет ручной заголовок; rename ID → blocking conflict `removed-or-renamed`; чужой override key → blocking quarantine. Это не транзакционные migrations базы CMS, не реальный publish/rollback.

**Новая точная граница:** алгоритм автоматически регистрирует **все помеченные** `data-editable` поля и закрывает пропуски/лишние ключи в их моделях, **но не угадывает неотмеченные свойства сайта**. Поле, не описанное ИИ в HTML, останется недоступным. Поддерживает пока только bounded safe text, fontSize, gap, backgroundColor, без arbitrary HTML/JS/CSS, custom effects/forms/media. Все выводы и риски — в [STAGE-1-ANNOTATED-HTML-COVERAGE-RESEARCH.md](STAGE-1-ANNOTATED-HTML-COVERAGE-RESEARCH.md).

**Официальные обновления в `main`:** [STAGE-1-TEST-LOG.md §22](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §19](FOUNDATION-COMPARISON.md), дополнение [STAGE-1-MANDATORY-EVIDENCE-MATRIX.md](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md), `PROJECT-STATUS.json` и **этот же единственный handoff-файл `docs/NEXT-CHAT.md` §24**, без создания новых файлов передачи.

### Следующая работа, только этап 1

1. Провести независимую **реальную AI-generated page+manifest fixture** (не заранее помеченную руками), проанализировать полноту зарегистрированных свойств по исходному design/DOM/CSS contract: пропущенные/дублирующиеся/несовместимые поля, качество аудита, immutable stable IDs и upgrade diff.
2. Увеличить глубину typed CSS: geometry, border, background image/video, hover/animation, variables без unsafe style injection; сделать реальные edit-through-Jedison/RJSF виджеты для responsive и проверить computed CSS, UI accessibility и разные viewport.
3. Проверить расширяемую политику для **новых component kinds**, форм, медиа, ссылок и поведения, не превращая CMS в whitelist ограниченных шаблонов, с явной trust boundary trusted source vs editable values и permissions.
4. Продолжить анализ критических gap clusters официальной матрицы и соответствия licensing/hosting constraints; настоящий Hostinger только при доступном разрешённом read-only способе; никакого обновления тарифа или реальных сайтов.
5. Готовить owner-facing архитектурные варианты A/B/C, но **не выбирать stack**, не переводить этап 1 в accepted, не начинать этап 2 без отдельного согласования. Документы сохранять после очередных завершённых исследований одним пакетом, и только здесь в том же `NEXT-CHAT.md`.

**Инварианты:** checkpoint v1.19, этап 0 принят; этап 1 `in_progress/not accepted`; этап 2 `not_started`; stack `not selected`; обязательные требования **135** (ещё 42 желательных и 16 не нужны), product acceptance **0/135**; 43 частичных research/doc evidence, 92 без целевых проверок, никакого сокращённого MVP. Экспериментальные ветки не merge в main. CELIKOM — отдельный пилот только на этапе 17 после полного выпуска CMS.

### Текст перехода для следующего чата (когда понадобится)

> Продолжаем независимый **AI Site CMS** с **checkpoint v1.19 от 18.10.2026** в private GitHub `manufact-test/ai-site-cms`. Сначала открой `main`: **`docs/NEXT-CHAT.md §24`** (единственный handoff), `PROJECT-STATUS.json`, `docs/STAGE-1-TEST-LOG.md §22`, `docs/STAGE-1-ANNOTATED-HTML-COVERAGE-RESEARCH.md`, `docs/STAGE-1-MANDATORY-EVIDENCE-MATRIX.md`, `docs/FOUNDATION-COMPARISON.md`, ROADMAP/MASTER-TZ/ACCEPTANCE/AI-SITE-CONTRACT. Последний полный успешный CI: https://github.com/manufact-test/ai-site-cms/actions/runs/39072109263, research branch `research/stage1-editor-comparison`, commit `e56834d379db2688bf22ad841213d48b0ab5cdd3`. Новый исследовательский код аннотированного HTML: 2 структуры, automatic manifest+JSON Schema для 8/10 заявленных editables, реальные Jedison/RJSF 4/4 runs PASS, 19/19 hostile HTML negatives rejected, реальный `getComputedStyle` для desktop/tablet/mobile, переименование stable ID блокирует миграцию owner overrides. CSS стили подаются программным typed patch, не реальным editor UI; разметка подготовлена человеком, НЕ независимой AI генерацией. Этап 1 по-прежнему НЕ принят; этап 2 не начат; stack не выбран; первая полноценная версия только после 135/135 обязательных — пока 0/135; 43 исследовательских/doc сигнала и 92 без matched targeted proof. Продолжай самостоятельно только этап 1: независимые AI-generated sites+manifest coverage, новые controls/responsive computed CSS/editor widgets, safe custom components, media and trust boundaries. Обновлять документы пакетами и **тот же** NEXT-CHAT. Research code не merge в main, действующий hosting только read-only при разрешении, CELIKOM не трогать.

## 25. Настоящие CSS-правки через upstream редакторы + coverage audit — checkpoint v1.20 (18.10.2026)

**ПОСЛЕДНИЙ ПОЛНЫЙ GitHub Actions PASS:** [#39073198622](https://github.com/manufact-test/ai-site-cms/actions/runs/39073198622), `research/stage1-editor-comparison` HEAD `c6c7eaaeacdc665ba1b9b753a8591db533004779`. Workflow **completed/success**: новый CSS input, новый audit, прошлые media/HTML boundary/5 types/annotated HTML, реальные Jedison/RJSF, secure iframe, HTML/PHP/React/Next adapters, PHP Opis publishing/rollback. Новые тесты/fixture код **только в research branch**; в `main` обновлены лишь официальные документы.

### Несколько завершённых исследовательских фрагментов с v1.19

1. **Закрыт конкретный пробел input-to-CSS.** Добавлен `research/stage1/annotated-editor-css.cjs`, который вместо программного `__updateTyped` из v1.19 использует **реальные input** upstream Jedison 1.27.1 и RJSF 6.11.0 для смены `fontSize.desktop/tablet`, `gap.desktop/tablet/mobile`, а в comparison `board` и `backgroundColor`. Два annotated HTML варианта `story` (11 узлов, 8 полей) / `board` (13 узлов, 10 полей) × два редактора = **4/4 PASS**, 0 browser `pageerror`. Данные проходят generated schema → actual editor onChange → typed sandbox bridge → DOM → native Chromium `getComputedStyle`, публичный baseline не меняется. **Computed** desktop 1200px: font/gap `52px/30px`; tablet 720px: `35px/18px`; mobile 360px: `35px/11px`; background в board `rgb(18,52,86)`. Это обычные generated nested **text inputs**, НЕ полноценные красивые responsive/length/color widgets, не arbitrary CSS coverage и не product.
2. **Аудит полноты известного manifest.** Добавлен `research/stage1/annotated-coverage-audit.cjs`. Берёт **внешний человеческий editable-intent ledger**, сравнивает с discovered `data-stable-id/data-editable` manifest: missing/extra binding, unmarked text leaf, duplicate ID, renamed/missing ID; учитывает явный read-only exception. **3 positive fixtures** (`timeline`, `dashboard`, отдельный static/legal), **13/13 mismatches identified**, **2/2 специально неразмеченных text leaf пойманы**. **Главное ограничение:** HTML и ledger подготовлены людьми; если ИИ одновременно пропустит свойство и там, и там, аудит не обнаружит его; arbitrary CSS coverage и independent AI generation НЕ подтверждены.
3. **Диагностика старого теста:** промежуточный FAIL [#39073066570](https://github.com/manufact-test/ai-site-cms/actions/runs/39073066570) был вызван race iframe viewport resizing (получали старый `innerWidth` сразу после установки ширины); обе browser studies теперь дожидаются **реального** iframe width до `getComputedStyle`. Тестовые критерии не ослабляли, итоговый весь workflow PASS.

**Пакет официальной документации `main`:** новый research report [STAGE-1-EDITOR-CSS-COVERAGE-AUDIT-RESEARCH.md](STAGE-1-EDITOR-CSS-COVERAGE-AUDIT-RESEARCH.md), [STAGE-1-TEST-LOG.md §23](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §20](FOUNDATION-COMPARISON.md), дополнение [STAGE-1-MANDATORY-EVIDENCE-MATRIX.md](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md), `PROJECT-STATUS.json` и **ровно тот же единственный `docs/NEXT-CHAT.md` §25**.

### Остались архитектурные блокеры этапа 1 — не менять курс без владельца

1. **Реально ИИ-сгенерированный независимый сайт + самостоятельно созданный manifest/intent**, оценить completeness, безопасность, пропуски одновременно в source и ledger, lifecycle stable-id и конфликтные migrations. Предыдущие 5+2+2 fixtures были вручную созданы как репрезентативные примеры, не считать их independent AI output.
2. **Safe property/component registry beyond 4 types**: styles geometry/margin/padding/gradients/responsive, animation/behavior/media/links/form. Сделать удобные custom widgets с native browser computed CSS и проверить межредакторские различия, accessibility/UX. Typed CSS patch с test-only `style-src-attr 'unsafe-inline'` — не выбранная production CSP.
3. Threat model: trusted AI/build source, upload source/MIME/decoder, public form delivery vs preview local validity, tokens/auth/RBAC, snapshot/backup, HTML/PHP/React parity для **гетерогенных** sections. Real Hostinger PHP только read-only при разрешённом доступе, не менять подписку, не трогать клиентские сайты.
4. Описать owner-facing A/B/C tradeoffs и гейты перед разрешением выбора итогового стека; **не решать архитектуру самостоятельно** и не начинать этап 2, пока владелец явно не утвердит.

**Неподвижные условия:** Stage 0 принят; Stage 1 `in_progress`, **NOT accepted**; Stage 2 `not_started`; technology **not selected**. Всего 193 требований = 135 mandatory, 42 desirable, 16 unwanted; 43 узких R/D и 92 без matched targeted evidence, **продуктовая приёмка 0/135**. Первый полный релиз только после 135/135, никакого MVP. Research branch не merge в main. CELIKOM — самостоятельный пилот только этап 17 **после полного выпуска** CMS.

### Готовое стартовое сообщение следующего чата (при смене чата)

> Продолжаем независимый проект **AI Site CMS** с **checkpoint v1.20 (18.10.2026)**. GitHub private `manufact-test/ai-site-cms`. Сначала прочитай из `main`: **`docs/NEXT-CHAT.md §25`** (единственный handoff), `PROJECT-STATUS.json`, `docs/STAGE-1-TEST-LOG.md §23`, `docs/STAGE-1-EDITOR-CSS-COVERAGE-AUDIT-RESEARCH.md`, `docs/STAGE-1-ANNOTATED-HTML-COVERAGE-RESEARCH.md`, `docs/STAGE-1-MANDATORY-EVIDENCE-MATRIX.md`, `FOUNDATION-COMPARISON.md`, ROADMAP/MASTER-TZ/ACCEPTANCE/AI-SITE-CONTRACT. Последний полный CI PASS: https://github.com/manufact-test/ai-site-cms/actions/runs/39073198622, ветка `research/stage1-editor-comparison`, HEAD `c6c7eaaeacdc665ba1b9b753a8591db533004779`. В v1.20 исправили разницу между programmatic typed patch и настоящими upstream native inputs: Jedison 1.27.1 / RJSF 6.11.0 изменяют responsive fontSize/gap и backgroundColor непосредственно через UI, Chromium computed CSS 1200/720/360, 2 structures × 2 editors = 4/4 PASS, 0 errors. Добавлен coverage audit с externally specified intent ledger, 3 fixtures, 13/13 негативных несоответствий пойманы; **не** доказывает полноту arbitrary AI сайта и independent LLM generation. Этап 1 всё ещё НЕ принят; этап 2 не начат, стек не выбран, research только на отдельной ветке; product accepted 0/135, 43 partial research signals/92 N; первый релиз только после 135/135. Продолжай **только этап 1**: независимые AI markup/manifest с coverage audit, extensible styles/widgets, media/security/form/publishing boundaries и approved read-only real hosting. Ни main research merge, ни CELIKOM, ни тарифов/production изменений. После 2–3 исследований сохраняй официальные документы пачкой и ОБНОВЛЯЙ **ЭТОТ ЖЕ** `docs/NEXT-CHAT.md`.

## 26. Trusted extensible CSS property packs, hostile registration и реальные editor/browser measurements — checkpoint v1.21 (18.10.2026)

**ПОСЛЕДНИЙ ПОЛНЫЙ CI PASS:** [GitHub Actions #39075385172](https://github.com/manufact-test/ai-site-cms/actions/runs/39075385172), исследовательская ветка `research/stage1-editor-comparison` HEAD `fba0093dc836ad8aa0695c34839b30d9f8efb6af`. Workflow **completed/success**, включая новый registry/hardening/native editor, все прежние checks (медиа, 5 sections, annotated HTML, Jedison/RJSF, secure iframe, HTML/PHP/React/Next-static, PHP Opis/publish/rollback). Исследовательский код **не сливался в main**, только отчёты и project status.

### Завершено в очередных исследовательских фрагментах

1. **Расширяемая модель свойств вместо layout templates:** новый `research/stage1/extensible-style-registry.cjs` с 3 разработчиком доверенными packs (`content/geometry/appearance`) и 10 allowlisted typed properties `text`, `fontSize`, `padding`, `borderRadius`, `maxWidth`, `gap`, `backgroundColor`, `borderColor`, `opacity`, `flexDirection`. Разрешённые CSS targets закреплены в коде; AI/owner значения не могут задавать произвольные CSS declarations, HTML или JS. `parse5` допускает только ограниченную grammar с `data-stable-id/data-editable`; schema автоматически получена из registry/HTML, typed `apply` меняет style/text без layout-specific renderer. **Trusted developer packs ≠ неограниченные плагины пользователя.**
2. **Статические adversarial проверки:** `research/stage1/registry-hardening.cjs` на 3 разных source markup layouts (8 DOM nodes/13 editable fields, 8/11, 3/2), **51 негативный случай отказан/обнаружен**, AJV 2020-12 schema parity с runtime, pack-name/target collisions atomic rejects, HTML/truncated/XSS/invalid CSS refused, external editable intent ledger показывает known missing/unexpected, owner override survives same stable ID, rename/out-of-range quarantines. **Не blind AI генерация**, intent ledger человек задаёт отдельно.
3. **Реальный браузер и реальные edit-through controls:** `research/stage1/registry-editor-browser.cjs` — 2 новые model-authored HTML layouts (`canvas` 8/13, `brief` 8/11) × настоящие Jedison 1.27.1/RJSF 6.11.0 = **4/4 PASS**, 0 JS pageerrors. UI-ввод изменяет fontSize/padding/borderRadius/gap/backgroundColor/opacity/flexDirection, затем typed message в opaque CSP nonce iframe. Chromium `getComputedStyle`: desktop 1200px padding40/font49/gap30; tablet 720px padding26/font49/gap17; mobile 360px те же inherited значения; radius 22px, background rgb(19,68,119), opacity 0.5, flexDirection column. Computed CSS **одинаковый** для обоих редакторов на обоих fixtures. No production custom visual widgets, no multi-browser QA.
4. **Отрицательные промежуточные CI/исправления:** при изменении regex JS source ошибочно использовал special replacement `$'` (suffix interpolation), отчего research-file оказался размножен и не парсился. Восстановлен из раннего Git-коммита, проверен синтаксис. Другой negative `malicious-markup-13` обнаружил, что HTML parser терпимо закрывал обрезанный тег; теперь дополнительно требуется явно исходный `</section>`. Это **узкая** дополнительная проверка, НЕ полный гарантированно безопасный HTML parser. Полный итоговый CI PASS, ничего в `main` не попадало из research code.

**Документы обновлены пакетом:** [STAGE-1-EXTENSIBLE-STYLE-PACKS-RESEARCH.md](STAGE-1-EXTENSIBLE-STYLE-PACKS-RESEARCH.md) (новый технический отчёт, НЕ handoff), [STAGE-1-TEST-LOG.md §24](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §21](FOUNDATION-COMPARISON.md), [STAGE-1-MANDATORY-EVIDENCE-MATRIX.md](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md) дополнительная запись, `PROJECT-STATUS.json` v1.21 и **этот же ЕДИНСТВЕННЫЙ `docs/NEXT-CHAT.md` §26**. Предыдущие разделы сохраняются как история.

### Дальше — ещё исследовательские гейты этапа 1

- **Независимый реально сгенерированный ИИ сайт+manifest/intent**, не специально написанный исследователем по известной грамматике. Проверить unknown tags/CSS/JS/components, потерянные editable props и stable IDs, сравнить сценарии отказа и coverage audit. Не объявлять расширение на 10 whitelisted props равным поддержке любых AI designs.
- **Trusted code/source boundary:** подготовить исследование разрешённых registration protocols для новых media/forms/interactions/animation/gradient/SEO, safe extension policy с version lifecycle, plugins trust review, без разблокирования arbitary JS/unsafe CSS. Отдельно запрет/альтернатива test-only `style-src-attr 'unsafe-inline'`, safe iframe nonce/token/authorization.
- **Cross-renderer:** расширить HTML/PHP/React/Next-static сравнение не только Hero, а на регистрируемые новые нестандартные структуры, source snapshot/update/migration, rollback и parity.
- **Хостинг:** текущий PHP shared-hosting Hostinger до сих пор не проверен; при разрешении только read-only по `STAGE-1-HOSTING-SMOKE-PLAN.md`, не менять тариф/production sites.
- **Предложить владельцу варианты A/B/C и компромиссы** только после обработки главных рисков; не выбирать самостоятельно технологию, не начинать этап 2 и не принимать этап 1 без owner approval.

**Инварианты:** всего 18 этапов (0–17). Этап 0 принят, этап 1 `in_progress, not accepted`, этап 2 `not_started`, technology `not selected`. 193 пункта = 135 mandatory, 42 desirable, 16 unwanted; матрица: **43 limited R/D**, **92 missing matched target**, продуктовая приёмка **0/135**. Первый публичный релиз только после 135/135, нет MVP. Код research не merge в `main`. CELIKOM — независимый пилот только этап 17 **ПОСЛЕ** полного релиза CMS.

### Текст старта следующего чата (если потребуется)

> Продолжаем независимый проект **AI Site CMS** с checkpoint **v1.21 (18.10.2026)**. GitHub private `manufact-test/ai-site-cms`. В `main` читай **`docs/NEXT-CHAT.md §26`** (единственный handoff), `PROJECT-STATUS.json`, `docs/STAGE-1-TEST-LOG.md §24`, `docs/STAGE-1-EXTENSIBLE-STYLE-PACKS-RESEARCH.md`, `docs/STAGE-1-MANDATORY-EVIDENCE-MATRIX.md`, `docs/FOUNDATION-COMPARISON.md`, ROADMAP/MASTER-TZ/ACCEPTANCE/AI-SITE-CONTRACT. Последний полный CI PASS: https://github.com/manufact-test/ai-site-cms/actions/runs/39075385172 на `research/stage1-editor-comparison`, HEAD `fba0093dc836ad8aa0695c34839b30d9f8efb6af`. В research-only создан trusted CSS property registry из 3 packs/10 properties, 51 adversarial model/HTML/plugin negatives, AJV schema parity. Две разнородные HTML-секции canvas/brief × реальные Jedison/RJSF — 4/4 Chromium PASS, actual UI properties padding/fontSize/gap/radius/color/opacity/flex, computed CSS desktop/tablet/mobile, 0 errors. Здесь model-authored hand-prepared markup, НЕ независимая blind AI генерация; plugin code доверенный, НЕ arbitrary JS/CSS. Этап 1 не принят, этап 2 не начат, стек не выбран, 0/135 требований продукта принято, 43 research/doc signals, 92 gaps. Продолжай **ТОЛЬКО этап 1**: independent AI site/manifest, extension trust/security, heterogeneous renderer parity, hosting read-only при разрешении и owner-facing варианты A/B/C; ничего в `main` из исследовательского кода, никакого MVP или CELIKOM. Обновляй официальные документы после крупного исследовательского пакета и **тот же** `NEXT-CHAT.md`.


## 27. Автономный AI-authored HTML сайт: coverage preflight, trust boundary, renderer parity — checkpoint v1.22 (18.10.2026)

**Последний ПОЛНЫЙ CI PASS:** [#39077113741](https://github.com/manufact-test/ai-site-cms/actions/runs/39077113741), HEAD research/stage1-editor-comparison 7d8178c54e557ec4a37f1427f0917dab2d9daabd, completed/success. Все предыдущие исследования Jedison/RJSF, media, HTML/CSP и PHP/Opis publishing/rollback также прошли. Экспериментальный код только в research, не main.

**Завершены три фрагмента:**
1. Отдельно model-authored полноценный Tide Atlas HTML/CSS/JS сайт (CSS variables, responsive grid, gradients, SVG, details, dialog, form, scripts), **не** специально подготовленный annotated fragment. Но это **не blinded second independent LLM**. 17 HTML IDs, 9 unkeyed leaf text, 16 manual intent bindings vs 12 candidate, 4 недостающих (antispam, placeholder, SVG, SEO), после заполнения 10 unsupported types → automatic publish fail-closed. 15 negative/override migration checks.
2. Только вручную выделенный safe content subset: HTML/PHP CLI/React static **6/6 семантических совпадений**, 18 refusals invalid payloads. Это НЕ автоматический перенос полного HTML/CSS/JS сайта, PHP работает в CI, не на Hostinger.
3. Реальный Chromium full-site в opaque iframe, test CSP script-src none: 84px H1 desktop, 48px mobile, grid применён, source JS и form POST заблокированы, DOM parent недоступен, 0 page errors. Это НЕ production CSS/CSP и оригинальные диалоги при блокировке скриптов не работают. Ранний diagnostic FAIL #39076877639 (favicon ошибочно учтён как POST) исправлен; полный CI PASS.

**Сохранено пакетом в main:** [технический отчёт STAGE-1-INDEPENDENT-SITE-CONTRACT-RESEARCH.md](STAGE-1-INDEPENDENT-SITE-CONTRACT-RESEARCH.md), [STAGE-1-TEST-LOG.md §25](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md §22](FOUNDATION-COMPARISON.md), дополнение к [STAGE-1-MANDATORY-EVIDENCE-MATRIX.md](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md), PROJECT-STATUS.json v1.22 и **этот же единственный** NEXT-CHAT §27. Других handoff не создавать.

**Дальше только этап 1:** действительно blinded other-model generation по открытому site contract + независимый scoring полноты; reviewed/versioned registered behavior/SEO/media/gradient capabilities с браузерными GUI tests; CSS/CSP/source trust boundaries; сложные cross-renderer updates/rollback. Реальный Hostinger только read-only при явном разрешённом доступе. Варианты A/B/C не выбирать самостоятельно, этап 2 не начинать, code research в main не merge, CELIKOM не трогать.

**Неизменные рамки:** этап 0 принят; этап 1 in_progress, **ещё НЕ принят**; этап 2 not_started, стек not selected. 193 = 135 mandatory + 42 desirable + 16 unwanted. Матрица 43 limited research/doc signals, 92 missing matched target probes; **продуктовые 0/135**, релиз только после 135/135.

### Готовое первое сообщение следующего чата (если понадобится)

> Продолжаем AI Site CMS с checkpoint **v1.22 (18.10.2026)**, private GitHub manufact-test/ai-site-cms. Открой в main docs/NEXT-CHAT.md **§27**, PROJECT-STATUS.json, docs/STAGE-1-TEST-LOG.md **§25**, docs/STAGE-1-INDEPENDENT-SITE-CONTRACT-RESEARCH.md, docs/STAGE-1-MANDATORY-EVIDENCE-MATRIX.md и FOUNDATION-COMPARISON/ROADMAP/MASTER-TZ/ACCEPTANCE/AI-SITE-CONTRACT. Последний полный GitHub Actions PASS: https://github.com/manufact-test/ai-site-cms/actions/runs/39077113741, research branch HEAD 7d8178c54e557ec4a37f1427f0917dab2d9daabd. Новый standalone Tide Atlas HTML/CSS/JS НЕ blinded LLM; 17 ids, 9 unkeyed text, 16 manual intents vs 12 declarations (4 missing), 10 unsupported after repair; 15 negative/migration; native Chromium opaque preview H1 84/48px source JS/form blocked, 0 errors; вручную сопоставленный безопасный HTML/PHP/React subset parity 6/6, 18 invalid refusals, НЕ полный автоматический site import. Этап 1 не принят, этап 2 не начат, стек не выбран, продукт 0/135, R/D 43 + missing 92. Продолжай ТОЛЬКО Stage1: independent blinded model site+manifest, reviewed versioned capabilities/forms/gradient/media, CSS/CSP trust and real rich cross-renderer fidelity; Hostinger read-only только с разрешением. Не merge experiment to main, не касаться CELIKOM, документы обновлять пакетно, единственный handoff — этот NEXT-CHAT.


## 28. Trusted behavior/visual packs, AI regeneration and persistent PHP recovery — checkpoint v1.23 (18.10.2026)

**LAST FULL CI PASS:** [GitHub Actions #39111755170](https://github.com/manufact-test/ai-site-cms/actions/runs/39111755170) — all 3 jobs comparison/regeneration/durability completed/success; research branch research/stage1-editor-comparison HEAD **32ab15f4ec523597724610011a71695bd05d5784**. The previous v1.22 report was supplemented by 4 actual tested research blocks without changing the selected technology or product status.

**Verified after v1.22:**
1. **Behavior review registry:** trusted-behavior-capabilities.cjs + trusted-behavior-browser.cjs — developer reviewed links/accordion/dialog/preview-only form; 2 actual upstream editors (Jedison 1.27.1, RJSF 6.11.0), 20 native field edits total; opaque CSP iframe, original JS blocked, no network form. Full previous CI #39079526881.
2. **Visual/media review registry:** reviewed-visual-asset-pack.cjs + reviewed-visual-asset-browser.cjs — gradient, animation and two curated SVGs, 8 fields, 18 real UI edits, 16 invalid values rejected; strict nonce CSS/CSP and reduced-motion; full previous CI #39109244889.
3. **AI component graph regeneration:** versioned-site-reconciliation.cjs + browser; 4→5 typed components with reorder/add, reviewed ID alias, retention of 6 owner overrides; no implicit publishing, conflicts quarantined, rollback keeps immutable revision history; Jedison/RJSF 2/2 browser sessions and 10 native edits. Earlier stalled old registry-editor-browser.cjs due to RAF width waiting; switched to bounded polling; full previous CI #39110896781.
4. **Durability / restart:** durable-site-store.php + durable-site-recovery.cjs, optional strict JS rehydration. Separate real PHP CLI processes write/read versioned typed snapshots with flock/CAS, checksum, bounded input, atomic rename, last-good backup, manual repair, valid revision rollback. **48 checks**, fresh Node rehydrations 3; stale CAS/invalid snapshots/corruption both copies/refused implicit owner loss/injected failure tested. Initial false positive for historical rollback corrected: only exact earlier published snapshot can bypass ordinary migration safeguards. All CI PASS #39111755170.

**Technical report:** [docs/STAGE-1-DURABLE-REGENERATION-RESEARCH.md](STAGE-1-DURABLE-REGENERATION-RESEARCH.md). Also updated in one batch TEST-LOG §26, FOUNDATION-COMPARISON §23, MANDATORY-EVIDENCE-MATRIX research note and PROJECT-STATUS.json v1.23. **All experimental code remains in research branch; main contains documentation only.** No extra handoff files.

**Known blockers, must not overstate:** tests on GitHub runner **NOT Hostinger**; no fsync/power-cut guarantees, authorization, multi-host DB, off-site backup, blind second-model site generation, arbitrary CSS/JS/SVG/forms/import, rich cross-renderer full-page parity, production CMS. A SHA256 digest is not an authentication mechanism.

**Invariants:** approved **18 stages 0–17**. Stage 0 accepted; **Stage 1 in_progress and NOT accepted**, Stage 2 not started, no stack selected. 193 requirements = **135 required + 42 desirable + 16 unwanted**; research signal ledger **43 limited / 92 missing**, **product 0/135 accepted**; release only at Stage16 after 135/135, separate CELIKOM pilot Stage17 after release and separate permission. No reduced MVP, no public-site changes, no merge research into main. Hostinger read-only only after permission.

**Saving policy from owner:** do NOT rewrite official docs after each minor step. Save research code/tests frequently in research branch; batch-update official docs only after a major coherent block or owner request/new chat. Maintain exactly ONE handoff file docs/NEXT-CHAT.md and append a numbered section.

### Скопируй в следующий чат

> Привет! Продолжаем самостоятельный проект **AI Site CMS** с контрольной точки **v1.23 от 18.10.2026**. GitHub private: https://github.com/manufact-test/ai-site-cms. Сначала открой в **main** docs/NEXT-CHAT.md **§28** (это единственный handoff), PROJECT-STATUS.json, docs/STAGE-1-DURABLE-REGENERATION-RESEARCH.md, docs/STAGE-1-TEST-LOG.md **§26**, docs/FOUNDATION-COMPARISON.md **§23**, docs/STAGE-1-MANDATORY-EVIDENCE-MATRIX.md, ROADMAP/MASTER-TZ/ACCEPTANCE/AI-SITE-CONTRACT. Код и тесты только в ветке research/stage1-editor-comparison, HEAD **32ab15f4ec523597724610011a71695bd05d5784**; последний полный CI **PASS**: https://github.com/manufact-test/ai-site-cms/actions/runs/39111755170 (все 3 jobs). После v1.22 проверили реальные браузерные редакторы Jedison/RJSF для reviewed links/forms/dialog/details (20 UI правок), reviewed gradient/animation/two vetted SVG (18 UI правок, strict nonce CSP), typed AI-component regeneration 4→5 с переносом owner overrides, подтверждённым ID rename, блокировкой конфликтов, publish и rollback; реальный PHP CLI file-store с CAS/flock/atomic rename/checksum/last-good/explicit repair, 48 проверок и 3 fresh Node rehydrations. **Это Stage1 исследовательские стенды, не готовая CMS и НЕ реальные тесты на Hostinger; SHA256 не MAC, fsync/multi-host/auth не доказаны.** Стек не выбран, Stage1 ещё НЕ принят, Stage2 не начинали, 135 обязательных продуктовых требований — 0/135 принято, research-doc ledger 43/92 прежний. Дальше автономно делай ТОЛЬКО Stage1: genuinely blind independent second-model site+intent, rich HTML/PHP/React/Next parity for atypical widgets, reviewed capability extension/trust and storage durability/security tradeoffs. Ни в коем случае не сливать research code в main, не касаться CELIKOM, не менять живой Hostinger; без выбора финального стека без меня. **Документы сохраняй пакетами после большого блока или по моей просьбе, не после каждого мелкого изменения.** После работы делай настоящий CI PASS. Полный релиз только после 135/135, CELIKOM отдельно Stage17.


## 29. Cross-runtime heterogeneous site parity and signed extension trust — checkpoint v1.24 (18.10.2026)

**LAST FULL CI PASS:** [GitHub Actions #39115456497](https://github.com/manufact-test/ai-site-cms/actions/runs/39115456497), research/stage1-editor-comparison HEAD **48b7579eaf7b0dddec6422b9890fdbab73daa2a0**. All **4 jobs** completed/success: comparison, regeneration, durability, mixed-site-trust. Only research branch contains code, main official docs only; existing browser/media/editor/PHP suite also green.

**Two major coherent research blocks since v1.23:**
1. Known *reviewed typed* heterogeneous graph 4→5 components (hero, disclosure, preview-form, media, copy), one reviewed ID rename + reordering, **6 owner overrides** retained. Full trusted typed view: HTML, real independent PHP 8.3 CLI renderer, React 19 static markup each across two states, **real Next 15 static export** after regeneration: **7/7** semantic comparisons, **675 assertions**, **10 injected markup corruption mutations detected** and **11 invalid PHP typed payloads denied**. Draft/publish separation and rollback retained. This still does NOT re-render arbitrary original standalone AI site's full CSS/JS/SEO or test SSR/React hydration/browser behavior across all four runtimes or actual Hostinger.
2. Capability provenance: **38 checks and 30 negative refusals** against ephemeral Ed25519 signed package, approved exact eight operation bindings and two locally curated SVG asset digests. *Separate* code-reviewed operation policy blocks even correctly signed arbitrary CSS/JS/DOM sinks/net/file privileges. Monotonic in-memory version/owner override preservation, replay/revocation; not persisted/production trusted-key system or sandbox.
3. Debugged and corrected three fixture failures (standard SVG xmlns URL falsely flagged, malformed HTML adapter envelope, falsely invalid field test). Final full CI 4/4 PASS.

**Official report:** [docs/STAGE-1-MIXED-SITE-PROVENANCE-RESEARCH.md](STAGE-1-MIXED-SITE-PROVENANCE-RESEARCH.md). Coherent batch updates TEST-LOG §27, FOUNDATION-COMPARISON §24, MANDATORY-EVIDENCE-MATRIX v1.24 note, PROJECT-STATUS.json and this SAME canonical NEXT-CHAT §29. No second handoff and no merge into main from research branch.

**Remaining Stage 1 gating priorities:** genuinely **blinded independent other-model** generated site AND manifest/intent independently scored for absent/unsupported fields; full original heterogenous HTML/CSS/JS/media/SEO parity and behavior, not just a known reviewed component graph; capability plugin trust, persistent trusted roots/anti-replay/revocation, real upload boundaries and approval model; snapshot real host/fsync/backup/restore only after specific read-only Hostinger permission; owner-facing A/B/C choices and sign-off. No final stack selection; Stage2 NOT started.

**Preserved immutable product status:** 18 stages (0–17), Stage0 accepted; Stage1 in progress **NOT accepted**, Stage2 not started; 193 requirements=135 mandatory+42 desirable+16 unwanted. Evidence 43 limited research/doc vs 92 matching gaps; **0/135 mandatory product accepted**, full single public release only after 135/135, no MVP. CELIKOM independent pilot Stage17 after release, never edit its production/project.

**Owner saving rule:** do not update official documents after every micro-task; batch after substantive research or explicit request. Research code/tests can be committed to the research branch continuously.

### Готовое сообщение для следующего чата (при смене)

> Продолжаем самостоятельный AI Site CMS private GitHub manufact-test/ai-site-cms, **v1.24 18.10.2026**. В main СНАЧАЛА открыть **docs/NEXT-CHAT.md §29**, PROJECT-STATUS.json, docs/STAGE-1-MIXED-SITE-PROVENANCE-RESEARCH.md, STAGE-1-TEST-LOG.md §27, FOUNDATION-COMPARISON.md §24, STAGE-1-MANDATORY-EVIDENCE-MATRIX.md, ROADMAP/MASTER-TZ/ACCEPTANCE/AI-SITE-CONTRACT. Исследовательская ветка research/stage1-editor-comparison HEAD **48b7579eaf7b0dddec6422b9890fdbab73daa2a0**, FULL CI **4/4 PASS** https://github.com/manufact-test/ai-site-cms/actions/runs/39115456497. После v1.23 добавлены mixed hetero graph 4→5 (6 owner edits, one reviewed stable-id rename/reorder) full trusted typed view across HTML/PHP CLI/React/real Next static export 7/7 semantic comparisons, 675 asserts, 10 markup mutants detected, 11 PHP payloads rejected; signed capability provenance 38 checks/30 refusals (ephemeral Ed25519, 8 reviewed typed targets, 2 curated SVG digests). Это исследование только известных типизированных компонентов, НЕ произвольный ИИ-сайт/полный original JS/CSS/SEO, НЕ production plugin security/Hostinger/SSR. Этап1 НЕ принят, этап2 не начат, итоговый стек не выбран, требования 135 mandatory product **0/135** (research signal 43 / gaps 92), no MVP. Продолжай ТОЛЬКО Stage1: blinded independent other-model site + independently generated intent coverage, original heterogeneous rich CSS/JS behavior/parity, persistent plugin trust/anti-replay, durability risks and A/B/C tradeoffs. Ни research code в main, ни CELIKOM, ни Hostinger без read-only отдельного разрешения. Документы пакетно после большой работы или запроса, единственный handoff NEXT-CHAT.md.


## 30. New uninstrumented source preflight + persistent signed PHP extension trust — checkpoint v1.25 (18.10.2026)

**LAST FULL GREEN CI:** [#39117432469](https://github.com/manufact-test/ai-site-cms/actions/runs/39117432469) — **4/4 completed success** comparison/regeneration/durability/mixed-site-trust, research branch HEAD **557dee05b31d283fe838315c7f065b94193803b1**. All prior browser Jedison/RJSF, rich media, schema, PHP and regeneration suites remained green. New experimental code only in research branch; main docs only.

**New two-block evidence:**
1. Uninstrumented **new Cedar Lab research-authored (NOT blinded independently generated by a second LLM)** complete page with SEO/canonical, responsive CSS variables/grid/gradient/keyframes, images/srcset/video/SVG, script/dialog/FAQ/network form. Source-driven parse5 obligation scanner discovers **46** intended/source semantic field signals vs **12** in candidate manifest: **34 omitted**, **18 unsupported capability types**, separate hand-reviewed oracle flags **8 missing declared requirements**, one unkeyed text. **12** adversarial source/schema mutations detected, including 2 correlated source+manifest deletions caught by retained oracle. Rebuilt manifest still cannot be safely published because CSS/media/JS/hosted form handling unreviewed. Heuristic scan neither proves property completeness nor blind AI generation. `research/stage1/novel-source-contract-audit.cjs` + fixture.
2. Persistent extension trust across actual separate **PHP CLI** runs: ephemeral Ed25519 signature, **independently reviewed** 3-property policy, HMAC-protected state plus local anchor, **74 assertions, 20 denials, 36 separate PHP processes, 4 concurrent installers with 1 winner**, two owner overrides retained, revoked signer remains revoked after restart, partial rollback and injection between renames fail closed. **Critical:** joint restoring old state+anchor lets old valid HMAC revocation state return; local-only rollback defense **insufficient**. No production auth, key infrastructure, fsync or real Hostinger. `research/stage1/persistent-capability-trust.php` + test.

**Main batch documentation:** [STAGE-1-NOVEL-SITE-PERSISTENT-TRUST-RESEARCH.md](STAGE-1-NOVEL-SITE-PERSISTENT-TRUST-RESEARCH.md), TEST-LOG §28, FOUNDATION-COMPARISON §25, evidence-matrix v1.25 addendum, PROJECT-STATUS v1.25, **THIS SAME docs/NEXT-CHAT.md §30**. Only after coherent two-block group; no parallel handoff. Research code stays segregated.

**Stage 1 unresolved gates:** freeze an unseen contract/brief and obtain a genuinely independent other-model AI-generated site **and independent manifest/intent**, validate with hidden third-party semantic oracle across several sites (not this assistant's hand-authored fixtures). Complete original heterogeneous CSS/JS/SEO/interaction parity, unsupported custom widget review, executable plugin sandbox/trust roots/revocation key rotation and **external immutable anti-rollback anchor**, PHP durability/backups/failure recovery, real shared-hosting read-only only if owner permits. Architectures A/B/C require owner choice. No Stage2, no final stack, no live website/CELIKOM changes.

**UNCHANGED:** 18 stages 0–17; Stage0 accepted; Stage1 in progress **NOT accepted**, Stage2 not started. 193 = **135 mandatory, 42 desirable, 16 unwanted**. Evidence signals 43 limited research/docs, 92 no matched target, mandatory PRODUCT accepted **0/135**. First public release only after full 135/135; no partial MVP. CELIKOM independent pilot after complete release at Stage17. Save docs in batches, code freely within research branch.

### Старт следующего чата (если понадобится)

> Продолжаем AI Site CMS с **checkpoint v1.25 (18.10.2026)**, private GitHub `manufact-test/ai-site-cms`. Главный handoff в main **docs/NEXT-CHAT.md §30**, потом PROJECT-STATUS.json, docs/STAGE-1-NOVEL-SITE-PERSISTENT-TRUST-RESEARCH.md, STAGE-1-TEST-LOG.md §28, FOUNDATION-COMPARISON.md §25, STAGE-1-MANDATORY-EVIDENCE-MATRIX.md, ROADMAP/MASTER-TZ/ACCEPTANCE/AI-SITE-CONTRACT. Исследовательская ветка `research/stage1-editor-comparison` HEAD **557dee05b31d283fe838315c7f065b94193803b1**, full 4/4 CI PASS https://github.com/manufact-test/ai-site-cms/actions/runs/39117432469. После v1.24 новый исследовательский HTML Cedar Lab (НЕ blind second LLM), анализ 46 элементов/свойств против 12 полей манифеста, 34 отсутствуют, 18 неподдерживаемых, 8 пропущены относительно независимого ручного списка, 12 негативных тестов пойманы. PHP trust: Ed25519 + reviewed typed targets, HMAC + local anchor, 74 checks/20 refusals, 36 отдельных процессов PHP, 4 одновременные установки/1 победитель, 2 owner edits retained, partial rollback обнаруживается, **полный откат обоих HMAC-файлов НЕ обнаруживается** — архитектурный security blocker. Этап1 НЕ принят, этап2 не начат, стек не выбран, продукт 0/135, research 43/92, NO MVP. Дальше только Stage1: genuinely blind independent other-model site+manifest+oracle, arbitrary rich runtime parity, external anti-rollback and signed extension trust, hosting только read-only с отдельного разрешения. Экспериментальный код не merge в main; CELIKOM и живые сайты не трогать; официальные документы обновлять пакетно и только один NEXT-CHAT.md.
