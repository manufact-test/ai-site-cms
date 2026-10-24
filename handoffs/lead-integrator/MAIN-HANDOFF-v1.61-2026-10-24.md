# AI Site CMS — Lead Handoff v1.61 / 24.10.2026

## 0. Start here: two independent developer chats

**Main integrator branch:** `feature/stage3-ai-site-contract`.
**Last functional commit:** `61fb93da2c55a6165a36282ba4086649c5f318a8`
**CI for that exact functional SHA:** [#40089689080 — SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40089689080).
**Repository:** https://github.com/manufact-test/ai-site-cms
**Parallel Design Factory:** `feature/stage3-design-factory` — worker owns **only** `stage3/design-factory/**`. It has its own ongoing mission [MISSION](https://github.com/manufact-test/ai-site-cms/blob/feature/stage3-design-factory/stage3/design-factory/MISSION.md), [ROADMAP](https://github.com/manufact-test/ai-site-cms/blob/feature/stage3-design-factory/stage3/design-factory/ROADMAP.md) and [PROGRESS](https://github.com/manufact-test/ai-site-cms/blob/feature/stage3-design-factory/stage3/design-factory/PROGRESS.md). Its branch HEAD changes independently; read it directly rather than assuming this document pins an unchanged SHA.

**Do not** merge `main`, PR #3/#4, worker branches, deploy to Hostinger, touch a real database, access production/SSH, or change CELIKOM/other projects without explicit user authorization. Lead works in `feature/stage3-ai-site-contract` only. Worker is running **the whole seven-result D1–D7 program**, not a single 20-minute task; do not issue them tiny follow-ups.

## 1. Functional achievements since v1.60

- **Nested, editable site menu:** visually manage labels, order, hierarchy, CTA, sticky and mobile variants; Undo/Redo; published PHP and static HTML parity. Verified SHA `233a6c24adaf46537f44caa7a06c1917d2c773ee`, [CI PASS](https://github.com/manufact-test/ai-site-cms/actions/runs/40083580824).
- **Four product sections:** pricing plans, process timeline, two-column comparison matrix, native CSS-only content-switcher tabs. Typed first-party manifests, repeatable items, Studio preview, PHP render, static release. Verified SHA `c0fb53d8542ba6acb3cbf1cb35bd2ff252f0b4ae`, [CI PASS](https://github.com/manufact-test/ai-site-cms/actions/runs/40086551967).
- **Media & Motion real Studio raster adapter:** local crop, rotate, quality selection/PNG/JPEG/WebP and 450,000-byte ceiling, SHA256 check, authenticated existing PHP media upload, immutable IDs, optional editor block association, normal save then separate publish. Verified SHA `6f90e4c2a50920d230ef07a5cfc30208296cdd89`, [CI PASS](https://github.com/manufact-test/ai-site-cms/actions/runs/40087780990). Original images/previous releases preserved.
- **NEW v1.61 adaptive gallery:** first-party `adaptive-gallery` typed manifest with Grid/Masonry/Carousel selector, 2–5 desktop columns, contain/cover, captions and featured Grid photos, repeating media cards (up to 24). Studio preview and Undo/Redo; safe PHP visitor renderer and script-free static HTML with CSS scroll-snap for keyboard-focusable Carousel. Exact code SHA `61fb93da2c55a6165a36282ba4086649c5f318a8`. CI for exact SHA [#40089689080](https://github.com/manufact-test/ai-site-cms/actions/runs/40089689080) was SUCCESS when this handoff was composed.
- **Independent Release Audit** and standalone Media & Motion subtree were previously reviewed and carried into lead branch; continue consuming only reviewed contracts. Release Audit CLI is independent of product acceptance.

### Media & Motion completion boundaries

The standalone `stage3/media-motion/**` Workbench still has features not yet attached to live site-v1. Existing Studio integration processes **one final raster asset** at a time. New adaptive-gallery changes **layout**, not binary source widths. **NOT DONE:** immutable linked derivative variants (360/720/1200), `srcset/picture` in both PHP and static release, derivative backup/recovery retention and release digest checks; focus metadata/object position; canonical safe CSS motion adapter; icon/video integration. Do not claim automatic responsive binary choice until all those parts are real. Don't silently add unsupported fields to `site-v1`.

## 2. Engineering progress versus acceptance

18 total planned stages. Stage0–1 formally accepted. Stage2 **technical estimate ~85–90%, remaining ~10–15% plus external/human/Hostinger/legal gates #5–#9**; formally NO-GO. Stage3+ isolated development active but **not accepted**; of 135 required release criteria, **0/135 officially accepted**. Lead branch and successful CI do NOT authorize launch. Don't advertise overall product % unsupported by roadmap/acceptance.

## 3. Accelerated operating mode — nonnegotiable user preferences

One `«продолжаем»` = **one large end-to-end product block**, usually several connected capabilities together; do not spend each turn on a tiny bug, format tweaks, isolated test or 20-minute microtask. Finish missing CMS functionality first, then manual end-user acceptance and corrections. Use current CI and **one critical browser end-to-end flow where needed**, rather than cycling dozens of test variants. Report engineering completion estimate for the chosen subsystem, stage, remaining work and exact CI source commit. Update handoff documentation **when user explicitly asks to switch chats**, not after every ordinary continue. Never guess successful CI without reading its conclusion and matching head SHA.

## 4. Suggested next large lead task

**Real responsive media derivatives, end to end, with explicit versioned contract:** map original + 360/720/1200 processed bytes to immutable site-scoped derivatives, validate real MIME/size/dimensions/SHA server-side, preserve published historical bytes, handle deletion/restore, support PHP+static export with safe `srcset` and correct `sizes`, wire to editor and adaptive-gallery with verified mobile/tablet/desktop browser E2E. This is a full independent cross-layer project; if cost/size cannot be finished in one go, commit a coherent vertical slice and describe remaining precisely. After that: first-party reduced-motion CSS presets and explicitly typed video/icon blocks. Do not let the new design worker overlap these files.

## 5. Trust and handoff verification

Current `main` before handoff: `12e9c3feb707e5ad46b2caeeed379eb40618466b` (untouched in this work). Read `PROJECT-STATUS.json`, `docs/ROADMAP.md`, `docs/NEXT-CHAT.md`, this handoff, Stage3 component manifest/SDK/renderer and worker design roadmap. Final check the current lead branch ref and CI before pushing a new atomic commit with expected-SHA lease. Keep all ongoing work in the feature branch.

**No background work, no deferred delivery.** An ordinary "продолжаем" means actually code a big block now, commit and report verified result.
