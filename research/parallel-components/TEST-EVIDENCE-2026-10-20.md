# Editor & Components lab — reproducible security, keyboard and contract research tests

**Run date:** 2026-10-20. **Branch:** `research/editor-component-patterns`. **Scope:** `research/parallel-components/` only. **No Node.js at PHP site runtime.** No CMS edits, site writes, migrations, user information, inbox delivery, production release or Stage3 work.

## Runner snapshot / versions

- Debian GNU/Linux 13 container, Linux amd64 research shell (not GitHub Actions and not Hostinger)
- `php -v` → **PHP 8.4.24 CLI**
- `python --version` → **Python 3.13.5**
- `chromium --version` → **Chromium 144.0.7559.96**
- Python packages, dev-test only: **playwright 1.57.0**; **jsonschema 4.26.0**
- Runtime server for real HTTP tests: **PHP built-in `php -S 127.0.0.1:ephemeral`**, automatically started/stopped by Python. Not a substitute for LiteSpeed / reverse proxy / real PHP-FPM deployment.

## Exact commands and outcomes

Run from repository root:

```bash
cd research/parallel-components
for f in lab/src/*.php lab/public/*.php lab/tests/*.php; do php -l "$f" || exit 1; done
php lab/tests/form-tests.php
php lab/tests/property-tests.php
php lab/tests/origin-tests.php
php lab/tests/capability-tests.php
python -m unittest discover -s lab/tests -p 'test_*.py' -v
```

Captured outcomes in this container on 20 Oct 2026, each command **exit code 0**:

| Command | Real result |
|---|---|
| PHP `-l` loop | 10/10 source/test PHP files — `No syntax errors detected` |
| `form-tests.php` | **23** assertions PASS; token issuance, duplicate rejection, invalid input, honeypot, transport false/throw, unknown delivery / redaction, recipient gate, region-aware validator not configured, session throttle |
| `property-tests.php` | **32** assertions PASS; encoded controls/percent, parent traversal, noncanonical host/ports, wrong action keys, bad schemes |
| `origin-tests.php` | **17** assertions PASS; explicit trusted origin, correct port, missing/malformed config, opaque/absent origin, untrusted Host, cross-site fetch metadata |
| `capability-tests.php` | **20** assertions PASS; owner-defined existing-block property subsets, typed values, no JS/CSS/foreign endpoint or cross-block property leakage |
| `python -m unittest ...` | **15 tests PASS** — 6 real Chromium DOM/keyboard, 2 real PHP localhost HTTP-boundary, 5 draft-2020-12 JSON Schema, 2 static capability registry tests |

### Split of browser and HTTP evidence

- **Chromium keyboard/DOM (6 tests):** actual Chromium renders PHP-produced HTML inserted by test harness; JS/CSS loaded locally and executed by Chromium. Tabs Arrow/Home, native `<dialog>` Escape and focus return, modal focus, mobile menu Escape and target focus at **320 / 375 / 1280px**, reduced-motion/overflow, honest UI for configured recipient absent, network unknown and transport uncertain. Browser submission response is **explicitly mocked**. Because Chromium networking is blocked in this specific test runner, these are **not** browser→PHP HTTP E2E tests.
- **Real HTTP (2 tests):** Python `urllib` performs actual loopback requests against an independent PHP server and verifies session cookie/token, 503 missing recipient, 403 hostile/opaque/missing Origin, 403 hostile Host, cross-site Fetch Metadata, unused untrusted `X-Forwarded-Host`, GET 405. No browser is involved in these two tests.
- **PHP logic (23 assertions):** injected callable is a **fake transport** whose boolean/exception results are independently tested. **No real message/email/SMS/Telegram/CRM delivery was attempted or verified.** A successful acceptance is labelled `QUEUED_UNCONFIRMED`, not delivered.

### Reproduce local form endpoint deliberately without recipient

```bash
LAB_PUBLIC_ORIGIN=http://127.0.0.1:8765 php -S 127.0.0.1:8765 -t lab/public
```

A POST lacking configured recipient, with valid cookie/token, canonical matching Origin and age >= 2s, returns 503 `CONFIGURATION_REQUIRED`. Without `LAB_PUBLIC_ORIGIN`, POST fails closed at 503 `ORIGIN_CONFIGURATION_REQUIRED`. External/invalid Host or Origin fail closed. Never bind this lab to a public interface or set recipient secrets on a shared site.

### What the tests do NOT prove

- No actual international libphonenumber adapter or globally distributed/IP-based abuse throttling; honeypot + time trap + session attempts are educational only.
- No production CSRF/session proof behind arbitrary LiteSpeed proxy/CDN, no accessibility audit with actual assistive technology or browsers other than installed Chromium; no verified `https://` endpoint.
- No durable outbox/idempotency or confirmation that message reached a human inbox. A transport exception or lost connection may happen after acceptance; **no automatic retry**.
- No Jedison schema rendering or Opis runtime acceptance of the candidate 2020-12 fixture, no cross-platform React/Next hydration/SSR, no asset uploads.
- No proof of external library legal/security acceptance. **Stage2 not accepted, Stage3 not started.** Main integrator retains approval responsibility.
