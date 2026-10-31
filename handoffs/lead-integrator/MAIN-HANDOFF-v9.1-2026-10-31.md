# MANUFACT AI Site CMS — lead handoff v9.1 (31 October 2026)

## State and invariants

- Working branch **only**: `feature/stage3-ai-site-contract`. Parent verified before this work: `0ac9122cd534ddda053e65368e8881563bc4c6fb` (two GitHub Actions jobs succeeded on that parent).
- The SEO worker delivery `244c7ab71796916f25313c3ebde385775665cc21` was already imported in v9.0. No merge of the worker branch or updates to `main`, Hostinger, client data or production.
- 135 MUST: **124 engineering candidates + 5 partial + 6 external gates, ownerAccepted=0/135**. CI is engineering evidence, never client acceptance. Historical integration details: `MAIN-HANDOFF-v9.0-2026-10-31.md`.

## Functional vertical: private search work → existing CMS editor

The SEO Engine's `prepare-search-cms-handoff.cjs` already emits site- and history-bound private **manual** work packets. Until now an owner had to correlate them by hand with the actual Studio pages, SEO metadata and authored component fields. Stage3 Studio now has **SEO-пакеты** alongside its existing page navigation, using the same real editor UI rather than a second SEO interface.

The owner chooses a local `cms-search-work-packets.json` file. It never leaves the current browser tab. The new first-party `stage3/studio/seo-handoff.cjs` checks the exact SEO Engine packet format and the site's canonical SHA-256, the same-site ID, task counts, duplicated IDs, status and field preconditions, declared component/manifest targets and blocked source drift. An operator-declared value can only be **copied for a manual edit**, or used to **navigate** to the current page's `SEO и меню`, a specific legacy component element or an authored Design Graph section. It is not a CMS patch; Save and Publish are never called. `completed-reported` is explicitly labeled as owner-reported only, needing independent live verification.

The exact browser bundle is rebuilt through `stage3/studio/build.cjs`; it has no network/API/package additions. Detailed operator instructions and limits: `stage3/docs/SEO-CMS-WORK-PACKETS.md`.

## Checks

- New `stage3/tests/seo-handoff-studio-smoke.cjs`: SEO Engine-generated packet shape, Node/browser canonical fingerprint parity, successful exact locator matching, different site, stale revision, malformed task/field/source/duplicate rejection.
- Existing Chromium Stage3 Studio test extended: local JSON import, no draft mutation, SEO navigation, exact legacy field focus and stale packet copy lock.
- New unit smoke added to the isolated Stage3 Actions `contract` job; the preexisting browser step exercises the additional user journey.
- **Fill in actual last SHA and both Actions job results after publication**; no green CI claim until that check.

## Remaining external priority

Do not generate synthetic client evidence. Obtain the actual three client-approved static mockups and their Blueprint/Site v1, source-pinned published revision, exact HTTPS host, GET/Chromium permission, genuine Search Console data and human form/visual acceptance. Then run the already-existing SEO first-client capture/operator workspace, connect actual P0/P1 outcomes to these exact Studio fields, verify again on public HTTPS and decide GO/rollback with the owner. There is still no first real-client pilot or owner acceptance.
