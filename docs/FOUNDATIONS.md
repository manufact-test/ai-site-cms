# AI Site CMS — исследование open-source основы (этап 1, в работе)

**Дата:** 17.10.2026 · **Статус:** исследование начато; ни стек, ни fork, ни CMS не утверждены.

Основной документ с индивидуальной матрицей всех 135 обязательных требований: [FOUNDATION-COMPARISON.md](FOUNDATION-COMPARISON.md). Результаты исследовательских локальных тестов: [STAGE-1-TEST-LOG.md](STAGE-1-TEST-LOG.md). Главные бизнес/технические условия: [MASTER-TZ.md](MASTER-TZ.md) §1.4, [ROADMAP.md](ROADMAP.md) этап 1.

## Рамки поиска

- **Внутренний продукт** команды для админок клиентских сайтов, не публичная платформа для перепродажи. Внешний доступ клиентов возможен. **Используем хорошие готовые большие/малые модули, не переписываем искусственно**; права и обязательства определяются исходной лицензией конкретного кода.
- Лёгкий редактор **одного** блока по AI manifest, без ручного drag-and-drop создания страниц. Свойства только реально используемые; responsive, defaults, stable IDs, межверсионные overrides и конфликты.
- **Текущий PHP shared hosting** без апгрейда, отдельный Node-server для CMS не требуется. Браузерный редактор может собираться заранее. Next SSR отдельно от PHP-only backend.
- Публикация не равна сохранению черновика; публичный сайт автономен от панели.
- Полный release только после 135/135 обязательных, без MVP.

## Shortlist

| Направление | Кандидаты | Задача | Предварительная оценка |
|---|---|---|---|
| Framework-agnostic schema UI | [Jedison](https://github.com/germanbisurgi/jedison) (MIT, 1.27.1, 0 runtime/peer deps) | JSON Schema → HTML inputs без React; custom editors/events | **Приоритет реального A/B теста**; без реальной установки кандидат ещё не принят |
| Готовый JS field editor | [JSON Forms](https://github.com/eclipsesource/jsonforms) (MIT), [RJSF](https://github.com/rjsf-team/react-jsonschema-form) (Apache-2.0) | Автоматически строить настройки из schema | **Первая исследовательская ветка** |
| Готовая оболочка редактора | [Puck](https://github.com/puckeditor/puck) (MIT) | Property UI, preview | Сравнить с полями без DnD, не брать целиком заранее |
| Visual editor primitives | [GrapesJS](https://github.com/GrapesJS/grapesjs) (BSD-3-Clause), [VvvebJs](https://github.com/givanz/VvvebJs) (Apache-2.0) | CSS-controls, selection, HTML preview | Только пригодные компоненты при отделимости от builder model |
| PHP API | [Slim](https://github.com/slimphp/Slim) (MIT), Symfony components | API/auth framework primitives | Проверить стоимость собственного revision engine |
| PHP CMS-backend | [Winter CMS](https://github.com/wintercms/winter) (MIT), [ProcessWire](https://github.com/processwire/processwire) (проверить по каждому файлу и сборке) | Auth/storage/pages/plugins | Резервный путь, оценить retrofit и 3rd party assets |
| JSON schema PHP | [Opis JSON Schema](https://github.com/opis/json-schema) (Apache-2.0) | Валидировать typed manifest на сервере | Сравнить JSON Schema dialect и безопасность |
| Тяжёлые CMS | [Microweber](https://github.com/microweber/microweber), [Grav](https://github.com/getgrav/grav), [Payload](https://github.com/payloadcms/payload) | Часть готового backend/editor | Вероятен лишний вес либо Node runtime |
| Более сложные лицензии | [Vvveb CMS](https://github.com/givanz/Vvveb) (AGPL), [Directus](https://github.com/directus/directus) (MSCL) | Кандидаты для исключения/анализа | **Не интегрировать по умолчанию** |
| React editor toolkit | [Craft.js](https://github.com/prevwong/craft.js) (MIT) | Контролы/редактор React | Слабее актуальность релизов; без преимущества над первыми кандидатами |

**Лицензия ≠ бренд на сайте:** permissive-компоненты обычно требуют технического текста об авторских правах и лицензии, а не вывода логотипа/ссылки посетителям. Изменение 30% кода не прекращает условия на сохранённые 70%. Лицензии конкретных встроенных assets/plugins проверяются отдельно.

## Исследовательские приоритеты

1. **Модули:** Jedison **или** JSON Forms/RJSF + PHP API + isolated iframe + versioned manifest. Jedison — новый первый кандидат за счёт vanilla JS и нулевых runtime-зависимостей; работоспособность ещё не доказана. Выбирать после фактической проверки.
2. **Альтернатива:** Puck editor shell + отдельный PHP backend; узнать, можно ли использовать редактор без React page-builder model.
3. **Альтернатива backend:** Winter CMS или ProcessWire + собственный block editor; оценить сложность адаптации.
4. **Идеи/компоненты UX:** GrapesJS/VvvebJs style controls; выбирать реализацию по лицензии и независимости.

**Ни один пункт не утверждает готовность или выбор стека.** Сравнение характеристик по репозиториям недостаточно, чтобы закрыть этап: нужны изолированные сопоставимые испытания, тестирование зависимостей, hosting и миграций overrides.

Последний checkpoint: [NEXT-CHAT.md](NEXT-CHAT.md).
