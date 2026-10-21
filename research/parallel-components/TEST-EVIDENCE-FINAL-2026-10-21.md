# Editor & Components Research — FINAL evidence, blocks 1–17

**21 October 2026. Standalone R&D, not product acceptance.**

## Exact verified code checkpoint

- Commit SHA: `5330c148ff4a14ebb74b53457cd2b91cfeff574b`.
- Branch: `research/editor-component-patterns`, PR https://github.com/manufact-test/ai-site-cms/pull/4, OPEN/unmerged when last inspected before this documentation handoff.
- Exact-source GitHub Actions: https://github.com/manufact-test/ai-site-cms/actions/runs/39574269556 — **SUCCESS**.
- Scope/HEAD verification: **SUCCESS**; all changed paths live under `research/parallel-components/`.
- Components actual PHP/HTTP/browser/schema job: **SUCCESS**; unrelated Security job deliberately **SKIPPED** by its scope guard, not a security audit.
- Counted from actual job log: **37** PHP syntax checks, **598** PHP assertions in **17** scripts, **69** Python unittest cases (including **42** real Chromium). The genuine temporary Composer `libphonenumber-for-php-lite:9.0.41` and `symfony/polyfill-mbstring:1.38.2` integration **PASS**.
- Historical runs, e.g. Block 11 https://github.com/manufact-test/ai-site-cms/actions/runs/39509827314 (388 assertions /56 Python), Block 15 https://github.com/manufact-test/ai-site-cms/actions/runs/39569441636 (452/69), Block 16 https://github.com/manufact-test/ai-site-cms/actions/runs/39571717995 (563/69) are **older** exact SHAs; never treat them as current HEAD evidence.
- The document-only handoff commit that contains this evidence is **newer than this tested code commit**. Run the PR workflow on the final documentation HEAD as an additional source/scope check; no production code changes occur in the documentation commit.

## Block 17 final review

- Hardened `CapabilityGate` to reject malformed registry/rules and unsafe numeric/enum metadata without type exceptions.
- `RevisionGate` rejects malformed candidate patches early; `PreviewLab` independently refuses valid-but-overly-wide values, including CSS pixels and inherited data unsafe for HTML/CSS.
- Changed `CapabilityGate.php` and 3 PHP regression scripts (capability, revision, preview).
- Test counts after Block 17: `CapabilityGate` **45**, `RevisionGate` **51**, `PreviewLab` **43** assertions; total **598**.
- There were intermediate non-green CI attempts while developing new tests; final exact code SHA run above is fully GREEN. No weakening/removal of safety checks to get green.

## Scope and observation details

- Actual browser DOM, keyboard, 320px and no-JS checks use Chromium in the CI. The isolated browser cannot talk directly to 127.0.0.1; where PHP POST must be exercised, a Python Playwright/HTTP bridge invokes real PHP sessions on the local server. This is **not** a proof of browser-native TCP, real mail delivery or production deployed behaviour.
- PHP checks include real 12-worker races for throttle and HMAC receipt claim, fail-closed storage/corrupt JSON, cleanup lock contention, privacy mode, IP canonicalization and duplicate traffic.
- Upstream phone metadata was installed in a disposable CI Composer setup, not production lock. No third-party libraries copied into the research source tree.
- No target CMS, Hostinger, external SMTP, sensitive credentials, client site, other PR or workflow edited.
- This research is **not** a complete finished AI editor, authoritative final Stage3 protocol, host deployment, real email/outbox, SSR hydration, multi-browser/assistive-technology certification, legal notices approval or Stage2 acceptance.
- Main's status may advance independently; check its own latest canonical docs before making product claims.

## Starting points

- [Main integrator handoff](MAIN-INTEGRATOR-HANDOFF-2026-10-21.md): sorted proposal vs. production blockers, exact links, integration triage.
- [NEXT-CHAT.md](NEXT-CHAT.md): research stream handoff and GitHub boundaries.
- [COMPONENT-AUDIT.md](COMPONENT-AUDIT.md): native and upstream OSS assessment.
- [EDITOR-CONTRACT-PROPOSAL.md](EDITOR-CONTRACT-PROPOSAL.md): candidate typed block properties and open contract decisions.
- [lab/README.md](lab/README.md): reproduction commands and lab limitations.

**Decision:** completed research deliverable, **not** auto-merge and not a final Stage3 acceptance. Future integration rests with primary maintainer.
