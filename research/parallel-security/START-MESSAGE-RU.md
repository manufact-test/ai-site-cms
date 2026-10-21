Привет! Продолжаем независимую исследовательскую разработку **AI Site CMS — Security & Dependencies Research** (НЕ главный разработчик CMS).

**GitHub:** https://github.com/manufact-test/ai-site-cms
**Единственная рабочая ветка:** research/stage2-supply-chain-followup
**PR #3:** https://github.com/manufact-test/ai-site-cms/pull/3 — OPEN DRAFT, НЕ merge/ready/rebase/force/retarget. Original base SHA 6ec6dd170c5250e5caed9f0739e03858a3b96a93.
**ПРАВА НА ИЗМЕНЕНИЯ:** строго research/parallel-security/ и комментарии PR #3. Запрещено изменять main, cms/, .github/workflows/, зависимости/locks, чужие ветки и разделы, root docs, Hostinger, деплой, MySQL, secrets.

**ОБЯЗАТЕЛЬНО ПЕРВЫМ ДЕЛОМ подключись к GitHub и прочитай:**
1. research/parallel-security/NEXT-CHAT.md
2. research/parallel-security/CURRENT-CHECKPOINT-2026-10-21.md
3. research/parallel-security/README.md и RUNBOOK.md
4. research/parallel-security/MAIN-WEB-CRYPTO-SURFACE-REVIEW.md
5. research/parallel-security/HOSTINGER-ED25519-OFFLINE-CAPACITY-PLAN.md
6. research/parallel-security/QUALIFIED-EXTERNAL-REVIEW-HANDOFF.md
7. Последние комментарии PR #3, актуальный PR HEAD, действительную базу/draft/state, exact-head CI job logs, filenames scope и актуальный main SHA.

**Последний доказанный КОДОВЫЙ HEAD ПЕРЕД ОБНОВЛЕНИЕМ HANDOFF:** 760310d7bdd34f1b0d90b1066734e3e1dcbeefed. GitHub Actions https://github.com/manufact-test/ai-site-cms/actions/runs/39624610755 — SUCCESS **97 PASS / 0 FAIL / 0 BLOCKED**, security job 119306633510. Там было 70/70 изменённых файлов строго в исследовательской папке. **Теперь выполнен документальный commit и HEAD мог измениться — обязательно получить новый SHA и проверить именно его CI, нельзя заявлять устаревшие 97/0/0 как доказанный текущий результат.**

**Что сделано:** 43 точных Composer/npm pinned packages и живой OSV 43/43, 0 известных advisory на момент проверки; GitHub upstream PGP signed annotated tag sodium_compat v2.5.2 и настоящий ZIP exact 78 Git blobs; отдельный оригинальный PHP8.3.6 physical no-Sodium с реальной Composer-installed vetted source pre/post crypto; настоящие Ed25519 signature/regression tests и 14 upstream adversarial assertions; оригинальный current-main PHP source + 60 signed native class-chain proofs. Настоящие 102 CLI signed performance samples: чистый PHP Ed25519 fallback обычно ~43–45 мс против ~0,06 мс native, но НЕ Hostinger CPU, HTTP или DoS. Математический bounded workload what-if — только теоретическое serial busy time.

**НОВЫЙ БОЛЬШОЙ БЛОК:** анализ настоящего original main через Git blobs и PHP token_get_all: на main SHA b3237fc2426ad246178b3fd4b64501c6b22c86ba зафиксирован один GET /api/health Slim route, семь Stage2 readonly Hostinger path comparisons, два CLI verifier guards и отсутствие прямых лексических Ed25519 release class references в проверенных web entrypoints. 24 отрицательных synthetic regression PASS. ЭТО НЕ полный dynamic callgraph и НЕ проверка реального сервера.

**Состояние:** research-ready-for-external-review, но Stage2/production **NO_GO**. Шесть нерешённых независимых signoffs: владелец upstream PGP ключа/custody, экспертный crypto audit, ISC/NOTICE юридическая оценка, авторизованные тесты Hostinger PHP web-SAPI CPU/latency/concurrency, интеграторское release-signature/rollback подтверждение и финальное решение владельца. Отсутствующие expert/host gates никогда не превращать в PASS потому, что CI зелёный. ~98% — оценка исключительно инженерной части отдельного исследования, НЕ готовность AI Site CMS.

**Работай самостоятельно крупными пакетами**, затем проверяй точный HEAD/CI/scope/proofs и оставляй связный handoff-комментарий главному интегратору в PR #3. Не проси меня переносить файлы и не обновляй каждый раз все документы — обновляй их по моей просьбе о переходе или большой контрольной точке. НЕ сливай PR. Следующий полезный шаг — сверка нового latest main HTTP/crypto scope и подготовка настоящих внешних reviewer/Hostinger acceptance без симуляции их подписей.
