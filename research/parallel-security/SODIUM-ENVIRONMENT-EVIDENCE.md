## Новый статус 21.10.2026 — документальный приоритет над историческим состоянием ниже

Отдельный настоящий [main CI интегратора #39571456888](https://github.com/manufact-test/ai-site-cms/actions/runs/39571456888) уже исполнил физический PHP 8.3.6 64-bit **без ext-sodium** и pinned pure-PHP `sodium_compat@v2.5.2` (33 signed-chain, 55 trust rotation). В НАШЕМ независимом research CI нет повторного настоящего no-native процесса; его explicit `no-sodium:cryptography` / `compat:cryptography` всё ещё BLOCKED. Исходный ZIP библиотеки отдельно скачан и **78/78 Git blobs** подтверждены против подписанного upstream тега. Эти факты не доказывают целевой Hostinger LiteSpeed PHP web SAPI или независимый аудит криптографии. Полная актуальная сводка: `CURRENT-CHECKPOINT-2026-10-21.md`.

---

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


## Final research checkpoint — 21 October 2026

The gated wrapper now requires `PHP_NO_SODIUM_BIN` to identify an actual **PHP 8.3 / 64-bit CLI binary physically lacking ext-sodium**. Even if `-n` hides a function, `extension_loaded('sodium') === true` blocks. A separately obtained exact `paragonie/sodium_compat@2.5.2` Composer source reference **and** distribution reference must both equal upstream signed tag commit `3246b36803c177847e677862fedeb7f937869adb`; a separately retained full-tree SHA-256 must match `sodium-compat-attest.mjs`, including all PHP source bytes. This is checked both **before and after** compat cryptographic tests. The verifier subprocess must print specific completed RFC8032 and signed-envelope assertions, not merely return exit 0.

[Exact-head CI #39509439870](https://github.com/manufact-test/ai-site-cms/actions/runs/39509439870) independently exercised the source-attestation synthetic fixture **20/20**, fake-PHP fail-closed proof fixture **15/15**, and real **native Sodium** receipt/permit/settlement/trust fixtures **36/46/38/18**; two **authentic no-native crypto** cases remain **BLOCKED**, not simulated PASS. The stub-backed negative tests prove defensive output policy, **not** that an extension-free PHP runtime was observed. The actual `sodium_compat` source tree is **not present as independently attested tested evidence**, and the target LiteSpeed/web-SAPI test was not executed. Stage2, production and legal approval remain withheld.

Next chat: coordinate with integration owner on a disposable physically Sodium-free PHP 8.3 64-bit target-like runner and approved reference archive; see [RUNBOOK.md](RUNBOOK.md) for exact environment variables and commands. Do not modify CMS sources, production locks, workflows, host or secrets from this branch.
