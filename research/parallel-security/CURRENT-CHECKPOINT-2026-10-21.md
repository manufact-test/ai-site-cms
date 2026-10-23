## ФИНАЛЬНАЯ ПЕРЕДАЧА SECURITY RESEARCH — 21.10.2026 (приоритет над историческими разделами ниже)

**НЕ основная разработка CMS.** Единственная разрешённая запись — `research/parallel-security/` плюс комментарии PR #3. PR #3 остаётся **OPEN DRAFT** с прежним историческим base `6ec6dd170c5250e5caed9f0739e03858a3b96a93`. Нельзя merge, Ready, rebase, retarget, force. Не изменены main, cms, workflows, production dependencies, Hostinger, DB или secrets.

**Последний подтверждённый кодовый контроль ДО этого обновления документации:** исследовательский SHA `49b7ea1820fc198f5d6158b6d71395a4b0fae015`, [GitHub Actions #39631680991](https://github.com/manufact-test/ai-site-cms/actions/runs/39631680991), **100 PASS / 0 FAIL / 0 BLOCKED**; source/scope CI успешно. CI доказал `INDEPENDENT_SECURITY_APACHE_LOOPBACK_SCOPE` с `actuallyExecutedLocalApacheHttp:true`, `originalServerPoliciesAttested:true`, `hostingerContacted:false`, `productionApproved:false`; original-main SHA, проверенный тем CI, `979a3795d6422c7067ba361dbbc4f9562955a9db`. Это выполненный **локальный Apache 2.4 HTTP опыт на runner**, НЕ живая конфигурация Hostinger. После документационных коммитов HEAD поменяется: получить точный финальный SHA из PR и убедиться в CI именно на нём.

**Два открытых для интегратора условных риска:** SEC-WEB-01 — в подставленной временной Apache public директории с настоящим исходным `.htaccess` искусственные `/.git/config` и `/.github/workflows/build.yml` выдавались HTTP 200; наличие подобных файлов на реальном сайте НЕ установлено. SEC-WEB-02 — оригинальный отдельный Hostinger-readonly `.htaccess` на локальном Apache дал `AH00670` и HTTP 403 даже для обычных маршрутов; это НЕ проверка LiteSpeed Hostinger. Два отдельно проверенных синтетических конфигурационных варианта не одобрены для production; первый может сломать `/.well-known`, второй меняет разрешения символьных ссылок.

Смотри [MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md](MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md), [APACHE-LOCAL-POLICY-REPRO-2026-10-21.md](APACHE-LOCAL-POLICY-REPRO-2026-10-21.md), [apache-original-policy-lab.py](apache-original-policy-lab.py). **Для главного чата** готов [MAIN-CHAT-MESSAGE-RU.md](MAIN-CHAT-MESSAGE-RU.md). Существующие 43 lock/OSV, physical PHP без Sodium + 78 исходников, 14 upstream Ed25519 negative checks, 60 реально подписанных chain cases, 102 CLI timings и static route proof сохранены как ограниченные исторические evidence.

**Stage2/production — NO_GO.** Нужны все 6 внешних подписей/решений: независимый PGP publisher key custody, qualified crypto, redistribution legal, разрешённые настоящие Hostinger web-SAPI/performance tests, main-integrator release integrity, product owner final GO. Зелёный CI ничего из этого не закрывает. Ограниченная самостоятельная инженерная работа готова к приёмке интегратором, не к выпуску.

---
# AI Site CMS — Independent Security Research — контрольная точка 21.10.2026

**ЭТО НЕ главная разработка CMS, не приемка Stage2 и не разрешение production.** Приоритетный актуальный источник наравне с NEXT-CHAT.md. Исторические review-файлы содержат факты прежних точек, не новые блокировки.

## Ветка, PR и доказанный кодовый HEAD

- GitHub: https://github.com/manufact-test/ai-site-cms
- Единственная рабочая ветка: **research/stage2-supply-chain-followup**.
- **PR #3 OPEN DRAFT**: https://github.com/manufact-test/ai-site-cms/pull/3; исходный base SHA **6ec6dd170c5250e5caed9f0739e03858a3b96a93**. НЕ merge, rebase, force, ready, retarget.
- Последний ПЕРЕД обновлением документов проверенный HEAD кода: **760310d7bdd34f1b0d90b1066734e3e1dcbeefed**. [GitHub Actions #39624610755](https://github.com/manufact-test/ai-site-cms/actions/runs/39624610755) / Security job **119306633510 SUCCESS, 97 PASS / 0 FAIL / 0 BLOCKED**. Это число строк suite, не 97 криптографических assertions.
- На кодовом HEAD **70/70 изменённых PR-файлов только в research/parallel-security/**. Этот handoff меняет SHA! В новом чате получить текущий PR HEAD и проверить его exact-head CI заново.
- Последний main, реально исследованный этим Security CI: **b3237fc2426ad246178b3fd4b64501c6b22c86ba**. Основной интегратор параллельно обновляет main, SHA может измениться.

## Действительно выполнено независимым исследованием

1. **43 pinned production packages**, 14 Composer + 29 npm. Настоящие frozen lock/manifests + Git blobs/SRI, 29 негативных source-swap checks; живой HTTPS OSV запрос на 43/43 версии с нулём известных advisory references **на момент проверки**, не гарантия отсутствия всех дефектов. OSV отчет SHA256 на #39624610755: **550b9be0178740af61ea74e5cc7043289f4b62f3c9dc87b3af4173de6182936c**.
2. **Реальный upstream paragonie/sodium_compat@2.5.2**: GitHub-verified annotated PGP tag, исходный commit **3246b36803c177847e677862fedeb7f937869adb**; 211 Git tree entries, 78 исходных файлов сверены по настоящим Git blob bytes, реальный ZIP SHA256 **53944302442e609c0443f680a6195f8d7467e3d0f0c4503e8a690fd9e7ee22f2**.
3. **Независимый физический PHP 8.3.6 без native Sodium**, собранный в disposable Linux GitHub runner из Ubuntu signed apt source. Настоящий isolated Composer install оригинальной библиотеки, scripts/plugins выключены; 78 Git source blobs и isolated lock сверены до и после. Две negative absent-mode, четыре genuine signed/RFC8032 proofs, 14 upstream v2.5.2 Ed25519 forgery/mixed-subgroup/fastMult/noncanonical boundary assertions. Installed source tree SHA256 **177a8e8fe65faa51e4eab61dd38e4be17c06b813d65850864156e540f54c987f**. НЕ Hostinger.
4. **Истинный current main original PHP source** проверяется независимым временным клоном и Git blob validation; пять оригинальных source verifier assertions и **60 настоящих native Ed25519 signed-chain tests**. Это не полная динамическая интеграционная проверка CMS.
5. **Реальное CPU/latency CLI сравнение**: 102 timed signed checks, 7 классов, 51 per backend. При валидной небольшой подписи наблюдали примерно 0,055–0,064 ms native и 42,84–45,29 ms pure PHP fallback, на ДВУХ разных сборках PHP 8.3; p95 при трёх больших samples не статистический p95. Модель 1/5/10/20/40 hypothetic checks/s считает только эквивалент последовательной вычислительной работы (например 0,85681 seconds per hypothetical 20 checks/s); **не измеренный CPU/worker count/HTTP throughput на Hostinger**. 39 anti-forgery model assertions PASS.
6. **Новый большой блок actual-main web/crypto surface audit**: original Git source checkout, 11 original critical Git blob files, PHP token_get_all без комментариев. На main SHA b3237f… найдена **одна** Slim GET /api/health route в HttpKernel; в отдельном Hostinger-readonly Stage2 preflight **семь** route path literals; в двух CLI release verifier scripts сохранено **два CLI-only ограничения**. Нет прямых текстовых ссылок на известные release Ed25519 классы в этих web entrypoints. Проверен синтаксический инвентарь cms/src на новые AppFactory и видимые $app->routes. **24 synthetic negative mutation scenarios PASS** (added/dynamic GET/POST, direct verifier, removed CLI guard, commented fake route). Важнейшее ограничение: это ТОЛЬКО static-source proof; он не доказывает все dynamic dispatch, Hostinger rewrite rules, подлинную публичную достижимость, отсутствие иных endpoint или реальную DoS уязвимость.
7. **Связанный машиночитаемый независимый review packet**: evidence-readiness-decision.mjs и review-handoff.mjs с детальными SHA и 6 пустыми external reviewer approvals; 37 readiness regression, 29 handoff adversarial, 12 offline partial-suite exit. Digest не независимая цифровая подпись.

## Шесть внешних согласований: ВСЕ остаются НЕ ПОЛУЧЕНЫ

- **PUBLISHER_KEY_CUSTODY:** independently authenticated owner of PGP full fingerprint 7F52D5C61D1255C731362E826B97A1C2826404DA, revocation/expiry, actual local GPG verification against independently trusted key. GitHub badge/publisher blog сами по себе не подтверждают custody.
- **QUALIFIED_CRYPTO_REVIEW:** независимый криптографический и CMS exact-source аудит, fallback attack surface, signature correctness, timing/DoS/fail-closed policy.
- **REDISTRIBUTION_LEGAL_REVIEW:** заключение по ISC/Apache NOTICE/commercial distribution для реальных locked packages and built artifacts; интегратор ранее исправил исходный Opis NOTICE issue.
- **TARGET_WEB_SAPI_PERFORMANCE:** разрешённые реальные Hostinger PHP/LiteSpeed/FPM, CPU/RAM/latency/concurrency/timeout и rollback tests; не выполнять из этого PR.
- **STAGE2_RELEASE_INTEGRITY:** проверка текущих main и готовых signed release permit/receipt/settlement/rotation gates, package bytes, interrupted rollback и deployment.
- **RELEASE_OWNER_DECISION:** формальное и датированное решение владельца для конкретных site, target, SHA.

**Последний research verdict: NO_GO**, strongResearchEvidence=true, incompleteIndependentGates=[], qualifiedSignoffs=false, targetHostApproved=false, productionApproved=false. Готовность технического Security Research примерно **98% инженерных исследований**, а НЕ 98% готовности всей CMS и не релизная готовность.

## Правила самостоятельной работы

Только research/parallel-security/ и комментарии PR #3. Никаких main/cms/workflows/dependency locks/other research/root docs/Hostinger/database/secrets/deploy. Большие автономные задачи и честная проверка exact SHA, CI, scope, source attestations. Документы обновлять на крупных checkpoint или **при просьбе пользователя о переходе**. Смотреть README.md, RUNBOOK.md, MAIN-WEB-CRYPTO-SURFACE-REVIEW.md, HOSTINGER-ED25519-OFFLINE-CAPACITY-PLAN.md, QUALIFIED-EXTERNAL-REVIEW-HANDOFF.md. Готовое новое сообщение — START-MESSAGE-RU.md.
