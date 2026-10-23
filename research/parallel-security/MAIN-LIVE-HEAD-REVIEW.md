# Independent current-main verification (21 October 2026)

This research-only change addresses two historically BLOCKED source checks. The PR base is old; the main integrator has already fixed the original PHP verifier.

The new main-head-independent-proof.mjs fetches the actual live public main SHA twice, clones it into a temporary OS directory, checks SIX original PHP files against original Git blobs, checks syntax, overlays only four research harness scripts in the temporary checkout, audits five original verifiers and runs the real 60-case independently signed class-only settlement/receipt/permit chain.

It checks for CMS source mutation and main ref advancement after the execution. A network outage or moving main is BLOCKED; actual invalid source or cryptographic failures are FAILED; complete evidence is required for PASS. The permanent GitHub code/main/workflow/production are untouched.

Important: forced-class dispatch still uses native Sodium; this does NOT close true PHP8.3 physically no-Sodium and independent sodium_compat 2.5.2 execution. PGP identity, qualified crypto/license review, Hostinger web-SAPI and owner release acceptance remain outstanding. Decision remains NO_GO.

Run: node research/parallel-security/main-head-independent-proof.mjs
Then: node research/parallel-security/run-security-suite.mjs

Use only the exact GitHub Actions candidate SHA, captured source SHA, actual log results; never treat an unrelated green run as proof.