# Authenticated *observed* main CI Sodium-free runtime evidence — archive review

**Research-only evidence source**: integration owner's [main GitHub Actions run #39571456888, job 119126388264](https://github.com/manufact-test/ai-site-cms/actions/runs/39571456888/job/119126388264), on exact commit `59c5289b74cf85859711d9a248af8efe0762cd10`. This real external CI passed at 21 October 2026 08:46 UTC (per Actions logs), under the `stage2-core-bootstrap.yml` workflow. Research obtained the actual job logs through the GitHub connector, extracted **its original completed JSON stdout without changing field values**, and committed the excerpt to `fixtures/archived-main-real-no-sodium-ci.json` with explicit upstream provenance and source blob SHA identifiers.

The upstream job compiled **PHP 8.3.6 64-bit CLI physically without ext-sodium** (`--without-sodium`) in a disposable runner. It used Composer `--no-plugins --no-scripts` to install only `paragonie/sodium_compat@v2.5.2` with pinned commit `3246b36803c177847e677862fedeb7f937869adb`; exercised RFC 8032, genuine independently signed envelopes, and original CMS signed permit/receipt/settlement parity (**33** reported checks) and original trust-root epoch/dual-signature rotation parity (**55** reported checks). Original JSON says same signed bytes/head, true native-free PHP, native+polyfill backend parity and refused ambiguous journals. Local measured compat Ed25519 verify mean **41.918 ms** over eight verifications. Original CI says this is *local only*, not Hostinger.

**Security scope correction:** genuine physical no-native PHP *was executed in main's CI* and passed. Our **independent Security research PR CI has not reexecuted it** and our stronger requirement of an independently retained, fully vetted whole-source-tree SHA-256 and separate runtime/source pre/post attestation **is not established by that job's Composer package metadata check**. This is therefore usable *external integration-owner CI evidence*, not an independent cryptographic audit, publication approval, legally authorized redistribution or server-SAPI acceptance. No claim of target Hostinger CPU/performance, key custody, accepted Stage2 or production security.

`archived-main-sodium-proof.mjs` verifies the committed archive's **fixed Git blob identity** (`1b95e040aead41a30cb01fd814aff009a0b41f22`), exact originating run/job/main commit/workflow and source blob IDs, complete signed-chain/rotation evidence shape and critical fail-closed booleans. `archived-main-sodium-regression.mjs` mutates the archived JSON in memory across 39 positive/negative cases, ensuring no-Sodium, signed histories, downstream policy and no-approval flags cannot be replaced unnoticed. This is archival provenance and report consistency verification; it does not independently authenticate a fresh HTTPS Actions API response within the research CI and cannot convert operator-maintained text into GitHub's signed attestation.

Execute read-only from a full checkout:

```sh
node research/parallel-security/archived-main-sodium-proof.mjs
node research/parallel-security/archived-main-sodium-regression.mjs
```

**Unchanged blockers:** (a) independently vetted upstream 2.5.2 full tree and repeated real native-free test in independent security runner, (b) live target PHP web-SAPI and latency review, (c) stale PR base causing current-main source/full class-path suite rows to remain BLOCKED, (d) actual current full 43-pin online OSV/independent license review. Neither release permission nor security/Stage2 acceptance is implied by a passing archival parser.
