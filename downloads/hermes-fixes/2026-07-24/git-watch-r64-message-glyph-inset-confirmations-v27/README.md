# GIT WATCH Revision 64 — message-edge alignment with preserved right inset

This is the immutable successor to published Revision 63 and does **not** rewrite that artifact, the installed Revision 62 predecessor, rejected Revision 61, Revision 60, rejected Revisions 57/58, published Revision 56, or the frozen Revision 52 Gold package.

## Changes

- Uses measured `68px` confirmation titles, `44px` standard messages, and `32px` destructive messages so every exact runtime dialog remains single-line inside screenshot C's rendered width; preserves the accepted `25px` radius.
- Resolves Python portably in this order: explicit `HERMES_PYTHON`, `python3`, then legacy `python`; every verifier/test invocation uses that resolved executable.
- Adds a behavioral macOS compatibility test that makes any bare `python` invocation fail while proving the complete package still verifies through `python3`.
- Retains the content-fit panel cap at `min(869px, calc(100vw - 64px))` while separating the title from an intrinsic-width message/action grid.
- Keeps Cancel and the action button adjacent on row 2 of that inner grid with `justify-self: end`, so the action-group right edge equals—and never passes—the actual message box right edge.
- Preserves `28px` desktop panel padding, leaving visible breathing room between the action button and the dialog border even when the actions align to the message.
- Covers exactly the four approved popup families and retains their existing semantic schemes: Archive cyan, Delete Watched red, Unarchive Selected green, Delete Selected red, and blue Cancel.
- Fresh exact-runtime Chromium geometry at a 1920×1080 CSS viewport with DPR 2: Archive `672.89px`; Delete Watched `771.53px`; Unarchive Selected 1/2 `807.20px`/`830.97px`; Delete Selected 1/2 `844.48px`/`862.77px`; screenshot-C reference `869.70px`. Every variant has action/message right-edge delta `0px`, rendered right inset `29px` (28px padding plus border), adjacent button gap `24px`, and no horizontal overflow.
- Preserves modal-scoped horizontal and vertical scrolling when unwrapped content is physically wider or taller than the viewport.
- Preserves confirmation-button geometry and labels: `76px` minimum height, `16px 28px` padding, `18px` radius, `24px` internal gap, and `24px` label size.
- Colors archived **DESELECT ALL** yellow and **UNARCHIVE SELECTED** green while retaining red **DELETE SELECTED** and the existing disabled-state behavior.
- Uses one shared complete-filesystem-surface validator in both verification and installation paths.
- Rejects all symlinks, special entries, unledgered regular files, and unexpected/empty directories before any runtime copy.
- Includes behavioral mutants proving broken symlinks, empty directories, retired selectors, R62's second action column, R63's direct outer-grid action placement, left-anchored actions, and zero panel inset all fail closed without changing runtime or watchlist bytes.
- Preserves Revision 56's selection-only archived workflow with no per-row restore/delete controls.
- Uses the already embedded official Google Fonts **Alumni Sans SC ExtraBold 800** face for confirmation titles, messages, and buttons, with no network font request.
- Advances standalone HTML export metadata, visible provenance, CSS parity documentation, and visual baseline to Revision 64. Exported files embed the corrected dashboard CSS byte-for-byte; API-dependent mutation/selection buttons remain intentionally omitted from read-only exports.
- Preserves Revision 56 focus trapping, inert background behavior, atomic bulk API semantics, rounded dialogs, and success popups.
- Includes inline source commentary documenting why archived mutations are selection-only.

## Safety

- Runtime identity remains `git-comments-v27-review`.
- The installer changes only the renderer and plugin API in the launch/profile plugin roots.
- Manifests, checker scripts, configuration, and watchlist/history data are not replaced.
- Both runtime copies are backed up before mutation.
- Installation fails closed and restores both copies after an injected or real failure.
- `VERIFY.command` executes disposable install, data-preservation, injected-rollback, and checksum-valid retired-selector rejection tests through `tests/test_installer_r64.sh`.
- Verification and installation run in their own processes and do not require the caller to change into a disposable extraction directory.
- Every successful install creates a backup-specific `RESTORE_THIS_BACKUP.command`.

## Verify

```bash
./VERIFY.command
```

## Install

```bash
./INSTALL.command
```

Restart the supported Hermes dashboard service after installation. The installer prints the exact rollback launcher path.
