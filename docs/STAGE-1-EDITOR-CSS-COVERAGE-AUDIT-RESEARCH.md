# AI Site CMS — этап 1: реальные правки CSS в Jedison/RJSF и аудит полноты editable manifest

**Checkpoint v1.20 · 18.10.2026**. Только исследование, не production CMS или завершённая проверка безопасности.  
**Полный GitHub Actions PASS:** [#39073198622](https://github.com/manufact-test/ai-site-cms/actions/runs/39073198622), исследовательская ветка `research/stage1-editor-comparison`, head `c6c7eaaeacdc665ba1b9b753a8591db533004779`. Все старые suites (media upload, AST/HTML boundary, native preview, 5 sections, 2 annotated HTML, HTML/PHP/React/Next-static, Jedison/RJSF and Opis PHP/publishing/rollback) также прошли. `main` — документация, новые экспериментальные скрипты туда **не** перенесены.

## Зачем этот блок

В v1.19 `getComputedStyle` уже доказал применение responsive fontSize/gap/backgroundColor, но CSS-значения поступали программно через typed bridge. Это оставляло реальный UX-критический вопрос: **способны ли обе выбранные для сравнения upstream библиотеки дать редактировать такие поля в самой форме, сохранив тип, состояние и публичный preview?** Отдельный вопрос: можно ли заметить, что созданный генератором сайт забыл описать редактируемые элементы?

## 1. Реальные input → schema state → secure preview → computed CSS

Новый research-only [annotated-editor-css.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/annotated-editor-css.cjs) наследует условия предыдущего теста, **но заменяет programmed CSS patches на действия Playwright по реальным input обеих библиотек**. Две заранее подготовленные HTML-структуры `story` (11 DOM узлов, 8 полей) и `board` (13 узлов, 10 полей), автоматически получаемые из `data-stable-id` + `data-editable` через ограниченный HTML contract.

Для каждой структуры и **реальных Jedison 1.27.1 / RJSF 6.11.0** воспроизводится:
1. Реальная правка текста в input (включая HTML-подобный hostile text, который остаётся обычным текстом).
2. Редактирование **в UI редактора**, не через разработческий `__updateTyped`: `fontSize.desktop 36→52px`, `fontSize.tablet ""→35px`; `gap.desktop 24→30px`, `gap.tablet ""→18px`, `gap.mobile ""→11px`.
3. Для `board` `backgroundColor #25314a→#123456` также изменяется **через настоящий upstream input**.
4. На каждую правку ожидается typed model update и подтверждённый `postMessage` apply в opaque sandbox; без права sandbox на source origin/forms.
5. В реальном Chromium снимались **computed CSS**, а не metadata: desktop iframe 1200px: `font-size 52px / gap 30px`; tablet 720px: `35px / 18px`; mobile 360px: `35px / 11px` (mobile font inherited from tablet), board background `rgb(18,52,86)`. Owner-published baseline не мутирует от draft.

**Полный результат:** `STAGE1_ANNOTATED_EDITOR_CSS` сообщает `pass:true`, **4/4** combinations `story/board × Jedison/RJSF`, `computedCss3Devices:true`, ровно 0 браузерных `pageerror`, 19/19 прежних HTML grammar negative checks. Равное поведение обеих библиотек доказано лишь на этих bounded fixtures — не cross-library usability/quality benchmark.

**Честные ограничения:** используются **native auto-generated string/object form inputs**, а не специальные production UI контролы responsive units/color picker/drag handles. Нет сквозной проверки всей геометрии, media, gradients, animation, interaction, arbitrary CSS/JS, mobile touch UX, accessibility и производственного редактора. CSS preview использует test-only CSP `style-src-attr 'unsafe-inline'`, nonce для статического скрипта и style, **это не выбранная безопасная production-CSP**. Значения пока только `px` 0–300 и hex, ограниченное HTML. Никакой автоматической independent LLM разметки ещё нет.

### Test flakiness разобрана и исправлена

В промежуточном регрессионном workflow [#39073066570](https://github.com/manufact-test/ai-site-cms/actions/runs/39073066570) старый browser-stand упал, поскольку проверил iframe `innerWidth` сразу после изменения CSS width и успел увидеть прежний viewport. Добавлено ожидание настоящего **iframe innerWidth** до измерения `getComputedStyle` в обоих исследованиях (`annotated-html-browser.cjs`, `annotated-editor-css.cjs`), без уменьшения требований к измеренным CSS. После исправления [#39073198622](https://github.com/manufact-test/ai-site-cms/actions/runs/39073198622) полный PASS. Ранние прогоны/ошибки не считаются проходами.

## 2. Проверка полноты настроек по внешнему реестру намерений

Новый research-only [annotated-coverage-audit.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/annotated-coverage-audit.cjs) сравнивает обнаруженные editable IDs/properties с **отдельным заданным заранее intent ledger** и требует:
- все заявленные свойства присутствуют в HTML/typed manifest;
- обнаруженные свойства не превышают явно разрешённый ledger;
- terminal/leaf nodes с видимым текстом размечены `data-editable="text"`, либо явно перечислены в read-only exception list;
- manifest/modelSchema содержат одинаковый набор полей, нет orphan control и лишних ключей.

В CI: **2 независимые от прежних `story/board` тестовые структуры** `timeline` / `dashboard` + отдельное исключение legal static copy (итого **3 audited fixtures**). **13/13 негативных тестов выявили** несовпадения реестра/лишнее свойство/пропущенную текстовую аннотацию/переименование stable ID/duplicate/missing IDs/неразмеченную статическую надпись; **2/2 специально снятых `data-editable=text` обнаружены**. Positive audit PASS. `STAGE1_COVERAGE_AUDIT={"pass":true,"auditedFixtures":3,"negativeCases":13,"unmarkedLeafTextCaught":2,"explicitReadonlyException":true,...}`.

**Существенное ограничение:** intent ledger пока написан человеком отдельно от HTML. Если генератор пропустит свойство **одновременно и в HTML, и в intent ledger**, аудит этого не узнает. Для произвольного CSS не существует проверенного автоматического анализа всех желательных пользователю настроек. Статический тест leaf-text — эвристика с явными readonly exclusions, не гарантия качества/полноты всей CMS.

## 3. Что это меняет в выборе основы

Исследовательский слой `annotated HTML → discovered manifest → JSON Schema → actual Jedison/RJSF edits → typed preview → computed CSS` теперь подтверждён **не только программной правкой**, но и настоящими пользовательскими действиями над полями обеих библиотек. Это сужает риск применимости schema-driven editor к ограниченному подмножеству свободной разметки.

Но 5 ручных профилей v1.18, 2 annotated structures v1.19 и 2 аудируемых layouts v1.20 всё ещё **manually authored fixtures**, не автономные ИИ-сайты. Невозможно пока считать вариант A/B/C выбранным, нативные библиотеки доказали принципиальную возможность, а не production-grade UX, security или capability coverage 135 обязательных требований.

## 4. Следующие архитектурные блокеры этапа 1

1. Независимое создание уникальной разметки и `data-editable` manifest настоящим генератором, проверка ошибок и coverage под неизменными source/intent критериями, style/layout/behavior.
2. Регистрация и миграция **новых типов свойств** без переписывания ядра; actual widgets с доступностью, единицами и breakpoint inheritance + computed CSS.
3. Сложный AI design: links, media uploads, animations, forms, mixed CSS, trusted behaviors, SEO, server validation, ownership/ACL, безопасные источники и publish path.
4. Ограничения существующего shared hosting PHP — только разрешённое read-only обследование, без изменений тарифа/production. Сопоставить риски Jedison/RJSF/A/B/C и подготовить варианты для отдельного согласования владельца.

## 5. Границы проекта

**Stage 0 accepted; Stage 1 in_progress, not accepted; Stage 2 not_started; tech stack unselected.** На 193 требования — 135 mandatory, 42 desirable и 16 unwanted. **43** узких R/D research/doc signals, **92** без matched targeted evidence, **0/135** приёмок готового продукта. Новые тесты — целевое исследование механизма, не acceptance end-to-end соответствующих пунктов матрицы. Никакого MVP, первый выпуск только после 135/135. CELIKOM независим, касаться только на этапе 17 после полного выпуска CMS. Исследовательский код не вливать в `main` без отдельного решения.
