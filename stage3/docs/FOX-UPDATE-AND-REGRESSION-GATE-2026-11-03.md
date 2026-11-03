# Stage3 — integrated regression gate and reversible FOX update plan (2026-11-03)

Status: **PREPARED, NOT EXECUTED**. Target: existing FOX installation, not a new install. Branch: `feature/stage3-ai-site-contract`; functional change `43bff313da208a36832d38b5741cf00bed33d926`, final verified SHA `8b296f5712fa3ed15d239fc7195b775d0cf6aa02`. [Full no-deploy CI #41715883449 — SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41715883449): genuine offline and hosted Chromium, Technology Runtime, MariaDB 10.11 and 11.8. [Chromium screenshot evidence #13270665578](https://github.com/manufact-test/ai-site-cms/actions/runs/41715883449/artifacts/13270665578), including mobile comparison columns and gallery selections. The prior `f8f2c54adfbe1c05b1a1a9a1b67578cc3dbc290a` artifact is superseded. **Nothing here authorizes a FOX action.**

## 0. Current dedicated FOX runtime-only ZIP — `8b296f5712fa3ed15d239fc7195b775d0cf6aa02`

Use only the [`ai-site-stage3-fox-code-update` artifact #13270565817](https://github.com/manufact-test/ai-site-cms/actions/runs/41715883449/artifacts/13270565817) from the exact successful run #41715883449. Its inner ZIP `ai-site-stage3-fox-code-8b296f5712fa3ed15d239fc7195b775d0cf6aa02.zip` unpacks into the **non-canonical** `fox-update-8b296f5712fa3ed15d239fc7195b775d0cf6aa02/` staging directory containing only `stage3/` and `cms-release.json`. Do not extract over the live `stage3/` before taking an independent protected code/database backup and obtaining explicit owner authorization. The separate sibling-layout installer includes `public_html/` and is **not** a code update for an installed FOX.

CI requires a byte-identical runtime inventory across both packages and rejects unexpected files, `public_html/`, altered code or manifest. New browser checks ensure scroll continuity for wide mobile comparison tables, Undo, and deliberate carousel scroll-away. GitHub's reported artifact SHA-256 is `sha256:c0ca078aa707bd7130a9d7a47185c8ffa0d56d7e4ca2e57d1384d21b1e50834b`; it expires 2026-11-10T20:51:54Z. Verify the actual downloaded ZIP and manifest independently before a future approved host operation. This ZIP is an unsigned integrity inventory — **not** backup, migration, installation authorization or automatic deployment.

## 1. Scope and release gates

FOX: `https://mediumpurple-fox-175549.hostingersite.com/studio`. Owner's November 3 live handoff confirms Stage3 was already installed, owner login succeeded, and FOX currently carries older Studio code. The MariaDB 11.8 database, private `.stage3-private/`, existing installation receipts and working owner account are **not** deployment targets.

Only replace the verified **Stage3 runtime code tree**, using the existing account-home sibling arrangement. Keep `public_html/index.php` and `public_html/.htaccess` untouched and read-only; do not use a Git auto-deployment rooted at `public_html`. No SQL migration, installer, `--plan`, `--apply`, Cron, SSH, password reset, data restore, production operation, Stage2 change or `main` merge.

Release can be considered only after:
1. Exact candidate SHA has a complete **4/4 successful** no-deploy CI (contract/browser, technology runtime, MariaDB 10.11 and 11.8). Check that the run's `head_sha` matches the candidate and inspect its genuine Chromium capture, including carousel card selection.
2. Generated `stage3/studio/bundle.js` passes `node stage3/studio/build.cjs --check` inside CI; tested PHP-hosted and offline Studio represent the same committed code.
3. The owner separately authorizes a **reversible FOX runtime update** after reviewing this plan and the current, older FOX state. Owner consent to the earlier installation must not be reused as consent to update.
4. The actual host's current web roots, sibling paths, active code, private files and DB identity are checked read-only before uploading. If anything differs from the verified host handoff, stop and reconcile.

## 2. Broad pre-release regression inventory

| User journey | Existing engineering coverage | Remaining manual gate |
| --- | --- | --- |
| Enter Studio, no-site and real-site states, page/block/element context | Offline + authenticated PHP Chromium; actual session/site requests | Verify FOX login and that only real persisted sites are shown |
| Long central page and responsive selection | Genuine Chromium at desktop/tablet/390 px; repeat item, FAQ, Graph and device-hidden repair | Owner freely scrolls and selects elements without reliance on side tree |
| Gallery / chosen media | New 6-card horizontal carousel selection regression; existing authenticated media-byte/thumbnail, responsive Graph media tests | Owner selects off-screen image, sees its thumbnail, replaces it in a disposable draft |
| Draft edits, Undo/Redo, save/reload/conflict | Studio browser, hosted browser and server HTTP E2E | Real FOX save and reload on owner-approved disposable data |
| Review, publish, release restore | PHP server E2E covers explicit release validation and version restore | Only an authorized throwaway site may be published/rolled back on FOX |
| Form fields and leads | Builder, multi-step, PHP validation/anti-spam, delivery failure and private inbox E2E | Isolated test destination only; no production email/Telegram |
| Page/site SEO, redirects, audit | Studio quality/SEO flows and PHP public release integrity tests | Read genuine rendered metadata, robots/sitemap and links after deliberate test publish |
| Backups, isolation, rights, engine recovery | Server E2E, MariaDB matrix and update smoke tests | Host-specific backup verification/diagnostics; no actual engine rollback rehearsal without consent |

Green automated checks prove engineering compatibility, **not** owner usability acceptance, actual Hostinger behavior or customer-site approval. The official 135-MUST owner acceptance remains 0/135 until explicitly recorded.

## 3. Owner-controlled update sequence (future, only after authorization)

**A. Identify and protect the running system**

- From hPanel File Manager and read-only Studio diagnostics, confirm the current working FOX URL, account-home paths and the actual `stage3/`, `public_html/` and `.stage3-private/` siblings. Confirm that Stage2's auto-deploy is attached to a **different website**; re-check FOX has no conflicting watched Git branch.
- Export an independent protected database backup and verify that the export is complete and restorable to a **separate disposable database**, without restoring over active FOX. Back up the exact active `stage3/` directory to a **new, timestamped, non-public** code snapshot. Retain the earlier `stage3-backup-2026-11-02/` independently; never overwrite it.
- Preserve a read-only baseline: owner login, current site IDs/revisions, published release versions, `/studio` response, existing diagnostics and a screenshot. Do not include credentials, CSRF cookies, private JSON or leads in public evidence.

**B. Stage and inspect the candidate**

- Obtain the artifact tied to the *exact green candidate SHA*, and validate artifact origin and package contents before handling the host. If the artifact includes a `public_html/` directory, **do not upload or extract that directory** into the running website. Extract/stage only the candidate `stage3/` runtime in a new private sibling staging directory.
- Verify `studio/app.js`, `studio/bundle.js`, PHP server files and entry points are present, that no private config, owner data or credential-bearing file is included, and that no schema migration or installer execution is requested. Compare candidate code hashes against the CI artifact before switch.
- Do not mix individual files from old/new Studio or overwrite the active tree piecemeal. Require a full coherent runtime tree and the same relative path that the existing public front controller expects.

**C. Short controlled switch and smoke**

- In an agreed quiet interval, rename the known active runtime to its fresh backup name and rename the complete staged runtime to the canonical `stage3/` sibling. Do not alter `public_html/` or `.stage3-private/`. Check file permissions and PHP cache behavior using existing host UI; do not add a public maintenance shell/installer.
- Check `/studio`, sign-in/out, real site list, read-only diagnostics, main canvas page/block/element selection and responsive modes. Then, **only on an expressly approved disposable site**, test FAQ reorder/Undo, horizontal gallery reveal, image binding, form editor, SEO field, draft Save/reload, Review and Publish/Restore. The old published client routes should remain unchanged until the deliberate test publish.
- Record exact version, redacted HTTP results, the UI screenshots and rollback feasibility. Ask Ilya for a personal hands-on UX session before any product/UI acceptance statement.

**D. Immediate rollback / stop conditions**

- If authentication, routing, permissions, private-path isolation, existing pages, CSS/JS, media, save/publish gates, diagnostics or DB compatibility fails, stop tests and restore the **untouched fresh runtime backup** to canonical `stage3/` using the same controlled File Manager rename. Recheck login, previously published routes and original revisions.
- The runtime-code rollback does **not** roll back a MariaDB mutation or visitor release. Never restore the active DB blindly; a DB restore requires a separate, explicitly authorized recovery decision. Keep failed candidate files and redacted logs for diagnosis.
- If a safe backup, correct code slot, validated artifact or owner authorization is missing, **NO-GO**. No partial overwrite and no emergency bypass through Cron, SSH or web-exposed PHP helpers.

## 4. Owner's practical acceptance after an approved FOX update

Starting at `Мои сайты`: select a genuine/disposable test site → choose page → scroll the whole page → click ordinary text, CTA, image and repeated FAQ/card → inspect only their contextual properties → switch PC/tablet/phone → use Undo/Redo → save a draft → reload → Review → authorized test Publish → verify the public result → restore the prior release. Separately open site resources, form settings, page SEO, account and owner-only platform tools. Record any confusing navigation or excessive controls **as concrete observed issues**, then fix them in the same Stage3 branch.

First client landing is **not** part of this release: it still requires original source, independent desktop/tablet/mobile static design approval, a sealed approved-v2 handoff and separate owner acceptance.
