# Media & Motion Workbench — standalone Stage 7-related delivery

**Status:** independent offline implementation, **not merged** into the AI Site CMS. No CMS release/publication, host, remote service, npm install, CDN or external image API. The only repository writes belong to `stage3/media-motion/` in `feature/stage3-media-motion-lab`.

## Start and use (no build)

Open `stage3/media-motion/workbench/index.html` directly in a modern Chromium, Firefox or Safari browser, including `file://` mode. All JavaScript, CSS and icons are local. Browsers without `crypto.subtle` use the bundled (tested) pure-JS SHA256 fallback. No image bytes leave the browser. A video URL is an inert external link until the user opens it; no remote iframe is loaded automatically.

1. Import PNG/JPEG/WebP via picker or drag-and-drop. Use **two demo images** to try it without user files. Duplicate-byte images are deduplicated by SHA256; missing originals after project reload can be rebound by importing exactly matching bytes.
2. Select an item, edit **name / ALT / caption / focal X/Y**, crop by dragging the outlined region or changing width/height with presets **free, 1:1, 4:3, 16:9**, and rotate ±90°. A separate Canvas shows the actual cropped/rotated image.
3. Choose target MIME (WebP, JPEG, PNG), quality, and desired width; use **Create versions** or **Whole library**. Responsive widths are computed from 360, 720, 1200, the entered target width and natural size without enlarging the image; actual encoded output dimensions may be smaller if required to meet 450 KiB. The batch has cancellation, progress, per-item errors and retry.
4. Set gallery order/inclusion, Grid/Masonry/Carousel, titles and columns. Preview is live; Carousel has keyboard arrows and scroll-snap. Choose safe first-party vector-icon tokens, privacy-safe HTTPS video provider embed address and poster selection. Motion presets can be previewed and re-run; duration/delay/easing/amplitude/mobile behavior are bounded. All content stays visible if scripts do not run on published pages, and animations are disabled by `prefers-reduced-motion: reduce`.
5. Download **ZIP bundle**, **JSON bundle**, standalone **CSS**, or **JSON metadata project**. The ZIP includes actual converted image files, `bundle.json` and `motion.css`. The exporter re-hashes each binary before packaging. The JSON project is editable metadata only; always preserve original files or the ZIP separately.

**Compatibility:** Offline browsers must implement Canvas 2D, Blob, createImageBitmap, TextEncoder and object URLs. WebP export uses the browser encoder and explicitly fails if unavailable. The workbench uses no persistent backend, and closing the tab loses in-memory originals and converted files. No auto-save or access to external sites.

## Resource/safety boundaries

- Input files: decoded/syntactically sniffed PNG/JPEG/WebP only; type mismatch, undecodable images, oversized files or SVG are rejected. Up to **12 MiB**, **8192 px per side**, **18 megapixels**, **24 active images**, and **48 MiB retained original bytes** (to support Undo/Redo) and a **72 MiB processed-result cache**. Browser memory can still be higher because Canvas uses uncompressed pixels.
- Each exported variant must be **at most 450 KiB**. Quality and dimensions are reduced in bounded steps; outputs below 64 px are rejected if the cap cannot be met. Output MIME, size, width/height and SHA256 are calculated from actual bytes and verified again before packaging.
- IDs and artifact paths are closed and validated; no SVG uploads, custom CSS/JS injection, inline user HTML, arbitrary iframe embeds or network calls. Metadata is inserted with `textContent`, not `innerHTML`.
- URL allowlist: `https://www.youtube-nocookie.com/embed/` followed by an exact 11-character video ID, or `https://player.vimeo.com/video/` followed by a numeric ID, with no port, query or fragment. The video is a user-initiated external link, not a loaded player.
- `ZIP` is stored (not DEFLATE-compressed) to avoid dependencies. ZIP paths are strongly whitelisted, UTF-8 flag is set and CRC32 is included. Max files: 200. The separate SHA256 checks secure the binding of file bytes to metadata, not provenance/signature/hosted correctness.
- If the user removes an image, the byte cache may remain in memory within the bounded tab session to support Undo. Closing the tab frees it. Avoid importing sensitive images in shared machines.

## Project JSON / Undo

`media-motion-project-v1`: `{format,bundle,edits,processing}` where `bundle` is a validated `media-motion-bundle-v1`, `edits` has exact asset IDs as keys, and `processing` uses bounded encoder settings. The project stores **NO image blobs**: after reopening a saved JSON, import original images again to restore editing; SHA256 determines which records they belong to. Previously exported images also require regeneration if the tab's byte cache is gone. Undo/Redo (32 metadata snapshots) preserves binaries during the same tab session where possible; it does not undo released ZIP downloads.

## Test commands

```sh
node stage3/media-motion/tests/smoke.cjs
python3 stage3/media-motion/tests/browser-smoke.py
```

First test uses Node core modules only and validates closed-schema contract, whitelist, ranges, paths, link validation and SHA256 fallback. The second uses **already installed** Python Playwright and a Chromium binary (default `/usr/bin/chromium`, override via `CHROMIUM_PATH`); no installation is performed by these scripts. It creates two synthetic PNGs, processes in bulk, builds/downloads a real ZIP, validates all actual WebP SHA256/MIME/size, independently downloads real JPEG and PNG, checks a JSON project, three viewports (1440/820/390), gallery interactions and reduced motion. It runs completely offline and does not touch CMS or hosting.

**Special case for managed browser environments:** the Playwright smoke injects the exact checked-in HTML/CSS/JS into a blank page because some locked-down Chromium builds forbid navigation even to `file://` and localhost. This verifies the underlying UI actions and export but **does not independently establish that `file://` navigation is permitted by that machine's browser policy**. A manual `file://` open on the intended workstation remains a separate acceptance step. The published product is a static HTML/CSS/JS workbench with relative script paths.

## Files

| Path | Purpose |
|---|---|
| `workbench/index.html` | Standalone layout + controls |
| `workbench/styles.css` | Responsive dark UI (desktop/tablet/mobile) |
| `workbench/app.js` | Media management, metadata history, previews, batch queue, galleries, motion/video/icons, downloads |
| `workbench/engine.js` | Byte type sniff/decode, Canvas crop/rotate/resize, encoder cap, SHA256, ZIP writer |
| `lib/contract.cjs` | Browser/Node `media-motion-bundle-v1` closed-schema validation, srcset declaration, safe motion CSS |
| `lib/sha256.cjs` | Dependency-free SHA256 fallback for offline contexts |
| `tests/smoke.cjs` | Node contract smoke |
| `tests/browser-smoke.py` | Chromium end-to-end with actual downloaded raster bytes and ZIP verification |
| `INTEGRATION.md` | Integration contract, Stage3 mapping, explicit unsupported capabilities |
| `examples/sample-bundle.json` | Valid empty synthetic config, **not** real user assets |

## Known limits / NOT an acceptance claim

- Non-DOM HTML renderer / Stage3 PHP renderer are **not modified**. No code auto-publishes this CSS or new gallery/video/component fields to real sites. The integrator must review and add first-party adapter, upload semantics and public renderer support.
- Crop uses rectangle translation, width/height sliders and ratio presets, not freehand polygon masking. GIF, SVG, HEIC, AVIF, MP4, animated WebP, video transcode and EXIF metadata editing are out of scope. Decoder/browser EXIF orientation decisions may vary; verify rotated phone images manually.
- Some outputs will be smaller than the target width to satisfy the size cap, and PNG's lossless encoding may require aggressive downsizing. Focus is exported as metadata/object-position in preview; it does not alter the baked-in crop unless the user adjusts the crop rectangle.
- Motion is CSS-only for public use; scroll-triggered JS reveal is intentionally **not** injected into public exports. Some motion trigger labels are reserved schema enums for future adapters; only load/hover/focus CSS behavior presently exists.
- Project history and caches are per-tab, with no IndexedDB or filesystem persistence. ZIP store has no archive-level signature, and browser save/download may be restricted by browser policy. Asset digests prove contents, not accessibility, privacy clearance, intellectual property rights or SEO performance.
- Existing CMS contract has no direct `responsive variants`, generalized `masonry/carousel`, `focus`, `motion`, `icons` or `video embed` fields. These require explicit main-developer integration; no unsupported keys are smuggled into `manufact-ai-site-v1`.

Formal project status unchanged: Stage 0–1 accepted; Stage 2 **NO-GO** (#5–#9), Stage 3+ not accepted, **0/135** mandatory product acceptance criteria. A passing standalone smoke is neither deployment permission nor product acceptance.
