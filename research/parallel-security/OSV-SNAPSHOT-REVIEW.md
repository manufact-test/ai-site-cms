# OSV: полный настоящий онлайн-аудит 43/43 pinned packages

**Актуализация 21 октября 2026.** Все заявления предыдущей датированной ревизии этого файла «живой OSV не запускался» больше НЕАКТУАЛЬНЫ; история остаётся доступной в старых Git-коммитах.

**Проверенные данные:** Composer runtime 14 и npm 29 exact versions, включая 26 платформенных optional esbuild binaries. Настоящий безопасный запрос `https://api.osv.dev/v1/querybatch` завершён в GitHub Actions исследовательской ветки. Реальный успешный code CI [#39588010610](https://github.com/manufact-test/ai-site-cms/actions/runs/39588010610) сообщил `REAL OSV HTTPS querybatch PASS 43 exact pins; 0 advisory references across 0 packages`; исходные lock SHA256 совпали до/после. Последний `reportSHA256` на этом прогоне `474995fc38306fe14d946b074071ef79e938e160a33d34a6708e034792c3afd6` (включает timestamp и меняется в новых запусках).

**Важные различия:**
- `0 advisory references` — в OSV по этим точным 43 версиям **на конкретное время**, не «нулевой риск» и не сертификат отсутствия уязвимостей.
- Наличие реального ответа не отменяет проверку доверия к источникам, законности лицензий, target PHP Hostinger и production signoff.
- Незавершённая или недоступная сеть — **BLOCKED**, некорректная/усечённая обработка ответа — **FAIL**, действительные advisories — не PASS безопасности: записываются как `HUMAN TRIAGE REQUIRED`.
- `--fail-on-advisory` возвращает exit 4 при корректном полном ответе с предупреждениями. `--historical` разрешает лишь чтение сохранённого старого отчёта по тем же lock SHA, но никогда не актуализирует его.

## Воспроизведение и сохранение полного отчёта

```sh
node research/parallel-security/osv-strict-snapshot.mjs > /safe/private/osv-exact-43.json
node research/parallel-security/osv-advisory-triage.mjs /safe/private/osv-exact-43.json > /safe/private/osv-triage.json
# Контроль реального 43-pin и immutable lock SHA:
node research/parallel-security/osv-live-independent-proof.mjs
# Дополнительные offline adversarial tests:
node research/parallel-security/osv-strict-regression.mjs
node research/parallel-security/osv-cli-regression.mjs
node research/parallel-security/online-evidence-regression.mjs
```

В CI сохранены proof-маркеры, число найденных advisory и SHA256 полного stdout-отчёта. **Полный сырой ответ OSV предыдущего запуска НЕ хранится в PR**; при подписываемой официальной приёмке сохранить свежий полный JSON отдельно в защищённом хранилище, чтобы аудитор смог воспроизвести hash и список записей. Нельзя реконструировать полный JSON по одному его SHA. Повторить перед релизом.

Решение выпуска формирует `evidence-readiness-decision.mjs`: даже при полном реальном OSV и source ZIP оно остаётся **NO_GO** до разрешения независимых технических и экспертных ограничений.
