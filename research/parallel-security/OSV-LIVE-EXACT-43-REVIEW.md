# Point-in-time **actual** OSV HTTPS inventory crosscheck

The existing 43-pin OSV tools had extensive **synthetic negative** regression tests but the independent Security PR's normal CI ran them *offline only*. The new read-only `osv-live-independent-proof.mjs` uses an actual public HTTPS querybatch to `api.osv.dev`, while retaining the strict upstream `osv-strict-snapshot.mjs` transport and `online-evidence-proof.mjs` response contracts.

Before requesting OSV, it confirms the exact retained real Composer (14 packages) and npm (29) lockfile SHA-256s, then launches an actual HTTPS query of all 43 *pinned versions*. It refuses partial responses, unread pagination, duplicate/bad advisories, untrusted additional results, missing or altered lock files and stale timestamps. It compares the returned result rows and lock SHA-256s independently with the original three-file frozen lock baseline **after** the HTTP call.

It reports all vulnerability IDs, affected package/version pairs and a SHA-256 of the exact raw OSV JSON report for audit. An actual valid response with advisories is **not** labeled “no vulnerabilities”: it provides a truthful count and `advisoryHumanTriageCompleted:false`. An HTTP outage / API rate limit is `BLOCKED`; malformed or changed evidence is `FAILED`. A valid complete response is a success **of a point-in-time database lookup only**, never release/security/legal approval.

The Security PR's separate `--online` mode retains its existing independent registry freshness and advisory-fail policies. This additional proof is a focused, single-batch live-OSV evidence probe, so it does not silently run 43 registry HTTP queries or auto-upgrade locks.

No host access, runtime deployment, credential reading, code downloads or production lock mutations. All changes under `research/parallel-security/`.
