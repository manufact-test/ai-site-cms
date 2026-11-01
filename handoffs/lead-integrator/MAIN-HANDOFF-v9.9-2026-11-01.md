# MANUFACT AI Site CMS — lead integrator handoff v9.9 (01.11.2026)

## 1. Exact repository checkpoint — verify before coding

- Repository: `manufact-test/ai-site-cms`.
- Sole lead branch: `feature/stage3-ai-site-contract`.
- Last verified **functional** SHA: `3a5fe6072600b7d74152673ae3316b5cc1e1483b`.
- Exact-SHA full GitHub Actions: [run 41252586497](https://github.com/manufact-test/ai-site-cms/actions/runs/41252586497).
  - `technology-runtime`: **SUCCESS**.
  - `contract`: **SUCCESS**.
- The run is tied to the exact functional SHA above. It includes the hosted approved-site browser journey; the former pointer-interception failure is no longer open.
- The latest artifacts from this run:
  - [Offline Studio package · 13062460096](https://github.com/manufact-test/ai-site-cms/actions/runs/41252586497/artifacts/13062460096).
  - [Studio screenshots · 13062350507](https://github.com/manufact-test/ai-site-cms/actions/runs/41252586497/artifacts/13062350507).
- The earlier failing run [#41239753483](https://github.com/manufact-test/ai-site-cms/actions/runs/41239753483) was on `ab04bc0ac87645cc7882a726a2b18c2d5a7c1312`. Its failure is historical and resolved; do not report it as the current CI state.
- Current `main` remains `12e9c3feb707e5ad46b2caeeed379eb40618466b`. No merge, deployment or production operation was performed.
- The documentation update is being committed separately on top of this functional checkpoint. Before any code change, fetch the branch and identify the current tip; the functional baseline remains `3a5fe6072600b7d74152673ae3316b5cc1e1483b`.

## 2. What happened after handoff v9.8

The original pointer-interception issue was investigated in the actual hosted Studio/browser path. The problem was layout geometry, not a broken event handler: large flex panels for resources and site tools could shrink when several nested sections were expanded and compete with adjacent sidebar content.

The existing Studio was corrected:
- resource and site-tools panels preserve their natural content height rather than shrinking;
- the sidebar owns vertical scrolling;
- the browser journey checks real panel/content dimensions, scroll position and `document.elementFromPoint()`;
- the test then performs an ordinary pointer click on the visible control;
- no `force: true`, synthetic dispatch or weakened assertion was used.

The follow-on hosted scenario was also aligned with the actual contextual navigation: block actions are expanded before use, history is restored through its dialog, and sign-out is performed through the site-tools dialog. The exact current functional SHA passed both full workflow jobs.

**Do not spend another macroblock re-fixing pointer interception.** It is closed.

## 3. Current owner decision about Studio — important

The owner previously found the admin overloaded and hard to understand. The later clarification is now the operative decision:

**The current Studio is temporarily agreed as the working baseline until the owner can edit the first real site inside it.**

This means:
- keep the existing Studio/Workbench as it is for now;
- do not start another abstract redesign, move panels around again, add controls or polish the UI based only on developer assumptions;
- do not interpret temporary agreement as a final UI/UX GO;
- once the first real site is connected, the owner will personally use the CMS and give concrete feedback about where actions belong and what is confusing;
- only then make targeted UX/UI changes based on observed real work.

This decision pauses further speculative Studio redesign; it does not remove the final owner usability gate before product delivery.

## 4. First pilot and end-to-end product path

The first pilot must use the owner's **existing landing page**. Its URL/source files, images, goals and links have not yet been handed over. Do not select a random client site, invent content or fabricate assets.

Required path remains:

1. Receive the existing landing page and its real materials.
2. Audit UX/UI, SEO, content, navigation, forms, actions and responsive behavior. Explain findings as “what exists → strength/problem → why it matters → proposed change”.
3. Create a new static approved prototype with desktop, tablet and mobile views plus an implementation/interaction specification.
4. Obtain explicit owner approval of that prototype.
5. Build the actual individual website from the approved specification.
6. Connect it to this existing CMS/Studio.
7. Let the owner edit the real site hands-on; capture concrete Studio usability feedback.
8. Verify save, validation, preview, publish, leads, history and restore in the permitted isolated environment.

The old landing is a starting point for research, not an already approved design. Do not build the new site before the prototype is explicitly approved.

## 5. Product status and acceptance boundaries

- Stage 2 remains **NO-GO**; gates #5–#9 are still open.
- Stage 3 remains isolated engineering and is **not formally accepted**.
- Requirement register remains **135 MUST = 124 engineering candidates + 5 partial + 6 external gates**.
- Formal owner acceptance remains **0/135**.
- A green CI is engineering evidence, not owner acceptance, not a release decision and not permission to deploy.
- The Studio's temporary agreement is a limited working decision, not final UI/UX GO.
- SEO Engine is already integrated into the lead branch. Do not repeat integration or broaden SEO analyzers without a concrete defect.
- Design Factory remains independent and must not be merged or modified without explicit owner approval.

## 6. Next development pass

The pointer defect is closed, and the Studio redesign is paused pending real-site use. Do not blindly execute a stale “next task” copied from an older handoff.

Before selecting the next macroblock:
1. Read the canonical docs below.
2. Fetch the exact current branch tip and inspect the latest functional changes since the prior checkpoint.
3. Compare the actual code/contracts and the 135-item ledger with the remaining product path.
4. Select one substantial cross-layer macroblock with several real owner-facing outcomes. Prefer an end-to-end workflow across Studio, contracts, server/API/storage and visitor renderer where relevant.
5. Use the existing full CI and only the critical new browser assertions needed for the new workflow. Avoid test inflation, repetitive diagnostics and artificial time padding.

The high-level product path remains research/approved static prototype → individual site → edit in existing CMS → save → validate → publish → leads → history/restore. Because the owner's site materials are not yet supplied, continue with other verified product gaps until they arrive.

## 7. Read these documents before work

1. `docs/NEXT-CHAT.md` — canonical checkpoint.
2. `docs/MASTER-TZ.md` — product boundaries and owner decisions.
3. Latest entry in `docs/ROADMAP.md`.
4. This handoff and `stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md`.
5. `docs/ACCELERATED-MACROBLOCK-PROGRAM.md` — current operating note is v1.75; older sections are historical.
6. `PROJECT-STATUS.json` — machine-readable checkpoint.

## 8. Non-negotiable boundaries

- Work only in `feature/stage3-ai-site-contract`.
- Do not modify or merge `main`.
- No Hostinger, production, CELIKOM, real hosting or real customer data.
- Do not send real emails or Telegram messages.
- Do not alter the independent Design Factory branch or integrate it without owner permission.
- Do not change the SEO worker branch; the SEO Engine is already integrated.
- Do not add a second editor or expand scope beyond MASTER without an explicit owner decision.
- Do not claim Stage 2, Stage 3, UI/UX or 135-item acceptance based on CI.

## 9. Working rhythm

One “продолжаем” means one substantial macroblock, not a small UI tweak. Aim for roughly 30 minutes of meaningful work, but never pad time artificially. If a coherent package finishes early, take the next related package. Keep the existing full workflow and add only critical checks for genuinely new user paths. Report concise milestones with exact SHA, exact CI results, what became usable and what remains.

**Immediate instruction:** start by verifying the live branch tip and reading this v9.9 handoff. Do not repeat the fixed pointer bug or resume speculative Studio redesign. Choose the next macroblock from verified remaining product gaps.
