# AI Site CMS — передача главному интегратору: Editor & Components Research

**Дата:** 21.10.2026. **Статус:** независимое исследовательское направление завершило запланированные 17 блоков; код, проверяемая лаборатория и рекомендации доступны для отдельного архитектурного review. **Не означает**, что реализован production-редактор или что Stage2/Stage3 приняты.

## Репозиторий, границы и проверенное состояние

- GitHub: https://github.com/manufact-test/ai-site-cms
- Рабочая ветка исследования: \`research/editor-component-patterns\`.
- PR: https://github.com/manufact-test/ai-site-cms/pull/4 — на дату передачи **OPEN, НЕ СЛИТ**, не включать автослияние.
- Последний **проверенный код**: \`5330c148ff4a14ebb74b53457cd2b91cfeff574b\`.
- GitHub Actions строго для этого SHA: https://github.com/manufact-test/ai-site-cms/actions/runs/39574269556 — **SUCCESS**: scope/HEAD SUCCESS, Components PHP+HTTP+Chromium+schema SUCCESS; не относящийся к исследованию Security job SKIPPED.
- Реальные логи: **37/37 PHP lint, 598/598 PHP assertions (17 тестовых файлов), 69/69 Python tests (из них 42 реальных Chromium), настоящая изолированная Composer/metadata проверка номера телефона PASS**.
- Исторический PR #2 ранее был интегрирован **главным интегратором**. PR #4 содержит последующие независимые эксперименты; НЕ предполагать, что всё из него уже есть в \`main\`.
- Все изменения самостоятельного исследователя ограничены \`research/parallel-components/\`; нет записи в \`main\`, \`cms/\`, \`.github/workflows/\`, глобальные Composer/npm lock-файлы, хостинг или другие ветки исследования.
- В документах основного проекта на время подготовки передачи: Stage0/1 приняты, **Stage2 НЕ принят, Stage3 НЕ начат, 0/135 продуктовых требований принято**. Главному чату следует читать **свой самый свежий** \`docs/NEXT-CHAT.md\` и \`PROJECT-STATUS.json\` из текущего \`main\`, так как он развивается параллельно. Данные независимой ветки **не обновляют** этот статус автоматически.

## Что создано — 17 исследовательских блоков

| Область | Результат / точка входа | Что именно доказано |
| --- | --- | --- |
| Компоненты и upstream | \`COMPONENT-AUDIT.md\` | Сравнение кандидатов FAQ/диалог/навигация/табы/галерея/валидация/телефон/медиа, анализ веса, лицензий и рисков. Нет юридического approval или импорта библиотек. |
| Native-first UX | \`lab/public/index.php\`, \`lab/public/assets/ui.js\`, \`lab/tests/test_browser.py\`, \`lab/tests/test_nojs.py\` | Полезная страница без JS, вкладки, меню, диалог, формы, фокус/клавиатура, мобильный/RTL/крупный текст в Chromium. **Не** ручной WCAG/assistive technology audit. |
| Форма и HTTP | \`lab/src/SubmissionBoundary.php\`, \`OriginPolicy.php\`, \`FormLab.php\`, \`SubmissionHttp.php\`, \`NoJsResult.php\` | Строгий URL-encoded вход, Origin/Host, CSRF/honeypot/time trap, нативная и JSON обработка, ясный статус сети/транспорта, повторный POST запрещён после неоднозначного результата. Нет подтверждённой SMTP-доставки. |
| Телефон | \`lab/src/PhoneAdapter.php\`, \`lab/tests/test_phone_real.py\` | Реальный \`libphonenumber-for-php-lite 9.0.41\` во временной Composer-среде; E.164 и проверка номера с закрытым списком стран. Нет product lock/сервиса проверки абонента. |
| Ограничение злоупотреблений | \`SharedThrottle.php\`, \`ReceiptLedger.php\`, \`PrivateStateMaintenance.php\` и PHP тесты | Однофайловая POSIX/HMAC/flock защита *попыток* от повторов, 12-процессная гонка, fail-closed порча файлов, приватность/права, явная ограниченная очистка. НЕ распределённый idempotency/outbox/production антибот. |
| Картинки | \`lab/src/ResponsiveMedia.php\` (или фактические классы \`lab/src/\`), \`lab/tests/test_media.py\`, \`lab/public/assets/media/\` | Оригинальные локальные AVIF/WebP варианты 320/640/960px, HTML \`picture\`/srcset и реальный Chromium decode. Нет upload/EXIF/virus scan и live LCP budget. |
| Кандидат схемы редактора | \`EDITOR-CONTRACT-PROPOSAL.md\`, \`fixtures/\`, \`lab/src/CapabilityGate.php\` | Закрытые пути редактирования **уже существующего блока**; типы/enum/URL/asset, отказ при повреждённых метаданных. НЕ окончательный AI↔site↔CMS contract. |
| Revision и preview | \`lab/src/RevisionGate.php\`, \`PreviewLab.php\`, \`lab/public/preview.php\` | Только план предлагаемого изменения: expectedRevision, no-op, immutable copy, ограничение int, безопасный текст/CSS/URL/изображения, inert preview/CSP. Нет ACL, DB CAS/сохранения/публикации. |
| Сквозные регрессии | \`lab/tests/\`, \`TEST-EVIDENCE-FINAL-2026-10-21.md\` | Фактические PHP/HTTP/Chromium/schema тесты на проверенном SHA; честно отделены браузерные DOM/bridge проверки от прямого browser TCP, которого нет. |

**История:** блоки 1–4 дали исходное сравнение OSS/базовые компоненты, security и media; 5–11 — строгий POST, формы, preview, телефон, браузер+no-JS; 12–14 — протокол ответа/доступность/независимые границы рендера и ревизии; 15–16 — безопасное приватное состояние/очистка/IPv6/JSON/session; 17 — устойчивость цепочки \`CapabilityGate → RevisionGate → PreviewLab\` к повреждённым редакторским правилам.

## Рекомендации по интеграции: решение главного разработчика

1. **Не сливать PR #4 вслепую.** Это лабораторный материал. Прочитать diff/списки файлов, воспроизвести CI для актуального PR HEAD, выбрать куски, соответствующие архитектуре \`main\`. Существующий production CMS не подменять демонстрационной PHP-формой. Прямая интеграция допускается только по решению главного интегратора.
2. **Компоненты сайтов:** сначала оценить native-first HTML \`details/summary\`, \`dialog\`, простые \`nav/button\`, \`picture/srcset\`. Для статических/ PHP сайтов не добавлять React только ради меню; JS-улучшение не должно ломать работу без JS. Заимствовать **проверяемое поведение и тесты**, не копировать вслепую лабораторную верстку.
3. **Редактор (после официального старта Stage3):** CMS должна управлять **только объявленными свойствами уже существующих AI-сгенерированных блоков**, через server-owned versioned manifest и per-block capabilities. Аутентификация, ACL по сайту/роли, tenancy, неизменность block ID и atomic expectedRevision/DB CAS *до* разрешения публикации. Согласовать совместимость Opis2.6/Jedison1.27.1, semantic URL/media rules и SSR отдельно.
4. **Preview:** один доверенный путь строгой типизации/семантических проверок/контекстного escaping для предпросмотра и публикации, статичные inert actions, CSP, asset ownership/variants, contrast/responsive. Текущий preview — **только hero fixture и только read-only**, не renderer production.
5. **Формы:** возможен перенос идей границ входного POST и fail-closed семантики \`DELIVERY_UNCONFIRMED\`/дублей. **Не переносить файловое хранилище как готовое распределённое решение**. Нужны централизованное throttling, операционный мониторинг, idempotency/outbox, договорённость по внешнему транспорту/проверка реальной почты и безопасное управление секретами. \`202 QUEUED_UNCONFIRMED\` означает принятие транспортом, **не доставку**.
6. **Медиа и библиотеки:** pinned license/NOTICE/transitive deps/legal review, новые реальные bundle+gzip бюджеты, performance и accessibility проверки; \`libphonenumber\` проверена **в disposable CI**, не является уже утверждённой production dependency.
7. **Приёмочные ворота до продукта:** Stage2 acceptance, Stage3 go-ahead, CMS auth/publish/tenancy/rollback, реальный browser↔HTTP TCP и внешний mail, NVDA/VoiceOver/TalkBack + браузерная матрица, React/Next SSR/hydration, разрешённый host-specific deployment/restore. Тесты лаборатории эти ворота **не закрывают**.

## Приоритеты и риски для координатора

- **Высокий приоритет:** независимый source/contract review; совместимость версий стеков и редактора; модель авторизации+ревизий до любых writes.
- **Высокий приоритет:** доставка форм/дублей при транспортной неопределённости; anti-spam multi-host, file storage retention, secret lifecycle. Не утверждать exactly-once и inbox proof.
- **Средний приоритет:** сквозной native/no-JS и keyboard regression набор на настоящих DOM шаблонах, сравнение разметки перед адаптацией.
- **Средний приоритет:** AVIF/WebP пайплайн, адаптивные картинки и LCP/CLS измерения.
- **Не закрыто:** legal sign-off; VoiceOver/NVDA/TalkBack; Safari/Firefox; real Next SSR; Hostinger/CMS deploy; server-side production permission/persistence; фактический outbox.
- **Важный нюанс:** \`SharedThrottle\` нормализует IPv6 и IPv4-mapped IPv6. При переносе в работающий сервис ключей исследовать миграцию предыдущих адресных HMAC bucket; в нашей лаборатории реальные production данные не мигрировались.
- **Важный нюанс:** \`PrivateStateMaintenance::prune\` запускается вручную, сканирует ограниченное число записей и не обещает полного удаления без повторов/оператора; повреждённые записи намеренно сохраняются для расследования.

## Воспроизводимость и передача

\`\`\`bash
# В отдельном девелоперском checkout исследовательской ветки:
cd research/parallel-components
bash lab/tests/run-block5.sh
\`\`\`

Название скрипта историческое; он запускает актуальные PHP/Node syntax/Python/Chromium проверки. Требуются PHP, Node для \`--check\`, Python/Playwright+Chromium, jsonschema/Pillow; настоящая Composer-метадата требует Composer+PHP расширения и при их отсутствии честно SKIP, а не PASS. **Главное подтверждение** — фактический Actions run 39574269556 на кодовом SHA. README текущего lab/ и [финальный протокол](TEST-EVIDENCE-FINAL-2026-10-21.md) описывают точные ограничения.

Главный чат: **не менять автоматически \`main\` из этого поручения и не сливать PR #4**; сначала ознакомься с этим пакетом и реши, что интегрировать в свой этап. Исследовательскому чату больше нечего делать в рамках согласованного объёма; возможные дополнительные задачи — отдельное решение главного разработчика.
