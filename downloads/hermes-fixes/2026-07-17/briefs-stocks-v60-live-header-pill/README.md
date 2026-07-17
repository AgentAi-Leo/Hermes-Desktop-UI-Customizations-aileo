# BRIEFS-STOCKS V60 — Live-header date pill

Uses the exact July 16 live header shape (`<h1>Stock Brief</h1>` plus `Los Angeles date: YYYY-MM-DD`) to derive the date, and injects one uniquely identified inline-important yellow pill. This replaces the failed assumption that the h1 carries the date.

The installer accepts exact V52, V57, V59, or idempotent V60 states; snapshots source/dist; runs 41 focused tests; typechecks/builds; restarts only preview port 9120; and reports visual acceptance as pending until the user screenshot.

Target hashes:
- briefs.ts: `983ee6af2b1efb4744038e8580e7341dbbed7df1b6fdcf11cf48e74af3d6c3b4`
- BriefsPage.tsx: `e47a8a47a14cacf0c100754d4488069d4b96baddef908ee117f5daa094a62d9b`
