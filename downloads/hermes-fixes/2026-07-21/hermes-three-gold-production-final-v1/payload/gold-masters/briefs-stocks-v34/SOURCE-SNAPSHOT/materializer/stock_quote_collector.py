#!/usr/bin/env python3
"""Deterministic, fail-closed Yahoo Chart collector for the Stock Brief cron.

The script emits exactly one Hermes marker payload on success and emits no stdout
on failure, so the materializer preserves the last valid archive.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable
from zoneinfo import ZoneInfo

START_MARKER = "<<<HERMES_BRIEF_STOCK_JSON>>>"
END_MARKER = "<<<END_HERMES_BRIEF_STOCK_JSON>>>"
TICKERS = ("AAPL", "AMZN", "NVDA", "SNAP", "GOOGL", "MSFT", "DIS")
COMPANIES = {
    "AAPL": "Apple Inc.",
    "AMZN": "Amazon.com, Inc.",
    "NVDA": "NVIDIA Corporation",
    "SNAP": "Snap Inc.",
    "GOOGL": "Alphabet Inc.",
    "MSFT": "Microsoft Corporation",
    "DIS": "The Walt Disney Company",
}
NY = ZoneInfo("America/New_York")
LA = ZoneInfo("America/Los_Angeles")


class FreshnessError(RuntimeError):
    """Raised when fresh, mutually consistent market-session data is unavailable."""


@dataclass(frozen=True)
class SessionRow:
    date: dt.date
    high: float
    low: float
    close: float
    volume: int


def expected_completed_session(report_date: dt.date) -> dt.date:
    """Return the required session date for a Mon-Sat 2pm PT publication.

    Weekday holidays intentionally fail closed instead of publishing an old session
    under a new date. Saturday carries Friday's real close and Friday movement.
    """
    if report_date.weekday() == 5:  # Saturday
        return report_date - dt.timedelta(days=1)
    if report_date.weekday() == 6:  # Defensive Sunday support.
        return report_date - dt.timedelta(days=2)
    return report_date


def chart_url(ticker: str) -> str:
    query = urllib.parse.urlencode({"range": "1y", "interval": "1d", "events": "div,splits"})
    return f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(ticker)}?{query}"


def fetch_yahoo_chart(_ticker: str, url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": "Hermes-Stock-Brief/1.0"})
    with urllib.request.urlopen(request, timeout=25) as response:
        if response.status != 200:
            raise FreshnessError(f"Yahoo returned HTTP {response.status}")
        return json.load(response)


def _session_rows(payload: dict[str, Any], report_date: dt.date) -> list[SessionRow]:
    try:
        chart = payload["chart"]
        if chart.get("error") is not None:
            raise FreshnessError(f"Yahoo chart error: {chart['error']}")
        result = chart["result"][0]
        timestamps = result["timestamp"]
        quote = result["indicators"]["quote"][0]
        highs, lows, closes, volumes = (quote[name] for name in ("high", "low", "close", "volume"))
    except (KeyError, IndexError, TypeError) as error:
        raise FreshnessError("Yahoo chart response is incomplete") from error

    rows: list[SessionRow] = []
    for timestamp, high, low, close, volume in zip(timestamps, highs, lows, closes, volumes):
        if None in (timestamp, high, low, close, volume):
            continue
        session_date = dt.datetime.fromtimestamp(int(timestamp), NY).date()
        if session_date > report_date:
            continue
        rows.append(SessionRow(session_date, float(high), float(low), float(close), int(volume)))
    if len(rows) < 2:
        raise FreshnessError("Yahoo chart response has fewer than two completed sessions")
    return rows


def _money(value: float) -> str:
    return f"${value:.2f}"


def _signed_money(value: float) -> str:
    return f"{'+' if value >= 0 else '-'}${abs(value):.2f}"


def _signed_percent(value: float) -> str:
    return f"{'+' if value >= 0 else '-'}{abs(value):.2f}%"


def collect_stock_payload(
    report_date: str,
    fetch_json: Callable[[str, str], dict[str, Any]] = fetch_yahoo_chart,
    *,
    generated_at: str | None = None,
) -> dict[str, Any]:
    requested = dt.date.fromisoformat(report_date)
    expected = expected_completed_session(requested)
    quotes: list[dict[str, str]] = []
    observed_sessions: dict[str, dt.date] = {}

    for ticker in TICKERS:
        url = chart_url(ticker)
        rows = _session_rows(fetch_json(ticker, url), requested)
        latest, previous = rows[-1], rows[-2]
        observed_sessions[ticker] = latest.date
        if latest.date != expected:
            raise FreshnessError(
                f"{ticker} latest completed session is {latest.date.isoformat()}; expected {expected.isoformat()}"
            )
        change = latest.close - previous.close
        change_percent = (change / previous.close) * 100 if previous.close else 0.0
        trailing = [row for row in rows if row.date >= expected - dt.timedelta(days=370)]
        quotes.append({
            "ticker": ticker,
            "company": COMPANIES[ticker],
            "current_price": _money(latest.close),
            "daily_change": _signed_money(change),
            "daily_change_percent": _signed_percent(change_percent),
            "day_high": _money(latest.high),
            "day_low": _money(latest.low),
            "fifty_two_week_high": _money(max(row.high for row in trailing)),
            "fifty_two_week_low": _money(min(row.low for row in trailing)),
            "volume": f"{latest.volume:,}",
            "source_label": "Yahoo Finance",
            "source_url": f"https://finance.yahoo.com/quote/{ticker}",
        })

    if len(set(observed_sessions.values())) != 1:
        rendered = ", ".join(f"{ticker}={date.isoformat()}" for ticker, date in observed_sessions.items())
        raise FreshnessError(f"ticker market sessions disagree: {rendered}")

    return {
        "contract_version": "stock-brief-data-v1",
        "kind": "stock",
        "date": requested.isoformat(),
        "generated_at": dt.datetime.now(LA).isoformat() if generated_at is None else generated_at,
        "timezone": "America/Los_Angeles",
        "quotes": quotes,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", default=dt.datetime.now(LA).date().isoformat(), help="Brief date (YYYY-MM-DD)")
    args = parser.parse_args(argv)
    try:
        payload = collect_stock_payload(args.date)
    except Exception as error:
        print(f"Stock collector failed closed: {error}", file=sys.stderr)
        return 1
    print(START_MARKER + json.dumps(payload, separators=(",", ":"), sort_keys=True) + END_MARKER)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
