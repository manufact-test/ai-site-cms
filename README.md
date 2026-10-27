> **SOURCE OF TRUTH 27.10.2026 — PRODUCT RESET:** [MASTER ТЗ v2.0](docs/MASTER-TZ.md), [план](docs/ROADMAP.md), [первичный code audit](docs/CODE-SCOPE-AUDIT-2026-10-27.md), [lead handoff](handoffs/lead-integrator/MAIN-HANDOFF-v2.0-2026-10-27.md). Проект — внешнее AI-проектирование трёх *статичных* макетов + объяснение клиенту/внутренняя спецификация → согласование → точная разработка настоящего сайта → лёгкое редактирование в CMS. Старые Design Factory 12/42 и новое задание про 3 демонстрационных сайта отменены, НЕ merge. Исторические инструкции ниже не обладают приоритетом.

> **АКТУАЛЬНО · 26.10.2026 · LEAD HANDOFF v1.70 · ГЛАВНАЯ CMS.** Ветка `feature/stage3-ai-site-contract`, функциональный HEAD [`f366592db026`](https://github.com/manufact-test/ai-site-cms/commit/f366592db0267faaabfd5b01e7aa6f4f87e02ef4). **CI последнего функционального SHA: проверять по [Actions #40374870144](https://github.com/manufact-test/ai-site-cms/actions/runs/40374870144); на момент подготовки передачи RUNNING, не считать SUCCESS без завершения.** Последний подтверждённый зелёный функциональный чекпойнт [`ac483807cc2f`](https://github.com/manufact-test/ai-site-cms/commit/ac483807cc2f2ac302f6fed3470cac4cfb795896), [CI #40346327511 — SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40346327511). Последний блок: редактор всей страницы, типизированные элементы Design Graph — создание/копирование/удаление из холста, Undo/Redo, адаптивные настройки, PHP draft-preview. **Это главный разработчик; Design Factory существует отдельно** на `feature/stage3-design-factory`, `stage3/design-factory/**` НЕ изменять. Stage2 технич. 85–90%, **NO-GO #5–#9**; Stage3 изолирован, **0/135 официально принятых**; никаких live/deploy/merge. [Handoff v1.70](handoffs/lead-integrator/MAIN-HANDOFF-v1.70-2026-10-26.md).

> **АКТУАЛЬНО · 25.10.2026 · v1.68 · PRIVATE INBOX + HANDOFF.** Последний проверенный функциональный SHA [`70a6a4776b03`](https://github.com/manufact-test/ai-site-cms/commit/70a6a4776b0389fd5a35830226952a0372cccd65), [полный CI #40234189046 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40234189046). Реализованы поиск/фильтрация/страницы/счётчики заявок, массовая атомарная обработка 1–50, приватный CSV до 1000 и устранено залипание кнопки уведомлений. Параллельный v1.67 SEO/a11y граф→исправление и live SEO/social previews сохранены ([CI #40233695097 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40233695097)). Старые предупреждения v1.67 о FAIL `8db3d32` ниже исторические: более новый функциональный `70a6a4776b03` успешно прошёл весь CI. Документационный HEAD после этого SHA проверять отдельно. **Ускоренная программа:** одно «продолжаем» = один большой сквозной функциональный блок; полный CI + минимальные критические проверки. Stage2 NO-GO #5–#9, Stage3 не принят, 0/135. Не трогать `main`, Hostinger, production, реальную БД и независимую Factory. [Handoff v1.68](handoffs/lead-integrator/MAIN-HANDOFF-v1.68-2026-10-25.md).

> **АКТУАЛЬНО · 25.10.2026 · v1.67 · QUALITY → GRAPH REMEDIATION + HANDOFF.** Проверенный функциональный SHA [`0eeff2e9cd77`](https://github.com/manufact-test/ai-site-cms/commit/0eeff2e9cd77b29e3426c52393b03e583a5e672a) — [полный Stage3 CI #40233695097 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40233695097): SEO/a11y-аудит теперь открывает точный узел композиции, показывает текущий статус замечания и повторно запускает проверку после применения в черновик; предыдущий [SEO/social preview #40225894128 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40225894128). **Осторожно:** в той же ветке позже появился самостоятельный функциональный коммит [`8db3d32e1ed7`](https://github.com/manufact-test/ai-site-cms/commit/8db3d32e1ed7f087445c507c76c13e8165ebe8c3) по private lead inbox; его [CI #40233889710 FAILED](https://github.com/manufact-test/ai-site-cms/actions/runs/40233889710) на hosted notification test (disabled #server-notifications-seen). Этот более новый SHA **НЕ считать проверенным**; прежде чем продолжать, проверь актуальный HEAD и CI, исправь только блокирующий сквозной регресс без циклов ненужных тестов. Stage2 NO-GO #5–#9, Stage3 не принят, 0/135; основная ветка и реальные хостинги не затронуты. [Главная передача v1.67](handoffs/lead-integrator/MAIN-HANDOFF-v1.67-2026-10-25.md).

> **АКТУАЛЬНО · 25.10.2026 · v1.66 · УСКОРЕННАЯ ПРОГРАММА.** Ветка `feature/stage3-ai-site-contract`, проверенный функциональный код `97811cecc2946ed1daf52d0e4ed9fcf3b360c221`, [полный CI SUCCESS #40205358049](https://github.com/manufact-test/ai-site-cms/actions/runs/40205358049). Последний функциональный блок — безопасное восстановление pending Email/Telegram заявок через явно разрешённый CLI worker; зависшие отправки переводятся в `uncertain` и не повторяются автоматически. Предыдущий документационный HEAD `90333fc0aca9c3cfa66daa18067812cf141d2ba8` прошёл [CI #40212155888 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40212155888); текущий docs-only handoff имеет отдельный CI, который нужно проверять по актуальному HEAD. Stage0–1 приняты; Stage2 формально NO-GO #5–#9; Stage3 изолирован и не принят, 0/135 официально. **Одно «продолжаем» = один большой сквозной функциональный блок; существующий full CI + только необходимые проверки.** Реальные хост/БД/production/main merge запрещены без отдельного разрешения. [Каноническая передача](handoffs/lead-integrator/MAIN-HANDOFF-v1.66-2026-10-25.md), [NEXT-CHAT](docs/NEXT-CHAT.md). Старые записи ниже исторические.


> **23.10.2026 · v1.55 · УСКОРЕННАЯ ПРОГРАММА.** Один запрос «продолжаем» — большой законченный сквозной блок, один необходимый smoke + существующий CI. Сначала завершить настоящую CMS, затем исправлять по реальному использованию, а не бесконечно расширять offline демо/тесты. Stage2 2/18, технически ≈85–90%, формально НЕ ПРИНЯТ; Stage3 не начат, 0/135 официально. [Новый handoff](handoffs/lead-integrator/MAIN-HANDOFF-v1.55-2026-10-23.md), [пять внешних gate](docs/STAGE-2-ACCELERATED-EXIT-BOARD.md).

> **АКТУАЛЬНО v1.49 / 21.10.2026, owner-requested handoff.** Проверенный source [`b3237fc2426ad246178b3fd4b64501c6b22c86ba`](https://github.com/manufact-test/ai-site-cms/commit/b3237fc2426ad246178b3fd4b64501c6b22c86ba); [PHP 8/8](https://github.com/manufact-test/ai-site-cms/actions/runs/39623780590), [Editor/E2E](https://github.com/manufact-test/ai-site-cms/actions/runs/39623780667), [offweb **479/479**](https://github.com/manufact-test/ai-site-cms/actions/runs/39624303691). [Каноническая передача v1.49](handoffs/lead-integrator/MAIN-HANDOFF-v1.49-2026-10-21.md), [NEXT-CHAT §54](docs/NEXT-CHAT.md). Stage2 НЕ ПРИНЯТ, Stage3 НЕ НАЧАТ, 0/135, Hostinger неизменен; v1.48 и прежние checkpoint ниже — история. Последующий docs SHA не является source CI SHA.

> **АКТУАЛЬНО v1.48 / 21.10.2026, по просьбе владельца:** проверенный КОД [`8b59e0718a867920bd5d7890e55c5b002facd354`](https://github.com/manufact-test/ai-site-cms/commit/8b59e0718a867920bd5d7890e55c5b002facd354), [PHP 8/8 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39587975849), [Editor/Chromium/E2E SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39587976040), [offweb 478/478 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39588269636). Новый полный [handoff](./handoffs/lead-integrator/MAIN-HANDOFF-v1.48-2026-10-21.md), `docs/NEXT-CHAT.md` последний §53. **Stage2 НЕ ПРИНЯТ, Stage3 НЕ НАЧАТ, 0/135.** Hostinger после предыдущего r6 не менялся; предыдущие checkpoint ниже исторические.

> **CHECKPOINT v1.47 / 20.10.2026 (owner-requested):** [LATEST NEXT-CHAT §52](docs/NEXT-CHAT.md), [real Hostinger r6 kernel report](docs/STAGE-2-HOSTINGER-LIVE-KERNEL-v1.47.md). [Source](https://github.com/manufact-test/ai-site-cms/commit/da6e646f6d36d91e8a7b33b33e31a0c10605e856), [PHP7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638513), [Editor1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638339), [live GET14/14](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638427). Unsigned offweb CMS 473 files and LiteSpeed real Slim4 read-only health verified; *full CMS MySQL installation/auth/publish NOT done*. Stage2 NOT ACCEPTED, Stage3 NOT STARTED, 0/135. Older v1.43–v1.46 checkpoint banners below are historical.

> **АКТУАЛЬНАЯ ПЕРЕДАЧА v1.45 (19.10.2026), по прямой просьбе владельца:** Stage0 и 1 приняты; Stage2 НЕ принят; Stage3 НЕ начат; 0/135 продуктовых функций. Последний проверенный КОД 493964f32d63dd5552484afbcc972fc614571381; PHP 7/7: https://github.com/manufact-test/ai-site-cms/actions/runs/39275005275; editor/package 1/1: https://github.com/manufact-test/ai-site-cms/actions/runs/39275005280. Внутренний CI-only пакет 471 файл, 43 pinned зависимости; реальные в disposable CI Nginx + три PHP-FPM + две MySQL8.4 CMS + независимые сайты, восстановление; семь проверяемых offline-файлов передачи и восемь открытых ручных решений. Ни Hostinger, ни реальные сайты не проверялись. Ручные лицензии и safe AI-блоки (ADR0012/0013) — будущие требования, НЕ готовые функции. Актуально: docs/NEXT-CHAT.md §50 и docs/STAGE-2-FINAL-HANDOFF-v1.45.md; прежние checkpoints ниже исторические.

> **АКТУАЛЬНАЯ ПЕРЕДАЧА v1.44 (19.10.2026):** согласованы ручные лицензии MANUFACT, обратимое закрытие только собственного неоплаченного preview, безопасные AI-блоки и исследование open-source. Это пока ДОКУМЕНТЫ, не код. Stage2 НЕ принят, Stage3 не начат, 0/135; код 1b1f154702bc618242f7769524e769a2b1486932, PHP7/7 + editor1/1 PASS; 469 файлов. Подробности в LAST §49 docs/NEXT-CHAT.md, ADR0012/ADR0013/SITE-QUALITY-BASELINE.

[Новые ручные лицензии](docs/ADR/0012-manual-client-licenses-and-project-handover.md) · [AI safe defaults и reuse](docs/ADR/0013-ai-site-safe-defaults-and-reuse.md) · [Стандарт готовности сайтов](docs/SITE-QUALITY-BASELINE.md) · [Последний checkpoint](docs/NEXT-CHAT.md).

# AI Site CMS — документация проекта

> **Название:** AI Site CMS · **репозиторий:** `manufact-test/ai-site-cms` (`main`, private)  
> **Текущий статус v1.39 (18.10.2026):** этапы 0/1 приняты; **этап 2 в работе, НЕ принят**, этап 3 не начат. В `cms/` есть read-only PHP, тестовые SQLite/MySQL, pinned Jedison и полный внутренний 429-file bundle, Ed25519 signed offline ZIP, безопасная распаковка, PHP slot switching и единый CI-only coordinator с независимым отпечатком служебной базы. **НЕ готовая CMS, НЕ production installer/деплой**: нет админки, auth, публикаций, full-site backup. Hostinger не проверен, **0/135 обязательных продуктовых требований принято**.

[Текущий handoff v1.39](docs/NEXT-CHAT.md) · [Отчёт signed upgrade/DB](docs/STAGE-2-UNIFIED-TRUSTED-UPGRADE.md) · [ADR 0007](docs/ADR/0007-stage2-unified-trusted-upgrade-lab.md) · [PHP CI 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39149669381) · [Полный bundle CI 1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39149669508) · **0/135 продуктовых требований принято; нет MVP, Hostinger не проверен.**

## Что создаём

Отдельную **CMS для сайтов, которые создаются ИИ по нашему контракту**. Это **не** визуальный конструктор страниц, не замена Elementor для ручной вёрстки. ИИ разрабатывает любую согласованную вёрстку/секции, одновременно регистрируя стабильные идентификаторы, использованные на сайте параметры, начальные значения и безопасные правила редактирования. Владелец позднее исправляет текст, геометрию, адаптив, эффекты и поведение через изолированный редактор конкретного блока.

### Основные границы

- Один **самостоятельный GitHub-репозиторий** и независимые установки CMS по одному на сайт.
- Работа на обычном виртуальном хостинге — обязательна. Поддержка HTML/CSS/JS, PHP и React/Next.js — обязательна; ограничения хостинга отдельно оговорены в архитектуре.
- Новые страницы и сложные секции создаёт ИИ, **не** редактор CMS.
- Только реально используемые параметры становятся видимыми в панели конкретного сайта.
- Прежде чем публично применить CMS к CELIKOM, **полностью** реализовать и проверить весь обязательный набор. CELIKOM — будущий первый реальный пилот, не исходный код данного репозитория.
- **Не делаем MVP** и не объявляем частичную сборку готовым продуктом. Внутренние этапы разработки и тестирования допустимы.
- WordPress, универсальная интеграция в уже готовый сайт, произвольное редактирование CSS, ручная сборка страниц внутри CMS — **не входят**.

## Документация

| Файл | Назначение |
|---|---|
| `PROJECT-STATUS.json` | Машиночитаемый статус, дата, ближайший шаг, без секретов |
| `docs/MASTER-TZ.md` | Главный документ: продуктовые рамки, функции, полный релиз, критерии приёмки |
| `docs/REQUIREMENTS.md` | **Все 193 ответа**, сохранённые буквально по смыслу и приоритетам |
| `requirements/requirements.csv` | Машиночитаемая таблица требований, номера 1–193 |
| `requirements/CMS_REQUIREMENTS_REGISTER_v0.1.xlsx` | Первичный Excel со сводкой и пользовательскими решениями |
| `docs/ARCHITECTURE.md` | Варианты архитектуры, ограничения технологий и проектные инварианты |
| `docs/AI-SITE-CONTRACT.md` | Проект технического контракта ИИ-разработчика сайта и CMS |
| `docs/ROADMAP.md` | **УТВЕРЖДЁН 17.10.2026:** план 0–17, задачи/приёмка, без MVP; этап 0 принят |
| `docs/OPEN-QUESTIONS.md` | Зависимости, уточнения и решения, требующие согласования |
| `docs/ACCEPTANCE.md` | Проверки первой **полной** версии |
| `docs/FOUNDATIONS.md` | Актуальный shortlist open-source, без преждевременного выбора |
| `docs/STAGE-1-TEST-LOG.md` | Лог исследовательских тестов этапа 1 (не код CMS; гипотезы и блокеры) |
| `docs/STAGE-1-SNAPSHOT-PUBLISH-RESEARCH.md` | Отчёт checkpoint v1.11: PHP-only Opis validated publication, fallback/rollback; GitHub Actions PASS, **НЕ** product и не тест Hostinger |
| `docs/FOUNDATION-COMPARISON.md` | **Этап 1 в работе:** сравнительный отчёт, матрица 135 обязательных ID, детали исходников и программа проверок |
| `docs/NEXT-CHAT.md` | **ЕДИНЫЙ ПОСТОЯННЫЙ CHECKPOINT:** ссылка не меняется, по просьбе обновлять этот же файл, передавать в следующий чат | 
| `docs/PROJECT-MAP.md` | **Карта папок и файлов GitHub, инструкция перехода в отдельный ChatGPT-проект** |

## Порядок работы

1. **Выполнено 17.10.2026:** владелец утвердил `docs/ROADMAP.md` (этап 0 принят), включая правило отдельного пилота CELIKOM на этапе 17.
2. **Этап 1:** изучить существующие open-source CMS, редакторы и библиотеки; сравнить актуальные лицензии, поддержку, shared hosting и соответствие 135 обязательным требованиям.
3. **Этап 2:** выбрать архитектуру и легально адаптировать подходящую основу либо отдельные библиотеки. До исследования стек и базу не считать выбранными.
4. **Этапы 3–13:** реализовать все обязательные подсистемы, с отдельными приёмками, документацией и тестами.
5. **Этапы 14–16:** системные испытания, подтверждение 135/135 и первый полный релиз. **Никакого MVP**.
6. **Этап 17:** только после полной приёмки — отдельное безопасное испытание готовой CMS на **независимой тестовой копии CELIKOM**, с изоляцией кода/данных/репозиториев и откатом; затем по решению владельца другие сайты.

**Переход в новую папку ChatGPT:** начинай с **[постоянного файла docs/NEXT-CHAT.md](docs/NEXT-CHAT.md)**, затем `PROJECT-STATUS.json`, `docs/ROADMAP.md` и `docs/PROJECT-MAP.md`. По просьбе «обнови файл для следующего чата» **всегда сначала читать файл из GitHub, обновлять тот же путь и возвращать неизменную GitHub-ссылку и свежую копию файла**; не создавать новый параллельный checkpoint.

**Важно:** текущая работа над сайтом CELIKOM + его небольшой админкой продолжается **независимо** в `manufact-test/nomusic`. Здесь нет её исходников и нет деплоя CELIKOM.

**Актуальная контрольная точка:** v1.31 в [docs/NEXT-CHAT.md](docs/NEXT-CHAT.md). Указанные в старом плане ниже шаги 1–3 являются историческим порядком: фактически Stage1 принят 18.10.2026 по делегированному выбору, Stage2 начат и не принят.

## Stage2 checkpoint v1.46 — реальный Hostinger (20.10.2026)

Владелец одобрил архитектуру. Два новых тестовых Hostinger-сайта получили ограниченные реальные read-only проверки HTTPS/PHP и Git auto-deploy; PHP SAPI **LiteSpeed**, PHP Sodium **отсутствует**. Это не установка CMS и не доказательство DB/private code separation. Только отдельная `stage2-hostinger-cms-preflight` с двумя публичными файлами подключена к Git Auto Deploy; `main` НЕ deploy-ветка. Последний §51 в [docs/NEXT-CHAT.md](docs/NEXT-CHAT.md); [технический отчёт](docs/STAGE-2-HOSTINGER-REAL-PREFLIGHT-v1.46.md). Stage2 НЕ принят, Stage3 не начат, 0/135 продукта принято.


## v1.47 status correction

This project is **NOT a finished CMS**. Stage0/1 accepted; Stage2 live Hostinger Slim health-only tested but NOT accepted; Stage3 not started, 0/135 required product features accepted. Current checkpoint v1.47: owner-owned isolated 473-file unsigned offweb package, actual LiteSpeed read-only Slim4 health HTTP 200, visitor 200; target DB schema/admin/auth/AI not installed. See `docs/NEXT-CHAT.md` LAST §52 and `docs/STAGE-2-HOSTINGER-LIVE-KERNEL-v1.47.md`. GitHub intentionally public, no paid/private requirement; no passwords in repository.


## v1.48 — ручная передача 21.10.2026

Node и PHP release-policy объединены в один exact Stage2 manifest, PHP rejects noncanonical JSON + duplicated keys with freshly recomputed digest, synthetic tests now share full schema. Code test-pass `8b59e0718a867920bd5d7890e55c5b002facd354` (PHP 8/8, E2E SUCCESS, offweb 478 exact files). GitHub-only без Hostinger. Handoff: [handoffs/lead-integrator/MAIN-HANDOFF-v1.48-2026-10-21.md](handoffs/lead-integrator/MAIN-HANDOFF-v1.48-2026-10-21.md). Дальше обязательны legal 43 components, publisher crypto owner custody + LiteSpeed no-Sodium и разовый owner-authorized read-only Hostinger r8; DB-write approval отдельно. Research #3/#4 OPEN, не сливать. Документы обновлять только по прямой просьбе при следующей передаче; 0/135 product accepted.


## v1.49 — проверенный source и границы дальнейшей работы

Последний проверенный source `b3237fc2426ad246178b3fd4b64501c6b22c86ba` ([коммит](https://github.com/manufact-test/ai-site-cms/commit/b3237fc2426ad246178b3fd4b64501c6b22c86ba)). Изоляция Ed25519 owner read-only scope / отдельно подписанных operator receipts, реальный Node/PHP private record descriptor read, exact CI-only MySQL install (три fixed disposable identities), строгие SQLite/MySQL PK/UNIQUE/CHECK/индексы и предотвращение mixed signed/unsigned owner evidence. Полный GitHub-only CI: [PHP 8/8](https://github.com/manufact-test/ai-site-cms/actions/runs/39623780590), [Editor E2E](https://github.com/manufact-test/ai-site-cms/actions/runs/39623780667), [offweb 479/479](https://github.com/manufact-test/ai-site-cms/actions/runs/39624303691); unsigned manifest `112f9fd7adf5ac3f0717047967453b2de14a6b1647c5cc12e2358f7ddf0508bc`. Документация handoff после source — отдельные docs-only commits. **Stage2 NOT ACCEPTED, Stage3 NOT STARTED, 0/135**. См. [NEXT-CHAT §54](docs/NEXT-CHAT.md), [handoff v1.49](handoffs/lead-integrator/MAIN-HANDOFF-v1.49-2026-10-21.md), [custody protocol](docs/STAGE-2-OWNER-EVIDENCE-CUSTODY.md). Ни один из текущих зелёных CI не разрешает деплой на Hostinger или DB write.