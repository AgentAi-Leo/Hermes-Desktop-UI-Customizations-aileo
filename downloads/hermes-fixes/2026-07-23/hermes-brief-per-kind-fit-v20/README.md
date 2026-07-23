# Hermes Brief per-kind fullscreen fit v20

Final per-Brief fullscreen framing requested from the annotated AI and Stock screenshots.

- BRIEFS-AI uses a 138.889% layout canvas rendered at 72%, showing all seven Founder Takeaways and their text while keeping later topic cards below the initial fold.
- BRIEF-STOCK uses a 113.636% layout canvas rendered at 88%, showing the complete Portfolio Position Comparison through Available-position total while keeping the lower individual-stock detail section below the initial fold.
- Resets the persistent fullscreen shell to the top after fullscreen layout so normal-mode scroll cannot clip the fullscreen Brief.
- Keeps the AI Brief’s own 1.25× control unchanged.
- Preserves normal non-fullscreen presentation and persistent `1`–`9` switching.
- Does not modify generated Brief content, stock calculations, exports, or GIT WATCH.

The installer exact-gates the current v19 deployment, backs up all touched source plus `web_dist`, runs focused and full tests, typecheck, production build, source/bundle/generated-CSS verification, restarts the profile LaunchAgent, and emits an exact rollback command.
