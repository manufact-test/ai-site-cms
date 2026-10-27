# AI Site CMS — Design Factory | START HERE (next developer chat)

**Date:** 2026-10-27. **Repo:** https://github.com/manufact-test/ai-site-cms  
**Independent branch:** `feature/stage3-design-factory`  
**Latest verified functional commit:** `0c8c0247fe0233f0ae7832cb3b64aa804d1fc658` (services workflow + browser smoke; documentation commit follows).  
**Scope:** only `stage3/design-factory/**` (do not modify main, lead SDK/PHP/server, CI workflows, hosting, production or other contributors' branches). Do not merge or publish. Check actual remote HEAD first; documentation-only handoff commits follow the functional SHA.


> **Runner update, 2026-10-27:** The new chat independently confirmed that this container cannot resolve GitHub for `git clone` and Chromium blocks **both** `file://` and loopback `http://127.0.0.1` with `ERR_BLOCKED_BY_ADMINISTRATOR`. Real D7 remains NOT RUN. Eight common Lead component manifests are byte-identical; the Lead contract/schema have evolved. See [D7-EXECUTION-BLOCKER-2026-10-27.md](D7-EXECUTION-BLOCKER-2026-10-27.md). Do not run another synthetic D7 acceptance or claim 86% changed. Real runner + genuine human signoff are required.

> **Product correction update, 2026-10-27:** Three committed D7-facing fixes: verified contact facts now reach the HTML contact panel without a self-link; rejected screenshot/composition verdicts cannot yield a ready human-approval receipt; all 12 themes use their CMS font stack in HTML previews. See `PROGRESS.md` for the three exact SHAs. Generated Studio runtime was source-parity checked using current GitHub source, but **no real Node checkout audit, Chromium full E2E, human signoff, PHP probes or release ZIP was executed**. D7 OPEN, Stage3 UNACCEPTED, 0/135.

> **Client review update, 2026-10-27:** RU/EN `review.html` generated per Studio project locale; notes can be edited (page/type/content), reopened on change, and exported only after saving or cancelling active edits. Real first-party compiler + 8-file ZIP CRC32 worked for RU and EN in isolated JS, as did a mocked-DOM feedback edit/download. Actual Chromium/Node/PHP/D7 release evidence **NOT RUN**. See `studio/README.md` and `PROGRESS.md`.

> **Service editor update, 2026-10-27:** `31dc193` adds service reorder, draft duplication and paste-many with owner gate and Undo/Redo; `0c8c024` extends the existing browser scenario and removes an obsolete CSS assertion. 15 isolated real-source Studio/export checks PASS. **Actual Node/Chromium D7 not run**. Details: `PROGRESS.md`, `studio/README.md`.

## First rule for this chat

**Stop expanding D7 infrastructure without a demonstrated blocker. Get a real checked-out execution environment and run end-to-end release acceptance.** Previous developers built more increasingly strict evidence logic because this agent runtime had no cloneable Git checkout (GitHub DNS blocked) and managed Chromium refused direct `file://` navigation. Mock-CDP, source-only V8 and synthetic PNG tests never satisfy release gates. Never claim that code-only tests prove browser functionality.

## Finished architecture / actual status

D1-D6 **engineering implemented**: compiler + first-party design systems, 12 themes, 42 original compositions, industry kits and four-page CMS-native sites, D6 bridge and browser-based Design Studio, candidate/archive pipeline, Lead Design Graph adapter and safe owner revision workflow. The main CMS/Lead developer is **someone else**, responsible for integration.

D7 code now supports nine-suite Node audit + exact browser bundle; Chromium Studio E2E; 54 screenshots at 1280/768/390 (12 themes, 42-composition showcase, RU/EN sector sites), 42 separate human composition verdicts, 64 actual offline Chromium route checks, 164 **fully reproducible** source artifacts (65 HTML / 17 CSS / 82 JSON) with hashes, negative/tamper protection, six actual PHP Lead Graph markup parity probes, and source-exact release ZIP with CRC+SHA256. Separate documentation intentionally distinguishes *implemented gates* from *executed evidence*.

**New work this last session:** `c7876c03d1e154f8a5c989e513d381f4b396322a` and `f08426ed48ac23264e51433c3d641243ecd31b49`. `lib/generated-source-manifest.cjs` regenerates all 164 files *from current first-party compiler, project defaults, HTML/CSS renderer and composition showroom* and compares bytes to the generated artifact tree. Previous source manifest checked hashes and syntax without proving real compiler reproducibility. `tests/visual-review-smoke.cjs` now generates real 16 four-page previews and the real showroom, rather than fake markup, and checks modified unphotographed pages. This is a stronger genuine integration fixture.

**Executed here:** JavaScript V8 parse of changed files and 3 source-module behavioral cases in isolated V8 with mock compiler, filesystem and hash. **Not executed here:** complete Node suite on checkout, real Chromium Studio and 54 PNG / 64 route screenshots/nav captures, independent human 42+54 review, six real PHP probes, ZIP build/real release SHA256 and integration review. Do not represent fixture/isolated checks as those missing results.

**Honest status:** engineering estimate **6/7 phases = ~86%**, **D7 OPEN**, Stage2 NO-GO, Stage3 UNACCEPTED, **0/135 formal gates accepted**. The figure has remained unchanged because the *entire seventh phase is defined as end-to-end proof*, not additional implementation. More D7 helper code does not close that phase. It is not a scientific measure of remaining work/time; once executed, fix demonstrated failures and re-run the smallest necessary checks.

## Concrete next steps — in order (no needless test expansion)

1. Fetch branch and inspect HEAD, node version, PHP, Chromium. Use a **real writable checkout** to run tools; release artifacts go outside the repo. If the current environment cannot clone or Chromium cannot open local file URLs, use a suitable authorized runner/Work environment. Do not bypass formal D7 with `--static-in-memory` diagnostics, declare PASSED or change workflow outside owner scope.
2. Run full existing audit once:
   `DF_CHROMIUM_BIN=/path/to/chromium node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-audit-unique.json --chromium`.
   The nine-suite audit includes Studio Chromium E2E and binary/bundle parity. On a failure fix **only the real failing implementation**, then rerun.
3. Create a fresh **real** visual bundle (if not already created by candidate):
   `DF_CHROMIUM_BIN=/path/to/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-visual-unique`.
   Check `visual-evidence.json`: 54 real PNG images; 64 route audit entries; 164 exact regenerated files; successful capture transport `file` and zero errors. These numbers in self-declared JSON are not, by themselves, authentic browser evidence.
4. Have a **genuine human reviewer** inspect 54 screenshots and all 42 independently linked compositions via `/tmp/df-visual-unique/visual-review.html`; save the v3 reviewer receipt and independently validate:
   `node stage3/design-factory/bin/verify-visual-review.cjs /tmp/df-visual-unique /path/to/visual-review-decision.json`.
   No fabricated human signoff.
5. Get the main developer's matching, read-only Lead SDK + PHP source (actual local file paths) and run the existing *release-candidate* tool **after** evidence and review, with a new output directory:
   `node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-release-unique --chromium /path/to/chromium --lead-sdk /path/to/lead/stage3/sdk --lead-php /path/to/lead/stage3/server/DesignGraph.php --evidence /tmp/df-visual-unique --review /path/to/visual-review-decision.json`.
   Record actual six PHP parity cases, Node/Studio results, git branch/clean check and real ZIP CRC/SHA256; inspect the final JSON.
6. If all gates truly pass, deliver the **GitHub SHA + review artifacts and explicit handoff message** to the lead integrator. Do not merge or publish on your own.

## Repository documentation / ownership

- `stage3/design-factory/MISSION.md` — strict allowed scope and prohibited mutations.
- `stage3/design-factory/ROADMAP.md` — D1–D7 definitions.
- `stage3/design-factory/QUALITY-GATES.md` — exact release gate, commands and proof.
- `stage3/design-factory/PROGRESS.md` — chronological implementation ledger.
- `stage3/design-factory/handoffs/NEXT-CHAT.md` — full historical handoff; prefer THIS brief first, because the legacy log is lengthy.
- `stage3/design-factory/handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md` — guarded owner edit/rebuild contract.

**Speed contract:** User expects two genuinely substantial implementation/acceptance tasks in each approach, very few meaningful checks, autonomous safe commits to the feature branch only. Never claim partial work is formal D7 completion or continually request tasks when the roadmap already defines them. If the external runtime limitation cannot be resolved, state it plainly, make the best legitimate progress and hand off the exact remaining gate rather than increasing 86% by assertion.
