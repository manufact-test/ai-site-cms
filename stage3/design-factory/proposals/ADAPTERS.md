# D3 — Future component adapters (proposals only)

These eight components **do not exist in the current registered Stage3 site-v1 contract**. Nothing in this folder patches the SDK, PHP renderer, Studio or JSON schema. Each composition has a verified fallback to one already registered component; this document describes additional work for the lead integrator if exact visual behavior is desired.

## 1. process-steps-v1 — Structured ordered workflow

**Suggested future component:** `process-steps` (new first-party manifest required)
**Existing fallback:** `feature-highlights`
**Suggested typed fields (not valid current site-v1 props):**

- heading:text<=180
- steps:repeat 2..12 {title:text<=150,description:text<=600,optionalMedia:media-id}
- appearance:existing section enums

**PHP renderer:** <ol> semantic steps, no inferred dates or delivery guarantees
**Studio adapter:** reorder steps, validate min/max and require real steps
**Content safety:** Do not fabricate outcomes, process guarantees or dates

**Integration gate:** implement and review a first-party component manifest and a matching PHP renderer path; re-run the real JS/PHP parity suite; introduce a documented migration strategy for any persistent data. Until then, use the approved semantic fallback and treat custom grid/typographic CSS as **integration_required**.

## 2. team-directory-v1 — People, roles and consent-controlled portraits

**Suggested future component:** `team-directory` (new first-party manifest required)
**Existing fallback:** `media-story`
**Suggested typed fields (not valid current site-v1 props):**

- heading:text<=180
- people:repeat 1..24 {name:text<=150,role:text<=150,bio:text<=600,portrait:media-id,consent:boolean}

**PHP renderer:** Render person articles with image alt and optional verified biography; no placeholders published
**Studio adapter:** explicit consent checkbox and verified image/role bindings
**Content safety:** No fictitious people, generated real-looking identities or unsupported claims

**Integration gate:** implement and review a first-party component manifest and a matching PHP renderer path; re-run the real JS/PHP parity suite; introduce a documented migration strategy for any persistent data. Until then, use the approved semantic fallback and treat custom grid/typographic CSS as **integration_required**.

## 3. case-studies-v1 — Real projects with meaningful impact evidence

**Suggested future component:** `case-studies` (new first-party manifest required)
**Existing fallback:** `media-story`
**Suggested typed fields (not valid current site-v1 props):**

- heading:text<=180
- cases:repeat 1..18 {title:text<=180,summary:text<=1000,media:media-id,verified:boolean,link:validated-url}

**PHP renderer:** Case cards with links and true image dimensions; conservative no-content empty state
**Studio adapter:** permission status, source review and media picker
**Content safety:** No fabricated customers, numbers or projects

**Integration gate:** implement and review a first-party component manifest and a matching PHP renderer path; re-run the real JS/PHP parity suite; introduce a documented migration strategy for any persistent data. Until then, use the approved semantic fallback and treat custom grid/typographic CSS as **integration_required**.

## 4. pricing-comparison-v1 — Current verified commercial offers

**Suggested future component:** `pricing-comparison` (new first-party manifest required)
**Existing fallback:** `service-grid`
**Suggested typed fields (not valid current site-v1 props):**

- heading:text<=180
- plans:repeat 1..8 {label:text<=120,scope:text<=1000,priceText:text<=100,currency:enum,verified:boolean,ctaUrl:safe-url}

**PHP renderer:** Accessible table/cards, no invented price, structured comparison optional
**Studio adapter:** require owner validation before publishing numeric amounts
**Content safety:** Never generate fictional price, currency, sale, guarantee or discount

**Integration gate:** implement and review a first-party component manifest and a matching PHP renderer path; re-run the real JS/PHP parity suite; introduce a documented migration strategy for any persistent data. Until then, use the approved semantic fallback and treat custom grid/typographic CSS as **integration_required**.

## 5. verified-testimonials-v1 — Consent-backed attributable quotes

**Suggested future component:** `verified-testimonials` (new first-party manifest required)
**Existing fallback:** `feature-highlights`
**Suggested typed fields (not valid current site-v1 props):**

- heading:text<=180
- quotes:repeat 1..16 {quote:text<=1000,attribution:text<=140,role:text<=160,consent:boolean,sourceUrl:validated-url}

**PHP renderer:** Semantic blockquote/figcaption; omit records without explicit consent
**Studio adapter:** consent/source gate and refusal of empty anonymous demo records
**Content safety:** Do not publish synthetic endorsements or unapproved reviewer identities

**Integration gate:** implement and review a first-party component manifest and a matching PHP renderer path; re-run the real JS/PHP parity suite; introduce a documented migration strategy for any persistent data. Until then, use the approved semantic fallback and treat custom grid/typographic CSS as **integration_required**.

## 6. responsive-gallery-v1 — Image group with authentic media sources

**Suggested future component:** `responsive-gallery` (new first-party manifest required)
**Existing fallback:** `photo-gallery`
**Suggested typed fields (not valid current site-v1 props):**

- heading:text<=180
- media:repeat 1..32 {id:existing asset ID,caption:text<=300,alt:text<=200,focusX:integer0..100,focusY:integer0..100}

**PHP renderer:** Picture/srcset variants from verified media; fallback to existing gallery
**Studio adapter:** licensed media picker, alt editor, reorder and keyboard controls
**Content safety:** No external user-supplied SVG, unlicensed photos or unbound remote files

**Integration gate:** implement and review a first-party component manifest and a matching PHP renderer path; re-run the real JS/PHP parity suite; introduce a documented migration strategy for any persistent data. Until then, use the approved semantic fallback and treat custom grid/typographic CSS as **integration_required**.

## 7. proof-register-v1 — Verifiable evidence, documents, partners

**Suggested future component:** `proof-register` (new first-party manifest required)
**Existing fallback:** `feature-highlights`
**Suggested typed fields (not valid current site-v1 props):**

- heading:text<=180
- records:repeat 1..16 {label:text<=180,proofSource:validated-url,verified:boolean,logo:media-id}

**PHP renderer:** Semantic list of confirmed evidence only; omit unverified entries
**Studio adapter:** explicit source/verification and image-rights review
**Content safety:** No fabricated certifications, metrics, logos, awards or partnerships

**Integration gate:** implement and review a first-party component manifest and a matching PHP renderer path; re-run the real JS/PHP parity suite; introduce a documented migration strategy for any persistent data. Until then, use the approved semantic fallback and treat custom grid/typographic CSS as **integration_required**.

## 8. editorial-content-v1 — Owner-authored prose with media and semantically safe blocks

**Suggested future component:** `editorial-content` (new first-party manifest required)
**Existing fallback:** `media-story`
**Suggested typed fields (not valid current site-v1 props):**

- heading:text<=180
- blocks:repeat 1..24 {kind:paragraph|heading|quote|image,content:text<=4000,media:media-id,attribution:text<=180}

**PHP renderer:** Render only first-party typed elements via escaping; no embedded HTML or JavaScript
**Studio adapter:** structured content, reorder and attribution gate
**Content safety:** Never accept raw HTML, script, iframe or untrusted rich-text embeds

**Integration gate:** implement and review a first-party component manifest and a matching PHP renderer path; re-run the real JS/PHP parity suite; introduce a documented migration strategy for any persistent data. Until then, use the approved semantic fallback and treat custom grid/typographic CSS as **integration_required**.

## Cross-cutting constraints

New component data must be versioned, have closed field/path enumerations, enforce stable IDs and registered media, reject raw markup/JS, validate routes, support keyboard controls and reduced-motion, and be revalidated on the server. The standalone D3 showcase is intentionally a visual proposal, not a promise that the existing PHP exporter matches it. Some categories (testimonials, pricing, team, clients) must remain owner-empty until facts and permissions are supplied. Avoid inventing data to make a demo look finished.
