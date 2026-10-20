# AI Site CMS — independent Editor & Components Research

**21.10.2026, current handoff; all earlier dated sections below are historical. Research only.** Branch `research/editor-component-patterns`; working tree restricted to `research/parallel-components/`. Owner architecture Slim4 + Opis2.6 + Jedison1.27.1 remains unchanged; Stage2 NOT ACCEPTED, Stage3 NOT STARTED, 0/135 mandatory product requirements accepted.

Research deliverables:

- [`COMPONENT-AUDIT.md`](COMPONENT-AUDIT.md) — upstream OSS candidate matrix, license/runtime/size/a11y/security/integration evaluation and recommended shortlist (NOT legal signoff).
- [`EDITOR-CONTRACT-PROPOSAL.md`](EDITOR-CONTRACT-PROPOSAL.md) + [`fixtures/`](fixtures/) — closed typed candidate property groups, positive/negative fixture and explicit unresolved semantic/safe-link concerns. **Not the definitive AI↔site↔CMS contract.**
- [`lab/`](lab/) — independently running PHP form and keyboard-first HTML components, session CSRF/token abuse tests and browser/mobile experiments, with honest delivery configuration states.

[Run the lab](lab/README.md). No third-party code copied, npm/Composer lock changed, CMS/Hostinger or canonical docs touched. Main developer must independently review and merge the PR, then decide if and when an adapter should be implemented after Stage2 acceptance.

## Independent lab hardening — 20.10.2026

The second research pass adds a trusted Origin/Host gate, fail-closed URL semantics, honest unknown transport outcomes and duplicate-submission UI handling, mobile/dialog focus regressions, and per-existing-block editable-path fixtures. Full reproducible tests and tooling versions: [TEST-EVIDENCE-2026-10-20.md](TEST-EVIDENCE-2026-10-20.md). Neither canonical product docs nor the current runtime are changed; PR #2 was subsequently merged by the main integrator; this is historical evidence only.

## Third autonomous research package — 20.10.2026

PhoneAdapter (refusal unless actual libphonenumber PHP metadata is installed), privacy-scoped file-lock shared throttle (12-worker concurrency test), an original 6-variant AVIF/WebP responsive picture with native HTML renderer and actual Chromium decode, honest real HTTP anti-spam/phone/delivery gates, and a noncanonical per-existing-block property registry for phone/media. Only research files were changed; **no new locked dependencies** and **no production anti-bot, phone-library, or media pipeline claim**. Repro details: [`TEST-EVIDENCE-BLOCK3-2026-10-20.md`](TEST-EVIDENCE-BLOCK3-2026-10-20.md).


## Fifth research package — 20.10.2026 (handoff)

PR #2 was **MERGED by the main integrator**; additional independent research is now proposed as a **new PR from the same research branch**, never written to `main` by this researcher. This package delivers a progressive-enhancement two-step form, a strict duplicate/unknown-parameter POST boundary independent of wizard UI, and a multi-property revision plan correctness repair. Existing CMS/Hostinger/ADR/workflows untouched. See [block 5 evidence](TEST-EVIDENCE-BLOCK5-2026-10-20.md) and [our-only next-chat handoff](NEXT-CHAT.md). This is still not production form delivery, an actual CMS block editor, nor the final Stage3 contract.

## Текущий контрольный пункт — Block 11 (21.10.2026)

Это **исследовательская ветка**, не production CMS. [PR #4](https://github.com/manufact-test/ai-site-cms/pull/4), [актуальная передача](NEXT-CHAT.md) и [протокол Block 11](TEST-EVIDENCE-BLOCK11-2026-10-21.md). Кодовый SHA: `7dc3284c5a6421c4b841a3275ced812e9ce5fae7`. Проверка [GitHub Actions 39509827314](https://github.com/manufact-test/ai-site-cms/actions/runs/39509827314): SUCCESS, 34 PHP syntax, 388 PHP assertions, **56 Python tests including 30 Chromium**, настоящая Composer-библиотека телефона. Ранние результаты Block 5 ниже сохранены только как история.

Block 6–10 добавили типизированный CSP-предпросмотр, защищённые нативные HTML/JSON ответы, реально исполняемые HTTP/Chromium→PHP регрессии, UTF-8 и Content-Type/Accept ограничения, а также проверку настоящей libphonenumber (пин 9.0.41) во временной Composer-среде. Block 11 исправил работу без JavaScript: видимая обычная навигация, обе панели вкладок с заголовками, информация модального окна в `<noscript>`, нативные required/email/minlength; интерактивные кнопки скрыты, пока не подключён JS. После загрузки JS появляются необходимые кнопки, однозначные роли ARIA и управляемая мастером проверка формы. Сервер продолжает контролировать CSRF/Origin/валидность/доставку.

Все модули — только кандидаты; нет готового Stage3 контракта, подтверждения входящей почты, VoiceOver/NVDA/TalkBack аудита или интеграции в реальную CMS. Stage2 не принят, Stage3 не начат.
