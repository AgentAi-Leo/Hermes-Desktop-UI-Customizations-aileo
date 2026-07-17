# BRIEFS-STOCKS V69 — daily-price row date pills

Fail-closed upgrade for isolated BRIEFS-STOCKS preview `9120`. Requires the exact published V68 source or exact V69 candidate.

## Change

- Adds a compact yellow archive-date pill to every bottom daily-price row.
- Places the pill in a dedicated middle column between ticker/company/performance/price and the five market metrics.
- Uses the same archive date as the header pill, formatted as `July 16, 2026`.
- Updates every row pill automatically when navigating to another cron date.
- Preserves Day High, Day Low, 52-week High, 52-week Low, and Volume.
- Preserves V68 exact absolute viewport-coordinate persistence.
- Responsive layouts keep the pill and metrics readable at narrower widths.

## Browser proof

- July 16 rows rendered centered yellow `July 16, 2026` pills with all five metrics visible.
- Navigating to the older archive preserved exact `scrollY=1850` and changed every row pill to `July 15, 2026`.
- No ticker/company overlap, metric displacement, or Volume clipping was observed.

## Gates

- Complete suite: 118/118 tests.
- Focused Briefs suite: 46/46 tests.
- Typecheck and production build passed.
- Installer runs focused tests, typecheck, build, isolated restart, rollback, and built/live marker verification.
- Does not touch production `9119`, the Gateway, or BRIEFS-AI.
