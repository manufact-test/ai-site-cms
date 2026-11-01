# CMS Engine Update & Rollback — design checkpoint

**Date:** 2026-11-01  
**Status:** architecture decision for the next isolated engineering macroblock; not implemented, not production-approved, and not owner acceptance.  
**Branch:** `feature/stage3-ai-site-contract`  
**Audited source:** functional `19a74e77c1acdfb43a7b3840f8e05bd10f2b0427`; documentation HEAD at audit time `84181c1506c47e965685c9af3717990a933b9b11`.  
**Exact existing full CI:** [#41302974827](https://github.com/manufact-test/ai-site-cms/actions/runs/41302974827), both jobs SUCCESS on the functional SHA.

## 1. Product boundary

This work is requirements **#184 (independent CMS engine update)** and **#185 (CMS engine rollback)**. It is not D2/D3:

- D2/D3 version and rollback visitor-site releases. They must remain independent.
- #184–185 change the code running the CMS/Studio itself.
- #183 (simple initial installation on ordinary shared hosting) remains a separate workstream. Do not disguise a CLI installer as a guided setup or bundle an unsafe public installer into the updater.

The updater must not modify the published visitor-site release, site content, customer data or delivery settings merely to change CMS code.

## 2. Verified current state

### Stage3 packaging

`stage3/bin/cms-release.cjs` already builds and verifies offline CMS engine directories with `full` and `php-host` profiles. The PHP-host profile includes the Stage3 server, Studio assets, components and media-motion runtime. The builder rejects symlinks/special files, applies an extension/name policy, caps inventory at 2,000 files / 60 MB, records exact file SHA-256 values and compares two verified packages.

It is **not an updater**:

- `cms-release.json` is an unsigned integrity inventory. The source explicitly says a hash inventory is not a signature or owner approval.
- The manifest currently has no engine version, PHP compatibility, schema compatibility or migration contract.
- There is no signed release verification, private staging, active engine pointer, activation, rollback or recovery command.
- `compare` explicitly leaves DB compatibility unchecked and says that retaining the old package does not imply DB rollback.

### Stage3 installation and database

- `stage3/server/bin/install.php` is CLI-only and returns 404 over HTTP.
- `Stage3Installer::SCHEMA_VERSION` is currently 1.
- The installer checks 25 required Stage3 tables and writes the private installation receipt/config outside the public document root.
- `SiteRepository::initializeEmptyDatabase()` creates the initial schema. There is no Stage3 versioned migration journal or Stage3 migration runner in the current runtime.
- `RuntimeConfig` stores eight private environment values and loads them from a private config pointer. There is no engine trust anchor or engine-version state yet.
- The current front controller directly requires `stage3/server/bootstrap.php`. `Api` serves Studio and media-motion assets relative to its own server directory; a versioned runtime must preserve those relative paths.

### Existing signed-upgrade lab

The old `cms/src/Release/Lab*` work is substantial research, but explicitly Stage2/CI-only:

- `OfflineReleaseVerifier` verifies a detached Ed25519 signature and a signed archive/manifest binding. It is read-only; it does not extract or install.
- `TrustedChainVerifier` validates a signed publisher-key succession chain and external epoch checkpoint.
- `LabPackageStager` verifies an already-extracted Stage2 package and stages it under a fresh OS-temp directory. It does not extract archives or target a real application root.
- `LabPhpGenerationSwitcher` provides immutable generation registration, CAS sequence/pointer switching, request leases, an exclusive operator lock, journal states and explicit recovery. Its root is restricted to OS temp; it does not switch a real document root, configure PHP-FPM/OPcache or prove shared-host behavior.
- `LabSchemaVersionGate` checks the older CMS foundation schema v2 and uses a cooperative MySQL named lock / SQLite transaction. It does not run migrations, snapshot or restore application data. Its schema is not the Stage3 schema.
- `LabTrustedUpgradeCoordinator` composes signed archive verification, package inventory, DB checkpoint, staging and generation switching. It returns `productionReady=false`, `sharedHostVerified=false`, `siteDataMigrated=false` and `powerLossProven=false`.
- `LabPreauthorizedUpgradeGate`, `LabAttestedActivationGate` and `LabSettledUpgradeGate` add operator-signed preapproval, external receipt/settlement chains and anti-replay heads. They remain disposable CI fixtures, not an integrated Stage3 entrypoint.
- `Ed25519Backend` can use native Sodium or a narrowly pinned sodium_compat candidate. Its own comments say the userland package is not approved in the production lock and needs separate legal/security/target-host review. The existing project status also records `sodium=false` in Hostinger web PHP. Do not silently copy that fallback into Stage3 or make Sodium a mandatory hosted capability.

The existing lab tests already cover many useful *algorithmic* cases: bad inventory, tampered bytes, symlink/hard-link injection, canonical metadata, interrupted staging, explicit recovery direction, CAS/ABA, stale locks, rollback to the immediate previous generation, pointer/receipt corruption, and SQLite/MySQL cooperative migration fences. Do not rebuild those same temp-lab tests under new names. Stage3 tests must prove the new Stage3 package, private runtime layout, DB snapshot and real PHP request-loader integration.

## 3. Target architecture

### A. Signed engine release contract

Extend the existing `cms-release.cjs`; do not create a second package builder.

The first supported update target is **`php-host`**. A package must bind:

- fixed engine identifier and manifest format/version;
- release version and release channel;
- package profile (must match the installed profile);
- minimum PHP version and required runtime extensions;
- exact file inventory, byte sizes, SHA-256 values and overall fingerprint;
- current/target Stage3 schema version and an explicit migration list (empty for the first code-only update);
- stable-loader ABI version;
- publisher key fingerprint and signature algorithm.

Sign the exact canonical manifest bytes with a domain-separated **RSA-3072 (minimum) / PKCS#1 v1.5 / SHA-256** signature using Node's built-in crypto in the offline release-building environment. This deliberately uses the OpenSSL capability already required by Stage3 instead of assuming Sodium exists on the target host. The private signing key must never enter the repository, package, server or CI artifact. The package carries only the manifest, detached signature and runtime files.

The PHP verifier must load the independently pinned RSA public key with OpenSSL, verify the exact domain-separated bytes using `openssl_verify(..., OPENSSL_ALGO_SHA256)`, and accept **only** a strict return value of `1` (not truthiness: PHP returns `0` for an invalid signature and `-1/false` on verification errors). Validate that the key is RSA and at least 3072 bits before use. Then check every file and the exact package inventory before extraction/activation. Reject unknown fields, duplicate/case-colliding paths, traversal, symlinks, hard links, special files, untracked files, oversized archives and profile mismatch. A recomputed SHA-256 inventory alone is never publisher authentication.

**Provider decision:** Stage3 v1 uses the required PHP OpenSSL extension with RSA-3072+ and SHA-256. No Sodium dependency, unsigned fallback, shell-out verifier or userland polyfill. CI must cross-check Node signing against PHP verification, including invalid signatures, wrong keys, wrong digest/domain and OpenSSL error returns.

The publisher public key/pin is an installation trust anchor stored outside the document root in private state. Key rotation is a separate explicit trust-chain operation; a package cannot replace its own trust anchor.

### B. Stable front controller + private immutable engine slots

Keep the configured public document root stable. Do not use a mutable symlink or rename the directory that contains the public document root.

Introduce a small stable loader/shell at the existing Stage3 server boundary. It loads the already configured private RuntimeConfig, reads the private active-engine pointer, and loads the selected immutable engine slot. The versioned slot contains the server, Studio, component registry and media-motion files so the existing relative asset paths continue to resolve.

The stable shell is not overwritten by an ordinary engine update. The package manifest declares its loader ABI; incompatible packages are rejected before staging. The active slot and all staging/state/snapshot files live under the existing private directory (outside public root), with canonical paths, directory mode 0700 and files mode 0600.

Suggested private layout:

```text
<private-dir>/
  engine/
    trust.json
    state.json
    active.json
    activation-intent.json
    request.lock
    slots/<release-id>/...
    staging/<random-id>/...
    snapshots/<snapshot-id>/...
```

No slot is overwritten. Stage into a new directory, verify the copied bytes again, then atomically write/rename the active pointer on the same filesystem. Retain at least the active and immediately previous verified slot. Cleanup is a separate safe operation and never follows symlinks or removes an active/previous slot.

Normal PHP requests acquire a shared request lease and hold it through shutdown. The update operation is a narrowly scoped owner-only path that does not acquire that shared lease; it obtains the exclusive lease non-blockingly, so it cannot switch code while an ordinary request is still using the old generation. New ordinary requests fail closed with a controlled maintenance response while activation/recovery is unresolved. The pointer uses a new immutable absolute slot path per version, avoiding mutable symlink and OPcache path aliasing. Do not call global `opcache_reset()` as a substitute for correct versioned paths.

The journal must distinguish at least: verified/staged, intent written, pointer switched, receipt committed, cleanup complete. A crash never triggers guessed automatic cleanup. Recovery inspects the durable state and requires an explicit direction; it must not overwrite a slot or silently move the pointer.

### C. Database snapshot and migration boundary

The first Stage3 updater release is **schema-preserving only**:

- installed schema version = 1;
- package minimum/maximum compatible schema = 1;
- target schema version = 1;
- migration list = empty.

Before every activation, create and verify a private snapshot of the complete dedicated Stage3 database, not only per-site content archives. It must include the schema definition and rows for all 25 required tables, including binary media and private inbox/delivery data. Use a streaming PDO export with byte-safe value encoding, table/row counts and per-file SHA-256 inventory; do not require `mysqldump` or shell access on shared hosting. MySQL 8+ is the hosted path; SQLite is CI/lab only. Snapshot creation/verification failure blocks activation.

The snapshot is private recovery evidence, not an automatic destructive restore. Keep a bounded retention policy and never put snapshots into the release ZIP, web root, logs or ordinary Studio downloads.

Future schema-changing packages must not be accepted until a separate versioned migration contract exists. Every migration needs a pinned checksum, precondition, `up`, and `down` path; the complete snapshot must verify before `up`. The migration journal must record the exact code/schema transition. Rollback may switch code only after the matching `down` path restores the previous schema and verification passes. If reverse migration fails, do **not** activate old code against an incompatible DB; remain in maintenance and require explicit recovery from the verified snapshot. MySQL DDL is not assumed to be transactionally reversible.

This makes the first code-only rollback genuinely safe while preventing the updater from claiming that a retained ZIP is a database rollback.

### D. Owner operation

After the signed verifier, slot manager and snapshot guard work independently, expose one focused owner-only workflow through the existing Stage3 authentication/CSRF/AccessControl model:

1. **Current version:** show active engine version, profile, schema version and previous rollback candidate.
2. **Review update:** accept a release package into private staging; show signature/trust result, version, PHP/schema compatibility, file fingerprint and snapshot readiness. Do not expose server paths, DB credentials, keys or raw exception traces.
3. **Apply:** require a separate explicit owner confirmation tied to a short-lived, one-time plan token bound to package fingerprint, current pointer/sequence, DB identity and schema state. Recheck everything at apply time.
4. **Rollback/recovery:** show the exact previous verified version and compatibility. Require explicit confirmation; never present visitor-site D3 rollback as the CMS engine rollback.

No editor/publisher role can update engine code. Do not add a second editor or redesign the Studio; add a focused maintenance task to the existing admin only after the backend contracts are stable.

## 4. Macroblock execution plan

Implement as four connected vertical packages, stopping only after the full Stage3 CI and the new critical user journey pass:

1. **Release identity and trust:** versioned canonical manifest, offline Ed25519 signing, PHP signature/inventory verifier, pinned trust anchor and negative package tests.
2. **Private engine lifecycle:** stable loader, immutable slots, staging, request/exclusive leases, CAS activation pointer, receipt/journal, immediate-previous rollback and explicit crash recovery.
3. **Database safety:** full private Stage3 DB snapshot/export/verify (and restore rehearsal into a separate disposable DB), schema compatibility preflight, and hard rejection of any schema-changing release until reversible migrations exist.
4. **Owner workflow:** owner-only API and a compact existing-Studio maintenance surface for current version, signed package review, explicit apply and rollback/recovery.

At least three owner-visible outcomes must be demonstrable: review a verified engine update, apply it without changing the visitor-site release or site data, and roll back to the immediately previous engine with the same DB/schema intact.

## 5. Required validation — new Stage3 paths only

Keep the existing full CI. Add focused coverage for:

- signed `php-host` package build → PHP verify → tampered signature/manifest/file, wrong key, unsupported profile/PHP/schema and unsafe path rejection;
- private staging and immutable slot inventory; no public-root/secret/database/customer-data inclusion;
- normal PHP request holding a shared lease while update activation is refused; then successful activation after release;
- crash points before/after pointer and receipt, fresh-process inspection and explicit recovery;
- code rollback to the previous slot with monotonic activation sequence and unchanged visitor-site publication version;
- complete 25-table MySQL snapshot including binary media, hash/count verification, and restore rehearsal into a separate disposable database;
- a migration-bearing package without a valid reversible migration/snapshot is rejected before activation;
- one real Chromium owner journey: review → apply → verify current version → rollback → verify previous version, while the published visitor site remains unchanged.

Do not duplicate the Stage2 lab suite's existing isolated tamper/CAS tests unless a new Stage3 integration seam requires them. Do not weaken existing CI gates or add broad repeated test matrices.

## 6. Separate #183 guided setup feasibility

A safe browser-guided setup is technically feasible without making the public site a credential store, but it needs its own threat model and implementation:

- use a one-time high-entropy setup token stored outside the document root; no default/public token;
- require HTTPS, same-origin/CSRF checks, strict rate limiting and an exclusive installation lock;
- accept DB/owner credentials only in the HTTPS POST body and process memory; never put them in URLs, sessions, DB rows, logs, error responses or generated HTML;
- reuse `Stage3Installer::plan/apply`; do not create a second schema installer;
- create/verify the private 0700 directory outside the public root, and fail closed if `open_basedir` or hosting permissions prevent that;
- after a verified installation receipt exists, every setup route returns 404;
- do not run DDL from visitor requests or expose a generic web-shell/CLI bridge.

A file-manager-assisted one-time token/bootstrap may be required on hosts without SSH. If the host cannot provide a private directory or secure token bootstrap, retain the documented manual path rather than weakening isolation. This is a separate #183 decision, not a prerequisite to designing #184–185.

## 7. Non-negotiable status

- Stage 2 remains NO-GO; gates #5–#9 remain open.
- Stage 3 remains isolated engineering and not formally accepted.
- 135 MUST = 124 engineering candidates + 5 partial + 6 external gates; owner acceptance remains 0/135.
- SEO Engine and D1–D8 are already integrated; do not repeat them.
- Studio remains temporarily agreed until the first real owner site is connected; no abstract redesign.
- First pilot is the owner's existing landing page; materials are not yet supplied.
- Work only on `feature/stage3-ai-site-contract`. No `main`, Design Factory, Hostinger, production, real databases, customer data, live email/Telegram or CELIKOM changes.
