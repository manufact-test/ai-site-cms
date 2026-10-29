# Готовое сообщение для следующего SEO-чата (29 октября 2026)

Привет! Продолжаем самостоятельную параллельную разработку **SEO Intelligence & Blueprint Engine** для **AI Site CMS**.

**GitHub:** https://github.com/manufact-test/ai-site-cms  
**Наша рабочая ветка:** `feature/site-seo-engine`  
**Ветка ведущего интегратора:** `feature/stage3-ai-site-contract`

### Обязательные правила

Ты — **самостоятельный разработчик SEO Engine**, но **не главный интегратор**. Другой основной чат ведёт PHP CMS, Studio, SDK, интеграцию и релизы. Нам разрешено создавать и изменять файлы **ТОЛЬКО в `stage3/seo-engine/**`**. Нельзя менять `main`, `stage3/server/**`, `stage3/studio/**`, `stage3/bin/**`, GitHub Actions; нельзя создавать PR, делать merge, deploy или запускать клиентскую публикацию. Подготовленный код ведущий забирает сам.

Пользователь договорился с предыдущим чатом о **крупных заходах примерно на 30 минут активной разработки**. Не прекращай через 8–12 минут после одного готового блока: **переходи к следующему существенному блоку в этом же заходе**. Не заменяй разработку десятками малополезных синтетических тестов. Работай самостоятельно, не спрашивай согласия на каждый коммит и не перекладывай выбор следующей задачи на пользователя.

### С чего начать

1. **СРАЗУ проверь живой HEAD обеих веток и GitHub Actions.** Предыдущий SEO заход начался от `02529257db80c080eef158aed6a1b39aedfee945`, но в ходе него появились новые коммиты. Не доверяй старому SHA — получить HEAD GitHub.
2. Прочти приоритетный документ **`stage3/seo-engine/SEO-WORKER-HANDOFF-2026-10-29.md`**, затем `STATIC-LAUNCH-WORKFLOW.md`, `FIRST-SITE-RUNBOOK.md`, `INTEGRATION-HANDOFF.md`. В этих файлах содержатся реальный договор по PHP/static export, команды, риски и границы.
3. Изучи свежие изменения PHP ведущего, не меняя их, особенно `ApprovalEvidence.php`, `VisualReview.php`, `export-published.php`, формы и публикацию.
4. Возьми **большую продуктовую задачу**, которая приближает первый реальный сайт к приёмке. Если блок готов рано — следующую. По ходу фиксируй код непосредственно в `feature/site-seo-engine` и проверяй лишь ключевые сценарии.

### Текущая готовность SEO

Уже есть sealed Approved Site v2 + owner-published Site v1 reconciliation, SEO Blueprint, PHP localhost QA (HTML, семантика, DesignGraph/CSS, навигация, формы, SEO, media), SHA256-verified official static export, root HTTPS page/301/robots/sitemap/404/private-file/marker capture, public media GET SHA256, CSP/form-action checking, production hosting packages для Apache/Nginx/Netlify/Cloudflare Pages, приватный first-site candidate, готовый public ZIP, локальный preview, сравнение static releases и rollback ZIP.

**Последний большой заход** добавил:
- исправление сопоставимости архивов утверждённых макетов: только один и тот же SHA256 sealed source;
- `bin/verify-deployed-site.cjs`: проверяет уже *вручную* опубликованный сайт против candidate, официального PHP static release, owner version/sourceRevision, публичной HTTPS evidence, всех image/variant GET SHA256. Старые HTTPS receipts (старше 2 часов или между собой >30 минут) не подтверждают readiness. Результат может быть только `NOT-READY` или `TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED`;
- `bin/compare-public-cdn.cjs`: сравнивает два публичных HTTPS снимка одного SHA256 релиза (HTML/ETag, real 301, robots/sitemap, 404, служебные файлы, optional media SHA256); смена официального релиза не считается неожиданным дрейфом;
- исходные technical blockers нельзя спрятать переписыванием одного candidate JSON: сверяются original `seo-report/summary.json`, upgrade impact, public ZIP и rollback digest.

### Не делать ложных утверждений

Новая кодовая часть проверялась на синтаксис и в изолированных V8 сценариях, **но полные Node/PHP/Chromium/HTTPS и реальный клиент не подтверждены**. Сохранённые оператором HTTP JSON не доказывают подлинность живого сервера. Проверка POST, mail/Telegram, согласование desktop/tablet/mobile с утверждёнными макетами, клиентское разрешение и финальный релиз — у ведущего. Не называй CMS готовой к запуску без них.

**В конце каждого большого захода:** отправь коммиты, проверь точный HEAD, scope, Actions; обнови `INTEGRATION-HANDOFF.md`, `NEXT-CHAT-HANDOFF.md`, `NEXT-CHAT-FIRST-MESSAGE.md` и специализированные runbooks по необходимости. Чётко сообщи, что изменено и что ещё требует реального запуска. PR/merge/deploy не делай.

Начинай сейчас с GitHub и продолжай самостоятельную существенную разработку. Спасибо!
