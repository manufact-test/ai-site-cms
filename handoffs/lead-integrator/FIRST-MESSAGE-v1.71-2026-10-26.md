Привет! Продолжаем AI Site CMS — **ты главный разработчик/интегратор**, а не второй разработчик Design Factory.

GitHub: https://github.com/manufact-test/ai-site-cms
Твоя ветка: `feature/stage3-ai-site-contract`. Сначала прочитай `handoffs/lead-integrator/MAIN-HANDOFF-v1.71-2026-10-26.md`, `PROJECT-STATUS.json`, начало `docs/NEXT-CHAT.md`, `docs/ROADMAP.md` и `stage3/README.md`. Затем проверь **актуальный HEAD + CI**.

Последний полностью зелёный код `ac483807cc2f2ac302f6fed3470cac4cfb795896` — CI https://github.com/manufact-test/ai-site-cms/actions/runs/40346327511 (SUCCESS). После него добавлен крупный функционал визуального редактора вложенных узлов Design Graph (добавление, копирование, удаление, Undo и адаптивные свойства). Последний функциональный SHA `f366592db0267faaabfd5b01e7aa6f4f87e02ef4` имеет FAILED CI #40374870144. Документационный SHA перед этой передачей `59a8f038615e26afcd36951bda6392352e92e80a` имеет FAILED #40375523554. Это не является подтверждённой Stage3-интеграцией.

**Самый первый небольшой блок:** разберись с hosted E2E после server Save: статус `#server-status` не приходит в `Без изменений`, `#server-publish` остаётся disabled. Проверь `Stage3Editor.isDirty()` vs серверную ревизию/normalized save, `state.busy`, `canPublish()` в `stage3/studio/hosted.js` и проблемный тест `stage3/tests/hosted-browser.cjs`. Не обходи правила публикации. Сделай один целевой фикс и стандартный CI, не очередные часы тестов.

Затем берись **за большой блок**, как мы работаем: полная многосекционная/многостраничная визуальная сборка с формами и медиа → предпросмотр → сохранение → публикация. Не дроби задачи на мелочь! Stage2 технически 85–90%, но NO-GO #5–#9. Stage3 ядро предварительно ~65–75% по инженерной оценке, НЕ приёмка: 0/135 формально принятых, всего 18 этапов. Без MVP.

**Второй чат** отдельно делает Design Factory в `feature/stage3-design-factory`, `stage3/design-factory/**`. Не меняй эту ветку, не выполняй его работу и не объединяй без моего прямого разрешения.

Запрещены `main`, Hostinger, production/реальные БД, live Email/Telegram, CELIKOM, auto-merge. Работа через GitHub, conditional SHA lease, один большой блок на «продолжаем», минимум критических тестов. После завершения большого блока показывай реальный SHA, CI и остаток работ, не завышай проценты.
