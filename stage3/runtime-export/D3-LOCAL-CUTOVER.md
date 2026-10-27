# D3 — local release registry and safe switch rehearsal

**Scope:** Offline/local only. No DNS, hosting connection, production database,
credentials, background jobs, deployment or public visitor traffic switching.
D3 creates a completely separate registry and a loopback-only PHP inspection
router, isolated from the CMS and D1/D2 outputs.

## Three complete flows

1. **Stage immutable releases:** import an existing D1 HTML/PHP/Next package
   or an exact D2 published handoff JSON (with html/php/next-static/next-ssr target).
   Verify checksums and the complete package inventory, pin slots to one site ID.
2. **Plan, confirm, activate:** inspect added/removed routes, redirect, canonical
   origin, form collector and technology changes. A 15-minute single-use token
   is bound to generation, active slot and exact candidate identity. Activation
   updates an atomic local JSON pointer only.
3. **Review and rollback:** preview published HTML/media/real 301 on loopback;
   plan-rollback requires an independent confirmation and preserves all old slots.
   Tampered stored files and stale/consumed confirmations are refused.

## CLI, Node 22

    node stage3/runtime-export/bin/release-manager.cjs init /ABS/new-lab
    node stage3/runtime-export/bin/release-manager.cjs stage /ABS/new-lab release-v1 /ABS/published-html-folder
    node stage3/runtime-export/bin/release-manager.cjs stage /ABS/new-lab release-v2 /ABS/site-published-v2-handoff.json php
    node stage3/runtime-export/bin/release-manager.cjs stage /ABS/new-lab release-v3 /ABS/next-ssr-folder
    node stage3/runtime-export/bin/release-manager.cjs verify /ABS/new-lab
    node stage3/runtime-export/bin/release-manager.cjs plan /ABS/new-lab release-v2
    node stage3/runtime-export/bin/release-manager.cjs activate /ABS/new-lab TOKEN_FROM_PLAN
    node stage3/runtime-export/bin/release-manager.cjs status /ABS/new-lab
    node stage3/runtime-export/bin/release-manager.cjs plan-rollback /ABS/new-lab
    node stage3/runtime-export/bin/release-manager.cjs rollback /ABS/new-lab TOKEN_FROM_ROLLBACK_PLAN

## Disposable loopback visitor, PHP 8.1+

    php -S 127.0.0.1:8181 -t /ABS/new-lab/public /ABS/new-lab/public/router.php

Browse http://127.0.0.1:8181/ and http://127.0.0.1:8181/__lab/status.

- For ALL targets the lab router serves the already-published HTML snapshot.
  This is NOT a Next runtime parity test or a substitute for a real Next build.
  Next SSR still needs a Node host; PHP hosting cannot run Next SSR.
- Loopback host/IP checks, noindex headers, no script/network execution,
  blocked form submissions via CSP and HTTP 405.
- Never mount the registry folder under any production document root.
  This control plane is single-machine only, with no authentication or
  multi-host coordination. Production cutover requires a separate authorised
  deployment implementation and explicit approval.
- Slot names never reused, no cross-site release mixing, immutable file
  inventory, manifest hashes and symlink refusal. Local atomic state updates.
- Main, Design Factory and actual public CMS publication are untouched.
  Stage2 NO-GO and Stage3 0/135 owner acceptance are unchanged.

## CI

One disposable Node test plus PHP loopback verifies D2 handoff import,
historical slot activation, HTML/Next staging, local 301/media, exact browser
render, replay/stale token rejection, rollback and tamper detection:
node stage3/runtime-export/tests/release-lab.cjs.
