# Code-scope audit v1 · 27.10.2026 (pre-cleanup, evidence-based)
**Контекст:** lead \`feature/stage3-ai-site-contract\` @ \`f02b3b0a8512bcc3a6798271c56309db65ba5379\`, separate Design Factory \`feature/stage3-design-factory\` @ \`bbe084390a7fa2379bf4f80ea6ad607d3c7140b9\`. Main untouched. Это первичная **статическая** ревизия дерева и точечных ссылок; не выдавать её за полный dependency audit всех 551 файлов. Эту версию обновлять фактами, а не предположениями.

## Что установлено фактически
- Lead tree: 551 blobs, ~7.25 MB tracked sources/docs/tests: \`cms/\` 224, \`stage3/\` 125, \`research/\` 72, \`docs/\` 68, \`handoffs/\` 50. Размер Git дерева **не равен** размеру HTML/JS/PHP, реально загружаемому посетителем.
- Фабрики дизайнов **НЕТ в lead tree** (\`stage3/design-factory/**\` там отсутствует). Она в отдельной worker ветке. Owner rated visuals 2/10. **DO NOT MERGE**. Не удалять ради иллюзорного уменьшения runtime lead.
- \`stage3/media-motion/**\` нельзя удалять целиком: \`stage3/server/Api.php\` действительно подключает \`media-motion/contract.cjs\`, \`sha256.cjs\`, \`workbench/engine.js\` как ресурсы редактора. Нужен точечный анализ лишних *примеров, workbench и тестов*, прежде чем удалять.
- \`stage3/runtime-export/**\` задействован в \`.github/workflows/stage3-ai-contract.yml\` и ссылках \`stage3/studio/hosted.js\`. Нельзя объявлять весь каталог неиспользуемым; можно **отдельно** решать сколько export family нужно и нужны ли D4–D6 layers сверх реального handoff.
- \`cms/stage2-preview/**\` отдельно проверяется \`.github/workflows/stage2-static-editor.yml\`, но не считается автоматически production CMS. Старый demo/workbench — кандидат на removal after verifying no actual runtime dependencies; потребуется корректировка CI.
- \`stage3/sdk/contract.cjs\` уже содержит page SEO validation и navigation, \`stage3/studio/app.js\` содержит поля Title/Description/robots/OG и превью. Второй не должен переписать то же самое.
- \`stage3/server/Api.php\` / \`bootstrap.php\` и Studio имеют реальные формы и editor code; сайт/выпуск/FAQ нужно проверять на user journey, не считать реализацию отсутствующей по проценту 0/135.
- \`research/parallel-components/**\` и \`research/parallel-security/**\`: независимые исторические лаборатории. Большая часть не должна присутствовать в shipped product, но \`stage2-independent-research.yml\` может ссылаться на них; проверить. Candidate DELETE из активного дерева после переноса единственных нужных проверок, если они ещё критичны.
- \`stage3/release-audit/**\`: независимый audit lab (4 файла); проверить ссылки из CI/scripts и runtime перед удалением, не добавлять в продукт по инерции.

## Предварительная корзина
| Подсистема | Решение | Причина и следующее действие |
|---|---|---|
| \`stage3/sdk,schemas,components\` | KEEP + ADAPT | AI↔CMS contract, actual site registration, typed editing; проверить способность принять произвольный индивидуальный сайт без конверсии в пресет |
| \`stage3/studio\` | KEEP + UX FIX | Editor already large; не строить второй; проверить FAQ add/remove, editing, SEO, preview and early user review |
| \`stage3/server\` | KEEP + SLIM | API, private site data, publication, collector; служебные функции минимизировать по реальным путям |
| \`stage3/media-motion\` | KEEP CORE / REVIEW WORKBENCH | Server imports prove in-use; возможно убрать отдельные неиспользуемые демо после precise audit |
| \`stage3/runtime-export\` | KEEP REQUIRED / AUDIT EXCESS | HTML/PHP/React/Next requirement #176–178 and user handoff; collapse duplicated D* tools if safe |
| \`cms\` foundation | KEEP MINIMAL VERIFIED | Shared PHP runtime and site isolation; Stage2 host gates NO-GO, не ломать ядро |
| \`stage3/design-factory\` from worker | EXCLUDE / DO NOT MERGE | Продукт не готовые шаблоны; visual NO-GO, branch isolated |
| \`cms/stage2-preview\` | DELETE CANDIDATE | Legacy separate UI experiment, has own CI; not included in stage3 runtime until proven |
| \`research/parallel-*\` | DELETE CANDIDATE | Historical experiments, subject to CI and security provenance links |
| \`stage3/release-audit\` | DELETE CANDIDATE | Potential redundant audit not shown core runtime; verify references |
| Duplicate SEO/site converters/second editors | NO NEW CODE | Use existing core instead of parallel rewrites |

## Removal contract — strict and quick
For each candidate: (1) identify live include/import, API, bundle, CI, packaging, tests; (2) check whether required by requirements.csv, security or owner-visible product; (3) if not, delete source + orphan configs/CI in one focused change; (4) run one relevant existing smoke. Do **not** run days of new tests. Until evidence exists mark candidate; **false positive destructive deletion is worse than one unshipped research folder**. Git preserves history after tracked removal.

## Product gaps to audit before promising implementation
Prototype package: 3 static responsive images, client-facing all-interactions explanation, portable AI internal spec, explicit approval/version. Website build: match spec → existing CMS manifests that fully express real design. Site editor: repeaters FAQ/menus/forms and SEO changes in published output; full-page UX. Simplest one-site pilot is current lead's first success criterion, NOT a finished template catalog.

## Lead evidence update · 27.10.2026
- Inspected live PHP bootstrap, SiteRepository create/save/publish and PublicRenderer; SDK/browser manifest registration; Stage3 CI; Stage2 workflows. **KEEP** SDK, typed components, form delivery, media-motion engine referenced by API, site-scoped PHP storage, authentication, renderer, publishing/rollback, and runtime-export tools used in Stage3 CI.
- Stage2 preview and research labs still appear in separate main-targeted CI; **DEFER** their removal. Their presence in tracked source does not imply visitor bundle weight. No blanket deletion.
- Stage3 release-audit is a separate unimported lab: no reference in Stage3 bootstrap, Studio build, API or Stage3 CI. **REMOVE** its four tracked files only; Git history remains. It is not the second worker's new SEO assignment.
- Found concrete integration fault: SiteRepository::createSite rejects nonempty media arrays (correct protection), while Studio JSON import sends full external asset manifests. **ADAPT** server-hosted Studio to receive a pre-approved *folder* with three static images, client explanation and portable internal spec plus actual already-built site.json and local images. Reuse the existing authenticated image API, remap immutable IDs, Save a validated final site; no implicit Publish. Existing JSON import remains suitable for sites with zero assets.
- Still **MISSING** until verified on an actually approved design: faithful rendering from client artwork, independent custom component implementations, real mail recipient configuration and human UI acceptance. The folder path does not turn pictures into HTML and is not a template library.
- Factory interop and '+ Сайт без макета' are now **ADAPT/REMOVE CANDIDATES**, but the currently active browser smoke explicitly clicks the latter; replacement must include test correction, not breaking live CI through uninformed removal.

## Detailed subsystem disposition — lead implementation inventory
This matrix is **by deploy/import boundary**, not a claim that every historical file was dynamically executed. The 556-blob snapshot includes docs, research, old handoffs, CI labs and generated assets; Git repository size is NOT the visitor payload.

| Current area | Decision | Verified imports / user flow | What remains |
|---|---|---|---|
| `stage3/sdk/contract.cjs`, `draft.cjs` | **KEEP** | Studio build includes both; validates closed site/component manifests, changes, repeaters, responsive inheritance | Connect unique external designs without requiring preset composition |
| `stage3/sdk/design-graph.cjs` and PHP `DesignGraph.php` | **KEEP + ADAPT** | SDK + PHP site validator / renderer support typed graph | Human desktop/tablet/mobile visual fidelity on a real client spec |
| `stage3/sdk/design-graph-interop.cjs` | **REVIEW AFTER REPLACEMENT** | Embedded by Studio bundle and used by D7 import/handoff UI. **Not orphan.** | Remove old Factory-specific candidate import only with UI/build/browser parity migration |
| `stage3/sdk/recipes.cjs`, `stage3/components/*.json` (18), `schemas/*.json` (2) | **KEEP DECLARED, SLIM LATER** | Build/validator registers components; editor shows only fields of selected manifest | Some convenience preset/recipe UX conflicts with “not a constructor”; verify actual editor handlers before deletion |
| `stage3/studio/{app,composer,hosted,access,media-processing,studio.css}` | **KEEP + SIMPLIFY** | Actual single Studio; hosted routes, page/section editor, live preview, images, forms, FAQ, SEO | Remove excessive recipe/Factory/tool-center UI only after owner can use a full real site |
| `stage3/studio/bundle.js` | **KEEP GENERATED** | Offline build parity CI; not source-of-truth for modifications | Regenerate whenever SDK or app source changes, never hand-edit |
| `stage3/server/{Api,SiteRepository,ContractValidator,PublicRenderer}.php` | **KEEP** | Authenticated draft/save/publish/media + typed PHP rendering; actual end-to-end CI | External compiled handoff connection and real-site acceptance |
| `stage3/server/{FormGateway,FlexForm,FormDelivery}.php` and collector | **KEEP** | Real form delivery/validation/antispam path, not only screenshots | Real recipient configuration and delivery acceptance are environment-specific |
| `stage3/server/{AccessControl,SiteArchives,PageHistory,SiteOperations,MediaOperations,LinkOperations}.php` | **KEEP** | Auth, revision/rollback, media/link management in actual API and hosted editor | Thin confusing operator UX later, not rebuild |
| `stage3/server/{LeadWorkflow,CrossSiteCollections,CrossSiteTransfer,Licenses}.php` | **ADAPT / SCOPE REVIEW** | Already imported from PHP bootstrap and exposed in hosted API/UI, therefore NOT safe-to-delete | Check against explicit no-CRM/no-global-database/no-billing boundary. Preserve form submissions/security; no automatic CRM expansion |
| `stage3/server/TechnologyHandoff.php` | **KEEP** | Routes deliver supported external technology runtimes | Clarify PHP shared host versus SSR external runtime |
| `stage3/media-motion/lib/*.cjs`, `workbench/engine.js` | **KEEP** | API serves the engine/contract/sha files; used by current editing | Keep real media defaults and reduced-motion |
| `stage3/media-motion/workbench/{app.js,index.html,styles.css}`, examples/tests | **DEFER / LAB REVIEW** | Auxiliary workbench, distinct from imported engine; do not equate it with public bundle | Check standalone tool consumers before deleting any example |
| `stage3/runtime-export/**` (27 files) | **KEEP REQUIRED / REDUCE EXCESS LATER** | Explicit Stage3 CI D3–D6/Next probes and hosted technology center | Avoid parallel packaging/release workflows beyond simple user deployment |
| `stage3/release-audit/**` (4 files) | **REMOVED** | No bootstrap import, Studio inclusion or Stage3 CI reference; purely isolated audit lab | None; recoverable from Git |
| `cms/src`, `cms/editor`, `cms/public`, installer | **KEEP STAGE2 FOUNDATION** | Main Stage2 CI, release/install/security; Stage3 browser test driver from `cms/editor` | Determine minimal shared deployment before replacing any foundation |
| `cms/stage2-preview/**` (25 files), `cms/tools/**` research/release utilities | **DEFER** | Explicit Stage2 CI, independent owner review kit, legacy demos | Remove only when Stage2 workflow is retired/replaced with approved Stage3 equivalents |
| `research/parallel-components/**` (50), `parallel-security/**` (22) | **DEFER NONSHIPPED** | Main-targeted `stage2-independent-research.yml` and `stage2-static-editor.yml` depend on them | Old research not part of published site. Migration decision belongs to Stage2/CI cleanup, not unsafe deletion |
| `stage3/design-factory/**` | **EXCLUDED** | Entire folder is absent from this lead tree; other branch not merged | Do not import old 12/42 template plans |
| `stage3/seo-engine/**` | **EXTERNAL WORKER** | Second developer only; no files integrated at audit time | Integrate only after contract compatibility and owner scope match |
| `docs/**`, `handoffs/**`, `PROJECT-STATUS.json` | **ARCHIVE/UPDATE ONLY WHEN NECESSARY** | Historical project record; large but not server runtime | MASTER v2.0 supersedes outdated “CURRENT” banners; no cosmetic mass rewrite |

### Concrete pilot acceptance ledger (not a fake percentage)
- **Existing verified implementation surfaces**: typed site manifest + stable IDs; API site/draft/save/publish; revision/history/restore; component repeater ops in SDK; SEO model; form collectors and media storage; PHP public rendering; one Studio.
- **Implemented by lead in this handoff**: compatible *approved-folder* import for **completed** site + uploaded PNG/JPEG/WebP bytes; checks presence of three image proofs and separate explanations/spec; no deploy; no arbitrary HTML execution. [Usage contract](../stage3/docs/APPROVED-SITE-PACKAGE.md).
- **Need an actual finished external pilot**: non-templated site file/code obeying current typed vocabulary, comparison against three actual approved design images, human UX acceptance, live-form delivery with real configured recipient in an authorized isolated environment, remaining mandatory #1–193 decisions. Report all constraints explicitly; working fixture ≠ owner acceptance.
- **Security invariant**: failed multi-image import can leave an incomplete draft/revisions (clearly reported); visitors see only explicit successful publication. Existing atomic image/revision and isolation logic is untouched. Before an external release consider an atomic batch endpoint if owners routinely import many media files, rather than bypassing the current checks.

### Lead integration update · 28.10.2026 (candidate implementation, not owner approval)
- **Individual external layouts:** registered `stage3/components/custom-section.json` is an explicit graph-only page section. The external author can provide unique typed Design Graph trees (containers, links, media, responsive styles, hover/focus, safe motion), without fitting visuals into the old 18 preset component layouts. JS SDK and PHP validator reject a missing graph for that component. Studio can add an editable custom section with a safe starting graph. No arbitrary executable external HTML/CSS/JS.
- **Handoff folder:** `stage3/studio/hosted.js` imports complete approved-format folders through existing site API and media storage with separate Save/Publish. Image preflight checks signature/decode and declared dimensions before creating site. `stage3/bin/verify-approved-site.cjs` offers a read-only offline compatibility check; `stage3/docs/APPROVED-SITE-PACKAGE.md` gives the operator/external AI specification.
- **Editing surfaces:** existing editor repeaters now show specific FAQ question controls, disabling bounds/edge actions and confirming delete; first-site browser scenario covers FAQ, responsive headings, SEO, public images and draft revision isolation.
- **Efficiency:** `.github/workflows/stage3-ai-contract.yml` now cancels obsolete checks for superseded branch commits; the latest commit still runs full existing CI. This removes duplicate runner load without declaring tests unneeded.
- **Honest status:** above are implementation candidates. They do not establish pixel-level conformance to real client-approved desktop/tablet/mobile images; custom header/footer and unsupported interactions still need explicit first-party controlled capability work, not freeform code import. No owner sign-off, stage completion percentage or production release is implied.


## Дополнительная функциональность и границы · 28.10.2026
- External handoff v2: `stage3/bin/seal-approved-site.cjs` фиксирует SHA-256 для сайта, макетов, описаний, image variants, `stage3/bin/verify-approved-site.cjs` сверяет байты, `stage3/studio/hosted.js` блокирует импорт изменённого пакета **до серверной записи**. Это integrity-lock, **не цифровая подпись клиента**.
- Pre-import review: Studio показывает 3 настоящих изображения макетов и **локально отрендеренный CMS-сайт** на 1280/768/390 px, позволяет выбрать страницу; preview генерирует только первый-партийный типизированный код и локальные data-images в iframe без прав выполнения скриптов/форм. Это **не автоматический pixel-diff, не доказательство визуального соответствия**.
- `stage3/bin/audit-approved-site.cjs` создаёт офлайн-матрицу ручной приёмки по страницам, SEO, assets/ALT, FAQ и релизным действиям. Ничего не публикует и не ставит фиктивные галочки.
- Реальный browser E2E на ранее завершённом CI `40650797502` дошёл до сохранения/публикации и упал на последней FAQ-проверке (ожидался не тот вопрос после Move/Delete). Сквозной тест теперь проверяет идентичность и фактический порядок элементов. Его окончательный результат и сценарий новой визуальной проверки надо сверить по новому CI; статус **не считать зелёным без GitHub conclusion=success**.
- Важно: HTML из первого-party JS Studio preview и PHP public renderer не тождественен во всех деталях; UX-предпросмотр — вспомогательное сравнение, после публикации нужен реальный 3-breakpoint screenshot/review на настоящем сайте. Пакет макетов и документов пока остаётся у владельца как **локальный архив**, CMS не сохраняет эти файлы в БД.
- Неиспытанные реальные условия: внешний заказчик, полноразмерные макеты, интерактивное поведение оригинального дизайна, owner sign-off, реальные каналы форм и production. **Не заявлять завершение этапов по формальному smoke.**
