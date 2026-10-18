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
