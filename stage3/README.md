# Stage 3 — AI site ↔ CMS contract v1 (isolated development branch)

**Scope:** experimental, owner-authorized code work on `feature/stage3-ai-site-contract` only. **NOT merged to `main`; Stage 2 NOT ACCEPTED, no Hostinger/API/DB/deploy, no publisher, no claim that the full 135 mandatory capabilities are accepted.**

## What works now

1. A versioned, provider-agnostic **component manifest** for each section. A component is data (slot tree, field paths, strict types, bounds, explicit defaults), **not uploaded JavaScript**. Three registered starter components: company hero, features and contact.
2. A strict **site document** with globally unique stable IDs for pages, sections and elements, a single manifest version per component, separate `content.*`, `style.*`, `behavior.*` values, closed field lists and isolated media IDs.
3. A **control descriptor generator** that only exposes fields the selected element actually declared. Responsive controls declare desktop/tablet/mobile and use a documented fallback; missing properties never receive a generic CSS form.
4. A model-independent **starter composer** that accepts optionally supplied facts but can generate a fully editable two-page site with no design document or AI provider. It never pretends to know pricing, phone numbers, licenses, addresses or company testimonials.
5. An **upgrade planner** for changed component manifests. New typed fields get defaults; untouched old defaults adopt the new design; manually changed compatible fields preserve user values and element IDs. Removed/incompatible manually edited properties produce an explicit conflict with an opt-in `discard` resolution; no automatic overwrite.
6. Executable CLI + local fixture + one grouped contract E2E, tested on the separate branch.

## Run locally (Node.js 22+, no npm installation)

```sh
node stage3/tests/contract-smoke.cjs
node stage3/bin/ai-site.cjs validate stage3/fixtures/industrial-site.json
node stage3/bin/ai-site.cjs create --id=site-new --title="Без макета" > site.json
node stage3/bin/ai-site.cjs controls stage3/fixtures/industrial-site.json page-home section-hero section-hero-heading
```

## Contract examples

- `stage3/schemas/manifest-v1.schema.json` and `stage3/schemas/site-v1.schema.json` — portable JSON Schema 2020-12 for basic document structure. Runtime invariants, global uniqueness, registry references and cross-field restrictions are additionally enforced in `stage3/sdk/contract.cjs`. JSON Schema structural validation **alone is not sufficient**.
- `stage3/components/*.json` — component registration examples; no framework lock-in.
- `stage3/fixtures/industrial-site.json` — declared real-content *sample*; fictional names are not claims.
- `stage3/sdk/contract.cjs` — `validateManifest`, `registry`, `validateSite`, `controls`, `effectiveValue`, `sectionFrom`, `siteFromBrief`, `upgrade`.

### Upgrade policy

A manifest version must increase numerically. The updater proposes an **immutable candidate**, never applies site writes. Existing compatible owner overrides win; changed defaults propagate only for unedited values. Removing or changing a field with an owner edit returns `accepted:false` with explicit conflict keys such as `page-home/section-hero/action/behavior.href`. The caller must request an explicit `discard` resolution, cannot fabricate new property values through that decision, and must revalidate the candidate. There is no publish/save operation in this SDK.

### Important constraints

- This is the **Stage 3 contract foundation**, not a completed UI, server installer, multi-user CMS, form processor or actual AI generation. It is independent of any AI vendor by design.
- IDs never derive from CSS selectors or DOM position; dynamic schema generation must run only for registered, verified components.
- A property absent from the manifest is never editable. Unknown executable hooks, `javascript:` links, unsupported units, invalid media refs, duplicate IDs and unmapped/invalid values fail closed.
- `url` fields are links only, not a network-fetch instruction; no HTTP or JavaScript execution is permitted by the contract.
- No final acceptance of roadmap requirements #101–119 yet: those require integration with server persistence, editor and publishing in later stages.
- Revisions, cryptographic signatures, actual render adapters, upload processing, full WCAG checks and AI site generation are **future work**. No approval to merge, deploy or touch the user's Hostinger.

## Next large vertical after this foundation

Build a structured block renderer/editor adapter consuming only `controls()` and site manifests, followed by site content persistence, explicit save / publish separation and revision history on independently approved infrastructure. Keep Stage 2 gates #5–#9 separate.


## Local editor draft API (same isolated Stage 3 branch)

`stage3/sdk/draft.cjs` adds a real, provider-neutral **manual editor data path**:
`begin(site, manifests)` → `edit(session, manifests, {pageId,sectionId,elementId,path,value,breakpoint,expectedRevision})` → `blockPreview(session, manifests, pageId,sectionId,breakpoint)` → `changes()` / `undo()` / `redo()`.

Every field edit is checked against the verified component manifest and the **whole resulting document** before it can change the current local draft. The optimistic `expectedRevision` check refuses stale writes, unlimited undo snapshots are not allowed (max 30), and only the selected section is returned to the neutral preview adapter. Desktop/tablet/mobile values inherit as specified. This returns **data**, never active HTML/JavaScript, and does not save or publish anything. A later CMS host adapter must add authentication, persistence, locks, revision storage, escaping and an independently verified rendering boundary.


## v1.56 — работающий автономный браузерный Studio, 23.10.2026

**Код `4d7dc06ced179bb50f4020e249e8c1303d3a4479`; https://github.com/manufact-test/ai-site-cms/actions/runs/39946661843 SUCCESS.** [Скачать click-to-open Studio ZIP](https://github.com/manufact-test/ai-site-cms/actions/runs/39946661843/artifacts/12498631776) — распаковать и открыть `index.html` в Chrome/Edge. В ZIP только `index.html`, `studio.css`, `bundle.js`; Node/Composer/ключи/сервер/сеть не нужны.

Интерфейс `stage3/studio/index.html` создан поверх оригинального контрактного SDK без нового стороннего framework: страницы → выбранный блок → элементы → только реально зарегистрированные `content/style/behavior` поля. Версии desktop/tablet/mobile, редактирование и sandboxed inert `iframe.srcdoc`, Undo/Redo, явное «Сохранить черновик» с локальной историей до 12 версий, восстановление, экспорт/импорт строго валидированного JSON, новый сайт из дефолтного no-design brief. Нет автосохранения, working forms, HTTP API, AI API, аккаунтов, сервера или публикации. Браузерные локальные версии не заменяют надёжный серверный backup — используйте JSON-экспорт.

**Development:** `node stage3/studio/build.cjs` пересобирает офлайн-bundle из единого исходника (`contract.cjs`, `draft.cjs`, трёх manifests, fixture, `app.js`); `node stage3/studio/build.cjs --check` проверяет точное совпадение с Git. `node stage3/tests/contract-smoke.cjs` и `node stage3/tests/studio-browser.cjs` (требует установленный pinned playwright-core из `cms/editor` и настоящий Chromium). Workflow `.github/workflows/stage3-ai-contract.yml` собирает ZIP, запускает browser E2E и выкладывает скриншоты. Для будущего продукта нужно **связанное PHP-хранилище, аутентификация, права, отдельная публикация, renderer adapters и формы**, а не расширение демо ради демо.
