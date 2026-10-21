## ФИНАЛЬНАЯ ПЕРЕДАЧА SECURITY RESEARCH — 21.10.2026 (приоритет над историческими разделами ниже)

**НЕ основная разработка CMS.** Единственная разрешённая запись — `research/parallel-security/` плюс комментарии PR #3. PR #3 остаётся **OPEN DRAFT** с прежним историческим base `6ec6dd170c5250e5caed9f0739e03858a3b96a93`. Нельзя merge, Ready, rebase, retarget, force. Не изменены main, cms, workflows, production dependencies, Hostinger, DB или secrets.

**Последний подтверждённый кодовый контроль ДО этого обновления документации:** исследовательский SHA `49b7ea1820fc198f5d6158b6d71395a4b0fae015`, [GitHub Actions #39631680991](https://github.com/manufact-test/ai-site-cms/actions/runs/39631680991), **100 PASS / 0 FAIL / 0 BLOCKED**; source/scope CI успешно. CI доказал `INDEPENDENT_SECURITY_APACHE_LOOPBACK_SCOPE` с `actuallyExecutedLocalApacheHttp:true`, `originalServerPoliciesAttested:true`, `hostingerContacted:false`, `productionApproved:false`; original-main SHA, проверенный тем CI, `979a3795d6422c7067ba361dbbc4f9562955a9db`. Это выполненный **локальный Apache 2.4 HTTP опыт на runner**, НЕ живая конфигурация Hostinger. После документационных коммитов HEAD поменяется: получить точный финальный SHA из PR и убедиться в CI именно на нём.

**Два открытых для интегратора условных риска:** SEC-WEB-01 — в подставленной временной Apache public директории с настоящим исходным `.htaccess` искусственные `/.git/config` и `/.github/workflows/build.yml` выдавались HTTP 200; наличие подобных файлов на реальном сайте НЕ установлено. SEC-WEB-02 — оригинальный отдельный Hostinger-readonly `.htaccess` на локальном Apache дал `AH00670` и HTTP 403 даже для обычных маршрутов; это НЕ проверка LiteSpeed Hostinger. Два отдельно проверенных синтетических конфигурационных варианта не одобрены для production; первый может сломать `/.well-known`, второй меняет разрешения символьных ссылок.

Смотри [MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md](MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md), [APACHE-LOCAL-POLICY-REPRO-2026-10-21.md](APACHE-LOCAL-POLICY-REPRO-2026-10-21.md), [apache-original-policy-lab.py](apache-original-policy-lab.py). **Для главного чата** готов [MAIN-CHAT-MESSAGE-RU.md](MAIN-CHAT-MESSAGE-RU.md). Существующие 43 lock/OSV, physical PHP без Sodium + 78 исходников, 14 upstream Ed25519 negative checks, 60 реально подписанных chain cases, 102 CLI timings и static route proof сохранены как ограниченные исторические evidence.

**Stage2/production — NO_GO.** Нужны все 6 внешних подписей/решений: независимый PGP publisher key custody, qualified crypto, redistribution legal, разрешённые настоящие Hostinger web-SAPI/performance tests, main-integrator release integrity, product owner final GO. Зелёный CI ничего из этого не закрывает. Ограниченная самостоятельная инженерная работа готова к приёмке интегратором, не к выпуску.

---
# AI Site CMS — independent Security & Dependencies Research

**21.10.2026: current status:** [NEXT-CHAT.md](NEXT-CHAT.md), [CURRENT-CHECKPOINT-2026-10-21.md](CURRENT-CHECKPOINT-2026-10-21.md), [START-MESSAGE-RU.md](START-MESSAGE-RU.md) — приоритетные файлы передачи. Остальные evidence/review старше являются историческими фактами соответствующей даты.

**Ветка:** research/stage2-supply-chain-followup. [PR #3](https://github.com/manufact-test/ai-site-cms/pull/3) строго **OPEN DRAFT**. Только изменения research/parallel-security/, никаких main/cms/.github/workflows/production pins/Hostinger/DB/secrets/deploy. Не merge/rebase/retarget/Ready.

## Current exact CODE checkpoint prior to handoff-document commit

**HEAD 760310d7bdd34f1b0d90b1066734e3e1dcbeefed**; [GitHub Actions #39624610755](https://github.com/manufact-test/ai-site-cms/actions/runs/39624610755) **SUCCESS 97 PASS / 0 FAIL / 0 BLOCKED** (suite entries), original 70 PR changed paths all inside research/parallel-security. После обновления документов надо получить НОВЫЙ PR HEAD и CI именно этого документационного SHA.

## Что подтверждено

- 43 real pinned packages: 14 Composer + 29 npm, original lockfile sha/Git blob evidence and **real live OSV** 43/43, zero known advisory references at observation time (not an all-vulnerabilities guarantee).
- Real upstream GitHub PGP verified annotated sodium_compat 2.5.2 tag, pinned Git commit 3246b36803c177847e677862fedeb7f937869adb, 78 source Git blobs; REAL zip SHA256 53944302442e609c0443f680a6195f8d7467e3d0f0c4503e8a690fd9e7ee22f2. Independent genuine native-free PHP8.3.6 isolated Composer source-installed/attested (pre/post all 78), four real signed fixtures and 14 actual Ed25519 v2.5.2 adversarial boundary assertions.
- Original current main source Ed25519 PHP class callsites attested Git source + 60 actually signed-chain tests in native class-dispatch.
- 102 real signed CLI verification timings across 7 native/fallback scenarios, fallback often ~43–45ms vs native ~0.06ms for expensive cases. [HOSTINGER-ED25519-OFFLINE-CAPACITY-PLAN.md](HOSTINGER-ED25519-OFFLINE-CAPACITY-PLAN.md) computes ILLUSTRATIVE serial busy time, **not real Hostinger throughput, CPU or DoS**.
- NEW original-main static web / crypto source boundary: [MAIN-WEB-CRYPTO-SURFACE-REVIEW.md](MAIN-WEB-CRYPTO-SURFACE-REVIEW.md). PHP token parser plus Git source SHA reveals 1 Slim GET /api/health, 7 Hostinger preflight URL path strings, 2 CLI guards, no direct lexical Ed25519 class references in web entrypoints; 24 adversarial route/downgrade tests. **This does not prove all dynamic call paths, server rewrite config, or public attack surface.**
- review-handoff.mjs + evidence-readiness-decision.mjs: strict machine evidence, always NO_GO. Research-ready flag cannot approve release or stand in for expert PGP/crypto/legal signatures.

## Key commands

- node research/parallel-security/run-security-suite.mjs --strict --online
- node research/parallel-security/main-head-independent-proof.mjs
- node research/parallel-security/main-web-crypto-surface-regression.mjs
- node research/parallel-security/review-handoff-regression.mjs
- node research/parallel-security/sodium-capacity-whatif-regression.mjs
- node research/parallel-security/evidence-readiness-regression.mjs

Complete physical/online research CI needs real public Git, internet OSV/Composer, OS temporary Linux build of genuine PHP 8.3 without Sodium. Local --strict may correctly BLOCKED when absent prerequisites; a 0 exit is NEVER Stage2 GO. [RUNBOOK.md](RUNBOOK.md) for details.

## Remaining independently authorized decisions

PGP signer owner identity/custody out-of-band; qualified exact-source crypto/security review; ISC/Apache NOTICE real package legal review; actual authorized Hostinger PHP LiteSpeed/FPM web-SAPI concurrency/CPU/latency tests; main-integrator signed release permit/receipt/settlement, rollback; final product owner explicit approval. All six **still outstanding**. Stage2/production **NO_GO**.
