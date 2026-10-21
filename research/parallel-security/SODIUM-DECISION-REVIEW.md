# Sodium / Ed25519 backend — Stage2 implementation decision review

## Актуальное доказательство после первичного исследования — 21.10.2026 (имеет приоритет над прошлым состоянием ниже)

Первичный текст 20.10 ниже — **исторический**. Теперь уже имеется: (1) оригинальный upstream GitHub ZIP `paragonie/sodium_compat@v2.5.2` действительно получен и 78/78 его файлов сопоставлены с Git blob коммита `3246b36803c177847e677862fedeb7f937869adb`, на который указывает upstream PGP-подписанный annotated tag; (2) upstream ZIP SHA-256 `53944302442e609c0443f680a6195f8d7467e3d0f0c4503e8a690fd9e7ee22f2`; (3) реальный **main** интегратора CI [#39571456888](https://github.com/manufact-test/ai-site-cms/actions/runs/39571456888) уже исполнил настоящий PHP8.3.6 x64 без ext-sodium и проверил 33 signed-chain + 55 rotation кейсов; (4) наш последний research CI [#39588010610](https://github.com/manufact-test/ai-site-cms/actions/runs/39588010610) — **76 PASS / 0 FAIL / 4 BLOCKED**, решение выпуска `NO_GO`.

**Не закрыто:** доверенная идентификация upstream PGP signer's ownership, независимый cryptographic code audit, ISC/NOTICE legal+redistribution approval, physical genuine no-Sodium + exact installed vendor pre/post source verification **в нашем research CI**, реальная latency/CPU/concurrency на целевом Hostinger/LiteSpeed PHP web SAPI. Без этого production/Stage2 НЕ ОДОБРЕНЫ. Полная сводка: `CURRENT-CHECKPOINT-2026-10-21.md`.

---


**Checkpoint:** 2026-10-20. Research-only, no production dependency installed, no Hostinger access, no go-live. Native PHP backend currently works on isolated PHP 8.4.24; target LiteSpeed PHP 8.3 reportedly lacks native Sodium.

## Candidate: paragonie/sodium_compat **exactly 2.5.2**

- [Exact release](https://github.com/paragonie/sodium_compat/releases/tag/v2.5.2), tag published 18 August 2026. [Packagist](https://packagist.org/packages/paragonie/sodium_compat) requires PHP **^8.1 and 64-bit**; its **ISC** license was independently read at the upstream v2.5.2 `LICENSE` file.
- Relevant older advisories: [main subgroup verification](https://phpadvisories.app/package/paragonie/sodium_compat) affects versions earlier than 2.5.0; [incorrect Ed25519 public key validation](https://phpadvisories.app/package/paragonie/sodium_compat) affects `>=2,<2.5.1`. Exact 2.5.2 is after these fixes. A new/current network-complete advisory scan remains mandatory.
- The upstream cryptography maintainers [explicitly say](https://github.com/paragonie/sodium_compat) there has been **no formal independent cryptographic audit**. Adoption is not independent certification.
- Pure-PHP userland operations can be significantly slower than native libsodium and do not offer all the same side-channel and memory guarantees. Request-bound verification benchmark must be measured on a **true Sodium-free PHP 8.3 / 64-bit** environment. No latency threshold was validated yet. Never set `ParagonIE_Sodium_Compat::$fastMult=true` without separate cryptographic and CPU assessment.
- `autoload.php` fills in **global** `sodium_crypto_sign_verify_detached` on PHP without extension; therefore the current `Ed25519Backend` will select its `function_exists` arm even in a pure-PHP scenario. Whether global wrapper delegates with identical semantics must be checked in actual pinned polyfill. Use `extension_loaded('sodium')` to label the actual implementation; function existence is not a native-extension test.

## Comparison

| Option | Trust properties | Hostinger practicality | Recommendation |
|---|---|---|---|
| Native ext-sodium installed/enabled by host | Optimized maintained native Ed25519; still needs signed envelope, out-of-band trust pins, epoch and receipt head | Not available in observed target LiteSpeed PHP8.3. Must NOT assume enabling it is possible | **Prefer if independently verified available**, no deployment until real source/build host review |
| Exact, vetted `sodium_compat 2.5.2` installed in trusted **private** vendor directory | Same API goal, preserve Ed25519 signatures and all separate authorization gates; userland cost and unaudited-crypto risk | Conceptually compatible with PHP8.3 64-bit; no actual target verification in this independent branch | **Conditional candidate** subject to risk approval, source provenance/ISC/NOTICE, literal pure PHP RFC vectors, forged-signature and whole trust-chain tests |
| Detached verifier in separately controlled native cryptographic build/offline operator | Can authenticate a package before it is handed off; custody becomes operational concern | Could verify a manual offline release; **does not automatically authenticate ongoing updates and activation inside target PHP** | Suitable only for explicitly designed manual offline handoff, not a silent substitute for target release authorization |
| Skip signature or fallback to SHA/HMAC/TOFU or caller-supplied keys | Breaks independent publisher identity / anti-replay trust chain | Superficially easy | **Prohibited** |

## Nonnegotiable full acceptance evidence (not fulfilled by 20 native tests)

1. Obtain the actual `2.5.2` archive through trusted fixed-source distribution **outside** the production lock and verify release integrity and license. Keep reproducible hash and source pin in operator evidence, not in an untrusted client request.
2. Execute with `extension_loaded('sodium')===false` on PHP8.3/64-bit and confirm exact `2.5.2` class loaded. Verify RFC8032 known answers, altered signature/message/public key, invalid encoding, subgroup/small-order attack vectors and exception fail-closed.
3. Repeat signed-envelope and adversarial suite with same trust root, hash, domain separation and metadata canonicalization for native and compat. Strictly reject revoked signer and lower floor before extraction/staging.
4. Cross-check `TrustedChainVerifier` dual signer rotation and **external** minimum epoch; `LabAttestedActivationGate` operator receipt head/sequence and replay resistance; `LabTrustedUpgradeCoordinator` DB checkpoint + CAS code generation + staged file authenticity under all abort and rollback paths. No pure PHP trust bypass or lazy deferred authentication.
5. Benchmark repeated valid/invalid verification and worst-case malformed input at controlled time/memory limits on actual deployment-like PHP 8.3. Assess CPU exhaustion, request blocking, timeouts, failure mode under concurrency and local side-channel risk.
6. Qualified cryptographic/security reviewer must sign off on exact sourced code, API behavior and allowed host runtime. Independently qualified license/NOTICE reviewer must approve redistribution. Integrator—not this research PR—decides whether to modify `cms/composer.lock`.

**Status:** native signature envelope adversarial matrix **20/20 local checks**, PHP 8.4.24. Pure PHP compat **unexecuted** (test host PHP has built-in Sodium even with `-n`); no target host or production signed release tests. Stage2 NOT ACCEPTED. 
