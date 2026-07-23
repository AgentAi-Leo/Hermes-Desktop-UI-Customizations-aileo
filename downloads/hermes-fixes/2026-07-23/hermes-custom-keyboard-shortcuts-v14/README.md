# Hermes CUSTOM keyboard shortcuts v14

Adds keyboard navigation to the locked Three Gold dashboard while preserving the existing BRIEFS and GIT WATCH data/UI contracts.

## Keys

- `1`: BRIEFS-AI
- `2`: BRIEF-STOCK
- `3`: GIT WATCH
- `[` / `]`: newer/older brief date on BRIEFS panels (existing production handler)
- `[` / `]`: previous/next visible live or archived card on GIT WATCH, with wraparound and smooth centered scrolling

Shortcuts are ignored when Command, Control, Option, or Shift is held, and while focus is inside inputs, textareas, selects, contenteditable elements, or textboxes.

The installer is exact-base gated, backs up source plus `web_dist`, runs focused and full tests, typecheck, production build, verifies built contracts, restarts the profile LaunchAgent, and emits a rollback command.
