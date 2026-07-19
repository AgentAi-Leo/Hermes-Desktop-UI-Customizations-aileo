# Hermes Briefs Deterministic V26 — Stock Current-Price Columns + AI Focus Restoration

This cumulative V26 package keeps the canonical data/view-model architecture while preserving accepted Brief behavior, moving Stock current prices into dedicated columns, compacting the newest seven-row Stock view, and restoring AI player focus after required keyboard commands.

## Required architecture

```text
archived data-bearing HTML
→ sanitize and extract a canonical view model
→ one dashboard-owned final document per Brief type
→ V25-parity CSS and interaction controller
```

Archived content supplies values only. Producer body classes, scripts, and presentation branches cannot select a different visible layout.

## Visual parity contract

The canonical AI and Stock documents now own exact copies of the accepted V25 producer base style systems:

- `#hermes-v25-ai-base-style`
- `#hermes-v25-stock-base-style`

Dashboard V61/V74 overrides remain layered after those bases exactly as in V25. Permanent computed-style tests enforce high-risk AI and Stock properties, including typography, spacing, colors, Takeaway hierarchy, topic paragraphs and labels, Stock body/header geometry, and quote-grid layout.

Stock retains exactly one yellow hero date pill below the title/fullscreen control. The title-to-metadata gap is reduced by 70%; Summary remains 25% lower on desktop and resets on narrow layouts. The lower daily-price section begins with a white date badge reduced by exactly 45% in typography and spacing. Every quote row now has three explicit columns—identity, current price, and five metrics—with compact row spacing sufficient to show all seven newest rows in a 1900×1242 viewport after jumping to Daily Prices. Quote rows contain no repeated yellow date pills, and the installer rejects any bundle that reintroduces `.hermes-stock-row-date`.

The canonical Stock parser accepts the current deterministic producer's `.metric` blocks as well as historical definition-list, span/bold, and stat shapes. Every retained date renders the same identity-plus-five-metric quote rows: Day High, Day Low, 52-week High, 52-week Low, and Volume.

Both canonical Brief templates include mobile, tablet, desktop, and compact-height rules. The dashboard Stock toolbar uses a non-overlapping three-column desktop grid and stacks cleanly at narrower widths; export controls wrap, and the date rail uses horizontal snap scrolling.

## Functional parity contract

The accepted Stock controller remains byte-locked; the AI controller is locked to the restored-focus revision:

- AI `PLAYER_CONTROLLER` SHA-256: `a96f41935734bad0ab1fcafbe3eb83c0aa05baa3e3e571bdc50e2b3b2a05ff4c`
- Stock `STOCK_INTERACTION_CONTROLLER` SHA-256: `dabab60fd4af3187720ff090e940ba3de768b842638b4afdecc89ed13b51e7b0`

This protects narration, female-voice selection policy, `1.15×` rate, play/pause, topic selection, active-card styling, fullscreen, links, exports, viewport restoration, and Stock date navigation. AI Space/Left/Right/Up commands now restore focus to the player region; the parent dashboard also refocuses the preview after forwarding commands. A separate Stock section-navigation controller keeps Up → complete document top and Down → daily-price rows without modifying the locked Stock controller.

Export button behavior and dashboard export controls are intentionally unchanged in this revision and remain the final follow-up step after visual acceptance.

## Preserved content and runtime contracts

- AI: one Founder Takeaways section and seven complete topic cards.
- Stock: `SUMMARY`, Portfolio Position Comparison, `TOTAL +/-`, color-coded `DAY +/-`, one yellow hero date pill, one white daily-price date badge, and five quote metrics.
- Fresh and historical inputs render through identical canonical final structures.
- The dashboard-selected date is the sole visible-date authority.
- Materializer checkpoint schema remains `4`.
- Canonical archives remain real Mac directories.
- Five-date retention, same-day replacement, and both frozen Stock CSV contracts remain unchanged.
- Cron prompts and production port `9119` remain untouched.

## Installation safety

The installer:

1. verifies all package checksums;
2. rejects symlinked/non-host archive roots and obsolete Docker defaults;
3. creates an exact source, bundle, and runtime backup;
4. runs typecheck, all focused and complete frontend tests, production build, and all 15 materializer tests;
5. verifies installed-file checksums;
6. restarts only isolated preview port `9120` and opens the verified Stock candidate directly in Brave;
7. reads the generated live asset from `index.html` and requires canonical, V25-style, V61/V74 behavior, portfolio, and narration markers;
8. rolls back automatically on any failure.

## Verification totals

Expected results:

- 71 focused Brief tests;
- 143 complete frontend tests;
- successful TypeScript typecheck and production build;
- 15 deterministic renderer/materializer tests;
- 20/20 rendered responsive gates across newest/historical AI and Stock at 1900×800, 1900×1242, 1280×800, 768×900, and 390×844;
- `VISUAL_PARITY=V25_AI_AND_STOCK_COMPUTED_CONTRACTS`;
- `FUNCTIONAL_PARITY=RESTORED_AI_FOCUS_AND_ACCEPTED_STOCK_CONTROLLER_LOCKED`;
- `LIVE_BUNDLE_MARKERS=PASS`.

## Install

```bash
chmod +x INSTALL_BRIEFS_DETERMINISTIC_V26.command
./INSTALL_BRIEFS_DETERMINISTIC_V26.command
```

Use the backup-specific rollback path printed by the installer only if rollback is deliberately required.
