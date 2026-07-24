# Hermes AI gold toolbar viewport owner v24

Evidence-backed correction that keeps the complete BRIEFS-AI gold-master rail present through every date and iframe transition.

## Observed failures

Two independent failures were measured in the native Brave page:

1. A focused replacement iframe could leave the fullscreen shell at `scrollTop=101.5`, moving a mounted toolbar above the viewport.
2. Outside App-owned HTML fullscreen, the source condition `isPersistentFullscreen && kind === "ai"` unmounted the toolbar completely (`toolbarCount=0`) even though the AI Brief route and iframe remained active.

## Correction

- The complete AI rail is created whenever the AI Brief route is mounted. Its existence is not conditional on fullscreen, selected date, preview URL, loading state, or iframe state.
- In normal mode, that single rail remains in the Brief layout.
- In fullscreen, the same rail is portaled directly into `#hermes-persistent-route-shell` and fixed to the viewport above the scaled/remounted Brief content.
- The obsolete AI export overlay is removed, leaving exactly one visual owner.
- The App-owned shell still resets retained horizontal and vertical scroll after iframe loads as a second safety layer.

The permanent rail contains:

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

- RED/GREEN lifecycle test rejecting the fullscreen-only render branch;
- RED/GREEN one-owner test rejecting the duplicate export overlay;
- App shell scroll lifecycle regression;
- all 202 repository tests;
- typecheck and production build;
- cleanroom upgrade from the sealed predecessor;
- exact rollback;
- native Brave date-ring navigation, including both boundary wraps, with one visible rail at every settled date.

## Preserved behavior

- AI/Stock fullscreen framing;
- all seven AI Founder Takeaways;
- Stock Position Comparison framing and lower-content exclusion;
- numeric CUSTOM navigation and iframe forwarding;
- Brief-owned brackets;
- GIT WATCH unchanged;
- exact backups and rollback.

The installer accepts the exact sealed v23/v22 predecessors and earlier verified predecessors.
