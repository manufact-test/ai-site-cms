# AI Site CMS — Stage 1: annotated HTML discovery, manifest coverage, computed CSS and migration

**Checkpoint v1.19 · 18.10.2026**. Только исследование, **не готовая CMS и не production-security proof**.  
**Полный GitHub Actions PASS:** [#39072109263](https://github.com/manufact-test/ai-site-cms/actions/runs/39072109263), исследовательская ветка `research/stage1-editor-comparison`, commit `e56834d379db2688bf22ad841213d48b0ab5cdd3`. В рамках **того же полного прогона** прошли старые media, HTML-boundary, Jedison/RJSF, HTML/PHP/React/Next-static и PHP Opis/publish/rollback тесты. Код исследования не переносился в `main`.

## 1. Задача

В v1.18 пять исследовательских секций имели отдельные hand-coded renderer profiles. Это полезно для анализа Jedison/RJSF, но может превратить универсальную CMS в набор шаблонов. Следующая гипотеза: ИИ или доверенный сборщик сайта помечает **конкретные элементы** `data-stable-id` и `data-editable`, а независимый от структуры регистрационный слой извлекает типизированные настройки, не зная заранее название и компоновку секции.

Исследовательские файлы:
- [annotated-html-contract.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/annotated-html-contract.cjs) — ограниченная грамматика HTML, обнаружение полей, генерация схемы JSON Schema, строго typed state, DOM bind, разрешение responsive overrides, конфликтная миграция.
- [annotated-html-browser.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/annotated-html-browser.cjs) — два несхожих HTML fixtures, parse5/JSDOM checks, upstream Jedison/RJSF, native Chromium localhost + sandbox, реальные CSS computed values, атаки на protocol/HTML.

**Источники HTML подготовлены вручную как имитация результата ИИ. Реальная независимая генерация LLM не проверена**, как и полнота маркировки свойств в новом произвольном проекте.

## 2. Исследовательская архитектура

Вход — HTML со статическими безопасными тегами и декларациями `data-editable="text fontSize"`, `data-editable="gap"`, `data-editable="backgroundColor gap"`. `parse5.parseFragment` сообщает синтаксические ошибки; самостоятельный проход AST **отказывает** чужим тегам/атрибутам/HTML namespaces/комментариям, лишним roots, duplicate IDs и неизвестным типам настроек. Это ограничение на trusted-build input, **не универсальный sanitizer**. Запрещены произвольные `style`, `href`, `src`, `iframe`, `script`, `svg`, `math`, обработчики событий.

Контракт не зависит от имени конкретной секции: любой допущенный DOM в рамках текущего tag/property registry может создать манифест `{html,fields,defaults,elementIds}`. Имя поля получается детерминированно из stable ID и property; `modelSchema()` создаёт JSON Schema для настоящих upstream редакторов. Каждый объявленный `data-editable` получает exactly one typed field; дубли property и невалидные default values запрещены. **Но неотмеченные AI-элементы будут пропущены** — нет доказательства, что ИИ всегда перечислит все требуемые для пользователя настройки, и не существует проверки "любое желательное CSS-свойство автоматически найдено".

Значения строго типизированы: текст до 400 знаков, hex background-color, responsive `fontSize/gap` только px 0–300 и inherited empty tablet/mobile. `apply()` адресует только стабильные элементы, использует `textContent` и DOM `style.fontSize/style.gap/style.backgroundColor`. Данные не создают raw HTML/JS/CSS declarations, но сам доверенный код preview должен проверяться отдельно.

## 3. Фактические результаты CI

| Измерение | Прямое подтверждение |
|---|---|
| Различные структуры HTML | **2**: editorial timeline `story`, feature comparison `board` |
| Количество DOM элементов | 11 у `story`, 13 у `board` |
| Автоматически зарегистрированные поля | 8 у `story`, 10 у `board` |
| Upstream редакторы | настоящие Jedison **1.27.1** и RJSF **6.11.0** |
| Запуски структура × редактор | **4/4 PASS** |
| Неверные HTML/AST variants | **19/19 отвергнуты** |
| Миграции owner overrides | сохранение при неизменном ID, блокирующий конфликт при rename, карантин чужого ключа |
| Реальные computed CSS values | desktop/tablet/mobile и 2 редактора × 2 структуры |
| JavaScript pageerrors | **0** во всех новых browser runs |
| Full regression workflow | **PASS #39072109263** |

**Computed CSS, а не `data-size`:** у каждого из двух HTML fixtures и обоих редакторов Chromium отдал следующие значения:

| Viewport iframe | Computed `font-size` | Computed `gap` | Что доказано |
|---|---:|---:|---|
| Desktop 1200px | 52px | 30px | desktop override применён к DOM |
| Tablet 720px | 35px | 18px | tablet override |
| Mobile 360px | 35px | 11px | fontSize наследует tablet, gap переопределён mobile |

Для `board` дополнительно проверен `background-color: rgb(18, 52, 86)` после typed patch `#123456`. Ключевая **граница точности:** реальные редакторы Jedison/RJSF изменяли HTML-текст через свои UI input; **адаптивные CSS-значения были изменены программно через research typed patch bridge**, не через полноценные специализированные size/color widgets. Не записывать результат как "все стили редактируются в реальной CMS".

**Проверка защиты preview:** opaque `iframe sandbox=allow-scripts`, CSP с nonce для script/stylesheet и явным `style-src-attr 'unsafe-inline'` для JS-style mutations. Parent-origin/source/token/seq checks. Wrong token, лишний ключ, replay/stale sequence и недопустимая CSS строка не вызвали успешный applied ack; fake ack из parent/self и rogue iframe отвергается. HTML-похожая строка, введённая в UI, осталась безопасным текстом. Стек **не защищён production threat model**: tokens/nonce перезагрузка, browser matrix, server auth, cross-site messages, origin/CDN, CSP headers, CSS exfiltration, user permissions остались непроверенными. `unsafe-inline` для style attributes **нельзя считать целевой политикой** без дополнительной архитектурной проверки.

## 4. Изменения, конфликтующие с ручными правками

У `story` обновили оригинальные HTML defaults и className без изменения stable ID: `migrate` сохранил owner-edited заголовок. При замене `story-heading` на новый ID прежний `owner override` не переносился молча: возник `removed-or-renamed` conflict и `publishBlocked=true`. При ранее не зарегистрированном override также включался блокирующий conflict.

Проверка **ограниченная и логическая** — не транзакционная БД, не реальная публикация, не трёхсторонний diff, не конкурентные миграции, не revert/backup и не восстановление после сбоя. Для масштабной CMS требуется diff документов и source identity, resolution UI, migration registry с version mapping, server validation и quarantine log.

## 5. Чего не доказали и почему это важно

1. **Не любой HTML:** поддерживается короткий allowlisted набор HTML-тегов без ссылок, медиа, форм, popups, canvas, SVG, скриптов, CSS variables/custom properties. Новые профили поведения пока нужно внедрять доверенным кодом.
2. **Аннотации надо создать:** у ИИ всё ещё нет подтверждённого надёжного автоматического задания `data-editable` для полного набора используемых свойств. Неотмеченное поле исчезает из редактора; автоматическая проверка "все свойства сайта" не решена.
3. **Редакторский UX частичный:** визуальные клики по дереву, специализированные responsive controls, color pickers, формы, комплексная геометрия и accessibility не проверены в новом стенде.
4. **Не полная responsive система:** computed CSS есть только для 2 свойств и 3 точек ширины; не доказаны сквозной layout, transitions, browser/viewport matrix или реальное качество адаптива.
5. **Нет полноценного trust boundary:** строгая исходная грамматика — не sanitizer всех AI designs. Не создан производственный server security, no actual uploads, authentication, storage, public snapshots. Hostinger реальный и CELIKOM не затронуты.
6. **Нет лицензированного выбора стека:** Jedison и RJSF сравниваются в эксперименте, но не выбраны для CMS, этап 2 не начат.

## 6. Вывод по архитектурным вариантам

Эта проверка усиливает аргумент, что **typed manifest + trustworthy renderer + configurable element bindings** могут поддерживать больше одной заранее закодированной структуры. Однако абсолютная свобода AI-исходника конкурирует с безопасностью. Если доверенный ИИ-сборщик создаёт arbitrary CSS/JS, данные и исполняемый код обязаны пересекать разные trust boundaries. Нужно сравнить декларативное расширение field factory vs trusted component registrations, строгий preview protocol и миграции при изменении дизайна.

Технический выбор **A/B/C не утверждён**; потребуется согласование владельца после полного исследования этапа 1. Следующее исследование: unknown component/type registration без редакторской ручной работы, несколько различных AI-generated реальных designs, representative computed geometry, property coverage audit, безопасные ссылки/формы/медиа с полноценной явной моделью разрешений.

## 7. Все 135 требований остаются обязательными

Источник истины: [STAGE-1-MANDATORY-EVIDENCE-MATRIX.md](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md). Этот стенд добавляет narrow research evidence о typed editable text, HTML fields, responsive inheritance, override conflict и runtime DOM CSS, но **не делает готовыми** №1/3/9/10–20/103–119 и другие обязательные пункты. Отсутствует end-to-end готовой CMS, product acceptance всё ещё **0/135**. Пока без пересмотра классификации: **43 частичных R/D, 92 без целевого e2e**. Полный релиз только 135/135 без урезанного MVP.

Этап 0 принят, этап 1 продолжается **не принят**, этап 2 не начат, стек не выбран. Экспериментальный код не сливать в `main`; CELIKOM отдельно только этап 17 после полного продукта.
