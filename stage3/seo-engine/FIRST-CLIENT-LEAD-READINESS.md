# MANUFACT SEO — First Client Lead Readiness & Private Handoff Integrity

**30 October 2026. Independent SEO worker:** `feature/site-seo-engine` → **only** `stage3/seo-engine/**`. Main developer `feature/stage3-ai-site-contract` remains the **sole integrator**. The new functionality is read-only, offline and **not a GO or deployment authorization**.

## Purpose

The existing single SEO Operator Workspace has independent first-site launch technical gates, static/published host observations, manual human browser/form acceptance, crawl/canonical/sitemap issues, CMS implementation worklists, post-edit public HTTPS evidence, and optional Search Console measurements. The lead needs one quick triage page combining the outcomes without inventing missing evidence or showing a false "100% ready".

This pass adds:

- `lib/seo-lead-readiness.cjs` — **11 deterministic lead-only gates** across prelaunch and postlaunch, with P0/P1/P2 priority, ownership, recorded source SHA256, dependencies, explicit missing evidence and next manual checks.
- `lib/seo-lead-readiness-view.cjs` — an offline, no-script, strict CSP HTML view, with private Markdown and JSON equivalents.
- `lib/seo-private-lead-integrity.cjs` — an **unsigned source-bounded SHA256 inventory** of every generated output in the same private workspace, with exact allowed filenames and directory/symlink/length checks.
- `bin/verify-seo-lead-packet.cjs` — read-only independent audit of a saved workspace against its original `LEAD-PACKET-INTEGRITY.json`.
- `tests/seo-lead-readiness-smoke.cjs` — focused **real-Node** acceptance intended for the lead's integrated checkout: first-client missing-vs-blocked logic, deterministic task IDs, cross-site rejection, generated HTML, CLI private output, file hashes, tamper rejection, unexpected file and symlink refusal.
- Existing `lib/seo-operator-workspace.cjs` and `bin/build-seo-operator-workspace.cjs` are expanded; **no new CMS, second dashboard, new public network collector, workflow, PHP, Studio or shared configuration**.

## Where to open it

Use the **existing** private Operator Workspace builder and config from `SEO-OPERATOR-WORKSPACE.md`:

```bash
node stage3/seo-engine/bin/build-seo-operator-workspace.cjs \
  --config /ABS/private/current-seo-workspace-config.json \
  --out /ABS/private/NEW-first-client-workspace
```

All previously available config combinations remain supported: local firstSite, Search History, indexing and/or crawl. The new lead card appears at the top of **existing** `index.html`. Open `lead-readiness.html` to see original-source gate decisions and manual dependency order.

The same private output folder now also includes:

| File | Use |
| --- | --- |
| `lead-readiness.html` | Consolidated, CSP-restricted review for the sole CMS lead |
| `lead-readiness.md` | Portable private lead handoff checklist |
| `lead-readiness.json` | Deterministic machine-readable manual gate worklist |
| `LEAD-PACKET-INTEGRITY.json` | Exact output file name/byte count/SHA256 inventory, original config and source hashes |
| `workspace-manifest.json` | Existing original source and context SHA256 metadata, unchanged contract |

**The integrity manifest contains only SHA256 metadata, not source HTML, GSC query contents, client form data or original operator evidence.**

If only Crawl Policy is supplied, the lead readiness will truthfully report unavailable first-site source, public release, actual forms and owner/client acceptance, while reporting observed crawler issues. A missing prelaunch source **never** becomes a green checkmark. Absent Search Console before launch is separated into `POST-LAUNCH-DEFERRED` and **does not block the first client launch**. Postlaunch reports remain observational; no observed Google pages is never proof of site-wide exclusion or indexation.

## Lead gate matrix

The 11 gates cover:

1. Original approved source provenance and current authenticated CMS owner revision — CMS lead.
2. Local first-site PHP/static release blockers — CMS lead.
3. Original public HTTPS/media/release correspondence — publisher lead.
4. Actual browser, responsive, forms, user journey and client acceptance — owner/client.
5. Crawl policy, robots and sitemap P0/P1 — SEO operator.
6. Approved Blueprint → CMS SEO metadata/redirect worklist — CMS lead.
7. Public HTTPS evidence of manual SEO fixes (conflicts, unknown, aligned but **not verified**) — publisher lead.
8. Urgent human/browser/form lead work queue — CMS lead.
9. Search Console performance (deferred when absent) — SEO operator.
10. GSC URL Inspection and indexing (deferred when absent) — SEO operator.
11. Repeated crawl/CMS task lifecycle (deferred when absent) — SEO operator.

Each gate status is one of:

- `BLOCKED` — a supplied source reports a real unresolved technical/operator problem. It requires independent lead investigation.
- `NEEDS-EVIDENCE` — a required prelaunch source or human check has not been provided; missing does not mean success.
- `LEAD-REVIEW-REQUIRED` — the current operator source has no such blocker, but real host, CMS revision and owner approval are **not** authenticated.
- `POST-LAUNCH-DEFERRED` — no post-launch search observation has yet been provided. This is not automatically a prelaunch blocker.

There is **no** status named GO, READY-TO-PUBLISH, VERIFIED-FIXED or CLIENT-APPROVED. Even if every prelaunch gate is review-required, the lead must independently authenticate the exact publisher/source revision, actual HTTPS/media, browser/form behaviour, final client permission and rollback.

## Audit the exported private packet

Run after receiving or copying the **existing private folder**:

```bash
node stage3/seo-engine/bin/verify-seo-lead-packet.cjs \
  --bundle /ABS/private/NEW-first-client-workspace
```

The CLI checks that the target is an **absolute existing private directory outside Git**, the integrity manifest is a bounded regular file, every declared file is a regular non-symlinked file, byte lengths and SHA256 match, there are **no unlisted files**, and the original workspace/lead source SHA256 and nonauthorization flags are mutually consistent. It performs **no network requests and no writes**. A file appended, removed, swapped, symlinked or unexpectedly added causes a failure.

**Limit:** this is a local **unsigned** checksum index, not a digital signature or remote attestation. An attacker capable of replacing BOTH the files and the unsigned manifest can forge a consistent set. Lead must retain trusted private source custody and original approved hashes before acting; this tool never authenticates GitHub contributors, a public server, owner identity or final live release.

## Focused real Node validation (lead checkout)

```bash
node stage3/seo-engine/tests/seo-lead-readiness-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/crawl-cms-workspace-smoke.cjs
node stage3/seo-engine/tests/crawl-cms-public-followup-smoke.cjs
```

**SEO worker environment limitation:** isolated V8 syntax and actual-source-composition checks are possible; a complete Node CLI/test run and live customer HTTPS/GSC authentication are not available from this GitHub-only worker. The lead should validate the exact SEO subtree after cherry-pick/copy. A successful CI run in the parallel lead branch does not test unintegrated SEO worker code.

## Sole integrator boundary

The independent worker creates no PR, release, migration, integration branch or client environment modification. The main developer decides when to import SEO-owned files, runs the focused real Node smokes, independently verifies customer host and approved CMS source, and explicitly authorizes any CMS/robots/sitemap change with rollback. All private worklists and original source documents remain outside Git.
