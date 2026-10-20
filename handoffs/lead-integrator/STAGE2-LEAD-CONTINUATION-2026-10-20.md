# AI Site CMS — lead integrator handoff, 20 October 2026

> This file belongs ONLY to the lead developer / integrator chat and its same-role successor. It is NOT a project-wide status, roadmap, ADR, research brief, canonical NEXT-CHAT or Stage2 acceptance. Do not overwrite other workstreams' documents when updating this lead-only record.

## Exact checkpoint (source code, BEFORE this handoff-only docs commit)

Repository: https://github.com/manufact-test/ai-site-cms

- Last fully CI-tested **source main**: 2a5fd01b8179a22ef5afd864b3716101aeaae985
- PHP, core, MySQL8.4: **7/7 SUCCESS** https://github.com/manufact-test/ai-site-cms/actions/runs/39488660720
- Editor, browser, signed LAB releases, Nginx/Apache HTTP, crash recovery, package: **1/1 SUCCESS** https://github.com/manufact-test/ai-site-cms/actions/runs/39488660507
- Parallel research independently verified: https://github.com/manufact-test/ai-site-cms/actions/runs/39486899853
- Offweb publisher SUCCESS, including upload/download/bytewise roundtrip: https://github.com/manufact-test/ai-site-cms/actions/runs/39488978613
- Offweb Git branch stage2-hostinger-offweb-runtime head: 20f4160957ad501836aa66afa7f7982b0fdf98d6
- Archive: 477 exact files; GitHub artifact #12295340444: https://github.com/manufact-test/ai-site-cms/actions/runs/39488978613/artifacts/12295340444 ; expires 2026-10-27 20:05:31 UTC.
- Independent nonsecret roundtrip evidence: GitHub artifact #12295125967 https://github.com/manufact-test/ai-site-cms/actions/runs/39488978613/artifacts/12295125967
- **Unsigned package MANIFEST SHA256** e45529f968c1a19e7b757eab67dcbe440e69aa8d7ff04acff1f47a75278b2b6a
- **GitHub artifact ZIP SHA256** cebe07c49e84ab373c820206de3369b8e0cf8e03bf424e38d9298b9ec42569f1
- The manifest hash, ZIP hash and unsigned publisher evidence are distinct and do NOT constitute trusted cryptographic release signature.
- This handoff-only Markdown will create a docs-only newer main SHA. The verified exact source SHA ABOVE is unchanged for code. Check branch HEAD before any future GitHub mutation.

## Exact last work block — lead-owned only

1. New cms/tools/test-stage2-upload-roundtrip.py validates the downloaded GitHub Actions artifact's ALL 477 files byte-for-byte against the pre-publish staging directory. It verifies hidden public/.htaccess, three offweb-only Hostinger PHP CLI scripts, excludes research/parallel-security, research/parallel-components and operator state. JSON evidence explicitly says hostingTouched=false, databaseTouched=false, stage2Accepted=false, publisherSignatureVerified=false.
2. New cms/tools/test-stage2-upload-roundtrip-fixtures.py exercises nine hostile cases: tampered CLI, missing .htaccess, research subtree injection, operator secret injection, altered manifest, symlink alias, comparing a folder to itself, and successful recovery.
3. .github/workflows/stage2-hostinger-private-stage.yml now stages → checks → UPLOADS → DOWNLOADS exact real artifact → checks all recovered bytes/negative fixtures → publishes nonsecret evidence artifact → ONLY THEN publishes isolated offweb Git branch. A stale non-current main SHA must refuse publication; never deploy to Hostinger.
4. .github/workflows/stage2-core-bootstrap.yml and .github/workflows/stage2-static-editor.yml cross-trigger full PHP/MySQL and Editor/E2E checks when release-critical CI or offweb workflow changes. Final source SHA 2a5fd.. passed both matrices.
5. 11 older hostile ZIP staging checks still pass, plus nine newly added upload/download hostile checks. All 477 recovered files match. Package contains NO parallel research, local DB credentials, or Hostinger webroot secrets.

## Work and boundaries inherited from prior lead chats

- The lead developer alone owns main, product PHP kernel, Jedison editor, release/deployment, operator safety, full CI and research PR review/integration. Work in LARGE multi-subsystem blocks, not microtests or one small task per stop. Prioritize real Stage2 completion, not only test counts.
- Both independent research PRs were independently tested, scope reviewed and SQUASH-MERGED into main:
  - Security #1 https://github.com/manufact-test/ai-site-cms/pull/1 — only research/parallel-security. 22 PASS, 0 FAIL, 2 genuinely BLOCKED (actual PHP with no native Sodium and true compat). No production approval.
  - Editor & Components #2 https://github.com/manufact-test/ai-site-cms/pull/2 — only research/parallel-components. Real PHP 8.3, Chromium, localhost HTTP, media, concurrency and schema tests passed. Lab forms/media/phone/revision proposals NOT connected to CMS, NOT Stage3.
- Never promote research or unreviewed third-party code into production by accident. The 477-file CMS package has zero research files.
- Hostinger scripts are privately bundled outside public_html: bin/hostinger-stage2-preflight.php (CLI-only code/credential-free, read-only), bin/hostinger-stage2-once.php (strict one-time manifest-pinned CMS dedicated-DB probe/install-empty/verify/foundation snapshot metadata), bin/hostinger-stage2-revoke.php (emergency local SECRET-TASK FILE revocation only, no DB rollback). 78 actual disposable MySQL 8.4 assertions passed in last completed full CI.
- Previous source lied about true native Sodium absence in forced sodium_compat lab; corrected by lead in main. Native-ext absence on target Hostinger, audited exact library, real secure fallback and professional legal signoff are still outstanding. No production signed release.
- Previous approved TEST CMS domain: lightseagreen-woodpecker-264491.hostingersite.com. Independent protected visitor domain: mediumpurple-fox-175549.hostingersite.com. Earlier 473-file offweb folder was manually placed by owner. There is NO EVIDENCE that current 477-file archive was actually uploaded, deployed or executed on target Hostinger. The last confirmed real target LiteSpeed test was read-only Slim kernel health; PUBLIC /api/health remains intentionally 503 until installation.
- GitHub environment stage2-hostinger-lab has four database SECRET names. That does not provision them to Hostinger runtime. Shared SSH is forbidden. Never read or change unrelated websites, accounts, databases, visitor public files or production environment.
- Hostinger PHP Cron hPanel single-use task config lives in private cms-stage2-local sibling (not public_html, not the package); never copy secrets into GitHub, HTTP, cron arguments, screenshots or chats. Preflight fingerprint is unsigned and must be compared via independent trusted channel before any DB step.
- Stage2 founder snapshot is EMPTY FOUNDATION METADATA only; NOT a complete pages/media/revisions backup or actual production disaster recovery. Stage2 MUST NOT be marked accepted on the basis of CI alone.
- Stage0 and Stage1 accepted in existing project baseline; Stage2 NOT ACCEPTED; Stage3 NOT STARTED; 0/135 mandatory product features accepted.

## Open exit gates / next meaningful large block

1. Prove actual new offweb 477-file package presence on approved Hostinger CMS site, root identity and restricted sibling private permissions (without using shared SSH or writing visitor/public_html). Operator may need one precise hPanel File Manager task; do not invent real host success.
2. Reconcile true target Hostinger PHP 8.3 LiteSpeed/Sodium environment, verify independent site-binding, dedicated database GRANT scope, and run **read-only** approved MySQL probe before any DDL. Strong stop-and-review on mismatches.
3. Only after explicit owner authorization perform scoped EMPTY test CMS schema install, independent visitor availability checks during CMS-only outage, verify/metadata snapshot and non-destructive recovery. Real backup+restore for actual pages/media remains unproven.
4. Complete 43/43 exact-version vulnerability review, independent licensing and proper signed-release trust and supported crypto runtime before Stage2 owner acceptance. Never start Stage3 without explicit Stage2 signoff.

## Communication / successor instructions

- Continue in Russian as identical-role lead/integrator; prefer 3+ linked substantive deliverables before stopping.
- Start each work block by checking actual main HEAD, latest CI, PRs and this lead-only handoff. Do not ask repetitive owner micro-questions.
- Respect owner restriction: DO NOT modify docs/NEXT-CHAT.md, PROJECT-STATUS.json, docs/ROADMAP.md, ADRs or parallel research documents for a lead-chat handoff. Update only this handoff location at owner-requested next transfer.
- This file does NOT amend, replace, or contradict those canonical project documents. Project Stage2 acceptance is still open and must remain honest.
