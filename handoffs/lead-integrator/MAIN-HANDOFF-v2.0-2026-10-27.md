# LEAD MAIN — HANDOFF v2.0 (27.10.2026)
**Role:** sole main engineer/integrator after owner scope correction. **Branch:** \`feature/stage3-ai-site-contract\`. **Owner-approved MASTER:** [../../docs/MASTER-TZ.md](../../docs/MASTER-TZ.md). Other authority: 193 original answers in [../../requirements/requirements.csv](../../requirements/requirements.csv), [../../docs/ROADMAP.md](../../docs/ROADMAP.md), [../../docs/CODE-SCOPE-AUDIT-2026-10-27.md](../../docs/CODE-SCOPE-AUDIT-2026-10-27.md).

## Product in one paragraph
External AI investigates professional UX/UI and SEO, creates several optional design options each as exactly **three static images** (desktop/tablet/mobile) + FULL client sales/UX/interaction/motion explanation + separately portable internal spec. Client/owner approves. AI **then and only then** builds one fully functional website matching approved specs, supplies CMS contract. Existing CMS allows precise per-element/section/responsive/SEO and repeater (FAQ add/remove/reorder etc) changes, explicit save/publish/rollback. Prototype must NOT be implemented HTML/CSS and AI generation is NOT embedded in CMS.

## Current exact facts at handoff
Previous lead head: \`f02b3b0a8512bcc3a6798271c56309db65ba5379\`. \`main\` was \`12e9c3feb707e5ad46b2caeeed379eb40618466b\`. Design Factory branch at \`bbe084390a7fa2379bf4f80ea6ad607d3c7140b9\` has old visual 2/10 and **no code copied to lead**. PR #10 old Factory closed without merge. Old D7 technical green CI #40567001862 does **not** mean owner visual approval. Lead earlier functional D1–D6 was validated CI #40551009731, no main/prod deploy. Stage2 previous NO-GO #5–#9 (real hosting/licensing etc), Stage3 formerly 0/135 formally signed; don't treat formal acceptance as implementation progress. Check live heads on entry, do not assume old head.

## Do work now, not planning forever
1. First substantial batch: read new MASTER/restructured roadmap; inspect actual import and bundle graph. Classify each subsystem KEEP/ADAPT/REMOVE; physically remove **proven unused** code/config/CI within lead; keep graph, forms, SEO, media used by API. Design Factory old branch out of core by default.
2. Immediately after audit deliver **one complete user story**: take externally supplied prototype assets/spec (for initial local test can use existing non-factory site) → create fully rendered responsive site with correct editor manifest → open in Stage3 Studio, edit content, per-breakpoint typography/spacing, FAQ repeaters, page SEO and images → publish/rollback. Favor reuse existing code and fix observed functional gaps rather than reimplement.
3. Demonstrate owner-facing actual interface early and let owner propose final UX fixes; no dozens of CI experiments. Always run existing CI + 1–2 critical smoke. Do not ask owner trivial implementation questions; ask only scope changes/production/actual permissions.
4. Track original 193/135 mandatory without inventing extra cross-domain modules. No new templates, second layout editor, embedded AI/CRM/billing, deep export labs for their own sake. Security, data loss protection and typed validation mandatory.
5. Second worker owns only \`feature/site-seo-engine\` \`stage3/seo-engine/**\`, end-to-end **SEO intelligence/technical artifact** described in \`handoffs/parallel/SEO-ENGINE-v2-ASSIGNMENT.md\`. Lead alone decides integration after preserving existing SEO fields; no worker edits to core/Studio/APIs/roadmap/main.
6. When user asks for next chat handoff, update actual SHA/results and short completion status, not long historical banner chains.

## Boundaries
No merge to \`main\`, external production/Hostinger, or CELIKOM live. No stealth deletion of integrated code, no design-factory import. A prior unapproved "3 new websites/designs" assignment is **cancelled**. Docs edits are authorized for this scope reset; further implementation should prioritize actual code.


## Переход к следующему главному чату · 28.10.2026
**Обязательно начать с [MAIN-HANDOFF-v2.1-2026-10-28.md](MAIN-HANDOFF-v2.1-2026-10-28.md)** — там актуальные SHA, CLI, результаты проверки и пилотная последовательность. Этот файл сохранён для истории, а не как самое свежее состояние.
