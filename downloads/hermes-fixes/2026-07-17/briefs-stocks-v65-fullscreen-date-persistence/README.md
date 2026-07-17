# BRIEFS-STOCKS V65 — fullscreen date persistence

Fail-closed upgrade for isolated BRIEFS-STOCKS preview `9120`. Requires exact published V64 source or exact V65 candidate.

## Fix

- Fullscreen is owned by the stable parent iframe rather than the replaceable child document.
- Previous/next date navigation updates the document inside that same fullscreen iframe.
- The iframe remains mounted while the adjacent brief loads; a loading overlay appears above it.
- Newly loaded Stock documents receive the current fullscreen state and retain the correct Enter/Exit label.
- Standalone exported Stock HTML retains local fullscreen fallback.
- Preserves all V64 live-row cleanup, metric sizing, responsive behavior, header metadata, portfolio comparison, and keyboard navigation.

## Safety and verification

- Exact V64/V65 source and page hashes only; otherwise fail closed.
- Creates a rollback backup before writing.
- Runs 45 focused Briefs tests, typecheck, production build, isolated preview restart, and built/live marker checks.
- Real-browser proof confirmed `IFRAME#stock` remained `document.fullscreenElement` after its source changed and the new document labeled the control `Exit Stock Brief fullscreen`.
- Does not touch production `9119`, the Hermes Gateway, or BRIEFS-AI.
