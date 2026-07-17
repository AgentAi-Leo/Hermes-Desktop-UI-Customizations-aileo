# BRIEFS-STOCKS V66 — company column and performance order

Fail-closed upgrade for isolated BRIEFS-STOCKS preview `9120`. Requires exact published V65 source or exact V66 candidate.

## Layout changes

- Keeps ticker symbols alone in the left column.
- Moves company names into a dedicated middle column matching the annotated empty region.
- Uppercases company names and shortens long legal suffixes: `Company` → `CO.`, `Corporation` → `CORP.`, and `Incorporated` → `INC.`.
- Flips quote detail order to ticker → performance → stock price.
- Keeps all five metrics in the right region with full V64 sizing at fullscreen widths.
- Adds responsive three-column sizing so Volume remains unclipped in the embedded view.
- Preserves V65 fullscreen persistence across previous/next date navigation.

## Verification

- Exact live `stock-row` producer structure rendered and inspected.
- Company begins at 23% and metrics at 44.6% in the 1280px proof viewport, matching the annotated proportions.
- Every rendered row reported uppercase company, company grid column 2, metrics grid column 3, performance above price, and no right-edge overflow.
- Runs 45 focused Briefs tests, typecheck, production build, isolated restart, and built/live marker checks.
- Does not touch production `9119`, the Gateway, or BRIEFS-AI.
