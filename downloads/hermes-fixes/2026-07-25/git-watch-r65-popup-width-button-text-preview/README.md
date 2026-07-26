# GIT WATCH R65 popup-width/button-label review mockups

Review-only images derived from immutable GIT WATCH R64 renderer commit `6101afae09a28928e1c44418a717cb979e06a09b`.

No renderer, API, package, installer, or installed runtime is changed by this preview set.

## Proposed visual contract

- Entire confirmation popup panel width: current per-family rendered width multiplied by `1.35`.
- Entire popup panel height: unchanged per family.
- Only button-label typography: `24px × 1.38 = 33.12px`.
- Button height: unchanged at `76px`.
- Button horizontal padding: `30px` per side.
- Button gap: unchanged at `24px`.
- Title/message typography: unchanged.
- Confirmation colors: unchanged.
- Title/message/action content is centered inside the widened panel.
- Action-group right edge remains aligned to the message right edge.
- All title, message, and button-label strings remain on one line with no clipping or overflow in the rendered review fixtures.

See `measurements.json` for exact baseline and proposed dimensions.
