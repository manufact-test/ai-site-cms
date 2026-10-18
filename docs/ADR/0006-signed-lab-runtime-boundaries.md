# ADR 0006 — Keep signed release verification and real HTTP startup rehearsal isolated

**Status:** Accepted as Stage2 *laboratory architecture* on 18.10.2026; **not** accepted as a production deployment procedure.

## Decision

Stage2 will distinguish a signed **code-only offline candidate**, an **out-of-band enrolled public-key trust root**, a checked immutable release slot, a **local operator journal and monotonic watermark**, a read-only integrity gate, and an explicitly restarted PHP runtime. Tests run only in disposable OS-temp directories and CI. Neither code-switch nor HTTP gate automatically migrates/repairs databases, overwrites host files or accesses a customer website.

Use atomic OS-local lock directories to serialize test operators, fail closed for suspicious or stale locks, and require an explicit operator recovery action after interrupted writes. Compare expected generation to block races and repeated upgrades; allow explicit verified rollback only to a lower immediate predecessor while retaining the highest-ever watermark.

For realistic protocol evidence, launch actual PHP built-in HTTP on **127.0.0.1** after a complete code inventory check. A separate **localhost-only** test facade forwards only `GET /api/health`, checks integrity per request and pins the selected generation. Restart explicitly after upgrade/rollback; never automatically switch an already running PHP listener.

## Rationale and trade-offs

- Decouples browser/public-site runtime from administrative code while making negative tests possible without touching real infrastructure.
- Demonstrates actual PHP 200/404/503 behavior, signed-package inventory evidence, crash-recovery boundaries and refusal semantics.
- Keeps complexity low during Stage2 by not introducing a production installer, key registry, database rollback or reconfiguring a client's web server.

## Safety limitations / future design obligations

- Disposable in-memory Ed25519 private keys are **not** a production publisher signing authority, and local JSON policy/receipts are not tamper-resistant.
- PHP's private test server remains reachable by other programs on localhost. A Node facade cannot protect a hostile same-machine process, nor eliminate filesystem mutation between verification and execution. Do not ship this launcher to live hosting as a security gateway.
- The existing main PHP `public/index.php` has **not** been rewired to this Node gate. Ordinary shared hosting may not run Node; production must be designed around real PHP/FPM/Apache constraints and explicitly tested with authorization.
- No site content or user-edited data exists in this stage; code rollback **is not** full-site rollback or proof of zero downtime.
- Further tasks require real key lifecycle/attestations, hosting-specific preflight, safe release directories and data-aware backups after relevant stages.

**Evidence:** [Detailed report](../STAGE-2-SIGNED-RELEASE-GATED-HTTP.md), [editor/HTTP CI 1/1 PASS](https://github.com/manufact-test/ai-site-cms/actions/runs/39140562222), [PHP/MySQL/SQLite CI 7/7 PASS](https://github.com/manufact-test/ai-site-cms/actions/runs/39140562272). **Stage2 NOT accepted; Stage3 not started; 0/135 product criteria accepted.**
