# GIT WATCH Revision 56 — cleaner archived rows and rounded confirmation dialogs

This is a successor to published Revision 55 and does **not** rewrite that historical release or the frozen Revision 52 Gold package.

## Changes

- Removes the superseded per-row **UNARCHIVE** and **DELETE** buttons from archived cards.
- Keeps archived restore/delete exclusively in the checkbox-driven **UNARCHIVE SELECTED** and **DELETE SELECTED** bulk workflow.
- Removes the retired per-row handlers and CSS rather than hiding dead controls.
- Gives every fullscreen-safe confirmation panel the same `25px` rounded-rectangle radius as the success popup.
- Uses the already embedded official Google Fonts **Alumni Sans SC ExtraBold 800** face for confirmation titles, messages, and buttons, with no network font request.
- Advances standalone HTML export metadata, visible provenance, CSS parity documentation, and visual baseline to Revision 56.
- Preserves Revision 55 focus trapping, inert background behavior, atomic bulk API semantics, and success popups.
- Includes inline source commentary documenting why archived mutations are selection-only.

## Safety

- Runtime identity remains `git-comments-v27-review`.
- The installer changes only the renderer and plugin API in the launch/profile plugin roots.
- Manifests, checker scripts, configuration, and watchlist/history data are not replaced.
- Both runtime copies are backed up before mutation.
- Installation fails closed and restores both copies after an injected or real failure.
- `VERIFY.command` executes disposable install, data-preservation, injected-rollback, and checksum-valid retired-selector rejection tests through `tests/test_installer_r56.sh`.
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
