# ВТОРОЙ РАЗРАБОТЧИК — SEO Intelligence & Blueprint Engine v2.0
**27.10.2026 · отдельное КРУПНОЕ направление AI Site CMS.** Owner MASTER: [docs/MASTER-TZ.md](../../docs/MASTER-TZ.md). Нельзя менять согласованную продуктовую концепцию. Ветка: \`feature/site-seo-engine\`. **Единственный writable каталог: \`stage3/seo-engine/**\`**. Не менять \`stage3/sdk/**\`, \`stage3/server/**\`, \`stage3/studio/**\`, \`cms/**\`, \`requirements/**\`, \`docs/**\`, \`handoffs/**\`, \`.github/**\`, \`main\`. Исключения только после отдельного задания ведущего, никаких самостоятельных интеграций/PR merge/deploy.

## Цель — большой реальный SEO продуктовый блок, а не ещё одна фабрика
Сделать **самостоятельный versioned toolkit** для AI-разработчика и главного интегратора, который:
1. даёт проверенную, краткую, обновляемую базу профессиональных SEO/semantic/accessible UX закономерностей;
2. превращает SEO-исследование *по конкретному брифу* в **структурированный проект страниц и SEO-план**, используемый при создании ТРЁХ статических прототипов desktop/tablet/mobile и затем реального сайта;
3. на финальном уже написанном сайте обнаруживает настоящие SEO/semantic/information-architecture проблемы, не выдумывая метрик и не ломая/переписывая сайт;
4. формирует конкретные применимые правки с точными идентификаторами страниц/блоков и handoff для ведущего. SEO редактируется в EXISTING CMS, а не в новом втором интерфейсе.

Важно: **ИИ работает отдельно от CMS; прототип — КАРТИНКИ + клиентское объяснение + внутренняя переносимая спецификация; это НЕ HTML-прототип.** Второй НЕ разрабатывает готовые сайты, темы, секции, дизайн-редактор, клон SEO админки, web crawler/SERP scraper, оплату провайдеров.

## Источники сначала, код после
Research:
- Google Search Essentials https://developers.google.com/search/docs/essentials
- Google SEO Starter Guide https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google structured data overview https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Google image SEO https://developers.google.com/search/docs/appearance/google-images
- Google CWV https://web.dev/articles/vitals
- WCAG 2.2 https://www.w3.org/WAI/WCAG22/understanding/
- Other reputable primary sources as needed.
Facts vs myths: H1 semantic, not a "magic 48px ranking factor"; alt meaningful not keyword stuffing; meta-description doesn't guarantee SERP snippet; schema cannot assert facts absent from owner brief; nothing guarantees ranking. Research actual source dates, quote little, document just actionable rules not megabyte reports. Audit applies site type and user intent: pages need meaningful order, CTAs, conversion goals, internal links, FAQ only if context justifies it.

## Big implementation: 4 interoperable standalone packages
**A. Brief-to-SEO Blueprint (\`lib/blueprint.cjs\` and \`schemas/*.json\`)**
Versioned closed JSON format for one site: owner facts and uncertainty flags; audience, locale/region/language; research sources and intents; page map/URL plan; for each page: main intent, priority topics (no fake search-volume), content outline, purpose/order of major sections with brief UX reason, main heading semantics, proposed Title/meta/OG/canonical/indexation, image/alt requirements, CTA conversion actions, logical internal links, structured-data *candidates only if factual*. Constraints for tablet/mobile narrative differ only where needed. No HTML/CSS/JSON execution fields, dangerous arbitrary URLs or credential storage. Do not add invented reviews, prices, ratings, location, author credentials. Provide editable human-friendly English/Russian examples (at least 2 distinct project types), not rigid industry templates.

**B. Semantic/SEO analyzer (\`lib/analyze.cjs\`)**
Accept existing \`stage3/schemas/site-v1.schema.json\` / \`stage3/sdk/contract.cjs\` site docs (read-only) AND if feasible exported trusted HTML snapshot as input; work offline; output normalized diagnostics keyed by stable page/section IDs. Flags: wrong/missing H1 hierarchy, non-descriptive internal anchors, missing content alt (not decorative), invalid heading nesting, missing/duplicate Titles, poor URL/intents, broken internal links, indexation/canonical inconsistencies, robots/sitemap mismatch if present, factual/schema violations when evidence available, missing useful page relationships, poor mobile-content parity when material. Distinguish **blocker/error/warning/recommendation** and not pretend AI can objectively score quality, UX, keyword rankings or performance without real data. Do not claim robots/canonical feature present if host adapter does not implement it. Prevent XSS in any report UI. No external network.

**C. Human/client explanation compiler (\`lib/explain.cjs\`, \`bin/seo-blueprint.cjs\`)**
Given blueprint and validated site/optional prototype metadata, output concise **client-facing** explanation: what pages/sections aim to do, why order, what buttons/links do, what hover/animation plans belong to prototype specification (do NOT invent animations if missing), why design supports UX and SEO, separate from **machine-readable internal handoff**. SEO wording factual, no made-up competitive research or claimed performance. This is one section of the complete client explanation; lead owns full design/prototype presentation.

**D. Integration report/patch proposal (\`lib/handoff.cjs\` or same)**
Read-only report and deterministic safe patch *proposal* mapping blueprint to existing Site v1 SEO fields \`page.seo.title/description/robots/ogTitle/ogDescription/ogImage\` and existing structures where supported. Clearly list **supported**, **requires core schema extension**, **requires publisher implementation**, **not in scope**. Never silently drop missing fields; no direct changes to CMS DB/files. Return only validated changes with stable IDs, path, before/after and rationale. Handoff technical limitations explicitly: current site schema does NOT automatically support every canonical/alt/social/schema nuance. Do not "fix" by editing lead code. Lead decides extension later.

## Deliverable and done criteria
- \`stage3/seo-engine/README.md\`: 2-minute guide: brief→blueprint→analyze→client explanation→proposed handoff.
- \`research/PRIMARY-SOURCES.md\` inside allowed path with sources & dates, concise actionable SEO/UX principles.
- \`schemas/\` pinned contract, \`lib/\` pure Node (no new npm dependencies unless clearly necessary and approved), \`bin/\` one CLI for all operations.
- \`fixtures/\` 2 distinct sample briefs, SEO plans and reports, including intentionally invalid scenario and normal scenario.
- \`tests/smoke.cjs\` **one** meaningful standalone E2E running commands and checking valid/error outputs; avoid dozens of tiny redundant tests.
- \`INTEGRATION-HANDOFF.md\` precise map of existing core fields, supported/unsupported, no vague percent/claim of release readiness.
- If truly needed, \`demo/\` a static **read-only** output preview, but **no second admin/UI**; prefer CLI + Markdown/JSON so module stays lean.

**Work in 2–4 big cohesive batches, not repeated tiny reports.** Start by studying current \`stage3/sdk/contract.cjs\`, \`stage3/server/PublicRenderer.php\`, \`stage3/studio/app.js\`, \`docs/MASTER-TZ.md\`; do not reimplement their SEO data/validators. Build something the integrator can actually consume within project constraints, and commit to worker branch only. Do not merge \`main\`. Report final SHA, 1 useful smoke result, honest limits, readiness for the lead to integrate. **Do not work on former Design Factory branch.**

## Контроль
Owner 2/10 visual rejection of former Design Factory was a PRODUCT FAILURE; never substitute a suite of tests for real usefulness. No architecture invented just because it is an interesting programming task. Cross-team reuse and compatibility > independent beauty of a subsystem. No production/repo merges, scraping, provider API charges, external data writes.
