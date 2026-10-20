# AI Site CMS — independent Editor & Components Research

**20.10.2026, research only.** Branch `research/editor-component-patterns`; working tree restricted to `research/parallel-components/`. Owner architecture Slim4 + Opis2.6 + Jedison1.27.1 remains unchanged; Stage2 NOT ACCEPTED, Stage3 NOT STARTED, 0/135 mandatory product requirements accepted.

Research deliverables:

- [`COMPONENT-AUDIT.md`](COMPONENT-AUDIT.md) — upstream OSS candidate matrix, license/runtime/size/a11y/security/integration evaluation and recommended shortlist (NOT legal signoff).
- [`EDITOR-CONTRACT-PROPOSAL.md`](EDITOR-CONTRACT-PROPOSAL.md) + [`fixtures/`](fixtures/) — closed typed candidate property groups, positive/negative fixture and explicit unresolved semantic/safe-link concerns. **Not the definitive AI↔site↔CMS contract.**
- [`lab/`](lab/) — independently running PHP form and keyboard-first HTML components, session CSRF/token abuse tests and browser/mobile experiments, with honest delivery configuration states.

[Run the lab](lab/README.md). No third-party code copied, npm/Composer lock changed, CMS/Hostinger or canonical docs touched. Main developer must independently review and merge the PR, then decide if and when an adapter should be implemented after Stage2 acceptance.
