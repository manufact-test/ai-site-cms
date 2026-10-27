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
