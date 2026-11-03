# Lead Integrator — structural block editing and focused navigation, 2026-11-04

## Exact verified checkpoint

- Repository/branch: `manufact-test/ai-site-cms` / `feature/stage3-ai-site-contract`.
- Previous verified SHA: `0407261da853c29333fe795cdfd86901c577cdac`, [CI #41719118651 — SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41719118651).
- Functional structural block SHA: `05c119ef9e94f627905a1c5827b6de696a3e6e68`. Later test-only isolation and hosted keyboard/compact focus changes are included in **final verified** `27476ab4a1056935aa182462b5cf452e792d4470`.
- [Full no-deploy CI #41730348452 — SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41730348452) includes genuine offline/hosted Chromium, Technology Runtime and MariaDB 10.11/11.8.
- [Chromium screenshots #13277435060](https://github.com/manufact-test/ai-site-cms/actions/runs/41730348452/artifacts/13277435060), [FOX code-only ZIP #13276735305](https://github.com/manufact-test/ai-site-cms/actions/runs/41730348452/artifacts/13276735305), ZIP GitHub digest `sha256:92b9b9187bf941029ba2537b9994adabaf35aada1685decf5931cdb19b7d9ac9`, expires 2026-11-10T22:26:41Z.
- Documentation HEAD is the commit introducing this handoff; cite its actual SHA from Git after write. CI head remains `27476ab4a1056935aa182462b5cf452e792d4470`.

## Implemented in existing Stage3 Studio

1. `structural()` now reconciles the active section after add/copy/remove. On add/duplicate, select the inserted block directly by generated ID, set block Inspector and request iframe reveal; remove redundant two-stage redraw in callers.
2. When the currently selected section is removed, preserve the nearest surviving section (next at same index, else previous at page end), select block scope and reveal it on the full-page central canvas. No jump to first block.
3. Keyboard page/section selection restores focus after the sidebar redraw, and on compact widths the Inspector heading is centered after the pointer/layout frame when focus remains within the navigation context. Existing central-click editing, media, forms, Design Graph, SEO, Save/Review/Publish and rollback are unchanged.
4. `stage3/studio/bundle.js` embeds the exact updated `app.js`; real build parity is CI checked. No second editor or schema.

## Browser and release evidence

- `stage3/tests/studio-browser.cjs` checks new catalog block selection and visibility and executes duplicate-middle/remove-middle, remove-last and Undo on a **separate unsaved Chromium tab**. This isolates structural history mutations from the main long-page editor test's Undo/Redo stack. No site-data changes are retained.
- `stage3/tests/approved-site-browser.cjs` keeps keyboard page selection and compact Inspector heading visibility assertions; now records focus/scroll diagnostics on failure. Earlier attempts #41727957441, #41728357954, #41728761870 and #41729570809 failed before final focus/test isolation corrections and are **not** release candidates. Full #41730348452 is green.
- Existing PHP/SQLite/MariaDB checks cover authenticated server sessions, media, forms, SEO, draft Save/Review/Publish, rollback, database isolation and shared-hosting package safety.

## Boundaries and next work

FOX `https://mediumpurple-fox-175549.hostingersite.com/studio` is **already installed but still older**. We have **not** deployed, installed, modified MariaDB or `public_html/`, secrets, Cron, Stage2, `main` or production. Current FOX candidate is a reviewable runtime-only ZIP, not automatic upload permission. Require separate owner consent, protected code and DB backup, code inventory validation, reversible sibling `stage3/` switch and smoke before personal owner acceptance. See [FOX release/rollback gate](../../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md).

First real client site remains gated behind its original landing source and independently approved desktop/tablet/mobile static design variants. Formal owner acceptance remains **0/135 MUST** until Ilya verifies real FOX UI.
