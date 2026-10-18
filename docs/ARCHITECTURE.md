> **CURRENT v1.38 / 18.10.2026:** Lab-only signed offline ZIP, operator journal, startup gate and *actual* PHP loopback HTTP behind a per-request local Node test facade; all CI green [1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39140562222) + [7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39140562272). **Not wired to production PHP bootstrap**, no real Hostinger, no publisher keys, no full site/data rollback or admin. Stage2 NOT accepted; 0/135 mandatory product accepted. See [detailed report](STAGE-2-SIGNED-RELEASE-GATED-HTTP.md) and [ADR0006](ADR/0006-signed-lab-runtime-boundaries.md).\n\n> **Действующий апдейт v1.36 (18.10.2026), выше исторического содержания.** Направление A: Slim4+Opis2.6+Jedison1.27.1, RJSF fallback. PHP read-only health, PDO schema migrations, внутренний приватный Jedison и отдельный тестовый FoundationSnapshot реализованы в main. Восстановление **только метаданных пустой CMS**, не страниц/медиа/ревизий; [PHP CI 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39134298097). Нет production auth, admin, publish, real backup или подтверждённого Hostinger; Stage2 не принят, Stage3 не начат, 0/135 продуктовых. [ADR0004](ADR/0004-foundation-backup-restore.md).

> **СТАТУС v1.31 от 18.10.2026 (ПЕРЕКРЫВАЕТ ИСТОРИЧЕСКИЕ ПОМЕТКИ НИЖЕ):** владелец доверил ассистенту выбор технологий и продолжение работы; выбран **A: Slim 4 + Opis 2.6 + Jedison 1.27.1**, B/RJSF резерв. **Stage1 ПРИНЯТ**, **Stage2 в работе, НЕ ПРИНЯТ**, Stage3 НЕ начат. Пустое read-only PHP-ядро `cms/` проверено [CI #39125215551 — 1/1 PASS](https://github.com/manufact-test/ai-site-cms/actions/runs/39125215551), **не** готовая CMS, 0/135 продуктово принято, Hostinger не проверялся. [ADR](ADR/0001-selected-foundation.md).

# Архитектурные принципы и варианты — v0.1 (не окончательное решение)

**Назначение:** определить безопасные границы компонентов. Не выбирать фреймворк до сопоставления с 135 обязательными функциями.

## A. Ключевой разрез

```text
ИИ-автор сайта
  ├─ исходники страниц и компонентов (HTML/PHP/React/Next.js и CSS/JS)
  ├─ стабильные идентификаторы элементов
  ├─ manifest со списком действительно используемых свойств
  └─ тесты контракта и дефолтные значения
                       │
                       ▼
     CMS Adapter + Schema Validator
                       │
     Site CMS instance (у каждого сайта своя)
       ├─ Редактор одного блока + изолированный preview
       ├─ Редакторы типов полей из manifest
       ├─ Черновики / published / revisions
       ├─ Ссылки на global tokens + overrides
       ├─ Users / audit / conflict guard
       └─ API / secure DB / media
                       │
                       ▼
     Сайт получает только опубликованные настройки
```

Нельзя требовать от пользовательского сайта загрузку административного JS. Редактор только на `/admin`, iframe/isolated preview блока — отдельно.

## B. Архитектурные гипотезы для проверки

**Вариант 1 (приоритет проверки, не принят):** лёгкая PHP CMS, MySQL/MariaDB, адаптеры к сайтам, JS-приложение только для изолированного админ-редактора. Преимущество — обычный hosting. Минусы — потребуются отдельные адаптеры к React/Next.js и надёжное решение предварительного рендера.

**Вариант 2:** серверно-независимый headless редактор + build-time config, JS/Node сборка для React/Next.js и PHP адаптер. Возможны дополнительные требования к окружению и деплою.

**Вариант 3:** гибрид: лёгкий PHP API и content store, редактор JS, контракт манифестов и статический экспорт для проектов без динамического сервера. Это не разрешает Next.js SSR на PHP хостинге: потребуется статический экспорт либо Node окружение.

**Не выбирать** публичный runtime без тестирования на обычном Hostinger и трёх типах сайта: статический, PHP, React/Next.

## C. Data contract и источник истины

- **Code defaults:** в коде/манифесте, версионированы в Git.
- **Draft values:** пользовательские несохранённые? Нет, автосохранения нет. После явного «Сохранить» — черновик в хранилище.
- **Published values:** публикационная ревизия, изолированная от черновика.
- **Global/overrides:** общие токены; значения блока/элемента; значения для брейкпоинтов; явно вычисляемый effective value.
- **Manifest migration:** при обновлении кода нельзя молча удалять значение, принадлежавшее пользователю. Нужна процедура сравнения версий и стратегия преобразования с журналом конфликтов.
- **Component safety:** ИИ зарегистрировал новое свойство — UI генерирует поле только при верифицированном типе; произвольные новые виджеты требуют безопасного регистрового extension hook.

## D. Поддержка языков и hosting

| Исходный сайт | Стандартный режим | Ограничения |
|---|---|---|
| HTML/CSS/JS | статическая сборка + опубликованный конфиг/предрендер | не встраивать admin JS в публичную страницу |
| PHP | серверный шаблон + опубликованное значение из хранилища | отделить private app от webroot |
| React SPA | адаптер конфигурации + client или build-time hydration | не переносить секреты в браузер |
| Next.js static | статический экспорт + опубликованные значения | требует пересборки/обновления export при публикации |
| Next.js SSR | API/адаптер к отдельному Node runtime | обычный PHP-hosting может не обеспечить исполнение SSR |

## E. Изоляция и производительность

- Список страниц и блоков — лёгкий метаиндекс, не все iframe сразу.
- При открытии секции — загрузка ресурсов **только её** (включая необходимые стили/скрипты), очистка при выходе.
- Тяжёлые Canvas/3D эффекты поддерживаются по контракту, но сами нестандартные редакторы и runtime расширения проходят проверку безопасности/производительности.
- Явные сохранение и публикация, нет обязательного автосохранения.
- Посетитель видит последнюю опубликованную ревизию, а не рабочие изменения.

## F. Безопасность

- TLS, хэширование паролей, сессии с безопасными cookie, CSRF, XSS, проверка доступа к каждому endpoint, rate limit.
- Файлы в публичном webroot только те, что нужны для обслуживания сайта; secrets, backups, DB migrations — вне него.
- Запрет произвольной вставки исполняемых скриптов и raw CSS через админку (если владелец не согласует отдельную policy).
- Изолированные инсталляции разных сайтов с отдельными ключами/БД/доменами.

## G. Решения до реализации

1. Выбрать базовый runtime после сравнения на shared hosting.
2. Утвердить schema manifest, её версионирование и типы field factories.
3. Утвердить модель inheritance и разрешения conflict при обновлении Git.
4. Утвердить renderer/preview адаптер для React и PHP.
5. Утвердить backup/restore, журнал и rollback механизм.
6. Согласовать минимально допустимые операции медиа (№37/41/46) и кнопок/форм.

Подробнее `OPEN-QUESTIONS.md`.

## Актуальные архитектурные решения после изучения вариантов

[ADR 0001](ADR/0001-selected-foundation.md): выбрано модульное PHP-направление Slim 4 + Opis 2.6 + Jedison 1.27.1 с замещаемым editor adapter (RJSF fallback). [ADR 0002](ADR/0002-hosting-storage-isolation.md): PHP-only runtime, изоляция отдельных инсталляций, условно PDO MySQL/MariaDB (реальный хостинг/права не проверялись), изолированное чтение публикаций; Node только build-time. [ADR 0003](ADR/0003-preview-adapter-boundaries.md): AI/site/manifest contracts, безопасный preview одного блока и границы multi-renderer. Старые варианты в разделе B остаются историей исследования, **не действующими альтернативными решениями**. Реализован пока только `cms/` read-only health kernel. Никаких продуктовых API на запись нет, Stage2 не принят.


### Stage2 offline supply-chain research boundary (18.10.2026, v1.37)

[ADR 0005](ADR/0005-offline-release-and-sbom.md) records the locked machine CycloneDX component ledger, copies of installed runtime third-party licenses, private-notice placement and **disposable code-only immutable version-slot rollback simulation**. This is **not** authenticated production distribution, multi-process cutover, data rollback or host validation. Stage2 remains not accepted; Stage3 has not started. See [test log](STAGE-2-SBOM-ROLLOUT.md).
