# AI Site CMS — SEO worker: финальная передача 29.10.2026

## 1. Назначение и режим работы

Репозиторий: https://github.com/manufact-test/ai-site-cms

- Наша отдельная ветка: `feature/site-seo-engine`.
- Наш **строгий scope**: только `stage3/seo-engine/**`.
- Ведущий разработчик и единственный интегратор — другой основной чат, его ветка `feature/stage3-ai-site-contract`.
- **Никаких изменений в** `stage3/server/**`, `stage3/studio/**`, `stage3/bin/**`, `main`, workflows; не делать PR, merge, deploy, не публиковать CMS и не писать клиентские данные в GitHub.
- Отправная точка текущего захода SEO: `02529257db80c080eef158aed6a1b39aedfee945`. HEAD после этого документа **получить заново из GitHub**: параллельный ведущий и наши commits могут меняться. Начинать с двух HEAD + GitHub Actions.
- Правило пользователя: делать **крупные заходы около 30 минут активной разработки**, если задача завершилась за 10–12 минут — сразу брать второй/третий самостоятельный существенный блок. Никаких длинных повторных синтетических тестов вместо CMS; минимум реально нужных проверок. Заканчивать понятным отчётом с фактическим SHA, изменёнными файлами и ограничениями.

## 2. Что уже было готово ранее

SEO Intelligence & Blueprint Engine, sealed Approved Site v2, strict owner-published Site v1 reconciliation, локальный localhost PHP HTML/robots/sitemap/301/медиа QA, theme/global styles + DesignGraph, navigation, semantic HTML, responsive и social/JSON-LD, валидация официального PHP static export, реальный HTTPS GET/HEAD и SHA256 media digest capture, soft404, CSP/формы, блокировки приватных документов и public release fingerprint, host rewrites (Apache/Nginx/Netlify/Cloudflare), готовая `public/` папка, private candidate и детерминированный ZIP, локальный preview, сравнение релизов и rollback ZIP, визуальные замечания CMS и сверка архивированных макетов.

Историческая документация:
- `stage3/seo-engine/STATIC-LAUNCH-WORKFLOW.md` — запуск первого сайта.
- `stage3/seo-engine/FIRST-SITE-RUNBOOK.md` — подробные ручные проверки.
- `stage3/seo-engine/INTEGRATION-HANDOFF.md` — интерфейсы для ведущего.

## 3. Новая работа последнего захода

### 3.1. Исправлена достоверность owner-approval delta

`lib/php-local-approval-archive.cjs` теперь сохраняет **SHA256 точного sealed handoff v2** в безопасный JSON отчёт (`sealedPackageSha256`). `lib/first-site-report-delta.cjs` сравнивает архивы утверждённых макетов между запусками **только когда exact sealed package SHA256 совпадает**. Раньше две разные архивные версии могли считаться сопоставимыми лишь потому, что оба отчёта ссылались на проверенный source.

### 3.2. NEW — проверка живой публикации после ручной загрузки

`lib/post-deploy-verification.cjs`, `bin/verify-deployed-site.cjs`:

- Независимо читает уже подготовленный private `CANDIDATE-STATUS.json`, `seo-report/summary.json`, verified `static-upload/public`, `public-site.zip`, и при обновлении `UPGRADE-IMPACT.json` + SHA256 rollback ZIP. Не позволит вручную «обнулить» технические блокировки в одном status JSON без противоречия первому SEO summary.
- Требует matching owner-published `version` и `sourceRevision`, official PHP static manifest SHA256, ZIP SHA256 и status из исходного подготовленного candidate.
- На вход принимает уже сохранённые **реальные HTTPS page/301/robots/sitemap/negative-route/private-file/marker** receipts и публичные SHA256 GET всех media originals + variants. HEAD media опционален. Любой mismatch — `NOT-READY`.
- Требует HTTPS HTTP/media captures не старше **120 минут** (на момент проверки) и не дальше **30 минут** друг от друга, чтобы не принять старые скопированные снимки за актуальный продакшен.
- Может дополнительно получить предыдущие публичные HTTP/media GET receipts для сравнения CDN. На неизменном SHA256 релиза неожиданно другой HTML/301/image bytes — блокирующее наблюдение.
- Статус, когда все технические поверхности совпали: только `TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED`. **НЕТ automatic GO.**
- В приватный `post-deploy-summary.json` и `post-deploy-handoff.md` попадают codes, маршруты, количества и SHA256, без HTML, HMAC, личных заметок, cookies или POST.
- Не выполняет никаких реальных HTTP запросов, DNS/TLS сам не подтверждает — **исходные транскрипты передаёт оператор**. Проверка формы POST, mail/Telegram, скриншотов 3 устройств, клиента — у ведущего.

Команда, ПОСЛЕ ручной публикации ведущим и получения HTTPS evidence:

```bash
node stage3/seo-engine/bin/verify-deployed-site.cjs \
  --candidate /ABS/private-first-site-candidate \
  --approved-site /ABS/SEALED-V2 \
  --published-site /ABS/owner-published.json \
  --static-export /ABS/official-static-release \
  --public-http-evidence /ABS/public-http.json \
  --public-media-digests /ABS/public-media-GET-sha256.json \
  --out /ABS/NEW-private-postdeploy-verification
```

Необязательные флаги: `--public-media-evidence /ABS/public-media-HEAD.json`, `--owner-edit-review /ABS/owner-review.json`, `--previous-public-http /ABS/earlier-public-http.json`, `--previous-public-media-digests /ABS/earlier-public-media-GET-sha256.json` (последние два использовать вместе).

### 3.3. NEW — сравнение двух публичных CDN-снимков

`lib/public-cdn-drift.cjs`, `bin/compare-public-cdn.cjs`:

- При **одном и том же** публичном SHA256 release marker и версии сравнивает HTTP page status, **HTML SHA256**, конфликт «один ETag — разные байты», реальные 301 Location, robots/sitemap, status несуществующей страницы, доступность приватных документов и стабильность public root.
- Опционально сравнивает media originals/variants SHA256/size/MIME/status в разных GET receipts. Для **новой версии** выводит `INCOMPARABLE-PUBLIC-RELEASES`, а не называет ожидаемые изменения ошибками.
- В отчёте `drift.json` / `drift.md` нет сырого HTML/форм/HMAC. Данные, как и в других модулях, поступают из private operator-collected HTTPS файлов.

Команда:

```bash
node stage3/seo-engine/bin/compare-public-cdn.cjs \
  --before /ABS/previous-public-http.json \
  --after /ABS/current-public-http.json \
  --before-media /ABS/previous-public-media-GET-sha256.json \
  --after-media /ABS/current-public-media-GET-sha256.json \
  --out /ABS/NEW-private-cdn-diff
```

Media pair optional (оба флага вместе или оба опущены).

## 4. Полная последовательность первого реального сайта (ведущий)

1. Проверить последний HEAD обеих веток и текущие Actions. **Только ведущий** интегрирует `stage3/seo-engine/**`.
2. Из owner-authenticated `GET /api/sites/SITE-ID/published-site` получить JSON с `site`, `version`, `sourceRevision`. Локально хранить закрыто. Отдельно immutable sealed Approved Site v2, Blueprint. При наличии — owner visual review точной source revision и approval evidence index.
3. PHP `stage3/server/bin/export-published.php` сформирует official static release для root HTTPS `STAGE3_EXPORT_ORIGIN`, form collector при формах. Локальный PHP server должен быть поднят ведущим.
4. Единая **private** команда готовит localhost PHP QA + статический пакет + ZIP:

```bash
node stage3/seo-engine/bin/prepare-first-site.cjs \
  --approved-site /ABS/SEALED-V2 \
  --published-site /ABS/owner-published.json \
  --blueprint /ABS/approved-blueprint.json \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ \
  --static-export /ABS/official-static-release \
  --provider netlify \
  --workspace /ABS/NEW-private-first-site-candidate
```

При желании: `--visual-review-status`, `--approval-archive-index`, `--delivery-status`, `--owner-edit-review`, `--previous-upload` и другие documented flags в `STATIC-LAUNCH-WORKFLOW.md`. **Ведущий, не worker, контролирует приватные файлы.**
5. Локальный `bin/preview-static-upload.cjs --bundle /ABS/private-first-site-candidate/static-upload --port 8844` — только симуляция 301, настоящий хост после ручного деплоя обязателен.
6. Ведущий проверяет локальные gates, клиентские desktop/tablet/mobile макеты и разрешение на публикацию, ручной upload только `public-site.zip` или содержимого `static-upload/public` (НЕ приватного каталога!).
7. После настоящего HTTPS capture: `bin/capture-public-https.cjs` с public pages + bounded public-media-digests, затем новая команда `verify-deployed-site`. Отдельная проверка forms POST/recipient delivery/visual signoff остаётся у ведущего.
8. Если нет клиента или полных private source данных — **не инсценировать signoff и не создавать фиктивный GO**; ждать фактических данных или делать другую существенную независимую SEO-задачу.

## 5. Проверки и фактические ограничения

В SEO worker выполнены syntax checks CJS и изолированные V8 scenarios новых модулей (replay/stale HTTP, same-release HTML drift, new-release incomparable, pinned approval package). Новые focused Node smoke: `tests/post-deploy-verification-smoke.cjs`, `tests/public-cdn-drift-smoke.cjs`.

**Не подтверждено:** полный Node test suite/CI для этого HEAD, настоящий PHP, Chromium, TLS request, успешная заявка через POST, mail/Telegram, 3 устройства по клиентским макетам, реальное клиентское согласование. Не делать утверждений «всё запущено и протестировано» без фактов.

Проверки private files, public marker, hashes или статус `TECHNICALLY-MATCHED...` — **не криптографическая аутентификация сетевого происхождения сохранённого оператором JSON**. Данные сохраняются в private workspace (0700 каталоги и 0600 файлы), не коммитятся в GitHub.

## 6. Приоритеты следующего SEO-чата

- Сразу проверить актуальный HEAD SEO и HEAD ведущего, GitHub Actions и новые изменения PHP contracts.
- Если ведущий интегрирует SEO module, помочь ему точечно устранить фактические ошибки запуска первого сайта.
- Выбирать **крупные функциональные недостающие возможности**, а не ещё один бесконечный набор абстрактных smoke. Продолжить быстро и самостоятельно.
- Не трогать ничего за пределами `stage3/seo-engine/**`; PR/merge/deploy разрешены только ведущему. Никаких постоянных просьб к пользователю выбрать следующий шаг.

Это историческая передача отдельного worker; актуальный SHA всегда подтверждается live GitHub, потому что интегратор работает параллельно.
