# First-client international SEO — source-bound hreflang QA

**31 October 2026 · Independent SEO worker · `feature/site-seo-engine` · private, read-only.**

## Why this fills a real gap

Existing published HTML and browser DOM audits already cover canonical, robots/noindex, H1, main content, internal links, JSON-LD, responsive visibility and image loading. They did **not** interpret multilingual/multiregional `hreflang` links. A client site can keep ordinary SEO signals correct while its language variants wrongly point to one another, become JS-mutated or claim a different region. This addition is a **universal technical analyzer**, never a prebuilt client website or design library.

The same existing private Crawl Workspace now reviews `hreflang` whenever its already-supported `crawl.publicCapture` is supplied. Optional existing `crawl.renderedCapture` also lets it compare browser DOM with original HTML after source pairing. No new CLI input, new admin panel, Google API, client-data file, mutation, publishing or release gate.

Official primary reference: [Google Search Central — Tell Google about localized versions of your page](https://developers.google.com/search/docs/specialty/international/localized-versions).

## What is checked

| Source | Read-only diagnostics | Boundaries |
|---|---|---|
| Original approved HTTPS `<head>` | `rel=alternate` + `hreflang`, language-code shape, fully qualified HTTPS URLs, duplicate/conflicting language mappings, extra `media`/`type`/`as` attributes | Never export original hrefs, domains, alternate labels or HTML |
| Approved Blueprint route inventory | Exact source URL, missing self-reference when alternates exist, same-site approved route versus unknown or off-mount, target canonical/noindex intentions | No invented expected language map or required multilingual content |
| Other inspected approved routes | Reciprocal return links and shared locale-to-target map consistency, only when **both** pages have matching original HTML in the same capture | Missing target capture = **unknown**, not broken; differing optional label coverage is P2, conflicting shared labels are P1 |
| External language domains | Count as explicitly **allowed but unverified**; query/fragment URLs receive a manual-review note | No cross-site fetch or assumption that another client's domain belongs to this client |
| Optional source-paired Chromium DOM | Per-desktop/tablet/mobile locale-to-target mapping drift from HTTP source | Only genuinely `rendered-dom`, already-inspected device evidence; static-only/partial is unknown |

All identified problems become P1/P2 **human-review findings** in the current Crawl manual queue. No performance, Google indexing, ranking, canonical selection, actual language correctness or automatic GO is inferred. The report is embedded in the existing `crawl.html` and `crawl-lead-worklist.md`, and summary counts are placed in the existing `workspace-manifest.json` overview. Existing private byte-integrity covers those same files; **no extra report files** or manifest allowlist are required.

### Important interpretation

- A **monolingual website with zero `hreflang` links is not flagged**. Translation features should not be invented to fill a checklist.
- Google accepts international alternates on **other domains**. We report them as external/unverified because this worker is allowed to analyze only the approved customer's source/mount.
- Google allows equivalent annotations via **HTTP Link headers or XML sitemaps**. This module examines only HTML-head annotations, so absence of HTML tags alone does not establish missing international targeting.
- Missing live content, incomplete captures and legacy `static-html` viewports are **unknown**. Only inspected source-paired `rendered-dom` is compared.
- The language-code regular expression validates a common tag shape, **not the full supported Google language/region registry**; a syntactically plausible but unsupported locale still needs manual validation.
- Same-site reciprocal findings are suggestions to review; Google's guidance permits partial clusters in some migration/expansion situations. The lead and owner decide the correct link graph.
- No currently published revision, owner-approved translation pair, real HTTP response provenance or Googlebot locale interpretation is authenticated here.

## Integration / operator procedure

Use the **same** `bin/build-seo-operator-workspace.cjs` configuration with original, private absolute paths outside Git:

```json
{
  "format": "manufact-seo-operator-workspace-config-v1",
  "crawl": {
    "policy": "/ABS/private/original-crawl-policy.json",
    "cmsBlueprint": "/ABS/private/approved-blueprint.json",
    "cmsSite": "/ABS/private/current-site-v1.json",
    "publicCapture": "/ABS/private/original-approved-https-capture.json",
    "renderedCapture": "/ABS/private/optional-same-session-dom-capture.json"
  }
}
```

The `renderedCapture` property is optional. The existing config already requires a matched original HTTP capture before rendered QA; this feature does not loosen that prerequisite.

1. The main lead confirms client, intended language strategy and actual published revision. Explicit owner/operator approval is required before any real-host capture.
2. Open the existing private `crawl.html` → **International SEO / hreflang (when declared)**; inspect P1 and P2 with the original owner-supplied pages, then identify partial/unknown pages.
3. Compare real live language variants and canonical links independently (including languages on other domains where the owner separately authorizes such review). Do not treat missing external reciprocity as a broken link based on this source-only report.
4. Changes stay with the main lead and site owner. After they approve an implementation, collect a new same-release source snapshot and re-run existing SEO checks. No auto-fix or deploy.

## Actual test scope

```bash
node stage3/seo-engine/tests/seo-hreflang-smoke.cjs
node stage3/seo-engine/tests/seo-structured-data-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-content-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
```

Synthetic Node smoke uses approved example.com pages, missing and conflicting reciprocal language links, deliberate unapproved/malicious URLs, external domains with query parameters, nested mount, static-only and rendered DOM differences, plus existing private Operator Workspace integration. These tests do **not** verify real clients, a real Chromium process, Google property/Search Console, translated content, official language registry or GitHub Actions. See the latest handoff for the exact checks that were executed.
