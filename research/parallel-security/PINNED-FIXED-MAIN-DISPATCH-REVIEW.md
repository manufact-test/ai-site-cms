# Fixed-main snapshot: real two-route Ed25519 parity (21 October 2026)

**Research-only — not a merger, workflow change, or production readiness assessment.**

Current Security PR #3 base SHA `6ec6dd170c5250e5caed9f0739e03858a3b96a93` is older than integration owner's `main` and contains a legacy global Sodium call. On `main`, the integrator fixed `cms/src/Release/LabSettledUpgradeGate.php` to use `Ed25519Backend::verifyDetached`. To produce independent proof *without modifying CMS files or checking out another branch*, this research test embeds a byte-for-byte fixed-main PHP **test source copy**, and before execution validates the Git blob SHA-1 against the GitHub source object `51181e31b393e9d5cb67da5e23ebcb6f0ef8c5e1`.

### Immutable four-file PHP source set

| Executed PHP basename | Expected Git blob ID | Provenance |
| --- | --- | --- |
| LabSettledUpgradeGate.php | `51181e31b393e9d5cb67da5e23ebcb6f0ef8c5e1` | frozen integration-owner main corrected source |
| Ed25519Backend.php | `da5b9fbd9ce80ea9ee37ea5131cf6d1b198c6134` | original unchanged main/old PR-base |
| LabAttestedActivationGate.php | `fe7f845df11db8db8fa5e7b35b9ddb81244ab0fb` | original unchanged main/old PR-base |
| LabPreauthorizedUpgradeGate.php | `ed838b6a6379c8ba2cf38a85facb2d66c7611f03` | original unchanged main/old PR-base |

The runner rejects substituted source bytes, linked files or unexpected replacement code, stages all four files as temporary **private copies**, performs original PHP gate checks and cleans the copies afterwards. It cryptographically signs one two-generation permit → receipt → settlement chain in Node, verifies **the same signed bytes** under **native Sodium** and under the **same native Sodium extension** with just the global detached function disabled and research class-only shim routing via `sodium_crypto_sign_open`. Each backend must match all 60 acceptance/negative outcomes and actual signed-chain heads; total **120** policy assertions. The test restores original valid evidence after forged signatures, correctly re-signed invalid histories, noncanonical signed JSON, replay and symlink/hardlink attempts.

### Limitations that remain strict

- **This checks the exact named four-file Git source set**, NOT a fresh checkout of entire current `main`, target Hostinger web-SAPI or production release. The original PR-base tests and its two explicit current-main checkout blockers remain separate. The frozen settlement copy is a research fixture, not a CMS edit or vendored shipping dependency.
- The class shim internally uses **native libsodium** and is NOT the independently vetted real `paragonie/sodium_compat 2.5.2`; physically missing Sodium remains untested and blocked.
- **No live 43/43 OSV query**, vulnerability or legal approval, license clearance or Stage2/production authorization follows from any test passing.
- The upstream Git object **SHA-1** here is an exact source identity check for the copied files; it is not a trusted third-party signature, independent full-tree audit, or cryptographic provenance endorsement. Integrator still owns final current-main checkout, release decisions and review.

```sh
node research/parallel-security/chain-backend-regression.mjs pinned-main-dispatch
```
