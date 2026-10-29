# MANUFACT AI Site CMS — MAIN HANDOFF v6.0
**29 октября 2026 · точка входа в следующий главный чат.** Этот документ заменяет v5.0 как рабочий инструктаж. Старые handoff хранятся только как история; фактический HEAD GitHub всегда важнее записанного ниже SHA.

## 1. Роль нового чата и темп
Ты — **новый главный разработчик и единственный интегратор** MANUFACT AI Site CMS. Владелец поручает продолжать самостоятельно крупными связанными блоками **около 30 минут активной разработки за один заход**, а не заканчивать на 10–12 минутах и одной мелочи. Если крупный блок готов раньше — берись за следующий полезный в том же заходе. Не трать основное время на десятки тестов и бесконечное переоформление документов. Давай периодические короткие отчёты о реальных результатах, в конце — актуальный SHA и GitHub Actions, где **оба** `contract` и `technology-runtime` SUCCESS именно для последнего HEAD.

GitHub: https://github.com/manufact-test/ai-site-cms
**Единственная рабочая ветка основного чата:** `feature/stage3-ai-site-contract`.
Кодовая контрольная точка перед обновлением этих документов: `d161f926686e4288b395dd9ec2d7d94a20e97810`. CI для неё проверяется отдельно; новая документационная запись меняет SHA. **Первым действием проверь актуальный HEAD и matching CI, не откатывай более свежие коммиты.** Точный финальный код/CI после handoff commit владелец передаст сообщением в новом чате.

**Запрещено без отдельного разрешения:** `main`/merge/PR, production/Hostinger/CELIKOM, реальные клиентские БД, секреты, live DNS/сайты, автоматические миграции, реальные отправки email/Telegram и внешний deployment. Второй чат независимо ведёт `feature/site-seo-engine` и `stage3/seo-engine/**`; эти файлы не изменять и не перетягивать его ветку без договорённости. Используй GitHub connected plugin и CAS/expected SHA при обновлениях ветки.

## 2. Что строим
CMS для **индивидуально запрограммированных сайтов**, а не генератор шаблонов, WordPress, SaaS или встроенный AI. Внешний разработчик/AI исследует бизнес, показывает три **статичных дизайн-макета** (desktop/tablet/mobile), текст для заказчика и техническое задание; после реального согласования делает законченный typed `site.json` + assets + sealed `manufact-approved-site-handoff-v2`. CMS импортирует, редактирует именно этот реальный сайт и его адаптив/SEO/формы/эффекты, сохраняет, публикует и откатывает. Не тратить ресурсы на новую фабрику дизайнов/CRM/AI-чат или повторный редактор.

Источники правды: `docs/MASTER-TZ.md`, `requirements/requirements.csv`, `docs/ROADMAP.md`, `stage3/mandatory-coverage.json`, `stage3/docs/APPROVED-SITE-PACKAGE.md`. Текущая инженерная оценка 135 MUST: **124 implemented_candidate, 5 partial (#80, #178, #187, #191, #193), 6 owner_environment_gate**, лично owner accepted **0**. Зелёный CI не даёт права менять эти цифры. Реальный утверждённый клиентский sealed-v2 пакет и разрешённый домен от владельца **не предоставлены**.

## 3. Реализованные системы — не дублировать
- PHP/SQLite/MySQL runtime, owner/editor/publisher roles, private Studio, typed SDK/Design Graph, изображения и отдельные device media, responsive nodes и motion, заголовки/FAQ/repeaters/tabs/popups, сохранение/ревизии/Publish/rollback, protected backup, private audit.
- Original approved-v2 import с доказательствами SHA256, preview макетов desktop/tablet/mobile и owner visual comparisons, отдельный review ledger/контролируемый Publish, screenshot capture в локальном Chromium.
- Формы HMAC/antispam/consent, owner-only lead inbox, Email/Telegram routing, приватная очередь, owner-only `GET /api/sites/{id}/launch-forms`, **вручную подтверждаемые** per-form test probes и история receipt observations. Transport-accepted ≠ подтверждённая доставка лида. Никогда не делать несанкционированную реальную отправку.
- Независимые PHP, HTML, Next Static и Next SSR visitor exports, SEO/redirects/sitemap, real Next builds на loopback CI, D2/D4 ZIP checksum, D5 offline preflight и D6 local HTTP rehearsal. Next SSR D4 ZIP — source-only, для настоящего хостинга нужен Node build; PHP visitor обходится без Node.
- Оптимизация независимого visitor: общий immutable SHA256 CSS на все страницы, gzip/ETags/HEAD для PHP, no-BLOB 304/HEAD по hosted media, первый visual image верхней Design Graph секции получает fetchpriority high, статические Apache/Nginx host rules для immutable CSS/images/MP4. **Без измерений на клиентском хосте.**
- **Новый последний блок D7:** `stage3/runtime-export/lib/performance-envelope.cjs` выдаёт per-page bytes + gzip estimate + CSS + HTML media inventory + lazy/eager hints, предупреждения `PERF_*`; `audit-delivery --fail-on-performance`; `ship --enforce-performance-budget`. `compare-delivery-performance.cjs /ABS/old.zip /ABS/new.zip` сравнивает две SHA-verified версии одного сайта, показывает per-route size deltas и существенные регрессии. `ship --compare-to=/ABS/old.zip [--enforce-no-regression]` встраивает сравнение в один shipment. D6 теперь проверяет PHP gzip/identity/ETag/304/HEAD/media не выходя за loopback. Default budget — advisory, strict — только opt-in. Это **не** Lighthouse, TTFB, Core Web Vitals или реальная загрузка медиа на устройстве.

## 4. Что делать дальше
**План А — если владелец дал реальный утверждённый сайт:** проверить sealed-v2 прототипы и spec; провести одну полноценную владельческую операцию через живой Studio на изолированной копии: import → редактирование H1/адаптива/картинки/FAQ → Save → сравнение макетов на 3 ширинах → Publish → открыть PHP visitor → rollback → backup/restore. Замечания фиксировать и закрывать адресно. Для реальной отправки формы или внешнего домена сначала получить отдельное разрешение. Отправить владельцу конкретные скриншоты и путь воспроизведения; получить его GO прежде чем менять `ownerAccepted`.

**План Б — если approved-v2 не появился:** двигать незакрытую **реальную продуктовую возможность**, а не крутиться в очередных измерительных утилитах. Приоритет: #80 конфигурация/доставка реальных форм (только после разрешения тестового транспорта); #178 реальная готовность Next с владельцем выбранного хостинга; #191 подключение реального сайта; #187/#193 измерения веса/LCP на разрешённом хосте. Без полномочий работать над фактическими UX/functional gaps после проверки кода и MASTER, не подменять owner signoff CI и fixture-доказательствами. Дать владельцу максимально рано полноценную демонстрацию.

## 5. Безопасная техническая процедура
1. `GitHub HEAD` ветки и workflow runs, **оба jobs SUCCESS для того же SHA**; если не совпадают — не говорить зелёное.
2. Прочитать вышеуказанные источники и этот handoff, а перед правкой посмотреть текущую реализацию. Писать только в `feature/stage3-ai-site-contract`, с expected_sha/CAS.
3. Делать несколько связанных пользовательских результатов в одном большом заходе, без несогласованных миграций/деплоя. Не переписывать SEO worker area, не импортировать его ветку.
4. Если трогаешь `stage3/sdk/*.cjs` или `stage3/studio/app.js`, обновить `stage3/studio/bundle.js` штатной сборкой и проверить `--check`. При PHP/OpenAPI/Studio изменениях использовать существующий server E2E/Chromium, при Next — существующий technology-runtime CI. Нужны минимальные критические тесты, не новые лаборатории.
5. После крупных блоков обновить `docs/ROADMAP.md`, `stage3/mandatory-coverage.json` и handoff только по существу. Перед сменой чата подготовить новый handoff и **готовое первое сообщение**, указать финальный проверенный SHA+matching CI и честные owner_environment_gate.

## 6. Последний заезд и границы доказательств
Описанная D7 вертикаль добавлена в нескольких последовательных feature commits после предыдущего проверенного `f5d09e7b2a646b313638817b81893aef3d4f5580`. Реальные D4 ZIP + PHP loopback + D7 version comparison проходят существующие workflows, но итоговый CI **должен быть проверен после записи этого документа**. Ни один внешний клиентский домен, Email/Telegram получатель или production среда не посещались. `ownerAccepted=0`; все 5 partial и 6 owner gates сохранены. Не утверждать обратного.

## 7. Основные ориентиры в коде
`stage3/server/{Api,SiteRepository,PublicRenderer,SiteOperations,FormDelivery}.php`,
`stage3/studio/{hosted.js,app.js}`,
`stage3/runtime-export/{bin/{ship,audit-delivery,rehearse-delivery,compare-delivery-performance}.cjs,lib/{delivery-preflight,performance-envelope}.cjs}`,
`stage3/tests/{server-e2e,approved-site-browser}.cjs`,
`stage3/runtime-export/tests/delivery-probe.cjs`.
Все команды доставки/сравнения **явно запускает оператор**, не CMS автоматически. CLI `ship.cjs next-static --allow-npm-install` отдельно разрешает сеть npm, но не deployment.

**Переход для нового чата:** не проси владельца повторить принятые правила, начни с HEAD + этого документа и самостоятельно продолжай.
