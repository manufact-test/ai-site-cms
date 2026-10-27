# D2 · Published technology release center (isolated branch only)

The server-backed Studio now has **Технологические выпуски**. The author chooses an
**immutable published version** (including older versions), optionally sets a
canonical HTTPS origin and a separate HTTPS form collector, inspects a
read-only cross-release content/SEO/media/redirect comparison, then requests a
short-lived, one-use confirmation before downloading the complete public
runtime handoff JSON. The site's current draft/publication and visitor routing
are NEVER modified. This does **not** deploy a site.

## Private API (same-origin session, site RBAC, CSRF on POST)

- GET /api/sites/{id}/technology-export/releases – published versions only.
- GET /api/sites/{id}/technology-export/compare?from=1&to=2 – changed/added/
  removed pages by stable ID, flags for SEO/content/asset/theme/redirect deltas.
- POST /api/sites/{id}/technology-export/plan – body
  {"version":1,"publicOrigin":"https://example.test","formCollector":null}.
  Returns path/count summary, SHA-256 fingerprint of the exact immutable site
  and chosen options, 15-minute one-use confirmation token. Owner and publisher
  only; viewer/editor may read the public release history but cannot export.
- POST /api/sites/{id}/technology-export/download – body
  {"confirmationToken":"..."}. Revalidates the version + plan fingerprint,
  consumes token, returns {capsule: ...}. The payload includes only published
  visitor files and media. No drafts, users, leads, audit history, credentials,
  server code, system configuration or secrets. The export is auditable and
  capped at 28,000,000 raw bytes / 3,000 files. Historical exports are
  intentionally allowed while a newer version is published.

When a published site uses forms, explicit STAGE3_FORM_ENDPOINT (per operator)
and existing server STAGE3_FORM_SECRET must be configured. The signed form
version/token is embedded by the existing PublicRenderer; no raw secret is
included. **Forms still require a functioning, separately deployed collector**.
Normal HTTP non-loopback origins are rejected. Only explicit HTTPS origins (or
the existing disposable 127.0.0.1 test exemption) are allowed.

## Portable capsule → independent static/PHP/Next site

After Studio downloads e.g. /downloads/site-published-v2-handoff.json:

    node stage3/runtime-export/bin/build-handoff.cjs /ABSOLUTE/site-published-v2-handoff.json html /ABSOLUTE/new-html
    node stage3/runtime-export/bin/build-handoff.cjs /ABSOLUTE/site-published-v2-handoff.json php /ABSOLUTE/new-php
    node stage3/runtime-export/bin/build-handoff.cjs /ABSOLUTE/site-published-v2-handoff.json next-static /ABSOLUTE/new-next-static
    node stage3/runtime-export/bin/build-handoff.cjs /ABSOLUTE/site-published-v2-handoff.json next-ssr /ABSOLUTE/new-next-ssr

The runner validates the handoff's base64, per-file SHA-256, file set, full
existing release-manifest integrity and publication identity **before creating
the output directory**. Uses D1 audited build.cjs for technology-specific
emission. Existing directories never get overwritten. For historical rollback
the operator explicitly selects an older **published** version and generates
a NEW independent directory; traffic switching requires separate approval.
There is no automatic activation or publication.

**Boundaries**: Next Static/SSR code is a server-rendered HTML representation
of the published content (not editable JSX translation). SSR requires a Node
host; ordinary PHP-only shared hosting does not provide SSR. Security and
functionality are tested in disposable CI only; no Hostinger/production activity
and no official Stage3 requirement acceptance (still 0/135).
