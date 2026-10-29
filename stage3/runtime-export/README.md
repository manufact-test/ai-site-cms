# Stage3 D1: independent runtime exports (no deployment)

The existing static published exporter is the source of truth. The output is an immutable *published* multipage site, never a draft; includes HTML, SEO, media, redirect fallbacks, responsive CSS and standalone collector form actions. These commands only create new directories.

## CMS published site → output (CLI, isolated database)

    php stage3/server/bin/export-technology.php site-example php /absolute/new-php
    php stage3/server/bin/export-technology.php site-example next-static /absolute/new-next-static
    php stage3/server/bin/export-technology.php site-example next-ssr /absolute/new-next-ssr

Requires an explicitly configured isolated STAGE3_DSN. For forms, existing exporter requires STAGE3_FORM_ENDPOINT (HTTPS) and form secret. No form provider secret is exported; the independent visitor still requires a separately hosted collector. Node.js is needed only to generate PHP packages, not serve them.

## Already exported HTML → other runtime

    node stage3/runtime-export/bin/build.cjs /absolute/published-html php /absolute/new-php
    node stage3/runtime-export/bin/build.cjs /absolute/published-html next-static /absolute/new-next-static
    node stage3/runtime-export/bin/build.cjs /absolute/published-html next-ssr /absolute/new-next-ssr

The input must be the untouched Stage3 published export manifest with all file hashes matching. Symlinks, extra files, missing media, unsafe paths, duplicate routes and existing output paths are rejected.

## Three deliverables

- HTML: pre-existing standalone, requires host redirect rules for real HTTP 301.
- PHP: independent PHP 8.1+ visitor router, real HTTP 301, SEO/media/forms parity. Serve ONLY the generated public/ document root with Apache mod_rewrite or equivalent. Private data/ must never be a web document root. Offline loopback: php -S 127.0.0.1:8181 -t public public/index.php.
- Next Static: generated Next.js 15 React App Router pages. From generated directory run npm install and npm run build; serve resulting out/ as static files. Redirect pages use HTML noindex fallback, NOT HTTP 301 without host rewrites. Does not need Node to serve.
- Next SSR: generated Next.js 15 App Router React server components reading published immutable HTML; middleware produces real 301. From generated directory npm install, npm run build, npm run start on Node.js capable host. PHP-only hosting cannot serve SSR.

Every target carries runtime-build.json with published version, source revision, source manifest hash, route list and collector configuration; data/ retains the source snapshot. For offline rollback, select an older immutable published snapshot, build a NEW directory, verify it and only then switch traffic with separate owner approval. No deployment switch is performed here.

CI uses one disposable published-site HTTP/SQLite E2E to verify emitted runtime structure, manifest integrity, redirects, PHP HTTP, media/SEO and no overwrite. **A separate disposable CI job additionally proves real Next Static build and Next SSR loopback HTTP (not production hosting).** React pages preserve trusted rendered HTML in React components; this is not an automatic conversion of the original sections to editable JSX source components. Stage2 NO-GO and Stage3 0/135 owner acceptance remain unchanged.

D2 private Studio handoff: [D2-PUBLISHED-HANDOFF.md](./D2-PUBLISHED-HANDOFF.md). D3 local-only cutover rehearsal: [D3-LOCAL-CUTOVER.md](./D3-LOCAL-CUTOVER.md).

D4 verified offline ZIP handover: [D4-VERIFIED-DELIVERY.md](./D4-VERIFIED-DELIVERY.md). Includes one-command D2 JSON -> HTML/PHP/SSR ZIP, real built Next Static ZIP, per-file SHA256/CRC and Apache/Nginx redirect instructions, with no deployment.

D5 one-command shipment and local readiness audit: [D5-SHIPMENT-PREFLIGHT.md](./D5-SHIPMENT-PREFLIGHT.md).

D6 actual loopback rehearsal from independently verified ZIP (HTML/Next Static simulated host, genuine independent PHP router): [D6-LOCAL-HTTP-REHEARSAL.md](./D6-LOCAL-HTTP-REHEARSAL.md). D5 --http-rehearsal opt-in integrates the local HTTP evidence in the same shipment receipt, with no production contact.


### 29 Oct 2026 — operator-run live HTTPS verification, no remote call during development

An additional independent CLI utility `node stage3/runtime-export/bin/verify-live-release.cjs /ABS/published-vN-handoff.json https://client-domain.tld` provides a **real read-only external HTTPS comparison** when and only when the owner chooses an authorized target and executes it on their own workstation. It validates the local immutable handoff's manifest SHA; resolves a public DNS hostname, refuses IPv4 literals, local/internal/test names and reserved/private IPv4, pins the vetted public IPv4 to an HTTPS certificate-validated connection, and never follows redirects. It reads exactly `GET /_cms-connect.json` (bounded JSON) and `HEAD /` (homepage HTTP 200, HTML type), compares site ID/version/revision/manifest SHA and optionally canonical origin, and emits a JSON report with explicit booleans. It makes no form submissions and does not deploy. Production or external DNS were **not contacted** by the developer; CI runs only the tiny pure-validation offline test. A matched certificate, HTTP response and identity still cannot confirm visual quality, client signoff or delivery of an actual form. Owner-only acceptance gate remains untouched.


### 29 October 2026 — one cached stylesheet per independent published site

The independently published HTML, PHP, Next Static and Next SSR exporters now **extract the publisher's identical global style rules** from every page into one content-addressed `styles/site-{sha256}.css`. Each immutable published HTML route references that stylesheet; site-specific inline Design Graph, section and conditional-form CSS remain local to the affected page. The D2 package and direct PHP static exporter both emit a declared SHA-256 stylesheet and account for the extra file; existing historical releases without `stylesheets` stay valid. The D1 verifier rejects missing/mismatching CSS or missing HTML references; Next adapters carry the asset into `public/styles` and reference it from their root layout; standalone PHP routes CSS from private `data/styles` with one-year immutable caching. A D4 delivery verifier checks the CSS against published provenance; D6 localhost HTTP rehearsal checks CSS GET and HEAD for independent PHP and static output. The D5 audit now reports actual shared stylesheet bytes, published HTML bytes and **estimated avoided repeat inline CSS bytes** (`(pageCount-1) × cssBytes`); this is a structural byte calculation, not a real Core Web Vitals claim.

Independent PHP visitor HTML and CSS now honor gzip Accept-Encoding when available, provide representation-specific strong ETags, `Vary: Accept-Encoding`, and exact Content-Length/HEAD responses. A matching ETag returns 304 before file body is read. MIME and max-age policies remain unchanged; JPEG/WebP/MP4 continue without recompression. No host was accessed or deployed. The live-host acceptance gates #187 and #193 remain partial until owner-approved real-host measurement.

## D7 — сравнение фактических файлов выпусков

    node stage3/runtime-export/bin/audit-delivery.cjs /ABS/release.zip --fail-on-performance
    node stage3/runtime-export/bin/compare-delivery-performance.cjs /ABS/old.zip /ABS/new.zip
    node stage3/runtime-export/bin/compare-delivery-performance.cjs /ABS/old.zip /ABS/new.zip --fail-on-regression
    node stage3/runtime-export/bin/ship.cjs /ABS/published-v2-handoff.json php /ABS/new.zip --compare-to=/ABS/old.zip --enforce-no-regression

D5 report now contains `performance` (per-route HTML, gzip estimate, CSS, referenced media, image loading) and optionally `performanceComparison`. Defaults do not fail a release for weight advisories; strict gates are explicit. Both ZIPs must be valid immutable releases of the **same** site and the newer one must have greater publication version. Only local verified bytes are inspected; no external host/LCP/browser rendering is measured. See [D5](./D5-SHIPMENT-PREFLIGHT.md).
