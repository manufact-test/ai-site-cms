# AI Site CMS — рабочая карта v2.0 · 27.10.2026
**Операционный план, не новая фабрика шаблонов.** [Главный MASTER](MASTER-TZ.md). Предыдущие 18 исторических этапов 0–17 не являются блокирующей линейкой: история доступна в Git; перенумерация ниже отражает пользовательский результат, а не лабораторные проценты.

## Приоритет 0 — остановить лишнюю работу и честно разобрать код
- Заморозить старую Design Factory на ветке worker: 12 тем/42 композиции визуально отвергнуты (2/10); нет merge. Старое задание на 3 новых готовых дизайна **отменено**.
- Инвентаризировать зависимости lead core: CMS foundation (cms/), stage3 SDK/site manifest, PHP API/renderer, Studio, media-motion, forms, SEO, export, labs, research. Каждому дать KEEP, ADAPT, DELETE (с доказательством отсутствия runtime/CI/API зависимостей), DEFER, MISSING.
- Удалить подтверждённый мусор из **активной** ветки, не тратить часы на декоративную документацию. Не удалять заочно то, что реально импортируется; не путать историю Git с тяжестью рабочей CMS.
**Done:** короткая опись и исчезновение из shipped/admin bundle заведомо неиспользуемых частей, существующий CI не сломан.

## Приоритет 1 — пилотная цепочка прототип→сайт
- Внешний ИИ изучает UX/SEO/референсы и создаёт три статичных макета: desktop/tablet/mobile, без HTML прототипа. При необходимости варианты.
- Полная client-facing презентация (почему блоки, что делает каждая кнопка, hover/scroll/motion, адаптив, выгоды), плюс переносимая внутренняя спецификация, привязанная к версии 3 макетов.
- После утверждения один настоящий сайт и манифест редактируемых свойств; измеримое визуальное соответствие макетам в 3 режимах; не скрывать несовместимости.
**Done:** один утверждённый макет стал живым сайтом, не перекроенным «на глаз».

## Приоритет 2 — реально удобный редактор
- Просмотреть существующий Stage3 Studio перед созданием очередного редактора. Подключить созданный внешний сайт через явный ИИ↔CMS contract без привязки к фабрике.
- Рабочий UX: список страниц→выбор блока→клик/дерево→свойства в реальном времени→desktop/tablet/mobile→Save→Publish.
- Можно изменить H1, шрифт, button/spacing, изображения, hover/анимацию; один repeater FAQ add/delete/reorder и одна карточная секция; нет свободного CSS/автосейва/новой страницы через CMS.
**Done:** владелец проходит операции руками без разработчика; безопасное Undo/rollback.

## Приоритет 3 — SEO и правильные работающие компоненты
- Сайт получает SEO и архитектуру страниц **при исследовании**, не отдельным генератором после выпуска. Из CMS редактируются URL/Title/Description/H1–H6/alt/OG/robots/sitemap/redirect/schema по исходным #138–155.
- Вставка/удаление FAQ элементов не разрушает семантику/Schema. Форма с серверной валидацией, антиспамом, честной доставкой и явной конфигурацией получателя.
- Второй разработчик делает независимое SEO-ядро **не дублируя core**; главный принимает только нужные части после контракта.
**Done:** CMS-правка SEO и структуры повторяемого контента меняет публичную страницу корректно.

## Приоритет 4 — данные, защита, восстановление и лёгкость
- Изоляция сайтов, auth, multiuser/audit, сохранение ручных изменений при обновлении, публикационная история, backup/restore, защита форм и загрузок, надёжные обновления CMS.
- Без отдельной CRM/платежей/маркетплейса/встроенного AI. MANUFACT лицензии — только минимальная согласованная ручная политика после подтверждения актуальности.
**Done:** реальный сквозной сценарий не теряет данные и переживает недоступность панели.

## Приоритет 5 — технологии и первый показ владельцу
- Минимальная поддержка HTML/CSS/JS, PHP, React/Next в понятных режимах, без требования Node на обычном PHP-хостинге; экспорт/передача не должны превращаться в самостоятельный бизнес-процесс.
- Ранняя демонстрация одного законченного продукта владельцу, большой раунд его фактических правок, адресное исправление. Затем оставшиеся обязательные требования и отдельная финальная приёмка. Изолированный пилот CELIKOM только по новому разрешению.
**Done:** owner GO по работающему сайту + проверка полного согласованного реестра перед внешним релизом.

## Скорость, границы и роли
Главный: \`feature/stage3-ai-site-contract\` + core. Второй: \`feature/site-seo-engine\` + только \`stage3/seo-engine/**\`. Работа крупными вертикалями, минимальные целевые проверки + существующий CI, никаких новых бесконечных лабораторий или «100% готово» по тестам. Нет main merge/Hostinger/prod/CELIKOM без отдельного решения. Не объявлять текущие 0/135 «нулём написанного кода»: это старый официальный статус, не аудит функций.


## Реализовано после 27.10 — поток согласованного сайта (28.10)
- Подключение готового **внешнего** сайта через v1/v2 переносимую папку и серверный Studio: валидируется Typed Contract, закрытый набор компонентов, локальные медиа, индивидуальные Design Graph секции. Нет конверсии PNG в сайт, нет импорта произвольного HTML/JS.
- Новый `custom-section@1.0.0` с обязательным `designGraph` для индивидуальных секций; SEO, FAQ, responsive headings и серверная Save/Publish цепочка покрыты тестовым сайтом. Клиентская уникальность ещё **не подтверждена** реальными утверждёнными макетами.
- `seal-approved-site.cjs` фиксирует локальную approved-v2 папку SHA-256 после явного подтверждения согласования; `verify-approved-site.cjs` отсекает несовместимые пакеты; `audit-approved-site.cjs` строит Markdown-реестр страниц/SEO/QA для пилота без записей в базу.
- Владелец перед подключением смотрит 3 статических макета и **реальный локальный предпросмотр страниц на 1280/768/390 px**, плюс оба описания. Отмена не создаёт сайт. Действующая публикация не меняется до отдельного Publish.
- Основной незакрытый результат: **один настоящий сайт, созданный внешним ИИ после реального утверждения макетов, принят владельцем по desktop/tablet/mobile и затем отредактирован/опубликован**. Только после этого переходить к UX-полировке и поздним функциям. Нельзя использовать CI/синтетические изображения как суррогат приёмки.
- Длительный CI hosted-browser может выявлять остаточные проблемы FAQ/предпросмотра; следующий главный чат проверяет последний запуск GitHub Actions прежде, чем объявлять зелёным. Разрешены только адресные фиксы и существующие базовые проверки, не новые лаборатории.


## Крупный интегрированный блок — подлинные материалы, сравнение и аварийное восстановление (28.10.2026)

- Подключение sealed v2 готового сайта сохраняет **семь оригинальных документов** в закрытом owner-only evidence vault: handoff, source site.json, 3 утверждённых PNG/JPEG/WebP изображения, описание для клиента, реализационная спецификация. SHA-256, неизменяемость, идемпотентная дозагрузка, независимые версии; **не** доказывает личность клиента/одобрение и не подменяет клиентскую приёмку.
- Запуск сайта в Studio объединяет **реальный PHP full-page предпросмотр** всех страниц на трёх устройствах, проверку медиа/горизонтального переполнения, сравнение с действующей публикацией и **прямое сравнение оригинальных утверждённых картинок с PHP-черновиком**. Сравнение с исходным макетом явно относится к главной странице при наличии одного набора макетов; внутренние страницы не отмечать как визуально утверждённые автоматически. JSON-отчёт включает SHA-256 исходного пакета и раздельные ручные отметки.
- Полная приватная резервная копия **manufact-site-backup-v2** теперь переносит и архив согласования, проверяя каждый байт и исходный ledger на сервере **до** атомарного восстановления на новый siteId; **публикации при восстановлении нет**. Утверждённый source site.json нельзя переписывать новым ID. Повторные циклы восстановления сохраняют оригинальные байты, legacy v1 поддерживается. Архив до 64 МБ: при превышении явная ошибка, без тихого исключения доказательств. Existing DB: только CLI migration `STAGE3_ALLOW_APPROVAL_UPGRADE=YES php stage3/server/bin/upgrade-approval-evidence.php`.
- Проверено в существующем PHP/SQLite + real Chromium E2E на синтетическом v2 пакете; **этот синтетический пакет не клиентский пилот**, успешный CI не доказывает соответствие уникального готового сайта утверждённым изображениям.
- **Далее без дробления:** первый настоящий сайт из внешнего approved handoff, полностраничный визуальный разбор desktop/tablet/mobile, исправление несовпадений в одном большом проходе, реальное редактирование и owner GO. До предоставления оригинальных согласованных материалов не выдумывать клиента и не называть техническую проверку приёмкой. Не работать в SEO-ветке второго разработчика, main или prod.


## Большая вертикаль: отдельные утверждённые макеты внутренних страниц (28.10.2026)

Sealed v2 принимает необязательный files.pagePrototypes: три исходных изображения на каждый из максимум 20 реальных внутренних page.id; главная всегда сохраняет обязательные базовые desktop/tablet/mobile. Поддержка проходит через offline seal/verify/audit, import preflight с полным SHA256, визуальный просмотр каждой страницы в Studio, закрытый immutable evidence vault, настоящий PHP launch review, JSON report, полный backup v2 и изолированный restore. Без независимого оригинала внутренняя страница не считается визуально согласованной: CMS не заменяет её макет картинкой главной. Большая существующая Chromium/PHP/SQLite проверка теперь включает синтетический двухстраничный approved пакет. Это тест совместимости и сохранности, НЕ доказательство настоящего клиентского согласования. Прежние пределы остаются: handoff до 100 МБ, backup JSON до 64 МБ, макет до 8 МБ. Следующая крупная задача — реальный внешний approved site, ручное сравнение каждой страницы и owner GO.


## Финал рабочего захода 28.10 — настоящий контент и передача главному чату
- Единый согласованный лимит 1 МБ на оригинальное PNG/JPEG/WebP изображение и каждый responsive вариант: офлайн seal/verify, Studio preflight, прямой media upload, встроенная оптимизация, PHP immutable storage, preview, resume, приватный backup-v2 и восстановление. Базовая совместимость проверена **живым PNG ~577 КБ** (выше прежних 450 КБ) через HTTP/SQLite с lossless backup→restore, заведомо oversized файл отклоняется.
- В импортном ревью и офлайн Pilot Audit теперь видны объём медиа, количество отдельных макетов и нижняя граница объёма полной резервной копии. Если изображений уже близко к 64 МБ в JSON, владелец видит предупреждение ДО импорта. Превышение полной backup-v2 ёмкости по-прежнему явная ошибка; не объявлять резервное копирование успешным, если файл не выдан. В хранилище допускаются несколько подписанных версий многостраничных пакетов при неизменности оригиналов.
- Продуктовые риски перед первым настоящим GO: входные оригиналы клиента ещё не предоставлены; CSS/layout и интерактивность индивидуального макета нужно оценивать **на реальном** выбранном сайте; отдельные ограничения большого package/backup и PHP request/memory необходимо проверить против его веса; защита публикации и ручное визуальное решение остаются.
- Следующий большой блок: **один настоящий externally AI-authored approved-v2 пакет → owner review → импорт → реальные правки текста/фото/адаптива/FAQ/SEO → сравнение каждой доступной исходной картинки с полным PHP → Publish/Rollback → backup+restore → owner GO**. Если оригинального утверждённого сайта пока нет, закончить значимые отсутствующие возможности из MASTER/135 обязательных, не делать бесконечные синтетические проекты вместо пилота.
- Официальная передача — [MAIN-HANDOFF-v4.0-2026-10-28.md](../handoffs/lead-integrator/MAIN-HANDOFF-v4.0-2026-10-28.md). Старые handoff v2.1 и CODE-SCOPE-AUDIT сохраняются как исторические, а не текущий статус. Никаких deploy/merge, не трогать SEO рабочего `feature/site-seo-engine` / `stage3/seo-engine/**`.

## Итог последнего большого захода перед сменой главного чата — 28.10.2026
Полный image art-direction workflow: AI author задаёт базовое `assetId` и отдельно `responsiveMedia.tabletAssetId`/`mobileAssetId` для настоящих иллюстраций и фотографий, не только `backgroundMedia` секции и не resize одного и того же изображения. Manifest JSON Schema, JS/PHP валидаторы и рендереры, безопасный `picture/source`, owner Studio full editor/workbench, local draft replace/detach, PHP atomic media maintenance, hosted inventory, approved-v2 ID remapping, tests контракта и PHP/Chromium связаны в одну вертикаль. Нет новых runtime зависимостей, нет free HTML/CSS/JS.
Проверенная ранее функция responsive **background images** остаётся отдельной; искусственный пример approved пакета тестирует передачу, но не реальную визуальную приёмку. Настоящие согласованные клиентом материалы **не предоставлены**. Поэтому следующая цель без дробления: первый реальный approved-v2 сайт → фактическая проверка каждого изображения desktop/tablet/mobile → импорт → владелец редактирует контент, фото, структуру, адаптив, FAQ, SEO → Save → PHP launch review → Publish → Rollback → backup/restore → owner GO. Если пакета нет, выбирать **крупную отсутствующую обязательную возможность** (например #26 безопасное видеофоновое оформление), не клонировать дизайн-фабрику и не множить проверки. Точную точку HEAD/CI определять в GitHub при старте нового чата.

## Крупная функциональная вертикаль: видео на фоне секций (#26, 28.10.2026)

Индивидуальный Design Graph поддерживает `container.backgroundVideo` с локальным MP4,
обязательным растровым постером, отдельными обложками для планшета/телефона,
необязательным затемнением и позицией кадра. В обычном режиме ролик воспроизводится
без звука и циклически; при reduced motion и на телефоне CSS скрывает движущийся фон
и показывает обложку. Это декоративное видео, а не интерактивный плеер.
Валидаторы JS/PHP запрещают чужие asset ID, неверный тип медиа и конфликт фонов.
Studio и workbench редактируют фон с общими Undo/Save/Publish; импорт, аудит,
замена и очистка медиа учитывают ролик и все обложки.
**Нет реального согласованного клиентом approved-v2 сайта, owner GO не получен.**

## Крупная функциональная вертикаль: многошаговые формы (#82, 28.10.2026)

Для существующего `lead-form-flex` добавлен **необязательный** `formSteps`: 2–4 именованных шага,
распределение всех стандартных и дополнительных полей ровно по одному шагу, совместимость
с условными зависимостями и строгая синхронная валидация JS/PHP. В Studio конструктор
показывает выбор шага для каждого реально используемого поля, заголовки, количество
шагов; изменения проходят общие Undo/Save/Publish, а не отдельное сохранение.
На опубликованном PHP-сайте работают переходы назад/вперёд, проверка видимых
обязательных полей, прогресс и полноценная серверная отправка **одним** POST
по неизменяемой опубликованной схеме, включая прежние антиспам и доставку.
Если JavaScript отключён, все шаги отображаются одновременно — форму можно отправить.
Публичный inline-скрипт ровно один, фиксирован в first-party PHP и разрешён CSP
только по SHA-256. Старые формы без `formSteps` остаются одностраничными.

**Не закрыто этим блоком:** реальная клиентская визуальная приёмка первой площадки;
после появления согласованного approved-v2 пакета требуется ручной end-to-end по
трём оригинальным макетам и отправке заявки. Зелёный CI не подменяет owner GO.

## Крупный блок №64 + №73 — POPUP и последовательное движение (28.10.2026)

- Граф индивидуального сайта поддерживает узел `popup` только на корневом уровне,
  с собственным стабильным ID, доступным названием и редактируемыми дочерними
  графовыми элементами (текст/изображение/кнопки/вкладки). Кнопка с
  `popupTarget` вместо `href` открывает его через нативный Popover API:
  закрытие кнопкой, кликом снаружи или Esc; нет внешнего скрипта, зависимости,
  произвольного URL/HTML или переписывания оригинального макета.
- Контейнер `sequence` включает типизированные effect/duration/delay/stagger/easing
  для прямых дочерних элементов. Предварительная проверка отсекает недопустимые
  эффекты, конфликт с собственной анимацией ребёнка и слишком длинные цепочки;
  `prefers-reduced-motion` выключает анимацию. Это **появление при загрузке**,
  не триггер прокрутки (#55 остаётся отдельным частичным требованием).
- Studio: создать popup, редактировать содержимое, выбрать действие кнопки,
  просмотреть его открытым, настроить/выключить последовательность.
  Обычные Undo, черновик, Save, Publish и rollback используют тот же typed graph.
  PHP и JS рендереры не исполняют сторонних скриптов. Существующие
  контрактные, PHP и Chromium проверки показывают совместимость, не owner GO.
- Ограничение: popup — **не модальный trap-focus диалог и пока не форма-заявка**
  внутри окна; для реального утверждённого дизайна с обязательной формой
  внутри popup понадобится отдельная безопасная first-party интеграция.
- Ранее реализованные многошаговые формы (#82) переведены в реестре в
  `implemented_candidate` вместо устаревшего `not_implemented`;
  ни один пункт не объявлен принятым владельцем.

## Комплексный проход: адаптивное оформление, эффекты взаимодействий и анимация прокрутки (28.10.2026)

- Единый контракт индивидуального Design Graph обновлён для управляемых
  `motion.trigger=scroll`, `motion.easing` и `transition` hover/focus/tap.
  JS/PHP генерируют одинаковые типизированные CSS правила. Scroll использует
  нативные CSS View Timelines, **без JS**, и только там, где браузер поддерживает
  `animation-timeline:view()`. Без поддержки — **видимый статичный контент**,
  а не скрытый заголовок. При `prefers-reduced-motion` нет движения.
  Для scroll длительность привязана к прогрессу просмотра, а не к миллисекундам.
  Задержка при scroll запрещена. Сохраняется load-motion с длительностью/задержкой.
- Настоящая `shadowFine` задаёт x/y/blur/spread/color/inset, включая дизайн-токены;
  запрещены небезопасные CSS и одновременные `shadow` + `shadowFine`.
  В Studio открыт инспектор теней, рамок, размеров, фильтров, состояний hover,
  keyboard focus и tap, а также быстрый Workbench-инспектор размеров,
  границ и кадрирования.
- Workbench теперь управляет отдельными фоновыми изображениями на ПК/планшете/
  телефоне, режимом cover/contain и позициями X/Y, создаёт popup внутри
  текущего графа на корневом уровне и связывает кнопки с окном. Всё проходит
  Undo, сохранение, публикацию и PHP-рендеринг без отдельного runtime.
- Предыдущие многочисленные частичные требования по графовым свойствам
  обновлены до `implemented_candidate` с путями JS/PHP/Studio/целевых проверок,
  **не ownerAccepted**. Это не означает готовности ко всем заказным макетам.
- Крупнейшие внешние ограничения прежние: отсутствует реальный клиентский
  утверждённый approved-v2 сайт, нет разрешения на production, ручное owner GO
  невозможно заменить синтетическим CI. Ветка SEO второго разработчика
  не изменялась.

## Крупный интеграционный заход — общие секции, проверка CMS, иконки, операции и публичная скорость (28.10.2026)

### №144. Общие секции нескольких страниц (законченная техническая вертикаль)

- `sharedKey` в секции связывает **экземпляры на разных страницах одного сайта**, а не
  переносит одну HTML-структуру с повторяющимися ID. Каждая страница сохраняет
  свои section/element/repeater/Design Graph/node IDs; кнопки popup переназначаются
  на popup внутри собственного экземпляра.
- JS и PHP отвергают несовпадающее содержимое одного `sharedKey`, повтор группы
  на одной странице и более 20 экземпляров на группу — до Save/Publish.
- `D.structure(linkSharedSection|detachSharedSection)`, `D.edit`,
  `D.replaceSite` атомарно синхронизируют данные, композиции, карточки,
  адаптивные стили и настройки формы. **Одно Undo** откатывает всю связанную правку;
  обычная «Копия» остаётся независимой.
- Обе Studio: статусы/страницы, «связать», «добавить на другую страницу»,
  «отвязать», редактирование с синхронизацией. PHP публично рендерит все
  экземпляры, публикация по-прежнему только явная.

### №191. Проверка подключения к текущей PHP CMS (частичное требование)

- Владелец видит кнопку «Проверить подключение» и отчёт. Авторизованный endpoint
  проверяет целостность сохранённого черновика, публикацию, локальные
  изображения и реальный PHP-рендер; публичный read-only canary
  `/published/{siteId}/_cms-connect` возвращает версию без приватных данных.
- Studio реально запрашивает этот same-origin URL и сопоставляет версию.
  После отдельной Publish это происходит **автоматически без модального окна**,
  чтобы не прерывать работу. Нарушение соединения показывается отдельно от
  успешного факта публикации.
- Внешние домены, архивированные static/Next-сайты и автономные серверы не
  подтверждаются этой проверкой, поэтому глобальное требование №191
  остаётся частичным до внешнего владельческого пилота.

### №44 / №45 и №18. Иконки и точная позиционная коррекция

- Встроенная библиотека SVG-путей расширена до **31 символа**; типизированный
  `iconSize` 12–128px, `iconWeight` thin/regular/bold и screen-reader alt,
  самостоятельные JS/PHP рендереры и UI двух редакторов.
  Нет загрузки произвольного SVG/HTML/JS. Специфические клиентские иконки
  за пределами безопасного каталога потребуют отдельного утверждённого
  asset-binding контракта.
- В полном Design Graph есть кнопки сдвига X/Y на 1 или 10px, предел ±600px,
  сброс и Undo; быстрый Workbench редактирует точные X/Y для устройства.
  Изменения сохраняются в обычном site.json и публичном рендерере.

### №173 и №187. Работа с публичным сайтом и ошибками

- Журнал ошибок владельца агрегирует последние 24 часа и 7 дней отдельно
  для CMS API / посетителя / сборщика форм, фильтрует последние 30 записей.
  Сохраняются тип/время/случайный ID, не IP и не содержание заявок.
- Публичные HTML-пути с точной публикацией получают conditional ETag и
  `Cache-Control: public, no-cache, must-revalidate`. Идентичный запрос
  возвращает 304 без генерации страницы; контроль включает версию, origin и
  настройку/секрет формы. Maintenance, redirects и 404 проверяются раньше.
  Экспорт статических HTML/Next не затрагивается, поэтому производительность
  №187 продолжает требовать измерений реального сайта.

### Дополнительная интеграционная совместимость

- Безопасный перенос секции **между разными сайтами** теперь корректно включает
  responsiveMedia и фоновые растровые/MP4 asset-ID, наложения, shadowFine,
  активные состояния, связи popup после нового ID. Исходные design tokens
  превращаются в конкретные безопасные значения; `sharedKey` не переносится
  между сайтами. Ни публикация, ни пользователи, ни права не копируются.
- Расширены существующие Node/PHP/HTTP/Chromium смоки для этих сценариев,
  не запущен новый тестовый проект. Зеленый CI подтверждает синтетическую
  технологию, но **не visual approval** первого реального клиента.
- Owner GO, реальные утверждённые 3 макета, production-права и отдельный
  внешний пилот по-прежнему отсутствуют. main и ветка SEO не изменены.

## Следующий крупный проход — план после green checkpoint d8cfdb2f23ef (28.10.2026)

Текущий технический реестр: **124 инженерных кандидата, 5 частично
реализованных, 6 зависящих от разрешённого владельцем окружения,
0 лично принятых владельцем**. Green CI #40758345036 соответствует коду
`d8cfdb2f23ef94e111c63e2965f757c21bfca1b8`; это не подтверждение полной пользовательской готовности.
До настоящего approved-v2 клиента нельзя объявлять визуальную приёмку.

**Порядок работы:** первый реальный клиентский сайт всегда приоритет №1
после получения согласования. Без пакета — несколько полезных сквозных
функциональных блоков за один заход **~30 минут активной разработки**;
время — ориентир объёма, не искусственное ожидание. Быстро закончил блок —
самостоятельно взять следующий. Сначала функциональность, затем целевые
проверки и один финальный CI, потом документация и короткий отчёт.
Нельзя завершать очередной заход лишь потому, что один блок занял 10 минут.

**Рекомендуемые оставшиеся вертикали:**
- #80: проверить уже имеющиеся per-site email/Telegram/outbox и завершить
  необходимые сценарии назначения получателей/обработчиков форм, без CRM.
- #178: сверить реальные Next Static/SSR prove с требуемым индивидуальным
  клиентским сайтом; не создавать сторонний framework или site factory.
- #187/#191/#193: уменьшение размера и влияния на скорость; local
  PHP connection check уже есть, внешняя проверка без разрешения
  не проводилась.
- #174/#175/#181/#183/#184/#185: отдельное окружение, независимые
  БД, установка, обновление и откат движка — только безопасный offline
  preparation до самостоятельного owner-approved deployment.

Передача следующему главному чату:
[`NEXT-MAIN-CHAT-START-2026-10-28.md`](../handoffs/lead-integrator/NEXT-MAIN-CHAT-START-2026-10-28.md).
Ветка `feature/stage3-ai-site-contract`; SEO в чужой изолированной ветке
`feature/site-seo-engine`, `main` и production не трогать.

## 28 October 2026 — integrated form routing, cache, independent release identity and offline engine package

Four additive product blocks were implemented on the lead branch, without changing main, production, the SEO engine or customer databases:

1. Requirement #80: private owner-only per-form Email/Telegram notification routes. Each existing lead-form or lead-form-flex section independently selects site default, disabled, or custom recipient. Changes require a reason and optimistic version, and are rejected for unknown forms. New queued notifications snapshot their recipient, so later routing edits cannot redirect previously accepted leads. Existing site-wide delivery/outbox, retry, uncertain-send controls, inbox and lead review are reused. Recipient settings and queued leads are private operational records, not public site.json or the content-only backup-v2.
2. Requirements #187/#193: hosted first-party Studio JS/CSS assets have optional gzip, representation-specific ETag, Accept-Encoding Vary and no-cache revalidation (304). Private HTML/API and visitors are not changed. This is not yet evidence of real Core Web Vitals on an external host.
3. Requirements #178/#191: independent published PHP, Next Static and Next SSR visitor builds expose /_cms-connect.json, a read-only release identity containing siteId, publishedVersion, sourceRevision and releaseManifestSha256. This verifies identity if inspected on a host, not availability, correct deployment, or remote CMS connectivity.
4. Requirements #184/#185/#193: new offline-only engine shipment tool at stage3/bin/cms-release.cjs. The pack, verify and compare commands produce a bounded first-party runtime copy and SHA256 manifest; they reject tampered or untracked package files and allow comparing two versions. There is no network, deploy, database migration, DNS cutover, production release activation, auto-update or automatic rollback. Unsigned checksums are integrity evidence, not source authentication.

Operational usage:
- Form routing appears in owner-only hosted Studio under External lead notifications; selected form inherits, disables or overrides each channel. The delivery routes table and outbox target column need the existing explicit isolated CLI upgrade: STAGE3_ALLOW_DELIVERY_UPGRADE=YES php stage3/server/bin/upgrade-delivery.php. NEVER perform an upgrade on a real DB without explicit owner authorization and a separate DB backup. Old outbox rows retain legacy default targeting.
- Engine offline pack: node stage3/bin/cms-release.cjs pack /ABS/REPO /ABS/NEW-RELEASE; verify: node stage3/bin/cms-release.cjs verify /ABS/RELEASE; compare: node stage3/bin/cms-release.cjs compare /ABS/OLD /ABS/NEW. Only new paths are written. New installation and DB update remain environment gates.
- On independent PHP: manually GET /_cms-connect.json. On Next Static/SSR: static public/_cms-connect.json ships with the bundle. Never assume correct external deployment until owner verifies matching URL and actual site behavior.

The existing PHP/SQLite HTTP E2E includes targeted checks for private routing, immutable queued recipient, Studio asset revalidation, independent runtime canary, and offline engine package tamper rejection. Final matching CI must be checked separately after documentation commits. The first real client-approved v2 site is still absent. Owner accepted MUST: zero. No deploy, PR, merge, or changes to SEO branch.

### Additional lightweight host profile

The offline CMS package CLI now supports a second, deliberately separate
profile: node stage3/bin/cms-release.cjs pack-php-host /ABS/REPO /ABS/NEW-PHP-HOST.

Unlike a full developer/transfer bundle, the compact PHP profile contains
PHP CMS server and migration entrypoints, component manifests, the *compiled*
Studio editor and its exact needed media scripts. It excludes SDK sources,
Next/ZIP export build tools, uncompiled Studio sources, demos and tests.
It runs with a PHP host and does not require Node at visitor/admin runtime.
Use the full source tree on a separate build machine for Node-based D2/D5
Next/ZIP delivery workflows; this limited profile does NOT ship those CLI
export tools. Both profiles carry the same fail-closed integrity inventory.
Verifying either profile works with the full source CLI; comparing packages
of different profiles is explicitly prohibited (not an upgrade path).

The host profile does NOT install to a real server, create/upgrade the live
DB or authorize remote operations; its actual suitability must be verified
on a dedicated owner-approved target before any changeover. The normal
runtime package is unchanged unless the operator explicitly uses
pack-php-host.

## Lead integrator development pass — 29 October 2026 · independent visitor runtime parity

This pass closes published visitor behavior rather than creating another website factory.

- **#178, Next.js Static / SSR form parity.** The sealed PHP publisher appends a first-party wizard script after multi-step flexible forms. React dangerouslySetInnerHTML never executes those scripts. The standalone Next adapter now extracts ONLY this publisher script from verified released HTML, rejects unexpected or differing body scripts, and activates native Next/Back controls, per-step validity, dependent field handling and native HTTPS collector submission through next/script afterInteractive. Published form action, release and HMAC tokens are preserved. No generic arbitrary JS or new external dependencies. SEO metadata additionally carries Open Graph locale, social image alt and authored Twitter card information.
- **#187, standalone PHP MP4 playback.** A separate PHP visitor supports single validated HTTP byte ranges, suffix and open-ended requests, 206/416, If-Range, exact immutable ETags, HEAD, Content-Length and bounded streaming. Browsers can seek MP4 media without downloading the whole file again. CMS storage and source files are unchanged.
- **#187, standalone PHP page revalidation.** Published HTML, sitemap.xml and robots.txt now support conditional HTTP 304 from immutable release SHA-256 ETags. The independent public canary remains no-store.

Existing server-e2e checks a real locally published flexible multi-step form exported into both Next adapters; real loopback standalone PHP video seeking/HEAD/invalid-range and page/sitemap conditional requests. Green synthetic CI is engineering evidence only, not proof of an externally hosted real approved-v2 site or owner visual sign-off.

Open gates remain actual customer approved-v2 input, desktop/tablet/mobile visual review, authorized external Next/React hosting, real Core Web Vitals and remote URL verification. Do not change owner-acceptance counters or partial/environment-gate statuses solely for these implementation improvements. No main/SEO/production/Hostinger/PR/merge/deploy changes.

## 29 October 2026 — real approved-design review in hosted Studio (lead branch)

Product-driven browser workflow added to the existing Save → Review → Publish route; no new generator, service or freeform CSS.

- The operator can view the SHA-256-checked ORIGINAL approved screenshot directly over the real script-disabled PHP draft iframe at the exact desktop/tablet/mobile preview width; the overlay opacity slider changes only comparison visibility and never edits the site. The toolbar warns when the approved raster's native width differs, because scaled images must not be called pixel-exact.
- Side-by-side draft vs publication and draft vs approved prototype can synchronize full-height viewport scrolling, with an explicit checkbox to disable it. Overlay and side-by-side modes remain separate and the original archive remains private.
- Human review discrepancies are tied to page ID/path, 3-device mode, scroll Y and reviewed draft revision. Open discrepancies block marking the specific screen reviewed and block the review Publish shortcut. Closing each finding requires an explicit operator action; it does not approve the page.
- Original-source viewing is required before screen sign-off when a COMPLETE private approved-v2 source is available for that page/device. The source must successfully load and match its archived SHA-256. Missing optional per-page prototypes do not become fake approval.
- Review JSON exports include open/resolved visual findings. A previous same-site report can be imported with strict schema/page/device/revision checks; notes for another revision are reopened, and old reviewed-device badges are NEVER restored. Notes survive closing/reopening the review in the same browser tab and same revision only; logout clears memory. For long-lived review handoff download the JSON; no claim of database-backed review notes.
- A one-click plain-text fix brief copies only unresolved notes for an external AI/designer, referencing page, device, scroll Y and revision, with a reminder to edit only typed draft content and perform fresh human Save/Publish checks.

The existing real-Chromium approved-v2 browser E2E was extended to cover actual original blob overlay + opacity adjustment, unresolved note gate, report import and source-open-before-sign-off; the published-site side-by-side comparison also checks optional sync scrolling when both panels are scrollable. No extra broad testing framework. These are **tools supporting manual review**, NOT automatic visual diff, not 1:1 certification, and not client owner GO. First authentic real-client approved-v2 and external host still required. No main, SEO branch, production, DB schema, Hostinger, deployment, PR or merge changes.

## 29 October 2026 — public form return journey, localization and PHP visitor transfer

A second and third integrated user-facing path completed after the approved-source review tooling:

- **Published form return path (#81–84).** The PHP renderer now emits an optional hidden `_return` pointing only at the form's current immutable published page. Hosted /published pages can use the local route; independent PHP/static/Next publications include the link only when the operator has explicitly supplied a public site origin. The collector strips `_return` from submitted lead fields (not included in the private inbox or notifications), validates the suggested target against the EXACT same published release and actual form-page route, and checks same-origin/explicitly allowlisted HTTPS host. Only after a successfully accepted form POST does it display a manually clicked return link. Arbitrary external redirects and automatic URL navigation remain forbidden. Existing HMAC token, anti-spam, lead persistence, inbox and delivery are unchanged.
- **Six approved site languages on visitor receipt.** The collector uses the immutable published site's validated locale (`ru`, `en`, `pl`, `de`, `be`, `uk`) for success, invalid submission, maintenance, overload, temporary failure and return link labels. It does not trust a visitor-supplied language override. The collector-only deployment remains separate from Studio.
- **Hosted PHP pages and search resources (#187).** Public PHP HTML optionally gzips with encoding-aware strong ETag, `Vary: Accept-Encoding` and conditional 304. The public sitemap.xml and robots.txt get content SHA ETag/304 no-cache revalidation; no stale multi-day HTML caching. No extra runtime dependency beyond optional built-in PHP zlib. Editor/draft/private routes remain no-store. Independent export visitors retain their previous separately verified caching and source-identity contract.

Existing server HTTP E2E tests prove a real published form's safe return metadata, immutable collector persistence and localized English submission, plus independently published forms with explicit and missing origins, hosted gzip representation differentiation and conditional SEO resources. Existing browser E2E checks real approved-source review (not owner-accepted). No real customer or production test, no main/SEO branch/deploy/Hostinger/real DB changes. Owner acceptance still zero, requirement categories unchanged.

## 29 October 2026 — durable owner visual review and honest publish gate

Implemented on the isolated lead branch after the visual comparison UI already existed. This is an operational CMS feature rather than test-only work.

- New private Stage3 `stage3_visual_findings` table and `VisualReview` PHP repository trait store human observations for one **saved draft revision**: exact page ID/path, desktop/tablet/mobile, real scroll Y, note, createdBy/createdAt, status, optimistic version and resolvedBy/resolvedAt. Owner-only GET/create/resolve and atomic bounded import endpoints are CSRF/role/site scoped; max 200 per revision; no arbitrary content, HTML, JS, URL or public visitor exposure.
- Notes are pulled from server automatically when opening the existing launch review, synchronized on create/resolve/import, and shown in a new site-wide dashboard with quick jump to the correct page/device/scroll position. Cross-tab conflicts refuse silently lost updates. A legacy database lacking this **optional** table gets explicit local/JSON-only UI and cannot pretend to have durable storage.
- Direct PHP Publish rejects any open current-revision visual findings, not just the Studio review shortcut. Save carries open findings to the next saved revision for pages that still exist, so a no-op Save does not bypass a visual defect; resolved observations are retained only in the historical revision. Removing an entire page removes that page's applicability to the new revision, but its source note stays in previous history. **Manual visual sign-offs are not persisted or auto-copied**, and no note implies client acceptance.
- New owner-authorized, **CLI-only** schema upgrade `STAGE3_ALLOW_VISUAL_REVIEW_UPGRADE=YES php stage3/server/bin/upgrade-visual-review.php` is guarded against foreign tables and is idempotent on a separately authorized and backed-up dedicated DB. No HTTP migrations, no production DB touched.
- Full private `manufact-site-backup-v2` now includes the bounded historical visual review ledger, validates each finding against its exact immutable revision/page before any write, and atomically restores it into a **new** private site ID without publishing. Existing older backup-v2/v1 without `visualFindings` remain valid. Restoring note-bearing archives into a DB that has not received the explicit upgrade is refused during read-only preflight.
- The existing real SQLite/PHP HTTP E2E and owner Chromium approved-v2 review now exercise this path, including migration refusal/opt-in, persistent notes, stale resolver CAS, deduplicated atomic import, cross-revision carry, direct publish gate, private backup compatibility/tamper refusal and restored note history.

Owner acceptance and real-client design match remain unverified; do NOT infer them from stored human notes or screenshots. Current branch owner accepted=0. No changes to main, parallel SEO scope, external hosting, live DB, deployment or customer data.

### Visual issue history extension

The private visual review API also offers owner-only `GET /api/sites/{id}/visual-review/history` (bounded counts per last 100 revisions), and read-only historical `GET /api/sites/{id}/visual-review?revision=N`. Writes always require the CURRENT saved revision; old historical notes may never be edited, deleted or impersonated. Hosted Studio has an optional History section inside the visual review dashboard, with per-revision counts, full operator/timestamp details and no historical approval controls. This closes the gap where a saved draft advanced and the operator could no longer inspect the previous findings. The existing signed-source human visual check remains separate; none of the history constitutes approval.

## 29 October 2026 — portable per-page pilot review and correction handback

The existing loopback-only `capture-approved-site.cjs` has been completed as a **usable offline owner workflow**, not just a folder of screenshots. It now preserves each interior page's three distinct sealed-v2 originals when provided, correctly reports missing originals otherwise, includes both client-facing/source specification documents, and renders a standalone CSP-pinned `report.html` for page/device navigation, adjacent/overlay comparison, synchronized scroll, note entry, JSON re-import and text fix briefs. No automatic pixel certification is claimed.

Portable manual notes have their own schema `manufact-offline-visual-review-v1` tied to the immutable sealed handoff SHA256 and capture time. Owner Studio's existing review-import control accepts verified matching offline packages into the private, revision-bound visual finding workflow; all offline approvals/closed checkboxes are explicitly discarded as non-authoritative. A separate `verify-capture.cjs` checks copied source bytes and real screenshot checksums against original sealed-v2 assets, exact filenames and unchanged report HTML before transfer. These tools do NOT deploy, publish, make HTTP calls outside loopback or change any real owner DB. The browser E2E exercises actual published PHP capture + per-page source, interactive review/notes export/import, source integrity refusal on tampering, and return of open offline notes to Studio. The remaining real first-client package and owner personal GO are still absent.

## 29 October 2026 — visitor-language parity and accessible published form flow

This final large lead-chat pass improves actual visitor-facing forms and navigation across native hosted PHP, independent PHP/static HTML and Next Static / SSR, without creating a second editor, runtime, design generator or schema:

- **Six-language publisher-owned visitor chrome**: validated `ru/en/pl/de/be/uk` controls the mobile menu label and navigation aria-labels, the Back/Next buttons and step progress for multi-step forms, and offline static redirect fallback headings/links. Site-owned page copy and the FormGateway's separate localized receipt stay unchanged. Strings are a fixed first-party dictionary, never executed client content.
- **Keyboard-complete native multi-step forms**: Enter on a filled early step now advances even when later steps have required controls; it no longer fails the browser's pre-submit constraint validation against a hidden future step. During wizard operation the script uses `noValidate` only to defer global checks, and explicitly calls native `checkValidity()/reportValidity()` for the current step while navigating, **every step, active conditional fields and mandatory consent** before final submission. Backward navigation retains user entries, programmatic step focus goes to the legend, active step carries `aria-current=step`, and visible keyboard focus was added. This is still a normal browser POST to the immutable tokenized form collector; the server remains authoritative. If JS is disabled, standard HTML fieldsets/validation still exist.
- **Next.js form execution integrity**: the independent package generator now extracts the exact trusted first-party PHP wizard script, SHA-256 pins it in generated `lib/wizard-contract.js`, and the Next visitor runtime refuses any inline script whose bytes do not match. Route-derived unique `next/script` IDs prevent Next's single-ID de-duplication from dropping a wizard after navigating to another page. No generic third-party script execution, private CMS database, credentials or new dependency was introduced.
- **Narrow real-world checks**: the existing PHP HTTP E2E verifies a published Polish site, localized navigation and form markup, localized static redirect and the exact Next Static/SSR script fingerprint. A focused real Chromium scenario checks native Enter/Back, conditional required input and consent; the existing Next Static/SSR build and runtime tests remain in place. Only these practical paths were extended, not a new test framework.

Functional work and documentation stay strictly on `feature/stage3-ai-site-contract`. `main`, SEO-worker `feature/site-seo-engine`, customer hosting and DB migrations remain untouched. No real-client approved-v2 source or owner GO was available; the mandatory registry counts are unchanged and **no feature is personally accepted merely because CI is green**. The next chat must verify actual branch HEAD and its matching final GitHub Actions jobs before coding.

## 29 October 2026 — release-readiness form inventory for the first real client pilot

A final lead-chat product pass added a practical read-only form readiness path within the EXISTING hosted Studio launch review. It does not add a second CRM, any outgoing test email or a new database. The current branch remained on `feature/stage3-ai-site-contract`, separate from SEO/main/production.

- Owner-only `GET /api/sites/{id}/launch-forms` reads current saved draft and **still-live published** forms (including forms removed from the draft but still publicly deployed). Each form's section/page/source and effective Email/Telegram modes are evaluated against current private site defaults and custom form routes, plus transport configuration. Missing recipient or sender/bot transport returns `configuration_required`; configured transport is `configured_unverified` — never "delivered". Explicitly disabled external notifications show inbox-only handling as a transparent owner decision, not a guaranteed external notification.
- A second server-side layer aggregates **actual local saved lead totals and queued delivery states per form**, not across the entire site, without exposing visitor email, content, recipients, bot tokens, or secrets. Provider acceptance remains unverified as a real human inbox receipt.
- Existing Studio `Проверка сайта перед публикацией` shows each form, settings status, errors/uncertain outbox outcomes, links to the already-existing per-form routing editor, and same-origin URLs for **manual** testing of forms in a genuinely published site. No submission is triggered by the links or readiness panel. Owner can refresh the inventory, download a separate private JSON, and the preflight is included in the existing `manufact-launch-review-v1` visual owner review JSON. Neither export nor a positive local configuration constitutes user/client GO.
- The existing PHP HTTP E2E verifies inbox-only, configured-but-missing transport, still-live published forms after unpublished draft changes, actual per-form saved leads and delivery status; existing Chromium checks the owner preflight UI and downloaded report.
- No owner environment was used. Mail/Telegram real delivery and external visitor integration remain the partial #80 gate. Requirement counters remain 124 implemented_candidate / 5 partial / 6 owner_environment_gate (135 MUST); zero owner-accepted. Do not turn this read-only inventory into a hard launch-gate without a separately agreed owner decision.

**Transfer:** `handoffs/lead-integrator/MAIN-HANDOFF-v5.0-2026-10-29.md`. This replaces v4 as the entry document. Before future code, new lead must confirm actual branch HEAD **and matching** Actions result; historical SHA in docs is not authoritative.



## 29 October 2026 — manual per-form delivery probe

The current hosted Studio notification panel now offers an **owner-confirmed, form-specific Email/Telegram test** against the saved effective form route. The endpoint `POST /api/sites/{siteId}/delivery/probe` requires `{sectionId,channel,confirm:true}` and owner authentication, normal session CSRF and same-origin protections. It never runs from GET, preview, launch-readiness refresh or automatically. Disabled or unconfigured routes fail before I/O. Tests are atomically audit-reserved at **max 3 per site per 15 minutes** (no new table, migration, background task or email/Telegram API credentials in client output). Each test includes a distinct ID and explicit NOT A CLIENT LEAD wording; no customer submission, outbox item, public site change or retry is manufactured. The previous live notification route and ordinary customer inquiries remain unchanged.

The response is only a local *transport result*, not recipient receipt: even `accepted` does not verify that a human got a message. The owner must explicitly verify the target inbox/chat on a separately authorized environment. The site readiness continues to show `liveDeliveryVerified:false`, `ownerAcceptanceConfirmed:false`. #80 stays **partial**, 135 required engineering counts and 0 owner-accepted unchanged. No test message was actually sent during development, no production/Hostinger/SEO/main/PR/merge/deploy or real DB touched.


### Manual owner observation and durable probe history

The owner-only `GET /api/sites/{id}/delivery/probes` lists bounded, metadata-only routing tests from the existing private audit table, with the initiating form/channel, transport result and manual receipt observation. The owner may explicitly mark a **single** receipt/not-received observation using `POST /api/sites/{id}/delivery/probe/receipt` with a real test ID; unknown IDs fail, and repeat/concurrent alterations are rejected. There is no new schema or client content in this ledger. Studio shows the durable test history and permits one confirmed observation per test; the existing launch review now shows only the latest test per channel and form. An owner observation is not automatic proof of external delivery of a real visitor submission and never upgrades the overall `liveDeliveryVerified` or `ownerAcceptanceConfirmed` fields. CI inserts isolated metadata-only fixture audit rows for the save/read scenario and never triggers a real outgoing message.

### 29 October — first-login import action gating

Fixed a real hosted Studio first-login race exposed by the approved-v2 recovery Chromium journey: authentication could re-enable **Connect approved site** during the asynchronous initial site hydration, and an immediate folder selection would silently be ignored by the busy guard. Approved-folder import, private approval-vault actions, site switch/creation and JSON import now stay disabled until initial hydration completes. This is an operator safety fix for the actual approved client import path, not a new synthetic readiness mechanism. Re-run the existing Chromium journey; do not count the earlier failing CI as green.


### Route-version binding of manual delivery tests

Each test records the saved private site notification-settings version and per-form route version in audit metadata (not email addresses, chat IDs or tokens). Owner-only history and launch review mark whether a prior test still applies to the **current saved routing configuration**; changing either version or removing the form invalidates its applicability while retaining the original operator observation. Old audit rows without versions remain visible as history but never claim current applicability. This is deliberately conservative: an external transport could change without a CMS version bump, so matching versions are not proof of receipt or real visitor lead delivery. No schema changes or acceptance-status inflation.

### Legacy audit compatibility check

Routing-probe audit rows created before configuration-version metadata existed remain viewable and can still receive one owner observation. Empty regex capture groups must not be converted to version zero; these historic tests always show **not applicable to current configuration**. One isolated PHP HTTP E2E checks this backwards-compatible behavior without any real outgoing message.


### 29 Oct 2026 — independent deployed-release identity comparison

A read-only **owner-only** connection workflow now compares a manually copied public `/_cms-connect.json` from an independent PHP, Next Static, or Next SSR site with the **actual immutable published release** currently in CMS. The operator specifies the exact public origin and form collector used when exporting; the server re-renders the existing bounded D2 `TechnologyHandoff::capsule` from the published version and checks site ID, publication version, source revision and the exact SHA-256 of its release manifest. A mismatching site, version or manifest is reported explicitly instead of suggesting the deployment is current. Endpoint: `POST /api/sites/{id}/connection/compare` (owner + CSRF + same-origin); Studio adds a comparison section to the existing connection dialog with an explicit open-identity link. No public data write, DNS lookup, HTTP request to the external host, secret exposure, remote mutation, PR or deployment. The pasted identity comparison **does not** establish DNS/TLS reachability, prove that JSON was fetched from the declared domain, confirm actual visitor page loading, or certify a form reaches its recipient. It does not upgrade #191 or owner GO. Genuine remote host verification still needs owner-authorized observation on the target.


### 29 Oct 2026 — operator-run live HTTPS verification, no remote call during development

An additional independent CLI utility `node stage3/runtime-export/bin/verify-live-release.cjs /ABS/published-vN-handoff.json https://client-domain.tld` provides a **real read-only external HTTPS comparison** when and only when the owner chooses an authorized target and executes it on their own workstation. It validates the local immutable handoff's manifest SHA; resolves a public DNS hostname, refuses IPv4 literals, local/internal/test names and reserved/private IPv4, pins the vetted public IPv4 to an HTTPS certificate-validated connection, and never follows redirects. It reads exactly `GET /_cms-connect.json` (bounded JSON) and `HEAD /` (homepage HTTP 200, HTML type), compares site ID/version/revision/manifest SHA and optionally canonical origin, and emits a JSON report with explicit booleans. It makes no form submissions and does not deploy. Production or external DNS were **not contacted** by the developer; CI runs only the tiny pure-validation offline test. A matched certificate, HTTP response and identity still cannot confirm visual quality, client signoff or delivery of an actual form. Owner-only acceptance gate remains untouched.


### 29 October 2026 — one cached stylesheet per independent published site

The independently published HTML, PHP, Next Static and Next SSR exporters now **extract the publisher's identical global style rules** from every page into one content-addressed `styles/site-{sha256}.css`. Each immutable published HTML route references that stylesheet; site-specific inline Design Graph, section and conditional-form CSS remain local to the affected page. The D2 package and direct PHP static exporter both emit a declared SHA-256 stylesheet and account for the extra file; existing historical releases without `stylesheets` stay valid. The D1 verifier rejects missing/mismatching CSS or missing HTML references; Next adapters carry the asset into `public/styles` and reference it from their root layout; standalone PHP routes CSS from private `data/styles` with one-year immutable caching. A D4 delivery verifier checks the CSS against published provenance; D6 localhost HTTP rehearsal checks CSS GET and HEAD for independent PHP and static output. The D5 audit now reports actual shared stylesheet bytes, published HTML bytes and **estimated avoided repeat inline CSS bytes** (`(pageCount-1) × cssBytes`); this is a structural byte calculation, not a real Core Web Vitals claim.

Independent PHP visitor HTML and CSS now honor gzip Accept-Encoding when available, provide representation-specific strong ETags, `Vary: Accept-Encoding`, and exact Content-Length/HEAD responses. A matching ETag returns 304 before file body is read. MIME and max-age policies remain unchanged; JPEG/WebP/MP4 continue without recompression. No host was accessed or deployed. The live-host acceptance gates #187 and #193 remain partial until owner-approved real-host measurement.


### 29 Oct — no-BLOB media revalidation and HEAD on hosted PHP

For hosted `/published/{siteId}/assets/{assetId}.{png|jpg|webp|mp4}`, the owner PHP runtime now checks that each asset is actually part of the **current immutable publication**, looks up only mime, SHA-256 and SQL LENGTH in a single metadata query, then responds to `If-None-Match` with 304 **without pulling image/video bytes into PHP**. It also answers HEAD with correct Content-Length (and Accept-Ranges on MP4), without a body/BLOB read. Real GET and range requests still load and verify SHA-256 of immutable media, and mismatching published responsive variants fail closed. No schema change and no effect on the private editor image routes. This reduces repeated-media work on PHP/SQLite and MySQL, but does not replace measured Core Web Vitals on an authorized live host.


### 29 Oct — first visible Design Graph image priority

Publisher now marks exactly one image inside the **first page section**'s Design Graph as `loading="eager" fetchpriority="high"` (if such an image exists). Every other graph image remains `loading="lazy"`; optional responsive `picture/source` selection, aspect ratio dimensions, escaping and immutable asset URLs are unchanged. Below-first-section galleries do not get a high priority solely because they are the first image of their container. This is a conservative first-screen resource scheduling improvement, not a guaranteed LCP win: a real client's rendered viewport and Core Web Vitals must still be measured with the approved responsive mockups and real host.


### 29 Oct — hosted public PHP standard HEAD requests

The built-in public CMS PHP renderer now accepts `HEAD` for exact published pages, the same-origin connection identity, sitemap/robots, permanent redirects and maintenance responses, alongside existing GET. Successful published HTML returns the exact negotiated Content-Length and representation-specific ETag/Vary as GET without returning the document body; 304 still bypasses page render and HEAD for nonexistent routes stays 404. The independent PHP site already offered HEAD. This makes HTTP monitoring, caches and visitor tooling more predictable, while not proving live customer DNS/TLS or visual acceptance. Public forms remain POST-only and are not touched.


### 29 Oct — immutable CSS host headers for static deliveries

D4 ZIP generation now includes scoped, optional `mod_headers` Apache rules (for HTML and built Next Static document roots) and equivalent Nginx configuration guidance so the single content-addressed `styles/site-<sha256>.css` can be cached for a year without making page HTML immutable. Unsupported Apache mod_headers configurations remain deployable due to `<IfModule>`. Published PHP visitor CSS has the same immutable header directly in its router. Site and form transport rules remain unchanged. D4/D5/D6 still only prepare/rehearse local artifacts; no actual DNS/hosting modification.


### 29 October — static immutable media cache policy

D4 bundles for standalone HTML and built Next Static now include **scoped visitor-media caching** in the generated Apache `.htaccess` (conditional `mod_headers`) and the Nginx host-configuration example: only matching, immutable published `assets/{assetId}.{png|jpg|webp|mp4}` paths receive `Cache-Control: public, max-age=31536000, immutable` and `nosniff`. This mirrors the existing standalone PHP media router without altering form collectors, admin assets, dynamic pages or redirect caching. Host support still needs explicit operator configuration and validation; no live server was modified.

## 29.10.2026 — D7 release performance budget + comparison (без продакшена)

Финальный большой блок перед передачей: **практический контроль веса настоящих независимых публикаций, а не synthetic Core Web Vitals**. На существующем D4→D5→D6 пути:

- `stage3/runtime-export/lib/performance-envelope.cjs` анализирует байты **проверенного ZIP**: для каждой опубликованной страницы — исходный HTML, gzip-оценку HTML, shared+inline CSS, упомянутые изображения/видео, размеры кандидатов eager images, отсутствие резервирования размеров, lazy/eager счётчики. Суммарно — весь media inventory и файлы, не встречающиеся в HTML. В `*.preflight.json` добавлены `performance` и предупреждения `PERF_*`; пороги по умолчанию мягкие, **не блокируют выпуск** без явного opt-in. Учёт `srcset` — кандидаты, НЕ реальный браузерный transfer; динамические медиа без статических ссылок нельзя автоматически удалять.
- `stage3/runtime-export/bin/audit-delivery.cjs /ABS/release.zip --fail-on-performance` — отдельная необязательная ошибка на найденных весовых предупреждениях, без подмены структурных blocker-ов.
- `stage3/runtime-export/bin/ship.cjs /ABS/published-handoff.json php /ABS/new.zip --enforce-performance-budget` — opt-in отказ от подготовки файла при превышении порогов. По умолчанию отчёт информативен.
- `stage3/runtime-export/bin/compare-delivery-performance.cjs /ABS/old.zip /ABS/new.zip --fail-on-regression` — **честное сравнение двух разных SHA-верифицированных версий одного сайта**: изменённые/добавленные/удалённые страницы, разница по размеру и предупреждения о существенных ухудшениях. Отдельные `--fail-on-regression`, `--fail-on-budget` и `--report=/ABS/new-report.json` необязательны; HTML gzip оценивается локально.
- В `ship.cjs` доступно `--compare-to=/ABS/old.zip`, чтобы приложить сравнение прямо к новому `*.preflight.json`. `--enforce-no-regression` требует предыдущий ZIP и блокирует выпуск при существенном увеличении веса; архив и отчёт не создаются при отказе.
- D6 `rehearse-delivery.cjs` для **реального независимого PHP visitor на localhost** проверяет gzip/identity, раздельные ETag, `304`, `HEAD` и immutable media, не отправляет формы и не проверяет сеть. HTML/Next Static там — симулятор хостинга, а Next SSR остается unbuilt/source-only на D6 (реальный build + localhost Next есть в отдельном CI).
- Модули CMS, внешний согласованный дизайн и реальное окружение клиента эти изменения не подменяют: `#187/#193` остаются `partial`, owner acceptance = 0. **Реальный LCP/TTFB/CWV, TLS, качество и доставка лидов этим не подтверждены.**

Следующие действия: один настоящий **sealed approved-site-v2** от владельца + три утверждённых макета; реальная цепочка import→edit→save→publish→review→rollback, затем согласованные host/Email/Telegram проверки с отдельным разрешением. Не продлевать работу бесконечными synthetic performance dashboards, если нет реального сайта. История инженерного perf-контракта — в D5/D6 и [v6 главной передачи](../handoffs/lead-integrator/MAIN-HANDOFF-v6.0-2026-10-29.md).


## 29 October 2026 — operational Email transport and lead-specific delivery recovery

The lead integrator completed a user-facing forms/lead batch on the dedicated main-chat branch. **No external message was sent** and no customer database, production deployment, PR, main branch or SEO-worker files were changed.

- Private server-side **verified TLS SMTP** is now an opt-in alternative to PHP `mail()`: STARTTLS/587 or implicit TLS/465, authenticated PLAIN/LOGIN after TLS, OpenSSL certificate/hostname validation, bounded reads/writes/timeouts and MIME Base64 lead text. Invalid SMTP environment never silently falls back to unprotected mail. The existing accepted/failed/uncertain states continue to distinguish transport acceptance from verified receipt.
- Hosted Studio shows the effective Email transport and precise SMTP configuration failures. Owner-only `POST /api/sites/{id}/delivery/retry-one` and a per-attempt UI control permit one explicit retry (including separate uncertain-send confirmation) using delivery ID, state and monotonic attempt counter with compare-and-swap. Bulk retry remains available. Recipient snapshots are preserved.
- Existing private lead CSV exports now include two separate per-lead Email/Telegram transport statuses, clearly labeled as **not recipient receipts**; no recipient addresses, credentials or private channel settings are included. CSV size/filter and injection safeguards remain.
- Existing server HTTP E2E covers explicit confirmation and stale retry refusal; one small no-network SMTP configuration test is run in the existing `contract` job. Configuration and owner guidance: [stage3/docs/SMTP-DELIVERY.md](../stage3/docs/SMTP-DELIVERY.md).

This is **functional engineering**, not proof that an actual customer got an Email/Telegram notification. Requirement #80 stays `partial`; counters remain 124 implemented candidates / 5 partial / 6 owner-environment gates, owner accepted 0. The next work is still the first real approved-v2 site and authorized delivery/host acceptance. Final SHA and matching CI should be recorded against the actual branch HEAD, not a prior documentation checkpoint.

The same bounded per-lead outbox lookup now also powers the **owner inbox itself**, not only CSV. Each inquiry visibly reports Email/Telegram notification outcomes or transparently indicates inbox-only delivery. No recipient addresses or credentials are returned in the inbox payload, and this is not a recipient receipt. The existing E2E checks inbox/CSV parity.

The owner inbox additionally exposes a **collapsed, per-lead manual retry action** for eligible Email/Telegram outbox rows (with reason, explicit risk confirmation and optimistic state/attempt check). This makes older leads retriable without hunting through only the latest 10 entries in the global delivery panel. The API sends no recipient targets or SMTP secrets; the same guarded single-retry operation is reused.

The form collector also supports an **opt-in server-only queue-first mode** (`STAGE3_DELIVERY_DISPATCH_MODE=queue`): visitor POST persists valid inquiries/outbox and responds without blocking on SMTP/Telegram, while the already-existing explicit CLI worker drains pending jobs. The default inline mode is backward-compatible; unknown explicit settings fail closed to queue and are flagged in owner Studio. No cron, live transport, DNS or deployment was activated; owner environment gate remains open.

To prevent launch-readiness false positives, the owner-only form review now reports the effective queue/inline mode and **queueWorkerVerified:false** (the CMS cannot observe external cron) with an explicit Studio warning for queue mode or invalid dispatch configuration. It does not silently certify the first real site or any delivery provider.


## 29 October 2026 — full sealed-v2 intake of real MP4 media in custom sites

The primary owner intake path now accepts original customer-authored MP4 files already referenced by typed video or background-video nodes. This closes an end-to-end **functional gap**: previously the CMS could store/publish MP4 but the approved handoff could only import raster images. Existing offline seal/verify now pins bounded MP4 bytes by SHA-256 and mirrors the server VideoGuard top-level container validation. Studio verifies media *before* site creation, uploads small videos via the existing authenticated endpoint and larger ones through the existing 512 KiB private chunked endpoint, remaps source asset IDs, and supports interrupted import recovery using stored immutable bytes. A script-disabled pre-import three-device preview displays a poster/placeholder; full video is tested after import/publish, not inlined into HTML screenshots. No new dependency, schema, source execution, public file write, or production deployment.

Existing contract smoke rejects tampered/fake sealed videos; the existing approved-site Chromium E2E now includes a real valid MP4 in the signed folder and exercises import interruption, byte-for-byte recovery and published visitor media. This is a synthetic cross-layer technical proof only; client-approved source and owner GO remain absent. Retained limits: MP4 <=16 MiB, full approved folder <=100 MiB, JSON backup <=64 MiB. See `stage3/docs/APPROVED-SITE-PACKAGE.md`. The 135 MUST statuses and owner acceptance counters remain unchanged.


## 29 October 2026 — site-specific WOFF2 typography across the approved-site workflow

One substantive fidelity gap has been addressed without adding a site-builder or new JS dependencies: approved individual sites can carry their own **locally served WOFF2 body and heading fonts**. This replaces the previous exclusive dependence on three system font stacks. Typed JS/PHP contracts reject fonts masquerading as images or videos, and `site.theme.fontFiles` binds at most two existing site-owned assets with fallback fonts retained. The owner may assign the imported or manually uploaded typefaces in the existing Studio site settings; controlled Design Graph nodes additionally expose site-body/site-heading typeface roles.

Offline SHA-256 seal/verify, bounded private WOFF2 uploads, interrupted sealed-v2 import + resume, private and published HTTP media, PHP/Next/static releases, guarded media replacement/pruning, backup/restore and actual first-party editor preview now share the same immutable font assets. Browser-tested original WOFF2 glyphs serve as a small synthetic transport/render proof, not a customer sign-off. No remote font CDN, external deployment, domain migration or production write. The official 135 MUST statuses and ownerAccepted=0 remain unchanged. The real approved client package and visual owner review remain the next acceptance gate.


## 29 October 2026 — site-wide customer brand identity (no template generator)

Closed another real approved-site fidelity limitation: an individual externally programmed site now declares an optional strongly typed `branding` with a desktop logo, independent mobile logo, PNG favicon and bounded displayed logo width. The existing private asset library is reused; there is no new upload format, third-party CDN, theme platform or public write. The Studio global settings dialog makes these assignments editable with a visual preview. Visitor rendering preserves an accessible text alternative/home link, emits a responsive logo picture on all pages and serves its own immutable favicon. Next Static/SSR metadata retains the favicon despite React extracting the body from the exported HTML.

Validated brand IDs are carried through signed approved-v2 imports, interrupted import recovery, server draft revisions and publication, existing backup/restore, guarded media usage/replacements and independent visitors. Browser CI now compares original sealed PNG bytes with published logo/mobile/favicon paths and ensures import mapping keeps distinct source IDs. Original sites without branding remain supported; logo sizing/layout requires actual owner visual review. This is an additional functional engineering candidate, **not** owner acceptance, external deployment or a reason to change any of the 135 MUST status counters. The first approved live client package remains absent.

## 29 October 2026 — real site-wide footer: branded contact and legal navigation

A significant fidelity gap in the completed visitor shell is now addressed without inventing client content or adding a site-builder: each individual site may declare a typed optional `footer` with description, publicly authorized email/telephone, up to eight ID-bound legal/helpful internal links and eight fixed-brand HTTPS social links. The rendered footer offers responsive columns/stacked layout and light/dark/primary brand colors; each field is editable using a dedicated Studio global dialog with live preview. The pre-import static 3-device design comparison includes the same semantic footer. When the source client has no footer, the prior text-only output remains unchanged.

Both JS/PHP contracts reject unknown/duplicate internal page IDs, unsafe malformed contact data, executable/social-spoofing URLs and unapproved style/layout properties; the published PHP/HTML/Next visitors use the same own-site paths and secure target/rel settings. Editing a URL keeps legal footer links stable via page IDs; deleting a page removes its footer link in the same undoable change. Save/Publish remains explicitly separate: changes in a private revision do not mutate a published footer. Existing backup/rollback/portable export carries all data; no new database migration or external service. The isolated approved-folder Chromium journey now verifies original source, three-view preview, published HTML, mobile 375px stacking, private Studio changes and publication isolation. The owner must still verify the client's legal text, contact ownership and correct three-device visual design. No MUST acceptance status changes and ownerAccepted remains 0.

## 29.10.2026 — полноценная верхняя контактная полоса клиентской шапки

Внешний сайт может поставить необязательный типизированный `site.header`: короткая информация, безопасная внутренняя ссылка по page ID, кликабельные телефон/email, светлый/тёмный/фирменный цвет, mobile show/hide. В Studio это часть конструктора меню; изменения остаются в черновике до Save/Publish, участвуют в Undo и сохранении версий. Удаление страницы сбрасывает только ссылку полосы, не её текст. PHP visitor и независимые exports получают одинаковую семантическую полосу, preview Studio отображает её в трёх ширинах. Сайты без `header` обратно совместимы. Без реального approved-v2 пакета это инженерная готовность, не визуальное соответствие или приёмка владельцем.

## Крупная продуктовая вертикаль 30.10.2026 — реальная геометрия секций и брендовая типографика

Вместо расширения фабрики шаблонов закрыты два ограничения при переносе **уже согласованных индивидуальных макетов**. Первое: до этого даже авторские Design Graph секции оставались внутри общей ширины `main`. Типизированное `section.appearance.width=edge` теперь создаёт настоящий полноэкранный hero / фон / композицию на desktop/tablet/mobile; отдельный CSS ограничивает горизонтальное переполнение, другие секции остаются в прежней сетке. В Studio есть тот же вариант и в полном редакторе оформления, и в быстром инспекторе. В PHP visitor, standalone exports и Studio используются одинаковые ограничения; прежние значения `default/narrow/wide` сохраняются.

Второе: `heading/text` Design Graph теперь могут содержать проверяемый массив текстовых фрагментов `runs` с индивидуальными `strong`, `italic`, токеновым/HEX цветом. JS/PHP валидаторы запрещают расхождение с plain `node.text`, чужой HTML, небезопасные CSS и избыточную вложенность; публичный renderer выводит семантическую экранированную разметку. В существующем Studio Graph inspector добавлена визуальная редакция фрагментов и Undo, без второго редактора и без кастомного кода от клиента. Синтетический CI подтверждает техническую совместимость, но **не визуальную точность конкретного клиентского дизайна**; утверждённый реальный пакет всё ещё не получен. Ветка SEO-разработчика, `main`, production, статус 135 MUST и `ownerAccepted=0` не менялись.

**Третий связанный результат той же вертикали:** встроенные типизированные ссылки в отдельных фрагментах текстов и заголовков. Строгий контракт JS/PHP, mount-aware PHP и автономный экспорт, Studio авторская редакция и отдельная починка ссылок, диагностика битых маршрутов, переписывание при переименовании страниц и перемещении якорных секций, CLI/браузерные проверки — всё проходит через существующий `site.json`, а не новую CMS-подсистему. Внешние адреса остаются только в закрытом URL allowlist; скрипты и произвольный HTML не допускаются.

## 30.10.2026 — типизированная геометрия индивидуального первого экрана

В существующий Design Graph добавлены настоящие viewport-высоты, раздельные физические отступы и радиальные градиенты для переноса согласованных desktop/tablet/mobile макетов. Один контракт обслуживает Studio, PHP и независимые visitor-экспорты. Никакой дополнительной фабрики шаблонов или свободного CSS. Реальный клиентский approved-v2 пакет не предоставлен, ownerAccepted=0, никаких изменений main/SEO/production.


## 30 October 2026 — real portfolio gallery and interactive image review in typed Design Graph

Delivered an end-to-end optional custom-site gallery enhancement without replacing the existing horizontal gallery or exporting unsafe client HTML. Site-authored galleries can use scroll or responsive grid with independent desktop/tablet/mobile column counts, accessible photo captions, and native Popover API lightbox with previous/next controls and Esc/outside-click dismissal. A gallery photo is either a validated action link or lightbox trigger, not both; both first-party validators reject conflicts and arbitrary attributes. Existing site-owned raster binding, per-device art direction, safe output escaping, image replacement and hosted/standalone visitor export remain intact. The Studio full graph editor and quick workbench expose these choices as draft edits; no new database or CDN dependency. Graph `position:sticky` is now permitted as a typed responsive layout value with bounded top/bottom offsets.

Evidence: additive JS contract scenario, real PHP renderer smoke scenario and unchanged comprehensive `contract` + `technology-runtime` pipelines. Real customer-approved v2 images, visual sign-off, external publishing, live provider delivery and owner GO remain unverified. MUST engineering counts stay 124 implemented_candidate / 5 partial / 6 owner_environment_gate out of 135; ownerAccepted=0. No SEO-engine/main/production touched.


## 30 October 2026 — authored gallery thumbnail proportions

Typed Design Graph galleries now accept an optional `photoShape` (`natural`, `square`, `landscape`, `portrait`), allowing approved portfolio photography to retain natural dimensions or use consistent 1:1, 16:9 or 3:4 thumbnail crops. The selected shape applies to gallery thumbnails only; expanded lightbox images preserve original proportions and `object-fit: contain`. The existing Studio Graph quick workbench edits the same draft property, with undo/save/publish isolation. The JS and PHP validators reject arbitrary values and foreign-node use. This is a visual-fidelity feature, not license to change source files, and needs comparison with the actual approved desktop/tablet/mobile client mockups. No status/acceptance promotion; no SEO-worker/main/production change.


### 30 Oct 2026 — responsive individual gallery shapes

Approved-site typed galleries now accept optional `photoShapeTablet` and `photoShapeMobile` alongside `photoShape` (`natural|square|landscape|portrait`). The JS contract and PHP visitor independently reject unknown shapes and foreign-node usage. Both the quick workbench and full graph editor let the owner choose independent desktop/tablet/mobile crops; CSS applies tablet at <=900px and mobile at <=600px while keeping the original images and full-resolution lightbox proportions. Absence of new device fields preserves backward compatibility. Owner visual approval of the real three-device design is still required. No change in 135 MUST engineering counts or ownerAccepted=0, and no production, SEO worker or main changes.


### 30 October 2026 — no-JavaScript horizontal gallery navigation

Typed gallery nodes now accept optional boolean `scrollControls` for horizontal `scroll` layout only (not `grid`). Both Studio editors offer the option; switching to grid disables it. The PHP and first-party JS visitor render per-photo previous/next links targeting stable photo IDs, localized accessible labels and visible keyboard focus, without external JS or third-party carousel dependencies. Existing swipe scrolling remains; each gallery image, caption, source asset, and native lightbox behavior remain independent. Two visitor validator tests cover the generated anchors and invalid types. This is functional engineering; verify the real approved client design on desktop/tablet/mobile before owner acceptance. No production, SEO-worker, main or ownerAccepted changes.


### 30 October 2026 — responsive carousel visible-card counts

Individual horizontally scrolling galleries can now opt into `visibleDesktop` (1–6), `visibleTablet` (1–4), and `visibleMobile` (1–2), with explicit bounded integer validation on both JS and PHP. Device-specific CSS widths account for the existing 16px gap; the default 82%-peek/420px behavior is retained if no visible-card values exist. Both Studio editors expose the fields, switching to grid clears incompatible scroll-only configuration, and the offline bundle preserves parity. Contract/PHP smoke checks cover source values and invalid mobile count. Original media assets are never changed. Real approved desktop/tablet/mobile mockup equivalence still needs owner review. 135 MUST classifications and ownerAccepted=0 are unchanged; no main/SEO-worker/production writes.


### 30 October 2026 — standalone authored image figures

Typed Design Graph `image.caption` now works on standalone pictures as well as gallery photos. The JS and PHP renderers produce semantic `<figure class="cmsdg-image-figure">` + escaped `<figcaption>` for standalone images, preserving responsive `<picture>` variants and safe optional image links. Inside galleries, the existing outer gallery `<figure>` owns captions; no nested duplicate figures are emitted. Both Studio modes expose caption editing for any image. Regression coverage added for linked standalone figures, HTML escaping, and rejecting control characters. No arbitrary custom HTML enabled; owner visual comparison with real approved site remains pending. This is an engineering candidate, not owner acceptance.


### 30 October 2026 — typed responsive editorial compositions

Author-owned Design Graph containers now support safe `styles.gridTracks: [2,3,1]` (2–6 integer fractional weights 1–12) and `styles.gridAutoRowsPx: 96` (24–600) at independent desktop, tablet and mobile breakpoints. Combined child `gridColumnStart/gridColumnSpan` and `gridRowStart/gridRowSpan` emit stable placement regardless of JSON property order. Exclusive `columns`, `gridColumnsPreset`, and `gridTracks` protect template intent per device. Semantic `container.semanticTag` is restricted to `div/article/section/aside`, with an optional safe, escaped `ariaLabel` for non-div landmarks (1–120 characters). Full and whole-page Studio editors expose authoring controls, with PHP and JS rendering and isolated contract tests. Existing sites remain compatible; this does not add arbitrary HTML, remote assets or template-factory behavior. MUST tally/owner acceptance unchanged; real customer mockup comparison is still required.

### 30 October 2026 — individual-site responsive field inheritance

Existing site-specific manifest fields now show whether their desktop/tablet/mobile setting is explicit or inherited. The tablet/mobile inspector has an undoable “Наследовать” control only when an explicit override exists; it removes that breakpoint override, allowing native device inheritance without changing the required desktop value. The SDK enforces valid declaration, optimistic revision, cross-page shared-group synchronization and full document validation; a no-op reset does not add Undo history. Media selection lists image assets only, not videos or fonts. This implements MASTER-TZ section E for *already authored* customer sites; it adds no prebuilt layouts, ready-made sections or site generator.

### 30 October 2026 — remove incompatible creation controls from shipped Studio

The in-CMS brief-to-site composer, catalog presets and inline canned style recipes have been removed from the **shipped Studio bundle and UI**. The operator no longer sees “Сайт без макета”, “Создать сайт из задания” or “Готовые стилевые решения”. Approved-site folder import, custom authored site JSON, edit/preview, responsive values, Save, Publish and rollback remain. The old `sdk/recipes.cjs` and `studio/composer.js` sources are retained in repository history for compatibility but are not compiled and have no active user entry point. Browser acceptance flows exercise externally authored synthetic JSON rather than an in-CMS site factory. No actual client acceptance implied; no main, SEO or production changes.

### 30 October 2026 — source-safe media import and typed asset coverage

Imported approved-site media is now rebound **only at declared typed media references**, preserving literal headings, SEO descriptions/titles, URLs and every text string even when it equals an original asset ID. All source assets must map to a unique server-owned ID with matching MIME, and the resulting whole site is validated before its final Save. The original approved site JSON is not mutated. Offline preflight reports `boundMediaFields` and `unusedMediaIds`; the owner sees these in the folder review before any server draft is created, and the pilot audit no longer mistakes matching text for an actual media use. Unused approved assets are warned about, not deleted. This is strictly approved bespoke site transfer (MASTER-TZ sections D–F), not a template or design library.

### 30 October 2026 — approved-site editability map before import

Owner Studio’s actual approved-folder review displays a **per-page inventory of editing controls from that site's declared manifests**: content, style, behavior and responsive field counts for the sections actually present, plus the real custom Design Graph node/text/media counts. Switching pages updates this live map next to the desktop/tablet/mobile comparison. It does not add components, generate layouts, edit the source, guarantee visual fidelity or publish. It is an explicit pre-import check that the externally authored individual site exposes the intended CMS controls (MASTER-TZ §E–F).

### 30 October 2026 — independent visibility of authored sections by device

An existing externally authored section can opt into a closed `deviceVisibility` map (desktop/tablet/mobile; omitted = visible). Studio whole-page and focused inspectors edit the same undoable draft; the full-page preview omits hidden sections, while the focused inspector leaves them available with a clear note. The approval-folder editability map highlights hidden breakpoints. The published PHP/HTML renderer uses no-JS CSS media conditions. JS/PHP contracts reject invalid keys/types and fully hidden sections; shared section instances propagate device visibility. No new template, no user-generated code, no change to 135 MUST classifications or real owner acceptance.

### 30 October 2026 — viewport-safe client site validation and approval evidence

The SDK/PHP validators reject any page with zero visible sections on PC/tablet/mobile. Existing whole-page quality audit provides deterministic page/device visible-section and H1 counts and warnings for hidden H1, duplicated visible H1 and hidden anchor targets. The owner-only approved-folder review shows the same data for the selected original page, while the offline pilot audit emits a three-device matrix, not a fake client acceptance certificate. This checks whole-section visibility only, not nested Graph node styling. Main/SEO/prod untouched; original 135 MUST tally and owner acceptance unchanged.

### 30 October 2026 — Graph-node visibility and conversion-form coverage

The three-device quality audit now resolves the typed Design Graph display/hidden cascade for visible headings, including hidden ancestors and mobile-only alternate H1. It also counts real lead-form/lead-form-flex sections at each viewport and warns when a page's forms disappear on a device. Source folder review and the offline pilot audit use the same SDK diagnostics, no extra AI subsystem. The real approved desktop/tablet/mobile mockups remain the authority for human visual approval.

### 30 October 2026 — actionable all-page viewport navigation in the existing Quality panel

The existing "SEO-аудит и адреса" dialog now has an expandable inventory of every real page at desktop/tablet/mobile widths: visible section, H1 and form counts, plus direct draft Inspector jumps for that page and device. The existing whole-page workbench now indicates which sections are hidden on the selected device and keeps them selectable after switching devices. This helps the owner repair a responsive approved layout without deleting sections, creating templates or adding another CMS subsystem. No main/SEO/production writes or acceptance status changes.

### 30 October 2026 — device-specific quality findings lead to the real editable target

Quality findings for a mobile/tablet/desktop hidden anchor now retain the target page ID and section ID, rather than opening the source page and leaving the owner hunting for the missing destination. Lost form warnings focus the actual authored form section; missing device H1 warnings focus the original heading section/Graph node if one exists. The existing Quality panel applies the relevant breakpoint before navigating. All actions use the current draft Inspector and separate Save/Publish; no new publishing route, database or template library. Browser acceptance checks the three-device overview's real mobile navigation.

### 30 October 2026 — real rendered forms only (Graph override fail closed)

The approved site's Design Graph is the public output when present; a legacy lead-form or lead-form-flex component behind that Graph is not an active visitor form. SDK device coverage and owner warning, hosted launch summary, owner-only delivery routes, readiness and health counts now exclude such shadowed components. The immutable published-release collector independently refuses even a correctly HMAC-signed form submission to a section whose public form was replaced by Design Graph; approved cross-page links cannot imply that the form works. Existing published forms remain routable when removed only from a new unpublished draft. Real form delivery still requires separate owner verification. No database, new library or live host change.


### 30 October 2026 — first-party working lead forms inside client-authored compositions

An externally approved `lead-form` or `lead-form-flex` section may now place one typed `form-slot` leaf anywhere inside its own Design Graph (including a responsive grid or a first-party popup). The slot controls the form's position/size using existing safe Graph styles; its contents are **always** generated by the existing server form renderer from that section's manifest, including first-party fields, extra questions, conditional/multi-step layouts, consent, honeypot, immutable release HMAC, signed POST collector, private lead inbox and configurable delivery routes. No arbitrary HTML, JavaScript, third-party form endpoint or unsanitized action is exposed. A graph with no slot continues to override and disable a legacy form, and more than one slot or a slot in a non-form section fails both independent contracts.

Both Studio workbench and advanced Graph editor permit inserting the one allowed slot only within an existing lead-form section; the form builder edits the same first-party field definitions. The sandboxed offline Graph canvas uses an explicitly inert representation; **the real PHP draft preview** is authoritative for the actual inputs and interaction. Device-aware site audit counts the form only when its Graph slot and ancestors are visible on that viewport; launch readiness, delivery configuration and the immutable published-release collector agree on the same source of truth. Existing non-Graph forms behave as before.

Evidence is limited to focused typed-contract, PHP renderer, and isolated HTTP/SQLite publication→signed visitor submission→private saved-lead checks, plus the existing Stage3 CI. A real approved client payload, manual desktop/tablet/mobile visual comparison, configured external email/Telegram delivery and owner GO are still pending. The 135-MUST ledger remains 124 implemented candidates / 5 partial / 6 environment gates; **ownerAccepted=0**. No main/SEO-worker/production or real data changed.


### 30 October 2026 — faithful inert form canvas, multi-step preview and per-device form appearance (v8.2)

The existing Design Graph `form-slot` now renders an **inert** but content-accurate representation of the current first-party `lead-form`/`lead-form-flex` manifest fields, including user-defined questions, select/radio/checkbox controls, consent copy, and the visible step of a multi-step form. The Graph Inspector's step selector changes only the Studio canvas: disabled controls, **no live `<form>` tag**, no submit URL, no CSRF/HMAC token. The same author can jump from a rendered field to the existing form-field builder; no second form definition is introduced.

The existing full-page Workbench passes the original first-party form section into the same inert canvas and also edits these options on the selected real Graph node, preserving the same draft/Undo behavior as the advanced Inspector. Design Graph offers bounded, typed, optional `formAppearance`, `formAppearanceTablet` and `formAppearanceMobile` on a `form-slot` only: field gap, field radius/padding, button radius/padding, label weight, input background, border, button background and text color. Colors are declared `@colorTokens` or six-digit HEX, not arbitrary CSS. JS/PHP independently reject out-of-range values, unknown keys, or applying these overrides to non-form nodes. CSS variables are scoped to that specific Graph form; regular forms are unaffected. Public PHP renders the original signed real form with those styles while offline Studio remains safe and non-interactive. This enables more faithful adaptation to a client's approved desktop/tablet/mobile design without allowing raw HTML/CSS/JavaScript.

Implementation: `stage3/sdk/design-graph.cjs`, `stage3/server/{DesignGraph,PublicRenderer}.php`, `stage3/studio/{app,bundle}.js`. Focused browser, PHP-render and contract tests are updated. Form delivery, private inbox and no silent publish rules remain unchanged. The ultimate behavioral authority is PHP Preview/Publish, and an actual client-approved 3-width mockup still has to be compared by a human. No external site/deploy/merge, and **0/135 owner-approved**; ledger classification remains unchanged. See [main handoff v8.2](../handoffs/lead-integrator/MAIN-HANDOFF-v8.2-2026-10-30.md).

PHP Graph form-slot wrapper class quoting corrected after a live CI renderer check; the real signed form remains unchanged.

### 31 October 2026 — completed adaptive form layout and step-card editing in the existing Design Graph

The one real first-party form in an authored `form-slot` now accepts additional finite per-device `formAppearance` fields: `columns` (1–2), `maxWidth`, `labelGap`, input font size/color/border width, label color, keyboard focus color, button text size/weight, and multi-step fieldset radius/padding/background/border/progress color. All values are independently validated in JS and PHP (bounded integers, four supported weights, site color tokens or six-digit HEX). The actual server form remains the same signed POST/consent/honeypot/collector; only scoped presentation changes. Desktop/tablet/mobile overrides are optional and inherit the preceding device.

The full Graph Inspector and page Workbench edit these same fields with Undo/Save/Publish unchanged. The inert Studio canvas now groups active step fields in a real-looking, disabled fieldset with title/progress/navigation, matching the server form structure without form action, POST, token or network submission. Form builder's optional `formFields[].fullWidth` lets a real authored additional question span both columns (while standard message and extra textareas remain full-row by default); the independent PHP/JS contracts reject non-boolean values. This is a useful final-layout control for existing bespoke site sections, not a new form engine or template factory. Isolated contract smoke passed locally; exact final-SHA CI is required before calling the branch green. Real approved three-device screenshots, delivery configuration and owner sign-off remain pending, with MUST classification unchanged and ownerAccepted=0.

### 31 October 2026 — responsive authored comparison tables, semantic row headings and client styling

Design Graph tables now support opt-in `tableLayoutTablet`/`tableLayoutMobile` (`scroll` or `cards`), while the existing desktop table stays a genuine semantic `<table>`. For card layouts, the **same** data rows are displayed as labelled cards using their escaped first-row column headings; no duplicated data, custom JavaScript, arbitrary markup or visual-only pseudo-table. The original `<thead>` stays available to assistive technologies, and optional `rowHeaders:true` renders the first data cell of each row as `<th scope="row">`. Mobile inherits tablet layout unless explicitly overridden. Missing settings preserve the original horizontally scrollable table.

Authors can adapt the actual client comparison design with typed, optional `tableAppearance`, `tableAppearanceTablet` and `tableAppearanceMobile`: 0–32 px card corners/inner spacing, 0–40 px card gaps, 4–32 px cell padding, 25–65% label column, plus verified token/HEX borders, header surfaces/text, card surfaces and label colors. CSS variables are isolated to the table instance and inherit across breakpoints; the same PHP and JS renderer contracts fail closed on foreign/unknown/out-of-range values. Both existing Studio inspectors expose these choices and leave Undo/Save/Publish unchanged. Contract smoke and targeted native browser/PHP scenarios exercise data semantics, layout breakpoints and safe colors. No change to 135-MUST accounting or owner acceptance (still **0/135**); real three-screen client comparison is still required. No main, SEO-engine, Hostinger or production touched.

### 31 October 2026 — owner bulk data editing of authored tables and lists

The full-page Workbench and advanced Graph Inspector now share a bounded **bulk content editor** for the site's *existing* `table` and `list` nodes. A site owner can paste Excel/Google Sheets TSV or comma/semicolon CSV into a typed table (2–10 equal-length rows, 2–6 columns, including the first header row), or replace a list with 1–24 newline-separated entries. In both cases, Studio shows an escaped DOM preview with changed values highlighted and explicitly warns about rows/columns/items that would disappear. Values are never interpreted as HTML/JS/CSS; quoted CSV fields and escaped `""` quotes are parsed locally, malformed delimiters and controls fail closed.

The SDK applies each paste atomically to a cloned Graph. Unchanged rows/cells/items keep their stable IDs and per-node styles **by position**; added nodes receive unique typed IDs and removed nodes disappear only from the editable draft. The table retains its desktop/tablet/mobile card layout and semantic header settings; ordered/unordered list mode survives list paste. Pasting identical content does not create a new revision. Both editor modes use the existing graph validator, Undo/Redo and explicit Save/Publish flow; published versions and original approved prototypes are untouched until a later authorized Publish. Browser and contract regressions cover table/list growth, shrinkage, malformed input, identity, safe text, and both UI entry points. No new spreadsheet dependency, external provider, template factory or alternate editor. Real approved client comparison and owner acceptance remain pending; ledger counts unchanged.

The same table controls also move a **whole column across every row atomically**, or reorder a data row while keeping its heading row first. A semantic `rowHeaders:true` table locks the first column in position 0, including in the SDK, so accessibility semantics cannot silently drift when an owner moves columns. Each move preserves cell/row IDs and per-node styles, is one Undo step and is available in both existing editing surfaces. Both paste dialogs can copy the original table as TSV or original list as newline text for external editing; clipboard access has a manual-selection fallback. The Workbench move controls respect hosted read-only editing permissions.

For owners working with files instead of clipboard, the same modals now read a **local UTF-8 `.csv`/`.tsv` or `.txt` file** directly in the browser and offer one-click download of the original `table.tsv` or `list.txt` (UTF-8 BOM for spreadsheet compatibility). Input size and final typed-cell/line limits are checked before Apply. These files are not uploaded to a CMS endpoint or persisted outside the normal explicit draft Save/Publish flow.

The CSV auto-detection counts separators **outside** quoted headings, including European semicolon exports with quoted commas in labels. A TSV export or copy prefixes formula-looking values (`=`, `+`, `-`, `@`) with an apostrophe in the downloaded/copied text only, reducing spreadsheet formula-injection risk without changing the authored Graph value. If exported text is re-imported, those exceptional cells may retain the apostrophe and can be corrected explicitly by the owner.

Spreadsheet round-trips now quote/double embedded `"` characters in TSV, so even authored text starting with a literal quotation mark reimports identically. The edit textarea uses the reversible unmodified variant; export/copy uses the spreadsheet-safe variant. Manual-copy fallback selects a **separate read-only field**, never replacing the in-progress edit with exported escaping.

Local file import additionally recognizes UTF-8 and Excel's BOM-marked UTF-16LE/UTF-16BE `Unicode Text` files, rejecting invalid decoding instead of silently corrupting Cyrillic content. UTF-16 input uses the same strict 50 KB/90 KB file and typed-cell/line bounds as UTF-8.

### 31 October 2026 — visual findings lead back to the existing page Workbench

The owner can select **«Исправить в редакторе»** on an open Launch Review remark. The saved unscaled Y coordinate is matched against authored section IDs in the **actual authenticated PHP preview**, and the existing full-page Workbench opens on the same page, section and desktop/tablet/mobile width. The general «Редактировать страницу» action now also opens the page Workbench with its current device and scroll location. It never modifies the immutable approved source or invokes Save/Publish; the author can select the precise child field or Graph node there.

The owner-only private visual-review journal also supports **«Изменить»** to correct a still-open remark's text and vertical position. A version-checked atomic API update refuses stale/historical/closed edits and does not change the remark's page or device; edits invalidate that page/device's in-session review sign-off and pass through the existing API audit. The local-only fallback supports the same controls without claiming persistence. No schema migration, separate editor, dependency or production change. Source-to-Workbench browser, hosted workflow and isolated HTTP/SQLite checks are extended. The real approved client mockups and human acceptance remain external gates, **ownerAccepted=0/135**; the 124/5/6 MUST classification is unchanged, as are `main` and `stage3/seo-engine/**`.

The same review surface now shows visible, keyboard-accessible **red issue pins** at the stored Y coordinates on the PHP preview, clustering nearby remarks to prevent overlapping controls. When adding a new finding, **«Указать точку на странице»** captures one intentional click inside the script-disabled PHP iframe and uses that exact document Y instead of the viewport's top edge. A temporary blue pin confirms the picked point before saving; moving to another page/device or successfully creating the remark clears it. These markers exist solely in the private Studio canvas, never in published site HTML or the immutable approved screenshot.

### 31 October 2026 — exact authored element targets in PHP visual review

Clicking the real script-disabled PHP draft while setting a finding now identifies the stable **section and closest existing Design Graph node**, checked against the actual authored page. A saved owner-only finding retains optional `targetSectionId`/`targetNodeId` together with its original Y coordinate. **«Исправить в редакторе»** therefore opens the existing full-page Workbench on the exact authored element and the right page/breakpoint; old coordinate-only remarks still use the previous nearest-section fallback. Observation/navigation never save site edits or publish, and do not modify original mockups.

The note edit dialog can apply a newly chosen PHP point through **«Привязать выбранную точку»**. This operation uses the same optimistic finding version and saved draft revision as existing note edits; the server rejects missing/foreign targets and cannot move a finding to another page/device. Stable references survive Save (when the node still exists), owner-only history, portable review JSON import/export and authenticated backup-v2 restore. If a new draft removes a node, the open observation survives as Y-only without a stale binding; historical backups that predate targets remain valid. There is no raw selector, injected HTML, alternate editor or external service.

New isolated databases contain two nullable reference columns. Older dedicated installations continue working in Y-only mode until separately authorized CLI `stage3/server/bin/upgrade-visual-review.php` runs with `STAGE3_ALLOW_VISUAL_REVIEW_UPGRADE=YES`; HTTP never silently migrates a database. Real approved client visual comparison and delivery/host gates remain external, ownerAccepted=0/135, ledger 124/5/6 unchanged; exact final-SHA CI is required.

**Follow-up within the same functional vertical:** red pins, **«К месту»**, cross-page review-index jumps and Workbench scrolling now remeasure a valid saved section/node in the *current* fully loaded PHP document at the selected device width. When a heading or gallery shifts after a new saved revision, the owner arrives at the actual moved element while its originally recorded Y remains in the audit/report. Missing/hidden targets and legacy notes fall back to the saved Y. Gallery captions/navigation and CSS-only tab labels resolve to their existing typed child IDs, not a guessed container. This remains private, and no visitor overlay or client approval is generated.

**Historical JSON report recovery:** a prior-revision visual note imported after its section/node was deleted retains the original text and Y, but drops the stale binding with an explicit count in Studio. An incompatible binding claiming the current revision is rejected. Unupgraded dedicated review tables import Y-only observations. This is an integrity/recovery fix inside the existing owner-review workflow, not owner sign-off or a new editor.

### 31 October 2026 — complete decorative backdrop editing inside the full-page Workbench

The existing individually-authored `container.backgroundVideo` now has all its validated controls in the **real PHP page Workbench**: local MP4, mandatory desktop/optional tablet/mobile poster, horizontal/vertical crop and overlay color/opacity. Changing clips preserves compatible poster and tint decisions; raster `backgroundMedia` also gains overlay controls in this same surface. These edits reuse the same Design Graph schema, atomic Undo/Redo and explicit Save/Publish as the advanced Graph Inspector, with no new editor or client-facing runtime dependency. The approved-package Chromium journey exercises video backdrop editing, Undo and exact published breakpoint CSS. This does not imply an actual client mockup has been visually accepted; 135 MUST ledger and ownerAccepted=0 remain unchanged.

Connected usability/performance follow-up: the same Workbench now shows owner-only raster previews for all three device posters with the current crop/overlay and links to the **existing** media uploader if local footage/cover images are absent. PHP and JS Design Graph publishers additionally use a standards-based `<source media>` guard to skip an ineligible backdrop MP4 at initial resource selection on mobile or reduced-motion devices; CSS fallbacks still govern viewport changes after load. The WHATWG media selection rule evaluates video media queries only once, so this is not a blanket no-download guarantee. Existing typed asset security, immutable release identity, and owner approval gates remain unchanged.

The related responsive-fidelity gap is also closed: raster and MP4-container backdrops accept separate bounded X/Y crop overrides for tablet and mobile, inheriting desktop/tablet axes when absent. Both owner edit surfaces select the right breakpoint, PHP/JS published CSS applies its crop to the real poster and (on tablet) video, and the site-v1 JSON Schema now explicitly includes the typed MP4 backdrop contract. This is a functional design-fidelity capability, not an automatic comparison against the client's approved images.
