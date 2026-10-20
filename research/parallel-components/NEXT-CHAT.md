# AI Site CMS — NEXT CHAT: Editor & Components Research (independent stream)

**Handoff date:** 21 October 2026. **Purpose:** continuation of THIS third parallel developer's workstream only. This file does **NOT** replace canonical `docs/NEXT-CHAT.md` or any main integrator / Security / other research handoff. User explicitly requested documentation refresh when moving chats.

## Start here — exact checkpoints

- **GitHub:** https://github.com/manufact-test/ai-site-cms
- **Our ONLY branch:** `research/editor-component-patterns`. **Our ONLY writable prefix:** `research/parallel-components/`.
- **Our PR:** [#4](https://github.com/manufact-test/ai-site-cms/pull/4) — OPEN and NOT merged at handoff; verify this again before changes. Old PR #2 was previously MERGED **by the main integrator**, not by our research developer.
- **Latest verified code commit:** `7dc3284c5a6421c4b841a3275ced812e9ce5fae7`. **Exact-head GitHub Actions:** [39509827314](https://github.com/manufact-test/ai-site-cms/actions/runs/39509827314) = SUCCESS. Documentation commits follow this code SHA; **fetch the live branch HEAD and PR head from GitHub before starting** rather than treating a code SHA embedded in the handoff as the tip. If branch and PR diverge, investigate; do not force-push.
- **Validation of code commit:** 34 PHP syntax checks, 388 PHP assertions, **56 Python tests (30 real Chromium)**, including genuine upstream Composer phone metadata (not mocked) and real PHP HTTP/session scenarios. A separate scope job confirms our prefix. Unrelated parallel Security job SKIPPED.
- **Main project:** Stage2 **NOT ACCEPTED**, Stage3 **NOT STARTED / not authorized**. This branch contributes **zero** accepted production requirements by itself. Current main status/architecture is read-only for our stream; main may advance independently.

## Non-negotiable boundaries and collaboration

You are the **third independent developer / Editor & Components Research**, not the overall integrator, production security implementer or primary CMS author. Never write or merge into `main`; never touch `cms/editor/`, `cms/src/`, PHP application kernel, workflows/`.github, Composer/npm lockfiles, common documentation/ADR, installation or Hostinger, DB secrets, other research streams or CELIKOM. No auto-merge of PR #4. Always review current GitHub PR state, comments and current branch tree; use GitHub connector and a lease-protected `update_ref` for batch commits. The principal integrator decides if/when to cherry-pick or merge.

**Working rhythm requested repeatedly by user:** each ordinary “продолжаем” means independently take a **large related batch** (several substantive code/test items), implement, verify actual PR HEAD in Actions, push to ONLY our branch, report results concisely. **Do NOT rewrite READMEs, evidence files or NEXT-CHAT during ordinary work**. Refresh these docs **only** when user explicitly asks for end-of-chat transfer. Do not ask the owner to download/reupload research files after each message; maintain everything within the repo and GitHub PR.

## Delivered research sequence (Blocks 1–11)

1–4: upstream component/library license-and-security shortlist; native PHP/HTML FAQ, tab, modal/navigation; candidate closed per-existing-block Jedison/Opis property fixtures; Origin/CSRF/form validation; secure outbound status; private shared HMAC/flock throttling, 12-worker tests; HMAC receipt duplicate fence; typed revision plans; AVIF/WebP 6 variants, real Chromium decode. PR #2 merged by main integrator.

5: strict raw `SubmissionBoundary` decoder rejects repeated/unknown/bracket/encoded keys, malformed form and forged wizard stage; native progressive two-step form; fix multi-path `RevisionGate` no-op and revision overflow. PR #4 opened (remains unmerged). Historical CI false-positive in old evidence was eventually corrected **without our changing workflows**.

6–7: typed immutable hero-only preview and exact-hash CSP endpoint; escaping/contrast/responsive image; native HTML `NoJsResult` retry/focus; single `SubmissionHttp` decision engine for JSON and native HTML; Unicode codepoint wizard parity; cross-session/replay/transport error tests.

8–10: genuine Chromium→Playwright Python binding→local PHP session/CSRF POST decision tests (NOT direct Chromium networking); strict lexical international phone and closed region selector; real Composer `libphonenumber-for-php-lite 9.0.41` plus `symfony/polyfill-mbstring 1.38.2` pinned and tested in ephemeral CI; fake transport confirms true E.164 in full `FormLab`; fail-closed retry on unknown response codes; country error focus incl. native fallback; strict UTF-8 POST and weighted HTTP Accept negotiation; full existing CI suite now covers these additions on PR HEAD.

**11 (latest implemented block):** genuine JS-off progressive UX: native required/email/minlength form checks and visible two-stage fields; all tab contents/headings remain available, no orphaned ARIA tab panels; ordinary nav works; modal fallback text visible while inert JS buttons stay hidden; once JS installs handlers it reveals buttons, activates only one labeled tab panel and custom Unicode validator. Test in actual Chromium `java_script_enabled=False` at 320px and 1200px + JS enabled, and exact PHP GET. Details: [Block 11 evidence](TEST-EVIDENCE-BLOCK11-2026-10-21.md).

## Files to inspect, prioritized

1. `research/parallel-components/NEXT-CHAT.md` (this handoff).
2. `research/parallel-components/README.md`, `research/parallel-components/lab/README.md`.
3. `research/parallel-components/TEST-EVIDENCE-BLOCK11-2026-10-21.md` and latest PR #4 comments.
4. `research/parallel-components/COMPONENT-AUDIT.md` and `EDITOR-CONTRACT-PROPOSAL.md`; fixtures in `research/parallel-components/fixtures/`.
5. Lab code: `lab/src/SubmissionHttp.php`, `SubmissionBoundary.php`, `FormLab.php`, `PhoneAdapter.php`, `RevisionGate.php`, `PreviewLab.php`; `lab/public/index.php`, `submit-html.php`, `preview.php`, `assets/ui.js`, `style.css`.
6. Tests: `lab/tests/test_browser.py`, `test_browser_php_bridge.py`, `test_http.py`, `test_nojs.py`, `test_phone_real.py`; developer runner `lab/tests/run-block5.sh`.

For local/developer checkout (not production):

```bash
cd research/parallel-components
bash lab/tests/run-block5.sh
```

Requires developer-supplied PHP, Node (syntax only), Python Playwright/Chromium/jsonschema/Pillow; real phone test additionally needs Composer+PHP mbstring and will otherwise explicitly SKIP. For every PR checkpoint, the **actual Actions job log for the exact head** is authoritative; a generic green check on an old SHA is not evidence.

## High-value next large packages (choose one cohesive batch, not microtasks)

A. Browser submission response protocol hardening: bind explicit status+code combinations and response body shape, fail closed on contradictory/missing HTTP results and unknown/oversized payloads. Keep no fake success, no premature re-send. Add real PHP bridge regressions and browser UI tests for retry/uncertainty.

B. More static-first accessibility/keyboard matrix: no-script error summary focus and field descriptions, mobile menu focus-after-breakpoint, native dialog fallback and focus movement under re-entrancy, keyboard tab edge cases, reduced-motion/zoom/320px/RTL or font resizing. Use existing Chromium harness; **do not claim formal WCAG certification**.

C. Typed revision/preview strictness and safe property pipeline: plan-only fixture with display-context escaping, closed media, safe same-origin actions, stale revision, contrast and breakpoints. Preserve Stage3 deferral; do not implement final editor/AI protocol or production write API.

D. Private file-based throttle/ledger limits and privacy proof: retention/cleanup modelling, corruption/fail-closed/concurrency tests; still **not distributed outbox, actual idempotent email delivery, or production anti-spam**.

**Remaining gates:** no real SMTP inbox validation, real browser TCP cross-host flow, React/Next SSR/hydration, assistive technology manual audit, external browser matrix, legal NOTICE signoff, durable distributed queues, production authorization/ACL/DB transactions, live Hostinger or explicit Stage2 acceptance. Any recommendations are candidates for the main integrator only.

## How to finish next ordinary response

Produce sizeable tested changes in `research/parallel-components/`; commit/push to `research/editor-component-patterns`; inspect exact PR head and scope, examine Actions results/logs and fix failures; leave PR #4 open; report concrete test counts plus honest limits. **Do not refresh this handoff until the owner expressly says they are moving chats again.**
