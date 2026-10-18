# ADR 0003 — One-block preview, AI model independence and adapter boundaries

**18.10.2026 · Accepted direction, implementation future stages.**

## Code and data ownership

- The **AI/model** authors arbitrary permitted site code and explicit versioned edit manifest: stable IDs, used properties, defaults, responsive inheritance, content/style/behavior, capabilities.
- The **CMS core** owns installations, auth, state/overrides, migrations, history, validation, publishing, audit. It never uses a specific model provider.
- **`EditorPort` (interface)** maps typed schema/data to a field UI, with Jedison adapter first and RJSF adapter fallback, so a swap does not rewrite owner values.
- **`SiteAdapterPort`** handles original HTML/PHP/React-static/Next-static output and read-only preview. Only registered and reviewed capabilities are patchable; original arbitrary JS isn't executable as trusted CMS extension code.
- **`PublishPort`** accepts reviewed immutable staging candidates, validates permissions and all targets, applies explicit atomic publication and reversion. Does not expose public partial state.
- **ManifestCoveragePort** compares the rendered original source's actual editable obligations against independently reviewed intent (especially requirement #119). Never assume a model's self-declared manifest is complete merely because it parses.
- **One-block preview** uses an opaque origin/sandbox, strict CSP and authenticated parent↔iframe message protocol with source/origin/token/sequence; edited values never grant arbitrary code execution. Rendering original untrusted JS and forms with parity is NOT currently proven; review type-specific behavior adapters and block unsupported features.

## Package/module boundaries (planned)

```text
cms/
  public/index.php                  only production-exposed entrypoint
  src/HttpKernel.php                initial read-only Slim bootstrap
  src/Contracts/                    typed interfaces and versioning (Stage3+)
  src/Application/                  commands, auth guards, publication (Stage4/11/12)
  src/Infrastructure/               PDO, files, revision storage
  src/Adapters/                      HTML / PHP / React-static / Next-static
  assets/editor/                     prebuilt Jedison controls (Stage5+)
  migrations/                        explicit SQL revisions (Stage4+)
  tests/                             unit/integration/host compatibility
```

Initial repository's `cms/` contains ONLY the simple kernel; future directories in diagram are proposed, not implemented. Never merge historical `research/stage1` prototypes wholesale into production code.

## Responsible release plan

Stage3 confirms complete independent AI manifest (including no-design-brief). Stage4 builds core/site installation. Stage5+ provides fields and preview. Stage11/12 security and durable publishing. Stage13 adapters. Stage14/15 full E2E and all 135 mandatory accepted, Stage16 first FULL release. Stage17 CELIKOM pilot only after release on an isolated test copy, not now.
