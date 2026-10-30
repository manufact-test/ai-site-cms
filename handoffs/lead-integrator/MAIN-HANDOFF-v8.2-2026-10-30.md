# MANUFACT AI Site CMS — главный разработчик / передача v8.2
**30.10.2026 · функциональная работа в отдельной ветке · без production**

## Сначала прочитай
1. `docs/MASTER-TZ.md` — безусловный источник продуктовой концепции (client-approved desktop/tablet/mobile static images → bespoke real website → edit/preview/Publish).
2. `handoffs/lead-integrator/MAIN-HANDOFF-v8.0-2026-10-30.md` и `MAIN-HANDOFF-v8.1-2026-10-30.md` — ограничения и предыстория.
3. `docs/ROADMAP.md`, `stage3/docs/APPROVED-SITE-PACKAGE.md` — последние разделы о Graph forms.
4. `handoffs/lead-integrator/FIRST-MESSAGE-v8.2-2026-10-30.md` — готовый текст начала следующего чата.

## Репозиторий и границы
- `manufact-test/ai-site-cms`, рабочая **только** `feature/stage3-ai-site-contract`. Перед любым изменением запроси актуальный HEAD и Actions именно этого SHA.
- Ни `main`, ни прод/Hostinger/реальные клиенты/секреты, ни `stage3/seo-engine/**` не трогать. SEO-разработчик работает отдельно на `feature/site-seo-engine`; не делать merge без ручной координации.
- Не оживлять закрытую старую Design Factory, не создавать генератор HTML/шаблонную фабрику, не выдавать синтетические mockups за утверждённые.
- 135 MUST: **124 implemented engineering candidates / 5 partial / 6 owner-environment gates**, **0 ownerAccepted**. Не менять цифры без доказательств из ledger и человека.

## Что действительно разработано в последнем длинном заходе
1. Исправлен пропущенный контракт реального Graph form-slot в двух SQL-readiness/diagnostics фильтрах `stage3/server/SiteOperations.php` предыдущего этапа; коммит `5b97ecf0c3d2248d584d37f7ea0f3f7af7bb411d`, Actions [41128719014](https://github.com/manufact-test/ai-site-cms/actions/runs/41128719014), 2/2 SUCCESS. Это уже подтверждённая точка.
2. Sandbox Graph Studio больше не показывает пустую заглушку для формы: отображает реальные подписанные поля и дополнительные вопросы из существующего `lead-form`/`lead-form-flex` section, типы input/textarea/select/radio/checkbox, локализованные подписи, progress, consent, кнопки, условные поля (визуальный индикатор). Визуал **не имеет form tag, POST action или токена**, элементы disabled. Меню предпросмотра позволяет переключить шаг multi-step не меняя данные и без запуска visitor flow.
3. В существующем авторском Design Graph появились закрытые `formAppearance`, `formAppearanceTablet`, `formAppearanceMobile` только для `form-slot`: gap, radius/padding поля и кнопки, labelWeight, цвета фона/бордюра/кнопки/текста. Значения численно ограничены и цвет — HEX либо существующий `@color-token`. JS и PHP независимые валидаторы отвергают неизвестные свойства и небезопасные values.
4. Studio Graph Inspector позволяет менять эти параметры по ПК/планшету/телефону; JS sandbox и public PHP Graph renderer создают совпадающие scoped CSS custom properties. CSS обычных форм за пределами Graph сохранён. Published form всё ещё монтируется только сервером: исходные sign/HMAC/anti-spam/storage/delivery unchanged.
5. Добавлены точечные JS contract, PHP public Graph и Chromium browser tests, обновлён standalone Studio `bundle.js` из его исходников; нет нового сервера, webhook, vendor dependency или несанкционированной публикации.

## Исходники этого изменения
- `stage3/sdk/design-graph.cjs`: `renderInertForm`, строгие appearance helpers, media vars, scoped preview CSS.
- `stage3/server/DesignGraph.php`: независимая валидация и CSS variables; `stage3/server/PublicRenderer.php`: применение к настоящим опубликованным input/submit без замены защищённого form.
- `stage3/studio/app.js`: formFields focus, form-step picker, per-device appearance Inspector; `stage3/studio/bundle.js`: собранное зеркало.
- `stage3/tests/contract-smoke.cjs`, `stage3/tests/studio-browser.cjs`, `stage3/tests/graph-interactions-smoke.php`: строго функциональная регрессия.
- Исходный крупный коммит: `2098301d4743e81e69d35a456ddb16aaf5f88da4`. Первый его Actions #41129904353 поймал **ошибку регулярного выражения в новом тесте**, не маскировать. Следующий коррекционный SHA `87cfa81bce74dabd338f321061329dfb56dd5bb8`. Перед объявлением результата смотри более поздний финальный HEAD и CI.

## Как действовать дальше: ускоренный большой блок, не тестовый марафон
1. Взять одну реальную вертикаль из MASTER-TZ: например, **точное редактирование/визуальная проверка approved-site custom component** на всех трёх ширинах, либо сделанный текущий Graph form-slot довести до реального owner preview + Save/Publish/rollback в существующем потоке, проверив действительно живые поля, action и семантику. Не строить очередной набор шаблонов.
2. Любые пользовательские изменение дизайна сохранять типизированным contract; реальные формы/сохранённые заявки — через существующий PHP signer/collector, без клиентских секретов.
3. Брать сразу несколько сопряжённых функций, работать **не меньше 30 минут реального времени** по просьбе Ильи; не возвращаться через 3–12 минут с «законченным большим блоком». Минимальные релевантные проверки, в конце обязательные оба jobs GitHub Actions именно последнего SHA.
4. После большого блока обновить этот handoff, Roadmap и Approved Site Package; подготовить полностью готовое первое сообщение для очередного чата. Оставить `main`/прод неизменными.

## Известные ограничения / честные gates
- Offline Graph fields are disabled representation, not true visitor form. PHP draft/public preview is the behavioral authority. Multi-step visual selector does not submit. Real customer-approved screenshots and visual sign-off are still missing.
- Validating field CSS against approved screenshots still requires actual prototype media and human review; appearance vars are deliberately a finite safe set, not full CSS or iframe import.
- External secure form delivery and production infrastructure await explicit owner configuration and GO. Никаких утверждений «всё уже принято» или «готов прод» в отчётах.

**Передача:** обновления хранятся в той же ветке, HEAD/Actions получаются заново непосредственно в следующем чате. Документы исторические v8.0/v8.1 сохранять.