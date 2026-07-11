# Hermes Desktop UI Customizations — Aileo

A public, patch-based package for reapplying a verified set of Hermes Desktop UI customizations.

This repo is the public/shareable output of a safer two-stage workflow:

```txt
ui-01-customizations-snapshot  →  local/private exact snapshot
ui-02-customizations-share     →  public package with patches, scripts, docs
ui-03-customizations-load      →  future loader skill, not created yet
```

The current release is:

```txt
releases/2026-07-11/
```

It was generated from a private local snapshot named:

```txt
2026-07-11-current-working-ui
```

and tested against Hermes Desktop commit:

```txt
b9b463f3bd6517b76687d9b3c9dea1e62f01f9e1
```

---

## What this customizes

This package preserves and reapplies the Hermes Desktop UI changes used by Aileo.

Included customizations:

1. **Responsive composer and playback pill layout**
   - sets the composer target width to `65rem`
   - keeps the composer/playback pill responsive when right-side panes are open
   - anchors the composer low in the chat pane with `bottom: 0`
   - reserves bottom scroll room so the final chat message is not hidden behind the composer/pill

2. **Voice playback controls**
   - playback volume support
   - playback speed support
   - pause/resume state support
   - red X / stop behavior support

3. **Esc stops voice playback**
   - pressing `Escape` while audio is playing stops playback
   - behavior mirrors the visible stop control

4. **Composer playback UI changes**
   - playback pill/control UI updates
   - auto-speak/playback controls in the composer area

5. **Prompt copy button**
   - preserves the submitted-prompt copy button customization in the user message UI

6. **i18n labels/types**
   - supporting English labels and type definitions for the customized UI states

---

## What files are patched

The public installer patches these Hermes Desktop files:

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

Patch files live in:

```txt
releases/2026-07-11/patches/
```

Current patch set:

```txt
001-responsive-composer-layout.patch
002-voice-playback-state-and-library.patch
003-composer-playback-controls-and-esc.patch
004-prompt-copy-button.patch
005-i18n-labels.patch
PATCH_MANIFEST.json
```

---

## Why this repo uses patches, not copied source files

The private/local snapshot stores complete files so the exact working state can be restored locally.

This public repo intentionally does **not** publish complete copied source files as the default install method.

Instead, it publishes reviewed patch files because patches are:

- easier to review
- safer across Hermes versions
- compatible with `git apply --check`
- less likely to overwrite unrelated upstream changes
- better for a public package that other users may apply to different checkouts

---

## Install / apply

> Run these commands from a Hermes Desktop `apps/desktop` directory.

Example target directory:

```bash
cd /path/to/hermes-agent/apps/desktop
```

Clone this repo somewhere outside the Hermes source tree:

```bash
git clone https://github.com/AgentAi-Leo/Hermes-Desktop-UI-Customizations-aileo.git
```

Dry-run first:

```bash
bash /path/to/Hermes-Desktop-UI-Customizations-aileo/releases/2026-07-11/scripts/apply-customizations.sh --dry-run
```

If dry-run succeeds, apply:

```bash
bash /path/to/Hermes-Desktop-UI-Customizations-aileo/releases/2026-07-11/scripts/apply-customizations.sh --apply
```

Then rebuild Hermes Desktop manually:

```bash
npm run build && npm run builder -- --dir
```

---

## Verify

After applying, run:

```bash
bash /path/to/Hermes-Desktop-UI-Customizations-aileo/releases/2026-07-11/scripts/verify-customizations.sh
```

Then manually verify in the app:

- composer/playback pill sits low and does not hide final chat content
- composer/pill stays responsive when right-side panes are open
- Esc stops voice playback
- pause/resume works
- speed toggle works
- volume slider works
- red X stop works
- prompt copy button is present where expected

---

## Rollback

The apply script creates a backup before modifying files.

It prints a rollback command like:

```bash
bash .hermes-ui-customization-backups/YYYY-MM-DD-HHMMSS/rollback.sh
```

Run that command from the same `apps/desktop` checkout if you need to restore the pre-apply files.

Rollback was tested during package validation. After rollback, the test checkout returned to a clean source state except for the expected backup folder.

---

## Tested workflow

This package was tested with the following safe flow:

```txt
1. create local/private ui-01 snapshot
2. validate snapshot status against current working tree
3. stage public ui-02 package
4. generate patches using Option B clean-baseline method
5. validate package for public-readiness
6. create temporary clean checkout at the same baseline commit
7. run public installer --dry-run
8. run public installer --apply
9. run verify script
10. run rollback script
11. confirm source tree returned clean except backup folder
```

Option B means the patches were generated by comparing the private snapshot against a clean temporary checkout at the recorded Hermes commit, not by copying unrelated local working-tree changes.

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
  2026-07-11/
    manifest.json
    patches/
      001-responsive-composer-layout.patch
      002-voice-playback-state-and-library.patch
      003-composer-playback-controls-and-esc.patch
      004-prompt-copy-button.patch
      005-i18n-labels.patch
      PATCH_MANIFEST.json
    scripts/
      apply-customizations.sh
      verify-customizations.sh
    docs/
      customization-summary.md
      patch-summary.md
      screenshots.md
```

---

## Compatibility

Known tested baseline:

```txt
Hermes Desktop commit b9b463f3bd6517b76687d9b3c9dea1e62f01f9e1
```

The package may still apply to newer Hermes Desktop versions, but future upstream changes can move or rewrite the affected files.

If dry-run fails, stop and review manually. Do not force-apply patches.

---

## Relationship to local skills

This repo is the public `ui-02` output.

The private/local workflow remains separate:

```txt
0-custom/
  ui-01-customizations-snapshot/  # complete-file private backup/restore
  ui-02-customizations-share/     # this public patch package
  ui-03-customizations-load/      # future safe loader/apply skill
```

Keeping those stages separate is intentional:

- `ui-01` can store complete private files for exact local restore
- `ui-02` publishes patches/docs/scripts for public use
- `ui-03` will later consume a verified `ui-02` package and apply it safely to a chosen Hermes Desktop checkout

---

## Safety notes

- Do not apply without running `--dry-run` first.
- Do not run from the wrong directory; run from `apps/desktop`.
- Do not force patches if they fail.
- Backups are created before apply.
- Rebuild Hermes Desktop manually after applying.
- This package does not include private full source snapshots, build artifacts, packaged apps, logs, caches, or credentials.
