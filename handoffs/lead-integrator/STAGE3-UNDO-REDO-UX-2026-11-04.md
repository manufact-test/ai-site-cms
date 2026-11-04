# Lead Integrator — Stage3 Undo/Redo continuity and final engineering checkpoint, 2026-11-04

## Exact Git and CI checkpoint

- Repository: `manufact-test/ai-site-cms`; branch: `feature/stage3-ai-site-contract`.
- Previous verified functional/test SHA: `27476ab4a1056935aa182462b5cf452e792d4470`; preceding docs HEAD: `aa6fc0645f443c154652c4503b641f0952e6d07c`.
- This pass: functional Studio + bundle + Chromium regression commit `7d7ebeb568d92acad53d221517839d81d367b19f`; additional keyboard asynchronous-focus and hosted pointer test hardening; final **CI-tested code/test SHA**: `a8127fba07bd3419d94a471cad405d923f39478c`.
- [Full **no-deploy** CI #41791424963 — **SUCCESS 4/4**](https://github.com/manufact-test/ai-site-cms/actions/runs/41791424963): real offline Chromium, real authenticated PHP-hosted Chromium and contract, technology runtime, MariaDB 10.11 and 11.8.
- [Chromium screenshot evidence #13303143467](https://github.com/manufact-test/ai-site-cms/actions/runs/41791424963/artifacts/13303143467). [Dedicated FOX Stage3 runtime-code-only ZIP #13303842288](https://github.com/manufact-test/ai-site-cms/actions/runs/41791424963/artifacts/13303842288), GitHub artifact digest `sha256:aa7f4f0a3df34197c9b0f70117dc72b3ac48a946cb3168b7e9bb722266e22cd6`; expires `2026-11-11T07:22:59Z`. These are build artifacts, **not** evidence of deployment.
- Documentation HEAD is the docs-only Git commit adding this handoff; read its exact SHA from the branch after writing. The last executable code and tests were checked at `a8127fba07bd3419d94a471cad405d923f39478c`.

## Completed engineering work

1. In the **existing** Stage3 Studio (`stage3/studio/app.js`) added a single `stepHistory(direction)` selection reconciliation for `#undo` and `#redo`. It remembers the prior page, section and FAQ/repeat-item position before undoing/redoing site data, and chooses a valid nearby section/item if the selected one disappeared. The Inspector remains in meaningful block/element context; the selected surviving item or block is revealed on the central full-page canvas when necessary. The change creates **no second editor, schema, API, UI button or publish path**.
2. Synchronized embedded application in `stage3/studio/bundle.js`; CI verifies bundle/source parity. Existing Stage3 save/review/publish/restore and Technology Graph integrations remain.
3. Extended `stage3/tests/studio-browser.cjs` with an isolated second Chromium tab: duplicate mid-page timeline, Undo to exact original JSON, verify nearest comparison section is on screen and Block Inspector active, Redo clone, Undo again; add FAQ repeated item, Undo to exact JSON with nearest surviving FAQ card highlighted in Element Inspector, Redo, Undo. This tests the true canvas/selection behavior without polluting the main long-page scenario's Undo stack.
4. Retained strict sidebar keyboard-focus checks but now **await asynchronous post-redraw focus** before assessing target. In `stage3/tests/approved-site-browser.cjs`, verify a real pointer click on a **bound** `data-cms-editor-section` in authenticated PHP preview; wait for Inspector transition instead of force-clicking arbitrary nested HTML.
5. Previous CI attempts [#41790645640](https://github.com/manufact-test/ai-site-cms/actions/runs/41790645640) (instant keyboard focus assertion) and [#41790965444](https://github.com/manufact-test/ai-site-cms/actions/runs/41790965444) (unbound PHP section click test) failed before these test corrections and are **superseded** by green #41791424963. Do not use failed attempts' artifact IDs as FOX update candidates.

## Strict deployment and owner-acceptance boundary

- The isolated FOX Stage3 host `https://mediumpurple-fox-175549.hostingersite.com/studio` **is installed; owner login succeeded earlier; installed code is OLDER and was NOT changed this turn**.
- No action on `public_html/`, Stage3 private files, MariaDB, Cron, secrets, other Hostinger sites, Stage2, `main`, production or a real first client landing. We did **not** run install, `--plan`, `--apply`, deploy or automatic release.
- A separately authorized **code-only** FOX update needs read-only runtime/path inventory, protected backups, archive digest/manifest verification, a reversible sibling `stage3/` switch, smoke tests and rollback plan: [FOX release gate](../../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md). User approval for the earlier installation is not approval for this update.
- Formal Ilya owner MUST acceptance is still **0/135**, pending actual hands-on testing against an updated authorized FOX candidate. Do not report owner acceptance from automated Chromium tests.
- First real individual landing remains gated by **original source assets** and independently approved **static desktop/tablet/mobile** designs under `docs/MASTER-TZ.md`. AI develops the bespoke site externally; CMS edits that site; no generic factory/second WYSIWYG.

## Immediate next chat

1. Read `docs/NEXT-CHAT.md` first, then **this handoff**, `handoffs/lead-integrator/STAGE3-STRUCTURAL-BLOCK-UX-2026-11-04.md`, `stage3/docs/ADMIN-UX-ARCHITECTURE-2026-11-03.md`, `stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md`, `docs/MASTER-TZ.md`, `docs/ROADMAP.md` and the [FOX gate](../../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md).
2. Preserve branch and latest verified executable SHA; do a broad safe QA/integration pass as needed. Avoid tiny repetitive changes: user prefers useful grouped ~30-minute engineering passes, one coherent report, tests and 4/4 CI.
3. **Only after Ilya separately and explicitly authorizes the FOX code-only refresh**, inspect current host read-only, verify protected backups, switch runtime reversibly, run smoke and ask him to evaluate the central page/section/item editor on desktop and phone, Undo/Redo, long scroll, gallery, responsive Inspector. No other installation or production mutation.
4. When user tests, fix concrete findings in Stage3 code, rerun full no-deploy CI, and update this checkpoint; never assume last CI proves the live installed version.
