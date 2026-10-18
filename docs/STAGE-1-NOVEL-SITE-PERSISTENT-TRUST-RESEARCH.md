# AI Site CMS — Stage 1: novel-site obligation discovery & persistent PHP extension trust (v1.25)

**Date:** 18 October 2026. **Research branch only:** `research/stage1-editor-comparison` HEAD **557dee05b31d283fe838315c7f065b94193803b1**. **All four CI jobs PASS:** [GitHub Actions #39117432469](https://github.com/manufact-test/ai-site-cms/actions/runs/39117432469) (comparison, regeneration, durability, mixed-site-trust). Previous v1.24 checks stayed green. **Stage 1 still not accepted; no stack selected.**

## A. Uninstrumented unfamiliar source versus manifest and independently declared reviewer oracle

Research code: `research/stage1/fixtures/cedar-lab-standalone.html` and `research/stage1/novel-source-contract-audit.cjs`.

- A completely new **researcher-authored** full HTML page, distinct from previous Tide Atlas and typed components, has responsive CSS/grid/gradients/variables/keyframes/reduced-motion, images/picture/srcset/video/SVG, FAQ, navigation, dialog, network form, inline behavior JS, SEO metadata/canonical.
- Structural analysis of real source using pinned **parse5 8.0.0**: **46** inventory obligations, manifest has only **12** entries; **34** source fields missing from that manifest, **18** extracted unsupported capability types; external manually specified oracle finds **8** missing important declarations, and **1** visible text leaf lacks stable ID.
- **12 source/manifest adversarial cases detected**: duplicate stable ID, inline event attribute, JavaScript URL, absent image alt, missing lang/HTML closure, renamed ID, two *correlated* source+manifest feature removals caught by unchanged separate reviewer oracle, duplicate manifest entry, wrong field type, orphan entry.
- Repairing the manifest to cover all detectable source obligations is **NOT** sufficient for publication: unknown executable JS/forms/SVG and unreviewed media/CSS behavior remain unsupported and must fail closed; no source JS was executed.
- **Epistemic limits:** the same assistant prepared this fixture and manual reviewer oracle — **NOT** independent other-model generation or truly blinded artifact evaluation. CSS/JS feature discovery is regex/structural heuristic, not complete semantics or computed CSS validation. A feature missing from source, manifest **and** oracle cannot be recovered automatically. This is a *negative-capability detector*, NOT proof of 100% editable AI-site designs. No arbitrary site import.
- To satisfy the actual independent-generation gate later, freeze site contract and hidden grader before procuring **external second-model output** (source plus model-produced manifest/intents from a previously unseen brief), compare source/manifest against independent evaluator, measure recall/false positives, unsupported types, and error remediation across multiple sites. **Do not claim gate complete until this occurs.**

## B. Persistent signed PHP capability-pack trust under process restarts

Research code: `research/stage1/persistent-capability-trust.php` and `persistent-capability-trust-test.cjs`. Isolated local GitHub runner PHP 8.3 CLI and Node 22, no production service.

- **74 checked assertions**, **20 denied operations/scenarios**, **36 independent PHP CLI process invocations**. Test-only Ed25519 publisher public key and HMAC secret are provided by controlled ephemeral environment, **not** persisted inside writable state.
- PHP sodium verifies original signed bytes, then independently checks the static reviewed capability field/target/typed operation allowlist. Signed but unreviewed DOM/JS/CSS and alleged permission extensions remain denied. Owner values are validated against the installed field set. Repeated installs across process boundaries preserve **2 owner overrides**.
- Exclusive `flock` ensures **one winner of four simultaneous identical version installations**. Replay/downgrade and unsigned/impostor updates fail; revoked publisher remains revoked across fresh CLI reads; missing edited owner capability blocks version upgrade.
- Separate HMAC-checked `state.json` and `anchor.json` catch a **partial local rollback** or corrupted state; failure injected after one atomic rename causes a fail-closed mismatch rather than silent success. **Important discovered limitation:** restoring *both* HMAC-valid files to an older generation **does bypass** the local revocation/monotonic version marker. HMAC authenticates content, **not historical freshness**. Requires genuinely independent anti-rollback anchor / secure external record before any production trust decision.
- Other limits: CLI-only simulated admin flag is NOT authentication; no fsync/power-loss or network-filesystem durability, offsite backup, real key provisioning/rotation, browser plugin execution sandbox, permissioned approvals, multi-host transaction, Hostinger validation or production plug-in environment. The file-store is not a production security architecture.

## Verification and boundaries

**Full workflow [#39117432469](https://github.com/manufact-test/ai-site-cms/actions/runs/39117432469) is completed/success for 4/4 jobs.** Prior browser native Jedison/RJSF, media, typed rendering, regeneration and PHP durable CLI suites passed unchanged. New code was committed **only** to research branch, not main. Official main contains this report and status/handoff documentation only.

**No architecture or final editor selected.** A/B/C candidates remain open. The audit reinforces the necessity for a separate independently reviewed coverage oracle and secure versioned capability registration; the persistence trial shows why file-local anchors cannot secure malicious full-volume rollback. No production code CMS, live websites, Hostinger or CELIKOM modified.

**Unchanged project policy:** 18 stages 0–17; stage 0 accepted, stage 1 in progress **NOT accepted**, stage 2 not started. 193 requests = **135 mandatory + 42 desirable + 16 unwanted**. Evidence classification remains **43 limited research/document indications, 92 lacking directly matched target proof; PRODUCT 0/135 mandatory accepted**. Full release only after 135/135; no MVP. Independent CELIKOM pilot only stage 17 *after* complete release.
