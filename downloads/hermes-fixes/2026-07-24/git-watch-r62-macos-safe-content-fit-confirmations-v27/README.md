# GIT WATCH Revision 62 — macOS-safe content-fit confirmation dialogs

This is the macOS-safe successor to rejected Revision 61 and does **not** rewrite that immutable artifact, Revision 60, rejected Revisions 57/58, published Revision 56, or the frozen Revision 52 Gold package. Revision 61 verified in a Linux environment but its top-level verifier assumed a `python` executable that is absent on this Mac; it failed before installation and made no runtime change.

## Changes

- Preserves confirmation titles at `78px`, messages at `51px`, the accepted `25px` radius, and all strict single-line text rules.
- Resolves Python portably in this order: explicit `HERMES_PYTHON`, `python3`, then legacy `python`; every verifier/test invocation uses that resolved executable.
- Adds a behavioral macOS compatibility test that makes any bare `python` invocation fail while proving the complete package still verifies through `python3`.
- Replaces the oversized fixed `1440px` panel with `width: max-content` plus `max-width: calc(100vw - 64px)` so each confirmation panel shrinks around its actual content.
- Uses a two-column max-content grid: the message defines column 1 and the action-button group begins in column 2 after the message's measured end, separated by the existing `24px` gap.
- Keeps the buttons on the lower action row while eliminating the large empty span between the message and actions shown in Revision 60.
- Preserves modal-scoped horizontal and vertical scrolling when the combined unwrapped content is physically wider or taller than the viewport.
- Preserves confirmation-button geometry and labels: `76px` minimum height, `16px 28px` padding, `18px` radius, `24px` internal gap, and `24px` label size.
- Colors archived **DESELECT ALL** yellow and **UNARCHIVE SELECTED** green while retaining red **DELETE SELECTED** and the existing disabled-state behavior.
- Uses one shared complete-filesystem-surface validator in both verification and installation paths.
- Rejects all symlinks, special entries, unledgered regular files, and unexpected/empty directories before any runtime copy.
- Includes behavioral mutants proving broken symlinks, empty directories, retired selectors, and far-edge button alignment fail closed without changing runtime or watchlist bytes.
- Preserves Revision 56's selection-only archived workflow with no per-row restore/delete controls.
- Uses the already embedded official Google Fonts **Alumni Sans SC ExtraBold 800** face for confirmation titles, messages, and buttons, with no network font request.
- Advances standalone HTML export metadata, visible provenance, CSS parity documentation, and visual baseline to Revision 62.
- Preserves Revision 56 focus trapping, inert background behavior, atomic bulk API semantics, rounded dialogs, and success popups.
- Includes inline source commentary documenting why archived mutations are selection-only.

## Safety

- Runtime identity remains `git-comments-v27-review`.
- The installer changes only the renderer and plugin API in the launch/profile plugin roots.
- Manifests, checker scripts, configuration, and watchlist/history data are not replaced.
- Both runtime copies are backed up before mutation.
- Installation fails closed and restores both copies after an injected or real failure.
- `VERIFY.command` executes disposable install, data-preservation, injected-rollback, and checksum-valid retired-selector rejection tests through `tests/test_installer_r62.sh`.
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
