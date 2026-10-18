# ADR 0011 — конечный Stage2 exit-review, host-профили и запрет фиктивной приёмки

**Дата:** 19.10.2026. **Решение:** лабораторная архитектурная политика реализована и проверена. **Закрытие Stage2 владельцем НЕ проводилось**.

## Контекст

Платформа Slim4 + Opis2.6 + Jedison1.27.1 уже имеет многоэтапный CI-only установочный процесс, signed-upgrade lab, изолированные metadata DB, пять семейств посетительского сайта и реальный Apache2.4/Nginx+PHP-FPM стенд. Однако успешный CI не гарантирует работу на конкретном shared hosting, правомерность распространения каждой библиотеки или согласование окончательной архитектуры владельцем.

## Решение

1. **Явные границы.** Одна независимая CMS, отдельный сайт и приватная БД на инсталляцию; только `cms/public` открыт веб-серверу. HTML, PHP, React SPA, Next static export и Next SSR описываются отдельными профилями. SSR требует Node и reverse proxy; это не PHP-only feature.
2. **Профили хостинга — не реальные настройки продакшена.** `cms/src/Hosting/LabHostRequirementProfiles.php` описывает минимальную PHP/runtime ABI, Apache/Nginx rewrite/FPM, отдельные visitor workers и SPA fallback, но ничего не доказывает про конкретный host.
3. **Read-only Architecture Exit Review.** `cms/src/Hosting/LabStage2ExitReview.php` и `cms/bin/lab-stage2-exit-review.php` читают приватную лабораторную fleet+blueprint конфигурацию, полностью проверяют SHA256 каждого CMS-пакета и 43 lock-компонента (Composer14/npm29/Jedison1.27.1), формируют идентификаторы пакетов и требования для каждого сайта. Никаких записей БД, внешних сетевых действий и публикации секретов или абсолютных путей.
4. **Не автоматизировать owner acceptance.** Даже готовая CI-группа возвращает `stage2Accepted=false`, `stage3Authorized=false`, `actualTargetHostTested=false`, `productionReady=false`. Owner gate и проверка реальной целевой среды остаются открытыми.
5. **Операции различаются по риску и разрешению.** Отчёт CI-only, требует явно `CMS_ENV=test`, `CMS_STAGE2_RUNTIME_GATE=ci-bound`, `CMS_ALLOW_SQLITE_TEST_ONLY=1`; PLAN/read-only не дают права на APPLY. На реальном Hostinger нельзя ничего проверять без отдельного прямого разрешения, даже read-only. Запись и деплой требуют самостоятельного согласия.

## Доказательства

Код [`f9bd4d25c`](https://github.com/manufact-test/ai-site-cms/commit/f9bd4d25c996a8504abcb2ac5a896d70ab853db8) и [PHP CI 7/7](https://github.com/manufact-test/ai-site-cms/actions/runs/39174335647), [полный пакет/редактор CI 1/1](https://github.com/manufact-test/ai-site-cms/actions/runs/39174335641), внутри 465 файлов. Никакой production installation, реального Next.js SSR или полноценного backup/revisions; продуктовая приёмка 0/135. Детали в [Stage2 exit report](../STAGE-2-EXIT-REVIEW.md).

## Последствия

Следующий чат должен продолжать от ограниченного, конечного списка Stage2 criteria, не подменяя реальную проверку хоста новыми бесконечными CI-тестами. Согласование архитектуры и явное решение о приёмке Stage2 остаются за владельцем. Правила больших пакетов `docs/DEVELOPMENT-WORKFLOW.md` действуют; документы не обновлять после обычных «продолжаем» без прямого запроса пользователя. Этот ADR создан по прямой просьбе владельца при передаче чата.
