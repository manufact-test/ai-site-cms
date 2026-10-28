> **АКТУАЛЬНО · 24.10.2026 · v1.59 · ДВА ЧАТА / УСКОРЕННАЯ ПРОГРАММА.** Единственный главный интегратор пишет в `feature/stage3-ai-site-contract`; второй работает отдельно в `feature/stage3-release-audit-lab` и ТОЛЬКО `stage3/release-audit/`. Основной code checkpoint `58b7ebb2e309d1845c8139fbcf58689f5a8ad2a2`, [aggregate CI](https://github.com/manufact-test/ai-site-cms/actions/runs/40037244195) (SUCCESS, проверено). Роли, точные пути и разрешения: [главная передача](../handoffs/lead-integrator/MAIN-HANDOFF-v1.59-2026-10-24.md) и [задание второму чату](../handoffs/parallel/RELEASE-AUDIT-ASSIGNMENT-v1.59-2026-10-24.md). Одно «продолжаем» главного = большой полный функциональный блок; второй не пишет в файлы главного. Stage2 NO-GO #5–#9; Stage3 изолированно, не принят; 0/135. Без Hostinger/production/merge main. Более старые записи ниже исторические.

> **АКТУАЛЬНО · 23.10.2026 · v1.58 · УСКОРЕННАЯ ПРОГРАММА.** Ветка `feature/stage3-ai-site-contract`, проверенный код `964e6746db7680c064cce502ae034c00683115b5`, [CI SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40019059962). Работающая isolated Stage3→12 основа: editor/API/media/forms/templates, recipes, full-content archives/recovery и scoped users/audit. Stage0–1 приняты; Stage2 ~85–90% технически, формально NO-GO #5–#9; Stage3 разрешён, но не принят, 0/135 официально. **Одно «продолжаем» = большой цельный функциональный блок; один нужный browser E2E + существующий CI; документы только по просьбе о переходе.** Старые записи ниже исторические; не отменяют эту точку. Реальные хост/БД/production/merge запрещены без отдельного scope. [Каноническая передача](../handoffs/lead-integrator/MAIN-HANDOFF-v1.58-2026-10-23.md), [NEXT-CHAT §63](NEXT-CHAT.md).

> **ПЕРЕДАЧА v1.56 — 23.10.2026 / УСКОРЕННАЯ ПРОГРАММА / Stage3-parallel.** Новый проверенный `feature/stage3-ai-site-contract` исходный SHA [`4d7dc06ced179bb50f4020e249e8c1303d3a4479`](https://github.com/manufact-test/ai-site-cms/commit/4d7dc06ced179bb50f4020e249e8c1303d3a4479); [CI SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39946661843), [скачиваемая offline Studio](https://github.com/manufact-test/ai-site-cms/actions/runs/39946661843/artifacts/12498631776). Stage2 NO-GO по #5–#9; Stage3 код началcя в отдельной ветке по новому разрешению владельца, **не** слит с main, **не** принят, 0/135 официальной приёмки. Один «продолжаем» = БОЛЬШОЙ завершённый полезный блок, минимум нужных проверок; главное — работающая CMS, а не бесконечные демо/аудиты. Реальный Hostinger/БД/SSH/деплой запрещены без отдельного scope. [Полная передача v1.56](../handoffs/lead-integrator/MAIN-HANDOFF-v1.56-2026-10-23.md). Старые запреты на *саму изолированную разработку Stage3* устарели; запреты на production остаются.

**Реализация v1 в экспериментальной ветке, не утверждённый production контракт:** `stage3/sdk/contract.cjs`, `stage3/sdk/draft.cjs`, `stage3/schemas/*`, `stage3/components/*`, `stage3/studio/index.html`. Модель-agnostic no-design, stable ID, typed property, responsive inheritance, strict field closure, schema upgrade with conflicts, local save/revisions/preview. `docs/AI-SITE-CONTRACT.md` ниже описывает исходный дизайн v0.1 и должен читаться в историческом контексте. Полная интеграция с API, MySQL, редактором других платформ и production acceptance №101–119 остаётся задачей следующих крупных блоков.

> **v1.45 / 19.10.2026 (АКТУАЛЬНЫЙ CHECKPOINT):** Stage0+1 приняты; Stage2 инженерно ~85–90%, но формально НЕ принят; Stage3 НЕ начат; 0/135 продуктовое принятие. Последний проверенный КОД 493964f32d63dd5552484afbcc972fc614571381 — [PHP 7/7 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39275005275), [редактор + пакет 1/1 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39275005280). Внутренний пакет 471 файл, 43 зависимости; CI-only двухсайтовый Nginx/3 PHP-FPM/MySQL8.4 и recovery; 7 файлов owner/legal handoff, 8 открытых человеческих решений. Реальный Hostinger НЕ проверяли; разрешения read-only / install / outage только по отдельному запросу. ADR0012/0013 (ручные лицензии, safe AI blocks и reuse) — УТВЕРЖДЁННЫЕ БУДУЩИЕ требования, не реализация. Исторические v1.44 и ранее не являются текущим SHA. Подробнее: [NEXT-CHAT §50](NEXT-CHAT.md), [полный v1.45 handoff](STAGE-2-FINAL-HANDOFF-v1.45.md). Документ обновлён по прямой просьбе; при обычном 'продолжаем' документы не трогать.

# Контракт ИИ-разработчика и CMS — проект v0.1

**Статус:** концепция схемы, без финального формата и кода. Нельзя внедрять без утверждения модели данных и теста нескольких сайтов.

## 1. Обязательства ИИ при создании любого сайта

1. Создать запрошенную вёрстку, включая сценарий «на свой вкус», не требуя от заказчика предварительного design-system.
2. Идентифицировать каждую страницу, секцию, редактируемый элемент стабильными ID, не зависящими от порядка DOM и случайных CSS-селекторов.
3. Для использованных свойств записать **field type**, редакторскую подпись, допустимые значения, units, значение по умолчанию, применимость к брейкпоинтам и месту рендера.
4. Описать глобальные shared styles и локальные overrides, приоритет наследования, какие операции влияют на несколько блоков.
5. Разделить `content`, `style`, `behavior` с контролируемыми bindings, чтобы CMS меняла параметры, а не переписывала исполняемый код.
6. Для новой уникальной анимации/компонента предоставить манифест и совместимый безопасный редактор типа поля при необходимости.
7. Написать/запустить проверки: пропущенные управляемые свойства, ошибочные ID, конфликтующие настройки, отсутствующие медиа, адаптив.
8. При позднейшем обновлении сравнить версии схемы и сохранить владельческие правки либо потребовать разрешения конфликта перед выпуском.

## 2. Пример гипотетического манифеста

```json
{
  "schemaVersion": "0.1-draft",
  "siteId": "example-site",
  "pages": [{
    "id": "home", "path": "/",
    "sections": [{
      "id": "hero-primary", "label": "Главный экран", "component": "HeroPrimary",
      "manifestVersion": "1.0.0",
      "editableElements": [{
        "id": "hero-title", "label": "Заголовок",
        "properties": {
          "content.text": {"type": "text", "default": "Ваш заголовок"},
          "style.fontSize": {"type": "length", "default": "64px", "responsive": true},
          "style.color": {"type": "color", "default": "#ffffff"}
        }
      }, {
        "id": "hero-action", "label": "Основная кнопка",
        "properties": {
          "content.text": {"type": "text", "default": "Подробнее"},
          "style.borderRadius": {"type": "length", "default": "12px"},
          "behavior.href": {"type": "url", "default": "/contact/"}
        }
      }]
    }]
  }]
}
```

Это **иллюстрация**, не утверждённый формат. Например, `style.borderRadius` находится в манифесте только потому, что кнопка действительно использует radius. Если border в этой секции отсутствует, блок editor border не создаётся. Различать border-width, border-color и border-style при фактическом использовании.

## 3. Правила генерации UI

- Манифест верифицируется на сервере и генерирует предсказуемые редакторы известных типов `text`, `number`, `length`, `color`, `enum`, `boolean`, `url`, `media`, `shadow`, `animation`, `composite` и др.
- Неизвестные типы требуют безопасного плагинообразного расширения, а не свободного исполнения JS из значения пользователя.
- Отсутствующие на конкретном сайте свойства не показываем; не подмешиваем в блок «все CSS-возможности».
- Отдельные контролы для desktop/tablet/mobile появляются только у предусмотренных responsive свойств.
- При выборе элемента в дереве и предпросмотре используется один и тот же стабильный ID.

## 4. Правила безопасной публикации

1. Не генерировать изменённый исполняемый JS/CSS как текст пользователя, если это не разрешено типизированной безопасной схемой.
2. Применять серверную типовую валидацию, значения диапазонов/единиц, whitelists URL/загрузок.
3. Сохранить и опубликовать — разные операции. История ревизий и source-of-truth всегда различимы.
4. Если код сайта убрал/переименовал свойство, к которому есть опубликованный override — не удалять override молча.
5. Публичный сайт должен иметь опубликованную конфигурацию, работающую **без самой админки**.

## 5. Автоматическая проверка полноты

Для каждого разработанного/обновлённого блока подготовить отчёт:

- ✅ используемые свойства проаннотированы в manifest;
- ✅ для каждого редактируемого свойства существует корректный field type;
- ✅ изменение значения действительно меняет именно намеченный элемент;
- ✅ планшет/телефон наследуют и переопределяют конфигурацию предсказуемо;
- ✅ undefined/invalid values не повреждают опубликованную страницу;
- ✅ пользовательские overrides остаются при обновлении/требуют разрешения конфликта;
- ✅ публичная страница работает без CMS/editor runtime.

Результаты покрытия связывать с номерами требований из `REQUIREMENTS.md`.

## 6. Согласованный safe-by-default генератор сайтов — 19.10.2026

При создании сайта «на свой вкус», без дизайна или по прототипу ИИ обязан предоставить **рабочее поведение** каждого используемого блока, а не только визуальный HTML и список редактируемых полей. Manifest в будущем будет описывать применимые capabilities, реальные зависимости и проверку. Названия будущих JSON-полей не фиксированы до Stage3.

- **Формы:** серверная валидация, бот-защита/honeypot/rate-limit, international phone, реальная отправка через безопасный обработчик и корректный статус/ошибки; без секретов/получателя — CONFIGURATION_REQUIRED, не фальшивая отправка.
- **Остальные блоки:** кнопки и ссылки с работающими actions, FAQ/menu/modal keyboard/focus/mobile/reduced-motion, media lazy/optimization с исключениями для важных ресурсов, responsive/a11y/SEO/security всех страниц.
- **Проверки:** PASS/FAIL/N/A с причиной/CONFIGURATION_REQUIRED; доставка с настоящим тестовым endpoint, negative bot/validation/XSS/CSRF, no horizontal scroll, независимость публичного сайта и заявок от отключённой админки.
- **Реюз:** до собственного кода исследовать и проверить maintainer/security/license/version/compatibility существующих permissive open-source модулей; адаптировать по HTML/PHP/React/Next без обязательного Node на PHP-хостинге. OWASP/GOV.UK/WCAG/libphonenumber/Radix — кандидаты к оценке, не автоматически включённые библиотеки.

Полный стандарт [SITE-QUALITY-BASELINE](SITE-QUALITY-BASELINE.md) и утверждённая политика [ADR0013](ADR/0013-ai-site-safe-defaults-and-reuse.md). Это **дополнение к будущему контракту**, а не работающая сейчас функциональность Stage2.


## v1.57 — isolated live CMS adapters, sections and publication

`manufact-ai-site-v1` and `manufact-ai-component-v1` stay unchanged. The registered manifests remain first-party and closed. `stage3/sdk/draft.cjs` extends explicit structure operations with `duplicatePage`, `duplicateSection`, and `applyTemplate`, each needing `expectedRevision`, validated fresh stable IDs, and global uniqueness; unchanged owner-edited field values survive copying. These operations only edit the local draft with Undo/Redo. Neither saving a library preset nor applying one implicitly publishes.

The PHP server stores reusable section templates in `stage3_section_templates`, keyed by `site_id` and generated template ID. The owner can save only a section already present in the validated, current persisted draft; `GET/POST /api/sites/{id}/templates` and `POST /api/sites/{id}/templates/{id}/delete` are authenticated/CSRF-protected for writes. Site isolation is intentional (no sharing presets across sites until a separate safe media policy exists). Insertion via Studio regenerates section and element IDs and revalidates the whole site before any explicit server save. Latest code `fe1ee0f041a807137ee4696f431d22fb5919d1a5`, [CI](https://github.com/manufact-test/ai-site-cms/actions/runs/39986341837).

This remains a CI-only implementation, NOT final approval of 135 mandatory requirements. The Stage2 release/legal/hosting gates remain open and are separate from the isolated Stage3 feature work.

## Stage3 individual picture art direction (28.10.2026)
For externally AI-authored approved site manifests, a graph `image` may contain optional `responsiveMedia: {tabletAssetId?,mobileAssetId?}` selecting distinct validated raster originals already in `site.assets`. Empty object and non-image node are rejected in both SDK and PHP, including attempts to reference unowned images or unsupported MIME types. This is a first-party typed capability for acceptance-quality custom designs, not a generic CSS/HTML importer. PHP and offline Studio render an accessible native `picture` with device-specific `source` elements and the original `img` as fallback. The normal server-issued immutable media ID remap, owner editing, media audit, atomic global replacement, unused deletion protection, Save, Publish and backup/restore remain in force. Separate `backgroundMedia` provides site-owned responsive section backgrounds. Source image parity must be checked against each approved original after publication. No actual customer approval or 135/135 milestone is claimed.
