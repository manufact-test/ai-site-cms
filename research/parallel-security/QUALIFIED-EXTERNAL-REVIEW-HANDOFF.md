## ФИНАЛЬНАЯ ПЕРЕДАЧА SECURITY RESEARCH — 21.10.2026 (приоритет над историческими разделами ниже)

**НЕ основная разработка CMS.** Единственная разрешённая запись — `research/parallel-security/` плюс комментарии PR #3. PR #3 остаётся **OPEN DRAFT** с прежним историческим base `6ec6dd170c5250e5caed9f0739e03858a3b96a93`. Нельзя merge, Ready, rebase, retarget, force. Не изменены main, cms, workflows, production dependencies, Hostinger, DB или secrets.

**Последний подтверждённый кодовый контроль ДО этого обновления документации:** исследовательский SHA `49b7ea1820fc198f5d6158b6d71395a4b0fae015`, [GitHub Actions #39631680991](https://github.com/manufact-test/ai-site-cms/actions/runs/39631680991), **100 PASS / 0 FAIL / 0 BLOCKED**; source/scope CI успешно. CI доказал `INDEPENDENT_SECURITY_APACHE_LOOPBACK_SCOPE` с `actuallyExecutedLocalApacheHttp:true`, `originalServerPoliciesAttested:true`, `hostingerContacted:false`, `productionApproved:false`; original-main SHA, проверенный тем CI, `979a3795d6422c7067ba361dbbc4f9562955a9db`. Это выполненный **локальный Apache 2.4 HTTP опыт на runner**, НЕ живая конфигурация Hostinger. После документационных коммитов HEAD поменяется: получить точный финальный SHA из PR и убедиться в CI именно на нём.

**Два открытых для интегратора условных риска:** SEC-WEB-01 — в подставленной временной Apache public директории с настоящим исходным `.htaccess` искусственные `/.git/config` и `/.github/workflows/build.yml` выдавались HTTP 200; наличие подобных файлов на реальном сайте НЕ установлено. SEC-WEB-02 — оригинальный отдельный Hostinger-readonly `.htaccess` на локальном Apache дал `AH00670` и HTTP 403 даже для обычных маршрутов; это НЕ проверка LiteSpeed Hostinger. Два отдельно проверенных синтетических конфигурационных варианта не одобрены для production; первый может сломать `/.well-known`, второй меняет разрешения символьных ссылок.

Смотри [MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md](MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md), [APACHE-LOCAL-POLICY-REPRO-2026-10-21.md](APACHE-LOCAL-POLICY-REPRO-2026-10-21.md), [apache-original-policy-lab.py](apache-original-policy-lab.py). **Для главного чата** готов [MAIN-CHAT-MESSAGE-RU.md](MAIN-CHAT-MESSAGE-RU.md). Существующие 43 lock/OSV, physical PHP без Sodium + 78 исходников, 14 upstream Ed25519 negative checks, 60 реально подписанных chain cases, 102 CLI timings и static route proof сохранены как ограниченные исторические evidence.

**Stage2/production — NO_GO.** Нужны все 6 внешних подписей/решений: независимый PGP publisher key custody, qualified crypto, redistribution legal, разрешённые настоящие Hostinger web-SAPI/performance tests, main-integrator release integrity, product owner final GO. Зелёный CI ничего из этого не закрывает. Ограниченная самостоятельная инженерная работа готова к приёмке интегратором, не к выпуску.

---
## ОБНОВЛЕНИЕ 21.10.2026: актуальный original main route/CLI static source census

Дополнительные оригинальные web/CLI исходники и 24 отрицательных проверки задокументированы в [MAIN-WEB-CRYPTO-SURFACE-REVIEW.md](MAIN-WEB-CRYPTO-SURFACE-REVIEW.md). Кодовая проверка research SHA 760310d7bdd34f1b0d90b1066734e3e1dcbeefed CI #39624610755 дала 97 PASS / 0 FAIL / 0 BLOCKED. Это НЕ снимает ни одну из шести обязательных внешних подписей, приведённых ниже; устаревшие цифры в историческом тексте ниже не обозначают текущий статус.

---

# Qualified external reviewer handoff — Security research

Research PR #3, 21 October 2026. This is an evidence dossier for external review, never a production approval. No modifications outside research/parallel-security/ are permitted.

Prior evidence: exact research HEAD 28817b289e3be26e33341c2b031591aa6dff0134, GitHub Actions run #39600791500, 83 PASS / 0 FAIL / 0 BLOCKED. No Hostinger, external legal or cryptography approval.

Purpose: a reproducible machine-readable reviewer handoff, not scattered CI output. The read-only module review-handoff.mjs takes an actual complete Security suite JSON and produces an unsigned SHA-256 digest over the canonical JSON body. The current CI also emits the concise INDEPENDENT_SECURITY_EXTERNAL_REVIEW_HANDOFF line and requires a regression suite covering missing vendor blobs, mismatched main SHA, false OSV zero, altered runtime metadata and forged approvals.

Offline reproduction: node research/parallel-security/review-handoff.mjs /trusted/security-results.json > /safe/reviewer-packet.json. The report must originate from an authenticated completed exact-HEAD Actions run; the digest does not establish publisher identity or signature authenticity. The test runner also needs direct checked-in original CI metadata; a user-supplied JSON alone is never an external signature.

## Fixed six independent signoffs, no automatic GO

1. PUBLISHER_KEY_CUSTODY — independent trusted fingerprint/owner identity, locally verified signed tag, revocation and expiration. A GitHub verified badge and two publisher-controlled publications are not independent custody.
2. QUALIFIED_CRYPTO_REVIEW — independent cryptography/code reviewer assesses original v2.5.2 source and current main Ed25519 callsites, small-order and mixed-subgroup, timing/DoS, host policy, trust rotation and fail-closed operation. Fourteen adversarial checks do not replace an audit.
3. REDISTRIBUTION_LEGAL_REVIEW — qualified ISC and Apache LICENSE/NOTICE, MIT/BSD, embedded npm license and real bundled artifact commercial review. Main has since addressed the originally identified root Opis NOTICE omission; do not misreport it as currently unfixed.
4. TARGET_WEB_SAPI_PERFORMANCE — authorized Hostinger PHP/LiteSpeed or FPM actual runtime and instance-specific CPU/memory/latency/concurrency, malformed-request and timeout testing. Ubuntu native-free CLI is not Hostinger web-SAPI.
5. STAGE2_RELEASE_INTEGRITY — main integrator checks current original main, signed permit/receipt/settlement/rotation, actual release bytes, interrupted rollback and secret-handling boundaries.
6. RELEASE_OWNER_DECISION — explicit release owner approval of exact site/target, bytes, evidence, date and scope. No approval can be inferred from green CI.

## Required evidence / acceptance boundaries

The packet verifies row count consistency; original main SHA must match two independently executed PHP source/signed-chain paths, true PHP8.3 no-native attestation must match real installed Composer/78 original Git blobs, source and isolated lock digests must be 64-digit lowercase hex, and 14 upstream security boundary assertions must complete. Real OSV 43/43 must show zero reported known advisory references for a research-ready handoff. Any incomplete technical gate, actual advisory or incorrect source makes researchReady false.

Regardless of green research checks, all six signoffs are emitted as AWAITING_INDEPENDENT_EXTERNAL_SIGNOFF with reviewerIdentity=null, approvalDocumentSha256=null and approvalTime=null; report decision NO_GO with productionApproved=false. Never commit signed human opinions, secrets or target-site credentials to this public research branch. Responsible integrator/release owner separately governs disposition.

No production Composer/npm locks, CMS, workflows or Hostinger changes. Existing NEXT-CHAT transition documents intentionally unchanged.