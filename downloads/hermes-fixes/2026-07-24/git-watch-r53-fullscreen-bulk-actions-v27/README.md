# GIT WATCH Revision 53 — fullscreen confirmations and archive bulk actions

This is a successor to the frozen Revision 52 Gold package. It does **not** modify or replace the archived Gold package.

## Changes

- Replaces browser-native Archive/Delete confirmations with an accessible in-dashboard modal that remains inside fullscreen.
- Adds archived-row checkboxes.
- Adds **SELECT ALL**, **DESELECT ALL**, **UNARCHIVE SELECTED**, and **DELETE SELECTED**.
- Adds an atomic `/watchlist/bulk-archived` API for all-or-nothing selected restore/delete.
- Advances standalone HTML export metadata and visible provenance to Revision 53.
- Removes selection, mutation, confirmation, and backend-only controls from offline HTML while preserving archive content and standalone activity/archive-reader behavior.

## Safety

- Runtime identity remains `git-comments-v27-review`.
- The installer changes only the renderer and plugin API in the launch/profile plugin roots.
- Manifests, checker scripts, configuration, and watchlist/history data are not replaced.
- Both runtime copies are backed up before mutation.
- Installation fails closed and restores both copies after an injected or real failure.
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
