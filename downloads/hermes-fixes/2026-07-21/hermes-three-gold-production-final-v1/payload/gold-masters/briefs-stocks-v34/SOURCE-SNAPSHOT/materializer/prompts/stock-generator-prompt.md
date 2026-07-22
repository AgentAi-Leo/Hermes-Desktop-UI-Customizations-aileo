# Stock Brief producer — deterministic Yahoo Chart contract

Produce one Stock Brief payload for the current `America/Los_Angeles` calendar date. This job runs at **2pm PT**, after the U.S. regular session close.

## Non-negotiable acquisition path

Do not search the web for prices, read a prior Brief, copy a prior payload, estimate values, or reuse cached quote prose.

For each ticker in this exact order:

`AAPL, AMZN, NVDA, SNAP, GOOGL, MSFT, DIS`

fetch a fresh HTTP response from:

`https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}?range=1y&interval=1d&events=div%2Csplits`

Parse `chart.result[0].timestamp` and `indicators.quote[0]`. Convert each timestamp in `America/New_York`. Ignore rows with null high, low, close, or volume.

## Freshness gate — fail closed

- Monday–Friday: every ticker's newest completed session date must equal the Brief date.
- Saturday: every ticker's newest completed session date must equal the immediately preceding Friday.
- All seven tickers must resolve to one identical market-session date.
- At least two completed sessions must exist for every ticker.
- If any request, field, date, or cross-ticker check fails, emit **no marker and no JSON**. Explain the failure without fabricating values. The materializer will preserve the last valid archive.

A weekday market holiday therefore fails closed; never publish an old session under a new weekday date.

## Deterministic calculations

For each ticker:

- `current_price` = newest completed session close
- `daily_change` = newest close minus prior completed-session close
- `daily_change_percent` = daily change divided by prior close × 100
- `day_high`, `day_low`, `volume` = newest completed session row
- `fifty_two_week_high` = maximum non-null daily high in the trailing 370 calendar days ending at that session
- `fifty_two_week_low` = minimum non-null daily low in the same window

Round money to two decimals. Format signed movement as `+$1.23` or `-$1.23`; signed percent as `+1.23%` or `-1.23%`; volume with comma grouping.

On Saturday, preserve Friday's real change versus Thursday. Never zero weekend movement.

## Exact output contract

Return exactly one paired marker payload with no surrounding prose:

`<<<HERMES_BRIEF_STOCK_JSON>>>{...}<<<END_HERMES_BRIEF_STOCK_JSON>>>`

The object must contain only:

- `contract_version`: `"stock-brief-data-v1"`
- `kind`: `"stock"`
- `date`: current PT date as `YYYY-MM-DD`
- `generated_at`: current ISO 8601 date-time with PT offset
- `timezone`: `"America/Los_Angeles"`
- `quotes`: exactly seven objects in the required ticker order, each containing only:
  - `ticker`
  - `company`
  - `current_price`
  - `daily_change`
  - `daily_change_percent`
  - `day_high`
  - `day_low`
  - `fifty_two_week_high`
  - `fifty_two_week_low`
  - `volume`
  - `source_label`: `"Yahoo Finance"`
  - `source_url`: `https://finance.yahoo.com/quote/{TICKER}`

Company names:

- AAPL — Apple Inc.
- AMZN — Amazon.com, Inc.
- NVDA — NVIDIA Corporation
- SNAP — Snap Inc.
- GOOGL — Alphabet Inc.
- MSFT — Microsoft Corporation
- DIS — The Walt Disney Company

Do not output HTML, Markdown, CSV, commentary, code fences, or a second marker on success. Rendering belongs exclusively to the deterministic materializer.
