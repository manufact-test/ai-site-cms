# AI Site CMS — Stage 1: adversarial HTML boundary / iframe security research

**Checkpoint v1.16 · 17.10.2026**  
Исследовательская ветка: `research/stage1-editor-comparison`, тест [html-boundary-adversarial.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/html-boundary-adversarial.cjs). **Отдельный тест безопасности в GitHub Actions #39067271214: PASS**; общий workflow и остальные пробы проверяются отдельно. Всё ниже — узкое исследовательское доказательство, **не production security audit и не законченная CMS**.

## Граница доверия до загрузки iframe

Новая исследовательская fail-closed функция `preflight` с зафиксированной грамматикой **одной конкретной Hero-секции** анализирует разметку через `parse5 v8.0.0` с явными parser errors и изолированный DOM `jsdom`. Проверяется:
- ровно один завершённый корневой `<section>` (включая полный `</section>`, что предотвращает повторение старой ошибки `</section` с втягиванием следующего скрипта);
- фиксированный набор допустимых HTML-тегов и атрибутов; запрещены произвольные `style`, `on*`, `src`, `href`, `iframe`, `script`, `style`, `svg`, `math`, `template`, `base`, `meta` и другие посторонние конструкции;
- **12 стабильных ID**, в допустимом порядке, без повторов;
- текст от пользователя остаётся текстом: отрисовка React экранирует `</script>`, `<img ...>`, `</style>` и похожие строки.

**Отрицательный набор: 20/20 отвергнутых потенциально опасных или повреждённых HTML-фрагментов**, включая несовпадающие/незавершённые теги, внедрение элементов в конце секции, rawtext, event handlers, чужие атрибуты и дубли IDs. Валидная секция и секция с экранированным подозрительным текстом принимаются.

**Очень важно:** это НЕ универсальный HTML sanitizer; он отбрасывает всё, кроме данной узкой Hero-грамматики. Реальные произвольные AI-generated блоки не покрыты. На этапе проектирования нужно решить расширяемый доверенный формат компонентов, границы AST/HTML парсинга, управление media URL, CSP, правила вложенности, accessibility и строгую схему атрибутов/тегов. **Не вставлять AI HTML как есть.**

## Граница доверия внутри нативного iframe

На настоящем локальном HTTP origin (Chromium в CI, не хостинг клиента) проверен `iframe sandbox="allow-scripts"`, **без `allow-same-origin`**:

- iframe имеет opaque origin (`null` при parent-side проверке) и не может читать/менять DOM родителя;
- CSP задан через `<meta>` в `srcdoc` до HTML; скрипт trusted bridge с правильным nonce исполняется; дополнительно вставленный скрипт без nonce **не выполняется** и не отправляет предусмотренный вредоносный пакет;
- `postMessage` bridge проверяет `event.source === parent`, точный HTTP origin родителя, токен, вид операции, набор полей, строковый тип и длину. Обратные сообщения родитель принимает только от **конкретного preview iframe** с origin `null`, правильным токеном и точным типом.
- неверный token, лишний ключ в сообщении, подмена от parent window и **реального другого iframe** не вызывают принятого `applied`; отправка похожей на XSS строки через разрешённый канал выводится через `.textContent`, не `.innerHTML`.
- отдельный admin label остаётся неизменным.

Это **не полная проверка production CSP**: реальный HTTP response-header CSP, разрешённые media sources/CDN, OAuth/RBAC, session/CSRF, origin navigation and targetOrigin, утечки токенов, browser compatibility, конфликты нескольких пользователей и сторонние виджеты не испытаны. Описанный протокол — экспериментальная модель и не предназначен для копирования без threat model.

## CI история — фиксируем ошибки прозрачно

- [#39066926805](https://github.com/manufact-test/ai-site-cms/actions/runs/39066926805) — тест неудачно сформировал негативное сообщение: отправил его **в посторонний iframe**, а не **из** него, вследствие чего ожидание числа отказов было неверным. Старые suite-проверки работали.
- [#39067088041](https://github.com/manufact-test/ai-site-cms/actions/runs/39067088041) — в Playwright `locator.evaluate` callback неправильно получил первый аргумент DOM-element вместо переданного token; `DataCloneError` внутри отрицательного теста. **Не трактовать как пробой iframe безопасности**.
- [#39067271214](https://github.com/manufact-test/ai-site-cms/actions/runs/39067271214) — исправленная точка входа злонамеренного сообщения из другого browsing context; защитный тест запущен **раньше дорогих сравнений** и имеет подтверждённый **step-level PASS**. Общее заключение workflow проверять отдельно.

## Требования и статус

Связанная [матрица по 135 mandatory ID](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md) разбирает исходные `requirements/requirements.csv`: **43 ID** связаны с отдельными исследовательскими или документальными сигналами, **92** без сопоставленного предметного теста, **0/135** имеют продуктовую приёмку. Ни безопасность, ни HTML-parser fixture **не закрывают** требования автоматически.

**Остаётся:** реальный hostile-AI HTML AST/security design, sandbox resources, CSP headers/origin, media, actual shared PHP hosting, 135-ID acceptance matrix implementation details. Этап 1 `in_progress`, этап 2 `not_started`; нет утверждённого стека, production CMS, обновления Hostinger и пилота CELIKOM. Продолжение — [NEXT-CHAT.md](NEXT-CHAT.md).
