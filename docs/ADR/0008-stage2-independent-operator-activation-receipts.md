# ADR 0008 — External Ed25519 operator activation receipts and pinned monotonic read gate

**Date:** 2026-10-18. **Decision:** accepted as a **disposable Stage2 laboratory pattern only**. Stage2 remains NOT ACCEPTED, Stage3 NOT STARTED, product 0/135.

## Context

ADR 0007 integrated package signature, PHP inventory, DB foundation checkpoint and CAS activation. However, direct lower-level `LabPhpGenerationSwitcher::switchTo` methods can still activate a verified package without that coordinator. Mutable local switch metadata, its own receipt and a minimum-version parameter are not independently authenticated. A production entrypoint must never treat these laboratory classes as an authorization boundary.

## Decision and trust separation

Use `cms/src/Release/LabAttestedActivationGate.php` as a **new isolated guarded read** in the CI test harness. The external operator signs a strictly canonical record **after** observing successful coordinator activation. Signing is performed by a separate ephemeral Ed25519 key; **no private signing key is loaded by PHP**. The record binds site, strict increasing activation sequence, previous version, version, independent minimum version, separate release-publisher fingerprint, actual installed manifest SHA-256, signed ZIP SHA-256, exactly version-bound independent DB foundation checkpoint, and previous receipt SHA-256.

The receipts live **outside the code generation switch directory**, in an operator-managed separate folder. Each receipt is signed, and every sequence is validated. The reader requires independent pins for (1) operator public-key fingerprint, (2) signed-release publisher fingerprint, and (3) the latest signed-chain head hash. An attacker replaying older files or duplicating the local receipt directory cannot satisfy a correctly retained external head.

The request gate re-reads the chain while holding the existing DB migration fence and PHP shared request lease. It verifies the installed manifest digest, pointer version, previous version, monotonic sequence and independent foundation fingerprint. A missing, truncated, corrupted, forged, stale, reordered or downgraded receipt refuses service. In particular, a direct raw lab rollback is detected even though the lower-level switch API still permits its existing test-only behavior.

## Negative evidence

`cms/tools/test-lab-trusted-upgrade.cjs` now signs true ephemeral operator receipts for two real signed offline ZIP releases. It tests no receipt after activation, wrong key, wrong independent head, altered signature, broken ledger, stale one-receipt replay, *valid signatures on semantically hostile receipts* (broken ancestor hash, replayed sequence, non-monotonic version, wrong manifest, wrong DB checkpoint, wrong publisher) and the old raw switch bypass.

The tests run both with synthetic ZIP content in the PHP matrix and the fully compiled internal release in the editor job. PHP-FPM, OPcache, a real hosting environment, cold power loss, content/media backups and actual trust-key custody remain untested.

## Boundaries / future production architecture

This is **NOT a production-enforced mandatory upgrade path**. Existing `LabTrustedUpgradeCoordinator`, `LabPhpGenerationSwitcher`, and older fixture routes are purposefully available to CI; an application calling them directly is *not* protected. The signed-chain guard protects only callers that **explicitly invoke it**. No production application startup/router, installer, immutable trust store or host integration exists yet. A future production design must have exactly one capability-limited write path, require preactivation operator authorization and postactivation attestation, deny any unguarded web requests, and fail closed during incomplete two-phase transitions.

Local independently supplied operator files are not physically tamperproof against a privileged host user. The out-of-band head/pins are crucial assumptions, not magically secured by local JSON or filesystem permissions. No automatic rollback on partial receipt write; obtain independent evidence, reconcile under a maintenance window, or stop.

**No Hostinger even read-only without separate owner permission; no CELIKOM or customer sites.**
