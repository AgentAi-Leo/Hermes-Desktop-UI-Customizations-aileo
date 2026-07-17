# BRIEFS-STOCKS V68 — exact viewport date toggling

Fail-closed upgrade for isolated BRIEFS-STOCKS preview `9120`. Requires the exact published V67 source or exact V68 candidate.

## Corrected behavior

- Removes V67 ticker-based anchoring completely.
- Captures the iframe's exact absolute `scrollX` and `scrollY` before date navigation.
- Restores those exact coordinates after the adjacent date loads.
- Uses an eight-animation-frame stabilizer so late layout work cannot pull the viewport back to the top.
- Applies to iframe Left/Right keys, parent shortcuts, cyan DATE controls, and direct date selection.
- Browser-native clamping occurs only if the destination document is shorter than the requested coordinate.
- Preserves same-line ticker/company layout, performance above price, metrics, and fullscreen behavior.

## Browser proof

A sandboxed two-date harness used different stock row orders, matching the user's A/B and C/D comparison concept.

- Header: `scrollY 0 → 0 → 0`.
- Portfolio: `scrollY 500 → 500 → 500`.
- Lower quote rows: four alternating date toggles remained exactly at `scrollY 1500`.
- Cumulative drift: `0px`.
- The implementation contains no ticker lookup, `scrollIntoView`, row centering, or percentage conversion.

## Gates

- Complete suite: 117/117 tests.
- Focused Briefs suite: 45/45 tests.
- Typecheck and production build passed.
- Installer runs focused tests, typecheck, build, isolated restart, rollback, and built/live marker verification.
- Does not touch production `9119`, the Gateway, or BRIEFS-AI.
