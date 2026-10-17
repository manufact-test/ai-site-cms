# AI Site CMS — Stage 1: реальные media fixtures, типизированный AST и приоритеты пробелов

**Дата:** 17.10.2026 · **Статус:** только исследование этапа 1, не готовая CMS и не производственный security audit.  
**Код:** отдельная ветка `research/stage1-editor-comparison`: [media-fixtures.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/media-fixtures.cjs) и [typed-ast-probe.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/typed-ast-probe.cjs).  
**CI:** [#39068226228](https://github.com/manufact-test/ai-site-cms/actions/runs/39068226228); отдельные шаги новых двух стендов прошли PASS. Итог **полного** workflow проверяется отдельно и фиксируется в журнале.

## 1. Что действительно проверили: не media mocks

Генератор `ffmpeg` прямо на GitHub Linux runner создаёт три небольших **настоящих** файла: PNG 64×48 (170 байт), JPEG 64×48 (242 байта), WebM/VP8 64×48, одна секунда (2940 байт в подтверждённом запуске; точный размер сборки может меняться). Это локальные HTTP assets, не ссылки на сторонние сервисы. Скрипт проверяет наличие сигнатур и реальные байты, не fake-div placeholders.

В Chromium по HTTP localhost:
- настоящий PNG декодируется с `naturalWidth=64`, WebM получает `readyState/metadata`, `videoWidth=64`, duration 1 сек и успешно запускает `play()`;
- те же JPG и WebM загружаются из отдельного `iframe sandbox="allow-scripts"` **без allow-same-origin**, parent DOM недоступен; политика CSP для media указывает точный localhost-origin, а не произвольные URL;
- файл выбирается через настоящий браузерный `<input type=file>`, байты отправляются `fetch POST /upload`; 3/3 разрешённых файла получают HTTP 201 и совпадающие SHA-256/размер; хранилище **не пополняется**, публикации не происходит;
- пять отрицательных загрузок получают ожидаемые коды: несовпадение сигнатуры — 422; неверный MIME — 415; слишком большой PNG — 413; SVG со script — 415; небезопасное имя — 415;
- отсутствующий ресурс отвечает 404, задержанный fetch прерывается через AbortController, отказанный внешний image не декодируется; 0 браузерных `pageerror`.

**Честные ограничения:** 64×48/1 сек не моделируют многогигабайтные исходники, реальные пользовательские фото/видео, AV scanning, переименование после карантина, декомпрессионные бомбы, полное декодирование при загрузке, видео транскодирование, EXIF/метаданные, ротацию/ориентацию, широкий набор браузеров, CDN/caching, storage ACL, signed URLs, SSRF, CSRF, сессии/доступ и продакшен. Простая signature-проверка заведомо недостаточна для безопасной загрузки. CSP-отрицательный image проверен по отсутствию декодирования, но отдельная запись `securitypolicyviolation` / HAR всё ещё нужна для строгой причинной атрибуции.

**Инженерный вывод без утверждения стека:** медиа — отдельный типизированный ресурс с ID, состоянием «черновик/карантин/проверено/опубликовано», размером, MIME на нескольких уровнях, hash, форматом, правами доступа и ссылкой в manifest. Путь загрузки не равен публичному URL; только проверенный immutable asset может стать частью published snapshot. Должны быть отдельно определены лимиты, политика удаления, responsive variants, video controls, error fallback и контроль сторонних источников.

## 2. Расширяемый AI-site HTML/AST: гипотезы, а не готовая система

Стенд `typed-ast-probe.cjs` принимает **JSON AST**, а не произвольный HTML, с четырьмя явно отделёнными сущностями: `profile`, `root`, `controls` и `values`. Зафиксированы **два разных профиля**, Hero и Media (section + article + text + img/video), на основе отдельного registry тегов и типизированных полей. Компилятор экранирует текст и атрибуты, выдаёт один фрагмент HTML, пересчитывает stable IDs, проверяет лимиты узлов/глубины, закрытый набор ключей и отсутствие неиспользованных/необъявленных controls. Контракт разрешает только внутренние route URL и media IDs из явной asset map, а не `javascript:`, `data:` или чужой HTTP URL.

Положительные случаи сохраняют буквальный текст вида `<img ... onerror=...>` как текст, а не выполняемый DOM; корректные `img`/ `video` получают ссылки на доверенные ресурсы. **21 враждебная или испорченная AST-вариация** отвергается в тесте: script/style/svg/iframe, inline style, on* attributes, обход URL, неподходящие ресурсы, duplicate ID, orphan/unknown field, контроль типа/значения, лимиты структуры и т. д. Подтверждённые значения — только для этих двух профилей; исходный Hero-only 20-case HTML gate также продолжает применяться к отдельному стенду.

### Три архитектурные гипотезы для следующего сравнения

| Кандидат | Польза | Риск / обязательная следующая проверка |
|---|---|---|
| A. Строго типизированный AST + регистрируемые renderers | Меньше прямых HTML/JS инъекций, типовые поля, asset links | Уникальные композиции ИИ, сложные CSS/Canvas/GSAP/3D и кастомные HTML структуры невозможно выразить двумя whitelist profiles; проверить расширение registry без экспоненциального роста шаблонов |
| B. Любой AI HTML + parse5 preflight + per-component policies | Сохраняет свободу уникальной HTML-вёрстки | Санитайзинг произвольного HTML/CSS/JS чрезвычайно сложен; неизвестные теги, SVG, external resources, rawtext, template/shadow DOM; проверять по проверяемым policy packs и deny-by-default |
| C. Доверенный код сайта + отдельно типизированный manifest/patches + изолированное preview | Сохраняет свободу AI-дизайна и независимость публичного сайта; может дружить с HTML/PHP/React static | Граница между trusted build code и owner editable data, CSP nonce/origin/token, lifetime tokens, модификация DOM/behavior, миграция структуры и защита опубликованного состояния; нужна формальная threat model |

**Возможное направление для обсуждения с владельцем**, НЕ выбор окончательного стека: сравнить комбинацию «доверенная сборка сайта + versioned typed manifest + ограниченный compiler для редактируемых элементов + opaque preview + immutable published snapshot», а не требовать от ИИ генерировать только шаблонные Hero. Отдельно сформулировать, какие новые компоненты ИИ может регистрировать декларативно, какие требуют review доверенного исходного кода, какие действия запрещены навсегда. Для CSS — только typed semantic property/whitelisted units и deliberate fallback; не переносить `style`/JS строку из пользовательского значения напрямую.

### Необходимые доказательства перед утверждением архитектуры

1. Более трёх **принципиально разных** AI-authored секций из разных рендереров, с произвольной вложенностью, forms, video, icon/animation, semantic headings, interaction; манифест должен покрыть реально используемые свойства без "generic CSS" панели.
2. Полное отображение `stable ID → manifest property → node/style/action`, контроль duplicates/collisions, version migration, inherited per-device values, preview/publish parity и обновления кода ИИ.
3. Authorization на каждую команду, CSRF/XSS/upload/SSRF, media resource policy, CSP HTTP headers, browser origin и `postMessage` точное право/формат/nonce/token с rollover/replay tests, доверенный CSS/JS provenance.
4. Публичный static/PHP/React-static вывод при выключенной CMS + откат publisher под конкуренцией/падением; реальные Hostinger PHP/extensions/limits — сначала **только разрешённый read-only осмотр**.
5. Лицензии, maintainability, size, UX профилей Jedison/RJSF, reliable scoped property controls и приёмка по 135 ID — до **любого** окончательного выбора технологий.

## 3. Gap-based план по официальной матрице 135 mandatory

Это **анализ приоритетов исследования, не изменение утверждённых требований или этапов**. [Официальная таблица всех 135 ID](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md) не содержит ни одного принятого продукта. Предыдущие **43 частичных R/D / 92 без прицельной проверки** остаются прежними: новые узкие media/AST механизмы **не закрывают конкретные функциональные требования по редактированию** и не меняют R/N автоматически.

| Часть из реестра | Mandatory | Частич. сигналов R/D | Без сигнала N | Главный gap |
|---|---:|---:|---:|---|
| 1 Типографика | 7 | 4 | 3 | шрифт/line-height/выравнивание |
| 2 Геометрия | 10 | 0 | 10 | позиционирование/grid/responsive geometry |
| 3 Оформление | 12 | 4 | 8 | background image/video, borders, radius, filters |
| 4 Медиа | 8 | 0 | 8 | реальные редакторы media, alt, responsive sources, video control, gallery |
| 5 Анимация | 10 | 3 | 7 | motion triggers, hover/scroll, semantic control |
| 6 Взаимодействия | 15 | 0 | 15 | forms, handlers, dropdown/popup, navigation |
| 7 Глобальные стили | 6 | 1 | 5 | shared/local impact, reverse references, rollback |
| 8 AI-контракт | 19 | 19 | 0 | signals преимущественно условные/описательные; независимый AI-first e2e не готов |
| 9 UI редактора | 9 | 3 | 6 | preview click/tree/undo/draft and publish UX |
| 10 Страницы и SEO | 15 | 0 | 15 | URLs, ordering, OG, schema, sitemap, redirect |
| 11 Security/publish | 10 | 2 | 8 | real auth/multiuser, restore, conflict, logs |
| 12 Runtime/integration | 14 | 7 | 7 | real shared hosting, install/update, isolated installations |
| **Итого** | **135** | **43** | **92** | **0/135 принято** |

**Приоритеты последующих экспериментов этапа 1 по зависимостям**, не по "минимальному релизу":
- **Сначала архитектурные блокеры:** 101–119 (в частности AI-first №119), 174–178, 181, 183–187, 190 и security-модель. Ошибка здесь делает реализацию других функций слишком дорогой или опасной.
- **Затем доказать среду и контент:** media №24–26 и №38, 41, 42, 44–50, geometry №10–20, forms/interactions №67–83, общий дизайн/overrides №86–97. Тесты должны включать действительные редакторские изменения, preview, public publish и rollback.
- **Параллельно не упустить полноту:** административные/SEO/страничные функции №120–155 и multiuser/backup/audit №156–173 остаются обязательными к полной приёмке, даже если исследование конкретного editor-пакета на них не влияет.

Здесь нет предложения выкинуть трудные пункты или выпускать сокращённый MVP. Любая техническая рекомендация остаётся **проектом для отдельного согласования владельца после завершения этапа 1**. Этап 0 принят, этап 1 в работе/не принят, этап 2 не начат. CELIKOM не затронут; code-only research-ветка не мержится в main.
