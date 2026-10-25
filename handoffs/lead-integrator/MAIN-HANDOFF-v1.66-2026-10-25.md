# AI Site CMS — MAIN HANDOFF v1.66 / 2026-10-25

## 0. Current checkpoint and evidence

- Repository: https://github.com/manufact-test/ai-site-cms
- Lead integrator branch: `feature/stage3-ai-site-contract`. Do not switch to or modify `main`.
- **Last verified functional code SHA:** `97811cecc2946ed1daf52d0e4ed9fcf3b360c221`.
- **Full Stage 3 CI SUCCESS for that exact functional SHA:** [Actions #40205358049](https://github.com/manufact-test/ai-site-cms/actions/runs/40205358049).
- **Previous documentation-only checkpoint:** `90333fc0aca9c3cfa66daa18067812cf141d2ba8`, [Actions #40212155888 — SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40212155888). That run completed the existing isolated workflow: contract smoke, SDK/bundle parity, Chromium editor E2E, PHP 8.3 + SQLite HTTP persistence/publish E2E, hosted browser E2E and offline package.
- This v1.66 update is documentation/handoff work only. It introduces no functional code change. Verify the actual current branch HEAD and its own Actions result before making new changes; do not confuse a docs-only SHA with `97811cecc2946ed1daf52d0e4ed9fcf3b360c221`.
- Stage 2 remains **NO-GO** at external/human gates #5–#9. Stage 3 is isolated, not formally accepted; **0/135** mandatory product acceptance criteria accepted.
- No authorization for `main` merge, Hostinger/SSH, production, real databases, customer sites, CELIKOM, PR #3/#4, external migrations, or changes to the independent Design Factory branch.

## 1. Latest functional block — recoverable lead-delivery queue

Implemented on `97811cecc2946ed1daf52d0e4ed9fcf3b360c221`; verified by [full CI #40205358049 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40205358049).

- `stage3/server/FormDelivery.php` exposes `processDeliveryQueue(int $limit=50)`, with a strict batch limit of 1–250. It processes pending outbox rows in deterministic creation order.
- `stage3/server/bin/process-delivery-queue.php` is CLI-only and requires `STAGE3_ALLOW_DELIVERY_WORKER=YES` in the process environment. The optional batch-size argument defaults to 50 and cannot exceed 250.
- Abandoned `sending` records older than 15 minutes are marked `uncertain`, because the provider may have accepted a message before the process stopped. They are never automatically re-sent.
- Retrying uncertain deliveries requires an explicit authorized owner decision; retry actions require a reason.
- Worker output reports bounded counts and avoids printing message content, recipient addresses, tokens or provider response bodies. Unexpected dispatch exceptions are logged by class only.
- The worker recovers pending outbox work after process interruption. It does **not** configure cron/scheduling, enable a production worker, or prove delivery to live Email/Telegram providers.

### What CI actually established

The existing Stage 3 CI passed on the exact functional SHA, including server E2E coverage for:
1. refusal to run the worker without its explicit environment gate;
2. processing a pending job with a one-item batch;
3. missing transport resulting in `configuration_required`, not a false sent/accepted claim;
4. stale `sending` becoming `uncertain` without automatic dispatch; and
5. explicit owner choice being required to retry uncertain deliveries.

No real Email or Telegram messages were sent. No live provider credentials, production scheduler or production environment were configured.

## 2. Previous functional blocks retained

### v1.64 — global theme typography and button styling

Global body text size (14–22 px), line height, H2 scale, button style (solid/outline/pill), radius and button text color. Section button appearance may inherit or override the global default. SDK/schema/PHP validation, Studio preview, published PHP renderer and offline bundle are aligned; legacy site-v1 themes without optional new fields keep safe defaults. Verified at [Actions #40204138704](https://github.com/manufact-test/ai-site-cms/actions/runs/40204138704). Owner visual review is still separate from CI.

### v1.63 — provisional Design Graph import/handoff

The versioned envelope separates a candidate design baseline from CMS edits and exports a compatibility audit. This is a provisional handoff scaffold, **not** verified integration with the real independent Design Factory D7 output. No final D7 artifact was ingested; no lossless or pixel-perfect conversion is claimed. If the owner supplies the final artifact, inspect its actual structure and produce a supported/converted/missing-property matrix before implementing a version-pinned adapter. Do not modify the independent Factory branch or files without explicit permission.

## 3. Documentation refresh v1.66

Refreshed the project status, root README, next-chat note, roadmap, Stage 3 README and lead handoff after confirming the prior documentation checkpoint's CI success. Added a new first-message file for the next lead chat. This is not a new functional-code checkpoint and does not change the formal stage/acceptance state.

## 4. Next large block

Continue the remaining full CMS workflows and fidelity between Studio, preview and published output. Prefer a large end-to-end feature block across the real user path—design, SEO, navigation, repeaters, forms or media—over isolated micro-fixes. Use the existing full CI and only the necessary critical checks; do not expand repetitive test matrices without a concrete risk.

If the final Design Factory D7 artifact arrives, audit the actual artifact first. Otherwise continue with the highest-impact CMS workflow/fidelity gap already supported by the repository.

## 5. Mandatory operating rules

- One owner message saying “продолжаем” means **one large, coherent end-to-end block**, not a small cleanup.
- Implement useful functionality first; then run existing full CI and a small number of critical checks. Fix regressions found, but do not endlessly test unfinished hypothetical features.
- Report exact functional SHA, its CI, what actually changed, remaining limits, and the next substantial block. Any percentage must be a grounded engineering estimate for a named subsystem, never a claim that the entire CMS is that complete.
- Stage 2 remains NO-GO at gates #5–#9; Stage 3 is not formally accepted; 0/135 mandatory requirements accepted.
- Never merge `main`, access real hosting/production/real DBs, configure a live delivery worker, send live messages, change customer sites, touch CELIKOM, or modify the independent Design Factory without explicit authorization.
- Read `PROJECT-STATUS.json`, `docs/NEXT-CHAT.md`, `docs/ROADMAP.md` and `stage3/docs/AI-DESIGN-COMPOSITION.md` before continuing.

## 6. Ready-to-paste first message

See [FIRST-MESSAGE-v1.66-2026-10-25.md](FIRST-MESSAGE-v1.66-2026-10-25.md).
