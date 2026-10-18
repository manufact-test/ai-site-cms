# AI Site CMS — Stage 2 independent operator receipt chain laboratory

**Checkpoint:** v1.40 · 18 October 2026. **Status:** Stage 2 in progress, NOT accepted. 0/135 required product requirements accepted. All tests run on disposable GitHub CI infrastructure.

## Added

- `cms/src/Release/LabAttestedActivationGate.php`: PHP 8.1-compatible, CI-guarded read-only chain verifier. Accepts a *separately retained* operator Ed25519 PEM and fingerprint, a separate pinned release publisher fingerprint, and an independently pinned latest receipt SHA-256. Never signs, writes, stages, installs or switches code.
- Every sequential receipt is checked for safe regular file nodes, exact canonical JSON encoding, detached Ed25519 signature, complete contiguous chain, predecessor digest, monotonic version, minimum version floor, site, DB snapshot code version, release publisher identity, code inventory SHA and archive SHA.
- `withVerifiedRequest` recomputes the chain while inside `LabPhpGenerationSwitcher::withRequestLeaseAndCheckpoint` (DB foundation fence + PHP shared request lease), and compares signed release inventory/version/sequence/predecessor with the actual CAS pointer and installed package.
- `cms/tests/fixtures/trusted-upgrade-operator.php` adds isolated `attested-serve` and `raw-rollback` fixture operations; `cms/tools/test-lab-trusted-upgrade.cjs` now signs independent operator receipts *after* the successful two-release coordinator flow. No signing private key enters PHP.
- Negative cases include missing receipts after code activation, altered/missing signature, edited data, foreign files, wrong operator pin, wrong publisher pin, wrong independent chain tip, truncated/replayed receipt history, valid Ed25519 signatures over semantically invalid receipts, drifted DB, and a genuine direct raw rollback being denied by the attested read gate.

## Security interpretation

A verified package signature authenticates an archive; an operator signature authenticates an *operator's assertion* that a specific version/DB combination has been activated. These are separate trust decisions. Neither proves the publisher's real-world identity. The operator signer is not proof against a compromised operator key, malicious privileged host process or loss of the separately stored trusted hash. Operator receipts are not a database backup. Code and foundation DB changes do not become atomic merely because a signed receipt exists.

The new read gate is deliberate defense against **bypass when the new gate is used**. Older direct lab switch/recovery/read methods still exist. No mandatory production bootstrap/router has been implemented; any unguarded consumer can bypass this test gate. The code remains CI-only by explicit PHP SAPI/environment checks and filesystem limits. It is NOT a production installer or deployment system.

## Still required in Stage2

1. Design and verify a **single mandatory future production operator write path**, with pre-activation authorization, trust-key lifecycle, authority separation and crash-safe two-phase marker. Refactor/remove direct calls from any future production runtime; default deny during incomplete attestation.
2. Prove real PHP-FPM/Apache/OPcache read behavior, cold power loss/fsync and PHP process restart at a separately authorized test host. Current CI PHP built-in server is not such proof.
3. Plan and independently test full content/users/media/revisions backup and consistent database migration/rollback in later stages. Existing foundation fingerprint is not that.
4. Formal Stage2 acceptance and independent operator policy; no change to 135/135 first full release policy.

**Evidence (first signed gate baseline):** source `58e964e8c8d926a9b1354dfdc6748da85ddc1fe2`, [PHP 7/7 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39150910411) and [full editor 1/1 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39150910407). Subsequent strengthening source `0a9ed93201f32fa4746d2ccac1d69785e0491fcb`; see newer CI before claiming success.

**Rules:** Never access Hostinger, even read-only, without new explicit permission; no CELIKOM/client sites; no research branch merge; no 135 requirement acceptance.
