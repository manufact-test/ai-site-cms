# AI Site CMS — главный интегратор / передача v1.48 (21.10.2026)

> **Актуально для следующего главного чата.** Этот файл заменяет старые инструкции передачи v1.43–v1.47, но не переписывает историю. Документация обновлена только по прямому запросу владельца после завершения большого блока. Этот коммит — **docs-only**, а проверенный исходный код закреплён отдельным SHA.

## 1. Точная проверенная контрольная точка

- Репозиторий https://github.com/manufact-test/ai-site-cms, основная ветка `main`.
- **Проверенный исходный код:** `8b59e0718a867920bd5d7890e55c5b002facd354` — https://github.com/manufact-test/ai-site-cms/commit/8b59e0718a867920bd5d7890e55c5b002facd354.
- **PHP 8.1–8.4, native, SQLite, реальная disposable MySQL 8.4, настоящий Sodium-free PHP 8.3 и pinned CI-only кандидат:** **8/8 SUCCESS** — https://github.com/manufact-test/ai-site-cms/actions/runs/39587975849.
- **Jedison/Chromium/editor, full package, crash recovery, signed ZIP / independent PHP verification, PHP HTTP, Nginx/Apache isolation:** **SUCCESS** — https://github.com/manufact-test/ai-site-cms/actions/runs/39587976040.
- **Пакет для вручную согласуемой загрузки Hostinger (только публикация GitHub, НЕ деплой):** **SUCCESS**, после скачивания проверены **478/478 файла**, 11 hostile upload checks и 9 hostile round-trip checks — https://github.com/manufact-test/ai-site-cms/actions/runs/39588269636. ZIP artifact https://github.com/manufact-test/ai-site-cms/actions/runs/39588269636/artifacts/12341017684. SHA-256 unsigned internal package manifest: `ab5d58a984c27a10d901c0c8ffb5256100c44685ed5509a8a3e07cc4ad8d772b`. Это integrity, **НЕ** подпись реального publisher.

**Stage0 и Stage1 приняты. Stage2 НЕ ПРИНЯТ, Stage3 НЕ НАЧАТ. Продуктовая приёмка 0/135 обязательных функций.** 18 этапов (0–17), исходные 193 требования (135 необходимых, 42 желательных, 16 не нужны) не изменены. НЕТ production админки, AI генерации, реальных форм, login/ACL/публикации.

## 2. Большой законченный блок текущего чата

Устранено реальное архитектурное расхождение: PHP LabPackageStager до этого допускал упрощённую «тестовую» схему внутреннего release manifest при любом подтверждённом SHA. Такое исключение в реальном проверяющем коде небезопасно. Убрали второй разрешённый формат, все синтетические Node/PHP сценарии перевели на **точный полный Node release JSON**.

Теперь PHP для любого релиза требует одни и те же ключи в порядке: `format, stage, releaseVersion, productionReady, documentRoot, adminEditorAssets, hostingComposerOrNodeRequired, writeEndpointsAvailable, isSigned, files`, фиксированные safety флаги и bytes-level canonical JSON: двухпробельный pretty JSON, один финальный перевод строки; отвергаются дубли ключей, escaped-key aliases, изменения пробелов и прочие эквивалентные по `json_decode` представления, **даже если SHA256 пересчитана и предоставлена заново**. Node уже имел строгий canonical verify; теперь PHP parity соответствует Node для реального пакета. Это не решает ownership real publisher key.

Изменены: `cms/src/Release/LabPackageStager.php`, `cms/tests/lab-package-stager.php`, `cms/tests/lab-generation-switcher.php`, `cms/tests/lab-generation-leases.php`, `cms/tests/lab-foundation-checkpoint.php`, `cms/tools/test-lab-trusted-upgrade.cjs`, `cms/tools/test-lab-php-http-switch-crash.cjs`. Первый прогон выявил несовместимые старые синтетические фикстуры; они исправлены **через обновление фикстур, не через ослабление verifier**. Последний кодовый SHA имеет зелёные 8/8 + Editor/E2E + offweb.

Накопленные исправления предыдущих заходов: sealed source snapshot before signed ZIP verification/extraction; strict filesystem inode/permissions and journals; canonical DB foundation snapshot and rollback; запрет новых публичных HTTP файлов в Stage2 (`public/index.php` + `public/.htaccess`); Node path collisions/limit/hardlink validation; криптографические lab подписанные Ed25519 цепочки включая реальные native vs Sodium-free проверки. Не объявлять эти доказательства физическими Hostinger power-loss tests или production signing approval.

## 3. Research PR — не сливать автоматически

- **PR #3 Security/Dependencies:** https://github.com/manufact-test/ai-site-cms/pull/3 — OPEN DRAFT, постоянно развивается; HEAD следует заново проверить (на момент текущего handoff наблюдались смены). Исследование в `research/parallel-security/`, не править чужую ветку и не считать независимый review завершённым без отдельного анализа результатов.
- **PR #4 Editor & Components:** https://github.com/manufact-test/ai-site-cms/pull/4 — OPEN, HEAD `a8f46853830fe89ee6fc4e2c616be853421eac3d`, https://github.com/manufact-test/ai-site-cms/actions/runs/39577376803 SUCCESS, исследовано 17 блоков. Читайте `research/parallel-components/MAIN-INTEGRATOR-HANDOFF-2026-10-21.md` именно в ветке `research/editor-component-patterns`. Принципы для будущего: native HTML / keyboard/no-JS, revision+capability boundaries, read-only preview/CSP, CSRF/Origin/Host/throttle/delivery-state, responsive media. НИЧЕГО не переносить в production без real user auth/ACL, tenancy, transaction/rollback, transport inbox, actual media pipeline и Stage3 authorization. PR #2 ранее отдельно интегрирован.
- Не менять репозиторные папки research и не создавать бессмысленных «product accepted» фиксаций из 598 PHP + 69 Python лабораторных проверок PR #4.

## 4. Hostinger: жёсткая граница

Разрешённые исторические два тестовых Hostinger-сайта: CMS `lightseagreen-woodpecker-264491.hostingersite.com` и visitor `mediumpurple-fox-175549.hostingersite.com`. В предыдущем owner-authorized тесте на LiteSpeed PHP8.3 вручную размещён **СТАРЫЙ 473-file unsigned** private offweb snapshot, read-only Slim4 synthetic kernel health GET 200, visitor GET 200, но публичный CMS /api/health оставался 503. Это **не 478-файловый свежий пакет** и **не установленная полноценная CMS с MySQL/admin**.

Владелец категорически запретил повторные промежуточные просьбы «загрузи ZIP, поменяй папку». Работать автономно только GitHub. **Никакого Hostinger HTTP/SSH/File Manager/DB/deploy** до одного заранее одобренного финального read-only r8 визита; **ОТДЕЛЬНОЕ** разрешение на конкретный write-install чистой тестовой базы. Общий SSH нельзя, посетительский сайт/другие сайты/БД/CELIKOM не трогать. GitHub Environment `stage2-hostinger-lab` содержит имена DB secrets, но это не верификация доступа Hostinger, секреты не раскрывать. GitHub public сознательно разрешён бесплатно владельцем. Никакого требования купить private/другие тарифы.

Старый Hostinger web PHP **без Sodium**; лабораторная sodium_compat 2.5.2 проверена физически без расширения, **не** одобрена для production Composer lock без независимого review; не жертвовать криптографическим уровнем ради простого деплоя.

## 5. Незакрытые критерии Stage2

1. 43 lock-tracked зависимости: independent human license/NOTICE/security/supply chain review, а не автоматические SBOM hashes только.
2. Независимая проверка publisher signing key ownership/custody и out-of-band trust, юридическая оценка и стратегия Ed25519 без native Sodium на реальном LiteSpeed; lab ephemeral key-pairs не являются реальными production ключами.
3. Реально согласованный owner-once read-only Hostinger r8: scope exact test CMS files, read-only MySQL identity/permissions, safe isolation/visit; затем с отдельным explicit consent безопасный empty target schema install и проверка восстановления, CMS-only outage while visitor unaffected. `FoundationSnapshot` включает только метаданные, а НЕ полноценный бэкап данных/медиа.
4. Owner Stage2 acceptance после выполнения exit matrix. **Stage3 не открывать** и не «реализовывать пока» формы, редактор, AI публикацию.

## 6. Правила ведения следующего чата

Сначала прочитать `docs/NEXT-CHAT.md` LAST §53, этот файл, `PROJECT-STATUS.json`, `docs/DEVELOPMENT-WORKFLOW.md`, `docs/STAGE-2-EXIT-REVIEW.md`. Сверить fresh `main`, PR #3/#4 и CI. На команду «продолжаем» выполнять **несколько крупных связанных задач единым вертикальным блоком**, GitHub-only `main`, реальный CI (PHP 8/8, Editor/Chromium, offweb exact SHA), без дробления на тестовые мелочи. Не обновлять документы автоматически каждый цикл — **только по запросу о переходе в следующий чат**. При передаче всегда давать source-tested SHA, отдельно docs-only SHA, ссылки на успешные run. Не обещать фоновую разработку.

**Следующий технический приоритет:** крупные оставшиеся реальные Stage2 gaps — issuer trust/custody chain, human licenses/NOTICE, независимая крипто-review evidence, точные условия owner final host r8, без изменений фактического Hostinger и без Stage3. Продолжать самостоятельно с GitHub.
