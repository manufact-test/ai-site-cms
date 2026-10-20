# Candidate existing-block property model — NOT Stage3 contract

**Purpose:** provide Stage3 coordinators with a typed fixture for Jedison 1.27.1 and JSON Schema/Opis evaluation; **do not canonize** AI↔site↔CMS protocol here. AI still owns site construction; CMS should only expose safe, declared attributes that *already exist in that specific block*.

## Boundary draft

`blockId` is a stable reference chosen by the site author, not a CSS selector/DOM query supplied by user. A static, versioned component registry in the future renderer identifies an allowed list of paths, their types, defaults, i18n labels, cross-field invariants and role permissions. Editing values never grants access to executable HTML/JS, CSS selectors, template PHP, arbitrary CSS variables or event handlers. Unknown fields fail closed.

| Property family | Candidate allowed editor values | Guardrails / further Stage3 research |
|---|---|---|
| Text/typography | Plain strings; `textPreset` enum; body/heading length caps | Escape for **HTML context** on output, no implicit HTML; rich text is a separate sanitized typed AST research task. No arbitrary font URLs/import. |
| Colors/background/borders | Existing design-token IDs from allowlisted palette | Never allow CSS injection, full `url(...)` backgrounds, untrusted variable names. Contrast checks when token pairs change. |
| Spacing/size | `xs..lg`, width `content/wide/full` enums, bounded integer responsive column counts | Hard layout caps; do not permit free calc/vw CSS until renderer has specific safe typed adapter. |
| Media | Opaque server-controlled `assetId`, literal alt text, eager/lazy | Upload pipeline must validate MIME/bytes/resolution/content, publish renditions/`srcset` and strip unsafe SVG. No third-party free URLs as unverified image blobs. |
| Links | CTA label and action kind, href string pending **semantic URL guard** | Schema `string` cannot prevent `javascript:`; validate scheme/relative path/origin, encoding, `rel=noopener`, target allowlist in renderer. `submit` targets only a declared working handler. |
| Responsive | Bounded mobile and desktop columns | Tablet/breakpoint tokens deferred; no arbitrary media query. Test no layout shift/overflow and low-motion. |
| Interactivity | `static`/`accordion`/`modal`, initial expansion boolean, mandatory Escape | Validate behavior according to actual block capabilities; do not allow changing a static text block into a modal just by editing JSON. Modal focus/scroll/trigger must be implemented in the component, not JSON. |
| Forms | Whitelisted fields, validation rules and delivery settings **held server-side** | No editor access to reveal tokens, no client-only validation, no pretend success; config gate and deployment-time recipient proof. Schema outside this preliminary fixture. |

## Critical gaps intentionally visible

- `editor-properties.candidate.schema.json` is a **research fixture**, not an agreed protocol. It illustrates closed per-family keys and bounds, but accepts `action.href=javascript:...` under JSON Schema alone. `test_schema.py` locks this raw-schema gap. A separate candidate `lab/src/PropertySafety.php` plus `property-tests.php` demonstrates a narrow server allowlist; this is not a finished renderer or agreed URL policy. Future renderer must reject it.
- This single super-set fixture is **not** a schema to show for every element. Stage3 needs per-**existing** element schemas with `if/then`/discriminators or concrete block-specialized schema generators; e.g. no `modal` selector on static H1, no `alt` property for blocks without images.
- No write API, versioning, autosave, permissions, conflicts, iframe isolation, tenancy, rollback, preview/publish, AI manifest binding, locale policy or SSR bridge is implemented here. No deployment/Hostinger integration.
- Jedison current source `cms/editor/src/index.js` demands a closed trusted object, clones data and exposes onChange; use it as an isolated evaluation path only. Opis server validation and display-context encoding still needed. Future Stage3 decides Draft 2020-12 subset support by Jedison/Opis and strict schema reflection.

## Review questions for main developer during Stage3

1. Format/version for block identity, capability registry, initial AI schema and render adapter mapping on static PHP and React/Next.
2. How to couple semantic server constraints (safe links, media ownership, form destination) to JSON Schema so preview and publish behave consistently.
3. Atomic edit semantics, conflict revisions, cross-breakpoint preview, typing of rich text/gradients and localized content.
4. Security validation order: `schema allowlist → semantic guard → authorization/revision → output-specific escaping → preview/publish`.
5. How to certify that a CMS-disabled site, including form handling, keeps running independently.

**Acceptance:** this is a lab handoff for architecture review, with no decision delegated away from Stage3.
