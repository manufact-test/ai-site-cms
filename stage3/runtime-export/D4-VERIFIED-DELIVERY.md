# D4 — Verified ZIP handover for independent published sites

D4 is an offline, **zero-deploy** completion of D1–D3. It creates real
standards-compliant ZIP32 STORE archives with exact SHA256 for every packaged
file, local/central ZIP header checks, CRC32, safe paths and immutable
published release identities. The input is published, NEVER unpublished drafts.

## One command directly from the D2 Studio download

For HTML, PHP or Next SSR source (Node 22 on your computer):

    node stage3/runtime-export/bin/package-handoff.cjs /ABS/site-published-v3-handoff.json html /ABS/NEW-html-delivery.zip
    node stage3/runtime-export/bin/package-handoff.cjs /ABS/site-published-v3-handoff.json php /ABS/NEW-php-delivery.zip
    node stage3/runtime-export/bin/package-handoff.cjs /ABS/site-published-v3-handoff.json next-ssr /ABS/NEW-ssr-source.zip

Optional exact host binding: --expect-origin=https://example.com.

The command reconstructs the immutable publication, generates the real
ZIP and immediately verifies checksum and site identity; no hosting
credentials, system PHP, network access or ZIP executable are needed.
Next SSR is explicitly SOURCE ONLY, build required (not deploy-ready).

## Already built HTML/PHP/Next Static project → ZIP

    node stage3/runtime-export/bin/prepare-delivery.cjs /ABS/published-html-folder /ABS/NEW-html.zip
    node stage3/runtime-export/bin/prepare-delivery.cjs /ABS/independent-php-folder /ABS/NEW-php.zip

For Next Static, an actual generated Next out/ tree is mandatory:

    node stage3/runtime-export/bin/build-handoff.cjs /ABS/site-published-v3-handoff.json next-static /ABS/generated-next
    cd /ABS/generated-next
    npm install --no-audit --no-fund
    npm run build
    node /ABS/REPO/stage3/runtime-export/bin/prepare-delivery.cjs /ABS/generated-next /ABS/NEW-next-static.zip

Verification on any machine:

    node stage3/runtime-export/bin/verify-delivery.cjs /ABS/delivery.zip

## ZIP layout and hosting readiness

    deploy/...                              published visitor files
    handoff/INSTALL.txt                     operator guide and limitations
    handoff/delivery-manifest.json          per-file SHA256, readiness and routes
    handoff/source-release-manifest.json    immutable publication evidence
    handoff/runtime-build.json             adapters only
    handoff/nginx-redirects.example.conf    routing sample, not auto-install

- HTML: upload deploy/ as document root. Generated .htaccess enables real
  Apache HTTP 301; HTML redirect fallback alone is NOT HTTP 301.
- PHP: document root deploy/public only! deploy/data holds private published
  snapshots outside the web root, including immutable media and SEO.
- Next Static: deploy/ holds actual built out/* plus Apache .htaccess. Nginx
  needs equivalent server rules for real redirect status.
- Next SSR: deploy/ is an UNBUILT Node source project. Requires npm install,
  npm run build and Node-capable hosting. Not compatible with PHP-only hosts.

For forms, a separately hosted working HTTPS collector is mandatory, not
bundled with the ZIP. No secrets, leads, users, production database or CMS
admin code are shipped. A missing canonical HTTPS origin causes a not-ready
label; the ZIP still remains available for analysis.

The files-prepared label is NOT authority to deploy: TLS, canonical host,
301 routing, security headers, 404, working forms, back-ups, staging and
owner signoff must be checked separately. D4 performs NO remote deployment,
DNS updates, host changes, production traffic switching or migrations.

## CI

The disposable delivery-probe.cjs tests real HTML/PHP and D2 one-command ZIP,
Next SSR source semantics, ZIP CRC32/SHA256, manifest and host root, redirection,
corruption, mismatched origin, unbuilt Next Static rejection and no overwrites.
The pre-existing independent Next real-build CI additionally packages the
genuinely compiled Next Static out/ directory and verifies its ZIP. Stage2
NO-GO and Stage3 0/135 owner acceptance remain unchanged.
