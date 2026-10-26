Привет! Продолжаем **AI Site CMS** — ты **главный разработчик/интегратор**, а не разработчик Design Factory.

GitHub repo: https://github.com/manufact-test/ai-site-cms
ТВОЯ ветка: `feature/stage3-ai-site-contract`
На момент handoff исходный functional HEAD: `f366592db0267faaabfd5b01e7aa6f4f87e02ef4` — https://github.com/manufact-test/ai-site-cms/commit/f366592db0267faaabfd5b01e7aa6f4f87e02ef4
Полный CI на код: https://github.com/manufact-test/ai-site-cms/actions/runs/40374870144 — **сначала проверь, завершился ли SUCCESS; передача не заявляла зелёный результат**. Последний точно подтверждённый SUCCESS: `ac483807cc2f2ac302f6fed3470cac4cfb795896`, https://github.com/manufact-test/ai-site-cms/actions/runs/40346327511

Прочитай с приоритетом:
- `handoffs/lead-integrator/MAIN-HANDOFF-v1.70-2026-10-26.md`
- `PROJECT-STATUS.json`
- `docs/NEXT-CHAT.md`
- `docs/ROADMAP.md`
- `docs/DEVELOPMENT-WORKFLOW.md`
- `stage3/README.md`
- `stage3/docs/AI-DESIGN-COMPOSITION.md`

Что есть: реальные офлайн и hosted Studio, PHP drafts/publications, визуальная правка всей страницы, тексты/медиа/формы, атомарная карта сайта, условные лид-формы, вложенные Design Graph с адаптивными стилями. Последний заход добавил из визуального холста `+ текст`, вложенный текст, дублирование/удаление узла и Undo; проверка in-browser roundtrip дополнена. В последнем hosted CI был риск: `#server-publish` disabled при переходе после Reload. Кодовый SHA `f366592` поменял порядок save/publish/reload и ждёт чистый черновик; проверь конечный CI и исправь только реальную причину, если ещё FAIL. **Не заявляй SUCCESS до проверки**.

Границы: Stage2 технич. 85–90%, формальный NO-GO gates #5–#9. Stage3 разрешён только в изолированной ветке, 0/135 официально принятых. 18 этапов, без MVP. Нельзя `main`, Hostinger, реальные БД/клиентские сайты, live Email/Telegram, CELIKOM, prod, автослияния.

ВТОРОЙ чат = только независимая **Design Factory** на `feature/stage3-design-factory` внутри `stage3/design-factory/**`. Ни в коем случае не работай за него и не меняй его ветку/дерево. Будущая интеграция только после готового артефакта, разрешения владельца и матрицы потерь.

**Наша ускоренная программа:** одно «продолжаем» — большая цельная пользовательская задача, не серия мелких тестов; существующий full CI + один критичный E2E; дорабатываем действительно полную CMS и дальше проверяем практикой. Документы обновляй только при явной просьбе о переходе.

Ты главный, продолжай от АКТУАЛЬНОГО HEAD с SHA lease, ничего не откатывай и не меняй роль! 🚀
