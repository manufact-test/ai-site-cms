Привет! Продолжаем разработку **MANUFACT AI Site CMS**.

Ты — главный **Lead Integrator** проекта. Не начинай CMS заново и не путай свою работу с отдельным Design Factory или SEO-разработчиком.

## 1. Точная контрольная точка

Репозиторий: https://github.com/manufact-test/ai-site-cms  
Рабочая ветка: `feature/stage3-ai-site-contract`  
Последний подтверждённый функциональный SHA: `19a74e77c1acdfb43a7b3840f8e05bd10f2b0427`  
Полный GitHub Actions: [#41302974827](https://github.com/manufact-test/ai-site-cms/actions/runs/41302974827).

- `technology-runtime` — SUCCESS.
- `contract` — SUCCESS.
- `main` на момент передачи: `12e9c3feb707e5ad46b2caeeed379eb40618466b`; merge/deploy не было.
- Документационный коммит v9.10 находится поверх функционального SHA. Перед работой проверь фактический HEAD и CI.

## 2. Что сделано последним заходом

**D8 — отдельный form collector sidecar:**
- Отдельный ZIP с проверяемым allowlist и SHA-256 inventory.
- В публичной папке пакета только `index.php` и `.htaccess`; CMS Admin API, Studio, логин, секреты и данные клиентов не включаются.
- Collector использует ту же выделенную БД и HMAC secret, что CMS inbox/publisher.
- Реальный disposable HTTP-тест распаковывает пакет, проверяет origin/HMAC/conditional fields и принимает корректную заявку в ту же тестовую БД.
- Это optional sidecar package, не деплой и не подключение к реальному хосту.

**Stage3 installer:**
- CLI-only `install.php --plan` / `--apply=<token>`.
- Private runtime config находится вне public document root.
- Одно независимое CMS instance на выделенную БД, database-scoped lock и installation receipt.
- MySQL 8.0+, MariaDB не поддерживается; SQLite — только CI/lab.
- Проверяется целостность всех 25 обязательных таблиц и приватной квитанции.
- Approval token связан с хешем DB password.
- Установщик пока не имеет browser wizard. Требование #183 нельзя считать закрытым.

Технические подробности: `stage3/runtime-export/D8-FORM-COLLECTOR-SIDECAR.md` и `stage3/docs/INSTALLER-AND-SETUP.md`.

## 3. Сначала прочитай документы

1. `docs/NEXT-CHAT.md`.
2. `docs/MASTER-TZ.md`.
3. Последнюю запись `docs/ROADMAP.md`.
4. `handoffs/lead-integrator/MAIN-HANDOFF-v9.10-2026-11-01.md`.
5. `stage3/docs/INSTALLER-AND-SETUP.md`.
6. `stage3/runtime-export/D8-FORM-COLLECTOR-SIDECAR.md`.
7. `stage3/docs/OWNER-STUDIO-UX-ACCEPTANCE.md`.
8. `docs/ACCELERATED-MACROBLOCK-PROGRAM.md` и `PROJECT-STATUS.json`.

## 4. Решение владельца по Studio

Текущая Studio временно согласована как рабочая база до подключения первого реального сайта и самостоятельного редактирования владельцем.

- Не начинай абстрактный редизайн.
- Не переставляй панели и кнопки ради предположений.
- После подключения реального сайта собери конкретные замечания и сделай адресные улучшения.
- Это не финальный UI/UX GO и не формальная приёмка Stage 3.

Первый пилот — существующий лендинг владельца, материалы ещё не переданы. Не выбирай случайный сайт и не выдумывай контент. Порядок: аудит → статичные макеты desktop/tablet/mobile → согласование → реальный сайт → подключение к CMS → hands-on проверка.

## 5. Следующий макроблок

Основной следующий фокус — **независимое обновление движка CMS и откат его версий, требования #184–185**.

Сначала изучи существующие `cms/src/Release/Lab*` signed-upgrade компоненты и текущий Stage3 packaging. Не переписывай всё с нуля и не считай старую лабораторию готовым Stage3 updater.

Важно разделить:
- D2/D3 — версии, переключение и rollback опубликованного сайта.
- #184–185 — обновление/rollback самой CMS.

Отдельно остаётся #183: нынешний installer CLI-only, поэтому простая установка на обычном shared hosting ещё не решена. Исследуй безопасный guided setup, не раскрывающий credentials и не ослабляющий изоляцию.

## 6. Статус и ограничения

- Stage 2 — NO-GO, gates #5–#9 открыты.
- Stage 3 — изолированная инженерная работа, не принята.
- 135 MUST = 124 engineering candidates + 5 partial + 6 external gates.
- Формально принято владельцем: **0/135**.
- SEO Engine уже интегрирован — не повторяй интеграцию.
- D1–D8 runtime work уже существует — не делай его заново.
- Design Factory остаётся отдельной веткой `feature/stage3-design-factory`; не меняй и не сливай её без разрешения.

Работай только в `feature/stage3-ai-site-contract`. Не трогай main, Hostinger, production, CELIKOM, реальные базы, клиентские данные и живую отправку сообщений.

## 7. Ускоренный режим

Одно «продолжаем» = один большой макроблок из 2–4 связанных вертикальных пакетов и минимум трёх реальных пользовательских результатов, где применимо. Не заканчивай после мелкой правки или первого зелёного теста. Не растягивай время искусственно и не плодить тесты. Используй существующий полный CI и только необходимые проверки новых сценариев.

**Начни с проверки текущего HEAD и CI, прочитай handoff v9.10, затем проанализируй существующий signed-upgrade lab и спроектируй следующий макроблок CMS engine update/rollback.**
