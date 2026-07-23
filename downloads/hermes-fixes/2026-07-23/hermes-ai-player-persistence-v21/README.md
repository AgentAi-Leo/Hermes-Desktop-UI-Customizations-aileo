# Hermes AI player persistence v21

Keeps the gold AI playback rail visible and consistent while navigating cron/archive dates.

- Injects the complete playback rail and its fixed-height placeholder before canonical AI Brief content is allowed to paint.
- Includes Previous, Play/Pause, Next, volume, 1.25× speed, centered date label, and newer/older date controls immediately on every AI date.
- The existing single controller remains the behavior owner and attaches to the pre-rendered rail at initialization; it does not create a duplicate.
- Preserves the v20 per-Brief fullscreen framing: all seven AI Founder Takeaways and Stock Position Comparison through Available-position total.
- Accepts installed v19 or v20 predecessors.
- Preserves AI volume, speed, focus, date position, fullscreen, Stock data, exports, and GIT WATCH.

The installer exact-gates known predecessors, backs up all touched source plus `web_dist`, runs focused and deterministic serial full tests, typecheck, production build, source/bundle/CSS verification, restarts the profile LaunchAgent, and emits an exact rollback command.
