# Standalone HTML/PHP component laboratory

No code imports the active CMS and no Node.js runtime or third-party JS library is required to serve this demo. Nothing here is production-ready. It runs only on a developer-owned disposable PHP server, never on the permitted Hostinger sites.

```bash
cd research/parallel-components
php -l lab/src/FormLab.php
php lab/tests/form-tests.php
php lab/tests/property-tests.php
python -m unittest discover -s lab/tests -p "test_http.py" -v
python -m pip install 'jsonschema>=4' 'playwright>=1.55'  # developer only; verify package versions independently
python -m unittest discover -s lab/tests -p 'test_schema.py' -v
python -m unittest discover -s lab/tests -p 'test_browser.py' -v
php -S 127.0.0.1:8765 -t lab/public
# locally open http://127.0.0.1:8765
```

`test_http.py` additionally performs real localhost HTTP requests against the standalone PHP server (cookie-CSRF, Origin, 503 configuration, methods). `test_browser.py` launches locally installed `/usr/bin/chromium`. In this runner Chromium cannot access any network (even loopback): the test loads PHP HTML through the Python-only test harness and directly adds local CSS/JS, so browser tests verify **real UI/keyboard behaviour**; form browser transport is an explicit stub returning `CONFIGURATION_REQUIRED`. `form-tests.php` directly tests real PHP request logic/delivery callbacks, while local PHP server demonstrates a genuine 503 if not configured. Neither suite asserts a real email was delivered.

For a **throwaway local-only** transport smoke, the environment variables `LAB_FORM_RECIPIENT_EMAIL` and `LAB_FORM_SENDER_EMAIL` can be set for PHP `mail()` (server mail transport must independently work). A 202 `QUEUED_UNCONFIRMED` means **accepted by mail transport, not actual inbox delivery**; do not set these in shared/public infrastructure without approval. No input is emailed or saved at all until configured. Setting a phone without a real region-aware backend phone adapter returns 503 `PHONE_VALIDATOR_REQUIRED`: a regex is deliberately not passed off as international validation.

States: `VALIDATION_ERROR`/422, `TOO_FAST`/422, `SPAM_REJECTED`/422, `CSRF_INVALID`/403, `RATE_LIMITED`/429, `PHONE_VALIDATOR_REQUIRED`/503, `CONFIGURATION_REQUIRED`/503, `DELIVERY_FAILED`/502, `QUEUED_UNCONFIRMED`/202. A network loss is `NETWORK_UNCONFIRMED`, never auto-retried (server may already have accepted request). Tokens are one-use after validated configured submission; repeated submit is rejected.

**Known production gaps:** session-only rate limit, honeypot and 2-second time trap are not sufficient anti-abuse controls; no confirmed SMTP/webhook delivery, retries/outbox, IP throttle, optional privacy-respecting challenge, CAPTCHA accessibility evaluation, deployment secrecy, or recipient verification. Only dynamic normal form submission is supported, no multi-step, uploads or real telephone service. UI tested with Chromium on 375 and 1280px; formal WCAG audits, assistive-technology cross-browser testing and Next SSR remain open. These are **explicit negative gates**, not implied successes.
