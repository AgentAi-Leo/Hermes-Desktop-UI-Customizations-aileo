# BRIEFS-STOCKS V64 — live Stock row cleanup

Fail-closed upgrade for the isolated BRIEFS-STOCKS preview on port `9120`. Requires the exact published V63 source or exact V64 candidate.

## Fixes

- Canonicalizes the real cron producer shape: `<article class="stock-row">`.
- Groups ticker/company, price, and daily movement vertically on the left.
- Gives the five quote metrics the requested right-side span: `1.25fr / 1.75fr`, beginning at roughly 43–45% of the row.
- Enlarges fullscreen metric labels to `1.15rem` and values to `1.9rem`.
- Adds a 1400 px responsive breakpoint so embedded views retain all five columns without clipping Volume.
- Removes the producer `As of …` node structurally.
- Vertically centers the 44 px fullscreen control with the Stock Brief title so the icon cannot sit below it.
- Preserves V63 dynamic Los Angeles time, Yahoo Finance metadata, Enter fullscreen, arrow navigation, portfolio comparison, and exports.

## Safety and verification

- Exact V63/V64 source and page hashes only; otherwise fail closed.
- Creates a rollback backup before writing.
- Runs 45 focused Briefs tests, typecheck, production build, isolated preview restart, and built/live marker checks.
- Does not touch production `9119`, the Hermes Gateway, or BRIEFS-AI.
