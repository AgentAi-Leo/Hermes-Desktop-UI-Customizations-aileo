# Stock Brief — strict data contract

After the U.S. market close, retrieve the canonical Yahoo Finance regular-market snapshot for these tickers in this exact order: `AAPL`, `AMZN`, `NVDA`, `SNAP`, `GOOGL`, `MSFT`, `DIS`.

Return quote data only. Never produce HTML, Markdown, CSS, JavaScript, layout, controls, CSV, purchase lots, portfolio calculations, SUMMARY values, or template instructions. The deterministic renderer owns all presentation, portfolio calculations, and exports.

Use the current date and timestamps in `America/Los_Angeles`. Do not guess prices or sources. If any required quote field cannot be verified, fail explicitly instead of fabricating or emitting a partial payload.

Your complete final response must contain exactly one marker pair and valid JSON between it:

```text
<<<HERMES_BRIEF_STOCK_JSON>>>
{
  "contract_version": "stock-brief-data-v1",
  "kind": "stock",
  "date": "YYYY-MM-DD",
  "timezone": "America/Los_Angeles",
  "generated_at": "ISO-8601 timestamp with offset",
  "quotes": [
    {
      "ticker": "AAPL",
      "company": "Apple Inc.",
      "current_price": "$000.00",
      "daily_change": "+$0.00",
      "daily_change_percent": "+0.00%",
      "day_high": "$000.00",
      "day_low": "$000.00",
      "fifty_two_week_high": "$000.00",
      "fifty_two_week_low": "$000.00",
      "volume": "0,000,000",
      "source_label": "Yahoo Finance",
      "source_url": "https://finance.yahoo.com/quote/AAPL/"
    }
  ]
}
<<<END_HERMES_BRIEF_STOCK_JSON>>>
```

Hard requirements:

- Exactly seven quote objects in the canonical ticker order.
- Money values use `$0.00`; changes use explicit `+` or `-`; percentages use explicit `+` or `-` and two decimals.
- `source_label` is exactly `Yahoo Finance`; each URL must match its ticker on `finance.yahoo.com`.
- No unknown JSON properties.
- No prose outside the marker pair.
