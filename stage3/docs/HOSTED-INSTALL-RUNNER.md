# Stage3 private hosted installation runner

**Status:** implemented and exercised in disposable MySQL 8 and MariaDB 10.11/11.8 CI. The zero-credential `--probe` and manual sibling-layout filesystem preflight have been run on the owner-selected Hostinger staging account; the private credential config, `--plan` and `--apply` have not been run there. This document is an operational specification, not deployment approval.

## Purpose and boundary

`stage3/server/bin/hosted-install-runner.php` is a CLI-only wrapper around the Stage3 single-site installer. It exists for a shared-host staging workflow where the owner is not permitted to use shared/general SSH but the provider offers an owner-controlled hPanel Cron custom command.

- HTTP execution returns 404. It is not a web installer, shell bridge or command API.
- It requires a private 0700 directory outside the Stage3 runtime tree and every account web root.
- The credential-bearing config is a canonical JSON file with mode 0600, stored directly inside that private directory.
- It requires a complete owner-supplied inventory of the hosting account's web roots (1–50 canonical directories). It cannot discover omitted or newly created vhosts.
- It accepts only a dedicated empty database via PDO MySQL: MySQL 8.0+ or MariaDB 10.11+. SQLite and older/unsupported server versions are rejected.
- It performs no deployment or publication of visitor-site content.

## Zero-credential PHP CLI preflight

Before creating the private configuration or database credentials, run the read-only capability probe from an owner-controlled hPanel Cron custom command:

    php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --probe

The command requires no config file, database, credentials or approval fingerprint. It returns JSON with status `cli_ready_for_private_plan` or `blocked`, the PHP CLI version/SAPI, required extensions (PDO, PDO MySQL, JSON, OpenSSL and mbstring), available PDO drivers, and readability checks for the core Stage3 runtime files and directories.

The probe performs no filesystem writes, reads no environment secrets, and makes no database or network connection. A non-zero exit means a listed CLI prerequisite is missing; correct that condition before preparing the private config. The Sodium field is informational only and is not a readiness gate for this initial-install probe.

**Scope limitation:** this is evidence about the PHP CLI used by the Cron command only. It does not validate the website's PHP handler, MySQL/MariaDB connectivity/version, account web-root inventory, TLS, private-directory permissions or actual open_basedir access to future paths. Those remain separate checks in the hosted `--plan` and post-install Studio diagnostics. A clear probe result is not installation approval and never authorizes `--apply`.

## Private configuration

The exact config path must be:

`<STAGE3_PRIVATE_DIR>/hosted-install-runner.json`

The directory must have exact mode `0700`; the file must have exact mode `0600`, one hard-link only, same owner as the directory, no symlink, canonical absolute path and canonical JSON formatting. The file's parent must be the canonical private directory.

The JSON top-level keys and order are fixed: `format`, `accountWebRoots`, `values`. The `values` keys and order are also fixed:

1. `STAGE3_DSN`
2. `STAGE3_DB_USER`
3. `STAGE3_DB_PASSWORD`
4. `STAGE3_OWNER_USER`
5. `STAGE3_OWNER_PASSWORD`
6. `STAGE3_FORM_SECRET`
7. `STAGE3_FORM_ORIGINS`
8. `STAGE3_FORM_ENDPOINT`
9. `STAGE3_PRIVATE_DIR`
10. `STAGE3_PUBLIC_ROOT`

Illustrative shape only; replace every placeholder privately on the host and preserve the exact key order:

```json
{
    "format": "manufact-stage3-hosted-install-runner-config-v1",
    "accountWebRoots": [
        "/home/ACCOUNT/domains/staging.example.com/public_html",
        "/home/ACCOUNT/domains/other-site.example.com/public_html"
    ],
    "values": {
        "STAGE3_DSN": "mysql:host=DB_HOST;dbname=DEDICATED_STAGE3_DB;charset=utf8mb4",
        "STAGE3_DB_USER": "DEDICATED_STAGE3_USER",
        "STAGE3_DB_PASSWORD": "ENTER_PRIVATELY",
        "STAGE3_OWNER_USER": "stage3-owner",
        "STAGE3_OWNER_PASSWORD": "ENTER_PRIVATELY",
        "STAGE3_FORM_SECRET": "ENTER_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS",
        "STAGE3_FORM_ORIGINS": "https://staging.example.com",
        "STAGE3_FORM_ENDPOINT": "",
        "STAGE3_PRIVATE_DIR": "/home/ACCOUNT/domains/staging.example.com/.stage3-private",
        "STAGE3_PUBLIC_ROOT": "/home/ACCOUNT/domains/staging.example.com/public_html"
    }
}
```

The `accountWebRoots` list must include the exact Stage3 public root and every other active website document root in the same hosting account. The runner rejects overlap between private storage and any web root, and rejects overlap between the Stage3 runtime tree and any other web root. The private directory must also remain outside the runtime tree.

## Two-step operation

The hPanel Cron custom command uses the PHP CLI binary selected by the hosting account. No database password, owner password, form secret or installer token is placed in the command line.

### 1. Read-only plan

```sh
php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --config=/absolute/private/path/hosted-install-runner.json --plan
```

Proceed only when the output explicitly reports:

- `state: install_required`
- `applyAllowed: true`
- `hostIsolation.ok: true`
- a dedicated empty MySQL 8.0+ or MariaDB 10.11+ database and all required filesystem/private-runtime checks clear.

The runner removes the installer's private token from the plan output. It stores a redacted review plan and the private token/state in 0600 files in the private directory. The review output contains a SHA-256 `approvalFingerprint` calculated over the redacted plan.

**Schedule the plan as a one-time Cron execution.** Remove that Cron entry immediately after the first successful plan output; do not leave `--plan` recurring, because a second plan is intentionally refused while the private review/state files exist. After the owner reviews the plan, create a separate one-time Cron entry for the separately approved `--apply` command and remove it after execution.

If the plan is blocked, already installed, stale or otherwise not `install_required`, do not attempt apply. Correct the underlying issue and follow the runner's explicit recovery instructions.

### 2. Separate owner-approved apply

Only after reviewing the full plan and separately deciding to proceed:

```sh
php /absolute/path/to/stage3/server/bin/hosted-install-runner.php --config=/absolute/private/path/hosted-install-runner.json --apply=REPLACE_WITH_64_HEX_APPROVAL_FINGERPRINT
```

The runner reloads the private review/state files, checks their permissions and integrity, recomputes the current installer plan, and requires both the stored private token and the supplied fingerprint to match. Changed credentials, database identity, topology or plan state invalidate the approval before schema creation.

A successful apply creates the 25-table Stage3 schema and owner account, writes a private hosted topology receipt, writes a consumed marker, and removes the credential-bearing runner config, pending state and applying marker. A redacted review record, topology receipt and consumed marker remain private.

## Repeat execution and recovery

- A recurring Cron invocation after successful apply reads the valid consumed marker and exits successfully with no output. The owner should still remove the apply Cron entry manually in hPanel. Prefer one-time Cron entries for both plan and apply; never leave the plan entry recurring.
- If the runner reports an unresolved prior apply marker, stop. Inspect the database and private state manually; do not delete the marker, re-create the database or rerun apply blindly.
- If a plan review/state file exists, inspect it and follow the runner's explicit refusal. Do not overwrite or reuse an old approval.
- If cleanup warnings are returned, keep the staging hostname protected and remove only the specifically named private file after manual inspection.
- The runner does not configure DNS, TLS, PHP handler, hPanel document root, Cron schedules, notifications or external form collectors.

## Readiness diagnostics

After installation and HTTP routing are configured, the owner-only read-only Studio panel calls `GET /api/hosting/diagnostics`. It checks the database/schema identity, private runtime config, private directory mode, document root, actual front-controller script, public-root file policy, account topology receipt, PHP `open_basedir` access to runtime/public/private/upload paths, HTTPS, session flags, upload temp writability and file-upload limits.

The diagnostics cannot discover omitted or newly created account web roots; the owner-supplied inventory must be complete and reviewed. A `ready` result is a staging preflight signal, not product acceptance and not proof of provider-level DNS, certificate, mail or Telegram delivery.

## CI evidence and deployment status

The disposable MySQL 8 and MariaDB 10.11/11.8 install probes verify that overlapping web roots, wrong approval fingerprints and changed credentials are refused before database writes; a separate approved plan installs all 25 tables once, creates the topology receipt, removes credential-bearing config and makes subsequent Cron calls a silent no-op. The zero-credential CLI probe test verifies PHP 8.3 passes, stripped PHP CLI fails closed, secret sentinels are never echoed and no files are written. The Chromium and Apache smoke tests verify owner-only diagnostics, front-controller identity, PHP path restrictions and upload configuration.

The CI tests run in GitHub Actions only. Separately, the owner-operated Hostinger CLI `--probe` and filesystem preflight were run. No database, credentials, DNS, production site, customer data or real notification destination has been touched, and neither `--plan` nor `--apply` has run.
