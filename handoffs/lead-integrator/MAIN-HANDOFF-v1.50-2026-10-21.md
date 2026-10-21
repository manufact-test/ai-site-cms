# AI Site CMS — handoff v1.50 / 21.10.2026

**По прямой просьбе владельца перед сменой чата. Новый приоритет разработки: PRODUCT-FIRST, КРУПНЫЕ ФУНКЦИОНАЛЬНЫЕ БЛОКИ, МИНИМУМ НУЖНЫХ ТЕСТОВ.** Это правило имеет приоритет над прежней привычкой добавлять очередные лабораторные отрицательные проверки вместо реальной CMS. См. docs/DEVELOPMENT-WORKFLOW.md (первый раздел).

## 1. Верифицированный источник и GitHub

- Репозиторий https://github.com/manufact-test/ai-site-cms; ветка main; проверенный код b6de6197d3c5d93731c58934bda7c7107f9cb191.
- Реальный PHP8.1–8.4, MySQL8.4, SQLite, собранный без native Sodium PHP8.3: **8/8 SUCCESS** https://github.com/manufact-test/ai-site-cms/actions/runs/39653777321.
- Jedison real Chromium Browser, offline product preview smoke + существующая полная E2E: **SUCCESS** https://github.com/manufact-test/ai-site-cms/actions/runs/39653777497.
- Отдельная GitHub-only подготовка, загрузка, скачивание и сверка Hostinger offweb пакета **480/480 SUCCESS** https://github.com/manufact-test/ai-site-cms/actions/runs/39654243799; ZIP https://github.com/manufact-test/ai-site-cms/actions/runs/39654243799/artifacts/12371630071.
- SHA256 манифеста 1cf4e6978de209a9563d6be1ce44e7b79db36aab205f8a875c8f9cb3067c4748. UNSIGNED, не доказывает publisher identity.
- Снимки рабочей демонстрации **desktop и mobile** https://github.com/manufact-test/ai-site-cms/actions/runs/39653777497/artifacts/12369558045.
- Этот документ и остальные обновления — отдельный docs-only коммит ПОСЛЕ проверенного source. При продолжении сверить новый HEAD.

## 2. Что реализовано в этом заходе

**Рабочая вертикаль локального preview:** cms/stage2-preview/ (доступен в source, исключён из Hostinger runtime distribution). Набор зависимых результатов:

1. Закрытая allowlist-модель страницы: 6 типов секций, поля/максимальные длины, три готовые темы, строгая валидация JSON.
2. Безопасный полноразмерный responsive HTML preview: современная промышленная главная, benefits, story, testimonial, FAQ, CTA. Тексты экранируются, iframe sandbox/script-src none, никакой отправки данных.
3. Пользовательский интерфейс управления блоками: добавить, удалить, дублировать, поднять/опустить; полноценная панель свойств на Jedison.
4. Десктоп/мобилка, три цветовых решения, редактирование названия страницы, импорт и экспорт JSON только в локальном браузере.
5. Один реальный критический Chromium smoke: редактирование изменяет видимый h1, markup отображается текстом, add section, mobile, theme, экспорт, без сетевых запросов. Screenshots как артефакт для обсуждения визуала.
6. Простая инструкция запуска cms/stage2-preview/README.md; Node нужен только один раз для сборки встроенного в репозиторий editor/dist/editor.js, в дальнейшем можно открывать локальный HTML.

**Точно НЕ реализовано:** production auth/RBAC, проектный API, persist черновиков, SQL content storage, медиа, реальный publish, AI builder, формы отправки, backup пользовательского сайта, реальный Hostinger deploy. Демонстратор НЕ является Stage3 и не засчитывает продуктовые 135 требований.

## 3. Состояние Stage2 и внешние блокеры

Stage0+1 ACCEPTED. Stage2 engineering estimated **~85–90%**, остаётся ~10–15% ПРИ УСЛОВИИ реальных внешних подтверждений. Stage2 FORMALLY NOT ACCEPTED; Stage3 NOT STARTED; 0/135 mandatory product accepted; 18 stages total. Восемь формальных ручных gates owner decision по-прежнему не закрыты: законность и безопасность 43 pinned зависимостей, identities/trust anchors production Ed25519, целевой LiteSpeed PHP no-Sodium, один separately permissioned read-only Hostinger check, dedicated empty test database install only under another owner permit, visitor outage/isolation/recovery, owner signoff. Полная истина в docs/STAGE-2-EXIT-REVIEW.md и docs/STAGE-2-OWNER-EVIDENCE-CUSTODY.md. Не считать package SHA2556 доказательством подписи/права.

## 4. Как теперь работать (ОБЯЗАТЕЛЬНО)

- Каждая команда «продолжаем» = от 3 больших связанных реальных функциональных deliverables с одним видимым результатом для владельца: открыть сайт/редактор, изменить, увидеть, сохранить/восстановить в рамках разрешённого этапа.
- Инвестировать время в код продукта, UX, реальные сценарии и исправления после просмотра. Не останавливаться на одной микрозадаче или после первой маленькой проверки.
- Не проектировать и не тестировать заранее десятки несуществующих подсистем. Новым пользовательским функциям обычно хватает 1 критического browser smoke; после пакета одна агрегированная существующая CI. Конкретные баги/риск безопасности — исключение. Уже действующие safety/security CI gates не отключать.
- Ранний UX-показ: desktop/mobile mock screenshot и локально запускаемая демка. Потом при разрешённом Stage3 — настоящий auth → content edit → draft → preview → publish end-to-end, не россыпь компонентов.
- Чётко разделять блокирующие реальную приёмку Stage2 owner/host/legal действия и доступное GitHub-only развитие. Не объявлять false GO или фиктивные проценты.
- Hostinger, visitor, CELIKOM, другие сайты, общий SSH, реальные БД не трогать без явного scope approval. Исследовательские PR#3 и PR#4 оставить открытыми, не auto-merge.
- Документацию сохранять только по явной просьбе владельца на переход чата. Текущая передача разрешена владельцем.

## 5. Первое сообщение

Скопировать целиком последний текст под заголовком «§55 — первое сообщение» из docs/NEXT-CHAT.md. Пользователь просит не распылять разговор на тесты и не затягивать этап 2 искусственно.
