# AI Site CMS — CMS-owned Design Graph v1 (architectural compatibility audit)

Date: 2026-10-24. Branch: `feature/stage3-ai-site-contract`. Stage 2 remains **NO-GO**, Stage 3 isolated, formal product acceptance **0/135**. This is **not** a claim that the independent Design Factory (D1–D7) output has been integrated or that arbitrary designs are fully round-trip yet.

## Verified starting point and the gap

- The existing site-v1 SDK accepts registered section manifests with typed editable slots and repeaters. Unknown section properties are rejected by both Node and PHP.
- Studio edits typed content/appearance: text, media, links, certain colors/lengths, responsive inherited values, some section presets, menu/SEO, forms, published and draft revisions.
- PublicRenderer.php and Studio screen() have component-specific markup branches. This was not a universal lossless document representation. Grid, nested layout, positioning, common design tokens and hover/focus states were not comprehensively owned by CMS.
- The independent Design Factory output has not been audited: do not assume compatibility with its generated schemas, CSS or HTML; do not merge its branch or edit its files.

## Additive host contract (implemented)

`site.designTokens` is an optional, validated object of `colors`, `spacing`, `radii`, `typography`. Tokens have stable names, strict safe values and can be referred to by `@name`; no raw executable CSS is admitted.

`section.designGraph` is an optional, versioned `{version:1,id,nodes}` tree. Node types: `container`, `heading`, `text`, `button`, `image`, `divider`. Nodes have stable IDs, nested children, safe content, explicit owned media IDs, closed layout declarations and per-node `responsive.tablet/mobile` and `states.hover/focus` style overrides. Layout controls include Grid/Flex, column count, gap, padding, max width, alignment, positioning, typography, colors, radius and border. Limits: max 90 nodes, depth 8 and constrained styles.

A section keeps its original registered component and editable fields unchanged when `designGraph` is added. When present, the graph is the section's visual content; removing the graph restores the original component. This allows additive migration and rollback without silently flattening data.

**Data flow:** generated typed AST -> JavaScript validation and CMS inspector -> draft revision/Undo/Redo -> PHP validation -> explicit immutable published site -> shared PHP/static HTML+CSS renderer -> archives/revision history. The graph never accepts arbitrary JS, event handlers, arbitrary tags, unvalidated URLs or freeform CSS.

The existing Studio button **Дизайн-композиция** provides on-site editing of node text, buttons/media, nested containers, style fields, responsive properties, interaction states and shared design tokens; no AI call is required for subsequent edits.

Source files: `stage3/sdk/design-graph.cjs`, `stage3/server/DesignGraph.php`, `stage3/sdk/contract.cjs`, `stage3/sdk/draft.cjs`, `stage3/studio/app.js`, `stage3/server/PublicRenderer.php` and `stage3/schemas/site-v1.schema.json`.

## Strict integration boundary for Design Factory (after owner handoff)

1. Read worker's final D1–D7 handoff and compare every generated element/property with the AST field list. Do not read unfinished content as approved or silently substitute a template for unsupported output.
2. Build an explicit **loss manifest** before ingestion: paths supported exactly, paths supported by intentional conversion, missing properties, and actual visual diffs for 360/768/1440 breakpoints. Unknown properties must fail closed, not be dropped.
3. Only after schema coverage is proven, implement a version-pinned Factory-to-DesignGraph adapter with explicit typed values, stable IDs, assets and interaction constraints. Preserve the original Factory payload separately when a conversion cannot be fully reversed.
4. Test bidirectional edit persistence (save/reopen/Undo/Redo), PHP/Studio/static visual equivalence, published snapshot immutability, media checksums, backups/recovery, user-edit override preservation on regenerated outputs, responsive/hover/focus and accessibility.
5. No `main` merge, Hostinger/production writes or formal Stage2/Stage3 acceptance without separately authorized gates.

## Expanded Design Graph styling and Media & Motion (2026-10-24)

The original optional `designGraph.version=1` schema is additive: previously saved graph documents remain valid. Supported additional node styles include:

- Layout: separate row/column gap, inline/block padding, percentage width, vertical margins, bounded minimum height, column span, flex wrap/grow/self-alignment, object fit, aspect ratio and overflow.
- Typography/decoration: bounded letter spacing, safe system font families, shadows, and gradient backgrounds using `{angle, from, to}` with CSS hex or validated `@color-token` references (no arbitrary CSS).
- Accessible inline vector icon node with a **closed nine-icon library** (`check`, `arrow`, `star`, `sparkles`, `shield`, `clock`, `mail`, `play`, `menu`). Icons can be decorative (`aria-hidden`) or labeled (`role=img`, `aria-label`). Source SVG markup is compiled from reviewed constants, never accepted from external input; icon sizes follow node typography.
- Bounded `node.motion={effect,duration,delay}` with `none`, `fade-in`, `fade-up`, `slide-left` and `zoom-in`. The output is deterministic CSS keyframes, no external scripts. CSS media query `prefers-reduced-motion: reduce` disables these effects and transitions.
- Studio inspector allows manual editing of all new primitives, responsive overrides, gradient fields, icon labels, token references and motion presets. PHP and the static exporter share the PHP renderer. Existing sections and published releases remain opt-in/non-destructive.

Security: the JS and PHP validation contracts refuse arbitrary icon IDs, CSS payloads, property names, gradient values, links and animation definitions. Test coverage covers offline schema safety, Chromium inspector Undo/Redo and PHP/SQLite published HTML/static-export/backup preservation. **CI success and exact SHA must be reported separately, not presumed from this document.**

## Important limitations still open (do not overclaim)

- This is a **first universal foundation**, not a pixel-perfect import path for arbitrary HTML/CSS or all Design Factory compositions. Advanced font loading, intrinsic measurement, complex overlays, multi-stop gradients, arbitrary transforms and animation timelines, user-supplied vector icon systems, video, interactive state machines, richer accessibility properties and arbitrary breakpoint systems still require versioned safe schema extensions.
- Current node inspector covers the implemented primitive types and properties; more ergonomic WYSIWYG canvas manipulation, breakpoint-specific content, token reference management and component nesting behavior remain to be developed.
- The shared legacy global page layout and preset styling have constraints; no promise of full viewport-bleed layouts or design fidelity is made before matching Factory output screenshots and element metrics.
- PHP and JS rendering have a shared contract but pixel equivalence on real Factory output is not yet established. Do not conflate CI-only proof with owner product acceptance.

Priority after D7 handoff: lossless coverage matrix and adapter first, then fill missing style/node vocabulary, media/motion integration and robust visual comparison; keep the independent worker branch isolated throughout.


## v1.62 — authenticated multipart MP4 from Studio to immutable public release

The media subsystem now also accepts 16-MiB MP4 files through 512-KiB private actor/site-scoped SQL staging. Each part and the entire file are SHA256-checked; only complete verified MP4 bytes become a new immutable CMS asset and explicit draft revision in one DB transaction. Supports safe retry of identical parts, maximum 3 active sessions per site, 24-hour expiration checked during new uploads, and cancellation; no intermediate URL or auto-publication. The editor automatically picks the small legacy upload route (≤1.5 MB) or multipart flow with progress. The first-party native HTML5 video node supports optional poster/loop, controls and no autoplay; HTTP Range supports seeking. Static publisher/backup preserve bytes. Dedicated older isolated Stage3 DB migration: `STAGE3_ALLOW_VIDEO_UPGRADE=YES php stage3/server/bin/upgrade-video.php` **ONLY after owner approval**, never in HTTP handlers. Source verified: `38a7994d4aba09a89e2eedd82be987cba71671e9`, [Actions #40104129649](https://github.com/manufact-test/ai-site-cms/actions/runs/40104129649) SUCCESS.

Remaining: browser-side visual fidelity to independent D7, big-video streaming/CDN/transcoding, safe poster derivation and archive scalability; published acceptance still 0/135 and Stage2 NO-GO.

## Editorial composition extensions — typed typography and layered responsive art direction (2026-10-25)

An opt-in Design Graph now additionally supports a **safe closed vocabulary** of 24 professional properties. None accepts raw CSS/JS:

- Typography: `fontStyle`, `textTransform`, `textWrap`, `wordBreak`, `textOverflow`, integer-tenths `wordSpacing`, signed-pixel `textIndent`, and fixed `textShadow` presets. Existing site typography tokens, font size, letter spacing, and text hierarchy remain authoritative.
- Asymmetric grid: `gridColumnsPreset` enumerates sidebar-left, sidebar-right, wide-center and editorial fractional layouts; `gridColumnStart` / `gridRowStart` place individual items. A given style layer cannot specify `columns` and `gridColumnsPreset` together; breakpoint layers may override the base layout.
- Layering: `translateX` and `translateY` (signed px), `rotateDeg`, `scalePercent`, `transformOrigin`, `isolation`, `mixBlendMode`, `clipShape` (fixed polygon/ellipse presets), and `backdropBlur` (fixed numeric px). Independent CSS translate/rotate/scale preserve the existing built-in motion animation transforms. Translate CSS variables are initialized locally per translated node to prevent unwanted inheritance from parent containers.
- Independent `borderTopLeftRadius`, `borderTopRightRadius`, `borderBottomRightRadius`, `borderBottomLeftRadius` support safe literal pixels or a radii token.
- Desktop/tablet/mobile overrides use exactly the existing graph style vocabulary. Hover/focus remain deliberately restricted to the original non-layout state whitelist. All input remains validated in JS, PHP and `site-v1.schema.json`, including bounds and forbidden values.

Studio exposes all of these as normal per-node inspector fields, with preset selectors where applicable. Chromium tests cover real editor application + Undo/Redo; Node verifies rejection of malicious/unsupported style values; PHP/SQLite tests verify draft/publish/static export and archives. These properties improve expressive power, **not** pixel-perfect D7 interoperability (still requires an explicit lossless adapter audit). Original registered components and published releases remain unchanged until owner-initiated editing/publishing.

## Visual graph inspector / direct selection (2026-10-25)

The no-AI composition dialog includes a responsive visual canvas, closed-schema selection by click, synchronized node inspector, and desktop/tablet/mobile mode controls. It renders **the same typed Design Graph** currently being edited; changes to text, style, motion, tokens, or tree structure refresh the working preview before Apply. The element's exact validated node ID is recovered from the renderer's existing `cmsdg-n-*` class; no new schema extension or persisted DOM identifiers are introduced. Click-to-select is optional, and the nested-node selector remains available for keyboard and difficult overlapping layouts.

The embedded iframe is distinct from the published/full-page preview. It is `sandbox="allow-same-origin"` **without** `allow-scripts`, forms, navigation, or popups. The document additionally has an explicit `script-src 'none'` / `connect-src 'none'` CSP and receives only rendered, escaped, validated first-party graph HTML. Parent-side event delegation captures selection and prevents following links. Script execution and arbitrary user HTML/CSS remain prohibited. The parent reads the already trusted `srcdoc` tree to select the clicked node (a restricted, deliberate exception to the fully opaque sandbox of public page preview). The explicit separate Apply, Save and Publish sequence remains mandatory; closing without Apply discards working changes.

The preview iframe uses real viewport widths **1200, 780, and 390 px** so the existing `max-width:900px` and `max-width:600px` style layers are visually observable. Its viewport is scaled for the available dialog width, not simulated by changing outer page CSS. Invalid intermediate inspector values show a preview validation message without replacing the saved session or allowing unvalidated publish. Moving up/down is now handled through the same atomic `editTree` move operations used by other structural commands.

Browser E2E covers direct heading selection, DOM selection marker, responsive viewport/mode sync, immediate preview updates, edit persistence, undo/redo, and no unexpected network requests. This is not yet freeform drag/drop resizing or Factory D7 lossless WYSIWYG parity.


## Direct canvas manipulation and graph-local history (2026-10-25)

The Design Graph inspector now supports a complete direct-manipulation pass without enabling executable page code:

- **Drag and drop:** drag a node to another node's leading/trailing edge to reorder it, or into the central area of a container to reparent it. Invalid drops into the node's own subtree are ignored; the same validated atomic `editTree` operation performs the move.
- **Free positioning:** hold **Alt** while dragging a node to adjust `translateX`/`translateY`. Deltas snap to an 8 px grid and remain bounded by the closed style schema. Normal drag continues to mean tree reorder/reparent.
- **Resize handles:** the left, right, bottom and bottom-right handles set validated `widthPx`/`heightPx` values, with an 8 px snap increment and schema-range clamping. The left handle adjusts horizontal translation to preserve the opposite edge. If a fixed desktop width is clipped in a narrow preview, the responsive **Вписать в экран** action sets a breakpoint-specific width and resets horizontal translation so the element becomes reachable. When tablet/mobile mode is active, dimensions are stored in that breakpoint's override rather than overwriting desktop values. A width resize removes a competing `widthPercent` in the same style layer.
- **Undo / redo:** each structural drag, resize, free-position gesture, and first edit in a focused inspector control creates one graph-local history entry. Undo/redo restores the complete graph, token set, selected node, breakpoint and preview device. The history is bounded to 80 entries per editor session and resets on open. This complements, rather than replaces, the outer CMS draft/save/publish history.
- **Safety:** the preview iframe remains `sandbox="allow-same-origin"` without `allow-scripts`; the CSP still blocks scripts, network connections, forms, objects and nested frames. The parent attaches pointer handlers to the trusted rendered DOM; no script is injected into the iframe. Links and media remain selection-only.
- **Verification:** the Chromium suite now exercises sibling reordering, graph undo/redo, Alt-drag translation, desktop and mobile resize handles, existing breakpoint editing, text editing and apply-to-draft persistence.

Snapping applies to direct drag deltas; the underlying stored values remain numeric CSS pixels. This remains a typed composition editor, not arbitrary HTML/CSS authoring. The editor does not yet promise lossless import/export with Design Factory D7, and direct free-positioning is intentionally a translation rather than absolute-layout conversion.


The final Chromium scenario also drops a heading onto a nested child's center and verifies that hit-testing resolves the containing container, then checks the persisted graph for desktop dimensions, mobile width override, translation, and reparented ownership. The resize E2E verifies breakpoint-specific resizing and the fit-to-screen recovery path for a fixed desktop width that overflows a mobile viewport. The visual hint in the dialog advertises the gestures so they are discoverable without reading this document.


## Provisional Factory candidate envelope and handoff audit (2026-10-25)

The new `stage3/sdk/design-graph-interop.cjs` module adds a **versioned CMS-side interop envelope** around a candidate that already contains a valid site-v1 document and typed `section.designGraph`. It does not parse arbitrary Factory HTML/CSS/JS and does not reconstruct the original Factory authoring project.

### Current behavior

- Candidate format: `manufact-design-factory-lead-graph-candidate-v1`, version 1; handoff format: `manufact-ai-design-graph-handoff-v1`, version 1.
- Studio detects candidate/handoff JSON during ordinary import, creates or resumes an isolated draft session, and displays graph node counts, visual-fidelity label, changed graph properties, changed bound CMS fields and declared integration gaps.
- Handoff export contains the original candidate unchanged, the edited CMS site-v1 as a separate document and a descriptive audit. It does not publish.
- Bound graph text/href properties must resolve to an existing typed node and a declared string value in a registered CMS section element/repeater. Unknown envelope keys/versions, unsupported mappings, missing bindings, cross-site identity changes and a changed/removed selected graph ID fail closed.
- The audit identifies node additions/removals/reparenting/reordering/property changes, graph type/style vocabulary, responsive/state/motion/media use, content bindings, tokens and assets. Diffs are bounded to 200 leaf changes.
- Offline mode stores the temporary baseline in `sessionStorage` for the current browser tab. Hosted mode intentionally does not persist this extra baseline across a reload; export the handoff before leaving the tab. Candidate/handoff imports allow 2.5 MB; ordinary site-v1 JSON remains limited to 900 KB.

### Verification and non-goals

At functional SHA `86f9f8b6db1e69add234b3adc0478025626aa711`, [full Stage3 CI #40188715664](`https://github.com/manufact-test/ai-site-cms/actions/runs/40188715664`) passed, including the synthetic 10-node graph smoke, fail-closed checks, JS/PHP vocabulary parity, bundle parity, Chromium Studio E2E and PHP/SQLite HTTP persistence/publish E2E.

**Not yet verified:** the independent Design Factory's actual D7 output schema, exact visual fidelity, lossless Factory↔CMS conversion, or reconstruction of the Factory workspace. The fixture is synthetic and already has a valid CMS site-v1/typed graph. Its `fidelity: partial` and `integration_required` are explicit. The audit JSON is not signed provenance or permission. No official Stage3 acceptance follows from CI.

When the owner provides the final D7 artifact, first inspect that artifact, write a supported/converted/missing-property matrix, and compare representative desktop/tablet/mobile output. Only then change the envelope or implement a version-pinned actual D7 adapter. Do not touch the independent Factory branch/files or merge branches without owner authorization.
