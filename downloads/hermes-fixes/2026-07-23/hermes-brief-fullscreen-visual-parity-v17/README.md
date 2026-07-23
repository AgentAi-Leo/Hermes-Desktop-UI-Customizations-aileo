# Hermes Brief fullscreen visual parity v17

Corrects the v16 fullscreen presentation regression without removing persistent CUSTOM switching.

- Removes all persistent-shell fullscreen padding.
- Hides the outer Brief intro/filter, archive rail, preview toolbar, and AI export overlay only while fullscreen is active.
- Stretches the Brief preview card and iframe to the full fullscreen viewport, matching the prior content-only presentation.
- Leaves normal non-fullscreen Brief layout unchanged.
- Keeps `1`–`9` route switching inside fullscreen.
- Keeps GIT WATCH on the shared shell without modifying its plugin/template.

The installer is exact-base gated for v14/v15/v16/v17, backs up all eight source paths plus `web_dist`, runs focused/full tests, typecheck, production build, verifies visual-parity markers in source and bundle, restarts the profile LaunchAgent, and emits an exact rollback command.
