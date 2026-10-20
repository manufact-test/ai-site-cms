# AI Site CMS — Security & Dependencies Research — NEXT CHAT

**Updated:** 21 October 2026. This is the **sole handoff for the independent Security & Dependencies research developer**, not the main CMS, editorial/design/component, Android/CELIKOM, deployment, product or legal roadmap.

## 1. Mandatory exact GitHub starting point

- Private repository: https://github.com/manufact-test/ai-site-cms — use the already-connected GitHub connector (tool APIs).
- Current **ONLY working branch**: `research/stage2-supply-chain-followup`.
- Current [PR #3](https://github.com/manufact-test/ai-site-cms/pull/3): **OPEN, DRAFT, targets `main`**; keep Draft, **DO NOT MERGE OR REBASE OR RETARGET** without integration-owner approval.
- Allowed writes **ONLY**: `research/parallel-security/`. PR #3 comments are permitted. Do not edit `main`, other branches, other research folders, `cms/`, dependency locks or manifests, `.github/workflows/`, root `docs/`, shared `NEXT-CHAT.md`, `PROJECT-STATUS.json`, Hostinger, deployments, MySQL, websites, or any secrets. The main integrator owns workflows and acceptance.
- **Checkpoint BEFORE this handoff-documentation pass:** Security candidate HEAD `635597bdbf474fc2b09cce37cd371b6667c7930a`. The documentation pass advanced the branch further. **You MUST fetch the actual current PR #3 `head_sha` before modifying anything and verify its own exact-head CI; never treat the above source checkpoint as the current ref.**
- Original predecessor research PR #1 (branch `research/stage2-supply-chain`) was merged as **READ-ONLY RESEARCH ONLY**. Do NOT resume development on the old branch.
- User explicitly prefers **large coherent batches** with autonomous GitHub commits and actual CI verification, no frequent micro-task pauses, no manual file moves. Update project-local handoff documents **only when user requests a chat transfer** (like the current handoff); otherwise keep implementing.

## 2. Confirmed exact-head evidence and limits

**Independently exercised source checkpoint:**
- GitHub Actions [run #39509439870](https://github.com/manufact-test/ai-site-cms/actions/runs/39509439870), Security job `118926532347`; **SUCCESS** on exact candidate commit `635597bdbf474fc2b09cce37cd371b6667c7930a`, node 22 / PHP 8.3, real original lockfiles and disposable current-main overlay. The integration owner corrected the former stale-hardcoded old-branch checkout in `.github/workflows/stage2-independent-research.yml`; current CI **does** check exact PR head and path scope.
- `INDEPENDENT_SECURITY_SUITE_COUNTS`: **46 PASS, 0 FAIL, 2 BLOCKED**; counts represent suite entries, **not** 46 individual assertions.
- Actual named completed positive/negative cases in CI:
  - native operator signed receipt chain: **36** assertions
  - native signed preactivation permit: **46**
  - native signed settlement chain: **38**
  - native trust epoch/rotation: **18**
  - OSV strict complete-response/transport/lock: **30** synthetic checks
  - OSV child-process CLI/lockfile swap-while-network: **23** synthetic checks
  - synthetic security-suite exit semantics: **12**
  - sodium_compat whole-tree and provenance attestation: **20** synthetic checks
  - saved/online OSV and registry evidence verification + advisory preservation: **54** synthetic checks
  - fake PHP binary / false-PASS Sodium-free proof gate: **15** synthetic checks
- All changed files in the PR are restricted to the allowed research folder; recheck final scope on each new head. No CMS code was edited by this researcher.
- **Never claim** full LIVE 43/43 OSV lookup, no-native PHP success, Hostinger acceptance, qualified legal/crypto signoff, Stage2 completion, production authorization, release approval, or Stage3 go-ahead. **The two explicitly blocked checks are `no-sodium:cryptography` and `compat:cryptography`.**

## 3. Current implementation — what works and what has NOT happened

### Exact-lock provenance and OSV auditing
- Actual source manifests: **14 Composer production + 29 npm pinned packages**, including 26 optional esbuild binaries. Existing `AUDIT.md`, `SOURCE-LICENSE-REVIEW.md`, `NPM-ARCHIVE-REVIEW.md` and research source/NOTICE gates contain historic license/provenance findings; not a formal clearance.
- `osv-strict-snapshot.mjs`: **explicit network opt-in** to `https://api.osv.dev/v1/querybatch`; 43 exact pins, 60s timeout, bounded 4MiB stream, strict UTF-8/JSON/result count/pagination/vulnerability IDs, zero cross-origin redirects. Reads original lockfile bytes once before query and re-checks byte SHA-256 **and inode/device** before reporting; exit **4** if full result has advisories with `--fail-on-advisory`; exit **1** for incomplete query. **Actual full live API has NOT been called in this research container.**
- `online-evidence-proof.mjs`: independently validates online subprocess JSON, all 43 exact package/version rows, both live original-lock SHA, checkedAt, advisory totals and registry-report upgrade flags. Exit code 0 alone cannot yield PASS. For explicitly archived evidence, supports historical timestamps and advisory-positive validation but never product approval.
- **Newest big block:** `osv-advisory-triage.mjs /absolute/saved-report.json [--historical]`: read-only, no network, verifies **complete raw report** against current same original locks, emits full advisory-bearing JSON review with original report SHA-256, exact package IDs and explicit no-approval flags. Exit **0** = complete saved database report with no advisories at its checkedAt; exit **4** = valid report with findings requiring manual triage; exit **3** = incomplete/damaged/mismatched/stale input, exit **2** = usage. `--historical` allows older timestamps, **never different lock versions or claims of current clearance**. Test and script are confined to this research folder. Recommended independently captured output is stored outside repository; **do not create evidence files until genuine trusted networked run exists**.
- `osv-strict-regression.mjs`, `osv-cli-regression.mjs`, `online-evidence-regression.mjs` are synthetic NO-HTTP tests. Newest checked **54** exact-report/triage cases, incl valid full advisory preservation, duplicate/malicious advisory IDs, historical marker, altered SHA, missing/bad JSON, wrong or stale timestamps.

### Genuine native-free Ed25519 and sodium_compat
- `sodium-compat-attest.mjs`: requires independent full-tree SHA-256 and isolated Composer lock binding actual upstream signed `paragonie/sodium_compat@v2.5.2` tag commit `3246b36803c177847e677862fedeb7f937869adb`; prohibits symlink/hardlink/unreviewed mutable trees. Only synthetic source substitution checks have been run so far.
- `runtime-sodium-proof.mjs`: **only** physical PHP 8.3/64-bit CLI process with `extension_loaded('sodium')===false` and no global verifier accepted. Requires actual completed proof stdout and JSON of each RFC/signature test; attests exact compat source **before AND after**. A fake PHP binary fixture exercises defensive policy, **not** genuine crypto. Local and typical GitHub CI PHP have Sodium compiled in even under `php -n`; no actual Sodium-free PHP 8.3 + independently sourced exact compat has been tested here.
- **Conditional source-level compatibility risk:** `cms/src/Release/LabSettledUpgradeGate.php` directly invokes `sodium_crypto_sign_verify_detached` rather than common `Ed25519Backend::verifyDetached` (permit and receipt pathways use abstraction). With class-only compat but absent global polyfill wrapper settlement may fail; proper upstream autoload might provide the global wrapper. **Do not state exploit or proven defect.** Ask integrator to review and exercise both scenarios. Researchers cannot modify this CMS file.
- Native PHP signed chain tests passed; they do not validate production MySQL transactions, Hostinger LiteSpeed, rollback or security approvals.

## 4. Immediate independent large-batch next tasks

1. Inspect current GitHub PR #3, HEAD, changed-file scope, comments, main's most recent changes and **exact HEAD** GitHub Actions run. Read `RUNBOOK.md`, `README.md`, `OSV-SNAPSHOT-REVIEW.md`, `SODIUM-ENVIRONMENT-EVIDENCE.md`, latest section of `EVIDENCE-2026-10-20.md`, and this file. Preserve all prior research and owner isolation.
2. Make one substantial **new** implementation batch in `research/parallel-security/` which improves actual test evidence. Good target: independent signed permit/receipt/settlement cross-backend test plan and safe native source-level negative regressions, or strengthen the online OSV archival/provenance evidence pipeline if an approved networked runner is provided. Do not repeatedly build synthetic PASS claims without new safety impact.
3. Highest-priority **external integration-owner blockers**: obtain a physically ext-sodium-free PHP 8.3 64-bit disposable runtime with vetted exact 2.5.2 archive, run `runtime-sodium-proof.mjs` with explicit independently reviewed source digest; on approved networked CI, run full 43-pin OSV HTTPS query, capture untruncated original JSON, then verify/triage using `osv-advisory-triage.mjs` and independent qualified review. Research role should **only coordinate through PR #3 comments**, not change CI workflow or production host.
4. After each substantial code batch, verify new exact GitHub Actions run and named proof counts, check every PR changed path is under our folder, document factual test execution and all remaining blockers in PR comment. Keep PR Draft; do not merge.
5. Update `research/parallel-security/NEXT-CHAT.md` and other **OWN** docs only when user explicitly asks to move chats. Provide copy-ready Russian starter text with current SHA, PR, CI and restrictions. Do not demand that user manually transfer files.

## 5. Commands and exit semantics

```sh
# From a COMPLETE read-only isolated checkout of current PR #3:
node research/parallel-security/run-security-suite.mjs
# Strict exit 3 while physical no-native crypto gates are blocked:
node research/parallel-security/run-security-suite.mjs --strict

# Authorized isolated INTERNET runner; capture complete stdout:
node research/parallel-security/osv-strict-snapshot.mjs > /safe/private/osv-exact-43.json
node research/parallel-security/osv-advisory-triage.mjs /safe/private/osv-exact-43.json \
  > /safe/private/osv-triage.json

# Genuine native-Sodium-free PHP8.3 + independently reviewed pinned v2.5.2 ONLY:
PHP_NO_SODIUM_BIN=/absolute/path/to/php8.3 \
SODIUM_COMPAT_AUTOLOAD=/absolute/vendor/paragonie/sodium_compat/autoload.php \
SODIUM_COMPAT_LOCK=/absolute/isolated/composer.lock \
SODIUM_COMPAT_TREE_SHA256=independently_reviewed_64_lowercase_hex \
node research/parallel-security/runtime-sodium-proof.mjs
```

Exit zero for a research command is **not** production or licensing approval. Source-evidence checks cannot establish actual live network provenance by themselves. Keep all raw evidence with original lock SHA, timestamp, CI SHA/job ID and actual exit status.

## 6. Historical research docs in allowed folder

- `README.md` — scope, branches, current evidence overview.
- `RUNBOOK.md` — exact commands and documented exit contracts.
- `OSV-SNAPSHOT-REVIEW.md` — OSV strict response, TOCTOU protection and archive triage limitations.
- `SODIUM-ENVIRONMENT-EVIDENCE.md`, `SODIUM-DECISION-REVIEW.md` — actual physical native-vs-compat distinctions, source risks.
- `EVIDENCE-2026-10-20.md`, `EXACT-BLOB-LAB-EVIDENCE-2026-10-20.md` — dated historical and subsequent exact-head test proof.
- `RECEIPT-CHAIN-REVIEW.md`, signed permit/receipt/settlement PHP fixture files — native adversarial crypto chain contracts.
- `AUDIT.md`, `ADVISORY-TRIAGE-2026-10-20.md`, `SOURCE-LICENSE-REVIEW.md`, `NPM-ARCHIVE-REVIEW.md` — historic provenance/license and partial advisory observations, **NOT** current full clearance.

**Remember:** main integrator, not this Security branch, owns release acceptance, global status, legal decision, workflow edits and merges. Continue with meaningful independent implementation and honest coverage attribution.
