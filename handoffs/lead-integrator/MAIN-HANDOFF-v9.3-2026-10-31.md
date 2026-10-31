# MANUFACT AI Site CMS — lead integrator handoff v9.3 (31 October 2026)

## Verified parent and boundaries

- Work only in `feature/stage3-ai-site-contract`. Clean parent checked out for this increment: `4352346c9fd8f39b0b5b6a8af49476849134a225`; its workflow run `41200102505` passed **both** `contract` and `technology-runtime` jobs.
- Read `docs/MASTER-TZ.md`, this handoff, the v9.2 and v9.1 handoffs, last `docs/ROADMAP.md` sections and `stage3/seo-engine/SEO-FIRST-CLIENT-LEAD-TRANSFER-2026-10-31.md` before deciding next work.
- No merge to `main`, Hostinger, production or real customer data; no changes under `stage3/seo-engine/**` (independent worker's material), no external AI API or new dependency, no old Design Factory or duplicate editor. Public site changes only after the authorized owner Publish.
- The registered ledger remains **135 MUST = 124 engineering candidates + 5 partial + 6 external gates; accepted personally by owner: 0/135**. Tests and green CI do not represent external product acceptance.

## New functional vertical: truthful structured data through the one existing owner CMS

Previously the integrated SEO Engine could audit published Schema.org, but the current site-v1/PHP/Next product had **no** owner-controlled Schema.org output at all. We added a bounded per-page `seo.schemaType` setting in the existing **SEO и меню** Studio dialog with `none` (default), `WebPage`, `AboutPage`, `ContactPage`, and `FAQPage`. The owner explicitly chooses the page purpose, sees an in-dialog readiness/source explanation, applies an Undoable draft edit, and separately Saves/Publishes. Legacy site documents are unaffected.

The SDK, independently written PHP validator and JSON Schema now reject foreign types; `FAQPage` requires at least two actual complete question/answer pairs in a native `faq-accordion` on that page, visibly available on mobile, without a custom Graph replacing the native FAQ. The real PHP visitor renderer generates JSON-LD only for explicit selected types and a configured public canonical origin, omitting it from `noindex`, private preview and missing-host builds. It derives name/site/language/description/FAQ content from validated Site v1, **not** operator guesses or arbitrary script. PHP JSON hex-escapes potentially dangerous markup. The separate Next SSR/static visitor adapter reinserts only the closed publisher-owned JSON-LD into React render without broadening its executable script allowance. The standalone static output keeps the original script.

The initial CI surfaced a root-mount (`/` + `/`) double-slash in the pre-existing PHP canonical URL concatenation, exercised by the new structured-data proof. The publisher now normalizes that join once so canonical, Open Graph and JSON-LD agree for root-mounted exports; the correction requires a fresh exact-SHA CI pass before reporting green.

Touched core files: `stage3/sdk/contract.cjs`, `stage3/server/ContractValidator.php`, `stage3/server/PublicRenderer.php`, `stage3/schemas/site-v1.schema.json`, `stage3/studio/app.js`, its deterministic `bundle.js`, `stage3/runtime-export/templates/next/lib/runtime.js`; extended `stage3/tests/studio-browser.cjs`, `stage3/runtime-export/tests/next-probe.cjs`, CI and new `stage3/tests/structured-data-smoke.cjs`. User-facing spec and limit notes: `stage3/docs/SCHEMA-ORG-CMS-PUBLISHING.md`.

The PHP runtime is absent from the current scratch executor; JS contract and bundle checks can run there, while actual PHP render+validations and real Next SSR/Static builds are covered by the branch GitHub Actions. **Check actual final HEAD and both exact-HEAD jobs after uploading.** Never claim those tests have passed until observed. The synthetic fixture `example.test` is not a real customer and FAQ markup does not imply Google rich-result eligibility.

## Continuity from v9.0–9.2

- SEO worker's `244c7ab71796916f25313c3ebde385775665cc21` subtree integrated by lead on v9.0, with source-consistency corrections and form-slot recognition; no merge to main and no independent parallel SEO tool.
- v9.1 brought the existing private SEO work packets into the **original** owner Studio, with SHA-256 source pinning and navigation to exact editable fields; only manual owner-controlled changes.
- v9.2 preserved all authored Design Graph rich text fragments, safe link/style editing, full-page Workbench + quick editor + sitewide bulk search/replace, shared-section synchronization and Undo.

## Honest next priority / client gates

The first full client verification is still unavailable: owner-approved desktop/tablet/mobile design originals, approved Blueprint/Site v1, exact published HTTPS host and revision, explicit permission for safe Chromium collection, live Search Console evidence, real form delivery/consent tests, responsive/interaction inspection, owner acceptance and rollback planning. No user consent or those materials may be invented. When supplied: follow the integrated SEO Operator first-client runbook, validate three real viewports, forms, link graph, SEO/Schema.org, release readiness and fix/recheck/P0-P1 with owner. Otherwise continue a **meaningful** missing Stage3 functionality vertical within existing CMS, with only useful tests and a new documented handoff. Minimum 30 minutes of actual substantive development per work session; no cosmetic-only passes.
