# MANUFACT AI Site CMS — First Site Operator Acceptance Ledger

The main developer controls the actual CMS and all publication. This workflow creates a PRIVATE, source-SHA-bound **human work queue** for existing first-site technical blockers and real operational checks, without waiving or resolving any blocker automatically.

## 1. Start from an actual first-site technical report

Run the existing SEO Engine bin/first-site-check.cjs first, using the approved source and the official PHP capture. It produces summary.json and bundle.json. Those remain authoritative for technical findings; this ledger only records human work on top of them.

Generate an editable private template:

~~~bash
node stage3/seo-engine/bin/manage-first-site-acceptance.cjs template \
  --summary /ABS/private/first-site-report/summary.json \
  --bundle /ABS/private/first-site-report/bundle.json \
  --out /ABS/private/NEW-FIRST-SITE-LEDGER-TEMPLATE
~~~

Bundle is optional, but recommended for original explanatory gate messages. Every original blocking gate ID becomes a task (gate:gate-id), plus six mandatory manual tasks: owner-published-revision, three-device-browser, interactive-accessibility, real-form-delivery, public-host-security, and client-approval-rollback.

All tasks begin unreviewed. Copy the generated first-site-operator-template.json to a private editable location, never to GitHub or public hosting. A non-unreviewed decision must include owner, reason and reviewedAt YYYY-MM-DD. A fix-reported or operator-checked status additionally requires one or more private evidenceRefs. Choices: unreviewed, assigned, investigating, fix-reported, operator-checked.

## 2. Review human decisions

~~~bash
node stage3/seo-engine/bin/manage-first-site-acceptance.cjs review \
  --summary /ABS/private/first-site-report/summary.json \
  --bundle /ABS/private/first-site-report/bundle.json \
  --ledger /ABS/private/edited-first-site-operator.json \
  --out /ABS/private/NEW-FIRST-SITE-OPERATOR-REVIEW
~~~

Output: first-site-operator-review.json, first-site-operator-review.md, PRIVATE-README.txt.

The ledger must match the **exact summary.json bytes SHA-256**, siteId, sealedSiteSha256, published CMS version and exact original blocker task IDs. Edited/removed/duplicated blockers are rejected. Its reported completion counters are only operator assertions. The original first-site technical blocker count **always remains** until the main developer runs a new authoritative first-site-check and its actual findings disappear. No operator checkbox permits publishing, bypassing POST/email/Telegram delivery or skipping three-device/client signoff.

## 3. Optional new run with old statuses as reference

If the real first-site technical report changes, create a NEW ledger; do not modify the original hash manually:

~~~bash
node stage3/seo-engine/bin/manage-first-site-acceptance.cjs template \
  --summary /ABS/private/NEW-first-site/summary.json \
  --bundle /ABS/private/NEW-first-site/bundle.json \
  --previous-summary /ABS/private/OLD-first-site/summary.json \
  --previous-ledger /ABS/private/OLD-edited-operator.json \
  --out /ABS/private/NEW-next-operator-template
~~~

A previous decision is included only in previousDecisionForReferenceOnly for surviving task IDs, with current status RESET to unreviewed. The new report's actual blockers, not past commentary, determine the current technical state.

## 4. Open the first-site cockpit with human statuses

~~~bash
node stage3/seo-engine/bin/build-first-site-cockpit.cjs \
  --summary /ABS/private/first-site-report/summary.json \
  --bundle /ABS/private/first-site-report/bundle.json \
  --operator-review /ABS/private/NEW-FIRST-SITE-OPERATOR-REVIEW/first-site-operator-review.json \
  --out /ABS/private/NEW-launch-cockpit
~~~

After a real manual publication, an independently generated --post-deploy path may also be supplied. The cockpit checks exact summary SHA256 in the operator review and displays the human states. It **never** changes blocked technical status based on those states.

The output is a private local HTML file and manifest. No external JS, network calls, public ZIP, deploy, PR/merge or CMS mutation. Private output folders must be outside Git checkout and never overwrite existing folders. See FIRST-SITE-COCKPIT.md for the separate public HTTPS evidence and manual acceptance process.

## 5. Minimal smoke

~~~bash
node stage3/seo-engine/tests/first-site-acceptance-smoke.cjs
node stage3/seo-engine/tests/first-site-cockpit-smoke.cjs
~~~

The first-site acceptance remains unverified until the lead actually confirms CMS source revision, public site HTTPS, screenshots at three device sizes, successful form POST and notification delivery, and client signoff. This ledger does not claim those checks took place.
