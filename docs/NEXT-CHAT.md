# MANUFACT AI Site CMS — каноническая точка перехода между чатами (31.10.2026, v9.8)

**Актуальный handoff главного разработчика:** [MAIN-HANDOFF-v9.8](../handoffs/lead-integrator/MAIN-HANDOFF-v9.8-2026-10-31.md).

**Готовое первое сообщение следующему чату:** [FIRST-MESSAGE-v9.8](../handoffs/lead-integrator/FIRST-MESSAGE-v9.8-2026-10-31.md).

## Точная контрольная точка

- Repository: manufact-test/ai-site-cms
- Lead branch: feature/stage3-ai-site-contract
- Last functional HEAD at handoff: ab04bc0ac87645cc7882a726a2b18c2d5a7c1312
- Exact-SHA Actions: [41239753483](https://github.com/manufact-test/ai-site-cms/actions/runs/41239753483) — technology-runtime=SUCCESS, contract=FAILED.
- Current failure: stage3/tests/approved-site-browser.cjs:700; Playwright click on #server-approved-vault-open is intercepted by #server-resources or .sidebar. Do not claim green CI; see v9.8 handoff.
- Studio screenshot artifact: [ai-site-stage3-editor-screens](https://github.com/manufact-test/ai-site-cms/actions/runs/41239753483/artifacts/13056942380).
- main remained unchanged at 12e9c3feb707e5ad46b2caeeed379eb40618466b. No production/Hostinger/CELIKOM actions.

## Read before work

1. [MASTER ТЗ](MASTER-TZ.md) — product scope and owner decisions.
2. [ROADMAP](ROADMAP.md) — latest dated engineering checkpoints.
3. [MAIN HANDOFF v9.8](../handoffs/lead-integrator/MAIN-HANDOFF-v9.8-2026-10-31.md) — exact code/test state and immediate next task.
4. [Studio UX acceptance](../stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md) — owner requirements and what remains unaccepted.
5. [Accelerated macroblock program](ACCELERATED-MACROBLOCK-PROGRAM.md).
6. [PROJECT-STATUS.json](../PROJECT-STATUS.json) — machine-readable checkpoint.

## Owner's current Studio decision

The existing admin's basic visual appearance is acceptable provisionally. The immediate problem is **not a wholesale visual redesign**; it is confusing information architecture and too many simultaneously visible buttons/cards/technical labels. Prioritize a clear WordPress-like navigation model, one obvious primary action per context, and secondary/advanced controls hidden until needed. Keep the existing Studio/Workbench and its contracts; no second editor.

## Product and safety state

Stage 2 remains NO-GO (#5–#9 gates open). Stage 3 is isolated and not formally accepted. Requirement ledger: 135 MUST = 124 engineering candidates + 5 partial + 6 external gates; owner acceptance **0/135**. First real pilot uses the owner's existing landing, which has not yet been supplied; do not invent a client or assets.

Only work on feature/stage3-ai-site-contract. No main merge, Hostinger, production, CELIKOM, real customer data or live provider delivery without explicit permission. SEO Engine is already integrated; do not repeat integration. Design Factory remains separate and unapproved.

**Immediate next action:** inspect and fix the real pointer-interception defect in the approved-site browser journey, then run the existing full CI once on the exact resulting SHA. Continue with substantial user-facing macroblocks, not endless micro-polish.
