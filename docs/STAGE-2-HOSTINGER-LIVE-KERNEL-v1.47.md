# AI Site CMS — Stage 2 live Hostinger checkpoint v1.47 (20.10.2026)

**Это фактический read-only тест, не production CMS, не завершённая установка.**
Код [da6e646f6d36d91e8a7b33b33e31a0c10605e856](https://github.com/manufact-test/ai-site-cms/commit/da6e646f6d36d91e8a7b33b33e31a0c10605e856); [PHP 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638513); [Editor/package 1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638339); [реальный Hostinger r6 14/14 GET](https://github.com/manufact-test/ai-site-cms/actions/runs/39462638427); [автоматическая сборка](https://github.com/manufact-test/ai-site-cms/actions/runs/39462530006).

## Реально подтверждено

- Утверждённый стек Slim 4 + Opis 2.6 + Jedison 1.27.1. Владельцем утверждена архитектура.
- Два разрешённых Hostinger Business сайта: CMS `lightseagreen-woodpecker-264491.hostingersite.com`, независимый visitor `mediumpurple-fox-175549.hostingersite.com`. Владелец разрешил строго scoped read-only проверку, изолированную пробную установку и controlled outage **только CMS**, не shared SSH и не другие хосты.
- В отдельной папке CMS **рядом с** `public_html`, а не в общем корне аккаунта и не внутри webroot, пользователь вручную распаковал `cms-stage2-offweb-runtime`. База — 473 файла, из них 472 в проверенном SHA-256 манифесте; PHP `/__stage2/offweb-package` на реальном Hostinger вернул 200 с `offwebPackageIntegrityVerified=true`.
- **НОВОЕ v1.47:** Hostinger LiteSpeed PHP 8.3 на `/__stage2/kernel/smoke` вернул 200 и `realSlimKernelHealthPassed=true`. Это *реальное выполнение* Slim-ядра с зависимостями из указанной папки: synthetic GET `/api/health` создаётся PHP только после полного хеширования unsigned package. Не передаются клиентские параметры или credentials, БД не используется.
- Само публичное `/api/health` тестовой CMS намеренно по-прежнему отвечает **503 not_installed**. `/api/publish` = 404; vendor/editor/.git/внутренний манифест по прямому HTTP = 403/404; независимый visitor = 200.
- Реальный GET observer отчёт r6: **14/14 PASS**, `offwebCompiledPackageVerified=true`, `realReadOnlyKernelHealthObserved=true`, `allChecksPassed=true`. Фиксируем GitHub Actions и JSON evidence, не приравниваем HTTP 200 к приёмке.
- Публичный автодеплой Hostinger остаётся на `stage2-hostinger-cms-preflight` (строго `index.php` + `.htaccess`); `main` и `stage2-hostinger-offweb-runtime` никогда не привязывать к `public_html`. GitHub **public** по решению владельца, платный Private не требовать. Никогда не помещать passwords/tokens в репозиторий или в HTTP preflight.
- Версия PHP поддерживает PDO MySQL/OpenSSL, **не имеет native Sodium**. Изолированная CI-only проба `paragonie/sodium_compat 2.5.2` прошла без ext Sodium, но библиотека ещё не включена в release lock: нужна security/license проверка без ослабления Ed25519.
- В отдельных disposable CI — полноценная MySQL 8.4, SQLite, Nginx/Apache + PHP-FPM, тесты сборки, восстановления, повреждённых файлов; запуск реального Slim на LiteSpeed закрывает только **health-path**, не весь lifecycle.

## Что НЕ выполнено

- На Hostinger не проверено подключение к **выделенной** тестовой MySQL, DDL/migrate/schema/install, write-аутентификация, установка/backup/restore целевого хоста, controlled CMS outage и независимая доступность visitor *во время отключения*. В GitHub Environment `stage2-hostinger-lab` уже существуют 4 DB secrets, это НЕ значит, что PHP сервера получил их.
- Нет production signed release, юридической независимой проверки 43 зависимостей, готовых editor/admin, client license runtime, AI generator, реальной публикации сайтов.
- Формально Stage0/1 ACCEPTED, **Stage2 NOT ACCEPTED**, Stage3 NOT STARTED, 0/135 mandatory features accepted. Stage2 никакими percent estimations не закрывать.
- `private_sibling_git_deployment_not_verified` в отчёте относится к **необязательному маркеру** отдельной папки; реальная **ручная** выкладка готовой папки и проверка SHA-256 теперь доказаны отдельно. `target_web_sapi_requires_compatibility_review` частично исследован успешным Slim health, полный lifecycle не принят.

## Продолжение

1. Первым делом прочитать ПОСЛЕДНИЙ **§52** `docs/NEXT-CHAT.md` и `PROJECT-STATUS.json`; исторические блоки v1.43–v1.46 больше не актуальные сведения. Все документы уже в GitHub.
2. Большой технический блок **Stage2**: безопасно решить реальное target DB credential delivery/connection и изолированный CLI schema install в тестовой CMS без общего SSH и HTTP установщика; провести права на dedicated MySQL DB, health/rollback/outage при продолжающей работать visitor. Не создавать фальшивый CI success вместо target deployment evidence.
3. Если для безопасной установки требуется действие владельца — сформулировать **один** конкретный пакет, без платных тарифов, Private, токенов или множества мелких запросов.
4. На обычные «продолжаем» выполнять 3+ связанные существенные задачи; документацию обновлять **только по явной просьбе** при следующем переходе, как сейчас.
