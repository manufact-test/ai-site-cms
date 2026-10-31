# Published links: full source coverage, 301 fragments and owner repairs

31 October 2026 · Stage3 lead, one existing owner CMS.

## What changed

The visitor publisher's final release barrier now checks the **actual output** of every section:

- In a native manifest section: its declared element and repeating-item `behavior.href` values.
- In a section replaced with a typed individual Design Graph: `button.href`, `link.href`, clickable `image.href`, and every authored rich-text `runs[i].href` in nested nodes. The old legacy elements remain stored for rollback but are **not** public content, so they must not block a new release.
- Internal path destinations can be live pages or existing 301 aliases. A fragment such as `/contact/#section-contact` must match a real section ID on the destination page. For an alias such as `/old-contact/#section-contact`, the fragment is checked against the **final redirect target**; a redirect is not evidence that an old anchor still exists.
- External HTTPS, `mailto:` and `tel:` follow the existing strict typed-link contract and are not treated as local routes. Invalid URI syntax is rejected by JS/PHP contract validators before publication.

The same source semantics are present in the owner SDK `inspectSite` results. An old redirected link remains an `old-link` recommendation even if its anchor works; a missing final-page anchor is a `broken-anchor` error. A draft can still be saved with a broken link, but **Publish refuses it** with an actionable page/section/node reference and preserves the prior published release.

## Using the original Studio

1. Open **Проверка перед публикацией → Ссылки и медиа всего сайта**.
2. Choose **Требуют внимания** or **Все внутренние ссылки**, select a specific page if needed.
3. Every internal link row exposes an exact destination page and a second selector for a **real section anchor** on that page. No arbitrary selector or CSS/JS can be entered; the CMS lists sections of the actual draft. An existing valid anchor is preselected, including after 301 relocation. If the target no longer has the old anchor, the safe choice is *Без якоря* or another confirmed existing section.
4. Any existing URL query parameters are kept when choosing a new page/anchor. To rewrite query semantics intentionally, edit the original author-controlled field rather than relying on this route repair.
5. Mark only intended rows and select **Предпросмотр изменений**. The preview shows each `from → to` replacement and rechecks the full Site v1 with the original SDK. Newly introduced broken routes/anchors refuse the batch. Click **Применить выбранное** for one Undoable draft change; **Save** and **Publish** remain independent explicit actions.

The current editor does **not** invent page content, infer that a fragment will visually align to an approved screenshot, fetch an external site, bypass redirect policy, or alter published pages merely by opening the report. `#section-id` refers to a typed section ID, not arbitrary DOM IDs from custom HTML.

## Technical checks and scope

- `node stage3/tests/contract-smoke.cjs` covers multi-hop route migration and valid/invalid final-page 301 anchors in JS source QA.
- `php stage3/tests/graph-interactions-smoke.php` exercises the PHP publication barrier for the actual Graph `link`, clickable image, inline rich run, 301 anchor and hidden legacy section source, as well as legitimate root/fragment cases.
- `node stage3/tests/studio-browser.cjs` covers a **real** Chromium owner repair from a page link to a section anchor with draft/preview/Undo. The browser suite also covers the original link/Graph media repair pathways.
- `node stage3/studio/build.cjs --check` checks that the committed browser bundle matches the first-party Studio/controller/SDK source.
- Isolated GitHub Actions `contract` and `technology-runtime` jobs remain the full checks for a published commit. Tests use synthetic fixtures. No client origin, published approval, real browser acceptance, form notification recipient or production gate can be inferred from them.

No changes to the independent SEO Engine, Design Factory, main, host or external APIs. This closes a real consistency gap in release validation and manual links editing; the MUST ledger remains **124 engineering candidates + 5 partial + 6 external gates**, owner accepted **0/135**.
