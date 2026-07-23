# Hermes AI gold toolbar v22

One durable correction for the complete BRIEFS-AI fullscreen gold-master toolbar and cyclic archive navigation.

## Fullscreen ownership

The complete toolbar is rendered by the persistent parent page, outside the remounted archive iframe. It therefore remains mounted while cron/date HTML changes:

- previous topic;
- play/pause with synchronized state;
- next topic;
- persistent volume;
- persistent playback speed;
- newer-date navigation;
- selected-date label;
- older-date navigation;
- HTML export;
- Markdown export.

The iframe retains the single speech/controller implementation but hides its partial visual rail only while the parent owns fullscreen. Normal mode and standalone exports retain their existing rails.

## Cyclic boundary

Date navigation remains a ring. When navigation wraps from the oldest archive back to the latest archive—or latest to oldest—the destination opens at its canonical top rather than restoring stale saved scroll/card state. Non-boundary date changes retain their per-date positions.

## Preserved behavior

- v20 AI/Stock fullscreen framing;
- all seven AI Founder Takeaways;
- Stock Position Comparison framing and lower-content exclusion;
- App-owned persistent fullscreen shell;
- numeric CUSTOM navigation and iframe forwarding;
- Brief-owned brackets;
- GIT WATCH unchanged;
- exact backups and rollback.

The installer accepts verified v19, v20, or v21 predecessors, runs focused and deterministic full tests, typecheck, production build, source/bundle verification, and profile-specific dashboard restart.
