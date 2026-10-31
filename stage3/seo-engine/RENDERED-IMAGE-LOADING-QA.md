# MANUFACT SEO — Browser image loading & first-viewport QA

**31 October 2026 · Independent SEO worker · `feature/site-seo-engine` · `stage3/seo-engine/**` only.**

## Why this is a first-client gap

Existing static media review can inspect HTML metadata and apparent image references, but it cannot know whether a responsive `<img>` actually loaded after JavaScript, which image is visible in each viewport, or whether an above-fold image is delayed by `loading="lazy"`. The existing operator-approved Chromium collector already visits the exact Blueprint pages under the controlled HTTPS mount. This additive feature **reuses that same browser visit**, v2 evidence, private rendered-content audit, and existing Workspace. It introduces no standalone crawler, duplicate UI, CMS/editor edits, page templates, deployment, or autonomous publication.

## Evidence and implementation

- `lib/seo-browser-image-observation.cjs`: self-contained browser function, observing **at most 1,000 `img` elements** per page/device; exact validated, source-bound count envelope. It returns **no image src/currentSrc, alt text, screenshots, user identifiers or raw asset responses**.
- `lib/seo-rendered-capture.cjs`: after existing CSS sampling, observe image state twice 250 ms apart in the **same** isolated Chromium page/viewport. If the image state changes, mark `unavailable`; if the rendered HTML changes after the CSS/image samples, invalidate the associated observations and mark the DOM unstable. Capture records the exact DOM SHA256 only when image counters are stable.
- `schemas/viewport-capture-v2.schema.json`: backward-compatible optional `captures[device].media`, discriminated `observed` or `unavailable`. `observed` carries exact `htmlSha256`, time and 13 bounded counts. Legacy v1/v2 evidence is accepted but shows image coverage **unknown**, not a pass. Runtime validator enforces subset/count invariants.
- `lib/seo-rendered-content-audit.cjs`: source-matched, settled v2 DOM captures become per-device P1/P2 human investigations. Failed source-byte match, missing selected page, unstable markup, or unapproved mount **never becomes a successful image comparison**.
- `lib/seo-rendered-content-view.cjs`: the **existing** private Markdown/static CSP HTML report now displays observed/unknown image-device coverage and image findings. Overall counts sum device observations; one image rendered in three viewports may be counted three times, **not** three distinct assets.
- `tests/seo-browser-image-observation-smoke.cjs` and modified `tests/seo-rendered-capture-smoke.cjs`: synthetic browser states, source-SHA tampering, legacy optionality, and the same audit pipeline without customer/network data.

## Practical diagnostics

| Finding code in rendered-content audit | Priority | Interpretation / manual follow-up |
|---|---|---|
| `rendered:visible-images-failed` | P1 | CSS-visible `img` is complete with no intrinsic pixels. Check asset URL, server status, decoding and cross-origin constraints in the **authorized** browser. |
| `rendered:large-above-fold-image-failed` | P1 | First-screen image candidate **actually intersects** ≥15% of viewport area and failed. This is **not** an LCP element determination. |
| `rendered:above-fold-images-lazy` | P2 | Above-fold `img` uses `loading=lazy`; review priority and loading behavior. Not proof of delay or a universal prohibition. |
| `rendered:visible-images-missing-alt` | P2 | Visible image has no `alt` **attribute**; decide decorative vs informative intent. Empty `alt=""` is separately counted but not automatically flagged. |
| `rendered:visible-images-missing-dimensions` | P2 | `width` or `height` HTML attribute missing; CSS `aspect-ratio` or reserved container may already avoid shift. |
| `rendered:visible-images-upscaled` | P2 | Displayed width exceeds intrinsic natural width by >1.5×; manually review responsive image quality and DPR. |
| `rendered:visible-images-pending` | P2 | A visible image did not finish during these snapshots; timing and external runtime factors require manual investigation. |
| `rendered:image-state-unavailable` | P2 | Observation unstable, too many images, DOM changed, or browser sample failed; **unknown**, never green. |

The counters classify only in-layout `img` elements: `getComputedStyle`, `checkVisibility`, nonzero rects and viewport intersection. They do not cover CSS backgrounds, `picture` source metadata outside selected `img`, `canvas`, video posters, image CDN telemetry, DPR-specific sharpness, actual paint timing, fetch priority efficacy, LCP, CLS, INP, Googlebot or Search Console. Large first-screen candidates use **clipped viewport-intersection area** (≥15% of visible viewport), so a huge asset with a narrow strip at the fold does not become a false hero. First-screen candidate is area heuristic, **not an assertion that the image is the LCP**. No automatic fixes, client fact substitution or release GO.

## Operator pilot — existing flow

1. With genuine client approval and same published release, run existing **public HTTPS static capture** and the **rendered Chromium preflight** described in [RENDERED-CAPTURE-PILOT.md](RENDERED-CAPTURE-PILOT.md). Keep owner-specific Blueprint, Site and all private HTML/evidence outside Git.
2. Only when the approved URL/mount and public-network gate are confirmed, explicitly run existing `bin/capture-rendered-public.cjs` on one approved page via `--page-ids` if desired; the collector reuses strict GET/HEAD, same origin/mount, no WebSockets, browser sandbox and request budget.
3. Run existing `bin/review-rendered-content.cjs` against unchanged original evidence or pass v2 evidence to the **one** SEO Operator Workspace. Inspect new image coverage and P1 first-screen/broken-image priorities separately on desktop/tablet/mobile.
4. A human verifies specific asset responses, intent, styles and actual client device rendering before filing/closing SEO tasks or signing off. Partial scope and pending/unknown results remain incomplete.

## Focused validation

```bash
node stage3/seo-engine/tests/seo-browser-image-observation-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-capture-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-content-smoke.cjs
```

An isolated synthetic V8 sample/validator was exercised, including a partially offscreen oversized image case. **The full Node suite and a genuine Chromium/customer-site session are not claimed unless separately executed and recorded.** Lead integrator remains sole authority for full checkout tests, integration, and deployment.
