# GIT WATCH V27 UI Refinements — Revision 44

Revision 44 repairs transient GitHub connectivity with four bounded attempts and 1/2/4-second exponential backoff in both the background checker and immediate hydration API. A broken health card now exposes `RETRY CONNECTION`, uses the dedicated `/refresh` endpoint without changing watchlist membership, reports the real failure when recovery is unsuccessful, and displays `CONNECTION RESTORED!` only after explicit checker success. `Last successful check` now prefers the last valid normalized snapshot timestamp instead of a failed-attempt timestamp.

Revision 44 keeps the accepted centered 805×176px success surface and unified 3-second dwell plus 500ms fade, increases success text from 35px to exactly 47px, and uses `rgba(255,255,255,.9)` lettering for green, cyan, and red actions while preserving 80%-opaque action-colored backgrounds, blur, shadow, padding, border, radius, center placement, and timer reset behavior.

Revision 44 also collapses each dense lifecycle/label activity timeline by default. Cards with retained events show `SHOW ACTIVITY (N)` / `HIDE ACTIVITY (N)` with `aria-expanded`, `aria-controls`, and a deterministic per-card region ID. Comments, current status, and all normalized activity remain intact; collapsed history simply stops consuming vertical card space until expanded.

Revision 40 strengthens separation between success feedback and dashboard content while preserving the unified center position and all established dwell/fade timings. Popup text doubles from 24px to 48px; padding expands from 15px/24px to 60px/96px; the viewport-constrained target box is up to 1200px wide with a 280px minimum height. Green, cyan, and red backgrounds use 80% opacity while text remains fully opaque. A medium two-layer soft drop shadow and 8px backdrop blur improve readability over busy cards.

Revision 39 places every successful-action message in one exact viewport-center popup, increases its 16px text and 10px/16px padding by 50% to 24px and 15px/24px, and caps it at 720px or the available viewport so it remains narrower than a watch card. Existing 5000/3000 ms dwell times and the 500 ms fade remain unchanged. Delete feedback is red; archive remains cyan; add and unarchive remain green. Archived `UNARCHIVE` and `DELETE` now share a top-aligned right-side action group with the same 32px height as `VIEW ISSUE` / `VIEW PR`. Duplicate URLs remain rejected at client and API layers across active and archived entries, with executable normalization coverage for case, trailing slash, query, and fragment variants.

Revision 38 places archived `VIEW ISSUE` / `VIEW PR` directly inline after repository, number, and archive timestamp, while keeping the cyan summary below and `UNARCHIVE` / `DELETE` as right-side row actions. Completion notices are now compact content-width toasts centered in the viewport instead of full-width banners: archive appears bottom-center, while add/delete/unarchive appear top-center. Unarchive now uses the exact green text `SUCCESSFULLY UNARCHIVED!`.

Revision 37 moves archived `VIEW ISSUE` / `VIEW PR` controls back into the right-side action group before `UNARCHIVE` and `DELETE`. Payload authors matching the configured watchlist profile owner receive an accessible gold star immediately after their avatar. Archive, both delete paths, and unarchive now publish viewport-fixed cyan success notices with the existing 3000 ms visible duration plus 500 ms fade: `URL SUCCESSFULLY ARCHIVED!`, `SUCCESSFULLY DELETED!`, and `SUCCESSFULLY UNARCHIVED!!`.

Revision 36 adds cyan archive summaries for both issues and pull requests. Legacy identity-only archives hydrate once through the existing read-only archived-view endpoint. The deterministic summarizer prefers a Markdown `Summary` section, otherwise evaluates up to 100 cleaned source words and selects a title-relevant sentence, caps that source sentence at 40 words, then displays at most 11 complete words and 65 characters. Archive buttons now read `VIEW ISSUE` or `VIEW PR` from canonical source type.

Revision 35 updates the actual production `git-comments` manifest label that owns the visible dashboard sidebar while preserving its internal identity and adding rollback. Archived rows now place `VIEW` at the far-left edge and show an issue-only cyan summary below the identity/archive-time line, capped at 65 characters and 11 complete words, at 15.6px (20% larger than the 13px archive timestamp).

Candidate UI/API/checker update for `git-comments-v27-review` on preview port 9120, plus an atomic display-label-only update to the existing production `git-comments` manifests.

The dashboard-facing name is exactly `GIT WATCH`. Internal plugin IDs, routes, API paths, checker filenames, and stored data remain unchanged for compatibility.

## Changes

- Supersedes Revision 33: updates the structural verifier for the new `author → profile picture → repository/WATCHING` layout and executes the complete embedded live-verifier block against every packaged runtime file before release.
- Supersedes Revision 32: removes two stale installer assertions for the pre-fade success implementation and validates all installer renderer markers against the packaged renderer before release.

- Displays `WATCHER HEALTHY` followed by a green circle only when the watcher reports `ok=true`, `stale=false`, and status `healthy`.
- Displays `BROKEN` followed by a red circle for failed, missing, unknown, or stale health.
- Retains important GitHub lifecycle history—opened, closed, and reopened.
- Retains GitHub label/tag history such as `sweeper:cannot-reproduce`, rendered as colored timeline pills when activity is expanded.
- Places an accessible collapsed-by-default `SHOW ACTIVITY (N)` disclosure after comments; expanding it reveals the complete opened/closed/reopened and label/tag timeline without deleting data.
- Synthesizes the opening event from the GitHub issue creator/time because GitHub’s timeline endpoint does not return that row.
- Places the `COMMENTS (n)` pill on a second row beneath the issue identity.
- Hydrates every newly added issue or pull request with its GitHub title, description, current open/closed state, author, created and updated timestamps, and current labels.
- Links the displayed issue title to the canonical GitHub issue or pull request and keeps comments plus lifecycle/tag history below the issue context.
- Removes the duplicated current-label row above comments; keeps only the current `OPEN`/`CLOSED` pill there while label/tag events remain at the bottom of the card.
- Moves the linked `COMMENTS (n)` pill onto the repository line immediately after `WATCHING`, removing its former separate row.
- Colors `WATCHING` green for open items and purple for closed items to match the corresponding state pill.
- Moves the linked `COMMENTS (n)` pill again to the arrow-indicated position at the end of the `OPEN/CLOSED`, author, created, and updated metadata row.
- Makes both the state pill and comments pill green with white text for open items, or purple with white text for closed items.
- Places the linked `COMMENTS (n)` pill immediately to the left of the matching `OPEN` or `CLOSED` pill.
- Makes comments and state pills the same fixed 160×44px size with centered 15px text.
- Distinguishes comments with fully opaque fills: solid green when open and solid purple when closed, while state pills retain their darker fills.
- Increases the author, created, and updated metadata text exactly 15%, from 13px to 14.95px.
- Stacks the comments pill directly below the equal-sized `OPEN` or `CLOSED` pill.
- Uses an opaque yellow comments pill when the count is zero and an opaque green comments pill only when one or more comments are present.
- Aligns `Opened by`, `Created`, and `Updated` on the same horizontal centerline as the top `OPEN` or `CLOSED` pill while keeping comments directly underneath.
- Keeps a positive-count comments pill green while the item is open, then changes it to purple when the item closes; zero comments remain yellow.
- Adds `UNARCHIVE` and confirmation-protected permanent `DELETE` buttons to every archived item.
- Extends the delete API to remove matching entries from either the active or archived collection atomically.
- Wraps every card's bubble icon and identity in one fixed-layout group so the icon remains consistently beside the issue number on all cards and viewport widths.
- Inserts newly added URLs at the top of the active watchlist instead of appending them to the bottom.
- Closes the add form and displays the accessible success message `URL ADDED SUCCESSFULLY!` after a URL is added.
- Replaces the vertical pill stack with one horizontal row: `COMMENTS (n)`, then `STATUS: OPEN/CLOSED`, then author and timestamps to its right.
- Adds `EXPORT HTML` to the watcher toolbar. It downloads a dated, standalone snapshot with the current dashboard markup, complete CSS, and JavaScript inline in one `.html` file.
- Removes Add, Archive, Delete, Unarchive, transient success, and error controls from the shared snapshot so no API-dependent controls appear broken outside Hermes.
- Derives an effective `open`, `closed`, or `merged` status. Both metadata pills and `WATCHING` use green for open, red for closed, and purple for merged.
- Detects merged pull requests from GitHub's live `pull_request.merged_at` field and persists `merged_at` plus a boolean `merged` flag in watcher data.
- Gives status and comments pills a 200px minimum width with auto expansion and `white-space: nowrap`, keeping labels on one untruncated line.
- Moves the HTML export control into the health card's top-right header position. Its 54px height, 24px horizontal padding, 18px type, and `.08em` tracking match the canonical AI/Stock Briefs export controls.
- Keeps comments pills fully opaque while returning status pills to 25%-alpha state-colored fills with solid borders and readable text.
- Groups `STATUS` with `Opened by`, `Created`, and `Updated` as one nonbreaking inline cluster immediately to the right of `COMMENTS`.
- Forces the complete `COMMENTS → STATUS → Opened by → Created → Updated` sequence onto one horizontal row; constrained cards scroll that row instead of splitting the status block underneath comments.
- Changes the top-right export control to match the pictured Briefs control: download icon, `HTML` label, square cream outline, dark fill, and the canonical Briefs dimensions.
- Adds the issue author immediately after the linked issue number and before the repository name using the live GitHub payload: `#58130 by author owner/repository WATCHING`.
- Changes the watched heading exactly to `*** WATCHED GITHUB ISSUES & PULL REQUESTS ***`.
- Moves `repository + WATCHING` to a dedicated second line below `#number + by author`.
- Increases issue-title text by exactly 20%, from 20px to 24px.
- Adds a small archived-row `VIEW` button that opens a focused, read-only in-dashboard modal with issue title, body, author, status, timestamps, labels, and comments.
- Adds explicit `CLOSE`, backdrop close, and capture-phase Escape close. Modal Escape stops propagation before the existing Add URL Escape/Enter shortcuts and restores focus to the originating `VIEW` button.
- Retains sanitized issue snapshots for newly archived items; already-archived items use a read-only live GitHub fallback.
- Renames the dashboard tab and all renderer-facing loading, failure, and standalone-export copy to `GIT WATCH`; exported files use `git-watch-YYYY-MM-DD.html`.
- Adds each issue author's 40px circular GitHub profile picture immediately after `by <author>` when `avatar_url` is available.
- Keeps `URL ADDED SUCCESSFULLY!` visible for three seconds, then fades it over 500ms, matching all other successful actions.
- Shows `URL SUCCESSFULLY ARCHIVED!` after a successful Archive action for three seconds, then fades it over 500ms.
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
- Adds dashboard-level `Enter` launch: while the form is closed and the dashboard background is active, Enter opens and autofocuses the URL input.
- Guards the launch shortcut from links, buttons, inputs, textareas, selects, editable content, modifier-key combinations, loading, and busy actions.
- Moves `+ ADD URL TO WATCH` from the Watcher Health card to the right side of the `/// WATCHED GITHUB ISSUES & PULL REQUESTS ///` card header.
- Opens the URL input, green Add URL action, red Cancel action, and validation feedback inside the watched-items card.
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
- installs the retry-capable checker into both candidate roots, runs a fresh GitHub check, and exposes manual broken-state recovery;
- verifies the fresh profile-local snapshot and health files directly, avoiding the browser-authenticated API endpoint that rejects unauthenticated `curl` with HTTP 401;
- restarts only preview port 9120;
- verifies manifest discovery, genuinely healthy live status, lifecycle data, and the served bundle;
- does not modify the production `git-comments` plugin or restart production port 9119;
- automatically restores candidate code and data if any verification fails.
