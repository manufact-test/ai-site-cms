# Готовое первое сообщение для следующего SEO-чата

Скопировать текст ниже в следующий чат с подключённым GitHub. Ссылки актуальны; **SHA всегда получить заново**, потому что ведущий параллельно работает.

---

Привет! Продолжаем самостоятельную параллельную разработку **SEO Intelligence & Blueprint Engine** для **AI Site CMS**.

**GitHub:** https://github.com/manufact-test/ai-site-cms  
**Наша рабочая ветка:** `feature/site-seo-engine`  
**Строго наша область:** `stage3/seo-engine/**`  
**Ветка ведущего интегратора:** `feature/stage3-ai-site-contract`.

Ты — **второй независимый разработчик SEO Engine**, не главный интегратор. Никаких правок в main, SDK, PHP, Studio, components, docs вне SEO, GitHub Actions, production, Hostinger, никакого самостоятельного PR/merge/deploy. Только коммиты и push в свою SEO-ветку; ведущий сам решает, что интегрировать.

**НАШ ОБЯЗАТЕЛЬНЫЙ РИТМ — КРУПНЫЕ ЗАХОДЫ, ОРИЕНТИР ОКОЛО 30 МИНУТ АКТИВНОЙ РАЗРАБОТКИ НА ОДНО СООБЩЕНИЕ.** Это ориентир объёма, а не гарантия точного таймера. Если первый блок сделан за 7–10 минут — **не заканчивай ответ**: без вопросов возьми второй и третий связанные, полезные продуктовые блоки, реализуй, проверь самое необходимое, закоммить. Не дроби большую работу на маленькие порции и не трать время на бесконечные тестовые лаборатории; нам нужно быстрее получить **первую живую рабочую CMS**, затем исправлять выявленные реальные проблемы. Не растягивай работу искусственно ради времени.

**Сначала обязательно прочитай актуальные документы:**
- `stage3/seo-engine/NEXT-CHAT-HANDOFF.md`
- `stage3/seo-engine/FIRST-SITE-RUNBOOK.md`
- `stage3/seo-engine/INTEGRATION-HANDOFF.md`
- `stage3/seo-engine/README.md`
- Контракт ведущего: `docs/MASTER-TZ.md` и `handoffs/parallel/SEO-ENGINE-v2-ASSIGNMENT.md`.

**Новый большой заход:** добавлено сравнение официального статического PHP экспорта с фактическим localhost PHP: version/sourceRevision, весь SHA256 экспорт, текст и SEO, стили, форма, JS, media, robots/sitemap, redirect fallback, статическая навигация. Также новая безопасная read-only команда capture-public-https.cjs — GET страниц/SEO, HEAD медиа, явный HTTPS host, pinned DNS, никаких POST; публичные транскрипты подключены к first-site-check. Доработан delta для новых групп с защитой от ложных закрытий при смене версии или домена. Ведущий интегрирует сам, никакие PR/merge/deploy не делали.

**Последнее обновление:** у ведущего появился PHP owner-only FormRoutes + FormDelivery. У нас новый флаг --delivery-status с проверкой реальных конфигураций уведомлений каждой опубликованной формы, наследования и custom получателей, отключённых каналов и недоступного транспорта. В bundle не попадают email/chat ID, токены, заявки; нет реального POST. Не считай настроенные уведомления подтверждённо доставленными. Сборка CMS engine через cms-release.cjs ведущего — НЕ публикация клиентского сайта. Подробности в FIRST-SITE-RUNBOOK.md.

**Большой блок 29.10.2026:** публичный HTTPS статический сайт теперь сравнивается с официальным SHA256-проверенным PHP static-export по страницам, SEO, внутренней структуре, 301, robots/sitemap и media HEAD. Новый `--media-digest-out` (только вместе с `--static-export`) собирает SHA256 настоящих публичных HTTPS GET оригиналов и адаптивных медиа, потоково и без сохранения файлов. Опциональный `--public-media-digests` в first-site-check объединяет результаты в report/release gates/delta. Никакого POST/merge/deploy, а записи оператора не являются криптографическим подтверждением реального хоста. Главная задача — один настоящий первый клиент, а не ещё сотни тестов. См. FIRST-SITE-RUNBOOK.md.

**Статический хостинг / истинные 301:** новая CLI `stage3/seo-engine/bin/prepare-static-host.cjs` по owner published Site v1 и verified static release создаёт локальные Apache `.htaccess`/Nginx `return 301` и `HOSTING-HANDOFF.md`, без публикации. Это исправляет проблему HTML meta-refresh fallback статического экспорта; реальные 301 проверяет ведущий после установки. См. FIRST-SITE-RUNBOOK.md.

**Текущая реализация:** Blueprint → SEO Site v1 audit → actual local PHP capture → SEO metadata/HTTP/robots/sitemap/redirect/media/forms/components/DesignGraph/navigation checks → remediation, release gates, `bundle.json`, `handoff.md`, `launch-worksheet.md`, optionally `delta.md/json`. Sealed Approved Site v2 и owner-edited Site v1 передаются с точной привязкой к CMS published version; никакой автоматической публикации или подмены утверждённых клиентом изображений. Последний крупный заход завершил два важных вертикальных блока: **real PHP semantic/accessible link integrity** — один main/H1, семантика, ALT, ARIA, duplicate DOM IDs, проверка настоящих локальных маршрутов и якорей; **real PHP byte footprint** — HTML/CSS/JS, реальные сохранённые байты медиа и нижняя/верхняя оценка media candidates, критические предупреждения о lazy hero/отсутствии размеров картинок. Оба интегрированы в существующие capture, remediation, release gates, bundle, summary, worksheet и lead dossier. Ранее также реализованы 14 CSS-переменных темы, responsive/interaction DesignGraph CSS checks. Ничего не дублировать.

**Текущий приоритет:** не строить новые лаборатории, а получить настоящий клиентский сайт, в checkout ведущего запустить Node+PHP+Chromium и реальные доставленные формы с разрешения владельца. У нас объём одного захода — несколько больших продуктовых результатов ориентир ~30 минут, а не 10 минут и стоп.

**Текущее состояние проверок:** синтаксис и два новых целевых JS/V8 smoke (с mock URL/Buffer), плюс в существующий PHP loopback smoke добавлены позитивные/негативные проверки semantics/footprint — полный Node subprocess этого smoke не запускался. Но **настоящий клиентский sealed v2, полноценный Node subprocess, PHP/Chromium визуальная приёмка, отправка форм, публичный HTTPS и подтверждение одобрения клиентом всё ещё не выполнены здесь**. Не выдавай синтетику за реальную готовность.

**Первое действие:** проверь через GitHub свежий HEAD двух веток, сравни последний PHP/Studio контракт с нашим SEO, выбери несколько **крупных недостающих продуктовых задач**, а не мелкие тесты. Если ведущий уже получил настоящий клиентский Approved Site v2 — приоритет у исправления фактических интеграционных ошибок и одного реального первого сайта. Если нет — реализуй следующую действительно полезную SEO функциональность, не переписывая CMS. Не повторяй сделанное и не предполагай, что всё в `main` уже объединено.

**Порядок работы:** (1) большой блок кода → commit/push; (2) следующий связанный большой блок → commit/push; (3) только необходимые проверки, рабочий handoff; (4) краткий честный итог с конкретными результатами/ограничениями. После нескольких таких заходов обнови документы и подготовь следующую передачу. Работай самостоятельно, без лишних уточнений.

Продолжаем! 🚀

## 29.10.2026 — Дополнительный большой заход после замечания о темпе

**Ритм:** каждый заход — примерно 30 минут активной разработки, а не остановка через 10–12 минут, когда первые блоки готовы. После раннего завершения одного блока сразу брать следующий крупный. Никаких бесконечных искусственных тестов. Всё — строго stage3/seo-engine/**, без PR/merge/deploy.

### Реальные production-изменения

- `public-static-head.cjs`: паритет действительного публичного OG/Twitter/canonical/JSON-LD **по значениям**, а не только типам; не выводить содержимое в отчёт.
- `public-static-sensitive-markup.cjs`: защита публичных form action, submit formaction, hidden _release/_token (только SHA256), внешних JS/CSS loaders/SRI, iframe, link rel/target, image loading и inline JS/CSS handler атрибутов. Подмена адреса заявки или токена — блокирующее отклонение от verified official static export.
- `public-static-csp.cjs`: общественный CSP на реальном HTTPS не должен блокировать inline CMS CSS, wizard JS, style/event attrs или form-action на отдельном HTTPS collector. Error -> `public-static-csp-blocks-site`; отсутствующий/сложный CSP -> manual review. Никакого фактического POST.
- `public-https-capture.cjs`: безопасный GET заведомо несуществующего маршрута (ожидаем HTTP 404/410, иначе soft-404), повторный GET homepage в конце сбора публичных страниц/медиа с SHA256/status сравнением (защита от смешанных релизов; не аутентификация исходников). Pinned DNS отклоняет reserved/TEST-NET/benchmark/private/6to4 IP.
- `public-static-parity.cjs`: проверка страницы, full SEO head, POST/anti-spam markers, CSP, 301, robots/sitemap, image HEAD и сильного GET SHA256. Успешный GET закрывает отсутствие HEAD (405/501), а противоречивый HEAD остаётся warning. Нельзя заявлять полное покрытие без 404 probe и стабильной главной.
- `php-local-static-export.cjs`: теперь включает img srcset, CSS url() и проверяет http/ftp mixed-content для изображений и фонов.
- `first-site-report-delta.cjs`: изменение публичного HTML SHA256 / ETag и конфликт CDN кеша только при совпадении конкретного SHA256 официального static manifest и HTTPS host. Иначе сравнение недопустимо.
- `first-site-check` и `php-html-capture`: приватные каталоги 0700 и файлы 0600. Public evidence JSON также 0600.
- `prepare-static-host`: ШЕСТЬ результатов: apache.htaccess, nginx-redirects.conf, netlify._redirects (forced 301! поверх static HTML fallback), cloudflare-pages._redirects (301; проверить Pages Functions), plan.json, HOSTING-HANDOFF.md. Провайдерские _redirects вручную переименовываются в publish директории; никто не деплоит. Документация: https://docs.netlify.com/manage/routing/redirects/redirect-options/ и https://developers.cloudflare.com/pages/configuration/redirects/.

Для запуска остаются предыдущие команды capture-public-https, prepare-static-host, first-site-check в этом файле. Ведущий должен интегрировать latest HEAD SEO в свой checkout, реально выполнить Node+PHP+Chromium+HTTPS/form POST на первом клиенте. Изолированные V8/syntax проверки — не полноценный Node/CI/реальный клиентский PASS.

**Этот блок актуальнее ранних исторических секций документа (там ещё может быть написано про четыре вместо шести файлов).**
