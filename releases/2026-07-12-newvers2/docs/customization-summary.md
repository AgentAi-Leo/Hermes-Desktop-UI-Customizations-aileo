# Customization Summary

Release `2026-07-12-newvers2` packages the current known-good Aileo Hermes Desktop UI state.

Key update in this release:

- Composer width/left-cutoff fix.
- Keep app-managed composer positioning; avoid fixed/viewport/sidebar positioning overrides.
- Responsive width/max-width: `min(var(--composer-width), calc(100% - 2rem))`.

Also includes the existing customization set:

- responsive composer/playback-pill layout
- voice playback controls
- Esc stops playback
- prompt copy button
- i18n/type support for customized UI states

Source snapshot:

```txt
2026-07-12-newvers2-current-working-ui
```
