# AI Site CMS — постоянный файл передачи между чатами

**Контрольная точка:** v1.15 · **дата:** 17.10.2026  
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

