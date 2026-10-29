LATEST 29.10.2026: practical first-site integrated workflow — FIRST-SITE-INTEGRATION-SESSION.md and LIVE-ACCEPTANCE-WORKFLOW.md. Added one-command private local/public/search sessions (original real localhost PHP checks, static public ZIP, source-pinned lead relay, original human ledger, private workspace, post-public manual device/form matrix). No automatic GO/PR/merge/deploy; actual client browser, POST, TLS and signoff pending lead. Isolated V8 syntax/contract checks only, not complete Node CI.

# Первое сообщение новому самостоятельному SEO-разработчику

Привет! Продолжаем разработку MANUFACT AI Site CMS. Ты — самостоятельный SEO Engine разработчик, **не главный интегратор**. Предыдущий SEO-чат завершён планово, после большого самостоятельного функционального захода и актуализации документации. Главный разработчик работает параллельно в отдельном чате; он один интегрирует CMS и выполняет публикации.

**GitHub:** https://github.com/manufact-test/ai-site-cms

**Наша ветка:** feature/site-seo-engine

**Жёсткий scope:** только stage3/seo-engine/**. Нельзя менять stage3/server/**, stage3/studio/**, SDK, PHP CMS, workflows, main, feature/stage3-ai-site-contract и другие директории; нельзя делать PR, merge, deploy или публичный релиз.

**Отправная точка кода:** функциональный коммит 240409b5b3c0948c8d85e7145414934e6c860c35. После него сделан коммит финальной документации. Поэтому ПЕРВЫМ ДЕЛОМ самостоятельно проверь **актуальный SEO HEAD** в GitHub (он новее), HEAD ветки ведущего feature/stage3-ai-site-contract и последние GitHub Actions. Не верь старым SHA и не начинай с предположения о CI SUCCESS на нашей ветке.

**Начни с документов:**
- stage3/seo-engine/SEO-WORKER-TRANSFER-2026-10-29.md — новая полная техническая передача.
- stage3/seo-engine/SEARCH-INDEXING-WORKFLOW.md — новый продуктовый блок индексации.
- stage3/seo-engine/SEO-OPERATOR-WORKSPACE.md — unified private workspace.
- stage3/seo-engine/SEARCH-OPERATIONS-WORKFLOW.md — GSC performance, historical reports, human decisions, CMS handoff.
- stage3/seo-engine/FIRST-SITE-RUNBOOK.md, INTEGRATION-HANDOFF.md, STATIC-LAUNCH-WORKFLOW.md — реальный первый клиентский сайт.
- stage3/seo-engine/README.md — полный каталог возможностей.

**Что уже есть:** Brief/Blueprint, sealed Approved Site v2 ↔ owner-published Site v1, PHP/HTML SEO QA, DesignGraph, official static export and ZIP, real HTTPS/media evidence analysis, rollback and CDN drift, private first-site launch cockpit and human gates, offline Google Search Console performance and 2–24-period trends, editorial worklist and CMS field packets, release follow-up, unified private dashboards.

**Что завершено последним заходом:** независимый private Google URL Indexing Intelligence из operator-normalized CSV; сопоставление status с approved robots/canonical; 2–24-snapshot history; manual indexing→CMS work packets по настоящей Site v1; third indexing.html panel в unified workspace. Коммит: 240409b5b3c0948c8d85e7145414934e6c860c35. Все файлы строго в SEO scope.

**Честные ограничения:** для нашего HEAD нет подтверждённого GitHub CI; полноценный Node smoke и реальные клиентские GSC exports не проверены. В системе нет live Google auth/URL Inspection, нет фактической первой клиентской публикации, POST/email/Telegram/client acceptance. Missing GSC URL — UNOBSERVED, а не деиндексация; ни один private HTML dashboard не является опубликованным сайтом. Не утверждай GO без реальных свидетельств от ведущего.

**Рабочий регламент пользователя:** большие автономные заходы, ориентир около 30 минут полезной разработки; если блок сделан за 10–18 минут — бери ещё один существенный блок, не останавливайся и не добивай время бесконечными синтетическими тестами. Цель — закончить настоящую CMS как можно быстрее и поправлять то, что проявляется в использовании.

**Приоритет следующего захода:** не множить новые offline отчёты ради количества. Быстро проверь новые indexing+workspace CLI и минимум нужных Node smoke, если есть полноценный checkout. Потом возьми большую практическую задачу в нашей SEO директории, которая ускорит реальное внедрение первого клиента: единый воспроизводимый private lead handoff / SEO integration contract и понятный сценарий approved Blueprint → actual owner-published Site v1 → PHP/static export → first-site evidence → public HTTPS/client acceptance → GSC after-launch. Если для реального acceptance не хватает клиента/доступа, честно указать dependency и сделать максимально полезную автономную часть. **Никаких изменений вне SEO scope.**

В конце каждого захода самостоятельно коммить и пушь в feature/site-seo-engine (GitHub expected SHA), GitHub Compare все changed paths, зафиксируй оба HEAD + Actions и обнови handoff. Главный разработчик сам интегрирует изменения. Вопросов пользователю по уже данным условиям не задавай, приступай к делу.

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
