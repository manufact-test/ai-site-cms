# MANUFACT AI Site CMS — каноническая точка перехода (01.11.2026, v9.9)

**Актуальный handoff:** [MAIN-HANDOFF-v9.9](../handoffs/lead-integrator/MAIN-HANDOFF-v9.9-2026-11-01.md).  
**Готовое первое сообщение:** [FIRST-MESSAGE-v9.9](../handoffs/lead-integrator/FIRST-MESSAGE-v9.9-2026-11-01.md).

## Точная контрольная точка

- Repository: `manufact-test/ai-site-cms`.
- Lead branch: `feature/stage3-ai-site-contract`.
- Last verified functional SHA: `3a5fe6072600b7d74152673ae3316b5cc1e1483b`.
- Exact-SHA full Actions: [#41252586497](https://github.com/manufact-test/ai-site-cms/actions/runs/41252586497) — technology-runtime=SUCCESS, contract=SUCCESS.
- The pointer-interception failure from [#41239753483](https://github.com/manufact-test/ai-site-cms/actions/runs/41239753483) is resolved. Do not repeat that work.
- `main` remains `12e9c3feb707e5ad46b2caeeed379eb40618466b`; no merge, deployment, Hostinger or CELIKOM production activity.
- The documentation-only v9.9 commit sits on top of the functional SHA. Verify the live branch tip before coding.

## Owner's current Studio decision

The current Studio/Workbench is **temporarily agreed as the working baseline** until the first real owner site is connected and the owner can edit it hands-on. Do not continue abstract UI redesign or speculative panel rearrangement before that. Once the real site is in the CMS, collect concrete owner feedback and make targeted changes. This is not final UI/UX GO or Stage 3 acceptance.

## First pilot

The pilot must start from the owner's existing landing page. Its materials have not yet been supplied. Do not choose a random client/site or invent content. Required sequence: audit → static desktop/tablet/mobile prototype → explicit approval → actual site implementation → connect to existing CMS → owner hands-on review.

## Product and safety state

- Stage 2 remains NO-GO; gates #5–#9 remain open.
- Stage 3 remains isolated and not formally accepted.
- Requirement ledger: 135 MUST = 124 engineering candidates + 5 partial + 6 external gates; owner acceptance **0/135**.
- SEO Engine is already integrated; do not repeat it.
- Design Factory remains separate and unapproved.
- Work only on `feature/stage3-ai-site-contract`; no main merge, Hostinger, production, CELIKOM, real customer data or live message delivery.

## Read before work

1. [MASTER ТЗ](MASTER-TZ.md)
2. [ROADMAP](ROADMAP.md)
3. [MAIN HANDOFF v9.9](../handoffs/lead-integrator/MAIN-HANDOFF-v9.9-2026-11-01.md)
4. [Studio UX acceptance](../stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md)
5. [Accelerated macroblock program](ACCELERATED-MACROBLOCK-PROGRAM.md)
6. [PROJECT-STATUS.json](../PROJECT-STATUS.json)

**Next action:** verify the live branch tip, read v9.9, inspect actual remaining product gaps and select one substantial cross-layer macroblock. Do not resume the fixed pointer issue or speculative Studio redesign.
