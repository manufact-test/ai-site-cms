# AI Site CMS — Security & Dependencies Research: NEXT CHAT

**21 октября 2026. Главная и единственная передача независимой security-ветки.** Внимательно читать CURRENT-CHECKPOINT-2026-10-21.md. Это НЕ main CMS development.

## Вход и GitHub

Репозиторий: https://github.com/manufact-test/ai-site-cms
Ветка: **research/stage2-supply-chain-followup**
PR #3: https://github.com/manufact-test/ai-site-cms/pull/3 — **OPEN DRAFT**, original base **6ec6dd170c5250e5caed9f0739e03858a3b96a93**, не сливать, не Ready, не rebase, не retarget и не force. Ни один другой PR не принадлежит нашему исследовательскому потоку.

**Допустимые действия:** читать main и research, писать ТОЛЬКО в research/parallel-security/, комментировать PR #3. **Недопустимо:** изменять main, cms/, .github/workflows/, lockfile, root docs, другие research folders, Hostinger, базу, секреты, deploy.

**Последняя точная КОДОВАЯ проверка ДО handoff-doc изменений:** HEAD **760310d7bdd34f1b0d90b1066734e3e1dcbeefed**, Actions https://github.com/manufact-test/ai-site-cms/actions/runs/39624610755 — Security job **119306633510**, **SUCCESS 97 PASS / 0 FAIL / 0 BLOCKED**, original PR changed scope тогда 70/70 внутри research/parallel-security/. **НЕ считать SHA и 97/0/0 актуальными для документального HEAD! Первым действием fetch PR head/base/draft/state + latest exact-head CI и по журналу убедиться, что все proof rows проходят.**

## Читать в следующем чате (по порядку)

1. NEXT-CHAT.md
2. CURRENT-CHECKPOINT-2026-10-21.md
3. README.md
4. RUNBOOK.md
5. MAIN-WEB-CRYPTO-SURFACE-REVIEW.md
6. HOSTINGER-ED25519-OFFLINE-CAPACITY-PLAN.md
7. QUALIFIED-EXTERNAL-REVIEW-HANDOFF.md
8. Последние PR #3 комментарии, GitHub Actions exact current HEAD, original current main SHA, список changed-file scope.

## Достижения: подлинные evidence, а не имитация

- 43 original pinned Composer/npm packages, frozen lock source SHA/Git blob, live OSV 43/43 zero **known advisories AT SCAN TIME**.
- Upstream exact sodium_compat 2.5.2 PGP-annotated GitHub tag, real ZIP SHA256 **53944302442e609c0443f680a6195f8d7467e3d0f0c4503e8a690fd9e7ee22f2**, exact pinned commit 3246b36803c177847e677862fedeb7f937869adb, 78 Git blob files. Our independent Linux CI physically compiles PHP 8.3.6 WITHOUT Sodium, Composer installs original vetted source isolated, checks 78 files and lock pre/post, executes four signed backend fixture groups and 14 upstream crypto security assertions.
- Independent true latest-main original PHP verifiers + 60 signed native Ed25519 chain cases. Latest original main SHA seen by verified #39624610755: **b3237fc2426ad246178b3fd4b64501c6b22c86ba** (could change).
- Real CLI native vs pure-PHP signed 102 timed verifications, seven scenarios. Fallback generally ~43–45ms vs native ~0.06ms for valid/tampered-message/signature; **GitHub runner, NOT target Hostinger web-SAPI**. Math-only hypothetical 1/5/10/20/40 checks/s model, 39 adversarial tests, no real Hostinger RPS/worker measurement.
- **New real code security task:** PHP tokenized original-main web entrypoint/CLI route census with Git blob verified sources. At current-main tested SHA: one Slim GET /api/health, seven Stage2 Hostinger-readonly compared URL paths, two offline verifier CLI guards, no direct release Ed25519 class tokens in web entrypoints. Synthetic 24 mutation regressions. **DO NOT declare no dynamic reachable cryptography or safe Hostinger just from static tokens**.
- Consistent machine-reviewed NO_GO research dossier and 29 adversarial reviewer handoff cases; 37 readiness and 12 incomplete source exit regressions. Cryptographic/security expert signatures are NOT simulated.

## Что реально осталось

Собственные technical source/OSV/crypto test gates в exact code CI 97/0/0 не blocked. Но **шесть внешних решений** ещё не выполнены: out-of-band key custody of upstream PGP, qualified cryptography audit, qualified ISC/Apache NOTICE/commercial redistribution review, authorized Hostinger LiteSpeed/FPM actual web SAPI + concurrency/latency/CPU, main integration/release evidence owner, final explicit product owner GO. **Stage2/production NO_GO** до всех независимых решений. Прогресс ~98% — только инженерная часть отдельного research, не готовность CMS.

## Продолжение работы

Пользователь просит крупную автономную задачу за проход, полноценный новый real CI, затем короткий отчёт с точным SHA и PR handoff comment. Не повторять уточняющие вопросы без нужды. Не менять docs на каждой мелочи, только по запросу о переходе (нынешний пользователь такой запрос дал) или большой контрольной точке. Новый чат должен ПЕРВЫМ ШАГОМ подтвердить настоящий doc-HEAD и CI, затем сверить original актуальный main; при новой полезной security задаче не имитировать Hostinger, юридические/PGP и crypto expert approval. NEXT CHAT стартовый текст — START-MESSAGE-RU.md.
