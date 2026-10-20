# Exact 43/43 OSV snapshot: reproducible research gate

## New standalone tools
- `osv-strict-snapshot.mjs`: opt-in HTTPS POST to `https://api.osv.dev/v1/querybatch` using the exact locked versions for 14 PHP (OSV `Packagist`) and 29 npm (`npm`), including 26 optional platform binaries.
- `osv-strict-regression.mjs`: **30 offline synthetic response/transport/lock tests**, including adversarial/incomplete response length, unexpected extra responses, null/invalid vulnerability body, pagination token, duplicate advisories and malicious IDs.
- `run-security-suite.mjs`: offline regression is included by default. An **explicit** `--online` chooses `online:OSV-strict43` and treats any advisory result as a failed safety gate until human triage.

### Exact commands
```sh
node --check research/parallel-security/osv-strict-snapshot.mjs
node research/parallel-security/osv-strict-regression.mjs
node research/parallel-security/lock-provenance.mjs

# Only on an approved internet-connected isolated runner:
node research/parallel-security/osv-strict-snapshot.mjs > /safe/location/osv-exact-43.json
node research/parallel-security/osv-strict-snapshot.mjs --fail-on-advisory
node research/parallel-security/run-security-suite.mjs --online
```

- Exit **0** from the standalone snapshot: exactly 43 **complete OSV database query responses at this timestamp** (not proof of "no vulnerabilities" unless verified `packagesWithAdvisories===0`; not human security approval even then).
- Exit **4** in `--fail-on-advisory` mode: at least one exact-lock package matched an OSV advisory; needs triage, not automatic dependency upgrade.
- Exit **1**: HTTP/TLS/timeout/invalid JSON/stream length/coverage mismatch/unconsumed pagination/duplicate or malformed advisory; **never** report completed 43/43.
- No origin- or license-approval conclusion from OSV; independent tarball/source and qualified legal reviews remain separate.
- The HTTPS response is streaming-bounded at **4 MiB**, capped at 60s, and timestamps/hashes both original lockfiles. Full advisory IDs remain in the JSON stdout for auditable triage.

## Current evidence limits
**This follow-up has NOT run the live internet OSV 43/43 querybatch**. The offline regression fixture is authored but requires an independent Node execution on the exact new PR HEAD; exact-head CI now proves the offline fixtures execute, but this is not a live 43/43 scan. Do not infer `43/43 clean`.

The historical [ADVISORY-TRIAGE-2026-10-20.md](ADVISORY-TRIAGE-2026-10-20.md) in the merged research snapshot remains point-in-time **partial** advisory triage and cannot substitute for exact full live OSV output.


## Final research checkpoint — 21 Oct 2026: transcript evidence and advisory-safe review

The previously noted stale-checkout CI defect **was corrected by the integration owner**. Exact-head Security CI [run #39509439870](https://github.com/manufact-test/ai-site-cms/actions/runs/39509439870), candidate `635597bdbf474fc2b09cce37cd371b6667c7930a`, reports **46 suite PASS, 0 FAIL, 2 crypto BLOCKED**. Explicit proof lines: **30 OSV response and lock tests**, **23 OSV CLI/TOCTOU tests**, **54 independent saved-report and registry evidence tests**, **12 synthetic exit-policy tests**. These do not constitute outbound OSV execution.

The strict query now binds every requested version to a read-once lockfile snapshot, SHA-256, and original inode, and revalidates lockfiles before writing a success report. Missing/extra rows, unread `next_page_token` even when empty, malformed advisory IDs and stream/HTTP failures fail closed. Unlike relying on exit code alone, `online-evidence-proof.mjs` independently verifies reported identities and lock SHA against original files, timestamp window, exact trusted endpoint and advisory summary.

**New:** `osv-advisory-triage.mjs` safely revalidates a **saved full raw OSV JSON document**, reports original evidence SHA-256 and exact finding IDs, refuses mismatched pins, and returns exit `4` for valid advisory-positive evidence rather than dropping the findings. `--historical` permits old saved evidence but never treats it as current; it still requires original lock bytes to match current lock versions. Save raw complete JSON and the derived triage JSON outside the repo in protected storage; do not write generated artifacts to the production tree.

```sh
# Actual network call requires trusted authorized isolated runner:
node research/parallel-security/osv-strict-snapshot.mjs > /safe/private/osv-exact-43.json
# Offline check of that exact 43-row transcript; exit 4 means human triage:
node research/parallel-security/osv-advisory-triage.mjs /safe/private/osv-exact-43.json \
  > /safe/private/osv-triage.json
```

**Not observed:** any live outbound `api.osv.dev/v1/querybatch` response proving full real 43/43. No advisory clearance, legal conclusion or Stage2 readiness can be inferred until the authorized networked CI run and independent human review.
