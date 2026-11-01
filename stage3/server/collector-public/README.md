# Isolated Stage3 collector entrypoint

This source directory is the collector-only document root used by the CMS runtime. For operator handoff, build the self-contained sidecar with:

    node stage3/runtime-export/bin/package-collector.cjs /ABS/NEW-collector.zip
    node stage3/runtime-export/bin/verify-collector.cjs /ABS/collector.zip

The packaged web-server document root is **collector/server/collector-public** only. Its public directory contains exactly index.php and .htaccess. The private PHP runtime and component manifests must remain outside the document root. The packaged bootstrap excludes the CMS admin API; the sidecar exposes no login, Studio, drafts or CMS API.

Configure the collector to use the **same dedicated Stage3 database as the CMS inbox**, so accepted submissions appear in the owner's existing CMS inbox. Required private environment variables:

- STAGE3_DSN
- STAGE3_DB_USER
- STAGE3_DB_PASSWORD
- STAGE3_FORM_SECRET — same private 32+ character HMAC secret used by the publisher
- STAGE3_FORM_ORIGINS — exact comma-separated HTTPS origins, no paths or trailing slash

Set STAGE3_FORM_ENDPOINT in the CMS to the collector HTTPS origin before publishing/exporting. No values belong in the ZIP or a public file. Use MySQL for real shared-hosting installations; SQLite is for isolated CI/lab only.

Only POST /forms/{siteId}/{sectionId} is exposed. The collector validates origin, immutable release, HMAC, fields, conditional logic, consent and rate limits before persisting a lead. It queues notifications through the existing outbox; it does not send email/Telegram messages itself. No real hosting or secrets are configured here.
