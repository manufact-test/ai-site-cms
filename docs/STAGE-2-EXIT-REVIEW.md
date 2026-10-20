> **АКТУАЛЬНАЯ ПЕРЕДАЧА v1.47 (20.10.2026), по просьбе владельца:** LAST [§52 NEXT-CHAT](NEXT-CHAT.md) и [Hostinger live kernel report](STAGE-2-HOSTINGER-LIVE-KERNEL-v1.47.md) заменяют устаревшие вводные v1.43–v1.46 ниже. Код `da6e646f6d36d91e8a7b33b33e31a0c10605e856`; [PHP 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638513), [Editor/package 1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638339), [реальный Hostinger r6 14/14](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638427). Вручную размещённая **473-file unsigned** offweb CMS цела и исполняет read-only Slim4 health на реальном LiteSpeed, **но пользовательская CMS /api/health 503, целевая MySQL схема не установлена**. GitHub public без платных/private требований. **Stage2 НЕ принят; Stage3 не начат; 0/135.**

> **АКТУАЛЬНАЯ ПЕРЕДАЧА v1.45 (19.10.2026), по прямой просьбе владельца:** Stage0 и 1 приняты; Stage2 НЕ принят; Stage3 НЕ начат; 0/135 продуктовых функций. Последний проверенный КОД 493964f32d63dd5552484afbcc972fc614571381; PHP 7/7: https://github.com/manufact-test/ai-site-cms/actions/runs/39275005275; editor/package 1/1: https://github.com/manufact-test/ai-site-cms/actions/runs/39275005280. Внутренний CI-only пакет 471 файл, 43 pinned зависимости; реальные в disposable CI Nginx + три PHP-FPM + две MySQL8.4 CMS + независимые сайты, восстановление; семь проверяемых offline-файлов передачи и восемь открытых ручных решений. Ни Hostinger, ни реальные сайты не проверялись. Ручные лицензии и safe AI-блоки (ADR0012/0013) — будущие требования, НЕ готовые функции. Актуально: NEXT-CHAT.md §50 и STAGE-2-FINAL-HANDOFF-v1.45.md; прежние checkpoints ниже исторические.

> **АКТУАЛЬНО v1.44, 19.10.2026:** последнее согласование владельца — ручные лицензии/собственный preview, safe AI-блоки и reuse. Только документация; Stage2 не принят, Stage3 не начат, 0/135, Hostinger не проверен. Предшествующие checkpoint notes ниже исторические.

# Stage2 — проверка критериев завершения и границ хостинга (v1.43, 19.10.2026)

**Статус: НЕ ПРИНЯТ; Stage3 НЕ начат; 0/135 продуктово принято.** В рамках Stage2 создана лабораторная архитектурная доказательная база и удобный read-only handoff для оператора. Код `f9bd4d25c996a8504abcb2ac5a896d70ab853db8` прошёл [PHP 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39174335647) и [полный редактор/дистрибутив/E2E 1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39174335641), внутренний пакет 465 файлов. Лабораторные проверки не дают права работать с Hostinger.

## Roadmap Stage2 — именно критерии приёмки, а не число тестов

| Критерий | Нынешнее доказательство | Статус |
|---|---|---|
| Архитектура ядра + редактора + независимых сайтов | Slim4/Opis2.6/Jedison1.27.1; 5 site families; отдельные CMS/site/private DB; read-only Blueprint + HostProfiles + review; Apache и Nginx FPM CI | **Подготовлено для согласования, владелец ещё не принял** |
| Зависимости закреплены и лицензии учтены | Composer/npm lock, 43-компонентный SBOM, 14 runtime PHP библиотек, 29 npm-записей, legal NOTICE, SHA256 package audit, browser CI | **Состав проверен; самостоятельный юридический аудит/ручное согласование не заявляем** |
| Образец пустой CMS в целевой среде | Две CMS на реальных Apache/Nginx + PHP-FPM, 5 семей за Nginx, тесты private-root/403/404/503 и отказов, 465-file package | **ЦЕЛЕВОЙ хост не тестировался; критерий открыт** |
| Решение о приёмке этапа 2 | Владелец делегировал инженерный выбор, но не давал явное закрытие Stage2 | **Открыто** |

## Непосредственно поставлено в v1.43

- `cms/src/Hosting/LabHostRequirementProfiles.php` — явные профили для HTML, PHP, React SPA, Next.js Static, Next.js SSR и Apache 2.4 / Nginx; Node обязателен лишь для SSR, React SPA нужен history fallback, PHP посетительскому сайту отдельный pool. Эти записи — **требования**, а не автоопределение функций на хосте.
- `cms/src/Hosting/LabStage2ExitReview.php` + `cms/bin/lab-stage2-exit-review.php` — согласованный read-only операторский сводный отчёт: все instance/siteId, семейство, лабораторный fleet state, проверенные пакеты с SHA256 manifest, 43 locked-компонента, оба сервера и host gates, явные blockers. Код не касается клиентского хоста/DB, не печатает private paths и не принимает Stage2 автоматически.
- `cms/tools/test-stage2-deployment-blueprint.cjs` — интегрирует report с 5 настоящими кодовыми копиями и лабораторными SQLite metadata bindings: до READY exit 4, после READY exit 0, а Stage2 всё ещё false; tamper Apache rules, чужие env и symlink fail closed. `cms/tests/lab-stage2-exit-review-contract.php` проверяет профили + privilege gate.
- Внутренний пакет и PHP inventory verifier включают новый CLI. Финальная общая проверка: blueprint E2E 156, PHP profiles 45, полный ранее действовавший код и сквозные Apache/Nginx 70/53 проверок; общая PHP матрица 7/7 + editor 1/1.

## Что НЕ реализовано и не должно быть заявлено готовым

- Нет доступа и проверок на реальном целевом хосте; только разрешение владельца позволит выполнить отдельный read-only preflight; запись/деплой требуют ещё отдельного разрешения.
- Нет реальной аутентифицированной админки, AI-манифеста, публикации, полноценных website adapters и реального Next.js SSR (только Node proxy fixture). По Roadmap это преимущественно последующие этапы.
- Есть перенос и восстановление **только служебных метаданных пустой CMS**, не страниц/медиа/revisions и не production disaster recovery. Нет production publisher signing keys/доверенного защищённого antirollback.
- Процент **≈85–90% инженерной готовности Stage2, остаётся ≈10–15%** — экспертная оценка открытых архитектурных и целевых критериев, не официальный KPI и не доля 135 функций. Реальные непредвиденные ограничения хоста могут увеличить остаток.

**Никаких действий с Hostinger, CELIKOM, клиентскими сайтами и веткой `research/stage1-editor-comparison` не выполнялось.**

## Добавление v1.44 — доказательства с последней передачи 19.10.2026

- Последний действительно проверенный **код**: 1b1f154702bc618242f7769524e769a2b1486932; [PHP CI 7/7 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39240517754), [editor+internal package 1/1 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39240517567). Внутренний комплект **469 файлов** (465-file числа в прежнем v1.43 — исторические).
- Поставлен read-only Stage2TargetHostHandoff + CLI: локальные пакет/root наблюдения и строго типизированные операторские claims; **27 PHP contract + 44 packaged CLI тестов**; никакой live HTTP/TLS/PHP-FPM/DB проверки, самодекларация не доказывает реальный хост.
- Построен единый packaged→две раздельные disposable MySQL8.4 базы с отдельными пользователями→explicit CLI install→read-only schema preflight→foreign DB/ID denial→independent visitor HTTP smoke. **39 новых интеграционных проверок PASS**. Это не production MySQL-to-HTTP binding, не тест Hostinger и не owner stage acceptance.

**Stage2 остаётся НЕ принят:** нет independent license/legal approval, согласования владельцем закрытия архитектуры, разрешения на Hostinger read-only и отдельного разрешения на установку/target host evidence. Новые бизнес и site-quality решения [ADR0012](ADR/0012-manual-client-licenses-and-project-handover.md), [ADR0013](ADR/0013-ai-site-safe-defaults-and-reuse.md) — будущие product requirements, **не реализованные** и не оправдывающие бесконечный Stage2 lab.

## Реальный target checkpoint v1.46 — 20.10.2026 (приоритет над прежним «Hostinger ещё не проверяли»)

Owner архитектуру **утвердил**. Два разрешённых пустых тестовых сайта реально отвечают через HTTPS: CMS /__stage2/host 200 JSON, /api/health 503 NOT INSTALLED, private files 403/404, visitor / 200. Проверен Git auto-deploy revision r2; LiteSpeed LSAPI PHP8.3 и PDO MySQL/OpenSSL YES; **PHP Sodium NO**. Следовательно (1) owner architecture gate выполнен; (3–5) host surface наблюдался лишь **частично**, нужны физические private paths/DB/host ownership и LiteSpeed+Sodium решение; (2) юридическое заключение не получено, (6) outage не проводился, (7) пустую CMS не устанавливали, (8) owner acceptance не получено. Право проводить работу ограничено двумя специально созданными адресами и не даёт общего SSH. Подробнее [real target report](docs/STAGE-2-HOSTINGER-REAL-PREFLIGHT-v1.46.md). Не заявлять «7 критериев пройдено»: **только архитектура формально подтверждена**, HTTPS — частичное evidence.


## Фактическая повторная оценка Stage2, v1.47

**Owner architecture approval — done.** Target TLS/routing/public filesystem denial — measured; owner-approved manual non-webroot install of *unsigned* 473-file package + real LiteSpeed Slim4 health-only 200 — now measured. **Still open:** separate target MySQL credentials and schema/authorization, independently assessed 43 dependency licenses, native Sodium alternative reviewed for signed release, full target init/restore/upgrade/cms-only outage during visitor availability, completed operator handoff & explicit Stage2 acceptance. No auth/admin/AI products; **0/135** accepted. Do NOT cite live GET health as installed CMS. [Evidence](STAGE-2-HOSTINGER-LIVE-KERNEL-v1.47.md).
