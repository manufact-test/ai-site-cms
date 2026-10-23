# Независимый подэтап — release audit / v1.59 / 24.10.2026

## Только один закрытый периметр

Репозиторий `manufact-test/ai-site-cms`. **ТВОЯ ветка `feature/stage3-release-audit-lab`**, созданная главным координатором с подготовленной передачи. **Единственный writable subtree: `stage3/release-audit/`** — даже README, тесты, fixtures, tool scripts, docs только внутри этой папки. Вне неё ТОЛЬКО чтение. Нельзя пушить `main` или `feature/stage3-ai-site-contract`, менять workflow, stage3 SDK/server/Studio, общий package-lock, проекты/релизы/сайты, PR #3/#4; никаких удалённых actions, ключей, npm-зависимостей или HTTP-запросов.

## Крупная самостоятельная задача

Создай **standalone offline CLI для проверки статического опубликованного экспорта** `stage3/server/bin/export-published.php`; интеграцию в основной workflow выполняет позже главный чат. Сканировать путь к уже экспортированной директории **read-only**, без запуска PHP CMS и без сетевых запросов, на чистом Node.js стандартной библиотеки. Поддержать `release-manifest.json` (`manufact-ai-static-site-v1`), `pages` с `path,file,sha256`, `assets` с `id,file,mime,sha256`, `redirects` с `from,to,file,sha256` и `searchFiles` при указанном `publicOrigin`. Наличие `formCollector` — конфигурационный факт, не доказательство доставляемости.

Большой сквозной набор проверок: (1) маршрут/relative file path/ID whitelist, защита `..`, absolute paths, symlink escape, дубликатов и допустимого max размера; (2) файловый SHA256 каждой страницы/медиа/redirect+search metadata; (3) существование root page, всех записанных файлов и локальных ссылок, проверка якорей для `section id`; (4) canonical/meta/robots/sitemap и OG baseline для тех страниц, где это указано в release manifest, проверка исключения noindex страниц из sitemap; (5) поиск явных следов admin API/scripts/executable PHP в публичных HTML и сырых Form collectors, обнаружение битых image href/src; (6) детерминированный читаемый **JSON-report** `checks,pages,assets,errors,warnings,summary`, exit 0 если нет ошибок, nonzero если есть ошибки. Без сомнительного regex-«парсинга» для гарантий безопасности: явно документировать неизбежные ограничения статической инспекции HTML и DOM-less approach.

Положи CLI, README, простые synthetic temp-directory fixtures и один понятный интеграционный тест **внутри `stage3/release-audit/`**, без сторонних пакетов и без CI/workflow изменений. Запуск например `node stage3/release-audit/bin/audit.cjs /absolute/output/path --json`; тест `node stage3/release-audit/tests/smoke.cjs`. Не меняй форматы существующего экспорта; если увидишь ограничение — зафиксируй как отдельную интеграционную рекомендацию, не правь чужую часть.

## Критерии «готово»

- Инструмент надёжно анализирует синтетический корректный статический экспорт и отклоняет битые sha256, traversal, symlinks, отсутствующий home и внешние CMS-артефакты.
- Все изменения только в разрешённой папке. Никаких скачиваний пакетов, network calls, записей в тестируемую директорию, автоматического merge.
- Укажи конкретный SHA ветки, изменённые файлы, команду/выход теста, оставшиеся ограничения. Не утверждай product acceptance.
- **Когда закончил:** напиши владельцу «Мой независимый блок ГОТОВ» и сразу дай **готовое сообщение для главного чата** с SHA, ссылками, инструкцией как безопасно включить в `feature/stage3-ai-site-contract`. Главный сам проверит и объединит. **Не продолжай без запроса владельца** и не бери другие папки. Это конечная работа одного самостоятельного чата.

Все общие запреты: только isolated CI/disposable filesystem, Stage2 NO-GO #5–#9, Stage3 не принят 0/135, запрет Hostinger/production/секреты/реальные БД/клиентские сайты. Ускоренный режим: один БОЛЬШОЙ полностью завершённый offline инструмент, не десятки микро-изменений, один локальный smoke и необходимая security validation.
