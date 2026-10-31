# First-client SEO pilot — approved route evidence coverage in existing Workspace

**31 October 2026 · Independent SEO worker · `feature/site-seo-engine` · private, read-only, no release GO.**

## What was missing

The subsystem already produces separate CMS worklists, public HTTPS/JSON-LD reports, desktop/tablet/mobile rendered-content QA and optional historical CrUX analysis. During the first genuine client run, the lead must determine **which exact approved Blueprint routes still lack sources**. Per-report totals alone make it easy to overlook a partially captured page or confuse origin-wide CrUX with that page's own field performance.

This change adds **one compact per-route evidence matrix inside the existing `crawl.html` and `crawl-lead-worklist.md`**, not another application, standalone dashboard, button, CLI or release gate. It reuses previously validated, source-pinned reports; it never opens a browser, requests URLs or copies the original HTML, business facts, text or unknown URLs.

## Source-to-route interpretation

| Matrix column | Existing input | What an observation actually means |
|---|---|---|
| Approved route | `crawl.policy.pages`, from approved Blueprint | Approved route inventory only. Not proof that the route is published. |
| Selected Site v1 | Existing `crawl.cmsBlueprint` + `crawl.cmsSite` mapped by CMS worklist | A selected CMS snapshot has this page and its SEO fields match the Blueprint, or it is absent/drifted. Not authenticated owner CMS revision. |
| HTTP / JSON-LD | Existing public HTTPS transcript → Structured Data QA | Supplied, same-mount HTML is inspectable by the semantic checker; any parse/claims defects remain in the normal findings. Not a live-host attestation. |
| Rendered DOM | Existing Chromium/source-paired Rendered Content QA | All desktop/tablet/mobile DOM pairs reconciled, or explicitly partial/unknown. Browser logs or source hashes do not prove the deployed release. |
| CrUX exact URL | Optional original `crawl.crux` CrUX JSON | Exactly matching page-level historical records by form factor. Origin-wide records **never** count toward specific route coverage. Missing field data is unknown, not bad/good. |
| P0/P1 signals | Existing crawl policy, CMS actions, JSON-LD, DOM findings and exact-URL CrUX findings | Raw route-specific diagnostic counts across analyzers. One underlying defect can generate more than one signal: these are **not deduplicated tickets or a readiness score**. |
| Next manual evidence | Missing/partial/critical observations | Fixed, privacy-safe guidance to collect or verify evidence on this route. CrUX follow-up stays optional/post-launch. |

`preLaunchEvidenceIncomplete` is **true** if the selected CMS snapshot does not match, the page lacks inspectable public HTML, or the three DOM source pairs are not fully observed. Because no such source can authenticate the actual current release, **false is not approval**. Field CrUX is post-launch historical evidence and is deliberately excluded from the pre-launch completeness calculation.

For backward compatibility, an older synthetic Crawl policy with an empty approved-route inventory remains accepted by the existing Workspace, but the matrix explicitly says **route coverage UNKNOWN**, never “all pages covered.” A genuine client pilot needs nonempty owner-approved Blueprint routes.

The matrix is printed under the **existing Crawl manual queue**, before other existing report links. The same summary counts also appear in the existing workspace manifest `overview`. No separate private route files or integrity-manifest rules are required: the changed `crawl.html`, `crawl-lead-worklist.md` and `workspace-manifest.json` remain part of the same unsigned `LEAD-PACKET-INTEGRITY.json`.

For faster authorized pilots, the existing lead Markdown also lists **optional `--page-ids` batches of at most eight** only for routes whose selected Site v1 and public HTML prerequisites are present but whose full DOM pairing remains incomplete. Batches are plain suggestions, not executable commands. They do not call Chromium or override the existing offline preflight, explicit origin/mount approval, same-session source requirements, or private output rules. If public HTML is missing, the route is **not** recommended for immediate browser recapture; acquire/validate HTTPS source first.

## First customer operator flow

1. Confirm owner-approved HTTPS mount, Blueprint, selected Site v1 and current revision with the lead; keep originals in private absolute paths outside Git.
2. Run the **existing** `build-seo-operator-workspace.cjs` with `crawl.policy`, optionally `crawl.cmsBlueprint` and `crawl.cmsSite`, the already-supported same-session `crawl.publicCapture` and `crawl.renderedCapture`, and optionally `crawl.crux`. All existing source checks continue to apply. See [SEO-OPERATOR-WORKSPACE.md](SEO-OPERATOR-WORKSPACE.md) and [RENDERED-CAPTURE-PILOT.md](RENDERED-CAPTURE-PILOT.md).
3. Open the existing `crawl.html` and read **First-client approved route evidence coverage**. Begin with routes that have P0 findings, selected-source drift, uninspectable public HTML or incomplete desktop/tablet/mobile pairs. Use `crawl-lead-worklist.md` for a copyable private handoff to the main developer.
4. Open the linked CMS, Structured Data, Rendered Content and optional CrUX reports for *why* the status arose. A blank CrUX cell, uninspected route or origin-wide record must never be reported as a Google pass.
5. Re-collect a matched source/host revision after an approved fix, reproduce defects in real browsers, perform owner/client acceptance and keep rollback. Only the main integrator can decide any merge, publish or deploy.

### Focused verification

```bash
node stage3/seo-engine/tests/seo-first-client-coverage-smoke.cjs
node stage3/seo-engine/tests/seo-workspace-crawl-smoke.cjs
node stage3/seo-engine/tests/seo-operator-workspace-smoke.cjs
node stage3/seo-engine/tests/seo-field-performance-smoke.cjs
```

The new synthetic Node smoke covers no-input unknown coverage, mixed per-page source completeness, all-three-device pairing, origin-only versus exact-URL CrUX, route P0/P1 signals, actionable missing-evidence notes, cross-site/unapproved route rejection, output redaction and integration with the existing private Workspace. These tests **do not** launch Chromium or inspect an authorized customer host; they do not prove Google/Search Console/CrUX ownership, GitHub Actions success, actual deployment or client signoff. Record exact final executions in the latest worker handoff.
