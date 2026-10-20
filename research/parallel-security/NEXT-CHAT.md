# AI Site CMS — Security & Dependencies — NEXT CHAT (research only)

**Date:** 20 October 2026. This file documents **only this independent Security & Dependencies developer conversation**, NOT the global AI Site CMS roadmap, project master spec, release plan, Android/CELIKOM, Hostinger operations, or other parallel developers.

## 1. GitHub and precise continuation
- Repo: https://github.com/manufact-test/ai-site-cms (private, connected via GitHub plugin).
- Original security branch `research/stage2-supply-chain`, PR **#1**, **MERGED into main** 2026-10-20 at merge commit `9f3dcad2c8304f5e272d781f923b009a6e26c1e6` as **READ-ONLY RESEARCH**, not production authorization. Do **not** push new research to the old merged branch.
- **CURRENT** independent working branch: `research/stage2-supply-chain-followup`.
- **CURRENT** [PR #3](https://github.com/manufact-test/ai-site-cms/pull/3): **OPEN DRAFT**, target `main`, **DO NOT MERGE** autonomously. Fetch current branch HEAD at the start of the next chat, because main and both branch histories can move.
- **ALLOWED WRITES ONLY:** `research/parallel-security/`. Never change `main`, `cms/`, any `composer.lock`/`package-lock.json`, workflows, `docs/`, `PROJECT-STATUS.json`, central `NEXT-CHAT.md`, website/Hostinger, databases, secrets, other research folders, or another developer's branch. No production deployment, no license approval, no Stage3 trigger. If integration CI workflow requires a change, **comment to main integrator**, who owns it.
- Continue substantial independent batches, verify results, commit only our folder. Update only our own handoff files when user explicitly asks to transfer to another chat.

## 2. Verified baseline from merged PR #1
- 14 locked Composer PHP production packages + 29 locked npm entries, of which 26 optional esbuild platform binaries.
- All 14 pinned Composer exact-source LICENSE families corroborated; upstream Opis root NOTICE discrepancy found by this developer and then **fixed in main by integrator**. Human qualified legal approval still open.
- 20-case original PHP Ed25519 native envelope adversarial tests, synthetic 12+10+5 policy/provenance/NOTICE checks.
- Original GitHub Actions [39486220889](https://github.com/manufact-test/ai-site-cms/actions/runs/39486220889): independent Security job **22 PASS, 0 FAIL, 2 BLOCKED** on original merged PR HEAD `01311e4c30499ecc7caa44c4ace7e2de354f5a69`. Blockers = real PHP with Sodium extension physically absent and exact sodium_compat in such environment. This is historical baseline, **not** proof of future PR HEAD.
- Base artifacts: `AUDIT.md`, `RUNBOOK.md`, `SOURCE-LICENSE-REVIEW.md`, `EVIDENCE-2026-10-20.md`, `ADVISORY-TRIAGE-2026-10-20.md`, `SODIUM-ENVIRONMENT-EVIDENCE.md`, and accompanying standalone tests.

## 3. New work in follow-up PR #3 (CURRENT chat)
**Added / updated strictly inside this folder:**
- `receipt-chain-regression.php`: **36 scripted native-PHP assertions** against the real `cms/src/Release/LabAttestedActivationGate.php::verifyChain` for 2 correctly signed operator receipts and adversarial signature, pin, cross-site replay, wrong external head, signed-but-semantically-invalid payload, symlink/hardlink and noncanonical JSON. Re-pins freshly signed hostile heads so negative tests cannot pass only because original expected head was wrong. Requires disposable CI flags. Does not touch DB/installer.
- `run-security-suite.mjs`: wires `native:operator-receipt-chain`, `native:trust-root-rotation` (the original `cms/tests/trust-chain.php`), plus `mutation:osv-strict-regression.mjs` into default offline/native run.
- `osv-strict-snapshot.mjs`: new **OPT-IN** real HTTPS OSV querybatch for all **43 exact pinned versions**, strict complete-response schema/count/pagination checks, bounded 4 MiB streamed response, lockfile SHA256 and full advisory IDs. `--fail-on-advisory` exits 4 when at least one advisory affects an exact pin.
- `osv-strict-regression.mjs`: **10 scripted synthetic** query response acceptance/rejection tests with NO network.
- `RECEIPT-CHAIN-REVIEW.md` and `OSV-SNAPSHOT-REVIEW.md`: design, literal commands and evidence limits. Read these before changing tests.
- Own README/RUNBOOK and historical EVIDENCE appendices updated only to describe research.

### Critical proof limitation — do not invent PASS
At last check, the main workflow `.github/workflows/stage2-independent-research.yml` still hardcodes checkout of `research/stage2-supply-chain` (OLD MERGED branch) and accepts the already-present main research folder, **not current PR #3**. As a result, a green generic PR Actions badge **DOES NOT PROVE** the new receipt fixture or strict OSV regression passed. The new follow-up code was authored but has **not yet been successfully tested on exact PR #3 HEAD** in a properly routed environment. Do not claim `36/36`, `10/10`, or `43/43 live` until actual execution logs show that. Main integrator must opt to route CI to PR #3 HEAD or execute exact commands in independent trusted sandbox, without production writes.

## 4. First tasks for the next Security researcher
1. Connect GitHub, inspect new PR #3, its comments and current `main`, read THIS file plus `RECEIPT-CHAIN-REVIEW.md` and `OSV-SNAPSHOT-REVIEW.md`. Verify only folder-scoped changes remain.
2. Obtain exact-head tests in an isolated disposable checkout: `php -l research/parallel-security/receipt-chain-regression.php`, then `CI=true CMS_ALLOW_PHP_INSTALL_LAB=1 php research/parallel-security/receipt-chain-regression.php`, `php cms/tests/trust-chain.php`, `node --check research/parallel-security/osv-strict-snapshot.mjs`, `node research/parallel-security/osv-strict-regression.mjs`, `node research/parallel-security/run-security-suite.mjs`. Fix any actual defects solely in our folder; main workflows owned by integrator.
3. On trusted networked CI, execute `node research/parallel-security/osv-strict-snapshot.mjs` and `--fail-on-advisory`, save entire JSON with checkedAt and lock SHA256, triage exact advisories. **Do NOT** treat a partial or failed OSV response as clean, nor auto-upgrade production packages.
4. If possible arrange independently pinned native Sodium-free PHP 8.3 64-bit to execute `runtime-sodium-proof.mjs` and exact `paragonie/sodium_compat@2.5.2`. Existing `php -n -d disable_functions` only forces PHP code path, NOT physical extension absence.
5. Extend native trust/receipt tests to signed settlement/permit and release->DB CAS fencing if isolated without production touching. Confirm CI security proof and hand off concrete evidence to integrator. Do not merge own PR.

## 5. Notes on reports
- `OSV-SNAPSHOT-REVIEW.md` = automated lookup contract, **not completed live scan**.
- `RECEIPT-CHAIN-REVIEW.md` = test specification and source, **not yet accepted execution**.
- Product Stage2 and commercial releases remain NOT ACCEPTED by research; Stage3 is NOT authorized.
- No user participation or credentials are needed from product owner for this research direction, except if main integrator explicitly authorizes a separate host test.
- Do not rewrite global or shared AI Site CMS documents. **This is the only NEXT-CHAT.md this developer may maintain:** `research/parallel-security/NEXT-CHAT.md`.

## 6. Working conventions
Work independently in substantial, testable batches. Avoid one-trivial-task handbacks. Keep technical findings honest, distinguish *authored* from *actually executed and passed*. Preserve upstream source/license evidence. Leave PR draft/open until integrator's independent tests confirm correctness and provide no production claim. At end of a conversation, only update documents in `research/parallel-security/` and prepare a Russian opening text for the next same-role developer.
