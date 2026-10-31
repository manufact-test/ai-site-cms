# MANUFACT AI Site CMS — lead integrator handoff v8.5

**31 October 2026 · branch `feature/stage3-ai-site-contract` · engineering only**

## Checkpoint

Continue from the actual GitHub HEAD of this branch, not a SHA copied from this document. The previous confirmed SHA was `1132b86bb564b422ba5184329abd325335e1afab` (both jobs green). This continuation adds a distinct **individual mixed-content card carousel** to the existing typed Design Graph, its Workbench and advanced Inspector, independent PHP/JS public visitors and the approved-site browser journey. Check both Actions jobs against the **new final SHA** before reporting success. No `main`, `stage3/seo-engine/**`, Hostinger, production, client data, merge or new dependency.

## New functional vertical

Externally approved custom pages can author a `carousel` node containing 2–12 individually editable `container` cards (not a template/recipe). Each card can contain the existing typed text, headings, media, links, buttons, state, form presentation where appropriate and layout styles. A closed accessible label is required; `visibleDesktop` (1–6), `visibleTablet` (1–4), `visibleMobile` (1–2) and optional `scrollControls` are strictly checked in both JS and PHP. The public markup uses native horizontal scroll snap; the track can be focused and operated by keyboard; optional numbered links jump to exact card anchors. There is no autoplay, hidden form injection, external script, new carousel engine or additional CMS editor. Device count changes do not rewrite the cards.

The full-page PHP Workbench includes `+ Лента индивидуальных карточек`, `+ Карточка с содержимым`, editable count/navigation and usual tree move/copy/delete plus Undo/Redo. The advanced Graph Inspector accepts the same type and edits exactly the same model. Existing authored node and source-media IDs, per-device styling, explicit Save/Publish and rollback are unchanged. The offline Studio remains a non-publishing preview. Tests extend the existing contract, PHP interactive and real approved-site Chromium paths, including a published four-card instance.

## Scope and next gate

- Source/contract: `stage3/sdk/design-graph.cjs`, `stage3/sdk/design-graph-interop.cjs`, `stage3/schemas/site-v1.schema.json`; server `stage3/server/DesignGraph.php`; Studio `stage3/studio/app.js`, `hosted.js`, built `bundle.js`.
- Owner docs: `docs/ROADMAP.md`, `stage3/docs/APPROVED-SITE-PACKAGE.md`. Tests: `contract-smoke.cjs`, `graph-interactions-smoke.php`, `approved-site-browser.cjs`.
- The single approved-v2 customer package with three original client-approved mockups is still **missing**, so visual match and actual client usefulness remain untested. No email/Telegram recipient or real customer host was contacted. **135 MUST = 124 engineering candidates + 5 partial + 6 external gates; personally ownerAccepted = 0/135**, unchanged. Green CI remains a technical check only.
- Next large priority: first authorized customer approved-v2 site, actual manual comparison at all three widths, amendment → Save → Publish → Rollback and form-delivery proof. Without such source, continue only substantive manifest-bound custom-site capabilities, not a Design Factory revival.
