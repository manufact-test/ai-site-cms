# Exact-source PHP license and NOTICE review — 20 October 2026

**Baseline:** `cms/composer.lock` on `research/stage2-supply-chain`. 14/14 Composer source revisions were checked against their original public GitHub `LICENSE` / `LICENSE.md` file. Source texts corroborate 10 MIT, 3 Apache-2.0, 1 BSD-3-Clause declarations. Root-directory NOTICE existence was separately checked at the exact pinned commits. This is an engineering source-text audit, **not qualified legal sign-off**.

| Pinned PHP component | License in source text | Exact source license | Root NOTICE |
|---|---|---|---|
| `fig/http-message-util@1.1.5` | MIT | [LICENSE](https://github.com/php-fig/http-message-util/blob/9d94dc0154230ac39e5bf89398b324a86f63f765/LICENSE) | not present at source root |
| `nikic/fast-route@1.3.1` | BSD-3-Clause | [LICENSE](https://github.com/nikic/FastRoute/blob/7476684f39bb9124b3be69ed3d84b66723920298/LICENSE) | not present at source root |
| `opis/json-schema@2.6.0` | Apache-2.0 | [LICENSE](https://github.com/opis/json-schema/blob/8458763e0dd0b6baa310e04f1829fc73da4e8c8a/LICENSE) | [NOTICE](https://github.com/opis/json-schema/blob/8458763e0dd0b6baa310e04f1829fc73da4e8c8a/NOTICE) |
| `opis/string@2.1.0` | Apache-2.0 | [LICENSE](https://github.com/opis/string/blob/3e4d2aaff518ac518530b89bb26ed40f4503635e/LICENSE) | [NOTICE](https://github.com/opis/string/blob/3e4d2aaff518ac518530b89bb26ed40f4503635e/NOTICE) |
| `opis/uri@1.1.0` | Apache-2.0 | [LICENSE](https://github.com/opis/uri/blob/0f3ca49ab1a5e4a6681c286e0b2cc081b93a7d5a/LICENSE) | not present at source root |
| `psr/container@2.0.2` | MIT | [LICENSE](https://github.com/php-fig/container/blob/c71ecc56dfe541dbd90c5360474fbc405f8d5963/LICENSE) | not present at source root |
| `psr/http-factory@1.1.0` | MIT | [LICENSE](https://github.com/php-fig/http-factory/blob/2b4765fddfe3b508ac62f829e852b1501d3f6e8a/LICENSE) | not present at source root |
| `psr/http-message@2.0` | MIT | [LICENSE](https://github.com/php-fig/http-message/blob/402d35bcb92c70c026d1a6a9883f06b2ead23d71/LICENSE) | not present at source root |
| `psr/http-server-handler@1.0.2` | MIT | [LICENSE](https://github.com/php-fig/http-server-handler/blob/84c4fb66179be4caaf8e97bd239203245302e7d4/LICENSE) | not present at source root |
| `psr/http-server-middleware@1.0.2` | MIT | [LICENSE](https://github.com/php-fig/http-server-middleware/blob/c1481f747daaa6a0782775cd6a8c26a1bf4a3829/LICENSE) | not present at source root |
| `psr/log@3.0.2` | MIT | [LICENSE](https://github.com/php-fig/log/blob/f16e1d5863e37f8d8c2a01719f5b34baa2b714d3/LICENSE) | not present at source root |
| `ralouphie/getallheaders@3.0.3` | MIT | [LICENSE](https://github.com/ralouphie/getallheaders/blob/120b605dfeb996808c31b6477290a714d356e822/LICENSE) | not present at source root |
| `slim/psr7@1.8.0` | MIT | [LICENSE.md](https://github.com/slimphp/Slim-Psr7/blob/76e7e3b1cdfd583e9035c4c966c08e01e45ce959/LICENSE.md) | not present at source root |
| `slim/slim@4.15.3` | MIT | [LICENSE.md](https://github.com/slimphp/Slim/blob/3675bf6baac66b07032575b7bef4200b60b7974b/LICENSE.md) | not present at source root |

## Confirmed P1 finding: two upstream Apache-2.0 NOTICE files omitted

**opis/json-schema@2.6.0** and **opis/string@2.1.0** both have independent upstream `NOTICE` files at their pinned release commits. The text identifies project copyright attribution, Zindex Software and the original creators. The exact source links are in the table above.

Current `cms/tools/generate-compliance.cjs` checks/copys `installedLicense()` only for each Composer vendor path; it concatenates the one selected LICENSE body and does not read/append the separate NOTICE. The current `main` was also inspected and has the same implementation. As a result, current generated `private/compliance/THIRD_PARTY_NOTICES.txt` **cannot be relied on to preserve both Apache-2.0 root NOTICE texts**. This is **P1 commercial distribution/compliance gating risk**, not proof of a legal violation or legal conclusion.

**Main integrator action (outside this research branch):** implement verified inclusion of upstream NOTICE files in the release builder, preserve original notices and accompanying LICENSE, include provenance/hash evidence in SBOM, assert presence in built internal package and rerun full package CI. New read-only check `notice-gate.mjs` and its synthetic mutation tests are supplied in this research folder. Do not modify production generator from this PR.

At exact source roots, 2/14 have NOTICE and 12/14 do not. Other embedded notices/copyright records, subtree licenses, npm distributions, binary payloads and modification statements remain **unreviewed**. Source text matches declared SPDX; independent qualified legal review remains mandatory before commercial distribution.

## Source audit boundaries
- GitHub links are pinned to each real 40-hex `composer.lock` source reference, not moving `main` branches.
- Source licenses were read and tested for typical family markers, but **individual embedded and transitively vendored source files not fully classified**.
- Installed Composer vendor bytes and actual compiled artifact were not downloaded; NOTICE omission is derived from generator source, and should be proven with `notice-gate.mjs` in an isolated complete build.
- No client hosting, CMS runtime, Composer lock or legal documents changed. Stage2 remains NOT ACCEPTED.
