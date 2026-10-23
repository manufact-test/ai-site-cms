# AI Site CMS — Stage 3→4 isolated functional implementation (v1.57)

> **Latest verified code:** `fe1ee0f041a807137ee4696f431d22fb5919d1a5`, [CI SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39986341837); [offline Studio ZIP](https://github.com/manufact-test/ai-site-cms/actions/runs/39986341837/artifacts/12514644562). Branch **`feature/stage3-ai-site-contract`**, do not merge with `main` or deploy to Hostinger without separate owner permission. Canonical [handoff](../handoffs/lead-integrator/MAIN-HANDOFF-v1.57-2026-10-23.md). Stage2 technically ~85–90% but **formal NO-GO**; Stage3 not formally accepted, 0/135 mandatory product criteria signed off.

## Product state — not only a static prototype

- **Closed, provider-independent manifests:** `stage3/sdk/contract.cjs`, `components/*.json`. Site JSON `manufact-ai-site-v1`: pages, sections, globally stable unique IDs, elements, typed `content/style/behavior` values, responsive desktop/tablet/mobile. Unknown hooks, JavaScript payloads, invalid assets, and unregistered component versions are refused.
- **Immutable local editing:** `stage3/sdk/draft.cjs` uses expected revision, strict per-field validation, bounded undo/redo, structure editing, `duplicatePage`, `duplicateSection`, `applyTemplate`; can generate an editable two-page site without a design brief and without fictional company claims.
- **Standalone offline Studio:** `stage3/studio/index.html`, bundle/CSS; click-to-open ZIP, inert iframe preview, page tree, section navigation, field editor, Undo/Redo, local versions, JSON import/export. No network/runtime keys.
- **Server Studio:** `/studio` served from isolated PHP `server/public/index.php` plus `studio/hosted.js`. Real PHP-session owner login, CSRF, origin protection, explicit site draft save with CAS conflict, revisions/restore, explicit separate Publish, site list, media, submissions, unread notifications, reusable site-scoped section template library. The old offline ZIP remains network-free.
- **Durable server repository:** `server/SiteRepository.php` uses disposable SQLite in CI, also supports PDO MySQL schemas in code. Only empty dedicated DB setup via CLI `server/bin/setup.php`; MySQL integration/real Hostinger deployment is **NOT validated** here.
- **Published pages:** `server/PublicRenderer.php` renders first-party components and escapes content; immutable published snapshots separate from draft. `server/bin/export-published.php` emits standalone static HTML plus images; optional form collector must be explicitly configured. Never confuse export with CMS runtime.
- **Media:** PNG/JPEG/WebP, max 450 KB each, image showcases, alt text and safe site-scoped immutable asset IDs.
- **Visitor forms and inbox:** legacy `lead-form` and `lead-form-flex` (three configurable fields: text, tel, select, textarea), server validation, consent, honeypot, throttling, HMAC release token, separate `server/collector-public` entry, private submissions and `notifications`. External email/Telegram delivery is NOT implemented.
- **Section templates — NEW:** Save the selected already-saved section to a site-scoped template collection (up to 60), list/select/apply/delete. Applying preserves content/settings and remaps section/element IDs, supports undo and requires explicit server save/publish. Cloning a whole page regenerates section IDs and requires an unused URL. Presets do not travel to other sites automatically, especially when they refer to media.

## CI and local commands

```sh
node stage3/tests/contract-smoke.cjs
node stage3/studio/build.cjs --check
node stage3/tests/studio-browser.cjs
node stage3/tests/server-e2e.cjs
node stage3/tests/hosted-browser.cjs
```

Browser tests need pinned Playwright from `cms/editor/node_modules` and system Chromium; PHP server E2E needs PHP 8.3 + PDO_SQLite. CI workflow `.github/workflows/stage3-ai-contract.yml` runs existing aggregated jobs and packages an offline ZIP. **Do not add huge extra test matrices to every product feature**; current CI + one critical browser path is enough unless an uncovered security blocker emerges.

## Next big vertical

Implement validated full-site *recipes* and real owner-brief-to-editable multi-page composition, using registered components and reusable templates. Keep provider-neutral deterministic fallback, no fabricated data, clear owner preview/edit/save/publish. Then finish remaining high-value roadmap modules (licensing, backup/restore, admin roles, production deployment approval gates and cohesive UI). **Owner wants accelerated BIG product blocks, minimal testing, cosmetics after the functional CMS exists.**

## Safety/acceptance

Stage0/1 accepted; Stage2 formally NO-GO (#5–#9); Stage3 code work allowed on isolated branch only and not formally accepted. 18 stages / 193 total requirements / 135 mandatory / **0 formally accepted mandatory**. Real hosting/SSH/MySQL/production/merge requires a separate scoped authorization. `main` remains `12e9c3feb707e5ad46b2caeeed379eb40618466b`.
