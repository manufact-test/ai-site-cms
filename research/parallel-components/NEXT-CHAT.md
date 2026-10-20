# AI Site CMS — handoff ONLY for parallel Editor & Components Research

**Date:** 20 October 2026. **THIS FILE IS ONLY FOR THIS INDEPENDENT RESEARCH WORKSTREAM** (`research/parallel-components/`). It does not replace or modify the canonical `docs/NEXT-CHAT.md`, project status, roadmap, main ADR or any other developer's handoff.

## Identity and operating rules

- Repository: `https://github.com/manufact-test/ai-site-cms`.
- Developer: third independent researcher, **Editor & Components Research**.
- Exclusive branch: `research/editor-component-patterns`. **No new branch needed**; always inspect its actual GitHub HEAD before writing. Base your future research PR on latest `main` without modifying `main` and without force-pushing over parallel changes.
- Exclusive writable prefix: `research/parallel-components/`. No writes to `cms/editor/`, PHP kernel, composer/npm lock, `.github/`, Hostinger, database, working sites, `research/parallel-security/` or CELIKOM. Read canonical documentation only; never amend its files from this chat.
- `main` integrator decides PR review/merge. Never auto-merge.
- Stage2 **NOT ACCEPTED**; Stage3 **NOT STARTED**, `0/135` mandatory features accepted on main `PROJECT-STATUS.json` as checked for this handoff. The Slim4 + Opis2.6 + Jedison1.27.1 stack was owner-approved; no Stage3 contract may be adopted here.
- User expects **large completed blocks** (3+ connected substantive deliverables), tests, then concise results. Do **not** refresh handoff documentation on ordinary “продолжаем”; this handoff was explicitly requested when moving to another chat.

## Historical work (research blocks 1–4)

- Upstream OSS audit, permissive-license shortlist, HTML/PHP-native FAQ/tabs/modal/navigation, JS/React alternatives and closed candidate Jedison schemas.
- Form backend: Origin/CSRF, server-side validation, honest configuration/transport outcomes, optional real-library phone adapter, fail-closed private cross-session rate gate, original AVIF/WebP responsive images.
- Single-server private HMAC receipt-attempt dedupe, candidate typed property permissions and optimistic revision lab, accessible keyboard/mobile checks.
- **PR #2: `https://github.com/manufact-test/ai-site-cms/pull/2` was CLOSED AND MERGED by the main integrator** before Block 5. Historic branch HEAD for block 4: `50b9186a9f1905f325b9c8271ef6e379b9d20007`. Do not assume this remains current or represent PR #2 as open.

## Latest completed work (Block 5)

- Two-stage **progressively enhanced contact form**, with all fields available without JS, step-focused keyboard/mobile UX, client/server error focus return, no fake delivery.
- Strict independent `SubmissionBoundary` form-urlencoded decoder before server handlers: duplicate/unknown keys, bracket pollution, invalid encodings/null rejected; full final server validation cannot be bypassed by forging a wizard flag.
- Fixed subtle `RevisionGate` multi-property no-op bug and revision overflow, tested atomic next-plan behavior (no persistence).
- Full detail and exact test commands in `TEST-EVIDENCE-BLOCK5-2026-10-20.md`; the local result is 22/22 PHP syntax, 263/263 PHP assertions (10 suites), 29/29 Python tests (isolated runs), JS syntax check. Actual Chromium DOM but mocked browser fetch; actual HTTP independently through Python/PHP. NO end-to-end delivery or production approval.
- **New PR #4**: https://github.com/manufact-test/ai-site-cms/pull/4, branch `research/editor-component-patterns`, first PR head `df69ab7056a0d610e2078558c8b38d0dcac54ae2` (check latest after this handoff change). PR was left OPEN for integrator, no merge. **CI caution:** Actions run 39489484536 showed SUCCESS but explicitly tested **old already-integrated main research subtree** (RevisionGate 33 assertions vs Block 5's 39; 20 PHP files vs Block 5's 22; Chromium 10 vs Block 5's 12). Do NOT claim PR #4 independently CI-green. Ask integrator to fix the shared workflow branch selection; never edit `.github/workflows/` from this workstream. Run `bash lab/tests/run-block5.sh` against the real checkout instead (locally confirmed exit 0 after browsers moved last). Check **actual PR number/HEAD/status** at start of next chat; do not assume an SHA from this file remains current.

## Next major technical candidates (work only in this folder)

1. Independently test genuine pinned `libphonenumber-for-php-lite` from a quarantined development environment **without** touching CMS composer lock; compare metadata behavior against browser input. Real dependency is NOT installed in current lab.
2. Multi-step form accessibility/degradation beyond Chromium: focus, automatic page errors, no-JS human HTML response option, browser/AT matrix; always preserve server-side validation and honest delivery.
3. Typed per-block **preview rendering** of typography/colors/spacing to complement schema proposals; escaping, safe asset refs and URL semantics; do not fix a final contract ahead of Stage3 or expose arbitrary CSS/HTML.
4. Investigate production gaps: private ledger cleanup/retention policy, distributed queue/outbox/receipt idempotency, proxy-aware IP identity, privacy/consent, legal/NOTICE review; no production claims before proof.

## To resume safely

Read THIS handoff plus `README.md`, `lab/README.md`, `COMPONENT-AUDIT.md`, `EDITOR-CONTRACT-PROPOSAL.md`, the latest block evidence, inspect GitHub current branch HEAD/current main/main integrator comments/PR and run local tests. Use only `research/parallel-components/`. Work independently in one sizeable block, test, save to own branch, open or update YOUR research PR; no merge. Do not touch canonical docs or other workstreams.
