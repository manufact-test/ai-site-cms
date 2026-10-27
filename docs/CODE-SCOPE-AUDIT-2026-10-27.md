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
