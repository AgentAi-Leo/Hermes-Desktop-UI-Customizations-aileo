# BRIEFS-STOCKS V53 — Header and Toolbar Layout

Stock-only candidate. BRIEFS-AI remains on accepted V52 behavior and export identity.

## Changes

- AI-style yellow date pill in the Stock hero
- `Stock Brief` title without the appended date
- centered previous / DATE / next controls in the selected-date toolbar
- HTML, CSV, and Markdown controls moved into the upper Stock toolbar
- Portfolio comparison section removed
- Stock remains player-free; Stock CSV generation remains available

## Installer gates

- fails closed unless the source is the verified V52 baseline or this exact V53 candidate
- snapshots `briefs.ts`, `BriefsPage.tsx`, and `web_dist`
- runs 40 Stock/AI Brief regression tests from a temporary test file
- runs TypeScript and production build
- verifies V53 Stock and V52 AI markers in the built and live asset
- rolls back on any failure
- restarts preview port 9120 only

Candidate hashes:

- briefs.ts: `64fbc5542e2b7ba1a81ad464ad0866f78be58ad400ebf5b7aa9727d28fb67e5c`
- BriefsPage.tsx: `e47a8a47a14cacf0c100754d4488069d4b96baddef908ee117f5daa094a62d9b`
- briefs.test.ts: `1df08263e37d1ba268d08f7ea5c10970d76ffb5ef519abd777472592ff0d504c`
