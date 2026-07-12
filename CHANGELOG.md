# Changelog

## 2026-07-12-newvers2

- Fixes composer width / left-cutoff layout issue.
- Removes the failed fixed/viewport/sidebar positioning strategy.
- Keeps Hermes app-managed composer positioning.
- Uses responsive composer width/max-width: `min(var(--composer-width), calc(100% - 2rem))`.
- Preserves the existing voice playback controls, Esc-to-stop behavior, and prompt copy customization.
