# AI Site CMS — Security & Dependencies Research — NEXT CHAT (актуально)

**Обновлено:** 21 октября 2026. **Это единственный приоритетный handoff нашего отдельного Security & Dependencies Research, не главного разработчика CMS.** Дополнительный подробный источник: [CURRENT-CHECKPOINT-2026-10-21.md](CURRENT-CHECKPOINT-2026-10-21.md).

## 1. Перед первым действием — GitHub

1. Репозиторий (подключённый GitHub): https://github.com/manufact-test/ai-site-cms, единственная рабочая ветка `research/stage2-supply-chain-followup`.
2. [PR #3](https://github.com/manufact-test/ai-site-cms/pull/3) **OPEN DRAFT** против `main`; НЕ merge/ready/rebase/force/retarget. Сначала вызвать GitHub `get_pr_info` и получить его текущий `head_sha`, `base_sha`, `draft`, `state`.
3. Последний независимо **проверенный кодовый** HEAD перед документами: `f55e87abf8a75b9b8d2519577c6ffece29f140fe`; GitHub Actions [#39588010610](https://github.com/manufact-test/ai-site-cms/actions/runs/39588010610), Security job `119181690800` **SUCCESS**, **76 PASS / 0 FAIL / 4 BLOCKED**. Этот handoff обновляется отдельным коммитом и потому **не является последним head**. Проверь отдельный CI документального HEAD! Количество PASS — записи suite, не число всех assertions.
4. Разрешены изменения ИСКЛЮЧИТЕЛЬНО `research/parallel-security/` и комментарии в PR #3. Запрещены изменения `main`, `cms/`, `.github/workflows/`, lock files, интеграционных/других исследовательских веток, Hostinger, секретов, MySQL, релизных файлов и root docs. Владелец CMS — главный интегратор.
5. Перед изменениями изучить именно этот `NEXT-CHAT.md`, `CURRENT-CHECKPOINT-2026-10-21.md`, `README.md`, `RUNBOOK.md`, `FROZEN-LOCK-SOURCE-REVIEW.md`, `UPSTREAM-REAL-ZIP-REVIEW.md`, `OSV-LIVE-EXACT-43-REVIEW.md` и последние комментарии PR. Старые исторические состояния не использовать без сопоставления с новым чекпоинтом.

## 2. Фактически завершено

- Настоящие неизменные production locks: **14 Composer + 29 npm**. Три SHA-256 и Git blob исходных lock/manifest заморожены; подмена исходника, подписи SRI или дополнительный пакет приводит к отказу. **29** позитивных/адверсариальных тестов на реальных копиях файлов.
- OSV: реальный HTTPS запрос `querybatch` завершился **43/43**, в том срезе **0 известных OSV advisory**; строго проверяются исходные lock SHA, число строк, ключи package/version, timestamps и негативные варианты. Новый живой результат не гарантирует отсутствие будущих/неизвестных проблем.
- Upstream `paragonie/sodium_compat 2.5.2`: GitHub сообщает проверенную **подпись аннотированного v2.5.2 тега**, коммит `3246b36803c177847e677862fedeb7f937869adb`; **211 Git tree entries**, **78 экспортируемых файлов**. **Реальный ZIP по HTTPS уже скачан и сверены все 78 Git blob bytes**. SHA256 ZIP: `53944302442e609c0443f680a6195f8d7467e3d0f0c4503e8a690fd9e7ee22f2`. Не утверждать независимую идентификацию PGP signer или crypto/code audit.
- Отдельный успешный CI главного интегратора `main` [#39571456888, job #119126388264](https://github.com/manufact-test/ai-site-cms/actions/runs/39571456888/job/119126388264): реальный PHP 8.3.6/64-bit без ext-sodium и точная `sodium_compat`; 33 проверки цепочки permit/receipt/settlement и 55 по trust-root rotation. Наш research CI только проверил сохранённый фактический журнал и 40 negative доказательств, не переисполнял этот PHP.
- Собственные native проверки: 60 signed-chain на старом PR-base; 120 signed-chain на точном сохранённом фиксированном исходнике integrator main (маршрут через class shim **всё ещё native Sodium**), плюс 36 receipt, 46 permit, 38 settlement, 18 rotation. Нельзя назвать эти 120 проверок реальным polyfill/всем main.
- Новый `evidence-readiness-decision.mjs`: 6 типизированных независимых proof-маркеров, real ZIP SHA, live OSV SHA/43 rows, полнота проверок и критические блокировки связываются в JSON; **`releaseDecision=NO_GO` без исключений**. 37 adversarial regressions плюс suite-exit 12 PASS. Последний кодовый CI **76/0/4**.
- Весь PR по согласованным разрешениям — **исключительно research/parallel-security/**. Самостоятельно никакие исходники CMS, workflows или dependencies не меняли.

## 3. Четыре открытых технических BLOCKED в research CI

- `source:common-ed25519-backend`: общий backend всех callsites актуального `main` против PR historical base не проверен под текущим CI checkout.
- `native:forced-class-signed-chain`: 60-case forced class complete chain против актуального original `main` (старый base всё ещё вызывает global sodium).
- `no-sodium:cryptography`: независимый физический research PHP8.3 ext-sodium-free binary.
- `compat:cryptography`: независимая фактическая source pre/post attestation установленного `v2.5.2` и настоящего Sodium-free PHP; ZIP-провананс уже доказан отдельно, но research runtime не исполнялся.

Внешние обязательные решения остаются за владельцем/экспертами: независимое удостоверение PGP signer identity, криптографический/лицензионный ISC и NOTICE review, Hostinger LiteSpeed PHP8.3 web SAPI и CPU/latency/concurrency, юридическая пригодность перепродажи и безопасность производственного релиза. Stage2/production не утверждены.

## 4. Как продолжать

- Пользователь предпочитает **одну большую автономную задачу за запрос**, проверку реального GitHub CI на точном SHA, затем короткий осмысленный отчёт. **Не** обновлять всю документацию при каждом небольшом пакете; обновлять handoff только при следующем переходе чата или очень большой контрольной точке.
- Следующий логичный независимый крупный блок: соотнести **actual installed** `sodium_compat` в disposable no-native runner с Git blob источниками `--verify-installed` и pre/post source SHA (интегратор владеет workflow); получить отдельное подтверждение PGP signer fingerprint через доверенный out-of-band канал; предложить интегратору workflow/actual-main checkout изменения только комментариями PR; либо провести глубокий source security review с реальными полезными дефектами. Избегать накрутки синтетических PASS.
- Запрещено самостоятельно менять CMS/production или имитировать внешние тесты. Любые blockers фиксировать честно.
- После каждого настоящего блока проверить `get_pr_info`, `list_pr_changed_filenames`, exact commit workflows/job logs; сообщение в PR #3 с проверяемым пруфом. Не менять статус PR и не сливать.
- Прогресс этого узкого направления около **90–92% инженерно**, не прогресс CMS.

## 5. Команды

```sh
node research/parallel-security/run-security-suite.mjs
node research/parallel-security/run-security-suite.mjs --strict
node research/parallel-security/evidence-readiness-regression.mjs
node research/parallel-security/sodium-real-zip-proof.mjs --online
node research/parallel-security/osv-live-independent-proof.mjs
# Требует исходников реальной библиотеки, скачанных в отдельную временную папку:
node research/parallel-security/sodium-upstream-tree-proof.mjs --verify-installed /absolute/path/to/sodium_compat
# Только настоящий PHP8.3 x64 БЕЗ Sodium + vetted compat tree:
PHP_NO_SODIUM_BIN=/absolute/no-native-php SODIUM_COMPAT_AUTOLOAD=/absolute/vendor/paragonie/sodium_compat/autoload.php SODIUM_COMPAT_LOCK=/absolute/isolated/composer.lock SODIUM_COMPAT_TREE_SHA256=externally-reviewed-64hex node research/parallel-security/runtime-sodium-proof.mjs
```

`--strict` закономерно завершится статусом 3 при любых `BLOCKED`. Обычный прогон exit 0 + `NO_GO` означает только, что выполненные проверки прошли, но выпуск запрещён. Пользователь не должен вручную передавать файлы — всё в GitHub. Готовое стартовое сообщение: [START-MESSAGE-RU.md](START-MESSAGE-RU.md).
