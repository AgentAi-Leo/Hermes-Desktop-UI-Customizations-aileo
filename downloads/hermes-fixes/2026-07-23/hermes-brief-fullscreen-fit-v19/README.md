# Hermes Brief fullscreen A/B fit v19

Durable correction for Briefs that still appeared oversized and clipped after entering fullscreen.

- In fullscreen only, gives BRIEFS-AI and BRIEF-STOCK a 125% layout canvas rendered at 80%.
- Matches the clean A/B reference scale while filling the fullscreen viewport edge-to-edge.
- Keeps the AI Brief’s own 1.25× control unchanged.
- Preserves normal non-fullscreen presentation and spacing.
- Keeps persistent `1`–`9` switching across BRIEFS-AI, BRIEF-STOCK, and GIT WATCH.
- Does not modify generated Brief content, stock calculations, exports, or the GIT WATCH plugin/template.

The installer is exact-base gated for the current v18 deployment, backs up all touched source plus `web_dist`, runs focused and full tests, typecheck, and a production build, verifies the 125dvh/125%/0.8 source and generated-CSS contracts, restarts the profile LaunchAgent, and emits an exact rollback command.
