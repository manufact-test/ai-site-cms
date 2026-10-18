# AI Site CMS — Stage 1 remaining work and honest progress estimate (v1.29)

**18.10.2026.** Approved authoritative scope: `docs/ROADMAP.md` Stage 1 is **research and recommendation of an open-source foundation**. It is **not** acceptance of a CMS feature or completion of Stage 3 contracts, Stage 4 product storage, Stage 8 working form handlers, or Stage 17 CELIKOM integration.

## Progress

**Approx. 80–85% of research preparation is complete**, **15–20% remains**. This is an explicitly **subjective planning estimate, not an audit-derived percentage and not an earned-value metric**. The owner's recollection of ~80% yesterday is compatible with today's estimate; repeated additional experiments cannot responsibly be converted into a precise percent. Some final risks may require choices/permissions not under autonomous control. **Official Stage1 approval still pending; product acceptance 0/135** (unrelated metric).

**Substantially researched:** foundations candidate comparison/licensing and 135-ID applicability hypotheses; real Jedison/RJSF/Opis tests, custom field handling, responsive preview, restricted script/form behavior, signed capability trial, typed and original HTML source editor prototypes, regeneration/owner override survival, published isolation/rollback, and PHP persistence in fresh processes. All current research CI four jobs PASS [#39122533764](https://github.com/manufact-test/ai-site-cms/actions/runs/39122533764).

## Strict Stage1 exit checklist (from approved ROADMAP)

| Criterion | State / what is still required |
|---|---|
| Open-source and upstream library audit, viable A/B/C alternatives with licenses, maintenance, security, costs | Broad research present; finalize concise dated owner-facing comparisons and verify caveats |
| 135 mandatory-ID adoption matrix across shortlisted candidates: ready / adapt / build / unsuitable | Research matrix exists as applicability hypotheses, **not** 135 tests or accepted product |
| Comparable isolated proof for shortlisted alternatives, shared-host PHP feasibility characterized without touching real sites | Many GitHub CI passes; real shared hosting **unverified**; read-only test only after owner permission, or explicitly document uncertainty |
| Final deliverable: clear **preferred foundation / fallback / reusable standalone libraries**, own-build scope and rationale | **Still open; no final stack chosen** |
| Owner examines tradeoffs and approves choice/direction | **Required for Stage1 acceptance; not done** |

## Decision-affecting remaining scientific gaps

1. **Independent other-model trial:** Original AI-generated HTML/CSS/JS **and independently model-produced manifest/intent**, evaluated against separately held oracle. Not yet possible with the available model-generation tools in this chat, not independently verified. Do not repeat manually authored fixtures as 'second model'. If unavailable, disclose risk and request a real external artifact only when owner wants a confidence gate, rather than silently claiming completion.
2. **Host portability:** Standard PHP/SQLite/MySQL and CDN/React runtime assumptions; no real Hostinger touch permitted. Can write a detailed constraint/risk recommendation without a live host connection, but never claim it tested.
3. **Owner's stage1 selection:** Summarize ranked choices with explicit licensing/dependency/maintenance and self-built pieces; stage 2 remains off until explicit owner approval.

**Research-versus-implementation boundary:** Full arbitrary custom JS, real forms, multi-host durable backups/auth, future contract registration, full dynamic CSS editing and malicious rollback-resistant extensions may be engineering requirements of subsequent stages. Do **not** grow Stage1 indefinitely by demanding complete product functionality before a foundation can be recommended. Record unverified design risks and carry them to proper roadmap stages.

**Next chat priority:** finish Stage1 decision pack and unambiguous owner recommendation / fallback / tradeoffs, plus an evidence/missing-proofs tracker. Avoid another long string of nearly identical browser probes. Do not choose/accept stack on owner's behalf. All prototypes stay in research branch, main documentation only. No Hostinger or CELIKOM deployment.
