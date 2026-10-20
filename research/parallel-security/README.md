# AI Site CMS — Security & Dependencies independent research

**Branch:** `research/stage2-supply-chain` (PR to `main`, never merge by this researcher).
**Allowed writes only:** `research/parallel-security/`.
**As of 2026-10-20:** Stage2 not accepted, Stage3 not started.

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