# AI Site CMS — MAIN HANDOFF v1.64 / 2026-10-25

## 0. Source of truth and verification

- Repository: https://github.com/manufact-test/ai-site-cms
- Main integrator branch: `feature/stage3-ai-site-contract`. Do not touch `main`.
- **Verified functional source SHA:** `28e204bea1e64f79babbab85a05588199d2bd17d`.
- **Full Stage3 CI SUCCESS:** [Actions #40204138704](https://github.com/manufact-test/ai-site-cms/actions/runs/40204138704) for that exact SHA. This includes contract/SDK smoke, generated Studio bundle parity, offline Chromium editor E2E, hosted Studio + PHP 8.3/SQLite persistence and publish E2E, computed published-style checks, and standalone editor packaging.
- Documentation-only checkpoint is committed after the tested code. Inspect the current branch HEAD and its own CI separately; do not confuse documentation HEAD with the functional SHA above.
- Stage 2 remains **NO-GO** (human/host gates #5–#9); Stage 3 is isolated and **not formally accepted**; **0/135** mandatory product acceptance items are accepted.
- No permission for `main` merge, Hostinger/SSH, production, real databases, customer sites, CELIKOM, or PR #3/#4.
- Design Factory is a separate workstream. This change does **not** edit `stage3/design-factory/**` or claim real D7 compatibility.

## 1. Latest large block — inherited global typography and button styles

Implemented the site-wide visual settings end-to-end across the Studio settings dialog, site-v1 contract/schema, PHP validator, public renderer, Studio preview, generated offline bundle, and critical browser/HTTP E2E coverage.

- Global body text size: 14–22 px.
- Global line height: compact / normal / relaxed.
- Global H2 scale: compact / normal / large.
- Default site button style: solid / outline / pill; configurable corner radius 0–32 px and button text color.
- A section can explicitly override the global button style with default/inherit, solid, outline or pill.
- The public PHP renderer and Studio preview share the same theme tokens; navigation CTA follows the site-wide button style.
- Theme values are closed enums, bounded integers and validated hex colors. Arbitrary CSS/URLs are not accepted.
- Older site-v1 documents that omit the new optional theme fields remain valid; renderer and Studio preview apply safe defaults.
- Undo/redo, explicit hosted draft save, separate publication, computed visitor styles and generated bundle parity are covered by the existing end-to-end CI.

**Exact verified code:** `28e204bea1e64f79babbab85a05588199d2bd17d`  
**Full CI:** [Actions #40204138704 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40204138704)  
**Standalone Studio artifact:** [download package](https://github.com/manufact-test/ai-site-cms/actions/runs/40204138704/artifacts/12603301098)  
**Browser smoke screenshots:** [view artifact](https://github.com/manufact-test/ai-site-cms/actions/runs/40204138704/artifacts/12603415800)

### Owner's concise manual review

1. In Studio, open **Стили и язык сайта** and change text size, line height, H2 scale and button style; verify the preview updates.
2. Set the global button style to **Контурные**, then set one section's button style to **Залитые**. The section should win only for that section.
3. Undo/redo the style changes; save a hosted draft and confirm the visitor site does not change until explicit publication.
4. Check a previously saved site without the new optional theme fields: it must open and render with defaults.

These are product review checks, not formal Stage 3 acceptance. Existing visual/functional behavior outside these controls is not being claimed as owner-accepted.

## 2. Previous block — provisional Design Graph import/handoff bridge

Added `stage3/sdk/design-graph-interop.cjs` and connected it to Studio:

- Import recognizes a versioned candidate envelope `manufact-design-factory-lead-graph-candidate-v1`, a handoff envelope `manufact-ai-design-graph-handoff-v1`, or the existing regular site-v1 JSON format.
- The candidate envelope must already contain a valid CMS site-v1 document with one selected `section.designGraph`, design tokens, mapping metadata and explicit content bindings. It is a **provisional bridge contract**, not proof that the independent Factory's real D7 output uses this format.
- Source candidate and edited CMS site are retained separately. Editing the CMS draft does not rewrite the original candidate baseline.
- Studio shows graph node count, declared visual-fidelity level, changed graph properties, changed mapped CMS fields, and known integration gaps.
- `Export D7 handoff` produces a JSON package with the unchanged source candidate, current edited site-v1 document and a descriptive compatibility audit.
- Handoff import/export preserves stable graph identity and current site edits. If the selected graph is removed or its stable ID changes, the UI explains that handoff needs repair and the exporter fails closed.
- Mapping validation requires each bound node/property and CMS source field to exist and have the right type. Unknown contract keys, unsupported format versions, invalid routes, cross-site identity changes and false publication-approval claims are rejected.
- Audit reports graph node types, supported style keys, responsive/state/motion/media usage, added/removed/reparented/reordered nodes, bounded property diffs, token/asset changes and content-binding changes.
- Local/offline Studio retains the working interop session for the current browser tab via `sessionStorage`. Hosted Studio intentionally does not persist this separate baseline across reloads; export the handoff before leaving the tab.
- Interop candidate/handoff JSON has a 2.5 MB import limit; ordinary site-v1 JSON remains capped at 900 KB. Export never publishes.

## 3. Exact limits — do not overclaim

This block is an **interop envelope + compatibility audit + round-trip handoff scaffold**, not the final D7 adapter:

- The sample candidate is synthetic and validated against the current CMS site-v1/Design Graph contract. No real final Design Factory D7 package was ingested or visually compared in this run.
- It does not reconstruct the original Factory project/workspace, generator graph, or arbitrary HTML/CSS/JS. It expects a valid CMS site-v1 document with an existing typed Design Graph.
- `fidelity: partial` remains explicit in the sample. The audit requires owner visual review and lists unresolved integrations.
- The handoff audit is descriptive JSON, not a signature, access-control decision, trusted provenance record, or publication permission. Import is a draft operation only.
- No claim of pixel-perfect or lossless Factory↔CMS compatibility is justified until the owner supplies the official D7 handoff, the lead reviews its actual schema, and a concrete property/loss matrix plus visual comparison is completed.

## 4. Code map

- `stage3/sdk/design-graph-interop.cjs` — versioned envelope validation, baseline preservation, graph diff, binding audit, import/export.
- `stage3/studio/app.js` — candidate/handoff detection, status summary, guarded export, local tab-session recovery.
- `stage3/studio/index.html`, `stage3/studio/studio.css` — handoff control and compact status presentation.
- `stage3/studio/hosted.js` — explicit successful/cancelled import return for safe Studio handoff state.
- `stage3/studio/build.cjs`, `stage3/studio/bundle.js` — source-integrated offline bundle; parity check passes.
- `stage3/tests/design-graph-interop-smoke.cjs` — representative nested responsive/media/state/motion graph, changed CMS bindings, handoff round-trip, invalid-contract rejection and JS/PHP vocabulary parity.
- `.github/workflows/stage3-ai-contract.yml` — syntax checks and the new smoke test are included in the existing full CI.

## 5. Verification and suggested owner review

Latest full CI for `28e204bea1e64f79babbab85a05588199d2bd17d` is green: [Actions #40204138704](https://github.com/manufact-test/ai-site-cms/actions/runs/40204138704). The earlier interop checkpoint remains documented at [Actions #40188715664](https://github.com/manufact-test/ai-site-cms/actions/runs/40188715664).

When convenient, manually verify the visible Studio flow with a representative candidate JSON:
1. Import the candidate as a draft; confirm the interop status and handoff button appear.
2. Change one CMS-bound field and one graph-only style; confirm the baseline remains separately represented and the audit shows both types of change.
3. Export the handoff, import it into a clean session and verify the edits survive.
4. Confirm there is no automatic publication and that an invalid/missing graph ID is rejected for handoff.
5. In hosted Studio, export before closing/reloading the tab because the separate source baseline is not server-persisted.

These are manual product checks, not official acceptance of Stage 3.

## 6. Current stage and next large block

- Stage 3 isolated engineering; Design Graph + Media/Motion direction estimate remains about **68%**. This is a narrow engineering estimate, not overall CMS completion.
- Stage 2 is still NO-GO; Stage 3 formal acceptance remains false; **0/135** mandatory requirements accepted.
- If the owner supplies the final D7 package, first inspect that exact artifact and write a supported/converted/missing-property loss matrix. Then revise the provisional envelope or implement a version-pinned adapter to the actual schema. Do not merge the worker branch or silently map unknown properties.
- Until then, continue a large end-to-end CMS block: remaining design/SEO/navigation/repeater/form/media workflow gaps and preview/published fidelity. Avoid micro-fixes and repeated test cycles; run the existing full CI plus only essential focused checks.
- Never modify `main`, deploy, run real-host/database migrations, or touch the independent Factory worktree without explicit owner authorization.

## 7. Ready-to-paste first message for the next lead chat

See [FIRST-MESSAGE-v1.64-2026-10-25.md](FIRST-MESSAGE-v1.64-2026-10-25.md).
