# AI Site CMS — MAIN HANDOFF v1.68 / 2026-10-25

## Verified checkpoint
- Repository: https://github.com/manufact-test/ai-site-cms. Lead branch: `feature/stage3-ai-site-contract`.
- **Last verified functional SHA:** [`70a6a4776b0389fd5a35830226952a0372cccd65`](https://github.com/manufact-test/ai-site-cms/commit/70a6a4776b0389fd5a35830226952a0372cccd65).
- **Same SHA full CI:** [Actions #40234189046 — SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40234189046). Full pipeline: contract/offline SDK, standalone bundle parity, real Chromium offline Studio, PHP 8.3/SQLite HTTP, hosted Chromium and offline package.
- The earlier handoff v1.67 was committed concurrently while a newer inbox branch run was red. It correctly warned about `8db3d32` at that time. **Our later functional commit `70a6a4776b03` fixes the hosted notification disabled bug and is GREEN.** Do not mistake old CI failure for current source. This new v1.68 handoff is documentation-only relative to code SHA; verify HEAD's own CI separately.

## Functional delivery: end-to-end private leads
- Site-scoped owner/editor/publisher **search** through lead name/email/message with bound SQL plus literal `%`, `_`, `!` escaping; **status** all/new/reviewed.
- **Pagination:** 25 per page, total and per-status counts, independent sidebar previous/next controls. Search reset starts at page 1.
- **Multi-select/bulk review:** select new leads on current page; POST `/api/sites/{id}/submissions/bulk-review` with 1–50 distinct IDs; server validates all remain new and belongs to site in a transaction or rejects whole set. No premature notification ack and no automatic publish/send.
- **CSV export:** GET `.../submissions/export`, respects current query/status, UTF-8 BOM; explicit 422 when matching count exceeds 1000; spreadsheet-formula neutralization; no-store/private response, audit without PII. Operators must store downloaded personal-data exports securely.
- **Notification state fix:** `#server-notifications-seen` button derives enabled state from authoritative unread count rather than its prior disabled flag. Earlier hosted Chromium regression is resolved.
- Updated `stage3/server/SiteRepository.php`, `Api.php`, `stage3/studio/hosted.js`, `studio.css` plus `server-e2e.cjs` and `hosted-browser.cjs`. Full CI #40234189046 SUCCESS on exact functional SHA.

## Parallel work retained and boundaries
- v1.67 SEO/a11y quality report → exact Design Graph node → fix → recheck, with Undo/Redo and draft-only Apply, functional `0eeff2e9cd77`, [CI SUCCESS #40233695097](https://github.com/manufact-test/ai-site-cms/actions/runs/40233695097).
- SEO/social live preview, nested graph OG fallback, responsive media `srcset`, visual inspector and other existing Stage3 features remain. No new schema, real provider setup or deployment from this block.
- Provisional Design Graph/D7 envelope is **not** proof of compatibility with the real independent Design Factory. After final D7 artifact is provided, audit supported/converted/missing properties and screenshots first; do not modify `feature/stage3-design-factory` or `stage3/design-factory/**` without approval.

## Mandatory project truth
- 18 planned stages, 193 requirements (135 required / 42 desirable / 16 unnecessary); first full release needs **135/135**.
- Stage0/1 accepted; **Stage2 NO-GO #5–#9** with human/hosting gates. Technical Stage2 ~85–90% is *not* total CMS completion; Stage3 isolated and not formally accepted, **0/135** accepted.
- Prohibited without owner permission: `main`, real Hostinger/SSH, production DB, sites, CELIKOM, live Email/Telegram, production cron, PR #3/#4, independent Factory writes.

## Next lead action
1. Read `PROJECT-STATUS.json`, `docs/NEXT-CHAT.md`, `docs/ROADMAP.md`, `stage3/docs/AI-DESIGN-COMPOSITION.md` and this handoff. Verify actual HEAD and SHA/CI, because other chats may push concurrently; use non-force SHA leases.
2. **One "продолжаем" means one large meaningful user journey (3–6 related functions)**, e.g. next content/forms/page composition + Studio/preview/published fidelity; not repetitive small fixes. Finish implementation first, run existing full CI + just necessary critical browser test.
3. Separate source SHA verification from later docs SHA and don't assert owner acceptance from a green CI.
4. Ready first message: `handoffs/lead-integrator/FIRST-MESSAGE-v1.68-2026-10-25.md`.
