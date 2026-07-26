# GIT WATCH R65 — red-guide justified panel review

Review-only images derived from immutable GIT WATCH R64 renderer commit `6101afae09a28928e1c44418a717cb979e06a09b`.

No renderer, API, installer, package, or installed runtime is changed by these mockups.

## Proposed review contract

- Title left edge and message left edge align to the same inner guide.
- Action-group right edge aligns to the corresponding right inner guide.
- Visible border-to-guide inset is exactly `29px` on both sides (`28px` CSS padding plus the `1px` panel border).
- Popup panel width remains exactly `1.15 ×` each R64 family baseline.
- Button horizontal padding remains `39px` per side.
- Button-label font remains `45px`.
- Button height remains `77px`.
- Panel height remains R64 baseline plus `1px`, required by the 77px buttons.
- Button gap remains `24px`.
- Semantic colors, title/message typography, panel border/radius, and all labels remain unchanged.
- Every title, message, and button label remains on one line without clipping or overflow.

See `measurements.json` for exact guide positions and dimensions.
