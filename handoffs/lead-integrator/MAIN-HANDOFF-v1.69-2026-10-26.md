# AI Site CMS — MAIN DEVELOPER HANDOFF v1.69 / 2026-10-26

## Correct role — essential

**This is the MAIN CMS developer and integrator chat.** Repository: https://github.com/manufact-test/ai-site-cms. Only working branch: `feature/stage3-ai-site-contract`. The **second independent Design Factory developer works in a separate chat** on `feature/stage3-design-factory`, writable subtree `stage3/design-factory/**`. DO NOT work on the Design Factory branch, make changes inside its subtree, or merge it without explicit owner permission.

A previous conversation mistakenly switched the main chat to Design Factory tasks and produced an incorrect handoff. That work did NOT go into the lead branch. Resume the **main CMS product development**, not D7 packaging/testing.

## Verified code checkpoint

- Latest lead functional HEAD: [`17e9061ee6ca40f12eb6f07f4e31f2ae6b3393c0`](https://github.com/manufact-test/ai-site-cms/commit/17e9061ee6ca40f12eb6f07f4e31f2ae6b3393c0).
- Exact SHA full GitHub Actions [#40285158586 — SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40285158586) with contract SDK/bundle parity, offline Chromium Studio, PHP/SQLite HTTP, hosted Chromium and release-package checks. SUCCESS is a test result, not owner acceptance.
- The separate `main` branch was not modified by these lead commits; no real hosting, production DB, live providers or publishing was authorized.
- v1.68 documentation predates these 26 October code changes. This handoff fixes that outdated documentation and mistaken delegation. This new documentation commit will have its own SHA/CI, separate from verified functional HEAD.

## New main-CMS functionality since v1.68

1. [`c208213`](https://github.com/manufact-test/ai-site-cms/commit/c20821343970baf1fa9664f0a0cccef61209e021) + stabilized [`1e2a2d4`](https://github.com/manufact-test/ai-site-cms/commit/1e2a2d406ffe9806db55c4434e6b577cb4f940e3): **global site-wide text workbench**. Search/filter text across pages, SEO/nav text, component/repeater labels, review original/new values, replace all selected validated values atomically with one Undo/Redo. Save/Publish explicitly separate.
2. [`01ef828`](https://github.com/manufact-test/ai-site-cms/commit/01ef82818bb2a5347455e5f67ec1308a0f34d76d): **conditional lead-form scenarios**, field duplication and local scenario simulator. No live delivery triggered.
3. [`ce915380`](https://github.com/manufact-test/ai-site-cms/commit/ce915380c109f07195880f09374ad8b0ba3779d7): **cross-page section relocation/copy with preserved internal anchor links**, validated SDK operations and draft isolation.
4. [`0d2085e`](https://github.com/manufact-test/ai-site-cms/commit/0d2085e1aafd01f137c31c343c5eefd0c74fff60) + [`17e9061`](https://github.com/manufact-test/ai-site-cms/commit/17e9061ee6ca40f12eb6f07f4e31f2ae6b3393c0): **single site-map planning UI**. Create/reorder/duplicate/delete pages, update page titles/URLs, add/reorder/relocate/copy/delete sections, desktop/mobile preview, new broken internal-link block, one atomic Apply and one Undo. Offline and hosted Chromium scenarios are included. Saving and publishing stay distinct.

Previously delivered: private lead inbox/search/bulk review/CSV, CMS/graph editing, media, SEO/a11y repair, backups, private accounts/grants/audit, preview vs published separation. See v1.68 and `docs/NEXT-CHAT.md` for historical details.

## Product truth and strict boundaries

- 18 stages; 193 total requirements: 135 mandatory, 42 desirable, 16 not needed. Formal acceptance still **0/135**.
- Stage0/Stage1 accepted, Stage2 **NO-GO on manual gates #5–#9**, Stage3 isolated and not formally accepted.
- Do not edit `main`, Hostinger/SSH, real sites, production databases, CELIKOM, live Email/Telegram, production cron, protected PRs, or the worker branch/subtree. No auto-merge or unilateral Design Factory integration.
- Independent Factory D7 is still **unaccepted**; future integration requires a real final artifact, explicit supported/converted/missing-property loss matrix and visual/round-trip parity verification.

## Next substantial MAIN developer task

Develop **one large end-to-end CMS user journey** in page creation/editing, conditional forms and visual page composition with clear Studio ↔ server draft ↔ preview ↔ published fidelity. Prefer genuinely usable workflows over cosmetic microtasks. Check current HEAD first, use GitHub conditional SHA lease (no force), implement a connected block, then existing full CI + only essential critical Chromium coverage. Do not sink time into repeated diagnostic matrices. Update documentation only when the owner asks for the next handoff.

**Start of next chat:** `handoffs/lead-integrator/FIRST-MESSAGE-v1.69-2026-10-26.md`. Continue from the live head, not from an obsolete handoff SHA.
