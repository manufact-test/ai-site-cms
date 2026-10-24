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

## Important limitations still open (do not overclaim)

- This is a **first universal foundation**, not a pixel-perfect import path for arbitrary HTML/CSS or all Design Factory compositions. Rich typography, custom fonts, complex intrinsic measurements, advanced positioning/overlays, gradients, transforms, animation timelines, vector icons, video, interactive state machines, accessibility attributes and arbitrary breakpoint systems need versioned, separately validated schema extensions.
- Current node inspector covers the implemented primitive types and properties; more ergonomic WYSIWYG canvas manipulation, breakpoint-specific content, token reference management and component nesting behavior remain to be developed.
- The shared legacy global page layout and preset styling have constraints; no promise of full viewport-bleed layouts or design fidelity is made before matching Factory output screenshots and element metrics.
- PHP and JS rendering have a shared contract but pixel equivalence on real Factory output is not yet established. Do not conflate CI-only proof with owner product acceptance.

Priority after D7 handoff: lossless coverage matrix and adapter first, then fill missing style/node vocabulary, media/motion integration and robust visual comparison; keep the independent worker branch isolated throughout.
