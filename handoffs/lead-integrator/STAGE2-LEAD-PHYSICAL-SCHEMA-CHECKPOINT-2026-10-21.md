# AI Site CMS — Stage2 physical-schema guard, CI-only checkpoint (21.10.2026)

> Техническое приложение **главного разработчика** к `STAGE2-LEAD-CONTINUATION-2026-10-20.md`. Только внутренняя разработка, не подтверждение развёртывания.

## Цель
Не позволять чужой или повреждённой таблице с именем `cms_installation` или `cms_schema_migrations` притвориться штатной схемой и добиться DDL или штатного запуска CMS. Поскольку MySQL DDL не транзакционен, проверка должна происходить **до** изменения структуры.

## Изменения
- `SchemaManager::migrate()` проводит проверку уже существующего MySQL-журнала перед `CREATE TABLE IF NOT EXISTS`.
- `SchemaManager::verifyMysqlTable()` использует `information_schema.TABLES` + `SHOW COLUMNS` только для двух статически разрешённых таблиц. Строго требует физический `BASE TABLE`, `InnoDB`, штатное число столбцов, точные типы, NOT NULL, нужные PRI/UNI, дефолты и отсутствие дополнительных модификаторов.
- `SchemaManager::verifyStructure()` применяет проверки к обоим таблицам, а `assertSite()` не разрешает reuse при неверной структуре. До этого already-existing SQL защищает от чужих tables/views/routines/events/triggers.
- `storage-mysql-faults.php` проверяет подделку журнала CHAR→VARCHAR, MyISAM, удалённый UNIQUE у site_id, смену движка у installation и восстановление только лабораторной фикстуры.
- `hostinger-stage2-oneshot-mysql.php` дополнительно проверяет, что реально упакованный read-only `verify` отвергает повреждение и всё равно потребляет one-time authorization; чужие visitor-файлы остаются нетронутыми.

## Доказательства
- Тестируемый source SHA: `7261f70c2861aec161aa811dc5f34049cd5d4cfe`
- PHP/MySQL8.4 7/7: https://github.com/manufact-test/ai-site-cms/actions/runs/39509444292
- Editor/E2E successful: https://github.com/manufact-test/ai-site-cms/actions/runs/39509444220
- 41 MySQL physical/foreign-schema fault checks; 100 Hostinger CLI checks; 125 packaged dual-MySQL/HTTP checks.
- Source offweb publish: https://github.com/manufact-test/ai-site-cms/actions/runs/39509801653 (SUCCESS, 478/478 exact files; nine downloaded-archive hostile fixtures PASS)
- Manifest SHA256: `f6af3312dc019a2cdbb0d7ebda24ba50952c669446d519e301d37fd9bab48405`
- Offweb branch SHA `c7c6bdb556b66c85eb2e38643f89f8006b6f9c92`
- Все эти доказательства — GitHub CI на одноразовых хостах, НЕ доказательство исполнения на Hostinger.

## Границы
- Функция `SHOW COLUMNS` — фиксированные имена CMS. Не вводит динамических пользовательских SQL имён.
- Ограничения типа `default`/движка определены для схемы Stage2 v2; следующие миграции требуют обновления явного контракта. Это fail-closed, не универсальный ORM.
- Проверка схемы — не защита от компрометации самого привилегированного MySQL-сервера и не заменяет физическую изоляцию/GRANT review и owner approval.
- Запрещено автоматически исправлять/удалять чужие объекты, выдавать это за готовый производственный installer или применять фикстуры к реальной базе.
- Промежуточные обновления Hostinger владельцу не предлагать. Финальная проверка позже и по отдельному разрешению.

## Наиболее полезная следующая большая задача
Аудит и доказательство цепочки trust/подписи Stage2 и Sodium-free PHP на настоящем extension-free runtime; одновременно проверить независимый license-review и supply-chain доказательства из параллельного PR #3 (только после фиксации и review его точного SHA). Не переносить polyfill в runtime без полной проверки. Завершить блок CI-проверками.
