# ADR 0001 — Selected Stage 2 foundation and fallback

**Date:** 18 October 2026 · **Decision status: ACCEPTED for architectural direction**, under the explicit owner delegation of 18.10.2026: the owner entrusted the assistant to choose the technologies and proceed, while insisting on the complete previously agreed CMS result. This is **not** Stage2 acceptance, production security approval, hosting permission or release.

## Context

Stage1 assessed A/B/C against 135 mandatory product IDs. See [owner decision synthesis](../STAGE-1-OWNER-DECISION.md) and [135-ID applicability](../STAGE-1-ADOPTION-MATRIX.md). Real browser experiments used Jedison 1.27.1 and RJSF 6.11.0; constrained PHP Opis and publisher tests were successful, but their research implementations cannot be treated as product security guarantees.

## Decision

**A: modular, AI-contract-first architecture.** PHP **Slim 4** is the API/router glue; **Opis JSON Schema 2.6** validates well-scoped typed input on the server; browser **Jedison 1.27.1** renders JSON Schema fields from an explicit versioned manifest-to-schema mapping. Node is permitted for *offline static bundle production* only. Each client site owns a separate CMS instance and data. The published website must work without an online CMS editor.

There is **no requirement to inherit a page-builder document model**. AI-generated sites remain original HTML/CSS/JS/PHP/React/Next source + stable-ID contract. A secure bounded site-adapter interface, precise owner override ownership and transactional publication will be built in later stages.

**B fallback:** swap only the schema field-renderer integration to RJSF 6.11.0 (React/Ajv2020) if Jedison is unsuitable or loses maintenance. **C: Winter + Jedison** is not in the base architecture; it could be revisited only via an explicit new decision and migration analysis. Do not silently pull code from GPL/AGPL/limited-license builders.

## Reuse, licenses and dependency policy

Slim MIT, Jedison MIT, Opis Apache-2.0; RJSF Apache-2.0 if fallback; each actual imported package plus transitive packages/fonts/media/assets needs checked LICENSE/NOTICE and SBOM. Pin packages/lockfiles before declaring repeatable production build. Avoid copying research tests into a production subsystem without a new review.

## Acceptance of this ADR vs unverified premises

- Chosen direction: **yes**, delegated and recorded.
- Production-ready package versions/dependency lock/security audit: **NO**.
- PHP/shared Hostinger version/extensions/database access: **NO live read-only permission; not verified**.
- Independent second-model AI-generated source + separate manifest proof: **NO**.
- Stage1 research: **accepted as closed research recommendation** after delegated decision; Stage2: **in progress, not accepted**.
- 193 requirements (135 mandatory, 42 desired, 16 excluded), no MVP, 0/135 product accepted.


## Implementation note v1.33 — tested actual Jedison dependency and isolated browser build

The Stage2 selected editor direction now has actual isolated source `cms/editor/`, pinned npm dependencies and Chromium tests via [#39129269825](https://github.com/manufact-test/ai-site-cms/actions/runs/39129269825). This confirms upstream Jedison fields working on a built-in closed object fixture, a byte-identical static browser build, and no Node hosting requirement. This **does not** fulfill production-level AI schema, authenticated admin, iframe preview, published data or arbitrary site support. See [report](../STAGE-2-EDITOR-BUILD.md).
