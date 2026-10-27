> **27.10.2026 — final factual D7 handoff.** The current executor cannot clone the repo or complete even a trivial Chromium file:// navigation; branch Actions/check-runs = 0. No Node checkout suite, 54 PNG, 64 routes, 42 human decisions, 6 PHP probes or verified release ZIP. Actual transfer commands, evidence checklist and Lead requirements: [D7-REAL-RUNNER-LEAD-HANDOFF-2026-10-27.md](handoffs/D7-REAL-RUNNER-LEAD-HANDOFF-2026-10-27.md). Scope frozen.

> **НОВЫЙ ПРИОРИТЕТ / 27.10.2026:** инженерные D1–D6 действительно реализованы; «86%» больше не используем как индикатор приближения к релизу. D7 OPEN, формальный общий статус CMS 0/135 / NO-GO. Подробный объективный отчёт и конечная последовательность завершения: [OWNER-REALITY-REPORT-2026-10-27.md](handoffs/OWNER-REALITY-REPORT-2026-10-27.md). **STOP FEATURE CREEP:** следующий чат — реальный Node/Chromium/PHP evidence и передача Lead, не новые редакторы.

**Последний законченный кодовый блок:** исправлены настоящие ссылки `behavior.href` на Hero, service card repeaters, media-story, CTA primary/secondary и contact-panel в HTML-демо; старый код ошибочно принуждал адреса к Contact/Services и вообще не показывал кнопку contact-panel. В `studio/site-audit.js` добавлена таблица реальных CMS URL (в акте владельца, включая пакет из 18 файлов). `studio/runtime.generated.js` синхронизирован с исходным компилятором. Изолированное исполнение точного GitHub JS: 288 kit/theme/language комбинаций / 1 152 HTML страницы PASS; сфокусированная проверка пяти семейств переходов, безопасного внешнего HTTPS, отказа при неизвестном внутреннем пути и наличия адресов в аудите PASS. Изменения в существующих Node smoke только **написаны и синтаксически проверены**, но **не исполнены на настоящем checkout**. Chromium `file://` probe локально не завершился, `git ls-remote` не разрешил GitHub DNS. Ни D7 визуальное одобрение, ни PHP parity, ни source release не заявляются как PASS.

# Design Factory — operational progress and D7 continuation

## 2026-10-27 — FINAL HANDOFF / ONE-CLICK 18-FILE DELIVERY

**Start here:** [`handoffs/FINAL-TRANSFER-2026-10-27.md`](handoffs/FINAL-TRANSFER-2026-10-27.md) (from `PROGRESS.md`; other docs use the same repo-relative handoff path). The final comprehensive transfer is the authoritative concise overview for the next independent DF developer.

**Last product sprint:** New `studio/delivery-package.js`, top-bar `save-delivery-zip` button and 18-member deterministic owner + Lead developer ZIP: CMS site-v1, matching D6 integration bundle, bridge guidance, editable project/workspace/services, owner audit HTML/JSON, four standalone HTML pages and CSS, bilingual review portal, manifest CRC32 and client feedback only when current. Stale feedback is explicitly excluded. Both strict 8-member legacy preview and strict 18-member handoff ZIP formats pass independent CRC inspection. No network, automatic publication, plugins, PHP changes or outside-DF file writes.

**Critical fix:** D6 `lib/bridge.cjs` now inserts a requested composition before the existing Home CTA, exactly matching Studio; previously it silently replaced a section, causing D6 to differ from normal CMS export. Generated runtime kept source-exact. **1008** CMS/Studio/D6 source parity combinations passed; **72** handoff archive variants plus **72** current/stale feedback cases passed. Real Studio button built the 18-member ZIP and legacy eight-file preview remained functional. Existing optional Chromium E2E now includes ZIP export checks and fixes an early download-hook restoration flaw, but was **not actually run**. Final functional fix `f728f242707f993110d341e5f4be4730d1868187`, see final transfer for every other SHA.

**NO FALSE ACCEPTANCE:** D1–D6 engineered; D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135 formal gates passed, approx. 86% phase implementation. Real Node/Chromium/human/PHP D7 evidence is missing, even after these real-source isolated checks. Do not merge, publish, or change outside `stage3/design-factory/`. Owner explicitly wants large connected development blocks, not endless micro-tasks/tests.



## 2026-10-27 — integrated Design Studio content workbench, owner audit, and no-loss page composition

**Functional commits:** `fe75882660b9f90f1e76117d7b611cf96ae2c1b4` (preserve all original Home sections/CTA under D3 composition; Undo/Redo cannot silently reinstate prior owner index authorization), `1926aea1b1199ca87be42ee5e243a103d955901b` (new independent `studio/site-audit.js`), `93ab2a7906a38e105bd39228342fe8f3f1148603` (live Studio owner-audit UI and HTML/JSON downloads), `3e30c3d9290dd6340c57aa90468fc9a03dd0eac9` (complete services-list replacement/edit/export + RU/EN services UI), `7e67db16fd7d08ee73065851954baa8c8f0815c2` (existing Node/Chromium smoke extension and corrected CTA HTML assertion). All strictly inside `stage3/design-factory/**` on the independent branch.

### Finished user workflows

1. **Composition without missing CTA:** choosing any of the 42 D3 compositions inserts the registered fallback *before* the first existing Home CTA, keeping every existing section and stable ID instead of replacing the final block. In three kits (architecture, portfolio, nonprofit) the CTA was not the last block; preserve the original position relative to other existing sections. Same validated CMS contract; no unsupported new component.
2. **Owner review not silently restored:** Undo/Redo navigates editorial history but always revokes old `ownerReviewConfirmed`; the owner must affirm explicitly before a new `robots=index` export. Imported owner-reviewed JSON retains the existing documented explicit import behavior; no auto publishing.
3. **Four-page owner audit:** section 04 of Studio shows all four page entries (direct click to inspect), required owner-fact count, section counts, CTA counts, SEO/indexing state and matching/stale client feedback count. Download standalone `*-owner-review.html` for owner verification/printing (CSP, escaped owner strings, no remote network), or `*-content-audit.json` for a developer. The report is generated from a fresh `compileCurrent()` on click, never an old debounced preview. Format `manufact-design-factory-site-audit-v1`, offline and informational only, no owner signature, no PHP pixel parity, no license verification, no publication.
4. **Complete services editor:** load the current list into the editable paste box (refuse to overwrite existing unsaved paste), batch append, full list replace as one reversible Undo step, or download human-editable UTF-8 TXT (title + TAB + description). English-language projects get English service labels, placeholder descriptions, actions and editor guidance. Invalid long/empty inputs or more than 12 services fail atomically and retain the draft; unverified new services remain blockers for indexing. No browser persistence or external APIs.

### Evidence actually obtained

Actual GitHub first-party browser bundle + audit/feedback/ZIP modules were loaded in an isolated DOM executor. **18 connected Studio checks passed** including audit navigation, downloadable owner HTML/JSON, service append/replacement/Undo/Redo, TXT, rejection of invalid replacement, non-clobbering edit buffer, English controls, actual CMS site validation and surviving CTA after composition. Pure live-source integration across **12 kits × 42 compositions × 2 languages = 1008 combinations passed**: CMS validateSite, preservation of all original section IDs and CTAs (including non-last CTA kits), HTML CTA, and printable owner audit. All **24** default kit/language owner reports compiled. Expanded existing Chromium smoke parses but was **NOT EXECUTED**. These isolated checks are NOT a substitute for actual checked-out Node suites, Chromium E2E, 54 real PNG/64 route runs, human 42 composition + 54 screenshots review, 6 real PHP parity probes or SHA256 release ZIP.

**Formal status unchanged:** D1–D6 engineered, D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, **0/135 approved**, phase-based ~86%. Only Lead may integrate; no merge/main/SDK/PHP/CI/hosting/production touched.


## 2026-10-27 — Service workbench: bulk import, safe duplication and ordered CMS export

**Functional commits:** `31dc193144bae14083fca86072655ca85a4a62f3` (Studio service management + previous RU/EN portal smoke assertion update), `0c8c0247fe0233f0ae7832cb3b64aa804d1fc658` (existing Chromium smoke expanded to cover service editing and stale CSS selector updated). Both strictly under `stage3/design-factory/` on `feature/stage3-design-factory`.

**User functionality:** Existing Studio inspector section 02 now offers Up/Down (44px keyboard/touch buttons) to reorder real service rows, duplicate-as-draft (copies title/description but prefixes the copied title `Пример (подтвердить):` / `Example (verify):` so the owner checklist blocks accidental duplicate approval), and bulk insertion of one service per line. Bulk accepts `Title | Description`, tab-separated `Title<TAB>Description`, or `Title` alone; the latter receives a conspicuous unverified description placeholder. Input limits: max 12 total/at once, 120 chars title, 320 description, 5500 chars pasted source. Invalid input or overflowing batch fails atomically, preserving the textarea for correction. All changes go through existing `apply()`/Undo/Redo and revoke previous owner sign-off. This modifies no CMS schema or SDK/PHP code.

**Executed focused verification, NOT full D7:** Actual current GitHub Studio JS + committed first-party browser runtime, feedback module and ZIP packer were loaded together into an isolated DOM evaluator. **15 checks passed**: bootstrap, paste two services, real project export, move, Undo, Redo, duplicate draft, ready-for-publish remains blocked, delete copied row, atomic invalid batch, retain rejected input, append with placeholder, 4-page CMS JSON export, correct CMS service ordering, verified offline 8-file ZIP CRC. Direct parser tests covered RU/EN source, >120 title, 13-row overflow and empty input. Changed app and existing smoke test source parsed; existing smoke's optional real-Chromium scenario was extended with 10 actions and its embedded script was syntax-checked. **Chromium has not executed**, nor full Node suite, 54 real PNG/64 routes, human reviews, six genuine PHP parity probes or full release ZIP.

**Status unchanged:** D1–D6 engineered, **D7 OPEN**, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135 formally accepted, 6/7 ≈86% phase-based. Main developer handles integration after independently verified acceptance. No merge/PR, main, Lead branch, external CMS, workflows, hosting or production writes.



## 2026-10-27 — bilingual client acceptance workflow and editable feedback
**Functional commits:** `055e930f047290b7ca08437372531bc913f230a7` (RU/EN review portal linked to Studio project language), `996411b5a170f4d00dd0ea28b50a27a5f397d0b4` (edit note page/type/body and reopen corrected items), `28fb2d5fe99fb49591edd484fa386606cd265689` (protect in-progress client edits from stale JSON download/import; clearly display resolved imported notes). All changes restricted to `stage3/design-factory/**`.

**Owner workflow now:** choose Russian or English in Studio, export **HTML-демо ZIP**, extract it and open `review.html`. The customer gets a localized feedback portal (including the inline first-party runtime strings), can create/edit/delete up to 30 page-specific notes, change note type and text, save or cancel changes, export JSON and restore a draft bound to the *same* site snapshot. An edited previously resolved note is reopened. Download/import is disabled while an edit is uncommitted; no browser storage, uploads or network services. The project/snapshot correlation format remains `manufact-design-factory-client-feedback-v1`, unchanged. Feedback is untrusted and is NOT owner review, signoff or authorization to publish.

**Executed focused verification:** actual committed GitHub `studio/runtime.generated.js`, `studio/client-feedback.js`, and `studio/preview-zip.js` modules executed together in isolated JS. For **both RU and EN**, the genuine first-party CMS compiler produced 4 routes and HTML/CSS, `review.html` had the requested language, ZIP32 built 8 canonical files and inspector confirmed all CRC32 values (RU 34450 bytes; EN 30867 bytes in this test fixture). JS runtime needed a JSON-only `structuredClone` shim because the isolated evaluator has no native global; the real browser runtime was not modified for this. In a second isolated executable mock-DOM scenario for **both languages**, user created a note, changed its page/type/text, download was disabled mid-edit, and the exported JSON carried the saved change using the original v1 format. All changed JS and embedded scripts parsed. A handful of assertions were added to existing `tests/studio-smoke.cjs`; **the actual checked-out Node suite and Chromium were NOT RUN**, so do not record formal pass.

**Release remains unchanged:** D1–D6 engineered, **D7 OPEN**, Stage2 NO-GO, Stage3 UNACCEPTED, **0/135 accepted**, around 6/7 = 86% phase-based. Real Chromium file-navigation/54 PNG + 64-route audit, full Node suite, 42-composition and 54-screenshot human judgments, 6 actual PHP parity probes, deterministic source-exact release ZIP / SHA256 remain required on a genuine accessible checkout. No main/Lead SDK/PHP/CI/workflows/hosting/production changes or merge.


## 27.10.2026 — concise authoritative next-chat handoff

**Read [`handoffs/START-HERE-2026-10-27.md`](handoffs/START-HERE-2026-10-27.md) first.** Final functional SHA before this documentation update: `f08426ed48ac23264e51433c3d641243ecd31b49`. This update introduced byte-for-byte recompilation of **all 164 generated artifacts**, including 16 four-page sites and the D3 showroom, plus fixture generation using the real compiler. **V8 source-only tests are not full Node or Chromium acceptance. D7 remains OPEN, 6/7 ~86%, Stage3 UNACCEPTED and 0/135 accepted.** The repeated 86% figure is phase-based and will change only when end-to-end D7 evidence actually passes, not because another validator was added. Previous chronology below is historical; the new short handoff supersedes it for next steps.

## 27.10.2026 — D7 whole-site identity and all-route real-Chromium preflight

**Branch-only engineering commits:** `3a13d2995c510fbcdb4ef75edb45840a48a0a0be`, `e85c45cf628960335995a3d729490afb6b476b15`, `dab572bfaac3a5ac8b65a3639279895361dc57e0`, `5fb219954bfd336c26fe2c32b4a00a73ab28e89a`. All are strictly inside `stage3/design-factory/` on `feature/stage3-design-factory`. No merge, production, main, SDK, PHP or workflow edits.

**Block A — 164-file generated-site integrity:** `lib/generated-source-manifest.cjs` deterministically lists all 16 four-page preview sites (each: 4 HTML, 1 CSS, 5 generated JSON), plus the 4 D3 showroom files. Full-matrix inventory: **65 HTML + 17 CSS + 82 JSON = 164**. Each is verified as a regular canonical file, read with size cap, checked for expected CSS route, locally resolvable links, 42 showroom composition IDs, valid JSON, and bound via name, exact byte count and SHA256. Includes all internal routes **without PNGs**. The `generatedSourceFiles` inventory is in `visual-evidence.json`, hashed into `evidenceSha256` and independently recalculated by `checkEvidence()`. Missing, re-ordered, substituted or changed members fail closed. Old D7 evidence files lacking `generatedSourceFiles` are now invalid: recapture with the current code; never relabel old evidence.

**Block B — all 64 browser route navigations:** `lib/chromium-pipe.cjs::inspectOfflineRoute` navigates each actual `file://` preview page at 390px in one Chromium CDP browser, without additional screenshots. The generator checks all 64 site pages for full load, correct location/width, stylesheet presence, main+sections+body, exactly 4 nav links and `robots=noindex`. `report.routeAudit` contains exactly 64 canonical ordered named route results, tied into the report SHA256 and rechecked independently; diagnostic in-memory mode intentionally cannot produce this formal route proof. One failed page aborts formal capture. The review UI remains disabled until **54 screenshots + 42 reviewer compositions + 164 generated files + 64 route records** coexist. The `lib/visual-review.cjs` verification output and `bin/release-candidate.cjs` final Lead gate explicitly require counts 54/42/164/64, plus previous mandatory Node/Studio/PHP/ZIP/git/provenance gates.

**Actual checks in this context:** JavaScript parse of changed modules; source matrix enumerated **164 unique entries** (65 HTML, 17 CSS, 82 JSON), six isolated source-manifest mock-filesystem behavioral tests (including non-screenshot HTML alteration); nine isolated real-method Chromium CDP mock cases (success and fail-closed for CSS/sections/noindex/main/nav/viewport/empty content/blocked navigation); six Lead final gate cases; review UI generated 42 unique controls and fail-closed on missing 164/64. This is **not** full Node CLI execution nor a real Chromium route audit. The runtime does not have an authorized local Git checkout with `file://` Chromium navigation available. No 54 actual PNGs, 42 human verdicts, 64 observed route results, PHP parity probes or real ZIP/SHA256 were produced in this session. Formal evidence and reviewer authentication remain pending.

**Do next in a REAL checkout:** (1) run nine-suite Node audit and exact browser bundle check; (2) run `DF_CHROMIUM_BIN=/path/to/chromium node stage3/design-factory/bin/visual-qa.cjs --out /fresh/output/dir` with real local `file://` access; this should perform 54 captures and 64 complete route audits, then write 164-file hashed evidence; (3) complete individual 42-composition and 54-PNG human v3 review and verify `bin/verify-visual-review.cjs`; (4) use real Lead SDK+PHP to do six parity probes, build and verify source-exact CRC/SHA256 ZIP, record branch/git and final audit. `--static-in-memory` output is diagnostic only, never an accepted substitute. Do not merge/deploy/declare Stage3 accepted without integrator authorization.

**Status remains 6/7 engineering phases ~86%; D7 OPEN; Stage2 NO-GO; Stage3 UNACCEPTED; 0/135 formal acceptance.**


## 27.10.2026 — D7 individual composition acceptance + Chromium-rendered visual completeness (two linked feature blocks)

**Source commits this session:** `cafc9523f5b6f79f241589204a8d7b98fa2a08e7` · `1025f28f3ecc2e0083844eb8de9efadbdae701fc` · `608bca389af9d85b632f87e9ed9990c304b42029` · `af1069878e3dc5e3e2664216f55b9d85943e7518` · `8276bfbe6797e0428fce3aa25c90cd941c7f5cc7`. Feature branch `feature/stage3-design-factory` exclusively; all changes within `stage3/design-factory/`. No edits/merge of `main`, Lead SDK, server PHP, workflows or production.

**Workstream 1 — complete human D3 evidence:** the offline human visual-review UI now requires **42 individual, identifiable composition decisions** in addition to the **54 PNG decisions**, with direct links to matching IDs in `showcase/index.html`, approve/reject, mandatory notes for rejection and resumable evidence-bound drafts. Final receipt is `manufact-design-factory-visual-review-v3` / version 3, draft `manufact-design-factory-visual-draft-v2` / version 1, and verified output is `manufact-design-factory-visual-review-verification-v2`. Old v2 receipts and old v1 drafts are deliberately incompatible (regenerate, do not relabel). The review verifier rejects missing/duplicate/unknown 42 compositions, rejects missing notes and rejected items, returns `compositionsVerified:42` + `screenshotsVerified:54`. The defect export now includes rejected composition IDs/notes as well as screenshot defects. `bin/release-candidate.cjs` explicitly requires those 42+54 verified counts for Lead handoff readiness. A generic "reviewed 42" checkbox is no longer enough.

**Workstream 2 — render quality attached to immutable evidence:** exact generated showcase HTML must contain all 42 ordered `article.pattern` anchors matching the canonical `catalog/compositions.cjs` IDs, without omissions, duplicates or substitutions. On every real visual-qa screenshot, Chromium is asked for DOM metrics: local stylesheet count, main content, rendered site sections, body text and all actual article.pattern IDs. No image may pass with a missing stylesheet, empty main or, for showroom captures, anything but the expected 42 browser DOM patterns. `images[].dom` is included inside `evidenceSha256`; `lib/visual-review.cjs` re-verifies counts and fails closed on missing or falsified DOM metadata. `tests/visual-review-smoke.cjs` fixtures now construct real 42-entry showcase anchors and representative DOM proof. If any runtime output is changed, the evidence becomes invalid and must be recaptured.

**Actually executed, limited scope:** all edited source modules and embedded review UI script passed V8 parse; an isolated V8 check of the actual review UI generated 42 unique controls/42 matching showroom links and valid JS; eight independent behavioral cases using the actual v3 `verify()` with mocked filesystem/PNG verifier covered approved 54+42, missing/duplicate/unknown compositions, missing rejection note, rejected cards and legacy v2. **No real browser E2E, full nine-suite Node checkout audit, 54 real PNGs, human reviewing 42 originals, six PHP parity probes or ZIP SHA256 has been produced**: this execution environment still lacks Git checkout, GitHub DNS and `file://` browser navigation. The captured metrics are protocol implementation, **not verified capture results**. Do not promote smoke/fixture/synthetic evidence to real D7 acceptance. Code and docs are committed only in the owner's isolated branch.

**Status:** D1–D6 engineering implementations present; approximate progress **6/7 ~86%**, **D7 OPEN**, **Stage2 NO-GO**, **Stage3 UNACCEPTED**, **0/135 formal gates accepted**. Next steps: run actual checkout nine-suite Node audit + bundle parity, Chromium Studio file navigation and responsive 54-image matrix, genuine 42-composition human review using v3 receipt, six real PHP parity probes, exact-source ZIP CRC/SHA256 and final git-branch provenance. No merge/publish without Lead approval.


## 27.10.2026 — D7 source-bound visual evidence and real offline navigation inspection

**Engineering code commits:** `26dcad5122cb5e9a471118896e42e03c1659f1a6` (image-to-source provenance) and `55acabcf07a706483c028e2c92f4262d8f4f405e` (offline link and anchor reachability). Both are in the **independent feature branch only**, solely under `stage3/design-factory/`. Never merge, deploy or change `main`, Lead SDK/PHP or GitHub workflows.

- New `lib/visual-source-provenance.cjs` deterministically maps **all 54 D7 screenshot filenames** to **20 generated HTML documents and 17 CSS stylesheets**, rejects unknown routes, symlinked/non-canonical inputs, oversized or changed source bytes, and computes SHA-256 over exact HTML and CSS bytes. Direct browser capture checks matching URL and identical pre-/post-capture content identity.
- `bin/visual-qa.cjs` includes `images[].source={html,htmlSha256,css,cssSha256}`. `lib/visual-review.cjs` includes these in the evidence hash and independently verifies every byte against the generated HTML/CSS in the evidence directory. Original or recomputed PNG checksums alone cannot hide changed HTML/CSS. Old reports **without explicit** `captureTransport:'file'` and `diagnosticOnly:false` are now **fail-closed**: regenerate evidence with the current tool, do not relabel it. Memory-only diagnostic captures remain excluded.
- Every generated HTML source must have its expected canonical stylesheet link. Static preview navigation is checked: each ordinary local hyperlink must resolve within its own source site, must not escape its site or reference the network, and fragment anchors must exist. These checks run as part of visual QA and independent human-review evidence validation. An anchor to an absent page fails even if no screenshot was specifically requested for that page.
- Updated `tests/visual-review-smoke.cjs` fixtures for the new evidence protocol with real fixture HTML/CSS files and regressions for changed HTML, changed CSS, missing image source metadata, missing file capture transport, broken local route, external URL and missing fragment target.
- **Actually executed:** syntax checks on modified JavaScript; 54/54 filename-to-source routes, 20 distinct HTML and 17 CSS paths, 4/4 malformed routes rejected (actual GitHub helper in isolated V8); six static navigation cases (6/6 in isolated V8 with mock filesystem); **no full Node suite** because there is no real local Git checkout. Existing GitHub Actions are not configured to run on `feature/stage3-design-factory`; no workflow changes/PR/deploy were performed.
- Formal D7 gates **unchanged**: real 9-suite Node audit, Chromium `file://` Studio E2E, full 54 screenshots, human approval of all 42 showcase compositions, 6 real PHP Lead parity probes and source-exact ZIP + SHA256 are still needed. `file://` browser navigation remains blocked by runtime administration policy. **D7 OPEN · Stage2 NO-GO · Stage3 UNACCEPTED · 0/135 formally accepted · approximate engineering 6/7 (86%).**


## 27.10.2026 — D7 two substantial follow-on workstreams: diagnostic capture + release pipeline correctness

**New functional commits:** `8d3f3dff9a825d1501e97e16a1b765d58b4781c2` (Chromium static in-memory screenshot diagnostic and provenance gate) and `2f5aff89fb76a4c8eb2e11ab7c42ace8c334c02d` (nine-suite release-candidate smoke, audit consistency and diagnostic-only Chromium regression mode). Read current GitHub branch HEAD after this docs commit. Own branch `feature/stage3-design-factory`, own path `stage3/design-factory/`; **no merge / main / SDK / PHP / workflows / Hostinger edits**.

**Workstream 1 completed in source:** a strict, explicit `--static-in-memory` option for `bin/visual-qa.cjs` uses the real headless Chromium CDP process and an in-memory HTML document with exactly one bounded local CSS file. It rejects script/iframe/object/media, external URLs/CSS imports and unexpected assets. The output manifest binds `captureTransport:'memory-static'` and `diagnosticOnly:true` into the evidence fingerprint. The 54-image review interface visibly labels this as **diagnostic**, disables final review receipt generation, and `lib/visual-review.cjs` refuses it for the formal D7 gate, even if the viewport matrix itself is complete. Ordinary file-URL mode remains the default and the only formal path.

**Workstream 2 completed in source:** corrected the previously definitely stale one-command candidate smoke (`tests/release-candidate-smoke.cjs`) from 8 suites/10 checks to **9 suites/11 checks** and added an exact ordered audit inventory assertion requiring `preview-matrix-smoke.cjs`. Updated audit description; strengthened visual-review regression to refuse memory-only evidence; added an explicit `DF_STATIC_DIAGNOSTIC_ONLY=1` visual pipe test path whose output marker **cannot** satisfy the formal `DESIGN_FACTORY_D7_VISUAL_PIPE PASS` gate. This prevents a simulated local navigation success. Useful commands on a real checkout:

```bash
DF_CHROMIUM_BIN=/usr/bin/chromium DF_STATIC_DIAGNOSTIC_ONLY=1 node stage3/design-factory/tests/visual-pipe-smoke.cjs
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-static-visual-diagnostics --static-in-memory
node stage3/design-factory/tests/release-candidate-smoke.cjs
```

**Actually executed, with exact limits:** syntax parsed 11 modified sources (five files then six files); **the exact GitHub version of `BrowserPipe.screenshotStatic` passed eight mocked-CDP/filesystem behavior cases** (accepted one bounded local CSS HTML and rejected script, external URL, imported CSS, missing/duplicate stylesheet, iframe, stylesheet-breaking markup). Separately, a **real Chromium 144 DevTools session** successfully ran `Page.setDocumentContent` and wrote a **390×844 PNG** from a synthetic local test document. This is proof the underlying in-memory browser route works in this environment, not proof of a real generated Design Factory page or 54 captures. `file://` navigation was independently confirmed blocked with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Local network to GitHub unavailable (both DNS and direct IP), and **no actual full Git checkout** exists. No full Node suite, source ZIP, Lead SDK/PHP parity, real site Chromium E2E, full 54 screenshot matrix, human 42-composition review or SHA256 candidate release was performed.

**Formal status unchanged:** D1–D6 implemented; engineering progress ≈86% (6/7); **D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135 accepted**. Next viable block is full checkout plus real 9-suite Node audit and source-exact ZIP, formal Chromium file navigation/Studio E2E, 54 real screenshots and human review of 42 compositions, and six real Lead PHP parity probes. Memory-only diagnostics cannot close any of these formal gates. Never claim D7 acceptance from isolated V8/Chromium synthetic evidence.



## 26.10.2026 — D7 acceptance blocker removal, latest live status

**Functional commits on this independent branch:** [`84638e0`](https://github.com/manufact-test/ai-site-cms/commit/84638e074290c847be6ad2cca2a3612b4bc84d8f) (release gate correctness) and [`180be8d`](https://github.com/manufact-test/ai-site-cms/commit/180be8d47b7e0ba134dc72bac131c9b01d6378a3) (Studio Chromium E2E migrated to shared CDP pipe). Read live branch HEAD before writing; this docs commit changes HEAD again.

**Concrete code changes:** `bin/release-candidate.cjs` now evaluates `readyForLeadReview` after Lead SDK snapshot cleanup and requires valid visual capture **and** review against current render source, stable original+snapshot Lead inputs, working PHP probe, Git and independent source-exact ZIP. Previously a rejected/stale visual evidence set could still have a separately valid receipt, and a late snapshot cleanup error could leave an earlier true readiness flag. Existing `tests/release-candidate-contract-smoke.cjs` now includes a positive gate case and ten explicit refusal variants. `lib/chromium-pipe.cjs` gained a read-only asynchronous local DOM probe; `tests/studio-smoke.cjs` uses one persistent Chromium CDP pipe instead of the `--dump-dom` subprocess (which timed out in this environment); `tests/visual-pipe-smoke.cjs` exercises the new method.

**Executed, strictly delimited:** GitHub exact modified source parsed as JavaScript (five files) in V8; isolated readiness conditions checked with passing case and stale-evidence/cleanup-failed negative cases. The execution container has Node 22.16.0, PHP and Chromium 144. A **real Chromium CDP Browser.getVersion handshake PASS**; a real Chromium `Page.setDocumentContent` asynchronous-DOM probe on `about:blank` **PASS**. However **file:// and data: navigation are blocked by this container's browser policy** with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. GitHub DNS is unavailable from the terminal, so **no genuine git checkout was obtained**. The new actual Studio E2E, actual 54 responsive PNG screenshots, Node release audit, real six Lead PHP parity probes and source-exact release ZIP/independent CRC/SHA256 **remain NOT RUN**; do not imply they passed.

**Decision unchanged:** D1–D6 implemented (engineering estimate 6/7 ≈86%). **D7 OPEN; Stage2 NO-GO; Stage3 UNACCEPTED; formal acceptance 0/135.** No merge, workflow/main/SDK/PHP/hosting/production modification. All edits are inside `stage3/design-factory/`. Run full existing audit/candidate tools on a real checkout with permitted local-file Chromium navigation, then collect and review 54 images and all 42 compositions, real PHP parity and ZIP. Until then no technical or owner signoff.



## 26.10.2026 — ФИНАЛЬНЫЙ ЧЕКПОИНТ ПЕРЕД ПЕРЕХОДОМ В НОВЫЙ ЧАТ

**Функциональный коммит:** `3650771898ad2ab81accaaaf803e90e169c7979a` — последний заход по D7. **Прочитать актуальный HEAD ветки через GitHub перед следующей записью**: отдельный коммит с этой документацией продвинет SHA. Ветка только `feature/stage3-design-factory`, менять можно **только** `stage3/design-factory/`. Главный чат/другие разработчики работают отдельно; никаких правок `main`, SDK, PHP, общих workflow, Hostinger/production и никакого merge.

**Что изменено последним функциональным заходом.** Дополнен обязательный крупный `tests/preview-matrix-smoke.cjs` (девятый Node suite, 11 audit checks без Chromium / 12 с Chromium). Он теперь проверяет не только **288/288** комбинаций 12 kits × 12 themes × RU/EN с одобрением владельца, их **1152** четырехстраничных offline HTML-страниц, **288** валидных client feedback и **288** реальных восьмифайловых ZIP32 с CRC, но также **288/288 неподтверждённых версий**, где `readyForPublish=false` и у всех CMS-страниц `robots=noindex`; **288/288 отказов повреждённых ZIP**; отклонение устаревших client-feedback документов при изменении контента; экранирование пользовательского `<script>`, амперсанда, кавычек и Unicode в 4 страницах; **84/84** сопоставления 42 композиций в двух языках и строгую валидацию Stage3 CMS. Точный обновлённый тест успешно прогнан в изолированном V8 с настоящими исходниками GitHub и эмулированными Node builtin; JS syntax PASS. Это **не** настоящий процесс Node из git checkout. Из предыдущих заходов: Studio/client/review восстановление из JSON защищено от конкурирующих асинхронных импортов; 9/9 соответствующих V8 поведенческих кейсов прошли; browser runtime `runtime.generated.js` побайтово совпал с выходом настоящего скрипта сборки, которому подставлены исходники GitHub.

**Текущий честный статус:** D1–D6 реализованы, 6 из 7 направлений (условная готовность ≈**86%**); **D7 OPEN**. Stage2 **NO-GO**, Stage3 **UNACCEPTED**, формальное принятие **0/135**. Полный Node release audit **NOT RUN** (в текущем терминале нет checkout, DNS для github.com не работает). Реальный Chromium E2E **NOT RUN** (простая локальная headless-проба ранее зависала); 54 PNG на 1280/768/390 **NOT CAPTURED**, все 42 композиции человеком **NOT REVIEWED**; Lead SDK + PHP **0/6** parity проб; настоящий source-exact release ZIP + independent CRC/byte-for-byte/SHA256 **NOT RUN**. Ни одна из этих ступеней не должна быть объявлена PASS по результатам V8.

**Следующий разработчик должен работать БОЛЬШИМИ законченными задачами, не дробить работу на мелочи и не повторять один и тот же тест бесконечно.** Первый большой блок: получить реальный Git checkout этой ветки в рабочем окружении; запустить существующий Node аудит и реальный Chromium, исправив выявленные реальные проблемы целиком. После этого получить 54 PNG и человеческую приёмку/замечания 42 композиций; закрыть реальные шесть PHP проверок с предоставленным Lead SDK/DesignGraph.php и собрать/проверить source-exact ZIP. Если локальный checkout невозможен, **продолжать самостоятельно кодовую работу через GitHub connector**, а не прекращать разработку и не требовать от владельца вручную передавать весь ZIP. Не подменять отсутствующую проверку фальшивым PASS.

**Рабочий порядок (пути вывода вне репозитория; имена должны быть новыми):**
```bash
git switch feature/stage3-design-factory
node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-d7-node-audit.json
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/release-audit.cjs --chromium --out /tmp/df-d7-browser-audit.json
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-d7-visual
# Открыть /tmp/df-d7-visual/visual-review.html, реально оценить все 54 скриншота и D3 showcase,
# сохранить подтверждённый файл review receipt; без реального просмотра не создавать фиктивный.
node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-d7-candidate --chromium /usr/bin/chromium --lead-sdk /REAL/LEAD/sdk --lead-php /REAL/LEAD/DesignGraph.php --evidence /tmp/df-d7-visual --review /REAL/visual-review-decision.json
```
Важно: Node-only audit **специально может возвращать exit 3**, даже когда Node checks прошли, поскольку Chromium не запускался. Смотреть содержимое JSON. Если других рабочих Node/PHP/Chromium инструментов нет, проверять их наличие прежде, чем снова пытаться тот же сломанный DNS. `release-candidate` не выдаёт production approval: даже `readyForLeadReview` означает только техническую передачу главному интегратору после доказательств, не merge и не публикацию.

**ПЕРЕДАЧА:** главный разработчик — отдельный чат и единственный интегратор. Мы лишь передаём готовую ветку, evidence и D6 `manufact-ai-site-v1`/bridge, а не меняем его файлы. Подробные технические условия: `MISSION.md`, `ROADMAP.md`, `QUALITY-GATES.md`, `INTEGRATION.md`, `handoffs/NEXT-CHAT.md`. Этот раздел стоит сверху как актуальный чекпоинт, более старые датированные записи ниже — история, а не текущее состояние.


## 26 October 2026 — comprehensive D7 runtime / static preview QA gate

**Full original GitHub source executed in isolated V8:** 12 industry kits × 12 themes × two languages = **288/288 valid CMS variants**; their **1,152/1,152 linked four-page static HTML previews** have correct relative styles/navigation and remain noindex even with owner-approved facts; **288/288 client-feedback snapshot round trips** and **288/288 real eight-member ZIP32 archives** built, CRC inspected, with no external URLs; **84/84** 42-composition × RU/EN CMS adapter insertions validated and inspected against registered component manifests. Separately the **exact existing** `bin/build-browser-bundle.cjs` read first-party GitHub sources+eight component manifests in a V8-mocked Node filesystem and confirmed exact bytes of `studio/runtime.generated.js`, no source drift.

**Committed D7 integration:** added `tests/preview-matrix-smoke.cjs` with the complete interconnected project → four pages → client feedback → deterministic ZIP → 42-composition adapter workflow. The release audit and candidate now require this as the ninth Node suite; exact audit schema checks updated to 11 total checks without Chromium, 12 with. This new on-disk Node CLI has been syntax-parsed, but **not yet run in a real git checkout**. Separate isolated V8 source-equivalent matrix is factual evidence, not a real Node run.

**Unchanged formal blockers:** real Node audit NOT RUN (checkout GitHub DNS failure); real Chromium E2E and 54 screenshot matrix NOT RUN (headless startup timed out); 42 compositions not human-reviewed; six real PHP parity probes NOT RUN; actual final source ZIP/CRC/byte-by-byte SHA256 NOT RUN. D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135. No release authorization, deployment, hosting action or merge. Implementation coverage stays D1–D6 = 6/7 ≈86%.


## 26 October 2026 — D7 large closeout block: review/import consistency + Node audit blockers

**Functional commit:** `3ead7d1d2d75b58f6146aedb3bbaac93af82e035` (documentation commit follows). Completed one linked hardening block across five owned files: Studio file imports, static client feedback portal, manual visual-review draft restoration, and both existing smoke suites. No CMS/Lead/PHP/workflow/hosting/production changes or merge.

**Actual defects fixed:** two `tests/studio-smoke.cjs` assertions still searched for pre-fix source strings and would fail the real Node release audit regardless of actual behavior. Both now assert the actual fresh-context/validated-import guard. In Studio, separate monotonic request serials now ensure that the **last selected** project and feedback JSON wins even if earlier reads finish later or no intermediate state change occurs. The client `review.html` portal rejects delayed draft restoration after client notes/reviewer changes and rejects superseded parallel drafts. The `visual-review.html` UI rejects delayed drafts after a reviewer edits a verdict, note or attestation, and rejects superseded parallel drafts. Valid drafts still restore, with all manual attestations reset. All outputs remain offline and untrusted suggestions, not owner approval or publication.

**Checks actually executed:** 6/6 V8 source/embedded-script syntax checks; 4/4 Studio asynchronous-import V8 behavior scenarios using committed function bodies; 3/3 client portal behavioral scenarios using the real generated inline script and simulated DOM; 2/2 visual-review behavioral scenarios using the committed inline script and simulated DOM. Total **9/9 focused behavior scenarios PASS**, plus 29 current Studio source-string expectations checked against actual committed source with **0 mismatches**. These are isolated V8 tests with simulated DOM, **not** a complete on-disk Node audit or real Chromium run. Existing on-checkout Node tests have been updated, but not executed.

**Formal D7 evidence still absent:** Node release-audit NOT RUN due to GitHub DNS checkout blocker; genuine Chromium Studio/client flow NOT RUN (previous headless probe timed out); 54 real desktop/tablet/mobile screenshots NOT CAPTURED; 42 compositions have no human acceptance; six real PHP probes NOT RUN; final ZIP/CRC/exact source inventory/SHA256 NOT RUN. **D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135**. D1–D6 implementation roadmap remains 6/7 ≈ 86%; no invented progress increase. Next remaining work is *execution and human review* in a working checkout, not further micro-hardening.


## 26 October 2026 — substantive D7 safety fix: no stale async JSON imports

**Source commit:** `4bf19ac4a3a62e9136e2b55fc9a815321a1eebcc` on `feature/stage3-design-factory`. Two real product/test files changed exclusively under this subtree: `studio/studio.js` and `tests/studio-smoke.cjs`.

**Problem fixed:** `importFile()` and `importFeedback()` awaited `File.text()` before applying a JSON document, while the owner could edit the project, undo/redo, finish another import or resolve feedback. A delayed earlier read could overwrite newer changes or feedback decisions. Studio now maintains monotonic project and feedback revisions (including immediate input edits before blur, history and Undo/Redo), rechecks the active compiled feedback context after each asynchronous read, and refuses stale imports with a visible retry message. Normal unchanged-context imports remain available.

**Checks genuinely executed:** V8 syntax parsing PASS for both real committed JS files and for the fully assembled Chromium probe script. An isolated V8 harness executing the **actual committed import function bodies** with mocked browser/compiler state passed **5/5** cases: stale project import refused, normal project import accepted, stale feedback after owner edit refused, stale feedback after resolution refused, normal feedback accepted. Two corresponding real-browser regression paths are authored in the existing `tests/studio-smoke.cjs`, but **not run under Chromium**. This is source-level evidence, not an actual checkout Node audit or genuine browser acceptance.

**Gate unchanged:** D1–D6 implemented (6/7 ≈ 86%); D7 OPEN. Checkout Node audit NOT RUN, actual Chromium E2E NOT RUN, 54 responsive PNGs / human 42-composition review NOT RUN, PHP parity 0/6, release ZIP/CRC/source parity/SHA256 NOT RUN. Stage2 NO-GO, Stage3 UNACCEPTED, 0/135. No merge, hosting, production, SDK, PHP or workflow edits.


## 26 October 2026 — current executor result: D7 still blocked by checkout DNS

**Branch HEAD:** `62c4ab22ff65c79d7e4194ca73680de3b2fa61d0` (confirmed live). One real `git ls-remote` attempt failed with `Could not resolve host: github.com`; this executor cannot obtain the checkout required by the release scripts. GitHub API reports **0 Actions runs, 0 check runs and 0 commit statuses** at this SHA.

A read-only review of `bin/release-audit.cjs` confirmed the intended gate: 10 checks without Chromium (bundle parity + eight Node suites + source-inventory stability), 11 with Chromium. The Chromium path requires `DF_CHROMIUM_BIN`. Node-only exit code 3 can mean the Node suites passed while Chromium remains unrequested; it is not full acceptance. PHP parity, real screenshot capture/review and release ZIP verification are outside the Node-only audit and must be evidenced separately.

**Local runtime diagnostics:** Node `v22.16.0`, `/usr/bin/chromium`, and PHP `8.4.24` are installed, but a search of common workspace locations found no local `.git` checkout. One minimal Chromium smoke probe (`--headless --dump-dom` on a data URL) timed out after 15 seconds (exit 124), produced no DOM output, and logged DBus/zygote errors. This is an environment probe, not a Design Factory product test. Do not repeat this same probe until the execution environment changes.

**No false PASS recorded:** real checked-out Node release audit **NOT RUN**; actual Chromium Studio/client portal E2E **NOT RUN**; 54 real PNGs and human review of all 42 compositions **NOT RUN**; PHP parity **0 probes / NOT RUN**; source-exact release ZIP, CRC verification and actual SHA256 **NOT RUN**. No product source was changed in this pass; only D7 documentation records the blocker and the next valid execution sequence.

**Status unchanged:** D1–D6 implemented; engineering roadmap 6/7 (about 86%); D7 OPEN; Stage2 NO-GO; Stage3 UNACCEPTED; 0/135 formal criteria. Do not retry the same DNS failure until the execution environment changes.


## 26 October 2026 — final engineering pass before D7 acceptance

**Functional checkpoint:** `0c00c5deb97d28827af571eb92ef7d1efd481523`. The client-feedback loop now has a critical stale-state race fix: `studio/studio.js` computes the feedback snapshot from a fresh `compileCurrent()` for every import/export/resolve action, not from the debounced `state.lastCompiled`. If the owner edits a fact and immediately clicks export before the 120ms preview debounce finishes, the old client report is rejected instead of being exported against an outdated render.

The existing `tests/studio-smoke.cjs` now has a real Chromium E2E path for the entire eight-file HTML demo review flow: read `review.html` out of the generated STORE ZIP, execute it in a browser iframe, add/download/restore customer feedback, import the JSON into Studio, navigate to the cited page, resolve the note, export progress, and assert that export is refused immediately after an edit during the preview debounce and remains stale after render. Test source and both changed JS files passed V8 syntax parsing.

**What actually ran in this pass:** V8 source parse for actual current-branch Studio/feedback/ZIP/smoke files; source-level context mismatch rejection; built and CRC-inspected an eight-member preview ZIP; deliberate ZIP corruption rejected. This is isolated V8, not the checked-out Node release audit or a real Chromium E2E. A one-time real checkout attempt still failed DNS resolution for `github.com`; a one-time minimal Chromium headless data-URL probe timed out. Do not repeat the same environment retries and do not claim browser/Node acceptance.

**Engineering progress:** D1–D6 implemented, D7 remains the final acceptance/release gate: **6/7 ≈ 86% of the Design Factory engineering roadmap**; roughly 14% remains, concentrated in actual execution, visual review, parity and package proof. This is not a formal Stage3 acceptance percentage. **D7 OPEN; Stage2 NO-GO; Stage3 UNACCEPTED; 0/135.** The independent branch scope remains only `stage3/design-factory/`; no workflow, SDK, PHP, main CMS, production or hosting changes, no merge.

Next: on a real checkout run the documented release audit once; if environment allows run the real Studio/client review Chromium E2E, capture all 54 1280/768/390 screenshots and have a human review all 42 compositions, run six real Lead PHP parity probes, then generate and independently verify a source-exact ZIP/SHA256. Keep all missing evidence explicitly open.


## Latest major engineering block — 26 October · client feedback round-trip

**26 October 2026 — functional checkpoint `30e7e97cefe80fb32e5b4c5a1d20e01dd5924861`** (subsequent docs commit advances HEAD; fetch live branch SHA).

Completed a connected client-feedback loop in actual offline Design Factory Studio, instead of another narrow audit: Studio's **HTML-демо ZIP** now contains an eighth file, **`review.html`**, a self-contained, no-network Russian client review portal with working links to all four generated pages. The customer can add up to 30 page-tagged notes (change / issue / question, 900 characters each), remove them, download a JSON report, and later restore their own JSON to continue. The Studio inspector now includes section **05 / Замечания клиента**: import client JSON, view each note safely via textContent, open its page, mark or unmark it as resolved, and export the updated progress JSON. No browser storage, server API, CMS state edit or publication request.

The first-party `studio/client-feedback.js` is shared between portal generation and Studio validation. Reports use the closed **`manufact-design-factory-client-feedback-v1`** schema. A non-cryptographic, explicit **site-snapshot correlation key** is computed from the four compiled pages, actual selected theme, kit, locale and D3 composition. Studio refuses reports for other or changed snapshots; modifying content/theme does not silently migrate notes. The key is for matching only: it is **NOT a security signature, authenticated client identity, owner acceptance, signoff or publish permission**. Notes and resolution flags are untrusted suggestions; no guest input is executed as code. The external ZIP portal is static HTML/CSS and an inline trusted first-party script with restrictive CSP, no tracking, no CDN, no network. `studio/preview-zip.js` now canonically packages **8** files, validates all ZIP32 metadata and CRC before download, and retains safe size bounds and `robots=noindex`.

**Verification executed:** V8 JavaScript source syntax PASS. Isolated execution of the actual GitHub client portal JS with mocked DOM: add a note, download the real feedback JSON, restore it and check 8-file ZIP/CRC PASS. A separate isolated execution of actual GitHub Studio + feedback/packer modules with mocked compiler/DOM: generate 8-member archive, import valid feedback, render inbox, navigate to Services, mark resolved, export resolved report, change selected theme, and refuse stale feedback workflow PASS. Actual checkout **not available** (DNS `github.com` still fails from executor); full Node audit, actual Chromium live browser, 54-image human-reviewed matrix, Lead/PHP parity (0 probes), and full source-exact release candidate ZIP/SHA256 **NOT RUN**. This engineering milestone does NOT modify formal status: **D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135**. Scope strictly `stage3/design-factory/`; no main/SDK/PHP/workflows/hosting/production edits and no merge.


## 26 October 2026 — new substantive D7 user workflow: HTML prototype ZIP

**Functional HEAD:** `509a00fb937c0a14443c81b65daa22cffacb2d02` (documentation commit comes afterward; read live branch HEAD on entry). Added a genuine one-click **HTML-демо ZIP** button to the offline Design Factory Studio. It packages four interconnected CMS-validated *preview* pages (`index.html`, `services/index.html`, `approach/index.html`, `contact/index.html`), `assets/preview.css`, bilingual `README.txt` and a strict `preview-info.json` (7 files total). Pages come from the current owner facts, selected theme and composition fallback via the existing first-party preview renderer; links and relative CSS paths remain local. All pages deliberately retain `robots=noindex`, including after owner review. This is **not** the PHP CMS visitor renderer, form collector, publishing, or owner authorization.

New self-contained `studio/preview-zip.js` writes **deterministic STORE-method ZIP32** entirely in the browser, with canonical allowlisted file paths, UTF-8 encoding, exact bounds (2 MiB per file / 8 MiB total), CRC32, local/central-directory parity and a built-in independent read-only archive inspector. Studio checks the ZIP before download. No CDN, network request, filesystem access or third-party package. `tests/studio-smoke.cjs` now contains real Node ZIP contract assertions and an optional Chromium export step, but these are *authored, not run on a checkout*.

**Executed focused evidence:** actual GitHub source parsed in V8; isolated same-module ZIP builder/inspector PASS including corruption rejection; ZIP fixture generated from the GitHub module was independently extracted using standard Python `zipfile` (7 readable entries, CRC error `None`, RU/Unicode content intact). A separate V8 simulation executed the actual GitHub `studio.js` and ZIP module with a mocked DOM/compiler: real click downloaded ZIP, validated all 7 members, and left owner project unchanged. This does NOT establish actual CMS content generation in a genuine checked-out repo, Chromium GUI or production acceptance. A one-shot checkout probe still failed due to `Could not resolve host: github.com`. Full Node release audit, Chromium E2E/54 real screenshots and human review, Lead PHP parity (0 probes), and full Design Factory release ZIP/source SHA256 remain **NOT RUN**. **D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135**. Git scope restricted to `stage3/design-factory/`, no merge or out-of-scope edits.


## Latest substantive D5/D7 functional result — 26 October

Functional checkpoint: ea4b4751d67bdaf0a8fac62d1c9b6058257a3b3c. Studio now has three connected capabilities: (1) live side-by-side previews of two different theme directions on the same owner data, page and device width; (2) explicit adoption of the compared theme through validated project mutation, undo/redo and automatic owner-review revocation, with prior theme retained as reference; (3) an overview of all four actual current-site pages in separate sandboxed 390px mobile iframes, each opening directly in the regular viewer. Full-screen focused workspace makes side-by-side comparisons useful; presentation-only actions never mutate project, site-v1 JSON, or D6 export. Alternate compilation clones the project. Existing local CSS/CSP, safe iframe sandbox and allowlisted page navigation are preserved. No Lead SDK/PHP/main/production changes.

Verification: modified JavaScript and authored smoke syntax parse in isolated V8 PASS; actual Studio JS with mocked DOM/compiler successfully exercised theme comparison, alternate selection, Apply/Undo/Redo, owner-review reset and four distinct pages + navigation. NOT a real Chromium or checked-out Node run. Fresh checkout retry: github.com DNS resolution failed. Full release audit, optional Lead PHP parity (0 probes), 54 actual PNG/human signoff and real ZIP/CRC/SHA256 remain NOT RUN. D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135.


## Latest D7 integrity result — 26 October 2026

**26 October 2026 · D7 PNG integrity functional checkpoint:** `7810e6bee98b4a6d5509bf02a52024edc52ea843`.

Found and closed a genuine technical-evidence gap: prior screenshot capture/review only checked PNG signature and IHDR width/height. A truncated, tampered or internally corrupt PNG could have been blessed by a self-consistent report SHA256 and dimensions. New `lib/png-integrity.cjs` validates the **full PNG byte stream**: bounded input/chunk/pixel budget, critical chunk ordering, IHDR encoding and dimensions, per-chunk CRC32, contiguous IDAT, complete IEND/no trailing bytes, bounded zlib inflation, exact filtered scanline lengths (including Adam7 passes), and filter values 0–4. The verifier fails closed for corruption rather than relying on metadata. Integrated into `bin/visual-qa.cjs` (real capture before writing evidence), `lib/visual-review.cjs` (every original PNG byte re-checked at receipt verification), and Chromium pipe smoke. Regression cases in `tests/visual-review-smoke.cjs` now mutate the PNG while consistently updating its hash and evidence manifest; bad CRC, truncated bytes, trailing bytes, bad compressed data and invalid scanline filters must still be refused.

**Verification boundary:** same SHA256 Git blob as isolated Node v22.16.0 module checked with `git hash-object`; an independent real Node test of that **exact module** passed valid RGB/RGBA screenshots and rejects for truncation, incorrect CRC, trailing bytes, malformed zlib, invalid scanline filters and IHDR-only forgery. V8 JavaScript syntax parsing of five changed modules/smokes PASS. These focused checks are **not** a complete checked-out Node release audit or actual Chromium run; the repository checkout remains unavailable in the previous executor (GitHub DNS failure). Added smoke assertions have **not** run in genuine checkout. Real 54 PNGs / human review: NOT RUN; PHP parity: 0 probes; release ZIP/CRC/source-byte parity and actual archive SHA256: NOT RUN. D7 OPEN, Stage2 NO-GO, Stage3 unaccepted, 0/135. No CI/workflow/Lead/main/hosting/production edits or merge.


## Latest engineering result — resumable visual review

**26 October 2026 · latest functional checkpoint:** `69556a19b887f4dae2ec32328fc2ae487dbaa3fe` (read live branch HEAD on arrival). The offline D7 `visual-review.html` has a substantial usability upgrade: all/pending/approved/rejected image filters, next-pending navigation, private work-in-progress JSON draft export/import, and defect export with diagnostic notes. Draft import checks the complete list of 54 screenshot file names and SHA256 values plus the visual evidence hash, rejects duplicates/foreign/stale/oversized JSON (256 KiB maximum) before changing any decisions, and **always clears the five manual-review attestations** after restoring. It preserves the original v2 review receipt and fail-closed verifier; neither draft nor defect report is approval, identity authentication or publish authorization. No network/browser storage is used by the tool.

**Executed, narrowly:** V8 parsed the inline script; a simulated 54-card browser DOM exercised the filter, rejected-note defect gate, draft export, valid restore, manual-check reset, and stale-evidence rejection without partial mutation. The existing smoke source contains regression assertions but **the real checked-out Node suite has NOT run**. One fresh `git ls-remote` returned `Could not resolve host: github.com`; checkout unavailable. PHP parity: 0 probes; Chromium E2E: NOT RUN; 54 real PNGs + human review: NOT RUN; actual ZIP/CRC/source-byte/SHA256: NOT RUN. **D7 OPEN, Stage2 NO-GO, Stage3 unaccepted, 0/135**. No edits outside `stage3/design-factory/` and no merge.


**Updated:** 26 October 2026  
**Branch:** `feature/stage3-design-factory`  
**Writable scope:** ONLY `stage3/design-factory/`. No main/lead edits, hosting, production, workflows, SDK, PHP or Studio-main changes.

## Latest D7 release-candidate hardening — 26 October 2026

**Current functional/source checkpoint:** `6150e9c323f801acaba0d6bc6c3d7a7664143601`. Always read live HEAD before continuing. This is an engineering checkpoint, not a release certificate.

- Preserved visual-review receipt **v2**: the reviewer must inspect all 42 D3 compositions and confirm the fifth `showcaseCoverage` check. Old v1 receipts are rejected.
- `lib/source-manifest.cjs` covers every packaged source file, including `handoffs/`. The audit compares the exact starting/ending inventory; the candidate rejects added, removed or modified bytes between audit and packaging.
- Audit report semantics are v2 and validate the exact ordered check list, source manifest/digest and summary flags. A well-formed report with failed checks remains a valid failure report; ordinary test failure is not mislabeled as source drift.
- **External Lead-input provenance:** `lib/external-input-manifest.cjs` fingerprints every regular file in the optional Lead SDK directory and the supplied PHP `DesignGraph.php` file. It records canonical paths, file counts/sizes and SHA256 hashes; rejects symlinked roots/files, hidden/unapproved entries, special files, oversized inputs and missing SDK runtime entry points.
- **Bounded Lead SDK traversal** (`8417f387e3e72bcd18987968e186ec36ebc525c5`): the manifest caps traversal at 1,024 filesystem entries and 32 directory levels, including empty directories. Directory inventories are checked before/after traversal. Contract smoke includes directory-flood and excessive-depth cases.
- **New: sealed external-input snapshot.** Before Lead compatibility runs, `createExternalInputSnapshot()` copies the exact manifest-bound SDK and optional PHP file into a private temporary directory. It verifies every copied file against the baseline, then makes the copied files/directories read-only. The Lead test environment now consumes this isolated snapshot rather than the mutable external checkout.
- The candidate compares the original checkout after snapshot creation, after the compatibility test and at candidate end. It also re-fingerprints the isolated snapshot after the test and at candidate end. Any mismatch, invalid snapshot, or cleanup failure fails closed; the final `leadInputs.stable` flag includes both original and snapshot state, and cleanup failure sets it false. Temporary snapshot cleanup happens before the report is written. The report records original/snapshot manifests and stability states under `leadInputs`. SHA256 is provenance evidence, not an authenticated signature.
- Contract smoke now covers exact snapshot content, read-only file permissions, detection of external-checkout drift while the isolated copy remains unchanged, candidate wiring, bounded traversal and directory floods. The tests were authored and syntax-checked but have **not** been run in a full checked-out Node process.
- `bin/verify-release-zip.cjs` enforces the builder's canonical ZIP32 metadata: version fields, DOS timestamp, disk number, internal/external attributes and matching local/central headers. `tests/package-smoke.cjs` mutates those fields to confirm rejection.
- The release audit performs browser-bundle parity plus **eight Node smoke suites** and a final source-inventory stability check: 10 checks without Chromium, 11 with Chromium. The candidate builds an engineering ZIP and independently verifies ZIP32 structure, CRC32, sorted complete inventory, exact source bytes and SHA256.

### Commands on a genuine checkout

```bash
node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-release-candidate
node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-release-full --chromium /usr/bin/chromium --lead-sdk /path/to/lead/stage3/sdk --lead-php /path/to/lead/stage3/server/DesignGraph.php
```

Use a new output directory for each run. The full command must verify six real PHP markup-parity probes; this is not responsive pixel parity. A human must still review all 54 images at 1280/768/390 and all 42 D3 compositions. Exit 3 means an engineering package exists with acceptance gates open; exit 0 is not production authorization.

**Verification boundary for `6150e9c323f801acaba0d6bc6c3d7a7664143601`:** static V8 syntax parsing **PASS** for the three changed JavaScript files (`external-input-manifest.cjs`, `release-candidate.cjs`, `release-candidate-contract-smoke.cjs`). The contract test includes snapshot/drift assertions, but it has **NOT RUN**. Full Node audit/candidate smoke, Chromium Studio E2E, actual 54-image capture/review, Lead PHP parity and real ZIP/hash remain **NOT RUN**. GitHub API reports **0 Actions runs, 0 check runs and 0 commit statuses** for this source checkpoint. The last genuine checkout attempt failed because `github.com` DNS could not be resolved; do not repeat until the environment changes. This is not a full test pass.

**Decision unchanged:** D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; **0/135** mandatory criteria. Do not modify workflows, merge, or infer acceptance from authored tests.

## Latest source hardening — 25 October 2026

**Functional/source checkpoint:** `39624c82fc7953c9afaa07452053f3acec6cd86a`. This commit changes only `stage3/design-factory/bin/build-browser-bundle.cjs` and `stage3/design-factory/tests/studio-smoke.cjs`.

- Fixed an output-boundary defect in the browser bundle builder: it previously wrote directly to `studio/runtime.generated.js`, which could follow an accidental final symlink or truncate a hard-linked external file.
- The builder now canonicalizes the repository root, rejects symlinked `stage3/`, `stage3/design-factory/` and `studio/` directories, rejects a symlink/non-regular final target, and writes to a same-directory temporary file before renaming it into place. The rename also replaces a hard-linked directory entry without modifying the other hard link.
- Added an isolated regression fixture to `tests/studio-smoke.cjs`: symlink rejection in build and check modes, creating a missing target, and safe replacement of a hard-linked target.
- Isolated V8 syntax parsing of both changed JavaScript files **PASSed**; a focused Node filesystem primitive probe **PASSed**: atomic rename left an external hard-link inode unchanged and `lstat` identified a symlink. These checks do not execute the Design Factory modules or suite; the changed test suite has **NOT** run in a genuine checkout.
- A fresh `git ls-remote` attempt still fails with `Could not resolve host: github.com`. Branch Actions runs remain 0. Do not claim Node/Studio/ZIP/PHP release acceptance from this source-level change.

**Release decision unchanged:** D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135 mandatory criteria. No merge or out-of-scope changes.

## Previous environment and D7 release audit — 25 October 2026

**Audit-start branch HEAD:** `bb219d64a58d590fbf2f806835e996a4277aee7d`. This was a documentation-only commit whose parent and latest functional/source checkpoint is `75884b7f794fa1dabc775d802613c38979eff4b8`. GitHub compare confirms that the single commit between those SHAs changed exactly six documentation files, all under `stage3/design-factory/`. No functional source was changed in this audit.

### Block 1 — genuine checkout, Node audit and existing CI

- Attempted `git ls-remote https://github.com/manufact-test/ai-site-cms.git refs/heads/feature/stage3-design-factory` in the execution container. Exact failure: `fatal: unable to access 'https://github.com/manufact-test/ai-site-cms.git/': Could not resolve host: github.com`.
- Node.js `v22.16.0` is installed, but no checkout is available in the workspace. The eight stable D7 suites plus bundle parity and the optional Lead suite were **not run** against a real checkout.
- GitHub API re-check: branch workflow-runs `total_count=0`; HEAD check-runs `total_count=0`; commit statuses array empty. Do not change workflows to manufacture CI evidence.

### Block 2 — PHP parity and browser acceptance

- PHP CLI `8.4.24` is installed, but PHP parity remains **NOT RUN (0 probes)** because the real repository/Lead SDK and server source are not present in the execution environment. Runtime availability alone is not parity evidence.
- `/usr/bin/chromium` exists, but a one-shot minimal headless data-URL probe timed out: `timeout 15s` ended with exit code `124` after DBus connection warnings. Therefore Studio E2E was not run and **zero** real screenshots were captured. No human visual review exists.

### Block 3 — release archive

- No source-byte-identical release ZIP was built. Without a real checkout, the package builder and extraction/source-byte comparison cannot be executed honestly.
- CRC/central-directory validation, complete source-byte parity, and the real archive SHA256 are **NOT RUN / NOT AVAILABLE**. Do not invent an artifact or checksum.

**Decision:** all three D7 closure blocks remain blocked by the current environment. D7 **OPEN**; Stage2 **NO-GO**; Stage3 unaccepted; **0/135** mandatory CMS criteria accepted. The next developer should make at most one fresh environment/checkout attempt if connectivity or the execution environment has materially changed; otherwise retain these blockers and do not loop on retries. No workflow, PHP, SDK, Studio-main, hosting, secrets, production, or out-of-scope files were changed.

## Previous functional checkpoint — 25 October 2026 · output safety and visual evidence matrix

Audit-start live HEAD: `bb219d64a58d590fbf2f806835e996a4277aee7d` (documentation-only commit); its parent `75884b7f794fa1dabc775d802613c38979eff4b8` remains the latest functional/source checkpoint. The functional checkpoint is 12 commits ahead of `82b9f7aab5adbb0c0950e7be951aa9ff9beb9369`; the following docs-only commit changed six files, all inside `stage3/design-factory/`.

### Substantial code work since the previous functional checkpoint

- `d70e75e3d495e7f809e0dfe5de84173bd528326d`: preserved keyboard focus after kit/theme/page selection; updated the workbench subtitle; made editor state application transactional; debounced live preview by 120 ms; hardened deterministic packaging and source digest boundaries.
- `9f85e0139caced2cedf2603d98549f329c8208c0`: introduced `lib/output-path.cjs` and reused its canonical path guard for release ZIP, audit report and visual evidence output. Output must stay outside the repository, including through symlinked parents.
- `cc0aefd71ce016bbfe4a882bd2e4bb929a67fca0`: switched local screenshot URLs to `pathToFileURL` (safe for spaces and `#`) and rejected final output-path symlinks.
- `75884b7f794fa1dabc775d802613c38979eff4b8`: made visual QA verify the exact evidence matrix before it can be marked complete. Full matrix = 54 screenshots; quick matrix = 30. Missing/unexpected paths, duplicates and viewport dimension mismatches now fail the matrix; smoke assertions were added for these cases.

### Verification boundary — do not overstate

- GitHub Actions currently shows no runs for this branch; the live HEAD has zero check runs and zero combined statuses. The new Node tests have **not** been run in a real checkout for this checkpoint.
- The last known checkout attempt failed at DNS resolution: `Could not resolve host: github.com`. Do not treat isolated V8 runs as a real Node process.
- The earlier isolated-source suite reported 504/504 validations/renders/no-op rebuilds/preflights, 8/8 component-family refreshes and 8 loss-aware regression groups. That is evidence for the optional graph adapter source, **not** proof that the newly changed release/output/visual-QA tools pass.
- PHP parity: 0 probes. Chromium previously timed out even on a minimal page; no actual screenshot matrix or human visual acceptance exists. No release ZIP, CRC/source-byte parity result or real archive SHA256 has been produced.

**Gate remains OPEN:** Stage2 NO-GO, Stage3 unaccepted, 0/135 mandatory criteria. Next, in order: (1) obtain one genuine Node checkout or verifiable existing CI result and run the eight-suite D7 audit plus bundle parity plus optional Lead suite if its source is available; (2) run PHP parity and capture/review the 54 real screenshots only if the environment works; (3) create a real source-byte-identical ZIP, verify archive structure/CRC/source bytes and calculate its actual SHA256. No repeated environment retry loops and no fabricated evidence.
## Product-level state (honest)

| Result | Engineering implementation | Still outstanding for full acceptance |
|---|---|---|
| **D1** — Compiler and CMS contract | Implemented; real SDK/manifests in read-only mode | Full Node checkout smoke/owner review |
| **D2** — 12 visual languages | Implemented, 12 responsive token systems | Chrome 1280/768/390 visual QA |
| **D3** — 42 section compositions | Implemented, 14 categories, real HTML/CSS showroom, actual SDK fallback | Chromium/keyboard/motion visual QA |
| **D4** — 12 four-page sector kits | Implemented, 12 RU + 4 EN demos, 64 pages, SHA256 catalog | Real filesystem smoke + portfolio review |
| **D5** — Browser Design Factory Studio | Implemented offline with edit/theme/navigation/import/export/undo/redo | Real interactive Chromium E2E and fixes |
| **D6** — Integration bridge | Implemented, deterministic versioned export/import with exact SDK | Real checked-out Node tests, lead PHP parity/import review |
| **D7** — Final verification and packaging | **Release tooling, ZIP builder, quality checklist and next-chat handoff implemented** | Execute full Node/Chromium checks, inspect screenshots, fix defects, approve package, final integrator handoff |

**Interpretation:** 6 out of 7 functional areas were already implemented before this pass. D7's operational tools are now built, but D7 is NOT accepted/completed. Do not convert a code coverage ratio into a misleading percentage of CMS acceptance. The platform remains **Stage2 NO-GO; Stage3+ unaccepted; 0/135 mandatory criteria**.

## Major D7 additions and concrete bug fixes in this pass

1. **D1 safety regression repaired.** With only one actual service, the CMS's second required repeater card is explicitly labeled as an unverified editorial example, and `checklist.readyForPublish` remains false. The old brittle D1 test now checks the meaningful two-card/owner-verification requirement, not a literal industry placeholder string.
2. `studio/runtime.generated.js` regenerated from current actual SDK/manifests and updated compiler. The same safety rule applies inside browser Studio.
3. `bin/release-audit.cjs` runs **six** real Node suites, hashes the complete Design Factory subtree and emits `manufact-design-factory-release-check-v1` (source file hashes, PASS/FAIL, explicit browser state). It keeps the gate open when Chromium is not run.
4. `bin/package-release.cjs` creates a deterministic offline **ZIP** with only Design Factory assets/source/docs, normalized paths, no symlinks, CRC32 and SHA256, no overwrite. `tests/package-smoke.cjs` checks reproducibility and archive integrity. The ZIP contains an offline Studio viewer; CLI execution requires the root CMS repo SDK/manifests.
5. `bin/visual-qa.cjs` generates screenshot evidence using local Chromium for 12 themes across three widths, D3 showroom and selected D4 kits. Output `visual-evidence.json` is NOT human visual approval.
6. `QUALITY-GATES.md` documents exact expected commands, three-width review, screenshots, quality issues and acceptance boundary.
7. `handoffs/NEXT-CHAT.md` is the authoritative first-file transfer for the **next independent developer chat**. The new chat continues D7 automatically on user instruction; does not become lead integrator and never merges itself.

## Verified and unverified — important distinction

**Observed in isolated JavaScript runtime in previous pass:** 288/288 kit × theme × language compiled and validated through the actual read-only Stage3 SDK, and 288/288 D6 deterministic integration bundle round trips; all 42 D3 registered fallback mappings were validated and malicious changed-package data was rejected. In this pass the single-service publish gate was evaluated using the regenerated browser bundle and returned `readyForPublish=false`, `missing=['facts.services']`, with the second card clearly marked as a placeholder.

**Not yet claimed:** Node filesystem/CLI test suite run on actual checkout; real Chromium UI E2E; visual review at 1280/768/390; GitHub Actions status for this branch; final packaging ZIP created and published to user; PHP renderer visual pixel parity; owner acceptance. The Chromium process did not complete even a minimal prior local attempt, so this is a genuine environment limitation until proven otherwise.

## Six essential commands (on a checkout, with Node >= 20)

```bash
node stage3/design-factory/bin/build-browser-bundle.cjs --check
node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-release-new.json
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/tests/studio-smoke.cjs
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-visual-new
node stage3/design-factory/bin/package-release.cjs /tmp/ai-site-cms-design-factory-new.zip
node stage3/design-factory/tests/package-smoke.cjs
```

See `QUALITY-GATES.md` for detailed expectations. All output paths must be NEW (never overwrite). No deployment is involved.

## Next chat — highest-priority D7 closure

1. Read `MISSION.md`, `ROADMAP.md`, this `PROGRESS.md`, `QUALITY-GATES.md` and `handoffs/NEXT-CHAT.md`; verify the LATEST branch SHA.
2. Run the actual Node tests and fix **real** failures. Do not iterate endlessly on cosmetics or rerun dozens of redundant suites.
3. Run real Chromium Studio E2E and the 3-width visual sweep. Visually inspect meaningful samples for overflow, navigation, keyboard focus, mobile, locale and unsupported CSS vs CMS output.
4. Produce the deterministic ZIP; record its actual SHA256 and Git SHA. Do **not** fabricate an upload/download link before the ZIP exists in the relevant environment.
5. When D1–D7 acceptance evidence actually passes, prepare the FINAL message to the lead chat. Until then, remain in the independent branch and never merge.

**Work cadence:** large useful blocks, precise factual reporting, no unnecessary laboratory loops, no new code outside `stage3/design-factory/`.

## D7 source audit checkpoint — 24 October 2026 (successor chat)

**Verified branch at start:** `0c55674c9024beb29ff919bf9404be997361a1e3`.
**Code checkpoint before this documentation:** `96f55a997e69a5fe1058c825d81526089845eb95`.
Read the current branch HEAD after documentation commits; these values are not promises about a later HEAD.

**Completed source-level fixes, solely in `stage3/design-factory/`:**

- `bin/release-audit.cjs`: distinguishes successful automated Node+Chromium checks (`automatedChecksPassed`) from **unapproved** human visual release acceptance (`humanVisualAcceptance:'pending'`, `releaseReady:false`). An exit code 0 with `--chromium` means automation passed, **not** that the product is ready for production.
- `bin/visual-qa.cjs`: reads actual PNG IHDR sizes rather than claiming that requested Chrome window sizes were achieved; records and fails viewport mismatches. Captures one English sector site and three additional internal mobile pages alongside the original theme, showroom and sector matrix.
- `studio/studio.js`: replaces an obsolete previously valid iframe preview with a static error state when current project compilation fails.
- `studio/studio.css`: improves the service delete button to a 44×44px touch target and keeps the service heading clear.

**Checks actually performed:** source files inspected through the linked GitHub connector; branch HEAD and compare verified; JavaScript syntax checked in an isolated V8 parser for modified `.cjs` and `.js` files. This is **NOT** equivalent to a checked-out Node runtime smoke test. GitHub compare confirmed all four code modifications are within the sole writable subtree.

**Environment blockers established:** Node v22.16.0 and `/usr/bin/chromium` are installed locally, but a `git ls-remote` for this public repository fails with `Could not resolve host: github.com`. A direct minimal Chromium headless `--dump-dom` probe was terminated after a 15-second timeout (exit 124, zero stdout), with DBus connection errors in stderr. No real repository checkout, Node test execution, browser interaction result, screenshot visual review, final ZIP artifact or ZIP SHA256 can be claimed from this session.

**Next D7 gate:** in a network-enabled checkout, run `build-browser-bundle --check`, `release-audit --out ... --chromium` with `DF_CHROMIUM_BIN`, `studio-smoke`, `visual-qa`, inspect screenshot dimensions/content and manually approve, then `package-release` + `package-smoke`. If Chromium cannot produce the requested 390px screenshots, correct the capture mechanism rather than mislabeling larger screenshots. Generate final ZIP SHA256 only after the actual package exists. Final handoff requires human visual and lead integration review.

**Progress:** D1–D6 engineered (6/7 independent deliverables); D7 remains **open**, not accepted. Full CMS acceptance remains **0/135, Stage2 NO-GO, Stage3 unaccepted**. No merge, deployment, or production mutation occurred.

### Follow-up: current-source contract matrix (same 24 October checkpoint)

Independently re-fetched the **current feature branch** sources for the official read-only `stage3/sdk/contract.cjs`, eight registered CMS component manifests, Design Factory compiler, themes, kits, compositions, adapter and D6 bridge. Executed them in a sandboxed, in-memory V8 module harness, with a read-only manifest filesystem substitute (not a Node checkout). Results: **288/288** industry × theme × RU/EN documents accepted by the real Stage3 `validateSite()`, four pages each, no `inspectSite()` link errors or incorrect `readyForPublish=true` with empty owner facts; **42/42** composition fallback mappings accepted by the real SDK; **12/12** representative EN kit+D3 D6 export/import cases passed; a mutated bundle was rejected. No production access.

**Scope of evidence:** verified source-level contract behavior; **NOT** `node tests/*.cjs` on actual filesystem, Chromium E2E, screenshot review, CI, or ZIP. These outstanding D7 gates remain mandatory.

## D7 next large engineering block — 24 October 2026

**Starting HEAD for this block:** `4015fd1fbbb31cbc3b74e0141e2c9edb68183807`. **Code checkpoint before this progress/handoff documentation:** `8525cc9fc56f759b8a983ec5ae7efc68ca2d0245`. Retrieve actual HEAD after this commit.

**Built and committed in `stage3/design-factory/` only:**

1. `lib/compiler.cjs`: eliminate false data-completeness from two Studio-created or example service placeholder rows. Reject blank/obvious generic service descriptions; `readyForPublish` still requires human owner review even when all fields are present. Added regression cases to `tests/smoke.cjs` and browser-runtime assertions to `tests/studio-smoke.cjs`.
2. `studio/studio.css`, `lib/preview.cjs`: 44px targets on actual Studio buttons/device selectors/page tabs and on site preview navigation, inline links and FAQ summary. Preserves original theme CSS and reduced-motion.
3. `studio/runtime.generated.js`: deterministically regenerated using the **unchanged exact first-party bundler** and current allowed SDK/manifests. Builder `--check` executed in a read-only mocked-filesystem V8 runner and matched exact current runtime bytes.
4. `tests/studio-smoke.cjs`: expanded real-Chromium test specification to click and inspect four browser downloads, checking real `site-v1` structure/SDK validation, versioned D6 bridge validation, source project title and workspace composition. Browser script syntax checked; the test was NOT executed in Chrome here.
5. `tests/package-smoke.cjs`: validate all ZIP central-directory file counts, names, offsets and CRC/size mirror of local headers, in addition to existing deterministic package and no-overwrite protections.
6. `README.md`: removed stale early-D1/D5 descriptions and included current, factual release constraints.

**Verified in isolated in-memory V8 using the latest GitHub branch sources:** 288/288 real SDK `validateSite` + internal route inspections, 288/288 first-party D6 export/validate/import round-trips, 42/42 registered composition fallbacks, unverified service examples remain missing, confirmed two-service draft can satisfy completeness but `requiresOwnerReview=true`, edited D6 export rejected, browser runtime rebuild parity PASS. Static parsing of the enhanced Chromium inline probe passed. This is not Node checkout execution.

**Blocked evidence:** `git ls-remote` cannot resolve github.com in the local checkout environment; Chromium `--dump-dom` on a minimal data URL timed out at 8 and 9 seconds in separate runs (also with `--no-zygote --single-process`). The GitHub Actions workflow-run list on this feature branch was empty. No Chromium E2E/screenshot approval, no seven Node-suite checkout execution, and no actual ZIP or verified ZIP SHA256. D7 remains **OPEN / NOT ACCEPTED**. The documented commands in `QUALITY-GATES.md` are required on a checkout with working Chromium.

**Status:** D1–D6 implementation complete (6 of 7 independent engineering results); D7 verification and packaging partially hardened but not accepted. **CMS: Stage2 NO-GO, Stage3 unaccepted, 0/135 formal acceptance criteria**. No main/lead branch, workflow, SDK, PHP, production, or hosting edits.

## D7 continued independent pass — 24 October 2026

**Starting HEAD:** `b7df7ddc0378814d14c984626af6b7cc42efb9ee`. **Code checkpoint before this documentation batch:** `2913e98cba216af4a5e0b08ef93f09d1af6dd348`. Review current HEAD after doc commits before any further work.

**Completed this pass, all inside allowed subtree:**

- **D6 semantic package equality** (`lib/bridge.cjs`): correctly ignores differences in JSON object member ordering after PHP/JS serialization; still rejects changes to values/types, array ordering, unexpected members and untrusted/non-JSON types. Recompiles the bundle through current SDK. Added negative+positive coverage to `tests/bridge-smoke.cjs` and rebuilt offline Browser Studio runtime.
- **ZIP source coverage** (`tests/package-smoke.cjs`): extracted ZIP members must match every first-party source file byte-for-byte, with matching inventory, not only ZIP CRC, central-directory structure and deterministic output. This improves the final package confidence once run on a checkout.
- **Human-friendly visual QA** (`bin/visual-qa.cjs`): also creates offline `visual-review.html` grouping screenshot variants across themes, D3 and D4 sectors. Includes real dimensions, visible errors, pending acceptance status and links to PNG originals. Synthetic HTML output/escaping was checked; real screenshot generation is still unavailable in the environment.
- **D6 integration contract documentation** (`INTEGRATION.md`) records exactly what remains supported vs `integration_required`, including PHP serializer interoperability.

**Verified with the current generated offline runtime in isolated V8:** 288/288 real SDK site-v1 checks, 288/288 D6 import/export round trips, 42/42 valid composition mappings, 0 broken internal links, semantic key-reordered bundle accepted, three changed/invalid bundles rejected. The generated visual review HTML was validated using **synthetic metadata only** (not genuine screenshots).

**Not verified:** checked-out Node CI, Chromium UI and 1280/768/390 visual acceptance, screenshot contents, actual ZIP/archive SHA256, PHP pixel parity, server import/publish gate. Local GitHub resolution fails, and headless Chrome does not complete a minimal DOM probe. No deployment, merge, workflow edit, main/lead branch change or external API usage.

**Status:** D1–D6 implemented (6/7 engineering areas), D7 **OPEN** due missing execution and human review. Formal CMS acceptance remains **Stage2 NO-GO / Stage3 unaccepted / 0 of 135**.

## 24 October — lead SDK compatibility milestone and D7 status

**Start SHA:** `555ede1caf8a367e0fd19dfd2bea222d9380e7bf`. Lead HEAD observed later: `a4d6aedff277752e015f52b383f080d0c3178f5a`. Always retrieve current feature HEAD before continuation.

New main-branch Design Graph v1 properties were discovered **read-only**: the lead SDK now allows optional `site.designTokens` and `section.designGraph`, PHP renders them through its separate DesignGraph renderer, and the lead Studio contains a typed design-node editor. Existing 288 original Design Factory site documents passed the lead validator. All code changes here remain strictly within `stage3/design-factory/`.

- `lib/lead-design-graph-adapter.cjs` built: standalone, explicitly selected D3 composition → typed host editor graph with responsive grid, editable headings/body/CTA, first-party theme tokens, hover/focus and truthful owner-review restrictions. It uses an externally injected **new** SDK, leaves the old D6 package alone and refuses unsupported SDKs.
- `tests/lead-design-graph-smoke.cjs`: optional checkout matrix for 42×12 editable graphs and lead host render, behind `DF_LEAD_SDK_DIR`; its real filesystem run remains unexecuted.
- `proposals/LEAD-DESIGN-GRAPH.md`: exact support/partial-fidelity table and safe handoff recipe for lead. Advanced preview art/scroll galleries/repeater cards/pixel parity stay `integration_required`.

**Observed in V8 with live GitHub sources:** 288/288 old site-v1 exports accepted by lead SDK; 504/504 new graph candidates and 504/504 scoped host JS graph renders passed, including the latest concurrently updated lead Graph module. Old SDK fails closed on new keys. These are isolated source-level compatibility results, NOT checked-out Node, PHP parity, browser or production acceptance. Xvfb+Chromium probe also timed out; GitHub cannot be resolved from the local checkout container. No real ZIP artifact/hashes or release readiness can be claimed.

**Engineering direction:** D1–D6 implemented and D7 compatibility/packaging checks hardened, but D7 **NOT ACCEPTED** pending real runtime + owner visual review. Official Stage2 NO-GO, Stage3 not accepted, **0/135**. No merge, no main/lead edits.

## 24 October 2026 — Host graph diversity, runtime acceptance pending

Since commit 4fad42505bf551da1d1a42018da73f45d709b977, the optional lead adapter has gained theme-specific editable typography, layout-specific grid/span/order, card treatments, decorative native icons, safe gradients, reduced-motion-aware motion and 48px button targets. The legacy D6 output and Browser Studio were left intact. The optional lead smoke test now checks 504 distinct graphs, manual JSON changes to headline/color/mobile layout/hover, and an optional PHP validator/markup-parity check when DF_LEAD_PHP_FILE and DF_LEAD_SDK_DIR are provided.

Verified in isolated V8 against current GitHub lead source: 288/288 original CMS sites and 504/504 new editable graph candidates and JS renders; all 504 graph variants distinct. Editing site JSON after generation visibly changed the rendered result. These are source-level checks, not full checkout, PHP or browser acceptance.

GitHub checkout remains blocked by local DNS, and headless Chromium still times out even on a minimal data URL. No real ZIP, SHA256, Node-suite PASS, PHP parity PASS or human visual approval. D7 OPEN. Formal Stage2 NO-GO, Stage3 unaccepted, 0/135.

## 24 October — semantic repeater completeness and explicit host reconciliation

**Start HEAD:** `4eb6f682be5507774aa740ee4b5d107a4ddb9983`. All writes are under `stage3/design-factory/` on independent feature branch, no main/lead/SDK/PHP/workflows/deploy changes.

Major code changes in `lib/lead-design-graph-adapter.cjs`: carry ALL first-party semantic repeater items into typed CMS graph for services (up to 12), FAQ and benefits rather than truncating to one card; empty galleries display explicit rights/upload prompt, never mock images. On optional host candidate only, replace placeholder services and hero copy with actual sanitized owner-provided facts. Return provenance `contentBindings` for each relevant graph heading, body, link or repeater item; original D6 validation/export remains immutable.

New opt-in `reconcileSemantic(candidate, editedSite, hostSdk, registry)`: on host-authorized explicit action only, copy latest registered fields to mapped graph text/links, preserving all independent graph styles; reject forged/missing mappings, graph type mismatches or link errors. No hidden auto-sync and no false claims that Graph and semantic fields are live-bound.

The expanded optional test checks 504 graph candidates, all 12 owner service cards and their bindings, verified hero content, FAQ item completeness, no fake gallery media, HTML escaping, post-generation field editing without losing graph styles and rejection of forged binding metadata. The isolated V8 run using actual GitHub source **PASS**: 504 current lead SDK validators/renders and expanded regressions, with PHP clearly SKIP. Actual checked-out Node, PHP, Chromium, human visual QA, final ZIP SHA256 remain unexecuted/blocked by environment. D7 OPEN; Stage2 NO-GO / Stage3 unaccepted / 0/135.

## Final chat checkpoint — 24 October 2026

Last functional block closed a **content-loss risk** in optional host CMS reconciliation. New `inspectSemanticSync()` previews proposed updates, independent graph-only edits, and collisions without mutating source. Updated `reconcileSemantic()` preserves graph-only edits when the CMS value did not change, copies CMS field changes when the graph has not independently diverged, and **rejects simultaneous conflicting edits** instead of silently overwriting the user's custom graph content. Same-site/page, source bindings, node types and SDK validation remain enforced. D6 original remains unchanged. New expanded regression cases passed in isolated V8 with live GitHub lead SDK: 504/504 graphs and 504/504 first-party JS renders plus conflict/preview/no-mutation tests. Actual filesystem Node checkout, PHP parity, Chromium 54 screenshots, human review and ZIP SHA remain **NOT RUN**. D7 OPEN; formal Stage2 NO-GO / Stage3 not accepted / 0/135. The authoritative closeout is `handoffs/SESSION-CLOSEOUT-2026-10-24.md`; copyable new-chat introduction: `handoffs/START-NEXT-CHAT.md`.

## Independent continuation · 24 October 2026 — semantic provenance guard

**Starting HEAD:** `cbba270004524bd1ec31234429dc9c0d362e7dc5`.
**Implementation commit:** `dd8fa4057b5e83a6a1f6da0bf3ad1409a060b2e0`.
**Regression commit:** `6e96883d10c6bb2f30450a5e988332a3dd0b19db`.
**Final HEAD:** read live GitHub (later documentation commits advance it).
**Writable scope:** only `stage3/design-factory/`, independent branch; no merges.

Closed a real optional-host integrity problem: an apparently valid `contentBindings` entry could point a graph node at a different **existing** semantic item, even though previously missing and duplicate bindings were detected. Now reconciliation uses a deterministic binding inventory derived from the baseline's selected typed section and composition, then rejects redirected, swapped, removed or excess mappings. Preserves graph-only edits, source conflict refusal and owner styles. The stable D6 package did not change.

**Actually executed:** syntax-parsed modified adapter and regression test source via V8; ran four mocked-host reconciliation checks (valid sync, valid reordered mapping, redirected source refusal, missing source refusal), all PASS. Added five negative/positive cases to optional real `lead-design-graph-smoke.cjs` but **not** executed in Node/lead SDK on a complete checkout. Read-only lead HEAD observed at this checkpoint: `d215fac8b91dac1fc300312e4829872242763606` (no compatibility acceptance implied). Local `git ls-remote` failed DNS, Chromium minimal probe timed out. No Node suite PASS, PHP PASS, 54 screenshots, human visual approval, real ZIP or verified package SHA is claimed.

**Progress:** D1–D6 engineered, D7 still OPEN (6/7 directions ≈86% engineering implementation, **not** product acceptance). **Stage2 NO-GO, Stage3 not accepted, 0/135**. Finish the same D7 Node/Chromium/54-screenshot/ZIP gates on a usable checkout; do not divert into architecture/cosmetic loops.

## D7 continuation · 24 October 2026 — exact CMS field editability

**Start HEAD:** `edbaf584d2957909e4ec472dd743c15cb9f64813`. Code commits: `7481c612b23c67b1fd8f7cdec8c031c69824125c` (exact source), `966fd36438829d8dcbe8636b610976e9c4a63568` (regressions), `79b14f94e897c11acb5e3a4d670acee27fb5ee42` (initially empty values/source switching), `eae218293be1024c481c79c4ca6f20e2cf83b657` (further regressions). Always fetch current HEAD after docs.

**Functional defect fixed:** the optional Lead Design Graph bridge could bind the **wrong** valid CMS field to a rendered heading, description or CTA. The main description of `feature-highlights` draws from `second` and is shown twice, but only the detail card previously synced. CTA uses the actual action with a valid href (often `primary`) rather than a guessed action slot. Both are now bound to the exact source used by the graph. Text can be empty initially and gain owner-supplied content later without re-generation. Changing which of multiple fields supplies a visual value is explicitly rejected for host review/rebuild; no silent reinterpretation. Original D6 exporter remains untouched.

**Live source-level check (isolated V8, NOT Node checkout):** fresh GitHub lead SDK contract blob `e3e0797632bd0f9c4b50cd1865d516264602bcb8`; 504/504 valid lead candidates, 504/504 actual host JS renders, 504 unique graphs, no original D6 mutation. Targeted tests with actual lead source passed: benefits update appears twice, CTA text and href update correctly, twelfth service title can be reconciled, redirected valid source rejected. New extended tests for blank-to-filled and source-selection changes have been syntax checked and a separate mocked-host blank-to-filled case passed, but the entire optional Node suite and those new real-host cases have NOT run on a checkout.

**Environment:** `git ls-remote` still returns `Could not resolve host: github.com`; a minimal headless Chromium screenshot attempt timed out after eight seconds (exit 124), even with no-zygote/single-process and GPU disabled. No checked-out Node-suite PASS, PHP PASS, 54 PNGs/human visual approval, ZIP package or verified ZIP SHA256. D7 remains **OPEN**. Six of seven directions engineered (≈86% engineering, not accepted product completion). Formal CMS Stage2 NO-GO / Stage3 unaccepted / 0/135.

**Next large block:** real full checkout Node release-audit + optional lead smoke (read-only lead SDK/PHP), working Chromium screenshot sweep at 1280/768/390, human visual/keyboard review, deterministic ZIP and actual SHA256; only then final integrator handoff.

**Final source-level recheck for this block:** After the blank-field/source-switch implementation, reran the full latest-GitHub-source V8 matrix: 504/504 host SDK candidate validations and 504/504 actual JS graph renders PASS, 504 distinct graphs. Four focused cases passed against the actual lead SDK: empty declared CMS summary → owner-supplied text, CTA source precedence switch refused, two nodes updated from one second-benefit field, CTA text + href updated. Still **NOT** real checked-out Node or actual PHP/Chromium/human acceptance.

## 25 October 2026 — D7 owner-content completeness: 24 FAQ and structural edit safety

Start HEAD: `585de10adc93f122a6297efa8645cf8e831594c1`. Source checkpoint: `7b53bc02c7481a92e3b2108e511621781779e0a7`; test checkpoints `00a9648a368c274bcab5eeda698073f4638abef2`, `5ce8045bbe0830e4bef235cf410fc48d91b88cc2`. The final HEAD follows these documentation commits — fetch it live.

**Functional fixes within the optional host Graph adapter only:** The registered CMS `faq-accordion` repeater supports **24** items but `contentFor()` silently truncated it at 12. The adapter now renders all 24 Q&As as 24 separately editable heading/body pairs (80 graph nodes including shell, below the lead SDK's 90-node cap). A 25th FAQ or 13th service is rejected explicitly rather than silently dropped. When CMS items are added, removed or reordered after the graph snapshot, `inspectSemanticSync()` and `reconcileSemantic()` reject stale structural mappings and require an explicit host rebuild. Updating unsupported `media-story` / `photo-gallery` media or captions similarly fails closed instead of suggesting existing placeholders are current. Graph-only typography edits and canonical binding/conflict protection remain intact; D6 output unchanged.

**Evidence performed:** latest read-only lead HEAD `514a060a287d07c308525a802053e899da9ea486`, Graph source blob `f19814616601501c42bea39c253d461e70563324`. Isolated V8 with real GitHub lead SDK/source: **504/504** host graph validators, **504/504** host JS renders, all 504 distinct; separately a **24/24 FAQ page** validated/rendered, 80 nodes, plus three structural/media rejection cases. `tests/lead-design-graph-smoke.cjs` now exercises 24-item host validation/render, explicit over-limit refusal, addition/reordering/media-change refusal, and 24th answer reconciliation with independent style preservation; the full optional Node suite was **not** run on a checked-out repo here.

**D7 actual execution blockers:** container `git ls-remote` still fails GitHub DNS resolution, and minimal Chromium `--dump-dom` on a local data URL timed out (exit 124, no stdout). No real Node filesystem suite, PHP renderer comparison, Chromium Studio E2E, 54 PNG screenshots, human visual review or ZIP/SHA256 were produced. Engineering D1–D6 implemented (approximately 6/7 directions), D7 **OPEN**; formal Stage2 NO-GO, Stage3 unaccepted, 0/135. No main, lead, SDK, PHP, workflows, deployment or merge operations.

**Next action:** execute the six standard D7 Node suites plus optional real lead SDK/PHP suite in a checkout; inspect full 54-image visual matrix and Studio interactions; package ZIP and calculate actual hash only after validation; then have the lead integrator review. Focus on verification, not new architecture.

## D7 owner editing and media-parity advance — 25 October 2026

Start HEAD for this block: `c8acaa211188ac55947f80e7b97a6cc8e9db5ae9`. Code commit sequence includes `8c02ff9396327fefd6e77a17b57760900bf52489` (HTTPS links), `ed3f94b0a2cbf66403804f11b7ff288c2b5935bc` (gallery images/captions), `afb16d11efce2ac5d155af593fccbf253f053a19` (explicit host rebuild), `9ae340c3c041c52ddc723159f9c990599dfe0f9d` (media-story/linked captions), `ba270ad230ff58637af54b1788af5f82ade8f7be` (reject unsupported lead-Graph URLs), `6ffc70b1484d7ea7bc6c5953caae1429f2e53206` (asset metadata invalidation); permanent tests `9eaa5ae0b8246444351a8082f4b96ebdf089a028` and `037d63e672ca46155d30c4222f6b7db17005fa5d`. Check current HEAD after docs.

**Implemented optional host-editing workflow:** registered CMS gallery up to 20 owner-uploaded images (typed `site.assets` IDs) now creates real `image` Design Graph nodes with owner-provided asset alt plus independently editable captions, instead of a permanently stale no-media placeholder. Registered `media-story.photo` now also generates a typed image node when an asset exists; image requires a nonempty CMS alt. No media is invented in the original D6/504 default variants. After an owner modifies structure or media, the **explicit** `rebuildHostCandidate(candidate, editedSite, hostSdk, registry)` returns a new validated candidate without AI, publication, or persisting changes; exact canonical baseline provenance/site/section identity is checked. It preserves compatible manually edited typed styling by stable node/type identity, except reordered/replaced repeater items whose card identity changed. It returns a review report with preserved/created/reset node counts and mandatory host authorization/human visual review. The host remains responsible for permissions, revision locking, asset rights, saves/undo, visual signoff, publishing and PHP parity.

**Value edits:** gallery captions added after authorized media rebuild sync with existing conflict-safe `reconcileSemantic()` and preserve visual styles; changed media IDs or asset metadata (e.g., edited alt/src/variants) refuse stale reconciliation until rebuild. Owner-provided HTTPS CTA/service URLs are retained if they satisfy the **intersection** of current CMS/Graph URL policies; links the Graph cannot safely express are explicitly rejected, not silently changed to `/contact/` or secondary CTA. Main D6/site-v1 exporter remains untouched.

**Actual evidence (read-only fresh lead source, isolated V8)**: lead contract blob `e3e0797632bd0f9c4b50cd1865d516264602bcb8`, lead Design Graph blob `13243b5d0ba00c8eb0875730927437b134f90147`; 504/504 current host typed validations and 504/504 real host JS HTML renders, 504 distinct variants, original D6 non-mutated. Extra source-driven checks: JPEG owner asset/alt, gallery caption edit, asset-alt mismatch rejection and corrected alt rebuild, full 20-image gallery (68 graph nodes), HTTPS CTA update and incompatible Graph URL rejection, added FAQ item via explicit host rebuild. Permanent optional Node regression tests added and syntax checked, **not executed as a Node checkout suite**.

**Unchanged final gate:** D7 remains OPEN. Here GitHub host DNS for git checkout and minimal Chromium remained blocked previously; no checked-out full Node suite, PHP renderer, 54 screenshots/human visual review, actual deterministic ZIP and SHA256. Formal Stage2 NO-GO / Stage3 not accepted / 0/135. No changes to main, lead, SDK, PHP, CI, hosting, or production.

## 25 October 2026 — D7 content-preserving host rebuild and full isolated-source smoke

**Start branch HEAD:** `962cd87a237a05cfacbd1cba713286e194b0520f`. Changes confined to independent `stage3/design-factory/`: adapter fix `8fcff130ba0425a73cf3f90b399def7624d0562f`; optional smoke tests `41808b95d75ccadd2086aa89724b1122b35d2396` and HTTPS regression correction `16cab27fee7d8e727e6775406f889de8332e696d`; detailed host contract `handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md`. Fetch latest branch HEAD after docs.

**Fixes:** numeric repeater-card ID check previously matched a literal backslash-d due to a doubly escaped regex, meaning a swapped FAQ/service record could inherit a different record's typography. Correct ordinal detection now refuses to carry styles across mismatched item IDs. Opt-in `rebuildHostCandidate` also preserves independently edited Graph text/href only when the same typed source remains unchanged; competing Graph+CMS edits reject. Deleted owner-authored graph copy cannot be discarded silently: host must show affected text and confirm an exact set of `acceptedDiscardedNodes` identifiers, otherwise fail closed. Rebuild report now includes retained Graph copy and explicitly discarded edits. The host remains responsible for auth, atomic revision checks, owner confirmation, undo and visual review. D6 stays immutable.

**Evidence:** Full optional `tests/lead-design-graph-smoke.cjs` source suite executed with read-only *real GitHub lead/DF JS files* inside an isolated V8 emulating `node:assert/strict`, `node:path`, and `node:fs`. Result **504/504 validated unique Design Graph variants, 504/504 JS host renders, all optional test assertions PASS**, PHP SKIP. Additionally 4 focused mocked-host cases for graph text, conflict and loss acknowledgement PASS. This is explicitly **NOT checked-out real Node**, and does not cover real PHP or Chromium. The current read-only lead branch moved to `aff9af003c4201c3393033703a3edd6f01fd425c`; its changes since `95252a52c5d153b8bf9892d542526cf591f13390` touched docs and Studio, **not** the graph/contract SDK. The last tested lead graph blob was `13243b5d0ba00c8eb0875730927437b134f90147`.

**Blocked acceptance:** git checkout still fails GitHub DNS (and direct IP connection), minimal Chromium data-URL probe exits 124, so no real on-disk Node suite, PHP parity, full 54 responsive screenshots, human visual check, deterministic release ZIP or verified SHA256. D7 OPEN. Engineering directions D1–D6 are implemented, but not formal Stage3 acceptance; Stage2 NO-GO, Stage3 unaccepted, 0/135. Next priority remains actual D7 environment and independent review, not incremental percentage claims.

## 25 October 2026 — Three-block rebuild review and integration closeout

**Implementation checkpoint before this documentation update:** `0b11c94fa536887c18a4b008d8f57c846fd14219`. This work stays in the optional Design Factory / Lead adapter on `feature/stage3-design-factory`; no merge or production integration.

**Block 1 — structured rebuild preflight:** `inspectRebuild(candidate, editedSite, hostSdk, registry)` is read-only and returns `manufact-design-factory-rebuild-preview-v1`. It reports whether a rebuild is possible, whether explicit owner confirmation is needed, and structured `discardedGraphEdits` entries with `nodeId`, `property`, prior value, current value and presence. Conflicts and invalid candidates return `canApply:false`; the function checks that neither input changed. Provenance bindings are capped at 80 and exact discard acknowledgements at 180 short identifiers.

**Block 2 — complete matrix:** the optional cross-branch smoke was executed using actual GitHub JS source in isolated V8 with emulated Node builtins. Result: **504/504 lead-SDK graph validations, 504/504 scoped JS renders, 504/504 AI-free no-op rebuilds, 504/504 read-only rebuild previews**. All graph variants remained distinct and D6 remained immutable.

**Block 3 — source refresh + actionable diff:** CMS source edits were rebuilt across all 8 represented registered component families: company hero, feature highlights, services, media story, FAQ, CTA, contact and photo gallery. The updated report exposes `preservedVisualNodeIds`, `createdVisualNodeIds`, `resetVisualNodeIds`, `removedVisualNodeIds`, `retainedGraphCopyNodes` and `explicitlyDiscardedGraphEdits`. The destructive preflight also returns the predicted rebuild report without saving or treating the owner as having approved it.

**Evidence boundary:** the harness is an isolated V8 run over real GitHub source, with mocked `node:assert/strict`, `node:fs` and `node:path`; it is **not** an actual checkout / Node process. PHP parity, Studio Chromium interaction, 54 screenshot captures with human review, real release ZIP/CRC/source parity and actual ZIP SHA256 are still not run. D7 OPEN; formal Stage2 NO-GO / Stage3 unaccepted / 0/135. Next work should prioritize obtaining a real checkout/runtime and final visual/release gates rather than expanding another isolated matrix.

## 25 October 2026 — loss-aware structural rebuild and owner-edit preservation

**Functional code checkpoint:** `82b9f7aab5adbb0c0950e7be951aa9ff9beb9369` (live branch HEAD also includes this block; re-read HEAD before the next write). Scope remains only `stage3/design-factory/`.

**Block 1 — no silent graph-node loss:** `rebuildHostCandidate()` now requires explicit owner acknowledgement when a manually deleted canonical node would be recreated, a custom node would be dropped, a custom node collides with a newly generated CMS node ID, or owner-edited node properties are lost as a structural card is removed/reset. It tracks `type`, text/href, styles, responsive rules, states, motion, asset identity, alt, icon/level, poster and loop values. Rebuild loss is reported with exact IDs and fields. A typed `DF_REBUILD_OWNER_REVIEW_REQUIRED` error carries the exact required acknowledgement IDs; the preview no longer has to parse IDs out of free-form exception text.

**Block 2 — three-way media reconciliation:** owner-authored `assetId` and image/video alt/media properties survive a rebuild when the CMS-derived source is unchanged. If both CMS and graph change the same media property to different values, rebuild fails closed with a conflict instead of choosing silently.

**Block 3 — regression suite and full matrix:** the current optional cross-branch smoke passed in isolated V8 using actual GitHub JavaScript source and emulated Node built-ins: 504/504 SDK graph validations, 504/504 scoped JS renders, 504/504 AI-free no-op rebuilds, 504/504 read-only preflights, 8/8 component-family source refreshes and 8 loss-aware structural/style/media regression groups. Cases include owner-deleted nodes, custom nodes, newly generated ID collisions, removed-card styles, media alt and asset-ID conflicts, and explicit acknowledgements on reordered cards. PHP parity: 0; skipped. No real Node checkout or Chromium run.

**Environment limitation:** an actual `git clone` was attempted but the environment could not resolve `github.com`; therefore this result must not be described as a real Node process run. GitHub combined commit status currently has no statuses and there are no PR-triggered workflow runs for this head. D7 remains OPEN; formal Stage2 NO-GO / Stage3 unaccepted / 0/135. Next priority is genuine Node/release audit, PHP parity, 54 real Chromium screenshots with owner review, and a source-byte-identical ZIP with archive integrity and SHA256.


## 27.10.2026 — D7 real runner restriction and current Lead branch compatibility check

**Execution-blocker record:** [handoffs/D7-EXECUTION-BLOCKER-2026-10-27.md](handoffs/D7-EXECUTION-BLOCKER-2026-10-27.md). Actual current environment has Node 22.16, PHP 8.4 and Chromium 144, but could not resolve GitHub for a real git checkout; real Chromium navigation to both local file:// and http://127.0.0.1 failed with net::ERR_BLOCKED_BY_ADMINISTRATOR. The target Design Factory branch had no Actions runs. The complete D7 audit, 54 PNG, 64 routes, 42 human composition reviews, 6 actual PHP probes, and verified ZIP remain **NOT RUN** — no simulated acceptance.

**Read-only Lead branch comparison:** checked `feature/stage3-ai-site-contract` at SHA `2333d77762375e20326870a115ddd1b47f90145e`. Eight common component manifest Git blobs are identical. The Lead SDK contract and site schema differ; a static compatibility comparison found no tightened old shared schema constraints, while the Lead schema adds root `language`, `menu`, `designTokens` and Design Graph definitions. This is **not** a runtime or PHP PASS. A real authorized runner with checkout and permitted file navigation is required; do not broaden tests or relax D7 gates to fake closure. Status **6/7 (~86%), D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135**. Changes strictly within own feature branch; no merge/workflow/deploy.

## 2026-10-27 — D7 three product corrections and exact Studio bundle parity

**Feature-only functional commits:** `87d296af1d7620643f1113980aa7cdf4d470a45c` (contact preview), `ae86e68ede2949279b01295ca61c176494141f46` (human review receipt refusal with rejected items), `8e49b2d177f683d26814aba01aac7b4c2d647554` (all twelve CMS font stacks represented in HTML previews). Scope is only `stage3/design-factory/**`. No merge, hosting, main, SDK/PHP or workflow changes.

- The registered CMS contact-page hero already carries owner-supplied contact copy. The standalone contact-panel preview previously ignored it and always showed a draft placeholder plus a useless `/contact/` self-link. Preview now displays escaped, line-preserving owner facts if present, otherwise an explicit placeholder. No new CMS schema property or pretend form.
- The v3 human-review interface previously enabled an approval-receipt download even if the reviewer rejected screenshots or compositions. It now blocks receipt readiness until there are zero rejected verdicts. Defect exports and resumable drafts remain available; the strict verifier was already fail-closed.
- CSS preview previously used system font for Arial CMS themes and for body copy regardless of registered CMS `font`. Preview now maps `georgia` / `arial` / `system` to their respective stacks for body and headlines across all 12 themes.
- Existing `tests/smoke.cjs` and `tests/visual-review-smoke.cjs` gained focused coverage. The Browser Studio's committed `runtime.generated.js` was updated from the exact modified preview module. **Actual source-derived browser-bundle parity was verified** by executing the unmodified `bin/build-browser-bundle.cjs --check` logic in an isolated JS runtime using live GitHub source bytes: all eight embedded JS modules plus eight CMS manifests matched, with `Design Factory browser bundle verified` and exit code 0. This is not the actual full Node checkout audit.
- Actual modified JavaScript parsed; representative owner / empty contact page render cases and all twelve theme font CSS cases executed in isolated JavaScript. Not a replacement for genuine Node/Chromium/PHP execution.

**Release status unchanged:** D1–D6 engineered, D7 **OPEN**, roughly 6/7 (86%), Stage2 NO-GO, Stage3 UNACCEPTED, **0/135 formally accepted**. Real nine-suite Node audit, Chromium Studio E2E, 54 PNG, 64 real browser route probes, 164 exact regeneration, 42 independently reviewed compositions plus 54 screenshot reviews, six genuine PHP parity probes and ZIP CRC/SHA-256 remain **NOT RUN** due terminal GitHub networking and managed Chromium local-navigation policy. Never mark a gate green based on V8 source checks. See `handoffs/D7-EXECUTION-BLOCKER-2026-10-27.md`. Next time: run existing commands in an authorized full checkout/browser environment; fix observed defects rather than adding test infrastructure.



## 2026-10-27 — D7 product vertical: four-page section/composition manager (independent branch)

**Implemented and committed** entirely under `stage3/design-factory/**`: versioned `lib/section-plan.cjs`; D6 `lib/bridge.cjs` v1+v2 workspace support; browser bundle build allowlist and rebuilt `studio/runtime.generated.js`; offline `studio/section-editor.js`; inspector UI/CSS and `studio.js` integration; 18-file delivery accepts v2 while retaining its 18-member canonical inventory; bridge and Studio smoke source extended. A v2 plan orders sections across all four canonical routes, inserts up to eight registered D3 fallbacks per page, reorders/deletes eligible sections, protects original hero/CTA, uses stable IDs and allows single-page reset/Undo/Redo. Kit switch resets old base mappings. No CMS schema/SDK/PHP/CI/production edit or merge.

**Safety:** Every v2 plan is checked against the actual first-party compiled kit site, canonical route set, component registry and SDK validator. New placeholders force CMS `noindex` regardless of previously confirmed source facts, with a clear Studio warning. Both CMS export and D6 bundle use `engine.bridge.build()`; delivery ZIP checks site equality before packaging. Legacy v1 composition is preserved by migrating to v2 plans, and imported v1 and v2 projects remain distinct from publish authorization.

**Actually executed:** all newly changed JS and existing edited test JS passed V8 syntax parsing. Live first-party browser runtime and D6 bundle compiled an Approach insertion, a reordering, stable-ID/CTA preservation, v2 bundle round-trip and rejection of removed protected hero; isolated DOM invoked the *actual* new Studio section editor to insert on Home and Contact, reset only Contact while retaining Home, and preserve legacy Home composition in v2. A handler variable defect was found during this run and fixed (`3fbbfd2898684d0556f74b80075efc4499d6edb3`). This was **isolated V8 with mock DOM**, NOT actual checked-out Node tests or Chromium E2E. `node v22` and `chromium` binaries exist locally, but a real GitHub checkout still cannot be retrieved due to blocked GitHub DNS. Human 42/54 evidence, 64 browser routes, six PHP parity probes and a release ZIP/SHA256 are still unavailable. **D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, formal 0/135, 6/7 ≈86% engineering phases only.**


## 27.10.2026 — large product block: first-party CMS section content editor

**Delivered on independent `feature/stage3-design-factory`, within `stage3/design-factory/**` only:** `lib/section-edits.cjs` manifest-typed edit applier; extended `lib/section-plan.cjs` v1/v2 reader; aligned `lib/bridge.cjs` D6 noindex + edited-count compatibility; rebuilt `studio/runtime.generated.js` with bundled first-party module; `studio/section-editor.js` in-place owner copy/repeater editor; responsive `studio/studio.css`; Studio user-state/indexing messaging and existing smoke source. On any of four pages, click section ✎, edit headings/body/buttons/approved URLs and card/FAQ repeaters (add/remove/move), Save/Cancel, then Undo/Redo. No arbitrary CMS field injection, HTML execution, media editing, external API or changes to Lead SDK/PHP.

**Backward compatibility:** section-plan v1 order-only stays loadable, v2 adds `edit` only after first copy change; workspace envelope stays v2 and old v1 workspace untouched. D6 validates exact typed manifest fields, repeater bounds, stable item IDs and actual CMS local routes. Changed copy and unverified added sections require separate owner review; **noindex** persists, even if older owner project was `ownerReviewConfirmed:true`. D6 supported-subset CMS site matches Studio export; the 18-file owner ZIP format remains unchanged.

**Checks actually executed:** first-party GitHub browser runtime in an isolated V8 evaluator: original hero heading override, FAQ addition + third edited repeat item, `bridge.validateBundle`/CMS parity, rejection of media injection, invalid element field lengths, forged item ID and original hero deletion. An isolated DOM evaluator invoked actual section-editor UI controls to edit and Save hero text, add FAQ to Contact, add third Q/A, verify live CMS output and noindex. Modified source and existing test source parsed. One-time `git ls-remote` in the local runtime still failed with `Could not resolve host: github.com`; Node and Chromium are installed, but **no checked-out actual Node suite / Chromium file:// E2E / 54 PNG / 64 routes / human 42-composition approval / six PHP parity probes / formal ZIP SHA256 occurred**. D7 remains **OPEN**, Stage2 **NO-GO**, Stage3 **UNACCEPTED**, **0/135 formal acceptance**, engineering D1–D6 ≈86% remains a phase count only.


## 2026-10-27 — Large Studio feature: independent four-route SEO metadata editing

**New product functionality committed to `feature/stage3-design-factory` exclusively under `stage3/design-factory/**`:** `lib/page-settings.cjs` (exact versioned metadata overlay), `lib/bridge.cjs` workspace-v3 compatibility and page-level noindex gate, first-party runtime builder/bundle, `studio/page-settings.js` staged four-route editor, inspector UI, responsive styles, a live offline search snippet, updated 18-file delivery validator and existing D6/Studio smoke sources. Edit page title, SEO title/description and navigation label on each canonical page; save/cancel, restore this page only, keep other page drafts in the tab, and Undo/Redo saved changes. CMS routes/IDs, robots and navigation visibility remain controlled by the original contract, not user-editable freeform properties.

**Compatibility:** workspace v1/v2 unchanged; version 3 adds `manufact-design-factory-page-settings-v1` for the four routes, retaining optional section plans. All four-page metadata are independently rebuilt in D6 and Studio using the same first-party SDK. Any changed per-page metadata revokes previous owner sign-off for export and forces noindex until separate review. Delivery ZIP still contains 18 canonical members and refuses divergent CMS/D6 sites. Switching kit or language resets stale metadata.

**Actually run, not overstated:** isolated first-party GitHub browser runtime exercised two distinct per-page SEO overrides, D6 bundle/site equality, combination with sectionPlan, v1/v2 compatibility and six malformed inputs rejected. Simulated DOM invoked real Studio page-settings.js controls for staging, snippet, save, other-page cancel and reset; all passed. Modified JS source and existing test files parsed. Actual local `git ls-remote` still failed DNS; Node/Chromium binaries exist but **no checked-out Node suite or actual browser E2E** was run. Formal 54 PNG / 64 browser routes / 42 design decisions / six PHP probes / hashed release ZIP not completed. **D7 OPEN; 0/135 accepted; Stage2 NO-GO; Stage3 UNACCEPTED; 6/7 ~86% engineering phase count remains unchanged.**


## 2026-10-27 — independent large product block: full 18-file ZIP recovery

Committed under the **exclusive `stage3/design-factory/**` boundary**: safe `studio/preview-zip.js` `extractDelivery()` with strict existing ZIP32 profile/CRC and fatal UTF-8 decode, new `studio/delivery-import.js` cross-file inspector/restore, `studio/index.html` two-phase upload controls, `studio/studio.js` guarded async staging and explicit Undo-capable application, responsive CSS, focused existing Node/Chromium smoke source, updated docs. The import preserves previously exported workspace v1-v3 kit, selected theme, sections, FAQ/card copy, four-page metadata, and optionally matching feedback. It verifies D6 bundle and CMS site identity, project, services text, bridge guidance, audit page inventory, manifest CRC/path set, static preview HTML/CSS/info and review-portal context. Archive HTML is never rendered from untrusted ZIP bytes.

**Important safety property:** ZIP import never transfers historical publish permission: owner attestation always resets to false, restored export is noindex, and original feedback may appear historical/stale until review. A staged ZIP must be confirmed separately before replacing an open project; intervening edits invalidate staged restore. Manifest and CRC are transfer integrity tools **not authentication**. No change to SDK, Lead main, CI, PHP, server, hosting or production.

**Actually executed:** isolated real GitHub code V8: 18-file export/import v1 and v3 (SEO + added FAQ), full CMS/D6 parity, previously indexable file reopening with noindex and historical feedback, eight corrupted or internally inconsistent ZIP variants refused, plus added audit/bridge/service cross-check. A real Node v22.16.0 and Chromium binary are installed but `git ls-remote` returned `Could not resolve host: github.com`, so **checked-out Node suites and actual Chromium/PHP E2E are unexecuted**. Formal D7 0/135 / Stage2 NO-GO / Stage3 UNACCEPTED remain unchanged; ≈86% is still engineering-phase progress only.

