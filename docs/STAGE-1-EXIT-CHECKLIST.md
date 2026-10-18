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

## v1.30 — package prepared for owner review (18.10.2026)

**Research synthesis delivered (documentation-only):** [owner recommendation: A/B/C, licenses, risks and scope](STAGE-1-OWNER-DECISION.md); [individual 135-ID matrix](STAGE-1-ADOPTION-MATRIX.md) with A/B/C hypotheses `Г/А/С/Х` (0 ready, 70 adapt+65 build in A/B; 0 ready, 91 adapt+44 build in C). This measures **availability of reusable pieces, NOT product readiness**. Neither library nor CMS passes the entire 135-ID feature set out of the box. **Owner approval is still required; Stage1 NOT accepted; Stage2 NOT started; technology_selected=false.**

Upstream license/source review dated 18.10.2026: Jedison MIT; RJSF Apache-2.0; Slim MIT; Opis Apache-2.0; Winter MIT core; Puck MIT; GrapesJS BSD-3-Clause; VvvebJs Apache-2.0 vs Vvveb CMS AGPL. Transitive licenses and any assets still need SBOM/NOTICE verification at import. Recommendations are not legal advice.

**Honesty gates unchanged:** second independent LLM-generated HTML/CSS/JS site **and separately generated manifest** untested; actual Hostinger read-only not authorized/tested; production atomic backup/recovery, external trust, arbitrary-site coverage/JS security not verified. These are disclosed follow-on risks, not reasons to restart infinite Stage3 prototypes during research. Current four CI jobs from run #39122533764 passed but **no new source-code CI was run for documentation v1.30**.

**Checklist resolution:** evidence/comparison/license summary/recommendation/135 ID categorization are prepared. Remaining exclusive Stage1 exit gate is owner choice and explicit acceptance; risks should be acknowledged with the direction. Research subjective ~80–85% prior to this pack was never earned value; do not invent a new precise percentage to claim Stage1 accepted.
