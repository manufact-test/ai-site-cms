# 21 Oct 2026 — Actual upstream v2.5.2 Ed25519 patch boundary review

Scope: security research only, draft PR #3. No CMS, Hostinger, workflow, dependency locks or deployment changes.

## Why this is meaningful (not another fake test)

The TRUE independent Security CI already establishes the original `sodium_compat@2.5.2` SHA against actual shipped 78 Git objects, installs the pinned source in disposable Composer under physical PHP 8.3 without ext-sodium and proves pre/post source attestation. Here we exercise targeted adversarial cases for a KNOWN real upstream security repair **in that exact installed code**.

Upstream release v2.5.2 (18 Aug 2026) [release](https://github.com/paragonie/sodium_compat/releases/tag/v2.5.2), [PR #208](https://github.com/paragonie/sodium_compat/pull/208) describes identity/small-order public-key signature forgery prevention, mixed-order subgroup validation and restoration of the `ParagonIE_Sodium_Compat::$fastMult` mutable global on exception. Other fixes (ChaCha20 counter carry, Ristretto zero inversion, secretstream rekey, file-output safety) are outside our release-verifier Ed25519-only call surface and outside THIS targeted experiment. Never claim those were dynamically audited.

The new `sodium-v252-ed25519-boundary.php` runs under the **physical native-free** independently-built PHP8.3 and vetted installed original vendor source; no simulation or shim. It verifies an RFC8032 known valid signature; that the upstream forged identity-key signature fails through both public API and internal core; all-zero key rejection; the exact upstream mixed-subgroup regression vector rejection; global fastMult flag restoration after exception and success; message domain tamper and high signature scalar rejection. It requires **13 actual assertion completions**, returns a strict JSON proof and never creates signing material or modifies source.

`independent-no-sodium-composer-lab.mjs` requires that marker/JSON as an additional TRUE crypto boundary after existing four real runtime fixtures, and repeats pre/post Git-blob+lock attestation AFTER all tests. `run-security-suite.mjs` validates the additional semantic count and prints it in CI physical runtime source evidence.

## Publisher identity: stronger context, still not a cryptographic custody proof

Upstream GitHub release identifies tag signing key ID `6B97A1C2826404DA`. The exact pinned upstream README documents whole GPG security-team fingerprint `7F52D5C61D1255C731362E826B97A1C2826404DA`. The same FULL fingerprint is present on [Paragonie official domain blog (2016)](https://paragonie.com/blog/2016/09/untangling-forget-me-knot-secure-account-recovery-made-simple), a different publication channel, and in the publisher [gpg-mailer README](https://github.com/paragonie/gpg-mailer). This reduces misattribution risk versus trusting one GitHub badge, but both channels are publisher-controlled and **no independently authenticated out-of-band key ownership** or full local PGP `gpg --verify` custody check has been performed. Signer owner still needs qualified manual out-of-band validation.

## Release/prod restrictions

Upstream explicitly states the library has no formal third-party crypto audit. Small vector coverage DOES NOT equate to a security audit or proof about host performance, counter misuse, other code paths or legal redistribution. Hostinger LiteSpeed web-SAPI, independent legal/NOTICE review and release-owner decision remain open. Stage2/production remains **NO_GO**.