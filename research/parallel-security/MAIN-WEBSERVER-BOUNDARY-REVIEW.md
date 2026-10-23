## ФИНАЛЬНАЯ ПЕРЕДАЧА SECURITY RESEARCH — 21.10.2026 (приоритет над историческими разделами ниже)

**НЕ основная разработка CMS.** Единственная разрешённая запись — `research/parallel-security/` плюс комментарии PR #3. PR #3 остаётся **OPEN DRAFT** с прежним историческим base `6ec6dd170c5250e5caed9f0739e03858a3b96a93`. Нельзя merge, Ready, rebase, retarget, force. Не изменены main, cms, workflows, production dependencies, Hostinger, DB или secrets.

**Последний подтверждённый кодовый контроль ДО этого обновления документации:** исследовательский SHA `49b7ea1820fc198f5d6158b6d71395a4b0fae015`, [GitHub Actions #39631680991](https://github.com/manufact-test/ai-site-cms/actions/runs/39631680991), **100 PASS / 0 FAIL / 0 BLOCKED**; source/scope CI успешно. CI доказал `INDEPENDENT_SECURITY_APACHE_LOOPBACK_SCOPE` с `actuallyExecutedLocalApacheHttp:true`, `originalServerPoliciesAttested:true`, `hostingerContacted:false`, `productionApproved:false`; original-main SHA, проверенный тем CI, `979a3795d6422c7067ba361dbbc4f9562955a9db`. Это выполненный **локальный Apache 2.4 HTTP опыт на runner**, НЕ живая конфигурация Hostinger. После документационных коммитов HEAD поменяется: получить точный финальный SHA из PR и убедиться в CI именно на нём.

**Два открытых для интегратора условных риска:** SEC-WEB-01 — в подставленной временной Apache public директории с настоящим исходным `.htaccess` искусственные `/.git/config` и `/.github/workflows/build.yml` выдавались HTTP 200; наличие подобных файлов на реальном сайте НЕ установлено. SEC-WEB-02 — оригинальный отдельный Hostinger-readonly `.htaccess` на локальном Apache дал `AH00670` и HTTP 403 даже для обычных маршрутов; это НЕ проверка LiteSpeed Hostinger. Два отдельно проверенных синтетических конфигурационных варианта не одобрены для production; первый может сломать `/.well-known`, второй меняет разрешения символьных ссылок.

Смотри [MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md](MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md), [APACHE-LOCAL-POLICY-REPRO-2026-10-21.md](APACHE-LOCAL-POLICY-REPRO-2026-10-21.md), [apache-original-policy-lab.py](apache-original-policy-lab.py). **Для главного чата** готов [MAIN-CHAT-MESSAGE-RU.md](MAIN-CHAT-MESSAGE-RU.md). Существующие 43 lock/OSV, physical PHP без Sodium + 78 исходников, 14 upstream Ed25519 negative checks, 60 реально подписанных chain cases, 102 CLI timings и static route proof сохранены как ограниченные исторические evidence.

**Stage2/production — NO_GO.** Нужны все 6 внешних подписей/решений: независимый PGP publisher key custody, qualified crypto, redistribution legal, разрешённые настоящие Hostinger web-SAPI/performance tests, main-integrator release integrity, product owner final GO. Зелёный CI ничего из этого не закрывает. Ограниченная самостоятельная инженерная работа готова к приёмке интегратором, не к выпуску.

---
> **New independently observed conditional risks:** the byte-exact original `cms/public/.htaccess` permitted `GET /.git/config` and `GET /.github/workflows/run.yml` (HTTP 200 on Apache 2.4.68 with synthetic harmless files). The byte-exact original Hostinger-readonly policy caused `AH00670` and blanket HTTP 403 for ordinary paths on this Apache setup because `RewriteRule` coexisted with both symlink-following Options disabled. These are local Apache findings, **NOT** an established deployed Hostinger vulnerability. See [APACHE-LOCAL-POLICY-REPRO-2026-10-21.md](APACHE-LOCAL-POLICY-REPRO-2026-10-21.md). A source-contract PASS does **not** mean effective dot-directory protection or functional rewriting. Both findings require main-integrator review and approved target tests.

# Independent Security Research: actual-main webserver policy source boundary

**21 October 2026.** Research PR #3 only. This is a STATIC exact-source contract, not a live Hostinger webserver test, penetration test, rewrite/denial proof, or production acceptance.

## Why this closes a meaningful evidence gap

The previous original-main source audit checked `cms/public/index.php`, the Slim health-only route, the separate Hostinger Stage2 readonly PHP front controller, and the offline verifier CLI guards. **It did not attest the original .htaccess policies in the same source path.** On LiteSpeed/Apache, wrong document roots, disabled overrides and loose extension handlers can invalidate a safe-looking PHP route analysis.

The new `main-webserver-boundary-proof.mjs` checks the **two distinct** actual-main files:

- `cms/public/.htaccess`: PHP public document-root configuration; keeps `Options -Indexes -MultiViews -FollowSymLinks -SymLinksIfOwnerMatch`, `DirectoryIndex index.php`, `FallbackResource /index.php`, and the explicit `FilesMatch` deny rules for dotfiles, non-front-controller PHP-like executables, and named sensitive extensions.
- `cms/hosting/hostinger-readonly/.htaccess`: **separate** Stage2 read-only preflight deployment root, not a CMS production root; keeps `Options -Indexes -MultiViews -FollowSymLinks`, `DirectoryIndex index.php`, the specified `FilesMatch` denies, and the exact `RewriteEngine/RewriteRule/RewriteCond` chain including dotpath rejection and the non-file / non-directory front-controller routing conditions.

It **intentionally** uses an exact active-directive allowlist, rather than an optimistic heuristic that would accept new handler or access-control directives. Standalone comments and blank lines do not provide evidence of active security protection. Any actual policy drift causes an explicit review failure, even if it might be a benign improvement: update the research contract only after inspecting new original-main Git blobs and understanding the server implications. This is source-change detection, not webserver-rule equivalence checking.

## Original-source provenance and actual test chain

The existing `main-head-independent-proof.mjs` clones the true current `main` to a temporary external folder, pins its observed HEAD, and validates all critical original Git blobs. It now additionally verifies both `.htaccess` Git blob bytes, excludes symlinks/hardlinks, overlays only the research-only checker into the disposable checkout, demands its final explicit marker and parses its fail-closed JSON. The existing original-source and 60 genuinely signed chain proofs still run and the original main HEAD is checked again before completion.

The dedicated `--self-test` mode supplies **synthetic** configurations and rejects attempted enabling of Indexes, granting file access, changing front controller, removing a deny block, adding an executable handler, or changing rewrite/fallback rules; comment-only lures cannot masquerade as active rules. These mutation checks are regressions of the checker, **not** observations of original `main` or actual LiteSpeed/Apache semantics. The complete Security suite records separate source and mutation rows, failing closed on real source drift.

## What the integrator must still verify on authorized infrastructure

1. Record the target site, deployed document root, original `main` SHA, exact package inventory and hashes, PHP SAPI/handler and `AllowOverride` or LiteSpeed equivalent. Check that the private vendor and offweb package are **outside** the actual HTTP document root.
2. With explicit owner authorization on dedicated staging, test benign and forbidden URLs and allowed HTTP methods across both **separate** sites and canonical/encoded paths; assert observed denial of dotfiles, PHP-like extra executables, sensitive file extensions, directories, trailing paths and potentially executable alternate handlers. Keep customer data and secrets out of tests.
3. Verify effective rewrite modules, fallback, location-level overrides, path normalization and file handler mapping. `.htaccess` source correctness does not mean the live server loads or honors the file.
4. Review *all actual shipped public-root file names* and server MIME/handler associations; the rules are denylist patterns, not an exhaustive allowlist. Confirm package cannot expose secrets, archive sources, alternate `php7/php8` extensions, backups, or unintended static assets through misconfiguration.
5. Only the integration/release owner can accept target-host findings, rollback evidence and the six independent external signoffs. A green research CI cannot issue GO.

## Non-claims / remaining risk

**No live Hostinger contact was made.** This proves only that both exact checked-in policy files were observed on a Git-verified original-main source snapshot and matched the research-reviewed text. It does not prove document-root mapping, physical deployment, Apache module availability, `AllowOverride`, LiteSpeed compatibility, non-disclosure of extra public files, interpretation of `FilesMatch`/rewrite directives, dynamic PHP reachability, Ed25519 HTTP exposure, rate limits, or actual DoS safety. Stage2/production remains **NO_GO**; external cryptography, legal, key-custody, target-host, integrator and release-owner approvals remain outstanding.

Run offline mutation checking: `node research/parallel-security/main-webserver-boundary-proof.mjs --self-test`. The original source check is part of the `main-head-independent-proof.mjs` live-source task and the actual exact-head Security CI (never substitute synthetic files for the Git clone).
