# npm archive provenance and embedded notices — 20 October 2026

**Scope:** exact locked `jedison@1.27.1` (browser runtime), `esbuild@0.25.12` (build tool), `playwright-core@1.55.1` (test tool), and 26 optional `@esbuild/*` platform packages. This complements the fixed 29-entry lock inventory; it does **not** silently inflate that number or constitute complete legal review.

## Confirmed exact upstream source evidence

| Component | Original source tag | Evidence | Package/runtime effect |
|---|---|---|---|
| jedison 1.27.1 | [LICENSE](https://github.com/germanbisurgi/jedison/blob/v1.27.1/LICENSE), [package.json](https://github.com/germanbisurgi/jedison/blob/v1.27.1/package.json) | MIT with German Bisurgi copyright; source manifest says zero runtime dependencies, exports ESM/CJS/browser builds | Jedison is compiled into editor JS; retain literal MIT attribution |
| esbuild 0.25.12 | [LICENSE.md](https://github.com/evanw/esbuild/blob/v0.25.12/npm/esbuild/LICENSE.md), [package.json](https://github.com/evanw/esbuild/blob/v0.25.12/npm/esbuild/package.json) | MIT with Evan Wallace copyright. npm manifest has `postinstall: node install.js` and 26 optional binary packages | Build-time executable with install-script supply-chain exposure; must be audited in CI, but not a browser-runtime package |
| playwright-core 1.55.1 | [ThirdPartyNotices.txt](https://github.com/microsoft/playwright/blob/v1.55.1/packages/playwright-core/ThirdPartyNotices.txt), [npm packaging exclusions](https://github.com/microsoft/playwright/blob/v1.55.1/packages/playwright-core/.npmignore) | Apache-2.0 package contains a 70,249-character original third-party attribution file with **44 candidate named project header lines** (regex count, NOT a legal component count). npm packaging rules explicitly include ThirdPartyNotices.txt | Build/test-only browser automation. Bundled third-party code may have additional license duties if tool is ever redistributed. It is not included in currently described shipped editor bundle |

The 26 `@esbuild/*` optional npm entries share the one compiler release `0.25.12` as platform variants. A lock entry is not a standalone embedded library license attestation. We did not extract and hash each native platform binary archive.

## Security advisory and classification review

- Playwright [GHSA-7mvr-c777-76hp](https://github.com/advisories/GHSA-7mvr-c777-76hp) states affected `playwright` npm versions **less than 1.55.1**, patched at **1.55.1**. Our lock is specifically `playwright-core`, also at version 1.55.1, and that repository shares installer code; this **does not prove the npm advisory applies directly to `playwright-core`**. The exact-version source includes the release fix; assess the installer scripts and usage model independently, do not invent an active vulnerability.
- Esbuild [GHSA-gv7w-rqvm-qjhr](https://github.com/advisories/GHSA-gv7w-rqvm-qjhr) was **WITHDRAWN** 17 June 2026 because the original affected npm package attribution was incorrect; affected code was the Deno ecosystem module, not automatically Node npm esbuild `0.25.12`. Do NOT classify this withdrawn advisory as an open critical npm finding. Its historical report still motivates authenticated binary installation and locked integrity.
- This review did **not** execute a comprehensive 43/43 up-to-date OSV query and cannot assert 0 known vulnerabilities. Exact npm tarballs, embedded bundles, latest registry versions, production use paths, and other advisories remain a required separate audit.

## New reproducible installed-archive check

`node research/parallel-security/npm-source-gate.mjs`: checks exact three direct lock pins, expected original LICENSE family contents, the editor's literal Jedison notice and the installed Playwright ThirdPartyNotices body. **Requires a trusted `npm ci` checkout** (not available in this isolated environment); exit 2 reports missing archive evidence, exit 1 reports a mismatch, exit 0 only attests to listed file/text checks. The source GitHub review above does not prove installed tarball parity.

## P1/P2 decisions

**P1** Ensure commercial artifact exposes the Jedison MIT attribution. For any redistribution of test tools/Playwright bundles, preserve the required Apache-2.0 NOTICE and embedded-license texts. Obtain independent legal review before client distribution. **P2** Run approved exact-pin npm CI with installed archive test, monitor advisories and review esbuild's executable `postinstall` permissions and download origins. No authorizations or production source/lock changes made from this research branch.
