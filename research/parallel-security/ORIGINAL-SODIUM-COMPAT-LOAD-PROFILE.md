# Actual signed Ed25519 CLI workload comparison — independently pinned original v2.5.2

Scope: research/parallel-security/ only. This is **not a Hostinger performance certification** and never gates a production release; production remains NO_GO.

## What runs

The already existing independent Linux CI disposable laboratory compiles **physical PHP 8.3 without ext-sodium**, downloads the real GitHub ZIP, verifies all 78 original Git blobs, installs the exact vetted `paragonie/sodium_compat` 2.5.2 Composer package separately, checks the single-package lock and source tree, runs signed release and upstream Ed25519 adversarial suites. This additional experiment is executed **before the final 78-blob pre/post file+lock re-attestation**.

With Node's `crypto.generateKeyPairSync('ed25519')`, it generates fresh ephemeral signing material ONLY in memory and signs 64-byte and 65,536-byte messages. It transmits **only signatures, public key and messages** to two PHP scripts over their STDIN, never exposing private keys. The exact same JSON input SHA-256 is checked in both processes.

One PHP 8.3.6 CLI uses actual `extension_loaded('sodium')===true` and the global native `sodium_crypto_sign_verify_detached`. The other is the independently built physically `extension_loaded('sodium')===false` PHP 8.3 CLI, using actual Composer-installed and Git-blob-verified `ParagonIE_Sodium_Compat::crypto_sign_verify_detached`. Unlike a class shim, this is the real pure-PHP fallback.

Seven genuine signed verification scenarios: 64-byte valid and tampered messages, 65,536-byte valid and tampered messages, tampered signature, exact upstream identity-key forgery, and malformed high/noncanonical signature scalar. For each backend all cases are first checked for the correct acceptance/refusal, then timed across 9 small-case or 3 large-case samples. **51 actual signed public-key verification calls per backend (102 total) are timed**, after separate warmups. No invalid forgery may be accepted and no valid signature may be rejected.

CI evidence line `INDEPENDENT_SECURITY_NATIVE_VS_COMPAT_LOAD` prints per-case native/Compat median and p95 (ms), number of samples and per-PHP-process peak memory, input SHA256, observed relative slowdown. Timing is single-tenant, process-local, after warmup with very small sample sizes. Do NOT interpret this as stable throughput, p95 request latency, DoS safety, side-channel protection or performance on LiteSpeed/FPM. No acceptance threshold is installed and ratios are descriptive only. Comparing different PHP builds and extension configurations is a preliminary capacity signal, **not** a controlled equal-runtime benchmark.

If comparison binary/source absent the performance row is BLOCKED, never a fabricated PASS. If a validated original signature or adversarial answer fails it is FAIL, and the Security CI rejects the run. The lab revalidates the original vendor blobs and isolated lock after this profiling work. The signed material and temporary source/build tree are destroyed; neither CMS, GitHub workflows, production package lock nor Hostinger changed.

Still required: independently authorized **actual target Hostinger web-SAPI** performance, concurrency, CPU exhaustion/timeouts, memory limits and release/rollback acceptance. Cryptography review and third-party legal/PGP signoffs unchanged.