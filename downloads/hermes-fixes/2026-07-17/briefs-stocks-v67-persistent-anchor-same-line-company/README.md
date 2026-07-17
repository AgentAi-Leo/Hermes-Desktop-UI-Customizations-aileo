# BRIEFS-STOCKS V67 — persistent row anchor and same-line company

Fail-closed upgrade for isolated BRIEFS-STOCKS preview `9120`. Requires the exact published V66 source or exact V67 candidate.

## Changes

- Keeps the viewed stock row at the same viewport position across newer/older date navigation.
- Captures the nearest visible ticker plus its exact viewport offset; raw scroll position is retained as fallback.
- Applies persistence to iframe arrow keys, parent shortcuts, DATE controls, and direct date selection.
- Keeps ticker and uppercase company name together on one baseline in the left identity block.
- Preserves performance above stock price and all five right-side metrics.
- Preserves fullscreen state across date navigation.

## Verification performed before packaging

- Real two-date sandboxed iframe test used dates with a deliberate 130px content-height difference.
- `MSFT` remained at exactly `270.375px` before and after navigation while scrollY correctly changed from `617` to `747`.
- Complete suite: 117/117 tests.
- Focused Briefs suite: 45/45 tests.
- Typecheck and production build passed.
- Exact producer-shape visual inspection showed same-line ticker/company and no metric overlap or clipping.
- Installer runs focused tests, typecheck, build, isolated restart, and built/live marker checks.
- Does not touch production `9119`, the Gateway, or BRIEFS-AI.
