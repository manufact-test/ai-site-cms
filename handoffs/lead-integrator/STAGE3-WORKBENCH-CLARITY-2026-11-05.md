# MANUFACT AI Site CMS — Workbench clarity and hosted preview continuity, 2026-11-05

## Source of truth

- Repo `manufact-test/ai-site-cms`; **only** `feature/stage3-ai-site-contract`. Do not restart the CMS, create another editor, change `main` or touch Stage2.
- The previous 2026-11-04 FOX handoff was code SHA `ffb97651d86b1c1c3ce7a36f14ba9b626f0d6851`, docs HEAD `4bdbe8a614d55531e9963fe1faaab989b36a19e5`. The branch has moved substantially since then. Do **not** resume development from those older versions.
- Last fully green checkpoint before this clarity pass: `1b57ad660d36e3e674634c7f566193af8c6a833f`, [full NO DEPLOY CI #41896529322 — SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41896529322).
- Current fully verified functional UX checkpoint: `36511a9c77342ca65eec12767c9b3a136f59cd24`, [NO DEPLOY CI #41989971893 — SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41989971893): offline Chromium + authenticated PHP Chromium/contract, Next runtime, MariaDB 10.11 and 11.8. Earlier first attempt `2e774e8` [CI #41989662050](https://github.com/manufact-test/ai-site-cms/actions/runs/41989662050) was **not green**: Chromium found an optional non-repeat `section.items` crash, fixed in `36511a9`; never cite that first attempt as a release.
- Verified new [39 real Chromium screenshots #13397637366](https://github.com/manufact-test/ai-site-cms/actions/runs/41989971893/artifacts/13397637366): downloaded ZIP SHA-256 `7274e5e53843ed038d57be548ba7e292ad14cc2d6fcebd5ece5ef8ed54e8d323` matches GitHub, desktop Workbench 1400×1091 and mobile Workbench 390×2523 visually inspected. The secondary section actions are collapsed and the selected element's properties remain visible in the desktop preview.
- Verified new [FOX code-only artifact #13398066310](https://github.com/manufact-test/ai-site-cms/actions/runs/41989971893/artifacts/13398066310): outer ZIP SHA-256 `1928126f8c4e00c1e77a606a4bd67266a74d6e14af66c43ed53eb4f5327a1bb9` (matches GitHub digest), inner ZIP SHA-256 `db5edfb874e194a662d823d76044024eb9d58d6d76939909f808b61a6c6b644f`; 83 verified runtime files, manifest fingerprint `6058e5f3790d8965bcb7b9a4aa5acd8e86ab1d38463f0cde52520d0198433631`. The exact downloaded inner ZIP passed package verification and synthetic complete update/rollback lab. It has **not** been compared again with a locally available real installed FOX backup in this session; don't misstate that gate.

## Whole UX sequence since the former handoff

1. `6b9cf241` corrected the ordering of server revision synchronization and media preview refresh after image uploads. Real browser regressions cover upload paths; `4a7c6b31` captured completed PHP mobile preview.
2. `0c455da1` through `cef3b531` removed unnecessary authenticated PHP fetches during responsive switches, retained the prior verified preview while a new one loads, handled empty pages and improved actual tablet/phone Workbench layout and selected-content visibility. Genuine Chromium covered viewport/scroll continuity.
3. `12ea7e4b`/`5f02f1f5` prevented stale/out-of-order PHP preview responses, including a simulated 409, from replacing a later page/revision. The main central canvas and full-page Workbench keep old content non-interactive during replacement. This does not weaken revision checks.
4. `ca9c8428` through `1b57ad66` preserved keyboard Tab focus, scroll, expanded Appearance panels, selected Graph nodes, and a still-open image picker after same-scope edits and responsive media selections. [CI #41896529322](https://github.com/manufact-test/ai-site-cms/actions/runs/41896529322) was SUCCESS 4/4.
5. `2e774e8` + `36511a9` complete the **specific owner-requested clutter reduction** in that same Workbench: page-transfer/copy, section ordering/deletion, shared-section links, device visibility, full Inspector and specialist editors now live in **one closed-by-default «Дополнительные действия с секцией»** disclosure before the field list. The actual selected-element properties, page canvas, device switch and `+ Блок после` stay accessible; no capability is removed. Element choice labels come from the existing Russian manifest labels and repeat card text, not machine slots like `heading`. The disclosure stays open after edits to the same selection, but a changed section/device starts collapsed.

## Regression and scope proof

- New `stage3/tests/studio-browser.cjs` (real offline Chromium) checks default collapsed state, accessible optional transfer and visibility controls, no draft mutation on toggle, Russian `Заголовок контактов` instead of raw `heading`, and reset on another section.
- New `stage3/tests/approved-site-browser.cjs` (authenticated PHP + real Chromium) checks closed default, readable normal fields, optional actions still accessible, and expanded-state persistence after an actual text edit.
- `stage3/studio/app.js` was rebuilt to `stage3/studio/bundle.js`; local `node --check`, bundle parity, the 75-group contract suite, and synthetic FOX preflight/exact rollback tests passed. Full 4-job CI is the release-quality engineering gate, not local smoke alone.
- No new site schema, new editor, server API, PHP backend, SQL schema, auto-save/publish, client site, Android module or unrequested feature.

## Still NO-GO on live FOX

- Existing working instance is `https://mediumpurple-fox-175549.hostingersite.com/studio` and remains **older installed code**. No files, databases, Cron, `public_html/`, `.stage3-private/`, live `stage3/`, owner data or access were changed by these GitHub-only passes. The formal owner MUST acceptance is **0/135**.
- The genuine installed code backup `stage3-backup-2026-11-04-pre-update.zip` has 85 files, SHA-256 `b7bfa8d2a1b6ca52f3e358affbb399c55835113b318d34c83c75a1033372f1bd`; previous 2026-11-02 backup also exists. hPanel file+DB backup exists, but a separate verified SQL restore does **not**. Ilya cannot wait for a nine-day download. SQL export was security-policy blocked; never reroute or bypass that refusal.
- Old staging `fox-update-staging-68154837` has invalid permissions and must not be a release target. Installed `server/private-config-path.json` mode `0600` is installation-local and confidential: do not read/replace/remove it, and never run `finish-stage3-install.php`.
- The six-file FOX preflight allowlist is only `studio/access.js`, `studio/bundle.js`, `studio/hosted.css`, `studio/hosted.js`, `studio/index.html`, `studio/studio.css`. The current pass changes two runtime assets (`bundle.js`, `studio.css`) within it. This is **not** a real-backup preflight or permission to update live; any new artifact needs its *own* verified hash/fingerprint and separate review.
- First real client site still waits for Ilya's source landing and three separately approved static desktop/tablet/mobile mockups.

## Next action

Focus on the **same agreed one-canvas → select content → contextual fields → save/review/publish** experience. Review genuine new screenshots for unnecessary complexity, fix concrete UX regressions in cohesive batches, keep no-deploy 4/4 CI green. Do not invent new features. Once all backup/permissions gates and **separate explicit owner approval** exist, plan a reversible live FOX code-only change and then the owner's real hands-on acceptance; until then release remains NO-GO.

Ilya requested documentation updates but **explicitly did not request a new first-message-for-next-chat artifact** in this session.
