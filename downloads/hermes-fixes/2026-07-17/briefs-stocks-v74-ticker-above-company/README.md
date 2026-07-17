# BRIEFS-STOCKS V74 — Ticker Above Company

Fail-closed cumulative installer for the isolated BRIEFS-STOCKS preview on port `9120`.

## Accepted hierarchy

```text
DIS
THE WALT DISNEY CO.
▲ +$2.00 (+2.64%)
$91.00
```

Ticker is structurally emitted first and remains the exact same yellow as price (`#ffe08a`). Company remains white. This semantic order is shared by the live dashboard, standalone HTML, and Markdown exports.

## Preserved behavior

- yellow active-date pill on every lower row;
- five metrics including Volume;
- populated Portfolio Position Comparison;
- exact absolute viewport-coordinate date navigation;
- standalone cross-date coordinate transport;
- fullscreen;
- unchanged ten-position CSV export.

## Accepted exact source states

- V69: `507a64efe6af752acc0e6a2b3744e43de13b324b92e146fb2e4f7224539efdc2`
- V71/V72: `9eaf3b2148d3906ca89b50567fd909f71413b6611e1a5ac1e3d7dd85686ccd59`
- V73: `4d5cdcc63dc453880f26b757fa7b5c785026b3ffbc519ca446f42c7d5e7bb003`
- V74: `a88824f783c415071f7f1a02137e8f66e7138fbaf44a26291067880b52689b2e`

All accepted states require page hash `c2ed9653b71c0136abc14414058bbd241b80b47cda69e54f8a23c48643a8b245`.

## Verification

```text
FULL_TESTS=119/119
FOCUSED_TESTS=47/47
TYPECHECK=PASS
PRODUCTION_BUILD=PASS
TICKER_FIRST=7/7
TICKER_PRICE_COLOR_MATCH=7/7
METRICS=5/5_PER_ROW
MARKDOWN_TICKER_FIRST=PASS
CSV_UNCHANGED=PASS
DATE_NAV_SCROLLY=1240_TO_1240
V69_REHEARSAL=PASS
V71_REHEARSAL=PASS
V73_REHEARSAL=PASS
IDEMPOTENT_RERUN=PASS
CONTROLLED_FAILURE_ROLLBACK=PASS
```

Production port `9119`, Gateway, BRIEFS-AI, and host Hermes source remain outside this installer’s scope.
