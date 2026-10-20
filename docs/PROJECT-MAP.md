> **CHECKPOINT v1.47 / 20.10.2026 (owner-requested):** [LATEST NEXT-CHAT §52](NEXT-CHAT.md), [real Hostinger r6 kernel report](STAGE-2-HOSTINGER-LIVE-KERNEL-v1.47.md). [Source](https://github.com/manufact-test/ai-site-cms/commit/da6e646f6d36d91e8a7b33b33e31a0c10605e856), [PHP7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638513), [Editor1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638339), [live GET14/14](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638427). Unsigned offweb CMS 473 files and LiteSpeed real Slim4 read-only health verified; *full CMS MySQL installation/auth/publish NOT done*. Stage2 NOT ACCEPTED, Stage3 NOT STARTED, 0/135. Older v1.43–v1.46 checkpoint banners below are historical.

> **v1.45 / 19.10.2026 (АКТУАЛЬНЫЙ CHECKPOINT):** Stage0+1 приняты; Stage2 инженерно ~85–90%, но формально НЕ принят; Stage3 НЕ начат; 0/135 продуктовое принятие. Последний проверенный КОД 493964f32d63dd5552484afbcc972fc614571381 — [PHP 7/7 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39275005275), [редактор + пакет 1/1 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39275005280). Внутренний пакет 471 файл, 43 зависимости; CI-only двухсайтовый Nginx/3 PHP-FPM/MySQL8.4 и recovery; 7 файлов owner/legal handoff, 8 открытых человеческих решений. Реальный Hostinger НЕ проверяли; разрешения read-only / install / outage только по отдельному запросу. ADR0012/0013 (ручные лицензии, safe AI blocks и reuse) — УТВЕРЖДЁННЫЕ БУДУЩИЕ требования, не реализация. Исторические v1.44 и ранее не являются текущим SHA. Подробнее: [NEXT-CHAT §50](NEXT-CHAT.md), [полный v1.45 handoff](STAGE-2-FINAL-HANDOFF-v1.45.md). Документ обновлён по прямой просьбе; при обычном 'продолжаем' документы не трогать.

> **АКТУАЛЬНАЯ ПЕРЕДАЧА v1.44 (19.10.2026):** согласованы ручные лицензии MANUFACT, обратимое закрытие только собственного неоплаченного preview, безопасные AI-блоки и исследование open-source. Это пока ДОКУМЕНТЫ, не код. Stage2 НЕ принят, Stage3 не начат, 0/135; код 1b1f154702bc618242f7769524e769a2b1486932, PHP7/7 + editor1/1 PASS; 469 файлов. Подробности в LAST §49 docs/NEXT-CHAT.md, ADR0012/ADR0013/SITE-QUALITY-BASELINE.

### Навигация v1.44

Сначала [последний §49 NEXT-CHAT](NEXT-CHAT.md) и [DEVELOPMENT-WORKFLOW](DEVELOPMENT-WORKFLOW.md); далее [PROJECT-STATUS](../PROJECT-STATUS.json), Master ТЗ, Roadmap, Architecture, [ADR0012](ADR/0012-manual-client-licenses-and-project-handover.md), [ADR0013](ADR/0013-ai-site-safe-defaults-and-reuse.md), [baseline](SITE-QUALITY-BASELINE.md). Все новые решения согласованы только для будущей реализации и распределены по существующим 18 этапам. Оригинальные 193 требования/135/42/16 не изменялись. Hostinger/CELIKOM/клиентские проекты не трогать. Обязательно сверить свежий GitHub HEAD, а не старые статусы в исторической части карты.

> **АКТУАЛЬНЫЙ СТАТУС v1.39 (18.10.2026), исторические записи ниже не отменяют эту точку.** Этапы **0+1 приняты**; **этап 2 — в работе, НЕ принят**, этап 3 не начат. Выбраны **Slim 4 + Opis 2.6 + Jedison 1.27.1** (RJSF резерв). В `main` есть только внутреннее PHP/SQLite/MySQL/Ed25519 окружение: подписанный ZIP, безопасная распаковка, проверка полного состава PHP-пакета, временная установка, PHP-указатель поколений с блокировками и **единый CI-координатор подписанного релиза + заранее утверждённого отпечатка служебной БД**. Подтверждено [PHP+SQLite+MySQL 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39149669381) и [полная сборка 1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39149669508). **НЕТ реальной CMS-админки/авторизации/публикации, полной резервной копии контента и production installer**, Hostinger не проверяли. **0/135 обязательных требований принято**. Подробности: [v1.39 report](STAGE-2-UNIFIED-TRUSTED-UPGRADE.md), [ADR 0007](ADR/0007-stage2-unified-trusted-upgrade-lab.md), [NEXT-CHAT §44](NEXT-CHAT.md).

> **АКТУАЛЬНО v1.36, 18.10.2026: исторический статус ниже не является действующим.** Этапы0/1 приняты, этап2 идёт **НЕ ПРИНЯТ**, этап3 не начат. В main есть read-only PHP+PDO migrations/CLI preflight, приватный pinned Jedison, internal 425-file bundle и **тестовый foundation-only export/restore в отдельную пустую БД** ([7/7 CI](https://github.com/manufact-test/ai-site-cms/actions/runs/39134298097), MySQL13+SQLite47). Это НЕ полноценный CMS backup, не админка, Hostinger не проверяли; **0/135 PRODUCT accepted**. Актуально: [NEXT-CHAT §41](NEXT-CHAT.md), [restore report](STAGE-2-FOUNDATION-RESTORE.md), [ADR0004](ADR/0004-foundation-backup-restore.md).

> **Актуальный статус v1.31:** Stage1 исследование принято 18.10.2026 — пользователь делегировал выбор технологии, ассистент выбрал A (Jedison/Slim/Opis), B RJSF резерв. Этап2 начат (не принят), Stage3 не начат. Старый ниже чек-лист описывает исходную подготовку **до** делегирования; оставшиеся реальные hosting/second-LLM/security риски перенесены на соответствующие этапы. Никаких продуктовых требований не принято (0/135). [ADR](ADR/0001-selected-foundation.md), [Stage2 CI](https://github.com/manufact-test/ai-site-cms/actions/runs/39125215551).

# AI Site CMS — карта проекта и инструкция для нового чата (v1.2)

**Дата:** 17.10.2026  
**Проект:** **AI Site CMS** (без MFT, MANUFACT и CELIKOM в названии).  
**Репозиторий:** https://github.com/manufact-test/ai-site-cms  
**Тип:** private · **основная ветка:** main.  
**Текущее состояние:** полный план 0–17 **утверждён 17.10.2026**; этап 0 (документы и план) принят; этап 1 (исследование open-source основ) **в работе, ещё не принят**. **Исходного кода CMS нет.**

## 1. Главное разграничение

Это **самостоятельная AI-first CMS**, а не часть CELIKOM. Репозиторий CELIKOM: https://github.com/manufact-test/nomusic — другой проект, его код/сайт/хостинг/админку не изменять из AI Site CMS без отдельного разрешения.

**Наша CMS не конструктор страниц.** ИИ верстает любые уникальные страницы и создаёт к ним machine-readable manifest. Администратор открывает отдельный блок и изменяет зарегистрированные свойства в визуальном редакторе; изменения переживают обновления и версионируются.

**Стратегия релиза:** ни урезанной MVP, ни ранних установок на существующие сайты. 135 обязательных из 193 пользовательских требований — к первой полной версии, 42 желательных, 16 «не нужно». Внутренние этапы и промежуточные тестовые сборки не являются самостоятельными релизами.

**ChatGPT-проект / «отдельная папка» пользователя** существует в интерфейсе ChatGPT, а не в GitHub. Его внутреннее имя/идентификатор и содержимое здесь недоступны, поэтому не следует утверждать, что файлы там уже прикреплены. Перед началом новой беседы необходимо открыть GitHub-репозиторий и прочитать документы (при необходимости пользователь подключает GitHub к новому ChatGPT-проекту).

## 2. Карта существующих файлов GitHub

Пути ниже указаны **от корня** репозитория manufact-test/ai-site-cms в ветке main.

| Путь | Что читать / когда обновлять |
|---|---|
| README.md | Короткое описание продукта, ссылки на документы, правила и границы |
| PROJECT-STATUS.json | Машинный статус проекта: активный этап, следующий шаг, отсутствие/наличие кода |
| docs/MASTER-TZ.md | **Главный нормативный документ** AI Site CMS; scope, обязательства, инженерные инварианты и приёмка |
| docs/REQUIREMENTS.md | Весь первичный опрос: **193 требований** и их приоритеты; не менять без владельца |
| requirements/requirements.csv | Машинный список 1–193 для матрицы покрытия и тестирования |
| requirements/CMS_REQUIREMENTS_REGISTER_v0.1.xlsx | Табличный оригинал обсуждённого опроса |
| docs/ROADMAP.md | **Подробный план 0–17**, задачи/результаты/приёмка каждого этапа, правила выполнения |
| docs/PROJECT-MAP.md | **Этот файл:** пути и порядок чтения, перенос в новый ChatGPT-проект |
| docs/NEXT-CHAT.md | **Единственный постоянный файл передачи контекста**: при каждой просьбе «обнови файл для следующего чата» перезаписывается по фактам GitHub, содержит активный этап, результаты, решения, ошибки и следующий шаг; ссылка всегда та же |
| docs/FOUNDATIONS.md | Актуальный shortlist open-source кандидатов, **не утверждённый выбор** |
| docs/STAGE-1-TEST-LOG.md | **Этап 1:** результаты локальных исследовательских проверок, ограничения, новые кандидаты и недоказанные пункты |
| docs/FOUNDATION-COMPARISON.md | **Этап 1 в работе:** матрица 135 обязательных ID, источники, проверка исходников, сравнение модулей, протокол предстоящих испытаний |
| docs/ARCHITECTURE.md | Архитектурные варианты, инварианты, shared-hosting и адаптеры разных сайтов |
| docs/AI-SITE-CONTRACT.md | Контракт ИИ-разработчика и CMS: манифесты, ID, свойства, совместимость |
| docs/OPEN-QUESTIONS.md | 14 известных архитектурных вопросов/зависимостей; по мере работы отмечать решения |
| docs/ACCEPTANCE.md | Условия проверки всего обязательного объёма перед полноценным релизом |

### Папки, которые будут созданы ТОЛЬКО во время разработки

Предполагаемые, **не считать их уже существующими** до подтверждения GitHub:
- cms/ или packages/ — движок и редактор, структура определяется на этапе 2;
- adapters/ — интеграции HTML/PHP/React/Next, структура утверждается архитектурой;
- schemas/ или sdk/ — манифест и валидаторы AI-контракта;
- examples/ — изолированные эталонные сайты, не CELIKOM;
- tests/ — unit, integration, E2E, security, migration и performance;
- docs/ADR/ — записи о принятых архитектурных решениях.

Не создавать «красивое дерево папок» заранее без выбранной технологии. Сначала этап 1, затем выбор основы/архитектуры этапа 2.

## 3. Куда переходить при работе в другой папке ChatGPT

В новом ChatGPT-проекте владелец может вставить:

> Продолжаем самостоятельный проект **AI Site CMS**. GitHub: https://github.com/manufact-test/ai-site-cms, приватный, рабочая ветка main. Прежде чем что-либо менять, прочитай README.md, PROJECT-STATUS.json, docs/NEXT-CHAT.md, docs/MASTER-TZ.md, docs/ROADMAP.md, docs/PROJECT-MAP.md, docs/REQUIREMENTS.md, docs/OPEN-QUESTIONS.md, docs/FOUNDATIONS.md, docs/ARCHITECTURE.md и docs/AI-SITE-CONTRACT.md. Наш опрос завершён: 193 требования, из них 135 обязательных, 42 желательных, 16 не нужны. Это CMS для ИИ-сайтов, не конструктор. Никакого MVP: первая полноценная версия только после выполнения 135/135 и приёмки. Пока кода нет. Начни с проверки актуального состояния GitHub: **план 18 этапов уже утверждён 17.10.2026**, этап 0 принят, этап 1 — анализ готовых open-source основ — начат и продолжается, но не принят; матрица в docs/FOUNDATION-COMPARISON.md. После каждого принятого этапа обновляй GitHub-документацию и checkpoint.

**Порядок первого чтения:**
1. README.md и PROJECT-STATUS.json — что это за проект и какая реальная стадия.
2. docs/NEXT-CHAT.md и docs/ROADMAP.md — чем продолжать и что планируется.
3. docs/MASTER-TZ.md, docs/REQUIREMENTS.md и requirements/requirements.csv — точная продуктовая спецификация.
4. docs/OPEN-QUESTIONS.md, docs/ARCHITECTURE.md, docs/AI-SITE-CONTRACT.md — границы решений и технические варианты.
5. docs/FOUNDATIONS.md, docs/FOUNDATION-COMPARISON.md, docs/ACCEPTANCE.md — текущее исследование и критерии полного релиза.
6. Перед записью проверить последние коммиты и фактические файлы, а не доверять только прежнему сообщению ассистента.

## 4. Правила управления изменениями и handoff

- В этом репозитории **только AI Site CMS**. Другие проекты не переносить.
- На каждом этапе: обоснование → план → код/документ → тест → проверка владельца → статус принят или доработка.
- В ответах сохранять номера требований 1–193 и их приоритеты. Никаких незаметных понижений «Обязательно».
- При обновлении кода/манифеста схема должна сохранить ручные пользовательские значения. Миграции, версионирование и rollback — не откладывать на неопределённый момент.
- Результат реального теста и согласование владельца обязательны для утверждения готовности, не достаточно только написанного кода.
- **Постоянный файл перехода:** `docs/NEXT-CHAT.md` (https://github.com/manufact-test/ai-site-cms/blob/main/docs/NEXT-CHAT.md). При фразах «обнови файл», «заканчиваем чат», «переходим в другой чат» ассистент сначала **прочитывает этот файл из GitHub** и фактические изменения, обновляет **этот же путь** (не создаёт конкурирующие копии с другими именами), синхронизирует `PROJECT-STATUS.json` и затронутые документы, проверяет успешность записи и возвращает **постоянную GitHub-ссылку + свежую локальную .md-копию для прикрепления**, если файл можно создать. Никогда не писать «обновлено», пока не подтверждена запись.
- При смене чата/папки всегда синхронизировать README (когда меняется scope), ROADMAP, NEXT-CHAT, PROJECT-STATUS и связанные документы, сохраняя историю решений.
- Не публиковать ключи, пароли, токены, приватные адреса/БД в Markdown и коммитах.
- Не обещать автоматическую поддержку Next.js SSR на PHP-only shared hosting: CMS работает на общем хостинге, для сайта с SSR может требоваться отдельная среда.
- **Сайт CELIKOM:** отдельное разрешение на тестовую интеграцию возможно лишь после полной приёмки CMS и безопасного бэкапа. Его сайт и небольшая админка продолжаются независимо.

## 5. Следующее конкретное действие

**Этап 0 принят владельцем 17.10.2026**. Текущий — **этап 1 (в работе, не принят)**: продолжить анализ актуальных технических данных о кандидатах из docs/FOUNDATIONS.md и новых релевантных библиотеках, сравнить их по реальным потребностям, лицензиям, инсталляции на обычном хостинге и влиянию на 135 обязательных требований; предложить лучший путь с аргументацией. Ни копирования сторонних исходников, ни выбора фреймворка «по привычке» до этого.


## Контрольная точка v1.11 — 17.10.2026

Последний подтверждённый PASS этапа 1: [GitHub Actions #39059714864](https://github.com/manufact-test/ai-site-cms/actions/runs/39059714864). Исследовательская ветка [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison). Новый research-only эксперимент — PHP CLI publish с Opis 2.6.0/предвалидацией, current + last-known-good + сохранёнными ревизиями, отказом 7 плохих входных данных, явным rollback и 4 одновременными writers. HTTP текущего PHP Hero переходит на валидный резерв при порче current (200), при порче обоих (503). Это выполнено на CI PHP 8.3.6, **НЕ текущий Hostinger**. Исследование зафиксировано в [STAGE-1-SNAPSHOT-PUBLISH-RESEARCH.md](STAGE-1-SNAPSHOT-PUBLISH-RESEARCH.md), журнале [STAGE-1-TEST-LOG.md §14](STAGE-1-TEST-LOG.md) и постоянном handoff [NEXT-CHAT.md](NEXT-CHAT.md).

**Статусы не менять:** 0 принят, 1 исследуется и НЕ принят, 2 не начат. CMS/технология не выбраны. Нельзя вливать код research в main. Первый релиз только 135/135 обязательных, нет MVP, CELIKOM отдельно только после полного выпуска этапа 16 как пилот на этапе 17. Продолжение см. в том же docs/NEXT-CHAT.md v1.11.


**Исследовательский технический чеклист checkpoint v1.12:** `docs/STAGE-1-HOSTING-SMOKE-PLAN.md` — безопасная последовательность проверки текущего PHP shared-hosting (пока только план). Фактические результаты многоэлементных HTML/PHP/React/Next-static адаптеров и RJSF — `docs/STAGE-1-TEST-LOG.md §15`, выводы — `docs/FOUNDATION-COMPARISON.md §12`. Постоянный файл передачи **по-прежнему один** — `docs/NEXT-CHAT.md`, никаких конкурирующих handoff документов.

**Исследование — контрольная точка v1.13:** `research/stage1/srcdoc-bootstrap.cjs` — независимая браузерная проверка родного `srcdoc` с правильным и неправильным CSP nonce. `research/stage1/complex-adapters.cjs` — исправленный многоэлементный HTML/PHP/React/Next-static regression с нативным iframe bootstrap и обязательной проверкой завершённости HTML-фрагмента. CI [#39064252770](https://github.com/manufact-test/ai-site-cms/actions/runs/39064252770) PASS. Официальные сведения — `docs/STAGE-1-TEST-LOG.md §16` и `docs/NEXT-CHAT.md §18`; новый самостоятельный handoff не создавался.


**Контрольная точка v1.14:** новый исследовательский файл `research/stage1/matched-editor-session.cjs` (только `research/stage1-editor-comparison`), документация с проверенными числами `docs/STAGE-1-MATCHED-EDITOR-SESSIONS.md` (main), регрессии `docs/STAGE-1-TEST-LOG.md §17`, анализ `docs/FOUNDATION-COMPARISON.md §14`. Успешный полный CI: [#39065084450](https://github.com/manufact-test/ai-site-cms/actions/runs/39065084450). Постоянный handoff остаётся один — `docs/NEXT-CHAT.md`.


**Checkpoint v1.15:** `research/stage1/matched-custom-media.cjs` (исследовательская ветка) — одинаковые собственные составные UI-контролы Jedison/RJSF с typed iframe preview и **локальными media-заглушками**. [CI #39066085194](https://github.com/manufact-test/ai-site-cms/actions/runs/39066085194) PASS; объяснение, ограничения и воспроизведение — новый документ [STAGE-1-COMPOSITE-MEDIA-RESEARCH.md](STAGE-1-COMPOSITE-MEDIA-RESEARCH.md), журнал `STAGE-1-TEST-LOG.md §18`, сравнение `FOUNDATION-COMPARISON.md §15`, тот же единственный `NEXT-CHAT.md §20`. No production CMS.


**Checkpoint v1.16 (17.10.2026):** `research/stage1/html-boundary-adversarial.cjs` и pinned `parse5 8.0.0` — исключительно `research/stage1-editor-comparison`; CI [#39067271214](https://github.com/manufact-test/ai-site-cms/actions/runs/39067271214) полный PASS, 20 adversarial fragment rejects плюс native opaque iframe HTTP origin/nonce/rogue sender negative controls. Основная ветка **main** обновлена [STAGE-1-HTML-BOUNDARY-RESEARCH.md](STAGE-1-HTML-BOUNDARY-RESEARCH.md), [STAGE-1-MANDATORY-EVIDENCE-MATRIX.md](STAGE-1-MANDATORY-EVIDENCE-MATRIX.md) с оригинальными 135 ID/43 mapped/92 no test/0 accepted, `STAGE-1-TEST-LOG.md §19`, `FOUNDATION-COMPARISON.md §16`, статус и единственный handoff `NEXT-CHAT.md §21`. Без merge исследовательского runtime в main.

## v1.46 live Hostinger Stage2 evidence and safe deploy-only branch

New authoritative target report: [STAGE-2-HOSTINGER-REAL-PREFLIGHT-v1.46.md](docs/STAGE-2-HOSTINGER-REAL-PREFLIGHT-v1.46.md). Runtime read-only probe in `cms/hosting/hostinger-readonly/`; observer in `cms/tools/stage2-hostinger-target-observer.cjs`, offline parser tests and dedicated GitHub Actions. The **only** web-deployed Git branch is `stage2-hostinger-cms-preflight` (two files), never `main`. Current canonical handoff: LAST §51 in `docs/NEXT-CHAT.md`; older references to §50 are historical.


## v1.47 status correction

**v1.47:** Stage2 runtime experimental thread is now real: GitHub public source -> disposable CI full editor+Composer bundle 473 files -> owner's Hostinger CMS offweb folder -> bounded full hash inventory -> real LiteSpeed read-only Slim4 synthetic GET health 200 -> independent visitor GET 200. Still NO target MySQL schema, production admin, real publish, backup/restore, legal 43 deps or owner Stage2 acceptance. This evidence does not implement any of 135 mandatory product criteria. Next focus: safe isolated MySQL install + lifecycle check, without shared SSH.
