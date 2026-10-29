# D5 — one-command verified shipment and offline readiness audit

**No deployment.** D5 joins the existing D1–D4 published-site flow into
one operator command for **all four** independent technologies. The input is
a signed-by-hashes, version-pinned published D2 JSON capsule, not a CMS draft.

## One command → ZIP + offline preflight report

    node stage3/runtime-export/bin/ship.cjs /ABS/published-v3-handoff.json html /ABS/new-delivery.zip
    node stage3/runtime-export/bin/ship.cjs /ABS/published-v3-handoff.json php /ABS/new-delivery.zip
    node stage3/runtime-export/bin/ship.cjs /ABS/published-v3-handoff.json next-ssr /ABS/new-delivery.zip

For **Next Static**, the one-command pipeline performs a real npm install
and Next build in a *disposable local directory*. This accesses npm's registry,
so a deliberate opt-in is required:

    node stage3/runtime-export/bin/ship.cjs /ABS/published-v3-handoff.json next-static /ABS/new-next.zip --allow-npm-install

Other options:
- `--expect-origin=https://example.com` — refuse any other published canonical origin.
- `--report=/ABS/my-new-preflight.json` — custom report location (must not exist).
- `--allow-blocked` — explicit **offline investigation only**, permits a ZIP with other structural blockers; keeps the blocker findings and **never** marks anything production-ready. Don't use it for a customer deployment.

No output or sidecar is overwritten, including existing symbolic links.
Both files are published only after export, ZIP SHA256 verification and
preflight have run. The default separate report is
`/ABS/new-delivery.zip.preflight.json`.

## What gets checked automatically

The ZIP is verified independently (CRC32, immutable publication identity,
exact per-file SHA256, no unsafe ZIP paths). D5 additionally inspects every
published HTML page inside the ZIP and reports:

- SEO title, description, canonical URL, unintended noindex.
- Same-origin internal links, route/301 inventory, published media references.
- HTTPS form actions and their correspondence to the configured collector host.
- Canonical public origin vs optional operator-specified intended origin.
- Required Apache 301 rewrite file and PHP private/public document-root boundary.
- True Next Static output vs a fake/unbuilt scaffold.
- Explicit Next SSR status **BUILD REQUIRED**. A source-only Next SSR ZIP is
  deliverable for further development but is NEVER labelled deploy-ready.
- Mandatory manual checks: TLS, DNS, server route configuration, collector
  delivery/storage, staging validation, owner approval and backups.

The report separates `blocker`, `warning`, and `manual` findings.
The CLI returns failure for blockers other than the explicitly acknowledged
Next SSR *source-only* requirement; `--allow-blocked` is for diagnosis only.
Automated success means **requires-operator-approval**, never green-light to
deploy. Server/network/collector checks are not performed.

## Audit an existing D4 ZIP, without rebuilding

    node stage3/runtime-export/bin/audit-delivery.cjs /ABS/site.zip
    node stage3/runtime-export/bin/audit-delivery.cjs /ABS/site.zip --expect-origin=https://example.com --fail-on-blockers

Exit code `2` means audit blockers with `--fail-on-blockers`. The JSON result
still prints, allowing the owner to inspect required changes. Default exit
code `0` means the inspection itself completed (not production approval).

## Important limits

- D5 never connects to GitHub, CMS hosting, production databases, forms or DNS.
  The only optional network operation is local `npm install` for Next Static.
- Node.js 22 is required locally. The host requirements for each technology
  remain those in D4. Next SSR needs a Node server; PHP deploy/public is its
  document root, and HTML/static redirects need explicit Apache or Nginx rules.
- D4 ZIP still contains no CMS credentials, users, submitted leads or private
  key material. D5's report records no live secrets.
- No changes to `main`, Design Factory or actual visitor routes. Stage 2
  NO-GO and Stage 3 0/135 owner acceptance remain as before.

## CI

The existing delivery-probe exercises HTML, PHP, Next SSR one-command
shipments, operator reports, integrity and blocked/warning cases. The
actual Next.js CI now uses the D5 one-command Next Static path to prove
npm installation, real compilation, exported HTML and the verified ZIP
without building Next Static twice.


### 29 October — static immutable media cache policy

D4 bundles for standalone HTML and built Next Static now include **scoped visitor-media caching** in the generated Apache `.htaccess` (conditional `mod_headers`) and the Nginx host-configuration example: only matching, immutable published `assets/{assetId}.{png|jpg|webp|mp4}` paths receive `Cache-Control: public, max-age=31536000, immutable` and `nosniff`. This mirrors the existing standalone PHP media router without altering form collectors, admin assets, dynamic pages or redirect caching. Host support still needs explicit operator configuration and validation; no live server was modified.

## D7 postраничный performance envelope и сравнение двух выпусков

Пример безопасной локальной подготовки следующего выпуска с сравнением:

```bash
node stage3/runtime-export/bin/ship.cjs /ABS/site-v2-handoff.json php /ABS/site-v2.zip --compare-to=/ABS/site-v1.zip --http-rehearsal
```

`*.preflight.json` содержит `performance.pages[]` с точным размером исходных HTML/общего и inline CSS, медиа-ссылками, количеством eager/lazy изображений, а также **расчётной** gzip-величиной. Пороговые находки (`PERF_HTML_RAW_HIGH`, `PERF_PAGE_MEDIA_HIGH` и др.) — warnings, не blockers, пока оператор явно не включил `--enforce-performance-budget`. Если есть предыдущая версия, `--compare-to=/ABS/old.zip` добавляет `performanceComparison` и разницу по страницам, `--enforce-no-regression` блокирует заметное увеличение веса. Эти опции не дают никаких разрешений на deployment/production.

Без повторной сборки проверить имеющиеся ZIP можно командами:

```bash
node stage3/runtime-export/bin/audit-delivery.cjs /ABS/site-v2.zip --fail-on-performance
node stage3/runtime-export/bin/compare-delivery-performance.cjs /ABS/site-v1.zip /ABS/site-v2.zip --fail-on-regression --report=/ABS/unused-diff.json
```

Strict flags возвращают ненулевой код при предупреждениях/регрессиях, но всегда показывают отчёт. Если нет реальных одобренных источников сайта и host access, это **только offline size telemetry**. Грузящиеся изображения, `srcset`, lazy-поведение и gzip в реальном браузере, Core Web Vitals и доставка формы проверяются отдельно на разрешённом стенде. Legacy D4 ZIP без stylesheet inventory допустим.
