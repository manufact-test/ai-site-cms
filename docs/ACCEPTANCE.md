> **v1.48 / 21.10.2026 (handoff по просьбе владельца).** Проверенный код [`8b59e0718a867920bd5d7890e55c5b002facd354`](https://github.com/manufact-test/ai-site-cms/commit/8b59e0718a867920bd5d7890e55c5b002facd354), [PHP 8/8](https://github.com/manufact-test/ai-site-cms/actions/runs/39587975849), [Editor/E2E](https://github.com/manufact-test/ai-site-cms/actions/runs/39587976040), [offweb 478/478](https://github.com/manufact-test/ai-site-cms/actions/runs/39588269636). [Каноническая передача](../handoffs/lead-integrator/MAIN-HANDOFF-v1.48-2026-10-21.md). Документы v1.47 ниже — история. **Stage2 НЕ ПРИНЯТ, Stage3 НЕ НАЧАТ, 0/135.**

> **CHECKPOINT v1.47 / 20.10.2026 (owner-requested):** [LATEST NEXT-CHAT §52](NEXT-CHAT.md), [real Hostinger r6 kernel report](STAGE-2-HOSTINGER-LIVE-KERNEL-v1.47.md). [Source](https://github.com/manufact-test/ai-site-cms/commit/da6e646f6d36d91e8a7b33b33e31a0c10605e856), [PHP7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638513), [Editor1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638339), [live GET14/14](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638427). Unsigned offweb CMS 473 files and LiteSpeed real Slim4 read-only health verified; *full CMS MySQL installation/auth/publish NOT done*. Stage2 NOT ACCEPTED, Stage3 NOT STARTED, 0/135. Older v1.43–v1.46 checkpoint banners below are historical.

> **v1.45 / 19.10.2026 (АКТУАЛЬНЫЙ CHECKPOINT):** Stage0+1 приняты; Stage2 инженерно ~85–90%, но формально НЕ принят; Stage3 НЕ начат; 0/135 продуктовое принятие. Последний проверенный КОД 493964f32d63dd5552484afbcc972fc614571381 — [PHP 7/7 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39275005275), [редактор + пакет 1/1 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39275005280). Внутренний пакет 471 файл, 43 зависимости; CI-only двухсайтовый Nginx/3 PHP-FPM/MySQL8.4 и recovery; 7 файлов owner/legal handoff, 8 открытых человеческих решений. Реальный Hostinger НЕ проверяли; разрешения read-only / install / outage только по отдельному запросу. ADR0012/0013 (ручные лицензии, safe AI blocks и reuse) — УТВЕРЖДЁННЫЕ БУДУЩИЕ требования, не реализация. Исторические v1.44 и ранее не являются текущим SHA. Подробнее: [NEXT-CHAT §50](NEXT-CHAT.md), [полный v1.45 handoff](STAGE-2-FINAL-HANDOFF-v1.45.md). Документ обновлён по прямой просьбе; при обычном 'продолжаем' документы не трогать.

> **v1.44 / 19.10.2026: согласованные решения владельца; этап 2 НЕ ПРИНЯТ, этап 3 НЕ начат, 0/135.** [Ручные лицензии](ADR/0012-manual-client-licenses-and-project-handover.md), [AI-блоки/reuse](ADR/0013-ai-site-safe-defaults-and-reuse.md), [стандарт качества](SITE-QUALITY-BASELINE.md). Документ обновлён по прямой просьбе при передаче чата; старые checkpoint заметки ниже исторические. Код до docs-only изменения `1b1f154702bc618242f7769524e769a2b1486932` — [PHP 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39240517754), [редактор 1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39240517567), 469 файлов. Новые правила ещё НЕ реализованы.

> **АКТУАЛЬНАЯ ТОЧКА v1.43 (19.10.2026; прежние строки — история):** Stage0 и Stage1 приняты; **Stage2 выполняется, НЕ ПРИНЯТ; Stage3 НЕ начат; 0/135 обязательных продуктовых требований принято.** В `main` реализованы CI-only многосайтовые установки, перенос пустых метаданных, PLAN с отпечатком публичного сайта, изоляция пяти семейств HTML/PHP/React/Next Static/Next SSR, реальный Nginx и Apache2.4 + PHP-FPM на GitHub runner, встроенный Apache `.htaccess` и новый machine-readable Stage2 exit-review с отчётом о границах/зависимостях и необходимых действиях. Комплект **465 файлов**. **Проверенный код:** [`f9bd4d25c`](https://github.com/manufact-test/ai-site-cms/commit/f9bd4d25c996a8504abcb2ac5a896d70ab853db8); [PHP7/7 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39174335647), [полный редактор/пакет 1/1 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39174335641). **Оценка Stage2 ≈85–90% выполнено, ≈10–15% осталось**, не приёмка и может измениться при реальном hosting. **Целевой Hostinger не проверяли даже read-only — запрещено без отдельного разрешения; архитектуру владелец ещё не утвердил для закрытия Stage2.** Production install, auth/admin/publish, полноценный backup и реальный Next SSR отсутствуют. [Актуальный подробный Stage2 exit report](STAGE-2-EXIT-REVIEW.md), [ADR0011](ADR/0011-stage2-exit-gate-and-host-handoff.md). Документы обновлены один раз **по прямой просьбе владельца при смене чата**; далее обычное «продолжаем» НЕ разрешает менять документы автоматически.

# План проверки полной первой версии CMS — v0.1

> **Контрольная точка v1.39 (18.10.2026):** этапы 0+1 приняты, Stage2 работает / НЕ ПРИНЯТ; **0/135 обязательных требований продукта принято**. GitHub лабораторный CI (signed ZIP/PHP/database) — не продуктовая приёмка. См. [NEXT-CHAT §44](NEXT-CHAT.md) и [v1.39 report](STAGE-2-UNIFIED-TRUSTED-UPGRADE.md).

**Правило gate:** готовность к выпуску наступает при **135/135 обязательных функциях**, подтверждённых тестами. Нет внешнего релиза MVP.

## Матрица для реализации

У каждого требования `Обязательно` должны быть ссылки:

- ID в `requirements.csv`;
- компонент/модуль, реализующий требование;
- unit и/или integration/e2e тест;
- результат проверки ПК/планшета/телефона для responsive пункта;
- коммит и решение о приёмке;
- документация для владельца.

Обязательные разделы проверки: №1–9 типографика, 10–21 геометрия, 22–36 оформление, 37–50 медиа, 51–66 анимация, 67–84 взаимодействия, 85–100 глобальные значения, 101–119 AI integration, 120–137 UI, 138–155 страницы SEO, 156–173 безопасность/публикация, 174–193 интеграция и runtime. Проверяются **только обязательные ID**, исключения учитываются явно.

## E2E сценарии

**A. AI-first с нулевым брифом.** ИИ получает «сделай сайт сам», создаёт секции, адаптив, манифест и passes schema coverage. Все реальные свойства доступны без мусорных панелей.

**B. Открытие тяжёлой секции.** Несколько видеосекций на сайте, редактируем Hero; инструмент не строит всю страницу, предпросмотр и настройки работают без запуска всех других блоков.

**C. Привязка к параметрам.** Изменения текста, размера, отступа, border, тени, hover/scroll animation и action меняют нужные значения и не затрагивают соседний элемент.

**D. Device overrides.** Desktop↔tablet↔mobile; inherited и локальные значения, скрытие отдельных элементов. Изменение глобального дизайна не ломает индивидуальный override.

**E. Повторяющийся контент и SEO.** Шапка/футер на нескольких страницах, FAQ, галереи, многошаговая форма, title/meta/OG, canonical/robots/sitemap/301, структура заголовков и schema.

**F. Версии и конфликт.** Сохранить draft, открыть preview, опубликовать, отменить, откатить published. Два администратора в одном блоке не теряют чужую работу.

**G. Миграция схемы.** ИИ изменил код компонента: совместимые overrides сохранены; несовместимые показаны как конфликты, до разрешения не происходят разрушительные обновления.

**H. Обновление CMS.** Обновить движок на отдельной установке сайта, не затронув контент, выполнить rollback. Провести backup и реальное восстановление.

**I. Три технологических режима.** Статический HTML/CSS/JS; PHP; React/Next.js (в том числе документированный вариант для статического экспорта). Проверить на shared hosting и отдельно отметить ограничения SSR.

**J. Независимость посетителя.** При остановке админки публичный сайт продолжает корректно обслуживать страницу, его бандл не содержит загружаемый редактор.

**K. Security.** Неавторизованные изменения запрещены, XSS/CSRF/загрузка вредоносных файлов отклоняются, ключи приватны, лог аудита корректен.

## Граница испытаний после релиза

**Этап 17, отдельно от приёмки CMS:** после полного релиза и согласования владельца проверить AI Site CMS на **изолированной тестовой копии CELIKOM**. CELIKOM не сливается с проектом CMS ни по коду, репозиторию, БД, доступам, CI/деплою или рабочему процессу; до отдельного разрешения его продакшен не затрагивать. Сделать backup, тест восстановления и rollback. Только после подтверждённого пилота — другие сайты.

## Порог готовности

- 135 обязательных пунктов выполнены и проверены; ноль «не протестировано».
- Невыполненные желательные пункты оформлены отдельным backlog, а не скрыты в обещаниях.
- Отсутствуют критические проблемы безопасности, публикации и потери данных.
- Пройден сценарий установки на чистом виртуальном хостинге и полный restore.
- Реализованы стабильные примеры подключений сайтов и инструкции для ИИ-разработчика.
- Все изменения подтверждены владельцем.

**Производственные цифры (секунды, мегабайты, thresholds) пока не согласованы** и будут добавлены после выбора архитектуры, чтобы не выдумывать необоснованные KPI.

## Дополнительная приёмка 19.10.2026 — новая согласованная политика (НЕ уже выполнено)

**Ручные лицензии (ADR0012).** Два независимых сайта A/B; ручной выбор perpetual/subscription, настраиваемое напоминание +30 дней; наступление срока показывает напоминание, **никакой автоматической блокировки**. Только уполномоченный оператор MANUFACT вручную приостанавливает/возобновляет редактор и публикацию CMS A; публичные сайты A/B и CMS B остаются доступны, сохранены правки/данные, события аудируются. Собственный preview MANUFACT может вручную обратимо скрываться до передачи при наличии договорного права; чужой хостинг, скрытый shutdown и удаление данных не допускаются. Сбой сервиса лицензий не должен выключать публичный сайт.

**Безопасные AI-блоки (ADR0013 / SITE-QUALITY-BASELINE).** ИИ делает сайт без макета с формой, международным телефонным полем, CTA, FAQ, меню и модалкой: сразу подключены безопасные modules, реальные получатели/доставка или честное CONFIGURATION_REQUIRED; сервер валидирует payload, отклоняет бот/флуд/невалидные значения, не допускает двойную заявку; keyboard/focus/aria/reduced motion, mobile, media performance и XSS/CSRF/secret protection применимы. Отрицательные и положительные end-to-end тесты на поддерживаемых site families и при остановленной CMS. Для каждого теста PASS/FAIL/N/A/CONFIGURATION_REQUIRED, не вводить ложный успех.

**Reuse:** на каждый заимствованный модуль evidence лицензии/NOTICE, версии/lock, support/security/compatibility PHP/HTML/React/Next и регрессии. Запрет на раздувание runtime ненужными зависимостями.

Первый полный релиз: исходные **135/135 обязательно** + применимые новые owner-approved критерии. На текущем Stage2 нет приёмки этих функций.

## v1.46 — фактическое частичное доказательство на двух разрешённых Hostinger-сайтах

Owner architecture agreement получено, но финальная приёмка Stage2 — **НЕТ**. Read-only TLS GET live PHP baseline /api/health 503 (CMS не установлена), private 403/404, visitor / 200 и Git auto-deploy r2: [подробный отчёт](docs/STAGE-2-HOSTINGER-REAL-PREFLIGHT-v1.46.md). Целевой веб SAPI LiteSpeed вместо лабораторного FPM/Apache; PHP Sodium отсутствует, поэтому Ed25519 PHP verification из CI нельзя считать production-ready. Реальный DB handshake, файловая граница, изолированный CLI install, controlled outage и independent 43-license human legal review остаются open. 0/135 обязательных product requirements приняты.


## v1.47 status correction

**Hostinger Stage2 evidence v1.47:** real offweb 473-file package and LiteSpeed PHP Slim4 read-only synthetic health HTTP 200 were observed; 14/14 HTTPS routes including visitor positive. This is ONLY readiness evidence. Dedicated MySQL connection, schema init, on-host restore, CMS-only outage, legal 43-license review and owner Stage2 signoff are OPEN. Product acceptance remains 0/135; Stage3 blocked. Never mark stage as accepted from synthetic GET alone.

## v1.48 — проверка перед передачей, не приёмка Stage2

**На последнем кодовом SHA `8b59e0718a867920bd5d7890e55c5b002facd354`:** [PHP 8/8 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39587975849), [Editor/Chromium/E2E SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39587976040), [offweb 478/478 повторно скачан/сверен SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39588269636). PHP+Node release verification: exact canonical JSON и единая полная Stage2 схема; сценарии с recomputed SHA + duplicate key/whitespace/escape не запускают инсталляцию; Node/PHP synthetic tests не обходят policy. **Это инженерные доказательства на disposable CI**, НЕ реальные owner publisher keys, target MySQL/Hostinger, installed CMS или acceptance продукта. Реальная отдельная юридическая оценка 43 компонентов, решение native Sodium vs approved cryptography на LiteSpeed, разрешённая host read-only проверка r8, отдельный write install/recovery/isolation, owner signoff — ОТКРЫТЫ. **Stage2 НЕ ПРИНЯТ, Stage3 НЕ НАЧАТ, 0/135 обязательного продукта.** См. [handoff](../handoffs/lead-integrator/MAIN-HANDOFF-v1.48-2026-10-21.md).
