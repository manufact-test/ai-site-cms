# Rendered JSON-LD semantic delta — first-client SEO QA

**31 October 2026 · Independent SEO worker · `feature/site-seo-engine`.**
All implementation is within `stage3/seo-engine/**`. The sole main integrator owns CMS, PHP, Studio, SDK, CI, merged release and deployment.

## Why this is a real first-site gap

The previously delivered HTTP-vs-rendered reconciliation compared JSON-LD *root type names* and detected malformed scripts. JavaScript could nevertheless change an `Organization`, `Product` or `Article` claim **inside the same @type**—for example, inject an `aggregateRating`, switch an existing `price`, alter a `sameAs` identity, or add a foreign `@id`. The root-type list could remain identical. The static Structured Data Semantic QA inspects only the supplied original HTTP HTML, so it cannot see this runtime mutation.

This extension reuses the **existing** bounded JSON-LD parser/graph extraction in `lib/seo-structured-data-audit.cjs`, the already source-pinned HTTP/rendered-DOM audit, its private report and the **one** SEO Operator Workspace. There is no new browser, dependency, configuration, second report, schema generator, generic site template, CMS mutation or deployment.

## Implementation

- `lib/seo-structured-data-audit.cjs` exposes `compareRenderedSemantics`, an in-memory bounded per-page comparison of original HTTP HTML and captured rendered DOM using the existing parser, schema candidates, known Blueprint paths and approved HTTPS mount.
- It compares trusted `@type` occurrences **including nested `@graph`, `mainEntity` and breadcrumbs**, not just root `@type`; checks eligible/unconfirmed candidate types, potentially factual allowlisted fields, schema.org context, unsafe entity URLs, page canonical references and breadcrumb sequence/tail/target.
- For owner-sensitive claim properties, it detects both **new fields and value changes with unchanged field counts**. Canonicalized field-value digests are used **only in process memory** to compare equivalent JSON key ordering; neither the values nor their digests are emitted. Removed fields/types are surfaced for manual review.
- Malformed/oversized JSON-LD, unsupported deep graphs and uninspectable source/DOM produce `incomplete`, never an assumed clean semantic comparison.
- `lib/seo-rendered-content-audit.cjs` consumes the comparison for every inspected desktop/tablet/mobile source pair, adds priority-coded manual findings and per-device coverage. It refuses the same bad sources/changed browser response/unstable DOM as before.
- `lib/seo-rendered-content-view.cjs` displays semantic device coverage, claim/type regressions and missing evidence in the **existing** private Markdown and CSP HTML report. The existing Workspace and lead readiness see the new P0/P1 findings automatically; no new config key is needed.

### New findings

| Code suffix (prefix `rendered:`) | Priority | Operator interpretation |
|---|---|---|
| `jsonld-owner-claim-mutated` | P1 | New or changed JSON-LD claim property: verify original and rendered fact with owner |
| `jsonld-unconfirmed-candidate-injected` | P0 | Runtime introduced a material schema type whose Blueprint owner facts are not confirmed; hold |
| `jsonld-unapproved-type-injected` | P1 | Runtime introduced material type outside approved Blueprint schema candidates |
| `jsonld-semantic-regression` | P1 | New foreign/unsafe entity URL, page canonical mismatch, invalid breadcrumb or context |
| `jsonld-semantic-comparison-incomplete` | P1 | Source or rendered JSON-LD cannot be fully inspected; no semantic parity claim |
| `jsonld-nested-entity-drift` | P2 | Nested types or claim properties added/removed, or unknown type count increased: inspect intent |

The report carries only approved page IDs/paths, safe predetermined type and claim **field names**, counts, and source hashes. It never exports client values, JSON-LD bodies, rating/price strings, addresses, arbitrary schema type strings or claim-value hashes. The private input DOM remains outside Git.

New counters: `schemaRuntimeObservedPairs`, `schemaRuntimeUnknownPairs`, `schemaClaimChangedPairs`, `schemaUnapprovedTypePairs`, `schemaUnconfirmedFactPairs`, `schemaUnsafeEntityPairs`. They count **device pairs**, not unique assets, Google observations or SEO fixes.

## Actual focused verification in this worker checkout

The source checkout was obtained at SEO HEAD `f16b782c8ccd6ec47bb16c46f4dcedc32c3f51f3` before edits.

```bash
node stage3/seo-engine/tests/seo-browser-image-observation-smoke.cjs
node stage3/seo-engine/tests/seo-css-visibility-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-capture-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-content-smoke.cjs
node stage3/seo-engine/tests/seo-structured-data-smoke.cjs
```

All five **real Node smoke programs passed** in this checkout before the new change. The modified rendered-content test also passed after this change and covers unchanged data, a newly injected rating, a silent price-value change in the same type, injected unauthorized nested Product, unsafe entity URL, malformed JSON-LD/unknown coverage, unconfirmed candidate, breadcrumb regression, property removal, stable JSON key reorder, redacted output, CLI and existing Workspace packet integrity.

These are **offline synthetic data and mocked Chromium**; they are not a real Chromium launch, customer-site execution, GitHub Actions, current owner approval or Google/Search Console evidence. Final regression results, if run after documentation, are recorded in the worker handoff.

## First approved client pilot — same workflow

1. The lead obtains original approved Blueprint v1, matching current Site v1 and real public HTTPS source transcript outside Git. Confirm approved site ID, exact published revision and HTTPS mount.
2. Run the existing `capture-rendered-public.cjs --mode preflight` without network, then **only with actual operator/client authorization** perform same-origin GET-only Chromium observation. The original collector's sandbox, DNS pinning, route/mount limits and three-device snapshots are unchanged.
3. Use the **existing** `review-rendered-content.cjs` or `crawl.renderedCapture` in the original Operator Workspace. Both legacy v1 and source-pinned v2 DOM files gain the semantic comparison when the HTTP pair is inspectible; unmatched/unstable v2 remains uninspected.
4. Inspect P0/P1 semantic differences against original *private* page DOM and confirmed owner business facts. Run existing **HTTP Structured Data Semantic QA** to inspect unchanged server-side issues, and separately validate real Google rich-result eligibility if applicable.
5. Record human decisions in lead release/SEO work, do **not** auto-close tasks or claim an automatic GO.

## Boundaries and remaining real-world work

This is a **bounded JSON-LD semantic delta**, not an exhaustive Schema.org, microdata/RDFa or Google validator. It cannot prove the accuracy of unchanged source claims, real rich-result eligibility, Google indexing, render attribution, site revision, visual accessibility, or owner approval. A changed value signals investigation even when benign; a stable value does not prove truth. Deep or malformed graphs are incomplete rather than guessed. It does not execute JavaScript itself; it compares separately supplied source and DOM.

Highest remaining priority: the sole lead integrator must run an authorized first-customer evidence chain with real same-release Blueprint/Site/HTTP/Chromium captures and human SEO release decisions. No real client URL, source revision, owner facts or authorization are available in the worker branch.
