# AI Site CMS — этап 1: доверенные расширения CSS-свойств, уникальные композиции и проверки реального браузера

**Checkpoint v1.21, 18.10.2026.** Только исследование этапа 1; CMS и production code не создавались.  
**Полный GitHub Actions PASS:** [#39075385172](https://github.com/manufact-test/ai-site-cms/actions/runs/39075385172) на `research/stage1-editor-comparison` commit `fba0093dc836ad8aa0695c34839b30d9f8efb6af`. Все прежние CI tests — Jedison/RJSF, 5 секций, annotated HTML, real media uploads, HTML/nonce/origin, HTML/PHP/React/Next-static, Opis/PHP publish/rollback — повторно прошли. Основная ветка `main` получает только документацию; experimental code **не merge**.

## 1. Проверяемый архитектурный вопрос

Состояние v1.20: для `fontSize`, `gap`, `backgroundColor` работала проверенная цепочка **HTML → manifest/schema → Jedison/RJSF real inputs → opaque preview → computed CSS**. Но добавление новых свойств требовало расширять единый compiler, что плохо сочетается с независимыми дизайнами разных ИИ-сайтов.

Гипотеза: свойства/контролы можно собирать из **зарегистрированных доверенным разработчиком наборов (property packs)**, при этом compiler не должен специально знать layout `hero`, `timeline`, `gallery` и т. п. CSS target обязан быть фиксированно допустимым, значения типизированными, owner-overrides сохраняться только при совместимых stable IDs.

Созданы три файла в отдельной ветке:
- [extensible-style-registry.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/extensible-style-registry.cjs) — регистрация доверенных packs, allowlisted CSS properties, `parse5` grammar, typed values, JSON Schema, `apply()`, versioned override migration и coverage audit;
- [registry-hardening.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/registry-hardening.cjs) — проверка нескольких независимых структур, AJAX/AJV JSON-schema vs runtime parity, негативные model/HTML/pack cases, несовпадающий manifest, owner override migration;
- [registry-editor-browser.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/registry-editor-browser.cjs) — реальный localhost Chromium, Jedison **1.27.1**, RJSF **6.11.0**, редактирование новых типов параметров через настоящие поля библиотек, opaque sandbox с CSP/nonce, проверка DOM `getComputedStyle`.

**Структуры HTML написаны в этом исследовании моделью по известному техническому контракту. Это НЕ независимый blind LLM генератор сайтов и НЕ вывод, что произвольная, ничем не аннотированная AI-страница автоматически подходит для CMS.**

## 2. Реестр расширений

Проверены **три** отдельно регистрируемых trusted packs: `research-content-v1`, `research-geometry-v1`, `research-appearance-v1`.

| Семейство | Зарегистрированные редактируемые свойства |
|---|---|
| Content | `text`, `fontSize` |
| Geometry | `padding`, `borderRadius`, `maxWidth`, `gap` |
| Appearance/layout | `backgroundColor`, `borderColor`, `opacity`, `flexDirection` |

Итого **10** типов/названий свойств. Их schema формируется из registry; секции объявляют `data-editable` на конкретных stable IDs, но **ни одна** не требует отдельного layout renderer. Новые правила `safeLength` разрешают только 0–300px, device inheritance через явные `desktop/tablet/mobile`; hex цвета, `opacity` число в диапазоне 0–1, `flexDirection` только `row`/`column`, строки до 400 символов.

**Граница безопасности:** property-pack — это доверенный **код разработчика**, не функция исполнения скриптов ИИ или пользователей. Ограниченный registry запрещает непризнанные CSS targets; фиксирует `style.<allowedProperty>`, а не безграничный string CSS; ограничивает input types и rejects unexpected keys. Кастомный JS, canvas, сложные HTML tags, runtime CSS injection, SVG, animation, forms, upload, links **не поддержаны здесь**. Сам доверенный код pack должен проходить review, signature/dependency policy и версионирование до production.

## 3. Полученные результаты CI

`STAGE1_EXTENSIBLE_PACKS` подтвердил:
- **3** разных новых HTML layouts (8 DOM / 13 fields; 8 DOM / 11 fields; 3 DOM / 2 fields);
- AJV Draft 2020-12 JSON Schema ↔ native typed compiler parity на позитивных и отрицательных значениях;
- **51/51 отрицательных проверки**: отклонение невалидных полей и CSS, HTML/script/svg/iframe, сомнительных attributes, wrong stable IDs, неизвестных/пересекающихся pack names и properties, дополнительные data/incorrect bounds; запрет partial plugin install, rollback при ошибке;
- intent ledger успешно обнаруживал missing/extra declared fields и неразмеченный leaf text, при этом ledger остаётся **вручную заданным**;
- миграция сохранила owner title + borderRadius при неизменных stable IDs; renamed ID и out-of-range override помещались в quarantine и блокировали публикацию в исследовательской логике, **не на реальном сервере CMS**.

`STAGE1_REGISTRY_EDITOR_BROWSER` подтвердил:
- два варианта дизайна, `canvas` (**8 nodes, 13 editable fields**) и `brief` (**8 nodes, 11 fields**), × настоящие Jedison/RJSF — **4/4 PASS**, одинаковые computed CSS между библиотеками, 0 browser `pageerror`;
- actual editor UI изменяет font-size, padding desktop/tablet, border radius, gap desktop/tablet, background hex, opacity и выбор flex-direction. Изменения приходят через schema/onChange → typed preview messages → DOM, не программные source patches;
- в opaque `iframe sandbox=allow-scripts` нет `allow-same-origin`; nonce CSP с test-only `style-src-attr 'unsafe-inline'`. Bad token, extra message field, replay, invalid CSS refused; published baseline не меняется.

### Реальные computed CSS в Chromium

| Ширина iframe | Padding | Font size | Gap | Border radius | Background | Opacity | Direction |
|---|---|---|---|---|---|---|---|
| 1200px desktop | 40px | 49px | 30px | 22px | rgb(19,68,119) | 0.5 | column |
| 720px tablet | 26px | 49px | 17px | 22px | rgb(19,68,119) | 0.5 | column |
| 360px mobile | 26px | 49px | 17px | 22px | rgb(19,68,119) | 0.5 | column |

Значения отличаются там, где введён breakpoint override; fontSize и borderRadius наследуются там, где пустые значения. Всё проверено **для обеих библиотек и обеих тестовых композиций**, а не только JS metadata.

**Ограничения:** используются базовые auto-generated JSON Schema inputs, не согласованный UI-kit или удобные специализированные responsive/drag widgets. Лишь 10 ограниченных свойств; mobile real-device, accessibility, complex geometry, responsive art direction, CSS variables/gradient, animations, forms, actual full public release и heavy load не тестировали.

## 4. Обнаруженные ошибки в процессе и их исправления

Несколько диагностических запусков оказались FAIL, и это сохранено в GitHub Actions как часть истории. При обновлении JS source string замена с `$'` по ошибке интерпретировалась JavaScript как подстановка остатка исходного файла, отчего test module был временно дублирован и появился syntax error. Файл восстановлен из исходного commit и строго сверены границы generated JSON Schema patterns; возвращён валидный код.

Затем негативный тест `malicious-markup-13` обнаружил, что `parse5` восстановил обрезанную закрывающую разметку и registry молча принял неполную исходную строку. Введено явное требование закрытия `</section>` в оригинальном HTML. **Это узкая граница, НЕ полноформатный deterministic HTML validator или гарантия отсутствия любых browser repair transformations**. Финальный полный CI [#39075385172](https://github.com/manufact-test/ai-site-cms/actions/runs/39075385172) PASS.

## 5. Вывод для будущей архитектуры A/B/C

Расширение разрешённых настроек возможно **без переписывания UI для каждой layout секции**, если автор сайта объявляет stable IDs/editables, а доверенный CMS-core предоставляет регистрационную модель типов и styler. Это существенно снижает риск полного застревания в жёстком наборе шаблонов.

Но **не** решает самую тяжёлую дилемму AI-first дизайна: как принимать произвольный исходный HTML/CSS/JS безопасно, автоматически получать полный редактируемый manifest и не запрещать уникальные визуальные решения. Новые property packs пока отличаются от universal HTML/CSS AST editing; сторонние JS-компоненты нельзя бесконтрольно выполнять от имени CMS.

Обсуждение выбора итогового стека, sandbox/per-site build и архитектуры редактирования остаётся для отдельного решения владельца после этапа 1.

## 6. Что исследовать дальше

1. **Независимое AI→site/manifest**: не source, специально подготовленный под грамматику; оценить отказ на неподдерживаемые конструкции и неполные field declarations. Для нового разработчика/генератора нужен explicit property manifest + external expectation coverage и risk matrix.
2. **Trust boundary**: trusted site build vs user editable model, безопасная регистрация source components/plugins, stricter CSS without blanket style-src-attr unsafe-inline, permissions/secrets/nonce lifecycle, versioned registry migrations.
3. **Более сложные блоки**: разрешённые links/media, forms, stateful custom behaviors, gradient, motions, SEO, styles at viewport and document level, readonly Hostinger PHP constraints if approved.
4. **Матрица 135 ID:** целевое доказательство каждого пункта в конечном продукте остаётся впереди. Ограниченные research/documentation signals **43**, без matching targeted product proof **92**, **product accepted 0/135**; ничего не сокращать ради первого релиза.

**Границы:** Этап 0 accepted; этап 1 продолжается и НЕ принят, этап 2 не начат; стек не утверждён. 193 требований = 135 обязательных, 42 желательных и 16 не нужны. Публичная CMS или независимый CELIKOM не тронуты. Независимый пилот CELIKOM только на этапе 17, после полного выпуска.
