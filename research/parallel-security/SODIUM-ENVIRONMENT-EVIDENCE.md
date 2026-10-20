# Sodium candidate: classify forced-polyfill vs genuinely missing extension (20 Oct 2026)

## Confirmed environment issue in main's crypto lab
Current source `cms/tools/test-stage2-sodium-free-verifier.cjs` runs `php -n -d disable_functions=sodium_crypto_sign_verify_detached` and loads the exact-pinned `paragonie/sodium_compat@2.5.2` in an ephemeral Composer installation. Its paired `cms/tests/stage2-polyfill-ed25519.php` turns on `ParagonIE_Sodium_Compat::$disableFallbackForUnitTests=true`, forcing the library to use its PHP verification implementation. This is a **useful forced-userland functional test**, and it properly does not touch production Composer lock or Hostinger.

However, the fixture prints `native ext absent` without ever checking `extension_loaded('sodium')`. On the actual independent local host PHP 8.4.24, all of these were observed:

| CLI | `extension_loaded('sodium')` | `function_exists('sodium_crypto_sign_verify_detached')` |
|---|---|---|
| `php -r ...` | true | true |
| `php -n -r ...` | true | true |
| `php -n -d disable_functions=sodium_crypto_sign_verify_detached -r ...` | **true** | false |

Thus disabling the global function may redirect `Ed25519Backend` to the polyfill class while the native extension remains loaded. Do **not** call this test a genuine missing-extension scenario; relabel as **forced pure-PHP code-path on PHP 8.3 test runner**. It does **not** prove PHP startup/autoload behavior on target LiteSpeed with no sodium compiled in. This is **P1 test evidence integrity**, not a proven production vulnerability.

## New research-only proof gate

`node research/parallel-security/runtime-sodium-proof.mjs` requires `PHP_NO_SODIUM_BIN=/absolute/path/to/php`. It starts that PHP executable with `-n`, verifies `PHP_INT_SIZE === 8`, `PHP_SAPI === 'cli'`, **both** `extension_loaded('sodium') === false` and `function_exists('sodium_crypto_sign_verify_detached') === false` before running native-absent RFC8032 and signed-envelope refusal checks. If an independently pinned `SODIUM_COMPAT_AUTOLOAD` exists, it then runs the real `compat` RFC and signed-envelope tests. This never calls the production deployment installer.

- Exit **0**: all four actual extension-free checks ran and passed (NOT host/legal signoff).
- Exit **1**: any performed cryptographic test failed.
- Exit **2**: bad CLI or runtime probe output.
- Exit **3**: prerequisites missing or only a simulated no-native environment available.

On local PHP 8.4.24: `node runtime-sodium-proof.mjs` exits **3** with no PHP binary; `PHP_NO_SODIUM_BIN=/usr/bin/php node runtime-sodium-proof.mjs` exits **3** detecting the built-in extension. This **proves the gate fails closed**, not that sodium_compat is production-safe.

## Integrator action
1. Correct only the **test result wording** in the main branch; retain its valuable `disableFallbackForUnitTests` regression coverage.
2. Acquire a verified disposable **native-free** PHP 8.3 64-bit CLI binary and exact Composer-pinned 2.5.2 archive, execute this gate there. Collect command lines, exit codes, source hash and performance under both valid/invalid cases.
3. Separately test the actual target hosting PHP / web-SAPI environment when explicitly authorized. The research role is not permitted to access Hostinger or change production Composer dependencies.

The version 2.5.2 upstream warns its PHP implementation is not independently cryptographically audited. Its ISC license adds new distribution review needs. No Stage2 acceptance or customer deployment is authorized.
