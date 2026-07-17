# BRIEFS-STOCKS V63 — row readability and Enter fullscreen

Fail-closed upgrade for the isolated BRIEFS-STOCKS preview on port `9120`.

## Changes

- `Enter` toggles Stock fullscreen when the preview body has focus; text controls and interactive links/buttons retain native Enter behavior.
- Native `Escape` exits fullscreen.
- Daily movement is grouped beneath each ticker and price.
- Rendered `As of YYYY-MM-DD …` quote timestamps are removed.
- Day High, Day Low, 52-week High, 52-week Low, and Volume expand across the freed row width with larger typography.
- Fullscreen control is reduced from 54 px to 44 px, with a 26 px icon and title-bottom alignment.
- Stock header displays the selected brief's `generated_at` time as `h:mmam/pm - America/Los_Angeles`.
- Stock source metadata reads exactly `Yahoo Finance snapshot generated at end-of-day after U.S. close · $USD`.
- Stock export manifest advances to `v63-row-readability-enter-fullscreen`.

## Safety and verification

The installer accepts only the exact V62 source/page pair or the exact V63 candidate. It embeds checksummed replacement files, backs up source and built assets, runs the 45-test focused Briefs suite, typechecks, builds, restarts isolated preview `9120`, and verifies version-specific markers in the built and live JavaScript assets. Production `9119` and the Gateway are untouched.
