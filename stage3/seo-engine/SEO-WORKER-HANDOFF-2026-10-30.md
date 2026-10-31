## 31 October 2026 — current SEO worker pass: first-client approved-route source coverage

After remote SEO HEAD `e9cf8c330c1a77b571fa15279df22b8efb498364` was verified, added [FIRST-CLIENT-ROUTE-COVERAGE-QA.md](FIRST-CLIENT-ROUTE-COVERAGE-QA.md), `lib/seo-first-client-coverage.cjs` and `tests/seo-first-client-coverage-smoke.cjs`. The one existing Crawl report and lead Markdown now distinguish actual per-route input availability: Site v1 SEO source match, inspectable public HTTPS/JSON-LD, three-device matched DOM, optional exact-URL historical CrUX and overlapping source-specific P0/P1 counts. Each route gets bounded manual evidence guidance; unknown remains unknown and nothing proves current published release. Same existing workspace-manifest/integrity, no new dashboard/CLI, CMS mutation, PR, merge, deploy or release authority. See next-chat handoff for **actually executed** Node checks; the next integrator action is real owner-approved client pilot. Final new GitHub SHA must be read from GitHub after saving.

This pass's final focused Node suite had six **PASS** programs: `seo-first-client-coverage-smoke`, `seo-workspace-crawl-smoke`, `seo-operator-workspace-smoke`, `seo-field-performance-smoke`, `seo-rendered-content-smoke`, `seo-structured-data-smoke`. Separate rerun of the new coverage test passed after adding 8/8/2 approved page-ID batch assertions. Legacy empty Crawl route lists are marked **UNKNOWN**, not a zero-missing false pass. No GitHub Actions, real customer source or Chromium launch was performed.

## 31 October 2026 — first-client real-user CrUX field SEO QA

Added [FIELD-PERFORMANCE-CRUX-QA.md](FIELD-PERFORMANCE-CRUX-QA.md) with `lib/seo-field-performance.cjs`, `lib/seo-field-performance-view.cjs`, one new offline synthetic smoke and optional `crawl.crux` source in the current private SEO Operator Workspace. The field p75 LCP/INP/CLS report differentiates approved URL and origin aggregates, phone/tablet/desktop/all-device records, missing metrics, old collection periods and unrepresented approved pages. It is SHA-bound, private, read-only, with no API key/fetch or new panel; the current Crawl report, existing post-launch human gate and the same unsigned packet ledger get the output. The actual client source, current deployment, Google ownership and Google performance have not been verified. New code remains solely SEO subtree. The main developer is the only integrator; no PR, merge or deploy. Final GitHub SHA must be confirmed after the independent commit.

## 31 October 2026 — substantial independent SEO browser QA pass

See [RENDERED-FIRST-CLIENT-UX-QA.md](RENDERED-FIRST-CLIENT-UX-QA.md). Extended the existing source-pinned Chromium visit and existing rendered-content audit, no duplicate dashboard: bounded, numeric-only desktop/tablet/mobile responsive layout/viewport/tiny controls, isolated navigation/FCP/resource timings, visible main-text footprint, approved internal link rel/placeholder/unsafe-scheme changes and same-device internal fragment targets. Backward-compatible optional v2 observation fields, CSS/image/timing/content invalidation on late DOM change; older captures remain valid/unknown. Runtime checks are manual P1/P2 evidence, not actual Google CWV or client approval. The lead remains the only integrator. No file outside `stage3/seo-engine/**`, PR, merge, publication or deployment.

**Actual Node regression record (31 October): 12 focused Node smoke programs passed**, all offline synthetic/mocked: `seo-browser-responsive-observation`, `seo-browser-timing-observation`, `seo-browser-text-footprint`, `seo-rendered-links-fragments`, `seo-browser-image-observation`, `seo-css-visibility`, `seo-structured-data`, `seo-operator-workspace`, `seo-rendered-capture`, `seo-rendered-content`, `seo-lead-readiness`, `seo-workspace-crawl` (all paths in `tests/` and suffixed `-smoke.cjs`). `git diff --check` and v2 JSON parse checks also passed. Tests using `/tmp` initially encountered the checkout's read-only sandbox, then passed with scoped test-run approval; the existing crawl Workspace smoke additionally caught a missing HTML `UNAPPROVED` warning, now fixed and passing. No real Chromium browser was launched, no real client host/source/Search Console was supplied, and no GitHub Actions workflow was run. New GitHub commit SHA will be verified via branch ref after upload; do not copy local SHA as remote identity.

## 31 October 2026 — SEO worker: rendered JSON-LD claim mutation QA

Delivered [RENDERED-STRUCTURED-DATA-QA.md](RENDERED-STRUCTURED-DATA-QA.md), extending existing `seo-structured-data-audit.cjs` parser with a bounded HTTP-vs-rendered schema semantic comparator, integrated into existing rendered-content private report and **one** SEO Operator Workspace. It detects added or changed `price`, `review`, `aggregateRating`, identity or other owner-sensitive properties even if root `@type` does not change, plus unauthorized/unconfirmed types and unsafe URLs/breadcrumb/context drift. P0/P1/P2 and coverage remain human-only; private claim values/digests never leave process memory. Real Node checkout smoke **passed** for image, CSS, mocked Chromium, rendered-content and static structured-data; modified rendered-content test also passed with new regressions. No real Chromium/client/GitHub Actions. No CMS, lead branch, PR, merge or deploy. Lead's first approved client pilot is now the decisive priority.

## 31 October 2026 — final small SEO media QA hardening and worker handoff

The `browser-image-loading-v1` first-screen hero heuristic now measures the **clipped visible viewport intersection**, not the original full element rectangle. This eliminates large-hero false positives when a massive offscreen image shows only a few pixels at the fold. Added a synthetic `img` regression in `tests/seo-browser-image-observation-smoke.cjs`, updated [RENDERED-IMAGE-LOADING-QA.md](RENDERED-IMAGE-LOADING-QA.md), and prepared [SEO-WORKER-NEXT-CHAT-2026-10-31.md](SEO-WORKER-NEXT-CHAT-2026-10-31.md). Independent worker changes stay under `stage3/seo-engine/**`; previous committed Node/Chromium/client integration **not** marked passed. Main developer remains sole integrator; no PR/merge/deploy.

## 31 October 2026 — browser image loading / first-viewport SEO QA

NEW independent SEO feature: [RENDERED-IMAGE-LOADING-QA.md](RENDERED-IMAGE-LOADING-QA.md). Reuses the already approved and bounded Chromium rendered-source collector, v2 source-pinned DOM artifact, same private HTTP-to-DOM audit, and existing single SEO Operator Workspace. Each desktop/tablet/mobile capture now optionally measures 13 bounded `img` counters: visibly broken/pending images, large first-screen failures, above-fold `loading=lazy`, missing alt/dimension attributes, and >1.5× apparent upscaling. The collector double-samples to flag changing image state as unknown and invalidates image/CSS observations if the DOM changes. V2 old evidence without image counts remains valid/unknown. P1 for broken visible/large hero candidates; P2 for lazy above-fold, attributes, upscale, pending/unknown. Never identifies Google LCP/CLS or live provenance; no asset URLs or alt content in counters. Changes solely in `stage3/seo-engine/**`, no PR/merge/deploy; lead performs final integration and real customer pilot. Synthetic V8 observation checked; full Node/Chromium/live site must be separately confirmed.

## 31 October 2026 — source-pinned computed CSS visibility SEO QA

NEW first-client SEO block: [RENDERED-VISIBILITY-QA.md](RENDERED-VISIBILITY-QA.md). Existing public Chromium capture now observes bounded CSS layout visibility for H1, H2–H6 headings, main and approved CTA/navigation anchors at desktop/tablet/mobile. Two snapshots 250 ms apart flag changing CSS as unknown. The v2 DOM artifact optionally records source-hash-bound CSS counts; old v2/v1 without CSS remains accepted and marked CSS unknown. The existing private rendered-content audit/Workspace reports P1 CSS-hidden H1/main/all H2–H6/CTAs; P2 partial secondary headings, collapsed navigation and visible aria-hidden/inert content. No text/foreign URLs in CSS metrics, no second panel, no source authenticity/Google/release claim. All edits strictly `stage3/seo-engine/**`, lead integrator owns merge/deployment. Focused smoke added but complete checkout/real Chromium not run in this restricted environment.

## 30 October 2026 — Chromium rendered-source first-client pilot collector

**Delivered in SEO worker branch only:** [RENDERED-CAPTURE-PILOT.md](RENDERED-CAPTURE-PILOT.md). This extends the existing read-only HTTP-to-DOM reconciliation with an **explicitly operator-run Chromium collector**; it is not a CMS feature, a site template or a new operator dashboard.

- `lib/seo-rendered-capture.cjs`: approved Blueprint/Site/public-HTTPS triple validation, public-only DNS/IPv4 pin, sandboxed isolated Playwright Chromium contexts, explicit GET/HEAD same-mount routing, WebSocket/service-worker and unsafe navigation blocks, 80-requests-per-device budget, full desktop/tablet/mobile DOM serialization. Refuses invalid or mutable input envelopes.
- `bin/capture-rendered-public.cjs`: operator CLI requires `--blueprint --site --public-http --origin --out`; source-hashed no-overwrite private artifact plus redacted integrity receipt. Never run without a human-approved real public host.
- `schemas/viewport-capture-v2.schema.json`: strict schema with raw original HTTP capture file SHA256 **and** browser main-response-body SHA256 per page/device, explicit booleans for unmatched HTML, JavaScript errors, blocked requests, and DOM stability. No server or Google provenance is claimed.
- `lib/seo-rendered-content-audit.cjs`: backward-compatible v1/v2 intake. For v2, a changed browser main response or unsettled DOM fails closed to P1/uninspected; existing private static HTML/Markdown report now shows browser source match, drift, blocked-request, JS error and unstable DOM counts.
- `tests/seo-rendered-capture-smoke.cjs`: focused offline Node smoke with mocked browser, no network. The checkout test and a real authorized Chromium/site pilot **still require execution**; this note does not claim they passed.

Offline first-site preflight: pass `--mode preflight` with all source flags to validate approved sources, mount, selected IDs, browser loader and private target without DNS, Chromium launch, writing output, HTTP requests or publishing; this does **not** verify runtime sandbox or real host.

Optional first-page pilot: CLI `--page-ids` selects 1–8 approved Blueprint IDs. The receipt labels partial coverage and the existing audit marks all unselected pages uninspected; never interpret a subset as full SEO acceptance.

Operator flow: existing `capture-public-https.cjs` → new `capture-rendered-public.cjs` → existing `review-rendered-content.cjs` or existing Operator Workspace `crawl.renderedCapture`. These are source observations only: no Google rendering, owner source revision, approval, publish/deploy or release signoff is authenticated. All original DOM stays outside Git; main developer is the only integrator.

## Independent SEO worker addendum — 30 October 2026: rendered HTML/DOM reconciliation delivered

Latest new functionality (after the previously confirmed `2fc5517b...` checkpoint): [RENDERED-CONTENT-QA.md](RENDERED-CONTENT-QA.md). Added a source-pinned, private **HTTP HTML vs actual operator-supplied desktop/tablet/mobile rendered DOM** comparison: approved routes, canonical/noindex and other head metadata mutations, H1/main, navigation/CTA, JSON-LD root types and gaps. New `lib/seo-rendered-content-audit.cjs`, view, standalone `bin/review-rendered-content.cjs`, synthetic Node smoke; integrated as optional `crawl.renderedCapture` into the existing ONE SEO workspace and unsigned lead packet hashes. Readiness has **13** human gates, the new `rendered-seo-content-parity` stays manual/blocked with missing sources.

No real browser, real customer site, Google or live client acceptance was run. Core was exercised in isolated Node in-memory; **full checkout Node smoke/CI still required**. No site designs or client source content copied. Strict directory/branch ownership unchanged.

**Next priority:** focus on the *first actual customer pilot* with the main integrator: lead executes the focused real Node smoke, independently collects matching source revision, sealed package, HTTP/DOM captures and owner confirmation. Diagnose genuine gaps only; do not duplicate SEO workspace, CMS or build template catalogs. Independent SEO worker must still never PR/merge/deploy or touch lead-owned files.

---

# MANUFACT AI Site CMS — SEO WORKER HANDOFF — 2026-10-30

## 0. Scope, repository and ownership (read first)

Repository: **`manufact-test/ai-site-cms`**.

Independent SEO development branch: **`feature/site-seo-engine`**.
**ONLY** change files under `stage3/seo-engine/**`. Do **NOT** touch the root, Site CMS, PHP, Studio/SDK, owner database/records, workflow/CI, `main`, or the lead's branch. Never open PR, merge, deploy or publish. **The only integrator is the main developer** working in `feature/stage3-ai-site-contract`, in parallel with other chats.

The owner prefers **large, cohesive, useful functionality per working pass**, not 10-minute micro-updates or dozens of repeated fake smoke tests. Verify important boundaries without spending the entire pass testing. Do not invent site content. This is an AI-powered CMS for **unique client sites**, not a library or catalog of premade website templates. Do **not** build template libraries, site pattern catalogs or a second CMS/workspace. Shared SEO validation logic is appropriate; client-specific site designs/content are not shared libraries.

All customer/private originals (Blueprint, Site v1, HTTPS HTML, Search Console, human decisions) must remain **outside Git**; only code, runbooks and synthetic fixtures in `stage3/seo-engine`.

## 1. Where we are: actual implemented SEO capabilities

**Foundation:** `lib/blueprint.cjs`, `bin/seo-blueprint-studio.cjs`, compiled owner research, approved facts/schema candidates, responsive metadata, navigation/CTA/internal link architecture, `architecture.cjs`, `content-intelligence.cjs`, `content-optimization-briefs.cjs`, `search-link-opportunities.cjs`. The brief-to-Blueprint process is offline and deterministic. **No templates.**

**CMS and publisher contracts:** approved Site v1/v2 bridge and PHP HTML/semantic parity, local PHP/public HTTPS snapshots, static upload, first-site PHP/static checks, post-deploy host and media, source revision correlation, rollback and lead acceptance. Important modules `first-site-launch-cockpit.cjs`, `first-site-lead-relay.cjs`, `first-site-integration-session.cjs`, `first-site-live-acceptance.cjs`, `first-site-live-followup.cjs`. The independent SEO worker must **not** modify PHP or CMS.

**Search:** offline GSC Performance CSV, Search History with real period coverage, indexing export/observations, manual search action/decisions, editorial backlog, release follow-up and private visualization. No Google API authentication, ranking claims or automatic search mutations.

**Crawl:** robots/sitemap policy, per-agent decisions, sitemap XML/sitemapindex uncertainty, policy delta/regression, indexing correlation, DRAFT-ONLY repair (never deployed), CMS metadata/robots/canonical/redirect tasks. `lib/crawl-cms-lifecycle.cjs` handles source-bound human decision ledger and 2-cycle before/after task observations, including owner-reported complete still seen and missing observations **never auto-closed**.

**Actual public follow-up (previous pass):** `lib/crawl-cms-public-followup.cjs` + view, `bin/review-crawl-public-fixes.cjs`, compare real operator-supplied HTTPS source transcripts to manual crawl tasks. States `OBSERVED-CONFLICT`, `OBSERVED-ALIGNED-NOT-VERIFIED`, `INSUFFICIENT-EVIDENCE`. Missing sitemap, soft-404, mixed capture window and unmatched source revisions are fail-closed. Never claim actual live host authenticated or Google indexation. [CRAWL-PUBLIC-FOLLOWUP.md](CRAWL-PUBLIC-FOLLOWUP.md).

**First client handoff (previous pass):** `lib/seo-lead-readiness.cjs` + view, `lib/seo-private-lead-integrity.cjs`, `bin/verify-seo-lead-packet.cjs`, 12 explicit prelaunch/postlaunch lead gates, source SHA256 inventory, private file-byte audit and no automatic GO. This is an **unsigned** local integrity receipt, not a trust signature. [FIRST-CLIENT-LEAD-READINESS.md](FIRST-CLIENT-LEAD-READINESS.md).

**NEW FINAL BIG PASS: per-client Structured Data semantic QA.**
- `lib/seo-structured-data-audit.cjs` — bounded real public HTML JSON-LD source parser and semantic investigation against **the client's own** approved `schemaCandidates`, confirmed owner facts and canonical Blueprint paths. Checks malformed JSON-LD, context, entity host/HTTPS/mount, WebPage/Article canonical, malformed BreadcrumbList/position/last canonical/unknown target, unapproved schema type, unconfirmed owner fact claims, high-risk `offers`, `price`, `aggregateRating`, `review`, `address` etc. It never declares Google rich-result eligibility, never copies original claim values into output, never inserts missing schema.
- `lib/seo-structured-data-view.cjs` — private CSP no-script report (manual tasks, per-page type names, owner verification).
- `bin/review-structured-data.cjs` — standalone exact-source Blueprint/Site v1/public HTTPS private CLI with output staging/no overwrite/input re-hash. No new HTTP collector.
- `tests/seo-structured-data-smoke.cjs` — committed **real Node** smoke test, original industrial Blueprint fixture, synthetic public HTML, good Organization, invalid BreadcrumbList/offsite positions, owner rating/offers evidence, missing page, mismatch and both CLIs.
- `STRUCTURED-DATA-QA.md` — detailed source/workflow and limitations.
- Existing `seo-workspace-crawl-panel.cjs`, `seo-operator-workspace.cjs`, `build-seo-operator-workspace.cjs`, `seo-lead-readiness.cjs` and `seo-private-lead-integrity.cjs` extended, **without new config keys**: when `crawl.publicCapture` and current original Blueprint/Site v1 are supplied, automatically generate `structured-data.html/.md/.json` in the same private workspace and register them in original integrity ledger. Lead readiness has a 12th schema owner-fact gate.
- Actual-source isolated V8 check was run: canonical/eligible Organization **zero issues**, incorrect BreadcrumbList + owner pricing/rating **four P1 issues**, missing page stays missing, no value leakage. **This is NOT real Node/CI, nor authenticated public host testing.**

## 2. Core private operator commands

**Single existing workspace** (no new workspace system):

```bash
node stage3/seo-engine/bin/build-seo-operator-workspace.cjs \
 --config /ABS/private/seo-workspace-config.json \
 --out /ABS/private/NEW-SEO-WORKSPACE
```

If config contains `crawl.policy`, `crawl.cmsBlueprint`, `crawl.cmsSite`, `crawl.publicCapture`, it now shows old crawl issues, current CMS worklist, public fix observations, **structured-data semantic QA** and first-site lead readiness.

**Standalone schema semantic QA**:

```bash
node stage3/seo-engine/bin/review-structured-data.cjs \
 --blueprint /ABS/private/approved-blueprint.json \
 --site /ABS/private/current-owner-site.json \
 --public-http /ABS/private/original-public-https.json \
 --out /ABS/private/NEW-STRUCTURED-DATA-QA
```

**Offline generated lead packet integrity**:

```bash
node stage3/seo-engine/bin/verify-seo-lead-packet.cjs \
 --bundle /ABS/private/NEW-SEO-WORKSPACE
```

Original input file SHA256/canonical approved Blueprint/siteId/HTTPS mount must match; do not pretend original HTTP snapshots verify a real public site without external provenance.

## 3. Focused real Node verification

```bash
node stage3/seo-engine/tests/seo-structured-data-smoke.cjs
node stage3/seo-engine/tests/seo-lead-readiness-smoke.cjs
node stage3/seo-engine/tests/crawl-cms-public-followup-smoke.cjs
node stage3/seo-engine/tests/crawl-cms-lifecycle-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/crawl-cms-workspace-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
```

These are committed Node scripts for the lead to run on a real checkout. **Prior SEO worker GitHub-only environment cannot run real Node against the full private branch**; V8 syntax/composition is not the same test. The latest lead branch Actions results do not automatically cover the unintegrated SEO worker branch.

## 4. Next independent SEO pass: practical priorities

1. On first entry, confirm latest `feature/site-seo-engine` HEAD, the lead's branch HEAD, read this handoff, [INTEGRATION-HANDOFF.md](INTEGRATION-HANDOFF.md), [SEO-WORKER-TRANSFER-2026-10-30.md](SEO-WORKER-TRANSFER-2026-10-30.md) and [STRUCTURED-DATA-QA.md](STRUCTURED-DATA-QA.md).
2. Do **not** re-create existing Blueprint, crawl, GSC, publishers, human desks, lead readiness, private packet integrity or schema audit. Especially **do NOT** build reusable website libraries/pattern registries/generic client website templates.
3. Prioritize tangible progress toward **first real client SEO pilot** and lead-owned integration: one focused real Node regression run after integration; source-pinned technical corrections if needed; subsequently implement one genuinely missing SEO capability only after reading existing modules. Practical option: **actual rendered-page accessible content/structured-data reconciliation** when an approved browser capture source is available, or owner-backed per-page entity validation; never invent site facts. Avoid inventing abstract status dashboards.
4. Keep work private, bounded, read-only and evidence-linked. For every finding distinguish observed-source, human report, authentic public host, Google Search Console ownership and owner/client signoff.
5. Make a **big coherent pass** with actual committed code, minimum essential tests and updated handoff. Report exact GitHub SHA, changed file paths and confirm zero files outside `stage3/seo-engine/**`. Avoid claiming real test or deployment when none occurred.

## 5. GitHub tool operations

Use `functions.exec` and `tools.mcp__GitHub__fetch_file`, `update_file`, `create_file`, `compare_commits`. Read before updating; use current blob SHA. Keep sequential updates for the same file. Repo/branch: `manufact-test/ai-site-cms` / `feature/site-seo-engine`. Check remote branch HEAD after each big pass and compare to original for any out-of-scope paths.

**Do not** merge, PR, force update refs, change main, change lead branch or CI; lead is sole integrator.

## 6. Ready-to-paste first message

The following is a copyable first message for the next SEO worker:

> Привет! Продолжаем самостоятельную разработку **MANUFACT AI Site CMS — SEO Intelligence & Blueprint Engine**. Ты — новый независимый автономный SEO-разработчик. Репозиторий `manufact-test/ai-site-cms`, твоя ветка **`feature/site-seo-engine`**, область изменений **строго `stage3/seo-engine/**`**. Главный разработчик работает параллельно в **`feature/stage3-ai-site-contract`** и является единственным интегратором: не трогай его ветку, CMS/PHP/Studio/SDK, CI, main, не создавай PR, не мерджи и ничего не публикуй. Сначала проверь свежий HEAD и прочитай `stage3/seo-engine/SEO-WORKER-HANDOFF-2026-10-30.md`, `INTEGRATION-HANDOFF.md`, `SEO-WORKER-TRANSFER-2026-10-30.md` и `STRUCTURED-DATA-QA.md`. Ветка уже содержит большой SEO-движок: Blueprint, контент/архитектуру, GSC, Indexing, Crawl/robots/sitemap, CMS SEO task lifecycle, HTTPS postpublication, first-site readiness/unsigned integrity и новую **семантическую проверку реальных JSON-LD**. Не дублируй эти системы и не создавай библиотеку сайтов/типовых дизайнов: мы делаем **индивидуальный сайт под каждого клиента**, а общими могут быть только технические SEO-проверки. Последний заход добавил `seo-structured-data-audit.cjs`, `seo-structured-data-view.cjs`, `review-structured-data.cjs`, `seo-structured-data-smoke.cjs` и интегрировал их в **единый** приватный Workspace и Lead Readiness. Реальный Node/CI на SEO-ветке не запускался; изолированная V8-проверка не заменяет его. Сначала изучи код и зафиксированные ограничения, затем бери **один крупный практический SEO-функциональный блок**, а не мелкие задачи по 10 минут и бесконечные тесты. Приоритет — помощь первому реальному клиентскому SEO-прогону, без дублирования и вмешательства в главную разработку. Всё коммить в свою SEO-ветку, обновляй документацию и отчитайся точным SHA и количеством изменений. Действуй самостоятельно; уточнять у меня каждую мелочь не нужно.
