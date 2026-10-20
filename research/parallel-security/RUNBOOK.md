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

Do **not** use a green badge of the existing main `stage2-independent-research.yml` as proof for new follow-up test code: it explicitly checks out previous `research/stage2-supply-chain` and tests the already accepted `main` snapshot. Run on **PR #3 HEAD**:

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
