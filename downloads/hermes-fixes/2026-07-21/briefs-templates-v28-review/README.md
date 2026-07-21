# Locked BRIEFS-AI + BRIEFS-STOCKS templates V28 — review

This read-only review package contains the cumulative locked AI and Stocks templates, deterministic JSON renderer/materializer source, strict schemas, real AI compatibility references, deterministic Stocks JSON/output fixtures, compiled dashboard, verification scripts, and full-dashboard screenshots.

## Verified corrections

- AI Left/Right topic navigation and two-way wraparound.
- Founder Takeaways initial state and first-Space playback.
- Human dates between adjacent-date arrows on both Brief surfaces.
- Composer-style `1x`, `1.2x`, `1.5x`, and `1.75x` speed control; `1.2x` default.
- Approved natural female voice selection with no arbitrary English-voice fallback.
- Independent exact active-card restoration per archive date.
- Stocks Portfolio Position Comparison plus seven canonical five-metric rows.
- Cron architecture remains strict JSON → no-agent deterministic materializer → locked renderer → atomic publication.

## Verification

- Brief tests: `74/74`.
- Full frontend tests: `146/146`.
- Renderer/materializer tests: `16/16`.
- TypeScript and production build: passed.
- Muted Chromium interaction probe: passed.
- Independent ZIP manifest, tests, extraction, and integrity: passed.

## SHA-256

```text
b46c006a63f78571318672c1e68d541c7c22d172f1803f8272d1c5b1b7cdda4e
```

Opening the review is silent. Pressing Play or Space may produce narration. The real macOS female voice and audible quality still require a warned host-side check.

This package does not modify production port `9119`, live cron jobs, Hermes source, or the user-managed legacy preview folder. It is not a production installer.
