# AI Site CMS — передача главного интегратора v1.49 (21.10.2026)

> Последняя каноническая передача по просьбе владельца. Исторические v1.48 и старше НЕ задают текущий SHA. Последующие docs-only коммиты не считать повторной проверкой исходного кода.

## Проверенная контрольная точка

- GitHub: https://github.com/manufact-test/ai-site-cms · основная ветка `main`; репозиторий public ради GitHub Actions.
- **ПРОВЕРЕННЫЙ КОДОВЫЙ SHA: `b3237fc2426ad246178b3fd4b64501c6b22c86ba`** — https://github.com/manufact-test/ai-site-cms/commit/b3237fc2426ad246178b3fd4b64501c6b22c86ba.
- **PHP 8/8 SUCCESS**: версии 8.1/8.2/8.3/8.4, реальная disposable MySQL 8.4, SQLite, физически собранный PHP 8.3 без Sodium: https://github.com/manufact-test/ai-site-cms/actions/runs/39623780590.
- **Editor / Chromium / E2E SUCCESS**: реальный Nginx/PHP-FPM, две независимые CMS, пять site families, ZIP, release verification, crash/recovery: https://github.com/manufact-test/ai-site-cms/actions/runs/39623780667.
- **Offweb GitHub-only SUCCESS**: ZIP загружен и скачан из GitHub; **479/479 файлов byte-exact**, 11 hostile upload + 9 roundtrip checks: https://github.com/manufact-test/ai-site-cms/actions/runs/39624303691. Artifact: https://github.com/manufact-test/ai-site-cms/actions/runs/39624303691/artifacts/12355179613.
- **SHA256 unsigned package manifest** `112f9fd7adf5ac3f0717047967453b2de14a6b1647c5cc12e2358f7ddf0508bc`. Это integrity checksum, **НЕ** publisher signature и не release authorization.

## Выполненные связанные большие задачи после v1.48

1. **Изолированное Ed25519 owner consent**: создание offline-only scope grant без хранения реальных приватных ключей в репозитории, внешний публичный pin, раздельные private directories, запрет повторного подписания/перезаписи, expiry/origins и single-use anti-replay. `cms/tools/stage2-owner-consent-sign.cjs`, `stage2-owner-consent.cjs`.
2. **Безопасное чтение файлов и неавторизованной операторской информации**: Node `O_NOFOLLOW`, PHP inode/descriptor validation, защита secret-bearing one-shot task и snapshot, отказ при symlink/hardlink, noncanonical JSON, небезопасных правах, TOCTOU. `cms/tools/stage2-evidence-bundle.cjs`, `cms/src/Hosting/Stage2PrivateOperatorRecord.php`.
3. **Защита MySQL/SQLite install**: generic `cms/bin/install.php` допускает MySQL-запись только на **три точных disposable CI DB/user/pw профиля**, с явным CI grant; запрещено применять его к Hostinger. Целевая установка — отдельное человеческое решение и scoped one-shot. SQLite сверяет physical DDL, CHECK/UNIQUE/PK/index/trigger inventory; MySQL — реальные индексы, CHECK/unique/engine, foreign routines/events/triggers. Отказ без auto-repair. `cms/src/Storage/SchemaManager.php`.
4. **Ключевой последний `b3237fc2426ad246178b3fd4b64501c6b22c86ba`**: нельзя связать owner-signed read-only grant с unsigned operator HTTPS/DB claims. Owner review разрешает двойную проверку только с отдельно **подписанным operator evidence bundle**, отдельным independently pinned key. Поле `evidenceCustody` и HTML-report разграничивают verified transport signatures и остающиеся **НЕ подтверждёнными** identity, actual host TLS, MySQL, owner legal signoff, write/install и Stage3. CLI/direct API и negative tests не позволяют подменить report при отказе. `cms/tools/stage2-owner-decision.cjs` + E2E.
5. **Сквозной результат**: все три workflow выше SUCCESS. Ни одного реального обращения к Hostinger или изменения visitor.

## Приёмка и реальные границы

**Stage0+1 ACCEPTED, Stage2 IN PROGRESS / НЕ ПРИНЯТ, Stage3 НЕ НАЧАТ, 0/135 mandatory product requirements.** Всего 18 этапов (0–17); scope 193 = 135 mandatory +42 desirable +16 not-needed; релиз только full 135/135, без урезанного MVP. Foundation A: Slim4 + Opis JSON Schema 2.6 + Jedison 1.27.1, RJSF backup.

Открытые внешние gates: независимый human 43-component license/NOTICE/security review; доказанное реальное владение publisher/owner/operator Ed25519 ключами и решение об отсутствии native Sodium на целевом LiteSpeed; только отдельная явно разрешённая финальная read-only target r8 (physical paths, TLS, PHP SAPI, MySQL identity/privileges); *отдельный* owner grant на пустую тестовую DB install и visitor continuity/restore/outage; явное ручное согласие владельца принять Stage2. Никаких автоматических галочек `accepted` из CI.

**Исторический Hostinger r6 (20.10.2026)**: CMS `lightseagreen-woodpecker-264491.hostingersite.com`; отдельный visitor `mediumpurple-fox-175549.hostingersite.com`; LiteSpeed PHP 8.3 без native Sodium; вручную ранее установлен unsigned **473-file** комплект; read-only kernel smoke 200, CMS /api/health 503 NOT INSTALLED. **Новый 479-file GitHub ZIP на Hostinger НЕ загружен**. Общие SSH, другие сайты, данные клиентов, CELIKOM и production deployment НЕ трогать.

PR3 https://github.com/manufact-test/ai-site-cms/pull/3 — OPEN DRAFT независимый security/dependencies research, head на момент передачи `79da57441997dc8e6e11f7ae83d327b0e4cea64a` (перепроверить). PR4 https://github.com/manufact-test/ai-site-cms/pull/4 — OPEN editor research, head `a8f46853830fe89ee6fc4e2c616be853421eac3d`. **Не merge автоматически и не менять их branches.**

## Следующий разработчик: протокол

СНАЧАЛА читать `docs/NEXT-CHAT.md` ПОСЛЕДНИЙ §54, этот handoff, `PROJECT-STATUS.json`, `docs/DEVELOPMENT-WORKFLOW.md`, `docs/STAGE-2-EXIT-REVIEW.md`, `docs/STAGE-2-OWNER-EVIDENCE-CUSTODY.md`; затем сверить новый `main`, HEAD/CI PR3/PR4. На обычное «продолжаем» делать один крупный batch нескольких содержательных связанных улучшений, настоящие PHP 8/8 + Editor/Chromium/E2E + GitHub offweb проверка. **Документацию обновлять ТОЛЬКО по отдельной просьбе владельца**, при очередной передаче отличать docs-only SHA от tested source SHA. Stage3, Hostinger, visitor, общие аккаунты/SSH, несанкционированный install/deploy запрещены.

Приоритет: независимое human license/security review по 43 pins и owner/publisher/операторскому trust custody; затем одно permissioned read-only Hostinger r8, отдельное согласие на DB install и recovery, затем явная Stage2 acceptance. Не подменять продуктовый прогресс новыми микротестами.
