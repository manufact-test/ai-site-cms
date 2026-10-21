# Genuine current-main web-to-Ed25519 static route census

**21.10.2026 — Security Research only.** [Exact code Actions #39624610755](https://github.com/manufact-test/ai-site-cms/actions/runs/39624610755): 97 PASS/0 FAIL/0 BLOCKED on research HEAD 760310d7bdd34f1b0d90b1066734e3e1dcbeefed. Original **main** source in that CI: SHA b3237fc2426ad246178b3fd4b64501c6b22c86ba. Current main can move independently.

New script **main-web-crypto-surface.php** runs PHP token_get_all(TOKEN_PARSE) on exact original main files in a disposable Git clone. The parent main-head-independent-proof.mjs verifies **11 original Git blobs** of web, CLI and release code, scans 2 PHP web entrypoints, counts original cms/src PHP and looks for additional AppFactory / $app route registrations, audits 2 CLI entrypoints, reruns PHP lint, 5 original Ed25519 verifier checks and 60 actually signed chain tests, and checks original main source SHA again after. No main file in repository is changed.

**Findings at that exact original SHA:**

- Original **cms/public/index.php** runs AiSiteCms HttpKernel, which currently registers exactly **one GET /api/health** Slim route.
- A SEPARATE **cms/hosting/hostinger-readonly/index.php** has **7 static route path comparisons**. They are Stage2 diagnostic/readonly, not proof of an installed CMS or host compliance. It includes a controlled in-memory health kernel smoke path.
- No direct PHP lexical references to Ed25519Backend/OfflineReleaseVerifier/TrustedChainVerifier/LabSettledUpgradeGate in the examined web entrypoints/HttpKernel.
- Original **cms/bin/verify-lab-release.php** and **cms/bin/verify-lab-trust.php** preserve explicit CLI-only guards; this is static checking only.
- Scanned the runtime cms/src source set for syntactically visible unexpected AppFactory::create and $app->route registration outside HttpKernel.

**24 synthetic mutations** in main-web-crypto-surface-regression.mjs passed: new POST/GET routes, altered/dynamic route path, other router, direct release crypto from web, Hostinger extra/deleted URL, missing CLI guards, symlinked web file, fake comments / quoted strings. Synthetic positive/negative tests are NOT a replacement for the live Git-source proof.

**Crucial limitations:** This is static syntax inspection, NOT exhaustive control-flow analysis; dynamically invoked functions, autoload side effects, other vendor plugins, webserver rewrite rule differences and route configuration on real Hostinger remain outside evidence. It does not prove that public HTTP reaches expensive Ed25519 nor that no unsafe route exists; it also does not demonstrate a remotely exploitable DoS vulnerability. Only owner-authorized staging/web-SAPI telemetry plus current integration test can establish that. Existing production/Stage2 decision **NO_GO**, six qualified external signoffs not received.
