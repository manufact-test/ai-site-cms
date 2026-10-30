# MANUFACT AI Site CMS — SEO Worker Final Transfer, 30 October 2026

**Repository:** https://github.com/manufact-test/ai-site-cms

**Current independent SEO worker branch:** `feature/site-seo-engine`. **Strict ownership:** `stage3/seo-engine/**` ONLY. The CMS lead is the **sole integrator** and works separately in `feature/stage3-ai-site-contract`. **Neither branch is a public release.** Do not touch PHP, Studio, SDK, stage3 bin, root package.json, main, GitHub Actions or the lead branch; no PR, auto-merge, deploy, real HTTP POST, external Google API, or copying private customer evidence into the repository.

**Work pace:** user expects a substantial, roughly 30-minute functional block per "продолжаем", not tiny fixes or endless synthetic tests. Do significant useful engineering, focused verification and good docs in one pass; do not pretend elapsed time, complete CI, live acceptance or production GO.

## 1. Live branch and CI snapshot (dated, refresh every new turn)

At 2026-10-30 handoff, the SEO branch was at functional-and-guide checkpoint `b2200f14f0a67963f3295201d33288710b472a5c`; after committing these final transfer documents the HEAD is necessarily newer. **ALWAYS fetch live HEAD before writes; do not treat these SHA strings as branch locks.**

The most recently checked lead branch HEAD was `fa40f9cf03ce87c23499e97a0f557959cc3b5cff`, and the latest three checked lead CI runs were failures. In particular [GitHub Actions run 41053045175](https://github.com/manufact-test/ai-site-cms/actions/runs/41053045175), on that lead commit, completed **failure** in job `contract`, step `Server syntax and one full HTTP persistence/publish E2E`; `technology-runtime` succeeded. This is the **lead's own branch**, not proof the SEO worker code caused it; do not modify lead files. The SEO branch had **no GitHub Actions runs** at the last check; no actual Node CI result may be inferred. The new chat should refresh both heads, both CI states and notify only of meaningful blockers.

## 2. The bigger SEO subsystem already in this worker branch

The subtree is broad. Avoid duplicating what exists:

- Original `lib/blueprint.cjs` v1 authoritative private SEO Brief → canonical Blueprint compiler/checker; semantic page/SEO/fact/section/CTA/link and Schema.org candidate contracts.
- `bin/seo-blueprint-studio.cjs` and `lib/blueprint-studio.cjs`: full offline responsive operator editor, draft import/export, preview of page link graph/architecture and previous Blueprint baseline. `BLUEPRINT-STUDIO-QUICKSTART.md`.
- `bin/compare-seo-blueprints.cjs`, `lib/blueprint-change-*.cjs`, `lib/blueprint-decision-editor.cjs`, `bin/review-blueprint-decisions.cjs`: plan-to-plan before/after impact, routes, canonicals, robot changes, schema facts, future redirect probes, P0/P1/P2 tasks, offline Decision Desk and strict source-bound human decision check. `BLUEPRINT-CHANGE-REVIEW.md`.
- Existing extensive Site v1 and approved sealed-v2 read-only adapters, PHP loopback SEO/HTML/media/form/head checks, verified static upload ZIP, Apache/Netlify/Cloudflare rewrite/header previews, public HTTPS/media byte verifier, CDN drift, first-site launch cockpit, operator workspace, private lead relay, actual browser/device/form acceptance templates, and release/source version checks. These are lead-controlled acceptance **evidence**, not automatic publication.
- Offline Google Search Console Search Performance, manual history/cohorts, Indexing Intelligence from operator-normalized rows, indexing history, CMS implementation work packets, search operations and manual release follow-up; never equate operator CSV status with authenticated current Google indexation.
- New 30 Oct crawl search-delivery intelligence: `lib/crawl-policy.cjs`, `lib/crawl-policy-view.cjs`, `bin/review-crawl-policy.cjs`: original operator-supplied robots/sitemap policy against exact approved Blueprint routes. Googlebot/Bingbot/wildcard rule-specific decisions, sitemap-index unexpanded restrictions, optional complete/sample coverage, noindex/canonical mismatches, protected XML parsing, private HTML/JSON/Markdown and original-source manifest.
- `lib/crawl-policy-delta.cjs`, `lib/crawl-policy-delta-view.cjs`, `bin/compare-crawl-policy.cjs`: same-Blueprint before/after original robots/sitemap comparison with new Googlebot blocks, lost indexable sitemap URLs, agent-rule/pointer changes, P0/P1/P2 manual work. No invented public claims.
- `lib/crawl-indexing-correlation.cjs`, `lib/crawl-indexing-view.cjs`, `bin/correlate-crawl-indexing.cjs`: exact Blueprint byte SHA + operator-declared GSC indexing rows + original robots/sitemap → manual co-observation investigation. Does **not** establish causation or Google-authenticated status. `CRAWL-POLICY-WORKFLOW.md` and `SEARCH-INDEXING-WORKFLOW.md`.

## 3. Final functional pass — new Crawl Repair Planner

**Why:** the crawler modules could diagnose problems, but the lead still lacked usable proposed repair files. New safe, private, no-deployment authoring bridge:

- `lib/crawl-repair-planner.cjs`: reconciles **operator-supplied** Site v1 against exact canonical Blueprint (all stable IDs, page routes, robots and canonical). Refuses malformed Site v1 format/schema, differing/missing/extra pages, robots/canonical mismatch, and redirects that shadow approved canonical indexable pages.
- Generates **proposed** `sitemap.xml` with only self-canonical `index` Blueprint routes, absolute mount-aware HTTPS locs, stable order, safe XML escaping and **NO invented lastmod**.
- Keeps original `robots.txt` policy. Optional `--allow-page-ids page-contact` and `--agents Googlebot,Bingbot` propose exact `Allow: /mounted/path/$` rules **only inside existing unambiguous single-agent groups**, after explicit operator selection. Never fabricates a new agent group or rewrites wildcard/shared/duplicate groups; noindex or canonical alias targets are refused. Missing sitemap pointer can be appended; conflicting existing pointers are preserved with manual hold.
- Re-analyzes original vs candidate source policy with the existing authentic `crawl-policy.cjs` and `crawl-policy-delta.cjs`. Tracks intended unblocks, unexpected restored access and newly denied pages. Ambiguity results in human holds. Even all-green private candidate says `releaseAuthorized:false`.
- `lib/crawl-repair-view.cjs`: no-script CSP-protected, escaped private responsive report showing source previews, proposed rules, route inventory, holds and the false release authorization.
- `bin/prepare-crawl-repair.cjs`: accepts **four distinct original private sources** (Blueprint v1, Site v1, robots, sitemap) and HTTPS base; checks normalized absolute paths, file sizes, no symlinks/checkout input, atomic output, no overwrite and rehashes every original before promoting. Emits `index.html`, `PROPOSED-robots.txt`, `PROPOSED-sitemap.xml`, `CRAWL-REPAIR-PLAN.json/.md`, `SOURCE-MANIFEST.json` and `PRIVATE-README.md`. These are **NOT** a deployable static upload or official CMS files.
- Tests: `tests/crawl-repair-smoke.cjs` and `tests/crawl-repair-cli-smoke.cjs`. Workflow manual: `CRAWL-REPAIR-WORKFLOW.md`.

**End-to-end command example:**

```bash
node stage3/seo-engine/bin/prepare-crawl-repair.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --site /ABS/private/current-site-v1.json \
  --robots /ABS/private/original-robots.txt \
  --sitemap /ABS/private/original-sitemap.xml \
  --base https://site.example/ \
  --allow-page-ids page-contact \
  --agents Googlebot \
  --out /ABS/private/NEW-repair-plan
```

Optional `--scope sample` for partial original sitemap and `--add-sitemap-pointer no`. Omit `--allow-page-ids` for sitemap-only suggestions. The actual owner authorization, implementation and subsequent public HTTPS/GSC review must be performed by the lead separately.

## 4. What was actually verified, and what was not

- Current core repair smoke **PASSED** in isolated JavaScript V8 adapter executing the actual GitHub module source, with simulated Node crypto/URL/Buffer/FS. The smoke includes exact single-agent patching, wildcard/shared-group manual holds, two agent modes, full vs partial vs sitemap-index handling, noindex refusal, mismatching Site v1 rejection, redirect collision rejection, and private HTML CSP.
- A full two-module CLI staging flow **PASSED** in V8 with synthetic Node filesystem/crypto: 7 private output files, no overwrite, original-site mismatch rejection. Not a real Node execution.
- `tests/crawl-repair-cli-smoke.cjs` was committed to run *real* Node child processes after the lead/next SEO worker has an integrated checkout, but has **not** been executed here.
- Previous crawl policy, delta, crawler/GSC correlation module smoke and combined CLI flows were also checked with V8 adapters. Not full Node CI.
- No SEO worker GitHub Actions run, no real client site/Google data, real frontend browser, real DNS/TLS/HTTP, file upload or client authorization was verified. Do not imply otherwise.

## 5. Mandatory next-chat behavior and priorities

1. At session start check live GitHub SEO branch, lead branch and latest Actions, and read this transfer plus `INTEGRATION-HANDOFF.md`, `CRAWL-REPAIR-WORKFLOW.md`, `CRAWL-POLICY-WORKFLOW.md`, `BLUEPRINT-CHANGE-REVIEW.md`, `BLUEPRINT-STUDIO-QUICKSTART.md`.
2. Preserve SEO-only scope. Lead remains sole integrator. If full Node checkout is accessible, run focused new Node smoke and fix genuine blockers **inside SEO subtree**; do not spend an entire user-requested big pass on repeated tests.
3. **Best next substantial product task:** integrate existing crawl policy/regression/correlation/repair original-source output into the existing private **SEO Operator Workspace** as one coherent launch/search-delivery panel, source-bound by Blueprint/site/public origin, with visible P0/P1/manual holds and next lead actions. Avoid creating another disconnected report/parallel CMS editor. The unified cockpit must never approve publishing or turn draft robots files into deployable official ZIP.
4. Second priority: make high-value first-client SEO editing handoff actionable against the actual CMS model under existing lead-owned interfaces. Focus on real functionality and owner workflows rather than expanding the count of synthetic regressions.
5. Every pass: commit **only `stage3/seo-engine/**`** on `feature/site-seo-engine`, use expected SHA, GitHub Compare to confirm zero outside-scope changes, update docs, check both heads and CI truthfully. Never silently integrate.
6. If real customer/local/public evidence is missing, finish the independent code/product part; describe the external dependency without asking repeated questions.

## 6. Suggested exact first commands for the next chat

```bash
node stage3/seo-engine/tests/crawl-repair-smoke.cjs
node stage3/seo-engine/tests/crawl-repair-cli-smoke.cjs
node stage3/seo-engine/tests/crawl-policy-smoke.cjs
node stage3/seo-engine/tests/crawl-policy-regression-smoke.cjs
node stage3/seo-engine/tests/crawl-indexing-correlation-smoke.cjs
```

All of these remain **local testing**, not customer acceptance. For the actual workflow see `CRAWL-REPAIR-WORKFLOW.md`. A complete combined lead handoff is in `INTEGRATION-HANDOFF.md`.
