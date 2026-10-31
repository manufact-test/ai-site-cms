# Owner-edited Schema.org from verified published content

31 October 2026 · Stage3 lead integration, no external AI service or second SEO editor.

## The existing owner path

1. Open a page in Studio → **SEO и меню** → **Schema.org · структурированные данные страницы**.
2. Leave **Не публиковать JSON-LD** (legacy/default) or select `WebPage`, `AboutPage`, `ContactPage`, or `FAQPage` according to the page's *actual* purpose. These choices are not assertions about prices, addresses, reviews, guarantees, or a real client that we have not verified.
3. `FAQPage` is enabled only when the page contains a native, complete `faq-accordion` with 2+ real question/answer items, visible in the mobile visitor page. A custom Design Graph replacing the native FAQ does **not** qualify. Edit the FAQ itself through the existing CMS editor before opting in.
4. Apply the SEO dialog change to the undoable **draft**; independently **Save**, **Preview**, and **Publish** through the existing owner-controlled flow. No background publication is triggered by the selector.

## Publication contract

- `page.seo.schemaType` is an **optional** site-v1 field, with the five-value closed enum `none | WebPage | AboutPage | ContactPage | FAQPage`. Old site documents without the field stay valid and emit no JSON-LD.
- The JavaScript SDK, PHP contract validator and JSON Schema agree on the closed field. The validators also refuse a false `FAQPage` claim if the native visible mobile FAQ is absent or incomplete. A site owner can set the selector back to `none` before removing that source content.
- `PublicRenderer.php` generates exactly one `<script type="application/ld+json">` on a publicly **indexed**, canonically addressed page that has opted in. The script is omitted on `noindex`, script-disabled private preview, no configured public origin, old pages and opt-out pages.
- The JSON-LD includes only validated site/page name, canonical URL, page language and an optional authored SEO description. `FAQPage.mainEntity` derives question/answer text **directly** from native visitor-visible accordion data; nothing is scraped, synthesized or typed as arbitrary code. Generated JSON escapes markup-dangerous characters even inside user-authored FAQ text.
- Normal PHP visitor and separate static HTML export keep the head script. The existing Next SSR/static adapter reads only the publisher's bounded single JSON-LD document from release HTML, checks its closed type and re-escapes data before reproducing it in the React-rendered visitor document. The form wizard's separate approved script path remains unchanged.
- No user-editable raw schema JSON, custom script, arbitrary JSON-LD types, new packages, hosting changes, Search Console access or Google APIs are involved. The private SEO Operator's independent semantic QA can inspect the **actual** public result later.

## Limits and honest external gates

`FAQPage` markup is **not a promise of FAQ rich results**. Google greatly restricts FAQ-rich appearances to authoritative government and health sites; Schema.org itself does not guarantee a ranking/appearance outcome. The site owner must verify every answer and actual page purpose. Preview mode intentionally has no executable or discoverable JSON-LD script. No real client's URL, consent, published snapshot, Google evidence or owner sign-off was present when developing this function.

## Focused checks

- `node stage3/tests/structured-data-smoke.cjs`: SDK/PHP parity, strict type, truthful mobile FAQ, injection escaping, preview/origin/noindex/opt-out. A machine without PHP runs the JS-only guard and clearly reports that PHP is deferred to CI.
- `node stage3/tests/studio-browser.cjs`: existing offline real Chromium journey now exercises type selection, disabled fake FAQ choice, noindex warning and serialized owner draft/Save export.
- `node stage3/runtime-export/tests/next-probe.cjs`: existing real Next build + SSR/Static route proof now checks JSON-LD survives for opted-in route and stays absent on the other route.
- `node stage3/studio/build.cjs --check`, PHP syntax/contract runtime and both workflow jobs on the final commit are required for a valid engineering result.

Authoritative external reference: [Google Search Central — structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) and [FAQ appearance limitation](https://developers.google.com/search/blog/2023/08/howto-faq-changes). The final live client QA remains the owner's decision, not an inferred CI success.
