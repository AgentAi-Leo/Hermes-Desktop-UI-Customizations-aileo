# Hermes AI per-date focus + GIT WATCH scroll v26

This release preserves the accepted v25 single-rail/fullscreen geometry while correcting two interaction defects:

1. BRIEFS-AI now stores the focused topic/card separately for each archive date. First visits open at the clean document top; returning to a previously visited date restores that date's own topic/card. Loaded-iframe date identity guards against stale outgoing messages.
2. GIT WATCH persistent fullscreen now owns a vertically scrollable shell. The zero-scroll lock remains restricted to BRIEFS-AI and BRIEF-STOCK so their accepted fullscreen framing is unchanged.

The installed dedicated Brave launcher remains separately verified: it launches the Brave binary directly on CDP port 9222, recreates only `runtime/brave-dash-custom`, creates a fresh `/brief-stock?profile=local-ai-assist1` page, closes older page targets, and fails unless exactly one canonical page remains.

## Required proof

- RED/GREEN focused tests for per-date AI restoration and GIT WATCH fullscreen scrolling;
- full 203-test suite, typecheck, and production build;
- sealed package verification;
- cleanroom upgrade and exact rollback;
- native source/build/served-asset verification;
- live AI date A → date B → date A focused-card restoration;
- live GIT WATCH fullscreen scroll down and back up;
- same-launcher cold start with exactly one fresh BRIEF-STOCK tab in the disposable dedicated profile.
