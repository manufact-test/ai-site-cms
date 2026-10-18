# AI Site CMS — Stage 2 first verified core bootstrap (v1.31)

**18.10.2026.** The owner explicitly delegated technology selection to the assistant. Selected **A: Slim 4 (PHP API) + Opis JSON Schema 2.6 + Jedison 1.27.1**, RJSF 6.11 fallback. Stage1 research and foundation selection **accepted under this delegation**; Stage2 **in progress, not accepted**. See [ADR 0001](ADR/0001-selected-foundation.md), [ADR 0002](ADR/0002-hosting-storage-isolation.md), [ADR 0003](ADR/0003-preview-adapter-boundaries.md).

## Code delivered — NOT production CMS

[Commit 8eb12e2](https://github.com/manufact-test/ai-site-cms/commit/8eb12e2825ebcf53571e01d15ce947baf6d5d2bc) introduced `cms/`: a real Composer PHP Slim app with Opis declared, a static `GET /api/health`, `cms/public/index.php`, a ten-assertion CLI smoke and a GitHub Actions workflow. **No auth/admin API, no DB/storage, no write/edit/publish functions, no UI.** This is safe as an empty foundation *only because writable routes do not exist*, not because security is implemented.

## Verified test result

[**GitHub Actions #39125215551, 1/1 php-core completed SUCCESS**](https://github.com/manufact-test/ai-site-cms/actions/runs/39125215551), independently checked its job steps:

| Check | Result |
|---|---|
| Composer manifest validation and actual dependency install in CI | PASS |
| PHP syntax of bootstrap, kernel, smoke | PASS |
| PHP CLI health/no-cache/no-sniff + admin/write route nonexistence | PASS — 10 checks |
| PHP built-in HTTP GET health and POST publish 404 | PASS |
| Target Hostinger PHP/extensions/permissions | **NOT TESTED; NO READ-ONLY PERMISSION** |
| composer.lock, complete dependency SBOM and LICENSE/NOTICE | **NOT YET VALIDATED** |
| Production PDO DB/installer, auth/RBAC, backup, multiadmin, rich site | **NOT BUILT** |

This workflow is a lightweight automated correctness smoke on a GitHub runner; it does not prove target-host runtime or 135/135 product requirements. Research branch untouched and not merged; no CELIKOM/live site touched.

## Remaining Stage2 milestones

1. Lock Composer dependencies and browser-editor toolchain versions; complete SBOM/NOTICE and reproducible package.
2. Build isolated single-site PDO MySQL/MariaDB data/bootstrap migration contract, SQLite optional for local tests, guard permissions and webroot.
3. Add explicit installation/upgrade/recovery tests and auth-first rule before any state-changing API.
4. Independently test real Hostinger compatibility in read-only mode **only after owner separately authorizes**. Stage2 cannot be accepted until the target environment empty CMS run condition is evidenced.
5. After formal Stage2 acceptance, begin Stage3 AI contract including independent second-LLM source + separately generated manifest.

**Release unchanged:** Stage0 + Stage1 accepted, Stage2 not accepted, Stage3 not started; 193 requirements=135 mandatory, 42 desirable, 16 unwanted; **0/135 mandatory product accepted**, no MVP, Stage17 CELIKOM only after full release with separate consent.
