Привет! Продолжаем ускоренную разработку **MANUFACT AI Site CMS**.

Ты принимаешь проект как главный **Lead Integrator**. Не начинай CMS заново и не смешивай работу с отдельными Design Factory или SEO-разработчиком.

## Контрольная точка

**Репозиторий:** https://github.com/manufact-test/ai-site-cms  
**Рабочая ветка:** `feature/stage3-ai-site-contract`  
**Последний функциональный SHA:** `73deff8626b66308b011a52dd27e1508795920ac`  
**Полный CI:** [#41340074041](https://github.com/manufact-test/ai-site-cms/actions/runs/41340074041) — SUCCESS, оба задания зелёные.

Сначала проверь реальный HEAD и точный статус CI. Не откатывайся к старым SHA и не повторяй уже реализованные функции.

## Последний завершённый блок

1. Реализована сборка Hostinger sibling-layout package: runtime `stage3/` и публичный `public_html/` формируются соседними папками.
2. Добавлена строгая проверка пакета: только два публичных файла, точные копии шаблонов, read-only, защита от symlink/tamper/extra files.
3. В hosted install runner добавлена команда `--probe`: безопасная проверка PHP CLI до подготовки секретов и базы.
4. Свежий Hostinger artifact с новым probe: [artifact 13097246593](https://github.com/manufact-test/ai-site-cms/actions/runs/41340074041/artifacts/13097246593).

## Важные сведения по Hostinger

По присланным владельцем скриншотам:
- `lightseagreen-woodpecker-264491.hostingersite.com` подключён к GitHub repo `ai-site-cms`, auto-deployment включён, отслеживает ветку `stage2-hostinger-cms-preflight`, root directory — `public_html`.
- `mediumpurple-fox-175549.hostingersite.com` не подключён к Git.

Не переключай существующую ветку и не пушь Stage3 в `stage2-hostinger-cms-preflight`. Архив должен распаковываться на уровне домашней директории аккаунта, чтобы `stage3/` и `public_html/` были соседями. Распаковка внутри `public_html` раскроет runtime.

## Следующий приоритет

Подготовить и выполнить изолированное staging-развёртывание на реальном shared hosting, но только в рамках явно подтверждённого владельцем scope:

1. Подтвердить целевой staging-сайт и безопасный способ загрузки/распаковки.
2. Проверить возможность запуска PHP CLI через hPanel Cron и полный список web roots аккаунта.
3. Использовать отдельную пустую MySQL 8.0+ базу и приватную директорию 0700.
4. После разрешения на загрузку разместить пакет в sibling layout.
5. Сначала выполнить `php .../hosted-install-runner.php --probe` — без секретов и без записи.
6. Затем подготовить приватный config и выполнить read-only `--plan`.
7. `--apply` запускать только после отдельного явного решения владельца.
8. После установки проверить Studio, сохранение, публикацию, откат, формы, уведомления и адаптивность.

## Регламент

- Никакого production deployment без отдельного согласования.
- Не менять main, не использовать shared/general SSH, не трогать Stage2 secrets/DB.
- Не считать зелёный CI приёмкой CMS: формально принято 0/135.
- Работаем функциональными блоками, не гоняем одни и те же тесты без новых оснований.
- Документация уже обновлена в этом handoff; не переписывай её повторно без новых изменений.

Подробности: `docs/NEXT-CHAT.md`, `handoffs/lead-integrator/MAIN-HANDOFF-v9.14-2026-11-01.md`, `stage3/docs/HOSTED-INSTALL-RUNNER.md`, `stage3/docs/STAGING-SHARED-HOSTING.md`, `docs/HOSTINGER-STAGING-ADDENDUM.md`.

Продолжай с текущего состояния.
