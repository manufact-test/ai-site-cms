## ФИНАЛЬНАЯ ПЕРЕДАЧА SECURITY RESEARCH — 21.10.2026 (приоритет над историческими разделами ниже)

**НЕ основная разработка CMS.** Единственная разрешённая запись — `research/parallel-security/` плюс комментарии PR #3. PR #3 остаётся **OPEN DRAFT** с прежним историческим base `6ec6dd170c5250e5caed9f0739e03858a3b96a93`. Нельзя merge, Ready, rebase, retarget, force. Не изменены main, cms, workflows, production dependencies, Hostinger, DB или secrets.

**Последний подтверждённый кодовый контроль ДО этого обновления документации:** исследовательский SHA `49b7ea1820fc198f5d6158b6d71395a4b0fae015`, [GitHub Actions #39631680991](https://github.com/manufact-test/ai-site-cms/actions/runs/39631680991), **100 PASS / 0 FAIL / 0 BLOCKED**; source/scope CI успешно. CI доказал `INDEPENDENT_SECURITY_APACHE_LOOPBACK_SCOPE` с `actuallyExecutedLocalApacheHttp:true`, `originalServerPoliciesAttested:true`, `hostingerContacted:false`, `productionApproved:false`; original-main SHA, проверенный тем CI, `979a3795d6422c7067ba361dbbc4f9562955a9db`. Это выполненный **локальный Apache 2.4 HTTP опыт на runner**, НЕ живая конфигурация Hostinger. После документационных коммитов HEAD поменяется: получить точный финальный SHA из PR и убедиться в CI именно на нём.

**Два открытых для интегратора условных риска:** SEC-WEB-01 — в подставленной временной Apache public директории с настоящим исходным `.htaccess` искусственные `/.git/config` и `/.github/workflows/build.yml` выдавались HTTP 200; наличие подобных файлов на реальном сайте НЕ установлено. SEC-WEB-02 — оригинальный отдельный Hostinger-readonly `.htaccess` на локальном Apache дал `AH00670` и HTTP 403 даже для обычных маршрутов; это НЕ проверка LiteSpeed Hostinger. Два отдельно проверенных синтетических конфигурационных варианта не одобрены для production; первый может сломать `/.well-known`, второй меняет разрешения символьных ссылок.

Смотри [MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md](MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md), [APACHE-LOCAL-POLICY-REPRO-2026-10-21.md](APACHE-LOCAL-POLICY-REPRO-2026-10-21.md), [apache-original-policy-lab.py](apache-original-policy-lab.py). **Для главного чата** готов [MAIN-CHAT-MESSAGE-RU.md](MAIN-CHAT-MESSAGE-RU.md). Существующие 43 lock/OSV, physical PHP без Sodium + 78 исходников, 14 upstream Ed25519 negative checks, 60 реально подписанных chain cases, 102 CLI timings и static route proof сохранены как ограниченные исторические evidence.

**Stage2/production — NO_GO.** Нужны все 6 внешних подписей/решений: независимый PGP publisher key custody, qualified crypto, redistribution legal, разрешённые настоящие Hostinger web-SAPI/performance tests, main-integrator release integrity, product owner final GO. Зелёный CI ничего из этого не закрывает. Ограниченная самостоятельная инженерная работа готова к приёмке интегратором, не к выпуску.

---
## ОБНОВЛЕНИЕ 21.10.2026 — последний статический live-main surface proof

Новый оригинальный PHP/Git blob source audit и 24 negative tests: [MAIN-WEB-CRYPTO-SURFACE-REVIEW.md](MAIN-WEB-CRYPTO-SURFACE-REVIEW.md). На main SHA b3237fc2426ad246178b3fd4b64501c6b22c86ba в HttpKernel наблюдался ровно GET /api/health, в независимом Hostinger preflight — 7 path comparisons, в двух CLI релизных скриптах — CLI guards. Это статические наблюдения, НЕ доказательство отсутствия динамических HTTP маршрутов или производительности LiteSpeed/FPM. Исходная инструкция ниже пока НЕ выполнялась на Hostinger, release NO_GO.

---

# Offline Ed25519 workload pressure: bounded math and Hostinger acceptance

21 October 2026. Independent research only. **This is not measured Hostinger capacity, nor product GO.** GitHub PR #3 stays draft, changes restricted to `research/parallel-security/`.

## Source / exposure reality
Read-only inspection of true `main` SHA `09d183b6eccb7571a6a1ac18400a3d2564cc4686`: `cms/src/Release/OfflineReleaseVerifier.php` is explicitly an **offline, read-only** release verifier. It validates cryptographic envelope / trust pin, then returns `safe_to_deploy:false`. The `Ed25519Backend.php` prefers real native extension origin then optional private `ParagonIE_Sodium_Compat`. **This alone neither establishes nor rules out publicly reachable Ed25519 paths or a remotely exploitable DoS.** Integrator must check all callsites and actual request paths before concluding exposure.

## Research source of numbers
CI #39614828219 observed original PHP 8.3.36 native extension and physically no-sodium PHP 8.3.6 vetted real Composer-installed `sodium_compat 2.5.2`. Same transient Node-generated signed public keys/messages: 51 timed verifications per backend, seven valid/invalid classes and pre/post attestation of **78 original files**. Observed median 64-byte valid native `0.06387 ms` vs actual Compat `45.28948 ms`. The n=3 large case "p95" is **not** a meaningful population p95; do not make host decisions using it.

## Precisely what new model can say
`sodium-capacity-whatif.mjs` consumes the fully validated paired CI proof, never self-reported Hostinger data, and returns illustrative rates **1, 5, 10, 20, 40 checks/s**. `median milliseconds × checks per second / 1000` is only *equivalent sequential verifier work seconds per second*. Applying the previous small valid fallback sample at 20/s gives `45.28948 × 20 / 1000 ≈ 0.90579` equivalent serial seconds/s. It is **not observed CPU use**, actual HTTP request time, workers busy, saturation, memory headroom, concurrency, p99, or verified traffic frequency. Return value `capacityApproved:false` and `productionApproved:false` are immutable.

Negative regression tests reject missing/forged same-input hashes, changes to input modes, PHP versions, false host approval, manipulated medians/ratios/p95, invalid sample counts and missing expensive invalid signature case. Synthetic regression is explicitly not benchmark evidence. Actual CI uses the real signed profile before source re-attestation and emits `INDEPENDENT_SECURITY_OFFLINE_WORKLOAD_WHATIF`.

## Safe permissioned Hostinger acceptance checklist (assigned integrator)

1. Obtain written authorization for exact staging host/site, quiet test window and rollback; do not test a public shared host without permission.
2. Inventory **real release verifier callsites**, HTTP reachability, access controls, cache, how frequently signed envelopes are verified. If exclusively offline/privileged, no public attack surface is implied.
3. Collect server runtime PHP full version, 64-bit, native `extension_loaded('sodium')` plus reflection is-internal check, web SAPI LiteSpeed/FPM, opcache configuration, actual CPU/worker/memory/time limits; **do not expose a diagnostic PHP endpoint publicly**.
4. Verify cryptographic trust source with exact pinned package, release digest, valid/invalid signed input, fail-closed missing extension, safe rollback.
5. Using staging and explicit permission, run bounded legitimate and adversarial workload at **agreed** rates; measure throughput, CPU, memory, HTTP request p95/p99, queue wait, error/timeout rates, recovery after overload. Never launch uncontrolled flood or change shared hosting settings for this research.
6. Decide native implementation vs audited polyfill only after real target tests and qualified crypto/legal approval. If capacity is unsafe, prefer privileged native-capable worker or hold launch, **never skip signature verification**.
7. Record target/commit/date/host evidence and qualified reviewer approval outside public PR, with no customer data or secrets. Only integrator/release owner can make a GO decision.

Existing six external reviewers and Stage2/production **NO_GO** remain unchanged. `main`, `cms/`, GitHub Actions workflow, lockfiles, secrets, Hostinger and `NEXT-CHAT.md` are not modified.
