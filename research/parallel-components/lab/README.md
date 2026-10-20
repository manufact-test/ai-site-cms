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

**Known production gaps:** session-only rate limit, honeypot and 2-second time trap are not sufficient anti-abuse controls; no confirmed SMTP/webhook delivery, retries/outbox, IP throttle, optional privacy-respecting challenge, CAPTCHA accessibility evaluation, deployment secrecy, or recipient verification. Only dynamic normal form submission is supported, no multi-step, uploads or real telephone service. UI tested with Chromium on 375 and 1280px; formal WCAG audits, assistive-technology cross-browser testing and Next SSR remain open. These are **explicit negative gates**, not implied successes.

## Follow-up hardening (20 Oct 2026)

- `OriginPolicy.php` requires `LAB_PUBLIC_ORIGIN` as a trusted canonical `https://...` origin (allowing `http://localhost` / `http://127.0.0.1` for disposable local tests). The Host authority must match exactly. Never trust a forwarded scheme/host to construct the allowlist; hosting/reverse-proxy configuration needs dedicated proof before production. Requests without Origin are refused in this **research-only fetch API**; cross-site Fetch Metadata also denied.
- `PropertySafety.php` refuses encoded URL sequences (`%` of any kind), backslash, control/whitespace, ambiguous parent navigation, noncanonical trailing-dot origins and non-default HTTPS ports. This intentionally rejects some harmless legitimate links. Stage3 should supply a well-tested canonicalizer with per-site URL semantics and an output-context escape layer. These guards are *not* an HTML sanitizer or a license to emit arbitrary markup.
- `CapabilityGate.php` + `fixtures/block-capabilities.research.json` demonstrate trusted **per-existing-block** editable paths and typed values; no dynamic block creation, rendering, authorization, writes or final manifest contract. Compare the form block, which cannot edit an endpoint, to the hero link block. This gate is only an educational fixture.
- Keyboard tests cover 320px reduced-motion navigation focus, 375px menu Escape, 1280px tabs/dialog, focus return, and delivery-failure states. They load PHP-rendered HTML via Python into Chromium, not a Chromium→PHP HTTP E2E. Android/iOS VoiceOver/TalkBack/Safari/Firefox and real Next SSR remain untested.

See `../TEST-EVIDENCE-2026-10-20.md` for exact captured command outcomes and versions.
