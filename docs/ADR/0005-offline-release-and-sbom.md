# ADR 0005 — Machine supply-chain ledger and fail-closed laboratory version switching

**Date:** 2026-10-18 · **Stage:** 2, IN PROGRESS; production decision not yet approved.

## Decision

Track **all 14 pinned Composer runtime packages** and **29 pinned npm lock entries** in a generated, deterministic **CycloneDX 1.5 components-only SBOM**, with each component's package/version/declared license, lock/source evidence and explicit role (PHP runtime, browser runtime Jedison, build/test-only or optional build platform). Retain upstream installed PHP license texts and the literal Jedison MIT notice inside **private** package compliance files, fail closed when essential evidence is unavailable and require human legal review before distribution.

Pin an explicitly **internal prerelease version**, store it in package manifest, and use immutable test release slots + expected-active compare + verify-before-switch and verify-before-rollback to rehearse failures. Implement this **only in ephemeral OS temp environments**, not against real installation roots or production DBs. A local JSON pointer switch is not a functioning production release manager.

## Why

The prior 425-file package had local SHA256 inventory but neither machine-readable BOM nor bundled full PHP vendor notices nor any versioned switch/rollback simulation. Stage2 must test negative paths without risking customer websites, host credentials, irreversible MySQL DDL or wrongly promoting a research artifact to production readiness.

## Non-decisions / remaining controls

1. SHA256 checksums and internal CI are **NOT an authenticated signed release, trusted publication channel or verified provenance**. Malicious replacement with recomputed hashes remains possible. Implement key handling/signature verification and retention before any real deployment.
2. Synthetic paired slots contain **code and packaged dependencies only**. No live web-serving pointer, database/asset consistency, persistent-site data backup, migration reversal or real host compatibility is proven.
3. The CycloneDX document inventories lock entries, **not** a security audit, full legal NOTICE review or guaranteed distributable artifact. Optional npm platform packages are represented but not all shipped.
4. Protected install/extract paths, exclusive operation locks, version monotonicity and durable multi-process atomicity remain to be designed/tested with actual runtime constraints.
5. Never permit Stage2 tooling to contact or modify Hostinger, CELIKOM or client websites. A future read-only host check and a future deployment each require **separate explicit owner permission**.

**Evidence:** [report](../STAGE-2-SBOM-ROLLOUT.md), [editor/packaging CI #39135702759](https://github.com/manufact-test/ai-site-cms/actions/runs/39135702759) (1/1 PASS), [PHP CI #39135702765](https://github.com/manufact-test/ai-site-cms/actions/runs/39135702765) (7/7 PASS). **0/135 mandatory product acceptance, no MVP.**
