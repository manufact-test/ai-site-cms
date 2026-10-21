# Editor & Components — independent upstream audit (20 October 2026)

> **Заключительный status 21.10.2026:** исследование 17 блоков завершено; читающий главный интегратор должен начать с [пакета передачи](MAIN-INTEGRATOR-HANDOFF-2026-10-21.md) и [финального evidence](TEST-EVIDENCE-FINAL-2026-10-21.md). OSS shortlist ниже не означает approved dependency, legal/NOTICE compliance или автоматическое изменение CMS. Проверенный код `5330c148ff4a14ebb74b53457cd2b91cfeff574b`; [CI](https://github.com/manufact-test/ai-site-cms/actions/runs/39574269556) SUCCESS. Старые оценки ниже исторические.


**Scope:** candidate research only, **not** dependency approval, Stage3, product acceptance, a legal opinion or a production implementation. Public upstream metadata/README/LICENSE reviewed on 20.10.2026. Do not copy upstream code on the basis of an SPDX string alone; review complete transitive dependencies, notices, runtime artifacts, release hashes, disclosures/advisories and compatibility before import. No third-party code is vendored here.

## Decision criteria

- Lowest dependency/runtime cost for static HTML or PHP sites; **Node can build assets but is never required on the site's serving host**. React/Next adaptations separately; SSR/hydration to test on actual deployment targets.
- Verified keyboard and WCAG semantics, progressive enhancement, CSP and strict DOM/data boundaries. A library is not a security control by itself.
- Source attribution and independent legal sign-off before bundling. Version/license audit per selected release, not assumptions about the repository HEAD.
- **Size evidence:** sizes below come from linked maintainers' README or visible upstream distribution files, **not comparable min+gzip measured bundles**. All final size budgets remain pending reproducible pinned production builds.

## Candidate matrix

| Need | Project / verified license | Evidence, footprint / activity | Site families | Assessment & important constraints |
|---|---|---|---|---|
| Client form validation | [JustValidate](https://github.com/horprogs/Just-validate), **MIT candidate — must reconfirm exact tagged license** | No pinned size benchmark; inspect releases/maintenance and audit | Vanilla JS/HTML/PHP; React via adapter | **Evaluate**, UX only. PHP always owns authoritative validation. No client validation means no protection. |
| Server-side email validation | [egulias/EmailValidator](https://github.com/egulias/EmailValidator), **MIT** | PHP library; dependency/install size not measured | PHP 8.1+ after version-specific runtime check | **Shortlist** where email edge cases matter; `filter_var` demo is not a complete deliverability check. No DNS probing by default. |
| Region-aware phone validation, PHP | [giggsey/libphonenumber-for-php](https://github.com/giggsey/libphonenumber-for-php), **Apache-2.0** | 9.0.41 on Packagist, 2026-10-08; requires PHP ^8.1 and dependencies, full vs lite variation | HTML/PHP backend, also React/Next via service | **Top pick for authoritative PHP phone parser**. Verify metadata version; require pinned composer lock, bundle server-only; runtime code does not require Composer executable. |
| Phone parsing, JS | [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js), **MIT** | Maintainer cites ~145 kB code+min metadata (uncompressed), ~80 kB default metadata / ~145 kB max; bundles must be remeasured | Vanilla JS, React/Next | **Shortlist for optional UX**; min metadata may only ensure possible length, not full strict validity. Server must revalidate. |
| Phone visual input | [intl-tel-input](https://github.com/jackocnr/intl-tel-input), **MIT** | Modern vanilla & React adapters; flags/utils/metadata inflate assets, size not measured | HTML/PHP/React/Next client | **Evaluate when country selector is actually needed**. Server libphonenumber remains required; do not trust hidden country/phone payload. Extra attribution for flags/source datasets. |
| Input mask | [Inputmask](https://github.com/RobinHerbots/Inputmask), **MIT** | Vanilla JS and jQuery modes; size not measured | All client families | **Optional only**, masks are not country-validity/security; can disrupt screen readers and copy-paste. |
| FAQ / accordion | Native [`details/summary`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details), web platform | No library payload, native browser behaviour | All incl. SSR/static | **Default for ordinary FAQ**; use semantic headings and test different SR/browser combinations. APG accordion pattern for rich multi-panel behaviour. |
| Modal | Native [`dialog`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog), web platform | No package; top-layer showModal | All, with small progressive-enhancement glue | **Default modern target**; test focus return, initial focus, Escape and mobile viewport. Native handling differs by browser/version. |
| Modal alternative | [a11y-dialog](https://github.com/KittyGiraudel/a11y-dialog), **MIT** | Upstream README cites ~1.7kB; 8.1.5 release listed | Vanilla JS/HTML/PHP + React wrappers | **Fallback when native dialog insufficient**. Test page nesting/focus/SSR. |
| Rich accessible React primitives | [Radix UI Primitives](https://github.com/radix-ui/primitives), **MIT** | Packages independently bundled; measure after tree-shaking | React/Next **only** | **Shortlist React-specific** for dialog, tabs, accordion, navigation; never ship React to static PHP sites just to use these. |
| Navigation/menu/tabs | Native `button`, `nav`, `aria-expanded` + [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/), W3C reference | No library payload | All site families | **Default for uncomplicated navigation**. Do not wrongly use ARIA `menu` keyboard patterns for ordinary website nav links. |
| Full UI alternative | [Bootstrap](https://github.com/twbs/bootstrap), **MIT** | Browsable dist `bootstrap.js` ~142 kB *unminified* for current 5.3.8 file (not gzip); Popper optional for certain widgets | All | **Do not add framework by default**: broad CSS and JS cost, conflicts with bespoke AI theme; selective adaptation only. |
| Gallery/lightbox | [PhotoSwipe](https://github.com/dimsemenov/PhotoSwipe), **MIT** | v5, upstream discusses upcoming v6; modular dist, BrowserStack tested | Vanilla JS, PHP, React/Next client | **Shortlist for multi-image zoom/lightbox**. Pin a v5 release, review v6 before switching, measure built JS/CSS and focus/close. |
| Responsive media | Native `<picture>`, `srcset`, `sizes`, `loading`, `width`/`height` | Zero package bytes | All incl. SSR/static | **Default**; media pipeline should output width/height, modern formats and variants. Never lazy-load LCP image by default. |
| Icons/buttons | [Lucide](https://github.com/lucide-icons/lucide), **ISC**, parts Feather MIT | Tree-shakable/icon-specific SVG; font+full runtime avoidable | All via curated SVG, React package optional | **Shortlist SVG assets with notice**, links as anchors and actions as buttons; validate icon accessibility and safe URL handling. |
| JSON Schema validation (build/browser) | [Ajv](https://github.com/ajv-validator/ajv), **MIT** | Draft 2020-12 via explicit class/import; runtime size to measure | JS build, React/Next, optional admin | **Candidate only** for shared schema QA; Opis 2.6 remains server authority, Jedison 1.27.1 current editor. |

### Risks and security boundaries

1. **Threats:** CSRF and submit replay, spam flood, email header injection, SSRF from delivery endpoints, unsafe HTML/CSS/URL injection, XSS in content/alt/captions, prototype pollution in imported manifests, modal focus escape, mixed-version phone metadata, image decompression bombs and malicious SVG. Evaluate each at the site's trust boundary, never assume component libraries solve them.
2. **Review prerequisites:** pinned exact release/tag and SHA (not latest CDN), full LICENSE/NOTICE including icon/flag artwork, dep tree and license audit, disclosures and issue trajectory, prototype threat model, bundle+network measurements, PHP version/extensions and browser compatibility, keyboard+mobile regression, no Node runtime at target.
3. **Form anti-spam:** session throttling is insufficient for distributed traffic, rotating IPs or server farms. Production needs centralized scoped rate limiting, abuse feedback, transport credentials outside webroot, recipient validation, retry/idempotency/outbox, actual delivery verification and operational observability. Optional privacy-aware challenge only when justified; no hidden remote SaaS promises.
4. **React/Next:** TypeScript/React wrappers should consume the same **data** constraints, not import PHP-specific DOM scripts. Next SSR requires browser-only JS deferred post-hydration, no `window` in render, no mismatches, independent production deployment verification. The current lab tests **neither SSR nor deployment**.

## Recommended shortlist (not approved)

- **By default:** web platform FAQ/details, native dialog and `<picture>`, semantic nav/buttons + small isolated JS, WAI-ARIA/WCAG guidance. Minimal public payload and maximum portability.
- **Server international phone:** `giggsey/libphonenumber-for-php`, version-pinned and region-aware; **JS optional** `libphonenumber-js` or `intl-tel-input` for country UI. Never equate regex masks with valid international numbers.
- **Advanced galleries:** PhotoSwipe; **React-only interactive primitives:** Radix; **unsupported modal fallbacks:** a11y-dialog.
- **Forms:** real PHP validation/delivery/abuse middleware, optional JustValidate for client UX, Egulias where needed. The local PHP lab intentionally **does not** claim complete anti-bot or international telephone validation and refuses phones until provider exists.

## Primary sources reviewed

- [Giggsey GitHub](https://github.com/giggsey/libphonenumber-for-php) and [Packagist metadata](https://packagist.org/packages/giggsey/libphonenumber-for-php)
- [libphonenumber-js repo/metadata comparison](https://github.com/catamphetamine/libphonenumber-js)
- [intl-tel-input repository](https://github.com/jackocnr/intl-tel-input)
- [a11y-dialog repository/releases](https://github.com/KittyGiraudel/a11y-dialog/releases)
- [PhotoSwipe repository](https://github.com/dimsemenov/PhotoSwipe)
- [Radix MIT license](https://github.com/radix-ui/primitives/blob/main/LICENSE)
- [Bootstrap license/distribution](https://github.com/twbs/bootstrap)
- [Ajv project](https://github.com/ajv-validator/ajv)
- [W3C APG accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/), [modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [WCAG](https://www.w3.org/TR/WCAG22/)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html), [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

**Limits:** release security status, exact production bundle size, transitive license composition and compliance are NOT independently certified by this research; security team's separate reviews and the legally qualified human review are still required.

## Follow-up comparative experiments — 20 Oct 2026

| Candidate / path | Concrete lab finding | Follow-up gate before production |
|---|---|---|
| [giggsey/libphonenumber-for-php-lite](https://github.com/giggsey/libphonenumber-for-php-lite), Apache-2.0 | Same core parse / `isValidNumber` / E.164 primitives as full distribution, lower payload than geographic extras; PHP 8.1+ and mbstring. `lab/src/PhoneAdapter.php` binds only to its documented API when an operator-supplied autoloader is present; absent library causes `PHONE_VALIDATOR_REQUIRED`. | Composer resolver + dependency NOTICE and version-pinned lock, actual real multi-region metadata tests, cache/bundle measurements, error/extension policy and numbering-plan update strategy. The earlier local suite used a protocol double; a separate real pinned Composer metadata test now runs in GitHub Actions (Blocks 9–11). |
| [giggsey/libphonenumber-for-php](https://packagist.org/packages/giggsey/libphonenumber-for-php), Apache-2.0, 9.0.41 dated 2026-10-08 | Full package includes additional geocoding/carrier/timezone features not needed for baseline forms; runtime no Node, Composer can package at build time. | Prefer **lite** if only parse/validate/normalize is used; independent legal and security approval, final locked SHA and ext-mbstring availability on target hosting. A number's numbering-plan validity **does not prove ownership or reachability**. |
| Stateless browser honeypot + session attempts | Cheap first layer; fails across new sessions, bots, multiple PHP processes and rotating clients. | Shared-state limiter, operator-approved client identity, distributed abuse response, durable idempotency, privacy and real delivery confirmation. |
| `lab/src/SharedThrottle.php` standalone atomic file lock | 12 **real parallel PHP CLI processes**, limit 4 in same 60s window → exactly 4 grants. HMAC hashed raw server `REMOTE_ADDR` with no IP in file paths; no trust in user-supplied X-Forwarded-For. Runs on shared PHP hosting with writable **private** sibling storage and flock. | **Lab only:** per-IP shared proxy effects, unbounded files/disk and cleanup, multi-host/network-filesystem locks, denial-of-service/lock contention, operational tuning and incident review. Production may instead need Redis or server-native distributed rate limit; fail closed if private storage/secret missing. |
| Native `<picture>` + `<source>` + AVIF/WebP, no JS runtime | Six locally generated original binary fixtures: 320/640/960px, both formats; real Pillow and Chromium data-URL decode and byte-budget tests. No Node, no remote CDN. Width/height + aspect ratio, meaningful alt, responsive `sizes`, priority only for declared LCP. | An authenticated media pipeline, content sniffing, upload virus scanning, EXIF stripping, server-side resizing and strong cache headers/asset versioning, browser decode matrix, RUM LCP/CLS. Image priority must depend on **measured** actual first viewport, not a property editable per-site without review. |
| PhotoSwipe v5 (MIT) | An optional rich multi-image zoom candidate, deliberately **not vendored**: a `<picture>` does not need its JS weight. | Production gallery focus management, preload budgets, license NOTICE, native image lazy-loading interplay, tests in Next SSR/client hydration; ship only for blocks requiring it. |

References: [PhoneNumberUtil documented semantics](https://github.com/giggsey/libphonenumber-for-php-lite/blob/main/docs/PhoneNumberUtil.md), [current composer metadata](https://packagist.org/packages/giggsey/libphonenumber-for-php), [OWASP CSRF/Fetch Metadata guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html). These are candidate findings, **not package legal signoff or dependency installation**.

## Обновление исследования: проверка upstream и graceful degradation (21.10.2026)

В GitHub Actions на нашем коде `7dc3284c5a6421c4b841a3275ced812e9ce5fae7` действительно устанавливались `giggsey/libphonenumber-for-php-lite:9.0.41` и `symfony/polyfill-mbstring:1.38.2` в удаляемом временном Composer-проекте. Проверены 13 реальных примеров и нормализация формы в E.164, версия пакета и аудит Composer. Это **не перенос** в production lock, не лицензирование/NOTICE и не подтверждение принадлежности номера абоненту.

Block 11 доказывает ограниченный Chromium-scope подход: без JS страницы имеют работающую обычную навигацию, обе секции текста вкладок, доступное описание модального действия и нативную проверку формы; интерактивные JS-кнопки скрыты до инициализации. После JS инициализируются ARIA-таб-панели и управление фокусом. Ни Chromium DOM-тесты, ни эти данные не заменяют VoiceOver/NVDA/TalkBack, мобильный Safari, реальный Next SSR или ручную WCAG-проверку. [Evidence](TEST-EVIDENCE-BLOCK11-2026-10-21.md) / [CI 39509827314](https://github.com/manufact-test/ai-site-cms/actions/runs/39509827314): 34 PHP syntax, 388 PHP assertions, 56 Python tests (30 Chromium), все PASS.

Здесь нет импорта стороннего кода в сайт, миграции CMS или разрешения Stage3. Решения остаются за главным интегратором.
