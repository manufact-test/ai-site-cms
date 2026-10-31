# Crawl Repair Planner — private robots/sitemap candidates

**New 30 Oct 2026 SEO worker capability.** This tool closes the gap between "we detected a crawl policy problem" and "the lead can inspect an exact candidate implementation." It does **not** publish, edit the CMS, authenticate a public host, or grant a release.

## 1. Original-source prerequisites

Use **operator-supplied, original, private** files outside the repository:

- An approved `manufact-seo-blueprint-v1` JSON (or original `manufact-seo-brief-v1`; the authoritative compiler normalizes it).
- A current `manufact-ai-site-v1` JSON snapshot from the CMS owner, with exact same page IDs, paths, robots, and canonical as the Blueprint. This is *not* independently authenticated by this CLI as the current published version.
- Original `robots.txt` and original XML sitemap, saved separately.
- Exact canonical HTTPS public root, or site mount ending in `/` (example `https://site.example/published/site-id/`). It is operator-declared, not verified live.

The tool **refuses** Site v1 page identity mismatches, additional/missing published pages, route moves, robots/canonical disagreements, and redirects shadowing any canonical indexable Blueprint route. This is important: generating an XML sitemap from a plan for pages that do not exist in the current CMS would be dangerous.

Original inputs are size-bounded, regular private files, not checkout files or symlinks. Output is a **new** absolute private directory outside Git. Existing outputs are never overwritten. Inputs are SHA256-rechecked before atomic promotion.

## 2. Generate safe proposed files

```bash
node stage3/seo-engine/bin/prepare-crawl-repair.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --site /ABS/private/current-site-v1.json \
  --robots /ABS/private/original-robots.txt \
  --sitemap /ABS/private/original-sitemap.xml \
  --base https://site.example/ \
  --out /ABS/private/NEW-repair-candidate
```

Default behavior is deliberately conservative:

- Synthesizes a candidate `sitemap.xml` containing **only** approved pages marked `index` whose `canonicalPath` equals their own route. Includes XML-escaped absolute HTTPS `loc` URLs, sorted stably.
- Does **not** invent `lastmod` dates or alter approved page SEO metadata.
- Preserves original `robots.txt` restrictions verbatim in policy meaning. When no `Sitemap:` directive exists, appends the new sitemap pointer unless `--add-sitemap-pointer no` is provided. If an existing pointer differs from the canonical expected one, it is preserved and a manual hold is created.
- Generates a private standalone responsive HTML view containing candidate source previews, explicit changes, manual holds and release restrictions.

Output files: `index.html`, `PROPOSED-robots.txt`, `PROPOSED-sitemap.xml`, `CRAWL-REPAIR-PLAN.json`, `CRAWL-REPAIR-PLAN.md`, `SOURCE-MANIFEST.json`, `PRIVATE-README.md`. The source manifest contains the SHA256 for four **original byte files** and the two proposed outputs.

**Do NOT upload the private output directory or overwrite official CMS-generated search files.** Any actual implementation belongs to the lead's separate approved PHP/static publisher and live HTTPS verification workflow.

## 3. Explicit exact crawler exclusions repair

A planned canonical/indexable page that is blocked for **Googlebot** or **Bingbot** can be proposed as a narrowly scoped exact-path `Allow` rule, but **only** after the operator chooses the stable page ID explicitly:

```bash
node stage3/seo-engine/bin/prepare-crawl-repair.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --site /ABS/private/current-site-v1.json \
  --robots /ABS/private/original-robots.txt \
  --sitemap /ABS/private/original-sitemap.xml \
  --base https://site.example/ \
  --allow-page-ids page-contact,page-other \
  --agents Googlebot,Bingbot \
  --out /ABS/private/NEW-exact-allow-candidate
```

The planner inserts `Allow: /mounted/route/$` only into an **existing, isolated, unambiguous single-agent group**. It refuses to auto-edit wildcard `User-agent: *` groups, shared Googlebot/Bingbot groups, duplicate agent groups, noindex pages and noncanonical aliases. It **never** creates a new specific-agent group to bypass general restrictions. A refused or ambiguous repair is listed as a **manual hold**, with the original matching rule where available.

After proposing, the engine reruns the **existing authoritative** `crawl-policy` and `crawl-policy-delta` analyzers. It confirms whether the selected page becomes accessible in the *proposed policy*, tracks changed agent/page decisions and refuses any newly denied approved URL. Unexpected newly restored access outside explicit requests is displayed for manual blast-radius review. A report with zero holds **still does not mean approved or safe to deploy**.

Optional `--scope sample` tells the engine not to claim an original partial sitemap was exhaustive; the default is `complete`. An original sitemap index has no claimed child coverage until original child files are independently collected.

## 4. Required integration handoff

The lead should examine `index.html` and both complete proposed files. Check original source SHA256 and the selected site fingerprint against an independently authenticated CMS version. The operator must confirm privacy/robots intent for any exact-allow rule and assess non-Blueprint routes or other search properties that this static plan cannot model. Compare original vs proposed source files with the preexisting `bin/compare-crawl-policy.cjs`, then implement any approved changes through the lead-owned publisher with backup/rollback. After publication, verify actual HTTPS bytes, redirects, canonical, X-Robots-Tag and Google URL Inspection separately. No Google indexing or owner signoff is inferred here.

## 5. Focused tests after the lead integrates the SEO subtree

```bash
node stage3/seo-engine/tests/crawl-repair-smoke.cjs
node stage3/seo-engine/tests/crawl-repair-cli-smoke.cjs
node stage3/seo-engine/tests/crawl-policy-smoke.cjs
node stage3/seo-engine/tests/crawl-policy-regression-smoke.cjs
```

The first covers actual policy parser + delta, hard noindex restrictions, ambiguous groups, sitemap and Site v1 parity. The second invokes the full real Node CLI in isolated temporary private directories and checks non-overwrite, refusal of checkout inputs, stale Site v1, and hash manifests.

**Status at SEO handoff:** the functional tests and the CLI were executed against the actual module source in an isolated V8 adapter with simulated Node filesystem/URL/crypto (not actual Node CI). The new Node child-process test files were committed but have **not** been run in a full real Node checkout. The lead/next SEO worker must not claim otherwise. No real customer data, live host, browser validation, CMS edit or public deploy has occurred.
