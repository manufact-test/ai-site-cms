# Lead integrator — loss-aware Design Graph rebuild (25 October 2026)

> **Independent Design Factory only.** This is not an acceptance certificate, deployment instruction, automatic merge or authorization system. Scope: `stage3/design-factory/` on `feature/stage3-design-factory`. D7 is OPEN.

## Why this change matters

The optional Design Graph adapter now supports actual owner photos, 20-image gallery, 24-entry FAQ and explicit AI-free candidate rebuild after CMS edits. A review found a concrete bug: the card-ordinal regex used `/\\d+/` (matching the literal sequence `\d`, not digits), so a reordered FAQ/service card could inherit another record's edited font settings. This is fixed to a real numeric ordinal `/\d+/` and covered by regression tests.

The original rebuild also always regenerated graph text, **silently discarding independently edited wording**. Rebuild now compares the original candidate's node text/href, incoming host graph edit and first-party CMS source; source-approved content remains the default. Independent graph copy is carried forward only when its source is still the same and the semantic value is unchanged. Simultaneous conflicting edits are rejected. Reordered records never inherit the prior ordinal's styling/copy.

## Host integration contract (proposed, opt-in)

### 1. Preview and authorize

Use the existing optional bridge API from `lib/lead-design-graph-adapter.cjs`:

```js
const next = adapter.rebuildHostCandidate(
  storedCandidate,                 // authenticated original host snapshot
  ownerEditedSite,                // complete, typed same-site CMS document
  currentHostSdk,                 // current lead stage3/sdk contract
  registry,                       // registered CMS manifests
);
```

The host **MUST** authenticate the editor, enforce atomic version checks on the underlying site and candidate, preserve revision/undo history, and validate rights/licensing/alt when assets are introduced. This function is purely synchronous. It does **not** persist, publish, sign the candidate, or invoke any AI. A validated candidate is not an approved publication.

### 2. Preserve independent Graph copy, fail closed on conflicts

When the same `nodeId:property` (e.g., `df-selected-composition-dg-card-1-text:text`) has an independently edited Graph value but unchanged typed CMS source, the node's edit is kept. If both the CMS field and the Graph text/href changed incompatibly, rebuild refuses with:

```
LEAD_DESIGN_GRAPH: Conflicting CMS and manually edited Design Graph content: <nodeId>:<property>
```

The host should offer a comparison and let the owner explicitly choose to edit their CMS data or Graph text, then retry from a fresh valid revision. Do not automatically overwrite the user's copy.

### 3. Explicitly approve destructive structural changes by exact node identifiers

A user removing a FAQ/service item might discard Graph-only copy in a deleted node. The default rebuild refuses and exposes IDs:

```
LEAD_DESIGN_GRAPH: Rebuild would discard owner Graph edits; explicit review required: <nodeId>:text
```

After the owner has been shown the affected text and affirmatively authorizes discarding **those exact node properties**, the host can retry with:

```js
const approved = adapter.rebuildHostCandidate(
  storedCandidate,
  ownerEditedSite,
  currentHostSdk,
  registry,
  { acceptedDiscardedNodes: ['df-selected-composition-dg-card-3-text:text'] },
);
```

The array is a precise set comparison: **no missing, extra or duplicate names**. It is not a permission token, cannot authorize another user or bypass a host revision lock, and MUST come from the host's explicit owner confirmation. The returned `rebuild.explicitlyDiscardedGraphEdits` is auditable.

### 4. Review the rebuild report before save

Return metadata:
- `preservedVisualNodes` — matching typed nodes with styles/responsive/states/motion kept
- `createdVisualNodes` — new graph nodes
- `resetVisualNodes` — card identity mismatches (e.g. reordered CMS items) whose old visuals were **not** transplanted
- `retainedGraphCopyNodes` — manually edited graph text/href preserved
- `explicitlyDiscardedGraphEdits` — exact owner-approved text/link losses
- `requiresHostAuthorization: true`, `requiresOwnerVisualReview: true`, `noAiInvoked: true`, `notPublished: true`

Structural layout rearrangements can still reset in a rebuild: the host must show visual comparison, offer undo and request separate approval. The API does not claim arbitrary visual tree merge or automatic bidirectional syncing.

## Checks performed 25 October 2026

The complete optional `tests/lead-design-graph-smoke.cjs` suite was executed in **isolated V8 using the actual read-only GitHub source** of Design Factory and the lead SDK, with local mocked implementations of Node's assert/fs/path so the modules can load. Result: **504/504 lead-SDK typed graph validations, 504/504 JS renders, all distinct**, including the regression suite's round-trip media, provenance and editing assertions. Additional focused mocked-host tests confirm ordinal identity reset, independent copy preservation, conflicting copy refusal and exact-ID destructive approval.

**NOT equivalent to a checked-out Node execution.** GitHub DNS for `git ls-remote` in this container remains blocked; Chromium on a minimal data URL still timed out. No real PHP parity, Chromium Studio E2E, 54 PNG screenshots with visual signoff, ZIP parity/hash or Stage3 formal acceptance. D7 remains OPEN. Formal CMS Stage2 NO-GO, Stage3 unaccepted, 0/135.

## Next steps, lead-owned

1. Run `DF_LEAD_SDK_DIR=/path/to/lead/stage3/sdk node stage3/design-factory/tests/lead-design-graph-smoke.cjs` with a real checkout and optionally `DF_LEAD_PHP_FILE=/path/to/lead/stage3/server/DesignGraph.php`.
2. Run standard Design Factory Node release-audit and Chromium Studio QA, including the 54 PNG visual matrix at 1280/768/390.
3. Verify owner edit/rebuild UI using real site revisions, conflict dialog, loss-preview, media asset rights, keyboard/a11y and explicit publish gate.
4. Produce final reproducible ZIP and its **real SHA256** only after the above; record reviewer signoff.

## 25 October — read-only rebuild preview API

Before applying the explicit rebuild, the host can call:

```js
const preview = adapter.inspectRebuild(candidate, editedSite, currentHostSdk, registry);
```

The return shape is `manufact-design-factory-rebuild-preview-v1` with `canApply`, `requiresOwnerConfirmation`, `noMutation`, optional `error`, structured `discardedGraphEdits` and the hypothetical `rebuild` report. Each discarded edit includes `nodeId`, `property`, `previousValue`, `currentValue`, `nodeStillPresent`, and `requiresExplicitOwnerConfirmation`. A destructive preview remains non-applicable and requires a separate explicit owner decision; the hypothetical report does not constitute consent.

The rebuild report now exposes `preservedVisualNodeIds`, `createdVisualNodeIds`, `resetVisualNodeIds`, `removedVisualNodeIds` in addition to the existing counts. This lets the host render a concrete visual review and undo plan instead of inferring affected cards from counts. Input bounds are 80 provenance bindings and 180 exact discard acknowledgements. Host authentication, revision locking, permissions, owner confirmation, persistence, undo, visual signoff and publication remain lead-owned.

Latest source-level smoke passed 504/504 validations, renders, no-op rebuilds and preflights, plus 8 CMS component-family content-refresh rebuilds in isolated V8. This is not actual checkout/Node/PHP/Chromium acceptance.

## Additional 25 October finding — structural node loss and media conflict protection

The first rebuild preview covered graph-only copy loss but did not fully cover owner-created/deleted nodes or owner styling on a node that disappears during structural changes. That gap is now fixed.

- If an owner deletes a canonical node but CMS structure would recreate it, the preview emits a `__node__` entry and `nodeInEditedGraph:false`, `nodeInRebuiltGraph:true`.
- If an owner adds a custom node that the canonical graph would drop, the preview emits the whole node in `currentValue`, with `nodeInEditedGraph:true`, `nodeInRebuiltGraph:false`.
- If a custom ID collides with a new CMS-generated node, the preview includes both the custom edited node and the canonical `rebuiltValue`; its style/content is never transplanted into the CMS-owned node.
- If a removed/reset node has edited style, responsive, states, motion, type, asset, alt or related editable properties, each changed field is listed for exact review.
- The rebuild error uses `code='DF_REBUILD_OWNER_REVIEW_REQUIRED'` and `discardedGraphEditIds`, not a parsed free-form message.
- Media `assetId` and alt/media properties are three-way reconciled: graph-only edits survive when CMS source is unchanged; divergent simultaneous CMS/graph edits fail closed.

The optional smoke now passes 8 loss-aware structural/style/media regression groups in addition to 504 validations, renders, no-op rebuilds and read-only previews, and 8 component-family source refreshes. This remains isolated V8 source-level evidence, not actual Node/PHP/Chromium/release acceptance.
