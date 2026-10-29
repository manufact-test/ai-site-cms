# Owner-operated Email delivery: optional TLS SMTP

Site forms always save an accepted lead to the private CMS inbox first. External Email and Telegram notification is optional and must be configured on an authorized server. Email now supports **authenticated TLS SMTP with no PHP dependencies beyond OpenSSL**; the original PHP `mail()` path remains the default when SMTP is not selected.

## Private server environment variables

```sh
STAGE3_MAIL_FROM=sender@example.com
STAGE3_SMTP_HOST=smtp.example.com
STAGE3_SMTP_SECURITY=starttls
STAGE3_SMTP_PORT=587
STAGE3_SMTP_USER=sender@example.com
STAGE3_SMTP_PASSWORD=<server-secret-not-in-git>
```

Alternatively select `STAGE3_SMTP_SECURITY=tls` and port `465`. TLS 1.2+ certificate and hostname verification are always required. Plain SMTP, ports other than 465/587, self-signed certificates, IP/localhost hostnames, missing credentials and silent fallback to PHP `mail()` are refused when SMTP_HOST is set. Server environment credentials are never stored in site.json, Studio, backups, browser responses or public website ZIPs. For an SMTP provider, use its actual hostname, verified credentials and permitted sender; never hardcode live secrets in the repository.

No config migration or manual database upgrade is required for this transport. The existing site and per-form routing, private outbox, verified recipient snapshot, owner-authorized probes and audit stay in place. Both normal leads and manually confirmed routing probes use the selected SMTP transport. SMTP 250 following DATA means **accepted by the outgoing transport**, never proof of mailbox/inbox delivery.

## Owner operation and safe recovery

In hosted Studio, open **Внешние уведомления о заявках**, configure site/form recipients and inspect the displayed Email transport. When SMTP is configured the mode appears as `SMTP (TLS)`; configuration problems appear as explicit errors. An incorrect SMTP setup leaves all accepted visitor inquiries in the private lead inbox; it never changes a saved recipient or marks a notification as delivered.

After fixing server settings, an authorized owner can explicitly retry **one** failed/pending/unknown outbox entry from its recent attempt row, or use the existing bulk retry operations. Single retry requires a reason, confirmation, the exact delivery ID, observed state and attempt count; concurrent/stale actions fail closed. Uncertain sends require explicit duplicate-risk confirmation. This operation can send real email/Telegram messages; do not use it during development without separately authorized recipients and environment. No automatic re-send of uncertain outcomes is permitted.

The owner inbox displays the actual Email/Telegram transport state on each lead, including inbox-only leads with no external notification job. The private filtered **Скачать CSV** lead export adds the same two transport-state columns per inquiry without destination secrets. Empty means no outbox entry; `accepted` is transport acceptance, not human receipt. Existing export filters and 1000-lead bound still apply.

For isolated local checking without outgoing messages: `php stage3/tests/smtp-config-smoke.php`. Real provider mailbox receipt and customer website operation remain owner/environment gates and are not certified by CI.
