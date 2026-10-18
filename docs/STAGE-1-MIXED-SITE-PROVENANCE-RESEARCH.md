# AI Site CMS — Stage 1: mixed-site renderer parity and signed capability provenance (v1.24)

**Date:** 18.10.2026. **Status:** non-production research, Stage 1 still NOT accepted. **Code exclusively:** branch `research/stage1-editor-comparison`, HEAD `48b7579eaf7b0dddec6422b9890fdbab73daa2a0`. **Full CI:** [#39115456497](https://github.com/manufact-test/ai-site-cms/actions/runs/39115456497) — **4/4 jobs completed/success** (comparison, regeneration, durability, mixed-site-trust). This document is evidence, NOT production technology approval.

## Research block A — complete *reviewed heterogeneous component graph* in four renderers

Sources: `research/stage1/heterogeneous-regeneration-parity.cjs`, `heterogeneous-renderer.php`, `heterogeneous-react-view.cjs`, using the earlier vetted typed graph from `versioned-site-reconciliation.cjs`.

- Site graph: **4 components → 5 components** following an AI-versioned candidate; heterogeneous **hero, accordion, preview-only form, media, copy**, including stable-ID reorder and **one explicitly reviewed rename**.
- **6 owner overrides preserved** (text, gradient, internal action URL, accessible image alt, disclosure state, email placeholder); owner strings containing script/image-like text remain escaped as text; a staged AI update does not implicitly publish; previous exact published revision remains restorable as a new rollback revision.
- Cross-renderer semantic comparisons: **7/7** output states: typed HTML, independently implemented **PHP 8.3 CLI**, React 19 server static markup for both states (6), plus actual **Next 15 static export build** after regeneration (1). Checks include order, stable IDs, text, curated asset URLs/alt, accessible disclosure state, preview-only button behavior and lack of unexpected script/event-handler/form execution in the examined component subtree.
- **675 test assertions** in the mixed-site runner, including **10 injected semantic omissions/unsafe DOM mutations detected** and **11 negative PHP payloads refused** (unknown values, invalid types, unsafe href/asset/CSS, duplicate stable IDs). This is materially wider than the previous manually projected three-node content-only view.
- CSS gradient/motion are generated through the already validated trusted typed CSS adapter with reduced-motion rule, **not independently produced by all four renderers**, and **not browser-measured in this new test**. Next export is static: neither Next SSR nor React hydration, production interactions, network-backed forms or actual Hostinger PHP is proved.
- This is **NOT** full arbitrary site-import parity. Component kinds and markup are reviewed and enumerated. It does not prove preservation of a previously unknown independently generated AI site's CSS/JS/SEO, general animated widgets or media uploads. **No blinded external second-model generation** was performed.

## Research block B — signed extension authenticity versus reviewed capability authorization

Source: `research/stage1/capability-provenance-threat.cjs`, reuses the eight trusted visual binding targets and two curated local SVG sources from the prior research pack.

- **38 assertions, 30 refused negative cases**. Ephemeral Ed25519 test publisher signs deterministic package data, including reviewed field definitions, versions and asset hashes. Integrity/signature checks reject payload tampering, forged signer, invalid signature, unknown/revoked publisher, and unsupported asset inventory/digests.
- **A valid signature is NOT permission to execute arbitrary code.** A separate developer-reviewed mapping enforces exact field kind/target/typed defaults: no arbitrary CSS expressions, DOM HTML sinks, filesystem/network permission requests or unreviewed capabilities, even from a correctly signed package.
- In-memory monotonic version gate rejects downgrade/replay; failed installs remain atomic; a trusted version change retains two owner overrides. An incompatible field removal holding an owner override is refused rather than silently losing it.
- **Security limits:** trust keys in this test are ephemeral, publisher revocation/high-water mark are in-memory; no persistent signed trust store, key rotation, hostile code sandbox or dependency isolation, secure release channel, vulnerability review, real user authentication, production plugin installation, browser DOM attack test, storage/remote backup integrity or multi-host resilience. Curated static SVG checks are not a universal SVG sanitizer.

## CI diagnostics and correction history

1. Initial signed-SVG test accidentally treated the mandatory SVG XML namespace URL as a remote asset. Fixed by excluding only the exact fixed SVG namespace during active-content checks, leaving the asset digest of the whole original content unchanged.
2. Strict typed manifest gate caught an accidental extra `values` field in the synthetic HTML view adapter. Fixed projection to exact `{id,kind,defaults}`.
3. One negative PHP test unexpectedly succeeded because it replaced a valid title with another valid title, rather than injecting an invalid field. Corrected to an actual unexpected property. The suite now passes.
4. Final [Actions #39115456497](https://github.com/manufact-test/ai-site-cms/actions/runs/39115456497) PASS all **4/4 jobs**, including preexisting browser editors, CSS, media, PHP publish and durable snapshot checks.

## Architecture implications, NOT an approved choice

- **A: PHP-first typed manifest + carefully reviewed render adapters** has additional narrow interoperability evidence, but authoring each component renderer and keeping browser interactions aligned are costs; PHP CLI is not shared-hosting proof.
- **B: Schema editor (Jedison/RJSF) with React/Next-derived component view plus PHP public adapter** might reduce repeat markup, but still needs rigorous schema/behavior sync and public runtime independence, and may introduce build constraints.
- **C: Puck/Craft/alternative editor as a selective embedded field engine** has no new directly matched full-site benchmark in this v1.24 block; previous foundation reviews remain applicable. Do not elevate any candidate to selected technology.
- **Hard blockers for Stage 1:** blinded independent second-model AI site + independently generated intent/manifest and completeness scoring, automatic unsupported/missing field discovery beyond supported kinds, original complex CSS/JS fidelity, executable extension containment, authenticated issuance/revocation, real multi-device/browser QA, PHP shared-hosting read-only smoke by owner authorization, durable production restore/power-loss/backup, final owner-facing tradeoff decision.

**Invariants unchanged:** Stage 0 accepted; Stage 1 in progress, NOT accepted; Stage 2 not started; stack not selected. 193 requirements = 135 mandatory, 42 desirable, 16 unwanted. Matched evidence matrix retains **43 limited research/doc signals / 92 missing targeted product probes, 0/135 mandatory product accepted**. No MVP; full release only after 135/135; CELIKOM independent post-release pilot Stage 17. No research-code merge into main and no live-site modifications.
