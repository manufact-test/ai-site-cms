# D8 — isolated form collector sidecar

## Why this exists

The Stage3 visitor runtime can publish real HTML forms, and the CMS already has a collector-only PHP entrypoint. A static visitor site needs a separately hosted HTTPS receiver. Before D8, the collector was source code under the main server tree, but the D5 operator handoff did not produce a self-contained collector package alongside the site delivery.

D8 makes that handoff explicit and verifiable. It does not create a new CMS, a new inbox or a new form protocol.

## Commands

Build and verify a standalone sidecar:

    node stage3/runtime-export/bin/package-collector.cjs /ABS/NEW-collector.zip
    node stage3/runtime-export/bin/verify-collector.cjs /ABS/collector.zip

Build a published site, its separate collector sidecar and the preflight report together:

    node stage3/runtime-export/bin/ship.cjs /ABS/published-vN-handoff.json html /ABS/site.zip --expect-origin=https://site.example --collector-zip=/ABS/collector.zip --http-rehearsal

The optional `--collector-zip` requires a published site with at least one form and an explicit collector origin in its immutable release. If the operator already has a collector installed, omit the flag and reuse it.

D5 outputs:
- the visitor-site ZIP;
- the separate collector ZIP, if requested;
- the independent preflight JSON report.

All three outputs are staged before publication, use no-overwrite hard-link publication, and are rolled back if a later output cannot be linked. Only files linked by the current invocation are removed on a failure; pre-existing destinations are never removed.

## Package layout and trust boundary

The package contains:
- `collector/server/collector-public/index.php` and `.htaccess` — the only public document-root files;
- private PHP classes needed by the existing Stage3 SiteRepository and FormGateway;
- a collector-specific bootstrap derived from the main bootstrap with the CMS admin API include removed;
- the exact first-party component JSON registry needed by ContractValidator;
- `collector/README.txt` and `collector/manifest.json`.

The ZIP does **not** contain `Api.php`, Studio, login, CMS public routes, database files, backups, drafts, customer data, secrets, SMTP credentials, Telegram tokens, node_modules or deployment automation.

Set the web-server document root to `collector/server/collector-public` only. Keep the parent private runtime and `collector/components` outside the document root. Never point the document root at the package root or `collector/server`.

## Runtime configuration

The collector must use the **same dedicated Stage3 database as the CMS inbox**. This is what makes an accepted visitor submission appear in the owner's existing CMS inbox. The collector and publisher must share the same private HMAC secret.

Configure these values privately in PHP-FPM or the hosting control panel:
- `STAGE3_DSN`
- `STAGE3_DB_USER`
- `STAGE3_DB_PASSWORD`
- `STAGE3_FORM_SECRET` — 32+ characters, same secret as the publisher
- `STAGE3_FORM_ORIGINS` — exact allowed HTTPS origins, comma-separated, no paths or trailing slash

Set `STAGE3_FORM_ENDPOINT` in the CMS to the collector HTTPS origin before exporting/publishing. Do not put environment values in the ZIP or a public file. Use the dedicated MySQL database for a real installation; SQLite is only for CI/lab.

Apache requires mod_rewrite and the supplied `.htaccess`. The package README includes an Nginx/PHP-FPM route example. HTTPS and actual host configuration remain operator responsibilities.

The collector accepts only `POST /forms/{siteId}/{sectionId}`. It validates the allowed origin, immutable release, HMAC, required fields, conditional fields, consent and per-visitor rate limit before storing the lead. It queues configured notifications in the existing delivery outbox; it does not send email or Telegram messages itself.

## Verification

`verify-collector.cjs` checks:
- ZIP path safety, exact inventory and file hashes;
- required bootstrap dependencies and component manifest identities;
- exactly two files in the public document root;
- absence of the admin API, Studio, private data, credentials and database files;
- presence of operator configuration and routing instructions.

The D8 CI test uses a disposable SQLite database and the actual extracted package. It:
1. builds and verifies the sidecar;
2. rejects an added public file;
3. lints all packaged PHP files;
4. creates and publishes a two-step conditional form in the disposable CMS database;
5. renders its signed immutable form action;
6. starts the extracted collector with PHP's loopback server;
7. rejects an unapproved origin, an invalid HMAC and an inactive conditional field;
8. accepts a valid submission and confirms the custom field values in the same CMS database.

No external DNS, hosting, remote collector, production database, customer data, real email or Telegram delivery is involved. The SHA-256 manifest is an integrity inventory, not a digital signature. Passing CI is engineering evidence only; it is not owner acceptance or permission to deploy.
