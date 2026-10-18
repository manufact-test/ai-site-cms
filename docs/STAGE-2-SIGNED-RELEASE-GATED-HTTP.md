# AI Site CMS — Stage 2 signed package, operator recovery and loopback HTTP rehearsal

**Checkpoint:** v1.38 · **Date:** 2026-10-18 · **Stage 2 IN PROGRESS, NOT ACCEPTED.** Stage 0/1 accepted; Stage 3 not started; **0/135 mandatory product criteria accepted**. This is evidence for an **empty-CMS code-only internal laboratory**, not permission for production deployment.

## Verified implementation

1. **Detached release signature (disposable CI only):** `cms/tools/lab-signed-offline-release.cjs` generates and verifies Ed25519 detached envelope; a trusted Ed25519 public key must be provided out of band. CI private keys are ephemeral and are **not publisher keys**. Archive digest, expected version, signed manifest digest and key fingerprint are checked. Cryptographic integrity alone is not a production trust chain.
2. **Restricted archive:** `cms/tools/safe-offline-archive.py` rejects traversal, absolute/Windows path tricks, symlinks/nonregular nodes, duplicates/case collisions, oversize members, high compression ratios and unlisted files. Extracts only inside a fresh disposable directory; independent inventory verification follows. Neither installer nor shared-host extraction is implemented.
3. **Immutable code slots:** `lab-versioned-rollout.cjs` stages code in versioned OS-temp directories. Each activation verifies inventory and uses an expected-current pointer. Operator and activation locks use atomic local directory creation. Stale locks cause refusal, never a timed forced takeover. The test directory is not a real document root and does not represent a live site/data deployment.
4. **Anti-replay journal:** `lab-operator-guard.cjs` pins a public key identity, keeps highest-ever release watermark and per-version signed-manifest receipts, and rejects reinstallation/downgrades including a previous bypass through the rollback path. Explicit rollback is limited to the immediate older, verified version; watermark remains unchanged. Power loss is simulated at intent, pointer and policy-commit boundaries, with explicit abort/finalize, never silent repair. Ordinary local files are NOT tamper-resistant storage and do not prove cross-host consistency.
5. **Read-only startup gate:** `lab-startup-integrity-gate.cjs` compares policy, pointer, lock/journal status, all packaged files and signed receipt before allowing a lab release. Missing entrypoint/asset/slot, modified manifest, dangling links or inconsistent state fail closed. Advises on a valid previous version, but never performs a rollback on its own. It is a point-in-time check, NOT installed as the PHP production bootstrap.
6. **Real PHP loopback rehearsal:** `lab-verified-http-rehearsal.cjs` starts a real `php -S 127.0.0.1` only after the read-only gate accepts a signed code slot. A separate loopback-only Node facade serves solely `GET /api/health`, rechecks the release before and after the PHP response, and rejects write/admin/private routes. It pins version and sequence; upgrade/rollback requires stop + explicit restart. Damage during runtime yields HTTP 503. The private PHP child **also listens on localhost**, so this is not a secure network boundary against other local processes. There remains a filesystem time-of-check/use race; this must NOT be promoted to production.

## GitHub Actions evidence (all on main, 18 October 2026)

- Signed archive and adversarial ZIP: **33** assertions.
- Operator replay, crash journal and manual recovery: **41** checks.
- Cross-process exclusive update locks and hostile filesystem: **31** assertions.
- Read-only startup integrity with missing files and recovery: **87** assertions.
- **NEW** real PHP loopback startup, health, missing files, blocked paths, interrupted update, restart and manual rollback: **69** checks.
- Existing package integrity **25**, versioned rollout **24**, Chromium integration **12**; existing SQLite + real isolated MySQL8.4 + PHP 8.1–8.4 suites still green.
- [Stage2 editor/security/HTTP CI #39140562222](https://github.com/manufact-test/ai-site-cms/actions/runs/39140562222) **1/1 SUCCESS** and [PHP/storage CI #39140562272](https://github.com/manufact-test/ai-site-cms/actions/runs/39140562272) **7/7 SUCCESS**. New HTTP implementation [commit 253bd5ac](https://github.com/manufact-test/ai-site-cms/commit/253bd5ac656a9e8d2a23fe69bc0a3169139c42c4).

## What these tests categorically do NOT prove

- **Not deployed:** no real Hostinger inspection, credentials, DNS, Apache rewrite/FPM, real TLS, permissions, or production HTTP gate. Hostinger needs **separate express permission even for read-only inspection**, another permission for an actual deployment.
- **No live data recovery:** no CMS content/media/revision storage, backups or production database migration/rollback. `FoundationSnapshot` still transfers only empty-CMS site ID/schema version/storage generation into clean disposable DBs.
- **No product admin/AI contract:** no authenticated editing, RBAC, publish, website adapters, production login, sessions, CSRF or real websites tested.
- **No production publisher signing:** ephemeral CI Ed25519 keys, no key custody, rotation/revocation/retention, authenticated CI artifact attestation, hardware root of trust or audited deployment procedure.
- **No security claim against hostile same-user/root processes:** localhost private PHP listener is locally reachable; mutable filesystem and TOCTOU remain. This is a rehearsal of failure/refusal logic, not an enforcement mechanism at a real hosting perimeter.
- Still **193 requirements = 135 mandatory, 42 desirable, 16 excluded; 0/135 mandatory product accepted; no MVP**, Stage2 not accepted.

## Next Stage 2 tranche

Design a real-host-compatible, explicitly authorized deployment preflight and **separate operator-controlled installer/rollback policy**, including trust-root management and file/data consistency. Plan Apache/FPM-safe public/private boundaries and persistent backup strategy when product entities exist. Do not contact Hostinger/CELIKOM/clients, deploy, or merge `research/stage1-editor-comparison` without explicit authorization. Continue batching docs only at major milestones.
