# AI Site CMS — передача SEO Engine следующему чату

## АКТУАЛЬНОЕ НАЧАЛО — ПОСЛЕДНИЙ ЗАХОД 28.10.2026

**Режим работы пользователя — обязательно:** делать *большой связанный заход с целевым объёмом примерно на 30 минут активной разработки*. Это не жёсткий таймер и не повод искусственно растягивать работу. Если первая задача закончена за 7–10 минут, **без просьб и ожидания сразу бери второй/третий крупный продуктовый блок**; закрой достаточный объём реализации и передай фактические коммиты. Короткие заходы на одну-две мелочи не подходят. Скорость важна: создать первую живую CMS, а не месяцами множить тесты. Только минимальные необходимые smoke и явные честные ограничения.

**Последний выполненный макрозаход:** теперь `lib/php-local-semantics.cjs` проверяет SHA-verified фактическую PHP-выдачу: H1/main, заголовки, ID, ALT, ARIA, доступные имена ссылок и реальные внутренние адреса/фрагменты. Технические поломки блокируют существующие release gates; рекомендации отделены от ошибок. Второй продуктовый блок — `lib/php-local-footprint.cjs`: измеряемые байты локального HTML, inline CSS/JS и всех полученных медиа; реалистичные нижняя/верхняя оценка кандидатного размера responsive медиа, возможный lazy-loading первого изображения и отсутствие width/height. Это **не** Core Web Vitals, не автоматический GO. Полный путь уже через старые capture → remediation → release review → `bundle.json`, `summary.json`, `launch-worksheet.md` и lead dossier. Историческая реализация CSS Theme/DesignGraph остаётся на месте.

**Проверки:** синтаксис всех изменённых CJS, два новые целевых V8 smoke с реально исполняемыми модулями (URL и Buffer эмулированы), плюс интеграционные positive/negative случаи добавлены в существующий PHP loopback smoke. Настоящий Node subprocess E2E, клиентский PHP+Chromium, POST и публичный HTTPS **пока не запускались** в этом чате; в checkout ведущего запустить три команды из FIRST-SITE-RUNBOOK и единую `first-site-check` на настоящем клиентском пакете. Нельзя выдавать V8 за реальную клиентскую приёмку.

**Критически важно для следующего чата:** начать с нового HEAD `feature/site-seo-engine` и `feature/stage3-ai-site-contract`, найти реальные проблемы первого сайта и/или последние новые must-have вертикали. Не создавать вторую CMS, не работать над PHP/SDK/Studio и не трогать main/production/PR/merge. Ведущий — единственный интегратор. Вся работа — исключительно `stage3/seo-engine/**`.

См. также отдельный **готовый для копирования текст**: [NEXT-CHAT-FIRST-MESSAGE.md](NEXT-CHAT-FIRST-MESSAGE.md).



**Дата:** 28 октября 2026. **Репозиторий:** https://github.com/manufact-test/ai-site-cms  
**Наша ветка:** `feature/site-seo-engine`. **Ведущий разработчик и единственный интегратор:** `feature/stage3-ai-site-contract`.  
**Рабочая область:** строго `stage3/seo-engine/**`. **Нельзя менять** `main`, SDK, PHP, Studio, component manifests, `docs/**`, `handoffs/**`, GitHub Actions; нельзя самостоятельно PR/merge/deploy.

## Начинай с этих документов

- [FIRST-SITE-RUNBOOK.md](FIRST-SITE-RUNBOOK.md) — свежая инструкция первого реального SEO/PHP-прогона одной командой.
- [INTEGRATION-HANDOFF.md](INTEGRATION-HANDOFF.md) и [README.md](README.md) — договорённости и существующие возможности.
- [MASTER-TZ.md](../../docs/MASTER-TZ.md) и [SEO-ENGINE-v2-ASSIGNMENT.md](../../handoffs/parallel/SEO-ENGINE-v2-ASSIGNMENT.md) — исходное ТЗ.
- [tests/smoke.cjs](tests/smoke.cjs) и [tests/php-html-capture-smoke.cjs](tests/php-html-capture-smoke.cjs) — минимальные интеграционные проверки.

**Сначала получи свежие SHA обеих веток через GitHub.** Ведущий параллельно активно коммитит, не полагайся на прошлые SHA. Предыдущий чат в финальном сообщении передаст итоговый SHA worker.

## Что уже сделано — НЕ переделывать

Полный Brief → SEO Blueprint; SEO семантика, H1, CTA, ссылки, OG, robots/indexation и рекомендации структурированных данных; архитектура, Design Graph, review Site v1, page HTML и 3-device parity, media и HTTP evidence, route migration/301, regression и traceability, guarded CMS change packets, acceptance/release gates, lead dossier. **Это рекомендации и технические проверки, без самостоятельных изменений CMS/автопубликации.**

Ведущий уже имеет собственную **sealed Approved Site v2**, трёх утверждённых статических прототипов, SDK, PHP renderer и screenshot capture. **НЕ строить вторую систему.** Наши `approved-site-bridge.cjs` и `php-capture.cjs` только читают официальные данные.

В worker уже есть захват настоящего локального PHP HTTP: HTML всех страниц, robots.txt, sitemap.xml, каждого 301 и каждого оригинального/адаптивного медиа с фактическими байтами, SHA256/MIME/ETag, PNG размерами и проверкой используемых OG и `img src/srcset`. Корректно учитываются реальные смонтированные адреса `/published/SITE-ID/` и только подтверждённые 301.

**Последний большой заход (этот чат):** `lib/php-local-publication.cjs` теперь признаёт `http://localhost` и `http://127.0.0.1` допустимыми тестовыми origin PHP, но не боевыми HTTPS. Ошибочные и смешанные sitemap loc не считаются полноценным sitemap. `lib/php-local-head.cjs` анализирует реальные HTTP-заголовки страниц и сопоставляет X-Robots-Tag/CSP, canonical, og:url, исходную индексируемость и origin из полученного sitemap. `lib/php-local-media.cjs` понимает локальный HTTP OG только при совпадении с этим origin. Все findings интегрированы в **старые** `remediation`, `release-review`, `package` и `lead-dossier`.

**Главное новое:** `bin/first-site-check.cjs` — одна команда для Verified Approved Site v2 → реальный localhost HTTP capture → единый SEO bundle → `summary.json`, `bundle.json`, `handoff.md`, `launch-worksheet.md` в новом каталоге. Не создаёт и не публикует сайт, не запускает PHP, не пишет в CMS. Полная инструкция FIRST-SITE-RUNBOOK.md.

```bash
node stage3/seo-engine/bin/first-site-check.cjs \
  --approved-site /ABS/sealed-v2 \
  --blueprint /ABS/approved-blueprint.json \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ \
  --evidence /ABS/new-evidence \
  --report /ABS/new-report
```

## Последнее обновление совместимости

Текущий PHP DesignGraph генерирует `picture/source`, CSS `backgroundMedia` и `video poster/source`; SEO HTTP-проверка теперь учитывает эти потребители при определении критичности ошибки медиа. Неизвестный опубликованный site-scoped asset становится ошибкой. Подробности в `FIRST-SITE-RUNBOOK.md`. Полный Node subprocess и первая клиентская приёмка остаются непроверенными.

## Главная задача следующего чата

**Не расширять бесконечно тесты и библиотеки.** Сначала получить реальный первый клиентский Approved Site v2/Blueprint в интегрированном checkout ведущего. Запустить один smoke и `first-site-check.cjs`, исправлять *выявленные проблемы продукта* **одним крупным заходом** в границах SEO worker. Если нужны изменения PHP/SDK/Studio — передать ведущему точные факты, не изменять его файлы. Цель — приблизить первую полноценную CMS к живому пользовательскому тесту и публикации.

## Честное состояние

В прошлом чате JS-модули и изменённые тесты прошли **синтаксическую** проверку, дополнены реальные localhost HTTP сценарии, но полный Node subprocess smoke, реальный Approved Site v2 клиента, визуальное совпадение с тремя утверждёнными прототипами, подлинная версия запущенного PHP, публичный HTTPS, настоящие формы и deploy **НЕ подтверждены**. Их должен проверить ведущий. Не называть это «полный PASS», пока не доказано.

**Режим работы:** крупные законченные задачи; минимальные нужные проверки; без мелкой бесконечной полировки. В конце каждого захода — коммит в worker ветке, точный SHA, проверка что все пути `stage3/seo-engine/**`, результаты и честные ограничения. Ведущий сливает ветку сам.

## Состояние после крупного интеграционного блока

Добавлены `php-local-forms` (без POST и утечки HMAC) и real-PHP metadata parity (Title/Description/OG/lang/robots), реальные blockers для сломанных robots/sitemap/OG и возможность `first-site-check --php-capture /ABS/lead/evidence.json` объединить официальные PHP-скриншоты с HTTP SEO анализом. Работает только в `stage3/seo-engine/**`. Все подробности и точные команды в `FIRST-SITE-RUNBOOK.md`; актуальный SHA всегда перепроверять. Прогон первого клиентского Approved Site v2 и реальные формы/HTTPS ещё не выполнены.

## Синхронизация с новым PHP FlexForm / formSteps ведущего

Ведущий обновил PHP/SDK (`feature/stage3-ai-site-contract` SHA `074018c63ffebf4ab8a89995f0c321dbbcfc8e02`): `lead-form-flex` теперь имеет индивидуальные `formFields`, условные зависимости `when`, опциональные `formSteps` (2–4 шага), встроенный JS-wizard и SHA-256 `script-src` в реальном HTTP CSP. **SEO не переписывает PHP.**

`php-local-forms` сверяет `extra1..3`, пользовательские поля (имя/тип/число вариантов radio/required), CSS-условные атрибуты, наличие marker `data-multi-step`, число `.lead-step`, навигационные кнопки next/back и индикатор прогресса. `php-local-head` дополнительно вычисляет SHA-256 фактически полученного inline JS и требует его точного разрешения в реально полученном `Content-Security-Policy`; если Site v1 объявляет wizard, но скрипт не выдан, это также блокировка.

Это проверки **структуры HTTP-выдачи**, а не исполнение JS и не корректность прохождения пользователем многошаговой формы. Нужны реальные desktop/tablet/mobile браузерные проверки, отправка формы, сохранение в CMS и проверка канала доставки. Если фактический JS другого содержания — должен совпадать именно с реальным HTTP CSP, а не с копией из исходника.


## Импортированный сайт с новыми media ID

Новый `--published-site /ABS/owner-published-site.json` загружает опубликованный Site v1 из приватного owner-authorized API ответа с `site` и `version`, после чего exact `retarget` сверяет его с sealed v2 и привязывает реальные HTTP байты медиа к исходным SHA-256. Это закрывает ложные 404 после официального импорта в CMS; подробности и инструкция в `FIRST-SITE-RUNBOOK.md`. Не менять PHP/SDK/Studio, не считать экспорт доказательством сервируемой ревизии. CLI без флага подходит только для прямой fixture без media remapping.


## Текущий большой заход — для следующего чата

После последнего SHA `502262de...` SEO worker расширен до **настоящего содержимого PHP** и личного рабочего листа первого сайта: `php-local-components.cjs`, `php-local-graph.cjs` и `first-site-worksheet.cjs` + общая интеграция в capture, remediation, release, package, dossier и CLI. Результат: при пропавшем тарифе, неверной CTA/цене, пропавшем шаге, сломанной radio вкладке, отличающемся DesignGraph тексте/ALT/cite/ссылке или неправильном CSS tab panel реальная выдача PHP порождает blocker. `first-site-check` создаёт `launch-worksheet.md` с отдельными desktop/tablet/mobile MANUAL CHECK UNCONFIRMED; не считать это визуальным PASS.

**Режим пользователя:** большие заходы с ориентиром около 30 минут активной разработки; после первого готового блока переходить к следующему без согласований, не заканчивать после нескольких минут. Это ориентир объёма, а не гарантированный таймер. Не растягивать мелочи и не строить лишние тесты. Работать только в `stage3/seo-engine/**` ветки worker; лид интегрирует сам.

Следующий реальный продуктовый шаг: ведущий получает настоящий sealed Approved Site v2 и его owner-exported `published-site` JSON; запускает действующий PHP, существующий loopback smoke и единую команду, исправляет реальные отклонения. В worker нельзя утверждать, что Chromium/PHP клиентского сайта, полный Node smoke, публичный HTTPS или form delivery прошли.


## Завершённый дополнительный блок по real PHP компонентам

Кроме business-компонентов добавлено 10 основных секций CMS: FAQ, услуги, отзывы, photo-gallery, adaptive-gallery, партнёрские логотипы, CTA-banner, contact-panel, image-showcase, media-story. Итого `php-local-components.cjs` сверяет **14 типов** по фактическому HTML, включая содержимое, медиа/ALT и маршруты кнопок. Ошибки являются техническими release blockers, не визуальным утверждением. Синтетические valid/invalid сценарии доступны в уже существующем smoke. Полный PHP/Node смок ведущего не заменяет. Продолжать только в worker directory; передача официальной CMS в ведение lead.


## Приоритет PHP DesignGraph и исправления ложных ошибок

Если типовой блок или form section имеют `designGraph`, PHP выводит именно граф, а не старые поля. SEO теперь исключает такие секции из ожидаемого legacy HTML/forms/wizard; source-bound граф анализируется отдельно. При необходимости это обнаруживается в одной существующей smoke. Также в 14 типовых компонентах проверены заголовки, вводные абзацы, тарифные условия, featured и заголовки сравнения. Всё в worker path. Полный first-site Node/PHP прогон и интеграция — у ведущего.


## Последний дополнительный этап: PHP OG/Twitter metadata parity

Сверяются все фактически отданные в PHP SEO social meta: OG type, locale, image URL, image ALT и Twitter title, description, card, image, ALT. Источник выбора изображения — текущий `publisher-media.cjs`, host — только публичный origin из действительного локального sitemap. Неправильное значение блокирует техническую приёмку через существующий `php-head:*`. Mocked PHP normal и целевые OG/Twitter drifts проверены в V8; настоящий первый клиентский PHP/Chromium остаётся задачей интегратора.


## Новый крупный завершённый SEO-заход — для следующего чата

Три полезные сквозные части: 1) реальные PHP desktop/mobile меню + hierarchy/header CTA/footer, точные blockers в package/worksheet; 2) повторная проверка `--previous-report` с `delta.md/json`, только сопоставимые evidence и no auto-closing; 3) поддержка **реальных редактирований владельцем после sealed-v2 импорта**: `--published-site` + `--owner-edit-review` с точным pinned site fingerprint + published version и ручным claim. Без ложного original-media SHA и без выдачи ручной записи за client approval. Дополнительно проверяются авторские внутренние graph link/button/image destinations и anchors. Всё только `stage3/seo-engine/**` в worker ветке, не трогать main/lead/php/Studio.

Важный реальный workflow: получил первый настоящий Approved Site v2 → leader import → owner edits → owner manual review + exact doc → реальный PHP capture → unified SEO package and visual review → исправления → `--previous-report` → manual GO. НЕТ настоящего client approved bundle, формы POST/production HTTPS/Chromium full visual test не подтверждены. Приоритет следующего чата: помогать интеграции первого клиента, не тратить часы на синтетическую дизайн-фабрику и лишние тесты. Команды и JSON: FIRST-SITE-RUNBOOK.md.

## Real PHP semantics and link-integrity gate (28.10.2026)

`lib/php-local-semantics.cjs` validates the actual SHA256-checked PHP HTML for unique main/H1, heading order, duplicate DOM IDs, image ALT presence, unlabeled form controls, broken ARIA references, unsafe links, escapes from the published site mount, unknown page/redirect/media routes and broken target fragments. Remote URLs are not crawled. Certain defects block existing release gates; possible heading/ARIA/new-tab accessibility concerns remain review items.

Available in `first-site-check` `summary.json`, `bundle.json`, remediation, release gates, lead dossier and the per-page `launch-worksheet.md`. Focused smoke: `node stage3/seo-engine/tests/php-local-semantics-smoke.cjs` (alongside existing smoke in the integrated lead checkout).

**Evidence limits:** static local HTML only. No JS runtime, keyboard/a11y certification, source revision attestation, real client first site, public HTTPS, Chromium visual match or delivered forms. Never automatic release approval.

## Source-bound PHP page footprint and loading-priority review (28.10.2026)

New `lib/php-local-footprint.cjs`: actual uncompressed HTML and inline CSS/JS bytes; per-page verified PHP media byte groups with responsive lower/upper representative candidate sizes; large image/video/payload observations; first main image lazy-loading candidate and images without dimensions. The notes are **review-only**, not blockers and not invented Core Web Vitals. Browser resource selection, gzip, field performance, LCP, INP and CLS remain unverified.

The existing one-run `first-site-check` reports `payload` in summary, `localPhpFootprint` in bundle, existing remediation/release reviews, lead dossier and post-page worksheet. Focused test: `node stage3/seo-engine/tests/php-local-footprint-smoke.cjs`. It never modifies PHP, CMS or publishing.


## Integration handoff: official static export, public HTTPS and honest previous-run delta (28.10.2026)

**Official static export parity:** Optional \`--static-export /ABS/official-static-release\` requires \`--published-site /ABS/owner-published.json\` including integer \`sourceRevision\`. Lead creates static export with EXISTING \`php stage3/server/bin/export-published.php SITE-ID /ABS/new-release\`. SEO does not edit PHP/deploy. All source/manifest files, redirects and asset SHA-256 checked; exact version and sourceRevision checked before local PHP acquisition; static sitemap/robots, fallback noindex refresh, all internal static links/assets/fragments/mount leaks reviewed. Local PHP page text/title/description/headings/CTA/image srcset/form field structure/CSS and inline wizard JS and actual media bytes compared. Disagreement blocks existing release gates as \`php-export:*\`. Agreement still cannot authenticate running PHP revision or approve client design. Static HTML redirect fallback is not HTTP 301: configure actual 301 on deployed host separately.

**Optional real public HTTPS read-only capture after lead deploy:**
\`\`\`bash
node stage3/seo-engine/bin/capture-public-https.cjs \
  --approved-site /ABS/SEALED-V2 \
  --published-site /ABS/owner-published.json \
  --origin https://approved.example/published/SITE-ID/ \
  --out /ABS/new-public-http.json \
  --media-out /ABS/new-public-media.json
\`\`\`
If the owner edited the imported site, append \`--owner-edit-review /ABS/manual-owner-review.json\`. Requires explicit DNS HTTPS:443 host with either root or exact CMS mount; resolves and pins public IP, rejects mixed/private addresses, verifies TLS hostname, issues GET only for pages/robots/sitemap/301 and HEAD only for original media. No redirects followed, POST, JS or form delivery. Missing HEAD support (405/501) marks evidence partial instead of pretending GET fails. Never transmits form submission. Results saved 0600 outside sealed input. DO NOT commit raw HTML containing tokens.

**Unified first-site report with optional public transcripts and static export:**
\`\`\`bash
node stage3/seo-engine/bin/first-site-check.cjs \
  --approved-site /ABS/SEALED-V2 \
  --blueprint /ABS/blueprint.json \
  --published-site /ABS/owner-published.json \
  --static-export /ABS/official-static-release \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ \
  --public-http-evidence /ABS/new-public-http.json \
  --public-media-evidence /ABS/new-public-media.json \
  --evidence /ABS/new-local-evidence \
  --report /ABS/new-report
\`\`\`
The public and static flags are optional, but static export requires owner-published version/sourceRevision; public transcript imports are **caller-supplied JSON, not authenticated network calls by first-site-check**. They flow through existing delivery/media reviews, remediation and release gates. No automatic release authorization and no fabricated verification of public HTTPS, forms, client approval or running PHP revision.

**Delta scope:** Existing \`--previous-report\` now covers PHP semantic links, media/HTML footprint, static export and optional public HTTP/media. It refuses to compare changed public-host cohorts or different static-export versions as confirmed fixes. Stable finding identities include href, fragment, targetPageId, graph style property.

Focused tests: \`php-local-static-export-smoke.cjs\`, \`php-local-report-delta-smoke.cjs\`, \`public-https-capture-smoke.cjs\`, plus existing \`php-html-capture-smoke.cjs\`. Worker performed syntax and selected isolated V8 mocks; real Node PHP/browser/HTTPS customer E2E and form POST are NOT confirmed. Actual first customer release is the next priority; avoid proliferating labs or extra CMS code.

## Owner per-form delivery routing readiness — PHP FormRoutes integration (28.10.2026)

Lead PHP now supports owner-only per-section delivery routes: inherit, custom, off, plus global email/Telegram settings. A structurally correct published HTML form does not prove notification delivery.

Optional CLI flag: --delivery-status /ABS/private-owner-delivery-status.json together with --published-site /ABS/owner-published.json. Owner must export authorized GET /api/sites/SITE-ID/delivery to a LOCAL private JSON file. Never check the raw file into Git or attach it to a public ticket: it contains private addresses, chat IDs, operator data and submission IDs. File must remain unchanged through capture. The SEO worker never authenticates to or calls this owner API.

New lib/php-local-delivery-readiness.cjs checks published form sections (excluding graph-overridden legacy sections), routes present, inherit/custom/off modes, transport readiness and configured recipient existence. It emits no email/chat IDs or submission history. Results go to existing remediation, release gates, bundle.deliveryReadiness, summary.deliveryReadiness, lead dossier, worksheet and previous-run delta. Disabled notifications require a manual intentionality review; selected channels without a viable recipient/route produce a blocker. A public form collector can still store submissions when notification channels are off.

These are owner-SUPPLIED configuration hints, NOT actual accepted POSTs, CMS stored leads, mail/Telegram receipt or authenticated delivery. An apparently configured route is NOT proof that messages arrived. The worker cannot claim client acceptance. For changes in current published version, delta treats owner routing evidence as incomparable rather than automatically fixed.

Focused V8 smoke: node stage3/seo-engine/tests/php-local-delivery-readiness-smoke.cjs. Real Node/PHP/browser/HTTPS/form-delivery E2E remain for lead. Note stage3/bin/cms-release.cjs is the lead's CMS engine shipment tool; not a customer site deploy or SEO runtime, and it does not bundle SEO worker code.

## Public static deployment parity + real media GET SHA256 — integration block (29.10.2026)

**Why:** Previously official `export-published.php` and public HTTPS JSON were audited separately. A locally correct static release could be absent or changed at the actual host. `lib/public-static-parity.cjs` now cross-checks operator-supplied public HTTPS *root* captures with the owner-pinned official static release. Compares every page HTTP 200 + exact route, main text, title/description, headings, section/CTA/image/form/CSS/wizard structure, canonical/robots/html lang/JSON-LD, root robots.txt and sitemap.xml bodies, real 301 Location for every declared legacy alias, and original public asset HEAD status/MIME/length vs official byte sizes. Different host or `/published/SITE-ID/` mount is expressly **not comparable** to a root static export, becomes a review rather than false PASS. Errors route to `public-static-deployment-drift` release blockers, task list, dossier, worksheet and previous-run delta. No public request is made by `first-site-check` itself; supplied HTTP JSON provenance remains unauthenticated.

**How to run the public static site SHA256 check (explicit opt-in, no form submissions):**

```bash
node stage3/seo-engine/bin/capture-public-https.cjs \
  --approved-site /ABS/SEALED-V2 \
  --published-site /ABS/owner-published.json \
  --origin https://your-static-host.example/ \
  --out /ABS/public-http.json \
  --media-out /ABS/public-media-head.json \
  --static-export /ABS/official-static-release \
  --media-digest-out /ABS/public-media-sha256.json
```

The two last flags must always be supplied together. Existing CLI without them still uses only page GET and optional media HEAD. The new `public-media-byte-verification.cjs` compares **every original and responsive variant** declared by Site v1 to the official export SHA256. Uses pinned public-DNS TLS-verified HTTPS GET streaming: 12,000,000 bytes max per resource, 180,000,000 bytes total; no redirects followed; no POST; no binary media stored. The private `public-media-sha256.json` contains URL, status, MIME, byte count and SHA256 receipt ONLY (never actual images). It can be expensive for a large customer site; run only when explicitly approving this production host and network traffic. Operator API `sourceRevision`, static export version and manifest are checked before capture and rechecked afterward. The static export must declare exactly that HTTPS production root.

Import the operator-captured evidence to the existing local first-site report with these optional flags (along with the standard mandatory --approved-site, --blueprint, --origin [LOCALHOST], --evidence and --report flags):

```bash
  --published-site /ABS/owner-published.json \
  --static-export /ABS/official-static-release \
  --public-http-evidence /ABS/public-http.json \
  --public-media-evidence /ABS/public-media-head.json \
  --public-media-digests /ABS/public-media-sha256.json
```

`--public-media-digests` requires `--static-export` and version/sourceRevision. The new digest receipt is validated against the same exact static manifest SHA256, source revision, assets and URL origin. Mismatches become `public-bytes:*` tasks and blocking `public-static-media-sha256-integrity`. Missing responsive variants or wrong GET MIME/status/length likewise block. Included in `bundle.publicMediaBytes`, `summary.publicMediaBytes`, dossier, worksheet and previous-run delta. Delta comparisons require the **same static manifest SHA and HTTPS host** to avoid marking unrelated releases as fixed.

**Critical evidence limits:** A saved JSON receipt can be forged; this tool cannot authenticate network provenance after import. An observed SHA match is not client acceptance, running PHP code identity, browser layout equality, real lead POST/recipient delivery, or authorization to deploy. Static export redirect HTML fallbacks are NOT real HTTP 301; real host rewrites must be configured by the lead. Never upload private evidence with customer form HMAC values to GitHub. Existing worker scope `stage3/seo-engine/**` only; no PHP, main or merge.

Focused checks (run in integrated Node checkout): `node stage3/seo-engine/tests/public-static-parity-smoke.cjs` and `node stage3/seo-engine/tests/public-media-byte-verification-smoke.cjs`. This worker session completed V8 execution with mocked dependencies and public transport, plus CJS syntax checks, not live Node/PHP/browser/customer-domain acceptance.

## True static-host HTTP 301 deployment handoff — operator-only (29.10.2026)

Official `stage3/server/bin/export-published.php` creates static HTML redirects with noindex + meta-refresh, NOT a real HTTP 301. Our new `lib/static-host-rewrites.cjs` builds **alternative** Apache mod_rewrite and Nginx exact-match `return 301` rules for every declared old Site v1 route, pinned to the **SHA256-verified official static release**, publishedVersion, sourceRevision and declared HTTPS static root. Rejects redirects that are duplicated, collide with real pages or do not point at a real published page; refuses exports already containing static-publication blocking findings. It never edits or accesses the hosted web server.

Generate local operator-ready files (explicit, no deployment):
```bash
node stage3/seo-engine/bin/prepare-static-host.cjs \
  --approved-site /ABS/SEALED-V2 \
  --published-site /ABS/owner-published.json \
  --static-export /ABS/official-static-release \
  --out /ABS/new-static-host-plan
```
Add `--owner-edit-review /ABS/manual-owner-review.json` when the owner changed the imported Site v1. Output is a NEW private directory: `apache.htaccess` (contents suitable for root `.htaccess` after manual installation), `nginx-redirects.conf` (exact `location = /old/ { return 301 /new/; }` blocks for existing HTTPS server context), `plan.json` (revision and file SHA256 inventory) and `HOSTING-HANDOFF.md` (site/document root, route counts, manual curl -I probes). Choose ONE server format and review its interaction with existing site rules; configure TLS, document root, index, CSP/privacy and form collector separately. This does not overwrite an existing plan or make any live server writes. Real public 301 + Location must be confirmed by the public HTTPS capture before approval.

Focused isolated V8 test: `node stage3/seo-engine/tests/static-host-rewrites-smoke.cjs`; full Node/Apache/Nginx/client-host checks have NOT been run in the SEO worker. The lead remains sole integrator/deployer and may choose not to deploy static output at all; keep the PHP route separate.

## 29.10.2026 — Дополнительный большой заход после замечания о темпе

**Ритм:** каждый заход — примерно 30 минут активной разработки, а не остановка через 10–12 минут, когда первые блоки готовы. После раннего завершения одного блока сразу брать следующий крупный. Никаких бесконечных искусственных тестов. Всё — строго stage3/seo-engine/**, без PR/merge/deploy.

### Реальные production-изменения

- `public-static-head.cjs`: паритет действительного публичного OG/Twitter/canonical/JSON-LD **по значениям**, а не только типам; не выводить содержимое в отчёт.
- `public-static-sensitive-markup.cjs`: защита публичных form action, submit formaction, hidden _release/_token (только SHA256), внешних JS/CSS loaders/SRI, iframe, link rel/target, image loading и inline JS/CSS handler атрибутов. Подмена адреса заявки или токена — блокирующее отклонение от verified official static export.
- `public-static-csp.cjs`: общественный CSP на реальном HTTPS не должен блокировать inline CMS CSS, wizard JS, style/event attrs или form-action на отдельном HTTPS collector. Error -> `public-static-csp-blocks-site`; отсутствующий/сложный CSP -> manual review. Никакого фактического POST.
- `public-https-capture.cjs`: безопасный GET заведомо несуществующего маршрута (ожидаем HTTP 404/410, иначе soft-404), повторный GET homepage в конце сбора публичных страниц/медиа с SHA256/status сравнением (защита от смешанных релизов; не аутентификация исходников). Pinned DNS отклоняет reserved/TEST-NET/benchmark/private/6to4 IP.
- `public-static-parity.cjs`: проверка страницы, full SEO head, POST/anti-spam markers, CSP, 301, robots/sitemap, image HEAD и сильного GET SHA256. Успешный GET закрывает отсутствие HEAD (405/501), а противоречивый HEAD остаётся warning. Нельзя заявлять полное покрытие без 404 probe и стабильной главной.
- `php-local-static-export.cjs`: теперь включает img srcset, CSS url() и проверяет http/ftp mixed-content для изображений и фонов.
- `first-site-report-delta.cjs`: изменение публичного HTML SHA256 / ETag и конфликт CDN кеша только при совпадении конкретного SHA256 официального static manifest и HTTPS host. Иначе сравнение недопустимо.
- `first-site-check` и `php-html-capture`: приватные каталоги 0700 и файлы 0600. Public evidence JSON также 0600.
- `prepare-static-host`: ШЕСТЬ результатов: apache.htaccess, nginx-redirects.conf, netlify._redirects (forced 301! поверх static HTML fallback), cloudflare-pages._redirects (301; проверить Pages Functions), plan.json, HOSTING-HANDOFF.md. Провайдерские _redirects вручную переименовываются в publish директории; никто не деплоит. Документация: https://docs.netlify.com/manage/routing/redirects/redirect-options/ и https://developers.cloudflare.com/pages/configuration/redirects/.

Для запуска остаются предыдущие команды capture-public-https, prepare-static-host, first-site-check в этом файле. Ведущий должен интегрировать latest HEAD SEO в свой checkout, реально выполнить Node+PHP+Chromium+HTTPS/form POST на первом клиенте. Изолированные V8/syntax проверки — не полноценный Node/CI/реальный клиентский PASS.

**Этот блок актуальнее ранних исторических секций документа (там ещё может быть написано про четыре вместо шести файлов).**
