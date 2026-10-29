# AI Site CMS — передача главному разработчику v5.0
**29 октября 2026 года.** Этот документ заменяет предыдущие рабочие handoff как точка входа. История остаётся в Git; README/Master и существующие старые handoff не удалять.

## 1. Кто ты и как мы работаем

Ты — **новый главный разработчик и единственный интегратор** проекта MANUFACT AI Site CMS. Владелец перенёс разработку из предыдущего чата после большого функционального захода и прямо поручил продолжать **самостоятельно, большими блоками около 30 минут активной реализации за заход**. Не заканчивать работу после 10–12 минут и одной маленькой правки. Если первый полноценный блок сделан быстро, сразу переходить ко второму связанному. Приоритет: реальные возможности для владельца и первого работающего индивидуального сайта, а не десятки тестов, бесконечные отчёты или новые синтетические демо.

**GitHub:** https://github.com/manufact-test/ai-site-cms

**Единственная разрешённая рабочая ветка для основного чата:** `feature/stage3-ai-site-contract`.

**Последняя проверенная контрольная точка перед закрытием исходного чата и документацией передачи:** `d68008f2b3905c928218718f65213eb8e11a9a50`, GitHub Actions [#40860008584](https://github.com/manufact-test/ai-site-cms/actions/runs/40860008584) — `contract` и `technology-runtime` оба SUCCESS. Это исходный проверенный SHA для передачи; после технического обновления самого handoff могут появиться дополнительные *только документационные* коммиты. **Первым действием нового чата снова прочитай фактический HEAD и подходящий к нему результат CI**; ни один исторический SHA не даёт права перезаписывать более свежие изменения.

**Запрещено без отдельного согласия владельца:** изменение/merge `main`, PR/merge/deploy, production, Hostinger/CELIKOM, настоящие клиентские БД, секреты, живой DNS/внешний хостинг, автоматические миграции. Параллельный SEO-разработчик работает отдельно в `feature/site-seo-engine` и `stage3/seo-engine/**`. Не менять и не импортировать его код без интеграционной проверки; ядро, Studio, SDK, PHP и документация — только у главного чата. Не перезаписывать чужие новые изменения: сверять HEAD до записи.

### Порядок выполнения

1. Проверить HEAD ветки и GitHub Actions `contract` + `technology-runtime`; последний CI обязан соответствовать текущему SHA, а не одному из отменённых промежуточных push.
2. Прочитать `docs/MASTER-TZ.md` (главный продуктовый источник), `requirements/requirements.csv`, `docs/ROADMAP.md`, `stage3/mandatory-coverage.json` и `stage3/docs/APPROVED-SITE-PACKAGE.md`.
3. Посмотреть уже реализованные возможности **до** написания новых модулей, затем взять минимум одну крупную сквозную функцию с реальной пользой. Предпочтение нескольким связанным блокам за заход.
4. Проверять только нужное: синтаксис/валидация, существующий PHP HTTP E2E и реальный Chromium при изменении его UI, существующий Next runtime CI. Исправлять реальные регрессии, но не создавать испытательный полигон вместо CMS.
5. В конце обновить документы и коротко отчитаться: что реально появилось, SHA + matching Actions, что не готово и что требует действия владельца.

## 2. Что строим на самом деле

**MANUFACT AI Site CMS — не AI website generator, не SaaS, не WordPress, не сайт из шаблонов.** Внешний AI/дизайнер исследует реальный клиентский проект, предлагает **три статичные картинки макета (ПК/планшет/телефон)**, описывает UX, клиент их **реально утверждает**. Только после этого внешний AI программирует один самостоятельный индивидуальный сайт в типизированном `site.json` и наборе медиа, передаёт оба текстовых документа и sealed `manufact-approved-site-handoff-v2`. CMS подключает этот уже готовый сайт, показывает только его актуальные поля, редактирует содержимое/стили/секции/поведение/SEO/адаптив, сохраняет, публикует, откатывает.

Нет разрешения создавать фабрику типовых шаблонов, chat-генератор внутри CMS, общий клиентский SaaS, CRM/платежи, произвольный CSS/JS редактор, импорт любого чужого HTML. Цель — **первый настоящий сайт**, визуально и функционально корректный, а не бесконечно усложняемый технический контракт.

Реальных, лично утверждённых клиентом исходников `approved-v2` в распоряжении интегратора пока не было. **Ни одна обязательная функция не получила личной приёмки владельца.** В реестре сейчас инженерные оценки: `124 implemented_candidate`, `5 partial`, `6 owner_environment_gate` из 135 MUST; `ownerAccepted=0`. Это НЕ проценты готового продукта. Никогда не повышать статусы по зелёному CI без настоящего клиента и owner GO.

## 3. Что уже есть — НЕ делать заново

- Типизированные контракты, PHP/JS Design Graph, индивидуальные композиции, responsive фон/отдельные изображения, hover/focus/scroll, popup, tabs, FAQ/repeaters, поля формы, анимации, стили, SEO, глобальные компоненты, сохранение/откат, публикация, owner/editor/publisher права, история и журнал.
- Собственный PHP/SQLite/MySQL CMS runtime и Studio, независимые PHP, статический HTML и Next Static/SSR visitor exports. Самостоятельному PHP-хостингу не нужен Node. Секреты и БД не включаются в visitor ZIP.
- Полная imported sealed-v2 папка с SHA-256 оригиналов, опциональными утверждёнными макетами внутренних страниц, отдельным owner-only архивом доказательств и изолированным backup-v2 без автопубликации.
- В существующей Studio уже есть реальные desktop/tablet/mobile сравнения утверждённого оригинала и PHP страницы, наложение с прозрачностью, синхронная прокрутка, замечания по конкретной странице/ширине/Y, история и их owner-only серверное хранение, direct Publish gate для незакрытых замечаний. Для устаревшей БД таблица `stage3_visual_findings` добавляется только через явно разрешённый CLI upgrade, никогда автоматически на живом сервере.
- `stage3/bin/capture-approved-site.cjs` снимает в локальном Chromium реальную PHP публикацию, `offline-review-report.cjs` делает автономный отчёт по страницам, `verify-capture.cjs` сверяет файлы с исходной sealed-v2 папкой. Замечания можно вернуть в Studio без восстановления чужих галочек утверждения.
- Публичные формы: нативная HTML-валидация + HMAC immutable release, защита от спама, поля/условные шаги/обязательное согласие, PHP collector, owner-only журнал заявок, статусы/приоритеты/CSV, отдельные маршруты Email/Telegram и приватная очередь, шесть языков. Сохранение заявки ≠ получение внешнего сообщения.
- Загрузка медиа, изображения с отдельными desktop/tablet/mobile источниками, MP4 streaming/ranges, SEO sitemap/robots/OG, локальные URL redirects, реальный визуальный предпросмотр, runtime package export, immutable version сравнение, engine offline pack/verify/compare и безопасные CI smoke.
- Если меняешь `stage3/sdk/*.cjs` или `stage3/studio/app.js`, синхронизируй `stage3/studio/bundle.js` через штатный build и его `--check`; не оставляй несовместимую сборку.

## 4. Последний крупный заход перед этой передачей — формы и честная готовность к запуску

Этот заход не менял публичные маршруты и не создал ещё одну базу/рассылку. Реализована новая **полноценная операционная вертикаль внутри существующей приёмки сайта**.

**PHP:** `stage3/server/SiteOperations.php::launchFormReadiness()`. Owner получает приватную, строго read-only картину всех форм из текущего сохранённого черновика **и из опубликованной версии**. Форма, удалённая только из черновика, продолжает числиться, пока реально опубликованный сайт её использует. Для каждой формы выводится только `sectionId`, source, страница, режим и факт настройки Email/Telegram без email/chat ID, статусы `disabled` / `configuration_required` / `configured_unverified`, причина, число локально сохранённых лидов и агрегат состояний outbox **именно этой формы**. Статус провайдера `accepted` не трактовать как доставлено в ящик. `collectorSecretConfigured` — лишь наличие достаточной конфигурации, токен не отдаётся. `liveDeliveryVerified=false` и `ownerAcceptanceConfirmed=false` всегда, поскольку никакой реальной внешней отправки и клиентской приёмки в read-only preflight не происходит.

**API:** `GET /api/sites/{siteId}/launch-forms` в `stage3/server/Api.php`, только owner. Ни SMTP/Telegram запросов, ни публикации, ни миграций, ни SQL write.

**Studio:** `stage3/studio/hosted.js` / `hosted.css`. В существующем диалоге `Проверка сайта перед публикацией` появился обзор всех форм, состояние маршрутов, количество сохранённых заявок и попыток доставки, предупреждения по конфигурации, **кнопка перехода к уже существующему редактору конкретной формы**, кнопка открытия реально опубликованной PHP страницы в новой вкладке **только по прямому действию пользователя**, кнопка повторной read-only проверки, экспорт отдельного JSON `*-form-readiness.json`. Сводка дополнительно включается в существующий `manufact-launch-review-v1` JSON. Нет новой системы рассылки, автоотправки тестовых заявок и ложной отметки «готово».

**Проверки:** добавлены только связанные сценарии в `stage3/tests/server-e2e.cjs` (состояния до и после маршрута, ошибка внешнего транспорта, фактические локальные записи/очередь, форма, остающаяся в публикации при удалении из черновика) и `stage3/tests/approved-site-browser.cjs` (реальный owner UI, refresh и скачивание отчёта). Не раздувать тестовую платформу.

Подлинные получатели/токены Telegram, серверная email-отправка и фактическая доставка на разрешённом хосте **не проверялись**. Ни с одного адреса не отправлено реальное письмо. `#80` остаётся partial, а owner acceptance — ноль. Продуктовая ценность — оператор видит, **какую именно форму и куда нужно настроить** перед реальным запуском, и может проверить локальное сохранение независимо от транспорта.

## 5. Главные технические зоны и ограничения

- Продуктовый контракт: `docs/MASTER-TZ.md`, исходные решения `requirements/requirements.csv`.
- Код API/DB: `stage3/server/SiteRepository.php`, `Api.php`, `SiteOperations.php`, `FormRoutes.php`, `FormDelivery.php`, `VisualReview.php`, `PublicRenderer.php`, `FormGateway.php`.
- Owner UI: `stage3/studio/hosted.js`, стили `hosted.css`, основной редактор `stage3/studio/app.js`.
- Изолированная сборка: `stage3/runtime-export/**`, `stage3/bin/cms-release.cjs`; права и профили не изменять случайно.
- Пилотные инструменты: `stage3/bin/{seal-approved-site,verify-approved-site,audit-approved-site,capture-approved-site,verify-capture}.cjs`.
- Основной E2E: `stage3/tests/server-e2e.cjs`, `stage3/tests/approved-site-browser.cjs`. GitHub Actions на feature branch включает `contract` и `technology-runtime`.
- Stage3 DB требует **отдельной пустой базы** для первоначальной установки; уже существующие таблицы мигрируют только через явно разрешённый CLI с подтверждением владельца. Ничего автоматически на production.

## 6. ЧТО ДЕЛАТЬ СЛЕДУЮЩЕМУ ЧАТУ

**План А — как только владелец даст настоящий клиентский пакет.** Сразу проверить источник/целостность, утверждённые макеты, текстовую спецификацию, полноценный реальный PHP visitor render. Пройти на одной изолированной копии: sealed-v2 preflight → import → собственные media/SEO → изменение заголовка, адаптива, FAQ добавление/удаление/сортировка, реальное сохранение → визуальная ручная проверка 3 ширин → настоящая заявка только на ОТДЕЛЬНО РАЗРЕШЁННОМ тестовом канале → Publish → публичный просмотр → откат → backup/restore. Попросить owner GO **только после** готовой демонстрации; нельзя предполагать, что прототип утверждён, если владелец не сообщил.

**План Б — если реального пакета пока нет.** Взять **следующий крупный не закрытый пользовательский MUST** по `MASTER` и реестру: аккуратно проверить `#80` реальную доставку в разрешённом окружении, `#178` независимый JS/Next runtime, `#187/#193` вес и скорость на реальном PHP-хостинге, `#191` реальную связь. Не закрывать owner_environment_gate искусственно. Не писать ещё одну визуальную лабораторию/пакет синтетических макетов. Если нет внешнего разрешения — улучшать **реальные продуктовые функции**, которых действительно нет, но не дублировать уже работающие.

**ОБЯЗАТЕЛЬНО:** около 30 минут активной разработки в каждом заходе, несколько связанных блоков и минимально необходимый CI в конце. Уведомлять пользователя о прогрессе, чтобы отсутствие ответа не выглядело зависанием. По просьбе о смене чата передавать новый документ и готовое первое сообщение с реальным последним SHA и matching Actions.

## 7. Готовое сообщение по передаче

Следующий чат получает **от владельца** стартовое сообщение с фактическим финальным SHA и финальным CI этой ветки. Старые коммиты в документации — промежуточные и не являются сигналом менять/мержить `main`. Продолжать самостоятельно, не просить повторно уже известное и не уходить в обслуживание тестов вместо пользовательской функциональности.

## 8. Завершение исходного чата и передача без дальнейшей разработки — 29.10.2026

Владелец сообщил о рассинхронизации/зависаниях длинного чата и попросил **остановить разработку в нём, обновить документы и передать работу в новый чат**. Это не новая задача по функциональности: в этом финальном заходе не программировать новые блоки, не запускать новые миграции, не создавать PR и не деплоить.

Контрольная точка **до финальных документационных правок**: `d68008f2b3905c928218718f65213eb8e11a9a50`, `contract=SUCCESS`, `technology-runtime=SUCCESS`, GitHub Actions `#40860008584`. После обновления этого документа проверь фактический HEAD ветки и matching CI; если документационный commit не запускает Actions по path filter, не выдавай прежний CI за проверку новых байтов. Код на исходной контрольной точке был проверен.

Зафиксированное после больших заходов состояние: 135 MUST, инженерно `124 implemented_candidate`, `5 partial`, `6 owner_environment_gate`, **ownerAccepted=0**. В последнем кодовом заходе уже есть `launchFormReadiness`, приватный owner-only API `GET /api/sites/{id}/launch-forms`, панель Studio с состоянием каждой черновой и реально опубликованной формы, локальными статистиками лидов/очереди и JSON-экспортом; данные получателей и секреты не выдаются, внешняя доставка не проверена.

Новый чат — **главный разработчик и интегратор**. Нужно самостоятельно продолжать большие связанные реальные product tasks (ориентир около 30 минут активной реализации за заход), а не завершать на 10–12 минутах или заполнять время тестовой инфраструктурой. Не задавать владельцу вопросы, ответы на которые есть в документах. Подтверждать реальные изменения GitHub + matching CI, коротко сообщать промежуточный прогресс и никогда не преувеличивать оценку готовности. Если реальный sealed approved-v2 клиента отсутствует, не имитировать клиентский GO из синтетических фикстур.


## 29 October 2026 — manual per-form delivery probe

The current hosted Studio notification panel now offers an **owner-confirmed, form-specific Email/Telegram test** against the saved effective form route. The endpoint `POST /api/sites/{siteId}/delivery/probe` requires `{sectionId,channel,confirm:true}` and owner authentication, normal session CSRF and same-origin protections. It never runs from GET, preview, launch-readiness refresh or automatically. Disabled or unconfigured routes fail before I/O. Tests are atomically audit-reserved at **max 3 per site per 15 minutes** (no new table, migration, background task or email/Telegram API credentials in client output). Each test includes a distinct ID and explicit NOT A CLIENT LEAD wording; no customer submission, outbox item, public site change or retry is manufactured. The previous live notification route and ordinary customer inquiries remain unchanged.

The response is only a local *transport result*, not recipient receipt: even `accepted` does not verify that a human got a message. The owner must explicitly verify the target inbox/chat on a separately authorized environment. The site readiness continues to show `liveDeliveryVerified:false`, `ownerAcceptanceConfirmed:false`. #80 stays **partial**, 135 required engineering counts and 0 owner-accepted unchanged. No test message was actually sent during development, no production/Hostinger/SEO/main/PR/merge/deploy or real DB touched.


### Manual owner observation and durable probe history

The owner-only `GET /api/sites/{id}/delivery/probes` lists bounded, metadata-only routing tests from the existing private audit table, with the initiating form/channel, transport result and manual receipt observation. The owner may explicitly mark a **single** receipt/not-received observation using `POST /api/sites/{id}/delivery/probe/receipt` with a real test ID; unknown IDs fail, and repeat/concurrent alterations are rejected. There is no new schema or client content in this ledger. Studio shows the durable test history and permits one confirmed observation per test; the existing launch review now shows only the latest test per channel and form. An owner observation is not automatic proof of external delivery of a real visitor submission and never upgrades the overall `liveDeliveryVerified` or `ownerAcceptanceConfirmed` fields. CI inserts isolated metadata-only fixture audit rows for the save/read scenario and never triggers a real outgoing message.

### 29 October — first-login import action gating

Fixed a real hosted Studio first-login race exposed by the approved-v2 recovery Chromium journey: authentication could re-enable **Connect approved site** during the asynchronous initial site hydration, and an immediate folder selection would silently be ignored by the busy guard. Approved-folder import, private approval-vault actions, site switch/creation and JSON import now stay disabled until initial hydration completes. This is an operator safety fix for the actual approved client import path, not a new synthetic readiness mechanism. Re-run the existing Chromium journey; do not count the earlier failing CI as green.


### Route-version binding of manual delivery tests

Each test records the saved private site notification-settings version and per-form route version in audit metadata (not email addresses, chat IDs or tokens). Owner-only history and launch review mark whether a prior test still applies to the **current saved routing configuration**; changing either version or removing the form invalidates its applicability while retaining the original operator observation. Old audit rows without versions remain visible as history but never claim current applicability. This is deliberately conservative: an external transport could change without a CMS version bump, so matching versions are not proof of receipt or real visitor lead delivery. No schema changes or acceptance-status inflation.

### Legacy audit compatibility check

Routing-probe audit rows created before configuration-version metadata existed remain viewable and can still receive one owner observation. Empty regex capture groups must not be converted to version zero; these historic tests always show **not applicable to current configuration**. One isolated PHP HTTP E2E checks this backwards-compatible behavior without any real outgoing message.
