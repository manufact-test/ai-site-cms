Привет! Продолжаем ускоренную разработку MANUFACT AI Site CMS.

Ты — главный Lead Integrator проекта. Продолжай существующую Stage3 реализацию, не начинай CMS заново и не смешивай работу с Design Factory или SEO.

## GitHub

Репозиторий: https://github.com/manufact-test/ai-site-cms  
Рабочая ветка: feature/stage3-ai-site-contract  
Последний полностью проверенный функциональный SHA: 0047aef57537f7dd2c405eadcc44f4f54ab6aa8d  
Полный CI: https://github.com/manufact-test/ai-site-cms/actions/runs/41322050889 — оба job SUCCESS.

Сначала получи актуальный HEAD ветки и прочитай:
- docs/NEXT-CHAT.md
- docs/CMS-ENGINE-UPDATE-ROLLBACK-DESIGN.md
- docs/HOSTINGER-STAGING-ADDENDUM.md
- handoffs/lead-integrator/MAIN-HANDOFF-v9.12-2026-11-01.md

Если текущий HEAD отличается от 0047aef, проверь, что последующие коммиты только документационные; не делай reset и не переключайся на main.

## Что уже сделано

- Исправлено закрытие site-tools dialog после logout; Chromium regression теперь проходит.
- Проверяется восстановление owner-сессии, если первая загрузка сайта возвращает HTTP 503. Тест ждёт стабильный GET /api/engine и отрисовку версии.
- Добавлен shared-host .htaccess на mod_rewrite, совместимый по набору директив с LiteSpeed; FallbackResource, RedirectMatch и FilesMatch не используются.
- .htaccess включён в подписанный PHP-host package inventory и verifier.
- Добавлен disposable Apache 2.4 + PHP 8.3 smoke: CLI install в SQLite-копию, Studio, assets, PHP session, owner login, API, engine status, hidden paths, direct PHP, directory listing.
- Run #41322050889 прошёл полностью, включая Apache smoke.

## Следующая большая задача

Подготовить и выполнить безопасный Stage3 staging на реальном shared hosting. CI Apache container не считается проверкой Hostinger/LiteSpeed.

Но перед любыми host-side write actions:
1. Подтверди точный staging provider и hostname.
2. Уточни, какую ветку отслеживает внешний Hostinger Git auto-deploy. Эта настройка не видна через GitHub connector.
3. Если цель — Hostinger, используй только ранее подготовленные тестовые сайты и только после подтверждения владельца.
4. Shared/general SSH запрещён. Не используй его.
5. Не используй Stage2 database credentials или stage2-hostinger-lab secrets для Stage3 без отдельного разрешения.
6. Рассмотри hPanel Cron Jobs как возможный CLI путь без shared SSH. Для этого сначала разработай приватный one-shot runner: CLI-only, private env file, plan first, apply отдельно по подтверждению, redacted output, self-disable. Никаких публичных installer/shell endpoints.
7. Проверь web PHP через hPanel PHP Info, document root, mod_rewrite/AllowOverride, приватную директорию, MySQL 8.0+, изоляцию от основного домена.
8. Только после подтверждения владельца выполняй read-only install plan, затем отдельно согласованный apply на выделенной тестовой БД.

Дальше: desktop/tablet/mobile, save/reload, publish, rollback, forms и test notifications, backup/restore, security, owner acceptance.

## Регламент

- Работа крупными функциональными блоками, ускоренно.
- Не повторять бесконечно зелёные тесты.
- Исправлять конкретные дефекты, а не закрытые задачи без новых доказательств.
- Не делать merge/rebase в main.
- Не выполнять production deployment без отдельного согласования.
- Не считать CMS готовой только по зелёному CI: нужна реальная staging-проверка и приёмка владельцем.

В конце следующего большого блока обнови документацию, зафиксируй функциональный SHA/CI и подготовь передачу следующему чату.
