# MANUFACT AI Site CMS — lead handoff v9.2 (31 October 2026)

## Starting point and product boundaries

- Working branch: `feature/stage3-ai-site-contract`, parent `bf116a17b9bd14fd212fb54614a4c976d347c076` (both Actions jobs green: `41197606733`). Check actual remote HEAD and final-SHA CI before asserting success for this increment.
- SEO worker subtree was integrated in v9.0; the owner-facing private SEO packet navigation was completed in v9.1. See `MAIN-HANDOFF-v9.0-2026-10-31.md` and `MAIN-HANDOFF-v9.1-2026-10-31.md`.
- Do not merge to `main`, touch Hostinger/production or real client data, reconnect an AI provider, create a factory/template-site system or claim product acceptance. **135 mandatory = 124 engineering candidates + 5 partial + 6 external gates, personally owner-accepted 0/135.**

## Completed vertical: lossless inline typography across the *existing* CMS workflows

Before this increment, Design Graph allowed 2–16 authored inline text fragments (`runs`), including link/italics/color/bold. The advanced Graph Inspector exposed these fragments correctly, but the full-page Workbench's double-click quick editor silently deleted them when replacing whole text. The whole-site text search changed `node.text` but left `runs` unchanged, so a normal replacement failed validation or could not be applied to a real authored heading.

This has been corrected in one original editing system, not a new editor:

1. `stage3/studio/rich-text-edit.cjs` is a small deterministic no-dependency helper: edits fragment texts as a group without altering styles/links, performs literal case-insensitive replacements **inside** the original fragment boundaries, refuses matches spanning differently authored fragments and refuses invalid empty/oversized segments. No input object is mutated.
2. Full-page Workbench shows direct per-fragment text, italic, weight, color and safe URL controls for an authored rich heading/paragraph. It deliberately hides the risky plain text control on that node.
3. The quick-edit panel opened by a double-click on real PHP/Studio preview presents one textarea per fragment, with all strings saved in one validated, Undoable draft action. No CSS/JS injection or additional interactive framework.
4. The whole-site content workbench previews only safe fragment-preserving replacements; cross-fragment cases remain visible with explicit manual-edit guidance. Before atomic apply it rechecks actual original run arrays; Graph and CMS validators remain authoritative.
   The same operation now delegates shared-section propagation to existing SDK `syncSharedSite`, with explicit group counts and conflict refusal, so updating one linked page instance does not leave the same authored block outdated elsewhere.
5. `stage3/studio/build.cjs` compiles the helper into the hermetic `bundle.js`, without new dependencies, public runtime code or a publishing route.

Unit smoke: `stage3/tests/rich-text-editor-smoke.cjs`. Existing real offline Chromium Stage3 smoke extended across bulk replace, blocked crossing, Workbench field edit, double-click quick edit and Undo. Focused instructions: `stage3/docs/RICH-GRAPH-TEXT-EDITING.md`. CI includes the new focused Node test. Record actual final SHA/run success externally after publication.

## Next real priority

The first **client-approved** three-view static prototype, exact Blueprint, Site v1 implementation, verified published HTTPS revision, authorized browser/GET and real Search Console data are still not supplied. When available, run a complete client pilot using the existing private SEO Engine, Launch Review, PHP preview/visitor form, mobile interactions, publication and rollback. Until then, continue meaningful missing CMS functionality, not expanding synthetic SEO analyzers or test infrastructure.
