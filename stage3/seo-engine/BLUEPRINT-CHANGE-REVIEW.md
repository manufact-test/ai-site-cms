# MANUFACT SEO — Blueprint Change Intelligence

Compares two owner/operator-supplied Blueprint v1 plans before a CMS implementation and turns the differences into a private SEO migration review. Source inputs can be canonical manufact-seo-blueprint-v1 files or original manufact-seo-brief-v1 exports (including finished Blueprint Studio exports). Both are normalized using the authoritative existing compiler. No customer source input is written to Git.

**Blueprint Studio connection:** Operators can import the previous same-site v1 Blueprint or brief directly into the offline Studio to see a live provisional old/new comparison while editing. That browser preview cannot authenticate source hashes. Always use the authoritative two-input compare command below after exporting the final Studio brief.

## 1. Compare the old and new SEO plan

Save the approved previous and proposed new sources OUTSIDE GitHub. In a checkout containing the integrated SEO worker files:

~~~bash
node stage3/seo-engine/bin/compare-seo-blueprints.cjs \
  --before /ABS/private/previous-blueprint.json \
  --after /ABS/private/new-seo-brief.json \
  --out /ABS/private/NEW-blueprint-change-report
~~~

Open /ABS/private/NEW-blueprint-change-report/index.html locally. It displays P0/P1/P2 actions and future not-yet-performed live checks. Stable page IDs identify a route move as the same page; a page removal is not automatically mapped to a new destination. No redirect is created here.

Files in the new private report:
- index.html — responsive static comparison report; no JS or network.
- BLUEPRINT-CHANGE-IMPACT.json — deterministic source-derived diff, affected pages, exact tasks and future HTTP check plan.
- BLUEPRINT-CHANGE-IMPACT.md — operator handoff.
- DECISION-DESK.html — offline source-bound human decision UI with draft import/export and validation.
- DECISION-WORKSHEET.json — original empty action ledger, matched to the exact Blueprint pair.
- SOURCE-MANIFEST.json — raw source byte SHA256, canonical Blueprint SHA256, output digests.
- PRIVATE-README.md — boundaries.

All files are emitted in a new private directory via atomic staging; both original sources are rehashed before completion. The input files must be regular private files outside Git checkout and under 2 MB. Never publish the output or put it in a static site ZIP.

## 2. Identify real SEO consequences before implementation

The impact diff checks stable-ID route moves, needed 301 verification, disappeared indexed pages, new pages, robots and canonical changes, titles/descriptions/OG, search intent/topics, headings/sections/media/CTAs, repeated and inherited contextual links, Schema.org candidate claims, fact confidence, research references, owner naming/locale and new architecture warnings.

Route probes describe what the CMS lead needs to verify AFTER independent owner-authorized implementation: real 301 and Location from an old URL, destination 200, canonical and meta on the actual published host. A proposed 301 is NOT a performed redirect. Missing planned links do not prove the public site has no header/footer navigation or cannot be crawled.

P0 = urgent owner/lead review; P1 = SEO implementation review; P2 = editorial/design review. These are planning priorities, not claims of production bugs.

## 3. Record operator decisions without hand-editing JSON

Open DECISION-DESK.html locally. For each original P0/P1/P2 card choose pending, accepted, rejected or deferred. For completed decisions enter reviewer, observation date, private evidence reference (accepted) or an explanation (rejected/deferred). You can save an unfinished draft and reimport it. Do not enter passwords, form payloads, customer PII or private recipient addresses. Export blueprint-decisions-SITE-ID.json, then run:

~~~bash
node stage3/seo-engine/bin/review-blueprint-decisions.cjs \
  --before /ABS/private/previous-blueprint.json \
  --after /ABS/private/new-seo-brief.json \
  --decisions /ABS/private/blueprint-decisions-SITE-ID.json \
  --out /ABS/private/NEW-blueprint-decision-review
~~~

The second command rederives every action from the same two original sources and rejects stale SHA256, missing/fabricated/reordered actions or invalid decision evidence. It produces a separately pinned, immutable private index.html, BLUEPRINT-DECISION-REVIEW.json, BLUEPRINT-DECISION-REVIEW.md, and SOURCE-MANIFEST.json.

Even 100% accepted results are called ALL-OPERATOR-DECISIONS-RECORDED-OWNER-SIGNOFF-UNVERIFIED, NOT release approval. Operator evidence references are descriptions, not independently authenticated proof. The CMS lead must still verify actual public host, CMS revision, 301s and client approval.

## 4. Focused verification to run after integration

~~~bash
node stage3/seo-engine/tests/blueprint-change-review-smoke.cjs
node stage3/seo-engine/tests/blueprint-change-cli-smoke.cjs
node stage3/seo-engine/tests/blueprint-decision-editor-smoke.cjs
~~~

The first test checks canonical diff, redirects, linked pages, schema fact risks and strict decisions. The second runs actual local Node CLI processes with temporary private source files, checks output atomicity, disallowed checkout inputs, non-overwrite and rejection of stale worksheets. The third executes the offline editor JS in a minimal DOM and checks accepted evidence validation and CSP hashing. These are NOT live customer acceptance or confirmed GitHub Actions on the SEO branch.

## 5. If the proposed plan changes

Create a NEW diff and NEW decision worksheet with the updated original source SHA256; never reuse an accepted worksheet from another revision. The actual Site v1 backup, redirects, rollback and deployment belong to the CMS lead in the separately approved project workflow. No automatic CMS writes, Google requests, form POST, PR, merge, client signoff, or hosting deploy occurs in these modules.
