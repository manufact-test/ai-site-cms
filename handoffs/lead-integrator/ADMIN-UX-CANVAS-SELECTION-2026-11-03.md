# MANUFACT AI Site CMS — main-canvas selection and scroll continuity
Date: 2026-11-03
Role: Lead Integrator
Status: source implemented; final CI SUCCESS 4/4; owner hands-on review remains a separate gate.

## Exact checkpoint

- Repo: https://github.com/manufact-test/ai-site-cms
- Branch: `feature/stage3-ai-site-contract`
- Functional SHA: `2d3db6e25fd61dcab3a4a24d4ca5f54f7e2c504c`
- CI: https://github.com/manufact-test/ai-site-cms/actions/runs/41661403198 — **SUCCESS 4/4** (contract + genuine Chromium, Next runtime, MariaDB 10.11/11.8).
- Real Chromium screenshot artifact: https://github.com/manufact-test/ai-site-cms/actions/runs/41661403198/artifacts/13243096641. A canvas-selection desktop screenshot and earlier mobile Inspector geometry evidence were visually reviewed.
- Last verified fallback: `be2a0169a686cd2b118b8e721547f8050a827cc8`, CI #41660481727 SUCCESS 4/4.
- Previous documentation checkpoint: `37cf07ce20af75ab1f2cbd9fe195ff59a9185c1c`.

## Why this change

The owner's main pain is the gap between visual page and task-based Inspector. Previously the default Studio canvas showed a full real page, but a click on a visible heading or card could not choose its underlying element; the user had to navigate the tree or open the full-screen Workbench. The main preview also risked jumping to top when drawing changed or the responsive mode switched.

## What changed in existing Studio

1. `stage3/studio/index.html`: the main iframe uses `sandbox="allow-same-origin"` and a no-referrer policy, still without script/forms/navigation privileges. A short canvas footer now tells the owner what a click does.
2. `stage3/studio/app.js`: a parent-only `load` handler binds actual current-page section IDs, safe visible manifest text, media and repeated card IDs. Clicking a bound element sets `inspectorScope='element'`; clicking section background sets `'block'`. Selected targets are visibly outlined in the transient preview document. Graph nodes are deliberately not guessed: their existing full-page Workbench remains authoritative.
3. Keyboard focus on rendered section plus Enter/Space selects the corresponding block. Inspector scroll and mobile reveal follow the selected context. Preview scroll is preserved when redrawing the same site/page and when switching desktop/tablet/mobile. Changes of site/page reset the remembered scroll position.
4. `stage3/studio/bundle.js` is updated in lockstep with `app.js` via the original hermetic build concatenation; no SDK manifest, typed schema, PHP route, database, migration or publication state changes.

## Test evidence

- `stage3/tests/studio-browser.cjs`: actual Chromium click on hero text after selecting another section, click on another section's background, focus+Enter keyboard selection, draft byte equality before/after, scroll retention, repeat gallery card click, screenshot `stage3-canvas-click-selection.png`.
- `stage3/tests/approved-site-browser.cjs`: real authenticated PHP-rendered approved-site Studio preview click opens block scope and preserves draft.
- The first subset `be2a016` passed 4/4 full CI. The verified media/repeater and keyboard extension is in `2d3db6e25fd61dcab3a4a24d4ca5f54f7e2c504c`; use run #41661403198 for final 4/4 proof.

## Boundaries and what remains

- `allow-same-origin` is intentionally **not** `allow-scripts`. Preview CSP still forbids script execution, and parent handlers prevent links and form submission. The main canvas is an editor picker, not a public interactive preview; the existing Workbench/release review owns deeper site interaction.
- Only validated manifest matches select a specific element. Ambiguous/unmatched content selects its containing section, not an invented field; Design Graph internals are edited in the existing Workbench.
- No FOX deployment, no Stage2/main/prod changes, no private DB/Cron/secrets changes and no client landing created. FOX runs an older version.
- Full CI is green; inspect screenshot and collect owner feedback, then request owner UX feedback. When owner authorizes, separately plan controlled reversible FOX update and hands-on page/block/element/media/FAQ/SEO/Save/Review/Publish/Rollback test. First real site starts only after original landing and three static mockups approved.

## Read next

`docs/NEXT-CHAT.md` top; `stage3/docs/ADMIN-UX-ARCHITECTURE-2026-11-03.md`; `stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md`; `docs/MASTER-TZ.md`; `docs/ROADMAP.md`.
