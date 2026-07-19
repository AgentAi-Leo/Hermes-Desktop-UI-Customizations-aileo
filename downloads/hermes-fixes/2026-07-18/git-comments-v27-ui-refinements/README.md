# Git Comments V27 UI Refinements

Candidate-only UI update for `git-comments-v27-review` on preview port 9120.

## Changes

- Makes repository names such as `NousResearch/hermes-agent` bold and white.
- Moves `WATCHING` below the repository and increases it exactly 25%, from 12px to 15px.
- Makes every active and archived issue/pull-request number the canonical GitHub source hyperlink.
- Removes `View on GitHub →` source-link text.
- Moves watcher health status indicator to the far left beside the health title.
- Changes the active action from `✓ ARCHIVE` to `ARCHIVE`.
- Applies the number-link format to current and subsequently added watch URLs.
- Removes GitHub label-added/removed timeline rows and their unused label-rendering fields while preserving meaningful close/reopen status events and comments.

## Apply

Run:

```text
APPLY_GIT_COMMENTS_V27_UI_REFINEMENTS.command
```

The updater:

- changes only the V27 review candidate bundle;
- preserves watchlists, comments, watcher results, and watcher health;
- does not modify the production `git-comments` plugin;
- does not restart production port 9119;
- restarts only preview port 9120;
- verifies the live manifest and served bundle before reporting success;
- restores both candidate bundles automatically if a verification fails.
