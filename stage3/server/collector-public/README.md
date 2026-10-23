# Isolated Stage3 collector entrypoint

Set `stage3/server/collector-public` as the **only** document root
for an independently configured form receiver. Only
`POST /forms/{siteId}/{sectionId}` is exposed: no login, Studio,
drafts or admin inbox. Use a dedicated compatible database
(`STAGE3_DSN`), a 32+ character `STAGE3_FORM_SECRET` shared
with the static-export signer, and exact allowed origin strings
(`STAGE3_FORM_ORIGINS`). Static builds require the explicit HTTPS
`STAGE3_FORM_ENDPOINT`. No real hosting or secrets configured here.
Submissions persist to CMS storage; owner-only in-app notifications
do not imply external email/Telegram delivery.
