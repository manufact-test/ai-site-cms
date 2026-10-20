> **АКТУАЛЬНАЯ ПЕРЕДАЧА v1.47 (20.10.2026), по просьбе владельца:** LAST [§52 NEXT-CHAT](NEXT-CHAT.md) и [Hostinger live kernel report](STAGE-2-HOSTINGER-LIVE-KERNEL-v1.47.md) заменяют устаревшие вводные v1.43–v1.46 ниже. Код `da6e646f6d36d91e8a7b33b33e31a0c10605e856`; [PHP 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638513), [Editor/package 1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638339), [реальный Hostinger r6 14/14](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638427). Вручную размещённая **473-file unsigned** offweb CMS цела и исполняет read-only Slim4 health на реальном LiteSpeed, **но пользовательская CMS /api/health 503, целевая MySQL схема не установлена**. GitHub public без платных/private требований. **Stage2 НЕ принят; Stage3 не начат; 0/135.**

> **АКТУАЛЬНАЯ ПЕРЕДАЧА v1.45 (19.10.2026), по прямой просьбе владельца:** Stage0 и 1 приняты; Stage2 НЕ принят; Stage3 НЕ начат; 0/135 продуктовых функций. Последний проверенный КОД 493964f32d63dd5552484afbcc972fc614571381; PHP 7/7: https://github.com/manufact-test/ai-site-cms/actions/runs/39275005275; editor/package 1/1: https://github.com/manufact-test/ai-site-cms/actions/runs/39275005280. Внутренний CI-only пакет 471 файл, 43 pinned зависимости; реальные в disposable CI Nginx + три PHP-FPM + две MySQL8.4 CMS + независимые сайты, восстановление; семь проверяемых offline-файлов передачи и восемь открытых ручных решений. Ни Hostinger, ни реальные сайты не проверялись. Ручные лицензии и safe AI-блоки (ADR0012/0013) — будущие требования, НЕ готовые функции. Актуально: NEXT-CHAT.md §50 и STAGE-2-FINAL-HANDOFF-v1.45.md; прежние checkpoints ниже исторические.

> **v1.44 / 19.10.2026: согласованные решения владельца; этап 2 НЕ ПРИНЯТ, этап 3 НЕ начат, 0/135.** [Ручные лицензии](ADR/0012-manual-client-licenses-and-project-handover.md), [AI-блоки/reuse](ADR/0013-ai-site-safe-defaults-and-reuse.md), [стандарт качества](SITE-QUALITY-BASELINE.md). Документ обновлён по прямой просьбе при передаче чата; старые checkpoint заметки ниже исторические. Код до docs-only изменения `1b1f154702bc618242f7769524e769a2b1486932` — [PHP 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39240517754), [редактор 1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39240517567), 469 файлов. Новые правила ещё НЕ реализованы.

> **АКТУАЛЬНАЯ ТОЧКА v1.43 (19.10.2026; прежние строки — история):** Stage0 и Stage1 приняты; **Stage2 выполняется, НЕ ПРИНЯТ; Stage3 НЕ начат; 0/135 обязательных продуктовых требований принято.** В `main` реализованы CI-only многосайтовые установки, перенос пустых метаданных, PLAN с отпечатком публичного сайта, изоляция пяти семейств HTML/PHP/React/Next Static/Next SSR, реальный Nginx и Apache2.4 + PHP-FPM на GitHub runner, встроенный Apache `.htaccess` и новый machine-readable Stage2 exit-review с отчётом о границах/зависимостях и необходимых действиях. Комплект **465 файлов**. **Проверенный код:** [`f9bd4d25c`](https://github.com/manufact-test/ai-site-cms/commit/f9bd4d25c996a8504abcb2ac5a896d70ab853db8); [PHP7/7 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39174335647), [полный редактор/пакет 1/1 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39174335641). **Оценка Stage2 ≈85–90% выполнено, ≈10–15% осталось**, не приёмка и может измениться при реальном hosting. **Целевой Hostinger не проверяли даже read-only — запрещено без отдельного разрешения; архитектуру владелец ещё не утвердил для закрытия Stage2.** Production install, auth/admin/publish, полноценный backup и реальный Next SSR отсутствуют. [Актуальный подробный Stage2 exit report](STAGE-2-EXIT-REVIEW.md), [ADR0011](ADR/0011-stage2-exit-gate-and-host-handoff.md). Документы обновлены один раз **по прямой просьбе владельца при смене чата**; далее обычное «продолжаем» НЕ разрешает менять документы автоматически.

> **АКТУАЛЬНЫЙ ИНЖЕНЕРНЫЙ СРЕЗ v1.42 (18.10.2026; заменяет верхний v1.41):** Stage0+1 приняты, **Stage2 В РАБОТЕ/НЕ ПРИНЯТ**, Stage3 не начат, product acceptance **0/135**. Пять runtime-семейств сохранены. Новый **единый лабораторный операторский процесс** `PLAN (без записи) → approval token → CLI apply → выделенная SQLite test DB + закрытый binding → READY → явный re-plan после прерывания`; межсайтовая изоляция, блокировка конкурентов, PHP HTTP 404/503, исправлена side-effect SQLite preflight. **453 файла**, коммит `a4a211e6cb896e1145aa9dbe92423093c14fea48`, CI [PHP7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39162714187) и [editor1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39162714281) SUCCESS, unified E2E 150. НЕТ production deploy, реального Hostinger, полноценного website adapter/админки/backup. См. [ADR0010](ADR/0010-stage2-offline-operator-install-lifecycle.md) и **[ОБЯЗАТЕЛЬНЫЙ ПРОТОКОЛ БОЛЬШИХ ПАКЕТОВ](DEVELOPMENT-WORKFLOW.md) v1.42**. **ОДНО «продолжаем» ≠ одна маленькая задача; объединять несколько реальных подсистем, продолжать после первого успешного результата и проверять общим финальным CI.** Документы не обновлять без новой прямой просьбы владельца; данная фиксация разрешена владельцем в текущем чате.

> **АКТУАЛЬНАЯ ТОЧКА v1.41 (18.10.2026, ПЕРЕКРЫВАЕТ СТАРЫЕ v1.39):** Stage0+1 ПРИНЯТЫ, **Stage2 в работе/НЕ ПРИНЯТ**, Stage3 не начат. Новый `SiteRuntimeTopology` проверяет 5 вариантов размещения сайта (HTML/PHP/React SPA/Next Static/Next SSR), отдельную папку CMS и сайта, опасные public files и требования Node+proxy для SSR; только offline/read-only, без host deployment. Кода f16c6ca19ce840b6dd46bbec74459fa346393cf7, CI [PHP 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39157813640) и [editor 1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39157813797), 440 файлов. **0/135 product accepted**. [ADR0009](ADR/0009-stage2-site-runtime-topology.md), [подробности](STAGE-2-SITE-RUNTIME-TOPOLOGY.md), [правила работы](DEVELOPMENT-WORKFLOW.md). **Не обновлять документы между задачами: только по явному запросу владельца при переходе чата.** Работать крупными связанными пакетами + одна итоговая проверка.

> **АКТУАЛЬНЫЙ СТАТУС v1.39 (18.10.2026), исторические записи ниже не отменяют эту точку.** Этапы **0+1 приняты**; **этап 2 — в работе, НЕ принят**, этап 3 не начат. Выбраны **Slim 4 + Opis 2.6 + Jedison 1.27.1** (RJSF резерв). В `main` есть только внутреннее PHP/SQLite/MySQL/Ed25519 окружение: подписанный ZIP, безопасная распаковка, проверка полного состава PHP-пакета, временная установка, PHP-указатель поколений с блокировками и **единый CI-координатор подписанного релиза + заранее утверждённого отпечатка служебной БД**. Подтверждено [PHP+SQLite+MySQL 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39149669381) и [полная сборка 1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39149669508). **НЕТ реальной CMS-админки/авторизации/публикации, полной резервной копии контента и production installer**, Hostinger не проверяли. **0/135 обязательных требований принято**. Подробности: [v1.39 report](STAGE-2-UNIFIED-TRUSTED-UPGRADE.md), [ADR 0007](ADR/0007-stage2-unified-trusted-upgrade-lab.md), [NEXT-CHAT §44](NEXT-CHAT.md).

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

## v1.44 — согласованные дополнительные архитектурные принципы, 19.10.2026

**Ручные клиентские лицензии:** [ADR0012](ADR/0012-manual-client-licenses-and-project-handover.md). Будущая внутренняя панель MANUFACT хранит идентичность отдельной CMS, режим *бессрочно/подписка*, изменяемую дату напоминания, статус и аудит **ручных** приостановок/включений. Превышение даты = **напоминание**, НЕ отключение. Серверный gate на действия редактирования/публикации применяется только к выбранной CMS. Уже переданный публичный сайт и данные должны переживать паузу CMS и сбой центрального сервиса. До передачи агентство может обратимо вручную закрыть только **свою демонстрацию / договорный хостинг**, не чужой сервер, без удаления. Права приостановки проверяются по договору; PHP в полном распоряжении клиента не может гарантировать непреодолимую DRM-защиту. Подписанная поставка Ed25519 в Stage2 — проверка происхождения релиза, НЕ система лицензирования.

**Safe-by-default AI site:** [ADR0013](ADR/0013-ai-site-safe-defaults-and-reuse.md), [quality baseline](SITE-QUALITY-BASELINE.md). AI-генератор обязан вместе с дизайн-кодом/манифестом подключить проверенные capabilities и runtime handlers каждого реально используемого блока. Форма: client+server validation, phone country formatting, anti-bot/rate-limit/honeypot, фактическая доставка и честные ошибки; не готова без адресата/секретов (CONFIGURATION_REQUIRED). Меню/FAQ/popups/CTA/media — доступность, responsive, безопасное поведение. Переиспользовать только изученные upstream с закреплёнными лицензиями, поддержкой и security tests; общий контракт с адаптерами по HTML/PHP/React/Next; не заставлять обычный PHP-хостинг запускать Node. Не показывать пользователю настройки неиспользуемых функций.

Эти концепции **НЕ реализованы** в CI-only пустом ядре Stage2; план реализации Stage3–16 без изменения изначальных 18 этапов и 193 пунктов. Документ не закрывает критерий проверки целевого хостинга и не разрешает Stage3 до приёмки Stage2.

## Target-specific compatibility note, v1.46 — 20.10.2026

Фактическая web-среда тестового Hostinger — **LiteSpeed LSAPI**, не Apache/Nginx+PHP-FPM, прошедшие CI. Наблюдение само по себе не означает несовместимости Slim: нужно протестировать маршрутизацию, front-controller, права на non-public файлы, restart/update и разделение сайтов. Реальный target PHP `sodium=false` при `openssl=true`: нельзя обещать Ed25519 PHP-side verification текущего механизма signed laboratory upgrades до активации Sodium или independently verified альтернативного механизма **с тем же уровнем безопасности**. Git auto-deploy с двумя публичными файлами доказан, но не равен приватному install process. Отдельная MySQL есть только по сообщению владельца, соединения не проверяли. [Конкретные наблюдения](docs/STAGE-2-HOSTINGER-REAL-PREFLIGHT-v1.46.md). Всё ещё Stage2 NOT ACCEPTED.


## v1.47 — наблюдаемая LiteSpeed boundary, без смены архитектуры

У CMS test document root фактически `public_html`; приложение поставлено вручную отдельным unsigned offweb каталогом `cms-stage2-offweb-runtime`. Публичная двухфайловая host-probe ветка не содержит vendor/редактор/исходники; она хеширует полный manifest до какого-либо `require`, а `/__stage2/kernel/smoke` только синтетически обращается к `AiSiteCms\HttpKernel::create()` (GET health). На реальном Hostinger LiteSpeed PHP8.3 это 200, visitor 200, публичный `/api/health` по-прежнему 503. **Принцип доверия:** unsigned SHA256 не production signature; PHP sodium отсутствует; PHP-FPM laboratory != full LiteSpeed lifecycle. Следующий слой архитектуры — scoped MySQL connection + installer/owner proof и signed release review. Stage2 не принят; [полный отчёт](STAGE-2-HOSTINGER-LIVE-KERNEL-v1.47.md).
