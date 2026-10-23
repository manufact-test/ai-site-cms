# Operator receipt chain: independent adversarial lab — 20 Oct 2026

## Purpose and strict scope
This follow-up tests **the real unchanged** `cms/src/Release/LabAttestedActivationGate.php::verifyChain()` (Stage2 lab-only verification). It does not install code, access Hostinger, call `withVerifiedRequest()`, manipulate real databases, change customer sites or approve a release. Source files and production Composer/npm locks remain untouched.

Research source: `research/parallel-security/receipt-chain-regression.php`. Requirements: 64-bit CLI PHP 8.3+ with genuine native ext-sodium (to generate ephemeral Ed25519 keys); explicit `CI=true` and `CMS_ALLOW_PHP_INSTALL_LAB=1`; checked-out real project source tree. All keys/receipts are generated under a unique `sys_get_temp_dir()/ai-site-cms-security-receipt-...` scratch folder and removed on exit. No private keys leave the process.

## Attack matrix encoded in fixture (36 assertions expected)
1. A real two-receipt, sequence 1 → 2 chain accepted when the expected head and the operator publisher identities are supplied **out of band**. The signed evidence still reports `productionReady=false`.
2. Independently pinned **old head** cannot authorize replay; wrong current head, wrong operator public-key pin, wrong publisher pin, cross-site receipt and invalid site name all rejected.
3. Modified JSON, forged signature, short detached Ed25519 signature, unauthorized second operator key, missing signature, missing receipt/sequence gap, foreign sidecar, symlinked receipt/signature/key, hardlinked signature and malformed operator PEM all rejected.
4. **Correctly signed attacker-shaped records, with the attacker's new head supplied as the new expected head**: out-of-order sequence; `productionReady=true`; lower release version; lower/higher invalid floor; broken previous receipt digest; forged prior version; DB/code version disagreement; forged publisher/site/receipt format; invalid manifest/archive SHA; unauthorized extra schema field; signature over noncanonical whitespace. This distinction proves structural and semantic rejection, **not only** that the old head mismatches.
5. After restoring all adversarial mutations, the original out-of-band-pinned chain remains accepted.

### Literal commands (from complete repository checkout)
```sh
php -l research/parallel-security/receipt-chain-regression.php
CI=true CMS_ALLOW_PHP_INSTALL_LAB=1 php research/parallel-security/receipt-chain-regression.php
php cms/tests/trust-chain.php
node research/parallel-security/run-security-suite.mjs
```

The updated `run-security-suite.mjs` now includes `native:operator-receipt-chain` and `native:trust-root-rotation`; if either executable test fails it must report `failed` rather than a false PASS.

**Status at handoff:** research fixture is **authored**, but **not independently executed on the exact follow-up PR head** in GitHub Actions. Current main's independent workflow is hardwired to the *previous* merged security branch and accepted `main` research snapshot. A success indicator on PR #3 from that workflow is **NOT evidence** these new 36 assertions ran. Integration owner must run the literal native PHP commands against this new branch, or change their CI workflow under their own ownership. No approval until this happens.

Real database checkpoint enforcement, live request lease, source zip extraction, signed operator permit/settlement, crash recovery, true sodium-free PHP, production kernel or Web SAPI remain **outside this fixture**.
