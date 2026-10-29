# MANUFACT AI Site CMS — Private First Site Launch Cockpit

**Purpose:** give the lead developer a single readable LOCAL screen for the already-produced first-client release evidence. The cockpit is a **visualization of earlier SEO technical reports**, not a fresh runtime test, owner authorization, deployment or published public site.

**Scope:** only stage3/seo-engine/**; worker branch feature/site-seo-engine. Never change PHP CMS, SDK, Studio, workflows, main, PR, merge or deploy from this component.

## Source evidence

Existing SEO Engine commands already create private reports:

- bin/first-site-check.cjs produces summary.json and bundle.json (format manufact-seo-first-site-check-v1 and manufact-seo-review-bundle-v1).
- bin/verify-deployed-site.cjs, **after the lead manually publishes and obtains real externally collected HTTPS and media receipts**, produces post-deploy-summary.json (format manufact-seo-post-deploy-release-verification-v1).
- FIRST-SITE-RUNBOOK.md, STATIC-LAUNCH-WORKFLOW.md and INTEGRATION-HANDOFF.md remain authoritative for actual source pinning, export SHA-256, browser checks, POST/email notification, three-device design and publication.

The new cockpit reads those **existing, unchanged** JSON contracts, not an invented substitute format.

## Private local command

~~~bash
node stage3/seo-engine/bin/build-first-site-cockpit.cjs \
  --summary /ABS/private/first-site-report/summary.json \
  --bundle /ABS/private/first-site-report/bundle.json \
  --post-deploy /ABS/private/post-deploy/post-deploy-summary.json \
  --out /ABS/private/NEW-launch-cockpit
~~~

Only --summary and --out are required; --bundle and --post-deploy are optional. The --bundle option enriches the exact blocking gate IDs with existing private review explanations. The post-deploy file is **never required before a publication happens**. A cockpit without post-deploy evidence clearly says that publication remains unverified.

Output in a new PRIVATE directory OUTSIDE Git checkout:

- index.html: fully standalone, responsive offline HTML with CSP default-src none, no external fonts/scripts/requests, readable cards, technical gates, source/export/media observations, post-deploy evidence and a fixed manual signoff checklist.
- cockpit-manifest.json: exact SHA-256 input digests and conservative read-only disposition.
- PRIVATE-README.txt: operator security and never-publish instructions.

Output is created with owner-only POSIX permissions 0700 / 0600. Never upload index.html into the public static release/hosting ZIP or the CMS website. It is an **internal operator cockpit**, not a public site preview.

## Conservative states and refusal to combine contradictory sources

The cockpit only displays the following descriptions:

- BLOCKED BY FIRST-SITE GATES: source first-site summary lists one or more release blockers; no subsequent evidence overrides that.
- LOCAL REVIEW — PUBLICATION NOT VERIFIED: no original blocking gates but no independently provided post-deploy summary.
- POST-DEPLOY NOT READY: post-deploy summary has blocking reasons.
- TECHNICALLY MATCHED — MANUAL SIGNOFF REQUIRED: the supplied post-deploy report declares technical matching, while the original summary has no blocking gate. This is still **not a GO**.

It rejects inconsistent siteId, source SHA-256 (where available), original gate IDs/counts between bundle and summary, CMS published version and static manifest SHA-256 between first-site and post-deploy, or any claimed post-deploy match that contradicts original blockers. All fields that are missing/unobserved are shown as UNKNOWN, not a green check.

The original report's published/revision values are operator-supplied inputs, not independently authenticated. Static export matching is not proof of the real production PHP process revision or real host TLS. Post-deploy receipts are operator collected, not captured or authenticated by this read-only viewer.

## Manual release acceptance remains with the lead

The cockpit explicitly reminds the lead to:

1. Independently confirm saved and published CMS Site v1 revision, owner edits and correct version.
2. Check real browser pages on desktop/tablet/mobile, focus/keyboard and interactions.
3. Submit actual form POST and confirm persistence plus configured email/Telegram delivery and consent.
4. Inspect live HTTPS, redirects, canonical, robots, sitemap, images, 404 and private-file exposure.
5. Review client-approved prototypes, current visual notes, written owner acceptance and rollback plan.

No client approval, readyToPublish flag, CMS mutation, production write, deployment, workflow modification or PR/merge action is ever issued by this cockpit.

## Minimal isolated product check

~~~bash
node stage3/seo-engine/tests/first-site-cockpit-smoke.cjs
node stage3/seo-engine/bin/build-first-site-cockpit.cjs --help
~~~

This synthetic check is not an integrated PHP/Chromium/Node CI run, and cannot replace the real first-client test. All real launch operations are solely the responsibility of the main developer.
