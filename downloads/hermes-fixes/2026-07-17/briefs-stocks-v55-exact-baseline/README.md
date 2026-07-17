# BRIEFS-STOCKS V55 — Exact V52 Baseline

Fail-closed installer based on the exact preview hashes reported by the user and independently recovered from the archived V52 source.

Accepted baseline:

- briefs.ts: `dbfc3c00f59e8ea695876f3ee098792358135b8082cbbcba4545c8c678c5238b`
- BriefsPage.tsx: `a653042585914cd474d18a60af2f1a9af1a2940d288e1377c17d5a78cfe9aabf`

It modifies only `~/.hermes/zDownloads/_BRIEFS-DASHBOARD-V3-PREVIEW`, leaves host Hermes source untouched, and restarts preview port 9120 only.
