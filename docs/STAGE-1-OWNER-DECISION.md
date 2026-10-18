# AI Site CMS — Stage 1: рекомендация владельцу по технологической основе (v1.30)

**Дата решения:** 18.10.2026. **Статус:** сформирована рекомендация и пакет для согласования, **НЕ одобрено владельцем**, Stage 1 `in_progress`, Stage 2 `not_started`. Нельзя считать этот документ ADR утверждённого стека. Не трогались Hostinger, CELIKOM, живые сайты и код в main.

## Решение за 60 секунд

**РЕКОМЕНДУЮ ДЛЯ СОГЛАСОВАНИЯ ВАРИАНТ А:** небольшая самостоятельная CMS с PHP API на **Slim 4**, schema-driven браузерным редактором **Jedison 1.27.1**, серверной валидацией **Opis JSON Schema 2.6**, отдельной сборкой статических ассетов панели (Node только build/CI), собственной моделью AI manifest / стабильно адресуемых properties / владельческих overrides / publish transactions и изолированным одноблочным preview. **Это направление, не окончательный выбор и не обещание готовности.**

**РЕЗЕРВНЫЙ ВАРИАНТ B:** тот же модульный PHP/API/data подход, но **RJSF 6.11 + React + Ajv 2020-compatible validator** для браузерных JSON Schema полей вместо Jedison; использовать если расширяемость/UX редактора или поддержка Jedison станут блокером после проверки.

**ВАРИАНТ C ТОЛЬКО ПРИ ПЕРЕСМОТРЕ ВЕСОВ:** **Winter CMS PHP backend + Jedison panel**, если готовые пользователи, backend, плагины, DB и роли окажутся важнее минимальности и независимости модели сайта. Не базовое предложение при нынешних ограничениях.

Ни один из трёх вариантов не превращает чужую CMS в AI Site CMS без серьёзной собственной работы. **Окончательный стек утверждает только владелец.**

## Почему A — первое направление, а B — резерв

| Критерий | A: Jedison/Slim/Opis | B: RJSF/Slim/Opis | C: Winter/Jedison/Opis |
|---|---|---|---|
| PHP shared-host runtime | Потенциально да; не испытано на целевом хосте | Потенциально да, React статически собирается; не испытано | PHP >=8.1 + набор расширений; хост не проверен |
| AI manifest без навязанной модели страниц | Хорошая граница: поля schema, модель своя | Хорошая граница: schema + uiSchema, модель своя | Требуется адаптация существующих моделей CMS |
| Один iframe/секция вместо page builder | Собственная компактная оболочка | Собственная React-оболочка | Потребуется обход обычной архитектуры Winter |
| Проверка реальных upstream editors | Jedison 1.27.1 **PASS** в Chromium | RJSF 6.11.0 **PASS** | Не испытана полная Winter как интегрированная CMS |
| Реальный одинаковый browser-entry gzip в исследовании | ~48 345 bytes (базовый) / ~48 284 bytes matched sessions | ~187 930 bytes (базовый) / ~190 905 bytes matched sessions | Нет сопоставимого полного admin bundle |
| За что платим своей разработкой | Auth/ACL, AI-contract, engine, revisions, publish, adapters | Всё это же; плюс React/validator build | AI-contract, preview, ownership/publish, миграции + retrofit/обслуживание |
| Лицензии базовых частей | MIT / MIT / Apache-2.0 | Apache-2.0 / MIT / Apache-2.0 | MIT платформы, отдельная проверка bundled ассетов, + MIT/Apache |
| Ключевой риск | Маленькое сообщество Jedison, собственное backend ядро | Большая React/AJV-зависимость и сложность UI сборки | Избыточный backend, тесная привязка к CMS модели, PHP extensions |
| Вывод | **предпочтение, ждём решения** | **основная альтернативная связка** | **условный запасной backend путь** |

Числа gzip относятся **к указанным исследовательским entry**, не к будущей полной панели; сборки включали разный состав зависимостей, и нельзя выводить скорость/производительность CMS из одного размера. Сравнение проведено с настоящими pinned upstream пакетами в CI: [исследование A/B](STAGE-1-TEST-LOG.md#7-реальный-upstream-ab-test-jedison-1271-vs-rjsf-6110), [сопоставимые sessions](FOUNDATION-COMPARISON.md#14-сопоставимый-12-id-jedisonrjsf-session-stress--checkpoint-v114-17102026). Полный последний run [#39122533764](https://github.com/manufact-test/ai-site-cms/actions/runs/39122533764): **comparison, regeneration, durability, mixed-site-trust = 4/4 success**.

**Нюанс в пользу B:** RJSF существенно шире распространён, имеет зрелую поддержку React/custom fields. Источник сравнения показывает Jedison компактнее, **но не доказывает его более высокую надёжность, доступность или производительность под полной нагрузкой**. Если после реальных пользовательских макетов Jedison окажется неудобен/неподдерживаем, возвращаемся к B без замены PHP API и собственного manifest contract.

## Не предлагаем как главный продуктовый backend / редактор

- **Puck (MIT)**: нужен адаптер от React-page-builder model; AutoField и preview тесно связаны с internal store. Часть UI можно изучать, не выбирать entire engine для AI-first HTML/PHP/React без переусложнения.
- **GrapesJS core (BSD-3-Clause)**: полезны идеи selection/style manager, но StyleManager зависит от Component/CssRule/EditorModel; нельзя честно объявлять простой независимой библиотекой полей.
- **VvvebJs (Apache-2.0)**: JS builder, возможны отдельные controls, однако модель drag/drop / bootstrap не совпадает с отсутствием конструктора.
- **Vvveb CMS (AGPL-3.0)**: **совсем другой проект** относительно VvvebJs; без отдельного согласования не переносим из него код в внутренний продукт с доступом клиентов.
- **Payload (MIT) / Directus (ограничительная лицензия)**: Node runtime и/или лицензионные/архитектурные несоответствия текущему PHP shared-host условию.
- **JSON Forms (MIT)**: возможная альтернатива RJSF в будущем, здесь нет сопоставимого полного latest matched Chromium test; не объявляем proven winner.

## Лицензионный и актуальный upstream ledger (проверено 18.10.2026)

| Пакет | Источник LICENSE / release | Лицензия / вывод | Оговорка |
|---|---|---|---|
| Jedison 1.27.1 | [LICENSE](https://github.com/germanbisurgi/jedison/blob/main/LICENSE), [repo](https://github.com/germanbisurgi/jedison) | MIT | Малое сообщество, pinned artifact/maintenance fork и мониторинг security нужны |
| RJSF 6.11.0 | [LICENSE.md](https://github.com/rjsf-team/react-jsonschema-form/blob/main/LICENSE.md), [releases](https://github.com/rjsf-team/react-jsonschema-form/releases) | Apache-2.0 | Проверять зависимости, версии React/Ajv и NOTICE |
| Slim 4 | [LICENSE.md](https://github.com/slimphp/Slim/blob/4.x/LICENSE.md), [composer.json](https://github.com/slimphp/Slim/blob/4.x/composer.json) | MIT | HTTP/router, **не готовая** auth/RBAC/publish CMS |
| Opis JSON Schema 2.6 | [LICENSE](https://github.com/opis/json-schema/blob/master/LICENSE), [composer docs](https://github.com/opis/json-schema) | Apache-2.0 | Проверен ограниченный parity; draft/schema dialect, $ref resolution и security проверять |
| Winter CMS 1.2 | [LICENSE](https://github.com/wintercms/winter/blob/develop/LICENSE), [install requirements](https://wintercms.com/docs/v1.2/docs/setup/installation) | MIT core | Отдельно лицензировать включённые редакторы, плагины, темы, медиа |
| Puck | [LICENSE](https://github.com/puckeditor/puck/blob/main/LICENSE) | MIT | Puck store/React архитектура делает reuse без builder неопределённым |
| GrapesJS core | [LICENSE](https://github.com/GrapesJS/grapesjs/blob/dev/LICENSE) | BSD-3-Clause | Сохранить условия и disclaimer; dependencies отдельно |
| VvvebJs | [LICENSE](https://github.com/givanz/VvvebJs/blob/master/LICENSE) | Apache-2.0 | Не путать с Vvveb CMS |
| Vvveb CMS | [LICENSE](https://github.com/givanz/Vvveb/blob/master/LICENSE) | AGPL-3.0 | Не включать в утверждаемую архитектуру без отдельной проверки и решения |
| JSON Forms | [LICENSE](https://github.com/eclipsesource/jsonforms/blob/master/LICENSE) | MIT | Форма работает с schema; не AI-site renderer |
 
GitHub metadata проверены 18.10.2026: Jedison не архивирован, обновлялся 15.10.2026; RJSF — 18.10.2026; Slim — 01.10.2026; Opis — 30.04.2026. **Дата commit/release не является аудитом безопасности**. При реальном импорте конкретных версий должны фиксироваться полный lockfile/SBOM, лицензии **всех транзитивных зависимостей**, NOTICE, CSS/fonts/assets, vulnerability checks, фиксированная проверяемая поставка. Копирование 70% модуля и изменение 30% не снимает лицензии исходного кода.

## 135 обязательных требований: конкретное распределение повторного использования

[**Полная матрица — каждый из 135 ID**](STAGE-1-ADOPTION-MATRIX.md), источник оригинальных формулировок [requirements.csv](../requirements/requirements.csv). **Сводка не означает степень реализации**:

| Вариант | Уже целиком готово | Можно адаптировать части | Нужна своя доменная реализация | Приёмка продукта |
|---|---:|---:|---:|---:|
| A | 0 | 70 | 65 | **0/135** |
| B | 0 | 70 | 65 | **0/135** |
| C | 0 | 91 | 44 | **0/135** |

**Адаптация ≠ маленькая задача**, а "своё" может использовать стандартные узкие библиотеки. Более высокий счёт адаптаций Winter не учитывает потенциально дорогую переделку чужой модели страниц. Отдельная evidence matrix содержит **43 исследования/документальные сигнала, 92 без сопоставленной целевой проверки**, не 43 выполненных функций.

### Где основная собственная разработка (относительная трудоёмкость, 1 низкая → 5 высокая, не сроки)

| Направление | Оценка сложности | Готовые части и свой код |
|---|---:|---|
| Manifest/parser, независимые AI source/intent, coverage, IDs, migrations, provenance | **5/5** | Почти полностью своё; JSON Schema даёт инструменты, не семантику |
| Состояния/owner overrides, schema versioning, conflict/approval engine | **5/5** | Собственная модель и транзакции |
| Адаптеры оригинального HTML/PHP/React/Next и safe preview/publish | **5/5** | Свои пакеты; без допущения runtime Node на PHP-only |
| Publishing, durable backups, rollback, multiadmin auth/ACL/audit | **5/5** | PHP библиотеки помогают; обязательны долговечность и security |
| UI одного блока/дерево/мост iframe/все типизированные composite controls | **4/5** | Jedison/RJSF экономит ввод/validation; дерево, bridge и часть controls свои |
| Медиа, анимация, формы, SEO, глобальные стили, страницы | **5/5** | Многие самостоятельные features под 135 обязательных |
| Installer, упаковка для конкретного PHP-host, CI/E2E и эксплуатация | **4/5** | Определённые библиотеки/Composer build offline, но переносимость и бэкапы свои |

**Важно:** это **балльная сравнительная оценка сложности, НЕ календарные сроки, стоимость и не доля написанных строк кода**. Реалистичная оценка дней/бюджета требует архитектуры этапа 2 и декомпозиции задач. Для варианта A риск переноса усилий из тяжёлой CMS в собственное backend ядро — осознанный, а не скрытый.

## Ограничения, которые не блокируют честную рекомендацию Stage1, но остаются gate следующих этапов

1. **Хостинг:** реальный Hostinger и клиентские тарифы НЕ смотрели; доступ запрещён без нового разрешения на **read-only** проверку. Для A/B нужен PHP (конкретная минорная версия неизвестна), HTTPS, server rewrite, upload limits, файл/БД permissions, доступные расширения (PDO drivers/SQLite/MySQL), cron/backup возможности. Slim 4 заявляет PHP >=7.4 и web rewrite, Opis PHP 7.4/8.x; **совместимость конкретной композиции и lockfile при нужной версии надо проверить**. Для C Winter PHP >=8.1 и cURL/GD/Mbstring/OpenSSL/PDO/SimpleXML/ZipArchive. [План smoke](STAGE-1-HOSTING-SMOKE-PLAN.md) не выполнялся.
2. **React/Next:** собранный static export потенциально размещается на PHP shared hosting. Dynamic **Next SSR требует подходящей серверной среды**; CMS на PHP не делает SSR доступным сама по себе. Это нельзя обещать без архитектурного решения.
3. **Независимая ИИ-проверка:** НЕ получены оригинальный сайт HTML/CSS/JS и *отдельно сгенерированный другой моделью* manifest/intent под blind-проверку. Локальные Cedar/Tide вручную написаны исследователем. Отсутствие этой проверки снижает уверенность в независимости AI contract. После выбора направления нужно прогнать locked oracle и несколько реально независимых LLM генераций.
4. **Долговечность:** [v1.29](STAGE-1-ORIGINAL-HTML-PHP-PERSISTENCE-RESEARCH.md) дала 75 checks, 14 refuses, 34 PHP CLI process; `last-good` **может потерять последнюю опубликованную версию** при повреждении current. Hash не защищает от злонамеренного изменения; нет fsync/power-loss доказательства, настоящих бэкапов и permission/auth.
5. **Безопасность и внешний JS:** sandbox/CSP research не равен general safe sanitizer и сохранению произвольных JS-сценариев. Правила trusted capabilities, происхождение, подписи, key rotation и rollback должны проектироваться отдельно. Реального безопасного общего import произвольного AI source ещё нет.
6. **Production acceptance:** 193 требований, из них 135 mandatory; **0/135 приняты**, Stage 0 принят, Stage 1 ещё в работе, Stage 2 не начат; первого MVP нет. Выпуск только после полного 135/135.

## Условия согласования решения владельцем (без скрытого принятия)

- **Если согласовать A**: фиксируем *направление* Jedison + Slim + Opis, B как безопасную замену поля UI, C только conditional alternative. Stage1 можно принять по утверждённому ROADMAP, **но запись о согласовании должна поступить от владельца**. Только затем открываем Stage2 (архитектура, ADR, pins/SBOM/hosting deployment gates).
- **Если выбрать B или C**: записать причину (например, приоритет зрелой React-экосистемы или готовой PHP-модели пользователей); пересчитать реальные риски/объём работы до начала Stage2.
- **Если решение отложено**: Stage1 остаётся `in_progress`, документы готовы к рассмотрению, не возвращаемся к бесконечной допроектной реализации. Тест реального shared-host и blind second-model оформляются как **непроверенные предпосылки**, с запланированными gate на следующих этапах или по отдельному разрешению.

**Предложение для формального ответа владельца:** «Согласовываю направление A (Jedison + Slim + Opis), B — резерв; этап 1 принимаю, разрешаю начинать этап 2» либо «Выбираю B/C, причина ...», либо «Не принимаю, исправить ...». **Ничего из этих ответов ещё не получено.**
