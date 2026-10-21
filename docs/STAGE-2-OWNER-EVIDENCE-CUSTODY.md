> **Контрольная точка v1.50 / 21.10.2026:** проверенный SOURCE b6de6197d3c5d93731c58934bda7c7107f9cb191. Новая product-preview лаборатория и минимальный Chromium smoke не меняют криптографические полномочия, не подписывают реальные host records, не добавляют права на MySQL install и не превращают Stage2 в принятый этап. Работа по получению согласований должна закрывать настоящие критерии, а не порождать новые десятки CI-отрицательных фикстур. Обязательный подход: [DEVELOPMENT-WORKFLOW](DEVELOPMENT-WORKFLOW.md).

# AI Site CMS — Stage2 Evidence Custody: независимые подписи и доверие

Актуально 21.10.2026, код `b3237fc2426ad246178b3fd4b64501c6b22c86ba`. **Stage2 НЕ принят, Stage3 не разрешён.** Это инженерный протокол для будущей разрешённой проверки, не инструмент авторизации.

## Раздельные документы, источники и полномочия

| Доказательство | Что проверяет локальная криптография | Чего НЕ проверяет |
|---|---|---|
| Owner read-only consent (`stage2-owner-consent-sign.cjs`) | Ed25519 signature под отдельно закреплённым SPKI pin, exact scope/origins/nonce/expiry | Личность реального владельца, владение хостингом, права на DB write, установку или outage |
| Operator signed evidence (`stage2-evidence-bundle.cjs`) | Защиту целого фиксированного набора offline/HTTPS/DB records Ed25519 подписью под ОТДЕЛЬНЫМ operator pin | Правдивость самих наблюдений HTTP/TLS/DB, удостоверенную личность оператора и право доступа |
| Owner review (`stage2-owner-decision.cjs`) | Независимое повторное сверение обеих подписей, digest consent и совпадения origins/scope; ledger `evidenceCustody` | Legal approval 43 deps, identity signer, physical target proof, issuer trust, Stage2 acceptance |

**Строгое правило:** подписанное read-only разрешение владельца + неподписанный operator report = **REFUSE** (CLI и direct API). «Grant на visit» нельзя выдать за подпись/достоверность результатов visit. Даже две корректных подписи не доказывают реальную личность подписантов. Нельзя заполнять false флаги `ownerSigningIdentityIndependentlyVerified`, `operatorSigningIdentityIndependentlyVerified`, `targetTlsAndHostObservationsIndependentlyVerified`, `targetDatabaseIndependentlyVerified`, `writeInstallPermission`, `stage3Authorized` со слов оператора.

## Операторская последовательность — только после явного согласия владельца

1. Owner через независимый канал сверяет реальную целевую собственность, планируемые два HTTPS origin, точный read-only scope, короткий интервал разрешения и fingerprint своего Ed25519 public SPKI. **Никаких долгоживущих private keys в репозитории, chat, CI, artifact, public_html или Hostinger logs.**
2. Offline utility подписывает конкретный read-only scope; приватный key, scope, trusted public pin и receipt — разные защищённые директории. Любая смена origins, pin, nonce, времени или key требует нового явно одобренного разрешения. Проверка identity key должна происходить вне этой утилиты.
3. Лишь отдельно permissioned `stage2-target-https-check.cjs` вправе сделать оговорённый read-only HTTPS GET: одноразовый marker consumed durable до сети, без admin/write/SSH/DB операций и только по exact scope. CI synthetic fixtures не являются настоящими host receipts.
4. Оператор отдельно подписывает наблюдения `stage2-evidence-bundle.cjs`; owner review получает **независимо** закреплённый operator public SPKI, отдельно owner public SPKI, подписанный scope, подписанный operator bundle. При отсутствии любого элемента — отказ, не «partial accepted».
5. Читатель отчёта должен видеть и статус cryptographic transport, и false для identity/actual-host/write/legal/Stage2/Stage3. Отдельный owner grant требуется позже на DB write/install, controlled visitor outage, recovery. No implicit Hostinger deployment.

GitHub CI: [PHP 8/8](https://github.com/manufact-test/ai-site-cms/actions/runs/39623780590), [Editor/E2E](https://github.com/manufact-test/ai-site-cms/actions/runs/39623780667), [GitHub ZIP 479/479](https://github.com/manufact-test/ai-site-cms/actions/runs/39624303691). Manifest SHA256 `112f9fd7adf5ac3f0717047967453b2de14a6b1647c5cc12e2358f7ddf0508bc` — **unsigned inventory only**. Human 43 dependency licenses/NOTICE and real publisher trust remain unresolved. Read `docs/NEXT-CHAT.md` §54 and `handoffs/lead-integrator/MAIN-HANDOFF-v1.49-2026-10-21.md`.
