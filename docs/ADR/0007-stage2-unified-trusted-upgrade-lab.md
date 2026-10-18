# ADR 0007 — Integrated authenticated Stage2 code + foundation DB activation remains CI-only

**Date:** 2026-10-18  
**Status:** Accepted as **laboratory architectural decision**, NOT production release gate, not Stage2 completion.

## Context

Signed ZIP verification, Python safe extraction, independent PHP manifest checking, PHP immutable installation, cross-process generation switching, and SQLite/MySQL schema checks originally ran as separate laboratory exercises. An operator could prove each check separately without proving the entire ordered flow. Earlier raw lab switch APIs still exist and do not require the signed ZIP / independent DB checkpoint.

## Decision

Build `LabTrustedUpgradeCoordinator` for a preferred integrated **disposable CI-only** path:

- Out-of-band pinned Ed25519 publisher test public key, expected version and downgrade floor, PHP-native cryptographic envelope verification before any activation action.
- Restricted offline Python extractor in a new scratch area; full PHP inventory and manifest re-verification against signed SHA-256 after extraction and again under database migration lock.
- Operator-retained, explicit code-version-specific DB foundation fingerprint. Never invent the expected DB state from the candidate itself; fail closed if it differs.
- Acquire DB migration lock **before** PHP code generation lease to preserve lock ordering. Reject stale expected-current / expected-sequence before installing a fresh slot. Register verified code, switch pointer, and require a clean journal. No implicit recovery or DB schema edits.
- Separate negative/real HTTP/SIGKILL/MySQL SQLite CI tests and full compiled artifact job; forbid all non-CI/real-host writes.

## Limitations

The integration cannot prove the extracted folder is the physical same ZIP member tree across a hostile concurrent actor (TOCTOU remains), though every inventory byte and ZIP SHA are cryptographically bound at checks. The PHP switch lab still contains independent direct research APIs; the new coordinator is **not yet an enforced unbypassable production path**. Local DB checkpoint JSON is not a tamperproof trust store. MySQL GET_LOCK is cooperative, not a universal transaction; full data rollback and MySQL DDL atomicity are not solved. Real PHP-FPM, OPcache, shared-host and power-loss behavior are unverified. No publisher identity/custody established.

## Evidence

- [PHP CI 39149669381 — 7/7 success](https://github.com/manufact-test/ai-site-cms/actions/runs/39149669381)
- [Full editor CI 39149669508 — 1/1 success](https://github.com/manufact-test/ai-site-cms/actions/runs/39149669508)
- `docs/STAGE-2-UNIFIED-TRUSTED-UPGRADE.md`
- Baseline source commit: `6ca20882232d262a2fe37b909918a7ac68d7f287`

Continue Stage2, no Hostinger access without separate consent, **0/135 mandatory product requirements accepted**.
