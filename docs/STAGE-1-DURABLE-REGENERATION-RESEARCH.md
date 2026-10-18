# AI Site CMS — Stage 1: reviewed capabilities, AI regeneration, durable PHP snapshots (v1.23)

**Checkpoint:** v1.23 — 18.10.2026. **Type:** non-production, controlled research. **Code branch:** research/stage1-editor-comparison at 32ab15f4ec523597724610011a71695bd05d5784. **CI:** [#39111755170](https://github.com/manufact-test/ai-site-cms/actions/runs/39111755170) — completed / success across comparison, regeneration, durability. No research-code merge into main.

## Scope of the evidence batch

Four separately verified research blocks after v1.22, not a finished CMS implementation:

1. **Reviewed behavioral capabilities:** research/stage1/trusted-behavior-capabilities.cjs and trusted-behavior-browser.cjs. Typed internal link, text, details accordion, dialog and preview-only form; static validator/JSON Schema parity, migration quarantine, real Jedison 1.27.1 and RJSF 6.11.0: two browser runs, **20 real native UI edits**, source JavaScript never executed, opaque iframe, publication baseline immutable and form never posts. Initial failed CI detected Jedison boolean select (not checkbox) and sandbox-blocked native submit; fixed without weakening the sandbox. Last earlier complete success #39079526881.
2. **Reviewed visual and media capabilities:** reviewed-visual-asset-pack.cjs and reviewed-visual-asset-browser.cjs. Eight allowlisted typed fields (gradient angle/start/end; animation on, duration/easing; local SVG asset and alt). **18 native edits / 2 editors**, **16 invalid model values refused**, **2 pre-approved SVG fixtures decoded**, CSS getComputedStyle tested desktop/mobile, prefers-reduced-motion respected, nonce-only script/style and no style-src-attr unsafe-inline; bad CSS/URLs refused. Fixed a false rejection of the mandatory SVG XML namespace. Full CI success #39109244889. Curated asset catalog ≠ general SVG sanitizer or production upload.
3. **Regeneration and owner-edits model:** versioned-site-reconciliation.cjs and versioned-site-reconciliation-browser.cjs. **4 → 5** typed components, reorder/add, approved hero stable-ID rename, **6 owner overrides retained** in the browser scenario, no automatic publish, invalid type migration quarantined, CAS stale transaction refused, **4 revision history entries** across publish/rollback. Jedison/RJSF browser proof **2/2 success, 10 UI edits**. Previous CI stalled in an unrelated RAF iframe resize wait; bounded timer polling fixed the old registry-editor-browser.cjs test. Full CI success #39110896781. This is a reviewed single-site typed graph, NOT blind independent AI-site conversion.
4. **Persistent PHP snapshots and process restart:** durable-site-store.php + durable-site-recovery.cjs, plus strict optional rehydration in versioned-site-reconciliation.cjs. Real PHP CLI per transaction, file-based current.json and last-good.json, checksum-envelope, length bounds, independently checked component schema/owner values and publication shape, immutable history prefix, source-aware historical rollback, atomic temporary write/rename, file lock and compare-and-swap, explicit restore when current is corrupt. **48 assertions/probes passed**; recreated JS store in fresh Node processes **3 times**. Tested failpoint after backup/before main commit, CAS stale writer, malformed text/CSS, swapped field names, valid reviewed alias, tampered history, corrupt primary fallback, corrupt both fail-closed, explicit backup recovery. Last local stored snapshot ~6.5 KB, not a performance benchmark. An early negative exposed rollback falsely blocked by normal owner-retention logic; now only a verified historical revision can explicitly bypass that rule. CI [#39111755170](https://github.com/manufact-test/ai-site-cms/actions/runs/39111755170) completed/success with 3 independent jobs.

## Important trust/durability limitations

- PHP tests ran on a **GitHub-hosted Linux runner**, not actual Hostinger. No live production hosting writes or configuration changes. No CMS server/database/admin authentication.
- sha256 is **accidental-corruption detection only**, NOT tamper-resistant integrity against an actor able to edit the files and recompute the digest.
- rename/LOCK_EX/flock were tested in this local Linux environment. **No fsync/power-loss guarantee**, filesystem fault simulator, network filesystem portability, multi-host writes, backup rotation, restore rehearsal on real hardware, external off-site backup, disaster recovery RPO/RTO or access-rights design.
- A last-good snapshot can be older than the latest committed revision. Automatic read fallback is **read-only**; explicit restore is required to rewrite the primary.
- Reviewed models and manually projected HTML are not a general arbitrary AI site editor. Site/manifest still **not created by a blind independent second LLM**, SEO/form delivery/auth/trusted SVG ingestion not solved. No full CSS source parity or production integration.

## Research assessment; never infer product acceptance

**18 approved stages 0–17; stage 0 accepted, stage 1 in progress / not accepted, stage 2 not started; technology unselected.** Original 193 requirements: mandatory **135**, desirable **42**, not needed **16**. **Product acceptance 0/135**, the research-document evidence matrix retains **43 limited research/doc signals and 92 unmatched target probes**. First release only after full 135/135, owner acceptance, stages 0–15 completed; stage 16 release, stage 17 separately approved CELIKOM isolated test.

## Next Stage 1 gates

1. Obtain a genuinely **independently, blindly generated** AI site and author-intent/manifest; perform coverage audit without tuning the input to parser grammar.
2. Compare richer component fidelity HTML/PHP/React/Next, including trusted assets and behavior, not merely a content subset.
3. Define capability-pack review/provenance and server validation, compatible migration rules, CSP, forms/SEO, and independent audits.
4. Research durable storage tradeoffs and failure handling with explicit RPO/RTO, transaction/fsync, off-site backups, auth and shared-hosting capabilities; **Hostinger read-only only with explicit authorization**.
5. Present stack variants A/B/C for owner approval only after enough research. No stack choice, no Stage 2, no release/MVP, no CELIKOM access.

**Single future-chat handoff:** [docs/NEXT-CHAT.md](NEXT-CHAT.md), section 28. This report is a technical research document, not an additional handoff.
