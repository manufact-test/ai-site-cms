# First-client real-user field performance — offline CrUX JSON evidence

**31 October 2026 · `feature/site-seo-engine` · independent SEO worker · private/read-only.**

## Why this exists

The existing approved Chromium capture gives isolated navigation/FCP timings and layout/image diagnostics, but never claims Google field Core Web Vitals. Real customers also need an evidence-based LCP/INP/CLS review. This module **reads operator-exported original Chrome UX Report API JSON offline**. It supplements the **same existing Crawl and SEO Operator Workspace**, not a new dashboard or a PageSpeed fetcher.

Official data references:

- [Chrome UX Report API schema, page versus origin records, form factors, p75 and collection dates](https://developer.chrome.com/docs/crux/api)
- [Web Vitals measurement and human interpretation](https://web.dev/articles/vitals)
- [Official boundaries for LCP, INP and CLS](https://web.dev/articles/defining-core-web-vitals-thresholds)

The developer does not query Google or handle API keys; the lead obtains an authorized export separately. No private client URL, Google credential, original raw JSON, user/session/traffic data, or unknown path is committed. The source must remain outside this repository.

## What is integrated

| Existing component | New capability |
|---|---|
| `lib/seo-field-performance.cjs` | Exact-approved-Blueprint URL or origin-level CrUX record checking, field p75 LCP/INP/CLS classifications, historical collection windows, partial/missing data, stale evidence, origin/mount uncertainty |
| `lib/seo-field-performance-view.cjs` | Private CSP/no-script, no-original-URLs-leak HTML and Markdown human review; report includes approved route strings only |
| Existing `bin/build-seo-operator-workspace.cjs` | Optional `crawl.crux` JSON input; original file SHA256 and source mutation fences, same atomic private workspace and unsigned integrity ledger |
| Existing `seo-workspace-crawl-panel.cjs` | Adds one link in the current Crawl report; does not create another Operator Workspace home/dashboard card |
| Existing `seo-lead-readiness.cjs` | Extends the **existing** post-launch Search Performance human follow-up, no additional release gate |

The optional private files are `field-performance.html`, `field-performance.md` and `field-performance.json`. They are included in the existing `LEAD-PACKET-INTEGRITY.json`. This remains unsigned byte-consistency evidence, **not** verification of a Google account or deployed revision.

## Input and approved source matching

The lead places a raw [CrUX API `records:queryRecord`](https://developer.chrome.com/docs/crux/api) response, or a JSON array of 1–60 raw responses, in an **absolute path outside Git**. Do not include a request URL containing the API key. Response JSON may contain `record.key.url` (page-specific) or `record.key.origin` (whole origin), `record.key.formFactor`, `record.metrics` and `record.collectionPeriod`.

The same existing private workspace config can add the `crux` field under `crawl`:

```json
{
  "format": "manufact-seo-operator-workspace-config-v1",
  "crawl": {
    "policy": "/ABS/private/original-crawl-policy.json",
    "cmsBlueprint": "/ABS/private/approved-blueprint.json",
    "cmsSite": "/ABS/private/current-site-v1.json",
    "crux": "/ABS/private/original-crux-response-or-array.json"
  }
}
```

Run the **existing** command:

```bash
node stage3/seo-engine/bin/build-seo-operator-workspace.cjs \
  --config /ABS/private/seo-workspace-config.json \
  --out /ABS/private/NEW-SEO-WORKSPACE
```

The JSON must contain valid original CrUX `record` data. The offline report **rejects** a different host, URL with query/fragment, redirect/canonical mismatch, or route absent from the approved Blueprint; it never silently assigns it to the nearest page. For mount `https://host.example/subsite/`, an origin-wide `https://host.example` record is allowed only with an explicit P2 warning because that aggregate may include unrelated pages outside `/subsite/`.

The response may omit `formFactor` to mean **all devices**; this is not equivalent to a mobile observation. `PHONE`, `TABLET` and `DESKTOP` remain distinct. Duplicate same-scope/device records in one original batch fail closed. Missing page records are counted as **unrepresented**, never assumed to have good Web Vitals. Missing metric p75 is **unknown**; an absent, old or future-dated collection period is P2. Data for a genuinely new/low-traffic site may be completely absent; in that case do not invent a CrUX response or run an artificial pass.

## Thresholds for human investigation

The following are p75 classification thresholds from public Web Vitals guidance, **not** MANUFACT release approvals or SEO ranking scores:

| Metric | Good ≤ | Needs improvement ≤ | Poor > |
|---|---:|---:|---:|
| LCP | 2,500 ms | 4,000 ms | 4,000 ms |
| INP | 200 ms | 500 ms | 500 ms |
| CLS | 0.10 | 0.25 | 0.25 |

The original CrUX API returns LCP/INP percentiles as integer milliseconds and CLS percentile as a string-encoded decimal. This importer interprets only the three named standard metrics, never experimental variants or Lighthouse scores. P1 means **human review of poor historical field p75**; P2 means needs improvement, metric absent, date absent/stale or origin/mount mismatch. No P0 is inferred from performance alone.

The report includes bounded numbers, approved route paths, device, collection dates, source SHA256 and constant diagnostic messages. It never outputs raw unknown URLs, arbitrary source fields, original histogram labels, API keys, text or screenshots. The original JSON is not reprinted in the private report.

## What the first client pilot must still prove

1. Lead independently validates the owner-approved Blueprint/Site revision and current HTTPS site, then collects authorized CrUX JSON outside Git.
2. Review `crawl.html` → `field-performance.html`; distinguish exact page data from origin-wide aggregates and phone/desktop/tablet from all-device records.
3. Correlate historical collection window with launch date; a 28-day rolling record **does not authenticate a new deployment** and may include old page versions or traffic outside the client's mount.
4. Independently investigate poor P75 with the client/design/dev team and optionally PageSpeed/Lighthouse in a real authorized browser. Our isolated Chromium timings must never be relabeled as CrUX.
5. The lead remains sole integrator. No source proves Google Search Console ownership, URL indexing, conversions, current production version, owner signoff or release GO.

## Actual focused Node verification

```bash
node stage3/seo-engine/tests/seo-field-performance-smoke.cjs
```

The synthetic Node test covers page vs origin, mobile/desktop/all devices, inclusive p75 threshold boundaries, missing/stale/future collection periods, strict URL rejection, private redaction, same existing Workspace/CLI, atomic no-overwrite outputs, and positive/negative checks of the unsigned byte-integrity manifest. This is **not** a real CrUX lookup, authorized client host, GitHub Actions or real performance signoff. See the latest handoff for exact executed checks.
