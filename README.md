# Hermes Desktop UI Customizations — Aileo

Patch-based UI customizations for Hermes Desktop.

This package adds a wider responsive composer/playback pill, improved voice playback controls, Esc-to-stop playback, and a submitted-prompt copy button.

Current release:

```txt
releases/2026-07-12-newvers/
```

## Preview

![Hermes Desktop UI customizations preview](https://raw.githubusercontent.com/AgentAi-Leo/hermes-screenshots/main/playback-pill-screenshot.png)

---

---

## Current release note

This release includes the final composer width/left-cutoff fix: app-managed composer positioning with responsive width/max-width, avoiding fixed viewport/sidebar positioning overrides.

---

## Features

- **Responsive composer and playback pill layout**
  - target composer width: `65rem`
  - responsive behavior when right-side panes are open
  - composer/pill sits low in the chat pane
  - extra bottom scroll room so final chat content is not hidden

- **Voice playback controls**
  - volume support
  - speed support
  - pause/resume support
  - red X / stop control

- **Esc stops voice playback**
  - pressing `Escape` while audio is playing stops playback

- **Prompt copy button**
  - adds/preserves copy behavior for submitted user prompts

- **Supporting labels/types**
  - English i18n labels and type definitions for the customized UI states

---

## Install

> Run these commands from a Hermes Desktop `apps/desktop` directory.

Example:

```bash
cd /path/to/hermes-agent/apps/desktop
```

Clone this customization repo somewhere outside the Hermes source tree:

```bash
git clone https://github.com/AgentAi-Leo/Hermes-Desktop-UI-Customizations-aileo.git
```

Run a dry-run first:

```bash
bash /path/to/Hermes-Desktop-UI-Customizations-aileo/releases/2026-07-12-newvers/scripts/apply-customizations.sh --dry-run
```

If dry-run succeeds, apply:

```bash
bash /path/to/Hermes-Desktop-UI-Customizations-aileo/releases/2026-07-12-newvers/scripts/apply-customizations.sh --apply
```

Then rebuild Hermes Desktop:

```bash
npm run build && npm run builder -- --dir
```

---

## Verify

After applying, run:

```bash
bash /path/to/Hermes-Desktop-UI-Customizations-aileo/releases/2026-07-12-newvers/scripts/verify-customizations.sh
```

Then manually verify in Hermes Desktop:

- composer/playback pill sits low and does not hide final chat content
- composer/pill stays responsive when right-side panes are open
- Esc stops voice playback
- pause/resume works
- speed toggle works
- volume slider works
- red X stop works
- prompt copy button appears where expected

---

## Rollback

The apply script creates a backup before modifying files and prints a rollback command like:

```bash
bash .hermes-ui-customization-backups/YYYY-MM-DD-HHMMSS/rollback.sh
```

Run that command from the same `apps/desktop` checkout to restore the files that existed before apply.

---

## What files are patched

```txt
src/styles.css
src/store/voice-playback.ts
src/lib/voice-playback.ts
src/app/chat/composer/voice-activity.tsx
src/app/chat/composer/controls.tsx
src/components/assistant-ui/thread/user-message.tsx
src/i18n/types.ts
src/i18n/en.ts
```

Patch files:

```txt
releases/2026-07-12-newvers/patches/001-responsive-composer-layout.patch
releases/2026-07-12-newvers/patches/002-voice-playback-state-and-library.patch
releases/2026-07-12-newvers/patches/003-composer-playback-controls-and-esc.patch
releases/2026-07-12-newvers/patches/004-prompt-copy-button.patch
releases/2026-07-12-newvers/patches/005-i18n-labels.patch
```

---

## Compatibility

Known tested baseline:

```txt
Hermes Desktop commit 7b5ba2054721dde998ed47fd4a0f031955278e99
```

This package may apply to newer Hermes Desktop versions, but upstream file changes can cause patches to fail.

If dry-run fails, stop and review manually. Do not force-apply patches.

---

## Versioning

This repo uses one stable repository with dated release folders:

```txt
releases/YYYY-MM-DD/
```

Current version:

```txt
2026-07-12-newvers
```

Stable versions may also be tagged as:

```txt
vYYYY-MM-DD
```

---

## Repo structure

```txt
README.md
INSTALL.md
ROLLBACK.md
COMPATIBILITY.md
CHANGELOG.md
LICENSE
releases/
  2026-07-12-newvers/
    manifest.json
    patches/
    scripts/
    docs/
```

---

## Safety notes

- Always run `--dry-run` before `--apply`.
- Run from `apps/desktop`, not the repo root.
- Do not force patches if they fail.
- Backups are created before changes are applied.
- Rebuild Hermes Desktop manually after applying.
- This package does not include private full-source snapshots, build artifacts, packaged apps, logs, caches, or credentials.

---

## Maintainer notes

Package provenance, patch-generation details, and validation workflow are documented in:

```txt
releases/2026-07-12-newvers/docs/maintainer-notes.md
releases/2026-07-12-newvers/manifest.json
```
