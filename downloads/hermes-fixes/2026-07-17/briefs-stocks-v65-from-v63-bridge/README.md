# BRIEFS-STOCKS V65 — exact V63 bridge

Fail-closed bridge for the Mac preview found on 2026-07-17 with exact V63 hashes:

- `briefs.ts`: `a8aea8372c07c30e0348a17adb38f5a8f7d790ce46cd7c56d484f3d992b48d1b`
- `BriefsPage.tsx`: `7511cd220c035362341ee4c4c11df4594c3bc7447bc27fc46e7716a789faca81`

Installs the exact published V65 payload, while also accepting exact V64 or V65 for safe idempotent reruns.

It creates a rollback backup, runs 45 focused tests, typecheck, production build, restarts only isolated port `9120`, and verifies the built and live V65 JavaScript markers before opening a cache-busted URL. It does not touch production `9119`, the Gateway, or BRIEFS-AI.
