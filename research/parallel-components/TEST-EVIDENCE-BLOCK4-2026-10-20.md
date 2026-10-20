# Editor & Components research — Block 4 evidence (20 October 2026)

**Independent non-production experiment.** Only `research/parallel-components/` may be modified. Stage2 NOT ACCEPTED; Stage3 NOT STARTED. This is not CMS editor, production transport or final AI↔site↔CMS contract. `main` / Hostinger / active editor / GitHub workflows untouched.

## Work delivered

1. `lab/src/ReceiptLedger.php`: HMAC-keyed duplicate request fingerprint; OS advisory locks; fail-closed corrupted/private-store handling; 600-second attempt fence; no personal form fields written to disk. Integrated with the **existing standalone form** using a new optional claim callback. Configured local HTTP refuses an unavailable ledger and returns `409 DUPLICATE_REQUEST` on a second identical request from a separate browser session. Note: this protects the outbound attempt on a single filesystem, not external delivery or exactly-once semantics.
2. `lab/src/RevisionGate.php`, extended `CapabilityGate.php`, `fixtures/visual-revision-candidates.research.json`: optimistic revision/conflict **proposal-only** with strongly bounded pixel/color/mobile-tablet-desktop properties. No writes or invented editing permissions.
3. `lab/public/assets/ui.js`: fixes dialog FAQ focus destination while preserving Escape return focus, and prevents resubmission on the duplicate-request response. Real Chromium keyboard tests added.
4. Dedicated PHP unit, actual local PHP HTTP and Chromium tests with stable, repeatable commands; no external network or third-party runtime injected into the CMS.

## Actual local test evidence

Machine: Linux sandbox; PHP **8.4.24**, Python **3.13.5**, Chromium **144.0.7559.96**. (Other Python library versions as previously recorded in block3.) All test commands started from `research/parallel-components`.

```bash
for file in lab/src/*.php lab/public/*.php lab/tests/*.php; do php -l "$file" || exit 1; done
# 20/20 PHP files syntax PASS, exit 0.

for f in lab/tests/{form,property,origin,capability,phone,throttle,media,receipt,revision}-tests.php; do php "$f" || exit 1; done
# Individual PHP assertions: 24 + 32 + 17 + 20 + 18 + 27 + 22 + 42 + 33 = 235 PASS; exit 0.
# `receipt-tests.php` and `throttle-tests.php` spawn 12 genuine PHP child processes each.

python -m unittest discover -s lab/tests -p test_http.py -v             # 2/2 PASS, exit 0
python -m unittest discover -s lab/tests -p test_http_configured.py -v  # 2/2 PASS, exit 0
python -m unittest discover -s lab/tests -p test_http_receipt.py -v     # 1/1 PASS, exit 0
python -m unittest discover -s lab/tests -p test_browser.py -v          # 10/10 PASS, exit 0
python -m unittest discover -s lab/tests -p test_adapter_capabilities.py -v # 3/3 PASS
python -m unittest discover -s lab/tests -p test_capabilities.py -v     # 2/2 PASS
python -m unittest discover -s lab/tests -p test_media_assets.py -v    # 1/1 PASS
python -m unittest discover -s lab/tests -p test_schema.py -v          # 5/5 PASS
# Total separate Python suites: 26/26, exit 0 for each.
```

One attempted broad combined run timed out in the sandbox; **do not report it as green**. The eight modules above were run independently, with exit code 0, including 10 real Chromium tests. Browser `fetch` form responses are **mocked** and never imply browser-to-PHP network E2E. Three HTTP suites separately exercise a real PHP development server through `urllib` using loopback. The HTTP test has no configured sender and confirms `DELIVERY_FAILED` before a duplicate is refused. No mail, Telegram or CRM callback is actually delivered or confirmed. No live libphonenumber metadata loaded, and no site-family React/Next SSR, accessibility screen-reader certification or production deployment is claimed.

## Risks / acceptance gates for integrator

- File-based, HMAC-indexed 10-minute dedupe is **research only**: no production replay guarantee across hosts, no durable outbox, possible lost attempt when a process dies between claim and send, no receipt confirmation, potential false duplicate for legitimate recurring exact content, filesystem permissions/rotation and recovery plan required.
- Never log raw post bodies, phone numbers, emails or HMAC secrets. Symlink checks are best-effort on operator-owned private storage; not a substitute for secure file-descriptor/openat guarantees under a compromised local user.
- The `RevisionGate::plan` result has no persistence, CAS atomicity, authentication, authorization, rollback, Jedison integration, Next hydration, or semantic trust boundary. A real implementation needs those independently.
- Before considering production: specialist third-party license review, shared hosting and reverse-proxy validation, cross-browser keyboard + assistive-technology audits, realistic delivery and bot-abuse tests, PHP version matrix, target-environment dependency compatibility and clear Stage3 architecture approval.
