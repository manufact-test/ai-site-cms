# AI Site CMS — Stage 2 real Jedison browser build and dependency lock (v1.33)

**Date:** 18.10.2026 · **Status:** internal engineering research integrated into Stage2 source tree, **NOT an accepted CMS editor** or public/hosted release. Main foundation A: PHP Slim4, Opis JSON Schema2.6, browser Jedison1.27.1. The production editor will require manifest/auth/isolated preview and site adapters in later stages.

## Exactly what was built

`cms/editor/` is a distinct Node **development/build-time** package, with committed `package-lock.json` and **real upstream Jedison 1.27.1**. `src/index.js` exposes a compact browser-only `mount({container,schema,data,onChange})` adapter from a **trusted, closed test schema**, providing current typed values/change callback/destroy. It performs **no persistence, admin/public routes, user permission checks or publication**. No PHP pages and no public site JS import the editor in this Stage2 state. Do NOT expose its prototype to untrusted manifests or use it for a production site.

`scripts/build.mjs` bundles a self-contained `dist/editor.js` via esbuild 0.25.12; Node is needed only in local development and GitHub CI, **not at browser runtime or on a PHP-only shared host**. Compiled JS plus `meta.json`, upstream Jedison `THIRD_PARTY_LICENSES.txt` and linked esbuild legal comments are uploaded as an internal short-retention artifact.

**Actual built JS: 254,753 bytes (uncompressed)**, not a claim about a future finished CMS admin bundle. Production asset size/performance remains unmeasured.

## Verified real CI, October 18

[**Editor Actions #39129269825: editor-browser 1/1 SUCCESS**](https://github.com/manufact-test/ai-site-cms/actions/runs/39129269825). Verified exact job output:

| Evidence | Result |
|---|---|
| `npm ci` with actual committed lock | **PASS** |
| Root dependencies | Jedison **1.27.1**, esbuild **0.25.12**, playwright-core **1.55.1** |
| `scripts/verify-deps.cjs` | **PASS** — 29 locked package records with integrity + declared MIT/Apache-2.0/BSD-3-Clause license metadata; includes optional build platform binaries |
| `npm audit --audit-level=high` | **0 known vulnerabilities reported** in this CI run; not a full security audit |
| Static esbuild output, independent of Node runtime | **PASS** |
| Real Chromium browser interaction | **PASS** — 12 asserted behaviors, headline and integer field edits, actual Jedison change events, reentrant destroy, refusal of open/invalid schemas, no page JS exceptions or browser network requests |
| Repeated build under same pinned dependencies | **Byte-identical compiled JS**, `cmp` PASS |
| Internal artifact | `stage2-jedison-static-ci-only`, artifact ID **12137545566**, approximately 50KB zipped, 7-day retention. **Not a website or downloadable release**. |

[**Parallel PHP Actions #39129269728: 3/3 SUCCESS**](https://github.com/manufact-test/ai-site-cms/actions/runs/39129269728) — existing php-core, SQLite schema/CLI and real disposable MySQL integration unchanged. The first pre-lock smoke [#39129038808](https://github.com/manufact-test/ai-site-cms/actions/runs/39129038808) had succeeded before the npm lock commit, and later locked run reverified it.

## Licensing and safety truth

- Included literal upstream **Jedison MIT license (Copyright ©2025 German Bisurgi)** from official upstream `LICENSE` in `cms/editor/THIRD_PARTY_LICENSES.txt`, copied into static artifact. esbuild linked legal comments are retained. MIT copyright/permission notice must stay with copies/substantial portions.
- esbuild binary/node package (MIT) and Playwright-core (Apache-2.0) are **build/test only**. Other npm lock entries are optional esbuild native-platform builds; their declared licenses were checked via lock. **These checks do not replace independent upstream license-file verification or the complete product SBOM**; do not treat this as legal sign-off.
- One research-safe field form **cannot** accept arbitrary user-supplied HTML/JS or unreviewed schemas. No sandboxed block preview yet; no authenticated admin page; do not offer a public editor URL.
- Browser zero-network test is limited to this small isolated fixture, not a guarantee for the full CMS.
- CI runner != actual Hostinger; no Hostinger access permission, no installation/upgrade performed. No client site touched.

## Remaining Stage2 exit conditions

The roadmap requires approved architecture, legal fixed dependencies, buildable packages and **an empty CMS running in a supported target environment**. Browser lock/build are now reproducible in CI. Still missing: hardened authenticated installation/distribution boundaries, real shared hosting evidence (separate permission), cross-package legal/SBOM audit, safe DB backups/recovery after interrupted DDL, public/single-block preview architecture and full AI contract. Stage3 **not started**; product mandatory acceptance **0/135**. The user authorized our technical choices, not live deploy.

Next useful engineering increment: read-only CLI hosting compatibility doctor (no secrets; not a hosting probe), a strictly separated asset packaging manifest for future admin-only endpoints, and more real storage recovery/adversarial tests before any write route.
