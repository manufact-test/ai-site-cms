# MANUFACT AI Site CMS — Lead Integrator final FOX engineering pass, 2026-11-04

## Read this first — exact state

- **Repository:** `manufact-test/ai-site-cms`; **branch:** `feature/stage3-ai-site-contract` (do not change branch, touch `main`, or rebuild the CMS).
- **Latest code/test SHA:** `ffb97651d86b1c1c3ce7a36f14ba9b626f0d6851` (focus restoration race fix + regenerated Studio bundle + Chromium regression). Its predecessors `3b56ff8deb7d782ef292d6c74797b01cb8c85e27` (truthful screenshots) and `268e512c59db8d012d60d33819ace0cc1830bc51` (strict preflight/rollback lab) are on the same branch. The latest documentation HEAD is the most recent subsequent docs-only commit.
- **Full no-deploy CI:** [#41851137461 — SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41851137461), covering offline/authenticated PHP-hosted Chromium and both MariaDB versions. The `268e512` [CI #41849545943](https://github.com/manufact-test/ai-site-cms/actions/runs/41849545943) independently **PASSED 4/4**. The intermediate screenshot-only `3b56ff8` [CI #41850417252](https://github.com/manufact-test/ai-site-cms/actions/runs/41850417252) had **three green jobs but failed** offline browser focus at `studio-browser.cjs:861`; **do not treat it as a green release**. The earlier `52a0adf` [CI #41840989909](https://github.com/manufact-test/ai-site-cms/actions/runs/41840989909) also **PASSED 4/4**.
- **Important distinction:** the first two changes only hardened tests/preflight; `ffb9765` **does alter the Stage3 Studio browser bundle** to fix a real keyboard focus race. The new candidate has its **own independently verified ZIP digest/fingerprint below**; do not recycle the old 52a0adf artifact hashes. **Do not infer actual deployment from green CI.**
- **Live Hostinger FOX** `https://mediumpurple-fox-175549.hostingersite.com/studio` still uses its **older Studio**. **No live switch, no database changes, no migration, no `public_html`/`.stage3-private`/Cron edit.** Formal owner acceptance: **0/135 MUST**, pending an authorized live review.

## What the last large pass added

1. **Strict installed-vs-candidate preflight** in `stage3/bin/fox-update-preflight.cjs` now rejects any changed/added file outside the six previously reviewed Studio files:
   - `studio/access.js`
   - `studio/bundle.js`
   - `studio/hosted.css`
   - `studio/hosted.js`
   - `studio/index.html`
   - `studio/studio.css`

   All other `stage3/components/`, `media-motion/`, PHP `server/` files must remain unchanged. This allowlist describes **only this FOX UI candidate**; future changes need a fresh review, not a silent widening.

2. **ZIP integrity and permission hardening:** preflight now enforces installed-code files `0644`, directories `0755` and installation-local `server/private-config-path.json` **exactly `0600`**. Unsafe archive file types, inaccessible directories, altered installer state and unexpected old files are refused. Candidate distributable modes are still `0755/0644`, with manifest/content SHA-256 validation. No private pointer contents are read.

3. **Optional independent release pins:** `--expect-commit=...`, `--expect-fingerprint=...`, `--expect-zip-sha256=...` reject a candidate whose wrapper SHA, manifest fingerprint or exact inner ZIP bytes differ from separately recorded expectations. These are consistency checks, **not cryptographic publisher signatures or owner deployment permission**. The preflight JSON explicitly reports which expectations were supplied/matched.

4. **Expanded disposable negative tests:** `stage3/tests/fox-update-preflight-smoke.cjs` covers a valid six-file delta, bad commit/fingerprint/archive digest, repeated expectations, unexpected component/PHP changes, pointer permissions, blocked server directory, tampered ZIP, missing pointer and unexpected installed state.

5. **New complete code-only rollback laboratory:** `stage3/tests/fox-update-rehearsal-smoke.cjs` builds a **synthetic installed FOX** with all 83 code files plus **two inert fake installation-local files**, intentionally ages exactly the six Studio assets, validates pinned preflight, refuses a missing pointer **before any rename**, preserves its fixture pointer at mode `0600`, simulates a staged directory switch and then exact reverse rename. The original 85-file tree is compared byte-for-byte and mode-for-mode after rollback; stale installer is not copied into the new candidate. This test **never uses real host paths, a real config pointer, SQL, public_html or network**. The test accepts a separate real inner candidate ZIP read-only to verify the actual release artifact in the same isolated laboratory.

6. **CI integration:** the `Build and verify Hostinger sibling-layout package` step now runs both synthetic preflight and the standalone switch/rollback lab; the final `Build and verify FOX code-only update` step additionally runs the same lab against **the exact inner ZIP that will be uploaded as the GitHub artifact**, after ZIP mode/extraction/release checks. Pipeline is intentionally `NO DEPLOY`.

7. **Real screenshot audit and viewport correction:** inspected the prior genuine Chromium screenshots, including hosted desktop, hosted mobile, selected heading Inspector and the horizontally selected gallery. Found an actual evidence-labeling bug: `owner-studio-workbench-desktop.png` was captured while the main viewport was **390px**, and `owner-studio-workbench-image-mobile.png` while it was **1400px**. In `stage3/tests/approved-site-browser.cjs` the desktop Workbench now explicitly opens at 1400px with desktop preview; the image-mobile Workbench capture explicitly uses 390px and restores desktop afterward. Both verify the viewport width, and the mobile image pass checks document overflow. This is a test/evidence fix, **not a live Studio UI code change**. Fresh screenshot artifact must be inspected after final CI.

8. **Actual focus race repaired after CI revealed it:** the first screenshot-test CI failed in the unchanged offline browser scenario when a section-arrow navigation's deferred `requestAnimationFrame` focus restore sometimes stole focus after the user had already moved to the page navigator. The same problem existed in the opposite direction. `stage3/studio/app.js` now restores focus only while focus still belongs to the **same navigator** (or has fallen back to `document.body` after redraw); a newer interaction with a different navigator/editor field wins. Regenerated `stage3/studio/bundle.js` from the pinned SDK sources. `stage3/tests/studio-browser.cjs` reproduces **both** immediate section→page and page→section switches and verifies focus stays in the chosen navigator after two paints. Final #41851137461 **PASSED 4/4**; the failed `3b56ff8` attempt is not a completed gate.

9. **Independently checked final artifacts:** actual code-only [artifact #13334808049](https://github.com/manufact-test/ai-site-cms/actions/runs/41851137461/artifacts/13334808049) (83 files) was downloaded and checked: outer ZIP SHA-256 `3ba59a1602652f8f2fd4c9361b29919f3e0016fc799cd39acbeb192413fca71b` equals GitHub's reported digest; inner ZIP SHA-256 `d653e006cc10e5f774616b731a522df389a557f59cab5937360eba9802a8050a`; runtime manifest fingerprint `f930c3e8861b82cc393f649775a0b8b1ad7dbad003ab16b83ebe28b2676cc5ce`. **Fully pinned strict preflight PASS** with the *real* 85-file FOX code backup: all expected pins matched, 77 code files identical, six changed Studio UI files, no changed PHP/components/media. **Separate synthetic full switch/exact rollback PASS** with those exact final inner ZIP bytes. These are engineering validations, not host authorization or a SQL restore.

10. **Real final screenshot audit:** downloaded [39 real Chromium PNGs #13334338392](https://github.com/manufact-test/ai-site-cms/actions/runs/41851137461/artifacts/13334338392), outer SHA-256 `4fe47325cc6abe4b1039bf38cb083f0a028372cc87f7d4475a48cc50d735c03c`. Verified Workbench desktop **1400×1091**, tablet **768×1981**, mobile **390×2523**, image-mobile **390×2581**; visually checked actual layouts. One image-mobile Workbench screenshot has a **red stale-editor-revision preview warning in the background canvas** beneath the open media dialog. This did not fail the hosted browser flows or prove a persistent live bug; investigate the possible transient revision synchronization on a disposable hosted fixture in the next substantive UX pass. Owner's manual 135 MUST acceptance remains **zero**.

## Real FOX backup + artifact evidence

| Item | Verified evidence |
| --- | --- |
| 2026-11-04 installed code ZIP | `stage3-backup-2026-11-04-pre-update.zip`, **85 files**, SHA-256 `b7bfa8d2a1b6ca52f3e358affbb399c55835113b318d34c83c75a1033372f1bd`; retain existing 2026-11-02 backup too |
| **Final green candidate `ffb9765`** | Inner ZIP SHA-256 **`d653e006cc10e5f774616b731a522df389a557f59cab5937360eba9802a8050a`**; outer artifact #13334808049 SHA-256 **`3ba59a1602652f8f2fd4c9361b29919f3e0016fc799cd39acbeb192413fca71b`** |
| **Final runtime manifest** | **83 files**, fingerprint **`f930c3e8861b82cc393f649775a0b8b1ad7dbad003ab16b83ebe28b2676cc5ce`** |
| Prior green candidate for history only | Inner `52a0adf` ZIP SHA-256 `1536916aa63782f9f59245215758a1ce5c966da3ccb8f69d116eebf79ff250e9`; prior fingerprint `2952f4f64dfe1158ffd1399cdc6683965292543bd33cdc80d427339ea91e4645` |
| Real backup vs old green candidate | **77 byte-identical files, exactly 6 changed Studio UI files, 0 added, 2 installation-only files**; passes latest strict preflight with pinned commit+fingerprint |
| Actual downloaded candidate vs new rehearsal | **PASS**: all 83 verified; 6 allowed UI differences, pointer preserved in synthetic fixture, missing-pointer refusal, exact code rollback |
| Original bad staging | `fox-update-staging-68154837/` was built from a mode-broken ZIP (`0700/0600`); nested server browsing in Hostinger gave `You don't have permissions to access this`. Do not use as live switch target or work around that denial |

Run a local **read-only** check only with exact files that are already legitimately available:

```bash
node stage3/bin/fox-update-preflight.cjs \
  ABS_INSTALLED_STAGE3_BACKUP_ZIP ABS_NEW_FOX_INNER_ZIP \
  --expect-commit=ffb97651d86b1c1c3ce7a36f14ba9b626f0d6851 \
  --expect-fingerprint=f930c3e8861b82cc393f649775a0b8b1ad7dbad003ab16b83ebe28b2676cc5ce \
  --expect-zip-sha256=d653e006cc10e5f774616b731a522df389a557f59cab5937360eba9802a8050a

node stage3/tests/fox-update-rehearsal-smoke.cjs ABS_NEW_FOX_INNER_ZIP
```

The example pins are for the **final verified `ffb9765`** inner ZIP only; obtain exact new GitHub artifact bytes and fresh verified pins for subsequent versions. **Never** reuse these pins with a different ZIP.

## Hard safety boundary — do not reinterpret

- hPanel successfully created a **Hostinger files + DB backup** on November 4. Ilya says downloading the full archive is infeasible (estimates **nine days**) and explicitly asked us to continue without waiting for it. **Do not ask him to download it as a routine step.** A hosting backup is **not** an independently downloaded and restore-tested SQL copy.
- The attempted separate SQL download hit a **Cloud Browser URL security-policy rejection**. Do **not** retry through alternate browser, phpMyAdmin, raw endpoint, CLI, connector or any workaround. The independently restorable DB backup + host permissions gate remains unresolved.
- The installed `server/private-config-path.json` (mode 0600) is essential to the existing FOX bootstrap but intentionally **absent** from the 83-file release ZIP. Preserve this installed pointer with its exact permissions and path in any future properly authorized runtime switch; do not read/log/export its contents, touch private config or run `finish-stage3-install.php`.
- Do not rename/overwrite live `stage3/` or modify MariaDB, `public_html/`, `.stage3-private/`, owner credentials or Cron under the current authority. Staging access must use ordinary authorized Hostinger operations, not bypass past permission denials. Any future switch requires distinct owner approval **and** the unresolved independent backup/restore/permissions gates.

## Next chat priorities

1. **Read newest Git branch + this handoff + [`FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md`](../../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md)**. Confirm actual CI job results and newest candidate artifact SHA/digests; don't assume last docs-only HEAD is the tested functional code SHA.
2. **Keep momentum with substantive batches** (Ilya wants approximately **30 minutes per pass**, not 7–10 minute mini-tasks). Prioritize user-visible editor integration and safe release readiness, with meaningful functional/regression checks; avoid building an unrelated CMS or new infrastructure.
3. **Hostinger staging:** only if there is explicit normal permission/authorization to place and browse a new **private sibling** package, inspect the corrected ZIP's directory traversal and six-file content. Merely staging is not a live switch or reason to touch SQL. If access denies or guard is unmet, stop there without bypass.
4. **Actual owner acceptance** after a separately cleared live release: login → real site list → full-page central canvas click text/image/FAQ/gallery → responsive desktop/tablet/phone → Undo/Redo → draft Save/reload → Review/Publish/Restore on owner-approved disposable data only. The existing offline/hosted browser suites give automation evidence but **0/135 MUST** formal owner acceptance so far.
5. The first paying-client site remains blocked until Ilya supplies the original landing and separately approves desktop/tablet/mobile prototypes. Leave Stage2 and Design Factory workstreams alone.

**The real FOX instance was not modified in this engineering pass.**
