# AI Site CMS — каноническая передача v1.55 (23.10.2026)

**УСКОРЕННАЯ ПРОГРАММА — ОБЯЗАТЕЛЬНО ДЛЯ СЛЕДУЮЩЕГО ЧАТА.** Репозиторий: https://github.com/manufact-test/ai-site-cms, `main` (публичный на момент передачи). Точная CODE SOURCE: `3e4452845e3ca169d0a3593c381c7c1347667d6d`. Этот документ — последующий docs-only commit; не путать SHA документации и прошедшего тесты кода.

## 1. Жёсткий ускоренный режим

Пользователь хочет максимально быстро закончить ВСЮ CMS, затем тестировать готовый продукт и вносить практические правки. Каждое «продолжаем» означает **один КРУПНЫЙ ЗАКОНЧЕННЫЙ СКВОЗНОЙ ПОДЭТАП**, состоящий из нескольких значимых частей (данные → модель → действие → интерфейс → сохранение/результат). Не дробить на задачи на 5–10 минут. Не тратить время на многократное исправление несущественных «болячек», косметику сырого Stage2 preview или десятки новых тестов. Сначала рабочий функционал, затем **один необходимый Chromium/browser smoke и существующий CI**. Реальные обнаруженные баги и security-контроли исправлять; защиту ради скорости не отключать. Релиз и оригинальная качественная CMS — главная цель, ZIP лаборатории и скриншоты пользователю без запроса не навязывать. Обновлять canonical docs **только по прямой просьбе о смене чата**, как сейчас.

## 2. Проверенная кодовая контрольная точка

- CODE SOURCE [`3e4452845e3ca169d0a3593c381c7c1347667d6d`](https://github.com/manufact-test/ai-site-cms/commit/3e4452845e3ca169d0a3593c381c7c1347667d6d).
- [Editor + Chromium, run 39921738553](https://github.com/manufact-test/ai-site-cms/actions/runs/39921738553): **SUCCESS** на SOURCE.
- [Offweb package, run 39922188174](https://github.com/manufact-test/ai-site-cms/actions/runs/39922188174): **SUCCESS** на SOURCE (предыдущие stale-SHA отказы промежуточных runs — нормальный fail-closed, не отключать).
- [PHP/MySQL/SQLite/no-Sodium, run 39921738856](https://github.com/manufact-test/ai-site-cms/actions/runs/39921738856): **SUCCESS, 8/8** на CODE SOURCE.
- База до текущего захода: `a3703c3907fdba0999107124a5f9d9c99db7f520`; на ней PHP 8/8, Editor и package были успешными. После неё добавлен offline owner action kit, не реальная установка.

## 3. Действительно сделано после v1.54

- **Фактический сайт из брифа:** три связанные редактируемые страницы; реальные списки товаров/услуг, этапов и FAQ вместо выдуманных данных. Контактные сведения и SEO, офлайн HTML/JSON/ZIP, фото WebP/ALT/focus.
- **Межсайтовый перенос целой страницы** между независимыми local workspaces: секции, медиа, композиция, SEO, безопасные независимые slug и внутренние действия, Undo/Redo и persistence.
- **Массовая синхронизация реальных материалов уже созданного сайта:** обновление товаров, услуг, этапов/FAQ во всех применимых блоках без пересоздания сайта, предварительное сравнение, фото остаются за прежним точным названием, сохранение дизайна, контактов и SEO.
- **LiteSpeed/LSAPI offline boundary:** отдельный анализ `Stage2LiteSpeedBoundary.php`, canonical `cms/public/index.php`, optional test-only `CMS_STAGE2_REQUIRE_LSAPI_MAPPING`; при нарушении 503, FPM-гейт независим. Это не доказательство target Hostinger и не разрешение на инсталляцию.
- **Последний блок v1.55:** `cms/tools/stage2-handoff-index.cjs` теперь автоматически строит `stage2-owner-actions.md` и `stage2-owner-actions.html` с 5 человеческими gate-заданиями, ответственными, требуемыми доказательствами и ссылками на issues #5–#9. Оба документа входят в SHA-256 индекс действующего owner/legal handoff с проверкой изменений через `test-stage2-handoff-index.cjs`; проверка воспроизводится вне GitHub Actions с исходным SHA. Хеш не является доверенной подписью.

## 4. Реальный статус проекта, не смешивать разные проценты

Из **18 этапов сейчас Stage 2**, «Адаптация выбранной основы и архитектура». Этапы 0 и 1 приняты. Stage2 технически ≈**85–90%** подготовлен (≈10–15% инженерной части плюс внешние согласования; оценка не KPI), но **ФОРМАЛЬНО НЕ ПРИНЯТ**. Stage3 **НЕ НАЧАТ**, 0/135 обязательных продуктовых требований официально приняты; по ROADMAP для первого релиза нужны 135/135 (193 всего, 42 желательных, 16 не нужны). Offline Stage2 Studio **не** является рабочей AI CMS, CMS auth/API/publisher и настоящим Hostinger-сайтом. Нельзя заявлять общую готовность продукта 90%.

## 5. Критический путь к переходу Stage3: пять внешних gate

1. [#5](https://github.com/manufact-test/ai-site-cms/issues/5) — независимое human legal/security заключение по 43 pinned deps и NOTICE, подтверждение личности и полномочий проверяющего.
2. [#6](https://github.com/manufact-test/ai-site-cms/issues/6) — реальные publisher/owner/operator trusted keys, независимые SPKI public pins и security-reviewed Ed25519 verifier **без Sodium** для реальной LiteSpeed PHP 8.3 среды. Лабораторные CI-ключи НЕ production.
3. [#7](https://github.com/manufact-test/ai-site-cms/issues/7) — отдельное, узкое, human-signed READ-ONLY разрешение на конкретные два пустых Hostinger test origins, endpoints, сроки и оператора; только после него реальные запросы/наблюдения.
4. [#8](https://github.com/manufact-test/ai-site-cms/issues/8) — отдельное разрешение НА ЗАПИСЬ в строго выбранную пустую тестовую CMS/MySQL, доказательство visitor isolation, безопасного controlled outage и rollback. READ-ONLY не даёт WRITE-разрешения.
5. [#9](https://github.com/manufact-test/ai-site-cms/issues/9) — формальное GO/NO-GO решение владельца по Stage2 после #5–#8. Только после GO можно начать Stage3.

#5 и #6 допускают параллельную подготовку; #7 до #8. Доказательства CI, документы и GitHub issues **не создают разрешения**. Реальный Hostinger / общий SSH, клиентские сайты, CELIKOM, секреты, ключи и PR #3/#4 без нового scope не трогать и не merge. CMS на Hostinger пока не установлена (/api/health = 503 NOT INSTALLED по последнему подтверждённому наблюдению), Sodium в PHP целевого сервера отсутствует.

## 6. Стратегия следующего чата

Порядок чтения: этот файл → `docs/NEXT-CHAT.md §60` → `docs/STAGE-2-ACCELERATED-EXIT-BOARD.md` → `docs/DEVELOPMENT-WORKFLOW.md` → `PROJECT-STATUS.json` → `docs/ROADMAP.md` → `docs/STAGE-2-EXIT-REVIEW.md`. Сверить `main`, exact CI. Не создавать новые многочисленные тесты или UI-функции offline Studio в ущерб реальному завершению. Если требуется человек/согласие — указать чётко зависимость и следующие допустимые действия, а не имитировать закрытие gate. После явного owner GO — приступать к крупным end-to-end продуктовым возможностям CMS. В каждом отчёте обязательно 2/18, технический остаток 10–15%, внешние gates, отдельный прогресс по 0/135.

## 7. Первое текстовое сообщение

Привет! Продолжаем самостоятельную разработку **AI Site CMS**: https://github.com/manufact-test/ai-site-cms, ветка `main`. Сначала подключись к GitHub и прочитай **handoffs/lead-integrator/MAIN-HANDOFF-v1.55-2026-10-23.md**, **docs/NEXT-CHAT.md §60**, **docs/STAGE-2-ACCELERATED-EXIT-BOARD.md**, **docs/DEVELOPMENT-WORKFLOW.md**, **PROJECT-STATUS.json**, **docs/ROADMAP.md** и **docs/STAGE-2-EXIT-REVIEW.md**. Наш CODE SOURCE `3e4452845e3ca169d0a3593c381c7c1347667d6d` — Editor/Chromium https://github.com/manufact-test/ai-site-cms/actions/runs/39921738553 (SUCCESS), offweb package https://github.com/manufact-test/ai-site-cms/actions/runs/39922188174 (SUCCESS), PHP/MySQL/no-Sodium https://github.com/manufact-test/ai-site-cms/actions/runs/39921738856 (SUCCESS, 8/8); docs-only SHA будет новее. **У НАС УСКОРЕННАЯ ПРОГРАММА:** каждый мой запрос «продолжаем» = один **КРУПНЫЙ ЗАКОНЧЕННЫЙ ПОЛЕЗНЫЙ СКВОЗНОЙ ФУНКЦИОНАЛЬНЫЙ БЛОК**, а не микрозадача. Сначала максимально много нужной функциональности, затем один необходимый browser smoke + существующий CI; никаких бесконечных лабораторных тестов, постоянных переправлений одной мелочи или косметики offline demo. Нужно **быстрее закончить настоящую CMS целиком, затем вносить правки по реальному использованию**. Статус: Stage0+1 приняты; Stage2 = 2/18, ≈85–90% технически (≈10–15% осталось + внешние согласования), **формально НЕ принят**; Stage3 НЕ начат; 0/135 обязательных функций продукта приняты. Последние блоки: factual brief → editable site, full-page transfer между local sites, массовое обновление фактов без потери дизайна/SEO/фото, LiteSpeed/LSAPI offline boundary и новый проверяемый owner-action bundle в `cms/tools/stage2-handoff-index.cjs` с `stage2-owner-actions.html/.md`. Сейчас критический путь — независимые issues **#5–#9** (43-dep legal/security; реальные trusted keys и no-Sodium; отдельный READ-ONLY Hostinger scope; отдельный WRITE MySQL/visitor isolation/rollback scope; явный owner GO). Не трогай Hostinger/SSH/секреты/реальные БД/клиентов/CELIKOM и PR3/PR4 без отдельного ограниченного разрешения, Stage3 без GO не начинай. Документы обновлять только перед переходом чата по моему запросу. Снова бери большой разрешённый блок, не тормозим. Спасибо!
