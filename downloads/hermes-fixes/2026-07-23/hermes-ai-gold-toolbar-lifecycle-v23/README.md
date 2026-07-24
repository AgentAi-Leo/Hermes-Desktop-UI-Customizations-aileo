# Hermes AI gold toolbar lifecycle v23

Evidence-backed correction for the complete BRIEFS-AI fullscreen gold-master toolbar after date/iframe loads.

## Root cause

The complete parent-owned toolbar remained mounted, but the focused replacement iframe could leave the fullscreen shell at `scrollTop=101.5` during the first uncached date transition. That moved the toolbar above the viewport even though its CSS remained visible.

## Correction

The App-owned fullscreen shell now resets horizontal and vertical shell scroll immediately and across two animation frames after every loaded iframe while the shell owns fullscreen. This runs after the iframe focus/layout cycle and keeps the full gold toolbar visible.

The complete toolbar remains:

- previous topic;
- play/pause;
- next topic;
- volume;
- playback speed;
- newer date;
- selected date;
- older date;
- HTML export;
- Markdown export.

## Required proof

- lifecycle RED/GREEN test for stale shell scroll across iframe load frames;
- live measured reproduction: toolbar top `-69.1px` at shell `scrollTop=101.5`;
- live candidate proof: shell returned to `0`, toolbar returned to `32.4–87.12px`;
- full serial tests, typecheck, production build;
- v22 cleanroom upgrade and exact rollback;
- repeated native date navigation after installation.

## Preserved behavior

- v20 AI/Stock fullscreen framing;
- all seven AI Founder Takeaways;
- Stock Position Comparison framing and lower-content exclusion;
- App-owned persistent fullscreen shell;
- numeric CUSTOM navigation and iframe forwarding;
- Brief-owned brackets;
- GIT WATCH unchanged;
- exact backups and rollback.

The installer accepts the exact sealed v22 predecessor and earlier verified predecessors.
