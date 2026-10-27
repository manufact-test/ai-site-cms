# Design Factory Browser Studio · D5

## 2026-10-27 — FINAL HANDOFF / ONE-CLICK 18-FILE DELIVERY

**Start here:** [`handoffs/FINAL-TRANSFER-2026-10-27.md`](../handoffs/FINAL-TRANSFER-2026-10-27.md) (from `PROGRESS.md`; other docs use the same repo-relative handoff path). The final comprehensive transfer is the authoritative concise overview for the next independent DF developer.

**Last product sprint:** New `studio/delivery-package.js`, top-bar `save-delivery-zip` button and 18-member deterministic owner + Lead developer ZIP: CMS site-v1, matching D6 integration bundle, bridge guidance, editable project/workspace/services, owner audit HTML/JSON, four standalone HTML pages and CSS, bilingual review portal, manifest CRC32 and client feedback only when current. Stale feedback is explicitly excluded. Both strict 8-member legacy preview and strict 18-member handoff ZIP formats pass independent CRC inspection. No network, automatic publication, plugins, PHP changes or outside-DF file writes.

**Critical fix:** D6 `lib/bridge.cjs` now inserts a requested composition before the existing Home CTA, exactly matching Studio; previously it silently replaced a section, causing D6 to differ from normal CMS export. Generated runtime kept source-exact. **1008** CMS/Studio/D6 source parity combinations passed; **72** handoff archive variants plus **72** current/stale feedback cases passed. Real Studio button built the 18-member ZIP and legacy eight-file preview remained functional. Existing optional Chromium E2E now includes ZIP export checks and fixes an early download-hook restoration flaw, but was **not actually run**. Final functional fix `f728f242707f993110d341e5f4be4730d1868187`, see final transfer for every other SHA.

**NO FALSE ACCEPTANCE:** D1–D6 engineered; D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135 formal gates passed, approx. 86% phase implementation. Real Node/Chromium/human/PHP D7 evidence is missing, even after these real-source isolated checks. Do not merge, publish, or change outside `stage3/design-factory/`. Owner explicitly wants large connected development blocks, not endless micro-tasks/tests.



## 27 October — End-to-end content, owner audit and safe design composition

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

## 27 October — Service editor / multi-row workbench

## 2026-10-27 — Service workbench: bulk import, safe duplication and ordered CMS export

**Functional commits:** `31dc193144bae14083fca86072655ca85a4a62f3` (Studio service management + previous RU/EN portal smoke assertion update), `0c8c0247fe0233f0ae7832cb3b64aa804d1fc658` (existing Chromium smoke expanded to cover service editing and stale CSS selector updated). Both strictly under `stage3/design-factory/` on `feature/stage3-design-factory`.

**User functionality:** Existing Studio inspector section 02 now offers Up/Down (44px keyboard/touch buttons) to reorder real service rows, duplicate-as-draft (copies title/description but prefixes the copied title `Пример (подтвердить):` / `Example (verify):` so the owner checklist blocks accidental duplicate approval), and bulk insertion of one service per line. Bulk accepts `Title | Description`, tab-separated `Title<TAB>Description`, or `Title` alone; the latter receives a conspicuous unverified description placeholder. Input limits: max 12 total/at once, 120 chars title, 320 description, 5500 chars pasted source. Invalid input or overflowing batch fails atomically, preserving the textarea for correction. All changes go through existing `apply()`/Undo/Redo and revoke previous owner sign-off. This modifies no CMS schema or SDK/PHP code.

**Executed focused verification, NOT full D7:** Actual current GitHub Studio JS + committed first-party browser runtime, feedback module and ZIP packer were loaded together into an isolated DOM evaluator. **15 checks passed**: bootstrap, paste two services, real project export, move, Undo, Redo, duplicate draft, ready-for-publish remains blocked, delete copied row, atomic invalid batch, retain rejected input, append with placeholder, 4-page CMS JSON export, correct CMS service ordering, verified offline 8-file ZIP CRC. Direct parser tests covered RU/EN source, >120 title, 13-row overflow and empty input. Changed app and existing smoke test source parsed; existing smoke's optional real-Chromium scenario was extended with 10 actions and its embedded script was syntax-checked. **Chromium has not executed**, nor full Node suite, 54 real PNG/64 routes, human reviews, six genuine PHP parity probes or full release ZIP.

**Status unchanged:** D1–D6 engineered, **D7 OPEN**, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135 formally accepted, 6/7 ≈86% phase-based. Main developer handles integration after independently verified acceptance. No merge/PR, main, Lead branch, external CMS, workflows, hosting or production writes.

## 27 October — RU/EN customer reviews, edit existing comments, protect unsaved work

## 2026-10-27 — bilingual client acceptance workflow and editable feedback
**Functional commits:** `055e930f047290b7ca08437372531bc913f230a7` (RU/EN review portal linked to Studio project language), `996411b5a170f4d00dd0ea28b50a27a5f397d0b4` (edit note page/type/body and reopen corrected items), `28fb2d5fe99fb49591edd484fa386606cd265689` (protect in-progress client edits from stale JSON download/import; clearly display resolved imported notes). All changes restricted to `stage3/design-factory/**`.

**Owner workflow now:** choose Russian or English in Studio, export **HTML-демо ZIP**, extract it and open `review.html`. The customer gets a localized feedback portal (including the inline first-party runtime strings), can create/edit/delete up to 30 page-specific notes, change note type and text, save or cancel changes, export JSON and restore a draft bound to the *same* site snapshot. An edited previously resolved note is reopened. Download/import is disabled while an edit is uncommitted; no browser storage, uploads or network services. The project/snapshot correlation format remains `manufact-design-factory-client-feedback-v1`, unchanged. Feedback is untrusted and is NOT owner review, signoff or authorization to publish.

**Executed focused verification:** actual committed GitHub `studio/runtime.generated.js`, `studio/client-feedback.js`, and `studio/preview-zip.js` modules executed together in isolated JS. For **both RU and EN**, the genuine first-party CMS compiler produced 4 routes and HTML/CSS, `review.html` had the requested language, ZIP32 built 8 canonical files and inspector confirmed all CRC32 values (RU 34450 bytes; EN 30867 bytes in this test fixture). JS runtime needed a JSON-only `structuredClone` shim because the isolated evaluator has no native global; the real browser runtime was not modified for this. In a second isolated executable mock-DOM scenario for **both languages**, user created a note, changed its page/type/text, download was disabled mid-edit, and the exported JSON carried the saved change using the original v1 format. All changed JS and embedded scripts parsed. A handful of assertions were added to existing `tests/studio-smoke.cjs`; **the actual checked-out Node suite and Chromium were NOT RUN**, so do not record formal pass.

**Release remains unchanged:** D1–D6 engineered, **D7 OPEN**, Stage2 NO-GO, Stage3 UNACCEPTED, **0/135 accepted**, around 6/7 = 86% phase-based. Real Chromium file-navigation/54 PNG + 64-route audit, full Node suite, 42-composition and 54-screenshot human judgments, 6 actual PHP parity probes, deterministic source-exact release ZIP / SHA256 remain required on a genuine accessible checkout. No main/Lead SDK/PHP/CI/workflows/hosting/production changes or merge.

## 26 October — feedback export uses live state

The feedback inbox now computes the report context from a fresh `compileCurrent()` every time. Do not replace it with `state.lastCompiled`: the latter intentionally updates after the 120ms preview debounce and may represent the previous version while a user has just typed. Feedback import, resolving and progress export must fail closed for a changed site even during that brief interval.

`tests/studio-smoke.cjs` includes a real Chromium test of the review portal extracted from the eight-member HTML demo ZIP, including client JSON creation/restoration, Studio import, navigation, resolution, progress export, and a check that stale export is blocked before the preview refresh. This test is authored but not executed in this environment; see `QUALITY-GATES.md`.


## Client design review handoff · 26 October 2026

**For designer:** after editing a Design Factory project, download **HTML-демо ZIP**. The current archive has **eight** members: `README.txt`, `approach/index.html`, `assets/preview.css`, `contact/index.html`, `index.html`, `preview-info.json`, **`review.html`**, `services/index.html`. This replaces the earlier seven-member layout. `review.html` offers page navigation and offline comments. The ZIP remains view-only, deliberately `noindex`, and is never an export of production PHP or working forms.

**For client:** extract ZIP, open the four pages and `review.html`. Choose Home/Services/Approach/Contact, select change/bug/question, enter notes up to 900 characters each, and click **Скачать замечания JSON**. Up to 30 entries can be gathered. Use **Продолжить работу с сохранённым JSON** to restore a previous draft from the same site snapshot. The browser never uploads or stores this feedback. Send the downloaded file to the designer.

**Back in Studio:** open inspector section 05, import JSON via **Загрузить замечания JSON**, inspect the note list, click **Открыть страницу** or **Отметить исправленным**, and export progress via **Скачать замечания с отметками**. Changing the site’s real contents/selected theme/kit/composition makes previous feedback stale; its preview and status are not silently applied to different site bytes. To start another client feedback cycle, export a fresh ZIP.

**Important:** the version correlation key is a non-cryptographic short checksum for accidental mismatch detection, not tamper protection or reviewer authentication. Comments, note statuses and saved JSON are NOT owner approval, license confirmation or authorization to publish. All verification and CMS release gates remain separate.

**26 October 2026 — functional checkpoint `30e7e97cefe80fb32e5b4c5a1d20e01dd5924861`** (subsequent docs commit advances HEAD; fetch live branch SHA).

Completed a connected client-feedback loop in actual offline Design Factory Studio, instead of another narrow audit: Studio's **HTML-демо ZIP** now contains an eighth file, **`review.html`**, a self-contained, no-network Russian client review portal with working links to all four generated pages. The customer can add up to 30 page-tagged notes (change / issue / question, 900 characters each), remove them, download a JSON report, and later restore their own JSON to continue. The Studio inspector now includes section **05 / Замечания клиента**: import client JSON, view each note safely via textContent, open its page, mark or unmark it as resolved, and export the updated progress JSON. No browser storage, server API, CMS state edit or publication request.

The first-party `studio/client-feedback.js` is shared between portal generation and Studio validation. Reports use the closed **`manufact-design-factory-client-feedback-v1`** schema. A non-cryptographic, explicit **site-snapshot correlation key** is computed from the four compiled pages, actual selected theme, kit, locale and D3 composition. Studio refuses reports for other or changed snapshots; modifying content/theme does not silently migrate notes. The key is for matching only: it is **NOT a security signature, authenticated client identity, owner acceptance, signoff or publish permission**. Notes and resolution flags are untrusted suggestions; no guest input is executed as code. The external ZIP portal is static HTML/CSS and an inline trusted first-party script with restrictive CSP, no tracking, no CDN, no network. `studio/preview-zip.js` now canonically packages **8** files, validates all ZIP32 metadata and CRC before download, and retains safe size bounds and `robots=noindex`.

**Verification executed:** V8 JavaScript source syntax PASS. Isolated execution of the actual GitHub client portal JS with mocked DOM: add a note, download the real feedback JSON, restore it and check 8-file ZIP/CRC PASS. A separate isolated execution of actual GitHub Studio + feedback/packer modules with mocked compiler/DOM: generate 8-member archive, import valid feedback, render inbox, navigate to Services, mark resolved, export resolved report, change selected theme, and refuse stale feedback workflow PASS. Actual checkout **not available** (DNS `github.com` still fails from executor); full Node audit, actual Chromium live browser, 54-image human-reviewed matrix, Lead/PHP parity (0 probes), and full source-exact release candidate ZIP/SHA256 **NOT RUN**. This engineering milestone does NOT modify formal status: **D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135**. Scope strictly `stage3/design-factory/`; no main/SDK/PHP/workflows/hosting/production edits and no merge.


## Export static four-page HTML prototype (26 October 2026)

The new **HTML-демо ZIP** button in the Studio top toolbar downloads a portable, offline static website with four linked pages, one local CSS file, and preview documentation. Steps: choose a kit/theme, edit owner facts and a D3 composition if desired, click **HTML-демо ZIP**, unzip the downloaded archive, and open `index.html` in a browser. All four page links and `assets/preview.css` resolve locally. A responsive mobile/desktop site can therefore be demonstrated without the CLI or server. It is always deliberately marked as a **preview and noindex**; even confirmed owner review does not remove the warning. Use the separate **Экспорт CMS** for the supported `manufact-ai-site-v1` document, and D6 bundle for integration. ZIP does not include the project/workspace JSON or secret session state.

Archive inventory: `README.txt`, `approach/index.html`, `assets/preview.css`, `contact/index.html`, `index.html`, `preview-info.json`, `services/index.html`. ZIP32 uses uncompressed STORE entries, CRC32 for every file, exact central/local headers, deterministic ordering/timestamps and safe allowlisted names; size bounds are 2 MiB/member, 8 MiB total source, 9 MiB ZIP. Each archive is verified locally before its download is offered. HTML is generated by the first-party compiler/preview renderer, with escaped owner facts, no external script/style dependencies or external downloads. A static preview is not PHP visual parity, live form submission, a release, or license verification.

**Functional HEAD:** `509a00fb937c0a14443c81b65daa22cffacb2d02` (documentation commit comes afterward; read live branch HEAD on entry). Added a genuine one-click **HTML-демо ZIP** button to the offline Design Factory Studio. It packages four interconnected CMS-validated *preview* pages (`index.html`, `services/index.html`, `approach/index.html`, `contact/index.html`), `assets/preview.css`, bilingual `README.txt` and a strict `preview-info.json` (7 files total). Pages come from the current owner facts, selected theme and composition fallback via the existing first-party preview renderer; links and relative CSS paths remain local. All pages deliberately retain `robots=noindex`, including after owner review. This is **not** the PHP CMS visitor renderer, form collector, publishing, or owner authorization.

New self-contained `studio/preview-zip.js` writes **deterministic STORE-method ZIP32** entirely in the browser, with canonical allowlisted file paths, UTF-8 encoding, exact bounds (2 MiB per file / 8 MiB total), CRC32, local/central-directory parity and a built-in independent read-only archive inspector. Studio checks the ZIP before download. No CDN, network request, filesystem access or third-party package. `tests/studio-smoke.cjs` now contains real Node ZIP contract assertions and an optional Chromium export step, but these are *authored, not run on a checkout*.

**Executed focused evidence:** actual GitHub source parsed in V8; isolated same-module ZIP builder/inspector PASS including corruption rejection; ZIP fixture generated from the GitHub module was independently extracted using standard Python `zipfile` (7 readable entries, CRC error `None`, RU/Unicode content intact). A separate V8 simulation executed the actual GitHub `studio.js` and ZIP module with a mocked DOM/compiler: real click downloaded ZIP, validated all 7 members, and left owner project unchanged. This does NOT establish actual CMS content generation in a genuine checked-out repo, Chromium GUI or production acceptance. A one-shot checkout probe still failed due to `Could not resolve host: github.com`. Full Node release audit, Chromium E2E/54 real screenshots and human review, Lead PHP parity (0 probes), and full Design Factory release ZIP/source SHA256 remain **NOT RUN**. **D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135**. Git scope restricted to `stage3/design-factory/`, no merge or out-of-scope edits.


## 26 October — comparing themes and four-page review

In Studio, click **Сравнить две темы** and select **Тема для сравнения** to render the current page and owner copy in two themes side by side. Change the device width and page to inspect both. Desktop/tablet frames retain their requested width and can scroll horizontally rather than pretending narrower screens are full desktop renders. Click **Применить выбранную тему** only when ready: this is a real, reversible project change and revokes prior owner review; the former theme becomes the comparison reference. Switching view modes alone does not modify export data. The editor sidebars hide temporarily to make room; exit the mode to edit facts.

Click **Все 4 страницы** to inspect Home/Services/Approach/Contact simultaneously at true 390px mobile width, then **Открыть страницу** to open the chosen route in normal Studio. These are local first-party HTML/CSS frames with sandbox, CSP and allowlisted in-app routing, not a CMS PHP parity guarantee.

Functional checkpoint: ea4b4751d67bdaf0a8fac62d1c9b6058257a3b3c. Studio now has three connected capabilities: (1) live side-by-side previews of two different theme directions on the same owner data, page and device width; (2) explicit adoption of the compared theme through validated project mutation, undo/redo and automatic owner-review revocation, with prior theme retained as reference; (3) an overview of all four actual current-site pages in separate sandboxed 390px mobile iframes, each opening directly in the regular viewer. Full-screen focused workspace makes side-by-side comparisons useful; presentation-only actions never mutate project, site-v1 JSON, or D6 export. Alternate compilation clones the project. Existing local CSS/CSP, safe iframe sandbox and allowlisted page navigation are preserved. No Lead SDK/PHP/main/production changes.

Verification: modified JavaScript and authored smoke syntax parse in isolated V8 PASS; actual Studio JS with mocked DOM/compiler successfully exercised theme comparison, alternate selection, Apply/Undo/Redo, owner-review reset and four distinct pages + navigation. NOT a real Chromium or checked-out Node run. Fresh checkout retry: github.com DNS resolution failed. Full release audit, optional Lead PHP parity (0 probes), 54 actual PNG/human signoff and real ZIP/CRC/SHA256 remain NOT RUN. D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135.


**Start:** open [index.html](index.html) from this folder in current Chrome or Edge. No build step, server, database, account, network, CDN, API key or npm install is necessary. All resources are local first-party files. Browser scripts use the **actual** Stage3 contract and registered manifests, not an invented client-only site schema.

## Browser workflow

1. Pick any of **12 sector kits** in the left catalog, or filter by industry.
2. Pick one of **12 original theme directions** (palette, card treatment, layout and typography).
3. Edit only confirmed owner information: company name, headline, description, CTA label, contact text and up to 12 real services. The owner remains responsible for verifying these.
4. Switch between all four pages: Home / Services / Approach / Contact. Select desktop (full), tablet (768px) or mobile (390px). Local noindex preview uses the same pages generated by the first-party compiler, with richer design CSS.
5. Optionally select one of **42 section compositions**. The richer standalone design is never silently added to CMS data: the editor additively inserts the selected Home fallback before the original CTA.
6. Undo/Redo: buttons or Ctrl/Cmd+Z outside text fields (Shift for redo). While typing, native input undo remains available. Export project/workspace to JSON, import them later, and download real `manufact-ai-site-v1`.
7. Inspect the owner checklist and download the D6 parity map or **complete D6 integration bundle**.

The browser does not keep owner data in cookies, localStorage or on servers. **Save JSON before closing the tab**; changes remain in the current tab only. The input file is processed in browser memory. Unsafe/unknown JSON and payloads larger than 1 MiB are rejected.

## Different downloads and what they mean

| Download | Format | Import intended for |
|---|---|---|
| Project JSON | `manufact-design-factory-v1` | D1 CLI `create --brief` and future editor |
| Workspace JSON | `manufact-design-factory-workspace-v1` | Reopening the same kit, theme, real data and selected D3 composition in Studio |
| CMS JSON | `manufact-ai-site-v1` | Existing Stage3 import path (after owner review, with current SDK validation) |
| Compatibility map | `manufact-design-factory-bridge-v1` | Human/API integration planning, NOT a CMS site document |
| Integration bundle | `manufact-design-factory-export-v1` | D6 validated importer: contains workspace, site-v1, design-spec, inspection and owner checklist |

CMS JSON export does **not** include unsupported CSS grid/layout, proprietary icon assets, unapproved media or false customer proof. Custom compositions are marked `integration_required`. The published PHP renderer will **not** necessarily look pixel-identical to this preview.

## Security design

- Preview uses an iframe with `sandbox="allow-scripts"` **without** `allow-same-origin` or top-level navigation rights. CSP disables network resources, form submission and base URL overrides. A tiny first-party script only relays selected page navigation via `postMessage`; the parent accepts messages solely from its own iframe and only for four allowlisted pages.
- All owner strings are escaped by the verified preview renderer. User content is never inserted as raw HTML or executed JavaScript.
- Real CMS output is validated by `sdk.validateSite`; unknown manifest properties and broken registered links reject an export.
- Bundle has no `eval`, dynamic import, CDN, fetch or remote stylesheet. The included `runtime.generated.js` contains exact Stage3 SDK, compiler, composition adapter, D6 bridge and eight first-party manifests.
- Generated previews are locally labeled **noindex**. Nothing publishes to WordPress, Hostinger or production.

## Regenerate the deterministic first-party bundle

When (and only when) the lead changes a relevant CMS contract/source, rebuild from the repo root:

```bash
node stage3/design-factory/bin/build-browser-bundle.cjs
node stage3/design-factory/bin/build-browser-bundle.cjs --check
node stage3/design-factory/tests/studio-smoke.cjs
```

Only output changed by this command is `stage3/design-factory/studio/runtime.generated.js`. Do not run it in other branches or combine with server changes without review. The test checks exact source drift.

## Focused smoke testing

```bash
# Pure Node SDK parity, 288 combinations, safe gallery preview and source bundle parity:
node stage3/design-factory/tests/studio-smoke.cjs

# Real Chromium interactive browser smoke: browse > theme > mobile > edit > gallery > undo/redo:
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/tests/studio-smoke.cjs
```

The Chromium test is optional in environments without a browser and clearly reports SKIP. At the time of this handoff, the browser workflow has been implemented but **its full Chromium E2E has not been executed successfully** in this environment; do not claim a browser PASS without running it on a checked-out repo. Do not confuse browser design-preview quality with CMS PHP output acceptance.

**Formal CMS acceptance unchanged:** Stage2 NO-GO, Stage3+ not accepted, 0/135 official criteria.


## Four-page sections editor · 27 October 2026

The Studio inspector now includes **«Секции всех страниц»** for Home, Services, Approach and Contact (select a page in the regular navigator). Every route exposes its real ordered CMS components; choose any of the 42 registered D3 compositions and add it before the original CTA, move sections up/down, remove optional sections, or restore only the currently open page. The original hero and CTA are protected. Each operation uses existing Undo/Redo and invalidates old owner review. No arbitrary HTML, invented section type, external assets or new SDK/PHP fields are introduced.

**Persistence:** legacy workspace `manufact-design-factory-workspace-v1` version 1 remains importable, including its optional single Home composition. Multi-page edits are stored in **version 2 of that workspace envelope** with `sectionPlan`: `manufact-design-factory-section-plan-v1` version 1, a complete four-page map of ordered `{id}` existing sections and `{id,composition}` inserted registered fallbacks. Maximum eight newly inserted compositions per page, stable IDs, no missing/duplicate/foreign IDs, no removal of original hero/CTA; changing sector kit intentionally resets the plan because base section mappings may change. Project-only JSON continues to hold owner facts, not the editor layout; use **workspace JSON** or the **18-file delivery ZIP** to preserve structural edits. D6 validates and recompiles the same plan as Studio. A new inserted composition has placeholder copy and therefore forces exported CMS `robots=noindex` even if the initial facts were previously signed off; this is not content approval or PHP layout parity.

The old single-Home composition selector remains available for legacy workflows, and coexists safely with a new per-page plan. This feature has been exercised with first-party GitHub source in isolated V8/DOM simulation, **not accepted by actual Chromium/PHP**; do not treat it as D7 completion.


## Owner section content editor · 27 October 2026

Click **✎ Edit** on any section row (Home, Services, Approach, Contact). The editor uses the **actual CMS component manifest** for its field labels and limits: editable headings/body text, CTA button labels and URLs; repeatable FAQ/service-card fields support add, move and delete within the manifest's min/max bounds. Draft input does **not** change the compiled website until **Save section**; **Cancel** discards it. Saving creates one Undo/Redo entry, updates the four-page preview and CMS/D6 JSON, and makes previously received client notes stale if their underlying site snapshot changed. Added sections and original kit sections are both editable. Media, arbitrary HTML, unknown slots, unsupported values and injected manifest fields are not editable here; media still needs the separately approved asset workflow.

For reproducibility, the existing **workspace v2** now accepts both **section-plan-v1 version 1** (order-only legacy, unchanged) and **section-plan-v1 version 2** (order plus strict typed `row.edit`). This is an evolution of the *Design Factory workspace* and does **not** change `manufact-ai-site-v1` or CMS manifests. Each edit carries only registered element `{slot,path,value}` changes and, where present, typed repeater item `{id,values}` lists. Stable CMS IDs and field types are validated against the first-party registry and the exact SDK; invalid links, field lengths, media/asset replacements, malformed item IDs or repeater bounds fail without replacing the active project. All content edits and unreviewed inserted compositions keep **CMS robots=noindex** even if old owner facts had been previously confirmed. No automatic publication/approval path is provided.

Saving **project.json** alone preserves the factual brief, not section edits. Use **workspace.json**, **D6 integration-v2.json**, or the **18-file delivery ZIP** for editable per-section copy. Standalone preview CSS still does not promise PHP layout parity. The new UI and real GitHub browser runtime were exercised in focused isolated V8/mock DOM, not in full Chromium or real PHP. Formal D7 remains open.


## 27.10.2026 — Four-page SEO and navigation editor

The Studio inspector now includes **05 / SEO и настройки страницы** on each of the four canonical routes. Click Home, Services, Approach or Contact in the existing navigator, edit the real CMS **page title, SEO title, SEO description and navigation/menu label** with validated limits (160/160/300/100), inspect an **offline live search-snippet approximation**, then explicitly **Save**, **Cancel**, or restore **this page's kit defaults**. Unsaved drafts survive switching pages in the open tab but are **not** included in preview, CMS JSON, D6 or the 18-file delivery archive until Save. Save/restore go through ordinary Undo/Redo and invalidate old owner approval. The page slug, route, stable ID, navigation hidden flag, and robots are deliberately **not editable** in this inspector.

**Workspace compatibility:** existing `manufact-design-factory-workspace-v1` v1 and v2 stay accepted. New `version:3` stores mandatory `pageSettings` in `manufact-design-factory-page-settings-v1` v1, all four canonical pages and four exact string keys per page. The optional older `sectionPlan` is preserved. First-party `lib/page-settings.cjs` checks both field limits and forbidden keys; D6 builds the CMS with page overlays, validates via the original Stage3 SDK and compares exact site JSON with Studio. Any changed metadata forces `robots=noindex` and requires **separate owner re-review** even if imported `project.ownerReviewConfirmed` was true; the editor never grants publishing permission. If all metadata match the kit defaults, ordinary original review logic applies. Switching kit or language clears saved per-page customizations to prevent carrying stale labels across different sites/languages. The 18-file handoff package accepts workspace v3 without changing its member count.

Focused functional checks used the **actual GitHub first-party browser runtime inside isolated JS/V8 and simulated DOM**, covering saved vs unsaved drafts, page switching, cancel/reset, D6 parity, old workspace preservation, 6 invalid metadata cases and noindex. Existing Node/Chromium smoke source is extended but **real checked-out Node suites, Chromium E2E, screenshots, human design review, PHP parity and formal D7 release remain unexecuted**. Use a real checkout for those, not a simulated success.

