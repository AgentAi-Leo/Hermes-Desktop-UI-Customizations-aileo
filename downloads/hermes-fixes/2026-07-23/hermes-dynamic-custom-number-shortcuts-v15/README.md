# Hermes dynamic CUSTOM number shortcuts v15

Adds dynamic single-key numbering for the CUSTOM sidebar.

- `1` opens the first visible CUSTOM tab, `2` the second, through `9` the ninth.
- Current order remains BRIEFS-AI, BRIEF-STOCK, GIT WATCH.
- Future tabs added to `sidebarNav.customItems` automatically receive the next number.
- Number presses inside sandboxed AI/Stock brief previews are forwarded through a validated iframe message.
- Inputs, textareas, selects, contenteditable elements, textboxes, and modified key combinations are ignored.
- No Git Watch bracket behavior is added. Existing Briefs bracket/date navigation remains unchanged.

The installer is exact-base gated for the successfully installed v14 predecessor, backs up all five modified sources plus `web_dist`, runs focused and full tests, typecheck, production build, verifies built contracts, restarts the profile LaunchAgent, and emits a rollback command.
