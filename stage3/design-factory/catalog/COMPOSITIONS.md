> ⛔ **АКТУАЛЬНОЕ РЕШЕНИЕ ВЛАДЕЛЬЦА, 27.10.2026 — VISUAL NO-GO (2/10).** Дизайны Design Factory отклонены: однотипность, чрезмерная типографика, неправильные отступы. **Приоритет изменён: сначала изучить профессиональные источники и создать 3 разные качественные адаптивные сайты; только после явного визуального GO расширять каталог/интегрировать.** Обязательны [DESIGN-RESET-2026-10-27.md](../DESIGN-RESET-2026-10-27.md), [DESIGN-REFERENCE-PLAYBOOK.md](../DESIGN-REFERENCE-PLAYBOOK.md), [ЗАДАНИЕ ВТОРОМУ РАЗРАБОТЧИКУ](../handoffs/DESIGN-REBUILD-SECOND-DEVELOPER-2026-10-27.md). Старые фразы «12 профессиональных тем», «42 композиции», «86%», «следующее — закрыть D7» **НЕ ЯВЛЯЮТСЯ** актуальным дизайн-заданием или оценкой готовности; ниже сохранена история. Lead провёл машинную проверку D7 в отдельной ветке: [CI SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40567001862), но визуальная приёмка владельцем FAIL. Никакого merge/deploy.

# D3 — 42 original responsive section compositions

The catalog is first-party and offline. It is **not** a list of 42 new PHP CMS components. It is a visually diverse set of semantic compositions with explicit compatibility metadata and a separately versioned bridge.

## Browse

From the repository root:

```sh
node stage3/design-factory/bin/design-factory.cjs compositions
node stage3/design-factory/bin/design-factory.cjs compositions portfolio
node stage3/design-factory/bin/design-factory.cjs showcase /tmp/design-factory-showcase-new
```

Open `/tmp/design-factory-showcase-new/index.html` locally. It contains **42 working semantic HTML previews** in 14 categories, keyboard-navigable category links, focus states, native FAQ accordions, real page structure, documented owner-data requirements, hover and desktop/tablet/mobile styles, horizontal scroll-snap where specified, and a reduced-motion stylesheet. All visuals are local CSS. The showcase contains no remote media, scripts, fake customer claims or active external links.

The export includes `showcase.css`, `compositions.json` and `fallbacks.json`. Outputs only go to a caller-selected NEW directory; overwrite is refused.

## CMS-validated semantic fallback

```sh
node stage3/design-factory/bin/design-factory.cjs compose hero-center --out /tmp/cms-hero-site.json
node stage3/design-factory/bin/design-factory.cjs compose gallery-mosaic --out /tmp/cms-gallery-site.json --report /tmp/gallery-bridge.json
node stage3/design-factory/bin/design-factory.cjs validate /tmp/cms-gallery-site.json
node stage3/design-factory/tests/compositions-smoke.cjs
```

The `compose` command creates a complete 4-page Stage3 `manufact-ai-site-v1` document, replacing the final section on the home page with a genuine registered SDK component from `sdk.sectionFrom`. `--brief` may point to an existing Design Factory v1 project to reuse owner-approved text, theme and site ID. Local routing and stable ID checks run before creating output.

Supported semantic fallbacks (using actual Stage3 component manifests):

| Composition group | Real registered CMS component | Richer preview status |
|---|---|---|
| hero | `company-hero` | Visual CSS enhancements need PHP parity |
| benefits | `feature-highlights` | Visual CSS enhancements need PHP parity |
| services | `service-grid` | Visual CSS enhancements need PHP parity |
| FAQ | `faq-accordion` | Visual CSS enhancements need PHP parity |
| contact | `contact-panel` | Visual CSS enhancements need PHP parity |
| CTA | `cta-banner` | Visual CSS enhancements need PHP parity |
| process | `feature-highlights` | `integration_required` |
| team | `media-story` | `integration_required` |
| portfolio | `media-story` | `integration_required` |
| pricing | `service-grid` | `integration_required` |
| testimonials | `feature-highlights` | `integration_required` |
| gallery | `photo-gallery` (empty owner media bindings) | `integration_required` for responsive gallery visuals |
| trust | `feature-highlights` | `integration_required` |
| editorial | `media-story` | `integration_required` |

Every adapter output remains a valid registered component. **That does not mean the PHP renderer already supports the original richer composition.** Unsupported functionality is never inserted into closed site-v1 as imaginary properties.

## Quality and content requirements

Each composition declares:
- Independent layout, decorative treatment, alignment and density tokens, using enums.
- Responsive behavior at desktop, tablet, mobile and accessible focus/keyboard behavior.
- Requirements for owner data, known unsafe content, human-review requirement and fallback.
- Whether a future first-party manifest and PHP/Studio adapter is required.

No fabricated pricing, testimonials, staff, photos, client projects, awards, statistics or contact addresses. Illustrative copy visibly requests verification, and no decorative photo placeholder is represented as actual imagery.

The proposals for 8 future first-party components are in [proposals/ADAPTERS.md](../proposals/ADAPTERS.md). They are implementation notes for the lead, **not working CMS components**.

## Status and verification

- 42/42 semantic fallback mappings validated with the actual Stage3 SDK using isolated JavaScript evaluation. Zero broken internal routes.
- 42/42 showcase entries have true generated HTML and CSS, native expandable integration notes and two responsive breakpoints.
- One Node end-to-end suite has been authored at `tests/compositions-smoke.cjs`, to be run on an actual repository checkout.
- Actual Chromium three-viewport visual acceptance of these new compositions remains pending in this environment. Do not mark browser smoke PASS before it runs on the checked-out sources.
- This D3 block is **implemented for further integration/visual review**, not the completion of D2, D4–D7 or any formal CMS acceptance.
