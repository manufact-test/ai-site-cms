# Reproducible Security Laboratory (research only)

All commands run from the repository root on an isolated local/CI machine. Scripts make no production changes. No Hostinger, database, SSH or customer data is required.

## 1. Inventory and vulnerability lookup

```sh
node research/parallel-security/inventory-audit.mjs > /tmp/security-ledger.json
node research/parallel-security/inventory-audit.mjs --csv > /tmp/security-ledger.csv
# On a networked, trusted machine; rejects HTTP errors and truncated batch results:
node research/parallel-security/inventory-audit.mjs --online > /tmp/ledger-with-osv-status.json 2>/tmp/osv-results.json
# Additional source-of-truth checks in existing build environment:
cd cms && composer audit --locked
cd editor && npm audit --package-lock-only --json
```

The offline check validates counts, declared SPDX and integrity references, not upstream source text. Online OSV snapshots must be dated, independently reconciled, and do not replace Composer/npm audits.

## 2. Ed25519 actual crypto primitive (read-only)

```sh
php research/parallel-security/ed25519-lab.php native
# ONLY on a PHP executable without loaded ext-sodium; php -n is not sufficient
# if the extension was compiled statically into the PHP binary.
php -n research/parallel-security/ed25519-lab.php absent

# Independently obtain and CHECK exact sodium_compat 2.5.2 release
# (source hash and license) into a trusted, local folder OUTSIDE repository.
export SODIUM_COMPAT_AUTOLOAD=/trusted/vendor/paragonie/sodium_compat/autoload.php
php -n research/parallel-security/ed25519-lab.php compat
```

The compat test refuses to claim success if native sodium is still loaded. The unavailable test MUST reject correct signatures. No production dependency is installed.

## 3. Actual signed-release verification

```sh
node research/parallel-security/release-fixture.mjs native
node research/parallel-security/release-fixture.mjs absent
SODIUM_COMPAT_AUTOLOAD=/trusted/vendor/paragonie/sodium_compat/autoload.php node research/parallel-security/release-fixture.mjs compat
```

This fixture generates ephemeral Ed25519 keypair in Node, retains ONLY ephemeral public PEM, signs a release envelope with the exact existing Stage2 domain string, calls the unmodified PHP \`OfflineReleaseVerifier\` in a separate process, and checks genuine signature, altered metadata, altered package SHA-256, wrong key pin, and anti-rollback minimum. The deliberately artificial \`package.zip\` is **hash-only content**, not a valid ZIP: extraction/inventory/DB/upgrade are NOT tested. A successful signature result is NOT safe-to-deploy.

## 4. Full release-chain acceptance before any decision

Additional test evidence mandatory for the main developer: \`TrustedChainVerifier\` dual-signature epoch advance and external \`minEpoch\`; \`LabAttestedActivationGate\` operator signed-receipt sequence + external head and replay attempt; \`LabTrustedUpgradeCoordinator\` DB/schema fence, archive extraction, verified inventory and power-loss recovery; same inputs under native and real pure-PHP compat with PHP 8.3 64-bit. Test limits and differences in cryptography, latency, timeouts, request concurrency, CPU DoS, userland side channels. Obtain independent crypto/security review before production.

## Important safety conditions

No implementation may downgrade to HMAC, SHA-256, OpenSSL RSA, unsigned metadata, environment-embedded signer fingerprint, or trust-on-first-use. No read of browser-provided trust anchors. A low-level crypto test does not establish safe upgrades, rights to redistribute, or target-host suitability. PHP8.3 64-bit is required for sodium_compat v2; compare with native or separate signed-verification worker as a design choice. The production \`cms/composer.lock\` is intentionally unchanged.

## 5. Source-level licenses and reproducible NOTICE detection

Read [SOURCE-LICENSE-REVIEW.md](SOURCE-LICENSE-REVIEW.md) first. On repository root:

```sh
node research/parallel-security/policy-regression.mjs
node research/parallel-security/lock-provenance.mjs
node research/parallel-security/provenance-regression.mjs
node research/parallel-security/notice-regression.mjs
# REQUIRES trusted cms/vendor/ and a built .build/internal-stage2-package
# Currently expected to FAIL because generator omits separate upstream Apache NOTICE:
node research/parallel-security/notice-gate.mjs
```

Notice gate exit 0 = both source NOTICE bodies copied; exit 1 = incomplete/modified NOTICE; exit 2 = required installed/vendor/package evidence missing. The regression scripts create temporary fake packages exclusively; they do **not** mean original tarball contents were validated. Never call a missing vendor tree a successful NOTICE check.

## Expanded current research suite

```sh
node research/parallel-security/run-security-suite.mjs --strict
node research/parallel-security/release-fixture.mjs native
node research/parallel-security/npm-source-gate.mjs
```

The first exits **3** when required checks are blocked (e.g. unavailable true no-Sodium PHP, absent npm vendor trees). The second runs 20 real signed-release acceptance/rejection assertions on native. The npm archive gate requires a trusted `npm ci` checkout; no manual package downloads or build/production file modification occur. Review [NPM-ARCHIVE-REVIEW.md](NPM-ARCHIVE-REVIEW.md) and [SODIUM-DECISION-REVIEW.md](SODIUM-DECISION-REVIEW.md) before selecting anything for production.

## Follow-up PR #3: independent source testing (20 Oct 2026)

**Historical note (superseded):** This workflow *previously* checked the old merged branch instead of PR #3. The integration owner corrected exact-candidate checkout/overlay. Read **the exact PR HEAD and its matching workflow job logs**, not any unrelated generic green badge. On an isolated exact checkout, run:

```sh
php -l research/parallel-security/receipt-chain-regression.php
CI=true CMS_ALLOW_PHP_INSTALL_LAB=1 php research/parallel-security/receipt-chain-regression.php
php cms/tests/trust-chain.php
node --check research/parallel-security/osv-strict-snapshot.mjs
node --check research/parallel-security/osv-strict-regression.mjs
node research/parallel-security/osv-strict-regression.mjs
node research/parallel-security/run-security-suite.mjs
```

See [RECEIPT-CHAIN-REVIEW.md](RECEIPT-CHAIN-REVIEW.md) and [OSV-SNAPSHOT-REVIEW.md](OSV-SNAPSHOT-REVIEW.md). Full online vulnerability audit requires explicit opt-in `node research/parallel-security/osv-strict-snapshot.mjs` in an isolated networked runner and capture of the untruncated stdout JSON.


## 6. Current exact-head tests (21 Oct 2026)

Last independently verified code checkpoint before the handoff documentation refresh: `635597bdbf474fc2b09cce37cd371b6667c7930a`. [GitHub Actions run #39509439870](https://github.com/manufact-test/ai-site-cms/actions/runs/39509439870), Security job `118926532347`: **46 suite PASS, 0 FAIL, 2 explicitly BLOCKED** with exact PR #3 head and PHP 8.3 / Node 22. The blockers are the genuine native-free Sodium and compat backends, **NOT** successful executions. Never treat an offline green run as Stage2 approval.

```sh
# From a COMPLETE, isolated checkout of the current research PR #3 HEAD:
node research/parallel-security/run-security-suite.mjs
# --strict returns 3 while any required crypto test remains blocked
node research/parallel-security/run-security-suite.mjs --strict
# Only on an APPROVED runner with outbound OSV + npm/Packagist network access:
node research/parallel-security/run-security-suite.mjs --online
```

### Complete 43-package OSV report: capture and independent advisory triage

Use an approved trusted isolated networked checkout, with immutable original locks and a safe output location **outside** the working repository. One request must return all 14 Composer + 29 npm exact pins; if any page is incomplete, TLS/network fails, original locks change or an advisory ID is malformed, the script **does not emit a successful JSON report**.

```sh
# Exact-point-in-time query. Save full untruncated stdout JSON to a safe location.
node research/parallel-security/osv-strict-snapshot.mjs > /safe/private/osv-exact-43.json
# Immediately check exact locked versions and full advisory details (NO network):
node research/parallel-security/osv-advisory-triage.mjs \
  /safe/private/osv-exact-43.json > /safe/private/osv-triage.json
# For older preserved transcripts ONLY (not current audit):
node research/parallel-security/osv-advisory-triage.mjs \
  /safe/private/osv-exact-43.json --historical > /safe/private/osv-historical-triage.json
```

Exit codes for the offline saved-report checker: **0** = valid 43-pin snapshot with zero OSV database advisory references at that historical point; **4** = valid and **HAS ADVISORY FINDINGS** (human triage required, preserve output); **3** = invalid/missing/mismatched/stale evidence; **2** = incorrect input. `--historical` explicitly allows old timestamps, **not** changed package locks or future-dated reports; it does not make yesterday's results current. Recheck source archive provenance and legal obligations separately. Treat even zero findings as **not a security certification**.

The live `--fail-on-advisory` standalone script exits **4** for full responses with findings, as an intentional release-blocking decision. The verification helper in the suite requires a genuinely zero-advisory full JSON document for an online PASS; it also independently recalculates registry upgrades instead of trusting the subprocess exit code or fields.

### Genuine PHP 8.3 no-native-Sodium proof (not currently runnable here)

The project PHP/Node runner is **not permitted to simulate** missing ext-sodium merely by `php -n` or `disable_functions`. The real source-tree attest must require an independently obtained exact upstream `paragonie/sodium_compat@v2.5.2` (verified signed Git tag points to `3246b36803c177847e677862fedeb7f937869adb`), independently stored full-tree SHA-256 and a disposable Composer lock matching this source and dist reference. Do **not** silently download or install this dependency in this research PR.

```sh
export PHP_NO_SODIUM_BIN=/absolute/path/to/physically-sodium-free-php8.3
export SODIUM_COMPAT_AUTOLOAD=/absolute/vendor/paragonie/sodium_compat/autoload.php
export SODIUM_COMPAT_LOCK=/absolute/isolated/composer.lock
export SODIUM_COMPAT_TREE_SHA256=64_lowercase_hex_from_independently_reviewed_source
node research/parallel-security/runtime-sodium-proof.mjs
```

The proof gate checks true native extension absence, 64-bit PHP 8.3 CLI, known-answer/forgery results, complete assertion stdout and final JSON, independently attests all source bytes **both before and after** actual PHP checks. Exit 0 cannot grant production acceptance; exit 3 means prerequisites/attestation are blocked, 1 means performed tests failed, 2 means invalid usage/probe. Collect performance data and separately test the explicitly authorized target web SAPI before deployment.

**Permission limits:** No Hostinger, deployments, secrets, databases, shared docs, Composer/npm dependency modifications, workflow edits, merges, or branch moves outside `research/parallel-security/` by the Security research role. Source acceptance requires main integrator and qualified review.
