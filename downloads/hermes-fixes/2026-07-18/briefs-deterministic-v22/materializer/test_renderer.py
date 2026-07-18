import copy
import json
import re
import unittest
from pathlib import Path

from brief_renderer import ContractError, render_ai, render_stock, validate_ai, validate_stock

ROOT = Path(__file__).resolve().parent


def fixture(name):
    return json.loads((ROOT / "fixtures" / name).read_text())


class RendererContractTests(unittest.TestCase):
    def test_schema_files_are_valid_json(self):
        for path in (ROOT / "schemas").glob("*.json"):
            self.assertIsInstance(json.loads(path.read_text()), dict)

    def test_ai_is_deterministic_and_has_exact_structure(self):
        payload = fixture("ai-valid.json")
        first = render_ai(payload)
        second = render_ai(copy.deepcopy(payload))
        self.assertEqual(first, second)
        self.assertEqual(first.html.count('data-brief-topic="'), 7)
        self.assertEqual(first.html.count('<li><strong>'), 7)
        self.assertIn('content="ai-brief-data-v1"', first.html)
        self.assertNotIn("<script", first.html.lower())

    def test_ai_escapes_content_and_rejects_unknown_keys(self):
        payload = fixture("ai-valid.json")
        payload["topics"][0]["summary"] = '<script>alert("x")</script>'
        rendered = render_ai(payload)
        self.assertNotIn('<script>alert', rendered.html)
        self.assertIn('&lt;script&gt;', rendered.html)
        payload["layout"] = "model-owned"
        with self.assertRaisesRegex(ContractError, "extra"):
            validate_ai(payload)

    def test_ai_rejects_wrong_counts_numbers_and_date_zone(self):
        payload = fixture("ai-valid.json")
        payload["topics"].pop()
        with self.assertRaises(ContractError):
            validate_ai(payload)
        payload = fixture("ai-valid.json")
        payload["topics"][2]["number"] = 4
        with self.assertRaises(ContractError):
            validate_ai(payload)
        payload = fixture("ai-valid.json")
        payload["timezone"] = "UTC"
        with self.assertRaises(ContractError):
            validate_ai(payload)

    def test_stock_is_deterministic_and_summary_matches_portfolio_footer(self):
        payload = fixture("stock-valid.json")
        first = render_stock(payload)
        second = render_stock(copy.deepcopy(payload))
        self.assertEqual(first, second)
        summary = re.search(r'class="summary-value [^"]+">([^<]+)', first.html).group(1)
        footer = re.search(r'<tfoot>.*?<td class="[^"]+">([+-]\$[^<]+)</td>', first.html).group(1)
        self.assertEqual(summary, footer)
        self.assertIn(f'**{summary}**', first.markdown)
        self.assertEqual(first.html.count('class="stock-row"'), 7)
        self.assertNotIn("<script", first.html.lower())

    def test_stock_csv_contract_is_exact_and_unchanged(self):
        rendered = render_stock(fixture("stock-valid.json"))
        expected = (
            "ticker,current_price,daily_change,daily_change_pct\n"
            "AAPL,$333.26,+$5.76,+1.76%\n"
            "AMZN,$242.71,-$1.22,-0.50%\n"
            "NVDA,$191.55,+$2.00,+1.06%\n"
            "SNAP,$4.75,-$0.08,-1.66%\n"
            "GOOGL,$195.40,+$1.40,+0.72%\n"
            "MSFT,$512.31,+$3.31,+0.65%\n"
            "DIS,$121.44,-$0.56,-0.46%\n"
        )
        self.assertEqual(rendered.csv, expected)
        self.assertEqual(rendered.csv.encode(), expected.encode())

    def test_stock_rejects_reordering_missing_tickers_format_and_unknowns(self):
        payload = fixture("stock-valid.json")
        payload["quotes"][0], payload["quotes"][1] = payload["quotes"][1], payload["quotes"][0]
        with self.assertRaisesRegex(ContractError, "canonical order"):
            validate_stock(payload)
        payload = fixture("stock-valid.json")
        payload["quotes"][0]["current_price"] = "333.26"
        with self.assertRaises(ContractError):
            validate_stock(payload)
        payload = fixture("stock-valid.json")
        payload["quotes"][0]["css"] = "red"
        with self.assertRaisesRegex(ContractError, "extra"):
            validate_stock(payload)

    def test_stock_rejects_non_yahoo_or_ticker_mismatched_sources(self):
        payload = fixture("stock-valid.json")
        payload["quotes"][0]["source_url"] = "https://example.com/quote/AAPL"
        with self.assertRaises(ContractError):
            validate_stock(payload)
        payload = fixture("stock-valid.json")
        payload["quotes"][0]["source_url"] = "https://finance.yahoo.com/quote/MSFT/"
        with self.assertRaisesRegex(ContractError, "does not match"):
            validate_stock(payload)


if __name__ == "__main__":
    unittest.main()
