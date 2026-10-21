## ФИНАЛЬНАЯ ПЕРЕДАЧА SECURITY RESEARCH — 21.10.2026 (приоритет над историческими разделами ниже)

**НЕ основная разработка CMS.** Единственная разрешённая запись — `research/parallel-security/` плюс комментарии PR #3. PR #3 остаётся **OPEN DRAFT** с прежним историческим base `6ec6dd170c5250e5caed9f0739e03858a3b96a93`. Нельзя merge, Ready, rebase, retarget, force. Не изменены main, cms, workflows, production dependencies, Hostinger, DB или secrets.

**Последний подтверждённый кодовый контроль ДО этого обновления документации:** исследовательский SHA `49b7ea1820fc198f5d6158b6d71395a4b0fae015`, [GitHub Actions #39631680991](https://github.com/manufact-test/ai-site-cms/actions/runs/39631680991), **100 PASS / 0 FAIL / 0 BLOCKED**; source/scope CI успешно. CI доказал `INDEPENDENT_SECURITY_APACHE_LOOPBACK_SCOPE` с `actuallyExecutedLocalApacheHttp:true`, `originalServerPoliciesAttested:true`, `hostingerContacted:false`, `productionApproved:false`; original-main SHA, проверенный тем CI, `979a3795d6422c7067ba361dbbc4f9562955a9db`. Это выполненный **локальный Apache 2.4 HTTP опыт на runner**, НЕ живая конфигурация Hostinger. После документационных коммитов HEAD поменяется: получить точный финальный SHA из PR и убедиться в CI именно на нём.

**Два открытых для интегратора условных риска:** SEC-WEB-01 — в подставленной временной Apache public директории с настоящим исходным `.htaccess` искусственные `/.git/config` и `/.github/workflows/build.yml` выдавались HTTP 200; наличие подобных файлов на реальном сайте НЕ установлено. SEC-WEB-02 — оригинальный отдельный Hostinger-readonly `.htaccess` на локальном Apache дал `AH00670` и HTTP 403 даже для обычных маршрутов; это НЕ проверка LiteSpeed Hostinger. Два отдельно проверенных синтетических конфигурационных варианта не одобрены для production; первый может сломать `/.well-known`, второй меняет разрешения символьных ссылок.

Смотри [MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md](MAIN-INTEGRATOR-INTEGRATION-PACKET-2026-10-21.md), [APACHE-LOCAL-POLICY-REPRO-2026-10-21.md](APACHE-LOCAL-POLICY-REPRO-2026-10-21.md), [apache-original-policy-lab.py](apache-original-policy-lab.py). **Для главного чата** готов [MAIN-CHAT-MESSAGE-RU.md](MAIN-CHAT-MESSAGE-RU.md). Существующие 43 lock/OSV, physical PHP без Sodium + 78 исходников, 14 upstream Ed25519 negative checks, 60 реально подписанных chain cases, 102 CLI timings и static route proof сохранены как ограниченные исторические evidence.

**Stage2/production — NO_GO.** Нужны все 6 внешних подписей/решений: независимый PGP publisher key custody, qualified crypto, redistribution legal, разрешённые настоящие Hostinger web-SAPI/performance tests, main-integrator release integrity, product owner final GO. Зелёный CI ничего из этого не закрывает. Ограниченная самостоятельная инженерная работа готова к приёмке интегратором, не к выпуску.

---
# Apache 2.4.68 local policy reproduction — original `main` .htaccess Git blobs

**Research only, 21 October 2026. NO Hostinger, no external HTTP, no customer data.** This is a real local Apache 2.4.68 experiment with harmless synthetic files, not an observed live hosting vulnerability or production check. Current examined original `main` was `0e0cb7bbe06855073b975f2ce10f3817e25c776c`.

## Exact original policy source authenticity

Both policy files were reproduced byte-for-byte in an ephemeral directory. Before the local Apache test, the test copies' **Git blob SHA-1** values were independently recalculated with `SHA1("blob " + byteLength + NUL + exactBytes)`:

| Original checked-in policy file | Original main Git blob SHA | Local test Git blob SHA |
|---|---|---|
| `cms/public/.htaccess` | `bd73a9fddfb4ff793118974887b0eac36528cc44` | `bd73a9fddfb4ff793118974887b0eac36528cc44` |
| `cms/hosting/hostinger-readonly/.htaccess` | `9dcddcb6d2ee1cd265f795e88b9fe7f226fa2227` | `9dcddcb6d2ee1cd265f795e88b9fe7f226fa2227` |

No original file in the repository was modified, and no Git branch except the research branch was written. Apache `2.4.68 (Debian)`, locally bound to `127.0.0.1:18765`, `AllowOverride All`, `Require all granted`, `mod_dir` and `mod_rewrite` loaded, temporary DocumentRoot, `Options` restrictions taken from each real file. No mod_php / FPM / LiteSpeed was loaded; PHP execution was not tested.

## Observation A: `cms/public/.htaccess` does not categorically deny dot-directory contents

Harmless static marker files were artificially placed inside the temporary DocumentRoot at `/.git/config`, `/.github/workflows/run.yml`, `/.env` and `/secret.sql`. Exact original **public** policy:

| Request | Observed HTTP | Relevance |
|---|---:|---|
| `GET /.git/config` | **200**, marker body | `<FilesMatch "^\.">` alone did not block this child file of a dot-directory |
| `GET /.github/workflows/run.yml` | **200**, marker body | Same conditional dot-directory traversal exposure |
| `GET /.env` | **403** | Direct dotfile deny was active |
| `GET /secret.sql` | **403** | Sensitive file extension deny was active |
| `GET /private/info.txt` | **200** | Ordinary static file read as configured |

**Risk:** if the deployment accidentally ships `.git`, `.github`, or another dot-directory containing guessable regular files under `cms/public`, the observed original Apache rules alone may permit those contents. We have **not** found such files in an actual deployed public root. The integrator must verify the real package inventory excludes hidden directories and apply defense-in-depth denial for dot-directory paths in the target server policy, with regression checks for encoded/normalized URL paths.

## Observation B: Hostinger-readonly `Options -FollowSymLinks` conflicts with the rewrite rules on this Apache configuration

With the exact original **hostinger-readonly** file, all of the following returned HTTP **403**: `/.git/config`, `/.github/workflows/run.yml`, `/private/info.txt`, and `/random-missing-url`. This is **not** valid evidence that the configured deny rule worked: Apache's error log explicitly reported `AH00670`: `Options FollowSymLinks and SymLinksIfOwnerMatch are both off, so the RewriteRule directive is also forbidden`.

In a **separate synthetic local variant only**, changing the Options line from `-FollowSymLinks` to `-FollowSymLinks +SymLinksIfOwnerMatch` (while keeping other directives unchanged) produced `403` on both dot-directory paths and `200` on the ordinary `/private/info.txt` and non-file fallback URL. **This is a diagnostic experiment, NOT a recommended unreviewed production patch or proof of LiteSpeed behavior.** Integrator must determine the appropriate server-compatible non-symlink design, confirm behavior under real authorized LiteSpeed/Apache rules, and preserve strict filesystem isolation.

## Reproduction protocol and controls

1. Install Apache 2.4 with `mod_dir`, `mod_rewrite`, `mod_authz_core`, and explicitly allow overrides in an isolated, non-network-accessible test site. Our experiment listened on loopback only.
2. Create only harmless marker text files at `.git/config`, `.github/workflows/run.yml`, `.env`, `secret.sql`, `private/info.txt` beneath a temporary DocumentRoot; create a simple temporary `index.php` placeholder (no PHP interpreter required for file-disclosure checking).
3. Copy **byte-exact** `cms/public/.htaccess` from original Git; calculate the Git blob SHA above, start Apache, request the five marker URLs on loopback. Record both status and response body.
4. Stop Apache, copy **byte-exact** `cms/hosting/hostinger-readonly/.htaccess` from Git; calculate its Git blob SHA, restart Apache and inspect HTTP statuses *and ErrorLog for AH00670*. A blanket 403 with a configuration error is a **routing failure**, not a security success.
5. Only in a separate sandbox, test adjusted symlink options for contrast. Never apply this unreviewed change to `main` or Hostinger from this research branch.

## Integrator disposition required

**Finding A:** Condition-dependent **public artifact disclosure hazard** if dot-directory files are present. Verify actual shipped public inventory, add effective pathname-level dot-directory protection, and test failures on owner-approved staging. **Finding B:** **Availability/routing compatibility hazard** under Apache's documented rewrite preconditions; confirm actual LiteSpeed/Apache `Options`/rewrite behavior with approved target staging. No claim is made that either is exploitable or currently present in Hostinger. These are newly observed tests at one local Apache configuration; `NO_GO` and all six independent external approval gates remain unchanged.

These findings are not covered by a green static `.htaccess` text-contract row, which only detects changes to checked-in source. Never treat `200`, `403`, a direct-files deny check, or this local Apache runner as live Hostinger proof.
