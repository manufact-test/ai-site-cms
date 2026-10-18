# AI Site CMS — Stage2 static Jedison bootstrap (INTERNAL ONLY)

This is **NOT the production editor**, NOT an editable CMS and NOT a client-facing admin route. It bundles the **real upstream Jedison 1.27.1** into a browser-only IIFE, and runs native Chromium interaction against a **hardcoded trusted** schema and data. `cms/public/` does not serve it; no public website JS imports it.

## Build/test (Node 22 on developer/CI only)

```bash
cd cms/editor
npm ci
npm run build
npm run test:browser
```

`dist/editor.js` is generated; `dist/meta.json` summarizes source inputs. GitHub Actions uploads a build artifact for internal inspection (NOT a hosted demo, NOT a customer distribution). The runtime JS bundle requires no Node.js server. **Production use requires** authenticated panel route, a server-validated versioned manifest, a secure one-block sandbox preview, tenancy and lifecycle guards, all deferred to later stages. Current `mount` only accepts explicitly supplied closed JSON Schema objects; do not send untrusted schemas/data to this prototype.

- Do not confuse esbuild build-time dependency with PHP shared-host Node hosting requirement.
- The artifact is not signed, deployment-ready or licensed for redistribution until all transitive JS packages and NOTICE are verified.
- Build intentionally contains no public forms, HTML sanitizers, iframe bridge, publishing API, or owner persistence.
- First release only after 135/135 mandatory functionality accepted.

[Foundation ADR](../../docs/ADR/0001-selected-foundation.md) · [Stage2 checkpoint](../../docs/NEXT-CHAT.md).
