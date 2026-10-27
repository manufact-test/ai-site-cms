> ⛔ **АКТУАЛЬНОЕ РЕШЕНИЕ ВЛАДЕЛЬЦА, 27.10.2026 — VISUAL NO-GO (2/10).** Дизайны Design Factory отклонены: однотипность, чрезмерная типографика, неправильные отступы. **Приоритет изменён: сначала изучить профессиональные источники и создать 3 разные качественные адаптивные сайты; только после явного визуального GO расширять каталог/интегрировать.** Обязательны [DESIGN-RESET-2026-10-27.md](../DESIGN-RESET-2026-10-27.md), [DESIGN-REFERENCE-PLAYBOOK.md](../DESIGN-REFERENCE-PLAYBOOK.md), [ЗАДАНИЕ ВТОРОМУ РАЗРАБОТЧИКУ](../handoffs/DESIGN-REBUILD-SECOND-DEVELOPER-2026-10-27.md). Старые фразы «12 профессиональных тем», «42 композиции», «86%», «следующее — закрыть D7» **НЕ ЯВЛЯЮТСЯ** актуальным дизайн-заданием или оценкой готовности; ниже сохранена история. Lead провёл машинную проверку D7 в отдельной ветке: [CI SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40567001862), но визуальная приёмка владельцем FAIL. Никакого merge/deploy.

# Design Factory — final factual D7 runner handoff to Lead
**Date:** 2026-10-27. **Repository:** `manufact-test/ai-site-cms`. **Branch:** `feature/stage3-design-factory`.

## What this handoff proves (and does not prove)

At the START of this pass, verified remote HEAD was `e1bff3113192dc102eeaa475d521f5e810e74a7c` (27 October 2026, GitHub branch API). A later documentation-only commit will change HEAD: ALWAYS read the live ref again. The GitHub recursive tree contained 93 Design Factory files. GitHub Actions runs filtered to this branch: **0**; commit check-runs: **0**. This is *absence of automatic external evidence*, not proof the implementation fails.

The working container had **Node 22.16.0**, `/usr/bin/chromium`, `php`, and `git`, but NO authorized local `ai-site-cms` checkout. One genuine `git ls-remote https://github.com/manufact-test/ai-site-cms.git refs/heads/feature/stage3-design-factory` failed: `Could not resolve host: github.com`. One direct `file://` Chromium `--headless --dump-dom` probe of a trivial locally created HTML document exceeded the **12-second** timeout (exit 124), with zero dumped bytes, so there was NO successful browser DOM navigation. This is an environment/runner failure only; it does not establish a Design Factory browser defect. A local Chromium binary is NOT equivalent to a working D7 Chromium runner.

This pass deliberately **did not** simulate source tests, manufacture screenshots, invent human review or patch unproven product defects. No checked-out Node suite, Studio Chromium E2E, 54 PNG captures, 64 route audit, 42 human composition judgments, 6 real PHP parity probes, or source-exact release ZIP/SHA256 ran here. **D7 OPEN; Stage2 NO-GO; Stage3 UNACCEPTED; 0/135 formally accepted.** Engineering D1–D6 exist; `6/7 ≈ 86%` is just the NUMBER of engineering chapters finished, not real CMS release readiness.

## Immutable scope and transfer

Lead should FETCH the existing branch from GitHub; no tarball reconstructed from a mocked environment is offered. Scope of this independent contributor: **only `stage3/design-factory/**`**. `main`, other branches, SDK, `stage3/server/`, component registry, GitHub CI, hosting, production and integration remain Lead-owned. No merge or publish has been requested or done. The D6 output is a supported-subset `manufact-ai-site-v1`; enhanced Design Factory CSS/compositions remain `integration_required` when PHP renderer does not implement them.

Do **not** expand Design Factory's catalog, editors, harnesses, synthetic matrices or reporting UI. Freeze feature scope. Apply a single cohesive correction batch only for bugs exposed by real checkout, browser, human or PHP evidence.

## Exact existing-command acceptance sequence for an authorized, working checkout

These commands are Linux examples, to be run **from repository root** with readable Lead SDK/PHP checkout and Chrome/Chromium able to navigate locally generated `file://` pages. Replace `/usr/bin/chromium` by the actual functioning executable; use FRESH paths outside repo on every run. The commands/CLI switches below were checked against the actual committed `bin/*.cjs` sources, not guessed.

```bash
git fetch origin feature/stage3-design-factory
git switch feature/stage3-design-factory
git pull --ff-only origin feature/stage3-design-factory
git status --porcelain
git rev-parse HEAD
node --version
php --version
command -v chromium

# 1. Existing bundle parity and full release audit with actual Chromium
node stage3/design-factory/bin/build-browser-bundle.cjs --check
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/release-audit.cjs \
  --out /tmp/df-d7-audit-lead-001.json --chromium

# 2. Formal screenshots, all offline routes and reproducible generated sources.
# Do not use --quick or --static-in-memory for acceptance.
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs \
  --out /tmp/df-d7-visual-lead-001 --chromium /usr/bin/chromium

# 3. HUMAN review: open /tmp/df-d7-visual-lead-001/visual-review.html
#    and inspect 54 images AND all 42 individually linked showcase compositions.
#    Export actual review v3 JSON; rejected/unfinished decisions remain blockers.
node stage3/design-factory/bin/verify-visual-review.cjs \
  /tmp/df-d7-visual-lead-001 /path/to/real-human-review-v3.json

# 4. FINAL candidate after genuine reviewer receipt and matching Lead checkout.
node stage3/design-factory/bin/release-candidate.cjs \
  --out /tmp/df-d7-candidate-lead-001 \
  --chromium /usr/bin/chromium \
  --lead-sdk /path/to/lead/stage3/sdk \
  --lead-php /path/to/lead/stage3/server/DesignGraph.php \
  --evidence /tmp/df-d7-visual-lead-001 \
  --review /path/to/real-human-review-v3.json
```

All `--out` destinations must NOT pre-exist; tests may reject an unclean checkout, modified source during execution or mismatched source manifest. If a command fails, preserve its exit code, original log and JSON manifest, fix the *actual* bug, then rerun the smallest affected real check followed by the final gate. DO NOT replace an actual `file://` capture with memory-static evidence or claim a green result from an in-memory V8 mock.

### Objective release gates and artifacts to hand to Lead

| Gate | Evidence that MUST actually be present | Status in this chat |
|---|---|---|
| Node + browser | Actual `release-audit.cjs` report, bundle parity, nine Node suites + browser pipe/Studio Chromium, `nodePassed=true`, `browserPassed=true` | NOT RUN |
| Visual screenshot matrix | **54** real PNGs at 1280, 768, 390 CSS px, complete `visual-evidence.json`; `captureTransport=file`, not diagnostic memory/quick | NOT RUN |
| Generated pages and routes | **164** compiler-reproducible source artifacts (**65 HTML, 17 CSS, 82 JSON**) and **64** actual Chromium `file://` navigations covering **16 × 4 pages** | NOT RUN |
| Human decision | v3 reviewer receipt for all **54 screenshot images** plus **42 separately linked D3 compositions**; independent verifier PASS, no rejected or missing item | NOT RUN |
| Lead integration | Real Lead SDK input and PHP `DesignGraph.php`, **6 typed markup parity probes**, preservation of `integration_required` limits | NOT RUN |
| Engineering release | `release-candidate.cjs` manifest including exact branch/head, clean/stable source and input snapshots, verified sorted ZIP32/CRC/exact bytes and real ZIP SHA256 | NOT RUN |
| Authority | Explicit Lead integrator approval; `productionReady` is deliberately false in candidate report even if `readyForLeadReview=true` | NOT GIVEN |

`release-audit.cjs` returns **0** only when requested automated checks (including browser) pass, **3** for Node-only pass without Chromium, and **2** for failed checks. `release-candidate.cjs` returns **0** only when `gate.readyForLeadReview=true`; a generated engineering ZIP or code `exit 3` is NOT approval. The candidate requires screenshot count 54, composition count 42, generated-source count 164, route count 64, stable Lead-input snapshot, 6 PHP probes and `git.ownerBranch=true`. `productionReady=false` remains intentional until the lead authorizes deployment.

## First user-visible viewing path, before debating further implementation

On an approved workstation, open `stage3/design-factory/studio/index.html` in a normal browser capable of using local assets. Load an existing 12-sector kit, inspect all four routes, change theme and selected D3 composition and use the existing **«Передать проект ZIP»** control. Extract its 18-file client+Lead bundle and locally open the `preview/` pages; check desktop/tablet/mobile, navigation, real CTA targets, content, contacts, SEO/noindex, images, form expectations and the owner's audit. This is a **customer demo preview**, NOT live CMS PHP parity and NOT permission to publish.

Reviewer may start from the 54-image `visual-review.html` plus 42 compositions, record specific failures with page/theme/viewport/expected/actual, and ask Design Factory developer to fix ONLY those proven problems. Do not ask owner to validate generic test count as a substitute for looking at a real site.

## Minimum Lead reply / transfer acceptance

Lead should report:
1. **Exact checkout SHA and Git branch**, `git status --porcelain` result, Node/Chromium/PHP versions;
2. Audit exit code, `nodePassed`, `browserPassed`, first real failing suite/trace if any;
3. Screenshot 54 / sources 164 / routes 64: real completed counts + capture transport, and link/path to files;
4. Human review 54 + 42: signed-off person's real verdict/receipt (no invented signoff);
5. Six PHP parity results and clear list of unsupported presentational properties;
6. Candidate zip SHA256, report `readyForLeadReview`, and **explicit release decision by Lead**.

If checkout/Chromium is still blocked, the action is to MOVE execution to a permitted machine, not to invent a new D7 engine. Handoff is a concrete blocker escalation, not completion of D7.
