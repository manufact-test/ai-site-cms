# MANUFACT AI Site CMS — lead integrator handoff v8.3

**31 October 2026 · feature/stage3-ai-site-contract · engineering continuation, not owner acceptance**

## Verified recovery point

The starter note named `14776a8aa743898d85653760963acf3b336de4e7`, but the real branch had already advanced twelve commits: latest pre-work SHA **`c4833e8a888b5e32b3903ff738ecd9645344db74`**, Actions run [41182005570](https://github.com/manufact-test/ai-site-cms/actions/runs/41182005570) successful. The intervening work includes adaptive form geometry, responsive authored tables, Excel/CSV/list editing, review-to-Workbench navigation, and visible PHP-review pins. Read the final HEAD again: **this note does not freeze the branch at that earlier SHA**. Previous handoffs v8.0–v8.2 remain historical.

## Functionality added in this continuation

The visual-review workflow can now save an **actual authored section and nearest valid Design Graph node** from one intentional click inside the private script-disabled PHP draft. It no longer relies solely on Y coordinate when the owner clicks **«Исправить в редакторе»**. The existing full-page Workbench receives the exact `nodeId` and current page/device; it is still the sole editor, using Undo, explicit Save and separate Publish.

The existing note edit panel can apply a freshly selected PHP point and retarget the same finding without changing its immutable page/device. The backend validates node ancestry against the saved first-party graph, checks optimistic note version + draft revision, carries still-valid targets across subsequent saved drafts, and keeps unresolved notes Y-only if their authored node disappears. The owner-only journal, export/import, history, and backup-v2 preserve target identities; historic archives lacking these optional properties remain readable. No change to visitor payloads, approved source images, public POST handlers, form secrets or production.

Follow-up: a bound remark's red marker, seek button, review-index jump and Workbench scroll now **remeasure the current PHP element** at the selected breakpoint; original note Y is kept untouched for audit evidence. Hidden/missing targets fall back to recorded Y. Native first-party gallery figure IDs and CSS-tab control IDs correctly identify their own image/tab children, including caption/label clicks, without adding public annotation attributes or scripts.

Files: `stage3/server/{VisualReview,Api}.php`, `stage3/studio/hosted.js`, `stage3/tests/{server-e2e,hosted-browser}.cjs`, `docs/ROADMAP.md`, `stage3/docs/APPROVED-SITE-PACKAGE.md`. The existing Studio first-party bundle does not embed `hosted.js` and remains byte-identical. Avoid adding a second editor or a public iframe script.

**Explicit migration only:** new DB setups include `target_section_id` and `target_node_id`. Existing dedicated DBs retain Y-only behavior until authorized `STAGE3_ALLOW_VISUAL_REVIEW_UPGRADE=YES php stage3/server/bin/upgrade-visual-review.php`. No automatic HTTP ALTER. Normal note operations still work without this migration. A real owner must approve any installation upgrade.

## Tests and release gates

- Contract smoke, JS syntax and bundle parity can be checked locally without production; PHP and Chromium HTTP/SQLite coverage must be verified by the two GitHub jobs on the **final exact SHA**.
- No merge of `main` or SEO specialist's `feature/site-seo-engine`, no Hostinger deployment or real-client data.
- Official ledger is still **135 MUST: 124 engineering candidates + 5 partial + 6 external owner/environment gates; ownerAccepted=0/135**. This feature does not alter those counts.
- External **real client-approved v2 package, three screen references and owner visual sign-off** are still absent. Do not fabricate acceptance or assert 1:1 visual match from green CI.

## Next substantial product priority

Use the same saved exact node target to simplify the actual owner-first visual correction cycle and finish the first real approved client site when its original three images/spec are authorized. If no such package is available, prioritize another complete existing manifest-bound authoring→PHP-preview→Save→Publish→Rollback path from `docs/MASTER-TZ.md`, not generic template generation or test-only infrastructure. Keep technical checks minimal but do not weaken PHP security, state/backup integrity or final two-job CI.

**Execution rhythm:** one user-approved autonomous pass is at least ~30 minutes of genuine feature work; if a block finishes sooner, continue a connected useful feature. Report actual files/functions, final commit + exact CI, missing human gates. Do not equate accumulated technical candidates with owner acceptance.
