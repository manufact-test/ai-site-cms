# Текст для главного чата AI Site CMS — независимый Security Research

Привет! Передаю результаты отдельного **AI Site CMS — Security & Dependencies Research**. Инженерный пакет исследования подготовлен к интеграционной приёмке, **но это не разрешение Stage 2 / production**.

**Репозиторий:** https://github.com/manufact-test/ai-site-cms
**Ветка:** `research/stage2-supply-chain-followup`
**PR #3:** https://github.com/manufact-test/ai-site-cms/pull/3 — **OPEN DRAFT**; исходный base SHA `6ec6dd170c5250e5caed9f0739e03858a3b96a93` исторический. **Не делай автоматический merge/rebase/Ready/retarget**; main развивается отдельно. Исследователь менял только `research/parallel-security/` и комментарии PR.

Последняя подтверждённая кодовая точка ДО заключительной документации: research SHA `49b7ea1820fc198f5d6158b6d71395a4b0fae015`, GitHub Actions https://github.com/manufact-test/ai-site-cms/actions/runs/39631680991 — **100 PASS / 0 FAIL / 0 BLOCKED**. Проверь финальный doc-HEAD, точный CI и разрешённый scope заново: SHA после документации меняется.

Сделано: реальные 43 Composer/npm pinned dependency source проверки и point-in-time live OSV 43/43 без известного advisory; подлинный `sodium_compat 2.5.2` из оригинальных 78 Git blobs на независимо собранном PHP8.3 без native Sodium и 14 security-boundary checks; оригинальный actual-main PHP source gate и 60 genuine signed-chain tests; 102 реальных CLI Ed25519 замеров и строго математическая host-НЕ-валидированная capacity модель; web source census (один Slim GET `/api/health`, 7 отдельных Hostinger readonly paths, 2 CLI guards); две original `.htaccess` конфигурации с Git blob source proof; 25 синтетических мутаций и **реально выполненный в CI локальный Apache 2.4 HTTP-тест**, `actuallyExecutedLocalApacheHttp:true` на main `979a3795d6422c7067ba361dbbc4f9562955a9db`.

**SEC-WEB-01 (условный риск):** byte-exact original `cms/public/.htaccess` на локальном Apache разрешил HTTP 200 для подставленных синтетических `/.git/config`, `/.github/workflows/build.yml`; прямые `/.env` и `/secret.sql` запрещены 403. Это не доказывает наличия приватных файлов в реальном public-root. Требуется проверка фактического package inventory, эффективный dot-directory deny на целевом сервере, позитивные и негативные HTTP URL tests. Исследовательский вариант `RedirectMatch 403` локально работал, но требует оценки модуля и `/.well-known` — не копировать автоматически.

**SEC-WEB-02 (условная поломка маршрутизации):** byte-exact original `cms/hosting/hostinger-readonly/.htaccess` на том же локальном Apache выдал ошибку `AH00670` и HTTP 403 даже на разрешённых URL из-за конфликта RewriteRule и выключенных symlink Options. Отдельный синтетический вариант с `+SymLinksIfOwnerMatch` восстановил маршрутизацию, однако изменяет модель безопасности ссылок и НЕ утверждён как production patch. Проверяй настоящий LiteSpeed/Apache, AllowOverride, пути и symlink isolation.

**Твоя следующая задача как главного интегратора:** прочитать `research/parallel-security/MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md`, `APACHE-LOCAL-POLICY-REPRO-2026-10-21.md` и `CURRENT-CHECKPOINT-2026-10-21.md`. При необходимости внести исправления **самостоятельно в main** с собственными review/CI; затем по письменному разрешению владельца выполнить именно реальные Hostinger staging HTTP/PHP-SAPI/ограниченные нагрузочные и rollback tests. Никогда не принимать blanket 403 за доказательство безопасности и не ослаблять symlink controls без анализа.

**Сохраняется NO_GO:** 6 внешних неподтверждённых согласований — publisher PGP key custody; qualified crypto/security; redistribution licensing/NOTICE legal; target Hostinger web-SAPI/performance; integrator release integrity/rollback; финальный владелец продукта. Зелёный CI и локальный Apache тест — не замена этих решений.

**Просьба:** не сливай PR #3 автоматически. Это технический пакет для review и аккуратного выборочного переноса проверенных выводов, а не разрешённое обновление production.
