# GIT WATCH R65 — symmetric wider panels and 77px buttons

Review-only images derived from immutable GIT WATCH R64 renderer commit `6101afae09a28928e1c44418a717cb979e06a09b` and the current 45px-label/50px-horizontal-padding review contract.

No renderer, API, installer, package, or installed runtime is changed by these mockups.

## Proposed review contract

- Popup panel width: exactly `1.10 ×` each R64 family baseline, interpreting the user's hand-drawn red guide as a moderate approximate widening.
- Existing title/message/action content track: centered inside the wider panel so added horizontal space is equal left and right.
- Existing R64 `869px` desktop cap: lifted for this review because the Unarchive and Delete Selected 1.10× widths exceed it while remaining well within the desktop viewport.
- Button height: `77px`.
- Popup panel height: baseline plus exactly `1px`, the minimum required to accommodate the 77px button without vertical overflow.
- Button-label font: `45px`.
- Button horizontal padding: `50px` per side.
- Button gap: `24px`.
- Title/message typography, semantic colors, panel border/radius, and message/action right-edge alignment: unchanged.
- Every title, message, and button label remains on one line without clipping or overflow.

See `measurements.json` for exact dimensions and left/right spacing.
