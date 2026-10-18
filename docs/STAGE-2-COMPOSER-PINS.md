# AI Site CMS — pinned PHP package ledger (Stage2 v1.32)

**Created 18.10.2026**, from actual CI-resolved `cms/composer.lock`. Composer lock fixes source and dist references; **not** a security certification, legal opinion or exhaustive license/SBOM inspection. Public hosting not accessed.

| Pinned Composer package | Version | License declared in upstream metadata |
|---|---|---|
| fig/http-message-util | 1.1.5 | MIT |
| nikic/fast-route | 1.3.1 | BSD-3-Clause |
| opis/json-schema | 2.6.0 | Apache-2.0 |
| opis/string | 2.1.0 | Apache-2.0 |
| opis/uri | 1.1.0 | Apache-2.0 |
| psr/container | 2.0.2 | MIT |
| psr/http-factory | 1.1.0 | MIT |
| psr/http-message | 2.0 | MIT |
| psr/http-server-handler | 1.0.2 | MIT |
| psr/http-server-middleware | 1.0.2 | MIT |
| psr/log | 3.0.2 | MIT |
| ralouphie/getallheaders | 3.0.3 | MIT |
| slim/psr7 | 1.8.0 | MIT |
| slim/slim | 4.15.3 | MIT |

**14 packages**, all declare MIT, BSD-3-Clause or Apache-2.0. `cms/tests/dependency-lock.php` fails on changed/unknown package versions, unexpected dependencies, missing source/dist references, or other declared licenses. `composer validate --strict` checks lock/manifests; `composer audit` checks Composer advisories at CI run time. Exact license text/NOTICE of every imported source + bundled static assets must be retained and checked before a client deployment. Lock metadata is not independent attestation, and clean advisory results cannot prove absence of vulnerabilities.

**Caution:** `cms/composer.json` permits SemVer ranges for future *deliberate lock updates*, but `composer install` uses these committed exact pins. Updating dependencies requires a reviewed update of the expected list, advisory check, license notices and smoke results. Runtime PHP floor is provisional >=8.1; real Hostinger read-only check was NOT performed. Editor Jedison is not yet shipped/bundled and its future npm lock remains a Stage2 task.

**Manual operation only:** The CLI installer `php bin/install.php --apply` requires explicit dedicated credentials and site ID; never use with live/Hostinger data without separate authorization.
