# AI Site CMS — Security Research: integrator acceptance and integration packet

**21 October 2026 | Research branch only | PR #3 remains OPEN DRAFT, not for automatic merge.**

Repository: https://github.com/manufact-test/ai-site-cms

Research branch: `research/stage2-supply-chain-followup`. This workstream may modify **only** `research/parallel-security/` and leave PR #3 conversation comments. All CMS and deployment actions listed here are *instructions to the main integrator*, not research-branch changes.

## Executive decision

Independent scoped supply-chain, Ed25519/PHP physical-runtime, original-current-main chain and static route checks have completed. This does **NOT** establish Stage2 acceptance. **NO_GO** remains mandatory until six human/target-authorized reviews are completed.

Two actionable **conditional**, **locally reproduced on Apache 2.4.68** configuration findings require main-integrator triage; neither establishes any current Hostinger exploit:

**SEC-WEB-01 — public dot-directory file disclosure under a mispacked document root.** A byte-for-byte original `cms/public/.htaccess` allowed synthetic `/.git/config` and `/.github/workflows/build.yml` files to be read (HTTP 200); direct `/.env` and `/secret.sql` returned 403. `<FilesMatch "^\.">` matches basenames and does not prohibit all children of dot-directories. **No such deployed sensitive files were observed.** Package build must *exclude them*, and effective deployed server policy must independently deny their paths.

**SEC-WEB-02 — preflight rewrite runtime availability.** Byte-for-byte `cms/hosting/hostinger-readonly/.htaccess` returned Apache HTTP 403 for even harmless `/private/info.txt` and `/synthetic-missing`, with `AH00670` because both `FollowSymLinks` and `SymLinksIfOwnerMatch` were disabled with `RewriteRule` present. Blanket denial here signals **broken routing**, not security success. No LiteSpeed/Hostinger result or current installation failure was measured.

Exact original-main config blobs (confirmed unchanged on main `787972739a8f7d8616f8dfe8d897d9ca5ee9fc4b`):
- `cms/public/.htaccess`: `bd73a9fddfb4ff793118974887b0eac36528cc44`.
- `cms/hosting/hostinger-readonly/.htaccess`: `9dcddcb6d2ee1cd265f795e88b9fe7f226fa2227`.

## Reproduction and security-controlled mitigation experiments

Full observations: [APACHE-LOCAL-POLICY-REPRO-2026-10-21.md](APACHE-LOCAL-POLICY-REPRO-2026-10-21.md). The standalone runner `apache-original-policy-lab.py` reads the actual original-main `.htaccess` bytes, refuses mismatching Git blob hashes, creates only synthetic marker files in an isolated temporary Apache root and binds **loopback**; it is not allowed to perform Hostinger tests:

```bash
python3 research/parallel-security/apache-original-policy-lab.py /trusted/read-only-original-main-checkout
```

A **synthetic local Apache** addition of `RedirectMatch 403 "(^|/)\."` to public policy returned 403 on both dot-directory test paths while allowing normal `/private/info.txt` and non-file fallback paths (200). It requires mod_alias, may unintentionally block `/.well-known` challenges and is **not an approved patch**, nor proof of LiteSpeed compatibility. Prefer **first** building a strict shipped-public-file inventory and server-effective pathname-level denial, with explicit treatment for necessary `/.well-known` endpoints.

A **synthetic local Apache** change of Hostinger-readonly Options to `-FollowSymLinks +SymLinksIfOwnerMatch` removed `AH00670`, restored expected 200 for benign positive controls and kept dotpaths 403. This changes symlink semantics, can weaken filesystem isolation and is **not an approved patch**. A server-owned rewrite alternative may be preferable. Security/hosting owner must review allowed symlinks, `AllowOverride` and actual LiteSpeed behavior.

Any implementation of either mitigation must be made **by main integrator independently in main**, not through a research cherry-pick, and passed through regular main CI plus approved target host staging. Never disable safety controls simply to get green HTTP 200; never confuse all-403 with valid route behavior.

## Main integrator action plan and pass/fail matrix

| Item | Acceptance evidence | Failure response |
|---|---|---|
| Public package inventory | Enumerate *all* final public files, reject dot-directories, hidden/backup/source/vendor/secret material and unplanned executable handlers | Block candidate; remove unsafe shipped files; ensure private code stays outside document root |
| Public deny controls | Owner-approved staging requests for `/.git/config`, `/.github/workflows/build.yml`, `/.env`, `/secret.sql`, unwanted PHP-like handlers and normalized/encoded path variants are **denied without marker disclosure** | Block launch; repair server configuration and retest |
| Positive public routes | `GET /api/health` and approved public static assets work under actual SAPI; non-file rewrite/fallback behaves as documented | Block launch; do not equate blanket 403/503 to security success |
| Separate Stage2 preflight | Document root is strictly its own sandbox; `GET /__stage2/host` and `/ __stage2/rewrite/proof` (without space in real request) route through correct readonly front controller; no `AH00670` or unexpected PHP handler | Reconcile Apache/LiteSpeed rewrite conditions and safe symlink policy on staging |
| PHP/Ed25519 | Measure actual web-SAPI `extension_loaded('sodium')`, internal function origin and guarded release call paths; stage permitted valid/invalid signature and bounded concurrency tests | Keep fail-closed; no hash downgrade or bypass |
| Signoffs | Six independently authenticated, scoped, dated, signed/approved decisions stored privately (publisher key custody, qualified crypto, redistribution legal, target Hostinger, integrator release integrity, product owner) | Remain **NO_GO**, even if all research CI rows pass |

**Do not conduct unbounded load tests, scan public sites without authorization, post sensitive marker contents or live host credentials in PR comments.** Use a dedicated owner-approved staging host and agreed limits. The Hostinger plan remains [HOSTINGER-ED25519-OFFLINE-CAPACITY-PLAN.md](HOSTINGER-ED25519-OFFLINE-CAPACITY-PLAN.md).

## Research evidence and disposition (exact-head CI must be checked after final docs)

Full standalone lab source: [apache-original-policy-lab.py](apache-original-policy-lab.py). Static source integrity: [main-webserver-boundary-proof.mjs](main-webserver-boundary-proof.mjs). Previous completed baseline original-current-main suite: Actions [#39629404618](https://github.com/manufact-test/ai-site-cms/actions/runs/39629404618) on research SHA `9b03a0c3ec5750ce2246bd814a7a7ccad7d0ecf5`: **100 PASS / 0 FAIL / 0 BLOCKED** and scope **74/74 only research/parallel-security**. Every subsequent research commit (including this packet) requires its own final exact-head CI result.

Immutable original crypto evidence remains: 43 locked Composer/npm pins live OSV (0 known findings at specific times only), real verified original Git source `sodium_compat 2.5.2` with 78 source blobs, physical PHP8.3 no native Sodium, 14 upstream Ed25519 attack-boundary assertions, 60 genuine original-current-main signed-chain checks, and bounded **CLI** fallback performance comparison (NOT Hostinger). Research packet hashes are not expert signatures.

## Integration / PR #3 rules

**Do not merge this large historically based research PR into main automatically.** Main has moved independently from original PR base `6ec6dd170c5250e5caed9f0739e03858a3b96a93`. Leave PR **OPEN DRAFT** until the release/integration owner explicitly decides otherwise. The main developer may review/use *research findings and exact suggested scenarios* or selectively port verified scripts, but shall apply production `.htaccess` changes only through its normal review + live-host authorization path. No workstream can replace external signoffs with a CI green badge.

Researcher disposition: **bounded technical research evidence complete for integrator handoff**; infrastructure, qualified reviewers, license signoff and owner decision remain outstanding. Stage2/production: **NO_GO**.
