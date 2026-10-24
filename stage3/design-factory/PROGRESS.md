# Design Factory — operational progress and D7 continuation

**Updated:** 24 October 2026  
**Branch:** `feature/stage3-design-factory`  
**Writable scope:** ONLY `stage3/design-factory/`. No main/lead edits, hosting, production, workflows, SDK, PHP or Studio-main changes.

## Product-level state (honest)

| Result | Engineering implementation | Still outstanding for full acceptance |
|---|---|---|
| **D1** — Compiler and CMS contract | Implemented; real SDK/manifests in read-only mode | Full Node checkout smoke/owner review |
| **D2** — 12 visual languages | Implemented, 12 responsive token systems | Chrome 1280/768/390 visual QA |
| **D3** — 42 section compositions | Implemented, 14 categories, real HTML/CSS showroom, actual SDK fallback | Chromium/keyboard/motion visual QA |
| **D4** — 12 four-page sector kits | Implemented, 12 RU + 4 EN demos, 64 pages, SHA256 catalog | Real filesystem smoke + portfolio review |
| **D5** — Browser Design Factory Studio | Implemented offline with edit/theme/navigation/import/export/undo/redo | Real interactive Chromium E2E and fixes |
| **D6** — Integration bridge | Implemented, deterministic versioned export/import with exact SDK | Real checked-out Node tests, lead PHP parity/import review |
| **D7** — Final verification and packaging | **Release tooling, ZIP builder, quality checklist and next-chat handoff implemented** | Execute full Node/Chromium checks, inspect screenshots, fix defects, approve package, final integrator handoff |

**Interpretation:** 6 out of 7 functional areas were already implemented before this pass. D7's operational tools are now built, but D7 is NOT accepted/completed. Do not convert a code coverage ratio into a misleading percentage of CMS acceptance. The platform remains **Stage2 NO-GO; Stage3+ unaccepted; 0/135 mandatory criteria**.

## Major D7 additions and concrete bug fixes in this pass

1. **D1 safety regression repaired.** With only one actual service, the CMS's second required repeater card is explicitly labeled as an unverified editorial example, and `checklist.readyForPublish` remains false. The old brittle D1 test now checks the meaningful two-card/owner-verification requirement, not a literal industry placeholder string.
2. `studio/runtime.generated.js` regenerated from current actual SDK/manifests and updated compiler. The same safety rule applies inside browser Studio.
3. `bin/release-audit.cjs` runs **six** real Node suites, hashes the complete Design Factory subtree and emits `manufact-design-factory-release-check-v1` (source file hashes, PASS/FAIL, explicit browser state). It keeps the gate open when Chromium is not run.
4. `bin/package-release.cjs` creates a deterministic offline **ZIP** with only Design Factory assets/source/docs, normalized paths, no symlinks, CRC32 and SHA256, no overwrite. `tests/package-smoke.cjs` checks reproducibility and archive integrity. The ZIP contains an offline Studio viewer; CLI execution requires the root CMS repo SDK/manifests.
5. `bin/visual-qa.cjs` generates screenshot evidence using local Chromium for 12 themes across three widths, D3 showroom and selected D4 kits. Output `visual-evidence.json` is NOT human visual approval.
6. `QUALITY-GATES.md` documents exact expected commands, three-width review, screenshots, quality issues and acceptance boundary.
7. `handoffs/NEXT-CHAT.md` is the authoritative first-file transfer for the **next independent developer chat**. The new chat continues D7 automatically on user instruction; does not become lead integrator and never merges itself.

## Verified and unverified — important distinction

**Observed in isolated JavaScript runtime in previous pass:** 288/288 kit × theme × language compiled and validated through the actual read-only Stage3 SDK, and 288/288 D6 deterministic integration bundle round trips; all 42 D3 registered fallback mappings were validated and malicious changed-package data was rejected. In this pass the single-service publish gate was evaluated using the regenerated browser bundle and returned `readyForPublish=false`, `missing=['facts.services']`, with the second card clearly marked as a placeholder.

**Not yet claimed:** Node filesystem/CLI test suite run on actual checkout; real Chromium UI E2E; visual review at 1280/768/390; GitHub Actions status for this branch; final packaging ZIP created and published to user; PHP renderer visual pixel parity; owner acceptance. The Chromium process did not complete even a minimal prior local attempt, so this is a genuine environment limitation until proven otherwise.

## Six essential commands (on a checkout, with Node >= 20)

```bash
node stage3/design-factory/bin/build-browser-bundle.cjs --check
node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-release-new.json
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/tests/studio-smoke.cjs
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-visual-new
node stage3/design-factory/bin/package-release.cjs /tmp/ai-site-cms-design-factory-new.zip
node stage3/design-factory/tests/package-smoke.cjs
```

See `QUALITY-GATES.md` for detailed expectations. All output paths must be NEW (never overwrite). No deployment is involved.

## Next chat — highest-priority D7 closure

1. Read `MISSION.md`, `ROADMAP.md`, this `PROGRESS.md`, `QUALITY-GATES.md` and `handoffs/NEXT-CHAT.md`; verify the LATEST branch SHA.
2. Run the actual Node tests and fix **real** failures. Do not iterate endlessly on cosmetics or rerun dozens of redundant suites.
3. Run real Chromium Studio E2E and the 3-width visual sweep. Visually inspect meaningful samples for overflow, navigation, keyboard focus, mobile, locale and unsupported CSS vs CMS output.
4. Produce the deterministic ZIP; record its actual SHA256 and Git SHA. Do **not** fabricate an upload/download link before the ZIP exists in the relevant environment.
5. When D1–D7 acceptance evidence actually passes, prepare the FINAL message to the lead chat. Until then, remain in the independent branch and never merge.

**Work cadence:** large useful blocks, precise factual reporting, no unnecessary laboratory loops, no new code outside `stage3/design-factory/`.
