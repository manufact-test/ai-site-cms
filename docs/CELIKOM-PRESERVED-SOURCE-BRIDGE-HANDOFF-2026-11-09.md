# CELIKOM preserved-original bridge — handoff 09.11.2026

**CURRENT ACTIVE CHECKPOINT for the first real local CMS pilot.** This document supersedes the 08-Nov design-NO-GO *as the immediate pilot task only*. Historical design decisions remain in `docs/FIRST-SITE-CELIKOM-DESIGN-NOGO-2026-11-08.md`; do not mistake the locally accepted preserved original for approval of the previously rejected newly generated concepts. Never restart or replace the MANUFACT AI Site CMS.

## Repository and exact freeze
- Repository: `manufact-test/ai-site-cms`
- Work branch: `feature/celikom-preserved-source-bridge` (do not merge to `main`).
- Last verified implementation/docs SHA **before this 09-Nov handoff**: `f937ed81240ac49513013f3a3a9d8f3ae42babe0`.
- Bridge CI **SUCCESS**: https://github.com/manufact-test/ai-site-cms/actions/runs/42584022124 . This is **NO DEPLOY** CI (synthetic fixtures in GitHub, isolated SQLite Studio browser test), not a claim about FOX or production.
- Original CMS functional baseline `5c863f476cc538112ff3252f18a4cdedb336e4b6`, full four-job CI https://github.com/manufact-test/ai-site-cms/actions/runs/42185003407 remains distinct. FOX only previously got a controlled Studio UI-only update reported by Work; no change was deployed in this preserved-source bridge.
- First-party bridge files: `stage3/site-adapters/celikom-original/{native_package.py,bridge.py,finalize_static.py,test_native_package.py,test_player_fade.cjs}`, `stage3/server/{CelikomSource.php,Api.php}`, `stage3/studio/celikom-original-studio.{js,css}`, `stage3/studio/index.html`, `stage3/tests/celikom-original-studio-e2e.cjs`.
- Owner archive V2 SHA-256 `f3ed9d1bdfeb4ddce1a94370b6f0f3675de2a505e527aa991cfa0a04e0f25001`; older approved owner source also pinned `f998e96ccc9393dfe958a51d144be10d5fb1f1d068721d163ff40048077104aa`. Do not turn this narrow allowlist into a generic arbitrary HTML importer.
- Private 11-second A/B recordings: `Au-bez-CELIKOM-00-43-00-54.mp3` and `CELIKOM-with-00-43-00-54.mp3`. Owner provided files in conversation and Work received a separate **private** isolated package; **do not commit music, original page HTML/ZIP, private media or secrets to public GitHub**.
- Existing owner-approved local Work test input: `CELIKOM-native-FADE-FIX-ISOLATED.zip` (from this conversation; private evidence, not a GitHub asset).

## What actually passed
1. Original CELIKOM restored without redesign. 11 sections, 28 FAQ and 99 editable content fields; original CSS/JS/images preserved in the owner ZIP. Local browser tested 1440/768/390.
2. Real owner-provided MP3 A/B demo: actual play/pause/seek, switch between service/restored at corresponding position, no imitation with fake waveform/progress.
3. Existing hosted Studio flow exercised via temporary isolated installation: `Мои сайты → CELIKOM → title & FAQ edit → preview → save → reload → publish → restore`. Work's real-owner-package run reported **PASS** and all 99 fields exactly matched initial values after rollback. GitHub CI separately covers the same flow with synthetic fixture/ephemeral SQLite; these are separate evidences.
4. Two earlier Work findings fixed on `a517b9ffa5d56a592754551ff6259749e89a3387`: inherited meta-CSP blocked audio in iframe; dark inherited CSS made owner dialog unreadable. Repeat local Work check using real MP3 passed play/A/B/pause/seek on all sizes; minimum measured owner dialog contrast **10.88:1**.
5. Later rare browser failure in original audio JS: negative `HTMLMediaElement.volume` during first rAF fade frame (once, not reproducible in eight immediate retries). Fixed in the *verified private runtime derivative* by clamping fade `t` **and** volume to `[0,1]`; owner archive remains unchanged and fingerprints are checked. GitHub regression on 24 simulated hostile frames **PASS**, plus hosted Studio CI **PASS** on `f937ed8`.
6. Owner's Work final retest of `CELIKOM-native-FADE-FIX-ISOLATED.zip` with actual MP3: **20/20 rapid A/B switches (~60 ms spacing), 3 pause→seek→resume cycles, seek during playback, final pause: PASS**. Volume stayed in `[0,1]`, **0 uncaught JavaScript errors / 0 new console errors**. Source revision and publication states left byte-identical. This is owner-supplied Work evidence; do not pretend a fresh independent live-server run occurred here.

## Open items / important boundaries
- Work still noted **four older CSP/font messages** in console during final player test; their exact messages and actual functional impact must be identified **before** any code edits. Do not claim those four warnings are resolved. They did **not** break validated A/B and Studio flow.
- Saved owner ZIP contains no four Manrope WOFF2 font files, so existing local screenshots used fallback fonts. The separate `manufact-test/nomusic` repo `feature/api-range` has self-hosted Manrope WOFF2 under `website/public/assets/fonts/` and `OFL-Manrope.txt`. Check licensing, hash, original font mappings and resulting geometry before private packaging; do not blindly replace/design or distribute unknown fonts. Limit changes to an explicitly verified problem.
- **Not accepted / not deployed:** production CELIKOM, FOX upgrade from this bridge, host HTTPS, entire 135 MUST product acceptance, formal Stage2, final public website acceptance. Studio pilot PASS is not a claim that all CMS requirements are complete.
- No changes to FOX, Hostinger production, original CELIKOM live site, working DB, GitHub `main`, production extension/server/Android, or public domain. Publish tests were **local/isolated only**. Never deploy or merge without separate explicit owner permission, safe backup/rollback plan, and genuine host preflight.

## Next Lead Integrator — ordered task
1. Read this handoff, `docs/NEXT-CHAT.md`, `docs/MASTER-TZ.md`, `docs/ROADMAP.md`, `PROJECT-STATUS.json`; continue the existing work branch. Check fresh SHA & CI before editing.
2. **Do not touch the now-working player or redo design**. First reproduce/classify only the four remaining console messages; if cosmetic and harmless, record and proceed; if harmful, fix narrowly with tests. Source original Manrope safely if required to eliminate real layout mismatch.
3. Perform one final *meaningful* acceptance on the real preserved site in existing Studio, or reuse the already-passed Work evidence when unchanged. Avoid repeated identical check loops. Focus on editable title/FAQ, preview, state integrity, publish & restore and media assets.
4. Move toward **shipping the existing CMS quickly**, not adding new platforms/features/design variants or a second CMS. Check remaining actual acceptance blockers and plan safe isolation/backup/release for FOX only after a separate owner decision.
5. For browser/Hostinger actions unavailable in the main chat, use the **already-existing Work** conversation. Give owner a short ready-to-paste Work task with exact SHA, files, scope and PASS/FAIL criteria. Ask for user input only when truly required.
6. When the owner asks to change chat, update docs and supply a ready-to-paste first message; no repetitive reports.

**Design scope clarification:** historical `MASTER-TZ.md` process for *newly designed client websites* still requires research → two distinct desktop static concepts → selected tablet/mobile → explicit approval before writing the new site. The current preserved-original CELIKOM is a special **source-preserving integration pilot**, not retroactive approval of rejected generated designs or an unrestricted HTML importer.

**Owner-facing reporting:** short: what changed; what actually passed; what remains; whether owner's action is needed. Don't ask for MP3 again: owner already supplied them and the Work run has validated them.
