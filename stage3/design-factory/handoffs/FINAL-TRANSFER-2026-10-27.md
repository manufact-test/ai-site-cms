# AI Site CMS — Design Factory | FINAL HANDOFF (27.10.2026)

**Purpose:** the first document the next independent Design Factory developer must read. Created after the final major product sprint. This is a self-contained handoff and not a D7 release certificate.

## 1. Hard boundaries and source of truth

- Repository: https://github.com/manufact-test/ai-site-cms
- Independent branch: `feature/stage3-design-factory`
- The sole writable path: **`stage3/design-factory/**`**.
- Lead developer is working independently, typically in `feature/stage3-ai-site-contract`; **only Lead integrates/merges**.
- Do NOT touch `main`, other branches, `stage3/sdk/`, `stage3/server/`, `stage3/components/`, workflows, hosting, WordPress, production, DNS or customer infrastructure.
- Read current GitHub branch HEAD before starting work. The last functional fix is `f728f242707f993110d341e5f4be4730d1868187`; this handoff and other documentation commits may advance HEAD.
- Use GitHub connector tools to fetch and commit code **directly to the independent branch**, without asking the owner to execute routine steps. Use leases/expected SHA for concurrent safety and verify changed-file scope after writing.

## 2. What actually exists now

D1–D6 are implemented as engineering deliverables: first-party CMS-compatible compiler, 12 theme directions, 42 composition variants, 12 multi-page sector kits, independent browser Studio, preview engines, integration bridge, owner review/checklist, client feedback exchange, D7 release/evidence tooling. Standalone HTML previews deliberately differ from PHP renderer in enhanced CSS composition: `integration_required` remains explicit.

The last two product sprints completed:
1. **Usable services editor**: move, duplicate-as-draft, delete, paste-many, replace the whole list, load the current list for editing, download TXT, English controls, undo/redo and atomic input validation.
2. **Owner review workflow**: four-page navigator with audited owner facts/SEO/section counts/CTA/feedback, HTML report for owner and JSON for developer. Reports are never legal signature, acceptance or approval to publish.
3. **No-loss composition**: inserting selected D3 composition on Home **before the first existing CTA**, preserving all original sections and IDs. Undo/Redo revokes owner indexing approval.
4. **Client feedback**: bilingual standalone `review.html`, review JSON import/export, edit notes, mark resolved, stale-context safety.
5. **Single-click delivery ZIP**: Studio top bar **«Передать проект ZIP»**, builds exactly 18 canonical files with strict ZIP32 CRC and deterministic member ordering:
   - `cms/site-v1.json`, `cms/integration-v2.json`, `cms/bridge-v2.json` — same CMS site, two D6 views
   - `design/project.json`, `design/workspace.json`, `design/services.txt` — editable owner project
   - `audit/owner-review.html`, `audit/content-audit.json`
   - `client/feedback.json` — real validated matching feedback, OR explicit excluded/not-loaded marker (no stale notes)
   - `preview/index.html`, `preview/services/index.html`, `preview/approach/index.html`, `preview/contact/index.html`, `preview/assets/preview.css`, `preview/review.html`, `preview/preview-info.json`
   - `manifest.json` (17 CRC32 member references; **not crypto signatures**) and `README.txt`.
6. **D6 export correction:** `lib/bridge.cjs` formerly replaced last Home section and diverged from Studio. Its additive CTA-preserving algorithm is now aligned with `studio/studio.js`; the exact first-party source was updated in `studio/runtime.generated.js`. With composition selected, `engine.bridge.build(workspace).site` and Studio's CMS JSON now agree. This is a meaningful defect fixed in the final sprint.
7. The **original** 8-file preview ZIP remains separately available and unchanged in its exact inventory and semantics.

### Final sprint's functional GitHub commits

- `92b5d3e373368beacca3f3e28de28d31095d7afa` — dual strict ZIP32 profiles for preview and 18-file transfer.
- `58cb45433c773d174c4f6506c25f29dd2826c7af` — D6/Studio CMS site parity (1008 combinations) and regenerated browser runtime.
- `7c1706459ebce8418f5265bbff9cffd2dbbbb846` — `studio/delivery-package.js`: deterministic 18-file handoff, refusal of inconsistent site/D6.
- `c94bc6bc17626d7008f7ff243bd3408a9be7dd9d` — browser Studio button, integration, strict ZIP assertions.
- `a675f42994c8646912278f3d7b40f6baf8e8ac47` — existing Chromium smoke expanded to inspect delivery ZIP and fix early export-hook teardown.
- `f728f242707f993110d341e5f4be4730d1868187` — explicit delivery ZIP inspector format distinct from static preview.
- Earlier workbench/owner audit functional HEAD before this sprint: `5dd961a94806b7f2bd870d2d49fe64b40ef6c022`.

## 3. Verifications completed — and those NOT completed

Verified using **actual GitHub first-party JS files**, evaluated in an isolated JS/DOM runner (NOT full Node+Chromium):
- 1,008 **12 kits × 42 compositions × RU/EN** combinations: D6/Studio exported CMS JSON parity, CMS validation and preservation of original CTA and section IDs.
- 72 sector/language/composition combinations built into 18-file delivery ZIP, parsed by the strict archive validator; another 72 variants were verified with **matching feedback included and stale feedback omitted**, no errors.
- The actual Studio `save-delivery-zip` click created a verified 18-member archive across default/edit/composition states; the original 8-file archive still passes.
- Existing Studio smoke source and browser inline E2E probe parsed successfully. Real optional Chromium run **not executed**.
- New audit reports and service workbench previously passed 18 consecutive isolated UI checks; RU/EN audit passed all 24 defaults.

**D7 IS OPEN. Formal release acceptance remains 0/135; Stage2 NO-GO / Stage3 UNACCEPTED.** ~86% describes phase implementation (D1–D6 of D1–D7), **not** formally verified release readiness. Previous environment could not `git clone` (GitHub DNS blocked) or open local files / loopback in Chromium (`ERR_BLOCKED_BY_ADMINISTRATOR`). Do not misrepresent JavaScript-isolate results as real Chromium, human approval or PHP parity. Still missing checked-out Node suites, actual 54 PNG and 64 browser routes, 42 human composition and 54 screenshot reviews, six PHP probes and source-exact D7 ZIP with SHA256. See `handoffs/D7-EXECUTION-BLOCKER-2026-10-27.md`, `QUALITY-GATES.md`, `handoffs/NEXT-CHAT.md`.

## 4. Next developer's first large work round

**First: inspect current repo HEAD, the changed UI and the corrected `lib/bridge.cjs`.** If a real allowed Node checkout/Chromium environment is available, run the *existing* end-to-end smoke once and document genuine results. Do not spend another round building artificial D7 harnesses; do not edit CI workflows.

**In parallel / if runner remains unavailable:** develop **one large user-visible vertical** in Design Factory, not several tiny one-line changes. High-value next candidate: a safe per-page composition editor (all four pages, section insertion/reorder/removal through registered manifests, explicit versioned workspace state, Undo/Redo, D6/Studio parity, owner review safety). This needs a careful contract/migration design. Preserve stable section IDs and cross-page navigation; do not claim unsupported PHP layout parity. Another candidate is a strictly validated importer for the 18-file delivery package that opens `design/workspace.json` offline without executing any archive code. Pick a cohesive vertical after source review.

**Once genuinely executable D7 runner becomes available**, finish existing formal acceptance rather than extending test framework. Bring human design results and real PHP parity to the Lead, who alone accepts/integrates.

## 5. Workflow principles owner explicitly requested

The owner wants **large autonomous batches**: deliver substantive integrated functionality per turn, commit it, run only focused relevant checks, update docs at the end, give true SHA and a short summary. Do not loop over the same low-value microfixes or thousands of synthetic tests. Do not stop at the first small improvement. Avoid questions when repo and constraints already establish the work. No asynchronous promises and no false claims about physical Chromium or release acceptance.

Primary docs:
- `stage3/design-factory/MISSION.md` and `ROADMAP.md`
- `stage3/design-factory/PROGRESS.md`, `QUALITY-GATES.md`
- `stage3/design-factory/studio/README.md`
- `stage3/design-factory/handoffs/START-HERE-2026-10-27.md`
- **This file, `stage3/design-factory/handoffs/FINAL-TRANSFER-2026-10-27.md`.**

## 6. Deliverables and warnings for the Lead

This branch is **NOT MERGED**. The Studio exports supported-subset `manufact-ai-site-v1` and an integration_required design-spec; never claim that PHP renderer has accepted pixel parity, media rights or live forms. The owner handoff is not a signature, the ZIP CRC32 is not a security proof and client feedback is not human design acceptance. Direct import and publication must remain separate Lead-controlled actions.


## 27 October — follow-on implementation since this original FINAL-TRANSFER

The next independent developer completed the proposed large four-page section editor vertical. Current source now supports `manufact-design-factory-workspace-v1` version 2 with strict `manufact-design-factory-section-plan-v1`, preserving legacy v1 and CMS/D6 compilation parity. See the newest sections of `PROGRESS.md`, `studio/README.md` and `handoffs/NEXT-CHAT.md` for actual UI behavior and validation limits. All work remains in `feature/stage3-design-factory` under `stage3/design-factory/**`; this historic handoff's **D7 unaccepted / 0 of 135** status has not changed.

