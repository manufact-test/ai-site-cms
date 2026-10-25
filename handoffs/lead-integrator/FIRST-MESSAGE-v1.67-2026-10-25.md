Привет! 😎 Продолжаем AI Site CMS — ты главный разработчик и интегратор.

Репозиторий: https://github.com/manufact-test/ai-site-cms
Главная рабочая ветка: `feature/stage3-ai-site-contract`.
Сначала прочитай `handoffs/lead-integrator/MAIN-HANDOFF-v1.67-2026-10-25.md`, `PROJECT-STATUS.json`, `docs/NEXT-CHAT.md`, `docs/ROADMAP.md` и `stage3/docs/AI-DESIGN-COMPOSITION.md`.

**Последний ПОЛНОСТЬЮ проверенный функциональный SHA:** `0eeff2e9cd77b29e3426c52393b03e583a5e672a`. Полный CI [Actions #40233695097 — SUCCESS](https://github.com/manufact-test/ai-site-cms/actions/runs/40233695097). Этот код реализовал сквозной путь SEO/a11y-аудит → конкретный узел Design Graph → исправление → повторный аудит, с Undo/Redo и раздельными Save/Publish. Ранее `6123e477` добавил живые SEO/social previews и OG image fallback для вложенных graph images, full CI #40225894128 SUCCESS.

**ВАЖНО О ПАРАЛЛЕЛЬНОЙ РАБОТЕ:** после нашего verified SHA другой чат добавил в ЭТУ ЖЕ feature-ветку приватный inbox/CSV/bulk review; поздний SHA `8db3d32e1ed7f087445c507c76c13e8165ebe8c3` получил [Actions #40233889710 FAILED](https://github.com/manufact-test/ai-site-cms/actions/runs/40233889710) — Hosted Chromium, кнопка `#server-notifications-seen` disabled. Сразу проверь ФАКТИЧЕСКИЙ новый HEAD и точный CI. Если никто ещё не исправил, согласованно исправь интеграционную ошибку, не затри чужой код; не объявляй новый SHA проверенным до full SUCCESS. До любых коммитов проверяй движение ветки и используй SHA lease, не делай слепой force-push.

**УСКОРЕННАЯ ПРОГРАММА:** одно моё «продолжаем» = один БОЛЬШОЙ сквозной продуктовый блок, несколько связанных работающих функций. Сначала полноценная CMS, затем правки на реальных сценариях. Никакого микрополирования и бесконечных тестов: существующий full CI + минимально необходимые критические проверки. После блока давай точный functional SHA, exact CI result, реальные функции, ограничения и следующий большой шаг. Документацию обновляй только когда я прямо прошу передать чат.

Stage2 формально NO-GO (#5–#9), Stage3 изолирован и не принят, 0/135 обязательных требований формально принято. Не трогать `main`, реальные Hostinger/SSH/production/DB, живые сайты, CELIKOM, реальные Email/Telegram, PR #3/#4 и независимую Design Factory без явного разрешения. Provisional D7 envelope не равен совместимости с реальным Factory D7; дождись финального артефакта, затем loss matrix.

После устранения CI-блокера бери следующий **крупный end-to-end CMS workflow** по компонентам/медиа/формам или соответствию редактор→предпросмотр→публикация, без декоративных задач. Ты главный интегратор. Двигаемся быстро и осмысленно! 🚀
