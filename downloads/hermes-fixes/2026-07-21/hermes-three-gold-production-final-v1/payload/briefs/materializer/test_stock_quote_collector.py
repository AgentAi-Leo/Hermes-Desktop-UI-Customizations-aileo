import datetime as dt
import unittest
from zoneinfo import ZoneInfo

from stock_quote_collector import FreshnessError, collect_stock_payload


def epoch(date_text: str) -> int:
    local = dt.datetime.combine(dt.date.fromisoformat(date_text), dt.time(16), tzinfo=ZoneInfo("America/New_York"))
    return int(local.timestamp())


def chart_payload(ticker: str, dates=("2026-07-16", "2026-07-17", "2026-07-20")):
    offset = {"AAPL": 0, "AMZN": 10, "NVDA": 20, "SNAP": -90, "GOOGL": 30, "MSFT": 40, "DIS": 50}[ticker]
    closes = [100 + offset, 102 + offset, 110 + offset]
    return {
        "chart": {
            "error": None,
            "result": [{
                "timestamp": [epoch(value) for value in dates],
                "indicators": {"quote": [{
                    "open": [value - 1 for value in closes],
                    "high": [value + 2 for value in closes],
                    "low": [value - 3 for value in closes],
                    "close": closes,
                    "volume": [1_000_000, 1_100_000, 1_200_000],
                }]},
            }],
        }
    }


class StockQuoteCollectorTests(unittest.TestCase):
    def test_uses_requested_completed_session_and_calculates_change_from_prior_close(self):
        payload = collect_stock_payload("2026-07-20", lambda ticker, _url: chart_payload(ticker), generated_at="2026-07-20T14:00:00-07:00")
        self.assertEqual(payload["contract_version"], "stock-brief-data-v1")
        self.assertEqual(payload["date"], "2026-07-20")
        self.assertEqual(payload["generated_at"], "2026-07-20T14:00:00-07:00")
        self.assertNotIn("time", payload)
        self.assertEqual([quote["ticker"] for quote in payload["quotes"]], ["AAPL", "AMZN", "NVDA", "SNAP", "GOOGL", "MSFT", "DIS"])
        apple = payload["quotes"][0]
        self.assertEqual(apple["current_price"], "$110.00")
        self.assertEqual(apple["daily_change"], "+$8.00")
        self.assertEqual(apple["daily_change_percent"], "+7.84%")
        self.assertEqual(apple["day_high"], "$112.00")
        self.assertEqual(apple["day_low"], "$107.00")
        self.assertEqual(apple["fifty_two_week_high"], "$112.00")
        self.assertEqual(apple["fifty_two_week_low"], "$97.00")
        self.assertEqual(apple["volume"], "1,200,000")

    def test_saturday_carries_friday_session_but_preserves_friday_daily_movement(self):
        payload = collect_stock_payload("2026-07-18", lambda ticker, _url: chart_payload(ticker), generated_at="2026-07-18T14:00:00-07:00")
        apple = payload["quotes"][0]
        self.assertEqual(apple["current_price"], "$102.00")
        self.assertEqual(apple["daily_change"], "+$2.00")
        self.assertEqual(apple["daily_change_percent"], "+2.00%")

    def test_fails_closed_when_yahoo_has_no_expected_completed_session(self):
        def stale(ticker, _url):
            return chart_payload(ticker, dates=("2026-07-15", "2026-07-16", "2026-07-17"))
        with self.assertRaisesRegex(FreshnessError, "expected 2026-07-20"):
            collect_stock_payload("2026-07-20", stale, generated_at="2026-07-20T14:00:00-07:00")

    def test_fails_closed_when_tickers_disagree_on_market_session(self):
        def mismatched(ticker, _url):
            dates = ("2026-07-16", "2026-07-17", "2026-07-20") if ticker != "DIS" else ("2026-07-15", "2026-07-16", "2026-07-17")
            return chart_payload(ticker, dates=dates)
        with self.assertRaises(FreshnessError):
            collect_stock_payload("2026-07-20", mismatched, generated_at="2026-07-20T14:00:00-07:00")


if __name__ == "__main__":
    unittest.main()
