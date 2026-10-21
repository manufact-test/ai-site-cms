Привет! Продолжаем независимую исследовательскую разработку **AI Site CMS — Security & Dependencies Research**.

**GitHub:** https://github.com/manufact-test/ai-site-cms
**Единственная рабочая ветка:** `research/stage2-supply-chain-followup`
**PR #3:** https://github.com/manufact-test/ai-site-cms/pull/3 — OPEN DRAFT, не сливать, не менять базу/статус и не делать rebase.
**Разрешённые изменения:** строго `research/parallel-security/`; изменения `main`, CMS, workflow, чужих направлений, зависимостей, секретов, БД или Hostinger запрещены.

**ОБЯЗАТЕЛЬНО СНАЧАЛА подключись к GitHub и прочитай:**
1. `research/parallel-security/NEXT-CHAT.md`
2. `research/parallel-security/CURRENT-CHECKPOINT-2026-10-21.md`
3. `research/parallel-security/README.md`
4. `research/parallel-security/RUNBOOK.md`
5. Последние комментарии PR #3, актуальный `main`, точный HEAD PR #3 и CI именно этого HEAD.

**Последний доказанный кодовый чекпоинт ДО обновления handoff-документов:** `f55e87abf8a75b9b8d2519577c6ffece29f140fe`. GitHub Actions https://github.com/manufact-test/ai-site-cms/actions/runs/39588010610 — SUCCESS, **76 PASS, 0 FAIL, 4 BLOCKED**, решение выпуска **NO_GO**. Handoff-коммит продвинул HEAD: получить актуальный точный SHA через GitHub и проверить соответствующий CI; не полагаться на старый SHA.

**Ключевые факты:** живой OSV уже реально проверил 43/43 pinned Composer/npm версий, сообщил 0 advisory на момент проверки; реальный GitHub ZIP `sodium_compat v2.5.2` уже получен и все **78 файлов** совпали с Git tree источником подписанного upstream тега; отдельный main CI интегратора успешно проверил физический PHP 8.3.6 без Sodium (33 signed-chain, 55 rotation). В нашем CI native signed matrix/второй shim маршрут проверялись отдельно. Новая проверка `evidence-readiness-decision.mjs` запрещает выдавать зелёные исследования за разрешение на выпуск; 37 негативных регрессий прошли.

**Открыто в нашем CI:** `source:common-ed25519-backend`, `native:forced-class-signed-chain` (исторический PR base, актуальное `main` не подхвачено), `no-sodium:cryptography`, `compat:cryptography` (наше отдельное genuine no-native runtime + installed-source pre/post attestation). Отдельно нужны PGP signer ownership/crypto и ISC/NOTICE/legal-review, тестирование целевого Hostinger и одобрение интегратора. **Stage2 и production НЕ одобрены**. PR оставлять DRAFT.

Работай **автономно большими пакетами**, делай полноценную полезную задачу, самостоятельно сохраняй код в GitHub и сверяй exact-head CI, changed-file scope и фактические proof-маркеры. Не дели работу на микроэтапы, не спрашивай мелкие разрешения. Говори только то, что реально проверено. После большого блока оставляй отчёт для главного интегратора комментарием в PR #3. **NEXT-CHAT обновлять только когда я попрошу о новом переходе.**

**Следующий приоритет:** независимое тестирование реально установленного `sodium_compat` по Git blob + полному pre/post источнику в физически no-Sodium PHP либо другая существенная реальная security задача в разрешённой папке. Никаких изменений основной CMS и никакого автоматического merge.
