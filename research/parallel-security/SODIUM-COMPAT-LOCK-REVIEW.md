# Isolated sodium_compat Composer lock: provenance guard (21 October 2026)

## Threat and boundary

The existing independently reviewed **full source-tree SHA-256** protects examined PHP bytes but did **not** constrain the isolated Composer lock's `dist.url`, `dist.type`, additional packages or dev dependencies. A substituted HTTPS host, transitively injected package or a malicious future Composer reinstall would be incorrectly described as a matching signed upstream 2.5.2 revision solely from its 40-hex `reference`.

**New research-only gate** rejects such evidence *before any actual native-free verification*: requires one bounded canonical regular Composer lock held **outside** the reviewed package root, no symlink ancestors/hardlinks, stable inode/bytes/timestamps while reading, exactly **one** production package `paragonie/sodium_compat` and **zero** dev packages, exact Git upstream URL, exact 2.5.2 tag commit for source **and** dist references, `zip` dist type and canonical GitHub API zipball URL `https://api.github.com/repos/paragonie/sodium_compat/zipball/3246b36803c177847e677862fedeb7f937869adb`. The independently retained whole-package digest is STILL mandatory; a nominal GitHub ZIP URL or self-calculated digest is not independent publisher/source verification. The attestation JSON records the isolated lock SHA-256 alongside source-tree SHA for before/after comparison.

**Adversarial evidence:** 37 synthetic tests, including original 20 and 17 new lock-origin/contents attacks. Their output is explicitly **NOT a genuine upstream tarball**, live GitHub ZIP content, audit by a qualified person, physical PHP without native Sodium, actual target SAPI test, or release approval.

If the integrator obtains a legitimate isolated Composer lock using a different canonical GitHub dist endpoint, **do not loosen this gate silently**: compare its exact download origin to independently approved upstream provenance and consciously adapt the allowlist with fresh negative tests and signed-source human review. No dependencies, CMS code, Composer lock or workflow have been modified here.

```sh
node research/parallel-security/sodium-compat-attest-regression.mjs
# Independent external source and physical Sodium-free PHP remain required:
node research/parallel-security/runtime-sodium-proof.mjs
```
