# AI Site CMS — Security & Dependencies independent research

**Current research branch:** `research/stage2-supply-chain-followup` — [OPEN DRAFT PR #3](https://github.com/manufact-test/ai-site-cms/pull/3), **never merge autonomously**. Historical predecessor `research/stage2-supply-chain` was merged as read-only research.
**Allowed writes only:** `research/parallel-security/`.
**Checkpoint 2026-10-21:** Stage2 not accepted; this research does not authorize Stage3 or production.

Deliverables:
- [AUDIT.md](AUDIT.md) — 43-line exact lock inventory (14 Composer runtime and 29 npm), SPDX metadata, NOTICE/commercial-license restrictions, evidence-limited advisory triage, P0/P1/P2 remediation.
- [RUNBOOK.md](RUNBOOK.md) — reproducible read-only testing and explicit security/legal gates.
- [inventory-audit.mjs](inventory-audit.mjs) — lock count, pin/integrity/SPDX checks and optional OSV.dev 43-version batch.
- [version-check.mjs](version-check.mjs) — optional live version freshness checks for exact locked names via npm/Packagist registries; never auto-upgrades.
- [ed25519-lab.php](ed25519-lab.php) — RFC 8032 known-answer, malformed and forged signatures, native vs genuinely absent vs genuinely pure-PHP compat, isolated benchmark.
- [release-fixture.mjs](release-fixture.mjs), [release-verify-runner.php](release-verify-runner.php) — Node ephemeral real Ed25519 signatures checked by project's original OfflineReleaseVerifier in PHP; bad pin, rollback floor, altered signed metadata and corrupted package hash rejected.

**Do not claim:** all source LICENSE/NOTICE independently reviewed, 43/43 current clean vulnerability scan, Hostinger sodium_compat performance verified, full rollback/receipt chain approved, or production readiness. This branch installs no PHP dependency and modifies no application code or CI workflows. Main integrator owns decision and merge.

Quick start from repo root:

```sh
node research/parallel-security/inventory-audit.mjs --csv
node research/parallel-security/inventory-audit.mjs --online
node research/parallel-security/version-check.mjs
php research/parallel-security/ed25519-lab.php native
node research/parallel-security/release-fixture.mjs native
```

Pure PHP mode requires an independently verified local sodium_compat 2.5.2 autoloader **and a PHP binary that truly lacks native Sodium**. See RUNBOOK. Passing local native tests is not evidence of pure-PHP compatibility or real Hostinger operation. A clean run does not itself authorize customer redistribution or signed production upgrades.
### Additional confirmed research after initial PR

- [SOURCE-LICENSE-REVIEW.md](SOURCE-LICENSE-REVIEW.md) — 14/14 exact pinned PHP upstream LICENSE texts examined and two Apache NOTICE omissions identified (**P1**).
- [lock-provenance.mjs](lock-provenance.mjs) — offline strict source revision / SHA512 / registry-origin / optional binary + postinstall consistency.
- [policy-regression.mjs](policy-regression.mjs) and [provenance-regression.mjs](provenance-regression.mjs) — synthetic lock mutation checks, with clear distinction from checks on real GitHub locks.
- [notice-gate.mjs](notice-gate.mjs), [notice-regression.mjs](notice-regression.mjs) — full-source NOTICE preservation test and five synthetic positive/negative cases. Current production generator is expected to **fail** if tested with installed vendor contents.
- [EVIDENCE-2026-10-20.md](EVIDENCE-2026-10-20.md) — exact local runtime, commands, exit codes, hashes, remaining unexecuted checks.

No production file changes and no legal clearance or Hostinger crypto confirmation.

### One-command audit and explicit coverage

Run from a **complete Git checkout**: `node research/parallel-security/run-security-suite.mjs --strict`. JSON report carries individual commands, actual exit codes, runtime detection, and `passed / failed / blocked` statuses. Exit `0` = executed tests passed (does not imply complete or approved); `1` = an executed test failed; `3` = strict mode and one or more checks **blocked**; `2` = invalid CLI usage. Optional `--online` adds point-in-time OSV and version-registry checks and fails on failed network calls. Neither stage acceptance nor legal compliance can be inferred from exit 0.

Do not call `php -n` a true no-Sodium environment without checking `extension_loaded('sodium')`: this runner checks it before selecting absent/compat mode. `SODIUM_COMPAT_AUTOLOAD` must point to an independently verified exact 2.5.2 local archive and only works when native extension is genuinely absent. The runner does not download or install upstream packages.

### Further research: cryptographic risk decision and embedded npm notices

- [SODIUM-DECISION-REVIEW.md](SODIUM-DECISION-REVIEW.md) — options and strict cross-backend/replay/security preconditions; candidate 2.5.2 remains CONDITIONAL.
- [NPM-ARCHIVE-REVIEW.md](NPM-ARCHIVE-REVIEW.md), [npm-source-gate.mjs](npm-source-gate.mjs) — build/test-only embedded third-party notices and installed-archive checks.
- `release-fixture.mjs native` now exercises 20 independent valid/negative signed release cases, confirmed on the actual original PHP verifier. Pure-PHP still blocked absent truly extension-free PHP.

### Original, not synthetic GitHub Actions evidence

[Run 39485991908](https://github.com/manufact-test/ai-site-cms/actions/runs/39485991908): standalone **Security & Dependencies job** executed on Node 22 and PHP 8.3.35 against the real 14 PHP + 29 npm dependency manifests/installed package and completed with **22 PASS / 0 FAIL / 2 BLOCKED**. Missing native-Sodium extension/compat pathways intentionally remain BLOCKED and Stage2 has not been accepted. See EVIDENCE-2026-10-20.md for complete history and scope.

## Follow-up research — merged PR #1 → draft PR #3 (20 Oct 2026)

**Merged baseline:** PR #1 was merged to `main` as **READ-ONLY RESEARCH** only. Follow-up is intentionally on separate `research/stage2-supply-chain-followup` branch, [draft PR #3](https://github.com/manufact-test/ai-site-cms/pull/3). All edits are only inside this directory.

- [RECEIPT-CHAIN-REVIEW.md](RECEIPT-CHAIN-REVIEW.md): 36 scripted ephemeral operator Ed25519 receipt acceptance/rejection assertions against original PHP `LabAttestedActivationGate`; newly wired to research suite but **exact-head CI passed, including 36 receipt, 46 permit and 38 settlement native PHP assertions**.
- [OSV-SNAPSHOT-REVIEW.md](OSV-SNAPSHOT-REVIEW.md): complete-response 43/43 OSV API evidence format plus 30 offline response cases, 23 CLI cases and 54 online/archive evidence cases; live API not yet executed.
- [NEXT-CHAT.md](NEXT-CHAT.md): authoritative **security chat-only handoff**, not a main project roadmap.


## Verified continuation checkpoint — 21 October 2026

**Exact tested pre-documentation HEAD:** `635597bdbf474fc2b09cce37cd371b6667c7930a`.
**Actual GitHub Actions:** [run #39509439870](https://github.com/manufact-test/ai-site-cms/actions/runs/39509439870), independent Security job `118926532347`, **46 PASS / 0 FAIL / 2 BLOCKED** on exact candidate overlay atop disposable main. CI counts are *suite entries*, not raw assertion total. Named native results: **36** operator receipt, **46** permit, **38** settlement, **18** trust-root tests. Offline OSV: **30** schema, **23** CLI, **54** online/advisory evidence assertions; additional 12 suite-exit, 20 sodium source and 15 false-pass PHP-wrapper assertions. **NO live OSV or physical Sodium-free runtime tested.**

New research-only tooling:
- [osv-strict-snapshot.mjs](osv-strict-snapshot.mjs): opt-in full 43-package HTTPS OSV querybatch, strict pagination/result checks, exactly locked source bytes and SHA, fails closed if either lock changes while waiting for the response.
- [online-evidence-proof.mjs](online-evidence-proof.mjs): verifies saved OSV/registry JSON, original lock hashes, 43 package identities, timestamps, advisory counts, source endpoints, and zero-advisory semantics; supports explicit **historical finding evidence** without ever authorizing release.
- [osv-advisory-triage.mjs](osv-advisory-triage.mjs): safe offline examination of a previously captured, **complete** JSON output. Produces a full independent review summary with input SHA-256, pinned package inventory and advisory IDs; exit `4` if findings, `0` if the archived OSV lookup reports zero findings, `3` invalid/changed input, `2` usage. Historical reports require `--historical` and cannot claim current security clearance.
- [online-evidence-regression.mjs](online-evidence-regression.mjs), [osv-cli-regression.mjs](osv-cli-regression.mjs), [runtime-sodium-proof-regression.mjs](runtime-sodium-proof-regression.mjs): offline adversarial report, lockfile-TOCTOU and simulated-PHP false-PASS tests. Their synthetic PASS results do not imply an external scan occurred.
- [sodium-compat-attest.mjs](sodium-compat-attest.mjs), [runtime-sodium-proof.mjs](runtime-sodium-proof.mjs): independently reviewed full-tree hash and exact `v2.5.2` reference required to begin genuine PHP 8.3/64-bit Sodium-free signed-envelope/RFC testing; source re-attested afterwards.

**Current blocked gates:** (1) real outbound 43/43 OSV querybatch with full saved JSON + human triage, (2) physically native-Sodium-free PHP 8.3 64-bit with vetted `paragonie/sodium_compat@2.5.2` and source snapshot, (3) qualified license/legal and release acceptance. This PR remains Draft for integration-owner review. **Only the Security folder is writable by this developer.** For next-chat instructions see [NEXT-CHAT.md](NEXT-CHAT.md); for exact commands see [RUNBOOK.md](RUNBOOK.md).
