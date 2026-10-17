# AI Site CMS — этап 1: пять типов уникальных секций, редакторские привязки и безопасное preview

**Checkpoint v1.18 · 18.10.2026**  
**Полный исследовательский CI PASS:** [#39069971771](https://github.com/manufact-test/ai-site-cms/actions/runs/39069971771), research commit [`60f530745bfd324d9cedca8172e5300f0e61f9ea`](https://github.com/manufact-test/ai-site-cms/commit/60f530745bfd324d9cedca8172e5300f0e61f9ea), ветка `research/stage1-editor-comparison`. Экспериментальный код **не** вливался в `main`.

Это исследование продолжает [media + AST checkpoint v1.17](STAGE-1-MEDIA-AST-GAPS-RESEARCH.md), [предыдущую HTML trust boundary](STAGE-1-HTML-BOUNDARY-RESEARCH.md) и [матрицу 135 mandatory ID](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md). **Не product implementation, не production security, не приёмка этапа 1.**

## 1. Цель, гипотеза и устроенный честно эксперимент

До v1.17 проверяли ограниченный Hero и Media AST и ранее одну многоэлементную Hero с upstream редакторами. Надо проверить, что типизированный контракт способен описывать **разные по назначению секции**, не заставляя ИИ использовать одну визуальную схему.

Написаны два отдельных research-only файла:
- [multi-section-contract.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/multi-section-contract.cjs): пять конечных профилей, реестр типов и assets, детерминированный HTML renderer, JSON Schema для полей, ограничение значений.
- [multi-section-browser.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/multi-section-browser.cjs): настоящие Jedison **1.27.1** и RJSF **6.11.0** (+ AJV Draft 2020-12), реальный Chromium, localhost HTTP media, native CSP nonce iframe, редактирование через HTML-controls библиотек, интерактивность и отрицательные проверки протокола.

**Эти профили и HTML-шаблоны подготовлены вручную специально для исследования**. Это НЕ независимая генерация нескольких сайтов настоящим ИИ и НЕ автоматическое извлечение манифеста из произвольной вёрстки. HTML свободной формы, произвольные стили/скрипты и загрузка пользовательских компонентов не разрешены.

## 2. Что проверено на реальных редакторах

| Профиль | Суть секции | Сценарий с actual upstream редактором | Stable IDs |
|---|---|---|---:|
| FAQ | заголовок, вопрос, раскрываемый ответ, адаптивное значение | Заголовок изменён; клик по FAQ раскрывает ответ; mobile наследует desktop значение `42px` в **typed render metadata** | 5 |
| Contact | заголовок, поля имени/email, required, локальное подтверждение, внутренняя ссылка | Заголовок изменён; поля заполнены; подтверждение локально без отправки заявки | 10 |
| Pricing | карточка тарифа, числовая цена, CTA/URL, ограниченный цвет, адаптив | Название плана изменено, стоимость `49→79`; mobile наследует tablet `38px` в **typed render metadata** | 6 |
| Gallery | image+alt, video, caption, локальные ID ресурсов | Alt изменён через реальный редактор; PNG и WebM реально загружены и декодированы внутри sandbox; метаданные video `videoWidth=64` | 6 |
| Tabs | два названия вкладок, два содержимых, active enum | Текст отредактирован; клик переключил видимость/aria-selected | 7 |

Каждый из 5 профилей запущен **дважды**, отдельно на настоящих библиотеках Jedison и RJSF: **10/10 PASS**. Обе библиотеки на одинаковых fixtures дали **одинаковую итоговую typed JSON-модель**. Zero browser `pageerror`. Published baseline в памяти не мутировал от редактирования draft. Для каждой выбранной секции создавался ровно один editor preview iframe; второй iframe в стенде — отдельно намеренный враждебный sender для проверки сообщений.

**Измерять скорость/heap двух библиотек по этим сценариям нельзя:** это короткие скриптовые сессии, не пользовательский usability benchmark, не production telemetry и не сравнение UX готового приложения.

### Адаптив / CSS — точное ограничение

FAQ и pricing проверяют сохранение typed responsive значения и наследование tablet/mobile **в HTML `data-size`**. Здесь **не измеряли CSS computed font-size** или визуальную разницу на трёх реальных устройствах. Предыдущие Hero стенды проверяли применение размеров через DOM style, но автоматическая универсальная CSS binding-архитектура для новых секций не реализована. Нельзя ставить «геометрия/адаптив реализованы».

## 3. Отказоустойчивые границы секционного манифеста

Пять профилей используют явный registry полей `text`, `boolean`, `integer money`, `internal-link`, `color`, `asset`, `enum`, `responsive-length`. Отклоняются неизвестные профили/поля, лишние параметры, `null` вместо typed значений, чрезмерно длинный текст, `javascript:` / `data:` / внешние URLs, неверные цвета, единицы CSS, дробная/отрицательная стоимость, неверный вид ресурса, неподдерживаемые enum и ошибочные вложенные breakpoint-контейнеры.

В отдельном Node/JSDOM исследовании **30/30 негативных случаев отклонены**; строки `<img src=x onerror=evil()>` и `</script>` экранированы, не создают DOM script/img. Секции сериализуются trusted renderer functions, а не конкатенацией сырых HTML из пользовательских значений. Stable IDs уникальны в пределах секции, от 5 до 10 на профиль.

**Строгость не равна полноте:** нет независимой проверенной регистрации нового **неизвестного** компонента, проектирования произвольной композиции, кастомного source JS/CSS, 3D/GSAP и real policy extension без доверенного разработчика. Отсутствие уязвимостей на 30 synthetic cases не подтверждает production security.

## 4. Протокол iframe и важная находка по формам

Chromium открыл parent по настоящему `http://127.0.0.1`. В `iframe sandbox="allow-scripts"` (без `allow-same-origin` и `allow-forms`) загружается только доверенный built renderer + bridge с CSP nonce. Рендер вызывается typed `postMessage` с exact keys, верными `source`, parent `origin`, token и монотонным номером запроса; child снова проверяет поля перед заменой markup. Неправильный token, лишнее поле, stale/replay sequence, недопустимые CSS значения не получают applied acknowledgment. Отдельный sibling rogue frame / parent-self поддельный ack отвергается parent-side; 0 JS pageerrors.

**Важный диагностический FAIL:** [#39069807024](https://github.com/manufact-test/ai-site-cms/actions/runs/39069807024) — предположили, что обработчик `submit` выполнится после клика в opaque sandbox без `allow-forms`; браузер не разрешил обычную отправку и probe ждал ack. Исправлено на **локальную реакцию click + `form.checkValidity()` + `preventDefault()`**, без выдачи `allow-forms`, без внешнего POST и без сохранения пользовательских данных. Повторный полный CI [#39069971771](https://github.com/manufact-test/ai-site-cms/actions/runs/39069971771) успешно прошёл.

**Это не реальные заявки:** серверные обработчики, антиспам, CSRF/RBAC, валидация business rules, delivery и retries **не тестировались**. При future preview нельзя включать `allow-forms` просто ради теста; отделять локальную демонстрацию от явно авторизованной серверной отправки в published runtime.

## 5. Вывод по вариантам архитектуры, без выбора стека

- **Typed registry + trusted renderers (вариант A):** становится жизнеспособнее как исследовательская основа: 5 несхожих секций без самостоятельного исполняемого HTML из значений, обе редакторские библиотеки редактируют одни данные, 30 negative cases. Риск — **ручной код для каждой новой категории**, что без механизма AI self-description превратится в конструктор шаблонов.
- **Arbitrary HTML + policy packs (вариант B):** не испытывался на неограниченной грамматике; сложная поверхность HTML/CSS/JS/SVG остаётся открытой. Произвольный HTML не должен автоматически считаться доверенным из-за parse5/nonce.
- **Trusted site build + typed manifest/patches (вариант C):** совместим концептуально с необходимостью оставлять свободу оригинального AI-дизайна и независимость публичного сайта; **не подтверждены** автоматическое extraction/registration, matching DOM/template versions, editor override migrations, live behavior, auth и safe updates.

Пока **нет оснований утверждать одну окончательную архитектуру или библиотеку**. Для следующего research-slice нужна комбинация нескольких новых независимых структур, автоматизированного property coverage + cross-renderer binding и сложных behavior/CSS/media paths, чтобы отличить пригодность архитектуры от удобства вручную написанных templates.

## 6. Gap analysis: не обнулять и не преувеличивать

Полный [официальный register всех 135 обязательных ID](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md) остаётся источником truth: **43 ограниченных R/D сигнала, 92 без узкого соответствующего теста; 0/135 реальных продуктовых приёмок**.

Новые тесты дают архитектурные узкие сигналы для будущего исследования №38 (alt), №48 (video), №68 (internal links), №72–78/83 (behavior and local form), №103–110 (typed manifest), №109 (device inheritance), №115 (media in renderer), №130 (device preview), но НЕ являются целевым доказательством исполнения этих функций готовой CMS. **Матрицу R/N на основании этого стенда не изменяем**, поскольку нет полного редактирования, публикации, runtime integration и acceptance evidence. По данным официальной матрицы по-прежнему важнейшие пустые группы: geometry 10/10 N, media 8/8 N, interactions 15/15 N, pages/SEO 15/15 N.

Обязательный полный релиз остаётся **135/135**, без MVP и без исключения сложных функций. Этап 1 продолжается и **не принят**; этап 2 не начат, итоговый стек не выбран, реальный PHP shared hosting не тестировали, production/CELIKOM не трогали.

## 7. Ближайшие исследования этапа 1

1. **Секция вне пяти ручных профилей:** сформировать разнородные реально AI-generated markup/contracts, с нестандартным поведением, без копирования готового Hero. Доказать добавление нового типа UI через явный contract/profile extension, а не через переписывание всей CMS.
2. **Сравнить render binding и coverage:** stable-ID collision/migration, разные рендереры HTML/PHP/React/Next-static, auto-detection отсутствующих параметров, style computed values и inheritance, визуальные device checks.
3. **Media adversarial pipeline:** MIME/signature vs actual decoder/polyglots, лимиты/timeout, source URL policy, preview CSP headers/violations; тестировать отказ без затрагивания чужих сайтов и реального storage.
4. **Threat model:** form isolation, server-side validation/authorization, bridge token lifecycle/replay/revocation, negative CSS/URL capabilities; всего лишь лабораторный код, без аттестации production.
5. **Hosting:** существующий Hostinger/PHP, при разрешённом доступе сначала **только read-only** проверка реальных ограничений. Не обновлять тариф и не менять работающие сайты.

Следующая серия результатов должна помочь подготовить **предложение владельцу** для утверждения основы; самовольного перехода к этапу 2 нет.
