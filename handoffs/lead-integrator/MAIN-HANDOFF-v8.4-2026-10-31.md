# MANUFACT AI Site CMS — lead integrator handoff v8.4

**31 October 2026 · only `feature/stage3-ai-site-contract` · engineering continuation, not owner acceptance**

## Starting point and verified scope

This continuation began from SHA `c62f5e26de691e1d2503bae47f6def17ab7b708c`, itself the result of the v8.3 exact-element visual-review work. The new focus is **the existing individual Design Graph backdrop authoring path**: real owner Workbench and Graph Inspector, native JS/PHP renderers, approved-source JSON handoff and published three-device behavior. No second editor, site generator, external AI API, dependency, SEO worker or production write was introduced. This file is not a branch lock: always retrieve the actual final GitHub HEAD and both Actions jobs before continuing.

## Functional result

The full-page **PHP Workbench** can edit every supported `container.backgroundVideo` property that previously required the advanced Graph Inspector: site-owned MP4; required desktop, optional tablet/mobile covers; focal X/Y; overlay color and 0–90% opacity. The same Workbench now exposes existing `backgroundMedia` raster overlay controls. Changing an MP4 retains the compatible approved posters/crops/overlay instead of unexpectedly clearing them. All writes go through the ordinary validated clone → Undo/Redo → explicit Save → separate Publish, not a new persistence channel.

The owner sees a private, three-device thumbnail strip with the effective image, crop and overlay. Its optional collapsible media chooser picks a real photo for the **current** device, or clears a tablet/mobile override to inherit. When the site lacks an MP4 or cover, the UI links to the already-existing authorized upload action. The thumbnail URLs are **not public paths**: `Stage3Host.previewUrl()` fetches bounded authenticated raster bytes and emits a first-party `stage3-media-ready` event with safe `data:image` previews. Workbench updates the active thumbnails on that event, never inventing a public file path or accepting a remote URL.

Both `backgroundMedia` and `backgroundVideo` now support optional bounded integer `tabletPositionX/Y` and `mobilePositionX/Y` (0–100). Each missing axis inherits the same axis from tablet, then desktop. Both Graph Inspector and Workbench edit the *selected* device crop and clear overrides with an empty input; the JS and PHP validators reject malformed/unbounded values. Both visitor renderers generate matching responsive background/poster position and, on tablet, actual video object-position. The published visitor can keep its phone-specific composition while the decorative MP4 is hidden. The public `site-v1.schema.json` now explicitly declares the typed `backgroundVideo` object and both raster/MP4 responsive crop fields.

First-party video `<source media>` also makes the MP4 ineligible at initial resource selection on phone/reduced-motion devices. CSS remains authoritative for the fallback on later viewport changes. **Important limitation:** media source queries are evaluated once per video resource selection, so this is not a promise that all future device resize paths transfer zero MP4 bytes.

## Checks, known boundaries and next pass

- Local JS syntax, generated bundle parity and the existing offline contract smoke pass. Full PHP/SQLite/Chromium proof runs in both GitHub Actions jobs on the exact final branch SHA; do **not** quote an intermediate green job as final.
- The approved-site browser path exercises authenticated imported MP4/posters, edits in the existing Workbench, device crop, Undo, private preview thumbnails, Save, PHP Publish and actual mobile fallback.
- The same workflow had two **intermediate** failed CI attempts during development: a Playwright visibility assertion accidentally targeted invisible HTML `<source>`, and a nested PHP renderer initially omitted a captured focal-position helper. Those errors were corrected. A subsequent intermediate run exposed the existing async `data:image` preview contract, now handled with the first-party media-ready event. Inspect the final CI rather than interpreting these intermediate red runs as the product status.
- Real client-approved three static mockups/specification have still **not** been supplied; no owner's visual comparison/approval occurred. **135 MUST = 124 engineering candidates + 5 partial + 6 external gates; ownerAccepted = 0/135**. These implementation changes must not alter the acceptance counters.
- No `main`, Hostinger, production, real client data, `stage3/seo-engine/**`, merge or deployment. On the next useful pass, prioritize the first authorized **actual** approved-v2 client site and owner correction→Save→Publish→Rollback check, or a substantial remaining manifest-bound capability. Keep one pass at least 30 minutes of true development and avoid redundant test infrastructure.
