# Git Comments V27 UI Refinements — Revision 5

Candidate-only update for `git-comments-v27-review` on preview port 9120.

## Changes

- Displays `WATCHER HEALTHY` followed by a green circle only when the watcher reports `ok=true`, `stale=false`, and status `healthy`.
- Displays `BROKEN` followed by a red circle for failed, missing, unknown, or stale health.
- Retains important GitHub lifecycle history—opened, closed, and reopened.
- Restores GitHub label/tag history such as `sweeper:cannot-reproduce`, rendered as a colored timeline pill.
- Places the complete opened/closed/reopened and label/tag timeline at the end of each issue card, after comments.
- Synthesizes the opening event from the GitHub issue creator/time because GitHub’s timeline endpoint does not return that row.
- Moves `COMMENTS (n)` and `n RECEIVED` onto a second row beneath the issue identity.
- Adds a red, confirmation-protected `DELETE` action that permanently removes an active watch instead of archiving it.
- Restores issue/PR numbers to their original 20px size while retaining canonical GitHub hyperlinks.
- Places `WATCHING` inline to the right of the bold white repository name.
- Increases the repository name exactly 30%, from 16px to 20.8px, and uses 900 font weight.
- Keeps the plain `ARCHIVE` action and omits redundant `View on GitHub →` text.

## Apply

Run:

```text
APPLY_GIT_COMMENTS_V27_UI_REFINEMENTS.command
```

The updater:

- changes only the V27 review candidate;
- backs up candidate code and data before changing anything;
- aligns the preview API with the profile-local watcher data source;
- installs and verifies the candidate-only permanent-delete API in both candidate plugin roots;
- runs a fresh GitHub check;
- verifies the fresh profile-local snapshot and health files directly, avoiding the browser-authenticated API endpoint that rejects unauthenticated `curl` with HTTP 401;
- restarts only preview port 9120;
- verifies manifest discovery, genuinely healthy live status, lifecycle data, and the served bundle;
- does not modify the production `git-comments` plugin or restart production port 9119;
- automatically restores candidate code and data if any verification fails.
