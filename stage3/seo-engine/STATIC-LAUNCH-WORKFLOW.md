LATEST 29.10.2026: practical first-site integrated workflow — FIRST-SITE-INTEGRATION-SESSION.md and LIVE-ACCEPTANCE-WORKFLOW.md. Added one-command private local/public/search sessions (original real localhost PHP checks, static public ZIP, source-pinned lead relay, original human ledger, private workspace, post-public manual device/form matrix). No automatic GO/PR/merge/deploy; actual client browser, POST, TLS and signoff pending lead. Isolated V8 syntax/contract checks only, not complete Node CI.

> **АКТУАЛЬНАЯ ПЕРЕДАЧА 29.10.2026:** открой [SEO-WORKER-HANDOFF-2026-10-29.md](SEO-WORKER-HANDOFF-2026-10-29.md) прежде, чем пользоваться историческим текстом ниже. Новый контур: `verify-deployed-site.cjs` (public HTTPS / ZIP / owner sourceRevision / SHA256 / freshness / ручной signoff) и `compare-public-cdn.cjs` (один официальный релиз, два HTTPS/media snapshot, HTML/301/robots/cache drift). Границы: только `stage3/seo-engine/**`, ведущий делает merge/deploy; без ложного CI/клиентской приёмки. Большие заходы около 30 минут активной работы, следующий блок сразу после раннего завершения первого.

# AI Site CMS — статический запуск первого сайта (29 октября 2026)

**Владелец интеграции:** основной разработчик в `feature/stage3-ai-site-contract`.  
**Отдельная рабочая ветка:** `feature/site-seo-engine`.  
**Допустимые изменения worker:** только `stage3/seo-engine/**`.  
**Статус:** офлайн-сборка и проверка; это НЕ деплой, одобрение клиента, браузерная проверка и не запуск CMS. Работать в Node 20+ checkout ведущего.

## 1. Откуда берётся релиз

Используется ТОЛЬКО опубликованный CMS Site v1 из owner-authenticated `GET /api/sites/SITE-ID/published-site` с `version` и `sourceRevision`; sealed Approved Site v2; утверждённый SEO Blueprint; официальный PHP-скрипт `stage3/server/bin/export-published.php` (опубликованная версия, не draft).

Ведущий самостоятельно экспортирует статический сайт, предварительно установив HTTPS origin через `STAGE3_EXPORT_ORIGIN`. Если у сайта есть формы, официальный PHP экспорт требует `STAGE3_FORM_ENDPOINT` и подписанные формы с отдельным HTTPS collector. Никакие приватные ключи не добавлять в GitHub или в публичный статический пакет.

Новый сборщик проверяет официальный `release-manifest.json` и **каждый SHA256 HTML, редиректов, robots/sitemap, оригиналов и адаптивных медиа**. Для опубликованной версии, владельца и источника требует совпадающий owner API record. Ошибки экспорта должны быть исправлены ДО сборки.

## 2. Одна команда подготовки первого сайта

Когда localhost PHP уже запущен отдельно ведущим:

```bash
node stage3/seo-engine/bin/prepare-first-site.cjs \
  --approved-site /ABS/SEALED-APPROVED-SITE \
  --published-site /ABS/owner-published.json \
  --blueprint /ABS/approved-blueprint.json \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ \
  --static-export /ABS/official-static-export \
  --provider cloudflare-pages \
  --workspace /ABS/NEW-private-first-site-workspace
```

`--provider` выбирается из `apache`, `nginx`, `netlify`, `cloudflare-pages`. Дополнительные приватные флаги: `--owner-edit-review`, `--php-capture`, `--previous-report`, `--public-http-evidence`, `--public-media-evidence`, `--public-media-digests`, `--delivery-status` (все с отдельными абсолютными путями). Только новый каталог, без перезаписи.

В одном приватном workspace создаются:

- `local-php-evidence/` — локальные PHP HTML, медиа, URL, заголовки. **Содержат потенциально чувствительные токены. Не публиковать**.
- `seo-report/summary.json`, `bundle.json`, `launch-worksheet.md` — реальные findings и SEO release blockers.
- `static-upload/public/` — **единственная директория для будущей ручной загрузки на хостинг**.
- `static-upload/HANDOFF.md`, `upload-inventory.json` — приватные инструкции и SHA256 всех публичных файлов; при nginx дополнительно приватный `nginx-redirects.conf`.
- `CANDIDATE-STATUS.json` и `CANDIDATE-HANDOFF.md` — итог с `TECHNICAL-BLOCKED` или `MANUAL-ACCEPTANCE-REQUIRED`. **Никогда автоматический GO.**

При сбое каталог может остаться частично заполненным, повторная попытка только с НОВЫМ workspace.

### Если нужен только готовый статический upload

```bash
node stage3/seo-engine/bin/prepare-static-upload.cjs \
  --approved-site /ABS/SEALED-APPROVED-SITE \
  --published-site /ABS/owner-published.json \
  --static-export /ABS/official-static-export \
  --provider netlify \
  --out /ABS/NEW-private-upload
```

В `public/`: страницы и медиа ровно из официального манифеста, robots.txt, sitemap.xml, HTML fallback старых ссылок; **реальный собственный 404.html**, публичный `ai-site-release.json` только с `officialManifestSha256` и `publishedVersion`; для Netlify/Cloudflare Pages также `_redirects` и `_headers`, для Apache — `.htaccess`. Nginx config находится ВНЕ public и вставляется оператором в HTTPS server. `release-manifest.json`, owner API, локальные диагностические отчёты и sourceRevision в `public/` НЕ копируются.

Cloudflare Pages по умолчанию может направлять неизвестные пути на главную, если отсутствует root `404.html` — теперь он есть. Netlify uses forced 301! для старых адресов, иначе legacy `old/index.html` перекрывает rewrite. Cloudflare Pages применяет redirect к static assets, но НЕ к Pages Functions. Apache/Nginx файлы требуют ручной установки и корректного virtual host. При внешнем reverse proxy нужно проверять поведение реального маршрутизатора.

`_headers` автоматически добавляет только безопасные nosniff/referrer и revalidation HTML. Жёсткий CSP НЕ включается без проверки браузера/форм; отдельный `public-static-csp` анализ реального HTTPS создаёт блокер, если CSP не допускает CSS/JS/Form POST, и review при отсутствии CSP.

## 3. Локальный просмотр готового upload

```bash
node stage3/seo-engine/bin/preview-static-upload.cjs \
  --bundle /ABS/NEW-private-upload \
  --port 8844
```

Открыть вручную: http://127.0.0.1:8844/

Preview предварительно сверяет SHA256 и размеры КАЖДОГО публичного файла с приватным `upload-inventory.json`, отклоняет лишние/symlink файлы, выдаёт локальные 200, 301 и 404; поддерживает только GET/HEAD, POST запрещён. Слушает только `127.0.0.1`. Это симуляция ожидаемых правил, НЕ доказательство их установки на Netlify/Nginx/Cloudflare/Apache. Если файлы изменятся после проверки — 503 вместо подменённого HTML.

## 4. Офлайн-проверка изменения между релизами

```bash
node stage3/seo-engine/bin/compare-static-uploads.cjs \
  --before /ABS/previous-private-upload \
  --after /ABS/new-private-upload \
  --out /ABS/NEW-private-comparison
```

Выводит `impact.json`, `impact.md` и обоснованные блокировки: удаление индексируемой страницы без 301, потеря historic 301, случайный `noindex`, исчезновение canonical, изменение официального SHA256 при том же publishedVersion, rollback и смена публичного домена. Отдельно предупреждает о media bytes, изменившихся по тому же URL (CDN cache), robots и sitemap. Сравнивает именно два проверенных статических upload, НЕ живой хост.

## 5. Настоящий HTTPS — после установки и разрешения ведущего

```bash
node stage3/seo-engine/bin/capture-public-https.cjs \
  --approved-site /ABS/SEALED-APPROVED-SITE \
  --published-site /ABS/owner-published.json \
  --origin https://public-domain.example/ \
  --out /ABS/new-public-http.json \
  --media-out /ABS/new-public-media-head.json \
  --static-export /ABS/official-static-export \
  --media-digest-out /ABS/new-public-image-digests.json
```

Проверяет реальный HTTPS на том же домене: страницы, настоящие HTTP 301 Location, robots/sitemap, HEAD оригиналов и ограниченные GET SHA256 оригиналов/вариантов; неизвестный route должен вернуть 404/410. Дополнительно проверяются **четыре внутренние служебные пути** (`release-manifest.json`, `upload-inventory.json`, `CANDIDATE-STATUS.json`, `CANDIDATE-HANDOFF.md`) — в JSON остаются ТОЛЬКО код статуса и SHA256 ответа, а НЕ содержимое. HTTP 200 на служебном файле — блокер. `ai-site-release.json` должен совпасть с digest/version владельца. Корневая HTML страница повторно считывается по SHA256 в конце, чтобы не принять смесь двух деплоев.

Хост DNS проверяется на non-public IP, HTTPS TLS hostname verified, GET/HEAD bounded, без POST, без перенаправлений, без записи живого хоста. Однако сохранённый оператором JSON не является криптографически подписанным доказательством сетевого происхождения или того, какой исполняемый PHP запущен. Настоящие form POST, получатель, responsive/browser/UI, Web Vitals, согласование клиента и публикация остаются у ведущего.

## 6. Проверки кода

Релевантные быстрые Node smoke (в интегрированном checkout):
```bash
node stage3/seo-engine/tests/static-host-bundle-smoke.cjs
node stage3/seo-engine/tests/static-host-rewrites-smoke.cjs
node stage3/seo-engine/tests/public-static-parity-smoke.cjs
node stage3/seo-engine/tests/public-https-capture-smoke.cjs
node stage3/seo-engine/tests/static-upload-impact-smoke.cjs
```

В этом worker-чате доступен GitHub connector, но нет клонирования приватного репозитория внутри Node runtime (сеть недоступна). CJS syntax и отдельные изолированные V8-smoke — не эквивалент интеграционного Node/PHP/Chromium/CI.

## 7. Дальше

Ведущий проверяет новый HEAD `feature/site-seo-engine`, сам интегрирует, проводит один реальный тест на клиентском источнике, затем устраняет найденное. Worker НЕ редактирует `stage3/server/**`, `stage3/studio/**`, main, SDK, workflows и не делает PR/merge/deploy.

**Ритм работы:** полноценные большие заходы около 30 минут, после раннего завершения одной задачи брать вторую; только нужные smoke, не множить тесты вместо CMS.


## Дополнение от 29.10.2026: безопасная публикация и доказательства владельца

### Приватные наблюдения PHP CMS

**Сверка визуальных замечаний** (не означает подтверждённое согласие клиента):

\`GET /api/sites/SITE-ID/visual-review?revision=PUBLISHED_SOURCE_REVISION\` → сохранить приватный JSON; в \`prepare-first-site\` или \`first-site-check\` передать \`--visual-review-status /ABS/private-owner-visual.json\`. Revision должен **строго** совпасть с \`sourceRevision\` из owner-authenticated \`GET /api/sites/SITE-ID/published-site\`, а не с текущим draft. Любые нерешённые замечания для desktop/tablet/mobile блокируют release gate \`unresolved-owner-visual-review\`. Текст заметок, имена и внутренние finding ID не публикуются.

**Сверка архивированных утверждённых макетов**:

\`GET /api/sites/SITE-ID/approval-evidence\` → сохранить owner-only JSON; добавить \`--approval-archive-index /ABS/private-owner-approval-index.json\`. Проверяются SHA256 оригинального sealed-v2 handoff, site.json, трёх главных прототипов, двух документов и per-page desktop/tablet/mobile references. При отсутствии/повреждении записей: blocker \`owner-approved-prototype-archive-incomplete\`. Сам архив CMS **не доказывает фактического согласия клиента** и не заменяет визуальную приёмку.

### Воспроизводимый ZIP и rollback при обновлении

\`node stage3/seo-engine/bin/zip-static-upload.cjs --bundle /ABS/verified-private-upload --out /ABS/NEW-public-site.zip\`

ZIP содержит только публичные файлы verified \`static-upload/public\`, в стабильном порядке без timestamp-зависимости. Отдельный \`static-upload-zip-verify.cjs\` заново проверяет central/local ZIP records, CRC32, SHA256 и exact asset inventory. Чувствительные owner records/manifest и диагностические файлы не включаются. ZIP не загружается автоматически.

\`prepare-first-site\` **всегда** создаёт \`public-site.zip\`, а пакет появляется по конечному пути **только после полного завершения во временной папке**. При ошибке staging удаляется.

Для обновления добавьте \`--previous-upload /ABS/previous-private-static-upload\`: создаются приватные \`UPGRADE-IMPACT.json\`, \`UPGRADE-IMPACT.md\` и \`rollback-public-site.zip\` (только старые публичные файлы, SHA256). Потеря 301/noindex/canonical или переписанная без повышения publishedVersion версия блокируют кандидата. Откат требует ручных действий и не откатывает CMS DB/формы. \`--previous-report\` — отдельный параметр для сравнения SEO отчётов, не путать.

**Для ведущего:** интегрировать только \`stage3/seo-engine/**\`, запустить реальный Node + PHP localhost + Chromium + production HTTPS/form POST на первом клиенте, подтвердить три утверждённых изображения и фактическое согласие клиента. Worker не выполнял production deploy/PR/merge и не выдаёт синтаксические/изолированные V8 проверки за полноценный GitHub CI PASS.

**Режим захода:** примерно 30 минут активной крупной разработки; после завершения одного блока раньше времени брать следующий, без бесконечных искусственных тестов.
