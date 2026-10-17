# AI Site CMS — Stage 1: одинаковые составные поля и медиа-заглушки

**Контрольная точка:** v1.15 · 17.10.2026  
**Источник:** [GitHub Actions #39066085194](https://github.com/manufact-test/ai-site-cms/actions/runs/39066085194), полный исследовательский CI **PASS**, commit `fb12a4ea6ac27808e583207240d182edde997659` на `research/stage1-editor-comparison`. **Не production CMS.**

## Что именно проверено

Новый [matched-custom-media.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/matched-custom-media.cjs) сравнил реальные версии upstream **Jedison 1.27.1** и **RJSF 6.11.0**, используя одинаковый JSON Schema Draft 2020-12 из `typed-manifest.schema.json`, одинаковые исходные данные и две уже созданные реализации кастомных полей:
- `custom-widgets.cjs` — Jedison class `EditorStringInput` + `EditorObject`;
- `rjsf-custom.cjs` — React `ui:widget` + `ui:field` с AJV2020.

**Четыре составных редактора:** length (число + px/rem/%), shadow (x/y/blur/color), gradient (angle/from/to), animation (boolean/duration/easing). Автоматический сценарий редактировал девять контролов в каждом из **двух циклов mount/edit/unmount на каждый редактор** и ожидал одинаковую typed model:

```json
{
  "fontSize": "72rem",
  "shadow": {"x": 0, "y": 5, "blur": 25, "color": "#abcdef"},
  "gradient": {"angle": 120, "from": "#aabbcc", "to": "#334455"},
  "animation": {"enabled": false, "duration": 850, "easing": "linear"}
}
```

Для обеих библиотек итоговые модели совпали по `assert.deepEqual`. Ошибок JavaScript — **0**.

## Что в предпросмотре

- Один opaque `iframe sandbox="allow-scripts"`, нативный `srcdoc` с browser-executed nonce inline JS и мета-CSP, typed `postMessage`; 50 записей metadata-only без дополнительных iframe.
- Реальная 12-ID React-rendered Hero-разметка из `adapter-section.cjs`. Четыре типа редакторских значений преобразуются в inline style через конечные типизированные/диапазонные проверки: font-size, box-shadow, linear-gradient, transition duration/easing.
- Три **DOM/CSS-заглушки**: image/video/animated; `connect-src`, `img-src`, `media-src` выставлены в `'none'`, **нет настоящих сетевых запросов, изображений, видео, Lottie, WebGL или 3D**. Значение animation.enabled отображено в data-атрибуте заглушки.
- Негативный сценарий отправлял пакет с `shadow.color='url(javascript:alert(1))'`; проверено отсутствие нового `applied` acknowledgment, текущее preview не принимает запрещённое значение. Отдельно проверено, что published baseline остаётся неизменным.
- После каждого `dispose` на странице не остаётся `data-cms-widget` controls. Все проверки **PASS** для обоих редакторов, по 2 цикла.

## Ограничения доказательства

1. Исследовательский harness **извлекает setup-функции текстовым фрагментом из двух предыдущих research-файлов**, затем подключает их как скрипты страницы. Это контролируемое переиспользование тестовых implementation-фрагментов; оно хрупко относительно переименования кода и **не подходит для production**. В реальном продукте потребуется нормальный module/export integration. Нельзя выдавать этот тест за готовый SDK.
2. CSP здесь `meta` в `srcdoc`, `style-src 'unsafe-inline'` для исследовательской стилизации; отсутствие широкой exploitability/security-assurance не проверено. Источник preview HTML считается доверенной статической fixture. Нельзя встраивать произвольный HTML, написанный ИИ, без отдельной sanitization/trust policy и без security review.
3. Mock-медиа не доказывают поведения реального image/video loading, autoplay, drag-and-drop, canvas/3D, CDN, CORS, асинхронных ошибок, размеров файлов и медленных устройств.
4. Пользовательские циклы короткие (2 на редактор), не замена длительному reliability/retained-memory тесту. Нагрузочный 16-cycle test из checkpoint v1.14 — **другая** data schema, нельзя складывать результаты как одно испытание.
5. Нет фактического PHP Hostinger shared-hosting, production RBAC/CSRF/session/rollback, multiuser conflicts, Next SSR, настоящей CMS. **Ни одно из 135 обязательных требований не принято как продуктовый результат**.
6. PASS отражает только Chrome на GitHub runner с pinned upstream версиями. Это не окончательный выбор в пользу Jedison или RJSF.

## Следующие задачи внутри этапа 1

Продолжить adversarial HTML/rawtext/inline style/iframe boundary, затем реальное media loading на безопасных локальных fixtures с браузерными сетевыми сценариями; более длинные editor-сессии и lifecycle; проверить требования против матрицы 135 ID; читать параметры **реального** текущего PHP shared-hosting только при получении авторизованного доступа и по [STAGE-1-HOSTING-SMOKE-PLAN.md](STAGE-1-HOSTING-SMOKE-PLAN.md). Не менять тариф, реальные сайты и CELIKOM. **Этап 1 in_progress, этап 2 not_started**, стек не выбран.

Связанные документы: [STAGE-1-TEST-LOG.md](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md](FOUNDATION-COMPARISON.md), [NEXT-CHAT.md](NEXT-CHAT.md).
