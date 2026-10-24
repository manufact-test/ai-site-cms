# Stage 3 – standalone offline static release audit

**Isolated worker deliverable** for `feature/stage3-release-audit-lab`. This directory contains everything needed to inspect a **pre-existing** export produced by `stage3/server/bin/export-published.php`. It is not a publisher, deployment tool, penetration test, production gate, or formal product acceptance. Stage 2 remains **NO-GO**; Stage 3 remains **0/135 officially accepted**.

## Requirements and commands

Node.js **18+**, no npm install, zero third-party dependencies, zero HTTP requests, and no CMS runtime. From the repository root:

```bash
node stage3/release-audit/bin/audit.cjs /absolute/path/to/export --json
node stage3/release-audit/bin/audit.cjs /absolute/path/to/export
node stage3/release-audit/bin/audit.cjs /absolute/path/to/export --json --max-file-bytes 16777216
node stage3/release-audit/tests/smoke.cjs
```

The first positional argument is the existing export directory (relative paths are resolved locally). `--json` emits just one JSON object to stdout; no timestamps, host probes, or changes to the export. Without `--json`, prints compact diagnostic lines. **Exit 0:** no errors (warnings allowed). **Exit 2:** failed audit or file access. **Exit 1:** invalid command-line invocation. Maximum file size defaults to **16 MiB** (settable in range 1–256 MiB); exported images also must meet the CMS **450 KiB** cap. Directory scan stops past 10,000 entries/32 levels; manifest collections are capped at 5,000 entries each. Inspection must run on a stable, non-mutating export to avoid filesystem race conditions.

## Manifest support and checks

The tool reads `release-manifest.json` format `manufact-ai-static-site-v1`, requiring `pages[] {path,file,sha256}`, `assets[] {id,file,mime,sha256}`, and `redirects[] {from,to,file,sha256}`. It validates `siteId`, `publishedVersion`, page route-to-file derivation (`/about/` → `about/index.html`, `/` → `index.html`), relative ASCII paths, IDs, duplicates, image extension ↔ MIME, file signature, redirects terminating at existing pages and avoiding cycles, all recorded SHA256 hashes, required home, and unexpected files. It rejects symlinks, special/executable/private files, path escapes, oversized inputs, and missing files.

HTML checks: static link targets, image `src`/`srcset`, `og:image`, local section anchors, duplicate element IDs, empty title, UTF-8, OG baseline, optional meta description → `og:description`, canonical/`og:url` when `publicOrigin` exists, and `noindex` pages excluded from sitemap. Only renderer-style `noindex,follow` is accepted as a robots meta. Redirect HTML must contain `noindex,follow` and the manifest's meta-refresh target. Flags scripts, inline event-handler attributes, PHP/unresolved secret-like templates, embedded active elements, CMS/private endpoint URLs, and unexpected page refreshes.

When **`publicOrigin` is set**, the export must contain checksummed `sitemap.xml` and `robots.txt`, valid sitemap URLs for **all and only** indexed manifest pages, and crawlable robots instructions with correct sitemap URL. When **not set**, those generated files and canonical/`og:url` are intentionally absent; a warning documents the mode, but it is not a failure.

A configured `formCollector` is recorded as **an unverified configuration fact**. The tool validates POST actions against `formCollector + /forms/{siteId}/{sectionId}` and checks that section is present in the page, but **cannot** prove network reachability, TLS certificate validity, secret/HMAC correctness, delivery, storage, rate limiting, or customer notifications. A public form without configured collector is an error.

## JSON result contract

```json
{
  "format": "manufact-ai-release-audit-v1",
  "checks": [{ "id": "filesystem", "status": "pass", "errors": 0, "warnings": 0 }],
  "pages": [{ "path": "/", "file": "index.html", "sha256Verified": true }],
  "assets": [{ "id": "photo-one", "file": "assets/photo-one.png", "mime": "image/png", "sha256Verified": true }],
  "errors": [],
  "warnings": [],
  "summary": { "ok": true, "pages": 1, "assets": 1, "redirects": 0, "errors": 0, "warnings": 0 }
}
```

`checks` always includes `filesystem`, `manifest`, `integrity`, `links`, `seo`, `security`. Failures contain `{phase,code,file,message}`. The example above abbreviates the `checks` list. Output is deterministic for unchanged inputs, has no secrets or absolute local paths, and can be saved by shell redirection **outside** the audited export directory. The CLI never writes output files itself.

## One integrated smoke test

`tests/smoke.cjs` generates synthetic disposable directories using OS temp, checks a valid origin/collector export and a valid origin-less export, verifies CLI JSON/exit status, checks read-only/deterministic behavior, then asserts rejection of tampered SHA256, traversal, missing home, broken anchors/images, PHP files, scripts, wrongly indexed noindex pages, an unconfigured form and symlinks. Fixtures are cleaned up in `finally`. Only Node core modules are used.

## Explicit limitations / integrator notes

- The scanner is a quote-aware **DOM-less lexical inspector, not a browser HTML5 parser**. It can spot concrete renderer-format errors but cannot prove the absence of all HTML/CSS/JS injections or render behavior. Title/sitemap XML inspection uses deliberate narrow syntax matching; it is not full HTML/XML schema validation. Untrusted deliberately polyglot inputs need a separate trusted parser/security review before acceptance.
- SEO expectation for `noindex` is derived from published HTML because `release-manifest.json` does **not** include the original page SEO policy. It detects sitemap contradictions, but cannot detect an editor-intended noindex page whose flag was erroneously removed both from HTML and from expected manifest metadata. **Recommendation:** if the export contract is ever versioned, add explicit per-page SEO intent/visibility to the manifest; do not silently change the current exporter for this isolated task.
- The manifest protects **listed content** against accidental byte drift, but is not signed or authenticated. A tampered file plus modified checksum can look self-consistent. Supply-chain trust requires an independently authenticated digest/signature of the whole export.
- This tool never contacts real domains, does not execute PHP, does not check server-side HTTP **301** response (static redirect fallback uses meta refresh), and does not certify the collector. It does not test robots.txt against a live crawler or any search index.
- It only reads the export path. Filesystem contents changing concurrently can undermine even `lstat`/`realpath` checks (TOCTOU). Audit a frozen snapshot/read-only filesystem for stronger assurance.
- Do **not** wire this into CI or publishing without the main integrator's review and approval. No code outside `stage3/release-audit/` was edited; no main or production merge is part of this deliverable.

## Safe integration (main developer only)

1. Inspect `git diff <worker-start-sha>..<worker-completion-sha> --name-only` and confirm **every** path starts with `stage3/release-audit/`.
2. Review CLI for zero external packages/net calls and run the single smoke test locally.
3. On the **main developer branch** `feature/stage3-ai-site-contract`, cherry-pick the worker commit by its exact SHA (or copy-review the subtree) **without touching `main`**. Do not merge the entire worker branch blindly, because it may contain pre-existing baseline differences.
4. Main developer decides any subsequent CI / workflow integration and acceptance; no automatic publication or readiness assertion.
