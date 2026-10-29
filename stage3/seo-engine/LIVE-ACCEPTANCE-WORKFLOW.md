# First-site LIVE human acceptance — browser, forms and client

The manual acceptance matrix is a practical checklist for actual approved production websites, NOT a second SEO report engine. It reads a source-pinned public-phase lead relay plus the existing PHP/static and actual observed public HTTPS verification. All operator evidence remains private, and each review returns releaseAuthorized:false.

## Prepare
The public integration session creates live-acceptance-template/live-acceptance-template.json automatically. To rebuild a blank fresh template:
~~~bash
node stage3/seo-engine/bin/first-site-live-acceptance.cjs template --candidate /ABS/private/local/candidate --contract /ABS/private/public/lead-relay/INTEGRATION-CONTRACT.json --post-deploy /ABS/private/public/post-deploy/post-deploy-summary.json --out /ABS/private/NEW-template
~~~
All paths must be private and outside GitHub; no overwrite or symlink source. The tool checks original candidate/PHP summary SHA256, static upload inventory, independent ZIP CRC32/SHA256, exact lead relay SHA references, owner version and post-deploy report SHA256 before creating anything.

## Edit the complete ORIGINAL template privately
Public content page routes are derived from the verified upload inventory; fallback redirects and 404 are excluded. Each page gets independent desktop/tablet/mobile tasks. Seven required manual checks cover host TLS/DNS/source provenance, client design, keyboard/JS interactions, privacy/consent, full form POST coverage, client approval and rollback.

All generated pinned/required fields must stay untouched. Each task initially has state unreviewed, observedAt:null, checkedBy:"", evidenceRef:"", notes:"". For actually checked tasks, change state to passed or failed, supply operator, YYYY-MM-DD date and PRIVATE evidence reference. A failed task also needs a reason. An unchecked item must remain unreviewed.

Example REAL form receipt entry (append to formTests array; do not replace other fields):
~~~json
{
  "page":"/contact/",
  "formRef":"lead-main",
  "state":"passed",
  "observedAt":"2026-10-29",
  "checkedBy":"Site lead",
  "evidenceRef":"private://actual-post-notification-receipt",
  "notes":""
}
~~~
No secrets, HMAC, submission content, email addresses or recipient private details in the editable file. Each real form must be submitted with consent and checked for persistence and recipient notification by the authorized lead. Distinct page+formRef pairs are required; duplicate rows cannot count twice.

Actual PHP forms.markupObserved is a workload estimate, not an authenticated unique form inventory. Therefore the manual real-form-inventory task remains mandatory regardless of POST receipt count.

## Review
~~~bash
node stage3/seo-engine/bin/first-site-live-acceptance.cjs review --candidate /ABS/private/local/candidate --contract /ABS/private/public/lead-relay/INTEGRATION-CONTRACT.json --post-deploy /ABS/private/public/post-deploy/post-deploy-summary.json --filled /ABS/private/edited-live-acceptance.json --out /ABS/private/NEW-reviewed-acceptance
~~~
Output: live-acceptance-review.json/md and privacy note. All original private evidence remains untouched. Unknown/removed/duplicate tasks, stale SHA, wrong site/version/ZIP/post report, missing operator/date/private receipt or failed form are refused or explicitly flagged.

Statuses:
- TECHNICAL-EVIDENCE-BLOCKED: original public technical match is not proven.
- HUMAN-OBSERVATIONS-FAILED: explicit failed browser, accessibility, privacy, approval or form check.
- HUMAN-EVIDENCE-INCOMPLETE: pending page/device/manual tasks or missing real form POST receipts.
- OPERATOR-ATTESTED-REQUIRES-OWNER-AUTHORIZATION: complete *operator assertion* for the exact release, NEVER an automatic GO.

The CLI does not perform real browser, HTTPS/TLS authentication, POST, inbox/Telegram testing, client signature, host write, PR or merge. The lead independently checks original operator receipts and obtains approval; changed versions/hosting require new snapshots and new attestation. Never commit these files.

## Unified manual human acceptance in the private SEO workspace (29.10.2026)

After the actual operator completes the private live browser/device/form template, run first-site-live-acceptance.cjs review on the exact public lead relay and post-deploy summary. The resulting live-acceptance-review.json can be added to the existing unified private SEO Operator Workspace, along with the **original** lead relay contract, by adding the optional sibling config:

~~~json
"liveAcceptance": {
  "report": "/ABS/private/actual-live-acceptance-review.json",
  "contract": "/ABS/private/actual-public-phase-lead-relay/INTEGRATION-CONTRACT.json"
}
~~~

It MUST be accompanied by firstSite.summary and firstSite.postDeploy from the SAME original PHP/source and public release; exact raw SHA256 of the human report's lead contract, PHP summary and postDeploy report are compared. The workspace adds human.html with checked/pending/failed tasks and actual POST receipt counts, never an automatic GO. Offline claims remain subject to independent real TLS, screenshots, mail/Telegram delivery and client signoff.

The one-command first-site integration runner supports optional search-phase keys liveAcceptanceReview and liveAcceptanceContract **together**. This permits a single later private workspace including local launch, public technical evidence, human acceptance, real indexing and Search History, only when each source identity agrees. If the human review is not available, omit both keys and proceed with observational GSC reports without fabricating acceptance.
