# Genuine Security CI native-free PHP + actual Composer source experiment

Research-only and NO-GO (21 Oct 2026). The Security suite may now attempt a physical independent Ubuntu-sourced PHP 8.3 CLI build with --without-sodium. This process requires explicit Linux CI / RUNNER_TEMP, and all PHP source/builds plus Composer installation live under a disposable OS temp directory, not under cms or this repository.

Uses Ubuntu apt deb-src with the runner official signing keyring to obtain php8.3 source. Does not call php -n a physically native-free binary, and requires real extension/function absence, 64-bit, correct version, actual absence-mode signed checks and SHA256 binary fingerprint.

Separately downloads the original pinned ParagonIE GitHub Composer ZIP, verifies original decompressed 78 source bytes against its pinned Git tree and immutable blob IDs, then derives a whole-tree digest from those VERIFIED upstream bytes, *not* from the installed vendor folder. Performs a real Composer install into an isolated project with plugins/scripts disabled, validates the actual 78 installed Git files, exact original commit/source/dist pinned one-package composer.lock, metadata and pre/post independent SHA256 source tree.

Runs original runtime-sodium-proof.mjs with physical binary: two signed no-backend rejections and two genuine Compat RFC8032/signed-envelope checks, requiring completed original assertion evidence. Re-attests the real vendor files and original lock after PHP runs and removes the entire temp directory. Crypto/signature/source mismatches are FAIL; unavailable Ubuntu or Composer prerequisites are BLOCKED, never PASS.

Limitations: this is not Hostinger PHP/LiteSpeed web SAPI or throughput acceptance, qualified cryptographic audit, PGP signer identity trust or ISC/NOTICE redistribution legal approval. Stage2 and production always remain NO_GO. Neither main, .github/workflows, cms/, nor production lockfiles are edited.

Direct CI-only command: node research/parallel-security/independent-no-sodium-composer-lab.mjs