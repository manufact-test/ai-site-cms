# AI Site CMS — Stage 1: matched complex editor session research

**Checkpoint:** v1.14 · 17.10.2026 · **research fixture only, NOT product code**.
**Verified GitHub Actions:** [#39065084450](https://github.com/manufact-test/ai-site-cms/actions/runs/39065084450) **PASS** on [research/stage1-editor-comparison](https://github.com/manufact-test/ai-site-cms/tree/research/stage1-editor-comparison), experimental HEAD commit `1bfb163492e72947616717d4d4e3f8a8e44642d8`. Main holds documentation, not research runtime.

## 1. What was measured

[matched-editor-session.cjs](https://github.com/manufact-test/ai-site-cms/blob/research/stage1-editor-comparison/research/stage1/matched-editor-session.cjs) mounts real upstream **Jedison 1.27.1 (vanilla JS)** or **RJSF 6.11.0 (React 19, AJV8 configured explicitly for JSON Schema Draft 2020-12)** in separate Chromium pages. Both consume *the same exact* `adapter-section.cjs` manifest with **9 root properties**, a representative section with **12 stable IDs**, one sandboxed native `iframe.srcdoc` preview and 50 metadata entries.

For each editor, each run executes 8 mount/edit/unmount cycles, with **41 upstream model-change events per cycle**, covering headline, lead, two CTAs, a feature, a card, a stat, responsive tablet 48→52px/mobile inherit and explicit mobile 32px, plus 32 successive title changes. Model and preview must reflect every change; published baseline must remain untouched; iframe count remains one. Every cycle tests 12 IDs, and the final nested JSON must be **deep-equal** across both editor libraries. Each cycle captures time-to-visible-input and end-to-end Playwright action time, and CDP JSHeapUsedSize before/after unmount and explicit GC.

The workflow runs the *same workload twice* in **two library orders**: Jedison→RJSF and RJSF→Jedison. This gives 16 cycles and **656 model-change events per editor** over the two orders; 0 browser pageerrors. Previous complex HTML/PHP/React/Next-static + native CSP-nonce preview, snapshot/rollback, Opis/AJV parity and security probes also PASS in the same workflow.

## 2. Actual observations on this single CI runner (diagnostic, not production performance)

| Value | Jedison | RJSF |
|---|---:|---:|
| Gzip minified **test entry bundle** | 48,284 bytes | 190,905 bytes |
| Model-change events per editor | 656 | 656 |
| Mount/unmount cycles total | 16 | 16 |
| View/model parity | PASS | PASS |
| Browser pageerrors | 0 | 0 |
| First cycle post-unmount + GC (Jedison-first pass) | 2,243,812 bytes | 3,899,764 bytes |
| Eighth cycle post-unmount + GC (Jedison-first pass) | 2,629,552 bytes | 4,296,076 bytes |
| Median complete cycle in Jedison-first pass | ~1,265 ms | ~813 ms |
| Median complete cycle in RJSF-first pass | ~1,450 ms | ~841 ms |

**Cautions:** The RJSF entry includes React/ReactDOM plus an explicitly configured AJV Draft 2020-12 validator. Jedison's research entry has different bundled validation responsibilities, so this is **not** a like-for-like validator-inclusive distribution size comparison. Time includes Playwright automation and wait/DOM events and is not a pure editor render latency measure; the second order changes timings. A few CDP GC heap snapshots from one runner are not statistical samples, a leak test, or device-level memory benchmarks. Both series show higher post-GC heap in later cycles; this alone cannot identify leaks (retained caches, renderer state and collection heuristics can also explain it). Benchmarks did NOT run hours or days.

## 3. Engineering conclusion (does not select a stack)

- Both real libraries handled the matched multi-element editable model and responsive inheritance; no missing properties or loss of manual edits was observed in the **in-memory research fixture**.
- Jedison has a substantially smaller measured **specific entry bundle** and smaller JS heap snapshot in this experiment.
- RJSF completed the scripted action workload faster in these two orders, but this does not establish that its UX is faster on real devices.
- Neither result demonstrates production readiness, security, support for all future custom editor widgets, media-heavy/3D sections, multi-hour sessions, multiple editors, or compatibility with actual PHP shared hosting.
- Further stage-1 research should compare identical **custom composite widgets** on matched layout with media mocks, workload memory over longer runs, and failure/hostile input isolation; then read-only inspect the **existing** PHP hosting if explicitly authorized. Do not expand the tariff or touch production sites.
- 135 mandatory requirements remain **unaccepted**, stage 1 remains **in progress and not accepted**, stage 2 **not started**, no framework approved, no partial MVP released.

## 4. Reproduce

Research branch only, environment with Node 22 / Chromium and pinned npm packages:

```sh
cd research/stage1
npm install --no-audit --no-fund
node matched-editor-session.cjs
STAGE1_EDITOR_ORDER=reverse node matched-editor-session.cjs
```

This CI program is an isolated research check, **not** a CMS renderer, adapter SDK or deployable admin interface. No Node requirement is imposed on the separate PHP public snapshot research fixture. See [STAGE-1-TEST-LOG.md](STAGE-1-TEST-LOG.md), [FOUNDATION-COMPARISON.md](FOUNDATION-COMPARISON.md), [STAGE-1-HOSTING-SMOKE-PLAN.md](STAGE-1-HOSTING-SMOKE-PLAN.md) and the sole handoff [NEXT-CHAT.md](NEXT-CHAT.md).
