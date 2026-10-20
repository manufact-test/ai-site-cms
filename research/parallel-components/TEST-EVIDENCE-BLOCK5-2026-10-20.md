# Block 5 — research-only verification (20.10.2026)

**Scope:** `research/parallel-components/` only. PR #2 for blocks 1–4 was independently **merged by main integrator** before this block. Further changes require a **new PR**; researcher does not merge. Canonical docs, ADR, active CMS, lockfiles, workflows, Hostinger, external services and main branch are off limits. **Stage2 NOT ACCEPTED / Stage3 NOT STARTED / 0 of 135 mandatory product requirements accepted** (observed from main `PROJECT-STATUS.json`).

## Changes

1. Fix `RevisionGate::plan` early `UNCHANGED` bug in multi-property patch; reject revision overflow. Add mixed-changed/unchanged, all-unchanged and multi-value tests.
2. Introduce optional two-step contact wizard UI (name/email → phone/message) with next/back, mobile/reduced-motion checks, focus management and server-error step rewind. No JS => native fields remain usable and final POST reaches the same PHP validation, though no HTML confirmation exists in the no-JS case. Tested only as an **independent lab**, not CMS integration.
3. Add closed `SubmissionBoundary` decoder for form-urlencoded bodies: rejects repeated/unknown/encoded/bracketed field keys, bad percent encoding, NUL, invalid UTF-8 and oversized/truncated input. Backend still performs final validation on all fields and existing Origin/CSRF/anti-abuse/delivery checks. `phone_region` optional for backward compatibility, default `ZZ`. Test real localhost HTTP malformed input, forged wizard flag and direct server-side invalid message bypass.

## Independent developer runner

- Debian 13 local sandbox; PHP **8.4.24** CLI; Python **3.13.5**; Node **22.16.0** dev-only for `--check`; Chromium **144.0.7559.96**; Playwright **1.57.0**, Pillow **12.3.0**, jsonschema **4.26.0**.
- `for f in lab/src/*.php lab/public/*.php lab/tests/*.php; do php -l "$f" || exit 1; done` — **22/22 PHP files, exit 0**.
- `for f in lab/tests/*-tests.php; do php "$f" || exit 1; done` — **263/263 explicit assertions across 10 scripts, exit 0**. Includes 12-worker `ReceiptLedger` and 12-worker `SharedThrottle` concurrency tests. `SubmissionBoundary`: 22 assertions; `RevisionGate`: 39.
- `node --check lab/public/assets/ui.js` — **exit 0**.
- Isolated Python `python -m unittest discover -s lab/tests -p <filename> -q` (each separate process) — **29/29 tests, exit 0**: 12 actual Chromium DOM/keyboard/mobile/focus tests, 3 standalone real HTTP boundary tests, 2 configured HTTP tests, 1 real HTTP receipt test, 11 fixtures/schema tests (3 adapter, 2 capability, 1 media asset, 5 schema). Browser DOM uses locally injected HTML/CSS/JS because Chromium loopback networking is blocked in this sandbox; browser fetch submissions are stubbed and NOT browser→PHP E2E. HTTP tests separately exercise actual PHP endpoint with fresh localhost sessions and origin headers.
- Old all-suite single-process Python discovery in this sandbox intermittently hangs; **no claim of monolithic suite PASS**. GitHub CI result for THIS block must be inspected at its final HEAD separately. Prior [run 39484784518](https://github.com/manufact-test/ai-site-cms/actions/runs/39484784518) was **FAIL**: all research PHP assertions passed, but Chromium bootstrap hit an existing `/usr/bin/chromium` symlink. Only the integrator may modify `.github/workflows`; Security job also failed independently.

## Production exclusion / open tests

No actual email delivery confirmation, no real phone numbering metadata installed, no HMAC ledger clustered outbox/guaranteed exactly-once, no durable database compare-and-swap, no production authenticated editor, no real React/Next SSR hydration, no VoiceOver/TalkBack/Safari automated audits, no WCAG certification and no web-host deployment. The strict decoder/CSRF/Origin policy must be re-evaluated with real request proxies/framework before any adoption. This output makes **zero** claims toward the 135 accepted requirements.

## Important: green workflow tested old main snapshot, NOT this new PR

The pull-request-triggered [research workflow run 39489484536](https://github.com/manufact-test/ai-site-cms/actions/runs/39489484536) completed `SUCCESS` (Components and Security jobs). **Do not attribute that success to the new Block 5 code.** The Components job log explicitly states: `Already integrated research subtree found in current main; test that accepted snapshot, not a pending PR version.` It checked out branch HEAD `df69ab7056a0d610e2078558c8b38d0dcac54ae2` for scope, then tested the previously merged base tree: its PHP log says `RevisionGate PASS: 33` (our new version **39**), and it checks **20 PHP files** (our new suite **22**); browser suite ran **10 tests** (our new version **12**). Thus CI is **green for earlier accepted research**, but **new changes are NOT independently CI-tested**. Only the main integrator may adjust `.github/workflows` to test the actual PR research subtree. 

For a single command that **does** run the current checkout's full research suite in an environment with installed PHP, Python deps, Chromium and Node syntax-check tooling, execute from the folder `research/parallel-components`: `bash lab/tests/run-block5.sh`. This command installs nothing and makes no changes outside the lab. The local per-suite results for the new files are stated above. Do not announce a green Block 5 GitHub CI until its actual head/source appears in logs.

## One-command runner confirmation

After moving the true Chromium suite to **last** (to avoid contaminating later ephemeral PHP subprocess tests), `timeout 120s bash lab/tests/run-block5.sh` also completed with **exit 0** on this Debian developer sandbox and printed `RESEARCH_LAB_TESTS_PASSED` after all 263 PHP assertions, 29 Python tests, PHP/JS syntax checks. It installs nothing and is for a developer with dependencies already present. This does NOT supersede the branch selection flaw in GitHub's existing workflow.
