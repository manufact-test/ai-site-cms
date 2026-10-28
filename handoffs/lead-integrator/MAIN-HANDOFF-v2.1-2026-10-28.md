# AI Site CMS — MAIN LEAD HANDOFF v2.1 · 28.10.2026

> **АКТУАЛЬНОЕ ДОПОЛНЕНИЕ (28.10.2026, крупный интегрированный блок).** Старые разделы ниже сохранены как историческая передача и местами УСТАРЕЛИ: они утверждают, что исходные макеты не сохраняются, PHP-предпросмотр не сравнивается с прототипом и E2E красный. Это уже неверно. Состояние на ветке определяется последним HEAD и GitHub Actions, а не старыми SHA. Смотри [APPROVED-SITE-PACKAGE](../../stage3/docs/APPROVED-SITE-PACKAGE.md) и [ROADMAP](../../docs/ROADMAP.md).

## Изменения после первоначальной передачи — читать прежде старого статуса

- **Импорт sealed v2:** проверка SHA256, 3 full-page оригинала, client-facing/internal specs, индивидуальный Design Graph, реальные media assets, safe resume после прерывания; автоматически **не публикует**.
- **Приватные доказательства:** все семь файлов утверждённого исходного пакета уже сохраняются в owner-only Stage3 DB, immutable/versioned SHA256, допускается дозагрузка. Их можно увидеть в Studio **«Материалы согласования»**.
- **Визуальный просмотр:** owner-only исходные макеты прямо в **«Проверке сайта»** рядом с реальным PHP full-page draft для desktop/tablet/mobile; защищённая проверка байтов перед показом, диагностические параметры загрузки и экспорт JSON протокола с packageSha. Без автоматического утверждения клиентского дизайна; для внутренних страниц не подразумевается отдельный утверждённый макет.
- **Backup v2:** полное сохранение исходного утверждённого пакета + всех прежних данных в `manufact-site-backup-v2`, preflight полного SHA256 ledger, атомарное восстановление на **новый, неопубликованный** site ID, поддержка исторического backup v1. Источник остаётся byte-identical даже если восстановленный сайт переименован. Existing DB requires CLI-only `STAGE3_ALLOW_APPROVAL_UPGRADE=YES php stage3/server/bin/upgrade-approval-evidence.php`; `main` и production НЕ обновлялись. 64MB полный архивный лимит.
- **Проверки:** сквозной Chromium/PHP/SQLite с реальной v2-папкой, проверкой всех оригинальных байтов, подмены SHA-256, восстановлением и вторичным backup; отдельные Technology Runtime checks. Последний успешный запуск до этого дополнения `https://github.com/manufact-test/ai-site-cms/actions/runs/40677794796`, commit `752d6c14b0b52209a8d2fe4e730bd281f3e2dbf9`. После любого нового коммита перепроверить соответствующий запуск.
- **Самый существенный незакрытый барьер:** реальный созданный ВНЕ CMS клиентский сайт после настоящего утверждения desktop/tablet/mobile изображений и обеих спецификаций. НИКОГДА не выдавать синтетический fixture, скриншоты Chrome или зелёный CI за внешнее утверждение/owner GO. Сначала настоящий пилот; затем большой проход по несовпадениям, редактирование/Save/Publish/Rollback; только потом UX-polish.
- **Ритм:** одна большая вертикаль, несколько крупных связанных задач за заход; не зацикливаться на мелких тестах. Не изменять `feature/site-seo-engine` и `stage3/seo-engine/**`, `main`, Hostinger, CELIKOM, старую Design Factory; не merge/deploy.


**Owner request:** switch the main chat after this large development batch. New chat is the **sole lead engineer and integrator**. Work autonomously in **large, combined feature slices**, avoid recurring tiny fixes, cosmetic test cycles and long narrations. Commit code to GitHub without asking for permission each time. The second chat remains an independent SEO specialist.

## Required starting points

- Repository: https://github.com/manufact-test/ai-site-cms
- Main engineering branch: `feature/stage3-ai-site-contract` — **read HEAD at start**, don't work on main or stale SHA.
- Separate SEO worker: `feature/site-seo-engine` — worker alone owns `stage3/seo-engine/**`.
- Main product authority: [../../docs/MASTER-TZ.md](../../docs/MASTER-TZ.md)
- Prioritized product plan: [../../docs/ROADMAP.md](../../docs/ROADMAP.md)
- Keep/adapt/remove and known limits: [../../docs/CODE-SCOPE-AUDIT-2026-10-27.md](../../docs/CODE-SCOPE-AUDIT-2026-10-27.md)
- Portable approved website docs: [../../stage3/docs/APPROVED-SITE-PACKAGE.md](../../stage3/docs/APPROVED-SITE-PACKAGE.md)
- 193 original requirements: [../../requirements/requirements.csv](../../requirements/requirements.csv)
- Previous history: [MAIN-HANDOFF-v2.0-2026-10-27.md](MAIN-HANDOFF-v2.0-2026-10-27.md)

## Product — do not misunderstand

AI Site CMS is a *lightweight CMS for externally AI-developed custom websites*, not an AI site generator, WordPress clone, template factory, CRM or SaaS. An AI developer **outside** the CMS researches a real client, prepares three **static images** of each design option (desktop/tablet/mobile), writes a complete client-facing UX/interaction explanation and an internal implementation spec. Only **after real client approval** the developer builds the finished custom site, then connects it to the CMS via a typed data contract. The owner can change text, images, responsive styles, blocks/repeaters, SEO, save drafts, publish and rollback; the site must retain distinctive approved layout. Do NOT reintroduce old `stage3-design-factory` (owner rated 2/10); no untrusted HTML/JS/PHP imports.

## What we actually delivered in the last two chats

1. Added `custom-section@1.0.0`: individually authored sections encoded in already validated first-party `designGraph` (PHP renderer + Studio preview). External custom sections without graphs fail validation; not a universal arbitrary-code bridge.
2. A portable approved-folder import in authenticated owner Studio. Three static prototypes, `site.json`, client explanation, implementation specification and local image files are checked before creating a site. API creates an unpublished seed, uploads real media under server-issued IDs, replaces the seed in one validated Save, then owner separately publishes. An interrupted import **can leave an unpublished partial draft**; no transactional all-or-nothing upload exists yet. Do not claim otherwise.
3. Versioned integrity: `stage3/bin/seal-approved-site.cjs` creates v2 SHA256-locked handoff after explicit owner confirmation; `stage3/bin/verify-approved-site.cjs` checks it read-only. Legacy v1 remains supported. Integrity check detects local byte changes, **not proof of client identity or approval**.
4. New visual operator gate: three actual prototype images and both specs appear next to real first-party preview of authored pages **at 1280/768/390 px**, with page selector. Local image bytes are embedded into sandboxed, non-interactive preview iframes. Cancel performs no database write; confirm imports draft only. Not automated pixel-diff and not a substitute for real published PHP screenshot comparison.
5. New `stage3/bin/audit-approved-site.cjs` emits a read-only Markdown owner checklist: page URLs, SEO metadata, FAQ/form/media inventory and a per-page desktop/tablet/mobile manual acceptance matrix. Its checkboxes start unchecked.
6. Existing real Chromium hosted test covers external custom section + media + FAQ + responsive heading + SEO + Save/Publish. Earlier CI `40650797502` passed actual import/publish but the final FAQ assertion saw a different question after rearrangement. Browser test now checks intermediate item identities/ordering to locate a real bug vs unstable action; **must verify newest run**.
7. Earlier work: media processing/variants, site-owned assets, server auth, public renderer, backups/revisions, forms, SEO, technology exports, visual editing UI and separate SEO worker path already exist. Avoid duplicate subsystems.

## Commands for the *real* approved folder

```sh
node stage3/bin/seal-approved-site.cjs /ABS/PATH/approved-site client-approved-v1 --confirmed-approved
node stage3/bin/verify-approved-site.cjs /ABS/PATH/approved-site
node stage3/bin/audit-approved-site.cjs /ABS/PATH/approved-site > pilot-acceptance.md
```

For an existing handoff use `--confirmed-approved --replace` only after actual client reapproval. The CLI does not call AI, upload anything or publish. Store prototype files and approval record outside CMS; those files are currently **not persisted by CMS**. `stage3/tests/contract-smoke.cjs` exercises sealed-folder check and report; `stage3/tests/hosted-browser.cjs` covers actual server/browser flow in CI.

## Current status and known gates (read, do not overclaim)

- Main branch baseline at start of this batch: `785364c12bb9e8d467e822c27e5e0a597af7ebb4`. This batch subsequently added preview, worksheet, test and docs commits. **Resolve newest lead SHA and GitHub Actions at takeover**; previous latest documented implementation commit `ea46de16c8bca70735e47a23eb7d76dd6781eb14` (before this handoff file).
- The newest workflow run was still pending/in progress when documentation was written. Never report the workflow green without observing conclusion=success. The prior CI published test site but failed its last FAQ expectation; the root behavioral cause may remain until new focused identity assertions settle it.
- A synthetic approved test package is **not a real client-approved finished site**. We have **no sign-off on actual visual fidelity** and no owner GO for a first custom website. Do not assign a misleading percentage to completion.
- Review iframe is JS Studio renderer, not pixel-for-pixel equivalent to public PHP. Need compare real published output on all three viewports. This is the first genuinely meaningful acceptance gate.
- Current Design Graph is typed and bounded; some advanced custom behavior/header/footer structures may not be expressible yet. Expand *only* when proven necessary by the actual customer pilot, with security/typed validation.
- Server import can leave isolated unpublished seed after error. A follow-up should provide **safe retry/recovery or atomic import**, not unsafe deletion of published data.
- Main remains outside production. No main merge, Hostinger deployment, CELIKOM live operation or old Design Factory reuse without explicit owner decision.

## The next main-chat development plan — high priority, BIG slices

**Slice A — finish the actual first-site vertical:** immediately inspect latest GitHub Actions on lead branch; fix any real browser FAQ/review regressions decisively. Then select one full externally produced customer pilot (or ask for *only actual necessary assets* when owner ready), load v2 handoff and work through a representative real website with custom sections and correct media. Compare rendered public HTML with approved 3 images, no templated fake substitute. Document mismatch in an actionable list, fix it in one sizeable pass, keep existing CMS features.

**Slice B — owner-use real workflow:** ensure one external site passes `preflight -> review -> import -> edit H1+image+responsive -> add/delete/reorder FAQ -> edit SEO -> Save -> Publish -> check public 3 widths -> rollback`. Verify editor changes do not distort approved visual composition. Address interruption/recovery for multi-image imports and file-size constraints based on real package. Do not silently copy client source into a generic layout.

**Slice C — close product not labs:** only after Slice A+B, evaluate CMS UI controls and missing real client capabilities; integrate SEO worker's isolated files when delivered and reviewed. Do only essential tests; prioritize milestone completion, owner demonstration and genuine 135-mandatory requirements ledger reconciliation before production claim.

## Operational boundaries

- Lead branch `feature/stage3-ai-site-contract`, full core permitted. SEO worker branch `feature/site-seo-engine` and `stage3/seo-engine/**` **off limits to lead** until deliberate integration review.
- Do not update production, main, Hostinger, CELIKOM or old Design Factory.
- GitHub Actions concurrency cancels outdated runs on new pushes; after significant coding let final run finish or explicitly hand off pending status instead of multiplying checks.
- Communicate in Russian with owner; make large commits and short honest progress summaries; one actual useful result is better than repeated 'next small task' messages.
