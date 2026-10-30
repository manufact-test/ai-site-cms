# MANUFACT AI Site CMS — Lead Integrator handoff v8.0
**30 October 2026 · prepared for the next main integrator chat**

## Authority and boundaries
- Repository: https://github.com/manufact-test/ai-site-cms
- Lead integrator's ONLY working branch: `feature/stage3-ai-site-contract`.
- Parallel SEO specialist owns `feature/site-seo-engine`, and exclusively `stage3/seo-engine/**`. Do not edit, merge, cherry-pick or integrate that branch without the owner's explicit permission. No competing edits.
- DO NOT touch `main`, production, Hostinger, real databases, secrets, real SMTP/Telegram, or live customers. Browser/HTTP tests must be fully isolated.
- This system is meant to reproduce **approved individual client sites**, faithfully across desktop, tablet and mobile, not become a generic template SaaS/CRM. No arbitrary HTML/JS injections.
- Chief integrator independently chooses real implementation increments; owner expects substantial ~30-minute-equivalent functional work per turn, not minutes of CI theater, cosmetic polish, or repeated test-only turns. Do not pretend any elapsed-time duration you cannot verify.
- All commits must have successful `contract` and `technology-runtime` jobs on the matching exact final branch HEAD before claiming success. Pipeline: `.github/workflows/stage3-ai-contract.yml`.
- Existing MUST accounting as of handoff: **135 total; implemented_candidate 124, partial 5, owner_environment_gate 6, ownerAccepted 0**. Never promote merely because tests pass. External signed/approved client reference is still missing, so real-world acceptance remains blocked.

## How to recover current state
1. Always read branch HEAD from GitHub first. Do NOT assume the SHA below is still latest.
2. Examine the newest GitHub Actions run for the exact SHA; verify both jobs rather than trusting a green run for an old commit.
3. Read `docs/ROADMAP.md`, `docs/MASTER-TZ.md`, `stage3/docs/APPROVED-SITE-PACKAGE.md`, `stage3/mandatory-coverage.json` and this document.
4. For older baseline see `handoffs/lead-integrator/MAIN-HANDOFF-v7.0-2026-10-29.md` (dated and partially superseded); `stage3/studio/build.cjs` generates the hermetic `stage3/studio/bundle.js` and CI insists on byte-for-byte parity.
5. A previous head at the start of this final turn was `8b579ae5ab651b64273e0c96fc6c00a41b2f8d48`, with green run https://github.com/manufact-test/ai-site-cms/actions/runs/41043133426. New commits from the final turn supersede this. Check final HEAD/CI below against GitHub.

## Recently completed features (lead branch)
- Approved-site sealed-v2 source fidelity: local assets, WOFF2 fonts, header/footer/branding and responsive original mockups; PHP, HTML/Next exports, releases and private inbox.
- Typed Design Graph, richer layouts/styles, animations, responsive backgrounds/video, galleries with captions, native popover lightboxes and localized UI.
- 30 October series: 1:1, 16:9, 3:4 and natural gallery photo crops; independent desktop/tablet/mobile crop shapes; grid/scroll galleries; no-JS keyboard-friendly previous/next controls; configurable per-device visible-card counts (desktop 1–6, tablet 1–4, mobile 1–2). JS/PHP parity and Studio quick/full editing.
- **Final functional block in this chat**: standalone image captions using semantic `<figure class="cmsdg-image-figure"><picture|img|link>…</figcaption></figure>` output; gallery pictures keep existing outer figure and never get nested figures. Safe text escaping, optional image links and responsive artwork preserved, Studio quick/full authoring, browser bundle parity, JS/PHP smoke tests.
- Graph code paths: `stage3/sdk/design-graph.cjs`, `stage3/server/DesignGraph.php`; Studio: `stage3/studio/app.js` plus generated `stage3/studio/bundle.js`. Tests `stage3/tests/contract-smoke.cjs`, `stage3/tests/graph-interactions-smoke.php`; docs `docs/ROADMAP.md` and `stage3/docs/APPROVED-SITE-PACKAGE.md`.

## Current testing caution
- Several previous `stage3/tests/server-e2e.cjs` workflow runs failed with Node's internal undici `assert(!this.paused)` when a loopback PHP socket closed. Node 24 alone did not permanently cure this. In an isolated-test-only file, HTTP response buffering and uncaught-exception diagnostics were added; exact HEAD `8b579ae...` had BOTH CI jobs green. Treat flaky HTTP E2E as a known risk; never weaken or skip the actual server tests to get a green badge. If it recurs, trace the HTTP route and connection lifecycle. Keep tests isolated and never affect production transport.
- GitHub Actions superseded workflow runs normally show CANCELLED due to branch concurrency; always inspect latest exact SHA. A new commit restarts CI.
- The template script for the offline studio bundle assembles SDK + first-party app with exact whitespace; if modifying either, regenerate/synchronize bundle and check parity.
- The QA status is engineering evidence only; the very first externally approved site still requires strict independent human screenshot/asset/layout acceptance in all viewports.

## Recommended next feature increments
1. **Implement the individual-client workflow in MASTER-TZ, not a site factory.** Start from an external AI author's approved desktop/tablet/mobile designs and authored site payload; improve site-specific manifest field editing, responsive overrides, source fidelity, QA and publish/rollback. Do not create libraries of card, pricing, FAQ, page or section presets.
2. Build end-to-end editing plus server parity, authoring UI, real visual/browser evidence, and CSS/JS validity; do not submit only validators or cosmetic checks.
3. Prioritize the first **real externally approved sealed-v2 client site** as soon as the owner supplies it, comparing desktop/tablet/mobile and preserving every approved source asset and SEO intent. No premature owner acceptance.
4. Keep roadmap and this handoff current as work changes; do not automatically import SEO branch while another developer owns it.

## Last-turn reconciliation checklist
- Final-turn implementations and docs are already committed on the lead branch, but always fetch fresh final SHA and its CI status: **do not claim this handoff proves green CI by itself**.
- When needed read `stage3/docs/APPROVED-SITE-PACKAGE.md` for supported sealed-v2 payloads and import workflow.
- Respect privacy, branch segregation and build reproducibility.

**Next chat is the NEW chief developer and sole integrator. Start by verifying live GitHub state, then execute a substantial feature block rather than re-stating this handoff.**

## Final-approach correction and verified CI
- The 30 Oct final image-figure work is implemented, with JS/PHP parity and the isolated smoke tests green on SHA `aad8597103ccbfb0c455142b8b39f713417e5376` in run https://github.com/manufact-test/ai-site-cms/actions/runs/41053303999. This is a known verified **pre-documentation** checkpoint; always use a fresh branch HEAD and new workflow after any subsequent edit.
- The early E2E failures were real: gzip content for large `/bundle.js` was truncated. The test now diagnoses the last HTTP probe and uses the independent native Node HTTP parser for the Studio bundle. `stage3/server/Api.php` limits **application-level** gzip to first-party static assets <=65536 bytes; larger assets send identity with explicit Content-Length and variant-sensitive ETags. This avoids the truncated PHP gzip response while preserving full test coverage. Deployment HTTP server compression is independent.
- The full browser and PHP HTTP checks remain mandatory; do not remove this coverage or re-enable large-asset PHP gzip without cross-browser/gzip integrity tests.

## Product boundary confirmed, 30 Oct 2026

The owner's explicit `docs/MASTER-TZ.md` outranks older tasks and examples: no ready-made site/page/section/card/pricing/FAQ composition library; sites are created by an external AI developer from approved mockups, then imported as site-specific editable manifests. The prior six starter-pattern changes were undone in a non-destructive commit `94d12f1d0d59d71cec7844c8fade035f92813c9b`. Do not reintroduce them. Current work is CMS field inheritance for existing client pages, not a starter catalog.

## Mandatory product boundary update (30 Oct 2026)
The generic site composer and canned Graph style recipes are now removed from shipped Studio as well as the six erroneous patterns. Do not reinstate them; `docs/MASTER-TZ.md` is authoritative. The independent AI author produces a finished customer-specific site from approved three-screen mockups; CMS handles manifest-bound editing, draft, publishing and rollback. Legacy SDK recipe files may remain for historical tests but MUST NOT ship as website-generation controls. E2E uses synthetic JSON site contracts to verify actual editing/publishing, not generated sites.
