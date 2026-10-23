# AI Site CMS — Editor & Components Research: ФИНАЛЬНАЯ ПЕРЕДАЧА

**Дата:** 21.10.2026. **Исследовательское направление 3 завершило блоки 1–17.** Это самостоятельная лаборатория, НЕ главный разработчик, НЕ Security Research, НЕ завершённый production Editor/CMS. Данный документ не заменяет `docs/NEXT-CHAT.md` основного `main`.

## Читать сначала

1. **[MAIN-INTEGRATOR-HANDOFF-2026-10-21.md](MAIN-INTEGRATOR-HANDOFF-2026-10-21.md)** — основная памятка главному чату: что создано, что можно выборочно адаптировать, риски, стоп-условия.
2. **[TEST-EVIDENCE-FINAL-2026-10-21.md](TEST-EVIDENCE-FINAL-2026-10-21.md)** — строго доказанные числа и среда выполнения.
3. [README.md](README.md), [COMPONENT-AUDIT.md](COMPONENT-AUDIT.md), [EDITOR-CONTRACT-PROPOSAL.md](EDITOR-CONTRACT-PROPOSAL.md), [lab/README.md](lab/README.md).
4. GitHub [PR #4](https://github.com/manufact-test/ai-site-cms/pull/4), последние комментарии и actual Actions.

## Точный независимый checkpoint

- Репозиторий: https://github.com/manufact-test/ai-site-cms
- Только наша ветка: `research/editor-component-patterns`. Только наша область записи: `research/parallel-components/`.
- Последний проверенный **КОД**: `5330c148ff4a14ebb74b53457cd2b91cfeff574b`.
- GitHub Actions к этому КОДУ: [39574269556](https://github.com/manufact-test/ai-site-cms/actions/runs/39574269556) **SUCCESS**: **37 PHP syntax; 598 PHP assertions /17 scripts; 69 Python /42 Chromium; real Composer phone metadata PASS**. Scope/HEAD job SUCCESS; отдельный Security job SKIPPED.
- Следующий документальный коммит обновляет только `research/parallel-components/`, **не меняет этот проверенный код**. Перед действиями обязательно получать живой HEAD ветки и PR; не использовать SHA кода как гарантированно текущий tip.
- PR #4 на момент подготовки: **OPEN, НЕ MERGED**. Не сливать из нашего чата. Предыдущий PR #2 уже сливал главный интегратор, а не мы.
- В `main` Stage2 **НЕ принят**, Stage3 **не начат** по проверенным каноническим документам; статус `main` меняется независимо. Идеи из PR #4 пока **не** product acceptance.

## Что завершили

1–4: upstream OSS аудит и native HTML/PHP UI, строгие Origin/CSRF/POST границы, медиаварианты, shared throttle/receipt; PR #2 интегрировал главный разработчик.
5–11: строгие URL-encoded запросы/мастер формы, единая обработка native HTML+JSON, честные неопределённые статусы отправки, настоящий PHP localhost и Chromium bridge, реальная phone metadata, мобильная доступность и no-JS.
12–14: отказ при повреждённых HTTP ответах, keyboard/RTL/zoom/модалка/вкладки, строгий read-only CSP preview, безопасные значения и пределы ревизии.
15–16: fail-closed приватные файловые записи/очистка/ссылки/размеры, 12-процессные гонки, нормализация IPv4/IPv6, канонический JSON и повреждённая сессия.
17: закрытые и устойчивые к порче schema/editable правила в цепочке `CapabilityGate → RevisionGate → PreviewLab`, 598 тестовых PHP утверждений.

Всё это — **примеры для интеграционного решения**, не согласованный формат AI↔CMS↔site, не CMS write/API, не утверждённый runtime.

## Что делать главному чату

- Работать в **своём** `main` по собственному `docs/NEXT-CHAT.md`/Roadmap и текущему Stage2. Независимое исследование нельзя автоматически превращать в Stage3 или автоматически сливать PR.
- Рассмотреть в отдельных категориях: native-first no-JS компоненты/клавиатура; per-existing-block typed edit + semantic boundary; strict preview/rendering; form delivery statuses + конфиг; media pipeline + upstream лицензии.
- Прежде чем переносить код: проверить фактическое состояние `main`, выполнить review diff и совместимости/авторизации, согласовать staging и интеграционные тесты, выбрать только подходящие части.
- Для производственной готовности **не хватает** auth/ACL, persistent atomic revision+publish, настоящей SMTP/inbox доставки/централизованного outbox, multi-host anti-spam, реальной media upload sanitation, Next SSR/hydration, ручного AT/multi-browser аудита и юридического sign-off зависимостей.
- В этом чате исследование **завершено**; новые задачи только по отдельному поручению владельца/главного разработчика.

## Тесты для воспроизведения в dev checkout

```bash
cd research/parallel-components
bash lab/tests/run-block5.sh
```

Историческое название runner не означает старую тестовую матрицу. При отсутствии локальных PHP/Node/Python/Chromium/Playwright/Pillow/jsonschema и Composer условные проверки могут не стартовать/быть SKIPPED; **только фактические GitHub CI-логи на нужном HEAD** подтверждают полный набор.

**Не изменяли `main`, production CMS, Hostinger, глобальные workflows/lockfiles и чужие research папки. Не спрашивать пользователя делать ручные действия для уже завершённой передачи.**
