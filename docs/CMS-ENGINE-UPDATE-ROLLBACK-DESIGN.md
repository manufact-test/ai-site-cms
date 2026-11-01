# CMS Engine Update & Rollback — implementation checkpoint

**Date:** 2026-11-01  
**Status:** implemented on feature/stage3-ai-site-contract; full two-job Stage3 CI passed on 2026-11-01. Still not production-approved, not merged to main, and not owner acceptance.  
**Branch:** `feature/stage3-ai-site-contract`  
**Tested implementation HEAD:** `cec66fab97bc53024bdd7cfd21498e63440f1d9c`.  
**Full CI:** [#41315175195](https://github.com/manufact-test/ai-site-cms/actions/runs/41315175195), both contract and technology-runtime jobs SUCCESS.

## 1. Product boundary

This work is requirements **#184 (independent CMS engine update)** and **#185 (CMS engine rollback)**. It is not D2/D3:

- D2/D3 version and rollback visitor-site releases. They must remain independent.
- #184–185 change the code running the CMS/Studio itself.
- #183 (simple initial installation on ordinary shared hosting) remains a separate workstream. Do not disguise a CLI installer as a guided setup or bundle an unsafe public installer into the updater.

The updater must not modify the published visitor-site release, site content, customer data or delivery settings merely to change CMS code.

## 2. Pre-implementation baseline (historical audit)

The following records the initial audit before this implementation macroblock. Statements that the updater did not yet exist describe that earlier checkpoint, not the current branch.

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

## 3. Implemented Stage3 checkpoint — 2026-11-01

Requirements #184 and #185 are implemented on this feature branch as a code-only CMS engine updater. This is not a production deployment or formal owner acceptance.

### Release trust and package boundary

- stage3/bin/cms-release.cjs builds a signed php-host release. The canonical manifest binds engine identity, version/channel, PHP/extensions, schema contract, loader ABI, exact file inventory and fingerprint.
- Offline signing uses RSA-3072+ / PKCS#1 v1.5 / SHA-256. The private key is supplied to the offline builder only; it is not committed or copied into the package.
- PHP verifies the detached signature with OpenSSL, requires strict openssl_verify(...) === 1, validates the RSA key size and verifies every package file before staging.
- The publisher public key is a private installation trust anchor. Key trust setup is an explicit CLI operation; an incoming package cannot replace its own trust anchor.
- Only the php-host profile and schema version 1 with an empty migration list are accepted. Schema-changing packages fail closed until a separate reversible migration contract exists.

### Runtime lifecycle and control plane

- The stable public front controller remains in place. CMS code is selected from immutable private engine slots outside the document root; published visitor-site releases and customer content are not switched.
- The stable RuntimeConfig, EngineRuntime, EngineLifecycle, EngineReleaseVerifier and DatabaseSnapshot files remain pinned beside the stable front controller. Ordinary engine packages cannot replace the updater/control plane that is executing them.
- Active state, staging, plans, request locks, activation receipts, recovery journal, publisher trust and snapshots live under the private STAGE3_PRIVATE_DIR.
- Normal PHP requests hold a shared lease through shutdown. Owner control-plane requests use the stable loader without holding that shared lease, then acquire the exclusive lock non-blockingly for an update/rollback/recovery operation. This avoids self-deadlock and prevents switching while a normal request is active.
- Interrupted activation or active-slot integrity failure keeps the stable Studio recovery shell reachable: /studio, its exact first-party assets, /api/session, owner login/logout and read-only GET /api/sites are served from the pinned stable root. Site writes and publication remain fail-closed until recovery.
- Recovery requires an explicit owner choice: finalize or abort an interrupted activation, or roll back a damaged active slot.
- The existing Studio exposes a focused owner-only maintenance dialog: inspect current version, review signed package, confirm apply, prepare/confirm rollback and recover an interrupted switch. The package is placed in the private engine/incoming/ directory via SFTP/private file manager; it is never uploaded into public_html.

### Database safety

- A verified snapshot is created before every activation/rollback. It covers all 25 Stage3 tables and preserves binary media.
- Snapshot verification checks the complete inventory and hashes. Restore is an explicit, separately guarded operation into an empty target database; engine rollback does not silently restore or rewrite site data.
- Retention keeps the ten newest snapshot directories plus the current state's pinned recovery point. Older snapshots are removed only after full verification; corrupt/ambiguous snapshots are retained for forensic review rather than deleted.
- The current migration contract is deliberately code-only: schema version 1, no migrations. Do not mark DB migration/rollback as supported.

### Owner API

- GET /api/engine — status, trust, current/previous version and incoming package list.
- POST /api/engine/review — verifies an incoming package and creates a short-lived one-time plan bound to the current engine state and DB identity.
- POST /api/engine/apply — applies the reviewed package after rechecking plan, DB identity and request leases.
- POST /api/engine/rollback-plan and POST /api/engine/rollback — prepare and confirm the immediate previous engine rollback.
- POST /api/engine/recover — explicit finalize/abort of a pending activation journal.
- All operations are owner-only and mutation routes require CSRF protection. No editor/publisher role can update CMS code.

## 4. Target architecture and invariants

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

The stable shell is not overwritten by an ordinary engine update. The package manifest declares its loader ABI; incompatible packages are rejected before staging. The stable `RuntimeConfig`, `EngineRuntime`, `EngineLifecycle`, `EngineReleaseVerifier`, `DatabaseSnapshot` and the `/api/engine/*` control-plane routes remain pinned beside the stable front controller. Versioned slots contain signed copies of those files for inventory completeness, but the stable control plane is what resolves, updates and recovers slots. Changes to that control plane require a separately reviewed bootstrap/installer upgrade; an ordinary engine release cannot replace the updater that is currently executing it. The active slot and all staging/state/snapshot files live under the existing private directory (outside public root), with canonical paths, directory mode 0700 and files mode 0600.

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

Normal PHP requests acquire a shared request lease and hold it through shutdown. The narrowly scoped `/api/engine/*` control plane resolves through the stable root and releases its short state-read lock before running the owner-authorized operation; the operation then obtains the exclusive lease non-blockingly. This avoids self-deadlock while still refusing to switch code when any ordinary PHP request is using the old generation. The stable control plane remains reachable during an unresolved activation or an active-slot integrity failure so the owner can explicitly recover or roll back. New ordinary requests fail closed with a controlled maintenance response while activation/recovery is unresolved. The pointer uses a new immutable absolute slot path per version, avoiding mutable symlink and OPcache path aliasing. Do not call global `opcache_reset()` as a substitute for correct versioned paths.

The journal must distinguish at least: verified/staged, intent written, pointer switched, receipt committed, cleanup complete. A crash never triggers guessed automatic cleanup. Recovery inspects the durable state and requires an explicit direction; it must not overwrite a slot or silently move the pointer.

### C. Database snapshot and migration boundary

The first Stage3 updater release is **schema-preserving only**:

- installed schema version = 1;
- package minimum/maximum compatible schema = 1;
- target schema version = 1;
- migration list = empty.

Before every activation, create and verify a private snapshot of the complete dedicated Stage3 database, not only per-site content archives. It must include the schema definition and rows for all 25 required tables, including binary media and private inbox/delivery data. Use a streaming PDO export with byte-safe value encoding, table/row counts and per-file SHA-256 inventory; do not require `mysqldump` or shell access on shared hosting. MySQL 8+ is the hosted path; SQLite is CI/lab only. Snapshot creation/verification failure blocks activation.

The snapshot is private recovery evidence, not an automatic destructive restore. Retain the 10 newest verified snapshots plus the snapshot referenced by current engine state; corrupt or ambiguous snapshots are retained for forensic review rather than deleted. Pruning runs only after a committed transition/recovery. Never put snapshots into the release ZIP, web root, logs or ordinary Studio downloads.

Future schema-changing packages must not be accepted until a separate versioned migration contract exists. Every migration needs a pinned checksum, precondition, `up`, and `down` path; the complete snapshot must verify before `up`. The migration journal must record the exact code/schema transition. Rollback may switch code only after the matching `down` path restores the previous schema and verification passes. If reverse migration fails, do **not** activate old code against an incompatible DB; remain in maintenance and require explicit recovery from the verified snapshot. MySQL DDL is not assumed to be transactionally reversible.

This makes the first code-only rollback genuinely safe while preventing the updater from claiming that a retained ZIP is a database rollback.

### D. Owner operation

After the signed verifier, slot manager and snapshot guard work independently, expose one focused owner-only workflow through the existing Stage3 authentication/CSRF/AccessControl model:

1. **Current version:** show active engine version, profile, schema version and previous rollback candidate.
2. **Review update:** accept a release package into private staging; show signature/trust result, version, PHP/schema compatibility, file fingerprint and snapshot readiness. Do not expose server paths, DB credentials, keys or raw exception traces.
3. **Apply:** require a separate explicit owner confirmation tied to a short-lived, one-time plan token bound to package fingerprint, current pointer/sequence, DB identity and schema state. Recheck everything at apply time.
4. **Rollback/recovery:** show the exact previous verified version and compatibility. Require explicit confirmation; never present visitor-site D3 rollback as the CMS engine rollback.

No editor/publisher role can update engine code. Do not add a second editor or redesign the Studio; add a focused maintenance task to the existing admin only after the backend contracts are stable.

## 5. Implementation record

The four vertical packages above are implemented on the branch:

1. **Release identity and trust — complete:** signed RSA-3072 php-host package, PHP OpenSSL verification, private trust anchor, tamper/wrong-key/untracked-file rejection.
2. **Private engine lifecycle — complete:** stable loader, immutable slots, private staging, shared/exclusive leases, monotonic activation state, activation receipt/journal, immediate-previous rollback and explicit crash recovery.
3. **Database safety — complete for code-only updates:** verified 25-table SQLite/MySQL snapshots, binary media preservation, separate-database restore rehearsal, bounded retention and strict schema-v1/no-migrations gate.
4. **Owner workflow — complete in code:** owner-only HTTP API and existing Studio maintenance dialog for status, review, apply, rollback and recovery.

Automated evidence demonstrates review → apply → second update → blocked concurrent switch → rollback → interrupted activation → explicit recovery, while the published visitor-site record and binary media remain unchanged. Manual owner usability/acceptance and production-host verification remain open.

## 6. Validation completed — full CI #41315175195

The full two-job run [#41313513423](https://github.com/manufact-test/ai-site-cms/actions/runs/41313513423) passed on HEAD 9a16b26052fd50dd631848d07708e5d77f104ebd.

The contract job covered:

- signed package build and exact PHP OpenSSL verification; wrong publisher key, tampered runtime file and untracked package file rejected;
- owner authentication, owner-only API, CSRF rejection and actual HTTP review/apply/rollback/recovery;
- immutable slot activation, shared request lease and exclusive switch refusal while a PHP request is active;
- monotonic version transitions and explicit recovery after a simulated interruption between pointer write and receipt completion;
- stable Studio shell, authentication and read-only site listing remain available during both interrupted activation and active-slot file corruption, while site mutations return 503; rollback repairs the active generation;
- 25-table SQLite snapshot/restore and MySQL snapshot/restore, with binary media and published content preserved;
- snapshot retention and preservation of corrupt evidence;
- D3 local release cutover/rollback and collector sidecar packaging;
- existing Studio Chromium E2E, full server persistence/publish HTTP E2E, approved-site browser journey and existing SEO/contract suites.

The separate technology-runtime job passed the disposable Next Static real build and Next SSR loopback proof.

This is CI evidence for isolated test databases and loopback servers only. It does not prove a live shared-host install, production permissions, PHP-FPM/OPcache behavior on Hostinger, live SMTP/Telegram delivery, or owner acceptance. Do not duplicate the Stage2 lab suite or add broad repeated matrices.

## 7. Separate #183 guided setup feasibility

A safe browser-guided setup is technically feasible without making the public site a credential store, but it needs its own threat model and implementation:

- use a one-time high-entropy setup token stored outside the document root; no default/public token;
- require HTTPS, same-origin/CSRF checks, strict rate limiting and an exclusive installation lock;
- accept DB/owner credentials only in the HTTPS POST body and process memory; never put them in URLs, sessions, DB rows, logs, error responses or generated HTML;
- reuse `Stage3Installer::plan/apply`; do not create a second schema installer;
- create/verify the private 0700 directory outside the public root, and fail closed if `open_basedir` or hosting permissions prevent that;
- after a verified installation receipt exists, every setup route returns 404;
- do not run DDL from visitor requests or expose a generic web-shell/CLI bridge.

A file-manager-assisted one-time token/bootstrap may be required on hosts without SSH. If the host cannot provide a private directory or secure token bootstrap, retain the documented manual path rather than weakening isolation. This is a separate #183 decision, not a prerequisite to designing #184–185.

## 8. Non-negotiable status

- Stage 2 remains NO-GO; gates #5–#9 remain open.
- Requirements #184–185 are implemented on feature/stage3-ai-site-contract and pass the full CI above; they are not production-approved or owner-accepted.
- Stage 3 remains isolated engineering and not formally accepted.
- 135 MUST = 124 engineering candidates + 5 partial + 6 external gates; owner acceptance remains 0/135.
- SEO Engine and D1–D8 are already integrated; do not repeat them.
- Studio remains temporarily agreed until the first real owner site is connected; no abstract redesign.
- First pilot is the owner's existing landing page; materials are not yet supplied.
- Work only on `feature/stage3-ai-site-contract`. No `main`, Design Factory, Hostinger, production, real databases, customer data, live email/Telegram or CELIKOM changes.
