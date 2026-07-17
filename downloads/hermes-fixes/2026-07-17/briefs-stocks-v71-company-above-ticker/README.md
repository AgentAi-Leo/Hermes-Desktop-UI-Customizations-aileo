# BRIEFS-STOCKS V71 — Company Above Ticker

Fail-closed replacement installer for the isolated BRIEFS-STOCKS preview.

## Visible change

Each canonical daily-price row now renders:

1. uppercase shortened company name;
2. ticker symbol;
3. daily performance;
4. current price.

Examples:

```text
THE WALT DISNEY CO.
DIS

APPLE INC.
AAPL
```

The same hierarchy is used by the live preview, self-contained HTML export, and semantic Markdown export. The independent portfolio CSV schema and ten position rows remain unchanged.

## Preserved behavior

- Yellow active-date pill on every lower quote row.
- Five aligned metrics, including Volume.
- Populated Portfolio Position Comparison.
- Exact absolute `scrollX`/`scrollY` restoration across iframe and standalone HTML date navigation.
- Fullscreen support.
- Stock export toolbar and adjacent-date links.
- Production port `9119`, Gateway, BRIEFS-AI, and host Hermes source remain untouched.

## Source gate

The installer accepts only:

- the exact reported Mac mixed pair:
  - `briefs.ts`: `423c9b09d5dad71cfbea9b80701d9a6deefab7f766751565e300c0dfd4ae0f6f`
  - `BriefsPage.tsx`: `63ae43faae62f8a9ebb8c723ac3bb027c1abdfbd520d59bf16c0459a4c0d34c9`
- or the canonical V71 pair for an idempotent rerun:
  - `briefs.ts`: `9eaf3b2148d3906ca89b50567fd909f71413b6611e1a5ac1e3d7dd85686ccd59`
  - `BriefsPage.tsx`: `c2ed9653b71c0136abc14414058bbd241b80b47cda69e54f8a23c48643a8b245`

Any other source state stops with `FAIL_CLOSED_INCOMPATIBLE_SOURCE` before modification.

## Verified gates

```text
FULL_TESTS=119/119
FOCUSED_INSTALLER_TESTS=47/47
TYPECHECK=PASS
PRODUCTION_BUILD=PASS
MIXED_PAIR_REHEARSAL=PASS
IDEMPOTENT_RERUN=PASS
CONTROLLED_FAILURE_ROLLBACK=PASS
HTML_MANIFEST=v71-company-above-ticker
HTML_COMPANY_ABOVE_TICKER=7/7
HTML_METRICS=5/5_PER_ROW
DIRECT_DATE_NAV_SCROLLY=1240_TO_1240
MARKDOWN_COMPANY_ABOVE_TICKER=PASS
CSV_POSITIONS=10
```

## Installation target

The command targets the isolated preview root and defaults to port `9120`. Do not use the withdrawn V69 or preliminary V70 installers.
