## Последнее обновление — 26 октября 2026

- Ветка: `feature/stage3-design-factory`; текущий source checkpoint: `6150e9c323f801acaba0d6bc6c3d7a7664143601`. Перед началом всегда проверь live HEAD.
- Сохранена приёмка visual-review **v2**: отдельная проверка `showcaseCoverage`, просмотр всех 42 D3-композиций; старые v1 receipts отклоняются.
- **Исправлена полнота D7-инвентаризации** (`c61eaa270902cd019b10417f25fe55c3a60d0981`): папка `handoffs/` входит в ZIP и теперь также входит в source manifest; проверка сравнивает весь список файлов, а контрактный тест проверяет отклонение изменённого документа передачи.
- **Lead input provenance** (`c3696b3a9e9cb20b4da03a3bde09b708becaa6e5`): before/during/after хешируются все внешние файлы Lead SDK и optional PHP renderer; изменение входов блокирует соответствующий gate.
- **Bounded Lead SDK traversal** (`8417f387e3e72bcd18987968e186ec36ebc525c5`): максимум 1,024 filesystem entries и 32 уровня каталогов; пустые директории тоже считаются. Каталоги сверяются до/после обхода; contract smoke проверяет чрезмерную глубину и flood пустых директорий.
- **Sealed Lead-input snapshot** (`46b28c5d53d5d0e25fc5ad848683886ca9613e8b`): тест получает read-only копию SDK и PHP-адаптера, собранную по исходному SHA256-манифесту. Оригинал проверяется после копирования, после smoke и в конце candidate; копия — после smoke и в конце. Любой drift или ошибка cleanup блокирует ворота.
- **Aggregate snapshot status** (`6150e9c323f801acaba0d6bc6c3d7a7664143601`): итоговый `leadInputs.stable` учитывает и оригинал, и snapshot; ошибка cleanup выставляет `stable=false`, чтобы отчёт не противоречил gate.
- **Canonical ZIP32 headers** (`9aa4016f347cfbee98205458013ffae5302a156b`): verifier проверяет version, flags, compression, timestamps, single-disk metadata и локальные/центральные заголовки; package smoke содержит повреждённые ZIP-header cases.
- **Candidate summary** (`8e0c233a592145cc5c8ad12434c92db9ff935d9b`): итоговый CLI JSON показывает статус `leadInputs`, это закреплено smoke-проверкой.
- `release-candidate.cjs` отделяет некорректный audit report от корректного отчёта с проваленными проверками; сводные флаги сверяются с результатами отдельных проверок, а дрейф исходников оценивается независимо.
- Создан единый D7 Release Candidate Pipeline. `release-audit.cjs` выполняет browser-bundle parity + **8 Node suites**; с `--chromium` добавляет visual-pipeline smoke.
- `release-candidate.cjs` запускает audit, собирает ZIP, независимо сверяет central/local headers, CRC32, полный source inventory/bytes и SHA256; опционально выполняет Chromium capture, review v2, Lead JS smoke и шесть PHP markup-parity probes.
- Fingerprint связывает все code files в `bin/catalog/lib/studio`, все component JSON manifests и SDK contract. Старая визуальная приёмка отклоняется при изменении исходников; symlink-каталоги скриншотов запрещены.
- Статический V8 syntax parse трёх изменённых JS-файлов — **PASS**. Snapshot/drift regressions добавлены, но ещё не запускались в полном Node checkout. Полный Node audit, candidate smoke, Chromium Studio E2E, 54 PNG с человеческой проверкой, Lead JS/PHP parity и реальный ZIP/SHA256 **НЕ ЗАПУЩЕНЫ**.
- GitHub API для source checkpoint `6150e9c323f801acaba0d6bc6c3d7a7664143601`: 0 Actions runs, 0 check runs, 0 commit statuses. Последняя известная попытка настоящего checkout упёрлась в DNS `github.com`; минимальный Chromium probe завершился timeout. Не повторяй без изменения среды.
- Статус: **D7 OPEN; Stage2 NO-GO; Stage3 не принят; 0/135**. Никаких изменений workflows, merge, main, SDK, PHP, hosting или production.

## Жёсткие границы

Не меняй `main`, ветку главного разработчика/Lead SDK, Stage3 SDK, компоненты вне Design Factory, PHP, основную Studio, GitHub Actions/workflows, hosting, secrets или production. Ничего не объединяй самостоятельно. Не меняй workflow, чтобы искусственно получить CI-запуск.

## Как работать

**Ускоренная программа: делай три больших связанных блока за проход**, а не десятки мелких правок и не бесконечные повторы одной матрицы. Сначала план на три блока, затем реализация, один содержательный прогон проверок, исправление реальных дефектов и документация. Не утверждай, что тест прошёл, если он только добавлен в код. Не повторяй бесконечно заведомо заблокированные попытки окружения.

## Что уже улучшено после прежнего checkpoint

- Studio удерживает клавиатурный фокус при выборе набора, темы и страницы; live preview обновляется с debounce 120 мс; ошибка применения/импорта откатывает состояние вместо ложного успеха.
- `lib/output-path.cjs` ограничивает вывод артефактов за пределами репозитория, включая символьные ссылки в родительском пути и финальную ссылку.
- ZIP-инвентарь сортируется детерминированно; source digest связывает точный путь и байты файла через length-prefix.
- Visual QA проверяет полноту матрицы: **54 изображения** в полном режиме и **30** в quick mode; пропуски, лишние/дублированные файлы и неправильные размеры не позволяют отметить матрицу завершённой.

## Текущее доказанное состояние

- GitHub Actions для этой ветки сейчас не показывает запусков; у HEAD нет check runs и commit statuses.
- Последняя известная попытка checkout завершилась ошибкой DNS: `Could not resolve host: github.com`. Поэтому актуальные D7 Node suites на настоящем checkout не подтверждены.
- Ранее изолированный V8 прогон optional graph adapter дал 504/504 проверок, 8/8 обновлений семейств компонентов и 8 групп регрессий. Это не настоящий Node checkout и не проверка последних изменений упаковщика/visual QA.
- PHP parity: 0 проб; Chromium ранее зависал даже на минимальной странице; реальные скриншоты и человеческая визуальная проверка не выполнены; реального ZIP и SHA256 архива нет.
- **D7 OPEN; Stage2 NO-GO; Stage3 не принят; 0/135 обязательных критериев.**

## Последняя проверка окружения — 25 октября 2026

- Повторная попытка `git ls-remote https://github.com/manufact-test/ai-site-cms.git refs/heads/feature/stage3-design-factory` завершилась ошибкой: `Could not resolve host: github.com`. Node.js 22.16.0 установлен, но реального checkout в рабочем окружении нет; шесть стабильных D7 suites и optional Lead suite на checkout не запускались.
- GitHub API подтвердил: для ветки 0 workflow runs; у audit-start HEAD 0 check runs и пустой список commit statuses.
- PHP CLI 8.4.24 установлен, но PHP parity не выполнялась (0 probes): без checkout и актуального Lead SDK это не было бы реальной проверкой.
- `/usr/bin/chromium` существует, но минимальная headless data URL-проверка зависла и была остановлена через 15 секунд (exit 124). Не создано ни одного реального скриншота.
- Реальный release ZIP не создан: CRC/central-directory, совпадение исходных байтов и SHA256 архива не проверены.
- Следовательно, три блока были проверены по одному разу и остаются заблокированными средой. Не повторяй попытки бесконечно; повтори их только после изменения доступа к сети/окружения.

## Следующие три больших блока

1. Не повторяй checkout-попытку, пока сеть/окружение не изменились. При появлении доступного checkout — один прогон шести стабильных D7 suites, отдельно optional Lead suite; не меняй workflows ради CI.
2. Выполни PHP parity и, если Chromium реально стартует, создай 54 скриншота при 1280×800, 768×1000 и 390×844 для проверки человеком. Если Chromium снова зависает, зафиксируй ошибку и двигайся дальше без повторов.
3. Собери source-byte-identical ZIP, проверь central directory, CRC, все исходные байты, детерминированность и реальную SHA256. Если checkout недоступен, не подменяй это синтетическим архивом и продолжай независимую source-level работу внутри разрешённой папки.

В конце большого прохода обнови `PROGRESS.md`, `QUALITY-GATES.md`, `INTEGRATION.md`, `README.md`, `NEXT-CHAT.md` и этот стартовый текст. Дай пользователю короткую сводку, фактический SHA и diff. **Никакого merge и никаких изменений вне `stage3/design-factory/`.**

Продолжаем. 🚀
