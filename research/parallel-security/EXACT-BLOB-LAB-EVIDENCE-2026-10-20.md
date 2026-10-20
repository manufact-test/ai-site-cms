# Security follow-up: byte-identical local execution and advisory triage (20 Oct 2026)

**Research only. No production acceptance, Hostinger access, lockfile change or merge.** This evidence supplements (does not replace) the independent GitHub Actions run the integrator must perform against the **new PR #3 SHA**.

## Identifiers and environment

- Original PR #3 HEAD inspected before this work: `6aefd64c1c923137e9091ed4b56bfbd6297f1a72`. Branch: `research/stage2-supply-chain-followup`.
- The inspected `main` HEAD was `5be528de4c49838b364708e10851334411ef7f8f`; main can move independently.
- Offline isolated local Linux CLI: Node **22.16.0**, PHP **8.4.24**, **native** Sodium loaded. No local clone is available: external GitHub DNS/network from this sandbox is disabled.
- We reconstructed the exact text returned by the connected GitHub contents API in an isolated scratch directory **outside the repository**; independently checked `git hash-object` against GitHub's own blob SHA for **each executed source**, and ran actual PHP/Node CLIs. These are byte-exact source-level tests of the named blobs, **not** a full HEAD checkout, complete main CI, PHP 8.3, OSV online, or vendor/DB/installer test.

| GitHub path | Blob SHA verified locally |
|---|---|
| `cms/src/Release/Ed25519Backend.php` | `da5b9fbd9ce80ea9ee37ea5131cf6d1b198c6134` |
| `cms/src/Release/LabAttestedActivationGate.php` | `fe7f845df11db8db8fa5e7b35b9ddb81244ab0fb` |
| `research/parallel-security/receipt-chain-regression.php` | `f27345651c3b70a7941de79bffb9b51c1d456a50` |
| `research/parallel-security/osv-strict-snapshot.mjs` | `a2808137b57e1b6a1338dd816a6e631fbfb5fc5c` |
| Original `osv-strict-regression.mjs` | `ada8fdd5f94948348de07e35ce3700d2e3a85446` |
| Expanded `osv-strict-regression.mjs` | `2e04e865fd44bd4887a53d9928efee66365bd237` |

## Actually executed locally

| Exact command (from disposable scratch checkout) | Result | Limit |
|---|---|---|
| `php -l research/parallel-security/receipt-chain-regression.php` | **exit 0**, syntax valid | PHP 8.4, not target PHP 8.3 |
| `CI=true CMS_ALLOW_PHP_INSTALL_LAB=1 php research/parallel-security/receipt-chain-regression.php` | **exit 0, 36/36 PASS**, two genuinely Ed25519-signed receipts and adverse replay/semantic/filesystem fixtures | Only `verifyChain()`; no code-switch, live DB/CAS, host or release approval |
| `node --check research/parallel-security/osv-strict-snapshot.mjs` | **exit 0** | Parser only |
| `node research/parallel-security/osv-strict-regression.mjs` (old GitHub blob) | **exit 0, 10/10 PASS** | Offline synthetic API response |
| `node research/parallel-security/osv-strict-regression.mjs` (expanded GitHub blob) | **exit 0, 29/29 PASS** | Added fake POST, stream size/UTF-8/JSON/error/pagination and synthetic 14+29 lock guards; **no OSV internet** |

The expanded source is now committed in this branch and integrated automatically by existing `run-security-suite.mjs` via its unchanged `mutation:osv-strict-regression.mjs` entry. Its Git blob matches the locally executed 29-case fixture. All temporary crypto keys and signature/receipt files were generated under isolated scratch directories and deleted by the fixture. Local results are stronger than static review but cannot be presented as a GitHub Actions execution of the **entire** new branch.

## Locked inventory checked independently with GitHub connector (not local CLI)

- Exact `cms/composer.lock` blob: `fe4d35b16ef0576ac8a818ce861ea8480601b9fb`; exactly **14** production packages, **0** dev; 14/14 40-hex source and dist SHA matching.
- Exact `cms/editor/package-lock.json` blob: `ab73c0cb516e7b053dbef0502ee88d658a654037`; lock v3, **29** named entries; 29/29 syntactically valid SHA-512 integrity fields.
- **43 distinct inventory names checked**, including npm `esbuild@0.25.12` and `playwright-core@1.55.1`. Neither inventory check nor 29 offline tests is a vulnerability database query.

## Point-in-time esbuild advisory triage, separate from live OSV batch

Official upstream security advisory pages reviewed on 2026-10-20:

1. [GHSA-gv7w-rqvm-qjhr](https://github.com/evanw/esbuild/security/advisories/GHSA-gv7w-rqvm-qjhr): Deno `lib/deno/mod.ts` remote-binary integrity path, affected versions before 0.28.1. [OSV GHSA record](https://osv.dev/vulnerability/GHSA-gv7w-rqvm-qjhr) is explicitly **withdrawn** (2026-06-17) because the affected Deno package was not the supported **npm** ecosystem target. Do **not** misstate this as confirmed compromise of npm `esbuild@0.25.12`; Node's npm installer implements a different integrity check. Preserve exposure assessment if Deno builds are introduced.
2. [GHSA-g7r4-m6w7-qqqr](https://github.com/evanw/esbuild/security/advisories/GHSA-g7r4-m6w7-qqqr): upstream lists **0.27.3** affected (Windows development server file read). The locked **0.25.12** does not match that stated affected-version entry.
3. [GHSA-67mh-4wv8-2f99](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99): development-server CORS advisory affects versions through **0.24.2**; locked **0.25.12** is newer than the listed patched floor **0.25.0**.

This is **targeted triage only**, not proof of zero OSV advisories across the 43 exact pins, nor proof all native Go binaries or nested libraries are vulnerability-free. Full live querybatch and human review remain mandatory.

## Remaining independent acceptance gates

1. Main integrator must route isolated CI to **PR #3 current head** rather than hardcoded original `research/stage2-supply-chain`; also **replace** the accepted `main/research/parallel-security` subtree in the **disposable** worktree, because the existing workflow detects the old subtree and does not copy PR files at all. Verify exact SHA, test names, exit codes, no secrets/host usage. Only integrator may edit workflow.
2. Live `node research/parallel-security/osv-strict-snapshot.mjs` 43/43 `querybatch` with full timestamp/lock SHA/response and triage; not executed (no OSV POST/DNS in research container). No '43/43 clean' claim.
3. True PHP **8.3 64-bit** with **physically absent** native ext-sodium, independently verified exact `paragonie/sodium_compat@2.5.2` and whole-chain/latency/adversarial measurements: **blocked**, not PASS. `php -n` on local PHP 8.4 still loads Sodium.
4. Actual installed npm and Composer binary/source provenance, live DB/CAS/crash/privileged actor behavior, human legal/crypto signoff and Stage2 acceptance remain integrator-owned or unverified.

**Conclusion:** new offline receipt and OSV transport fixtures have local **byte-identical source** evidence. Full checkout CI, network advisories and Sodium-free target compatibility are still open. PR #3 stays Draft; Stage2 and production are NOT accepted by this report.
