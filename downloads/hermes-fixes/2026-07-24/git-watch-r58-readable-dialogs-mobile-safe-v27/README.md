# GIT WATCH Revision 58 — readable dialogs with exact mobile geometry

This is the corrective successor to rejected Revision 57 and does **not** rewrite that immutable artifact, published Revision 56, or the frozen Revision 52 Gold package.

## Changes

- Increases confirmation titles from `26px` to `78px` and messages from `17px` to `51px`—a 200% increase—without enlarging the accepted `620px` / `25px` panel geometry.
- Doubles confirmation-button geometry and labels: `76px` minimum height, `16px 28px` padding, `18px` radius, `24px` gap, and `24px` label size.
- Colors archived **DESELECT ALL** yellow and **UNARCHIVE SELECTED** green while retaining red **DELETE SELECTED** and the existing disabled-state behavior.
- Preserves the accepted `calc(100vw - 64px)` confirmation width at every breakpoint; Revision 57's contradictory mobile `calc(100vw - 32px)` override is rejected.
- Adds `max-height: calc(100vh - 64px)`, scrolling, and border-box sizing so enlarged dialog content remains reachable on short viewports.
- Preserves Revision 56's selection-only archived workflow with no per-row restore/delete controls.
- Uses the already embedded official Google Fonts **Alumni Sans SC ExtraBold 800** face for confirmation titles, messages, and buttons, with no network font request.
- Advances standalone HTML export metadata, visible provenance, CSS parity documentation, and visual baseline to Revision 58.
- Preserves Revision 56 focus trapping, inert background behavior, atomic bulk API semantics, rounded dialogs, and success popups.
- Includes inline source commentary documenting why archived mutations are selection-only.

## Safety

- Runtime identity remains `git-comments-v27-review`.
- The installer changes only the renderer and plugin API in the launch/profile plugin roots.
- Manifests, checker scripts, configuration, and watchlist/history data are not replaced.
- Both runtime copies are backed up before mutation.
- Installation fails closed and restores both copies after an injected or real failure.
- `VERIFY.command` executes disposable install, data-preservation, injected-rollback, and checksum-valid retired-selector rejection tests through `tests/test_installer_r58.sh`.
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
