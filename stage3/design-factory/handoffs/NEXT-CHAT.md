# Design Factory — NEXT CHAT / independent developer handoff

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


## Latest substantial work — 26 October: D7 async review race and audit assertion closeout

Functional code commit `3ead7d1d2d75b58f6146aedb3bbaac93af82e035`; read live branch SHA after this documentation commit. **Five owned files changed in one major pass**: `studio/studio.js`, `studio/client-feedback.js`, `lib/visual-review-ui.cjs`, `tests/studio-smoke.cjs`, `tests/visual-review-smoke.cjs`. Studio's last-selected file now wins for concurrent project and feedback JSON imports. The offline client feedback portal prevents delayed restores from clobbering new notes. The 54-image visual-review UI prevents delayed drafts overwriting newly entered human verdicts/notes and clears attestations on valid restoration. Two Node smoke assertions that had become certain failures after previous source fixes were corrected.

**Executed accurately:** V8 source syntax 6/6 PASS; focused behavioral V8 with actual committed code and controlled async reads 9/9 PASS (Studio 4, client review portal 3, visual QA review UI 2); 29/29 source-expectation spot-checks PASS. **No genuine Node release audit, Chromium browser E2E, 54 screenshots, human 42-composition inspection, PHP parity or ZIP/CRC/source-byte/SHA256 has been executed.** Do not claim them.

**Remaining D7:** use a real checked-out repository and working headless Chromium, run existing `bin/release-candidate.cjs` / `bin/release-audit.cjs` and diagnose actual failures, collect and manually review all 54 PNGs and all 42 compositions, run six real PHP probes with real Lead SDK/PHP, build and independently verify final deterministic release ZIP. No additional cosmetic features; no main/SDK/PHP/workflows/hosting/production edits and **no merge**. D7 OPEN / Stage2 NO-GO / Stage3 UNACCEPTED / 0/135; engineering implementation 6/7 ≈ 86%.


## Latest work — 26 October · Studio asynchronous import data-loss guard

**Live functional commit `4bf19ac4a3a62e9136e2b55fc9a815321a1eebcc`** (the follow-up documentation commit changes HEAD; read it live). Fixed a real owner-work-loss race inside `studio/studio.js`: an older slow JSON file read can no longer overwrite a newer project edit or feedback resolution. A project revision advances on live keystrokes, committed changes and Undo/Redo; feedback revision advances on resolution and import. Both asynchronous imports re-check freshness after `File.text()` before applying data. Added two genuine Chromium regression scenarios to the existing Studio E2E source.

**Executed:** V8 parsing PASS for both modified source files and the assembled browser probe; actual committed import-function bodies passed **5/5** isolated V8 behavior cases including stale-project/stale-feedback refusal and legitimate import success. **Not executed:** full checked-out Node release audit, real Chromium E2E, 54 PNGs with all 42 compositions reviewed, six PHP parity probes, actual release ZIP/CRC/source-match/SHA256. Checkout DNS and headless Chromium blockers remain, as documented below. Do not claim D7 acceptance or pass these missing checks without evidence. Continue on this independent branch, only `stage3/design-factory/`, no merge or lead/hosting/workflow edits.


## Latest continuation — 26 October 2026 · current executor result (D7 remains open)

**Live HEAD verified:** `62c4ab22ff65c79d7e4194ca73680de3b2fa61d0`, matching the requested branch checkpoint. This session made one checkout/network attempt:
`git ls-remote https://github.com/manufact-test/ai-site-cms.git refs/heads/feature/stage3-design-factory`
It failed with `Could not resolve host: github.com`. Do not repeat the same attempt until the execution environment changes. GitHub API independently reports **0 workflow runs, 0 check runs and 0 commit statuses** for this exact HEAD, so there is no CI result to substitute.

**Read-only source review:** `bin/release-audit.cjs` requires a complete checkout and Node >=20. It runs browser-bundle parity, eight Node smoke suites and a source-inventory stability check (10 checks total without Chromium; 11 when `--chromium` is requested). The Chromium path requires `DF_CHROMIUM_BIN`. A Node-only run deliberately cannot make `browserPassed` or `automatedChecksPassed` true; exit code 3 means Node checks passed but the Chromium gate remains open, not full acceptance. This audit does not perform PHP parity, capture/review all 54 images, approve the 42 compositions, or create the final release ZIP. Those are separate candidate/visual/package gates.

**Local runtime diagnostics:** Node `v22.16.0`, `/usr/bin/chromium`, and PHP `8.4.24` are installed, but a search of common workspace locations found no local `.git` checkout. One minimal Chromium smoke probe (`--headless --dump-dom` on a data URL) timed out after 15 seconds (exit 124), produced no DOM output, and logged DBus/zygote errors. This is an environment probe, not a Design Factory product test. Do not repeat this same probe until the execution environment changes.

**What actually ran this session:** repository metadata and D7 scripts were inspected through the GitHub API; no local checkout was available. The real Node audit was **NOT RUN**. Chromium E2E: **NOT RUN**. 54 real screenshots and human visual review: **NOT RUN**. PHP parity: **0 probes / NOT RUN**. Source-exact release ZIP and actual SHA256: **NOT RUN**. No product source changed in this pass; the documentation update records the concrete blocker and the exact gate semantics.

**Next viable pass, only in a working checkout:** (1) run `node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-release-audit-<unique>.json` and inspect each check, not just its exit code; (2) run the real Chromium Studio + client-review E2E and capture the 54-image matrix at 1280/768/390; (3) visually inspect every screenshot and all 42 D3 compositions; (4) run the six PHP parity probes with the real Lead SDK and `DesignGraph.php`; (5) create the release candidate/ZIP, independently verify ZIP structure/CRC and every packaged source byte, and record the actual SHA256. Keep D7 OPEN until the evidence exists. Stay on this branch and only under `stage3/design-factory/`; no merge or out-of-scope edits.


## Latest handoff — 26 October 2026 · final feedback race fix before D7 acceptance

**Functional checkpoint:** `0c00c5deb97d28827af571eb92ef7d1efd481523`; read the live branch HEAD before work.

The last engineering block fixes a real race in client feedback. Previously `feedbackContext()` trusted `state.lastCompiled`, which is deliberately behind current form state for the 120ms preview debounce. A fast click could export an old customer report while the current project was already changed. It now calls `compileCurrent()` fresh on every feedback action; changed snapshots fail closed. The existing `tests/studio-smoke.cjs` now specifies the full real-Chromium workflow: extract `review.html` from the eight-file ZIP, run the portal, create/download/restore a JSON report, import it into Studio, navigate to the cited page, resolve/export, and prove stale export is blocked immediately after an edit and after preview refresh.

V8 parsing and isolated source-level context/ZIP checks passed. This is not a full Node checkout or Chromium run. One actual GitHub checkout attempt failed DNS; one minimal headless Chromium probe timed out. Do not loop on these same failures or misreport them as product failures/passes.

**Progress:** D1–D6 implemented; D7 is the final open gate. Design Factory engineering roadmap ≈ **86% (6/7)**, about 14% remains. This does not mean Stage3 is accepted: **D7 OPEN / Stage2 NO-GO / Stage3 UNACCEPTED / 0/135**.

Next large block is final acceptance, not another new feature: on a working checkout run `node stage3/design-factory/bin/release-audit.cjs --out <new-temp-file>` and inspect the exact report; run the genuine Chromium Studio+review portal E2E, capture/review all 54 responsive PNGs across all 42 compositions, run six real Lead PHP parity probes where the Lead source is available, then create and independently verify the deterministic source-exact ZIP/SHA256. Update gates only from actual evidence. Stay on `feature/stage3-design-factory`, write only under `stage3/design-factory/`; no merge, no main/Lead SDK/PHP/workflow/hosting/production edits.


## Latest next-chat checkpoint — 26 October 2026 · client feedback round-trip

**26 October 2026 — functional checkpoint `30e7e97cefe80fb32e5b4c5a1d20e01dd5924861`** (subsequent docs commit advances HEAD; fetch live branch SHA).

Completed a connected client-feedback loop in actual offline Design Factory Studio, instead of another narrow audit: Studio's **HTML-демо ZIP** now contains an eighth file, **`review.html`**, a self-contained, no-network Russian client review portal with working links to all four generated pages. The customer can add up to 30 page-tagged notes (change / issue / question, 900 characters each), remove them, download a JSON report, and later restore their own JSON to continue. The Studio inspector now includes section **05 / Замечания клиента**: import client JSON, view each note safely via textContent, open its page, mark or unmark it as resolved, and export the updated progress JSON. No browser storage, server API, CMS state edit or publication request.

The first-party `studio/client-feedback.js` is shared between portal generation and Studio validation. Reports use the closed **`manufact-design-factory-client-feedback-v1`** schema. A non-cryptographic, explicit **site-snapshot correlation key** is computed from the four compiled pages, actual selected theme, kit, locale and D3 composition. Studio refuses reports for other or changed snapshots; modifying content/theme does not silently migrate notes. The key is for matching only: it is **NOT a security signature, authenticated client identity, owner acceptance, signoff or publish permission**. Notes and resolution flags are untrusted suggestions; no guest input is executed as code. The external ZIP portal is static HTML/CSS and an inline trusted first-party script with restrictive CSP, no tracking, no CDN, no network. `studio/preview-zip.js` now canonically packages **8** files, validates all ZIP32 metadata and CRC before download, and retains safe size bounds and `robots=noindex`.

**Verification executed:** V8 JavaScript source syntax PASS. Isolated execution of the actual GitHub client portal JS with mocked DOM: add a note, download the real feedback JSON, restore it and check 8-file ZIP/CRC PASS. A separate isolated execution of actual GitHub Studio + feedback/packer modules with mocked compiler/DOM: generate 8-member archive, import valid feedback, render inbox, navigate to Services, mark resolved, export resolved report, change selected theme, and refuse stale feedback workflow PASS. Actual checkout **not available** (DNS `github.com` still fails from executor); full Node audit, actual Chromium live browser, 54-image human-reviewed matrix, Lead/PHP parity (0 probes), and full source-exact release candidate ZIP/SHA256 **NOT RUN**. This engineering milestone does NOT modify formal status: **D7 OPEN, Stage2 NO-GO, Stage3 UNACCEPTED, 0/135**. Scope strictly `stage3/design-factory/`; no main/SDK/PHP/workflows/hosting/production edits and no merge.

Live HEAD must be read first. Source checkpoint is `30e7e97cefe80fb32e5b4c5a1d20e01dd5924861`; documentation commit follows. Continue **only** in `feature/stage3-design-factory` and under `stage3/design-factory/`. Main developer independently owns CMS, Lead SDK/PHP, production, workflows and merges. On a real checkout: run one full release candidate, genuine Chromium Studio+client review E2E, 54-PNG visual matrix with human review of all 42 D3 compositions, PHP parity and final ZIP integrity; keep D7 open until evidence exists. Do not loop on repeat GitHub DNS failure or narrow test microtasks. Advance substantive independent product work if checkout remains impossible.


## Latest handoff — 26 October 2026: complete offline HTML demo ZIP

**Functional HEAD:** `509a00fb937c0a14443c81b65daa22cffacb2d02` (documentation commit comes afterward; read live branch HEAD on entry). Added a genuine one-click **HTML-демо ZIP** button to the offline Design Factory Studio. It packages four interconnected CMS-validated *preview* pages (`index.html`, `services/index.html`, `approach/index.html`, `contact/index.html`), `assets/preview.css`, bilingual `README.txt` and a strict `preview-info.json` (7 files total). Pages come from the current owner facts, selected theme and composition fallback via the existing first-party preview renderer; links and relative CSS paths remain local. All pages deliberately retain `robots=noindex`, including after owner review. This is **not** the PHP CMS visitor renderer, form collector, publishing, or owner authorization.

New self-contained `studio/preview-zip.js` writes **deterministic STORE-method ZIP32** entirely in the browser, with canonical allowlisted file paths, UTF-8 encoding, exact bounds (2 MiB per file / 8 MiB total), CRC32, local/central-directory parity and a built-in independent read-only archive inspector. Studio checks the ZIP before download. No CDN, network request, filesystem access or third-party package. `tests/studio-smoke.cjs` now contains real Node ZIP contract assertions and an optional Chromium export step, but these are *authored, not run on a checkout*.

**Executed focused evidence:** actual GitHub source parsed in V8; isolated same-module ZIP builder/inspector PASS including corruption rejection; ZIP fixture generated from the GitHub module was independently extracted using standard Python `zipfile` (7 readable entries, CRC error `None`, RU/Unicode content intact). A separate V8 simulation executed the actual GitHub `studio.js` and ZIP module with a mocked DOM/compiler: real click downloaded ZIP, validated all 7 members, and left owner project unchanged. This does NOT establish actual CMS content generation in a genuine checked-out repo, Chromium GUI or production acceptance. A one-shot checkout probe still failed due to `Could not resolve host: github.com`. Full Node release audit, Chromium E2E/54 real screenshots and human review, Lead PHP parity (0 probes), and full Design Factory release ZIP/source SHA256 remain **NOT RUN**. **D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135**. Git scope restricted to `stage3/design-factory/`, no merge or out-of-scope edits.

**Next developer:** verify live HEAD first (functional `509a00fb937c0a14443c81b65daa22cffacb2d02` is not final docs SHA). The stage3/design-factory subtree is the ONLY authorized change scope on `feature/stage3-design-factory`. Next large engineering result should focus on actual Node + Chromium + PHP + real release ZIP acceptance if a working checkout appears, especially browser ZIP download and four-page links. Otherwise deliver the next genuinely substantial independent product block, not tiny additional tests. Never change main, the Lead branch, SDK, PHP, host, deployment, workflows or GitHub Actions and do not merge.


## Latest handoff — 26 October, substantial Studio implementation

Functional checkpoint: ea4b4751d67bdaf0a8fac62d1c9b6058257a3b3c. Studio now has three connected capabilities: (1) live side-by-side previews of two different theme directions on the same owner data, page and device width; (2) explicit adoption of the compared theme through validated project mutation, undo/redo and automatic owner-review revocation, with prior theme retained as reference; (3) an overview of all four actual current-site pages in separate sandboxed 390px mobile iframes, each opening directly in the regular viewer. Full-screen focused workspace makes side-by-side comparisons useful; presentation-only actions never mutate project, site-v1 JSON, or D6 export. Alternate compilation clones the project. Existing local CSS/CSP, safe iframe sandbox and allowlisted page navigation are preserved. No Lead SDK/PHP/main/production changes.

Verification: modified JavaScript and authored smoke syntax parse in isolated V8 PASS; actual Studio JS with mocked DOM/compiler successfully exercised theme comparison, alternate selection, Apply/Undo/Redo, owner-review reset and four distinct pages + navigation. NOT a real Chromium or checked-out Node run. Fresh checkout retry: github.com DNS resolution failed. Full release audit, optional Lead PHP parity (0 probes), 54 actual PNG/human signoff and real ZIP/CRC/SHA256 remain NOT RUN. D7 OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135.

Always read live HEAD first. Current functional checkpoint is not final docs commit. Work exclusively on `feature/stage3-design-factory` inside `stage3/design-factory/`; no SDK/PHP/main/workflows/hosting/production edits and no merge. If the genuine checkout becomes accessible, perform one real Node release candidate plus optional Lead/PHP, Chromium E2E and 54 PNG review, then ZIP CRC/source bytes/SHA256 verification; otherwise deliver another large independent functional block, not repeated microtests or DNS retries. Update the start-next-chat handoff after the next pass.


## NEXT: 26 October 2026 · mandatory screenshot byte integrity checkpoint

**26 October 2026 · D7 PNG integrity functional checkpoint:** `7810e6bee98b4a6d5509bf02a52024edc52ea843`.

Found and closed a genuine technical-evidence gap: prior screenshot capture/review only checked PNG signature and IHDR width/height. A truncated, tampered or internally corrupt PNG could have been blessed by a self-consistent report SHA256 and dimensions. New `lib/png-integrity.cjs` validates the **full PNG byte stream**: bounded input/chunk/pixel budget, critical chunk ordering, IHDR encoding and dimensions, per-chunk CRC32, contiguous IDAT, complete IEND/no trailing bytes, bounded zlib inflation, exact filtered scanline lengths (including Adam7 passes), and filter values 0–4. The verifier fails closed for corruption rather than relying on metadata. Integrated into `bin/visual-qa.cjs` (real capture before writing evidence), `lib/visual-review.cjs` (every original PNG byte re-checked at receipt verification), and Chromium pipe smoke. Regression cases in `tests/visual-review-smoke.cjs` now mutate the PNG while consistently updating its hash and evidence manifest; bad CRC, truncated bytes, trailing bytes, bad compressed data and invalid scanline filters must still be refused.

**Verification boundary:** same SHA256 Git blob as isolated Node v22.16.0 module checked with `git hash-object`; an independent real Node test of that **exact module** passed valid RGB/RGBA screenshots and rejects for truncation, incorrect CRC, trailing bytes, malformed zlib, invalid scanline filters and IHDR-only forgery. V8 JavaScript syntax parsing of five changed modules/smokes PASS. These focused checks are **not** a complete checked-out Node release audit or actual Chromium run; the repository checkout remains unavailable in the previous executor (GitHub DNS failure). Added smoke assertions have **not** run in genuine checkout. Real 54 PNGs / human review: NOT RUN; PHP parity: 0 probes; release ZIP/CRC/source-byte parity and actual archive SHA256: NOT RUN. D7 OPEN, Stage2 NO-GO, Stage3 unaccepted, 0/135. No CI/workflow/Lead/main/hosting/production edits or merge.

On next chat, first read the **live HEAD**; this is a functional checkpoint and does not include the subsequent docs commit. Proceed on the same branch only, only under `stage3/design-factory/`. Next large pass should run real release candidate/Lead PHP/Chromium/54 PNG and ZIP if (and only if) a real checkout/browser is accessible; otherwise pick substantive independent engineering work, not retry loops. Do not change any Lead files, SDK, workflow, main, hosting, deployment, or production. No merge.


## Latest handoff — 26 October 2026 · D7 reviewer workbench

**26 October 2026 · latest functional checkpoint:** `69556a19b887f4dae2ec32328fc2ae487dbaa3fe` (read live branch HEAD on arrival). The offline D7 `visual-review.html` has a substantial usability upgrade: all/pending/approved/rejected image filters, next-pending navigation, private work-in-progress JSON draft export/import, and defect export with diagnostic notes. Draft import checks the complete list of 54 screenshot file names and SHA256 values plus the visual evidence hash, rejects duplicates/foreign/stale/oversized JSON (256 KiB maximum) before changing any decisions, and **always clears the five manual-review attestations** after restoring. It preserves the original v2 review receipt and fail-closed verifier; neither draft nor defect report is approval, identity authentication or publish authorization. No network/browser storage is used by the tool.

**Executed, narrowly:** V8 parsed the inline script; a simulated 54-card browser DOM exercised the filter, rejected-note defect gate, draft export, valid restore, manual-check reset, and stale-evidence rejection without partial mutation. The existing smoke source contains regression assertions but **the real checked-out Node suite has NOT run**. One fresh `git ls-remote` returned `Could not resolve host: github.com`; checkout unavailable. PHP parity: 0 probes; Chromium E2E: NOT RUN; 54 real PNGs + human review: NOT RUN; actual ZIP/CRC/source-byte/SHA256: NOT RUN. **D7 OPEN, Stage2 NO-GO, Stage3 unaccepted, 0/135**. No edits outside `stage3/design-factory/` and no merge.

Next developer: fetch the actual HEAD (functional checkpoint above is not the final documentation HEAD), remain only in this branch and folder, and run a single genuine Node/Lead/PHP/Chromium/ZIP closure pass **only if** a real checkout exists. Do not repeatedly retry blocked DNS, inflate smoke matrices or change workflows/Lead SDK/PHP/main/hosting. Keep review v2 and the 42-composition manual inspection mandatory. Update docs and actual gates after the next large engineering block.


**Date:** 2026-10-26 (latest checkpoint appended below)
**Repository:** https://github.com/manufact-test/ai-site-cms
**Your working branch:** `feature/stage3-design-factory`
**Sole writable subtree:** `stage3/design-factory/`
**Latest functional/source checkpoint:** `6150e9c323f801acaba0d6bc6c3d7a7664143601`. Always read live HEAD on arrival; this source SHA is not a substitute for querying the branch.
**IMPORTANT:** Read the CURRENT HEAD from GitHub on arrival. Do not use the older SHA as the current branch head, and do not create any competing branch.

This is the **second independent developer's permanent Design Factory program**, not the primary AI Site CMS chat. The main developer integrates into `feature/stage3-ai-site-contract` / main when ready. Do NOT edit the leader's branch or `main`, `stage3/sdk`, `stage3/components`, PHP, Studio-main, workflows, deployment, secrets, hosting or other projects. Do NOT merge this branch yourself.


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

## Previous fresh environment audit — 25 October 2026

At audit start, live HEAD was `bb219d64a58d590fbf2f806835e996a4277aee7d`, directly above functional/source checkpoint `75884b7f794fa1dabc775d802613c38979eff4b8`. Compare confirms one documentation-only commit affecting six paths, all under `stage3/design-factory/`.

- `git ls-remote https://github.com/manufact-test/ai-site-cms.git refs/heads/feature/stage3-design-factory` failed exactly with `Could not resolve host: github.com`. Node.js 22.16.0 is installed, but no real checkout is available; stable eight-suite D7 audit plus bundle parity and optional Lead suite were not run.
- Branch Actions API: zero workflow runs. Audit-start HEAD: zero check runs and no commit statuses.
- PHP CLI 8.4.24 is present, but PHP parity was not run (0 probes) because no real checkout/Lead SDK source is available.
- `/usr/bin/chromium` timed out on a minimal headless data URL after 15 seconds (exit 124); no Studio E2E or screenshots were captured.
- No release ZIP was produced; CRC, exact source-byte parity and real ZIP SHA256 remain unverified.

The three planned blocks were attempted once and are blocked by environment availability. Do not loop on retries unless connectivity/runtime has changed. Keep D7 OPEN, Stage2 NO-GO, Stage3 unaccepted, 0/135. Do not modify workflows to manufacture CI evidence.

## Latest verified environment and source re-check — 25 October 2026

**Functional/source checkpoint:** `75884b7f794fa1dabc775d802613c38979eff4b8` is 12 commits ahead of `82b9f7aab5adbb0c0950e7be951aa9ff9beb9369`; audit-start HEAD adds one documentation-only commit. All changed paths remain inside the independent writable subtree.

Recent code changes after the previous graph-rebuild checkpoint:

- Safe, canonical output path guard shared by ZIP packaging, audit report and visual QA; rejects repository destinations, symlinked parents and final symlinks.
- Deterministic package ordering and a length-framed source digest.
- Studio focus retention, 120 ms preview debounce, and rollback on failed state/import application.
- Visual evidence audit now checks exact 54-image full and 30-image quick matrices, including missing/unexpected paths, duplicates and viewport dimensions.

**Do not confuse code added with tests executed.** GitHub Actions shows no run for this branch; the current HEAD has zero check runs/statuses. The last known clone failed because DNS could not resolve github.com. PHP parity has 0 probes; Chromium timed out; no actual screenshots, human review, release ZIP or archive SHA256 exists. Earlier 504/504 isolated-V8 evidence belongs to the optional graph adapter and is not proof of the latest D7 tooling. D7 remains OPEN; Stage2 NO-GO; Stage3 unaccepted; 0/135.

Next: (1) genuine Node checkout or verifiable existing CI result, then eight-suite D7 audit plus bundle parity and separate optional Lead suite if available; (2) real PHP parity plus 54 real screenshots and human review if Chromium works; (3) build and verify a real source-byte-identical ZIP and actual SHA256. Do not modify workflows to manufacture a run.
## What has genuinely been built (D1–D6)

- **D1**: deterministic `manufact-design-factory-v1` → real `manufact-ai-site-v1` compiler, first-party manifests/SDK, four-page websites, safe editorial placeholders, versioned project migration and offline CLI/preview.
- **D2**: 12 typed color/typography/layout directions, programmatic >=4.5:1 contrast checks, separate CMS-supported vs design-only tokens, responsive preview CSS and reduced-motion.
- **D3**: 42 compositions / 14 categories, real offline HTML/CSS showroom, 42 registered semantic CMS component mappings, 8 well-documented proposals requiring future PHP/Studio integration.
- **D4**: 12 industry kits, 6 architectural sequences, 12 RU and 4 EN examples, 64 actual HTML pages from batch generator, real site-v1 artifacts and SHA256 manifest.
- **D5**: offline [browser Studio](../studio/index.html) with industry/theme catalogues, page+device previews, owner facts/services editing, 42 pattern selection, Undo/Redo, project/workspace import/export and SDK-validated site-v1/bridge downloads. Runtime is an embedded static bundle of **the unchanged first-party Stage3 SDK/manifests** and own modules.
- **D6**: [versioned integration bridge](../INTEGRATION.md) with closed workspace/export, deterministic site recompilation, unknown key/modified package rejection, CMS importer output and explicit parity matrix. No production publish path.

Earlier isolated JS matrix checks: **288/288** kit × theme × language contracts and D6 exports; **42/42** semantic fallback mappings; attempted injected package changes were rejected. These are **NOT full checked-out Node, Chromium or CI acceptance.** Formal Stage2 NO-GO, Stage3+ not accepted, 0/135 criteria.

## Latest D7 development in preceding chat

- Discovered and fixed a regression in the old D1 smoke: it compared literal industry placeholder text. It now checks actual service fallback semantics.
- Closed accidental false “ready to publish” with only one owner-provided service: second slot visibly marked “Example (verify)” / “Пример (подтвердить)”, checklist flags missing verified services. Browser bundle regenerated to match exact current source.
- `bin/release-audit.cjs`: one command executes eight relevant Node suites plus bundle parity and writes an explicit gate report + SHA256 source inventory.
- `bin/package-release.cjs` and `tests/package-smoke.cjs`: reproducible portable ZIP with local Studio/source/docs, CRC32 and SHA256, no overwrite/symlinks/path escapes.
- `bin/visual-qa.cjs`: captures real Chrome screenshots of all 12 themes at three viewports, D3 showcase and representative D4 kits; produces evidence JSON. Screenshots require human review; not an automatic PASS.
- `QUALITY-GATES.md`: exact acceptance criteria and commands.

## Read first, in this order

1. `stage3/design-factory/MISSION.md` — permanent scope/rules
2. `stage3/design-factory/ROADMAP.md` — D1–D7 success criteria
3. `stage3/design-factory/PROGRESS.md` — latest state/gaps
4. `stage3/design-factory/QUALITY-GATES.md` — D7 tests, archives, viewport checks
5. `stage3/design-factory/studio/README.md` — real user workflow
6. `stage3/design-factory/INTEGRATION.md` — PHP/SDK limitations and safe handoff
7. Source scripts in `tests/`, `bin/`, `lib/`, `catalog/`.

## Your next big block (finish D7, no new assignment needed)

Use the accelerated program: one coherent closure pass, not many microtasks.

1. Fetch live branch HEAD and compare the diff. Work only in `stage3/design-factory/`; do not merge or touch Lead SDK/PHP/main/workflows/hosting/production.
2. On a genuine checkout, run `node stage3/design-factory/bin/release-candidate.cjs --out /tmp/df-release-candidate`. This runs browser-bundle parity + eight Node suites and a final source-inventory stability check, creates the engineering ZIP, and independently checks archive structure/CRC/source bytes/hash. Run the dedicated `node stage3/design-factory/tests/release-candidate-smoke.cjs` separately; it intentionally cannot be nested in its own audit.
3. If Chromium works, run with `--chromium /usr/bin/chromium`; inspect the generated `visual-review.html`, all 54 PNGs at 1280/768/390, all 42 D3 compositions, Studio interactions, keyboard/touch, RU/EN and reduced-motion. If the environment blocks, record the exact result once and do not loop.
4. If the Lead checkout exists, pass `--lead-sdk` and `--lead-php`; verify six real PHP parity probes and inspect `leadInputs`. The external SDK/PHP manifests must remain identical before, after the Lead test and at candidate end. Complete the v2 human-review receipt and rerun with `--evidence` and `--review`. No v1 receipt, source-stale evidence or self-declared review counts as CMS approval.
5. Update `PROGRESS.md`, `QUALITY-GATES.md`, `README.md`, `INTEGRATION.md`, this handoff and `START-NEXT-CHAT.md` with factual PASS/SKIP/FAIL evidence, exact SHA and the remaining gates. D7 remains OPEN until the real gates pass. Do not manufacture CI evidence or merge.

## User-facing reporting convention

After each meaningful large pass, include **actual functional progress**, explicit verified PASS/SKIP/FAIL, accurate git SHA, remaining defects/gates, and note that 0/135 formal CMS acceptance is unchanged. The 6/7 D1–D6 implementation count is **not** an 86% accepted product readiness measure. No new scope outside Design Factory without the owner's permission.

If real Chromium cannot be run, still complete the viable Node/package/doc tasks, report the blocking evidence, and leave D7 visually pending. Do not spin endlessly on Chromium environment setup.

## Follow-on D7 audit checkpoint (24 October 2026)

Starting HEAD was `0c55674c9024beb29ff919bf9404be997361a1e3`; code checkpoint **before docs** was `96f55a997e69a5fe1058c825d81526089845eb95`. Always fetch actual HEAD, especially after this documentation update.

Source improvements now on the same isolated branch:

1. Release audit does not confuse green automation with owner visual acceptance: `automatedChecksPassed` is distinct from permanently pending `releaseReady:false` until human review.
2. Visual screenshots include PNG intrinsic viewport dimension checks, EN SaaS, and three internal-page mobile screenshots (54 full / 30 quick).
3. Browser Studio removes stale valid iframe when a compile fails; remove-service button hit target is 44px.
4. GitHub compare shows four source paths all under `stage3/design-factory/`.

**Neither checked-out Node execution nor Chromium acceptance is confirmed**. Local Node v22 exists but the runtime cannot resolve `github.com` to download this checkout; installed Chromium also hangs on a minimal data URL and exits on a 15-second timeout. V8 static syntax inspection and GitHub diff validation only. No new ZIP file, screenshot evidence directory, source audit JSON, or verified archive hashes exist. No claims of successful runs. Formal status unchanged: Stage2 NO-GO, Stage3 not accepted, 0/135.

**Resume with an accessible checkout and working browser:** run D7 commands listed above; verify all actual PNG dimensions and inspect all layouts and the English inner pages, repair only substantive failures, create a real ZIP and record sha256, then issue a final handoff to the lead developer. Remain in this feature branch, and do not merge.

**Read-only source verification added in this chat:** 288/288 current-SDK site-v1 validations and internal-link checks, 42/42 valid registered D3 fallback sections, 12/12 representative D6 bridge round trips and rejection of a modified package. These were run in a V8 in-memory harness using GitHub-fetched source and manifests, *not* on a checkout; keep Node, Chromium, visual and ZIP gates open. See `PROGRESS.md` for the precise boundary.

## Latest independent D7 checkpoint — 24 October 2026

**Start SHA:** `4015fd1fbbb31cbc3b74e0141e2c9edb68183807`; **pre-handoff-doc source SHA:** `8525cc9fc56f759b8a983ec5ae7efc68ca2d0245`. Always query the live HEAD first. This remains the ONLY working branch, and `stage3/design-factory/` the ONLY mutable path.

Changes in the latest block:
- Compiler/service checklist fixed: two default Studio service placeholders, `Example (verify)` copy and empty service descriptions cannot mark verified owner services. Real two-service fields are still subject to owner review.
- 44px minimum touch targets for Studio navigation/buttons/service removal, site preview navigation, CTA text links and FAQ summary. Rebuilt offline browser runtime from unchanged Stage3 SDK/manifests and verified exact source parity in V8.
- New regression cases in D1 smoke and enhanced D5 browser smoke to validate **four actual browser exports** (site, D6 bundle, project, workspace), not merely buttons. ZIP smoke now fully audits its central directory for local header consistency.
- Read current `PROGRESS.md`, `QUALITY-GATES.md`, `README.md` for exact details and commands.

**Executed versus pending:** verified in isolated V8 on current GitHub source: 288/288 real SDK site documents + local links, 288/288 D6 exports/imports, 42/42 D3 fallbacks, service placeholder gate, tamper rejection, generated browser bundle parity, inline Chromium probe JavaScript syntax. Did **not** run Node against an actual checkout, launch successful Chromium, inspect three-viewport screenshots, or produce an actual ZIP. Local git DNS for GitHub fails and headless Chrome hangs even on a minimal data URL; no branch GitHub Actions runs found.

**Next action without a new product brief:** obtain accessible complete checkout, execute `node stage3/design-factory/bin/build-browser-bundle.cjs --check` and `node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-audit-NEW.json --chromium` with `DF_CHROMIUM_BIN`. Then capture and **manually review** 54 full screenshots, investigate viewport mismatch if Chrome forces minimum window dimensions, run package builder and complete ZIP smoke, record **actual** SHA256 of ZIP and source Git HEAD, and prepare the final integrator handoff only after real evidence. Never touch main, workflow, SDK, PHP, hosting, production or merge the branch. Formal CMS status Stage2 NO-GO, Stage3 not accepted, 0/135.

## D7 continuation checkpoint · 24 October 2026

**Start:** `b7df7ddc0378814d14c984626af6b7cc42efb9ee`. **Code checkpoint before docs:** `2913e98cba216af4a5e0b08ef93f09d1af6dd348`. Retrieve the **current** branch HEAD immediately; do not assume either SHA remains HEAD after documentation. Own only `feature/stage3-design-factory` and `stage3/design-factory/`.

What changed: D6 now compares complete recompiled JSON **semantically** (unimportant object-key order does not invalidate imports, but value/array/unknown/type tampering does). `tests/bridge-smoke.cjs` tests sorted/reordered JSON, changed nested SEO and forbidden non-JSON values; the Studio bundle was regenerated. ZIP smoke now checks **every extracted byte and the complete source inventory**. `visual-qa.cjs` creates an offline `visual-review.html` contact sheet of the full screenshot matrix with dimensions/errors and explicit human acceptance pending.

Isolated current-runtime V8 checks: 288/288 site SDK + link validation; 288/288 D6 round trips; 42/42 composition fallbacks; reordered JSON accepted; three corrupted/invalid bundles rejected; synthetic HTML contact-sheet/escaping test passed. These are **not** checked-out Node test runs or real screenshots. The local environment still cannot resolve github.com for a checkout and Chromium hangs even on a minimal page. No ZIP exists, no checksum or browser PASS. Formal Stage2 NO-GO, Stage3 not accepted, 0/135.

Next **without asking the owner for scope**: verify live feature HEAD/diff, run eight Node suites plus bundle parity + build-browser-bundle `--check` on an accessible checkout, run a functional Chromium Studio interaction/download smoke, generate full 54 visual screenshots, inspect `visual-review.html` at 1280/768/390 (and keyboard/locale behaviors), fix only critical failures, generate **real ZIP** with `package-release`, run `package-smoke` and record exact ZIP SHA256. Only after completed evidence and owner visual review should final D7 handoff be made to the lead. Never merge or touch SDK/PHP/workflows/main/hosting/production.

## Latest D7 handoff update: read-only lead Design Graph compatibility (24 October 2026)

Starting SHA for this block was `555ede1caf8a367e0fd19dfd2bea222d9380e7bf`; retrieve the live current HEAD immediately (docs may add more commits). Stay on `feature/stage3-design-factory`, write solely under `stage3/design-factory/`, never merge or modify SDK, PHP, Studio-main, workflows or production.

In parallel the lead implemented optional **Design Graph v1** (`site.designTokens`, `section.designGraph`). Read-only tests showed **288/288** stable Design Factory exports still pass newer lead SDK. An **opt-in** `lib/lead-design-graph-adapter.cjs` now maps a selected one of 42 D3 compositions + one of 12 themes to typed host-editable nodes, tokens, responsive rules and button states, without changing the old D6 export. In-memory real-new-SDK validation and host JS rendering passed **504/504** each, including revalidation against lead HEAD `a4d6aedff277752e015f52b383f080d0c3178f5a`. This was **NOT** checked-out Node or PHP/Chromium acceptance. Read `proposals/LEAD-DESIGN-GRAPH.md`; the candidate is explicitly partial fidelity, not an automatic full parity claim.

New optional `tests/lead-design-graph-smoke.cjs` uses `DF_LEAD_SDK_DIR` to read the lead's `stage3/sdk`. Keep separate from stable D7 audit. See the main `QUALITY-GATES.md` for exact existing Node/Chromium/ZIP gates; still blocked locally (GitHub DNS, Chromium timed out including Xvfb). No real screenshots, final ZIP or SHA256 yet. Next large work block should obtain real runtime acceptance, fix only proven major defects, and provide a verified archive + final lead handoff when possible. Formal Stage2 NO-GO, Stage3 not accepted, 0/135.

## Latest 24 October update — editable Design Graph profiles

Current branch should be fetched live. The optional adapter now creates 504 distinct typed host graphs (42 D3 compositions × 12 themes): actual CMS-editable grid/span/order, font/spacing, card visuals, icons, gradients, hover/focus and reduced-motion-aware motion. A 48px CTA is retained. Isolated lead-source V8: 288 old sites compatible, 504 host candidates accepted and rendered, and manual post-generation JSON edits re-rendered without AI. The stable D6 package remains unchanged.

The optional lead smoke adds unique-graph assertions, editability checks and a PHP validator/render markup parity option behind DF_LEAD_PHP_FILE plus DF_LEAD_SDK_DIR. No actual Node checkout, PHP parity, Chrome screenshot or ZIP was completed here (GitHub DNS and Chromium remain blocked). D7 OPEN. Stage2 NO-GO / Stage3 unaccepted / 0/135. Never merge or modify main/lead SDK, PHP or production.

## Most recent D7/Design Graph checkpoint — 24 October 2026

Starting SHA for this block: `4eb6f682be5507774aa740ee4b5d107a4ddb9983`. Read actual live HEAD before working. Continue independent branch `feature/stage3-design-factory` and edit solely `stage3/design-factory/`; NEVER merge or change the lead SDK, main branch, PHP, workflows or production.

Latest code: optional `lib/lead-design-graph-adapter.cjs` now exports all first-party service/FAQ/benefit repeater data as individually CMS-editable graph nodes (service max 12); refuses fake gallery media; uses sanitized owner-supplied hero/service facts instead of demo copy in the host candidate only. `mapping.contentBindings` records source item/slot/field. New `reconcileSemantic(candidate, editedSite, hostSdk, registry)` explicitly refreshes graph text/links after ordinary CMS field edits, while preserving graph-only style changes and rejecting forged/missing bindings. It must NOT be triggered automatically on unrelated graph edits. **This is snapshot + opt-in one-way sync, NOT automatic live binding or publish approval.**

Expanded `tests/lead-design-graph-smoke.cjs` covers 504 distinct valid host graphs, all 12 owner services, full FAQ, safe gallery placeholder, preservation of typed styles during sync, forged binding rejection and escaped user HTML. Executed in isolated V8 using current GitHub branch SDK/Graph: PASS (504/504 host JS renders, PHP SKIP). PHP optional parity matrix expanded to 6 patterns. A true Node checkout, PHP execution, Chromium human inspection, final ZIP and SHA256 remain NOT RUN; local GitHub DNS and headless Chromium are blocked. Stage2 NO-GO, Stage3 unaccepted, 0/135.

Next task: verify current lead contract after parallel commits; run checkout seven D7 Node suites + optional lead SDK/PHP suite, real Chrome Studio interactions and 54 screenshots, human review, package builder+source-parity ZIP test, record actual SHA256 and pass an explicit integration handoff to the lead developer. No fake PASS claims.

## FINAL CHAT TRANSFER — 24 October 2026

**Use the newest consolidated documents rather than assuming any historical SHA in this cumulative log is HEAD:** `handoffs/SESSION-CLOSEOUT-2026-10-24.md` and `handoffs/START-NEXT-CHAT.md`. Live GitHub branch `feature/stage3-design-factory` must be queried afresh. The last functional pass added `inspectSemanticSync()` and conflict-safe `reconcileSemantic()` to the optional lead adapter; source-level V8 lead smoke with 504 valid graphs/JS renders and content-conflict regression PASS. Graph-only text updates are preserved if source unchanged; simultaneous competing source/graph edits cause an explicit conflict. D6 original intact. **D7 remains OPEN**, no checked-out Node, PHP, Chromium, screenshot human approval or real ZIP SHA256. Stage2 NO-GO, Stage3 not accepted, 0/135. Continue fast large blocks on the independent branch **only**, do not merge or touch SDK/PHP/workflows/main/hosting.

## Continuation checkpoint — 24 October 2026: binding integrity

Live branch started at `cbba270004524bd1ec31234429dc9c0d362e7dc5`, then implementation `dd8fa4057b5e83a6a1f6da0bf3ad1409a060b2e0` and tests `6e96883d10c6bb2f30450a5e988332a3dd0b19db` landed exclusively in `stage3/design-factory/`. Read the LATEST HEAD, not these source checkpoints, after documentation updates.

`lead-design-graph-adapter.cjs` now verifies canonical content provenance before every preview or explicit sync: redirects to other valid items, swapped sources and missing/extra mappings fail closed. Equivalent reordering is accepted. This protects owner content against mapping errors but does not sign the baseline or authorize edits. Five new regression scenarios are in optional `tests/lead-design-graph-smoke.cjs`. Modified adapter and test parsed in V8; four isolated mocked-host cases passed. No checked-out Node/real lead SDK/PHP/Chromium results. Latest observed *read-only* lead HEAD: `d215fac8b91dac1fc300312e4829872242763606`.

**Next:** run normal eight Node suites plus bundle parity + optional host suite on a complete checkout, then 54 real PNGs at 1280/768/390 with human review, offline Studio E2E, package builder, archive integrity and actual SHA256. Here GitHub DNS checkout failed and minimal Chromium still timed out (124); do not claim this as PASS. D7 OPEN, main Stage2 NO-GO, Stage3 unaccepted, 0/135. Remain the second developer; no merges, main, PHP, SDK, CI or production edits.

## Current successor checkpoint — 24 October 2026 · exact semantic editing

Branch start `edbaf584d2957909e4ec472dd743c15cb9f64813`; actual current HEAD **must be fetched again after documentation writes**. All commits only under `stage3/design-factory/` and no merge/main/lead/SDK/PHP/actions/hosting edits.

Additional optional lead bridge commits: `7481c612b23c67b1fd8f7cdec8c031c69824125c`, `966fd36438829d8dcbe8636b610976e9c4a63568`, `79b14f94e897c11acb5e3a4d670acee27fb5ee42`, `eae218293be1024c481c79c4ca6f20e2cf83b657`. Actual visible source CMS slots now sync: a second benefit reused in two nodes, CTA label+href from `primary`, and originally blank fields later filled by the owner. Changing the visible field source requires host approval/rebuild rather than silent rebinding. Canonical provenance protection from preceding block remains active.

Fresh GitHub lead contract blob `e3e0797632bd0f9c4b50cd1865d516264602bcb8`; isolated V8 actual-source matrix **504/504 SDK validations and 504/504 JS renders** plus four focused edit checks PASS, original D6 untouched. This is NOT real Node/PHP/Chromium. The expanded optional Node smoke includes new blank-to-filled/source-change cases, but no full checkout execution. Local GitHub DNS unavailable and Chromium screenshot probe timed out. No real ZIP hash. Keep D7 OPEN and main 0/135 formal acceptance unchanged.

Next work: obtain complete checkout, run seven D7 Node suites and optional lead SDK/PHP smoke, Chromium Studio and 54 responsive PNGs with manual review, then reproducible ZIP and SHA256. Report genuine evidence; do not merge or touch other branches.

**Final verification update:** On the latest adapter source, isolated V8 against the actual lead SDK passed 504/504 typed graph validations, 504/504 real JS renderer invocations, 504 unique graphs, and four focused scenarios: benefit reused in 2 nodes, CTA text/href, blank-to-owner-content and source-switch rejection. These are genuine source-level runtime checks, **not** checked-out Node/PHP/Chromium execution. Continue D7 on a full checkout; do not claim visual acceptance.

## 25 October 2026 — independent D7 checkpoint (24 FAQ parity)

Start from the **live HEAD**, not the earlier `585de10adc93f122a6297efa8645cf8e831594c1`. This independent pass only changes `stage3/design-factory/` in `feature/stage3-design-factory`; never merge. Source fix: `7b53bc02c7481a92e3b2108e511621781779e0a7`; test updates `00a9648a368c274bcab5eeda698073f4638abef2` and `5ce8045bbe0830e4bef235cf410fc48d91b88cc2`.

The newer host adapter now retains **all 24 declared FAQ entries** (previously stopped after 12), explicitly refuses excess repeater entries, rejects reordered/added/deleted semantic items until a structural rebuild, and refuses unrepresented gallery/media changes to avoid stale claims. A lead-host test for 24th-answer edit and independent styling preservation was added. Reconciliation remains opt-in, one-way, nonpublishing, and revision/permission UX is lead-owned. No change to D6 export or lead files.

Latest inspected lead HEAD: `514a060a287d07c308525a802053e899da9ea486`, Graph blob `f19814616601501c42bea39c253d461e70563324`. **Actually passed (isolated V8 using GitHub source):** 504/504 lead SDK host candidates, 504/504 JS renders, 24/24 FAQ content in an 80-node valid host graph, plus add/reorder/media refusal probes. **NOT run:** checked-out Node optional test (including new 24th-answer regression), PHP, Chromium, 54 real screenshots, human acceptance, real ZIP and SHA256. Github DNS git clone remains blocked and Chromium minimal data-page times out. D1–D6 engineered; D7 OPEN; Stage2 NO-GO / Stage3 unaccepted / 0/135.

Continue on real checkout: run `node stage3/design-factory/bin/build-browser-bundle.cjs --check`, `node stage3/design-factory/bin/release-audit.cjs --out /tmp/df-D7-final.json --chromium` with explicit `DF_CHROMIUM_BIN`, plus `DF_LEAD_SDK_DIR` and `DF_LEAD_PHP_FILE` optional host suite; capture and visually inspect full 54 PNGs, then package and record actual ZIP SHA256. If blocked, preserve honest pending gates and focus on valuable functional corrections. Do not merge or edit main/lead/SDK/PHP/actions/production.

## Current engineering checkpoint — 25 October 2026 · owner media and AI-free graph rebuild

Start from fresh independent branch HEAD; this pass began `c8acaa211188ac55947f80e7b97a6cc8e9db5ae9`. No merge/main/SDK/PHP/workflows/hosting edits; only `stage3/design-factory/` in `feature/stage3-design-factory`. Optional adapter now supports first-party owner image assets in gallery (up to 20, 68 graph nodes) and media-story, nonempty owner alt, editable captions and safe external HTTPS links. `rebuildHostCandidate` opt-in host API allows revision-authorized structural/media changes **without AI**, retaining compatible graph visual styling and exact provenance and rejecting incompatible site/section/candidate baseline; result **not published** with mandatory owner visual review. Stale asset metadata/alt changes refuse a blind sync; post-rebuild caption can sync. CMS-permitted but Graph-unsupported HTTPS :443 fails loudly. Main immutable D6 remains unchanged.

Latest source-level check used actual read-only lead contract blob `e3e0797632bd0f9c4b50cd1865d516264602bcb8`, Graph blob `13243b5d0ba00c8eb0875730927437b134f90147`: **504/504 typed graph validators and 504/504 JS renders, 504 distinct**; gallery JPEG and nonempty alt, caption, asset alt refresh, 20-image gallery, CTA HTTPS, third FAQ structural rebuild passed in isolated V8; expanded optional Node tests syntax checked but NOT executed on a real checkout. All source commits and tests in isolated folder, available in GitHub branch; read source/docs for exact commit history.

**D7 OPEN**: still lacking actual on-disk Node release audit, optional lead SDK/PHP smoke, Chromium screenshot QA 1280/768/390 (54 images) with real human review, ZIP/CRC/source parity, real ZIP SHA256. Prior local git remote DNS failed, minimal headless Chromium timed out. Do NOT conflate V8 source validation with Node/real browser/PHP acceptance. Engineering ≈6/7, formal CMS Stage2 NO-GO / Stage3 unaccepted / 0/135. Next fastest progress: obtain full checkout, run D7/lead suites, screenshots, archive integrity and explicit lead review. Only the main integrator should accept or merge.

**Last read-only lead-head compatibility recheck (25 October):** While this handoff was being written, the lead branch advanced to `95252a52c5d153b8bf9892d542526cf591f13390`. Re-ran source-level isolated V8 against its actual SDK files: 504/504 typed candidates and 504/504 host Graph JS renders PASSED, 504 unique graphs and D6 unmodified; typed JPEG media gallery rebuild/render also PASSED. Graph blob in that read was `13243b5d0ba00c8eb0875730927437b134f90147`. This remains a read-only, non-Node/non-PHP/non-Chromium check. Fetch lead HEAD again before future acceptance.

## Next-session checkpoint — 25 October 2026, loss-aware rebuild

**Live branch HEAD must be fetched.** This session started from `962cd87a237a05cfacbd1cba713286e194b0520f`. Code `8fcff130ba0425a73cf3f90b399def7624d0562f` fixes a real wrongly escaped ordinal-matcher bug (style bleeding between reordered repeater cards) and preserves independently edited Graph text/href on AI-free rebuild when CMS source unchanged. Conflicting CMS+Graph edits fail. Deleted Graph-only user copy is protected until the host explicitly supplies an exact reviewed `acceptedDiscardedNodes` set; incorrect, missing and duplicate acknowledgements fail. `rebuild` reports preserved/restarted nodes and copy-discard decisions; not published, not authorized automatically. Full contract/integrator examples: `handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md`.

Test changes `41808b95d75ccadd2086aa89724b1122b35d2396`, `16cab27fee7d8e727e6775406f889de8332e696d`. For the first time in this project chat, **the complete optional `lead-design-graph-smoke.cjs` source test suite ran and PASSed** under an *isolated V8 emulation* of `node:assert/strict`, `node:path` and `node:fs` with real read-only GitHub SDK and independent branch source. Output confirmed 504 distinct validated lead candidates, 504 real lead JS renders, D6 immutability and legacy SDK rejection; PHP SKIP. Additional 4 focused synthetic valid-host cases for manual Graph copy, conflict, card reorder and exact discarded node confirmation passed. This is **NOT an actual local Node checkout execution** and not PHP/Chromium/visual acceptance. Latest read-only lead HEAD `aff9af003c4201c3393033703a3edd6f01fd425c`; latest changes touched Studio/docs not SDK. Node/Chrome remain environment-blocked (GitHub DNS inaccessible; minimal Chromium timed out).

Next fastest steps: real checkout Node full release-audit + optional lead/PHP integration, visual QA Studio 54 captures at 1280/768/390, human/owner UI visual review and file-integrity ZIP+actual SHA256. Keep D7 OPEN, Stage2 NO-GO / Stage3 unaccepted / 0/135, do not merge or modify main, lead, SDK, PHP, Actions or production. Work only `stage3/design-factory/` on `feature/stage3-design-factory`.

## Next-session checkpoint — 25 October 2026, three-block rebuild review

Latest functional code checkpoint: `0b11c94fa536887c18a4b008d8f57c846fd14219`; re-read live HEAD before writing. Latest code adds `inspectRebuild(candidate, editedSite, hostSdk, registry)` and a structured visual diff. Read `handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md` first.

**Three substantial blocks completed:**
1. Read-only rebuild preview with exact discarded graph copy details, no-mutation guarantee and bounded input sizes.
2. Full `42 compositions × 12 themes = 504` source matrix: 504/504 lead SDK validations, renders, no-op rebuilds and read-only preflights.
3. Source-refresh rebuild tests for all 8 CMS component families, plus actionable preserved/created/reset/removed graph-node IDs for host UI review.

Test output came from isolated V8 using real GitHub JS source and emulated Node core modules; it is **not** an actual checked-out Node process. PHP is SKIP; Chromium/54 PNG visual review and real ZIP SHA256 remain open. D7 OPEN; Stage2 NO-GO / Stage3 unaccepted / 0/135.

Next priority: obtain a real checkout and run the existing Node release-audit plus this optional Lead suite; if available, run real PHP DesignGraph parity. Then capture 54 real 1280/768/390 screenshots, review them visually with the owner, and produce a source-byte-identical ZIP with archive integrity and a genuine SHA256. Continue only in `stage3/design-factory/` on `feature/stage3-design-factory`. No merge, no main/lead SDK/PHP/workflow/production changes.

## Previous substantial checkpoint — 25 October 2026

This was a full loss-aware rebuild block, not a cosmetic follow-up.

1. **Node structure safety:** canonical node deletions, custom node drops, new-ID collisions and edited properties on nodes reset/removed by CMS structure changes now require explicit exact-ID owner review. Rebuild throws typed `DF_REBUILD_OWNER_REVIEW_REQUIRED` with `discardedGraphEditIds`.
2. **Media three-way conflict handling:** graph-owned image/video `assetId` and alt/media edits persist when the CMS-derived value is unchanged; divergent edits on both sides fail closed.
3. **Broad regression and evidence:** 504/504 SDK validations, scoped renders, no-op rebuilds and read-only previews; 8/8 component-family source refreshes; 8 loss-aware regression groups. The suite explicitly covers owner-deleted nodes, custom nodes, collisions with new CMS IDs, style loss on removed cards, reordered card styles, media alt/asset edits and conflicts.

The suite used actual GitHub JavaScript sources in isolated V8 with emulated Node core modules. A real checkout attempt failed because the environment could not resolve `github.com`. Therefore no actual Node checkout, PHP parity, Chromium screenshots, owner visual review or real ZIP/SHA256 acceptance is claimed. GitHub combined status had no checks and the commit had no PR-triggered workflow runs.

**Next three substantial blocks:** (1) establish genuine Node execution or a trustworthy existing GitHub Actions run and execute the D7 release audit plus the optional Lead suite without modifying workflows; (2) run real PHP parity and capture/review 54 real 1280/768/390 Chromium screenshots if the environment supports it; (3) package a source-byte-identical release ZIP, verify archive integrity and calculate its real SHA256. Do not fake results if the environment cannot provide the required runtime.

Stay on `feature/stage3-design-factory`, write only under `stage3/design-factory/`. Do not merge, edit main/Lead SDK/PHP/Studio-main/workflows/hosting/production, or fold the optional suite into stable D7 audit before Lead SDK integration.


## Previous continuation checkpoint — 25 October 2026 · visual evidence matrix

Latest functional/source commit is `75884b7f794fa1dabc775d802613c38979eff4b8`. The release path now has canonical output containment and deterministic source digest protections; the Studio preserves focus and debounces preview recompilation; visual QA checks all 54 expected full-matrix screenshots (or 30 quick-mode screenshots) and rejects missing, unexpected, duplicate or wrong-dimension captures.

These are code changes plus added assertions, not an acceptance result. No current-branch Actions runs/checks/statuses are available. Real Node checkout/audit is blocked by the last known GitHub DNS failure, PHP parity is 0, Chromium has timed out, and no screenshots, human review, ZIP or SHA256 have been produced. Keep D7 OPEN. The next chat should attempt each viable environment route once, then move on or document the exact blocker rather than repeating retries.