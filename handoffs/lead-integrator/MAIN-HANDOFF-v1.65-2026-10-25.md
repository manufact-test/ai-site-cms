# AI Site CMS — MAIN HANDOFF v1.65 / 2026-10-25

## 0. Source of truth and verification

- Repository: https://github.com/manufact-test/ai-site-cms
- Main integrator branch: `feature/stage3-ai-site-contract`. Do not touch `main`.
- **Verified functional source SHA:** `97811cecc2946ed1daf52d0e4ed9fcf3b360c221`.
- **Full Stage3 CI SUCCESS:** [Actions #40205358049](https://github.com/manufact-test/ai-site-cms/actions/runs/40205358049) for that exact SHA. This run completed after the worker implementation and includes the workflow's PHP/SQLite server E2E, Chromium Studio E2E, contract/SDK checks and bundle/packaging checks.
- This handoff is a separate documentation checkpoint. Inspect the actual branch HEAD and any CI for that docs-only commit separately; do not confuse it with the verified functional SHA.
- Stage 2 remains **NO-GO** (human/host gates #5–#9); Stage 3 is isolated and **not formally accepted**; **0/135** mandatory product acceptance items are accepted.
- No permission for `main` merge, Hostinger/SSH, production, real databases, customer sites, CELIKOM, or PR #3/#4.
- Design Factory is a separate workstream. This change does not modify `stage3/design-factory/**` and does not establish actual D7 compatibility.

## 1. Latest large block — recoverable lead-delivery queue

Added a bounded, explicitly enabled CLI worker for the existing durable Email/Telegram delivery outbox.

- `stage3/server/FormDelivery.php` now exposes `processDeliveryQueue(int $limit=50)`. It accepts only a batch limit of 1–250, marks abandoned `sending` records older than 15 minutes as `uncertain`, then processes only `pending` rows in deterministic creation order.
- New `stage3/server/bin/process-delivery-queue.php` is CLI-only. It refuses to run unless `STAGE3_ALLOW_DELIVERY_WORKER=YES` is explicitly present in the process environment; optional CLI argument is the batch size (default 50, maximum 250).
- Stale `sending` jobs are never assumed to have failed: the external provider may already have accepted the message. They move to `uncertain` and are **not** automatically re-sent.
- Owner retry continues to require an explicit reason. Uncertain deliveries are included only when the authorized owner explicitly opts in to retry them.
- The worker reports bounded outcome counts without printing message content, recipient addresses, tokens or provider response bodies. Unexpected dispatch exceptions are logged by exception class only.
- The public collector and existing delivery settings are unchanged; this adds recovery for pending outbox jobs after process interruption. It does not enable a scheduler or configure production cron.

### Verification

Full CI for `97811cecc2946ed1daf52d0e4ed9fcf3b360c221` is green: [Actions #40205358049 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40205358049).

The server E2E now verifies:
1. Worker invocation is refused without the explicit environment gate.
2. A pending delivery is picked up by a one-job batch.
3. With no provider transport configured, the job ends in `configuration_required` rather than being reported as sent.
4. An old `sending` record becomes `uncertain` and is not automatically dispatched.
5. A normal retry leaves uncertain jobs alone; an explicit owner choice allows them to be retried.

No real Email or Telegram message was sent. The tests use disposable CI storage and intentionally missing provider configuration.

### Operational boundary

The worker is not automatically scheduled and is not enabled in production. Any future cron/scheduler setup must use the isolated Stage 3 database credentials, intentionally configured provider environment, an authorized test recipient, and explicit owner approval. Do not infer production readiness from CI success.

## 2. Previous large blocks retained

### v1.64 — global theme typography and button styles

The site-wide settings cover body text size (14–22 px), line height, H2 scale, default button style (solid/outline/pill), corner radius and button text color. Section-level button styling can inherit or override the global default. SDK/schema/PHP validation, Studio preview, published PHP renderer and offline bundle are aligned; legacy site-v1 documents without optional fields keep safe defaults. Verified at [Actions #40204138704](https://github.com/manufact-test/ai-site-cms/actions/runs/40204138704). This remains subject to owner visual review.

### v1.63 — provisional Design Graph import/handoff

The versioned envelope keeps the candidate baseline separate from CMS edits and exports a compatibility audit. It is a draft handoff scaffold only: no final independent Factory D7 artifact was ingested, and no lossless or pixel-perfect compatibility is claimed. See [AI-DESIGN-COMPOSITION.md](../../stage3/docs/AI-DESIGN-COMPOSITION.md) and [MAIN HANDOFF v1.63](MAIN-HANDOFF-v1.63-2026-10-25.md).

## 3. Scope and known limits

- Stage 3 is isolated engineering, not formal product acceptance. CI is technical evidence, not owner acceptance.
- Stage 2 is still NO-GO at gates #5–#9; **0/135** mandatory requirements accepted.
- The queue worker recovers pending outbox entries but does not prove delivery to real Email/Telegram providers; no live provider credentials were used.
- A timeout or interrupted provider call can have an unknown outcome. The safe state is `uncertain`, requiring an explicit owner decision before resend.
- No production scheduler, real-host deployment, external database migration or customer-site change was performed.
- The Design Graph direction estimate in older handoffs is narrow to that engineering direction and is not a percentage for the entire CMS.

## 4. Code map

- `stage3/server/FormDelivery.php` — durable outbox dispatch, stale-send recovery and bounded queue entry point.
- `stage3/server/bin/process-delivery-queue.php` — guarded CLI worker.
- `stage3/tests/server-e2e.cjs` — worker authorization, pending processing and uncertain-send recovery assertions.
- `stage3/README.md` — operator notes and explicit operational guardrails.
- `.github/workflows/stage3-ai-contract.yml` — existing full isolated Stage 3 CI workflow.

## 5. Next large block

Continue the full CMS end-to-end work rather than small lab iterations: remaining design/SEO/navigation/repeater/form/media workflow gaps and fidelity between Studio, preview and published output. Use existing full CI plus only the critical checks that protect the changed flow. If the owner provides the actual final Design Factory D7 package, inspect that exact artifact and produce a supported/converted/missing-property matrix before implementing any adapter.

Never merge `main`, deploy, configure a production worker, access real-host/database credentials, or modify the independent Factory worktree without explicit owner authorization.

## 6. Ready-to-paste first message for the next lead chat

See [FIRST-MESSAGE-v1.65-2026-10-25.md](FIRST-MESSAGE-v1.65-2026-10-25.md).
