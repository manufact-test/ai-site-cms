# Signed chain cross-backend research gate

This test feeds **the same byte-identical Node Ed25519-signed two-generation evidence** to the original unmodified PHP preactivation permit → activation receipt → settlement verifiers, with no installation, DB, Hostinger, production secret or app-file edits.

```sh
# Full checkout; genuine native PHP verifier, 11 signed good/bad cases:
node research/parallel-security/chain-backend-regression.mjs native

# Trusted disposable genuinely ext-sodium-free PHP 8.3 64-bit,
# independently verified exact 2.5.2 sodium_compat archive and lock:
PHP_NO_SODIUM_BIN=/absolute/native-free-php8.3 \
SODIUM_COMPAT_AUTOLOAD=/trusted/vendor/paragonie/sodium_compat/autoload.php \
SODIUM_COMPAT_LOCK=/trusted/isolated/composer.lock \
SODIUM_COMPAT_TREE_SHA256=independently_checked_64_lowercase_hex \
node research/parallel-security/chain-backend-regression.mjs matrix
```

Modes: `native` uses PHP native Sodium, `compat` requires actual Sodium-free PHP and independently pinned compat; `matrix` replays identical signatures against **both**, compares their accepted head and generation count. Compat modes re-attest the whole independently reviewed source tree both before and after. Faked PHP, `php -n` with built-in extension, disabled functions, stubbed polyfill, absent whole-tree digest or Composer lock **never** qualify as compat PASS. PHP crash/Error is an infrastructure/test failure, **not** a successful negative-case policy rejection.

Tests cover legitimate two-step acceptance, wrong operator key pin, cross-site replay, old external settlement/receipt heads, forged settlement/permit/receipt signatures, modified signed settlement bytes, a **correctly re-signed cross-generation nonce replay**, and restoration of the original chain (**11 assertions per backend**). An ephemeral Ed25519 key is generated in Node and never passed to PHP; the temporary folder is removed on completion.

**Open integration risk:** `LabSettledUpgradeGate::verify` calls the global `sodium_crypto_sign_verify_detached` directly, whereas permit/receipt verification use `Ed25519Backend::verifyDetached`. Class-only compat may leave that global missing; the upstream autoload may supply it. This is an **unproven compatibility risk**, not a proven deployment exploit. This gate will expose it once a genuinely native-free approved binary and vetted library become available.

Exit 0 means selected scenarios verified, exit 1 means an executed behavior failed, exit 2 means invalid CLI, exit 3 means external prerequisites blocked. A PASS does **not** certify production, security, source redistribution, Stage2, web SAPI, power failure recovery or SQL behavior. The full 43-package live OSV audit and genuine no-native compat verification remain blocked until separately performed.

## Extended original-PHP adversarial matrix (21 October 2026)

The research-only fixture now runs **60 assertion cases per backend** (or 120 for a genuinely native-free + native matrix on the very same signed bytes): beyond the original baseline it **re-signs mutated settlement, archived permit and activation receipt data with a real ephemeral private key**, recomputes and externally supplies the updated evidence head, and checks that the original PHP policy rejects wrong versions, incorrect lineage, publisher/site substitution, false production-readiness, invalid DB checkpoints, noncanonical-but-signed JSON, inserted fields and replay. It also checks missing evidence, symlinks, hardlinks, unmatched sidecars and independently pinned publisher mismatch before retesting valid acceptance.

These are real cryptographic verification and policy checks on native PHP, **not** a simulation of a sodium-free runtime. `compat`/`matrix` remain externally blocked without physical PHP 8.3 no Sodium and an independently reviewed pinned library. The assertions count is cross-checked within the script and by `run-security-suite.mjs`. No Docker, shared workflow, CMS files, host or production secrets are changed by this researcher.
