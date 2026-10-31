# Bespoke Design Graph rich text — owner editing without losing formatting

**31 October 2026 · lead integration.** A client-authored Design Graph heading or paragraph may hold 2–16 typed `runs`, each with its own text, weight, italic, safe color and internal/external link. The published text is the exact concatenation of those fragments. Both independent JS and PHP validators/renderers already implement this contract. The editing change below preserves it in the **existing** Studio, without a parallel text editor or arbitrary HTML.

## Owner experience

- In the full-page Workbench, selecting a heading/paragraph with rich fragments exposes **individual text, weight, italic, color and hyperlink fields**. The plain top-level text input is not offered for those nodes: one accidental change cannot flatten the approved link/typographic hierarchy.
- Double-clicking that heading/paragraph in the full-page PHP preview opens the **existing quick-edit panel**, with one textarea per original fragment and an indication of its current styling/link. Applying all changes is one atomic draft/Undo action. Empty or overlong fragments fail without mutation. Ordinary text nodes continue using the one-field quick edit.
- The existing **«Тексты всего сайта»** search-and-replace now recognizes text runs. It previews and replaces matches **within** the original fragments, keeping each fragment's color, emphasis and link byte-for-byte. If a search phrase crosses a style/link boundary, or a replacement would produce an invalid empty/oversized fragment, the affected row is blocked and points to the existing precise Graph editor. Other safe selected rows can still be applied in one Undo. This is a deliberate human intervention, not an automatic repartitioning of styled or linked text.
- For an intentionally **shared** section on several pages, the whole-site editor uses the same SDK shared-section synchronization as normal property editing. Choosing one instance propagates the approved edit across its linked page copies. The preview reports the number of affected shared groups, and divergent independent choices fail atomically rather than producing inconsistent page copies.
- The advanced Graph Inspector continues to allow an explicitly labeled **«Текст (сбрасывает акценты)»** action for an intentional formatting reset and supports full fragment edits. There is no alternate rich content model.

## Limits and safety

- No XML/HTML/JS/CSS is editable. Graph text remains plain UTF-8 strings. Links still use the same typed `href` validator; color values use `#hex` or named design tokens.
- A run must remain 1–1500 characters; total text at most 3000; 2–16 runs; their texts concatenate exactly. The helper `stage3/studio/rich-text-edit.cjs` does not mutate its input or silently merge/delete/reorder fragments. The original Graph, release, preview and shared section validation are reused.
- Bulk editing checks source text **and** the original full run array immediately before applying. Source drift, an invalid link, unknown token, or a conflict fails the whole selected batch. Save and Publish are separate and never invoked by these editors.
- The broad Stage3 Chromium journey verifies real controls in the offline Studio and Undo; Node smoke covers cross-boundary refusal, exact inline links/styles and malicious/oversized values. Neither is client visual acceptance.

**External gate unchanged:** real approved three-screen prototype comparison, published forms and human GO are still required, and official owner acceptance remains 0/135.
