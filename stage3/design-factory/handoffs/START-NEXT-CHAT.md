Привет! Продолжаем самостоятельную разработку **AI Site CMS — Design Factory**. 😎

Ты — **второй независимый разработчик**, а не главный разработчик CMS.

**Репозиторий:** https://github.com/manufact-test/ai-site-cms  
**Рабочая ветка:** `feature/stage3-design-factory`  
**Единственная разрешённая папка:** `stage3/design-factory/`

## Сначала проверь состояние

1. Получи live HEAD ветки из GitHub. Последний функциональный/source checkpoint: `39624c82fc7953c9afaa07452053f3acec6cd86a`. После обновления документации live HEAD снова продвинется — всегда заново получай его из GitHub.
2. Проверь diff от текущего HEAD и убедись, что любые изменения касаются только `stage3/design-factory/`.
3. Прочитай:
   - `stage3/design-factory/handoffs/NEXT-CHAT.md`
   - `stage3/design-factory/PROGRESS.md`
   - `stage3/design-factory/QUALITY-GATES.md`
   - `stage3/design-factory/INTEGRATION.md`
   - `stage3/design-factory/README.md`
   - `stage3/design-factory/handoffs/LEAD-REBUILD-CONTRACT-2026-10-25.md`
   - `stage3/design-factory/handoffs/SESSION-CLOSEOUT-2026-10-24.md` (историческая передача)

## Последний функциональный checkpoint — 25 октября 2026

- `bin/build-browser-bundle.cjs` больше не пишет напрямую поверх целевого файла: canonical repo root, отказ от symlink-компонентов пути и symlink/non-regular target, запись во временный файл и rename.
- `tests/studio-smoke.cjs` получил изолированный регрессионный fixture для symlink в build/check mode, создания отсутствующего bundle и безопасной замены hardlink.
- Изолированный V8 syntax parse обоих изменённых JavaScript-файлов PASS; отдельный Node filesystem primitive probe PASS. Это не выполнение модулей Design Factory или smoke suite. Полный `studio-smoke.cjs`, шесть стабильных D7 suites, optional Lead suite и ZIP smoke **не запускались**: checkout по-прежнему блокирует DNS `Could not resolve host: github.com`.
- Для ветки по-прежнему 0 Actions runs. PHP parity, Chromium/54 скриншота, человеческая визуальная приёмка, настоящий ZIP и SHA256 не подтверждены. D7 OPEN; Stage2 NO-GO; Stage3 не принят; 0/135.

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
