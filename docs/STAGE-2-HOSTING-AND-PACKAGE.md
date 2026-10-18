# AI Site CMS — read-only PHP doctor and internal offline package, checkpoint v1.34

**Date 18.10.2026. Stage2 in progress, NOT accepted.** This is a reproducible *internal* empty CMS kernel package; **not** a production-ready deployment, authenticated CMS, client site, or finished editor.

## Runtime compatibility doctor (read-only and local only)

- [Source](../cms/src/Hosting/RuntimeDoctor.php) and [CLI entry](../cms/bin/doctor.php). Requires explicit `php bin/doctor.php --check`, optional `--document-root=/exact/cms/public`.
- Checks PHP >=8.1 and core extensions `json`, `pdo`, `pdo_mysql`, `openssl`. Explicit document root is verified using a canonical realpath comparison with the package's `public` directory. Wrong docroot rejects; no argument gives **not_checked**, not implied proof.
- Produces bounded JSON report without file paths, credentials, DSN, hosting identifiers or phpinfo. Reads only runtime facts, does not open DB or network, and never writes files. `real_host_compatibility_verified` and `safe_to_deploy` are **always false**, even on a green CLI result.
- Important: this does NOT test MySQL credentials, Apache/FPM rewrites, TLS, file permission model, Hostinger hosting rules, DB privileges or ability to upload/deploy.
- [CI run #39131771955](https://github.com/manufact-test/ai-site-cms/actions/runs/39131771955) **7/7 successful jobs**, including *actual* PHP **8.1, 8.2, 8.3, 8.4** version matrix (with installed matching extensions), separate SQLite and real disposable MySQL8.4. **24 deterministic doctor assertions** from tests, including rejected missing extension/version, wrong docroot and CLI misuse. No Hostinger contacted.

## Internal offline installation bundle

[Builder](../cms/tools/build-internal-package.cjs), [security test](../cms/tools/test-internal-package.cjs). Reuses real upstream Jedison v1.27.1 and pinned Composer 14-package runtime. Build on GitHub Node/Composer tooling only — neither required on actual PHP host after packaging.

Structured as:

```text
internal-stage2-package/
  public/index.php              # ONLY intended browser document root
  src/                           # PHP kernel/storage/doctor source, nonpublic
  vendor/                        # pinned runtime Composer dependency code
  composer.json / composer.lock  # build provenance, nonpublic
  private/
    editor/editor.js             # compiled Jedison, NEVER public in Stage2
    editor/meta.json
    editor/THIRD_PARTY_LICENSES.txt
    package-manifest.json        # SHA256 file/size inventory
```

- Actual `425` packaged files from pinned installs; no Node/npm runtime on hosting; no `bin/install.php`, tests, .env, local DB or secret directory inside package. **This also means the package is not a complete production installer — installation requires a separately authorized CLI/workflow design.**
- Refuses symlinks, suspicious/secret relative names, parent traversal, unexpected huge/nonregular files, unlisted added files and local hash/size mismatches. Includes upstream Jedison MIT notice and Composer vendor dependencies.
- Hashes provide *local integrity checking*, **NOT cryptographic source authentication/signing**. Archive **not** safe for unattended installation, lacks verified extraction/upgrade/backup, legal full SBOM and external approval.
- `private/editor` remains outside `public`: the adapter is *not* an authenticated accessible admin panel. Proper webroot configuration is an unverified deployment requirement.

**[Editor/package CI #39131661335 — 1/1 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/39131661335):** native Chromium upstream Jedison interactive test passed, static build reproduced, package 425 files built+verified, **19 package security/integrity assertions**, PHP built-in HTTP package served `GET /api/health` 200 while `POST /api/publish`, `/private/editor/editor.js`, `/vendor/autoload.php` all returned 404. The internal 7-day GitHub build archive `stage2-jedison-static-ci-only` is **not** a real website, signed release or client deployment (artifact ID 12138351903).

Initial packaging CI failures were diagnosed and resolved: capitalized PHP `src/Storage` source namespace was incorrectly rejected as user data; fixed to ban top-level storage. The linked legal-comment sidecar from esbuild was absent because no linked comments were emitted; the **required explicit upstream MIT notice remains packaged**, sidecar is optional. CI was rerun until successful; these negative debug runs are not product failure.

## Remaining before Stage2 completion

Stage2 architecture decision A is selected: Slim4 + Opis2.6 + Jedison1.27.1 (RJSF fallback). Current file can only bootstrap `GET /api/health`, with separately tested CLI DB migration code and private browser fields. Missing auth/admin, AI manifest, single-block preview, draft/publish, revisions, full backup/restore, site adapters and universal behaviors. Real target shared hosting was **never accessed or verified**. Even permission for read-only Hostinger inspection must be separate and explicit; running an installer or deploy requires further authorization.

Research branch remains unmerged. CELIKOM and all client websites untouched. Stage0/Stage1 accepted, Stage2 not accepted, Stage3 not started; 193 requirements (135 mandatory, 42 desirable, 16 not-needed), **0/135 product mandatory requirements accepted**, no MVP before complete first release.

## Next Stage2 engineering increment

Test fail-closed recovery from interrupted MySQL DDL / migration gaps, include reproducible independent SBOM/NOTICE ledger and safely versioned offline deployment packaging with explicitly tested rollback before any target-host execution. Do not enable writable HTTP routes prior to production auth/CSRF/validation or consider this initial package as deployable product.
