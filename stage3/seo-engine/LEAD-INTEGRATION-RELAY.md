# MANUFACT SEO — First-site lead integration relay (29 October 2026)

**Owner:** lead CMS integrator. **Worker write boundary:** `stage3/seo-engine/**`. This is a read-only, local, private checkpoint connecting existing first-site candidate, official static archive, post-publication verification and (later) Search Console evidence.

## Why this exists

`prepare-first-site.cjs` already captures localhost PHP and assembles the official public-only static upload. `verify-deployed-site.cjs` already checks operator-collected HTTPS/GET byte evidence after the lead deploys. Previously those phases had separate reports; the relay now establishes **one cross-phase source/revision/release identity** and an ordered, responsibility-marked handoff. It does not run either phase or repeat their SEO analyses.

## Step 1 — lead prepares a real local candidate

Only the lead may obtain an authenticated owner-published Site v1, confirm the source revision and client approval archive, prepare the official server PHP export, start the PHP server and perform the actual forms/browser checks. The SEO worker does not control that process.

Example from an integrated checkout, with **real private absolute paths**:

```bash
node stage3/seo-engine/bin/prepare-first-site.cjs \
  --approved-site /ABS/SEALED-APPROVED-SITE-V2 \
  --published-site /ABS/owner-published-site.json \
  --blueprint /ABS/approved-blueprint.json \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ \
  --static-export /ABS/official-static-export \
  --provider netlify \
  --workspace /ABS/NEW-private-candidate
```

All live client files stay outside the Git checkout. Candidate evidence is **not** authority to deploy.

## Step 2 — create a source-pinned lead relay

```bash
node stage3/seo-engine/bin/build-first-site-lead-relay.cjs \
  --candidate /ABS/private-candidate \
  --out /ABS/NEW-private-relay
```

This command independently verifies the entire upload ledger (SHA-256 for every public file) and public-only ZIP (stored entries, CRC32, SHA-256). It reads the immutable `CANDIDATE-STATUS.json` and `seo-report/summary.json` without changing either. The resulting private folder contains:

- `INTEGRATION-CONTRACT.json` — exact sealed Source SHA256, owner sourceRevision claim, CMS published version, official static manifest SHA256, ZIP SHA256, original blocker IDs, stage and immutable input SHA256 hashes.
- `LEAD-NEXT-ACTIONS.md` — source-locked operator steps and responsibilities; manual gaps cannot be silently accepted.
- `PRIVATE-README.txt` — non-public warning.

Possible stages: `LOCAL-TECHNICAL-BLOCKED`, `PUBLIC-EVIDENCE-MISSING`, `PUBLIC-TECHNICAL-BLOCKED`, and `PUBLIC-TECHNICALLY-MATCHED-MANUAL-SIGNOFF`. **None means GO.** Every run requires a *new* private output directory; it cannot live inside the repository or candidate. Outputs are mode 0700/0600 and staged atomically. No cookies, tokens, request bodies or GSC CSV are copied into the contract.

## Step 3 — after lead-controlled publishing

First follow `STATIC-LAUNCH-WORKFLOW.md`, using **only** `static-upload/public/` or the verified `public-site.zip`. The lead alone owns CDN, host config, deployment and rollback. Collect independent TLS/HTTP/redirect and actual GET SHA-256 media receipts. Verify them using:

```bash
node stage3/seo-engine/bin/verify-deployed-site.cjs \
  --candidate /ABS/private-candidate \
  --approved-site /ABS/SEALED-APPROVED-SITE-V2 \
  --published-site /ABS/owner-published-site.json \
  --static-export /ABS/official-static-export \
  --public-http-evidence /ABS/public-https.json \
  --public-media-digests /ABS/public-media-get-sha256.json \
  --out /ABS/NEW-post-deploy-review
```

Then build a **new relay** (never overwrite the old snapshot):

```bash
node stage3/seo-engine/bin/build-first-site-lead-relay.cjs \
  --candidate /ABS/private-candidate \
  --post-deploy /ABS/NEW-post-deploy-review/post-deploy-summary.json \
  --out /ABS/NEW-private-relay-after-publication
```

The relay refuses a different `siteId`, `publishedVersion`, official static manifest SHA256, candidate ZIP SHA256 or original blocker count, and rejects fake post-deploy release authorization. HTTPS evidence is still an **operator-attested offline transcript**; DNS/TLS provenance and browser checks must be independently verified.

## Step 4 — later, real Search Console evidence

When the customer has an actual GSC property/export, use existing Search Performance and URL Indexing workflows, **not** invented traffic or indexing. The optional relay inputs are:

```bash
node stage3/seo-engine/bin/build-first-site-lead-relay.cjs \
  --candidate /ABS/private-candidate \
  --post-deploy /ABS/post-deploy-summary.json \
  --blueprint /ABS/approved-blueprint.json \
  --indexing /ABS/indexing-intelligence.json \
  --search-history /ABS/search-history.json \
  --out /ABS/NEW-private-relay-with-search
```

Both search inputs are optional; each requires the original exact **raw** Blueprint SHA256. Reports must match site ID, approved Blueprint bytes, HTTPS origin and observed published host if post-deploy report is present. Search counts are *observations*, and absent indexing URLs remain UNKNOWN, never 'excluded'.

## Mandatory client acceptance beyond this relay

1. Lead confirms current authenticated owner revision and visual-approved prototype/archive.
2. Real PHP browser checks: desktop, tablet, mobile, accessibility, layout and console.
3. Authorized real form POST, persistence, delivery to configured email/Telegram and consent.
4. Lead-owned host deployment with actual 200/301/404, canonical/robots/sitemap and HTTPS/media verified.
5. Explicit client signoff of the site, content, privacy and user journey.
6. Only then real, correctly attributed Search Console follow-up; owner/lead approves every CMS change.

**No PR, merge, CMS write, Google authentication, remote publish, form POST, real-browser check or client signoff is performed by this CLI.** For a manual private HTML overview, reuse `SEO-OPERATOR-WORKSPACE.md` — this relay is a source/integration contract, not a second dashboard.

Focused check (on Node 20+ lead checkout):

```bash
node stage3/seo-engine/tests/first-site-lead-relay-smoke.cjs
node stage3/seo-engine/bin/build-first-site-lead-relay.cjs --help
```

Real first-site integration remains blocked until the lead supplies actual owner-published artifacts, approved client site and post-publication evidence.
