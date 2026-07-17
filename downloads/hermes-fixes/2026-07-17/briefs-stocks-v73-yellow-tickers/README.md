# BRIEFS-STOCKS V73 — Yellow Tickers

Fail-closed cumulative installer for the isolated BRIEFS-STOCKS preview on port `9120`.

## Change

Ticker symbols now use exactly the same yellow as current prices:

```css
color: #ffe08a !important;
```

Company names remain white. Daily movement remains green/red. The company-above-ticker hierarchy is preserved in live rows and newly generated exports.

## Preserved behavior

- yellow row-date pills;
- five metrics including Volume;
- populated Portfolio Position Comparison;
- exact absolute viewport-coordinate date navigation;
- standalone HTML date navigation;
- fullscreen;
- semantic Markdown company/ticker hierarchy;
- unchanged ten-position CSV export.

## Accepted source states

The installer accepts only these exact source/page combinations:

- V69 state: `507a64efe6af752acc0e6a2b3744e43de13b324b92e146fb2e4f7224539efdc2` / `c2ed9653b71c0136abc14414058bbd241b80b47cda69e54f8a23c48643a8b245`
- V71/V72-installed state: `9eaf3b2148d3906ca89b50567fd909f71413b6611e1a5ac1e3d7dd85686ccd59` / `c2ed9653b71c0136abc14414058bbd241b80b47cda69e54f8a23c48643a8b245`
- canonical V73 state: `4d5cdcc63dc453880f26b757fa7b5c785026b3ffbc519ca446f42c7d5e7bb003` / `c2ed9653b71c0136abc14414058bbd241b80b47cda69e54f8a23c48643a8b245`

## Verification

```text
FULL_TESTS=119/119
FOCUSED_TESTS=47/47
TYPECHECK=PASS
PRODUCTION_BUILD=PASS
V69_REHEARSAL=PASS
V71_REHEARSAL=PASS
IDEMPOTENT_RERUN=PASS
CONTROLLED_FAILURE_ROLLBACK=PASS
HTML_MANIFEST=v73-yellow-tickers
TICKER_PRICE_COLOR=rgb(255,224,138), 7/7
CSV_CHECKSUM_UNCHANGED=PASS
```

Production port `9119`, Gateway, BRIEFS-AI, and host Hermes source remain outside this installer’s scope.
