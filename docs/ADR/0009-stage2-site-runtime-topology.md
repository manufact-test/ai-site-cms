# ADR 0009 — Site runtime topology and adapter execution boundaries

**Date:** 2026-10-18 · **Status:** Stage2 architecture decision; laboratory prototype validated, NOT production approval.

## Context

AI Site CMS must edit independent AI-created HTML/CSS/JS, PHP, React and Next.js websites while the CMS backend itself remains deployable on ordinary PHP hosting. The runtime/build environments are not interchangeable. Next SSR cannot be served as PHP-only, and a CMS installation must never share its private state or public document root with a client website by accident.

## Decision

1. Treat the CMS runtime as independent **Slim/PHP**, one installation and private state per website. The publicly served directory is `cms/public`; the client website uses **a separate project root and public destination**. CMS admin JavaScript must never leak to the visitor's public website as an installation precondition.
2. Five explicit delivery classes: `html` (static assets); `php` (independent site PHP runtime); `react-spa` (prebuilt static SPA with rewrite support); `next-static` (pre-exported static Next files, no Node required to serve exports); `next-ssr` (independent Node service behind proxy). The latter **requires Node and reverse proxy**. No silent "PHP-only SSR" promise.
3. `cms/src/Hosting/SiteRuntimeTopology.php` is a **read-only local topology/asset boundary inspector**, not a site adapter. It requires explicit existing canonical CMS+site roots, strict self-declared host capabilities, bounded public inventory, rejects sensitive/linked files and overlapping roots, and checks independent roots across multiple installations.
4. CLI `cms/bin/site-runtime-topology.php` takes operator-supplied roots and JSON capabilities, has no DB/network/writes and never outputs local paths or credentials. Its output is a *policy-compatible declaration*, **not verified hosting capability**.
5. A tested, trusted website adapter with explicit manifest, delivery/rendering and publish/rollback belongs to Stage3+; no production deployment or claims about a real shared host until separately authorized and tested.

## Tested evidence

- PHP8.1–8.4 plus SQLite/MySQL CI [7/7 green](https://github.com/manufact-test/ai-site-cms/actions/runs/39157813640); compiled editor+ZIP [1/1 green](https://github.com/manufact-test/ai-site-cms/actions/runs/39157813797) at source SHA `f16c6ca19ce840b6dd46bbec74459fa346393cf7`.
- **84** topology scenarios, **12** isolated read-only CLI tests, production upgrade lab **239** checks (separate scope); internal package **440 files**.
- No actual Node Next SSR process, PHP-FPM/Apache/OPcache, Hostinger, React build, site data migration or user website included.

## Limits and follow-up

Inventory is bounded (1024 nodes, 32 MiB per file, 64 MiB total), policy still may have TOCTOU races against privileged local writers and cannot verify externally declared flags. Do not treat absence of public symlinks as proof of real server misconfiguration resistance. Full adapter/deployment semantics and practical target-host proof remain open. Stage2 **not accepted**; 0/135 mandatory product requirements accepted.
