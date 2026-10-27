> ⛔ **АКТУАЛЬНОЕ РЕШЕНИЕ ВЛАДЕЛЬЦА, 27.10.2026 — VISUAL NO-GO (2/10).** Дизайны Design Factory отклонены: однотипность, чрезмерная типографика, неправильные отступы. **Приоритет изменён: сначала изучить профессиональные источники и создать 3 разные качественные адаптивные сайты; только после явного визуального GO расширять каталог/интегрировать.** Обязательны [DESIGN-RESET-2026-10-27.md](../DESIGN-RESET-2026-10-27.md), [DESIGN-REFERENCE-PLAYBOOK.md](../DESIGN-REFERENCE-PLAYBOOK.md), [ЗАДАНИЕ ВТОРОМУ РАЗРАБОТЧИКУ](../handoffs/DESIGN-REBUILD-SECOND-DEVELOPER-2026-10-27.md). Старые фразы «12 профессиональных тем», «42 композиции», «86%», «следующее — закрыть D7» **НЕ ЯВЛЯЮТСЯ** актуальным дизайн-заданием или оценкой готовности; ниже сохранена история. Lead провёл машинную проверку D7 в отдельной ветке: [CI SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40567001862), но визуальная приёмка владельцем FAIL. Никакого merge/deploy.

# D2 Visual Systems — catalog and integration boundaries

Design Factory owns a first-party **closed, offline** set of 12 visual directions under catalog/themes.cjs. Each direction contains:
- An exact **CMS-expressible** site theme: background, surface, text, primary, font, maxWidth.
- Existing supported CMS section appearance: surface, spacing, align.
- Responsive company-hero font sizes within real manifest bounds (desktop/tablet/mobile).
- A **preview-only** design token set: layout, art motif, card treatment, display type, tracking, navigation, density.
- Machine-computed background/text and surface/text contrast ratios, with minimum **4.5:1**. Button primary against white text also enforces 4.5:1.
- No external typefaces, images, scripts, imports, remote resources or hand-supplied CSS snippets.

## Twelve design languages

| ID | Design intent | Layout | Art | Cards | Density |
|---|---|---|---|---|---|
| editorial | Printed editorial, breathing room | split | frame | paper | relaxed |
| technical | Precise B2B information system | split | grid | bordered | dense |
| minimal | Contemporary quiet portfolio | centered | circle | floating | relaxed |
| noir | Dark luxury / striking portfolio | offset | stair | bordered | relaxed |
| brutalist | Strong graphic statements | stacked | block | bordered | dense |
| atelier | Warm architectural storytelling | offset | arch | floating | relaxed |
| verdant | Organic craft and services | split | circle | paper | relaxed |
| oceanic | Calm technical / environmental | stacked | wave | floating | relaxed |
| copper | Material craft, concise rhythm | offset | block | paper | dense |
| plum | Artistic gallery and publishing | centered | arch | floating | relaxed |
| cobalt | Structured SaaS / technical | split | grid | bordered | dense |
| mono | Modern monochrome typography | stacked | frame | paper | relaxed |

Layouts are accompanied by local responsive CSS: two-column desktop splits convert to one-column at tablet, card grids collapse at mobile, navigation wraps and remains keyboard accessible, native FAQ works without JS, and reduced-motion disables animation/transitions. Hover/focus-visible and accessible CTA treatments are part of the standalone visual preview. Disabled controls are not implied when the preview has no form controls.

## Contract and parity

Exact, existing PHP/JS CMS properties are solely **cms** and **appearance** plus a supported company-hero typography field. They are validated by the registered SDK and manifests.

Preview-only:
- layout: split, centered, stacked, offset
- art: frame, grid, circle, stair, block, arch, wave
- card: paper, bordered, floating
- display: serif, sans
- tracking: wide, normal, tight
- nav: line, solid
- density: relaxed, dense

These tokens affect **only** the offline Design Factory CSS viewer today. They are **integration_required** for a comparable CMS PHP/Studio experience and must NOT be injected into the closed site-v1 document.

Switch visual themes using the CLI create/export project theme ID, e.g.:

    node stage3/design-factory/bin/design-factory.cjs create --kit agency --theme noir --out /tmp/df-noir.json

The reusable project's theme field can be changed and recompiled without changing owner data. Standalone preview CSS also changes grid, art, cards and rhythm, not only palette.

## Verification and remaining D2 work

- Current checks executed against the real Stage3 SDK with a JS-runtime harness: **72 successful combinations** of 3 kits × 12 themes × RU/EN, four pages per site and zero link errors.
- Unique CSS is generated for each named direction; automatic text contrast checks passed for 12/12 themes.
- Integrated Node test file exists at tests/smoke.cjs for rerun by an integrator on the checked-out repository.
- Outstanding before declaring D2 fully accepted: real Chromium visual QA at desktop/tablet/mobile for all 12 directions, keyboard/focus visual QA, correction of any evident visual defects. Browser catalog/editor functionality is scheduled in D5. No claim of PHP pixel parity.

Formal project acceptance is unchanged (Stage2 NO-GO; Stage3+ unaccepted; 0/135).
