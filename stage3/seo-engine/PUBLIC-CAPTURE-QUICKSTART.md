# MANUFACT SEO — Live HTTPS first-client acceptance (one command)

Date: 2026-10-29. Scope: `stage3/seo-engine/**`. Only the CMS lead may deploy or approve a client site.

## Why use `public-capture`

After the lead has actually deployed an approved static candidate to the exact client HTTPS host, the `public-capture` phase combines existing hardened DNS-pinned, TLS-verified read-only GET capture, root stability recheck, media originals and responsive-variants SHA256 verification, post-deploy technical review, release-bound lead relay, unfilled page×desktop/tablet/mobile manual acceptance template, and one private operator dashboard. It does not POST a form, write CMS data, modify hosting, merge a branch or declare client signoff.

### Private input configuration

Store outside the Git checkout, for example `/ABS/private/public-capture-config.json`:

```json
{
  "format": "manufact-seo-first-site-integration-session-config-v1",
  "phase": "public-capture",
  "inputs": {
    "candidate": "/ABS/private/NEW-local/candidate",
    "approvedSite": "/ABS/private/sealed-v2",
    "publishedSite": "/ABS/private/owner-published.json",
    "staticExport": "/ABS/private/official-export",
    "origin": "https://www.your-real-client-host.org/"
  }
}
```

`origin` must match the exact official static export root HTTPS origin (DNS hostname, port 443), not localhost, an IP address or a PHP mount. Never invent owner authorization, HTTPS responses or media digests. Optional: `ownerEditReview`, `previousPublicHttp`, `previousPublicMediaDigests`; earlier digests require corresponding earlier HTTP evidence.

### Network-free candidate/source preflight

```bash
node stage3/seo-engine/bin/run-first-site-integration.cjs \
  --config /ABS/private/public-capture-config.json \
  --out /ABS/private/NEW-public-capture --preflight-only
```

Preflight reads real owner published Site v1, approved source, positive sourceRevision, static export manifest and original candidate. It independently hashes/checks every staged public file and the ZIP archive, verifies identical site IDs and release versions and refuses a mismatched release **before any public HTTP GET**. This is not an owner API authentication.

### Actual public GET capture and private acceptance

```bash
node stage3/seo-engine/bin/run-first-site-integration.cjs \
  --config /ABS/private/public-capture-config.json \
  --out /ABS/private/NEW-public-capture
```

The command uses the same fresh output path, which preflight did not create. It performs actual GET requests to the explicitly named public HTTPS hostname; DNS is vetted against private/special-use addresses and pinned for the collector, TLS is verified and redirects are not followed cross-origin. Public media bodies are hashed in memory but not saved. Byte and size budgets, HTTPS root recheck, actual release marker, redirects/404 and private-file isolation are evaluated by existing modules.

### Private output

- `captured-public-http.json`: real site HTTP/redirect/search endpoint/negative-route observations and root window recheck
- `captured-public-media-sha256.json`: real public GET SHA256 for originals/responsive variants
- `post-deploy/post-deploy-summary.json`: original technical gates plus public parity verdict
- `lead-relay/INTEGRATION-CONTRACT.json` and `LEAD-NEXT-ACTIONS.md`: source-bound release and human responsibilities
- `live-acceptance-template/live-acceptance-template.json`: **unfilled** manual browser/device/form acceptance
- `operator-workspace/index.html`: private source-bound launch dashboard
- `INTEGRATION-SESSION.json` and `INTEGRATION-SESSION-HANDOFF.md`: exact output paths, owner claims and actual public GET count

All stay private. Never upload the session folder or place GSC CSV, client source, form submissions, tokens or operator evidence in GitHub. Only a separately lead-approved public-only ZIP/folder may be deployed by the lead. Failed phases clean up their newly created private output; previous source/candidate files remain untouched.

## Existing imported-evidence and post-launch modes

Continue using `public` when independently captured HTTPS/asset JSON files already exist or live capture cannot be made from the operator machine. Both modes produce identical post-deploy/human acceptance steps. `search` remains only for genuine, property-scoped Google Search Console observations; absent URLs are UNKNOWN, not excluded.

## Mandatory final human checks

Real TLS provenance and CDN revision, actual desktop/tablet/mobile rendered visual parity, keyboard and forms, authorized POST persistence and delivery, privacy/consent, client acceptance and rollback remain with the lead. A `TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED` output is **not GO**.

Minimal lead-integrated Node checks:

```bash
node stage3/seo-engine/tests/first-site-candidate-preflight-smoke.cjs
node stage3/seo-engine/tests/first-site-integration-session-smoke.cjs
node stage3/seo-engine/tests/first-site-live-acceptance-smoke.cjs
```

These are offline contract tests and do not authenticate a real live customer website.
