# AI Site CMS — Security & Dependencies Research (isolated)

**Актуальный статус 21 октября 2026** — [CURRENT-CHECKPOINT-2026-10-21.md](CURRENT-CHECKPOINT-2026-10-21.md) (приоритет над историческими страницами), [NEXT-CHAT.md](NEXT-CHAT.md) (передача), [START-MESSAGE-RU.md](START-MESSAGE-RU.md) (готовое первое сообщение).

Изолированная ветка `research/stage2-supply-chain-followup`, [PR #3 OPEN DRAFT](https://github.com/manufact-test/ai-site-cms/pull/3), разрешены изменения ТОЛЬКО `research/parallel-security/`. Не влиять на main/CMS/Hostinger/workflows/dependency locks. Production/Stage2 **не одобрены**.

## Подтверждено реальными источниками и CI

- Ровно **43 pinned dependencies**: 14 Composer runtime и 29 npm (включая 26 необязательных платформенных esbuild). `frozen-lock-baseline.mjs` подтверждает настоящие исходные SHA256 и Git blob трёх оригинальных lock/manifest-файлов; `frozen-lock-regression.mjs` — 29 испытаний на копиях реальных файлов.
- **Реальный live OSV** `api.osv.dev/v1/querybatch` проверил 43/43 версии, в успешном срезе 21.10.2026 — 0 advisory references. `osv-live-independent-proof.mjs` привязывает результаты к source lock SHA; `osv-strict-snapshot.mjs` и `osv-advisory-triage.mjs` обеспечивают полный strict JSON и сохранение предупреждений. Отсутствие advisory на один момент не означает отсутствие потенциальных неизвестных CVE.
- Источник `paragonie/sodium_compat@2.5.2`: GitHub-reported PGP verified annotated v2.5.2 tag, pinned commit `3246b36803c177847e677862fedeb7f937869adb`, исходное Git tree 211 записей, 78 экспортируемых файлов. `sodium-upstream-tree-proof.mjs` перепроверяет Git tree; **`sodium-real-zip-proof.mjs` реально скачал GitHub ZIP и сверил все 78 исходных байтов**, SHA256 ZIP `53944302442e609c0443f680a6195f8d7467e3d0f0c4503e8a690fd9e7ee22f2`. Не означает независимо подтверждённую PGP identity, криптографический аудит или разрешение на распространение.
- В main CI интегратора реальный физический PHP 8.3.6 x64 без native Sodium выполнил 33 проверки разрешений/квитанций/settlement и 55 rotation. [main CI #39571456888](https://github.com/manufact-test/ai-site-cms/actions/runs/39571456888). `archived-main-sodium-proof.mjs` проверяет сохранённую реальную запись; **наше исследование самостоятельно не запускало тот же полностью vetted PHP без Sodium**.
- Native crypto: реальные оригинальные PHP 36 receipt/46 permit/38 settlement, 60 original signed chain, 120 signed chain на фиксированной точной копии исправленного main исходника (второй маршрут через native-based shim), 18 trust rotation. Отдельные две full-main CI проверки пока BLOCKED из-за старого base SHA PR.
- `evidence-readiness-decision.mjs` требует 6 выполненных оригинальных source/OSV/crypto evidence rows, отделяет неполные/подменённые результаты, печатает fingerprint привязки, всегда указывает **`releaseDecision=NO_GO`** до отдельного human и host-signoff. `evidence-readiness-regression.mjs` — 37 adversarial assertions.

**Последний кодовый exact-head CI ДО документационной контрольной точки:** [#39588010610](https://github.com/manufact-test/ai-site-cms/actions/runs/39588010610), **76 PASS / 0 FAIL / 4 BLOCKED**, NO_GO. Документационный commit дополнительно запускает CI — актуальный SHA всегда взять из PR.

## Что осталось

`source:common-ed25519-backend`, `native:forced-class-signed-chain`, `no-sodium:cryptography`, `compat:cryptography` — четыре независимых blocked research CI. Отдельно квалифицированный crypto review, подтверждение upstream PGP signer trust, лицензия ISC/NOTICE, целевой Hostinger PHP web-SAPI (включая CPU/latency/concurrency) и одобрение release. Никакой искусственный PASS не закрывает эти требования.

## Входные точки

```sh
node research/parallel-security/run-security-suite.mjs
node research/parallel-security/run-security-suite.mjs --strict
node research/parallel-security/evidence-readiness-regression.mjs
node research/parallel-security/sodium-upstream-tree-proof.mjs
node research/parallel-security/sodium-real-zip-proof.mjs --online
node research/parallel-security/osv-live-independent-proof.mjs
node research/parallel-security/osv-advisory-triage.mjs /absolute/saved-full-osv-json --historical
```

`--strict` завершится exit 3 пока есть BLOCKED. Обычный CI может быть SUCCESS с блокировками, но **никогда не является разрешением на выпуск**.

Подробный журнал: [RUNBOOK.md](RUNBOOK.md). Исторические документы с более старыми состояниями (`EVIDENCE-2026-10-20.md`, `SOURCE-LICENSE-REVIEW.md`, `OSV-SNAPSHOT-REVIEW.md` и др.) содержат отчёты своей даты, а не текущую готовность.
