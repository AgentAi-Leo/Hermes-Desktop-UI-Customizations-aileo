# GIT WATCH R65 — 45px button-label review mockups

Review-only images derived from immutable GIT WATCH R64 renderer commit `6101afae09a28928e1c44418a717cb979e06a09b`.

The earlier 35%-wider-popup concept is rejected and is not part of this proposal. No renderer, API, installer, package, or installed runtime is changed by these mockups.

## Proposed visible contract

- Popup panel width: identical to R64 for every confirmation family.
- Popup panel height: identical to R64 for every confirmation family.
- Title and message typography: identical to R64.
- Button-label font size: exactly `45px` instead of `24px`.
- Button height: unchanged at `76px`.
- Horizontal button padding: unchanged at `28px` per side.
- Internal vertical centering: `line-height:1` with no added vertical padding so the 45px glyphs fit cleanly inside the unchanged 76px button.
- Button gap: unchanged at `24px`.
- Confirmation and Cancel colors: unchanged.
- Message/action right-edge alignment: unchanged.
- Every title, message, and button label remains on one line without clipping or panel overflow in the rendered fixtures.

See `measurements.json` for exact baseline-versus-preview dimensions.
