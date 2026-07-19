# Hermes Briefs Deterministic V27 — Per-Date AI Focus + Git Comments Status

This cumulative V27 review package preserves all accepted V26 Stock and AI behavior while restoring semantic AI card-focus persistence across archive dates and adding truthful Git Comments timeline, author-association, link-deduplication, and watcher-health presentation.

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

Both Stock date pills use the selected archive date and render UTC-safe uppercase weekday abbreviations such as `SAT. - July 18, 2026`. Weekend archives carry forward the latest verified regular-session price and metrics while displaying `+$0.00 (+0.00%)`; Friday archives retain their real Thursday-to-Friday session movement. Frozen CSV bytes remain unchanged until the export phase.

The canonical Stock parser accepts the current deterministic producer's `.metric` blocks as well as historical definition-list, span/bold, and stat shapes. Every retained date renders the same identity-plus-five-metric quote rows: Day High, Day Low, 52-week High, 52-week Low, and Volume.

Both canonical Brief templates include mobile, tablet, desktop, and compact-height rules. The dashboard Stock toolbar uses a non-overlapping three-column desktop grid and stacks cleanly at narrower widths; export controls wrap, and the date rail uses horizontal snap scrolling.

## Functional parity contract

The accepted Stock controller remains byte-locked; the AI controller is locked to the restored-focus revision:

- AI `PLAYER_CONTROLLER` SHA-256: `91ad47afa3f483a7bb54ba8e939a41a41c3e474034ad903e70057287708dae51`
- Stock `STOCK_INTERACTION_CONTROLLER` SHA-256: `dabab60fd4af3187720ff090e940ba3de768b842638b4afdecc89ed13b51e7b0`

This protects narration, female-voice selection policy, `1.15×` rate, play/pause, topic selection, active-card styling, fullscreen, links, exports, viewport restoration, and Stock date navigation. AI initializes silently on Founder Takeaways; first Space starts Takeaways. Left/Right/Up select, highlight, narrate, and scroll the intended card into view. The iframe publishes `{scrollX, scrollY, topicIndex}` after semantic selection; the dashboard stores that state per archive date. First visits inherit the current card index, while revisits restore that date’s own card and repeatedly align it beneath the fixed player so the viewport never lands between cards. A separate Stock section-navigation controller keeps Up → complete document top and Down → daily-price rows without modifying the locked Stock controller.

## Git Comments contract

- When a received comment exists, the green `COMMENTS (N)` badge is the sole GitHub link; the redundant issue-level `View on GitHub` link is omitted.
- Comment cards preserve GitHub `author_association` values such as `Contributor`.
- The watcher fetches GitHub timeline events and displays closed/reopened and label-added/removed status with actor, avatar, timestamp, closure reason, and label color.
- The checker atomically writes a separate health record on both success and failure.
- The API shows green `Watcher healthy` status only for an explicit successful check no older than six hours (three watcher intervals). Missing, failed, or stale health renders `Watcher needs attention` without a green dot.

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
3. creates an exact source, bundle, materializer, Git Comments renderer/API, and checker backup;
4. runs typecheck, all focused and complete frontend tests, production build, all 16 materializer tests, and Git Comments runtime/schema gates;
5. executes the installed Git Comments watcher and requires a healthy schema-3 snapshot containing the real closure reason and contributor association;
6. verifies all installed-file checksums;
7. restarts only isolated preview port `9120` and opens the verified Stock candidate directly in Brave;
8. reads the generated live asset from `index.html` and requires canonical, V25-style, V61/V74 behavior, AI per-date state, portfolio, and narration markers;
9. rolls back every versioned file automatically on any failure while preserving mutable Git Comments data.

## Verification totals

Expected results:

- 74 focused Brief tests;
- 146 complete frontend tests;
- successful TypeScript typecheck and production build;
- 16 deterministic renderer/materializer tests;
- Git Comments renderer runtime, checker syntax, API compile, live GitHub schema, and health gates;
- semantic two-date Chromium persistence gate with independent card indices and exact below-player alignment;
- 20/20 rendered responsive gates across newest/historical AI and Stock at 1900×800, 1900×1242, 1280×800, 768×900, and 390×844;
- `AI_PER_DATE_CARD_PERSISTENCE_BROWSER=PASS`;
- `GIT_COMMENTS_STATUS_HEALTH_RUNTIME=PASS`;
- `LIVE_BUNDLE_MARKERS=PASS`.

## Install

```bash
chmod +x INSTALL_BRIEFS_DETERMINISTIC_V27.command
./INSTALL_BRIEFS_DETERMINISTIC_V27.command
```

Use the backup-specific rollback path printed by the installer only if rollback is deliberately required.
