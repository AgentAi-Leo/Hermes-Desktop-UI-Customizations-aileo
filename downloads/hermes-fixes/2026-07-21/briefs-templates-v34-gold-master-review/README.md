# Briefs AI + Stocks V34 gold-master review

This immutable review package supersedes V33 for sharing/restoration while leaving V33 unchanged as rollback.

## Gold-master export contract

- 10 self-contained HTML exports with all required CSS and JavaScript inline.
- 45/45 CSS blocks begin with purpose and restoration comments.
- 25/25 JavaScript controllers begin with purpose, state, input, output, dependency, and restoration comments.
- Canonical HTML sections and the restore order are documented inline.
- 10 Markdown companions are intentionally semantic-only.
- Five Position Comparison CSV companions are intentionally data-only and retain `Agent=HERMES`.

## Verification

- Frontend tests: 152/152.
- Materializer/renderer/collector tests: 21/21.
- Static export audit: 25/25.
- Browser behavior: 40/40.
- Actual Export-button byte parity: 25/25.
- Package checksum entries: 119/119.
- Visual review: passed.
- Clean extracted package verification: passed with executable `0755` commands.

## Safety

Production port `9119`, V32, V33, the installed materializer, and active cron jobs were untouched. Native audible TTS was not tested; browser speech synthesis was mocked.
