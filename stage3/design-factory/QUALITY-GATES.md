# D7 · Final quality gates and evidence

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


## 26 October — connected D7 regression closeout, committed implementation

**Product/source checkpoint:** `3ead7d1d2d75b58f6146aedb3bbaac93af82e035`. Removed two obsolete static assertions that guaranteed `studio-smoke.cjs` failure after the fresh-feedback-state fix. The current Node smoke expects `feedbackTool.validate(incoming,fresh)` and the exact `{throwOnError:true,preserveReview:true}` import contract. Verified all **29** current source-string assertions of the same type against the committed Studio source: **zero stale expectations**. This checks source contract alignment; it is **not** execution of the Node smoke.

End-to-end review/import workflow protections now share a clear rule: asynchronous `File.text()` must never apply old JSON after newer user edits or a newer chosen import. Studio tracks both owner edits and per-import serials; the exported HTML-demo portal tracks notes/reviewer mutations and draft serials; the standalone 54-image visual-review UI tracks human radio/note/checkbox mutations and draft serials. Rejected stale draft attempts do not modify decisions. Normal imports still work; human review attestations are never restored from JSON.

**Executed isolated evidence:** 6/6 JS syntax passes, 9/9 behavior cases using current GitHub source (Studio 4, client portal 3, visual review 2) and 29/29 Studio static expectation matches. Real Node checkout/audit, real Chromium, 54 image inspection, all 42 compositions reviewed by a human, real PHP six probes, and source-exact ZIP/CRC/SHA256 remain **NOT RUN**. Formal status **D7 OPEN**; none of these focused passes upgrades Stage2 NO-GO / Stage3 UNACCEPTED / 0/135.


## 26 October — async import stale-state regression evidence

**Source commit `4bf19ac4a3a62e9136e2b55fc9a815321a1eebcc`.** Studio's project JSON and client-feedback JSON imports now check project/feedback revision freshness *after* asynchronous `File.text()` completes. Live input edits invalidate pending imports immediately, even before the 120ms preview update or blur/history; Undo/Redo, other imports, and feedback resolutions also invalidate older reads. The imported JSON is not allowed to silently replace more recent work.

**Actually passed:** real committed Studio and smoke source V8 parse, assembled Chromium probe syntax parse, and **5/5 isolated V8 import behavior cases** using actual committed function bodies with controlled async file reads and mocked browser/compiler. The real Chromium tests are only authored, NOT executed. D7 release acceptance stays OPEN until the full checkout/Node/browser/PHP/54-image/human-review/source ZIP gates are genuinely performed.


## 26 October — current execution attempt and audit semantics

The live branch HEAD is `62c4ab22ff65c79d7e4194ca73680de3b2fa61d0`. One checkout attempt failed before repository files could be placed on disk: `git ls-remote https://github.com/manufact-test/ai-site-cms.git refs/heads/feature/stage3-design-factory` returned `Could not resolve host: github.com`. The GitHub API shows no Actions runs, check runs or commit statuses for this HEAD. No further identical network retries should be made until the environment changes.

**Local runtime diagnostics:** Node `v22.16.0`, `/usr/bin/chromium`, and PHP `8.4.24` are installed, but a search of common workspace locations found no local `.git` checkout. One minimal Chromium smoke probe (`--headless --dump-dom` on a data URL) timed out after 15 seconds (exit 124), produced no DOM output, and logged DBus/zygote errors. This is an environment probe, not a Design Factory product test. Do not repeat this same probe until the execution environment changes.

**Actual results in this pass:** no full checkout, so `release-audit.cjs` was **NOT RUN**. Chromium E2E, 54-image capture and human review, PHP parity (0 probes), final ZIP CRC/source-byte parity and actual SHA256 are **NOT RUN**. Source files were reviewed read-only; no product source was changed.

**Important audit interpretation:** `release-audit.cjs` requires Node >=20 and a full repository checkout. It runs 10 checks without Chromium (browser-bundle parity, eight Node smoke suites, source inventory stability), or 11 with `--chromium`; the latter requires `DF_CHROMIUM_BIN`. Without the Chromium option, `browserPassed` and `automatedChecksPassed` remain false by design. Exit code **3** means Node checks passed but the Chromium gate was not requested/open; it does not mean full D7 acceptance. The audit itself does not run PHP parity, human review of 54 screenshots/42 compositions, or the final release ZIP verification.

**D7 remains OPEN.** On a working checkout, run the audit with a new output path, inspect the complete report and each check, then run real Chromium E2E/capture, perform the required human review, run all six PHP probes with real Lead inputs, and build/independently verify the deterministic source-exact ZIP and SHA256. Stage2 remains NO-GO; Stage3 remains unaccepted; 0/135.


## 26 October — feedback debounce regression and final gate status

Functional source checkpoint `0c00c5deb97d28827af571eb92ef7d1efd481523`. `studio.js` now binds every feedback action to a fresh compilation of the live project, preventing a stale report from being exported in the short window before the debounced preview refreshes. `tests/studio-smoke.cjs` now specifies a genuine Chromium end-to-end test for the generated `review.html` portal and its complete JSON round-trip through Studio, including immediate stale-export refusal.

**Executed:** V8 parsing and source-level report/snapshot validation; eight-file ZIP build + CRC inspection and corruption rejection. **Not executed:** actual checkout Node suite/release audit, Chromium E2E, 54 PNG capture/human review, PHP parity, final source-exact ZIP/SHA256. One checkout attempt failed because `github.com` DNS was unavailable; one minimal Chromium headless probe timed out. Do not record either as a product test failure or as a pass.

**Acceptance remains OPEN.** Engineering roadmap progress is D1–D6 implemented (6/7, about 86%); D7 is not complete. The release-candidate tool must report `readyForLeadReview=true` only when its actual required gates pass. Formal Stage2 NO-GO, Stage3 unaccepted, 0/135. Next action is a single genuine checkout/audit attempt in a usable environment, then real browser/visual/PHP/archive evidence; do not add another cosmetic feature or loop on the same environment failure.


## 26 October · client-review report / feedback acceptance checklist

**26 October 2026 — functional checkpoint `30e7e97cefe80fb32e5b4c5a1d20e01dd5924861`** (subsequent docs commit advances HEAD; fetch live branch SHA).

Completed a connected client-feedback loop in actual offline Design Factory Studio, instead of another narrow audit: Studio's **HTML-демо ZIP** now contains an eighth file, **`review.html`**, a self-contained, no-network Russian client review portal with working links to all four generated pages. The customer can add up to 30 page-tagged notes (change / issue / question, 900 characters each), remove them, download a JSON report, and later restore their own JSON to continue. The Studio inspector now includes section **05 / Замечания клиента**: import client JSON, view each note safely via textContent, open its page, mark or unmark it as resolved, and export the updated progress JSON. No browser storage, server API, CMS state edit or publication request.

The first-party `studio/client-feedback.js` is shared between portal generation and Studio validation. Reports use the closed **`manufact-design-factory-client-feedback-v1`** schema. A non-cryptographic, explicit **site-snapshot correlation key** is computed from the four compiled pages, actual selected theme, kit, locale and D3 composition. Studio refuses reports for other or changed snapshots; modifying content/theme does not silently migrate notes. The key is for matching only: it is **NOT a security signature, authenticated client identity, owner acceptance, signoff or publish permission**. Notes and resolution flags are untrusted suggestions; no guest input is executed as code. The external ZIP portal is static HTML/CSS and an inline trusted first-party script with restrictive CSP, no tracking, no CDN, no network. `studio/preview-zip.js` now canonically packages **8** files, validates all ZIP32 metadata and CRC before download, and retains safe size bounds and `robots=noindex`.

**Verification executed:** V8 JavaScript source syntax PASS. Isolated execution of the actual GitHub client portal JS with mocked DOM: add a note, download the real feedback JSON, restore it and check 8-file ZIP/CRC PASS. A separate isolated execution of actual GitHub Studio + feedback/packer modules with mocked compiler/DOM: generate 8-member archive, import valid feedback, render inbox, navigate to Services, mark resolved, export resolved report, change selected theme, and refuse stale feedback workflow PASS. Actual checkout **not available** (DNS `github.com` still fails from executor); full Node audit, actual Chromium live browser, 54-image human-reviewed matrix, Lead/PHP parity (0 probes), and full source-exact release candidate ZIP/SHA256 **NOT RUN**. This engineering milestone does NOT modify formal status: **D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135**. Scope strictly `stage3/design-factory/`; no main/SDK/PHP/workflows/hosting/production edits and no merge.

Actual next Chromium review needs: `review.html` opens by file URL, four local route links work, user can write/remove/export/restore JSON without network; Studio import accepts only matching current site snapshot and safe page/type/text schema; legitimate report notes render without HTML execution, resolve/unresolve and progress export work, stale reports cannot be marked as current. Tests are authored inside `tests/studio-smoke.cjs`, not executed on a genuine checkout. Also rerun the existing D7 Node suite, all 54 real viewport screenshots and human 42-composition review, Lead PHP parity and final source-exact ZIP on a working environment before acceptance.


## 26 October 2026 — standalone preview ZIP verification requirements

**Functional HEAD:** `509a00fb937c0a14443c81b65daa22cffacb2d02` (documentation commit comes afterward; read live branch HEAD on entry). Added a genuine one-click **HTML-демо ZIP** button to the offline Design Factory Studio. It packages four interconnected CMS-validated *preview* pages (`index.html`, `services/index.html`, `approach/index.html`, `contact/index.html`), `assets/preview.css`, bilingual `README.txt` and a strict `preview-info.json` (7 files total). Pages come from the current owner facts, selected theme and composition fallback via the existing first-party preview renderer; links and relative CSS paths remain local. All pages deliberately retain `robots=noindex`, including after owner review. This is **not** the PHP CMS visitor renderer, form collector, publishing, or owner authorization.

New self-contained `studio/preview-zip.js` writes **deterministic STORE-method ZIP32** entirely in the browser, with canonical allowlisted file paths, UTF-8 encoding, exact bounds (2 MiB per file / 8 MiB total), CRC32, local/central-directory parity and a built-in independent read-only archive inspector. Studio checks the ZIP before download. No CDN, network request, filesystem access or third-party package. `tests/studio-smoke.cjs` now contains real Node ZIP contract assertions and an optional Chromium export step, but these are *authored, not run on a checkout*.

**Executed focused evidence:** actual GitHub source parsed in V8; isolated same-module ZIP builder/inspector PASS including corruption rejection; ZIP fixture generated from the GitHub module was independently extracted using standard Python `zipfile` (7 readable entries, CRC error `None`, RU/Unicode content intact). A separate V8 simulation executed the actual GitHub `studio.js` and ZIP module with a mocked DOM/compiler: real click downloaded ZIP, validated all 7 members, and left owner project unchanged. This does NOT establish actual CMS content generation in a genuine checked-out repo, Chromium GUI or production acceptance. A one-shot checkout probe still failed due to `Could not resolve host: github.com`. Full Node release audit, Chromium E2E/54 real screenshots and human review, Lead PHP parity (0 probes), and full Design Factory release ZIP/source SHA256 remain **NOT RUN**. **D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135**. Git scope restricted to `stage3/design-factory/`, no merge or out-of-scope edits.

Upon getting a real checkout, run the existing `studio-smoke.cjs` and `release-audit.cjs`, then the Chromium user journey. Check that the full 4-page ZIP extracts with standard utilities, all root/relative CSS and navigation links work, noindex stays enforced, owner data/theme/composition is reflected, archive matches the deterministic 7-member inventory, and CMS JSON export remains unchanged. The focused fixture ZIP CRC check is **not** the final real generated preview or the release-candidate ZIP check.


## 26 October — new real-GUI acceptance targets

Functional checkpoint: ea4b4751d67bdaf0a8fac62d1c9b6058257a3b3c. Studio now has three connected capabilities: (1) live side-by-side previews of two different theme directions on the same owner data, page and device width; (2) explicit adoption of the compared theme through validated project mutation, undo/redo and automatic owner-review revocation, with prior theme retained as reference; (3) an overview of all four actual current-site pages in separate sandboxed 390px mobile iframes, each opening directly in the regular viewer. Full-screen focused workspace makes side-by-side comparisons useful; presentation-only actions never mutate project, site-v1 JSON, or D6 export. Alternate compilation clones the project. Existing local CSS/CSP, safe iframe sandbox and allowlisted page navigation are preserved. No Lead SDK/PHP/main/production changes.

Verification: modified JavaScript and authored smoke syntax parse in isolated V8 PASS; actual Studio JS with mocked DOM/compiler successfully exercised theme comparison, alternate selection, Apply/Undo/Redo, owner-review reset and four distinct pages + navigation. NOT a real Chromium or checked-out Node run. Fresh checkout retry: github.com DNS resolution failed. Full release audit, optional Lead PHP parity (0 probes), 54 actual PNG/human signoff and real ZIP/CRC/SHA256 remain NOT RUN. D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135.

On a working checkout, Chromium must validate theme comparison at 1280/768/390, same owner copy and selected page in both panes, independent comparison theme choice, Apply/Undo/Redo with owner-review revocation, four-page board, direct navigation and keyboard/touch/reduced-motion. The updated Chromium E2E scenario is authored but NOT executed. Full 54-image D7 review and all 42 D3 compositions remain mandatory.


## D7 screenshot byte-validation gate — 26 October 2026

**26 October 2026 · D7 PNG integrity functional checkpoint:** `7810e6bee98b4a6d5509bf02a52024edc52ea843`.

Found and closed a genuine technical-evidence gap: prior screenshot capture/review only checked PNG signature and IHDR width/height. A truncated, tampered or internally corrupt PNG could have been blessed by a self-consistent report SHA256 and dimensions. New `lib/png-integrity.cjs` validates the **full PNG byte stream**: bounded input/chunk/pixel budget, critical chunk ordering, IHDR encoding and dimensions, per-chunk CRC32, contiguous IDAT, complete IEND/no trailing bytes, bounded zlib inflation, exact filtered scanline lengths (including Adam7 passes), and filter values 0–4. The verifier fails closed for corruption rather than relying on metadata. Integrated into `bin/visual-qa.cjs` (real capture before writing evidence), `lib/visual-review.cjs` (every original PNG byte re-checked at receipt verification), and Chromium pipe smoke. Regression cases in `tests/visual-review-smoke.cjs` now mutate the PNG while consistently updating its hash and evidence manifest; bad CRC, truncated bytes, trailing bytes, bad compressed data and invalid scanline filters must still be refused.

**Verification boundary:** same SHA256 Git blob as isolated Node v22.16.0 module checked with `git hash-object`; an independent real Node test of that **exact module** passed valid RGB/RGBA screenshots and rejects for truncation, incorrect CRC, trailing bytes, malformed zlib, invalid scanline filters and IHDR-only forgery. V8 JavaScript syntax parsing of five changed modules/smokes PASS. These focused checks are **not** a complete checked-out Node release audit or actual Chromium run; the repository checkout remains unavailable in the previous executor (GitHub DNS failure). Added smoke assertions have **not** run in genuine checkout. Real 54 PNGs / human review: NOT RUN; PHP parity: 0 probes; release ZIP/CRC/source-byte parity and actual archive SHA256: NOT RUN. D7 OPEN, Stage2 NO-GO, Stage3 unaccepted, 0/135. No CI/workflow/Lead/main/hosting/production edits or merge.

On a real checkout, the 54-image capture/receipt must pass complete PNG decoding and source SHA binding. SHA256 equality alone is not image validity. Run the existing visual review suite and live Chromium screenshot flow; an isolated test of the PNG parser is not a substitute. Genuine owner visual acceptance and all 42 D3 compositions remain mandatory.


## Updated operator workflow — 26 October 2026

**26 October 2026 · latest functional checkpoint:** `69556a19b887f4dae2ec32328fc2ae487dbaa3fe` (read live branch HEAD on arrival). The offline D7 `visual-review.html` has a substantial usability upgrade: all/pending/approved/rejected image filters, next-pending navigation, private work-in-progress JSON draft export/import, and defect export with diagnostic notes. Draft import checks the complete list of 54 screenshot file names and SHA256 values plus the visual evidence hash, rejects duplicates/foreign/stale/oversized JSON (256 KiB maximum) before changing any decisions, and **always clears the five manual-review attestations** after restoring. It preserves the original v2 review receipt and fail-closed verifier; neither draft nor defect report is approval, identity authentication or publish authorization. No network/browser storage is used by the tool.

**Executed, narrowly:** V8 parsed the inline script; a simulated 54-card browser DOM exercised the filter, rejected-note defect gate, draft export, valid restore, manual-check reset, and stale-evidence rejection without partial mutation. The existing smoke source contains regression assertions but **the real checked-out Node suite has NOT run**. One fresh `git ls-remote` returned `Could not resolve host: github.com`; checkout unavailable. PHP parity: 0 probes; Chromium E2E: NOT RUN; 54 real PNGs + human review: NOT RUN; actual ZIP/CRC/source-byte/SHA256: NOT RUN. **D7 OPEN, Stage2 NO-GO, Stage3 unaccepted, 0/135**. No edits outside `stage3/design-factory/` and no merge.

On a working checkout, run the real 54-image capture and open its `visual-review.html`. Inspect images and all 42 D3 compositions, save a private draft between sessions and export annotated defects where needed. Imported drafts cannot restore human checklist checks. When the review is clean, download the normal v2 `visual-review-decision.json`, independently verify against the original PNG files, and rerun the candidate with `--evidence` and `--review`.


**Document date:** 26 October 2026. **Status:** D7 release tooling is implemented; full checkout, visual/manual acceptance and package evidence remain pending. Formal Stage2 NO-GO, Stage3+ unaccepted, 0/135 mandatory criteria.

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
- Node.js `v22.16.0` is installed, but no checkout is available in the workspace. The seven stable D7 suites and the optional Lead suite were **not run** against a real checkout.
- GitHub API re-check: branch workflow-runs `total_count=0`; HEAD check-runs `total_count=0`; commit statuses array empty. Do not change workflows to manufacture CI evidence.

### Block 2 — PHP parity and browser acceptance

- PHP CLI `8.4.24` is installed, but PHP parity remains **NOT RUN (0 probes)** because the real repository/Lead SDK and server source are not present in the execution environment. Runtime availability alone is not parity evidence.
- `/usr/bin/chromium` exists, but a one-shot minimal headless data-URL probe timed out: `timeout 15s` ended with exit code `124` after DBus connection warnings. Therefore Studio E2E was not run and **zero** real screenshots were captured. No human visual review exists.

### Block 3 — release archive

- No source-byte-identical release ZIP was built. Without a real checkout, the package builder and extraction/source-byte comparison cannot be executed honestly.
- CRC/central-directory validation, complete source-byte parity, and the real archive SHA256 are **NOT RUN / NOT AVAILABLE**. Do not invent an artifact or checksum.

**Decision:** all three D7 closure blocks remain blocked by the current environment. D7 **OPEN**; Stage2 **NO-GO**; Stage3 unaccepted; **0/135** mandatory CMS criteria accepted. The next developer should make at most one fresh environment/checkout attempt if connectivity or the execution environment has materially changed; otherwise retain these blockers and do not loop on retries. No workflow, PHP, SDK, Studio-main, hosting, secrets, production, or out-of-scope files were changed.

## Prior evidence checkpoint — 25 October 2026

**Audit-start branch HEAD:** `bb219d64a58d590fbf2f806835e996a4277aee7d` (documentation-only commit; parent/source checkpoint: `75884b7f794fa1dabc775d802613c38979eff4b8`). The latest functional work hardens output-path containment, deterministic package/source digests and completeness checks for the visual evidence matrix. The expected matrix is now explicitly defined as 54 full captures and 30 quick captures; the latest commit adds smoke assertions for completeness, uniqueness and dimensions. These assertions are present in source but have not been run in a real Node checkout.

| Gate | Current status | Evidence boundary |
|---|---|---|
| Real Node checkout + seven-suite D7 release audit | **BLOCKED / NOT VERIFIED** | Last known clone failed with DNS resolution error; no branch Actions run, check run or commit status is available for current HEAD. |
| Optional Lead Design Graph suite | **NOT RUN** | Requires genuine Node execution and the current lead source; keep it separate from stable D7 suites. |
| PHP parity | **SKIPPED — 0 probes** | No actual parity execution. |
| Chromium Studio E2E and visual captures | **BLOCKED — 0 captures** | Chromium previously timed out on a minimal page. The code now checks a 54-image matrix, but no matrix has been captured or human-reviewed. |
| Deterministic ZIP, CRC/central directory, source-byte parity, SHA256 | **NOT RUN** | Packaging protections and checks exist; no actual archive or verified hash exists. |
| D7 / Stage2 / Stage3 release decision | **OPEN / NO-GO** | Stage2 NO-GO; Stage3 unaccepted; 0/135 mandatory criteria accepted. |

Output containment is now shared through `lib/output-path.cjs`: reports, visual evidence and ZIP destinations must resolve outside the repository, including symlinked parent paths, and an existing final symlink is rejected. Package entries use deterministic name ordering and a length-framed source digest to bind exact paths and file bytes. This is implementation-level hardening, not release acceptance.

Do not close any gate based on added test code alone. Run the real checks once a usable checkout/runtime is available; if it remains unavailable, record the exact blocker and leave the gate open.
## One-command checks (on an actual repo checkout)

Requires Node.js 20 or newer. No npm packages or server are needed. The output directory must be new and its parent must exist.

```bash
node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-D7-report.json
node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-release-candidate
```

The v2 audit runs **browser-bundle parity + eight Node smoke suites + a final source-inventory stability check** (10 checks total); `--chromium` adds the visual-pipeline smoke (11 checks total). The candidate runner also builds a ZIP and independently verifies the ZIP32 central/local directory, CRC32, exact source inventory/bytes and SHA256. It checks the audit report schema, exact suite list, manifest digest, current source inventory and before/after Git state.

For browser and Lead checks, use a fresh output directory:

```bash
node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-release-browser --chromium /usr/bin/chromium
node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-release-full --chromium /usr/bin/chromium --lead-sdk /path/to/lead/stage3/sdk --lead-php /path/to/lead/stage3/server/DesignGraph.php
```

The second command must confirm **six real PHP markup-parity probes**; this is not responsive pixel parity. When review is complete, rerun in another new output directory with `--evidence /path/to/visual-evidence --review /path/to/visual-review-decision.json` plus the Chromium/Lead flags. The evidence fingerprint must match current renderer, SDK/manifests, Studio and verification-tool source bytes.

- Exit **0**: all configured gates passed; still not production authorization.
- Exit **3**: core Node audit and source-exact ZIP are good for engineering review, but one or more acceptance gates remain open.
- Exit **2**: core audit/package failed or the candidate is invalid.

Do not treat added tests or isolated V8 syntax parsing as executed Node tests. The standard audit never deploys or modifies production.

## Browser interaction test

```bash
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/tests/studio-smoke.cjs
```

This is a real GUI scenario: open Studio, select sector and theme, switch mobile mode, edit actual owner title, select registered `photo-gallery` fallback, perform Undo/Redo, and confirm preview generation. Do not call a JavaScript-runtime-only SDK test a real GUI E2E. If Chromium fails/hangs, record the failure and keep the acceptance gate pending; do not mark PASS.

## Visual evidence at three widths

```bash
DF_CHROMIUM_BIN=/usr/bin/chromium node stage3/design-factory/bin/visual-qa.cjs --out /tmp/df-visual-new
```

The full mode captures first-party browser screenshots at **1280×800**, **768×1000**, **390×844**, covering all 12 visual directions, D3 showroom and four distinct sector websites. A smaller initial smoke can use `--quick`. The output includes `visual-evidence.json`, screenshot SHA256 and a pointer to original first-party source pages. Screenshots alone do **not** constitute successful human visual acceptance.

Before closing D7, manually inspect screenshots and interactions for: typography clipping/overflow, navigational menu visibility, realistic empty states, cards and CTA affordances, keyboard focus and tab order, 44px touch targets where needed, reduced-motion, no broken image symbols, high-contrast text, language correctness, page-to-page navigation, placeholders clearly labeled, gallery accessibility and accurate unsupported-feature labels. Look at at least one English kit and each distinct theme/layout. Any serious regression remains a blocker.

## Deterministic ZIP package

```bash
node stage3/design-factory/bin/package-release.cjs /tmp/ai-site-cms-design-factory-new.zip
node stage3/design-factory/tests/package-smoke.cjs
```

Creates a new, portable ZIP containing **only** the `stage3/design-factory/` subtree, including all guides, samples and standalone `studio/index.html`. ZIP entry timestamps are fixed; entries have CRC32, deflate, normalized paths and a deterministic SHA256. Existing files, symlinks, unknown asset types and source-outside-subtree paths are rejected. The ZIP viewer works offline. Running the CLI and its Node tests from ZIP-source requires the original repository's read-only `stage3/sdk/` and `stage3/components/` files; the ZIP is not a complete duplicate of main CMS.

This script **is a packaging option**, not a claim that a downloadable ZIP has already been generated on GitHub. The next developer can build it on a normal checkout, upload that resulting artifact if requested, and provide its actual link.

## D7 release decision and formal boundary

| Criterion | Evidence needed | Status |
|---|---|---|
| D1 strict first-party CMS contract | Node suites & real site-v1 JSON | Implemented, checkout run pending |
| D2 12 visual styles | 12×3 screenshots + human inspection | Pending |
| D3 42 real section previews | HTML/CSS, mapping suite, 3-width QA | Mapping implemented, Chromium pending |
| D4 12 industries, 16 local sites, 64 pages | Node export/hash test, 3-width human review | Code implemented, checkout run pending |
| D5 full offline Studio | Browser sector→theme→edit→mobile→export→undo E2E | Implementation in Git, real Chromium pending |
| D6 closed integration package | Tamper rejection + real SDK import + PHP parity limitations | Standalone adapter implemented, main integration pending |
| D7 packaging and handoff | Release-gate JSON, deterministic ZIP, manual acceptance, approved SHA | Gate tools in Git, final acceptance pending |

Never state **all seven accepted** merely because new tools are committed, or because source code passed isolated JS validation. The lead developer alone reviews integration and any changes to main. Stage2/3 product acceptance remains separate.

## D7 audit corrections (24 October 2026)

`release-audit.cjs` reports **two different concepts**: `automatedChecksPassed` requires its Node and requested Chromium suites, while `releaseReady` remains false and `humanVisualAcceptance` remains `pending` until a reviewer has inspected real screenshots, locales, keyboard interactions, inner pages and semantic CMS parity. An automated process exit 0 does **not** confer human release approval. Do not treat `nodePassed` as real Node evidence unless browser-bundle parity and all eight Node suites ran on a complete checkout.

`visual-qa.cjs` now records **actualWidth/actualHeight and requestedWidth/requestedHeight** from PNG IHDR. A size mismatch is recorded as an error and makes `captureCompleted=false`. Both the full and quick screenshot set now include an English SaaS site and its three internal mobile pages (services, approach, contact); the full capture expects **54 screenshots** (36 theme, 3 showroom, 12 sector home, 3 SaaS inner-page), and quick expects **30**. Even 54 files do not mean all 42 showcased compositions were visually reviewed. Open the linked full D3 showcase from visual-review.html, inspect all 42 cards while scrolling, and record the mandatory showcaseCoverage attestation.

**This checkpoint's observed limits:** GitHub branch code was readable and writable through the connector, but the normal local checkout could not reach `github.com` (DNS error). Headless Chromium failed a minimal `--dump-dom` data-page probe (15-second timeout, exit 124). Hence none of the actual checked-out Node, Chromium, viewport review or ZIP results was performed/approved here. A network-accessible checkout with a functioning Chromium runtime is required to finish D7.

**Recommended final run order:** checkout at exact branch HEAD → rebuild/check browser bundle if applicable → run integrated release audit using Chromium → run visual capture → inspect real screenshots and Studio interactions → build and CRC/SHA-verify ZIP → update evidence and obtain lead integrator review. If any gate is missing, keep D7 and `releaseReady` open.

### Additional source-level evidence, not checkout acceptance

At the current branch code, an isolated V8 execution of the actual GitHub SDK/manifests and Design Factory modules checked 288/288 site-v1 projects, 42/42 registered composition fallback exports, 12/12 representative bridge imports, and rejection of a modified bridge package. The isolated harness provides meaningful contract evidence but bypasses the real Node filesystem/CLI process, headless Chrome, screenshot review and ZIP bytes, so it **does not satisfy** the corresponding checkout or browser criteria above.

## Next D7 hardening checkpoint — 24 October 2026

- Added `tests/smoke.cjs` negative samples for two Studio service placeholders, labelled demo/example slots and empty descriptions. Checklist must retain `facts.services` missing. A legitimate two-service example can satisfy data completeness but `requiresOwnerReview` **must always be true**.
- Added `tests/studio-smoke.cjs` assertions for minimum 44px controls and template-service gating. Optional Chromium E2E now checks not just kit→theme→device→edit→gallery→undo/redo but that **all four actual browser JSON downloads** parse, are CMS SDK-compliant and the D6 bundle matches the exported site. This is authored executable QA, **not a run PASS**.
- Added central-directory parity checks to `tests/package-smoke.cjs`: entry count, CRC, compressed/original sizes and local-file-header offsets. A package is not verified without executing the Node suite against real ZIP bytes.
- Regenerated `studio/runtime.generated.js` from the exact local first-party SDK and manifests (using the unchanged builder), and verified deterministic parity in an isolated in-memory V8 harness. Contract checks run on the same fetched sources: 288/288 site-v1 and 288/288 bridge round trips, 42/42 section fallbacks, service placeholders rejected, D6 tamper detection PASS.
- Local developer environment continues to lack resolvable git checkout access and functional headless Chromium. Two minimal Chrome page probes timed out with zero stdout. No screenshot files, no full Node checkout test report or executable ZIP hash exists. No GitHub Actions runs on this feature branch were found at the checkpoint.

**Release gate remains unapproved.** A future runtime with checkout and Chromium must perform seven Node suites, the four-download browser E2E, actual 1280/768/390 screenshots and human inspection, build/verify ZIP, inspect diff scope and obtain lead approval. Automated green is not manual release approval. Stage2 NO-GO / Stage3 not accepted / 0/135 unchanged.

## 24 October · D7 cross-serializer and human-review improvements

**D6 canonical JSON**: the bridge now verifies complete regenerated package semantics independently of JSON object key order (which PHP and JavaScript serializers may reorder). It still rejects altered nested data, reordered arrays, extra members, NaN/undefined and unsupported object types. `tests/bridge-smoke.cjs` now covers key reordering, mutated SEO and non-JSON input. Isolated real-SDK V8 verification passed **288/288 CMS sites, 288/288 bridge round trips, 42/42 registered section fallbacks**; the reordered package passed and 3 malformed or tampered packages were rejected. These do NOT substitute for checked-out Node or PHP execution.

**ZIP source parity**: `tests/package-smoke.cjs` now validates not just ZIP structure, reproducibility, central directory offsets and CRC32, but every extracted member's SHA256 against its actual filesystem source and complete inventory equality with `stage3/design-factory/`. The code is committed and syntax checked, but **the real ZIP builder/smoke have not been executed against the complete checkout**, so no ZIP checksum, archive artifact or PASS is asserted.

**Visual review contact sheet**: `bin/visual-qa.cjs --out NEW-DIRECTORY` now writes a **local `visual-review.html`** alongside `visual-evidence.json`, site previews and up to **54 screenshots** (30 in quick mode). The review HTML groups all 12 theme previews, the D3 showroom and RU/EN sector site captures, links original PNGs, shows measured image dimensions and highlights mismatch errors. It is offline, never automatically approves release, and preserves `humanVisualAcceptance:'pending'`. A synthetic three-card V8 test confirmed local HTML output and escaping; **no actual screenshots** were produced or manually approved here.

**Unresolved runtime barrier**: the container can run Node 22.16.0 and has /usr/bin/chromium, but `git ls-remote` cannot resolve GitHub and a minimal headless Chromium `--dump-dom` attempt timed out (exit 124, no DOM stdout). No GitHub workflow file was changed and no current branch CI run is claimed. Full checked-out Node suites, Chrome interaction, viewport evidence, owner manual review and ZIP bytes remain **OPEN**.

On a working checkout, run `node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-new.json --chromium` with a working `DF_CHROMIUM_BIN`, then `visual-qa`, open **visual-review.html** to inspect the 54 captures and actual keyboard/route behaviors, execute ZIP builder + package-smoke, and only then record the ZIP SHA256 and seek lead approval. Keep formal Stage2 NO-GO, Stage3 not accepted, 0/135.

## Latest cross-branch graph QA checkpoint (24 October 2026)

Read-only comparison against the **current lead** SDK discovered the optional first-party `site.designTokens` / `section.designGraph` contract. All **288/288** original Design Factory sites continue to validate against that new SDK. The new **optional** `lib/lead-design-graph-adapter.cjs` generates typed graph candidates without changing D6 JSON. In isolated V8 with the lead's real `contract.cjs` + `design-graph.cjs`, **504/504** combinations (42 compositions × 12 themes) passed graph validation and host HTML/CSS rendering. Rechecked on lead HEAD `a4d6aedff277752e015f52b383f080d0c3178f5a`; the first-party Graph module has changed in parallel, but all 504 remained valid. Original legacy SDK rejects the optional new keys by design.

Added `tests/lead-design-graph-smoke.cjs` as **optional**, using read-only `DF_LEAD_SDK_DIR`. It is not added to the eight-suite D7 audit: it requires the lead branch's newer SDK. Its code was authored and syntax-checked; no checked-out Node pass is claimed. A candidate's `approvedForPublish` is always false, and full visual parity is not asserted. See `proposals/LEAD-DESIGN-GRAPH.md` for supported properties and gaps.

**D7 still open:** local GitHub DNS and Chromium remain blocked, including Chromium under Xvfb (12-second timeout, 0-byte DOM output). Full checked-out Node/Chrome/54-image QA, human visual review, and a real ZIP hash are still missing. Do not mistake 504 isolated SDK cases for release acceptance.

## 24 October: editable graph diversity gate

Isolated V8 on actual lead source verified 288/288 old CMS sites and 504/504 distinct host-editable graphs and JS renders. Node, host PHP, Chromium and ZIP gates remain OPEN. Optional tests/lead-design-graph-smoke.cjs now checks editable JSON changes and distinct layouts; when DF_LEAD_PHP_FILE points to actual lead DesignGraph.php it invokes PHP validate/render on four representative candidates and compares DOM markup with the JS host (CSS pixel QA still separate). No PHP PASS was claimed. Minimum 48px CTA and prefers-reduced-motion CSS observed on host JS output. Stage2 NO-GO / Stage3 not accepted / 0/135.

## 24 October — owner facts and semantic source mapping

New opt-in lead graph QA proves that an owner-filled D6 project with 12 service entries yields a valid host candidate with **12 actual editable service cards**, not 2 generic fallback rows. Content metadata identifies the registered repeater item and field supplying every graph title, paragraph and declared action. The D6 original is never mutated. The host graph also renders both first-party FAQ entries, benefits and honest unfilled gallery placeholders. User strings such as `<script>` are escaped by the first-party host renderer.

A separate explicit `reconcileSemantic` function can update graph text/links after normal CMS section edits, without overwriting graph layout or typography; forged or missing provenance is rejected. No automatic overwrite of graph-authored changes.

Executed current-source optional lead smoke in isolated V8: **504** distinct typed graphs, **504** scoped JS host renders, 12/12 owner repeater export, FAQ/gallery/hero/sync/HTML escaping regressions PASS; PHP gate SKIP (not executed), Node checkout NOT RUN, Chromium NOT RUN, screenshots NOT CAPTURED, ZIP NOT BUILT. The PHP source parity probe, when supplied `DF_LEAD_SDK_DIR` and `DF_LEAD_PHP_FILE`, now covers six representative compositions. It must be executed for a true PHP PASS. Stage2 NO-GO, Stage3 unaccepted, 0/135 remain unchanged.

## Final chat checkpoint — conflict-safe synchronization

Source-level V8 with latest fetched real lead SDK: optional lead Design Graph smoke **PASS** for 504 valid distinct graph candidates, 504 JS renders, owner copy, repeater records, safe galleries, HTML escaping and the new collision checks. `inspectSemanticSync()` does not mutate input and reports conflicts; `reconcileSemantic()` rejects concurrent edits to the same bound graph property and preserves unrelated graph content and style changes. Cross-site/page synchronization is rejected. These are **not** real Node checkout/PHP/Chromium acceptance. D7 formal releaseReady remains false. Read `handoffs/SESSION-CLOSEOUT-2026-10-24.md` before attempting final ZIP and manual QA.

## Provenance-integrity addition — 24 October 2026

Optional cross-branch Node suite `tests/lead-design-graph-smoke.cjs` now contains cases for reordered equivalent bindings (allowed) and incorrect existing item IDs, swapped sources, omitted entries, duplicate entries and unknown nodes (rejected). The implementation rebuilds expected source mappings from the original CMS section, not supplied mapping metadata. This suite is **separate** from the seven stable D7 release suites and must be executed against the live lead checkout using `DF_LEAD_SDK_DIR`. The isolated mock checks run while editing this branch are not accepted Node or SDK runtime evidence.

Local checkout is still unavailable because `github.com` cannot resolve here. A standalone minimal Chromium probe with `--no-zygote --single-process` also timed out (exit 124), so no 54 PNG files, visual approval, actual package or ZIP hash were created in this checkpoint. D7 **OPEN**, Stage2 NO-GO, Stage3 unaccepted, 0/135.

## Exact field-source synchronization QA · 24 October 2026

The optional `lead-design-graph-smoke.cjs` includes concrete regressions that must pass on a lead checkout: changing `feature-highlights.second` updates both the main graph summary and the second content card; editing `cta-banner.primary` updates the visible button label **and** href; changing a blank typed summary to approved owner text updates the graph; a source switch to another action (e.g. a newly external primary href that makes secondary the selected graph action) requires explicit review rather than silently rebinding. Previous forged/omitted/duplicate source checks still run.

Source-level 504/504 validated graphs + 504/504 host JS renders were performed in isolated V8 against the live current lead SDK, with nonmutation and 4 focused edit regressions. The blank-value and source-switch real-host cases are added to the Node suite but not executed in a complete checkout; only a mocked blank-value case was run. These checks are **not** PHP rendering, browser/viewport acceptance or real ZIP evidence. The minimal local Chromium probe still times out and GitHub checkout DNS is unavailable. D7 stays OPEN.

**Latest checkpoint clarification:** On the final adapter code, the real GitHub **lead SDK source** was exercised in isolated V8 for 504/504 graph validators and renders and four focused semantic sync scenarios, including empty-to-filled and changed source refusal. The optional Node suite contains the corresponding cases but itself has not been executed on a checkout. Visual/manual, PHP, ZIP bytes and SHA256 gates remain open.

## 25 October — 24-entry FAQ acceptance matrix and safe structural edits

The original `faq-accordion` CMS manifest allows 2–24 items; the optional host Graph must preserve **every question and answer**. The 24-entry graph has 80 typed nodes, below the current lead SDK's limit of 90. Source-level V8 against lead HEAD `514a060a287d07c308525a802053e899da9ea486` validated and rendered all 24 entries and retained 504/504 composition/theme compatibility. The **Node checkout** optional `lead-design-graph-smoke.cjs` now includes 24 Q&As, a 24th-answer edit retaining typography, and over-limit refusal.

Additional safety requirements: a changed repeater set/order (add/remove/reorder) must be refused as a stale graph snapshot; a new media upload or changed caption on the incomplete gallery/media-story adapter must request host parity/rebuild rather than keeping a stale placeholder. These refusals were exercised in isolated V8 with the real host SDK. Only host-authorized baseline replacement can support structural re-selection; no transparent import or publication is implied.

Outstanding acceptance: checked-out Node six-suite and optional lead/PHP runs, real Chromium UI and 54 responsive PNGs, manual quality review, deterministic ZIP and genuine SHA256. No CI acceptance or pixel parity is asserted. D7 **OPEN**, main CMS criteria 0/135.

## D7 owner-media/HTTPS/rebuild regression gates — 25 October 2026

The optional `lead-design-graph-smoke.cjs` now asserts: honest original no-image gallery; verified typed image asset with nonempty alt rendered in host JS HTML after an explicit no-AI host rebuild; 20 gallery images (68 graph nodes under 90 limit); independently synced owner caption; owner-adjusted image alt rejected until explicit rebuild and then refreshed; media-story typed photo; HTTPS external CTA retained and synced; lead Graph incompatible (:443) links rejected rather than redirected; newly added FAQ card through explicit rebuild; malicious/fake baseline provenance still rejected; same identity owner graph styles preserved across rebuild.

Actual isolated-V8 live-source matrix after these changes: **504/504 host validations, 504/504 JS renders, 504 unique**, plus targeted owner-media/rebuild cases passing with read-only lead graph blob `13243b5d0ba00c8eb0875730927437b134f90147`. The permanent Node test source parses; it is NOT a full checkout suite PASS. No actual lead PHP image markup test, Chromium 54-PNG/manual QA, ZIP integrity or SHA256 performed. D7 remains OPEN, final acceptance unchanged.

## 25 October — loss-aware structural rebuild acceptance

A newly identified reorder bug could allow a graph card to inherit the wrong CMS item's typography because the ordinal matcher used an escaped literal `\\d` rather than digit class `\d`. The pattern is corrected and the optional smoke suite asserts a reordered FAQ's fontWeight is **not** transplanted and affected nodes are reported as `resetVisualNodes`.

Owner Graph text/href edited independently should survive an authorized rebuild when its exact bound CMS field is unchanged. A different CMS change to the same field causes an explicit conflicting-edit refusal, not silent overwrite. Deletion of a card containing owner-authored Graph text refuses rebuild until the host provides exactly the owner-approved `acceptedDiscardedNodes` set. False, duplicate and missing node IDs must fail. A new audit report includes `retainedGraphCopyNodes` and `explicitlyDiscardedGraphEdits`.

The full optional source smoke (504/504 typed graphs and 504/504 renderer invocations, plus all assertions) passed in an **isolated V8 emulation of Node builtins using real GitHub JS sources**. This is stronger coverage than syntax-only but does **NOT** count as checked-out Node/PHP/browser acceptance. Formal D7 gates are still open: checkout Node, lead PHP, 54 PNGs with owner visual review, release ZIP with CRC/source parity and actual SHA256. Follow `handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md`.

## 25 October 2026 — structured rebuild preview and full no-op matrix

New gate: `adapter.inspectRebuild(candidate, editedSite, hostSdk, registry)` must be read-only, return a versioned structured preview and never mutate either input. A destructive preview must list the exact graph text/href properties, old/new values, node presence and the predicted structural rebuild diff while retaining `canApply:false` and `requiresOwnerConfirmation:true`. The host must not mistake the preview's internal simulated report for user consent or a save/publish approval.

Rebuild metadata now contains counts and explicit node-ID arrays for preserved, created, reset and removed nodes, plus retained graph-copy count and exact owner-approved discarded graph-edit IDs. Input limits: 80 provenance bindings and 180 discard acknowledgements.

**Current isolated-source results:** 504/504 graph validations; 504/504 host JS renders; 504/504 no-op rebuilds; 504/504 read-only rebuild preflights; 8/8 CMS component-family source-refresh rebuilds; all optional smoke assertions PASS. These used actual GitHub JS sources with isolated V8 and mocked Node core modules, **not a real checkout/Node process**. PHP parity SKIP. No Chromium Studio E2E, 54 human-reviewed PNGs, real ZIP/source-byte parity or verified SHA256. Therefore this strengthens engineering evidence but does not close D7. Follow `handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md`.

## 25 October — structural loss-aware rebuild gate

A rebuild must never silently discard graph structure or owner-authored node properties. The explicit preflight/rebuild contract now covers:
- a canonical graph node deleted by the owner but about to be regenerated;
- custom graph nodes that will be removed;
- custom node IDs colliding with newly generated CMS node IDs;
- style/responsive/state/motion/type/asset/alt/icon/level edits on nodes that are reset or removed by a CMS structural change;
- graph media edits versus simultaneous CMS asset/alt changes.

The adapter raises a typed `DF_REBUILD_OWNER_REVIEW_REQUIRED` error with exact `discardedGraphEditIds`; `inspectRebuild()` returns structured entries including `kind`, `previousValue`, `currentValue`, `rebuiltValue`, `nodeInEditedGraph` and `nodeInRebuiltGraph`. The host must present these entries, authenticate the owner, lock the reviewed revision and pass the exact approved ID set. A preview is not consent, save, publish or authorization.

**Isolated-source evidence:** 504/504 validations, renders, no-op rebuilds and read-only preflights; 8 component-family source-refresh rebuilds; 8 loss-aware regression groups PASS. Actual Node checkout unavailable because `git clone` failed at DNS resolution; PHP parity SKIP (0 probes); Chromium/54 visual captures and real ZIP/SHA256 remain unrun. GitHub commit status contains no checks for this head. This is strong source-level evidence, not D7 acceptance. Do not add the optional Lead suite to stable D7 release-audit before Lead SDK integration.
