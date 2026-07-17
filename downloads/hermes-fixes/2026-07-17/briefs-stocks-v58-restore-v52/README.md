# Emergency restore: BRIEFS-STOCKS V52

Restores exact accepted V52 source hashes and rebuilds/restarts only isolated preview port 9120. Accepts either rejected candidate or V52 state, snapshots current source/dist first, runs the original 40 V52 regressions, verifies the populated portfolio-comparison markers in the built and live bundles, and rejects the candidate identity.

- briefs.ts: `dbfc3c00f59e8ea695876f3ee098792358135b8082cbbcba4545c8c678c5238b`
- BriefsPage.tsx: `a653042585914cd474d18a60af2f1a9af1a2940d288e1377c17d5a78cfe9aabf`
