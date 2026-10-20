# Standalone Editor & Components block 3 — reproducible lab evidence (20.10.2026)

**Only** `research/parallel-components/` is modified. Tests executed on disposable local environment. No product CI, real libphonenumber metadata, live mail delivery, deployed HTTP server, Hostinger, production stage gates or existing CMS changes. Owner/main integrator must review before merge. **Stage2 NOT ACCEPTED; Stage3 NOT STARTED.**

## Environment

| Tool | Actual observed |
|---|---|
| OS | Debian 13, local container |
| PHP | 8.4.24 CLI; `mbstring` not installed; PHP web fixture uses built-in `php -S` only |
| Python | 3.13.5 |
| Chromium | 144.0.7559.96 |
| Python developer-only dependencies | Playwright 1.57.0; jsonschema 4.26.0; Pillow 12.3.0 |
| Phone vendor | No external libphonenumber package vendored or installed. Only a protocol double. |

## PHP syntax and independent unit/integration loops

Executed from `research/parallel-components` with **exit code 0**:

```bash
for f in lab/src/*.php lab/public/*.php lab/tests/*.php; do php -l "$f" || exit 1; done
for f in lab/tests/*-tests.php; do php "$f" || exit 1; done
```

- All **16/16 PHP files** pass syntax check.
- **160 PHP assertions PASS** across seven fixtures: CapabilityGate 20, FormLab 24, MediaLab 22, OriginPolicy 17, PhoneAdapter protocol 18, PropertySafety 32, SharedThrottle 27.
- SharedThrottle test opens **12 distinct real PHP child processes** racing for one IP and interval; exactly **4/12** admitted under atomic lock. Tests IP key HMAC obfuscation, across-object shared state, expiration, missing/short secret, public-root denial, symlink attempt and invalid IP.
- Phone protocol test injects a controlled *fake lib API* to verify format selection/region arguments, reject invalid/extension/parse errors and E.164 output. **Not evidence that actual German/UK/etc real numbering plans were validated.** Actual lib runtime requires independent Composer+mbstring setup.
- Static media renderer refuses remote/encoded paths, mismatched variant width, missing meaningful alt, injected HTML properties and unknown fields; checks LCP eager/high versus content lazy.

## Python tests, real HTTP and native Chromium

Executed **per module as separate Python commands** with **exit code 0**:

```bash
python -m unittest discover -s lab/tests -p test_browser.py -v
for p in test_adapter_capabilities.py test_capabilities.py test_http.py test_http_configured.py test_media_assets.py test_schema.py; do
  python -m unittest discover -s lab/tests -p "$p" -v || exit 1
done
```

**23/23 Python tests PASS:** 8 real Chromium keyboard/DOM/format-decode tests, 2 real localhost PHP HTTP request-boundary tests, 2 real localhost PHP configured-recipient/abuse/phone/transport tests, 1 Pillow decode + image dimension/byte-budget test, 3 candidate per-block contract lint tests, 2 existing capability tests, 5 JSON Schema tests. Native Chromium actually decoded AVIF and WebP bytes using local `data:` image URLs; no browser network access is available in this runner. Real HTTP is independently exercised by Python urllib against localhost PHP. The browser form submission remains explicitly **mocked**, and so is **not Chromium→PHP network E2E**.

**Important test-runner caveat:** An additional attempted *single process* combined discovery (`python -m unittest discover -s lab/tests -p 'test_*.py'`) hung intermittently after exercising browser tests and was terminated by the execution timeout; **do not describe that one-shot command as PASS**. Running the above two independent module loops and the PHP suite produced reproducible green results. This is a lab-runner lifecycle issue, not a verified source bug; GitHub Actions on this branch were **not run**. Independent CI or developer environment is needed to verify one-shot orchestration.

## Explicit HTTP refusal and no fake delivery

- Genuine localhost request with a configured recipient but no `LAB_ABUSE_DIR`/`LAB_ABUSE_SECRET` returns **503 `ANTI_SPAM_CONFIGURATION_REQUIRED`**, no mail transport.
- With private shared gate configured but no real PHP phone library, a provided international number returns **503 `PHONE_VALIDATOR_REQUIRED`**. A valid-form-without-phone reaches the *stubbed unconfigured sender* and returns **502 `DELIVERY_FAILED`**, not delivery success.
- Reuse of the original CSRF token is **403 `CSRF_INVALID`**. Additional clients from same `REMOTE_ADDR` hit **429 `RATE_LIMITED`** regardless of session cookie. FormLab continues to distinguish **202 `QUEUED_UNCONFIRMED`** (transport acceptance only) from verified inbox delivery, which is never claimed. The local-HTTP test does not attempt real `mail()` because sender is unset.
- Origin/Host/Fetch-Metadata checks remain independently exercised in earlier suite; no assumption that `X-Forwarded-For` is a trustworthy IP.

## Static binary media proof

Six entirely original factory-themed image variants committed in local `lab/public/assets/media` (no third-party source images): WebP and AVIF each at 320×180, 640×360, 960×540; each file <30 KB and all six together <50 KB. Test fixtures assert actual Pillow decoding, and Chromium decodes 640-wide versions via data URLs. Files are generated artifacts, not the ability to optimize user uploads or an image pipeline. No JS gallery library or remote CDN is included.

## Unresolved production/security/legal gates

- **Phone:** pin actual lite library and all transitives, confirm Apache-2.0 notices / current 9.x release and server `mbstring` availability, exercise real metadata numbers and unknown-region behavior. Do not treat test double as legal/security or functionality approval.
- **Anti-abuse:** prevent unbounded per-IP lock file growth, define retention and cleanup, address shared reverse-proxy identity, distributed traffic, multi-host NFS/flock semantics and credential isolation. This laboratory only covers one reliable private local filesystem; it is **not** a production anti-bot solution.
- **Form delivery:** end-to-end inbox / CRM delivery, durable outbox and idempotency, ownership, GDPR/retention, accessible errors, trusted origin deployment, independent backups and operational logging all remain open.
- **Images:** upload security/EXIF stripping/media ownership, server conversion, cache headers, responsive art-direction, device testing, measured LCP/CLS and signed publications remain open.
- **Editor:** fixtures noncanonical, nothing wired to production Jedison/Opis, no React/Next adapter, no Stage3 contract decision. No main branch or canonical ADR change.
