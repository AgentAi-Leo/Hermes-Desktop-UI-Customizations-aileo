# Hermes Briefs deterministic templates v25

V25 is a cumulative update over V20. It preserves the summary, `TOTAL +/-`, color-coded `DAY +/-`, exactly 25%-larger portfolio purchase dates, and contained Stock quote-row layout. It adds exactly one plain white `TODAY'S PRICE` heading directly above the lower daily-price cards, using the same typography family and 64px desktop / 48px responsive scale as the top Stock Brief title. Calculations, sorting, totals, and both CSV contracts remain unchanged.

This package replaces model-authored Brief presentation with strict versioned JSON data contracts and deterministic AI/Stock renderers.

## Locked contracts

- AI appearance/interaction authority: accepted V61.
- Stock appearance authority: accepted V74 plus canonical metadata and v16 wrapper spacing.
- AI narration rate: `1.15×`; existing natural female voice priority is preserved.
- Stock header: yellow `SUMMARY` label and normal-weight green/red portfolio gain/loss sourced from the canonical Portfolio Position Comparison total.
- Live HTML and downloaded HTML use the same dashboard transformation.
- Model responses contain data only. They cannot supply HTML, Markdown, CSS, JavaScript, layout, controls, CSV, or portfolio calculations.

## CSV preservation

Two different CSV surfaces are frozen:

1. Dashboard portfolio download: the existing 12-column `stockPortfolioCsv()` output, ordering, formatting, CRLF bytes, UTF-8 BOM download behavior, and filename are unchanged.
2. Archived Stock cron CSV: `ticker,current_price,daily_change,daily_change_pct` with the existing seven-ticker order and LF line endings.

`SUMMARY` is not added to either CSV.

## Safe cutover

The installer updates the isolated preview on port 9120 and refreshes the existing profile-local host materializer scripts without changing cron prompts or production port 9119. It requires the two primary archives to already be real Mac directories, preserves checkpoint schema 4, and refuses any materializer that contains the obsolete Docker archive defaults.

The materializer continues to read only `AI_JSON`/`STOCK_JSON` markers. Invalid or incomplete data leaves the last valid Brief untouched and returns an exact error. Existing active generator prompts are not changed.

## Install

Run from this extracted directory:

```bash
chmod +x INSTALL_BRIEFS_DETERMINISTIC_V25.command
./INSTALL_BRIEFS_DETERMINISTIC_V25.command
```

Useful overrides:

```bash
HERMES_PREVIEW_ROOT="$HOME/.hermes/zDownloads/_BRIEFS-DASHBOARD-V3-PREVIEW" \
HERMES_PROFILE=local-ai-assist1 \
HERMES_PREVIEW_PORT=9120 \
./INSTALL_BRIEFS_DETERMINISTIC_V25.command
```

The installer prints an exact backup and rollback path. It runs frontend typecheck/tests/build, Python contract/materializer tests, installed checksums, preview readiness, and live-bundle marker verification before reporting success.

## Rollback

Use the backup-specific rollback path printed by the installer. `ROLLBACK_LATEST_BRIEFS_DETERMINISTIC_V25.command` is also provided for convenience.

## Verification suites

```bash
cd materializer
python3 -m py_compile *.py
python3 -m unittest -v
```

Expected deterministic package result: 15 passing tests.
