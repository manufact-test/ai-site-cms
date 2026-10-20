# Security & Dependencies — independent Stage2 research ledger
**Checkpoint:** 20 October 2026. **Branch:** `research/stage2-supply-chain`. **Source baseline:** `97f2c98fe9beef5c4c5384c3c077e70dad2a782c`; research started at `3c83013e1f79fc954b612785034f3a87da438431`. **Scope:** research only; no production code/locks/Hostinger changes.

## Executive classification

- **Confirmed critical vulnerabilities in the 43 locked packages:** none established by this review. This is NOT a clean bill of health: a fresh authenticated full audit of all 43 versions was not executable in the isolated lab. The earlier CI-reported Composer/npm checks are point-in-time evidence only.
- **P1 / Significant — legal release gate:** 43 package metadata SPDX identifiers found, but these alone are not independent legal qualification or proof of every source-level license and NOTICE. 14 installed PHP license texts are gathered by `cms/tools/generate-compliance.cjs` (CI build-time), whereas npm lock metadata is used for 29 npm entries; only Jedison's literal MIT attribution is copied to the browser bundle. Upstream full license texts, any embedded subcomponents, the Apache-2.0 NOTICE and modification records and commercially shipped artifact contents need independent human review.
- **P1 / Significant — target signing gate:** target LiteSpeed PHP8.3 lacks ext-sodium. The current `cms/src/Release/Ed25519Backend.php` rejects when neither native nor audited/pinned compat class exists. `sodium_compat 2.5.2` is only a candidate; pure-PHP Ed25519 has not been proven against actual target host timing/concurrency/resources; do NOT release via a non-cryptographic substitute.
- **P1 / Significant — source freshness:** no live 43/43 OSV and version-registry snapshot could be obtained in this isolated runner. An opt-in read-only OSV batch test is provided; registry freshness requires a separate review. Do not replace missing results with “0 vulnerabilities.”
- **P2 / Informational — build exposure:** 26 npm optional `@esbuild/*` platform packages are recorded across OS/CPU but are build-time alternatives, not 26 libraries incorporated into browser JS. `esbuild` and `playwright-core` are dev tools. `jedison` is browser runtime. PHPRuntime 14; npm 29 including optional 26; full lock count 43.

## Deterministic lock inventory (43 entries)

The license column is **declared SPDX from frozen lock metadata**, not a confirmed independent license grant. Scan all transitive entries and distribution archives during legal review.

| Ecosystem | Package | Pinned version | SPDX declared | Intended scope |
|---|---|---|---|---|
| Composer | `fig/http-message-util` | `1.1.5` | `MIT` | server runtime |
| Composer | `nikic/fast-route` | `1.3.1` | `BSD-3-Clause` | server runtime |
| Composer | `opis/json-schema` | `2.6.0` | `Apache-2.0` | server runtime |
| Composer | `opis/string` | `2.1.0` | `Apache-2.0` | server runtime |
| Composer | `opis/uri` | `1.1.0` | `Apache-2.0` | server runtime |
| Composer | `psr/container` | `2.0.2` | `MIT` | server runtime |
| Composer | `psr/http-factory` | `1.1.0` | `MIT` | server runtime |
| Composer | `psr/http-message` | `2.0` | `MIT` | server runtime |
| Composer | `psr/http-server-handler` | `1.0.2` | `MIT` | server runtime |
| Composer | `psr/http-server-middleware` | `1.0.2` | `MIT` | server runtime |
| Composer | `psr/log` | `3.0.2` | `MIT` | server runtime |
| Composer | `ralouphie/getallheaders` | `3.0.3` | `MIT` | server runtime |
| Composer | `slim/psr7` | `1.8.0` | `MIT` | server runtime |
| Composer | `slim/slim` | `4.15.3` | `MIT` | server runtime |
| npm | `@esbuild/aix-ppc64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/android-arm` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/android-arm64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/android-x64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/darwin-arm64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/darwin-x64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/freebsd-arm64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/freebsd-x64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/linux-arm` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/linux-arm64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/linux-ia32` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/linux-loong64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/linux-mips64el` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/linux-ppc64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/linux-riscv64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/linux-s390x` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/linux-x64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/netbsd-arm64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/netbsd-x64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/openbsd-arm64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/openbsd-x64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/openharmony-arm64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/sunos-x64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/win32-arm64` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/win32-ia32` | `0.25.12` | `MIT` | optional platform |
| npm | `@esbuild/win32-x64` | `0.25.12` | `MIT` | optional platform |
| npm | `esbuild` | `0.25.12` | `MIT` | build/test |
| npm | `jedison` | `1.27.1` | `MIT` | browser |
| npm | `playwright-core` | `1.55.1` | `Apache-2.0` | build/test |

**Declaration roll-up:** MIT 38, Apache-2.0 4, BSD-3-Clause 1. Source of truth: `cms/composer.lock` and `cms/editor/package-lock.json`. Composer declares all 14 runtime, none dev. All 29 npm entries include `integrity` hashes; package pinning prevents accidental version drift only when lock-based installation is used.

## Commercial distribution and NOTICE review

MIT generally permits commercial proprietary redistribution provided copyright/license notices accompany copies. BSD-3-Clause additionally prohibits endorsement by authors without permission. Apache-2.0 generally permits commercial redistribution with LICENSE, proper NOTICE retention where applicable, modification notices, and attention to patent clauses. These statements are **general engineering observations**, not license approval. A qualified reviewer must examine each original upstream license and embedded component, aggregate actual distribution scope and notices, customer delivery/EULA and any trademarks. Shipping browser runtime may require Jedison copyright attribution even if npm devDependencies are absent from delivery. Preserve original PHP LICENSE texts and verify `private/compliance/THIRD_PARTY_NOTICES.txt` in the actual built artifact; its SHA-256 is not a publisher signature.

No component identified from LOCK METADATA alone declares a copyleft license; no conclusion about nested/vendored files or actual binaries follows from that. No production release permission from this report.

## Security advisory triage, as of 2026-10-20

1. **`paragonie/sodium_compat 2.5.2` is NOT among the 43 pinned packages.** Candidate package: Packagist reports ISC, PHP ^8.1 and 64-bit; release tag v2.5.2 2026-08-18. Security advisories exist for older releases (e.g. GHSA-mrfv-m5wm-5w6w fixed in 2.5.0; public-key validation PKSA-32g2-byr9-drtw reportedly fixed in 2.5.1). Verify all advisories against exact 2.5.2 and source distribution before install. It is not “zero advisory history.” Upstream states no formal independent cryptographic audit; pure-PHP timing and side-channel risk is higher than native libsodium.
2. **`esbuild 0.25.12`**: GHSA-67mh-4wv8-2f99 affected pre-0.25.0, so this version is after that fix. The 2026 Deno-binary advisory GHSA-gv7w-rqvm-qjhr is **withdrawn** for npm since it named the wrong ecosystem; the reported Deno path is not evidence that this Node npm build is exposed. The Windows dev-server path issue GHSA-g7r4-m6w7-qqqr affects >=0.27.3 and <0.28.1, so not 0.25.12. Keep toolchain upgrade separate from security claims.
3. **Other 42 pins:** this review examined lock declarations and prior automated audit evidence, NOT an individually timestamped complete advisory query for each version. `node inventory-audit.mjs --online` performs an OSV 43-version batch and rejects partial responses. Run also `composer audit --locked` and `npm audit --package-lock-only --json` on a trusted CI runner; reconcile any disagreements and false positives individually.
4. **Release-chain exposure:** key pin and revocation, canonical domain-separated signatures, signed archive hash, external epoch/version floor and external receipt head are separate mandatory gates in existing code. A functioning compat primitive alone doesn't prove protected rollback, anti-replay or safe deployment. Existing CI-only coordinator and fallback cannot bypass those gates.

**Authoritative links:** [Packagist candidate](https://packagist.org/packages/paragonie/sodium_compat), [upstream sodium_compat README](https://github.com/paragonie/sodium_compat), [libsodium advisory](https://github.com/advisories/GHSA-mrfv-m5wm-5w6w), [esbuild pre-0.25 advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99), [withdrawn Deno advisory](https://github.com/advisories/GHSA-gv7w-rqvm-qjhr), [esbuild Windows advisory](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr), [OSV API](https://google.github.io/osv.dev/api/).

## Concrete remediation priorities

| Priority | Responsible | Action and acceptance evidence |
|---|---|---|
| P0 stop-ship **if** confirmed | Integrator | If a future advisory is applicable to production code and exploitable, pin a remediated version, inspect license/NOTICE, rebuild signed distribution and rerun full tests; otherwise block release. No current P0 asserted. |
| P1 | Security + legal reviewer | Source-vs-lock LICENSE/NOTICE report for 43 entries; inspect all 14 PHP distributed code archives, Jedison browser bundle/source, 28 remaining npm development artifacts if distributed, third-party embedded assets, BSD/Apache obligations. Independent human signoff, no self-approval. |
| P1 | Integrator (decision only) | Decide native ext-sodium or independently approved exact `paragonie/sodium_compat 2.5.2`; fail closed if missing. Never update production Composer lock from this research PR. |
| P1 | Security + CI | Run OSV full batch and `composer audit --locked` / `npm audit --package-lock-only` at merge/release time with date, tool versions, raw results, vulnerability IDs; do not count network failure as clean. |
| P1 | Integrator | Run fixture across PHP8.3 with and without ext-sodium and real pinned polyfill, genuine/forged signatures, full OfflineReleaseVerifier, trust epoch, receipt replay, rollback and corrupted package E2E. No target-host write. |
| P2 | Editor/build owner | Retest build under consciously updated esbuild / Playwright pins when justified; re-verify optional platform binaries and SBOM; keep Node build/test packages out of shipped visitor bundle. |
| P2 | Operations | Keep out-of-band fingerprint/minimum epoch/receipt head with real operator custody. A mutable local file cannot be the only anti-replay memory. |

## Testability and limits

The scripts in this folder are **read-only with respect to CMS source, locks, remote services** except optional OSV POST queries. `release-fixture.mjs` creates only ephemeral fixture files under system temp and deletes them. `ed25519-lab.php` uses RFC8032 official known-answer vector. Run instructions are in `RUNBOOK.md`. Native-only vector was checked in isolated PHP8.4; actual `sodium_compat 2.5.2` pure-PHP verification on PHP8.3 target was **NOT performed**, and no Hostinger access was used. PR must be reviewed and not merged automatically.

**Bottom line:** technical inventory complete; source license attestation, fresh comprehensive vulnerabilities and an audited fallback/host proof remain open. Stage2 NOT ACCEPTED. Stage3 NOT STARTED.
