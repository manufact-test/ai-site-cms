LATEST 29.10.2026: practical first-site integrated workflow — FIRST-SITE-INTEGRATION-SESSION.md and LIVE-ACCEPTANCE-WORKFLOW.md. Added one-command private local/public/search sessions (original real localhost PHP checks, static public ZIP, source-pinned lead relay, original human ledger, private workspace, post-public manual device/form matrix). No automatic GO/PR/merge/deploy; actual client browser, POST, TLS and signoff pending lead. Isolated V8 syntax/contract checks only, not complete Node CI.

# MANUFACT AI Site CMS — Финальная передача SEO-разработчику (29.10.2026)

## Роль, ветки, границы

Это ПАРАЛЛЕЛЬНЫЙ SEO-разработчик, **НЕ главный интегратор**. Главный разработчик автономно владеет CMS/PHP/Studio/SDK, merge и публикацией. Мы владеем исключительно SEO Engine.

- Репозиторий: https://github.com/manufact-test/ai-site-cms
- SEO ветка: feature/site-seo-engine
- **Строгая директория изменений: stage3/seo-engine/** — запрещено писать куда-либо ещё.
- Ветка ведущего: feature/stage3-ai-site-contract, в неё не коммитить.
- Проверенный функциональный commit последнего SEO захода: 240409b5b3c0948c8d85e7145414934e6c860c35. После финальной документации SEO HEAD новее: заново сверить GitHub.
- Последний известный commit ведущего: c31953de91d9895bb24884dee83c84f33b2148a3; GitHub Actions 40898152361 SUCCESS на момент подготовки этой передачи. Сверить актуальное состояние заново.
- Для SEO ветки отдельный GitHub Actions run **не подтверждён**. Выборочные исполненные V8 проверки НЕ являются Node CI, PHP end-to-end или клиентской приёмкой.
- Никаких PR, merge, deploy, правок main/workflows, stage3/server/**, stage3/bin/**, Studio, SDK, PHP CMS. Не публиковать сайт.
- Правило пользователя: **большие заходы около 30 минут полезной работы**. Если закончил первый блок быстро, сразу бери следующий крупный функциональный блок. Не уходить в сотни синтетических тестов, не заменять реальную CMS полировкой предположений.

## Что уже было готово

1. Offline SEO Brief → approved SEO Blueprint: intent/SEO metadata, страницы, информация о фактах и источниках, sections, links, CTA, Schema candidates, каноникал.
2. Sealed Approved Site v2 ↔ строго сверенный owner-published Site v1, медиа remapping, проверка owner edits.
3. PHP localhost technical SEO QA: HTML/robots/sitemap/301, headings, canonical/metadata/OG/JSON-LD, media, semantics, responsive, DesignGraph, typed components, navigation, forms.
4. Official PHP static release / reproducible public/ package, deterministic ZIP, host rewrites for Apache/Nginx/Netlify/Cloudflare, release fingerprints, upgrade/delta/rollback.
5. Private real public HTTPS and media GET SHA-256 receipt checks, 404/soft404, private artifact exposure, CDN drift, post-deployment technical parity; **только operator evidence**, не live Google/TLS authentication.
6. First-site launch cockpit, source-SHA-pinned operator checklist and original blocking gates, client manual signoff guards.
7. Offline Google Search Console Pages / Queries / Page+Query performance reader, exact GSC property/filter/source Blueprint SHA, multi-period history (2–24), editor decisions, editorial page briefs, approved contextual links, human SEO→CMS work packets.
8. Owner-declared release journal vs observed GSC metrics, private HTML Search dashboard, unified Client SEO Operations Workspace with launch and performance pages.

Документация: README.md, FIRST-SITE-RUNBOOK.md, STATIC-LAUNCH-WORKFLOW.md, INTEGRATION-HANDOFF.md, SEARCH-OPERATIONS-WORKFLOW.md, SEARCH-RELEASE-AND-DASHBOARD.md, FIRST-SITE-COCKPIT.md, FIRST-SITE-OPERATOR-LEDGER.md, SEO-OPERATOR-WORKSPACE.md.

## Последний большой функциональный заход — уже отправлен в GitHub

Функциональный commit: 240409b5b3c0948c8d85e7145414934e6c860c35. Изменены только 15 файлов внутри stage3/seo-engine/**.

### A. Search URL Indexing Intelligence
- lib/search-indexing.cjs — operator-normalized GSC URL/Status/Reason/Last crawled CSV, GSC property+HTTPS origin, approved Blueprint robots/canonical, optional actual Search Performance metrics. Непредставленный approved URL = UNOBSERVED, НЕ «excluded».
- bin/analyze-search-indexing.cjs — private indexing-intelligence.json/md, локальный index.html, private README.
- lib/search-indexing-view.cjs — responsive standalone HTML без JS/внешних ресурсов, безопасное экранирование и CSP.
- Human P1/P2 observation prompts по not-indexed при approved index, indexed при approved noindex, canonical anomalies и mismatched performance/indexing date evidence. Не выполняет Google URL Inspection.

### B. Longitudinal URL Indexing History
- lib/search-indexing-history.cjs и bin/analyze-indexing-history.cjs: 2–24 source-SHA-pinned snapshots, exact same Blueprint bytes/property/host/exportScope/page map. Явные статусные transitions и повторные наблюдения. Unknown/unobserved НЕ считается выпадением страницы из Google.

### C. Indexing → CMS manual implementation review
- lib/search-indexing-cms-review.cjs и bin/prepare-indexing-cms-review.cjs: matching approved Blueprint и actual owner-published Site v1, сверка текущих и утверждённых robots/canonical, existing auditSite, private field work packets. NO automatic edits, Save, Publish or owner override.

### D. Third optional phase of unified client workspace
- lib/seo-operator-workspace.cjs и bin/build-seo-operator-workspace.cjs: optional indexing.report in private config, indexing.html next to launch.html/search.html. Совпадение siteId обязательно; совместные Search History и URL Indexing требуют одинаковый raw Blueprint SHA256.
- Инструкция SEARCH-INDEXING-WORKFLOW.md и focused tests/search-indexing-smoke.cjs.
- README.md, SEO-OPERATOR-WORKSPACE.md, SEARCH-OPERATIONS-WORKFLOW.md обновлены.

Последние изменения push подтверждён; исходный рабочий head до документального коммита 73ce2dc596006fd9221c10b1ecc8b0fbf69b4913. Последний функциональный head после кода 240409b5b3c0948c8d85e7145414934e6c860c35.

## Факты верификации / реальные границы

- Проверен код нового indexing/indexing-history/indexing view/indexing→CMS/unified workspace на реальных blob bytes через исполняемые V8 scenarios, с настоящей структурой sample industrial Blueprint. Полный штатный Node smoke в Git checkout на текущем SEO HEAD и GitHub Actions worker ещё НЕ выполнен.
- НЕТ реальных клиентских Google Search Console CSV/URL Inspection/Google property auth, доказанной поисковой индексации, client-approved live website, POST/SMTP/Telegram, реальных браузерных испытаний, approved public HTTPS release.
- Google Search Console Page Indexing export examples может быть выборочным; status в CSV **оператор должен подтвердить явно**, не дорисовывать. Missing row — UNKNOWN, не excluded. Любое изменение status — повод для ручной проверки, не доказанный SEO результат.
- Все private CSV, персональные поисковые запросы, собственные Site v1 JSON, handoff/операторские решения остаются локально, ВНЕ GitHub checkout.
- Безопасный private-output-policy.cjs не позволяет писать такие отчёты в репозиторий (в том числе через symlink output parents), POSIX 0700/0600, без overwrite.

## Приоритет новому SEO-чату

**Не продолжать бесконечно изобретать offline отчёты. Приоритет — реальный end-to-end опыт первого сайта и интеграция с ведущим.**

1. Сразу прочитать HEAD двух веток, Actions и ключевую документацию из SEO ветки. Не предполагать, что известные SHA всё ещё HEAD.
2. Быстро проверить новые CLI и один-два комплексных Node smoke, если среда/checkout доступны; реальную проблему исправить без охоты за искусственными edge cases.
3. Затем взять **большой практический блок**: собрать компактный контракт передачи SEO Engine ведущему для воспроизводимого сценария approved Blueprint → saved owner Site v1 → PHP capture/static export → private launch review/candidate → actual public HTTPS/POST + client signoff → real GSC performance/indexing. Все реальные операции с чужим кодом/деплой — только у ведущего.
4. Если первый реальный сайт ещё не доступен — подготовить именно необходимый вход/операторские steps и перечислить реальные отсутствующие доказательства, не объявлять site ready.
5. В каждом большом заходе сохранять commit только stage3/seo-engine/**, затем GitHub Compare scope, точный SHA, Actions status. Без PR/merge/deploy.

Следующему чату НЕ надо просить пользователя повторять историю проекта: всё здесь и в перечисленных workflow docs. Не задавать лишних вопросов; действовать автономно и отправлять законченные блоки. Пользователь ценит скорость, продуктовую цель и правду о степени готовности.

**Этот чат заканчивает работу после финального документального коммита. Новый SEO worker продолжает независимую ветку, ведущий интегрирует отдельно.**

## Дополнение SEO-разработчика — 29.10.2026: контракт передачи ведущему

Созданы `lib/first-site-lead-relay.cjs`, `bin/build-first-site-lead-relay.cjs`, `tests/first-site-lead-relay-smoke.cjs` и `LEAD-INTEGRATION-RELAY.md`. Команда проверяет исходный private first-site candidate, подлинные байты публичного static upload / ZIP и их SHA256, связывает official manifest, owner-published version + sourceRevision claim и original technical gates. Опционально сверяет ранее сделанный post-deploy summary и GSC indexing/search history по exact Blueprint raw SHA256/siteId/HTTPS origin. Выдаёт частный `INTEGRATION-CONTRACT.json` и `LEAD-NEXT-ACTIONS.md`. Никаких Save/Publish/PR/deploy, Google auth, client-approved public site, реальных POST/браузера. Код не интегрирован ведущим; Node CI на SEO ветке по-прежнему не подтверждён. Следующий реальный шаг — ведущий берёт пакет на первом owner-published client site, проводит PHP/static/HTTPS/browser/form/client acceptance.

Точное состояние SHA и Actions сверять непосредственно перед интеграцией, старые из этого файла не являются текущим HEAD.

## Unified manual human acceptance in the private SEO workspace (29.10.2026)

After the actual operator completes the private live browser/device/form template, run first-site-live-acceptance.cjs review on the exact public lead relay and post-deploy summary. The resulting live-acceptance-review.json can be added to the existing unified private SEO Operator Workspace, along with the **original** lead relay contract, by adding the optional sibling config:

~~~json
"liveAcceptance": {
  "report": "/ABS/private/actual-live-acceptance-review.json",
  "contract": "/ABS/private/actual-public-phase-lead-relay/INTEGRATION-CONTRACT.json"
}
~~~

It MUST be accompanied by firstSite.summary and firstSite.postDeploy from the SAME original PHP/source and public release; exact raw SHA256 of the human report's lead contract, PHP summary and postDeploy report are compared. The workspace adds human.html with checked/pending/failed tasks and actual POST receipt counts, never an automatic GO. Offline claims remain subject to independent real TLS, screenshots, mail/Telegram delivery and client signoff.

The one-command first-site integration runner supports optional search-phase keys liveAcceptanceReview and liveAcceptanceContract **together**. This permits a single later private workspace including local launch, public technical evidence, human acceptance, real indexing and Search History, only when each source identity agrees. If the human review is not available, omit both keys and proceed with observational GSC reports without fabricating acceptance.


For immediate lead-owned integration of the complete next worker batch, see FIRST-SITE-LEAD-QUICKSTART.md. The worker has committed only stage3/seo-engine; the lead must inspect both HEADs, bring the subtree into their own checkout, run focused Node smoke and actual first-client PHP/HTTPS/browser/POST acceptance before making publication decisions.


## 29 October 2026 — Real client public capture workflow

**New recommended public read-only mode:** [PUBLIC-CAPTURE-QUICKSTART.md](PUBLIC-CAPTURE-QUICKSTART.md). `run-first-site-integration.cjs` now supports `phase: "public-capture"` after an explicit lead-owned manual deployment. It first verifies owner-published site/version/revision, official static manifest and every byte of original candidate/ZIP *without network access*. Only then it performs safe DNS-pinned TLS-verified HTTPS GET and media SHA256 capture, existing public verification, source-bound lead relay, unfilled real device/form acceptance and private dashboard in one new session folder. `INTEGRATION-SESSION-HANDOFF.md` is generated as a human-readable companion to the JSON. This is not a production deploy, client signoff or actual form POST. Focused offline smokes exist; full Node/real client acceptance must be done in the lead-integrated checkout.
