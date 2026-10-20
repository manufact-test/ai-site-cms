# Exact 43/43 OSV snapshot: reproducible research gate

## New standalone tools
- `osv-strict-snapshot.mjs`: opt-in HTTPS POST to `https://api.osv.dev/v1/querybatch` using the exact locked versions for 14 PHP (OSV `Packagist`) and 29 npm (`npm`), including 26 optional platform binaries.
- `osv-strict-regression.mjs`: ten **offline synthetic schema tests**, including adversarial/incomplete response length, unexpected extra responses, null/invalid vulnerability body, pagination token, duplicate advisories and malicious IDs.
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
**This follow-up has NOT run the live internet OSV 43/43 querybatch**. The offline regression fixture is authored but requires an independent Node execution on the exact new PR HEAD; a green check from the main workflow may be stale because it tests the previous accepted security snapshot. Do not infer `43/43 clean`.

The historical [ADVISORY-TRIAGE-2026-10-20.md](ADVISORY-TRIAGE-2026-10-20.md) in the merged research snapshot remains point-in-time **partial** advisory triage and cannot substitute for exact full live OSV output.
