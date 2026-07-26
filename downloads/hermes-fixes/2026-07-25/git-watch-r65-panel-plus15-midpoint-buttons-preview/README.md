# GIT WATCH R65 — 15% wider panels with midpoint button widths

Review-only images derived from immutable GIT WATCH R64 renderer commit `6101afae09a28928e1c44418a717cb979e06a09b`.

No renderer, API, installer, package, or installed runtime is changed by these mockups.

## Proposed review contract

- Popup panel width: exactly `1.15 ×` each R64 family baseline, adding five percentage points beyond the previous 1.10× review.
- Existing content track: centered with equal left/right space.
- Button horizontal padding: `39px` per side, the exact midpoint between the user's 28px too-small and 50px too-large examples.
- Button-label font: `45px`.
- Button height: `77px`.
- Panel height: R64 baseline plus `1px`, the minimum required by the 77px button without vertical overflow.
- Button gap: `24px`.
- Title/message typography, semantic colors, panel border/radius, and message/action right-edge alignment: unchanged.
- Existing 869px desktop cap is lifted in the review geometry so the requested widened variants are not silently truncated.
- Every title, message, and button label remains on one line without clipping or overflow.

See `measurements.json` for exact dimensions and symmetric side-space measurements.
