# Independent Git object provenance: real signed ParagonIE sodium_compat v2.5.2 tag

**2026-10-21; standalone Security research; no CMS, dependency or workflow change.**

At the actual public upstream GitHub repository `paragonie/sodium_compat`, tag `v2.5.2` is an **annotated Git tag object** `5cbae9d0ad987e0104e390d74cca92a128777aa8` that points to exactly the Composer-candidate commit `3246b36803c177847e677862fedeb7f937869adb`. GitHub Git-data API reports `verification.verified=true`, `reason=valid`, with a PGP signature and signed tag payload naming this commit. **The target commit itself is unsigned** (its tag is signed). This is concrete upstream signature evidence, NOT independent validation of the publisher's PGP key ownership: the key identity was not vetted outside GitHub, and a GitHub-signature-status result alone is not a release-acceptance vote.

The signed-target commit names whole Git tree `d940270053129b9a11fe78388278e45c62b92bb4`. GitHub's real recursive tree API returns **211 entries, untruncated** with all Git objects and file sizes. The frozen actual transcript `fixtures/upstream-sodium-compat-v2.5.2-git.json` stores the complete Git path, object ID, mode and blob size inventory plus upstream tag PGP evidence. The verifier reconstructs **every nested tree object digest locally** from the Git-encoded Git-object formats and checks each stored expected SHA against the signed target root; rejects truncated trees, missing directories, path traversal, special-mode/symlink entries, wrong LICENSE, `composer.json`, `autoload.php` and `src/Compat.php` hashes, and tampered Git-tag metadata.

The pinned real upstream `.gitattributes` object excludes tests, fuzzing, dist, CI metadata and development autoloaders via `export-ignore`. Therefore the reported Git repository has 211 *files and trees* but the expected Composer archive **contains 78 PHP/LICENSE/docs source blobs**, not 211 files. The read-only `--verify-installed /absolute/path` mode maps the exact **78 exported upstream Git blob hashes** to real local installed file bytes and rejects extra/missing files, changed crypto source, symlinks, hardlinks and special files. **This installed-source comparison is NOT run in our default Security CI** because that CI has no independently installed true upstream sodium_compat tree; it is blocked pending an actual fully isolated downloaded source installation. Export-ignore interpretation is based on the explicitly reviewed pinned upstream `.gitattributes`; if the actual GitHub generated ZIP differs, the tool fails closed and requires a reviewed update.

**Meaningful limits:** the Git tree comparison verifies original-source **Git byte identity**, not that those source bytes implement secure crypto, independently vetted PGP signer custody, actual Composer GitHub zip transport digest, no vulnerabilities, license distribution/attribution acceptance, a fresh 43/43 live OSV audit or real no-native PHP on Hostinger. The main integrator's separate true no-Sodium CI remains valid external evidence (see `MAIN-GENUINE-SODIUM-FREE-EVIDENCE-REVIEW.md`), but this new research test does not repeat it.

```sh
node research/parallel-security/sodium-upstream-tree-proof.mjs
node research/parallel-security/sodium-upstream-tree-regression.mjs
# Only after independently acquiring a real and safe pinned v2.5.2 ZIP:
node research/parallel-security/sodium-upstream-tree-proof.mjs --verify-installed /absolute/path/to/sodium_compat
```

Upstream refs: https://github.com/paragonie/sodium_compat/releases/tag/v2.5.2 and https://github.com/paragonie/sodium_compat/tree/3246b36803c177847e677862fedeb7f937869adb . No changes outside `research/parallel-security/`.
