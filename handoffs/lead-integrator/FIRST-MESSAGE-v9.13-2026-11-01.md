Привет! Продолжаем ускоренную разработку **MANUFACT AI Site CMS**.

Ты — Lead Integrator существующей CMS. Не начинай проект заново и не смешивай его с Design Factory или отдельной SEO-разработкой.

**Repository:** https://github.com/manufact-test/ai-site-cms  
**Branch:** `feature/stage3-ai-site-contract`

### Контрольная точка

- Последний функциональный SHA: `f4366d1982413ea7a27ba8c807d9c54c78abed14`
- Полный CI [#41333071592](https://github.com/manufact-test/ai-site-cms/actions/runs/41333071592) — SUCCESS.
- Документационно-конфигурационная точка `82a6eea97d255e5c21d60c65a7de63af62cd507d`; полный CI [#41333649907](https://github.com/manufact-test/ai-site-cms/actions/runs/41333649907) — SUCCESS.
- Последующие изменения `52a4873c217bb25884d5da9e8f2824fb343fd17a` затрагивают только документационные placeholders, не runtime code.

Перед изменениями проверь реальный HEAD ветки и последние Actions. Не откатывайся к устаревшему SHA `974909d502099b170beafa6806c6e1bc92378c78`.

### Что уже сделано

- Apache/LiteSpeed shared-host routing.
- Private CLI-only hPanel Cron install runner с приватным конфигом, полной инвентаризацией web roots, двухэтапным plan/apply и topology receipt.
- Owner-only hosting diagnostics с реальной проверкой front controller, open_basedir и upload configuration.
- Полные Chromium, PHP/MySQL, HTTP и Apache проверки.
- Документация по runner и Hostinger staging обновлена.

Сначала прочитай:
- `docs/NEXT-CHAT.md`
- `handoffs/lead-integrator/MAIN-HANDOFF-v9.13-2026-11-01.md`
- `stage3/docs/HOSTED-INSTALL-RUNNER.md`
- `stage3/docs/STAGING-SHARED-HOSTING.md`
- `docs/HOSTINGER-STAGING-ADDENDUM.md`

### Следующий приоритет

Подготовить и выполнить **изолированную реальную staging-приёмку на shared hosting**, но только после подтверждения владельцем точного Hostinger target и внешней auto-deploy branch.

Обязательные ограничения:
- Shared/general SSH запрещён.
- Использовать только отдельно одобренный hPanel Cron PHP CLI route.
- Не использовать Stage2 secrets/database и production data.
- Не запрашивать пароли, DSN, private keys или form secrets в чате.
- Сначала read-only `--plan`; `--apply` — только после отдельного решения владельца.
- Никаких production writes или main merge.

Если реальный host пока не подтверждён, продолжай один крупный полезный GitHub-only блок. Не повторяй закрытые тесты без новых доказательств и не объявляй CMS готовой только по зелёному CI.
