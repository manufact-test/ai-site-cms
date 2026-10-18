# AI Site CMS — Stage2 read-only site runtime topology matrix

**Checkpoint:** v1.41 / 18.10.2026. **Source SHA:** `f16c6ca19ce840b6dd46bbec74459fa346393cf7`.

## Code and checks

- `cms/src/Hosting/SiteRuntimeTopology.php`: five explicitly declared delivery classes with PHP CMS + separate site's runtime and public assets; reject mixing/nesting CMS/site roots, site identity duplication, foreign public files and symlinks; caps self-declared/never host-probed. PHP CMS requires php81, pdo, HTTPS, separate public roots, private storage, route rewrite; independent PHP site requires `sitePhp`, Next SSR `nodeRuntime` + `reverseProxy`. React SPA and Next export served as built static artifacts only.
- `cms/bin/site-runtime-topology.php`: explicit read-only CLI. Example: `php cms/bin/site-runtime-topology.php --check --cms-root=/canonical/cms --site-root=/canonical/site --family=react-spa --capabilities-file=/private/caps.json`. The JSON capabilities file has **all nine boolean keys**: `php81,pdo,https,privateStorage,isolatedRoots,rewriteRoutes,sitePhp,nodeRuntime,reverseProxy`. These are **operator assertions, not detected capabilities**; no paths or secrets appear in the report.
- `cms/tests/site-runtime-topology.php`: 84 checks including missing host caps, SSR incompatibility, bad paths, PHP in static exports, leaked .env, symlink to private, React SPA/Next static, multi-site CMS root sharing.
- `cms/tests/site-runtime-cli.php`: 12 separate CLI-process checks including invalid options/credentials/symlinks and silent read-only refusal.
- Both test suites integrated in PHP core, PHP 8.1–8.4 compatibility matrix and fully compiled editor CI. Package now **440 files**. Original release/upgrader tests remain.

## Verified

- [Full PHP+SQLite+MySQL — **7/7 SUCCESS**](https://github.com/manufact-test/ai-site-cms/actions/runs/39157813640).
- [Editor Chromium/Jedison, package, signed release — **1/1 SUCCESS**](https://github.com/manufact-test/ai-site-cms/actions/runs/39157813797); **239** signed-upgrade end-to-end checks unchanged in intent.

## Not done

No actual host access, SSH, web root rewrites, PHP-FPM/Apache, Next.js Node SSR, real SPA export, production site adaptation or API/permissions; no visitor-site dependence proof beyond policy declaration. This is Stage2 architecture evidence **ONLY**, not Stage2 acceptance or product feature acceptance. Hostinger requires a separate permission even for read-only check. Continue Stage2 via large batched tasks and do not update documentation except on explicit owner handoff request (see DEVELOPMENT-WORKFLOW.md).
