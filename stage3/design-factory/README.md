> ⛔ **АКТУАЛЬНОЕ РЕШЕНИЕ ВЛАДЕЛЬЦА, 27.10.2026 — VISUAL NO-GO (2/10).** Дизайны Design Factory отклонены: однотипность, чрезмерная типографика, неправильные отступы. **Приоритет изменён: сначала изучить профессиональные источники и создать 3 разные качественные адаптивные сайты; только после явного визуального GO расширять каталог/интегрировать.** Обязательны [DESIGN-RESET-2026-10-27.md](DESIGN-RESET-2026-10-27.md), [DESIGN-REFERENCE-PLAYBOOK.md](DESIGN-REFERENCE-PLAYBOOK.md), [ЗАДАНИЕ ВТОРОМУ РАЗРАБОТЧИКУ](handoffs/DESIGN-REBUILD-SECOND-DEVELOPER-2026-10-27.md). Старые фразы «12 профессиональных тем», «42 композиции», «86%», «следующее — закрыть D7» **НЕ ЯВЛЯЮТСЯ** актуальным дизайн-заданием или оценкой готовности; ниже сохранена история. Lead провёл машинную проверку D7 в отдельной ветке: [CI SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40567001862), но визуальная приёмка владельцем FAIL. Никакого merge/deploy.

# Design Factory — D1–D7 independent engineering program

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


## 26 October — final D7 engineering pass

Functional checkpoint `0c00c5deb97d28827af571eb92ef7d1efd481523`. Added a regression for a subtle client-feedback race: edits update project state before the 120ms preview debounce, so Studio now recompiles the live project before every feedback import/export/resolution action. Old comments cannot be exported against the previous render. The existing Studio smoke now includes a real Chromium scenario for extracting and running `review.html` from the eight-file preview ZIP, round-tripping a client JSON report through Studio, and rejecting stale exports both immediately after a change and after the preview refresh.

V8 source-level checks and eight-file ZIP CRC/corruption checks passed. This is not full Node/Chromium acceptance: checkout DNS failed and the minimal headless Chromium probe timed out. D1–D6 are implemented (6/7, ~86% engineering progress); D7 remains open pending genuine Node audit, browser E2E, 54 screenshot captures and human review, PHP parity and a verified source-exact release ZIP/SHA256. Stage2 remains NO-GO, Stage3 unaccepted, 0/135. Continue only in the independent branch and directory.


## 26 October — full offline client feedback loop

**26 October 2026 — functional checkpoint `30e7e97cefe80fb32e5b4c5a1d20e01dd5924861`** (subsequent docs commit advances HEAD; fetch live branch SHA).

Completed a connected client-feedback loop in actual offline Design Factory Studio, instead of another narrow audit: Studio's **HTML-демо ZIP** now contains an eighth file, **`review.html`**, a self-contained, no-network Russian client review portal with working links to all four generated pages. The customer can add up to 30 page-tagged notes (change / issue / question, 900 characters each), remove them, download a JSON report, and later restore their own JSON to continue. The Studio inspector now includes section **05 / Замечания клиента**: import client JSON, view each note safely via textContent, open its page, mark or unmark it as resolved, and export the updated progress JSON. No browser storage, server API, CMS state edit or publication request.

The first-party `studio/client-feedback.js` is shared between portal generation and Studio validation. Reports use the closed **`manufact-design-factory-client-feedback-v1`** schema. A non-cryptographic, explicit **site-snapshot correlation key** is computed from the four compiled pages, actual selected theme, kit, locale and D3 composition. Studio refuses reports for other or changed snapshots; modifying content/theme does not silently migrate notes. The key is for matching only: it is **NOT a security signature, authenticated client identity, owner acceptance, signoff or publish permission**. Notes and resolution flags are untrusted suggestions; no guest input is executed as code. The external ZIP portal is static HTML/CSS and an inline trusted first-party script with restrictive CSP, no tracking, no CDN, no network. `studio/preview-zip.js` now canonically packages **8** files, validates all ZIP32 metadata and CRC before download, and retains safe size bounds and `robots=noindex`.

**Verification executed:** V8 JavaScript source syntax PASS. Isolated execution of the actual GitHub client portal JS with mocked DOM: add a note, download the real feedback JSON, restore it and check 8-file ZIP/CRC PASS. A separate isolated execution of actual GitHub Studio + feedback/packer modules with mocked compiler/DOM: generate 8-member archive, import valid feedback, render inbox, navigate to Services, mark resolved, export resolved report, change selected theme, and refuse stale feedback workflow PASS. Actual checkout **not available** (DNS `github.com` still fails from executor); full Node audit, actual Chromium live browser, 54-image human-reviewed matrix, Lead/PHP parity (0 probes), and full source-exact release candidate ZIP/SHA256 **NOT RUN**. This engineering milestone does NOT modify formal status: **D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135**. Scope strictly `stage3/design-factory/`; no main/SDK/PHP/workflows/hosting/production edits and no merge.

To try it: open Studio, export **HTML-демо ZIP**, unzip, open `index.html` for the site and `review.html` to collect feedback. Client downloads `design-factory-client-feedback.json`; import it back into Studio's inspector section **05 / Замечания клиента**. After implementing feedback, mark each item and download the progress report. Changes to the site snapshot invalidate the old feedback context; older ZIP documentation listing seven files is superseded by the current **eight-file** inventory.


## 26 October 2026 — one-click shareable offline HTML prototype ZIP

**Functional HEAD:** `509a00fb937c0a14443c81b65daa22cffacb2d02` (documentation commit comes afterward; read live branch HEAD on entry). Added a genuine one-click **HTML-демо ZIP** button to the offline Design Factory Studio. It packages four interconnected CMS-validated *preview* pages (`index.html`, `services/index.html`, `approach/index.html`, `contact/index.html`), `assets/preview.css`, bilingual `README.txt` and a strict `preview-info.json` (7 files total). Pages come from the current owner facts, selected theme and composition fallback via the existing first-party preview renderer; links and relative CSS paths remain local. All pages deliberately retain `robots=noindex`, including after owner review. This is **not** the PHP CMS visitor renderer, form collector, publishing, or owner authorization.

New self-contained `studio/preview-zip.js` writes **deterministic STORE-method ZIP32** entirely in the browser, with canonical allowlisted file paths, UTF-8 encoding, exact bounds (2 MiB per file / 8 MiB total), CRC32, local/central-directory parity and a built-in independent read-only archive inspector. Studio checks the ZIP before download. No CDN, network request, filesystem access or third-party package. `tests/studio-smoke.cjs` now contains real Node ZIP contract assertions and an optional Chromium export step, but these are *authored, not run on a checkout*.

**Executed focused evidence:** actual GitHub source parsed in V8; isolated same-module ZIP builder/inspector PASS including corruption rejection; ZIP fixture generated from the GitHub module was independently extracted using standard Python `zipfile` (7 readable entries, CRC error `None`, RU/Unicode content intact). A separate V8 simulation executed the actual GitHub `studio.js` and ZIP module with a mocked DOM/compiler: real click downloaded ZIP, validated all 7 members, and left owner project unchanged. This does NOT establish actual CMS content generation in a genuine checked-out repo, Chromium GUI or production acceptance. A one-shot checkout probe still failed due to `Could not resolve host: github.com`. Full Node release audit, Chromium E2E/54 real screenshots and human review, Lead PHP parity (0 probes), and full Design Factory release ZIP/source SHA256 remain **NOT RUN**. **D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135**. Git scope restricted to `stage3/design-factory/`, no merge or out-of-scope edits.

Use `studio/index.html` and click **HTML-демо ZIP**. Unzip to a local directory and open `index.html`. Unlike CMS JSON export, the seven-file preview archive is for visual client review only; it does not modify source files or publish to hosting.


## 26 October — new visual review Studio workflows

Functional checkpoint: ea4b4751d67bdaf0a8fac62d1c9b6058257a3b3c. Studio now has three connected capabilities: (1) live side-by-side previews of two different theme directions on the same owner data, page and device width; (2) explicit adoption of the compared theme through validated project mutation, undo/redo and automatic owner-review revocation, with prior theme retained as reference; (3) an overview of all four actual current-site pages in separate sandboxed 390px mobile iframes, each opening directly in the regular viewer. Full-screen focused workspace makes side-by-side comparisons useful; presentation-only actions never mutate project, site-v1 JSON, or D6 export. Alternate compilation clones the project. Existing local CSS/CSP, safe iframe sandbox and allowlisted page navigation are preserved. No Lead SDK/PHP/main/production changes.

Verification: modified JavaScript and authored smoke syntax parse in isolated V8 PASS; actual Studio JS with mocked DOM/compiler successfully exercised theme comparison, alternate selection, Apply/Undo/Redo, owner-review reset and four distinct pages + navigation. NOT a real Chromium or checked-out Node run. Fresh checkout retry: github.com DNS resolution failed. Full release audit, optional Lead PHP parity (0 probes), 54 actual PNG/human signoff and real ZIP/CRC/SHA256 remain NOT RUN. D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135.

Open `studio/index.html` offline. Compare two themes, adopt one, or inspect all four pages without changing the CMS export contract.


## D7 screenshot evidence: full PNG integrity (26 October 2026)

**26 October 2026 · D7 PNG integrity functional checkpoint:** `7810e6bee98b4a6d5509bf02a52024edc52ea843`.

Found and closed a genuine technical-evidence gap: prior screenshot capture/review only checked PNG signature and IHDR width/height. A truncated, tampered or internally corrupt PNG could have been blessed by a self-consistent report SHA256 and dimensions. New `lib/png-integrity.cjs` validates the **full PNG byte stream**: bounded input/chunk/pixel budget, critical chunk ordering, IHDR encoding and dimensions, per-chunk CRC32, contiguous IDAT, complete IEND/no trailing bytes, bounded zlib inflation, exact filtered scanline lengths (including Adam7 passes), and filter values 0–4. The verifier fails closed for corruption rather than relying on metadata. Integrated into `bin/visual-qa.cjs` (real capture before writing evidence), `lib/visual-review.cjs` (every original PNG byte re-checked at receipt verification), and Chromium pipe smoke. Regression cases in `tests/visual-review-smoke.cjs` now mutate the PNG while consistently updating its hash and evidence manifest; bad CRC, truncated bytes, trailing bytes, bad compressed data and invalid scanline filters must still be refused.

**Verification boundary:** same SHA256 Git blob as isolated Node v22.16.0 module checked with `git hash-object`; an independent real Node test of that **exact module** passed valid RGB/RGBA screenshots and rejects for truncation, incorrect CRC, trailing bytes, malformed zlib, invalid scanline filters and IHDR-only forgery. V8 JavaScript syntax parsing of five changed modules/smokes PASS. These focused checks are **not** a complete checked-out Node release audit or actual Chromium run; the repository checkout remains unavailable in the previous executor (GitHub DNS failure). Added smoke assertions have **not** run in genuine checkout. Real 54 PNGs / human review: NOT RUN; PHP parity: 0 probes; release ZIP/CRC/source-byte parity and actual archive SHA256: NOT RUN. D7 OPEN, Stage2 NO-GO, Stage3 unaccepted, 0/135. No CI/workflow/Lead/main/hosting/production edits or merge.

The offline evidence generator and receipt verifier now share the same strict PNG inspector. This replaces header-only dimension checks; screenshots with broken internal bytes fail even when the manifest hashes and dimensions are adjusted to match. Release status unchanged.


## Latest D7 reviewer workflow — 26 October 2026

**26 October 2026 · latest functional checkpoint:** `69556a19b887f4dae2ec32328fc2ae487dbaa3fe` (read live branch HEAD on arrival). The offline D7 `visual-review.html` has a substantial usability upgrade: all/pending/approved/rejected image filters, next-pending navigation, private work-in-progress JSON draft export/import, and defect export with diagnostic notes. Draft import checks the complete list of 54 screenshot file names and SHA256 values plus the visual evidence hash, rejects duplicates/foreign/stale/oversized JSON (256 KiB maximum) before changing any decisions, and **always clears the five manual-review attestations** after restoring. It preserves the original v2 review receipt and fail-closed verifier; neither draft nor defect report is approval, identity authentication or publish authorization. No network/browser storage is used by the tool.

**Executed, narrowly:** V8 parsed the inline script; a simulated 54-card browser DOM exercised the filter, rejected-note defect gate, draft export, valid restore, manual-check reset, and stale-evidence rejection without partial mutation. The existing smoke source contains regression assertions but **the real checked-out Node suite has NOT run**. One fresh `git ls-remote` returned `Could not resolve host: github.com`; checkout unavailable. PHP parity: 0 probes; Chromium E2E: NOT RUN; 54 real PNGs + human review: NOT RUN; actual ZIP/CRC/source-byte/SHA256: NOT RUN. **D7 OPEN, Stage2 NO-GO, Stage3 unaccepted, 0/135**. No edits outside `stage3/design-factory/` and no merge.

The reviewer can pause a 54-image inspection, save `visual-review-draft.json`, restore it with identical PNG evidence, and download `visual-review-defects.json` for fixes. Manual checks must be reconfirmed. This is a functional source milestone rather than D7 acceptance.


Independent Stage3 Design Factory. **D1–D6 are implemented; D7 final quality gates are still open**. This does not constitute Stage3 acceptance or production release. Branch: `feature/stage3-design-factory`. Only writable subtree: `stage3/design-factory/`.

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

## Previous D7 environment audit — 25 October 2026

Audit-start HEAD was `bb219d64a58d590fbf2f806835e996a4277aee7d`, a documentation-only commit whose parent and functional/source checkpoint is `75884b7f794fa1dabc775d802613c38979eff4b8`. The six paths changed since that checkpoint are all documentation inside this subtree.

A genuine GitHub checkout attempt failed with `Could not resolve host: github.com`. Node 22.16.0 and PHP 8.4.24 are installed, but there is no checkout in the execution workspace; stable Node D7 suites and PHP parity were not run. GitHub reports zero workflow runs for this branch and zero check runs for the audit-start HEAD. Chromium's one-shot minimal headless probe timed out after 15 seconds (exit 124), so Studio E2E, the 54-image matrix and human review remain outstanding. No release ZIP, CRC/source-byte parity evidence or real ZIP SHA256 exists.

**D7 is still OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135.** These are explicit environment blockers, not passes. Do not repeat attempts unless the environment/connectivity has changed.

## Previous engineering checkpoint — 25 October 2026

**Latest functional/source commit:** `75884b7f794fa1dabc775d802613c38979eff4b8`. The recent work hardened Studio editing and release tooling:

- Focus retention and debounced preview updates; failed imports/state updates cannot silently look successful.
- Shared repository-safe output path validation, including symlinked-parent and final-symlink protection.
- Deterministic ZIP inventory ordering and a length-framed digest over exact source paths and bytes.
- Exact visual evidence matrix verification: 54 screenshots for the full set and 30 for quick mode; incomplete, duplicate, unexpected or wrong-sized images prevent matrix completion.

These changes and their smoke assertions are committed, but they have **not** been validated in a genuine Node checkout for the latest HEAD. GitHub Actions currently has no run/check/status evidence for this branch. The last known checkout attempt failed because DNS could not resolve GitHub. PHP parity remains unrun, Chromium previously timed out, no screenshots were captured or human-reviewed, and no real ZIP or archive SHA256 exists.

**Release state remains unchanged:** D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135 mandatory criteria. Use the handoff in `handoffs/NEXT-CHAT.md` for the three large closure blocks.
## D7 release-candidate pipeline

Run on a complete checkout with Node.js 20+:

```bash
node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-release-candidate
```

This creates `release-candidate.json`, the full Node audit report, and a candidate ZIP verified independently against exact source bytes. Add `--chromium /usr/bin/chromium` for browser QA and 54 real screenshots; add `--lead-sdk` and `--lead-php` to run Lead JS and six PHP markup-parity probes. The v2 review receipt must bind all 54 images and confirm manual review of all 42 D3 compositions. Exit 3 is a useful engineering candidate with gates still open—not a release PASS. Full Node/browser/PHP/ZIP execution remains pending until run on a working checkout/runtime.

## Working features

The compiler reads real first-party Stage3 manifests, calls the existing Stage3 SDK (contract.cjs), and generates **four-page manufact-ai-site-v1 documents**, with routes, SEO, navigation, typed elements, stable IDs, safe links, appearance, and validated CMS theme. It supports three distinct composition archetypes (agency, industrial, consulting), RU and EN, optional real owner facts, and an empty brief with truthful placeholders. Unknown keys and invalid values are refused.

D2 contains 12 closed-catalog visual directions with distinct layout, type, card and geometric tokens. The current-source 288-combination CMS validator matrix passed in isolated V8; actual Node checkout and three-viewport Chromium visual acceptance remain open.

The CLI can create, validate and inspect CMS site JSON. It can export a standalone, truly browsable **multi-page visual preview** as HTML/CSS, with responsive grids and reduced-motion support, using no network, CDN or other runtime. It clearly labels the preview, adds noindex, and does **not** claim the existing PHP renderer can reproduce its custom layout.

## Commands (run from repository root)

    node stage3/design-factory/bin/design-factory.cjs help
    node stage3/design-factory/bin/design-factory.cjs kits
    node stage3/design-factory/bin/design-factory.cjs create --kit industrial --theme technical --lang en --out /tmp/df-site.json
    node stage3/design-factory/bin/design-factory.cjs validate /tmp/df-site.json
    node stage3/design-factory/bin/design-factory.cjs inspect /tmp/df-site.json
    node stage3/design-factory/bin/design-factory.cjs create --brief stage3/design-factory/examples/agency-ru.json --out /tmp/df-agency.json
    node stage3/design-factory/bin/design-factory.cjs export stage3/design-factory/examples/agency-ru.json /tmp/df-new-preview
    node stage3/design-factory/tests/smoke.cjs

Requires Node.js >=20. No npm install. New export directory must not exist; no overwrite. Create --out must target a new file. Create without --out writes site-v1 JSON to stdout; missing-owner-fields summary goes to stderr. Optional --project-out saves an editable design project. CLI JSON input is limited to 1 MiB and refuses symlink files.

Open the new preview directory's index.html in a browser. Its Services, Approach and Contact pages are real linked HTML files. Native FAQ accordions work without scripts.

## Exported directory

- site-v1.json: supported subset for existing CMS, validated via real SDK
- project.json: original versioned Design Factory project, reusable for edits
- design-spec.json: theme, archetype, CMS supported values, and explicitly integration_required layout differences
- owner-checklist.json: missing verified facts; still requires human approval
- inspection.json: real SDK site inspection
- index.html, services/index.html, approach/index.html, contact/index.html: self-contained pages for standalone design inspection, NOT the current PHP visitor implementation
- assets/preview.css: deterministic local styles, responsive and prefers-reduced-motion

## Strict project contract

Format: **manufact-design-factory-v1**, version: **1**. Exact top-level keys: format, version, kit, theme, language, facts. Kits are agency, industrial, consulting, local-services, saas, logistics, architecture, education, portfolio, restaurant, repair and nonprofit; themes are editorial, technical, minimal, noir, brutalist, atelier, verdant, oceanic, copper, plum, cobalt and mono; languages are ru/en.

The facts object accepts ONLY these optional fields:
- siteId: 3–80 lowercase letters/digits/hyphens (starts with letter)
- title: owner-provided brand/site title, max 120
- headline: verified hero statement, max 120
- description: verified description, max 400
- ctaLabel: CTA label, max 120 (must still satisfy real CMS field limit)
- contactText: explanatory text, max 400, not an invented contact address
- services: up to 12 objects with exact keys title (max 120) and description (max 320)

Example source projects: examples/agency-ru.json, examples/industry-en.json, examples/consulting-ru.json. Three independently precompiled four-page CMS documents are also provided as examples/generated-agency-site-v1.json, examples/generated-industrial-site-v1.json and examples/generated-consulting-site-v1.json. They are **illustrative**. Owner facts must be verified, not treated as real company claims.

An entirely missing project compiles to agency/editorial/RU with placeholders. Closed version 0 input (same fields) migrates to version 1; unknown/future versions are refused. Round-trip JSON does not introduce unknown CMS keys.

CMS service-grid requires at least 2 cards. If the owner lists exactly one service, a visibly marked second **placeholder** is added (not a claimed real service). Owner-checklist flags missing facts. The generated site still requires owner review before any publication; the checker cannot independently verify facts.

## Compatibility and integration

| Feature | D1 output | Status |
|---|---|---|
| Site model | Existing manufact-ai-site-v1 and schemaVersion 1 | supported |
| Components | Real manifests through sdk.sectionFrom and sdk.validateSite | supported |
| SEO/navigation/routes | Existing page.seo, page.navigation, safe local URLs | supported |
| Site theme | Existing background/surface/text/primary/font/maxWidth | supported |
| Section appearance | Existing surface/spacing/align enums | supported |
| Images | Empty registered media slots, no invented asset bytes | manual owner media required |
| Enhanced visual preview | Standalone first-party CSS layout | integration_required for PHP parity |
| Custom type hierarchy, grids, picture variants | Design preview only | integration_required |
| Lead forms | Not silently inserted or submitted; real collector needs server configuration | not in D1 |
| Accounts, publishing, rollback | Not performed or simulated | outside scope |

The preview escapes all owner text, uses no inserted user HTML/JavaScript, and never runs code supplied by project facts. Its noindex pages are for offline checking only. It is not a release export, is not proof of working forms, and must not be deployed as a production CMS site without separate integration.

D1/D2 smoke: `tests/smoke.cjs` implements Node contract/CLI/static preview coverage for 288 kit × theme × language combinations, with 12 distinct CSS outputs. D5 Chromium E2E now covers browse/edit/undo/redo and browser-download JSON validation; it still must be executed on a functioning browser. Do not confuse authored tests or isolated V8 checks with actual Node/Chromium acceptance.

Formal status remains Stage2 NO-GO #5–#9; Stage3+ unaccepted; **0/135** officially accepted criteria.

## D3 and D4 — usable new workflows (24 October 2026)

Beyond the D1 compiler and D2 theme catalog, this branch now also contains **42 designed compositions** and **12 real four-page sector kits**. All code is still in stage3/design-factory/ and uses only Node standard libraries and approved Stage3 read-only SDK/manifest imports.

### Section composition showcase — D3

    node stage3/design-factory/bin/design-factory.cjs compositions
    node stage3/design-factory/bin/design-factory.cjs compositions gallery
    node stage3/design-factory/bin/design-factory.cjs showcase /tmp/df-compositions-new
    node stage3/design-factory/bin/design-factory.cjs compose hero-center --out /tmp/df-composition-site.json
    node stage3/design-factory/bin/design-factory.cjs compose gallery-mosaic --out /tmp/df-gallery-fallback.json --report /tmp/df-gallery-parity.json
    node stage3/design-factory/tests/compositions-smoke.cjs

The new local showroom is a real HTML/CSS page with 42 original responsive compositions across 14 categories, keyboard focus, semantic placeholders, native FAQ, scroll-snap galleries and reduced-motion. `compose` produces a valid existing CMS site-v1 document using its real registered component fallback. The richer visual composition is NOT a new PHP manifest or visitor renderer, and 8 integration-required component proposals are in proposals/ADAPTERS.md. More details: catalog/COMPOSITIONS.md.

### Sector gallery — D4

    node stage3/design-factory/bin/design-factory.cjs kits
    node stage3/design-factory/bin/design-factory.cjs kit-gallery /tmp/df-sector-new
    node stage3/design-factory/tests/kits-smoke.cjs

Opening /tmp/df-sector-new/index.html lets you browse 12 RU and 4 EN self-contained sample websites with a total of **64 real HTML pages**. Files include actual per-site theme CSS, reviewed site-v1 JSON, and a catalog-manifest.json with SHA256 for each site's four pages, CSS and CMS JSON. All 12 project sources live at examples/projects/. You can recompile any of them with the same create/export commands. Never overwrite an existing destination; the CLI refuses it.

D4 source and 12 registered sector kits: catalog/kits.cjs and catalog/KITS.md. Six archetypal page sequences, explicit demo-only industry copy and 4 bilingual sector definitions. Generated default service labels explicitly say they must be verified; neither mock customer proof nor real email/phone/prices are invented.

### Status distinction

- D1: real Stage3 contract and compiler implemented.
- D2: 12 genuinely different theme treatments and contrast guards, actual Chromium visual QA pending.
- D3: 42-pattern implementation, semantic CMS mapping and offline showcase built; 3-viewport browser QA pending.
- D4: 12 kits / 64 exportable pages and SHA256 gallery built; 3-viewport browser QA pending.
- D5/D6: offline Browser Studio and versioned integration bridge implemented, awaiting actual Chromium and lead import review. D7: test tooling and ZIP builder implemented; final checked-out Node execution, visual acceptance and ZIP artifact still pending.

**Honest verification:** evaluated the actual Stage3 SDK/manifests in the isolated JS runtime: 288/288 industry-theme-language site documents are valid and 42/42 D3 compositions map to valid registered CMS fallbacks. Full Node filesystem smoke scripts were authored but have not been executed on a checked-out repository in this environment. Local Chromium launch was attempted and did not complete; no browser PASS is claimed. Do not equate completed modules with production acceptance.

## D5 and D6 — full browser editor and versioned CMS integration

**D5 Browser Studio is implemented** at [studio/index.html](studio/index.html). Open that page directly in Chrome/Edge. No server, npm, CDN or network is required.

The interface provides: 12-kit catalog search, 12 working theme switches, four real pages, desktop/tablet/mobile preview, owner title/headline/description/CTA/contact/services editing, the full 42-pattern selection, Undo/Redo, validated project/workspace imports and downloads, CMS-compatible site-v1 JSON and a complete D6 integration package.

The browser runs the actual existing Stage3 SDK and real component manifests inside a deterministic first-party `studio/runtime.generated.js` bundle. To check source parity:

    node stage3/design-factory/bin/build-browser-bundle.cjs --check
    node stage3/design-factory/tests/studio-smoke.cjs

To regenerate the bundle after *reviewed* first-party source changes, call the same builder without `--check`. It writes only inside the Design Factory subtree. Refer to [studio/README.md](studio/README.md) for the owner-facing walkthrough, security model and optional Chromium E2E command.

**D6 Integration Bridge is implemented as a standalone versioned exporter/importer**, not a production publish path:

    node stage3/design-factory/bin/design-factory.cjs bridge-export stage3/design-factory/examples/projects/saas.json /tmp/new-d6-bundle.json
    node stage3/design-factory/bin/design-factory.cjs bridge-validate /tmp/new-d6-bundle.json --out /tmp/new-cms-site.json
    node stage3/design-factory/tests/bridge-smoke.cjs

A D6 package is `manufact-design-factory-export-v1`: source workspace, valid `manufact-ai-site-v1` site, design-spec, owner checklist, link inspection and explicit compatibility matrix. On import it **recompiles and compares** the package to detect silent tampering with either site data or unsupported property claims. This is not a cryptographic signature or owner permission check. See [INTEGRATION.md](INTEGRATION.md) for the complete supported / integration_required / blocked matrix.

**Verification boundary (24 October 2026):** the generated browser runtime has been executed in an isolated JavaScript environment and validated 288/288 D6 export/import combinations, including a photo-gallery fallback and tamper rejection. The full Node filesystem and interactive Chromium scripts are committed but not yet reported as executed PASS on a checked-out repository. The old Chromium launch blocker remains pending. D2/D3/D4/D5 final visual QA and D7 package/acceptance are separate outstanding work.

No merges to main or lead branch; no CMS SDK, PHP, Studio or production edits. Stage2 remains NO-GO, Stage3+ not accepted, 0/135 official criteria.

## D7 release verification, screenshots and portable ZIP

**New:** `QUALITY-GATES.md` is the operational release checklist and `handoffs/NEXT-CHAT.md` is the first document for the next independent developer chat. D7 tooling is implemented; checked-out Node, Chrome visual and manual acceptance gates remain open.

On an actual repository checkout:

```bash
# Source drift (must match the actual Stage3 SDK + manifests):
node stage3/design-factory/bin/build-browser-bundle.cjs --check

# Six integrated Node contract, CLI, export and deterministic ZIP suites:
node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-release-new.json

# Real interactive browser acceptance with a locally installed Chromium:
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/tests/studio-smoke.cjs

# Screenshots for 12 themes on desktop/tablet/mobile + showroom and sector examples:
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-visual-new

# Portable ZIP including offline browser Studio, all source and documentation:
node stage3/design-factory/bin/package-release.cjs /tmp/ai-site-cms-design-factory-new.zip
node stage3/design-factory/tests/package-smoke.cjs
```

Output paths must not exist in advance: no accidental replacement of owner data. The ZIP includes only this independent subtree. **Opening its `studio/index.html` works independently offline; running the CLI or test suites from the ZIP still requires the original repository's unchanged Stage3 SDK and component manifests.** A ZIP-builder script in the repository is not the same thing as an already published downloadable ZIP.

### Latest quality correction

The Stage3 service-grid manifest requires two cards. When an owner supplies exactly one real service, the second card is visibly marked as an unverified example, and `ownerChecklist.readyForPublish` stays **false**; the generated content must not silently be considered publish-ready. Tests now assert this owner-safety behavior rather than one arbitrary industry-specific placeholder phrase.

**Do not mark all 7/7 accepted or Stage3 GO** until real Node/Chromium evidence, representative visual inspection, owner content review and the lead integrator's approval are complete. Current Stage2 NO-GO, Stage3 unaccepted, 0/135 formal mandatory criteria remain unchanged.

## Latest D7 engineering checkpoint — 24 October 2026

After checkpoint `4015fd1fbbb31cbc3b74e0141e2c9edb68183807`, the isolated developer branch received:

- Owner-readiness safeguard: Studio's initial service names/descriptions and obvious "Example (verify)" placeholders no longer count toward two completed services. Manually confirmed real services still allow the data-completeness checklist to become ready, while `requiresOwnerReview` remains `true`. A Node regression case and browser-bundle mirror were added.
- Consistent 44px touch hit targets in Studio navigation/controls/service deletion and exported site navigation, detail accordion headings and inline CTA text links.
- Expanded browser E2E: four real downloads (CMS site-v1, versioned D6 bundle, editable project and workspace) must parse and agree with the first-party SDK. Existing interactions remain covered.
- Stronger portable ZIP test: confirms central directory counts, names, CRC, compressed/uncompressed lengths and local offsets in addition to existing deterministic hash/no-overwrite/deflate checks.
- The offline `studio/runtime.generated.js` was rebuilt from exact first-party source and read-only registered manifests. Source-vs-bundle equality confirmed by rerunning the unchanged deterministic builder in its `--check` mode via an in-memory V8 filesystem harness.

**Actually observed in current-source in-memory V8:** 288/288 site-v1 contract validations and internal link inspections; 288/288 D6 complete round trips; 42/42 registered composition fallbacks; placeholder check refusing misleading completeness; modified D6 package rejected; browser bundle parity PASS. This is not a real filesystem-based Node checkout or a Chromium interaction test.

**Still blocked:** local `git ls-remote` fails to resolve GitHub, Chromium hangs even for a minimal data URL (also when rerun with restricted-process flags), and the branch has no GitHub Actions workflow runs. Consequently checked-out Node suites, responsive screenshots/manual review, final ZIP bytes and verified ZIP SHA256 are **not** claimed. See `PROGRESS.md`, `QUALITY-GATES.md` and `handoffs/NEXT-CHAT.md` for the executable gate plan. Do not deploy, merge or call Stage3 accepted on this evidence.

## D7 human-review and JSON interoperability additions

The D6 integration package now survives reserialization with a different order of JSON object members. `bridge.validateBundle()` still recompiles the complete package and rejects changed owner/site values, modified page SEO, unexpected properties, reordered arrays and invalid values. The negative and positive cases are documented in `tests/bridge-smoke.cjs`; PHP/Studio import remains a separate lead-integration step.

For final visual acceptance, `bin/visual-qa.cjs` generates `visual-review.html` alongside `visual-evidence.json`, original PNGs and offline sites. Open the local review HTML to inspect the desktop/tablet/mobile themes, D3 showroom and RU/EN sector sites. This is an **unapproved human-review worksheet**, never a screenshot PASS. It displays each screenshot's actual measured dimensions and flags capture errors. Inspect the entire D3 showroom and actual browser interactions separately, because one viewport image does not inspect every composition on a long page.

The ZIP smoke suite now compares extracted archive members **byte-for-byte to every source file** and validates the complete source inventory. These improvements were checked for syntax and isolated in-memory contract behavior; the full Node checkout, Chromium and actual final ZIP artifact have not been produced in the current environment. See `QUALITY-GATES.md` for exact commands and honest gate status.

## Optional Design Graph integration candidate — 24 October 2026

The lead developer's branch now exposes a newer typed CMS `designGraph` contract. A standalone candidate adapter at `lib/lead-design-graph-adapter.cjs` converts a selected D3 composition into actual host-editable graph nodes without modifying or replacing Design Factory's **existing** D6 exports. See [`proposals/LEAD-DESIGN-GRAPH.md`](proposals/LEAD-DESIGN-GRAPH.md) for precise editability, missing pixel-parity features and lead setup.

In isolated V8 against the actual lead SDK/Design Graph source, **504/504** candidate graphs validated and rendered across 42 patterns × 12 themes, and **288/288** original sites remained compatible. Neither the optional Node checkout smoke nor PHP/Chromium/manual QA has passed in this environment. The formal Stage2/Stage3 gates and D7 release status remain unchanged.

## Host-editable D3 variation update

The optional newer-lead-SDK bridge now creates 504 distinct typed Design Graph documents, with editable fonts, grids, responsive spans, gradients, card treatments, native icons, motion and 48px CTA targets. Direct owner-like edits to generated JSON re-render correctly in isolated live-source V8, without re-generating via AI. Full checkout Node, PHP validation, Chromium screenshots, ZIP and formal release remain unverified. See proposals/LEAD-DESIGN-GRAPH.md and QUALITY-GATES.md.

## Semantic CMS content in optional lead graph candidates

The newer-host graph adapter now exports all selected service/FAQ/benefit items as distinct editable nodes and preserves user-supplied hero and service information (the verified original D6 bundle is not modified). A provenance map connects graph text/links with source CMS slots and repeater items; the lead may invoke `reconcileSemantic` explicitly after a normal CMS content edit to update node text without losing its designer-controlled styles. No automatic two-way binding or publish rights are implied. Unfilled gallery output remains an honest upload prompt. See `INTEGRATION.md` and `proposals/LEAD-DESIGN-GRAPH.md` for precise API and limitations.

Expanded source-level isolated V8 lead smoke PASS: 504 graph candidates/renders, 12-owner-service scenario, FAQ, safe empty gallery, escaping, provenance reconciliation. Full checked-out Node/PHP/Chromium and final ZIP gates remain open, Stage2 NO-GO / Stage3 not accepted / 0/135.

## Final independent-developer checkpoint

Conflict-safe semantic reconciliation now has a read-only `inspectSemanticSync()` plan (changes, preserved graph edits, conflicting two-sided edits) and an explicit `reconcileSemantic()` that refuses destructive content overwrite. A successor handoff and first-chat message are in `handoffs/SESSION-CLOSEOUT-2026-10-24.md` and `handoffs/START-NEXT-CHAT.md`. The source-level 504/504 lead SDK+graph smoke passed with conflict regressions; real checkout Node/PHP/Chromium/ZIP and owner visual approval remain unverified. Do not treat source-level checks as D7 acceptance.

## 25 October — rebuild preview, structured visual diff and component-family coverage

The optional lead adapter now exposes `inspectRebuild()`, a read-only preflight for the explicit AI-free `rebuildHostCandidate()` path. It gives Studio a structured list of graph-only copy at risk (node/property and old/new values), and predicts preserved/created/reset/removed node IDs. A destructive preflight remains `canApply:false` until the authenticated host separately obtains owner confirmation. The simulated report is not an authorization token and never saves or publishes.

Regression suite expansion: 504 distinct composition/theme candidates were validated and rendered; all 504 also passed a no-op structural rebuild and read-only rebuild preflight without changing markup or the source candidate. Additional tests cover source refresh in all 8 registered component families, manual copy preservation, CMS/Graph conflicts, exact deletion confirmation, style bleed on reorder, preview immutability and bounded input sizes.

These results ran in isolated V8 using real GitHub JS sources with emulated Node core modules; they are **not** a real checkout/Node, PHP or Chromium run. D7 remains OPEN pending the actual Node release audit, PHP parity, 54 screenshot captures with human review, and a real source-matching ZIP with SHA256.

## 25 October — structural rebuild cannot silently erase owner work

The optional Lead adapter now detects owner-deleted canonical nodes, custom nodes dropped by rebuild, custom node IDs colliding with newly created CMS nodes, and owner-authored styles/media properties that would be lost with a removed/reset node. The typed `DF_REBUILD_OWNER_REVIEW_REQUIRED` error carries exact acknowledgement IDs. Read-only `inspectRebuild()` distinguishes the edited graph from the predicted rebuilt graph and returns before/current/rebuilt values.

Media `assetId` and alt edits survive if their CMS source is unchanged; divergent two-sided edits fail closed. The host remains responsible for owner authentication, revision locking, explicit confirmation, undo, visual review, persistence and publishing.

Latest isolated-source evidence: 504/504 graph validations, renders, no-op rebuilds and preflights; 8 CMS component-family refreshes; 8 loss-aware structural/style/media groups. This is not actual Node/PHP/Chromium or release-ZIP acceptance. D7 remains OPEN.
