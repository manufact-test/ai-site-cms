# Independent Security Research: actual-main webserver policy source boundary

**21 October 2026.** Research PR #3 only. This is a STATIC exact-source contract, not a live Hostinger webserver test, penetration test, rewrite/denial proof, or production acceptance.

## Why this closes a meaningful evidence gap

The previous original-main source audit checked `cms/public/index.php`, the Slim health-only route, the separate Hostinger Stage2 readonly PHP front controller, and the offline verifier CLI guards. **It did not attest the original .htaccess policies in the same source path.** On LiteSpeed/Apache, wrong document roots, disabled overrides and loose extension handlers can invalidate a safe-looking PHP route analysis.

The new `main-webserver-boundary-proof.mjs` checks the **two distinct** actual-main files:

- `cms/public/.htaccess`: PHP public document-root configuration; keeps `Options -Indexes -MultiViews -FollowSymLinks -SymLinksIfOwnerMatch`, `DirectoryIndex index.php`, `FallbackResource /index.php`, and the explicit `FilesMatch` deny rules for dotfiles, non-front-controller PHP-like executables, and named sensitive extensions.
- `cms/hosting/hostinger-readonly/.htaccess`: **separate** Stage2 read-only preflight deployment root, not a CMS production root; keeps `Options -Indexes -MultiViews -FollowSymLinks`, `DirectoryIndex index.php`, the specified `FilesMatch` denies, and the exact `RewriteEngine/RewriteRule/RewriteCond` chain including dotpath rejection and the non-file / non-directory front-controller routing conditions.

It **intentionally** uses an exact active-directive allowlist, rather than an optimistic heuristic that would accept new handler or access-control directives. Standalone comments and blank lines do not provide evidence of active security protection. Any actual policy drift causes an explicit review failure, even if it might be a benign improvement: update the research contract only after inspecting new original-main Git blobs and understanding the server implications. This is source-change detection, not webserver-rule equivalence checking.

## Original-source provenance and actual test chain

The existing `main-head-independent-proof.mjs` clones the true current `main` to a temporary external folder, pins its observed HEAD, and validates all critical original Git blobs. It now additionally verifies both `.htaccess` Git blob bytes, excludes symlinks/hardlinks, overlays only the research-only checker into the disposable checkout, demands its final explicit marker and parses its fail-closed JSON. The existing original-source and 60 genuinely signed chain proofs still run and the original main HEAD is checked again before completion.

The dedicated `--self-test` mode supplies **synthetic** configurations and rejects attempted enabling of Indexes, granting file access, changing front controller, removing a deny block, adding an executable handler, or changing rewrite/fallback rules; comment-only lures cannot masquerade as active rules. These mutation checks are regressions of the checker, **not** observations of original `main` or actual LiteSpeed/Apache semantics. The complete Security suite records separate source and mutation rows, failing closed on real source drift.

## What the integrator must still verify on authorized infrastructure

1. Record the target site, deployed document root, original `main` SHA, exact package inventory and hashes, PHP SAPI/handler and `AllowOverride` or LiteSpeed equivalent. Check that the private vendor and offweb package are **outside** the actual HTTP document root.
2. With explicit owner authorization on dedicated staging, test benign and forbidden URLs and allowed HTTP methods across both **separate** sites and canonical/encoded paths; assert observed denial of dotfiles, PHP-like extra executables, sensitive file extensions, directories, trailing paths and potentially executable alternate handlers. Keep customer data and secrets out of tests.
3. Verify effective rewrite modules, fallback, location-level overrides, path normalization and file handler mapping. `.htaccess` source correctness does not mean the live server loads or honors the file.
4. Review *all actual shipped public-root file names* and server MIME/handler associations; the rules are denylist patterns, not an exhaustive allowlist. Confirm package cannot expose secrets, archive sources, alternate `php7/php8` extensions, backups, or unintended static assets through misconfiguration.
5. Only the integration/release owner can accept target-host findings, rollback evidence and the six independent external signoffs. A green research CI cannot issue GO.

## Non-claims / remaining risk

**No live Hostinger contact was made.** This proves only that both exact checked-in policy files were observed on a Git-verified original-main source snapshot and matched the research-reviewed text. It does not prove document-root mapping, physical deployment, Apache module availability, `AllowOverride`, LiteSpeed compatibility, non-disclosure of extra public files, interpretation of `FilesMatch`/rewrite directives, dynamic PHP reachability, Ed25519 HTTP exposure, rate limits, or actual DoS safety. Stage2/production remains **NO_GO**; external cryptography, legal, key-custody, target-host, integrator and release-owner approvals remain outstanding.

Run offline mutation checking: `node research/parallel-security/main-webserver-boundary-proof.mjs --self-test`. The original source check is part of the `main-head-independent-proof.mjs` live-source task and the actual exact-head Security CI (never substitute synthetic files for the Git clone).
