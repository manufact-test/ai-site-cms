# Editor & Components Research — Block 11 exact-head test evidence (2026-10-21)

**Code commit tested:** `7dc3284c5a6421c4b841a3275ced812e9ce5fae7`.
**CI:** [GitHub Actions 39509827314](https://github.com/manufact-test/ai-site-cms/actions/runs/39509827314), SUCCESS on that exact SHA. **Branch:** `research/editor-component-patterns`. **PR:** [#4](https://github.com/manufact-test/ai-site-cms/pull/4), open for independent integrator review. All changes confined to `research/parallel-components/`.

## Scope implemented

- `lab/public/index.php`: genuine static HTML fallback with ordinary navigation, both visible tab contents, meaningful `<noscript>` dialog information, server-emitted contact fields with native `required`/email/minlength, and inert interactive control buttons initially `hidden`.
- `lab/public/assets/ui.js` + `style.css`: author `[hidden]` CSS precedence on all screens; after handlers are installed, reveal mobile toggle and dialog opener, convert static panel `div` into one selected dynamic ARIA tab panel at a time, and set `form.noValidate=true` only once the two-step wizard's own Unicode-aware browser validator runs. Native PHP validation remains authoritative.
- Static tab headings and both panels remain readable without scripts; no hidden controls used for orphaned ARIA `tabpanel` labels in the no-JS mode.
- `test_browser.py` (three new cases): actually runs Chromium with JavaScript explicitly disabled at 320×720 and 1200×840, verifies visible navigation and all content, no inactive menu/tab/dialog buttons, semantic no-script headings, native invalid-form submission focus; separate JS-on test verifies selected tab role/label, hidden inactive panel and handler activation.
- `test_http.py`: verifies the actual PHP GET source for native form validity and static fallback, in addition to existing HTTP POST tests.

## Exact-head verification

[Run 39509827314](https://github.com/manufact-test/ai-site-cms/actions/runs/39509827314), finished SUCCESS:
- **Verify exact PR head and research-only file scope**: SUCCESS, tests the proper research subtree.
- **Components research actual PHP, HTTP, Chromium and schema**: SUCCESS. **34/34 PHP syntax checks; 388/388 PHP assertions** over 15 PHP test programs; **56/56 Python tests**: adapter/real phone (4), capability (2), real local HTTP (12), configured HTTP (2), media bytes (1), schemas (5), **real Chromium (30)**. Job logs contain `test_actual_composer_lite_metadata ... ok` and all three new progressive-accessibility tests `... ok`.
- Separate parallel Security job: SKIPPED by its scope guard; not an audit of this research.
- CI's disposable Composer pin `giggsey/libphonenumber-for-php-lite:9.0.41` plus `symfony/polyfill-mbstring:1.38.2` performs genuine upstream numbering-metadata tests and form E.164 conversion. No production lockfile/import changed.

Developer reproduction, from repository checkout where PHP, Node, Python, Chromium, Playwright, jsonschema, Pillow already exist:

```bash
cd research/parallel-components
bash lab/tests/run-block5.sh
```

Historical runner filename notwithstanding, it tests the current lab. Optional real Composer phone integration requires Composer and PHP mbstring; without them that isolated check is SKIPPED, not a genuine metadata PASS. GitHub Actions has both and produced PASS. Chromium cannot connect to loopback from this isolated runner, so tests load PHP-rendered HTML through Python, and the live-browser form test uses an explicit Playwright Python bridge to the real PHP endpoint. This is **not** a direct browser TCP test.

## Exclusions and handoff

No actual mail/inbox receipt; no distributed transport idempotency or reliable outbox; no live Hostinger run, Next/React hydration or external browser matrix; no real NVDA/VoiceOver/TalkBack accessibility testing, no WCAG certification, no authorized editor persistence or AI↔site↔CMS API. **Stage2 remains unaccepted and Stage3 is not authorized**. No `main`, shared workflow, canonical docs, CMS production files, other research stream, Composer locks or hosting were modified by this developer.

The earlier evidence files `TEST-EVIDENCE-BLOCK5-2026-10-20.md` and older capture history, including an OLD shared CI false-positive. Current Actions runs verify the **actual PR HEAD**. The current research checkpoint and future operating protocol are in [NEXT-CHAT.md](NEXT-CHAT.md).