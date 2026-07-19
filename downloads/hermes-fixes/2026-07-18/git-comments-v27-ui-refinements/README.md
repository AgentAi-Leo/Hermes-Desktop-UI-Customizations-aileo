# Git Comments V27 UI Refinements — Revision 9

Candidate-only update for `git-comments-v27-review` on preview port 9120.

## Changes

- Displays `WATCHER HEALTHY` followed by a green circle only when the watcher reports `ok=true`, `stale=false`, and status `healthy`.
- Displays `BROKEN` followed by a red circle for failed, missing, unknown, or stale health.
- Retains important GitHub lifecycle history—opened, closed, and reopened.
- Restores GitHub label/tag history such as `sweeper:cannot-reproduce`, rendered as a colored timeline pill.
- Places the complete opened/closed/reopened and label/tag timeline at the end of each issue card, after comments.
- Synthesizes the opening event from the GitHub issue creator/time because GitHub’s timeline endpoint does not return that row.
- Places the `COMMENTS RECEIVED (n)` pill on a second row beneath the issue identity.
- Adds a red, confirmation-protected `DELETE` action that permanently removes an active watch instead of archiving it.
- Retains canonical GitHub hyperlinks on every issue and pull-request number.
- Places `WATCHING` inline to the right of the bold white repository name.
- Increases the repository name exactly 30%, from 16px to 20.8px, and uses 900 font weight.
- Increases issue numbers 25%, from 20px to 25px.
- Increases `WATCHING` 25%, from 15px to 18.75px, and makes it bold green.
- Keeps the watched heading at 26.4px, removes the briefcase, applies Hermes Agent color `#FFE6CB`, and frames it as `/// WATCHED GITHUB ISSUES & PULL REQUESTS ///`.
- Applies Hermes Agent color `#FFE6CB` to the `+ ADD URL TO WATCH` button text and border.
- Makes the opened form's `ADD URL` action green and `CANCEL` action red.
- Adds `Escape` to clear and close the add form without clicking Cancel.
- Adds explicit `Enter` submission from the URL input through the same validation and duplicate-protection path as the green Add URL button.
- Increases the comment pill 25%, from 12px to 15px with proportional padding, and simplifies it to `COMMENTS (n)`.
- Uses normal weight for the watch summary while retaining green `COMMENTED (n)` and cyan `ARCHIVED (n)`.
- Increases `WATCHER HEALTHY` 25%, from 18px to 22.5px.
- Makes active `ARCHIVE` buttons cyan.
- Makes the bottom `ARCHIVED (n)` section title cyan.
- Rejects duplicate canonical GitHub URLs across active and archived watches, including case and trailing-slash variants, both before submission and at the API.
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
