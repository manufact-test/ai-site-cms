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
