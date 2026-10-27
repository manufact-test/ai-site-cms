# AI Site CMS — передача ГЛАВНОМУ разработчику / интегратору v1.75

**Дата:** 27.10.2026
**Репозиторий:** https://github.com/manufact-test/ai-site-cms
**Рабочая ветка ТОЛЬКО:** feature/stage3-ai-site-contract
**Функциональный SHA после D6:** 32297b94b009c3fbe1cd6e730356261442d849cd
**Его полный CI:** https://github.com/manufact-test/ai-site-cms/actions/runs/40551009731 — **completed SUCCESS, оба job contract и technology-runtime**
**Последний до D6 полностью подтверждённый SUCCESS:** bf66650cefcea7159d81dad859e55baaaa50266a, https://github.com/manufact-test/ai-site-cms/actions/runs/40546024612
**Обязательное правило:** перед заявлением об успехе D6 проверить exact HEAD, CI head_sha, status=completed и conclusion=success. После сохранения этого документа появится docs-only HEAD — он не равен исходному SHA; отсутствие отдельного запуска CI у docs-only не означает, что код поменялся. Не подменять результат прежнего запуска новым HEAD.

## Роль и границы

Ты НОВЫЙ ГЛАВНЫЙ разработчик и единственный будущий интегратор AI Site CMS. Не являешься Design Factory-разработчиком. Design Factory ведёт второй независимый чат в feature/stage3-design-factory, только stage3/design-factory/**. НИКОГДА не редактируй чужую директорию, не объединяй ветки без отдельного задания владельца. На основной ветке main ничего не меняй.

Автономно разрешены код и CI в feature/stage3-ai-site-contract. Запрещены реальный деплой на Hostinger, CELIKOM, другие пользовательские сайты, реальные БД, миграции и live Email/Telegram, DNS, production traffic; нет auto-merge/PR merge без отдельного явного GO. Все visitor проверки только disposable 127.0.0.1 и ephemeral CI. Даже readiness PASS не равен разрешению на production.

## Инженерная работа после v1.74 — НИЧЕГО НЕ ПЕРЕДЕЛЫВАЙ

| Волна | Самостоятельный проверяемый результат | Коммит / точный CI |
|---|---|---|
| D1 | Immutable published HTML -> независимые PHP, Next Static, Next SSR runtime-пакеты; реальный Next build и SSR loopback, не CMS-сервер | 3d8b1314add56c6db96263983d835ac8747811cc / #40510082805 SUCCESS |
| D2 | Studio private releases/history/compare, подтверждённый handoff выбранной исторической версии, portable SHA256 JSON, offline build для четырёх технологий; CSRF/site scope | 9f00ad021090278711edd20bcf1c4c04ea7673ba / #40519245243 SUCCESS |
| D3 | Локальные неизменяемые слоты выпусков, атомарное локальное переключение, одноразовое подтверждение, PHP loopback preview и rollback, never deploy | 2248a4f3ccc5c10d5df16f025546dac44e70764d / #40526644375 SUCCESS |
| D4 | Реальный ZIP32 STORE, CRC32/SHA256 всех файлов, разделённые deploy/handoff, инструкции Apache/Nginx и правильные PHP private/web roots, честный Next SSR source-only | 420817c0dd7f63a43ac104cda896305b89f73171 / #40537925680 SUCCESS |
| D5 | Одна команда из D2 JSON для HTML/PHP/Next Static/SSR -> ZIP + SEO/forms/media/links readiness report; real Next Static npm build только после --allow-npm-install | bf66650cefcea7159d81dad859e55baaaa50266a / #40546024612 SUCCESS |
| D6 | Реальный localhost HTTP проход опубликованных страниц, media SHA256, 301, 404, HEAD и POST-denial, private-root protection; HTML/Next Static эмуляция static host, PHP actual router; --http-rehearsal opt-in в D5 + report. SSR не выдаётся за готовый runtime | 32297b94b009c3fbe1cd6e730356261442d849cd / #40551009731 SUCCESS |
 
Главные файлы: stage3/runtime-export/D1..., D2-PUBLISHED-HANDOFF.md, D3-LOCAL-CUTOVER.md, D4-VERIFIED-DELIVERY.md, D5-SHIPMENT-PREFLIGHT.md, D6-LOCAL-HTTP-REHEARSAL.md; stage3/runtime-export/bin/{build,build-handoff,package-handoff,release-manager,prepare-delivery,verify-delivery,audit-delivery,ship,rehearse-delivery}.cjs; stage3/studio/hosted.js; stage3/server/TechnologyHandoff.php.

D6 не доказывает production TLS, Apache/Nginx, Node SSR real deploy или доступность живого collector. PHP-only хостинг не поддерживает Next SSR. Новые страницы Next имеют стандартный регистронезависимый doctype — это учтено после первого CI. Историю проваленного промежуточного прогона НЕ выдавать за функциональную ошибку сайта. Функциональный SHA после исправления указан выше.

## Статус этапов: честное отделение кода от приёмки

Исходная карта — 18 этапов. Stage0 и Stage1 владельцем ПРИНЯТЫ. Stage2 технически оценивался на ~85–90%, **НО ФОРМАЛЬНО NO-GO** — незакрыты владельческие проверки #5–#9. В частности, независимая юридическая проверка NOTICE/лицензий (43 сторонних компонента), target-specific безопасность и маршрутизация LiteSpeed PHP_SAPI на Hostinger, web PHP sodium=false vs Ed25519 assumptions, private вне public_html и безопасная изоляция/БД/installer/rollback, проверка пустой CMS в целевом окружении и финальное разрешение владельца. Изолированные тесты не заменяют эти операции.

Stage3 код активно развивается в ветке, но **формально 0/135 обязательных требований принято**: 135 — обязательные пункты всего первого полноценного релиза (из 193: 135 обязательных, 42 желательных, 16 исключённых). Субъективная оценка 70–80% основы редактора из PROJECT-STATUS НЕ является математическим процентом завершения Stage3 или всех 18 этапов. A/B/C/D реализованы инженерно частями; не объявлять весь продукт завершённым.

Система намеренно не идёт по номеру каждого этапа последовательно. Разрешены изолированные исследования и код Stage3–12 параллельно ручным Stage2-гейтам. Stage13–16 и официальный GO/полный релиз остаются отдельными. Stage17 CELIKOM пилот и Stage18 последующая передача — только после полного продукта и отдельного разрешения.

## Почему кажется, что медленно, и что менять прямо сейчас

Мы провели 6 крупных выпусков D подряд, но они расширяли **один и тот же экспортный технологический поток**. Это инженерная работа, а не продвижение формальной приёмки. Следующий чат НЕ должен автоматически начинать D7/D8. Надо перенести приоритет с инфраструктуры экспорта на полностью собранный пользовательский продукт и проверяемые обязательные требования.

**Предпочтительный большой следующий макроблок — USER JOURNEY + COVERAGE:**
1. Прочитать requirements/requirements.csv и конкретную матрицу 135 mandatory пунктов; составить привязку каждого к существующим контрактам, Studio, PHP/public и реальному тестовому/приёмочному сценарию. Чётко разделить implemented / partial / absent / cannot-test-without-owner, НЕ назначать официальную приёмку.
2. Взять 2–4 больших функциональных пробела, найденных по реальным требованиям (в приоритете полный путь: новый сайт без дизайн-ТЗ -> визуальное редактирование адаптивного блока/Design Graph -> сохранение -> многостраничная публикация -> форма -> приватный inbox -> revision/restore -> независимый сайт). Ранее реализованное не переписывать: найти действительно отсутствующие элементы.
3. Довести один целостный сценарий от действия пользователя в hosted Studio до сайта и заявки с правильными permissions, сохранением ручных overrides и без auto-publish. Design Factory D7 не соединять, пока второй разработчик не отдаст отдельный handoff и владелец не разрешит.
4. Одно адресное E2E + существующий CI; не тратить заход на дополнительную обвязку уже завершённого ZIP. Начать закрывать конкретные mandatory gaps, а не очередные проверки там, где output готов.

Stage2 ручные #5–#9 выставить владельцу как отдельный **короткий blocking acceptance checklist**, НЕ пытаться обходить production ограничения. Внедрять улучшения в CI нельзя выдавая их за снятие owner approvals.

## Взаимодействие, скорость и передача

У пользователя ускоренный режим: одно «продолжаем» = **2–4 содержательных вертикальных пакета**, предпочтительно минимум 3 независимых результата; не зацикливаться на маленьких UI правках, дизайне и тестировании одного и того же. После крупного функционального изменения сохранить код в нашу ветку и проверить исходный HEAD и CI. Документы обновлять только когда владелец попросит перейти в новый чат.

Документы читать в начале: PROJECT-STATUS.json, docs/ROADMAP.md, docs/NEXT-CHAT.md, docs/ACCELERATED-MACROBLOCK-PROGRAM.md, stage3/README.md, stage3/runtime-export/D6-LOCAL-HTTP-REHEARSAL.md, этот MAIN-HANDOFF v1.75.

**Следующий чат — главный интегратор**. Текущий главный чат заканчивает функциональный D6 и передачу, не даёт права интегрировать Design Factory, merge или деплой.
