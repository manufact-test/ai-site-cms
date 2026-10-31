# MANUFACT AI Site CMS — lead integrator handoff v9.4 (31 October 2026)

## Starting point and product boundary

- Exact verified parent branch HEAD when starting: `82d6bdb64467e84f407597264cadcc78a88f8811` on `feature/stage3-ai-site-contract`; the owner-reported Actions run `41211914957` had both `contract` and `technology-runtime` successful on that parent.
- Only the same lead working branch is authorized. Do not merge to `main`, touch production/Hostinger, customer records or the independent `stage3/seo-engine/**`, configure a new external AI API, add a second editor or restore Design Factory.
- Read `docs/MASTER-TZ.md`, this handoff, v9.3 and v9.2, the tail of `docs/ROADMAP.md` and `stage3/docs/PUBLISHED-LINK-INTEGRITY.md`; confirm the **actual current HEAD** again before any new work.
- **135 MUST = 124 engineering candidates + 5 partial + 6 external gates. Personally owner-accepted 0/135.** No tests in this session change these numbers.

## Functional vertical delivered: publication uses the same real authored links as the owner CMS

Before v9.4, the SDK inspection and Quality link repair understood nested Graph `button`, `link`, clickable `image` and rich-text fragments. But the server's final release barrier had a narrower, inconsistent enumeration: only Graph buttons, plus obsolete legacy fields that were not actually rendered under an overriding bespoke Design Graph. This was both a dangerous false-negative and a false-positive for a first client site.

Changes:

1. `stage3/server/PublicRenderer.php` independently validates internal links from **only rendered source**. A Graph section contributes `button.href`, `link.href`, `image.href`, all nested `runs[i].href`; a non-Graph section contributes declared legacy link slots. Unknown paths and section anchors prevent publication, with an actionable source location. Retained but invisible legacy data no longer blocks a Graph release. External URLs remain under the existing closed JS/PHP contract. No backend route, auto-publish, stored schema or visitor markup was added.
2. A 301 alias with a fragment is checked against its **final route** in both `stage3/sdk/contract.cjs` and the independent PHP barrier. The SDK reports an `old-link` advisory plus `broken-anchor` when appropriate. An old redirect with a valid surviving final-page section remains valid but is still worth replacing.
3. The original Studio **Проверка перед публикацией → Ссылки и медиа** UI (`stage3/studio/app.js`, `studio.css`, deterministic `bundle.js`) now exposes exact page and existing section-anchor selectors for each internal link, including Graph rich runs. It preserves source query parameters, displays a bounded explicit `from → to` preview and refuses an atomic batch introducing new broken links/anchors. All changes remain Undoable **draft-only** operations requiring separate Save and Publish. There is no alternate editor, guessed DOM selector or external request.
4. Regression coverage: real server-side PHP `stage3/tests/graph-interactions-smoke.php` checks link, image, inline runs, hidden legacy source, valid fragment and redirected fragment; SDK `stage3/tests/contract-smoke.cjs` checks alias final-target fragments. Existing real Chromium `stage3/tests/studio-browser.cjs` checks anchor selection and Undo in the Quality surface. Documentation: `stage3/docs/PUBLISHED-LINK-INTEGRITY.md` and the ROADMAP addition.

## Verification and exact-SHA rule

- Local `node stage3/tests/contract-smoke.cjs`: PASS (72 grouped flows and related site-recipes/interop checks).
- Local `node stage3/studio/build.cjs --check`: PASS; `node --check stage3/studio/app.js`, `git diff --check`: PASS.
- This local executor does **not** have PHP or Chromium; the focused PHP/real browser scenarios must be observed in the isolated `contract` job on GitHub. The separate Next adapter is covered by `technology-runtime`. **Do not infer either CI job's result from a previous commit; inspect both jobs on the final SHA of this handoff.**
- Synthetic fixture success is *not* live client delivery, real browser approval or an owner-reviewed individual design.

## Next highest priority

Obtain an actual owner/client-approved static 3-viewport reference, the confirmed Blueprint/Site v1 and host/revision plus read-only browser/GET consent; then do one genuine full client pilot, including visual comparison, forms and delivery, link/anchor/redirect behavior, SEO, publish/rollback and P0/P1 recheck. Do not make a synthetic substitute for those gates. Until inputs arrive, continue a substantial missing CMS functionality vertical identified in MASTER-TZ without adding parallel SEO analyzers, template generators or repeated testing infrastructure. The user requires functional development sessions of at least 30 minutes; extend into the next related piece if a single small task finishes sooner. Keep status and handoff source-based and concise.
