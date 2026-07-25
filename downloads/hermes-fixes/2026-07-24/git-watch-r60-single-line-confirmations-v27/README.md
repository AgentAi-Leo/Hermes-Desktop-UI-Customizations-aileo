# GIT WATCH Revision 60 — expanded single-line confirmation dialogs

This is the single-line successor to Revision 59 and does **not** rewrite that immutable artifact, rejected Revisions 57/58, published Revision 56, or the frozen Revision 52 Gold package.

## Changes

- Keeps confirmation titles at `78px` and messages at `51px`, expands the panel from `620px` to `1440px`, and retains the accepted `25px` radius.
- Enforces `white-space: nowrap` for every confirmation title, message, and button label so confirmation text never breaks onto a second line.
- Sizes the panel from exact embedded-font measurements: the longest bulk-delete warning needs about `1378px` including border/padding, leaving roughly `62px` safety margin at `1440px`.
- Doubles confirmation-button geometry and labels: `76px` minimum height, `16px 28px` padding, `18px` radius, `24px` gap, and `24px` label size.
- Colors archived **DESELECT ALL** yellow and **UNARCHIVE SELECTED** green while retaining red **DELETE SELECTED** and the existing disabled-state behavior.
- Preserves the `calc(100vw - 64px)` viewport inset at every breakpoint; narrower viewports use the existing safe modal scroller without wrapping text.
- Adds `max-height: calc(100vh - 64px)`, scrolling, and border-box sizing so enlarged dialog content remains reachable on short viewports.
- Uses one shared complete-filesystem-surface validator in both verification and installation paths.
- Rejects all symlinks, special entries, unledgered regular files, and unexpected/empty directories before any runtime copy.
- Includes behavioral mutants proving broken symlinks and empty directories fail closed in both entrypoints without changing runtime or watchlist bytes.
- Preserves Revision 56's selection-only archived workflow with no per-row restore/delete controls.
- Uses the already embedded official Google Fonts **Alumni Sans SC ExtraBold 800** face for confirmation titles, messages, and buttons, with no network font request.
- Advances standalone HTML export metadata, visible provenance, CSS parity documentation, and visual baseline to Revision 60.
- Preserves Revision 56 focus trapping, inert background behavior, atomic bulk API semantics, rounded dialogs, and success popups.
- Includes inline source commentary documenting why archived mutations are selection-only.

## Safety

- Runtime identity remains `git-comments-v27-review`.
- The installer changes only the renderer and plugin API in the launch/profile plugin roots.
- Manifests, checker scripts, configuration, and watchlist/history data are not replaced.
- Both runtime copies are backed up before mutation.
- Installation fails closed and restores both copies after an injected or real failure.
- `VERIFY.command` executes disposable install, data-preservation, injected-rollback, and checksum-valid retired-selector rejection tests through `tests/test_installer_r60.sh`.
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
