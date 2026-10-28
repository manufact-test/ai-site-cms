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

## Состояние после крупного интеграционного блока

Добавлены `php-local-forms` (без POST и утечки HMAC) и real-PHP metadata parity (Title/Description/OG/lang/robots), реальные blockers для сломанных robots/sitemap/OG и возможность `first-site-check --php-capture /ABS/lead/evidence.json` объединить официальные PHP-скриншоты с HTTP SEO анализом. Работает только в `stage3/seo-engine/**`. Все подробности и точные команды в `FIRST-SITE-RUNBOOK.md`; актуальный SHA всегда перепроверять. Прогон первого клиентского Approved Site v2 и реальные формы/HTTPS ещё не выполнены.

## Синхронизация с новым PHP FlexForm / formSteps ведущего

Ведущий обновил PHP/SDK (`feature/stage3-ai-site-contract` SHA `074018c63ffebf4ab8a89995f0c321dbbcfc8e02`): `lead-form-flex` теперь имеет индивидуальные `formFields`, условные зависимости `when`, опциональные `formSteps` (2–4 шага), встроенный JS-wizard и SHA-256 `script-src` в реальном HTTP CSP. **SEO не переписывает PHP.**

`php-local-forms` сверяет `extra1..3`, пользовательские поля (имя/тип/число вариантов radio/required), CSS-условные атрибуты, наличие marker `data-multi-step`, число `.lead-step`, навигационные кнопки next/back и индикатор прогресса. `php-local-head` дополнительно вычисляет SHA-256 фактически полученного inline JS и требует его точного разрешения в реально полученном `Content-Security-Policy`; если Site v1 объявляет wizard, но скрипт не выдан, это также блокировка.

Это проверки **структуры HTTP-выдачи**, а не исполнение JS и не корректность прохождения пользователем многошаговой формы. Нужны реальные desktop/tablet/mobile браузерные проверки, отправка формы, сохранение в CMS и проверка канала доставки. Если фактический JS другого содержания — должен совпадать именно с реальным HTTP CSP, а не с копией из исходника.


## Импортированный сайт с новыми media ID

Новый `--published-site /ABS/owner-published-site.json` загружает опубликованный Site v1 из приватного owner-authorized API ответа с `site` и `version`, после чего exact `retarget` сверяет его с sealed v2 и привязывает реальные HTTP байты медиа к исходным SHA-256. Это закрывает ложные 404 после официального импорта в CMS; подробности и инструкция в `FIRST-SITE-RUNBOOK.md`. Не менять PHP/SDK/Studio, не считать экспорт доказательством сервируемой ревизии. CLI без флага подходит только для прямой fixture без media remapping.


## Текущий большой заход — для следующего чата

После последнего SHA `502262de...` SEO worker расширен до **настоящего содержимого PHP** и личного рабочего листа первого сайта: `php-local-components.cjs`, `php-local-graph.cjs` и `first-site-worksheet.cjs` + общая интеграция в capture, remediation, release, package, dossier и CLI. Результат: при пропавшем тарифе, неверной CTA/цене, пропавшем шаге, сломанной radio вкладке, отличающемся DesignGraph тексте/ALT/cite/ссылке или неправильном CSS tab panel реальная выдача PHP порождает blocker. `first-site-check` создаёт `launch-worksheet.md` с отдельными desktop/tablet/mobile MANUAL CHECK UNCONFIRMED; не считать это визуальным PASS.

**Режим пользователя:** большие заходы с ориентиром около 30 минут активной разработки; после первого готового блока переходить к следующему без согласований, не заканчивать после нескольких минут. Это ориентир объёма, а не гарантированный таймер. Не растягивать мелочи и не строить лишние тесты. Работать только в `stage3/seo-engine/**` ветки worker; лид интегрирует сам.

Следующий реальный продуктовый шаг: ведущий получает настоящий sealed Approved Site v2 и его owner-exported `published-site` JSON; запускает действующий PHP, существующий loopback smoke и единую команду, исправляет реальные отклонения. В worker нельзя утверждать, что Chromium/PHP клиентского сайта, полный Node smoke, публичный HTTPS или form delivery прошли.


## Завершённый дополнительный блок по real PHP компонентам

Кроме business-компонентов добавлено 10 основных секций CMS: FAQ, услуги, отзывы, photo-gallery, adaptive-gallery, партнёрские логотипы, CTA-banner, contact-panel, image-showcase, media-story. Итого `php-local-components.cjs` сверяет **14 типов** по фактическому HTML, включая содержимое, медиа/ALT и маршруты кнопок. Ошибки являются техническими release blockers, не визуальным утверждением. Синтетические valid/invalid сценарии доступны в уже существующем smoke. Полный PHP/Node смок ведущего не заменяет. Продолжать только в worker directory; передача официальной CMS в ведение lead.


## Приоритет PHP DesignGraph и исправления ложных ошибок

Если типовой блок или form section имеют `designGraph`, PHP выводит именно граф, а не старые поля. SEO теперь исключает такие секции из ожидаемого legacy HTML/forms/wizard; source-bound граф анализируется отдельно. При необходимости это обнаруживается в одной существующей smoke. Также в 14 типовых компонентах проверены заголовки, вводные абзацы, тарифные условия, featured и заголовки сравнения. Всё в worker path. Полный first-site Node/PHP прогон и интеграция — у ведущего.


## Последний дополнительный этап: PHP OG/Twitter metadata parity

Сверяются все фактически отданные в PHP SEO social meta: OG type, locale, image URL, image ALT и Twitter title, description, card, image, ALT. Источник выбора изображения — текущий `publisher-media.cjs`, host — только публичный origin из действительного локального sitemap. Неправильное значение блокирует техническую приёмку через существующий `php-head:*`. Mocked PHP normal и целевые OG/Twitter drifts проверены в V8; настоящий первый клиентский PHP/Chromium остаётся задачей интегратора.
