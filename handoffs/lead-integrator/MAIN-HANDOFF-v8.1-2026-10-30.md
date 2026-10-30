# MANUFACT AI Site CMS — lead integrator addendum v8.1
**30 October 2026 · isolated feature branch**

Read [v8.0](MAIN-HANDOFF-v8.0-2026-10-30.md) first for the authoritative boundaries, product reset and prior architectural state. The branch is `feature/stage3-ai-site-contract`; do not touch `main`, production, Hostinger, real data or `stage3/seo-engine/**` (parallel specialist).

## Feature added after v8.0

The complete end-to-end flow for a bespoke authored form **inside** a responsive Design Graph is implemented through a closed `form-slot` node. Its section MUST be an actual `lead-form` or `lead-form-flex`. Exactly one slot per Graph; never fabricate a form for a `custom-section`, and a Graph without the slot remains form-inactive. JS/PHP validation agrees; the public PHP renderer reuses the original signed and anti-spam form markup; Studio offers slot placement, existing form-field editing, and author preview. Delivery routing, visitor collector, private saved leads, and device-specific quality counts are aligned. See the most recent additions to `docs/ROADMAP.md` and `stage3/docs/APPROVED-SITE-PACKAGE.md`.

Changed sources: `stage3/sdk/{design-graph,contract}.cjs`, `stage3/server/{DesignGraph,ContractValidator,PublicRenderer,SiteRepository,FormGateway,FormRoutes}.php`, `stage3/studio/{app.js,hosted.js,bundle.js}`. Focused tests: `stage3/tests/{contract-smoke.cjs,graph-interactions-smoke.php,server-e2e.cjs}`. The Studio bundle is compiled byte-identically from first-party sources; run `node stage3/studio/build.cjs --check` before handoff.

## Truth and follow-up

1. Resolve fresh HEAD and exact SHA's latest GitHub Actions run; both `contract` and `technology-runtime` must be SUCCESS **before** claiming green. This note intentionally does not pre-claim a final CI result.
2. Continue one substantial real site-specific editing/preview/publish vertical per user request; avoid generic template builders, excessive test scaffolding and cosmetic-only sprints.
3. First real externally client-approved desktop/tablet/mobile artifact is still absent. Owner acceptance is 0/135. Engineering ledger counts unchanged: 124 candidate, 5 partial, 6 external gates.
4. Unpublished preview forms are inert. Published visitor submissions require the existing explicit signing secret, secure delivery configuration and external owner verification. Do not enable live delivery without permission.
