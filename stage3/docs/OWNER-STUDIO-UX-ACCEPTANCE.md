> **ENGINEERING CHECKPOINT — repeat cards, hidden elements, media thumbnail, 03.11.2026:** the real page preview follows a card chosen through Inspector (no iframe reload or content mutation); hidden sections offer a visible device-specific undoable repair even with an individual element selected; manifest image shows its selected authenticated asset rather than a label alone. Functional `9f5ac311c6260d94044db8a5f66adedef46bb237`, [full CI #41693383840](https://github.com/manufact-test/ai-site-cms/actions/runs/41693383840) **SUCCESS 4/4**, [real Chromium screenshots](https://github.com/manufact-test/ai-site-cms/actions/runs/41693383840/artifacts/13260475490). **Not** owner UX acceptance, FOX release authorization, or first-site approval.

> **ENGINEERING ONLY — canvas-first editing update, 03.11.2026:** a real hero action with a decorative arrow now selects its own link property; picking a child inside `Содержимое секции` does not reload the full page preview, and hidden sections explicitly explain their absence with an undoable device-specific `Показать` control. Full [CI #41687851736](https://github.com/manufact-test/ai-site-cms/actions/runs/41687851736) **SUCCESS 4/4**, functional SHA `fde064af85f534f8168a27183317677d0257cfe9`, [Chromium captures](https://github.com/manufact-test/ai-site-cms/actions/runs/41687851736/artifacts/13256116162). **Not** a user UX GO, permission to deploy FOX, or first-client-site approval.

> **PAGE / BLOCK / ELEMENT — engineering checkpoint, 03.11.2026:** Clicking the selected page now opens a distinct Page Inspector, with its true title/path, existing page actions and page SEO settings. The main full page remains the primary clickable section/element surface. Scope switches or a repeated click on the current page do not reload the iframe or change draft data. Functional SHA `005753aad832b6628b85d47b2e705cd7ad45b92e`, [full CI #41684120493](https://github.com/manufact-test/ai-site-cms/actions/runs/41684120493) **SUCCESS 4/4**, [Chromium screenshots](https://github.com/manufact-test/ai-site-cms/actions/runs/41684120493/artifacts/13254592185) inspected for page settings, desktop and mobile. **Not yet deployed to FOX and not owner acceptance.**

> **VISUAL-FIRST PAGE EDITING — engineering checkpoint, 03.11.2026:** the central full-page canvas is primary. Clicking a section background opens the selected block contents/actions, while clicking its visible elements opens existing element fields; sidebar section/element lists are optional disclosures. Selection does not reload iframe or mutate the draft. Verified functional SHA `db6d6b5c474549344a578e5afa2dd6a7da3f3716`, [full CI #41673681398](https://github.com/manufact-test/ai-site-cms/actions/runs/41673681398) **SUCCESS 4/4**, with [real Chromium captures](https://github.com/manufact-test/ai-site-cms/actions/runs/41673681398/artifacts/13250351207). This is **not** approval to deploy or owner UX acceptance: FOX remains on older code. Please test the updated FOX only after its separately authorised controlled release.

> **Design Graph canvas bridge, 03.11.2026:** clicking a validated actual Graph node in the main Studio PHP preview opens that node in the existing Workbench inspector, without editing the draft or creating another editor. Verified functional SHA `dec59430f789e9907c545c1ecca7bbe334004843`, [CI #41664294523](https://github.com/manufact-test/ai-site-cms/actions/runs/41664294523) **SUCCESS 4/4**. Real owner UX acceptance still mandatory; FOX untouched.

> **Further phone editing checkpoint 03.11.2026:** repeated tap of an already-selected element now reveals a visible Inspector field in the open property group at 390 px, without exposing controls in collapsed groups. Functional candidate `9212b95b686f2ba53dfa2a389118a42f661871c6`, [CI #41662591463](https://github.com/manufact-test/ai-site-cms/actions/runs/41662591463) **SUCCESS 4/4**. No owner UX/UI GO and no FOX deployment.

> **Engineer UX checkpoint 2026-11-03 — direct canvas selection.** Main page preview now opens selected block, manifest text, static image or repeat item in the same Inspector; keyboard section selection and scroll persistence are regression-tested. Candidate `2d3db6e25fd61dcab3a4a24d4ca5f54f7e2c504c`, [CI #41661403198](https://github.com/manufact-test/ai-site-cms/actions/runs/41661403198) **SUCCESS 4/4**. This is engineering evidence, **not** owner UX/UI GO. FOX remains unchanged; owner review and staged acceptance are separate.

> **Owner decision 2026-11-03 — NEW binding UI acceptance gate.** First real-host FOX login succeeded, but owner explicitly rejected actual Studio architecture and requested a coherent rebuild before starting the first client-site pilot. Existing “temporarily acceptable” comments from 31.10 are historical, NOT current owner approval. Required IA: no-site home with honest empty state and no demo pages; site dashboard once selected; real-page visual canvas and contextual layer inspector; site-level settings and resources; separate profile/password/logout; separate owner-only users/license/updates/audit/backups/diagnostics. The “Подключить готовый сайт” flow must first explain approved-v2 prerequisites and selection, and must not include password changes or platform updates. Investigate where “Завод оборудования/Главная/Контакты/Первый экран/Преимущества” comes from before hiding demo UI or altering any persisted data. Research Elementor and Webflow official current editor IA first. Preserve current engine, Design Graph, SEO and all controls/API behind their correct routes. New required acceptance: owner independently navigates empty → select site → page/block → responsive edit/save/review/publish, as well as separate account/site/platform settings, with no guessing; capture real Chromium screenshots. Details: [live FOX handoff](../../handoffs/lead-integrator/HOSTINGER-LIVE-AND-ADMIN-UX-RESET-2026-11-03.md).

# MANUFACT AI Site CMS — критерии удобства и визуальной приёмки Studio

**Решения владельца:** 31.10.2026 и уточнение 01.11.2026. **Статус:** текущая Studio временно согласована как рабочая база до практического использования на первом реальном сайте; финальная hands-on UX/UI-приёмка отложена до этого момента. Это не финальный UI/UX GO и не приёмка Stage 3. Главный источник — `docs/MASTER-TZ.md`, разделы E–F.

## Цель

Владельцу нужен современный, понятный и визуально цельный редактор, а не набор технических форм, похожий на старую панель/форум. Существующий Stage3 Studio/Workbench уже имеет функциональные возможности, но это **не доказательство его удобства или готового внешнего вида**. Elementor/Tilda — примеры продуманного рабочего процесса, не дизайн для копирования и не разрешение на второй редактор.

## Один интерфейс, реальный рабочий путь

1. **Ориентация:** за секунды понятно, какой сайт/страница открыта, где дерево страниц и секций, что сейчас выделено, какой выбран размер экрана и есть ли несохранённые изменения. Основные действия видны, второстепенные сгруппированы по контексту.
2. **Правка:** владелец выбирает реальный текст, изображение, кнопку, композицию/FAQ или поле формы в существующем Workbench/Inspector, без знания JSON, CSS или структуры манифеста. Неиспользуемые для этой секции свойства не забивают панель.
3. **Адаптив:** понятны режимы desktop/tablet/mobile, наследование и собственные настройки; можно вернуться к исходному стилю и увидеть весь сайт. UI должен различать свойства элемента и глобальные настройки.
4. **Согласованная работа:** превью, Undo/Redo, черновик, Save, Publish, history и Rollback явно различимы. Нет ложных обещаний автосохранения или внезапного публичного изменения.
5. **Практические задачи:** в одном интерфейсе владелец меняет реальное изображение, порядок FAQ, CTA/ссылку, настройки действующей формы, SEO-метаданные — затем сохраняет, смотрит опубликованное и при необходимости откатывается.

## Что нужно спроектировать и показать

- Цельная визуальная система: читаемые шрифты, ритм отступов, цветовые состояния, панели/карточки, иконки, поля, кнопки, диалоги, понятные пустые/ошибочные/загруженные состояния.
- Чёткая иерархия действий и умеренная плотность экрана: *частые действия на виду, сложные — по запросу*, без бесконечных одновременно открытых инспекторов и лишних кнопок.
- Реальная доступность управления клавиатурой, фокус, подписи, достаточный контраст; проверить доступные размеры окна, чтобы рабочие панели не перекрывали превью.
- Сделать согласованный **единый UX/UI-проход существующего Studio** (дизайн/вёрстка/навигация), а не серию мелких бесконечных косметических правок. Сохранить существующие контракты, безопасность, публикацию и редактируемость индивидуального сайта.

## Приёмка владельцем (не заменяется CI)

- Показать реальные Chromium-экраны Studio, не стилизованные маркетинговые картинки.
- Илья самостоятельно выполняет базовые пять сценариев выше на первом реальном сайте после его подключения к CMS. Не подменять эту практическую проверку случайным клиентским сайтом или искусственным макетом.
- Зафиксировать замечания по понятности, перегрузке, визуальной иерархии и ошибкам; исправить конкретные проблемы и показать повторно.
- Текущая Studio временно согласована как рабочая база. Финальный **owner UI/UX GO** будет решаться после практического использования на первом реальном сайте.

## Первый реальный сайт — источник сценариев

Илья позже предоставит ранее созданный лендинг. До программирования новой версии: аудит сильных сторон/ошибок в UX, SEO и дизайне с объяснением «было → почему → как исправим»; три **статичных** макета desktop/tablet/mobile, действия/анимации/адаптив/ссылки и утверждение. После этого — код индивидуального сайта и подключение **в этот же Studio**. Не выдумывать материалы и не считать старый лендинг уже согласованным макетом.

Технические кандидаты по реестру: **124/135 (~92% покрытия), ещё 5 partial + 6 внешних gates; владелец принял 0/135**. Эти числа **не** отражают эстетическую/UI-приёмку. Краткий отчёт: этап + оценочный технический % + что осталось + SHA/CI; без простыней кода в чате.


## Реализация · первая цельная UX-итерация Studio (31.10.2026)

**Инженерный статус:** навигация и визуальный рабочий слой переработаны в рабочей Stage3-ветке; **отдельной визуальной/практической приёмки Ильи ещё нет**. Не считать завершённым UI/UX GO.

- Если после входа сайт ещё не открыт, Studio показывает понятное стартовое состояние: выбор имеющегося сайта или подключение готовой утверждённой папки через тот же безопасный импорт. Никакого встроенного генератора или автоматической публикации нет.
- Дерево страниц и блоков поднято в основной рабочий маршрут: дополнительные медиа, заявки/уведомления, повторно используемые блоки, архив и импорт теперь раскрываются только по запросу. Это **те же панели, API, права и редактор**, не новая CMS.
- В серверной верхней панели появился прямой вход в существующий редактор полной страницы; проверка перед публикацией видна как явный отдельный этап. Верхняя последовательность действий читается как «редактирование → сохранить → проверить → опубликовать»: публикация визуально отделена от главной кнопки сохранения. Внутри полного Workbench доступны сохранение текущего черновика и переход в прежний защищённый экран проверки; публикация не происходит автоматически.
- Обновлены базовая цветовая система, типографика, кнопки, поля, навигация, фокус и адаптивная компоновка серверной Studio/Workbench. Путь текущей страницы/секции виден возле предпросмотра; режимы ПК/планшет/телефон имеют доступное состояние выбора, а в обычном инспекторе скрыты технические пути полей (сохраняются в подсказках), а наследование адаптивных значений по-прежнему показано. Ctrl/Cmd+S вызывает **только** уже существующее явное сохранение.
- Редактор метаданных, форма, карта сайта, проверка качества, серверные диалоги и экран подготовки публикации получают согласованное светлое оформление с читаемыми состояниями ошибок и предупреждений; специализированные превью страниц сохраняют собственный фон.
- Раскрытые вспомогательные панели запоминаются в пределах вкладки как UI-предпочтение; содержимое сайта, токены, права доступа, персональные данные и публикация в этом хранилище не сохраняются.

- Существующий проверочный Chromium-путь дополнен реальными снимками серверной Studio и её Workbench на ПК/телефоне; они сохраняются в уже существующий Actions-артефакт `ai-site-stage3-editor-screens` на синтетическом сайте. Это материал для оценки визуальной целостности, а не клиентский прототип и не самостоятельная приёмка владельца.

- Дополнительный рабочий сценарий: в существующем дереве можно находить страницу по названию/URL и блок на ней, выбирать результат клавиатурой, очищать фильтр и продолжать работу в тех же полях. Несохранённый черновик отмечен в заголовке вкладки; отменённое переключение сайта возвращает выбор на текущий открытый сайт. При конфликте серверной ревизии локальные правки остаются в редакторе, предлагается выгрузить JSON и осознанно открыть новую ревизию — без тихого перезаписывания или публикации.

- Следующий полный сценарий медиа в уже существующем Workbench: владелец выбирает фотографию/Graph-изображение в живом макете, загружает новый PNG/JPEG/WebP прямо там, задаёт собственный alt или декоративность, может локально оптимизировать крупный файл до серверного лимита и одной осознанной операцией назначает точный исходник выбранному блоку. На планшете/телефоне у Graph сохраняется независимый responsive-источник; исходный ПК-вариант не перезаписывается. Публичный alt Graph-узла (общий для всех экранов) меняется только отдельным понятным выбором; описание нового файла в библиотеке само по себе не переписывает чужой утверждённый alt. Медиа сначала сохраняется как приватная серверная ревизия, привязка остаётся Undoable черновиком до отдельного Save; публичный выпуск не меняется. Короткий обязательный approved-site Chromium CI теперь проверяет мобильный источник, обработку крупного файла, сохранение, неизменность ПК/alt и отсутствие самопубликации; полный ручной визуальный GO это всё равно не заменяет. В том же селекторе доступен поиск по медиа. Это не автоматический перенос PNG в код и не новый редактор.

**Всё ещё обязательно:** реальный Chromium-осмотр внешнего вида на нескольких ширинах, ручные сценарии Ильи на разрешённом сайте, проверка доступности и контрастности сложных инспекторов/диалогов, фиксация замечаний и явный owner UI/UX GO. Автоматические smoke-тесты подтверждают только работу редактора и контрактов. Первый клиентский сайт остаётся зависимым от исходного лендинга и трёх утверждённых макетов.


## Реализация · вторая UX-итерация Studio (31.10.2026)

**Инженерный статус:** добавлен адресный проход доступности и адаптивности существующего интерфейса; это не новый редактор и не изменение пользовательского scope.

- Добавлена клавиатурная ссылка перехода сразу к основной рабочей области, подписаны боковые landmark-панели, а набор элементов инспектора обозначен как группа.
- В серверной Studio активная страница и активный блок объявляются через `aria-current`; после выбора с клавиатуры фокус возвращается на новый активный пункт, а не теряется из-за перерисовки дерева. Для поиска страниц объявлен существующий `/` shortcut, а сохранение черновика сообщает сочетания `Ctrl+S` и `⌘S` вспомогательным технологиям. Диалоги с видимыми заголовками получают явное имя, а проверка подтверждает возврат фокуса после `Escape`.
- Исправлен контраст мелких подписей на светлых поверхностях. На мобильной ширине увеличены минимальные размеры основных кнопок и полей, переключатель ширины предпросмотра занимает доступную ширину; длинные списки страниц и блоков переведены в горизонтально прокручиваемое дерево.
- Chromium CI теперь проверяет клавиатурный выбор страницы/блока, восстановление фокуса, skip link, состояния кнопок устройств, контраст репрезентативных подписей и отсутствие горизонтального переполнения на 1024/768/390 px. Добавлены реальные скриншоты планшетной Studio и Workbench в существующий артефакт.
- Эти проверки подтверждают конкретные технические улучшения, но не являются полным WCAG-аудитом и не заменяют ручную проверку владельцем. **Owner UI/UX GO всё ещё отсутствует.**


## Уточнение владельца · 31.10.2026: приоритет — не перекрашивание, а понятная структура

Владелец отдельно уточнил, что **текущий базовый визуальный стиль Studio можно пока оставить**. Не требуется срочно менять всю палитру, карточки или делать радикальный новый дизайн. Основная проблема — информационная архитектура и перегрузка: слишком много одновременно видимых кнопок/«квадратиков», повторяющиеся названия и технические элементы, по которым непонятно, что именно делает каждый control.

Приоритет текущего UX-прохода:
- привычная иерархия страниц → блоки → настройки выбранного элемента;
- одна очевидная основная операция в каждом контексте;
- редкие, опасные и расширенные операции — в закрытых контекстных группах;
- инструменты сайта разделены по человеческим задачам, а не по внутренним модулям;
- не показывать владельцу внутренние ID и технические названия без необходимости;
- использовать ясность навигации WordPress и удобство сценариев Elementor/Tilda как ориентир, но сохранить **один существующий Studio/Workbench**.

Это уточнение не отменяет обязательную ручную приёмку владельцем. Реальные браузерные сценарии и скриншоты нужно показать Илье; UI/UX GO пока нет.


## Реализация · третья UX-итерация Studio: сокращение визуального шума (31.10.2026, v9.8)

**Статус:** первая структурная реализация внесена в lead branch; владелец ещё не проверял её руками. Не считать приёмкой.

- Основной маршрут стал короче: «Добавить страницу» и «Добавить блок» — главные действия; редко используемые операции страницы/блока раскрываются по запросу.
- Инструменты сайта разложены по категориям с человеческими названиями, а ресурсы вынесены из основного маршрута в отдельные панели.
- Сохранённые версии и восстановление не занимают экран редактирования постоянно.
- Обычный инспектор не заставляет читать внутренние идентификаторы.
- Для длинной навигации добавлена внутренняя прокрутка боковой панели; телефонная компоновка возвращает sidebar и inspector в нормальный поток документа.
- Техническая цель — сократить количество одновременно видимых controls и объяснить владельцу, куда идти для обычной задачи, а не косметически изменить весь интерфейс.

**Исторический результат v9.8:** на HEAD ab04bc0ac87645cc7882a726a2b18c2d5a7c1312 в [Actions #41239753483](https://github.com/manufact-test/ai-site-cms/actions/runs/41239753483) job technology-runtime прошёл, а contract упал на pointer interception при открытии #server-approved-vault-open. Это падение впоследствии устранено в существующей Studio. **Актуальная проверка v9.9:** функциональный SHA 3a5fe6072600b7d74152673ae3316b5cc1e1483b, [Actions #41252586497](https://github.com/manufact-test/ai-site-cms/actions/runs/41252586497): technology-runtime=SUCCESS, contract=SUCCESS. Не считать старое падение текущим; подробности исправления и новое решение владельца записаны ниже.


## Временное решение владельца · 01.11.2026 — Studio согласована до практической работы с сайтом

Владелец подтвердил, что на текущем этапе не хочет продолжать абстрактную перестройку админки. Текущая версия Studio временно согласована и остаётся рабочей базой до момента, когда первый реальный сайт будет подключён и владелец сможет самостоятельно зайти в CMS, редактировать его и оценить интерфейс в деле.

Практические следствия:
- сейчас не начинать новый редизайн, перекладывание панелей или косметическую перестановку контролов;
- не объявлять интерфейс окончательно принятым: это временное согласование, а не финальный UI/UX GO;
- первый пилот строится на существующем лендинге владельца, материалы которого ещё не переданы;
- после подключения сайта владелец лично проверяет редактирование страниц и блоков, изображений, FAQ/CTA, формы, SEO, сохранения, проверки, публикации и восстановления;
- дальнейшие изменения Studio выполнять по конкретным замечаниям, выявленным в реальном рабочем процессе, а не по предположениям разработчика.

Техническое состояние после v9.8: первоначальный pointer-interception исправлен; полный workflow на функциональном SHA `3a5fe6072600b7d74152673ae3316b5cc1e1483b` прошёл успешно — contract и technology-runtime SUCCESS в [Actions #41252586497](https://github.com/manufact-test/ai-site-cms/actions/runs/41252586497). CI подтверждает инженерный сценарий, но не заменяет будущую практическую оценку владельца.


> **Engineering status 03.11.2026 — NOT an owner acceptance decision.** On functional SHA `f861ea7055dac3bff5ecdb4c68597c68d0cf73d2` the Inspector now defaults to the main task group, with other property groups disclosed on demand; keyboard navigation across pages, sections and elements preserves focus and continues to work alongside pointer/touch responsive reveal. [Full CI #41647681104 SUCCESS 4/4](https://github.com/manufact-test/ai-site-cms/actions/runs/41647681104), [real Chromium screenshots](https://github.com/manufact-test/ai-site-cms/actions/runs/41647681104/artifacts/13235149333). **No UI/UX GO and no FOX redeployment.** Owner hands-on acceptance below is still required.

