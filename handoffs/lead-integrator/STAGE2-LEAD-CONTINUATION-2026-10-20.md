# AI Site CMS — главный разработчик / интегратор — передача 21.10.2026

> Только для главного чата и следующего главного разработчика проекта. Не является общим ROADMAP, NEXT-CHAT, ADR или актом приёмки Stage2. Не изменять параллельные исследовательские документы.

## Самое важное: новый рабочий договор с владельцем

**Промежуточные обновления на Hostinger ЗАПРЕЩЕНО требовать.** Ранее владелец справедливо возмутился необходимостью снова и снова вручную менять одну и ту же папку. Он подтвердил новый режим: главный разработчик самостоятельно делает большие связанные блоки задач, сохраняет код в GitHub, прогоняет реальные PHP/MySQL/Browser/E2E в изолированных GitHub Actions, собирает пакеты внутри GitHub. Физический Hostinger НЕ трогать и не просить владельца загружать ZIP после каждой публикации. **Одна согласованная финальная реальная приёмка позже**, после максимальной подготовки. Не просить пользователя вручную выполнять микрозадачи. Входящих запросов на загрузку прямо сейчас нет. Документы сохранять по запросу о переходе чата, а не после каждой задачи.

Автоматические реальный Hostinger GET-проверки сознательно выключены в `.github/workflows/stage2-hostinger-target-php.yml`. Только отдельный `workflow_dispatch` на `main` с `inputs.approval=STAGE2_FINAL_HOST_READONLY_GET` после разрешения владельца. Это НЕ право установить БД и НЕ деплой. Shared SSH недопустим: затрагивает несколько сайтов.

## Точная контрольная точка разработки, перед текущим handoff-docs коммитом

- Репозиторий: https://github.com/manufact-test/ai-site-cms
- Ветка главного интегратора: `main`.
- Последний полностью проверенный **исходный код**: `7261f70c2861aec161aa811dc5f34049cd5d4cfe`.
- PHP/ядро/MySQL 8.4: **7/7 SUCCESS**, https://github.com/manufact-test/ai-site-cms/actions/runs/39509444292
- Jedison/Editor/E2E, браузер, Nginx, FPM, откаты/аварии: **SUCCESS**, https://github.com/manufact-test/ai-site-cms/actions/runs/39509444220
- Проверенная публикация offweb-пакета внутри GitHub: **SUCCESS**, https://github.com/manufact-test/ai-site-cms/actions/runs/39509801653
- Файлов в runtime-пакете: **478**, после реального скачивания из Actions повторно сравнены побайтово; 9 hostile-fixture checks пройдены.
- SHA-256 *неподписанного* package-manifest.json: `f6af3312dc019a2cdbb0d7ebda24ba50952c669446d519e301d37fd9bab48405`.
- Head изолированной исходной offweb-ветки `stage2-hostinger-offweb-runtime`: `c7c6bdb556b66c85eb2e38643f89f8006b6f9c92`.
- Подтверждённый artifact #12305420817: https://github.com/manufact-test/ai-site-cms/actions/runs/39509801653/artifacts/12305420817
- Отдельный artifact побайтового evidence #12305795416: https://github.com/manufact-test/ai-site-cms/actions/runs/39509801653/artifacts/12305795416
- Промежуточные падавшие publisher jobs при гонках/stale SHA были ожидаемо отклонены; ориентироваться на приведённый позднейший успешный run. **На реальном Hostinger этот 478-файловый пакет НЕ устанавливался.**
- Handoff-only docs-коммит изменит SHA `main`, не код. Перед продолжением всегда перечитать текущий `main` и CI. Не притворяться, что docs SHA совпадает с проверенным source SHA.

## Последний крупный блок — physical schema spoofing / recovery hardening

Коммиты исходников: `4ac0a7138d2710235b2f470df728b459b79e2f9e`, `7261f70c2861aec161aa811dc5f34049cd5d4cfe`.
- `cms/src/Storage/SchemaManager.php`: ещё **до DDL** проверяет уже существующий журнал миграций (`cms_schema_migrations`), типы/NOT NULL/ключи/default/количество столбцов и `BASE TABLE / InnoDB`. После миграции и при `inspectSite/assertSite` проверяет также физическую схему `cms_installation`, включая уникальность site_id и тип поколения. Никакого автолечения повреждений.
- `cms/tests/storage-mysql-faults.php`: настоящая одноразовая MySQL 8.4; инъекции фальшивого журнала, неподходящего VARCHAR вместо CHAR, MyISAM, удалённого unique site_id, физического drift; сохраняет данные и требует отказа до миграции. **41 PASS** в последнем CI.
- `cms/tests/hostinger-stage2-oneshot-mysql.php`: тот же отказ через упакованный CLI Hostinger `verify`, с независимым visitor-фикстурой, секреты consumе-once, штатным восстановлением только в CI; **100 PASS**.
- Проверка полной упакованной CMS/двух независимых MySQL: **125 PASS**; реальные Hostinger/production сети или MySQL не использовались.
- Предыдущий блок 20/21.10: защита от чужих таблиц, представлений, ROUTINES/EVENTS/TRIGGERS (включая изменение после установки) с fail-closed. Лабораторный trigger создаёт только изолированный CI root из-за binlog-ограничений, не предлагается изменять гранты Hostinger.
- Предыдущие блоки: read-only SESSION для probe/verify с тестом реального отказа MySQL DDL, отдельный explicit install, одноразовая фиксация authorization, manifest-pin, безопасный revoke, reproducible Composer `COMPOSER_ROOT_VERSION=0.2.0-alpha1` при внутреннем `0.2.0-stage2.1`, байтовая сверка 478 файлов после скачивания, exact-release hash при финальном read-only host observer r8.

## Исследовательские потоки — НЕ интегрированы текущим чатом

- PR #3 Security: https://github.com/manufact-test/ai-site-cms/pull/3 — open DRAFT, около 22 исследовательских файлов в `research/parallel-security/`, последний наблюдённый HEAD `de1d2e40491764aa60ef0f665797a3b694fc95e4`.
- PR #4 Editor/Components: https://github.com/manufact-test/ai-site-cms/pull/4 — open, изменения только в `research/parallel-components/` (около 36), последний наблюдённый HEAD `7dc3284c5a6421c4b841a3275ced812e9ce5fae7`.
- Эти HEAD быстро меняются: заново проверить в момент review, область изменений, результаты независимого CI, adversarial tests, patch, историческое происхождение, не обойти исследования через спонтанный cherry-pick. Не менять ветки других исполнителей. PR #1/#2 ранее исследовательски squash-merged, их материалы не автоматически приняты как продукт.

## Hostinger — оставляем без изменений до итоговой проверки

- Сайт тестовой CMS: `lightseagreen-woodpecker-264491.hostingersite.com`.
- Независимый visitor-сайт: `mediumpurple-fox-175549.hostingersite.com`.
- Только тестовый `public_html/index.php` readonly observer r7 и sibling `cms-stage2-offweb-runtime` со старой сборкой на Hostinger; подтверждена работа read-only Slim kernel ранее. **Там НЕ новая r8/478.** Частные секреты в `cms-stage2-local`, не менять.
- Actual Hostinger: PHP 8.3, LiteSpeed; native Sodium отсутствовал по прежнему измерению; натурное MySQL probe и DDL не выполнены; лицензионный и crypto release gate остаются открытыми.
- GitHub Environment содержит имена секретов `CMS_DB_HOST/NAME/USER/PASSWORD`, но это не локальная конфигурация PHP Hostinger. Никогда не выводить сами значения.
- Обновления Hostinger отменены до единого заранее согласованного периода финальной приёмки. Не путать успешную offweb GitHub-публикацию с деплоем.
- `cms-stage2-local` и посетительский сайт изолированы; нет прямого доступа к Hostinger File Manager через GitHub connector. Shared SSH нельзя использовать.

## Открытые условия завершения Stage2

1. Продолжать крупными GitHub-only блоками с реальной MySQL8.4, PHP 8.1–8.4, Chromium/E2E, восстановлением и безопасностью, закрывать архитектурные и supply-chain gaps; не раздувать этап бесконечными бессодержательными тестами.
2. Исследовать и проверить реальную совместимость отсутствующей Sodium (кандидат sodium_compat 2.5.2 в одноразовой тестовой среде, **не** в составе production lock), провести independent license/security review всех **43 компонентов**, подписанный release-траст и доказательство publisher key ownership.
3. Когда готова финальная кандидатная версия, получить разовое согласие владельца на реальную Hostinger-проверку r8, физическую изоляцию и read-only MySQL probe. Никакого shared SSH и автодеплоя на другие сайты.
4. Перед единственным **разрешённым отдельно** write install пустой тестовой базы требовать точного согласия, строгих грантов и безопасного восстановления; метаданные foundation snapshot не являются полноценным бэкапом содержимого/медиа.
5. Только после доказательств и отдельного согласия владельца принять Stage2. **Stage2 НЕ ПРИНЯТ. Stage3 НЕ НАЧАТ. 0/135 продуктовых обязательных функций принято.** No production-ready claims.

## Правила следующего главного чата

1. Подключиться к GitHub, прочитать этот файл и `handoffs/lead-integrator/STAGE2-LEAD-PHYSICAL-SCHEMA-CHECKPOINT-2026-10-21.md`, посмотреть текущий `main` SHA, CI, offweb branch и оба PR.
2. Работать на `main` только в главном направлении, батчами из нескольких больших связанных шагов, CI до отчёта. Отчёт содержит изменения и реальные ссылки GitHub.
3. **Не просить пользователя обновлять папки Hostinger каждую итерацию.** Работать полностью автономно в GitHub в рамках уже выданного доступа.
4. Не обновлять lead handoff, общие docs/NEXT-CHAT.md, PROJECT-STATUS.json, docs/ROADMAP.md, ADR или документы параллельных веток после каждой задачи. В конце следующего чата — по просьбе пользователя.
5. Не выдавать успешный CI за завершение Stage2 и не начинать Stage3 без принятия.


## ИЗМЕНЕНО v1.48 / 21.10.2026 — ЭТОТ ФАЙЛ ИСТОРИЧЕСКИЙ

Актуальная полная передача в [`MAIN-HANDOFF-v1.48-2026-10-21.md`](MAIN-HANDOFF-v1.48-2026-10-21.md). Verified code `8b59e0718a867920bd5d7890e55c5b002facd354`; [PHP 8/8](https://github.com/manufact-test/ai-site-cms/actions/runs/39587975849), [Editor/E2E](https://github.com/manufact-test/ai-site-cms/actions/runs/39587976040), [offweb 478/478](https://github.com/manufact-test/ai-site-cms/actions/runs/39588269636). Stage2 не принят, Stage3 не начат, 0/135. Hostinger/PR #3/#4 не изменялись; этот legacy handoff не предписывает новые host действия.
