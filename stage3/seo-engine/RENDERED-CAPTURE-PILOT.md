> **31 October 2026 — browser image loading QA:** the same approved Chromium capture can additionally include source-pinned, double-sampled image loading/first-viewport observations. The existing rendered-content audit flags broken visible images, lazy first-screen images and missing media attributes; old v2 remains valid with image evidence unknown. See [RENDERED-IMAGE-LOADING-QA.md](RENDERED-IMAGE-LOADING-QA.md). No LCP/CLS/Google claim or automatic GO.

# MANUFACT SEO — Safe Chromium rendered-source collection for first client pilot

> **31 October 2026 — CSS visibility extension:** the same Chromium capture and existing rendered-content review now include optional source-bound computed CSS visibility for H1, H2–H6, main and approved CTA/nav anchors. No new dashboard, no Google proof, old v2 without CSS remains valid/unknown. See [RENDERED-VISIBILITY-QA.md](RENDERED-VISIBILITY-QA.md).

**2026-10-30 · independent SEO worker · `feature/site-seo-engine` / `stage3/seo-engine/**` only.**
No PR, merge, deployment, CMS mutation, Google API, browser session reuse or customer files in Git.

## Why this is needed

The previous [RENDERED-CONTENT-QA.md](RENDERED-CONTENT-QA.md) reconciles existing public HTTPS responses with three viewport DOM artifacts. Until now the operator had to obtain DOM HTML manually; v1 evidence contained only a `rendered-dom` claim with no same-request body correlation. This new **bounded read-only public browser collector** produces a versioned v2 artifact directly and ties every device capture to both:

- the exact SHA256 of the original private HTTP source file; and
- the **actual main-document response body received during that browser navigation** (compared to original public HTML).

The latter is a practical safeguard: if the deployment or generated response changes between collecting HTTP HTML and opening Chromium, the auditor labels the device `browser-http-body-drift` and **does not** count that device/page as a confirmed comparison. A body hash match proves only these bytes were equal; it does not authenticate server identity beyond browser TLS/DNS checks, static asset revisions, source author, client approval or Google rendering.

## New modules and outputs

- `lib/seo-rendered-capture.cjs` — source validation, selected public IPv4 DNS pin, browser/request safety, three-device original DOM capture, v2 schema validation.
- `bin/capture-rendered-public.cjs` — operator-approved, explicit HTTPS read-only CLI. Private output, no overwrite and original source rehash.
- `schemas/viewport-capture-v2.schema.json` — strict public rendered DOM contract.
- `tests/seo-rendered-capture-smoke.cjs` — synthetic mocked Chromium/Playwright offline Node smoke.
- Updated `lib/seo-rendered-content-audit.cjs` — supports both old v1 and new source-pinned v2, never drops v1 compatibility.

Private output contains:

1. `rendered-viewport-evidence-v2.json` — **original full serialized DOM HTML**, potentially sensitive. Keep exclusively in private protected storage.
2. `RENDERED-CAPTURE-RECEIPT.json` — SHA256, site ID, exact mount, 3-device coverage and limitations, no raw markup.
3. `PRIVATE-README.txt` — ownership/privacy warnings.

The existing standalone `review-rendered-content.cjs --viewports` and existing Workspace `crawl.renderedCapture` now accept v2 directly. Their generated reports contain only approved IDs, route labels, diagnostic codes, counts and SHA256, not client HTML or business data. Existing first-client readiness gate `rendered-seo-content-parity` stays blocked/unknown until manual review.

## Prerequisites

- Real approved compiled Blueprint, current Site v1 and the original existing `manufact-seo-delivery-evidence-v1` from the **same** site and claimed published revision, outside the repository.
- Exact public HTTPS hostname/mount and an explicit human decision to perform a GET-only browser capture. Only root `https://host/` or official `https://host/published/SITE-ID/` mounts are permitted by the reused public capture guard. Loopback, private, reserved, IP-literal, test/internal hosts and untrusted mixed DNS answers are rejected.
- Public IPv4 DNS address; currently IPv6-only sites are deliberately refused.
- Installed sandbox-capable Chromium/Chrome and compatible `playwright-core` (WebSocket routing requires version **1.48+**). Reuses lead checkout `cms/editor/node_modules/playwright-core` when available; otherwise a separately installed normal `playwright-core`. No root package or CI dependency is added by this branch.
- Browser must support the **Chromium OS sandbox**. The code explicitly enables `chromiumSandbox:true`; it does **not** pass `--no-sandbox`. If the environment cannot sandbox public page JavaScript, the capture must fail, not downgrade security.

## Explicit operator command

**First run offline preflight** by adding `--mode preflight` to the exact same command below (and optionally `--page-ids`). It validates original private source files, exact allowed mount/selected IDs, destination policy and installed browser binary/Playwright loader **without DNS, launching Chromium, writing an output directory or making HTTP requests**. It does not test whether the OS sandbox can launch or attest the real public host. Remove the mode switch or use `--mode capture` only after reviewing the preflight result and approving the live public GET observation.

```bash
node stage3/seo-engine/bin/capture-rendered-public.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --site /ABS/private/current-owner-site.json \
  --public-http /ABS/private/original-public-https.json \
  --origin https://approved-real-host.example/published/SITE-ID/ \
  --out /ABS/private/NEW-RENDERED-CAPTURE
```

### Bounded first-page pilot (optional)

For a cautious first client trial, append `--page-ids page-home` (or `--page-ids page-home,page-contact`) using **real IDs already in the approved Blueprint**. This reduces the live run to 3 browser snapshots per selected page rather than running every page on the first attempt. At most **eight unique approved IDs** may be selected per command. Do not supply page URLs here; only IDs from the verified Blueprint are accepted. Selected navigation guard and the output contain only these pages; the receipt reports selected and total approved page counts plus `partialPilotCapture:true`.

The existing reconciler still evaluates the **entire** Blueprint. Pages not selected are explicitly **uninspected**; partial pilot evidence must never be mistaken for full launch acceptance. Omit `--page-ids` when ready to capture all approved pages; all other safety limits still apply.

Set `STAGE3_CHROME=/ABS/path/to/chromium` or append `--chrome /ABS/path/to/chrome` if not installed in the supported system paths. Replace every example with an actually approved host; example/test hosts are deliberately not accepted. Only operator-supplied URLs from the current approved pages are navigated. Each device/page is limited to 80 allowed same-mount GET/HEAD requests; excess requests are aborted and counted as a report warning. Browser JS can still trigger application-defined side effects via GET on misdesigned sites, so this is a bounded operator-approved observation, not a guarantee of zero server-side effects. This command **does** issue real public GET requests and executes site JavaScript, so do not run it against a client without explicit operational authorization. It does not submit forms, make HTTP POSTs, publish anything or call Google.

Then:

```bash
node stage3/seo-engine/bin/review-rendered-content.cjs \
  --blueprint /ABS/private/approved-blueprint.json \
  --site /ABS/private/current-owner-site.json \
  --public-http /ABS/private/original-public-https.json \
  --viewports /ABS/private/NEW-RENDERED-CAPTURE/rendered-viewport-evidence-v2.json \
  --out /ABS/private/NEW-RENDERED-SEO-REVIEW
```

Or pass that exact v2 file as `crawl.renderedCapture` to the existing single Operator Workspace builder. No second dashboard or CMS tool is introduced.

## Browser guardrails

- Reuses existing strict public HTTPS URL/mount and public IP validators, requires a single pinned public IPv4 lookup and launches Chromium with host-resolver mapping. TLS verification stays enabled; no insecure certificates, stored logins or persistent browser context.
- **Chromium sandbox required**; each page/device gets an isolated ephemeral context, fresh viewport 1280 / 768 / 390, JavaScript enabled, downloads denied, service workers blocked and explicit empty permissions.
- Playwright request interception is installed before opening any page: only HTTPS GET/HEAD to the exact approved origin **inside the approved mount**, and top-level navigations only to approved Blueprint URLs. POST, PUT, third-party assets, off-mount redirects and unknown navigation targets are aborted and counted. All WebSocket connections are closed before server connection; WebRTC/WebTransport are explicitly disabled at document start.
- If a page depends on blocked external CSS/JS, WebSockets or an unsupported worker, its DOM may be incomplete; the rendered auditor emits P1 `blocked-browser-requests` or `browser-script-errors`. It is a manual hold, not false success.
- Main navigation must return exact 200 and matching final URL, with a bounded UTF-8 HTML response. The original main-document response text is hashed. Serialized DOM must have an HTML/head and be at most 250 KB per device.
- After load the collector makes bounded short DOM-stability observations; changing DOM is flagged `dom-not-settled` and excluded from complete comparison.
- Original Blueprint, Site v1 and HTTP source files are SHA256 checked and re-read before private output. No destination overwrite, no storing source in Git, no auto-release, no cookies from a signed-in user's browser.

**Important safety limit:** GET is conventionally read-only, but a defective remote website can still perform side effects on GET. Browser request interception is not a complete OS/network sandbox, and page JavaScript may attempt other browser capabilities. Run only on an approved public website in a suitably isolated, sandbox-capable environment. This is not a security penetration test or proof that no request escaped.

## V2 source contract and fail-closed semantics

`manufact-seo-viewport-evidence-v2` includes original HTTP file SHA, approved mount, claimed Chromium engine/request restrictions, exact selected page IDs/routes and for each desktop/tablet/mobile: viewport, method, original serialized DOM HTML + SHA, navigation URL/status, main document SHA, `matchesOriginalHttpBody`, `stableMarkup`, blocked request count with bounded reason categories (no third-party URLs or request paths) and JavaScript error count. All source-authority booleans remain false.

The downstream auditor:

- Rejects v2 from a different original HTTP **byte digest**, unknown route/site or HTTPS mount.
- Rehashes the private v2 per-device DOM HTML and checks exact URLs, widths and supported shape.
- Independently compares each browser navigation body SHA to the originally supplied public HTML body SHA.
- Marks mismatched HTTP bodies or unstable DOM **uninspected** (P1), not passed; flags blocked requests and page JS errors for manual review.
- Supports v1 legacy viewports without falsely claiming the stronger v2 source-body correlation.

V2 is an **unsigned, operator-supplied local artifact**. An attacker capable of altering all files and recomputing hashes can forge it; it is not an attestation, authenticated public session, client signoff, actual Google indexing result or release approval. The lead must still confirm the published revision, real site, robots/sitemap, current CMS source, client browser accessibility, visual parity and rollback.

## Focused verification

```bash
node stage3/seo-engine/tests/seo-rendered-capture-smoke.cjs
node stage3/seo-engine/tests/seo-rendered-content-smoke.cjs
node stage3/seo-engine/tests/seo-lead-readiness-smoke.cjs
```

New smoke uses a fake Playwright adapter, not the network: checks public IPv4/mount gate, blocked POST/off-origin/navigation/WebSocket, stable three-device DOM, original document SHA, mutated/stale body held as uninspected, tamper rejection, private atomic CLI output and no automatic GO. **Only call a real test passed after it was actually run**. Full Chromium on an authorized public site and complete checkout CI are still lead-owned first-pilot actions.

Reference API: [Playwright BrowserContext routing](https://playwright.dev/docs/api/class-browsercontext), [WebSocketRoute](https://playwright.dev/docs/api/class-websocketroute), [Chromium sandbox launch option](https://playwright.dev/docs/api/class-browsertype).
