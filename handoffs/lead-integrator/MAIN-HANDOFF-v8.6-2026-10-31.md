# MANUFACT AI Site CMS — lead integrator handoff v8.6

**31 October 2026 · `feature/stage3-ai-site-contract` · engineering checkpoint**

## Exact continuation point

Start from the branch's current **GitHub HEAD**, not from the old baseline. This block starts from `ba1320ff0bb2439b06199a99f25776d961c403f6` (earlier v8.5 carousel extension). Before announcing success, verify both Stage3 Actions jobs against the new final SHA. A green job is not personal owner acceptance. No `main`, `stage3/seo-engine/**`, external host, production, real-client payload or merge was changed.

## Implemented: one reviewed queue for client media, then the original Workbench

The hosted Studio's existing `/media` upload can now prepare 2–20 local raster images per selection or drag-and-drop, with a per-file local thumbnail, name/size, alt and Remove button. Files stay in the browser before deliberate confirmation; blob preview URLs are revoked on close. It retains single-file upload. Preflight decodes **every** remaining raster before the first POST and requires PNG/JPEG/WebP, 1–1,000,000 bytes, 1–4096 px in each dimension. The server still performs the authoritative type, dimension, ownership, role/license and optimistic revision validation.

Each successful POST updates the in-memory original Studio site and its revision before the next POST. Successful files survive errors; no atomicity is claimed. Any network/409/other failure stops the queue and reports the exact committed count. The failed Upload button stays disabled to prevent blind duplicates. A new selection of the remaining files is required. The public site cannot change from any upload without separate manual Publish. No new endpoint, dependency, storage, editor or external API.

In the **existing full-page Design Graph Workbench**, `image` nodes now show effective desktop/tablet/mobile thumbnails with their inherited/overridden status. A per-device visual picker selects the existing `assetId` or `responsiveMedia.tabletAssetId`/`mobileAssetId`, including an explicit inherit action. It uses the same validated draft, Undo/Redo and Save/Publish as the advanced Inspector. A pre-existing Graph media thumbnail mismatch (`previewUrl()` gives private `data:image` while the picker expected a URL beginning `/`) is corrected. Both ordinary and Design Graph media pickers now subscribe to the already-existing bounded authenticated image-ready event. Filter-by-alt/ID with a 36-item initial thumbnail cap keeps large site libraries usable.

## Evidence and next priority

- `stage3/studio/{hosted.js,hosted.css,app.js,bundle.js}` — new hosted queue and original Workbench improvements. `bundle.js` must match `node stage3/studio/build.cjs --check`.
- `stage3/tests/approved-site-browser.cjs` — **CI-run** browser route covers queued selection, alt edits, remove, no write until confirmation, 2 committed revisions, corrupt second file with zero writes, drop/cancel, injected partial 409 and exact count, no implicit publish, and visual mobile source selection in the authored Graph.
- `stage3/tests/hosted-browser.cjs` — extended owner journey also checks batch and partial error, but the regular workflow only runs the approved-site browser scenario. Both are isolated disposable HTTP/SQLite/Chromium environments.
- `docs/ROADMAP.md`, `stage3/docs/APPROVED-SITE-PACKAGE.md` — operator behavior and non-atomic failure contract.
- A real client-approved-v2 package with three original source mockups is still missing. The actual human compare/edit/Save/Publish/Rollback/form delivery acceptance remains the highest-value external gate. **135 MUST = 124 engineering candidates + 5 partial + 6 external; ownerAccepted=0/135**, unchanged.

Locally the selected sandbox lacked `php`, Chromium and the pinned browser test packages; therefore node syntax/bundle parity checks can run, but the genuine PHP/Chromium path must be established on exact-final-SHA GitHub Actions before declaring technical CI success. Do not report 30 minutes of **active** coding based only on wall time or waiting for CI. Continue substantive product work if the operator's 30-minute development interval has not been met.
