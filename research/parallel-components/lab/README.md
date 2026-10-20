# Standalone HTML/PHP component laboratory

No code imports the active CMS and no Node.js runtime or third-party JS library is required to serve this demo. Nothing here is production-ready. It runs only on a developer-owned disposable PHP server, never on the permitted Hostinger sites.

```bash
cd research/parallel-components
for f in lab/src/*.php lab/public/*.php lab/tests/*.php; do php -l "$f" || exit 1; done
php lab/tests/form-tests.php
php lab/tests/property-tests.php
php lab/tests/origin-tests.php
php lab/tests/capability-tests.php
python -m unittest discover -s lab/tests -p "test_http.py" -v
python -m pip install 'jsonschema>=4' 'playwright>=1.55'  # developer only; verify package versions independently
python -m unittest discover -s lab/tests -p 'test_schema.py' -v
python -m unittest discover -s lab/tests -p 'test_browser.py' -v
LAB_PUBLIC_ORIGIN=http://127.0.0.1:8765 php -S 127.0.0.1:8765 -t lab/public
# locally open http://127.0.0.1:8765
```

`test_http.py` additionally performs real localhost HTTP requests against the standalone PHP server (cookie-CSRF, **explicit** origin allowlist, hostile Host, ignored X-Forwarded-Host, 503 recipient configuration, method controls). It creates a fixed `LAB_PUBLIC_ORIGIN` matching its ephemeral port; HTTP submissions **without Origin** are refused. In real reverse proxies the configured public origin must be validated by the operator; do not derive it from `Host`, X-Forwarded-* or any request header. `test_browser.py` launches locally installed `/usr/bin/chromium`. In this runner Chromium cannot access any network (even loopback): the test loads PHP HTML through the Python-only test harness and directly adds local CSS/JS, so browser tests verify **real UI/keyboard behaviour**; form browser transport is an explicit stub returning `CONFIGURATION_REQUIRED`. `form-tests.php` directly tests real PHP request logic/delivery callbacks, while local PHP server demonstrates a genuine 503 if not configured. Neither suite asserts a real email was delivered.

For a **throwaway local-only** transport smoke, the environment variables `LAB_FORM_RECIPIENT_EMAIL` and `LAB_FORM_SENDER_EMAIL` can be set for PHP `mail()` (server mail transport must independently work). With `LAB_PUBLIC_ORIGIN` unconfigured the POST endpoint returns 503 `ORIGIN_CONFIGURATION_REQUIRED`, even if a recipient is set. A 202 `QUEUED_UNCONFIRMED` means **accepted by mail transport, not actual inbox delivery**; do not set these in shared/public infrastructure without approval. No input is emailed or saved at all until configured. Setting a phone without a real region-aware backend phone adapter returns 503 `PHONE_VALIDATOR_REQUIRED`: a regex is deliberately not passed off as international validation.

States: `ORIGIN_CONFIGURATION_REQUIRED`/503, `ORIGIN_INVALID`/403, `HOST_INVALID`/403, `DELIVERY_UNCONFIRMED`/502, `VALIDATION_ERROR`/422, `TOO_FAST`/422, `SPAM_REJECTED`/422, `CSRF_INVALID`/403, `RATE_LIMITED`/429, `PHONE_VALIDATOR_REQUIRED`/503, `CONFIGURATION_REQUIRED`/503, `DELIVERY_FAILED`/502, `QUEUED_UNCONFIRMED`/202. A network loss is `NETWORK_UNCONFIRMED`, never auto-retried (server may already have accepted request). Tokens are one-use after validated configured submission; repeated submit is rejected. A mail transport **exception** returns `DELIVERY_UNCONFIRMED` and **disables repeat submission** until a fresh page; a `false` transport returns `DELIVERY_FAILED`, also requiring a fresh token. The browser treats broken/invalid JSON and fetch failures as `NETWORK_UNCONFIRMED`, does not silently retry and disables duplicate submission. `CONFIGURATION_REQUIRED` and client validation can be retried with the original token; a lost connection cannot safely infer transport acceptance. Without a durable centralized outbox / receipt no exactly-once claim is possible.

**Known production gaps:** session-only rate limit, honeypot and 2-second time trap are not sufficient anti-abuse controls; no confirmed SMTP/webhook delivery, retries/outbox, IP throttle, optional privacy-respecting challenge, CAPTCHA accessibility evaluation, deployment secrecy, or recipient verification. A progressive-enhancement two-step browser form now exists; its complete payload is independently validated by the PHP backend. There are still no uploads or real telephone service. UI tested with Chromium on 375 and 1280px; formal WCAG audits, assistive-technology cross-browser testing and Next SSR remain open. These are **explicit negative gates**, not implied successes.

## Follow-up hardening (20 Oct 2026)

- `OriginPolicy.php` requires `LAB_PUBLIC_ORIGIN` as a trusted canonical `https://...` origin (allowing `http://localhost` / `http://127.0.0.1` for disposable local tests). The Host authority must match exactly. Never trust a forwarded scheme/host to construct the allowlist; hosting/reverse-proxy configuration needs dedicated proof before production. Requests without Origin are refused in this **research-only fetch API**; cross-site Fetch Metadata also denied.
- `PropertySafety.php` refuses encoded URL sequences (`%` of any kind), backslash, control/whitespace, ambiguous parent navigation, noncanonical trailing-dot origins and non-default HTTPS ports. This intentionally rejects some harmless legitimate links. Stage3 should supply a well-tested canonicalizer with per-site URL semantics and an output-context escape layer. These guards are *not* an HTML sanitizer or a license to emit arbitrary markup.
- `CapabilityGate.php` + `fixtures/block-capabilities.research.json` demonstrate trusted **per-existing-block** editable paths and typed values; no dynamic block creation, rendering, authorization, writes or final manifest contract. Compare the form block, which cannot edit an endpoint, to the hero link block. This gate is only an educational fixture.
- Keyboard tests cover 320px reduced-motion navigation focus, 375px menu Escape, 1280px tabs/dialog, focus return, and delivery-failure states. They load PHP-rendered HTML via Python into Chromium, not a Chromium→PHP HTTP E2E. Android/iOS VoiceOver/TalkBack/Safari/Firefox and real Next SSR remain untested.

See `../TEST-EVIDENCE-2026-10-20.md` for exact captured command outcomes and versions.

## Third experiment: international phones, shared throttle, real responsive media

All additions remain isolated under this laboratory. PHP runtime on a website **requires no Node.js**; the test-only image generator used Pillow, and images themselves are committed as original assets. From `research/parallel-components`:

```bash
php lab/tests/phone-tests.php       # API protocol double; real libphonenumber NOT installed
php lab/tests/throttle-tests.php    # including 12 parallel PHP child processes
php lab/tests/media-tests.php       # fixed HTML attribute and URL/alt guards
python -m unittest discover -s lab/tests -p test_browser.py -v
for p in test_adapter_capabilities.py test_capabilities.py test_http.py test_http_configured.py test_media_assets.py test_schema.py; do
  python -m unittest discover -s lab/tests -p "$p" -v || exit 1
done
```

### Phone adapter is real-library-or-refusal, not regex validity

When phone is provided, `PhoneAdapter.php` requires server-side `libphonenumber` classes and returns normalized E.164 via `parse`, `isValidNumber` / `isValidNumberForRegion` and `format`. No vendored library or changed Composer lock in this branch. `LAB_PHONE_AUTOLOAD` may be set by an operator **only** to the absolute file path of a pinned Composer autoloader outside the public webroot; the lab includes no dependency auto-installer. Example local-only preparation in a **separate disposable directory** (not in this repository): pin `giggsey/libphonenumber-for-php-lite` and its dependencies, then set `LAB_PHONE_AUTOLOAD=/absolute/private/vendor/autoload.php` with all legal/security checks. PHP extension `mbstring` is required upstream; this container lacks it. The optional phone can be omitted to demonstrate other gates. A visible `phone_region` enum is merely a UX hint, and region code / E.164 / actual numbering validity are verified **server-side**. The adapter rejects extensions and ambiguous national numbers without a country. Tests with a double prove API binding and fail-closed logic **only**, not genuine libphonenumber metadata accuracy or telecom reachability. Server errors are redacted and do not cause positive delivery assertions.

### Shared rate gate (per-origin server identity)

To test a *configured recipient* on a throwaway **local-only** server, `LAB_ABUSE_DIR` must point to an existing operator-owned writable PRIVATE directory outside `lab/public`, permissions allowing no access by other users; `LAB_ABUSE_SECRET` must be a long random operator-held value of at least 32 bytes (do not commit it). Client IP is **only** PHP's `REMOTE_ADDR`; arbitrary forwarded headers are ignored. If site is behind a trusted reverse proxy, mapping of client identity requires a separately audited trusted-proxy policy; this lab does **not** guess it. HMAC bucketing + file `flock()` protect against overlapping PHP workers on a single reliable local filesystem. This is not distributed/production spam protection: directory growth needs protected rotation/cleanup, privacy retention decisions, private logging, queuing and limits by ASN/account, proxy-aware identity, bandwidth budgets and CAPTCHA/challenge strategy where justified.

When a recipient is configured but this guard is not properly configured: HTTP **503 `ANTI_SPAM_CONFIGURATION_REQUIRED`** and **no delivery attempt**. When configured and threshold reached: HTTP **429 `RATE_LIMITED`**, also no delivery. When phone is filled without the real server library: **503 `PHONE_VALIDATOR_REQUIRED`**. When transport is unconfigured or rejects delivery: **502 `DELIVERY_FAILED`** (never fictitious 200). `test_http_configured.py` verifies these with actual loopback PHP HTTP (and no real outbound mail).

### Picture fixture

`fixtures/media-candidates.research.json` is a strictly bounded visual fixture rendered by `MediaLab.php` into native `<picture>` with three widths each for AVIF and WebP plus WebP `<img>` fallback, intrinsically sized 960×540, meaningful escaped alt and caption, no browser CDN. The only original image is a synthetic factory-themed diagram created for this research lab, not copied from third parties. Source assets total < 50 KB; Pillow **and actual Chromium** decode their bytes offline via data URLs. This proves file-format validity, not HTTP negotiation/cache/LCP metrics. Render-time strict path allowlist intentionally does **not** accept arbitrary uploads, remote URLs, SVG, or URI escapes. It is not a production asset pipeline, image optimizer or gallery.

Responsive visual smoke inspects the generated markup at 320px in Chromium, and prohibits document horizontal overflow. The `role=lcp` fixture uses eager/high priority, while `role=content` uses lazy. Future Stage3 should derive these from actual placement/measurement and keep them non-editable as arbitrary raw URLs.

## Fourth experiment: cross-session duplicate claims + revision-safe property edits (20 Oct 2026)

This is **NOT** a production mail queue or contract for Stage3. It introduces:

- `lab/src/ReceiptLedger.php`: a keyed HMAC of canonical validated form fields + recipient in an operator-owned private directory, with POSIX `flock` and a bounded 600-second duplicate window. Each claim is recorded **before** the outbound transport attempt. Names and file contents never store form PII or secrets. A duplicate returns HTTP `409 DUPLICATE_REQUEST`; a corrupted/unavailable store returns `503 RECEIPT_STORE_UNAVAILABLE` without attempting delivery. A configured recipient additionally requires the ledger, reusing `LAB_ABUSE_DIR` / `LAB_ABUSE_SECRET`. The single-use session CSRF token remains necessary but is **not** a durable dedupe key. A duplicate response also consumes the current token; client refresh is required before any new attempt. All successful transport responses remain `202 QUEUED_UNCONFIRMED`, not inbox-delivered.
- `lab/src/RevisionGate.php`, `fixtures/visual-revision-candidates.research.json`: optional optimistic expectedRevision check for *already-existing* trusted blocks and typed visual values (integer pixel units, six-digit opaque colors, responsive padding at exactly three fixed breakpoints). It returns only a proposed copy of next block state, with **no authorization, persistence, renderer or connection to Jedison**. A stale revision is `REVISION_CONFLICT`, forbidden property `PATCH_REJECTED`, exact value no-op `UNCHANGED`.
- UI focus correction: explicit “К разделу FAQ” dialog action now establishes a valid focus target before the close event, while Escape/normal close returns to opener. The browser also disables repeat submission on `DUPLICATE_REQUEST`.

Run independently (developer local only):

```bash
cd research/parallel-components
php lab/tests/receipt-tests.php     # includes 12 concurrent PHP subprocesses
php lab/tests/revision-tests.php
python -m unittest discover -s lab/tests -p test_http_receipt.py -v  # actual local PHP HTTP
python -m unittest discover -s lab/tests -p test_browser.py -v       # actual Chromium DOM, stubbed form fetch
```

**Production exclusions:** a private single-host file gate can prevent repeat *attempts* for one 10-minute fingerprint but cannot deliver exactly once, reconstruct unknown transport outcome, reliably cover horizontally scaled hosts, be used as an inbox/webhook receipt, identify bot swarms, or safely resolve legitimate repeated identical inquiries. Operators must set retention limits, private filesystem permissions, housekeeping, reliable upstream idempotency keys and delivery acknowledgments. The test uses synthetic data and no real SMTP. Never use this prototype on the shared Hostinger sites or in the deployed CMS. Formal WCAG/assistive technology testing, Chrome-to-PHP browser E2E and Node/React/Next hydration remain unverified.

See `../TEST-EVIDENCE-BLOCK4-2026-10-20.md` for actual commands/runner versions and limits.


## Fifth laboratory pass: wizard UI, strict POST boundary, atomic revision plan

No Node.js at PHP website runtime. The contact form has two fieldsets: contact identity then optional phone/message. With JavaScript enabled, only one step is visible, "Далее" validates identity, "Назад" retains values, the live region announces step position, submission reports honest network/transport states, and field validation errors from the backend reveal/focus the appropriate step. Without JavaScript **both fieldsets and a submit button remain available**, although the standalone JSON endpoint returns a machine-readable response rather than a polished HTML confirmation (NOT a production no-JS flow). This research wizard only improves UX: **the server does not trust the client's step state or accept an implied completed-wizard flag**.

`SubmissionBoundary::decode` is called by the actual HTTP endpoint **before** any anti-abuse, phone or transport invocation. It refuses malformed percent encoding, duplicate/unknown parameter names, bracketed array pollution, encoded keys, nulls, invalid UTF-8, truncated/big bodies or missing required keys; it handles an optional `phone_region=ZZ` default for older single-step test fixtures. `FormLab` still validates all final fields independently; `LAB_PUBLIC_ORIGIN` and CSRF remain required. This is a **purposefully narrow** research URL-encoded parser, not a replacement for a production request framework or a general sanitizer. It rejects legitimate repeated-key protocols intentionally.

`RevisionGate::plan` now treats a mixed patch with both unchanged and changed values as **one plan**, not an early `UNCHANGED`. A truly all-unchanged patch returns `UNCHANGED`; revision overflow is refused, and the proposed next state is never persisted. Authentication/ACL, database CAS, schema/contract acceptance and rollback are NOT implemented.

Run each suite separately to avoid the old runner's intermittent monolithic Chromium/PHP subprocess lockup:

```bash
cd research/parallel-components
for f in lab/src/*.php lab/public/*.php lab/tests/*.php; do php -l "$f" || exit 1; done
for f in lab/tests/*-tests.php; do php "$f" || exit 1; done
node --check lab/public/assets/ui.js
for f in lab/tests/test_*.py; do python -m unittest discover -s lab/tests -p "$(basename "$f")" -v || exit 1; done
```

Results and versions: `../TEST-EVIDENCE-BLOCK5-2026-10-20.md`. The browser harness uses real Chromium DOM but mocked fetch; Python HTTP tests exercise a real disposable local PHP server. No actual mail, CRM, Hostinger or Next SSR claims.
