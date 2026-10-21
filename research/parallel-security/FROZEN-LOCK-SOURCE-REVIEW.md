# Frozen independently retained 43-pin source/lock baseline — 21 October 2026

**Security problem:** prior `lock-provenance.mjs` was a useful metadata-shape policy (source from `github.com`, 40-hex ref, valid SRI), but a maliciously rewritten Composer `source.url` pointing to an arbitrary GitHub repo or a rewritten npm tarball plus valid **attacker-generated SHA-512** could still satisfy such *shape rules*. A syntactically valid checksum is not a preapproved checksum. The exact production dependency version can remain unchanged while the revision or downloaded archive changes.

**New independent, read-only defense:** `frozen-lock-baseline.mjs` binds the **literal original checked-in bytes** of the Composer production lock (14 packages), editor npm lock (29 packages, including 26 optional platform binaries), and root editor package manifest to **three separately retained SHA-256 digests** *and* Git's exact blob IDs. Main source snapshot `59c5289b74cf85859711d9a248af8efe0762cd10` and the historical Security PR base both expose byte-identical versions of these three lockfiles. The SHA-256 expectations were independently computed from the real GitHub file bytes and checked against known SHA-256 reference tests during implementation.

| Original source | Expected SHA-256 | Git object ID |
|---|---|---|
| `cms/composer.lock` | `873918bfbe8ba55cf33f298e0ad46a688d54075dac55c87e696a1ad5e654a6e1` | `fe4d35b16ef0576ac8a818ce861ea8480601b9fb` |
| `cms/editor/package-lock.json` | `d045ae0f50635f9c544b856c3d4fa139f04ae3c30cb115c4d8d9b0e840827db1` | `ab73c0cb516e7b053dbef0502ee88d658a654037` |
| `cms/editor/package.json` | `3b0c55cc432c44214870437e94e23ffc6f84dbae4df5aeebdf1587130918b059` | `b0d964fca02d44249f9fbb8ed3ac5b2f9b50bc00` |

The proof reads each original on-disk file with bounds, no symlinks/hardlinks, descriptor and inode+timestamp consistency across reads and independently recalculates SHA-256 and Git blob identity. The complete snapshot is checked **before** the 43-package semantic policy. It does **not** trust a file's own declared source/integrity or a mutable release label. Any change of even whitespace is treated as *unreviewed dependency change* requiring conscious review of source revision, original archives, vulnerabilities and LICENSE/NOTICE before updating this research baseline.

`frozen-lock-regression.mjs` copies the **actual original locks** to a disposable private directory, verifies the unchanged real versions and executes hostile revisions of source URL/ref, dist URL, license/dependency metadata, valid-looking npm integrity, platform execution flags, package scripts, duplicate/additional dependencies, symlink/hardlink/missing lock files and harmless-looking byte changes. No commits, source locks, releases, npm/composer install or network traffic occur.

**Limitations:** this is an owner/research-reviewer established lockfile baseline, **not** independent upstream publisher signature, archive-byte SRI validation, full source tree audit, real OSV 43/43 response, current npm/Packagist live version review, source LICENSE compliance or authorization to install code. A reviewer with authority to replace both the application lock and this research baseline could intentionally rotate both; Git review policy and independent human acceptance remain essential. The older pinned package revisions may contain vulnerabilities irrespective of unchanged hashes. Do not promote release or Stage2 based on this gate.

```sh
node research/parallel-security/frozen-lock-baseline.mjs
node research/parallel-security/frozen-lock-regression.mjs
```

**Boundary:** all work is in `research/parallel-security/`. Original CMS files were READ ONLY. The main integrator owns dependency update decisions, workflow changes, merges, and production/Stage2 release approval.
