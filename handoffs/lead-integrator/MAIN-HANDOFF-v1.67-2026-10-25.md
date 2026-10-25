# AI Site CMS — MAIN HANDOFF v1.67 / 2026-10-25

## 0. Canonical checkpoint and exact evidence

- Repository: [manufact-test/ai-site-cms](https://github.com/manufact-test/ai-site-cms); sole lead branch: `feature/stage3-ai-site-contract`.
- **Last fully verified functional source:** [`0eeff2e9cd77b29e3426c52393b03e583a5e672a`](https://github.com/manufact-test/ai-site-cms/commit/0eeff2e9cd77b29e3426c52393b03e583a5e672a). [Full Stage3 CI #40233695097 — SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40233695097) for this exact SHA.
- Earlier verified SEO/media functional block: `6123e4774596d0e28c53b48ab5eb0c4c04fb47cc`, [full CI #40225894128 SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40225894128).
- **Concurrency warning:** a different working conversation subsequently committed [`8db3d32e1ed7f087445c507c76c13e8165ebe8c3`](https://github.com/manufact-test/ai-site-cms/commit/8db3d32e1ed7f087445c507c76c13e8165ebe8c3) to the same branch. [CI #40233889710 FAILED](https://github.com/manufact-test/ai-site-cms/actions/runs/40233889710) in hosted-browser notification acknowledgement (button `#server-notifications-seen` remained disabled). This is newer than our last verified source and MUST NOT be presented as passing. Recheck fresh branch HEAD and newest exact CI before any further write. Do not force-push or clobber concurrent work.
- This handoff is documentation-only relative to functional source `0eeff2e9cd77b29e3426c52393b03e583a5e672a`. Its own commit SHA and CI (if any) are separate.
- Formal reality: Stage0/1 accepted; **Stage2 NO-GO gates #5–#9**, Stage3 isolated and **NOT accepted**, **0/135** mandatory requirements formally accepted. Stage2 technical estimate ≈85–90% applies to that preparation only; no global CMS completion percentage.
- Full first official release still needs 135/135 required requirements, not an early MVP.

## 1. Functional block delivered in this conversation

**A. Earlier verified block [`6123e477`](https://github.com/manufact-test/ai-site-cms/commit/6123e4774596d0e28c53b48ab5eb0c4c04fb47cc):**
Live search snippet preview and social/Open Graph preview within current-page SEO settings, title/description length and index/noindex indication, private image preview from hosted media; PHP published Twitter/Open Graph fallback searches nested Design Graph image nodes when classic component images are absent. The existing publisher still requires explicit Save then Publish. The offline generated bundle stays byte-compatible with source.

**B. Current [`0eeff2e9cd77`](https://github.com/manufact-test/ai-site-cms/commit/0eeff2e9cd77b29e3426c52393b03e583a5e672a), [CI SUCCESS #40233695097](https://github.com/manufact-test/ai-site-cms/actions/runs/40233695097):**
- Site-wide SEO/accessibility quality list routes a graph-level finding to its exact page, section, node, instead of selecting a generic first node.
- Graph inspector shows source warning and its live current/resolved status as the user changes typed graph fields (including the `empty-heading` vs graph `empty-text` diagnostic mapping).
- Applying the graph makes a single validated CMS draft change, automatically re-opens the updated site quality report, and preserves outer Undo/Redo. Closing without Apply leaves site unchanged.
- Real Chromium path verifies missing graph heading → audit button → focused selected node → edit → issue resolved → Apply → clean quality report → Undo/Redo. Earlier CI already covered PHP/SQLite published graph and media output; this change does not bypass any validation.
- Source-only changes within `stage3/studio/app.js`, `bundle.js`, `studio.css`, `tests/studio-browser.cjs`; no schema changes or live deployment.

**Limit:** advisory quality findings cannot prove WCAG conformance, are not auto-fixed, and cannot guarantee pixel-perfect Design Factory D7 conversion. Existing owner-facing style remains provisional, not final UX.

## 2. Newer unverified parallel inbox block

Another lead chat wrote `1214e05fd7a26a070caef490ab8303f668c7307d` and a follow-up `8db3d32e1ed7f087445c507c76c13e8165ebe8c3`: searchable private lead inbox, CSV export, atomic bulk review and owner interface. Their current failed CI is https://github.com/manufact-test/ai-site-cms/actions/runs/40233889710, with the hosted notifications acknowledgement button disabled after adding inbox controls. **Do not label this feature verified until a later exact SHA reaches full SUCCESS.** The next lead should inspect `stage3/studio/hosted.js` and corresponding hosted test status, repair one real regression or wait for the originating chat's coordinated fix, and rerun only the existing CI. Other concurrent writers on the leader branch are a collision risk; avoid overlapping commits and check HEAD/lease.

## 3. Next large block — after branch verification

Take one complete user-facing CMS capability group: creation/editing/review of page components and forms/media with consistent draft preview and published/static HTML, or closing next prioritized missing contract feature. Prioritize coherent user outcomes and maintain the security/revision boundaries; do not spend a whole turn on microscopic fixes or speculative test matrices. If the independent Design Factory delivers an actual final D7 package, first inspect real schema and produce a supported/converted/missing-property matrix, THEN design adapter. Current synthetic `manufact-design-factory-lead-graph-candidate-v1` does **not** prove D7 compatibility.

## 4. Non-negotiable working rules

- Work only within authorized `feature/stage3-ai-site-contract` branch; use force-with-lease/expected SHA only if needed; inspect latest HEAD first. The independent worker writes to `feature/stage3-design-factory` / `stage3/design-factory/**`; do not modify its files/branch or claim its D7 deliverable arrived.
- No merge to `main`, no PR #3/#4 merge, no real Hostinger/SSH/MySQL/production, domains/clients/CELIKOM, external notifications/cron or secrets without owner approval.
- Rapid product-first program: each “продолжаем” = one substantial end-to-end block of 3–6 coherent features, minimal necessary tests, existing full CI. Document refresh only on explicit owner request (as in this handoff). CI success is technical, not product acceptance.
- Before coding, read `PROJECT-STATUS.json`, `docs/NEXT-CHAT.md`, `docs/ROADMAP.md`, `stage3/docs/AI-DESIGN-COMPOSITION.md`; also inspect current repository HEAD and exact latest GitHub Actions run.
- Retain immutable published snapshots, owner/site auth boundaries, safe static export, explicit Save/Publish, Undo/Redo, scoped media, deny-by-default validation.

## 5. Ready-to-paste next message

[First message v1.67](FIRST-MESSAGE-v1.67-2026-10-25.md).
