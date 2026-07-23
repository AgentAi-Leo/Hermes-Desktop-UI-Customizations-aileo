# Hermes Brief fullscreen bottom-unclip v18

Direct correction for the v17 fullscreen bottom-edge regression.

- Keeps persistent `1`–`9` switching across BRIEFS-AI, BRIEF-STOCK, and GIT WATCH.
- Removes the normal 32 px route bottom-padding class while the persistent shell is fullscreen.
- Restores the full iframe/plugin viewport height shown by the accepted A/B references.
- Leaves normal non-fullscreen padding unchanged.
- Does not modify generated Brief content or the GIT WATCH plugin/template.

The installer is exact-base gated, backs up all source paths plus `web_dist`, runs focused/full tests, typecheck, production build, verifies the bottom-padding guard in source and bundle, restarts the profile LaunchAgent, and emits an exact rollback command.
