# Lead Integrator — Stage3 long-page block continuity and compact Inspector focus (2026-11-04)

## Exact verified checkpoint

- Repository/branch: `manufact-test/ai-site-cms` / `feature/stage3-ai-site-contract`.
- Previous verified SHA: `8b296f5712fa3ed15d239fc7195b775d0cf6aa02` ([CI #41715883449 SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41715883449)).
- Functional block preservation: `93453d3ba4a4cb5726d505cbe069975e11e2f743`. Initial #41718366352 **failed** an existing hosted compact focus visibility check (offline Studio browser passed); this SHA alone is **not** a release candidate.
- Compact navigation visibility fix and final verified candidate: `0407261da853c29333fe795cdfd86901c577cdac`.
- [No-deploy full CI #41719118651 — SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41719118651): Contract + genuine offline/hosted Chromium, Technology Runtime, MariaDB 10.11, MariaDB 11.8.
- [Real Chromium screenshots #13272295557](https://github.com/manufact-test/ai-site-cms/actions/runs/41719118651/artifacts/13272295557), [dedicated FOX runtime-only ZIP #13271450998](https://github.com/manufact-test/ai-site-cms/actions/runs/41719118651/artifacts/13271450998), integrity digest `sha256:2162308b166bd3b60f1a80c0f4f46ea90f31396d98c639e805bd529319c04829`, expiry 2026-11-10T21:12:53Z.
- Documentation HEAD is the commit that adds this handoff; record its SHA after committing. The functional CI SHA remains `0407261da853c29333fe795cdfd86901c577cdac`.

## UX change (inside existing Studio)

1. Existing central canvas stays a full scrollable page. The section navigator remains optional.
2. On responsive PC/tablet/phone switch, a section selected in **block** Inspector scope is kept visible when it was previously visible and was shifted away by different section heights. Selected **element** behavior, selection overlay and carousel/table scroll restoration remain intact.
3. When the owner deliberately scrolls away from that block before switching devices, no unwanted jump back occurs. This does not change draft JSON or publish data.
4. Compact Inspector navigation (viewport ≤970px) focuses and additionally scrolls the actual Inspector heading onscreen, even if an earlier long field panel left a separate scroll offset.
5. Standalone `app.js` and PHP-hosted first-party `bundle.js` are synchronized, including the guard against stale iframe redraws.

## Evidence and regression

- `stage3/tests/studio-browser.cjs`: real Chromium creates first-party pricing, process, comparison and switcher components; targets a far-down content-switcher section; verifies selected **block** scope remains visible after PC→mobile→PC, screenshots its mobile state and verifies explicit scroll-away → tablet does not jump. Site draft JSON remains unchanged.
- `stage3/tests/approved-site-browser.cjs`: existing compact hosted Inspector test verifies heading focus **and** visible bounds after section navigation at 820 and 390 px. It exposed the initial failure; latest full CI is green after the actual visibility fix.
- Pipeline still exercises authenticated hosted media/forms/SEO, server Save/Review/Publish/rollback, runtime isolation, PHP 8.3, MariaDB 10.11 and 11.8, release package integrity.

## Outstanding gate

FOX at `https://mediumpurple-fox-175549.hostingersite.com/studio` is **installed, owner login succeeded, and it still runs older Studio code**. Nothing deployed; no installation, DB, private paths, `public_html/`, Cron, credentials, Stage2, `main`, production or first client site modified. Obtain separate authorization before any reversible runtime-only upgrade. Follow [FOX update/rollback gate](../../stage3/docs/FOX-UPDATE-AND-REGRESSION-GATE-2026-11-03.md): read-only host identity check → verified protected code and DB backups → verify SHA-scoped ZIP → coherent sibling `stage3/` switch → smoke checks and owner usability review on disposable content → immediate runtime rollback if failure. Do not use the sibling-layout installer, repeat setup/plan/apply or alter active MariaDB.

Next work: further broad real-page UX/regression within Stage3; then seek owner permission for FOX update, perform it only with an approved backup and test plan, record Ilya's personal admin acceptance; postpone first real landing until original source and independent desktop/tablet/mobile static design signoff. The formal 135-MUST owner gate remains **0/135** until user verification.
