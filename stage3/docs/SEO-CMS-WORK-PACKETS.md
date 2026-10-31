# Private SEO work packets → existing owner Studio

**Branch integration, 31 October 2026.** This is one read-only entry point into the already-existing Stage3 CMS SEO, page and component editors. It is not a new SEO auditor, approval system, public widget or publishing service.

## Operator flow

1. With a genuine owner-approved SEO Blueprint, **exact** Site v1, source-pinned Search Console history and reviewed human action ledger, generate the private packet using the integrated SEO Engine's existing `stage3/seo-engine/bin/prepare-search-cms-handoff.cjs` (see `stage3/seo-engine/SEARCH-OPERATIONS-WORKFLOW.md`). Its private output folder lives **outside Git**; use `cms-search-work-packets.json` locally.
2. Open the existing offline or authenticated Stage3 Studio and the correct site. Click **SEO-пакеты** in the page navigation area; select the local JSON file. It is decoded and inspected in browser memory, without a POST, fetch, local storage or server persistence.
3. Studio compares the canonical SHA-256 of its **current site document** to the Site v1 fingerprint embedded by the SEO Engine. A different site ID, malformed packet, incorrect task counts or foreign field addresses fail closed. A changed document displays a stale-source warning and disables suggested-value copy actions.
4. For each active human task, inspect the observed search signal, investigation note, the existing CMS value and the *claimed* Blueprint-approved value. Click **Открыть SEO и меню этой страницы** to reach the real title/description/robots/OG controls. For an exact manifest-declared content/CTA proposal, use **К полю** to select its existing component field. The section links select the actual authored section, including an individual Design Graph composition for manual inspection. No new field controls are created.
5. A copy action is offered only when the source Site v1 and the individual field's expected value still match. This only places the proposed string on the user's clipboard (or selects it manually); the owner must check source/claims/overrides and deliberately paste/edit in the original Studio. Normal **Undo → Save draft → explicit Publish → real HTTPS/browser and Search Console recheck** remain separate actions.

## Boundaries and failure behavior

- Both `accepted` and `completed-reported` are **unauthenticated human assertions**, not verified client consent or real SEO progress. `completed-reported` packets are displayed as requiring independent public-release verification.
- Operator JSON is **untrusted local data**. Only declared `seo.title`, `seo.description`, `seo.robots`, `seo.ogTitle`, `seo.ogDescription` and exact existing manifest content/link fields are offered as manual destinations. No packet executes HTML, JS, CSS or a patch. DOM uses text nodes; proposed text is never interpreted as markup.
- A SHA match detects site-content drift **only**. It does not authenticate the file's origin, the Blueprint, Search Console exports, client approval, published version or operator decision. Do not use this screen as a release or sign-off gate.
- Each import is at most 3 MB/2 million decoded characters, with at most 250 active/completed tasks and bounded typed arrays. Stale/mismatched files never trigger a silent write.
- Original source files, a private history and raw Search Console exports should remain outside Git and web-served directories. Nothing in this integration changes `main`, the SEO worker branch, public site rendering, the PHP release collector or production hosting.

## Verification

- `node stage3/tests/seo-handoff-studio-smoke.cjs`: real SEO Engine output shape, independent canonical SHA-256 parity, valid locators, alien project, stale current site, unexpected field names and forged/duplicate actions.
- `node stage3/tests/studio-browser.cjs`: real offline Chromium import, mismatched project rejection, rendered task, exact source field navigation, zero draft mutation on import and stale-draft copy lock. This journey runs in isolated branch CI with the preexisting browser driver.
- Final GitHub Actions for the exact working-branch SHA still must pass. Passing tests are not the first live-client SEO pilot or one of the 135 owner acceptances.
