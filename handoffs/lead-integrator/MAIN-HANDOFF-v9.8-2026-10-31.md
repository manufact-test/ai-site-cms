# MANUFACT AI Site CMS — lead integrator handoff v9.8 (31.10.2026)

## 1. Exact checkpoint — verify before changing anything

- Repository: manufact-test/ai-site-cms.
- Sole lead branch: feature/stage3-ai-site-contract.
- Last functional HEAD at this handoff: **ab04bc0ac87645cc7882a726a2b18c2d5a7c1312**.
- Exact-SHA GitHub Actions: [run 41239753483](https://github.com/manufact-test/ai-site-cms/actions/runs/41239753483).
  - technology-runtime: **SUCCESS**.
  - contract: **FAILED** in “Server syntax and one full HTTP persistence/publish E2E”, during the final hosted approved-site browser journey.
- The run passed PHP syntax checks, SMTP configuration smoke, native Graph renderer checks, private bundle export/restore checks, Stage3 PHP/SQLite HTTP E2E, D3 loopback release cutover/rollback, and the separate full Studio browser journey. Do **not** call the overall run green.
- Failure location: stage3/tests/approved-site-browser.cjs:700, clicking #server-approved-vault-open. Playwright reports that #server-resources or .sidebar intercepts pointer events. Screenshot artifact: [ai-site-stage3-editor-screens · run 41239753483](https://github.com/manufact-test/ai-site-cms/actions/runs/41239753483/artifacts/13056942380).
- Previous verified green functional checkpoint: b9ab53c21c39d5e87e260d3691c134ddf3740e0d, [run 41223974027](https://github.com/manufact-test/ai-site-cms/actions/runs/41223974027), both jobs SUCCESS. It predates the latest Studio navigation work.
- main was observed at 12e9c3feb707e5ad46b2caeeed379eb40618466b; it was not modified. No merge, Hostinger, production, CELIKOM or real customer data was touched.
- This document and the first-message file are a handoff, not a claim of completion. Fetch the branch again and check Actions for the exact current HEAD before proceeding.

## 2. Owner's latest clarification — preserve the distinction

The owner is **not rejecting the current visual skin**. Its current basic appearance is acceptable as a provisional starting point; a wholesale visual redesign is not the immediate request.

The actual blocker is information architecture and cognitive overload:
- the screen looks like a wall of cards, cubes and buttons;
- familiar labels such as “Главный”, “SEO” and “блок” repeat in many places without making their purpose clear;
- the owner cannot quickly tell what each control does or where to go for a normal task;
- too many rarely used/technical controls are visible at once.

The target is closer to the clarity of WordPress admin navigation and the familiar editing flow of Elementor/Tilda: clear page/section hierarchy, a small number of obvious primary actions, context-specific secondary actions, plain names, and advanced/rare controls hidden until requested. Keep the existing editor and contracts; **do not create a second editor**. Do not spend the next session repainting colors while the navigation remains confusing.

## 3. What was changed in the latest Studio navigation pass

The work is on the existing Stage3 Studio/Workbench, principally stage3/studio/hosted.js, hosted.css, index.html, studio.css, and the existing browser tests.

### Main editing route
- Page tree and block tree remain the primary workspace.
- The page tree now presents one obvious primary action, **«Добавить страницу»**. Rename/address, duplicate, move up/down and delete are in the collapsed **«Действия страницы»** disclosure.
- The block tree presents **«Добавить блок»**, opening the human-readable component catalog. Appearance, advanced composition, duplicate, move and delete are in collapsed **«Действия блока»**.
- The raw internal component-ID add control is hidden from the normal owner route; the legacy control remains in the DOM for compatibility rather than being exposed as a primary action.
- The inspector no longer puts a technical section ID in its ordinary caption; the ID remains available as a tooltip for diagnosis.
- The Workbench hint now describes the real action sequence in plain language.

### Site tools and secondary resources
- **«Инструменты сайта»** groups existing controls by task: appearance, SEO, navigation/contacts, content/structure and advanced tools.
- **«Ресурсы и обслуживание»** contains the existing drawers for media, leads/delivery, saved blocks, archive/history, cross-site transfer and site import/approval materials.
- Version history and recovery are collapsed by default.
- The outer resources wrapper is a normal section, not a nested native details element; each individual drawer remains an independent disclosure.
- Desktop sidebar is intended to scroll within the viewport. At phone width the sidebar and inspector return to normal document flow rather than overlaying the editor.
- Existing actions, event handlers, APIs, permissions, Save/Publish/Undo and data contracts were reused; this was an information-architecture refactor, not a new CMS.
- Disclosure UI preferences use the updated session key; only open/closed UI state is remembered, not site data or permissions.

### What is not accepted yet
The owner has **not** personally tried this navigation and has not given UI/UX GO. Automated Chromium screenshots/tests are evidence for review, not owner acceptance. The current changes are an initial structural cleanup, not a declaration that the admin is now easy to use.

## 4. Immediate next task — fix the real browser interaction failure

Start here before adding another feature:

1. Fetch exact current HEAD and inspect the latest CI run and screenshot artifact.
2. Reproduce the approved-site browser path around stage3/tests/approved-site-browser.cjs:692-704.
3. Inspect the actual DOM position, scroll container, bounding boxes, computed positioning/z-index and document.elementFromPoint() at the Playwright click coordinates for #server-approved-vault-open.
4. Determine whether the problem is a hidden/collapsed import drawer, sidebar scroll/height, a positioned overlay, an incorrectly placed action, or a test sequence that fails to open the relevant drawer. Do not guess.
5. Fix the actual interaction/layout so an owner can reach **«Материалы согласования»** naturally with a pointer and keyboard. Keep the control in a sensible location in the resource hierarchy.
6. Re-run the existing approved-site Chromium journey and full workflow once on the exact resulting SHA. Do not paper over the defect with force: true, dispatchEvent, or by weakening/removing the assertion. A test-only change is acceptable only if the test itself is demonstrably wrong and the real UI path is independently proven.

The latest failure occurs late in the approved-site journey; preceding assertions in that run verified the lead/archive/transfer panels are grouped, the sidebar reports vertical scrolling, and the earlier browser journey, PHP/SQLite and D3 checks completed. Do not assume that proves the entire UX.

## 5. Product state and owner decisions that remain mandatory

- Stage 2 remains **NO-GO**, gates #5–#9 open. Stage 3 is isolated engineering, not formally accepted.
- Requirement ledger remains **135 MUST = 124 engineering candidates + 5 partial + 6 external gates**; **ownerAccepted = 0/135**. CI success is not product acceptance.
- First client pilot must start from the owner's existing AI-created landing, which has not yet been supplied. Audit that real landing (UX/UI, SEO, content, actions, forms, responsive) and explain “было → проблема/сильная сторона → почему → предлагаемое решение”. Then produce three static desktop/tablet/mobile mockups and a portable specification. Obtain explicit approval before implementing the live site.
- The existing Studio itself still needs a real hands-on owner review after the information architecture cleanup. The owner should be able to find pages, edit a block, change an image, manage FAQ/CTA/form/SEO, save, preview, publish and restore without technical help. Record friction and fix it. **No UI/UX GO yet.**
- The private SEO Engine has already been integrated into the lead branch at 244c7ab71796916f25313c3ebde385775665cc21. Do not reintegrate it or begin another analyzer expansion. Avoid edits to stage3/seo-engine/** unless an actual integration defect requires them.
- The separate Design Factory branch remains separate and visually rejected pending owner approval. Do not merge or promote it.

## 6. Required reading and working rules

Read in this order:
1. docs/NEXT-CHAT.md — canonical pointer.
2. docs/MASTER-TZ.md — product boundaries and owner decisions.
3. Latest entry of docs/ROADMAP.md.
4. This handoff and stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md.
5. docs/ACCELERATED-MACROBLOCK-PROGRAM.md and the latest integrated SEO handoff if needed.

Execution rules:
- Work only on feature/stage3-ai-site-contract; inspect current HEAD first.
- No merge to main, no Hostinger/production/CELIKOM, no customer data, remote AI API, dependencies or extra editor without permission; avoid edits to stage3/seo-engine/** unless a specific integrated defect requires them.
- One continuation means a **substantial macroblock**, not one tiny dialog or an endless test cycle. Aim for roughly 30 minutes of meaningful work; if a coherent block finishes early, take another related block. Do not pad time.
- Keep the existing full CI and only the critical browser assertions for the newly changed workflow. Fix real issues, not speculative edge cases or test scaffolding.
- Give concise checkpoints: stage, approximate technical progress (clearly labeled as an estimate), what changed, remaining gate, exact SHA and exact CI status. Do not invent a global completion percentage.

The immediate next action is the pointer-interception failure above. After that, continue with one large owner-facing workflow improvement in the existing Studio architecture.
