# D6 — published ZIP to local HTTP visitor rehearsal

**No deployment. No remote traffic.** D6 takes a genuine D4/D5 published
site ZIP, verifies its immutable release manifest and file hashes, then
serves a disposable visitor on 127.0.0.1. It neither uses the CMS nor
contacts production databases, forms, domains or hosting.

## Paths

Existing ZIP to HTTP rehearsal:

    node stage3/runtime-export/bin/rehearse-delivery.cjs /ABS/verified-delivery.zip
    node stage3/runtime-export/bin/rehearse-delivery.cjs /ABS/verified-delivery.zip --report=/ABS/NEW-report.json

End-to-end D2 capsule to ZIP, D5 content audit and D6 HTTP rehearsal:

    node stage3/runtime-export/bin/ship.cjs /ABS/published.json html /ABS/new-html.zip --http-rehearsal
    node stage3/runtime-export/bin/ship.cjs /ABS/published.json php /ABS/new-php.zip --http-rehearsal
    node stage3/runtime-export/bin/ship.cjs /ABS/published.json next-static /ABS/new-next.zip --allow-npm-install --http-rehearsal

The normal separate D5 preflight JSON includes the D6 httpRehearsal
result, with exact ZIP hash. Both outputs are published only after all
checks pass and no existing files are overwritten.

**Next SSR is intentionally not runnable** in this mode. The independent
Next SSR shipment remains UNBUILT SOURCE ONLY, requiring real npm/Node
build and SSR runtime. A standalone SSR rehearsal returns not-runnable
and exit code 2. D5 ship refuses next-ssr with --http-rehearsal.

## Checks

- GET 200 and empty HEAD 200 for every published page
- Real 301 Location response on each published redirect
- 200 + exact SHA256 for every published media asset
- Correct 200 or 404 for robots.txt and sitemap.xml
- 404 on unknown pages, private manifests, private data, handoff files
- POST denied 405: no form submissions are sent

HTML and Next Static use a first-party 127.0.0.1 Node static-host
**simulation**, including 301 from the immutable route manifest. This
does NOT prove Apache/Nginx are configured to honor the shipping rules.
PHP uses the ACTUAL independent D1 PHP visitor controller via disposable
PHP built-in server bound to 127.0.0.1, preserving private data outside
the public document root. Requires local PHP 8.1+ CLI.

All reports retain LOOPBACK_DISPOSABLE_ONLY and explicitly state that
real TLS, DNS, Apache/Nginx host behavior, collector, SMTP, runtime
availability, production safety and owner signoff remain unverified.

The existing D4 delivery-probe and real Next build CI exercise D6 for
HTML, PHP and real built Next Static; no large new suite was added.
Stage2 still NO-GO by manual gates #5–#9; Stage3 still 0/135
formally accepted. This is engineering evidence, NOT release approval.
