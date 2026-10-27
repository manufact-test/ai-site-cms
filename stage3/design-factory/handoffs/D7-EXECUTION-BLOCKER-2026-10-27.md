# D7 execution blocker and cross-branch compatibility check — 2026-10-27

**Scope:** `feature/stage3-design-factory`, own files only. This is a factual execution record, **not an acceptance receipt**. Source HEAD at the start of inspection: `f9163b6d177e395b833dcf83aff257c20ee33af5`.

## Real runner probe (2026-10-27)

- Local tools exist: **Node v22.16.0**, **PHP CLI v8.4.24**, **Chromium v144.0.7559.96**, and Git v2.47.3.
- `git ls-remote https://github.com/manufact-test/ai-site-cms.git refs/heads/feature/stage3-design-factory`: **failed** — `Could not resolve host: github.com`. No local checkout of the repository was available. Connector-based source reads are **not** a checkout and cannot substitute for the Node suite.
- A genuine Playwright-launched Chromium process failed on `file:///tmp/.../index.html` with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. A separately served `http://127.0.0.1:<ephemeral>/index.html` also failed with that exact browser error. Chromium process/CDP availability is **not** proof of navigability.
- GitHub Actions query for the Design Factory feature branch found **zero runs**. No Actions workflows were changed or triggered.
- Therefore **not run**: full nine-suite Node checkout audit, Studio file:// E2E, 54 first-party screenshots, 64 Chromium routes, 164 source regeneration proofs, independent 42-composition / 54-screenshot human review, six real PHP parity probes, source-exact ZIP CRC/SHA-256 and release-candidate report. No synthetic substitutes were accepted.

## Read-only Lead integration drift check

- Other developer's live head when inspected: `feature/stage3-ai-site-contract` at `2333d77762375e20326870a115ddd1b47f90145e`. Recheck its head on the eventual run; this is a moving branch.
- The eight shared CMS component manifest Git blob SHAs match **exactly** between the Design Factory and Lead branches: `company-hero`, `contact-panel`, `cta-banner`, `faq-accordion`, `feature-highlights`, `service-grid`, `media-story`, `photo-gallery`.
- `stage3/sdk/contract.cjs` and `stage3/schemas/site-v1.schema.json` **differ**. Schema comparison of previously present object paths found no removed shared property, newly mandatory field on those shared paths, tightened common numeric/length limit, or removed enum value. Lead adds `language`, `menu`, and `designTokens` at root and Design Graph definitions. This is **static evidence only**, not a Node SDK / PHP runtime parity PASS.
- The Lead branch contains the actual `stage3/sdk/design-graph.cjs`, `stage3/sdk/contract.cjs` and `stage3/server/DesignGraph.php`; obtain exact, read-only matching files in the authorized runner.

## Unblocked execution — existing commands only

Use a trustworthy environment with a **real writable Git checkout**, Node, PHP and Chromium permitting `file://` navigation. No edits to CI, `main`, Lead files, production or other contributor branches. Do not weaken D7 gates to make blocked navigation appear successful.

```bash
git switch feature/stage3-design-factory
git rev-parse HEAD && git status --short
DF_CHROMIUM_BIN=/path/to/chromium node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-d7-audit-FRESH.json --chromium
DF_CHROMIUM_BIN=/path/to/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-d7-visual-FRESH
# Human inspect 54 real PNGs + 42 independently linked compositions; save real v3 review receipt.
node stage3/design-factory/bin/verify-visual-review.cjs /tmp/df-d7-visual-FRESH /path/to/visual-review-decision.json
node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-d7-release-FRESH --chromium /path/to/chromium --lead-sdk /path/to/current/lead/stage3/sdk --lead-php /path/to/current/lead/stage3/server/DesignGraph.php --evidence /tmp/df-d7-visual-FRESH --review /path/to/visual-review-decision.json
```

**Formal release status:** D1–D6 engineering implemented; D7 **OPEN**. Engineering phase estimate 6/7 (~86%) remains unchanged, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135 formally accepted. This report does not approve merge or deployment. Do not add more D7 test layers in response to an environment/network policy failure.
