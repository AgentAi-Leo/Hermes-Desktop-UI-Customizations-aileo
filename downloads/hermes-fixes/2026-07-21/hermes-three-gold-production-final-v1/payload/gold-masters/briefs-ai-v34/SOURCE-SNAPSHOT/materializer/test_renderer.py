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

    def test_ai_accepts_five_topic_legacy_json_through_the_same_template(self):
        payload = fixture("ai-valid.json")
        payload["founder_takeaways"] = payload["founder_takeaways"][:5]
        payload["topics"] = payload["topics"][:5]
        rendered = render_ai(payload)
        self.assertEqual(rendered.html.count('class="card"'), 5)
        self.assertEqual(rendered.markdown.count("\n## "), 6)

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
        self.assertIn("July 18, 2026 - Sat.", first.html)
        self.assertIn("**Date:** July 18, 2026 - Sat.", first.markdown)
        self.assertEqual(first.markdown.count("Date · July 18, 2026 - Sat."), 7)
        self.assertNotIn("SAT. - July 18, 2026", first.html)

    def test_stock_csv_contract_is_exact_and_unchanged(self):
        rendered = render_stock(fixture("stock-valid.json"))
        expected = (
            "ticker,current_price,daily_change,daily_change_pct,Agent\n"
            "AAPL,$333.26,+$5.76,+1.76%,HERMES\n"
            "AMZN,$242.71,-$1.22,-0.50%,HERMES\n"
            "NVDA,$191.55,+$2.00,+1.06%,HERMES\n"
            "SNAP,$4.75,-$0.08,-1.66%,HERMES\n"
            "GOOGL,$195.40,+$1.40,+0.72%,HERMES\n"
            "MSFT,$512.31,+$3.31,+0.65%,HERMES\n"
            "DIS,$121.44,-$0.56,-0.46%,HERMES\n"
        )
        self.assertEqual(rendered.csv, expected)
        self.assertEqual(rendered.csv.encode(), expected.encode())

    def test_weekend_stock_presentation_passes_json_movement_through_and_keeps_frozen_csv(self):
        saturday = fixture("stock-valid.json")
        weekend = render_stock(saturday)
        self.assertIn("+$5.76 (+1.76%)", weekend.html)
        self.assertIn("+$5.76 (+1.76%)", weekend.markdown)
        self.assertNotIn("+$0.00 (+0.00%)", weekend.html)
        self.assertIn("AAPL,$333.26,+$5.76,+1.76%", weekend.csv)

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
