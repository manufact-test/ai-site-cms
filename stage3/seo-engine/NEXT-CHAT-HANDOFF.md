# AI Site CMS — передача SEO Engine следующему чату

**Дата:** 28 октября 2026. **Репозиторий:** https://github.com/manufact-test/ai-site-cms  
**Наша ветка:** `feature/site-seo-engine`. **Ведущий разработчик и единственный интегратор:** `feature/stage3-ai-site-contract`.  
**Рабочая область:** строго `stage3/seo-engine/**`. **Нельзя менять** `main`, SDK, PHP, Studio, component manifests, `docs/**`, `handoffs/**`, GitHub Actions; нельзя самостоятельно PR/merge/deploy.

## Начинай с этих документов

- [FIRST-SITE-RUNBOOK.md](FIRST-SITE-RUNBOOK.md) — свежая инструкция первого реального SEO/PHP-прогона одной командой.
- [INTEGRATION-HANDOFF.md](INTEGRATION-HANDOFF.md) и [README.md](README.md) — договорённости и существующие возможности.
- [MASTER-TZ.md](../../docs/MASTER-TZ.md) и [SEO-ENGINE-v2-ASSIGNMENT.md](../../handoffs/parallel/SEO-ENGINE-v2-ASSIGNMENT.md) — исходное ТЗ.
- [tests/smoke.cjs](tests/smoke.cjs) и [tests/php-html-capture-smoke.cjs](tests/php-html-capture-smoke.cjs) — минимальные интеграционные проверки.

**Сначала получи свежие SHA обеих веток через GitHub.** Ведущий параллельно активно коммитит, не полагайся на прошлые SHA. Предыдущий чат в финальном сообщении передаст итоговый SHA worker.

## Что уже сделано — НЕ переделывать

Полный Brief → SEO Blueprint; SEO семантика, H1, CTA, ссылки, OG, robots/indexation и рекомендации структурированных данных; архитектура, Design Graph, review Site v1, page HTML и 3-device parity, media и HTTP evidence, route migration/301, regression и traceability, guarded CMS change packets, acceptance/release gates, lead dossier. **Это рекомендации и технические проверки, без самостоятельных изменений CMS/автопубликации.**

Ведущий уже имеет собственную **sealed Approved Site v2**, трёх утверждённых статических прототипов, SDK, PHP renderer и screenshot capture. **НЕ строить вторую систему.** Наши `approved-site-bridge.cjs` и `php-capture.cjs` только читают официальные данные.

В worker уже есть захват настоящего локального PHP HTTP: HTML всех страниц, robots.txt, sitemap.xml, каждого 301 и каждого оригинального/адаптивного медиа с фактическими байтами, SHA256/MIME/ETag, PNG размерами и проверкой используемых OG и `img src/srcset`. Корректно учитываются реальные смонтированные адреса `/published/SITE-ID/` и только подтверждённые 301.

**Последний большой заход (этот чат):** `lib/php-local-publication.cjs` теперь признаёт `http://localhost` и `http://127.0.0.1` допустимыми тестовыми origin PHP, но не боевыми HTTPS. Ошибочные и смешанные sitemap loc не считаются полноценным sitemap. `lib/php-local-head.cjs` анализирует реальные HTTP-заголовки страниц и сопоставляет X-Robots-Tag/CSP, canonical, og:url, исходную индексируемость и origin из полученного sitemap. `lib/php-local-media.cjs` понимает локальный HTTP OG только при совпадении с этим origin. Все findings интегрированы в **старые** `remediation`, `release-review`, `package` и `lead-dossier`.

**Главное новое:** `bin/first-site-check.cjs` — одна команда для Verified Approved Site v2 → реальный localhost HTTP capture → единый SEO bundle → `summary.json`, `bundle.json`, `handoff.md` в новом каталоге. Не создаёт и не публикует сайт, не запускает PHP, не пишет в CMS. Полная инструкция FIRST-SITE-RUNBOOK.md.

```bash
node stage3/seo-engine/bin/first-site-check.cjs \
  --approved-site /ABS/sealed-v2 \
  --blueprint /ABS/approved-blueprint.json \
  --origin http://127.0.0.1:PORT/published/SITE-ID/ \
  --evidence /ABS/new-evidence \
  --report /ABS/new-report
```

## Последнее обновление совместимости

Текущий PHP DesignGraph генерирует `picture/source`, CSS `backgroundMedia` и `video poster/source`; SEO HTTP-проверка теперь учитывает эти потребители при определении критичности ошибки медиа. Неизвестный опубликованный site-scoped asset становится ошибкой. Подробности в `FIRST-SITE-RUNBOOK.md`. Полный Node subprocess и первая клиентская приёмка остаются непроверенными.

## Главная задача следующего чата

**Не расширять бесконечно тесты и библиотеки.** Сначала получить реальный первый клиентский Approved Site v2/Blueprint в интегрированном checkout ведущего. Запустить один smoke и `first-site-check.cjs`, исправлять *выявленные проблемы продукта* **одним крупным заходом** в границах SEO worker. Если нужны изменения PHP/SDK/Studio — передать ведущему точные факты, не изменять его файлы. Цель — приблизить первую полноценную CMS к живому пользовательскому тесту и публикации.

## Честное состояние

В прошлом чате JS-модули и изменённые тесты прошли **синтаксическую** проверку, дополнены реальные localhost HTTP сценарии, но полный Node subprocess smoke, реальный Approved Site v2 клиента, визуальное совпадение с тремя утверждёнными прототипами, подлинная версия запущенного PHP, публичный HTTPS, настоящие формы и deploy **НЕ подтверждены**. Их должен проверить ведущий. Не называть это «полный PASS», пока не доказано.

**Режим работы:** крупные законченные задачи; минимальные нужные проверки; без мелкой бесконечной полировки. В конце каждого захода — коммит в worker ветке, точный SHA, проверка что все пути `stage3/seo-engine/**`, результаты и честные ограничения. Ведущий сливает ветку сам.
