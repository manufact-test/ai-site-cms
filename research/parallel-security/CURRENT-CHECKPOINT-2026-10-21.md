# AI Site CMS — Security & Dependencies Research — актуальная контрольная точка

**Дата:** 21.10.2026 (после полноценной независимой разработки). **Приоритет:** этот документ и `NEXT-CHAT.md` имеют приоритет над датированными историческими формулировками из файлов 20–21.10.

## 1. Неприкосновенные границы проекта

- Репозиторий: https://github.com/manufact-test/ai-site-cms
- Рабочая ветка ТОЛЬКО: `research/stage2-supply-chain-followup`.
- [PR #3](https://github.com/manufact-test/ai-site-cms/pull/3) — **OPEN DRAFT**, не сливать, не переводить в Ready, не менять базу, не делать rebase/force push.
- **Запись разрешена только внутри `research/parallel-security/`**. Комментарии PR #3 — согласованный канал связи с главным интегратором. Никаких изменений `main`, `cms/`, `.github/`, Composer/npm lock-файлов, других исследований, Hostinger, DB, приватных секретов или развёртывания.
- После добавления этой документации HEAD изменится. **Обязательно брать фактический `head_sha` PR #3 и проверять CI именно для него**.

## 2. Последний ДОКАЗАННЫЙ кодовый чекпоинт перед обновлением документов

- Кодовый HEAD: `f55e87abf8a75b9b8d2519577c6ffece29f140fe`.
- Реальный GitHub Actions [#39588010610](https://github.com/manufact-test/ai-site-cms/actions/runs/39588010610), Security job `119181690800`: **SUCCESS**, `76 PASS / 0 FAIL / 4 BLOCKED`. Это записи suite, а не 76 отдельных криптографических утверждений.
- Отчёт решения выпуска: **`INDEPENDENT_SECURITY_RELEASE_DECISION`: `decision:"NO_GO"`, `strongResearchEvidence:true`, `qualifiedSignoffs:false`, `targetHostApproved:false`, `productionApproved:false`.**
- Весь PR на данном этапе был ограничен `research/parallel-security/`. После документационного коммита повторно проверить полный список changed filenames.

## 3. Действительные внешние доказательства (важно различать!)

**Исходный ZIP sodium_compat 2.5.2**: настоящий HTTPS GitHub Composer ZIP на фиксированном коммите `3246b36803c177847e677862fedeb7f937869adb`, проверки точных **78 файлов** против Git blob SHA на исходном Git tree (211 записей), связанном с **аннотированным PGP-подписанным тегом `v2.5.2`**, GitHub сообщает `verification.verified=true`. SHA-256 реального ZIP в успешном CI: `53944302442e609c0443f680a6195f8d7467e3d0f0c4503e8a690fd9e7ee22f2`. Подпись ТЕГА валидна по GitHub, но коммит сам unsigned, личность владельца PGP-ключа самостоятельно не удостоверена; криптографический аудит реализации не выполнен. ZIP не устанавливался и не выполнялся в нашем исследовательском CI.

**Живой OSV**: настоящий HTTPS `api.osv.dev/v1/querybatch` по **43/43 точным версиям** (Composer 14, npm 29); при фактическом успешном прогоне **0 advisory references в 0 пакетах**. Это только срез известной OSV-базы, НЕ доказательство отсутствия всех уязвимостей. На последнем кодовом CI SHA-256 JSON-отчёта `474995fc38306fe14d946b074071ef79e938e160a33d34a6708e034792c3afd6`. Этот хеш **меняется с каждым новым запуском** (как минимум из-за `checkedAt`); нельзя подменять новый отчёт старым. Сами полные сырые JSON нужно отдельно хранить как read-only evidence при желании оформлять официальную приёмку.

**Реальный PHP без Sodium**: в собственном **main CI интегратора**, а не в нашем research runner, выполнена сборка PHP 8.3.6 x64 без ext-sodium и проверка `paragonie/sodium_compat 2.5.2`. Настоящий [run #39571456888, job #119126388264](https://github.com/manufact-test/ai-site-cms/actions/runs/39571456888/job/119126388264) SUCCESS: 33 проверки оригинальной цепочки signed permit/receipt/settlement, 55 проверок смены trust-root. Мы сохранили и отрицательно тестируем точную запись из реального CI, **но не воспроизвели этот native-free процесс в Security PR**. Ни Hostinger PHP web-SAPI, ни нагрузка/latency target не подтверждены.

**Signed-chain основной CMS**: старый PR-base checkout не содержит последнего исправления `LabSettledUpgradeGate`; отдельно по точной сохранённой копии исправленного владельцем исходника реально прошла матрица 120 независимых подписанных проверок на двух путях native Sodium (второй — shim над `sodium_crypto_sign_open`, не реальный polyfill). Нельзя выдавать её за полную актуальную сборку `main`.

## 4. Новый блок перед миграцией: policy binding настоящих доказательств

- `evidence-readiness-decision.mjs` связывает **6** обязательных записей proof suite: exact 43-pin lock provenance, подписанный реальный Git tree, реальный скачанный ZIP по 78 файлам и SHA-256, **живой** OSV 43/43 c полным hash/количеством advisories, 120 signed-chain и архив настоящего main no-Sodium CI.
- Учитывает четыре отдельно НЕ закрытые research-gate строки, инциденты `failed`, неверные `exitCode`, отсутствие proof-маркеров или real SHA, реальные advisory findings. Формирует детальный JSON в `evidenceDecision` и строку `INDEPENDENT_SECURITY_RELEASE_DECISION` в CI, с отдельным fingerprint сводки. **Никогда не выдаёт `productionApproved=true` или `releaseDecision=GO`.**
- `evidence-readiness-regression.mjs`: **37** негативных/положительных сценариев; `suite-exit-regression.mjs` 12 регрессий неполной среды. Все пройдены на кодовом чекпоинте #39588010610.

## 5. Невыполненные требования (НЕ маскировать)

Четыре `BLOCKED` именно независимого research CI:
1. `source:common-ed25519-backend` — оригинальные пять PHP callsites в актуальном `main` с исправлением владельца не проверены текущим историческим PR-base checkout.
2. `native:forced-class-signed-chain` — 60-кейсовый полный class-only settlement режим требует актуальный исходник, а не старый `main` base.
3. `no-sodium:cryptography` — не запущен собственный research-тест на физически ext-sodium-free PHP 8.3.
4. `compat:cryptography` — тот же настоящий runtime + одновременно vetted exact package/vendor-tree SHA-256 до и после crypto.

Дополнительные **неавтоматизируемые решения**: отдельное подтверждение принадлежности PGP ключа upstream автору, квалифицированный crypto/code review и ISC/NOTICE/commercial licensing signoff, реальный Hostinger/LiteSpeed web-SAPI с memory/latency/CPU/конкурентностью, security/Stage2 release approval владельцем, актуальная интеграционная CI база. Они **не становятся PASS** благодаря ZIP/OSV.

## 6. Где что лежит

- `NEXT-CHAT.md` — полный актуальный маршрут следующего независимого чата; `START-MESSAGE-RU.md` — первое готовое сообщение.
- `README.md`, `RUNBOOK.md`, `OSV-SNAPSHOT-REVIEW.md` — актуальные команды/оговорки; этот CHECKPOINT — приоритет над историческими заявлениями.
- `FROZEN-LOCK-SOURCE-REVIEW.md` — точные SHA-256 трёх production lock/manifest файлов (14+29).
- `UPSTREAM-SIGNED-GIT-SOURCE-REVIEW.md` и `UPSTREAM-REAL-ZIP-REVIEW.md` — подписанный upstream tag/tree и реальный сверенный GitHub ZIP.
- `MAIN-GENUINE-SODIUM-FREE-EVIDENCE-REVIEW.md`, `PINNED-FIXED-MAIN-DISPATCH-REVIEW.md` — особенности двух разных реальных исследований криптографии.
- `OSV-LIVE-EXACT-43-REVIEW.md` — live OSV и исходные lock SHA.
- `AUDIT.md`, `SOURCE-LICENSE-REVIEW.md`, `SODIUM-DECISION-REVIEW.md` — риски/ограничения, требующие независимого специалиста.

**Оценка прогресса ТОЛЬКО этого исследовательского направления:** ~90–92% инженерной разработки, остаток преимущественно актуальная интеграционная проверка, независимые внешние подтверждения и квалифицированная приёмка. Это НЕ прогресс всей AI Site CMS и не готовность к продакшену.
